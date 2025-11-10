// Custom hook for session management

import { useState, useEffect } from 'react';
import { SavedSession } from '../types/diff.types';
import {
  MAX_SAVED_SESSIONS,
  SESSION_STORAGE_KEY,
  SUCCESS_MESSAGES,
  CONFIRM_MESSAGES,
  ERROR_MESSAGES,
} from '../constants/diff.constants';

interface UseSessionManagementReturn {
  savedSessions: SavedSession[];
  saveSession: (session: Omit<SavedSession, 'timestamp'>) => void;
  loadSession: (session: SavedSession) => void;
  deleteSession: (timestamp: number) => void;
  clearAllSessions: () => void;
}

export const useSessionManagement = (
  onLoad?: (session: SavedSession) => void
): UseSessionManagementReturn => {
  const [savedSessions, setSavedSessions] = useState<SavedSession[]>([]);

  // Load saved sessions from localStorage on mount
  useEffect(() => {
    const saved = localStorage.getItem(SESSION_STORAGE_KEY);
    if (saved) {
      try {
        setSavedSessions(JSON.parse(saved));
      } catch (e) {
        console.error('Failed to load sessions:', e);
      }
    }
  }, []);

  const saveSession = (session: Omit<SavedSession, 'timestamp'>): void => {
    if (!session.text1 || !session.text2) {
      alert(ERROR_MESSAGES.NO_TEXT_TO_SAVE);
      return;
    }

    const newSession: SavedSession = {
      ...session,
      timestamp: Date.now(),
    };

    const updatedSessions = [newSession, ...savedSessions].slice(0, MAX_SAVED_SESSIONS);
    setSavedSessions(updatedSessions);
    localStorage.setItem(SESSION_STORAGE_KEY, JSON.stringify(updatedSessions));

    alert(SUCCESS_MESSAGES.SESSION_SAVED);
  };

  const loadSession = (session: SavedSession): void => {
    if (onLoad) {
      // Use setTimeout to defer state updates and avoid cascading renders
      setTimeout(() => {
        onLoad(session);
      }, 0);
    }
  };

  const deleteSession = (timestamp: number): void => {
    const updatedSessions = savedSessions.filter(s => s.timestamp !== timestamp);
    setSavedSessions(updatedSessions);
    localStorage.setItem(SESSION_STORAGE_KEY, JSON.stringify(updatedSessions));
  };

  const clearAllSessions = (): void => {
    if (confirm(CONFIRM_MESSAGES.DELETE_ALL_SESSIONS)) {
      setSavedSessions([]);
      localStorage.removeItem(SESSION_STORAGE_KEY);
    }
  };

  return {
    savedSessions,
    saveSession,
    loadSession,
    deleteSession,
    clearAllSessions,
  };
};

