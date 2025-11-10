'use client';

import React, { useState } from 'react';
import { AlertCircle, Search, Download, Copy, Check } from 'lucide-react';

// Types
import { DiffResult, ViewMode, InputMode, SavedSession } from './types/diff.types';

// Constants
import { ERROR_MESSAGES, VALID_FILE_TYPES, COPIED_FEEDBACK_DURATION } from './constants/diff.constants';

// Utils
import { extractTextFromFile, isValidFileType } from './utils/file.utils';
import { computeDiffResult } from './utils/diff.utils';
import { exportToHTML, copyDiffToClipboard, countChanges } from './utils/export.utils';

// Hooks
import { useSessionManagement } from './hooks/useSessionManagement';
import { useSearch } from './hooks/useSearch';

// Components
import { FileUploader } from './components/FileUploader';
import { DiffViewer } from './components/DiffViewer';

const TextDiffChecker: React.FC = () => {
  // File and text state
  const [file1, setFile1] = useState<File | null>(null);
  const [file2, setFile2] = useState<File | null>(null);
  const [text1, setText1] = useState<string>('');
  const [text2, setText2] = useState<string>('');
  
  // UI state
  const [loading, setLoading] = useState<boolean>(false);
  const [error, setError] = useState<string>('');
  const [diffResult, setDiffResult] = useState<DiffResult | null>(null);
  const [viewMode, setViewMode] = useState<ViewMode>('diff');
  const [showOnlyDiff, setShowOnlyDiff] = useState<boolean>(false);
  const [copied, setCopied] = useState<boolean>(false);
  const [inputMode1, setInputMode1] = useState<InputMode>('file');
  const [inputMode2, setInputMode2] = useState<InputMode>('file');
  
  // Options state
  const [ignoreWhitespace, setIgnoreWhitespace] = useState<boolean>(true);
  const [showWhitespace, setShowWhitespace] = useState<boolean>(false);
  const [ignoreEmptyLines, setIgnoreEmptyLines] = useState<boolean>(true);

  // Custom hooks
  const {
    searchTerm,
    searchResults,
    currentSearchIndex,
    setSearchTerm,
    handleSearch,
    nextSearchResult,
    prevSearchResult,
    clearSearch,
  } = useSearch();

  const {
    savedSessions,
    saveSession: saveSessionToStorage,
    loadSession: loadSessionFromStorage,
    deleteSession,
    clearAllSessions,
  } = useSessionManagement((session: SavedSession) => {
    setText1(session.text1);
    setText2(session.text2);
    setIgnoreWhitespace(session.ignoreWhitespace);
    setShowWhitespace(session.showWhitespace);
    setIgnoreEmptyLines(session.ignoreEmptyLines || false);
    setFile1(null);
    setFile2(null);
    setInputMode1('text');
    setInputMode2('text');
    setDiffResult(null);
    computeDiff(session.text1, session.text2, session.ignoreWhitespace, session.ignoreEmptyLines || false);
  });

  // File upload handler
  const handleFileUpload = async (
    file: File | null | undefined,
    setFile: React.Dispatch<React.SetStateAction<File | null>>,
    setText: React.Dispatch<React.SetStateAction<string>>
  ): Promise<void> => {
    if (!file) return;

    if (!isValidFileType(file.name)) {
      setError(ERROR_MESSAGES.INVALID_FILE_TYPE);
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

  // Compute diff
  const computeDiff = (
    t1: string = text1,
    t2: string = text2,
    ignoreWS: boolean = ignoreWhitespace,
    ignoreEmpty: boolean = ignoreEmptyLines
  ): void => {
    if (!t1 || !t2) {
      setError(ERROR_MESSAGES.NO_TEXT_PROVIDED);
      return;
    }

    const result = computeDiffResult(t1, t2, ignoreWS, ignoreEmpty);
    setDiffResult(result);
    setError('');
    clearSearch();
  };

  // Remove file
  const removeFile = (
    setFile: React.Dispatch<React.SetStateAction<File | null>>,
    setText: React.Dispatch<React.SetStateAction<string>>
  ): void => {
    setFile(null);
    setText('');
    setDiffResult(null);
    clearSearch();
  };

  // Clear text
  const clearText = (setText: React.Dispatch<React.SetStateAction<string>>): void => {
    setText('');
    setDiffResult(null);
    clearSearch();
  };

  // Save session
  const saveSession = (): void => {
    saveSessionToStorage({
      text1,
      text2,
      file1Name: file1?.name,
      file2Name: file2?.name,
      ignoreWhitespace,
      showWhitespace,
      ignoreEmptyLines,
    });
  };

  // Copy to clipboard handler
  const handleCopyToClipboard = async (): Promise<void> => {
    const success = await copyDiffToClipboard(diffResult);
    if (success) {
      setCopied(true);
      setTimeout(() => setCopied(false), COPIED_FEEDBACK_DURATION);
    }
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
          {/* Header */}
          <div className="bg-gradient-to-r from-blue-600 to-blue-700 text-white p-6">
            <h1 className="text-3xl font-bold mb-2">Text Diff Checker</h1>
            <p className="text-blue-100">เปรียบเทียบความแตกต่างแบบ Git-style รองรับ PDF, DOCX, TXT, MD</p>
          </div>

          {/* Error message */}
          {error && (
            <div className="m-6 p-4 bg-red-50 border border-red-200 rounded-lg flex items-start gap-3">
              <AlertCircle className="text-red-500 mt-0.5 flex-shrink-0" size={20} />
              <p className="text-red-700">{error}</p>
            </div>
          )}

          {/* File uploaders */}
          <div className="p-6 bg-slate-50 border-b">
            <div className="grid md:grid-cols-2 gap-4">
              <FileUploader
                file={file1}
                text={text1}
                inputMode={inputMode1}
                label="ต้นฉบับ (a)"
                color="red"
                onFileChange={(file) => handleFileUpload(file, setFile1, setText1)}
                onTextChange={setText1}
                onInputModeChange={setInputMode1}
                onRemoveFile={() => removeFile(setFile1, setText1)}
                onClearText={() => clearText(setText1)}
              />

              <FileUploader
                file={file2}
                text={text2}
                inputMode={inputMode2}
                label="แก้ไขแล้ว (b)"
                color="green"
                onFileChange={(file) => handleFileUpload(file, setFile2, setText2)}
                onTextChange={setText2}
                onInputModeChange={setInputMode2}
                onRemoveFile={() => removeFile(setFile2, setText2)}
                onClearText={() => clearText(setText2)}
              />
            </div>

            {/* Options */}
            <div className="mt-4 flex gap-4 flex-wrap">
              <label className="flex items-center gap-2 cursor-pointer">
                <input type="checkbox" checked={ignoreWhitespace} onChange={(e) => setIgnoreWhitespace(e.target.checked)} className="w-4 h-4 text-blue-600 rounded" />
                <span className="text-sm text-slate-700">Ignore whitespace (spaces, tabs, etc.)</span>
              </label>
              <label className="flex items-center gap-2 cursor-pointer">
                <input type="checkbox" checked={ignoreEmptyLines} onChange={(e) => setIgnoreEmptyLines(e.target.checked)} className="w-4 h-4 text-blue-600 rounded" />
                <span className="text-sm text-slate-700">Ignore empty lines</span>
              </label>
              <label className="flex items-center gap-2 cursor-pointer">
                <input type="checkbox" checked={showWhitespace} onChange={(e) => setShowWhitespace(e.target.checked)} className="w-4 h-4 text-blue-600 rounded" />
                <span className="text-sm text-slate-700">Show whitespace (· = space, → = tab)</span>
              </label>
            </div>

            {/* Action buttons */}
            <div className="mt-4 flex gap-2">
              <button onClick={() => computeDiff()} disabled={loading || (!text1 || !text2)} className="flex-1 bg-gradient-to-r from-blue-500 to-blue-600 text-white py-3 px-6 rounded-lg font-semibold hover:from-blue-600 hover:to-blue-700 disabled:opacity-50 disabled:cursor-not-allowed transition shadow-lg">
                {loading ? 'กำลังประมวลผล...' : 'เปรียบเทียบ'}
              </button>
              <button onClick={saveSession} disabled={!text1 || !text2} className="px-6 py-3 bg-green-500 text-white rounded-lg font-semibold hover:bg-green-600 disabled:opacity-50 disabled:cursor-not-allowed transition shadow-lg">
                บันทึก Session
              </button>
            </div>
          </div>

          {/* Saved sessions */}
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
                        onClick={() => loadSessionFromStorage(session)}
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

          {/* Diff results */}
          {diffResult && (
            <div className="p-6">
              <div className="mb-4 space-y-4">
                <div className="flex items-center justify-between flex-wrap gap-4">
                  <div className="flex items-center gap-4">
                    <h3 className="text-lg font-semibold text-slate-800">ผลการเปรียบเทียบ</h3>
                    <div className="flex gap-3 text-sm">
                      <span className="text-green-600 font-semibold">+{countChanges(diffResult).added}</span>
                      <span className="text-red-600 font-semibold">-{countChanges(diffResult).removed}</span>
                    </div>
                  </div>

                  <div className="flex gap-2">
                    <button onClick={() => exportToHTML(diffResult)} className="flex items-center text-white gap-2 px-3 py-2 bg-green-500 hover:bg-green-300 rounded-lg text-sm transition">
                      <Download size={16} />
                      <span>Export</span>
                    </button>
                    <button onClick={handleCopyToClipboard} className="flex items-center text-white gap-2 px-3 py-2 bg-blue-500 hover:bg-blue-300 rounded-lg text-sm transition">
                      {copied ? <Check size={16} className="text-green-600" /> : <Copy size={16} />}
                      <span>{copied ? 'Copied!' : 'Copy'}</span>
                    </button>
                  </div>
                </div>

                <div className="flex items-center gap-4 flex-wrap">
                  <div className="relative flex-grow max-w-md">
                    <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 text-slate-400" size={16} />
                    <input type="text" value={searchTerm} onChange={(e) => handleSearch(e.target.value, diffResult)} placeholder="ค้นหาในผลลัพธ์..." className="w-full pl-9 pr-3 py-2 border border-slate-300 rounded-lg text-sm focus:ring-2 focus:ring-blue-400 focus:border-transparent" />
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

              <DiffViewer
                diffResult={diffResult}
                viewMode={viewMode}
                showOnlyDiff={showOnlyDiff}
                showWhitespace={showWhitespace}
                onViewModeChange={setViewMode}
              />

              <div className="mt-4 p-4 bg-blue-50 rounded-lg">
                <p className="text-sm text-slate-700">
                  <strong>สรุป:</strong> เพิ่ม <span className="font-semibold text-green-600">+{countChanges(diffResult).added}</span> บรรทัด,
                  ลบ <span className="font-semibold text-red-600">-{countChanges(diffResult).removed}</span> บรรทัด
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

