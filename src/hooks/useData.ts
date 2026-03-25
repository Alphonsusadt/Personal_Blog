import { useState, useEffect } from 'react';
import { projects as staticProjects, type Project } from '../data/projects';
import { writings as staticWritings, type Writing } from '../data/writings';
import { books as staticBooks, type Book } from '../data/library';

const API_BASE = import.meta.env.VITE_API_URL || 'http://localhost:5000';

async function fetchPublic<T>(path: string, fallback: T[]): Promise<T[]> {
  try {
    const res = await fetch(`${API_BASE}${path}`);
    if (!res.ok) throw new Error('API error');
    return await res.json();
  } catch {
    return fallback;
  }
}

export function useProjects() {
  const [data, setData] = useState<Project[]>(staticProjects);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    fetchPublic<Project>('/api/projects/public', staticProjects)
      .then(setData)
      .finally(() => setLoading(false));
  }, []);

  return { projects: data, loading };
}

export function useWritings() {
  const [data, setData] = useState<Writing[]>(staticWritings);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    fetchPublic<Writing>('/api/writings/public', staticWritings)
      .then(setData)
      .finally(() => setLoading(false));
  }, []);

  return { writings: data, loading };
}

export function useBooks() {
  const [data, setData] = useState<Book[]>(staticBooks);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    fetchPublic<Book>('/api/books/public', staticBooks)
      .then(setData)
      .finally(() => setLoading(false));
  }, []);

  return { books: data, loading };
}
