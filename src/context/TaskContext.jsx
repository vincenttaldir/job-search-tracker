import { createContext, useContext, useState, useEffect, useRef, useCallback } from 'react';

/**
 * A "task" object shape:
 * {
 *   id: string,            // unique, e.g. 'scan-jobs'
 *   label: string,         // display label
 *   status: 'running' | 'done' | 'error',
 *   message: string | null,
 *   startedAt: string | null,   // ISO
 *   finishedAt: string | null,  // ISO
 *   navigateTo: string | null,  // route to navigate to on click
 *   read: boolean,              // user has seen the completion
 * }
 */

const TaskContext = createContext(null);

const POLL_INTERVAL_MS = 3000;

export function TaskProvider({ children }) {
  const [tasks, setTasks] = useState([]);
  const pollRef = useRef(null);

  // ---------------------------------------------------------------------------
  // Polling: fetch /api/scan/jobs/status whenever a scan is 'running'
  // ---------------------------------------------------------------------------
  const fetchScanStatus = useCallback(async () => {
    try {
      const res = await fetch('/api/scan/jobs/status');
      if (!res.ok) return;
      const data = await res.json();

      if (data.status === 'idle') return;

      setTasks((prev) => {
        const existing = prev.find((t) => t.id === 'scan-jobs');

        // Don't downgrade a local done/error back to a stale server idle
        if (!existing && data.status === 'idle') return prev;

        const next = {
          id: 'scan-jobs',
          label: 'Analyse des job boards',
          status: data.status,
          message: data.message || null,
          error: data.error || null,
          progress: data.progress ?? 0,
          total: data.companies_count ?? 0,
          found: data.found ?? 0,
          staged: data.staged ?? 0,
          startedAt: data.started_at || null,
          finishedAt: data.finished_at || null,
          navigateTo: data.status === 'done' && (data.staged ?? 0) > 0 ? '/scan-review' : '/applications',
          read: existing?.read && existing.status === data.status ? existing.read : false,
        };

        if (!existing) return [...prev, next];
        // Only update if status actually changed to avoid re-renders
        if (existing.status === next.status && existing.message === next.message) return prev;
        return prev.map((t) => (t.id === 'scan-jobs' ? next : t));
      });
    } catch {
      // network error — silently ignore
    }
  }, []);

  // Start/stop polling based on whether any task is running
  useEffect(() => {
    const hasRunning = tasks.some((t) => t.status === 'running');

    if (hasRunning && !pollRef.current) {
      pollRef.current = setInterval(fetchScanStatus, POLL_INTERVAL_MS);
    } else if (!hasRunning && pollRef.current) {
      clearInterval(pollRef.current);
      pollRef.current = null;
    }

    return () => {
      // intentionally not clearing here — we want polling to survive re-renders
    };
  }, [tasks, fetchScanStatus]);

  // On mount, do one immediate fetch to pick up any in-progress scan
  useEffect(() => {
    fetchScanStatus();
    return () => {
      if (pollRef.current) {
        clearInterval(pollRef.current);
        pollRef.current = null;
      }
    };
  }, []); // eslint-disable-line react-hooks/exhaustive-deps

  // ---------------------------------------------------------------------------
  // Public API
  // ---------------------------------------------------------------------------

  /**
   * Register a new task (or update existing by id).
   * Call this when triggering a background action.
   */
  const addTask = useCallback((task) => {
    setTasks((prev) => {
      const existing = prev.find((t) => t.id === task.id);
      if (existing) return prev.map((t) => (t.id === task.id ? { ...t, ...task, read: false } : t));
      return [...prev, { read: false, ...task }];
    });
    // Kick off polling immediately
    if (task.status === 'running') {
      fetchScanStatus();
      if (!pollRef.current) {
        pollRef.current = setInterval(fetchScanStatus, POLL_INTERVAL_MS);
      }
    }
  }, [fetchScanStatus]);

  /** Mark a task as read (user clicked or dismissed). */
  const markRead = useCallback((id) => {
    setTasks((prev) => prev.map((t) => (t.id === id ? { ...t, read: true } : t)));
  }, []);

  /** Remove a task entirely. */
  const removeTask = useCallback((id) => {
    setTasks((prev) => prev.filter((t) => t.id !== id));
  }, []);

  const unreadCount = tasks.filter((t) => !t.read && t.status !== 'running').length;

  return (
    <TaskContext.Provider value={{ tasks, addTask, markRead, removeTask, unreadCount }}>
      {children}
    </TaskContext.Provider>
  );
}

export function useTasks() {
  const ctx = useContext(TaskContext);
  if (!ctx) throw new Error('useTasks must be used within TaskProvider');
  return ctx;
}
