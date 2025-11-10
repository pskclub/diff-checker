// Diff algorithm utilities - Myers diff algorithm

import {
  DiffLine,
  DiffHunk,
  CharDiff,
  LineWithNum,
  DiffResult,
} from '../types/diff.types';
import {
  SIMILARITY_THRESHOLD,
  CONTEXT_SIZE,
  MERGE_DISTANCE,
} from '../constants/diff.constants';

/**
 * Myers diff algorithm - similar to what git uses
 */
export const myersDiff = (
  arr1: string[],
  arr2: string[],
  normalizeForComparison: (line: string) => string
): DiffLine[] => {
  const m = arr1.length;
  const n = arr2.length;
  const max = m + n;
  const v: Map<number, number> = new Map();
  const trace: Map<number, number>[] = [];

  v.set(1, 0);

  for (let d = 0; d <= max; d++) {
    trace.push(new Map(v));

    for (let k = -d; k <= d; k += 2) {
      let x: number;

      const goDown = k === -d || (k !== d && (v.get(k - 1) || 0) < (v.get(k + 1) || 0));

      if (goDown) {
        x = v.get(k + 1) || 0;
      } else {
        x = (v.get(k - 1) || 0) + 1;
      }

      let y = x - k;

      while (x < m && y < n && normalizeForComparison(arr1[x]) === normalizeForComparison(arr2[y])) {
        x++;
        y++;
      }

      v.set(k, x);

      if (x >= m && y >= n) {
        return backtrackMyers(arr1, arr2, trace, m, n);
      }
    }
  }

  return backtrackMyers(arr1, arr2, trace, m, n);
};

/**
 * Backtrack Myers algorithm to build diff
 */
const backtrackMyers = (
  arr1: string[],
  arr2: string[],
  trace: Map<number, number>[],
  m: number,
  n: number
): DiffLine[] => {
  const diff: DiffLine[] = [];
  let x = m;
  let y = n;

  for (let d = trace.length - 1; d >= 0; d--) {
    const v = trace[d];
    const k = x - y;

    const prevK = (k === -d || (k !== d && (v.get(k - 1) || 0) < (v.get(k + 1) || 0))) ? k + 1 : k - 1;
    const prevX = v.get(prevK) || 0;
    const prevY = prevX - prevK;

    while (x > prevX && y > prevY) {
      diff.unshift({
        type: 'equal',
        line1: arr1[x - 1],
        line2: arr2[y - 1],
        lineNum1: x,
        lineNum2: y
      });
      x--;
      y--;
    }

    if (d > 0) {
      if (x > prevX) {
        diff.unshift({
          type: 'removed',
          line1: arr1[x - 1],
          line2: null,
          lineNum1: x,
          lineNum2: null
        });
        x--;
      } else if (y > prevY) {
        diff.unshift({
          type: 'added',
          line1: null,
          line2: arr2[y - 1],
          lineNum1: null,
          lineNum2: y
        });
        y--;
      }
    }
  }

  return diff;
};

/**
 * Character-level diff using Myers algorithm
 */
export const getCharacterDiff = (
  str1: string,
  str2: string,
  ignoreWhitespace: boolean
): CharDiff[] => {
  let normalizedStr1 = str1;
  let normalizedStr2 = str2;
  let mapping1: number[] = [];
  let mapping2: number[] = [];

  if (ignoreWhitespace) {
    normalizedStr1 = '';
    normalizedStr2 = '';

    for (let i = 0; i < str1.length; i++) {
      if (!/\s/.test(str1[i])) {
        mapping1.push(i);
        normalizedStr1 += str1[i];
      }
    }

    for (let i = 0; i < str2.length; i++) {
      if (!/\s/.test(str2[i])) {
        mapping2.push(i);
        normalizedStr2 += str2[i];
      }
    }
  } else {
    mapping1 = Array.from({ length: str1.length }, (_, i) => i);
    mapping2 = Array.from({ length: str2.length }, (_, i) => i);
  }

  const len1 = normalizedStr1.length;
  const len2 = normalizedStr2.length;
  const max = len1 + len2;
  const v: Map<number, number> = new Map();
  const trace: Map<number, number>[] = [];

  v.set(1, 0);

  for (let d = 0; d <= max; d++) {
    trace.push(new Map(v));

    for (let k = -d; k <= d; k += 2) {
      let x: number;

      const goDown = k === -d || (k !== d && (v.get(k - 1) || 0) < (v.get(k + 1) || 0));

      if (goDown) {
        x = v.get(k + 1) || 0;
      } else {
        x = (v.get(k - 1) || 0) + 1;
      }

      let y = x - k;

      while (x < len1 && y < len2 && normalizedStr1[x] === normalizedStr2[y]) {
        x++;
        y++;
      }

      v.set(k, x);

      if (x >= len1 && y >= len2) {
        return backtrackCharDiff(str1, str2, normalizedStr1, normalizedStr2, trace, len1, len2, mapping1, mapping2);
      }
    }
  }

  return backtrackCharDiff(str1, str2, normalizedStr1, normalizedStr2, trace, len1, len2, mapping1, mapping2);
};

