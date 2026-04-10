import React, { useState, useRef, useEffect, useCallback } from 'react';

interface IsolatedInputProps {
  initialValue: string;
  onCommit: (value: string) => void;
  placeholder?: string;
  className?: string;
  type?: 'text' | 'url';
  id?: string;
}

interface IsolatedTextareaProps {
  initialValue: string;
  onCommit: (value: string) => void;
  placeholder?: string;
  className?: string;
  rows?: number;
  id?: string;
}

// Super smooth isolated input - instant commit on blur
export const IsolatedInput = React.memo(function IsolatedInput({
  initialValue,
  onCommit,
  placeholder,
  className,
  type = 'text',
  id
}: IsolatedInputProps) {
  const inputRef = useRef<HTMLInputElement>(null);
  const [value, setValue] = useState(initialValue);
  const lastIdRef = useRef(id);
  const onCommitRef = useRef(onCommit);
  onCommitRef.current = onCommit;

  // Reset when ID changes
  useEffect(() => {
    if (id !== lastIdRef.current) {
      setValue(initialValue);
      lastIdRef.current = id;
    }
  }, [id, initialValue]);

  return (
    <input
      ref={inputRef}
      type={type}
      value={value}
      onChange={e => { e.stopPropagation(); setValue(e.target.value); }}
      onBlur={() => onCommitRef.current(value)}
      onKeyDown={e => { e.stopPropagation(); if (e.key === 'Enter') { e.preventDefault(); inputRef.current?.blur(); }}}
      placeholder={placeholder}
      className={className}
    />
  );
}, (prev, next) => prev.id === next.id);

// Super smooth isolated textarea
export const IsolatedTextarea = React.memo(function IsolatedTextarea({
  initialValue,
  onCommit,
  placeholder,
  className,
  rows = 3,
  id
}: IsolatedTextareaProps) {
  const [value, setValue] = useState(initialValue);
  const lastIdRef = useRef(id);
  const onCommitRef = useRef(onCommit);
  onCommitRef.current = onCommit;

  // Reset when ID changes (different item)
  useEffect(() => {
    if (id !== lastIdRef.current) {
      setValue(initialValue);
      lastIdRef.current = id;
    }
  }, [id, initialValue]);

  return (
    <textarea
      value={value}
      onChange={e => { e.stopPropagation(); setValue(e.target.value); }}
      onBlur={() => onCommitRef.current(value)}
      onKeyDown={e => e.stopPropagation()}
      placeholder={placeholder}
      className={className}
      rows={rows}
    />
  );
}, (prev, next) => prev.id === next.id);

// Isolated Content Editor - for main content with debounced commit
interface IsolatedContentEditorProps {
  initialValue: string;
  onCommit: (value: string) => void;
  placeholder?: string;
  className?: string;
  id?: string;
  textareaRef?: React.RefObject<HTMLTextAreaElement>;
}

export const IsolatedContentEditor = React.memo(function IsolatedContentEditor({
  initialValue,
  onCommit,
  placeholder,
  className,
  id,
  textareaRef
}: IsolatedContentEditorProps) {
  const internalRef = useRef<HTMLTextAreaElement>(null);
  const ref = textareaRef || internalRef;
  const [value, setValue] = useState(initialValue || '');
  const lastIdRef = useRef(id);
  const commitTimeoutRef = useRef<ReturnType<typeof setTimeout>>();
  const onCommitRef = useRef(onCommit);
  onCommitRef.current = onCommit;

  // Reset when ID changes (different item)
  useEffect(() => {
    if (id !== lastIdRef.current) {
      setValue(initialValue || '');
      lastIdRef.current = id;
    }
  }, [id, initialValue]);

  // Debounced commit while typing (500ms) - for smooth autosave
  const handleChange = useCallback((e: React.ChangeEvent<HTMLTextAreaElement>) => {
    e.stopPropagation();
    const newValue = e.target.value;
    setValue(newValue);
    
    // Debounce commit to parent
    clearTimeout(commitTimeoutRef.current);
    commitTimeoutRef.current = setTimeout(() => {
      onCommitRef.current(newValue);
    }, 500);
  }, []);

  const handleBlur = useCallback(() => {
    clearTimeout(commitTimeoutRef.current);
    onCommitRef.current(value);
  }, [value]);

  return (
    <textarea
      ref={ref as React.RefObject<HTMLTextAreaElement>}
      value={value}
      onChange={handleChange}
      onBlur={handleBlur}
      onKeyDown={e => e.stopPropagation()}
      placeholder={placeholder}
      className={className}
    />
  );
}, (prev, next) => prev.id === next.id);

// Tag input with completely isolated state
interface IsolatedTagInputProps {
  onAddTag: (tag: string) => void;
  placeholder?: string;
  className?: string;
}

export const IsolatedTagInput = React.memo(function IsolatedTagInput({
  onAddTag,
  placeholder,
  className
}: IsolatedTagInputProps) {
  const inputRef = useRef<HTMLInputElement>(null);
  const [value, setValue] = useState('');

  const handleChange = useCallback((e: React.ChangeEvent<HTMLInputElement>) => {
    e.stopPropagation();
    setValue(e.target.value);
  }, []);

  const handleKeyDown = useCallback((e: React.KeyboardEvent) => {
    e.stopPropagation();
    if (e.key === 'Enter') {
      e.preventDefault();
      if (value.trim()) {
        onAddTag(value.trim());
        setValue('');
      }
    }
  }, [value, onAddTag]);

  const handleAddClick = useCallback(() => {
    if (value.trim()) {
      onAddTag(value.trim());
      setValue('');
      inputRef.current?.focus();
    }
  }, [value, onAddTag]);

  return (
    <div className="flex gap-2">
      <input
        ref={inputRef}
        type="text"
        value={value}
        onChange={handleChange}
        onKeyDown={handleKeyDown}
        placeholder={placeholder}
        className={className}
      />
      <button
        type="button"
        onClick={handleAddClick}
        className="bg-[#334155] text-[#F8FAFC] px-3 py-2 rounded-lg text-sm hover:bg-[#475569] transition-colors"
      >
        Add
      </button>
    </div>
  );
});
