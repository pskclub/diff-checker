// Constants for Text Diff Checker

import { FileType } from '../types/diff.types';

// File handling
export const VALID_FILE_TYPES: FileType[] = ['txt', 'docx', 'pdf', 'md'];
export const FILE_TYPE_EXTENSIONS = '.txt,.docx,.pdf,.md';

// Diff algorithm
export const SIMILARITY_THRESHOLD = 0.4; // Lines with >40% similarity are considered modified
export const CONTEXT_SIZE = 3; // Number of context lines before/after changes
export const MERGE_DISTANCE = 6; // Merge hunks if they're within 6 lines of each other

// PDF extraction
export const PDF_COLUMN_THRESHOLD = 100; // Minimum gap to consider as column break
export const PDF_SAME_LINE_THRESHOLD = 3; // Y difference for same line
export const PDF_MIN_GAP_FOR_SPACE = 5; // Gap minimum to add space
export const PDF_MAX_SPACES = 10; // Maximum spaces to add
export const PDF_MAX_BLANK_LINES = 2; // Maximum consecutive blank lines
export const PDF_INDENT_CHAR_WIDTH = 8; // Approximate character width for indentation
export const PDF_MAX_INDENT = 20; // Maximum reasonable indentation

// Session management
export const MAX_SAVED_SESSIONS = 10; // Keep only last 10 sessions
export const SESSION_STORAGE_KEY = 'diffCheckerSessions';

// UI
export const SCROLL_BEHAVIOR: ScrollBehavior = 'smooth';
export const HIGHLIGHT_DURATION = 2000; // milliseconds
export const COPIED_FEEDBACK_DURATION = 2000; // milliseconds

// Error messages
export const ERROR_MESSAGES = {
  INVALID_FILE_TYPE: 'รองรับเฉพาะไฟล์ .txt, .docx, .pdf, .md เท่านั้น',
  PDF_READ_ERROR: 'ไม่สามารถอ่าน PDF ได้: ',
  FILE_READ_ERROR: 'ไม่สามารถอ่านไฟล์ได้: ',
  NO_TEXT_PROVIDED: 'กรุณาเลือกไฟล์หรือใส่ข้อความทั้งสองฝั่ง',
  NO_TEXT_TO_SAVE: 'กรุณาใส่ข้อความทั้งสองฝั่งก่อนบันทึก',
} as const;

// Success messages
export const SUCCESS_MESSAGES = {
  SESSION_SAVED: 'บันทึก Session สำเร็จ!',
} as const;

// Confirmation messages
export const CONFIRM_MESSAGES = {
  DELETE_ALL_SESSIONS: 'คุณต้องการลบ Session ทั้งหมดหรือไม่?',
} as const;