/**
 * Backtrack character diff
 */
const backtrackCharDiff = (
  str1: string,
  str2: string,
  normalizedStr1: string,
  normalizedStr2: string,
  trace: Map<number, number>[],
  len1: number,
  len2: number,
  mapping1: number[],
  mapping2: number[]
): CharDiff[] => {
  const result: CharDiff[] = [];
  let x = len1;
  let y = len2;

  for (let d = trace.length - 1; d >= 0; d--) {
    const v = trace[d];
    const k = x - y;

    const prevK = (k === -d || (k !== d && (v.get(k - 1) || 0) < (v.get(k + 1) || 0))) ? k + 1 : k - 1;
    const prevX = v.get(prevK) || 0;
    const prevY = prevX - prevK;

    while (x > prevX && y > prevY) {
      const originalIdx1 = mapping1[x - 1];
      result.unshift({ type: 'equal', char: str1[originalIdx1] });
      x--;
      y--;
    }

    if (d > 0) {
      if (x > prevX) {
        const originalIdx1 = mapping1[x - 1];
        result.unshift({ type: 'removed', char: str1[originalIdx1] });
        x--;
      } else if (y > prevY) {
        const originalIdx2 = mapping2[y - 1];
        result.unshift({ type: 'added', char: str2[originalIdx2] });
        y--;
      }
    }
  }

  return result;
};

/**
 * Calculate similarity between two strings
 */
export const calculateSimilarity = (
  str1: string,
  str2: string,
  ignoreWhitespace: boolean
): number => {
  const len1 = str1.length;
  const len2 = str2.length;
  if (len1 === 0 && len2 === 0) return 1;
  if (len1 === 0 || len2 === 0) return 0;

  const maxLen = Math.max(len1, len2);
  const charDiff = getCharacterDiff(str1, str2, ignoreWhitespace);
  const equalChars = charDiff.filter(c => c.type === 'equal').length;

  return equalChars / maxLen;
};

/**
 * Build diff with improved modified line detection
 */
export const buildDiff = (
  lines1: string[],
  lines2: string[],
  normalizeForComparison: (line: string) => string,
  ignoreWhitespace: boolean
): DiffHunk[] => {
  const diff = myersDiff(lines1, lines2, normalizeForComparison);

  // Process diff to detect modified lines
  const processedDiff: DiffLine[] = [];

  for (let k = 0; k < diff.length; k++) {
    const current = diff[k];
    const next = diff[k + 1];

    // Check if consecutive removed and added lines should be merged as modified
    if (current.type === 'removed' && next && next.type === 'added' && current.line1 && next.line2) {
      const similarity = calculateSimilarity(
        normalizeForComparison(current.line1),
        normalizeForComparison(next.line2),
        ignoreWhitespace
      );

      // Only merge if lines are similar enough
      if (similarity >= SIMILARITY_THRESHOLD) {
        const charDiff = getCharacterDiff(current.line1, next.line2, ignoreWhitespace);
        processedDiff.push({
          type: 'modified',
          line1: current.line1,
          line2: next.line2,
          lineNum1: current.lineNum1,
          lineNum2: next.lineNum2,
          charDiff
        });
        k++; // Skip next item
      } else {
        processedDiff.push(current);
      }
    } else {
      processedDiff.push(current);
    }
  }

  // Filter out whitespace-only differences when ignoreWhitespace is enabled
  const finalDiff = ignoreWhitespace
    ? processedDiff.filter(item => {
      if (item.type === 'equal') return true;

      if (item.type === 'modified' && item.charDiff) {
        const hasNonWhitespaceDiff = item.charDiff.some(c =>
          (c.type === 'added' || c.type === 'removed') && !/\s/.test(c.char)
        );
        return hasNonWhitespaceDiff;
      }

      if (item.type === 'added' || item.type === 'removed') {
        const line = item.line1 || item.line2 || '';
        return line.trim().length > 0;
      }

      return true;
    })
    : processedDiff;

  return groupIntoHunks(finalDiff);
};

