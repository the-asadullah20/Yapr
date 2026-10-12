import { useState, useEffect, useCallback } from 'react';
import { api } from '../api/apiClient';
import { MentionCandidate } from '../types';

export function useMentionAutocomplete(
  text: string,
  setText: React.Dispatch<React.SetStateAction<string>> | ((newText: string) => void),
  inputRef?: React.RefObject<HTMLInputElement | HTMLTextAreaElement | null>
) {
  const [candidates, setCandidates] = useState<MentionCandidate[]>([]);
  const [isOpen, setIsOpen] = useState(false);
  const [activeIndex, setActiveIndex] = useState(0);
  const [mentionRange, setMentionRange] = useState<{ start: number; end: number; query: string } | null>(null);

  // Check if cursor is right after an '@' mention token
  const checkMention = useCallback((currentText: string, cursorPos: number) => {
    const beforeCursor = currentText.slice(0, cursorPos);
    const match = beforeCursor.match(/@([a-zA-Z0-9_]*)$/);
    if (match) {
      const query = match[1];
      const start = match.index ?? beforeCursor.lastIndexOf('@');
      setMentionRange({ start, end: cursorPos, query });
    } else {
      setMentionRange(null);
      setIsOpen(false);
      setCandidates([]);
    }
  }, []);

  // Fetch candidates from backend when mention query changes
  useEffect(() => {
    if (!mentionRange) {
      setCandidates([]);
      setIsOpen(false);
      return;
    }

    let isMounted = true;
    const timer = setTimeout(async () => {
      try {
        const list = await api.getMentionSuggestions(mentionRange.query);
        if (isMounted) {
          setCandidates(list);
          setIsOpen(list.length > 0);
          setActiveIndex(0);
        }
      } catch {
        if (isMounted) {
          setCandidates([]);
          setIsOpen(false);
        }
      }
    }, 120);

    return () => {
      isMounted = false;
      clearTimeout(timer);
    };
  }, [mentionRange?.query]);

  // Insert the selected candidate handle into text
  const applyCandidate = useCallback(
    (candidate: MentionCandidate) => {
      if (!mentionRange) return;
      const before = text.slice(0, mentionRange.start);
      const after = text.slice(mentionRange.end);
      const insert = `@${candidate.username} `;
      const newText = `${before}${insert}${after}`;
      setText(newText);
      setIsOpen(false);
      setCandidates([]);
      setMentionRange(null);

      // Restore focus and cursor position after insertion
      setTimeout(() => {
        if (inputRef?.current) {
          inputRef.current.focus();
          const newCursorPos = before.length + insert.length;
          inputRef.current.setSelectionRange(newCursorPos, newCursorPos);
        }
      }, 0);
    },
    [text, mentionRange, setText, inputRef]
  );

  // Keyboard navigation support for dropdown
  const handleKeyDown = useCallback(
    (e: React.KeyboardEvent): boolean => {
      if (!isOpen || candidates.length === 0) return false;

      if (e.key === 'ArrowDown') {
        e.preventDefault();
        setActiveIndex((prev) => (prev + 1) % candidates.length);
        return true;
      }
      if (e.key === 'ArrowUp') {
        e.preventDefault();
        setActiveIndex((prev) => (prev - 1 + candidates.length) % candidates.length);
        return true;
      }
      if (e.key === 'Enter' || e.key === 'Tab') {
        e.preventDefault();
        if (candidates[activeIndex]) {
          applyCandidate(candidates[activeIndex]);
        }
        return true;
      }
      if (e.key === 'Escape') {
        e.preventDefault();
        setIsOpen(false);
        return true;
      }
      return false;
    },
    [isOpen, candidates, activeIndex, applyCandidate]
  );

  return {
    candidates,
    isOpen,
    activeIndex,
    checkMention,
    applyCandidate,
    handleKeyDown,
    closeSuggestions: () => setIsOpen(false),
  };
}
