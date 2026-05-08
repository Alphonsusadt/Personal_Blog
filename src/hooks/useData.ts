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

// Simple in-memory cache to avoid refetching on back navigation
type CacheEntry<T> = { data: T[]; ts: number };
const CACHE_TTL = 60 * 1000; // 60 seconds
const cache: Record<string, CacheEntry<unknown>> = {};

function getCached<T>(key: string): T[] | null {
  const e = cache[key] as CacheEntry<T> | undefined;
  if (!e) return null;
  if (Date.now() - e.ts > CACHE_TTL) return null;
  return e.data;
}

function setCached<T>(key: string, data: T[]) {
  cache[key] = { data, ts: Date.now() };
}

export function useProjects() {
  const [data, setData] = useState<Project[]>(staticProjects);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    const key = '/api/projects/public';
    const cached = getCached<Project>(key);
    if (cached) {
      setData(cached);
      setLoading(false);
      // refresh in background
      fetchPublic<Project>(key, cached).then((fresh) => {
        setCached<Project>(key, fresh);
        setData(fresh);
      }).catch(() => {});
      return;
    }

    fetchPublic<Project>(key, staticProjects)
      .then((res) => {
        setCached<Project>(key, res);
        setData(res);
      })
      .finally(() => setLoading(false));
  }, []);

  return { projects: data, loading };
}

export function useWritings() {
  const [data, setData] = useState<Writing[]>(staticWritings);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    const key = '/api/writings/public';
    const cached = getCached<Writing>(key);
    if (cached) {
      setData(cached);
      setLoading(false);
      fetchPublic<Writing>(key, cached).then((fresh) => {
        setCached<Writing>(key, fresh);
        setData(fresh);
      }).catch(() => {});
      return;
    }

    fetchPublic<Writing>(key, staticWritings)
      .then((res) => {
        setCached<Writing>(key, res);
        setData(res);
      })
      .finally(() => setLoading(false));
  }, []);

  return { writings: data, loading };
}

export function useBooks() {
  const [data, setData] = useState<Book[]>(staticBooks);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    const key = '/api/books/public';
    const cached = getCached<Book>(key);
    if (cached) {
      setData(cached);
      setLoading(false);
      fetchPublic<Book>(key, cached).then((fresh) => {
        setCached<Book>(key, fresh);
        setData(fresh);
      }).catch(() => {});
      return;
    }

    fetchPublic<Book>(key, staticBooks)
      .then((res) => {
        setCached<Book>(key, res);
        setData(res);
      })
      .finally(() => setLoading(false));
  }, []);

  return { books: data, loading };
}
