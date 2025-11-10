// PDF text extraction utilities

import {
  PDF_COLUMN_THRESHOLD,
  PDF_SAME_LINE_THRESHOLD,
  PDF_MIN_GAP_FOR_SPACE,
  PDF_MAX_SPACES,
  PDF_MAX_BLANK_LINES,
  PDF_INDENT_CHAR_WIDTH,
  PDF_MAX_INDENT,
  ERROR_MESSAGES,
} from '../constants/diff.constants';

// Enhanced text item interface
interface TextItem {
  str: string;
  x: number;
  y: number;
  width: number;
  height: number;
  fontName?: string;
}

interface TextItemWithColumn extends TextItem {
  columnIndex: number;
}

/**
 * Configure PDF.js worker with local fallback to CDN
 */
export const configurePDFWorker = async (pdfjsLib: typeof import('pdfjs-dist')): Promise<void> => {
  if (typeof window === 'undefined') return;

  const localWorker = '/pdf.worker.min.mjs';
  const cdnWorker = `https://unpkg.com/pdfjs-dist@${pdfjsLib.version}/build/pdf.worker.min.mjs`;

  try {
    const response = await fetch(localWorker, { method: 'HEAD' });
    if (response.ok) {
      pdfjsLib.GlobalWorkerOptions.workerSrc = localWorker;
    } else {
      pdfjsLib.GlobalWorkerOptions.workerSrc = cdnWorker;
    }
  } catch {
    pdfjsLib.GlobalWorkerOptions.workerSrc = cdnWorker;
  }
};

/**
 * Detect columns in PDF page by analyzing X positions
 */
const detectColumns = (items: TextItem[]): number[] => {
  const xPositions = items.map(item => item.x).sort((a, b) => a - b);
  const columns: number[] = [0];

  for (let i = 1; i < xPositions.length; i++) {
    if (xPositions[i] - xPositions[i - 1] > PDF_COLUMN_THRESHOLD) {
      const avgX = (xPositions[i] + xPositions[i - 1]) / 2;
      if (!columns.some(col => Math.abs(col - avgX) < 50)) {
        columns.push(avgX);
      }
    }
  }

  return columns.sort((a, b) => a - b);
};

/**
 * Assign items to columns based on their X position
 */
const assignItemsToColumns = (items: TextItem[], columns: number[]): TextItemWithColumn[] => {
  return items.map(item => {
    let columnIndex = 0;
    for (let i = columns.length - 1; i >= 0; i--) {
      if (item.x >= columns[i]) {
        columnIndex = i;
        break;
      }
    }
    return { ...item, columnIndex };
  });
};

/**
 * Sort items by column, then Y position, then X position
 */
const sortItems = (items: TextItemWithColumn[]): TextItemWithColumn[] => {
  return items.sort((a, b) => {
    if (a.columnIndex !== b.columnIndex) {
      return a.columnIndex - b.columnIndex;
    }
    const yDiff = Math.abs(a.y - b.y);
    if (yDiff < PDF_SAME_LINE_THRESHOLD) {
      return a.x - b.x;
    }
    return a.y - b.y;
  });
};

/**
 * Build lines from sorted text items with enhanced spacing and indentation
 */
const buildLines = (items: TextItemWithColumn[]): string[] => {
  const lines: string[] = [];
  let currentLine = '';
  let currentY = items[0]?.y || 0;
  let currentColumn = items[0]?.columnIndex || 0;
  let lastX = 0;
  let lineStartX = items[0]?.x || 0;

  for (const item of items) {
    const yDiff = Math.abs(item.y - currentY);
    const columnChanged = item.columnIndex !== currentColumn;

    // New line if Y position changed significantly or column changed
    if (yDiff > PDF_SAME_LINE_THRESHOLD || columnChanged) {
      if (currentLine.trim()) {
        lines.push(currentLine.trimEnd());
      }
      currentLine = '';
      currentY = item.y;
      currentColumn = item.columnIndex;
      lastX = 0;
      lineStartX = item.x;

      // Add column separator if column changed
      if (columnChanged && currentLine === '') {
        lines.push(''); // Empty line between columns
      }
    }

    // Calculate indentation for first item on line
    if (currentLine === '') {
      const indent = Math.floor((item.x - lineStartX) / PDF_INDENT_CHAR_WIDTH);
      if (indent > 0 && indent < PDF_MAX_INDENT) {
        currentLine = ' '.repeat(indent);
      }
      lineStartX = item.x;
    }

    // Add spacing between words on the same line
    if (currentLine.trim() && item.x > lastX) {
      const gap = item.x - lastX;
      if (gap > PDF_MIN_GAP_FOR_SPACE) {
        const spaces = Math.min(Math.floor(gap / 4), PDF_MAX_SPACES);
        if (spaces > 0) {
          currentLine += ' '.repeat(spaces);
        }
      }
    }

    currentLine += item.str;
    lastX = item.x + item.width;
  }

  if (currentLine.trim()) {
    lines.push(currentLine.trimEnd());
  }

  return lines;
};

/**
 * Remove excessive blank lines from text
 */
const removeExcessiveBlankLines = (lines: string[]): string[] => {
  const processedLines: string[] = [];
  let consecutiveBlankLines = 0;

  for (const line of lines) {
    if (line.trim() === '') {
      consecutiveBlankLines++;
      if (consecutiveBlankLines <= PDF_MAX_BLANK_LINES) {
        processedLines.push(line);
      }
    } else {
      consecutiveBlankLines = 0;
      processedLines.push(line);
    }
  }

  return processedLines;
};

/**
 * Process a single PDF page and extract text with layout preservation
 */
const processPage = async (page: any, viewport: any): Promise<string> => {
  const textContent = await page.getTextContent();

  const items: TextItem[] = textContent.items
    .filter((item: any): item is typeof item & { str: string; transform: number[]; width?: number; height?: number } =>
      'str' in item && 'transform' in item
    )
    .map((item: any) => ({
      str: item.str,
      x: item.transform[4],
      y: viewport.height - item.transform[5], // Convert to top-down coordinates
      width: ('width' in item && typeof item.width === 'number') ? item.width : 0,
      height: ('height' in item && typeof item.height === 'number') ? item.height : 0,
      fontName: 'fontName' in item ? String(item.fontName) : undefined,
    }));

  if (items.length === 0) return '';

  const columns = detectColumns(items);
  const itemsWithColumn = assignItemsToColumns(items, columns);
  const sortedItems = sortItems(itemsWithColumn);
  const lines = buildLines(sortedItems);
  const processedLines = removeExcessiveBlankLines(lines);

  return processedLines.join('\n');
};

/**
 * Extract text from PDF with layout preservation
 */
export const extractTextFromPDF = async (arrayBuffer: ArrayBuffer): Promise<string> => {
  try {
    const pdfjsLib = await import('pdfjs-dist');
    await configurePDFWorker(pdfjsLib);

    const loadingTask = pdfjsLib.getDocument({ data: arrayBuffer });
    const pdf = await loadingTask.promise;
    const textPages: string[] = [];

    for (let pageNum = 1; pageNum <= pdf.numPages; pageNum++) {
      const page = await pdf.getPage(pageNum);
      const viewport = page.getViewport({ scale: 1.0 });
      const pageText = await processPage(page, viewport);

      if (pageText.trim()) {
        textPages.push(pageText);
      }
    }

    return textPages.join('\n\n');
  } catch (err) {
    const errorMessage = err instanceof Error ? err.message : 'Unknown error';
    throw new Error(ERROR_MESSAGES.PDF_READ_ERROR + errorMessage);
  }
};

