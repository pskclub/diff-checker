'use client';

import React, { useState } from 'react';
import { Upload, FileText, X, AlertCircle, Search, Download, Copy, Check } from 'lucide-react';
import * as mammoth from 'mammoth';
import { PDFParse } from 'pdf-parse'
import { flushSync } from 'react-dom';
PDFParse.setWorker('https://cdn.jsdelivr.net/npm/pdf-parse@latest/dist/pdf-parse/web/pdf.worker.mjs');
// Type definitions
type FileType = 'txt' | 'docx' | 'pdf' | 'md';
type ViewMode = 'diff' | 'original' | 'modified';
type DiffType = 'equal' | 'added' | 'removed' | 'modified';
type CharDiffType = 'equal' | 'added' | 'removed';
type InputMode = 'file' | 'text';

interface CharDiff {
  type: CharDiffType;
  char: string;
}

interface DiffLine {
  type: DiffType;
  line1: string | null;
  line2: string | null;
  lineNum1: number | null;
  lineNum2: number | null;
  originalLineNum1?: number | null;
  originalLineNum2?: number | null;
  charDiff?: CharDiff[];
}

interface DiffHunk {
  type: 'hunk';
  beforeContext: DiffLine[];
  changes: DiffLine[];
  afterContext: DiffLine[];
}

interface DiffResult {
  hunks: DiffHunk[];
  allLines1: string[];
  allLines2: string[];
}

interface SearchResult {
  hunkIdx: number;
  changeIdx: number;
  change: DiffLine;
}

interface LineWithNum {
  line: string;
  originalLineNum: number;
}

interface ChangeCount {
  added: number;
  removed: number;
}

interface SavedSession {
  timestamp: number;
  text1: string;
  text2: string;
  file1Name?: string;
  file2Name?: string;
  ignoreWhitespace: boolean;
  showWhitespace: boolean;
}

