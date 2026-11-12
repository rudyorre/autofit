import { api } from '../api/client';
import type { WorkoutDTO } from '../api/types';

const DB_NAME = 'autofit_offline_db';
const DB_VERSION = 1;
const STORE_WORKOUTS = 'pending_workouts';

export interface QueuedWorkout extends Omit<WorkoutDTO, 'source'> {
  queued_at: string;
}

function openDB(): Promise<IDBDatabase> {
  return new Promise((resolve, reject) => {
    const req = indexedDB.open(DB_NAME, DB_VERSION);
    req.onupgradeneeded = () => {
      const db = req.result;
      if (!db.objectStoreNames.contains(STORE_WORKOUTS)) {
        db.createObjectStore(STORE_WORKOUTS, { keyPath: 'id' });
      }
    };
    req.onsuccess = () => resolve(req.result);
    req.onerror = () => reject(req.error);
  });
}

export function generateLocalUUID(): string {
  if (typeof crypto !== 'undefined' && typeof crypto.randomUUID === 'function') {
    return crypto.randomUUID();
  }
  return `wk-${Date.now()}-${Math.random().toString(36).slice(2, 9)}`;
}

export async function enqueueOfflineWorkout(wk: Omit<WorkoutDTO, 'source'>): Promise<void> {
  const db = await openDB();
  return new Promise((resolve, reject) => {
    const tx = db.transaction(STORE_WORKOUTS, 'readwrite');
    const store = tx.objectStore(STORE_WORKOUTS);
    const entry: QueuedWorkout = { ...wk, queued_at: new Date().toISOString() };
    store.put(entry);
    tx.oncomplete = () => {
      db.close();
      resolve();
    };
    tx.onerror = () => {
      db.close();
      reject(tx.error);
    };
  });
}

export async function listQueuedWorkouts(): Promise<QueuedWorkout[]> {
  try {
    const db = await openDB();
    return await new Promise((resolve, reject) => {
      const tx = db.transaction(STORE_WORKOUTS, 'readonly');
      const req = tx.objectStore(STORE_WORKOUTS).getAll();
      req.onsuccess = () => {
        db.close();
        resolve((req.result as QueuedWorkout[]) || []);
      };
      req.onerror = () => {
        db.close();
        reject(req.error);
      };
    });
  } catch {
    return [];
  }
}

export async function removeQueuedWorkouts(ids: string[]): Promise<void> {
  if (!ids.length) return;
  const db = await openDB();
  return new Promise((resolve, reject) => {
    const tx = db.transaction(STORE_WORKOUTS, 'readwrite');
    const store = tx.objectStore(STORE_WORKOUTS);
    for (const id of ids) {
      store.delete(id);
    }
    tx.oncomplete = () => {
      db.close();
      resolve();
    };
    tx.onerror = () => {
      db.close();
      reject(tx.error);
    };
  });
}

export async function logOrQueueWorkout(
  wk: Omit<WorkoutDTO, 'source'>,
  forceOffline = false
): Promise<{ synced: boolean; queuedCount: number }> {
  if (!forceOffline && navigator.onLine) {
    try {
      await api.logWorkout(wk);
      const pending = await listQueuedWorkouts();
      return { synced: true, queuedCount: pending.length };
    } catch {
      // Network unreachable in gym basement -> fall through to IndexedDB queue!
    }
  }
  await enqueueOfflineWorkout(wk);
  const pending = await listQueuedWorkouts();
  return { synced: false, queuedCount: pending.length };
}

export async function flushOfflineQueue(): Promise<{ flushed: number; remaining: number }> {
  const pending = await listQueuedWorkouts();
  if (!pending.length || !navigator.onLine) {
    return { flushed: 0, remaining: pending.length };
  }
  try {
    const res = await api.syncWorkoutsBatch(pending);
    if (res.workout_ids?.length) {
      await removeQueuedWorkouts(res.workout_ids);
    }
    const after = await listQueuedWorkouts();
    return { flushed: res.synced, remaining: after.length };
  } catch {
    return { flushed: 0, remaining: pending.length };
  }
}
