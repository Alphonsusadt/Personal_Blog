import React, { useState, useRef, useEffect, useCallback } from 'react';

interface IsolatedInputProps {
  initialValue: string;
  onCommit: (value: string) => void;
  placeholder?: string;
  className?: string;
  type?: 'text' | 'url';
  id?: string; // Used to detect when to reset
}

interface IsolatedTextareaProps {
  initialValue: string;
  onCommit: (value: string) => void;
  placeholder?: string;
  className?: string;
  rows?: number;
  id?: string;
}

// Completely isolated input - won't re-render when parent changes
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

  // Only reset when ID changes (different item loaded)
  useEffect(() => {
    if (id !== lastIdRef.current) {
      setValue(initialValue);
      lastIdRef.current = id;
    }
  }, [id, initialValue]);

  const handleChange = useCallback((e: React.ChangeEvent<HTMLInputElement>) => {
    e.stopPropagation();
    setValue(e.target.value);
  }, []);

  const handleBlur = useCallback(() => {
    onCommit(value);
  }, [value, onCommit]);

  const handleKeyDown = useCallback((e: React.KeyboardEvent) => {
    e.stopPropagation();
    if (e.key === 'Enter') {
      e.preventDefault();
      onCommit(value);
      inputRef.current?.blur();
    }
  }, [value, onCommit]);

  return (
    <input
      ref={inputRef}
      type={type}
      value={value}
      onChange={handleChange}
      onBlur={handleBlur}
      onKeyDown={handleKeyDown}
      placeholder={placeholder}
      className={className}
    />
  );
}, (prevProps, nextProps) => {
  // Only re-render if ID changes (new item loaded)
  return prevProps.id === nextProps.id;
});

// Completely isolated textarea
export const IsolatedTextarea = React.memo(function IsolatedTextarea({
  initialValue,
  onCommit,
  placeholder,
  className,
  rows = 3,
  id
}: IsolatedTextareaProps) {
  const textareaRef = useRef<HTMLTextAreaElement>(null);
  const [value, setValue] = useState(initialValue);
  const lastIdRef = useRef(id);

  // Only reset when ID changes
  useEffect(() => {
    if (id !== lastIdRef.current) {
      setValue(initialValue);
      lastIdRef.current = id;
    }
  }, [id, initialValue]);

  const handleChange = useCallback((e: React.ChangeEvent<HTMLTextAreaElement>) => {
    e.stopPropagation();
    setValue(e.target.value);
  }, []);

  const handleBlur = useCallback(() => {
    onCommit(value);
  }, [value, onCommit]);

  const handleKeyDown = useCallback((e: React.KeyboardEvent) => {
    e.stopPropagation();
  }, []);

  return (
    <textarea
      ref={textareaRef}
      value={value}
      onChange={handleChange}
      onBlur={handleBlur}
      onKeyDown={handleKeyDown}
      placeholder={placeholder}
      className={className}
      rows={rows}
    />
  );
}, (prevProps, nextProps) => {
  // Only re-render if ID changes
  return prevProps.id === nextProps.id;
});

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
