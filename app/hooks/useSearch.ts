// Custom hook for search functionality

import { useState, useCallback } from 'react';
import { DiffResult, SearchResult } from '../types/diff.types';
import { SCROLL_BEHAVIOR, HIGHLIGHT_DURATION } from '../constants/diff.constants';

interface UseSearchReturn {
  searchTerm: string;
  searchResults: SearchResult[];
  currentSearchIndex: number;
  setSearchTerm: (term: string) => void;
  handleSearch: (term: string, diffResult: DiffResult | null) => void;
  nextSearchResult: () => void;
  prevSearchResult: () => void;
  clearSearch: () => void;
}

export const useSearch = (): UseSearchReturn => {
  const [searchTerm, setSearchTerm] = useState<string>('');
  const [searchResults, setSearchResults] = useState<SearchResult[]>([]);
  const [currentSearchIndex, setCurrentSearchIndex] = useState<number>(0);

  const scrollToSearchResult = useCallback((index: number, results: SearchResult[]): void => {
    if (results.length === 0) return;

    const result = results[index];
    const elementId = `change-${result.hunkIdx}-${result.changeIdx}`;
    const element = document.getElementById(elementId);

    if (element) {
      element.scrollIntoView({ behavior: SCROLL_BEHAVIOR, block: 'center' });
      element.classList.add('highlight-flash');
      setTimeout(() => {
        element.classList.remove('highlight-flash');
      }, HIGHLIGHT_DURATION);
    }
  }, []);

  const handleSearch = useCallback((term: string, diffResult: DiffResult | null): void => {
    setSearchTerm(term);

    if (!term || !diffResult) {
      setSearchResults([]);
      return;
    }

    const results: SearchResult[] = [];
    const lowerTerm = term.toLowerCase();

    diffResult.hunks.forEach((hunk, hunkIdx) => {
      hunk.changes.forEach((change, changeIdx) => {
        const line1 = change.line1 || '';
        const line2 = change.line2 || '';

        if (line1.toLowerCase().includes(lowerTerm) || line2.toLowerCase().includes(lowerTerm)) {
          results.push({ hunkIdx, changeIdx, change });
        }
      });
    });

    setSearchResults(results);
    setCurrentSearchIndex(0);

    if (results.length > 0) {
      scrollToSearchResult(0, results);
    }
  }, [scrollToSearchResult]);

  const nextSearchResult = useCallback((): void => {
    if (searchResults.length === 0) return;
    const nextIndex = (currentSearchIndex + 1) % searchResults.length;
    setCurrentSearchIndex(nextIndex);
    scrollToSearchResult(nextIndex, searchResults);
  }, [currentSearchIndex, searchResults, scrollToSearchResult]);

  const prevSearchResult = useCallback((): void => {
    if (searchResults.length === 0) return;
    const prevIndex = (currentSearchIndex - 1 + searchResults.length) % searchResults.length;
    setCurrentSearchIndex(prevIndex);
    scrollToSearchResult(prevIndex, searchResults);
  }, [currentSearchIndex, searchResults, scrollToSearchResult]);

  const clearSearch = useCallback((): void => {
    setSearchTerm('');
    setSearchResults([]);
    setCurrentSearchIndex(0);
  }, []);

  return {
    searchTerm,
    searchResults,
    currentSearchIndex,
    setSearchTerm,
    handleSearch,
    nextSearchResult,
    prevSearchResult,
    clearSearch,
  };
};

