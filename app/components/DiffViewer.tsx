// Diff viewer component

import React from 'react';
import { DiffResult, ViewMode, CharDiff } from '../types/diff.types';
import { visualizeWhitespace, scrollToLine } from '../utils/ui.utils';

interface DiffViewerProps {
  diffResult: DiffResult;
  viewMode: ViewMode;
  showOnlyDiff: boolean;
  showWhitespace: boolean;
  onViewModeChange: (mode: ViewMode) => void;
}

const renderCharacterDiff = (charDiff: CharDiff[], showWhitespace: boolean): React.ReactElement[] => {
  return charDiff.map((item, idx) => {
    const char = visualizeWhitespace(item.char, showWhitespace);
    if (item.type === 'equal') {
      return <span key={idx}>{char}</span>;
    } else if (item.type === 'added') {
      return <span key={idx} className="bg-green-300 text-green-900">{char}</span>;
    } else {
      return <span key={idx} className="bg-red-300 text-red-900 line-through">{char}</span>;
    }
  });
};

export const DiffViewer: React.FC<DiffViewerProps> = ({
  diffResult,
  viewMode,
  showOnlyDiff,
  showWhitespace,
  onViewModeChange,
}) => {
  if (viewMode === 'diff') {
    return (
      <div className="border border-slate-200 rounded-lg overflow-hidden bg-slate-900">
        <div className="max-h-[700px] overflow-y-auto">
          {diffResult.hunks.map((hunk, hunkIdx) => {
            // Calculate hunk header like git
            const getHunkHeader = () => {
              const firstChange = hunk.changes[0];
              const lastChange = hunk.changes[hunk.changes.length - 1];

              const startLine1 = hunk.beforeContext.length > 0
                ? hunk.beforeContext[0].originalLineNum1
                : firstChange?.originalLineNum1;
              const startLine2 = hunk.beforeContext.length > 0
                ? hunk.beforeContext[0].originalLineNum2
                : firstChange?.originalLineNum2;

              const allHunkLines = [...hunk.beforeContext, ...hunk.changes, ...hunk.afterContext];
              const count1 = allHunkLines.filter(l => l.lineNum1 !== null).length;
              const count2 = allHunkLines.filter(l => l.lineNum2 !== null).length;

              return `@@ -${startLine1 || 0},${count1} +${startLine2 || 0},${count2} @@`;
            };

            return (
              <div key={hunkIdx} className="border-b border-slate-700 last:border-b-0">
                <div className="bg-slate-800 px-4 py-2 flex items-center justify-between">
                  <span className="text-cyan-400 font-mono text-xs">{getHunkHeader()}</span>
                  <button
                    onClick={() => {
                      const lineNum = hunk.changes[0]?.originalLineNum1 || hunk.changes[0]?.originalLineNum2;
                      if (lineNum) {
                        onViewModeChange('original');
                        setTimeout(() => scrollToLine(lineNum, true), 100);
                      }
                    }}
                    className="text-xs text-cyan-400 hover:text-cyan-300 underline"
                  >
                    ดู context
                  </button>
                </div>

                {!showOnlyDiff && hunk.beforeContext.map((line, idx) => (
                  <div key={`before-${idx}`} className="flex hover:bg-slate-800 transition">
                    <div className="px-4 py-1 text-slate-500 font-mono text-xs w-12 text-right flex-shrink-0 select-none border-r border-slate-700">{line.originalLineNum1 || ''}</div>
                    <div className="px-4 py-1 text-slate-500 font-mono text-xs w-12 text-right flex-shrink-0 select-none border-r border-slate-700">{line.originalLineNum2 || ''}</div>
                    <div className="px-4 py-1 font-mono text-sm text-slate-400 flex-1">{visualizeWhitespace(line.line1 || line.line2, showWhitespace)}</div>
                  </div>
                ))}

                {hunk.changes.map((change, idx) => (
                  <div
                    key={`change-${idx}`}
                    id={`change-${hunkIdx}-${idx}`}
                    className={`flex ${change.type === 'removed' ? 'bg-red-950' : change.type === 'added' ? 'bg-green-950' : change.type === 'modified' ? 'bg-yellow-950' : ''} hover:brightness-110 transition cursor-pointer`}
                    onClick={() => {
                      const lineNum = change.type === 'removed' ? change.originalLineNum1 : change.originalLineNum2;
                      const isOriginal = change.type === 'removed';
                      if (lineNum) {
                        onViewModeChange(isOriginal ? 'original' : 'modified');
                        setTimeout(() => scrollToLine(lineNum, isOriginal), 100);
                      }
                    }}
                  >
                    <div className={`px-4 py-1 font-mono text-xs w-12 text-right flex-shrink-0 select-none border-r ${change.type === 'removed' ? 'bg-red-900 text-red-300 border-red-800' : change.type === 'added' ? 'bg-green-900 text-green-300 border-green-800' : change.type === 'modified' ? 'bg-yellow-900 text-yellow-300 border-yellow-800' : 'text-slate-500 border-slate-700'}`}>
                      {change.originalLineNum1 || ''}
                    </div>
                    <div className={`px-4 py-1 font-mono text-xs w-12 text-right flex-shrink-0 select-none border-r ${change.type === 'removed' ? 'bg-red-900 text-red-300 border-red-800' : change.type === 'added' ? 'bg-green-900 text-green-300 border-green-800' : change.type === 'modified' ? 'bg-yellow-900 text-yellow-300 border-yellow-800' : 'text-slate-500 border-slate-700'}`}>
                      {change.originalLineNum2 || ''}
                    </div>
                    <div className={`px-2 py-1 font-mono text-sm flex-1 ${change.type === 'removed' ? 'text-red-300' : change.type === 'added' ? 'text-green-300' : change.type === 'modified' ? 'text-yellow-300' : 'text-slate-300'}`}>
                      {change.type === 'modified' && change.charDiff ? (
                        <div>
                          <div className="text-red-300 mb-1">
                            <span className="inline-block w-6 text-red-400">-</span>
                            {renderCharacterDiff(change.charDiff.filter(c => c.type !== 'added'), showWhitespace)}
                          </div>
                          <div className="text-green-300">
                            <span className="inline-block w-6 text-green-400">+</span>
                            {renderCharacterDiff(change.charDiff.filter(c => c.type !== 'removed'), showWhitespace)}
                          </div>
                        </div>
                      ) : (
                        <>
                          <span className={`inline-block w-6 ${change.type === 'removed' ? 'text-red-400' : change.type === 'added' ? 'text-green-400' : 'text-slate-500'}`}>
                            {change.type === 'removed' ? '-' : change.type === 'added' ? '+' : ' '}
                          </span>
                          {visualizeWhitespace(change.line1 || change.line2, showWhitespace)}
                        </>
                      )}
                    </div>
                  </div>
                ))}

                {!showOnlyDiff && hunk.afterContext.map((line, idx) => (
                  <div key={`after-${idx}`} className="flex hover:bg-slate-800 transition">
                    <div className="px-4 py-1 text-slate-500 font-mono text-xs w-12 text-right flex-shrink-0 select-none border-r border-slate-700">{line.originalLineNum1 || ''}</div>
                    <div className="px-4 py-1 text-slate-500 font-mono text-xs w-12 text-right flex-shrink-0 select-none border-r border-slate-700">{line.originalLineNum2 || ''}</div>
                    <div className="px-4 py-1 font-mono text-sm text-slate-400 flex-1">{visualizeWhitespace(line.line1 || line.line2, showWhitespace)}</div>
                  </div>
                ))}
              </div>
            );
          })}
        </div>
      </div>
    );
  }

  if (viewMode === 'original') {
    return (
      <div className="border border-slate-200 rounded-lg overflow-hidden">
        <div className="bg-red-50 px-4 py-2 border-b border-red-200 flex items-center justify-between">
          <span className="font-semibold text-red-700">ไฟล์ต้นฉบับ (a)</span>
          <button onClick={() => onViewModeChange('diff')} className="text-xs text-red-600 hover:text-red-700 underline">กลับไปดู Diff</button>
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
    );
  }

  // Modified view
  return (
    <div className="border border-slate-200 rounded-lg overflow-hidden">
      <div className="bg-green-50 px-4 py-2 border-b border-green-200 flex items-center justify-between">
        <span className="font-semibold text-green-700">ไฟล์แก้ไขแล้ว (b)</span>
        <button onClick={() => onViewModeChange('diff')} className="text-xs text-green-600 hover:text-green-700 underline">กลับไปดู Diff</button>
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
  );
};