/**
 * Group diff lines into hunks with context
 */
const groupIntoHunks = (diff: DiffLine[]): DiffHunk[] => {
  const grouped: DiffHunk[] = [];
  let contextBefore: DiffLine[] = [];
  let changes: DiffLine[] = [];
  let consecutiveEqualLines = 0;

  for (let k = 0; k < diff.length; k++) {
    const item = diff[k];

    if (item.type === 'equal') {
      if (changes.length > 0) {
        consecutiveEqualLines++;

        // Check if we should close the current hunk or continue
        if (consecutiveEqualLines > MERGE_DISTANCE) {
          // Close current hunk
          const afterContext: DiffLine[] = [];
          const startIdx = k - consecutiveEqualLines + 1;

          for (let l = startIdx; l < Math.min(startIdx + CONTEXT_SIZE, k + 1); l++) {
            if (diff[l] && diff[l].type === 'equal') {
              afterContext.push(diff[l]);
            }
          }

          grouped.push({
            type: 'hunk',
            beforeContext: contextBefore.slice(-CONTEXT_SIZE),
            changes,
            afterContext
          });

          // Reset for next hunk
          changes = [];
          contextBefore = [];
          consecutiveEqualLines = 0;
        } else {
          // Add equal line to changes (will be part of the hunk)
          changes.push(item);
        }
      } else {
        // No changes yet, accumulate context
        contextBefore.push(item);
        consecutiveEqualLines = 0;
      }
    } else {
      // Found a change
      consecutiveEqualLines = 0;
      changes.push(item);
    }
  }

  // Close final hunk if there are pending changes
  if (changes.length > 0) {
    const afterContext: DiffLine[] = [];
    while (changes.length > 0 && changes[changes.length - 1].type === 'equal') {
      const line = changes.pop();
      if (line) afterContext.unshift(line);
    }

    grouped.push({
      type: 'hunk',
      beforeContext: contextBefore.slice(-CONTEXT_SIZE),
      changes,
      afterContext: afterContext.slice(0, CONTEXT_SIZE)
    });
  }

  return grouped;
};

/**
 * Compute diff result with line number mapping
 */
export const computeDiffResult = (
  text1: string,
  text2: string,
  ignoreWhitespace: boolean,
  ignoreEmptyLines: boolean
): DiffResult => {
  const allLines1 = text1.split('\n');
  const allLines2 = text2.split('\n');

  // Create mapping for line numbers
  let lines1WithNum: LineWithNum[];
  let lines2WithNum: LineWithNum[];

  if (ignoreEmptyLines) {
    lines1WithNum = allLines1
      .map((line, idx) => ({ line, originalLineNum: idx + 1 }))
      .filter(item => item.line.trim() !== '');
    lines2WithNum = allLines2
      .map((line, idx) => ({ line, originalLineNum: idx + 1 }))
      .filter(item => item.line.trim() !== '');
  } else {
    lines1WithNum = allLines1.map((line, idx) => ({
      line,
      originalLineNum: idx + 1
    }));
    lines2WithNum = allLines2.map((line, idx) => ({
      line,
      originalLineNum: idx + 1
    }));
  }

  const lines1 = lines1WithNum.map(item => item.line);
  const lines2 = lines2WithNum.map(item => item.line);

  const normalizeForComparison = (line: string): string => {
    if (ignoreWhitespace) {
      return line.replace(/\s+/g, ' ').trim();
    }
    return line;
  };

  const result = buildDiff(lines1, lines2, normalizeForComparison, ignoreWhitespace);

  // Map back to original line numbers
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

  return { hunks: result, allLines1, allLines2 };
};

