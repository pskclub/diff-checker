// Type definitions for Text Diff Checker

export type FileType = 'txt' | 'docx' | 'pdf' | 'md';
export type ViewMode = 'diff' | 'original' | 'modified';
export type DiffType = 'equal' | 'added' | 'removed' | 'modified';
export type CharDiffType = 'equal' | 'added' | 'removed';
export type InputMode = 'file' | 'text';

export interface CharDiff {
  type: CharDiffType;
  char: string;
}

export interface DiffLine {
  type: DiffType;
  line1: string | null;
  line2: string | null;
  lineNum1: number | null;
  lineNum2: number | null;
  originalLineNum1?: number | null;
  originalLineNum2?: number | null;
  charDiff?: CharDiff[];
}

export interface DiffHunk {
  type: 'hunk';
  beforeContext: DiffLine[];
  changes: DiffLine[];
  afterContext: DiffLine[];
}

export interface DiffResult {
  hunks: DiffHunk[];
  allLines1: string[];
  allLines2: string[];
}

export interface SearchResult {
  hunkIdx: number;
  changeIdx: number;
  change: DiffLine;
}

export interface LineWithNum {
  line: string;
  originalLineNum: number;
}

export interface ChangeCount {
  added: number;
  removed: number;
}

export interface SavedSession {
  timestamp: number;
  text1: string;
  text2: string;
  file1Name?: string;
  file2Name?: string;
  ignoreWhitespace: boolean;
  showWhitespace: boolean;
  ignoreEmptyLines?: boolean;
}

