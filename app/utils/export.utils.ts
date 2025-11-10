// Export utilities for diff results

import { DiffResult, ChangeCount } from '../types/diff.types';

/**
 * Count changes in diff result
 */
export const countChanges = (diffResult: DiffResult | null): ChangeCount => {
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

/**
 * Export diff result to HTML
 */
export const exportToHTML = (diffResult: DiffResult | null): void => {
  if (!diffResult) return;

  const changes = countChanges(diffResult);

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
<p>Added: +${changes.added} | Removed: -${changes.removed}</p></div>`;

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

/**
 * Copy diff result to clipboard
 */
export const copyDiffToClipboard = async (diffResult: DiffResult | null): Promise<boolean> => {
  if (!diffResult) return false;

  const changes = countChanges(diffResult);

  let text = 'Text Diff Result\n';
  text += `Added: +${changes.added} | Removed: -${changes.removed}\n\n`;

  diffResult.hunks.forEach(hunk => {
    hunk.changes.forEach(change => {
      const prefix = change.type === 'added' ? '+' : change.type === 'removed' ? '-' : ' ';
      const line = change.line1 || change.line2 || '';
      text += `${prefix} ${line}\n`;
    });
    text += '\n';
  });

  try {
    await navigator.clipboard.writeText(text);
    return true;
  } catch (err) {
    console.error('Failed to copy to clipboard:', err);
    return false;
  }
};

