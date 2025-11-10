// File handling utilities

import * as mammoth from 'mammoth';
import { FileType } from '../types/diff.types';
import { VALID_FILE_TYPES, ERROR_MESSAGES } from '../constants/diff.constants';
import { extractTextFromPDF } from './pdf.utils';

/**
 * Extract text from a file based on its type
 */
export const extractTextFromFile = async (file: File): Promise<string> => {
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
      return await extractTextFromPDF(arrayBuffer);
    }
    return '';
  } catch (err) {
    const errorMessage = err instanceof Error ? err.message : 'Unknown error';
    throw new Error(ERROR_MESSAGES.FILE_READ_ERROR + errorMessage);
  }
};

/**
 * Validate file type
 */
export const isValidFileType = (fileName: string): boolean => {
  const fileType = fileName.split('.').pop()?.toLowerCase();
  return fileType ? VALID_FILE_TYPES.includes(fileType as FileType) : false;
};

/**
 * Get file extension
 */
export const getFileExtension = (fileName: string): string | undefined => {
  return fileName.split('.').pop()?.toLowerCase();
};