const TextDiffChecker: React.FC = () => {
  const [file1, setFile1] = useState<File | null>(null);
  const [file2, setFile2] = useState<File | null>(null);
  const [text1, setText1] = useState<string>('');
  const [text2, setText2] = useState<string>('');
  const [loading, setLoading] = useState<boolean>(false);
  const [error, setError] = useState<string>('');
  const [diffResult, setDiffResult] = useState<DiffResult | null>(null);
  const [showOnlyDiff, setShowOnlyDiff] = useState<boolean>(false);
  const [viewMode, setViewMode] = useState<ViewMode>('diff');
  const [searchTerm, setSearchTerm] = useState<string>('');
  const [searchResults, setSearchResults] = useState<SearchResult[]>([]);
  const [currentSearchIndex, setCurrentSearchIndex] = useState<number>(0);
  const [ignoreWhitespace, setIgnoreWhitespace] = useState<boolean>(false);
  const [showWhitespace, setShowWhitespace] = useState<boolean>(false);
  const [copied, setCopied] = useState<boolean>(false);
  const [inputMode1, setInputMode1] = useState<InputMode>('file');
  const [inputMode2, setInputMode2] = useState<InputMode>('file');
  const [savedSessions, setSavedSessions] = useState<SavedSession[]>([]);

  // Load saved sessions from localStorage on mount
  React.useEffect(() => {
    const saved = localStorage.getItem('diffCheckerSessions');
    if (saved) {
      try {
        setSavedSessions(JSON.parse(saved));
      } catch (e) {
        console.error('Failed to load sessions:', e);
      }
    }
  }, []);

  const extractTextFromFile = async (file: File): Promise<string> => {
    const fileType = file.name.split('.').pop()?.toLowerCase() as FileType | undefined;

    try {
      if (fileType === 'txt' || fileType === 'md') {
        return await file.text();
      } else if (fileType === 'docx') {
        const arrayBuffer = await file.arrayBuffer();
        const result = await mammoth.extractRawText({ arrayBuffer });
        return result.value;
      } else if (fileType === 'pdf') {
        const arrayBuffer = await file.arrayBuffer();
        const parser = new PDFParse({ data: arrayBuffer });
        const res = await parser.getText();
        return res.pages.map((page) => page.text).join('\n');
      }
      return '';
    } catch (err) {
      const errorMessage = err instanceof Error ? err.message : 'Unknown error';
      throw new Error('ไม่สามารถอ่านไฟล์ได้: ' + errorMessage);
    }
  };

  const handleFileUpload = async (
    file: File | null | undefined,
    setFile: React.Dispatch<React.SetStateAction<File | null>>,
    setText: React.Dispatch<React.SetStateAction<string>>
  ): Promise<void> => {
    if (!file) return;

    const validTypes: FileType[] = ['txt', 'docx', 'pdf', 'md'];
    const fileType = file.name.split('.').pop()?.toLowerCase();

    if (!fileType || !validTypes.includes(fileType as FileType)) {
      setError('รองรับเฉพาะไฟล์ .txt, .docx, .pdf, .md เท่านั้น');
      return;
    }

    setLoading(true);
    setError('');

    try {
      const text = await extractTextFromFile(file);
      setText(text);
      setFile(file);
    } catch (err) {
      const errorMessage = err instanceof Error ? err.message : 'Unknown error';
      setError(errorMessage);
    } finally {
      setLoading(false);
    }
  };

  const saveSession = (): void => {
    if (!text1 || !text2) {
      setError('กรุณาใส่ข้อความทั้งสองฝั่งก่อนบันทึก');
      return;
    }

    const newSession: SavedSession = {
      timestamp: Date.now(),
      text1,
      text2,
      file1Name: file1?.name,
      file2Name: file2?.name,
      ignoreWhitespace,
      showWhitespace,
    };

    const updatedSessions = [newSession, ...savedSessions].slice(0, 10); // Keep only last 10 sessions
    setSavedSessions(updatedSessions);
    localStorage.setItem('diffCheckerSessions', JSON.stringify(updatedSessions));

    alert('บันทึก Session สำเร็จ!');
  };

  const loadSession = (session: SavedSession): void => {
    setText1(session.text1);
    setText2(session.text2);
    setIgnoreWhitespace(session.ignoreWhitespace);
    setShowWhitespace(session.showWhitespace);
    setFile1(null);
    setFile2(null);
    setInputMode1('text');
    setInputMode2('text');
    setDiffResult(null);

    computeDiff(session);
  };

  const deleteSession = (timestamp: number): void => {
    const updatedSessions = savedSessions.filter(s => s.timestamp !== timestamp);
    setSavedSessions(updatedSessions);
    localStorage.setItem('diffCheckerSessions', JSON.stringify(updatedSessions));
  };

  const clearAllSessions = (): void => {
    if (confirm('คุณต้องการลบ Session ทั้งหมดหรือไม่?')) {
      setSavedSessions([]);
      localStorage.removeItem('diffCheckerSessions');
    }
  };

  const normalizeForComparison = (line: string): string => {
    if (ignoreWhitespace) {
      return line.replace(/\s+/g, ' ').trim();
    }
    return line;
  };

  const getLCS = (arr1: string[], arr2: string[]): number[][] => {
    const m = arr1.length;
    const n = arr2.length;
    const dp: number[][] = Array(m + 1).fill(null).map(() => Array(n + 1).fill(0));

    for (let i = 1; i <= m; i++) {
      for (let j = 1; j <= n; j++) {
        if (normalizeForComparison(arr1[i - 1]) === normalizeForComparison(arr2[j - 1])) {
          dp[i][j] = dp[i - 1][j - 1] + 1;
        } else {
          dp[i][j] = Math.max(dp[i - 1][j], dp[i][j - 1]);
        }
      }
    }

    return dp;
  };

  const getCharacterDiff = (str1: string, str2: string): CharDiff[] => {
    const len1 = str1.length;
    const len2 = str2.length;
    const dp: number[][] = Array(len1 + 1).fill(null).map(() => Array(len2 + 1).fill(0));

    for (let i = 1; i <= len1; i++) {
      for (let j = 1; j <= len2; j++) {
        if (str1[i - 1] === str2[j - 1]) {
          dp[i][j] = dp[i - 1][j - 1] + 1;
        } else {
          dp[i][j] = Math.max(dp[i - 1][j], dp[i][j - 1]);
        }
      }
    }

    const result: CharDiff[] = [];
    let i = len1;
    let j = len2;

    while (i > 0 || j > 0) {
      if (i > 0 && j > 0 && str1[i - 1] === str2[j - 1]) {
        result.unshift({ type: 'equal', char: str1[i - 1] });
        i--;
        j--;
      } else if (j > 0 && (i === 0 || dp[i][j - 1] >= dp[i - 1][j])) {
        result.unshift({ type: 'added', char: str2[j - 1] });
        j--;
      } else if (i > 0) {
        result.unshift({ type: 'removed', char: str1[i - 1] });
        i--;
      }
    }

    return result;
  };

  const buildDiff = (lines1: string[], lines2: string[]): DiffHunk[] => {
    const dp = getLCS(lines1, lines2);
    const diff: DiffLine[] = [];
    let i = lines1.length;
    let j = lines2.length;

    while (i > 0 || j > 0) {
      if (i > 0 && j > 0 && normalizeForComparison(lines1[i - 1]) === normalizeForComparison(lines2[j - 1])) {
        diff.unshift({
          type: 'equal',
          line1: lines1[i - 1],
          line2: lines2[j - 1],
          lineNum1: i,
          lineNum2: j
        });
        i--;
        j--;
      } else if (j > 0 && (i === 0 || dp[i][j - 1] >= dp[i - 1][j])) {
        diff.unshift({
          type: 'added',
          line1: null,
          line2: lines2[j - 1],
          lineNum1: null,
          lineNum2: j
        });
        j--;
      } else if (i > 0) {
        diff.unshift({
          type: 'removed',
          line1: lines1[i - 1],
          line2: null,
          lineNum1: i,
          lineNum2: null
        });
        i--;
      }
    }

    const processedDiff: DiffLine[] = [];
    for (let k = 0; k < diff.length; k++) {
      const current = diff[k];
      const next = diff[k + 1];

      if (current.type === 'removed' && next && next.type === 'added' && current.line1 && next.line2) {
        const charDiff = getCharacterDiff(current.line1, next.line2);
        processedDiff.push({
          type: 'modified',
          line1: current.line1,
          line2: next.line2,
          lineNum1: current.lineNum1,
          lineNum2: next.lineNum2,
          charDiff
        });
        k++;
      } else {
        processedDiff.push(current);
      }
    }

    const grouped: DiffHunk[] = [];
    let contextBefore: DiffLine[] = [];
    let changes: DiffLine[] = [];

    for (let k = 0; k < processedDiff.length; k++) {
      const item = processedDiff[k];

      if (item.type === 'equal') {
        if (changes.length > 0) {
          const beforeContext = contextBefore.slice(-3);
          const afterContext: DiffLine[] = [];

          let afterCount = 0;
          for (let l = k; l < processedDiff.length && afterCount < 3; l++) {
            if (processedDiff[l].type === 'equal') {
              afterContext.push(processedDiff[l]);
              afterCount++;
            } else {
              break;
            }
          }

          grouped.push({
            type: 'hunk',
            beforeContext,
            changes,
            afterContext
          });

          changes = [];
          contextBefore = [item];
        } else {
          contextBefore.push(item);
        }
      } else {
        changes.push(item);
      }
    }

    if (changes.length > 0) {
      grouped.push({
        type: 'hunk',
        beforeContext: contextBefore.slice(-3),
        changes,
        afterContext: []
      });
    }

    return grouped;
  };

  const computeDiff = (session ?: SavedSession): void => {
    const t1 = session ? session.text1 : text1;
    const t2 = session ? session.text2 : text2;
    if (!t1 || !t2) {
      setError('กรุณาเลือกไฟล์หรือใส่ข้อความทั้งสองฝั่ง');
      return;
    }

    const allLines1 = t1.split('\n');
    const allLines2 = t2.split('\n');

    const lines1WithNum: LineWithNum[] = allLines1.map((line, idx) => ({ line, originalLineNum: idx + 1 }))
      .filter(item => item.line.trim() !== '');
    const lines2WithNum: LineWithNum[] = allLines2.map((line, idx) => ({ line, originalLineNum: idx + 1 }))
      .filter(item => item.line.trim() !== '');

    const lines1 = lines1WithNum.map(item => item.line);
    const lines2 = lines2WithNum.map(item => item.line);

    const result = buildDiff(lines1, lines2);

    result.forEach(hunk => {
      hunk.beforeContext = hunk.beforeContext.map((item): DiffLine => ({
        ...item,
        originalLineNum1: item.lineNum1 ? lines1WithNum[item.lineNum1 - 1]?.originalLineNum : null,
        originalLineNum2: item.lineNum2 ? lines2WithNum[item.lineNum2 - 1]?.originalLineNum : null
      }));

      hunk.changes = hunk.changes.map((item): DiffLine => ({
        ...item,
        originalLineNum1: item.lineNum1 ? lines1WithNum[item.lineNum1 - 1]?.originalLineNum : null,
        originalLineNum2: item.lineNum2 ? lines2WithNum[item.lineNum2 - 1]?.originalLineNum : null
      }));

      hunk.afterContext = hunk.afterContext.map((item): DiffLine => ({
        ...item,
        originalLineNum1: item.lineNum1 ? lines1WithNum[item.lineNum1 - 1]?.originalLineNum : null,
        originalLineNum2: item.lineNum2 ? lines2WithNum[item.lineNum2 - 1]?.originalLineNum : null
      }));
    });

    setDiffResult({ hunks: result, allLines1, allLines2 });
    setError('');
    setSearchTerm('');
    setSearchResults([]);
  };

  const removeFile = (
    setFile: React.Dispatch<React.SetStateAction<File | null>>,
    setText: React.Dispatch<React.SetStateAction<string>>
  ): void => {
    setFile(null);
    setText('');
    setDiffResult(null);
    setSearchTerm('');
    setSearchResults([]);
  };

  const clearText = (setText: React.Dispatch<React.SetStateAction<string>>): void => {
    setText('');
    setDiffResult(null);
    setSearchTerm('');
    setSearchResults([]);
  };

  const countChanges = (): ChangeCount => {
    if (!diffResult) return { added: 0, removed: 0 };

    let added = 0;
    let removed = 0;

    diffResult.hunks.forEach(hunk => {
      if (hunk.type === 'hunk') {
        hunk.changes.forEach(change => {
          if (change.type === 'added') added++;
          if (change.type === 'removed') removed++;
          if (change.type === 'modified') {
            added++;
            removed++;
          }
        });
      }
    });

    return { added, removed };
  };

  const scrollToLine = (lineNum: number, isOriginal: boolean = true): void => {
    const elementId = isOriginal ? `original-line-${lineNum}` : `modified-line-${lineNum}`;
    const element = document.getElementById(elementId);
    if (element) {
      element.scrollIntoView({ behavior: 'smooth', block: 'center' });
      element.classList.add('highlight-flash');
      setTimeout(() => {
        element.classList.remove('highlight-flash');
      }, 2000);
    }
  };

  const handleSearch = (term: string): void => {
    setSearchTerm(term);

    if (!term || !diffResult) {
      setSearchResults([]);
      return;
    }

    const results: SearchResult[] = [];
    const lowerTerm = term.toLowerCase();

    diffResult.hunks.forEach((hunk, hunkIdx) => {
      hunk.changes.forEach((change, changeIdx) => {
        const line1 = change.line1 || '';
        const line2 = change.line2 || '';

        if (line1.toLowerCase().includes(lowerTerm) || line2.toLowerCase().includes(lowerTerm)) {
          results.push({ hunkIdx, changeIdx, change });
        }
      });
    });

    setSearchResults(results);
    setCurrentSearchIndex(0);

    if (results.length > 0) {
      scrollToSearchResult(0, results);
    }
  };

  const scrollToSearchResult = (index: number, results: SearchResult[] = searchResults): void => {
    if (results.length === 0) return;

    const result = results[index];
    const elementId = `change-${result.hunkIdx}-${result.changeIdx}`;
    const element = document.getElementById(elementId);

    if (element) {
      element.scrollIntoView({ behavior: 'smooth', block: 'center' });
      element.classList.add('highlight-flash');
      setTimeout(() => {
        element.classList.remove('highlight-flash');
      }, 2000);
    }
  };

  const nextSearchResult = (): void => {
    if (searchResults.length === 0) return;
    const nextIndex = (currentSearchIndex + 1) % searchResults.length;
    setCurrentSearchIndex(nextIndex);
    scrollToSearchResult(nextIndex);
  };

  const prevSearchResult = (): void => {
    if (searchResults.length === 0) return;
    const prevIndex = (currentSearchIndex - 1 + searchResults.length) % searchResults.length;
    setCurrentSearchIndex(prevIndex);
    scrollToSearchResult(prevIndex);
  };

  const exportToHTML = (): void => {
    if (!diffResult) return;

    let html = `<!DOCTYPE html>
<html><head><meta charset="UTF-8"><title>Text Diff Result</title>
<style>
body{font-family:'Courier New',monospace;padding:20px;background:#f5f5f5}
.container{max-width:1200px;margin:0 auto;background:white;padding:20px}
.header{margin-bottom:20px;padding-bottom:20px;border-bottom:2px solid #e5e7eb}
.diff-line{display:flex;border-bottom:1px solid #e5e7eb}
.line-num{padding:4px 16px;background:#f9fafb;color:#6b7280;width:80px;text-align:right}
.line-content{padding:4px 16px;flex:1;white-space:pre-wrap}
.added{background:#dcfce7}
.removed{background:#fee2e2}
</style></head><body><div class="container">
<div class="header"><h1>Text Diff Result</h1>
<p>Added: +${countChanges().added} | Removed: -${countChanges().removed}</p></div>`;

    diffResult.hunks.forEach(hunk => {
      hunk.changes.forEach(change => {
        const lineNum1 = change.lineNum1 || '—';
        const lineNum2 = change.lineNum2 || '—';
        const line = change.line1 || change.line2 || '';
        const className = change.type;

        html += `<div class="diff-line ${className}">
<div class="line-num">${lineNum1}</div>
<div class="line-num">${lineNum2}</div>
<div class="line-content">${line.replace(/</g, '&lt;').replace(/>/g, '&gt;')}</div></div>`;
      });
    });

    html += '</div></body></html>';

    const blob = new Blob([html], { type: 'text/html' });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = 'diff-result.html';
    a.click();
    URL.revokeObjectURL(url);
  };

  const copyDiffToClipboard = (): void => {
    if (!diffResult) return;

    let text = 'Text Diff Result\n';
    text += `Added: +${countChanges().added} | Removed: -${countChanges().removed}\n\n`;

    diffResult.hunks.forEach(hunk => {
      hunk.changes.forEach(change => {
        const prefix = change.type === 'added' ? '+' : change.type === 'removed' ? '-' : ' ';
        const line = change.line1 || change.line2 || '';
        text += `${prefix} ${line}\n`;
      });
      text += '\n';
    });

    navigator.clipboard.writeText(text).then(() => {
      setCopied(true);
      setTimeout(() => setCopied(false), 2000);
    });
  };

  const visualizeWhitespace = (text: string | null | undefined): string => {
    if (!showWhitespace || !text) return text || '';
    return text.replace(/ /g, '·').replace(/\t/g, '→   ');
  };

  const renderCharacterDiff = (charDiff: CharDiff[]): React.ReactElement[] => {
    return charDiff.map((item, idx) => {
      const char = visualizeWhitespace(item.char);
      if (item.type === 'equal') {
        return <span key={idx}>{char}</span>;
      } else if (item.type === 'added') {
        return <span key={idx} className="bg-green-300 text-green-900">{char}</span>;
      } else {
        return <span key={idx} className="bg-red-300 text-red-900 line-through">{char}</span>;
      }
    });
  };

  return (
    <div className="min-h-screen bg-gradient-to-br from-slate-50 to-slate-100 p-4">
      <style>{`
        @keyframes flash {
          0%, 100% { background-color: transparent; }
          50% { background-color: rgba(59, 130, 246, 0.3); }
        }
        .highlight-flash {
          animation: flash 0.5s ease-in-out 3;
        }
      `}</style>

      <div className="max-w-7xl mx-auto">
        <div className="bg-white rounded-2xl shadow-xl overflow-hidden">
          <div className="bg-gradient-to-r from-blue-600 to-blue-700 text-white p-6">
            <h1 className="text-3xl font-bold mb-2">Text Diff Checker</h1>
            <p className="text-blue-100">เปรียบเทียบความแตกต่างแบบ Git-style รองรับ PDF, DOCX, TXT, MD</p>
          </div>

          {error && (
            <div className="m-6 p-4 bg-red-50 border border-red-200 rounded-lg flex items-start gap-3">
              <AlertCircle className="text-red-500 mt-0.5 flex-shrink-0" size={20} />
              <p className="text-red-700">{error}</p>
            </div>
          )}

          <div className="p-6 bg-slate-50 border-b">
            <div className="grid md:grid-cols-2 gap-4">
              <div>
                <div className="flex items-center justify-between mb-2">
                  <h3 className="font-semibold text-slate-700 flex items-center gap-2">
                    <div className="w-2 h-2 bg-red-500 rounded-full"></div>
                    ต้นฉบับ (a)
                  </h3>
                  <div className="flex gap-2">
                    <button
                      onClick={() => setInputMode1('file')}
                      className={`text-xs px-2 py-1 rounded ${inputMode1 === 'file' ? 'bg-red-500 text-white' : 'bg-slate-200 text-slate-600'}`}
                    >
                      ไฟล์
                    </button>
                    <button
                      onClick={() => setInputMode1('text')}
                      className={`text-xs px-2 py-1 rounded ${inputMode1 === 'text' ? 'bg-red-500 text-white' : 'bg-slate-200 text-slate-600'}`}
                    >
                      ข้อความ
                    </button>
                  </div>
                </div>

                {inputMode1 === 'file' ? (
                  !file1 ? (
                    <label className="block border-2 border-dashed border-slate-300 rounded-lg p-6 text-center cursor-pointer hover:border-red-400 hover:bg-red-50 transition">
                      <input type="file" onChange={(e) => { handleFileUpload(e.target.files?.[0], setFile1, setText1); setInputMode1('file'); }} accept=".txt,.docx,.pdf,.md" className="hidden" />
                      <Upload className="mx-auto mb-2 text-slate-400" size={32} />
                      <p className="text-sm text-slate-600">อัปโหลดไฟล์</p>
                      <p className="text-xs text-slate-500 mt-1">TXT, DOCX, PDF, MD</p>
                    </label>
                  ) : (
                    <div className="border border-slate-200 rounded-lg p-3 bg-white flex items-center gap-3">
                      <FileText className="text-red-500 flex-shrink-0" size={20} />
                      <span className="text-sm text-slate-700 truncate flex-1">{file1.name}</span>
                      <button onClick={() => removeFile(setFile1, setText1)} className="text-slate-400 hover:text-red-500 transition">
                        <X size={16} />
                      </button>
                    </div>
                  )
                ) : (
                  <div className="relative">
                    <textarea
                      value={text1}
                      onChange={(e) => setText1(e.target.value)}
                      placeholder="วางข้อความที่นี่..."
                      className="w-full h-32 p-3 text-black border border-slate-300 rounded-lg text-sm font-mono resize-none focus:ring-2 focus:ring-red-400 focus:border-transparent"
                    />
                    {text1 && (
                      <button
                        onClick={() => clearText(setText1)}
                        className="absolute top-2 right-2 text-slate-400 hover:text-red-500 transition"
                      >
                        <X size={16} />
                      </button>
                    )}
                  </div>
                )}
              </div>

              <div>
                <div className="flex items-center justify-between mb-2">
                  <h3 className="font-semibold text-slate-700 flex items-center gap-2">
                    <div className="w-2 h-2 bg-green-500 rounded-full"></div>
                    แก้ไขแล้ว (b)
                  </h3>
                  <div className="flex gap-2">
                    <button
                      onClick={() => setInputMode2('file')}
                      className={`text-xs px-2 py-1 rounded ${inputMode2 === 'file' ? 'bg-green-500 text-white' : 'bg-slate-200 text-slate-600'}`}
                    >
                      ไฟล์
                    </button>
                    <button
                      onClick={() => setInputMode2('text')}
                      className={`text-xs px-2 py-1 rounded ${inputMode2 === 'text' ? 'bg-green-500 text-white' : 'bg-slate-200 text-slate-600'}`}
                    >
                      ข้อความ
                    </button>
                  </div>
                </div>

                {inputMode2 === 'file' ? (
                  !file2 ? (
                    <label className="block border-2 border-dashed border-slate-300 rounded-lg p-6 text-center cursor-pointer hover:border-green-400 hover:bg-green-50 transition">
                      <input type="file" onChange={(e) => { handleFileUpload(e.target.files?.[0], setFile2, setText2); setInputMode2('file'); }} accept=".txt,.docx,.pdf,.md" className="hidden" />
                      <Upload className="mx-auto mb-2 text-slate-400" size={32} />
                      <p className="text-sm text-slate-600">อัปโหลดไฟล์</p>
                      <p className="text-xs text-slate-500 mt-1">TXT, DOCX, PDF, MD</p>
                    </label>
                  ) : (
                    <div className="border border-slate-200 rounded-lg p-3 bg-white flex items-center gap-3">
                      <FileText className="text-green-500 flex-shrink-0" size={20} />
                      <span className="text-sm text-slate-700 truncate flex-1">{file2.name}</span>
                      <button onClick={() => removeFile(setFile2, setText2)} className="text-slate-400 hover:text-red-500 transition">
                        <X size={16} />
                      </button>
                    </div>
                  )
                ) : (
                  <div className="relative">
                    <textarea
                      value={text2}
                      onChange={(e) => setText2(e.target.value)}
                      placeholder="วางข้อความที่นี่..."
                      className="w-full h-32 p-3 border border-slate-300 rounded-lg text-sm text-black font-mono resize-none focus:ring-2 focus:ring-green-400 focus:border-transparent"
                    />
                    {text2 && (
                      <button
                        onClick={() => clearText(setText2)}
                        className="absolute top-2 right-2 text-slate-400 hover:text-red-500 transition"
                      >
                        <X size={16} />
                      </button>
                    )}
                  </div>
                )}
              </div>
            </div>

            <div className="mt-4 flex gap-4 flex-wrap">
              <label className="flex items-center gap-2 cursor-pointer">
                <input type="checkbox" checked={ignoreWhitespace} onChange={(e) => setIgnoreWhitespace(e.target.checked)} className="w-4 h-4 text-blue-600 rounded" />
                <span className="text-sm text-slate-700">Ignore whitespace</span>
              </label>

              <label className="flex items-center gap-2 cursor-pointer">
                <input type="checkbox" checked={showWhitespace} onChange={(e) => setShowWhitespace(e.target.checked)} className="w-4 h-4 text-blue-600 rounded" />
                <span className="text-sm text-slate-700">Show whitespace (· = space, → = tab)</span>
              </label>
            </div>

            <div className="mt-4 flex gap-2">
              <button onClick={()=> computeDiff()} disabled={loading || (!text1 || !text2)} className="flex-1 bg-gradient-to-r from-blue-500 to-blue-600 text-white py-3 px-6 rounded-lg font-semibold hover:from-blue-600 hover:to-blue-700 disabled:opacity-50 disabled:cursor-not-allowed transition shadow-lg">
                {loading ? 'กำลังประมวลผล...' : 'เปรียบเทียบ'}
              </button>
              <button onClick={saveSession} disabled={!text1 || !text2} className="px-6 py-3 bg-green-500 text-white rounded-lg font-semibold hover:bg-green-600 disabled:opacity-50 disabled:cursor-not-allowed transition shadow-lg">
                บันทึก Session
              </button>
            </div>
          </div>

          {savedSessions.length > 0 && (
            <div className="p-6 bg-slate-50 border-b">
              <div className="flex items-center justify-between mb-3">
                <h3 className="font-semibold text-slate-700">Session ที่บันทึกไว้</h3>
                <button onClick={clearAllSessions} className="text-xs text-red-600 hover:text-red-700 underline">
                  ลบทั้งหมด
                </button>
              </div>
              <div className="space-y-2 max-h-48 overflow-y-auto">
                {savedSessions.map((session) => (
                  <div key={session.timestamp} className="bg-white border border-slate-200 rounded-lg p-3 flex items-center justify-between hover:border-blue-400 transition">
                    <div className="flex-1 min-w-0">
                      <div className="flex items-center gap-2 text-xs text-slate-500 mb-1">
                        <span>{new Date(session.timestamp).toLocaleString('th-TH')}</span>
                        {session.file1Name && <span className="text-red-600">• {session.file1Name}</span>}
                        {session.file2Name && <span className="text-green-600">• {session.file2Name}</span>}
                      </div>
                      <div className="text-xs text-slate-400 truncate">
                        {session.text1.substring(0, 50)}... ↔ {session.text2.substring(0, 50)}...
                      </div>
                    </div>
                    <div className="flex gap-2 ml-3">
                      <button
                        type='button'
                        onClick={() => loadSession(session)}
                        className="px-3 py-1 bg-blue-500 text-white text-xs rounded hover:bg-blue-600 transition"
                      >
                        โหลด
                      </button>
                      <button
                        onClick={() => deleteSession(session.timestamp)}
                        className="px-3 py-1 bg-red-500 text-white text-xs rounded hover:bg-red-600 transition"
                      >
                        ลบ
                      </button>
                    </div>
                  </div>
                ))}
              </div>
            </div>
          )}

          {diffResult && (
            <div className="p-6">
              <div className="mb-4 space-y-4">
                <div className="flex items-center justify-between flex-wrap gap-4">
                  <div className="flex items-center gap-4">
                    <h3 className="text-lg font-semibold text-slate-800">ผลการเปรียบเทียบ</h3>
                    <div className="flex gap-3 text-sm">
                      <span className="text-green-600 font-semibold">+{countChanges().added}</span>
                      <span className="text-red-600 font-semibold">-{countChanges().removed}</span>
                    </div>
                  </div>

                  <div className="flex gap-2">
                    <button onClick={exportToHTML} className="flex items-center text-white gap-2 px-3 py-2 bg-green-500 hover:bg-green-300 rounded-lg text-sm transition">
                      <Download size={16} />
                      <span>Export</span>
                    </button>
                    <button onClick={copyDiffToClipboard} className="flex items-center text-white gap-2 px-3 py-2 bg-blue-500 hover:bg-blue-300 rounded-lg text-sm transition">
                      {copied ? <Check size={16} className="text-green-600" /> : <Copy size={16} />}
                      <span>{copied ? 'Copied!' : 'Copy'}</span>
                    </button>
                  </div>
                </div>

                <div className="flex items-center gap-4 flex-wrap">
                  <div className="relative flex-grow max-w-md">
                    <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 text-slate-400" size={16} />
                    <input type="text" value={searchTerm} onChange={(e) => handleSearch(e.target.value)} placeholder="ค้นหาในผลลัพธ์..." className="w-full pl-9 pr-3 py-2 border border-slate-300 rounded-lg text-sm focus:ring-2 focus:ring-blue-400 focus:border-transparent" />
                  </div>

                  {searchResults.length > 0 && (
                    <div className="flex items-center gap-3">
                      <span className="text-sm text-slate-600">{currentSearchIndex + 1} / {searchResults.length}</span>
                      <div className="flex gap-1">
                        <button onClick={prevSearchResult} className="px-3 py-2 hover:bg-slate-100 rounded transition text-sm">← ก่อนหน้า</button>
                        <button onClick={nextSearchResult} className="px-3 py-2 hover:bg-slate-100 rounded transition text-sm">ถัดไป →</button>
                      </div>
                    </div>
                  )}

                  <div className="flex bg-slate-100 rounded-lg p-1">
                    <button onClick={() => setViewMode('diff')} className={`px-3 py-1.5 rounded text-sm font-medium transition ${viewMode === 'diff' ? 'bg-white text-slate-900 shadow' : 'text-slate-600'}`}>
                      Diff
                    </button>
                    <button onClick={() => setViewMode('original')} className={`px-3 py-1.5 rounded text-sm font-medium transition ${viewMode === 'original' ? 'bg-white text-slate-900 shadow' : 'text-slate-600'}`}>
                      ต้นฉบับ
                    </button>
                    <button onClick={() => setViewMode('modified')} className={`px-3 py-1.5 rounded text-sm font-medium transition ${viewMode === 'modified' ? 'bg-white text-slate-900 shadow' : 'text-slate-600'}`}>
                      แก้ไขแล้ว
                    </button>
                  </div>

                  {viewMode === 'diff' && (
                    <label className="flex items-center gap-2 cursor-pointer">
                      <input type="checkbox" checked={showOnlyDiff} onChange={(e) => setShowOnlyDiff(e.target.checked)} className="w-4 h-4 text-blue-600 rounded" />
                      <span className="text-sm text-slate-700">ซ่อน context</span>
                    </label>
                  )}
                </div>
              </div>

              {viewMode === 'diff' && (
                <div className="border border-slate-200 rounded-lg overflow-hidden bg-slate-900">
                  <div className="max-h-[700px] overflow-y-auto">
                    {diffResult.hunks.map((hunk, hunkIdx) => (
                      <div key={hunkIdx} className="border-b border-slate-700 last:border-b-0">
                        <div className="bg-slate-800 px-4 py-2 flex items-center justify-between">
                          <span className="text-cyan-400 font-mono text-xs">@@ {hunk.changes[0]?.lineNum1 || hunk.changes[0]?.lineNum2} @@</span>
                          <button onClick={() => {
                            const lineNum = hunk.changes[0]?.originalLineNum1 || hunk.changes[0]?.originalLineNum2;
                            if (lineNum) {
                              setViewMode('original');
                              setTimeout(() => scrollToLine(lineNum, true), 100);
                            }
                          }} className="text-xs text-cyan-400 hover:text-cyan-300 underline">
                            ดู context
                          </button>
                        </div>

                        {!showOnlyDiff && hunk.beforeContext.map((line, idx) => (
                          <div key={`before-${idx}`} className="flex hover:bg-slate-800 transition">
                            <div className="px-4 py-1 text-slate-500 font-mono text-xs w-12 text-right flex-shrink-0 select-none border-r border-slate-700">{line.lineNum1}</div>
                            <div className="px-4 py-1 text-slate-500 font-mono text-xs w-12 text-right flex-shrink-0 select-none border-r border-slate-700">{line.lineNum2}</div>
                            <div className="px-4 py-1 font-mono text-sm text-slate-400 flex-1">{visualizeWhitespace(line.line1 || line.line2)}</div>
                          </div>
                        ))}

                        {hunk.changes.map((change, idx) => (
                          <div key={`change-${idx}`} id={`change-${hunkIdx}-${idx}`} className={`flex ${change.type === 'removed' ? 'bg-red-950' : change.type === 'added' ? 'bg-green-950' : change.type === 'modified' ? 'bg-yellow-950' : ''} hover:brightness-110 transition cursor-pointer`} onClick={() => {
                            const lineNum = change.type === 'removed' ? change.originalLineNum1 : change.originalLineNum2;
                            const isOriginal = change.type === 'removed';
                            if (lineNum) {
                              setViewMode(isOriginal ? 'original' : 'modified');
                              setTimeout(() => scrollToLine(lineNum, isOriginal), 100);
                            }
                          }}>
                            <div className={`px-4 py-1 font-mono text-xs w-12 text-right flex-shrink-0 select-none border-r ${change.type === 'removed' ? 'bg-red-900 text-red-300 border-red-800' : change.type === 'added' ? 'bg-green-900 text-green-300 border-green-800' : change.type === 'modified' ? 'bg-yellow-900 text-yellow-300 border-yellow-800' : 'text-slate-500 border-slate-700'}`}>
                              {change.lineNum1 || ''}
                            </div>
                            <div className={`px-4 py-1 font-mono text-xs w-12 text-right flex-shrink-0 select-none border-r ${change.type === 'removed' ? 'bg-red-900 text-red-300 border-red-800' : change.type === 'added' ? 'bg-green-900 text-green-300 border-green-800' : change.type === 'modified' ? 'bg-yellow-900 text-yellow-300 border-yellow-800' : 'text-slate-500 border-slate-700'}`}>
                              {change.lineNum2 || ''}
                            </div>
                            <div className={`px-2 py-1 font-mono text-sm flex-1 ${change.type === 'removed' ? 'text-red-300' : change.type === 'added' ? 'text-green-300' : change.type === 'modified' ? 'text-yellow-300' : 'text-slate-300'}`}>
                              {change.type === 'modified' && change.charDiff ? (
                                <div>
                                  <div className="text-red-300 mb-1">
                                    <span className="inline-block w-6 text-red-400">-</span>
                                    {renderCharacterDiff(change.charDiff.filter(c => c.type !== 'added'))}
                                  </div>
                                  <div className="text-green-300">
                                    <span className="inline-block w-6 text-green-400">+</span>
                                    {renderCharacterDiff(change.charDiff.filter(c => c.type !== 'removed'))}
                                  </div>
                                </div>
                              ) : (
                                <>
                                  <span className={`inline-block w-6 ${change.type === 'removed' ? 'text-red-400' : change.type === 'added' ? 'text-green-400' : 'text-slate-500'}`}>
                                    {change.type === 'removed' ? '-' : change.type === 'added' ? '+' : ' '}
                                  </span>
                                  {visualizeWhitespace(change.line1 || change.line2)}
                                </>
                              )}
                            </div>
                          </div>
                        ))}

                        {!showOnlyDiff && hunk.afterContext.map((line, idx) => (
                          <div key={`after-${idx}`} className="flex hover:bg-slate-800 transition">
                            <div className="px-4 py-1 text-slate-500 font-mono text-xs w-12 text-right flex-shrink-0 select-none border-r border-slate-700">{line.lineNum1}</div>
                            <div className="px-4 py-1 text-slate-500 font-mono text-xs w-12 text-right flex-shrink-0 select-none border-r border-slate-700">{line.lineNum2}</div>
                            <div className="px-4 py-1 font-mono text-sm text-slate-400 flex-1">{visualizeWhitespace(line.line1 || line.line2)}</div>
                          </div>
                        ))}
                      </div>
                    ))}
                  </div>
                </div>
              )}

              {viewMode === 'original' && (
                <div className="border border-slate-200 rounded-lg overflow-hidden">
                  <div className="bg-red-50 px-4 py-2 border-b border-red-200 flex items-center justify-between">
                    <span className="font-semibold text-red-700">ไฟล์ต้นฉบับ (a)</span>
                    <button onClick={() => setViewMode('diff')} className="text-xs text-red-600 hover:text-red-700 underline">กลับไปดู Diff</button>
                  </div>
                  <div className="max-h-[700px] overflow-y-auto bg-white">
                    {diffResult.allLines1.map((line, idx) => (
                      <div key={idx} id={`original-line-${idx + 1}`} className="flex hover:bg-slate-50 transition">
                        <div className="px-4 py-1 text-slate-400 font-mono text-xs w-16 text-right flex-shrink-0 select-none border-r border-slate-200 bg-slate-50">{idx + 1}</div>
                        <pre className="px-4 py-1 font-mono text-sm text-slate-700 flex-1 whitespace-pre-wrap break-words m-0">{line || <span className="text-slate-300">(empty)</span>}</pre>
                      </div>
                    ))}
                  </div>
                </div>
              )}

              {viewMode === 'modified' && (
                <div className="border border-slate-200 rounded-lg overflow-hidden">
                  <div className="bg-green-50 px-4 py-2 border-b border-green-200 flex items-center justify-between">
                    <span className="font-semibold text-green-700">ไฟล์แก้ไขแล้ว (b)</span>
                    <button onClick={() => setViewMode('diff')} className="text-xs text-green-600 hover:text-green-700 underline">กลับไปดู Diff</button>
                  </div>
                  <div className="max-h-[700px] overflow-y-auto bg-white">
                    {diffResult.allLines2.map((line, idx) => (
                      <div key={idx} id={`modified-line-${idx + 1}`} className="flex hover:bg-slate-50 transition">
                        <div className="px-4 py-1 text-slate-400 font-mono text-xs w-16 text-right flex-shrink-0 select-none border-r border-slate-200 bg-slate-50">{idx + 1}</div>
                        <pre className="px-4 py-1 font-mono text-sm text-slate-700 flex-1 whitespace-pre-wrap break-words m-0">{line || <span className="text-slate-300">(empty)</span>}</pre>
                      </div>
                    ))}
                  </div>
                </div>
              )}

              <div className="mt-4 p-4 bg-blue-50 rounded-lg">
                <p className="text-sm text-slate-700">
                  <strong>สรุป:</strong> เพิ่ม <span className="font-semibold text-green-600">+{countChanges().added}</span> บรรทัด,
                  ลบ <span className="font-semibold text-red-600">-{countChanges().removed}</span> บรรทัด
                </p>
              </div>
            </div>
          )}
        </div>
      </div>
    </div>
  );
};

export default TextDiffChecker;