// UI helper utilities

import { SCROLL_BEHAVIOR, HIGHLIGHT_DURATION } from '../constants/diff.constants';

/**
 * Visualize whitespace characters
 */
export const visualizeWhitespace = (text: string | null | undefined, showWhitespace: boolean): string => {
  if (!showWhitespace || !text) return text || '';
  return text.replace(/ /g, '·').replace(/\t/g, '→   ');
};

/**
 * Scroll to a specific line in the document
 */
export const scrollToLine = (lineNum: number, isOriginal: boolean = true): void => {
  const elementId = isOriginal ? `original-line-${lineNum}` : `modified-line-${lineNum}`;
  const element = document.getElementById(elementId);
  if (element) {
    element.scrollIntoView({ behavior: SCROLL_BEHAVIOR, block: 'center' });
    element.classList.add('highlight-flash');
    setTimeout(() => {
      element.classList.remove('highlight-flash');
    }, HIGHLIGHT_DURATION);
  }
};

