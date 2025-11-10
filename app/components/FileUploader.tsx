// File uploader component

import React from 'react';
import { Upload, FileText, X } from 'lucide-react';
import { InputMode } from '../types/diff.types';
import { FILE_TYPE_EXTENSIONS } from '../constants/diff.constants';

interface FileUploaderProps {
  file: File | null;
  text: string;
  inputMode: InputMode;
  label: string;
  color: 'red' | 'green';
  onFileChange: (file: File | null) => void;
  onTextChange: (text: string) => void;
  onInputModeChange: (mode: InputMode) => void;
  onRemoveFile: () => void;
  onClearText: () => void;
}

export const FileUploader: React.FC<FileUploaderProps> = ({
  file,
  text,
  inputMode,
  label,
  color,
  onFileChange,
  onTextChange,
  onInputModeChange,
  onRemoveFile,
  onClearText,
}) => {
  const colorClasses = {
    red: {
      indicator: 'bg-red-500',
      button: 'bg-red-500',
      buttonHover: 'bg-red-600',
      border: 'border-red-400',
      hoverBg: 'hover:bg-red-50',
      icon: 'text-red-500',
      ring: 'focus:ring-red-400',
    },
    green: {
      indicator: 'bg-green-500',
      button: 'bg-green-500',
      buttonHover: 'bg-green-600',
      border: 'border-green-400',
      hoverBg: 'hover:bg-green-50',
      icon: 'text-green-500',
      ring: 'focus:ring-green-400',
    },
  };

  const colors = colorClasses[color];

  return (
    <div>
      <div className="flex items-center justify-between mb-2">
        <h3 className="font-semibold text-slate-700 flex items-center gap-2">
          <div className={`w-2 h-2 ${colors.indicator} rounded-full`}></div>
          {label}
        </h3>
        <div className="flex gap-2">
          <button
            onClick={() => onInputModeChange('file')}
            className={`text-xs px-2 py-1 rounded ${inputMode === 'file' ? `${colors.button} text-white` : 'bg-slate-200 text-slate-600'}`}
          >
            ไฟล์
          </button>
          <button
            onClick={() => onInputModeChange('text')}
            className={`text-xs px-2 py-1 rounded ${inputMode === 'text' ? `${colors.button} text-white` : 'bg-slate-200 text-slate-600'}`}
          >
            ข้อความ
          </button>
        </div>
      </div>

      {inputMode === 'file' ? (
        !file ? (
          <label className={`block border-2 border-dashed border-slate-300 rounded-lg p-6 text-center cursor-pointer hover:${colors.border} ${colors.hoverBg} transition`}>
            <input
              type="file"
              onChange={(e) => {
                const selectedFile = e.target.files?.[0];
                if (selectedFile) {
                  onFileChange(selectedFile);
                }
              }}
              accept={FILE_TYPE_EXTENSIONS}
              className="hidden"
            />
            <Upload className="mx-auto mb-2 text-slate-400" size={32} />
            <p className="text-sm text-slate-600">อัปโหลดไฟล์</p>
            <p className="text-xs text-slate-500 mt-1">TXT, DOCX, PDF, MD</p>
          </label>
        ) : (
          <div className="border border-slate-200 rounded-lg p-3 bg-white flex items-center gap-3">
            <FileText className={`${colors.icon} flex-shrink-0`} size={20} />
            <span className="text-sm text-slate-700 truncate flex-1">{file.name}</span>
            <button onClick={onRemoveFile} className="text-slate-400 hover:text-red-500 transition">
              <X size={16} />
            </button>
          </div>
        )
      ) : (
        <div className="relative">
          <textarea
            value={text}
            onChange={(e) => onTextChange(e.target.value)}
            placeholder="วางข้อความที่นี่..."
            className={`w-full h-32 p-3 text-black border border-slate-300 rounded-lg text-sm font-mono resize-none focus:ring-2 ${colors.ring} focus:border-transparent`}
          />
          {text && (
            <button
              onClick={onClearText}
              className="absolute top-2 right-2 text-slate-400 hover:text-red-500 transition"
            >
              <X size={16} />
            </button>
          )}
        </div>
      )}
    </div>
  );
};

