/**
 * offlineDB.js
 * ─────────────────────────────────────────────────────────────
 * Two responsibilities:
 *  1. LOCAL CACHE  — stores all questions from Supabase locally
 *     so the app can read them while offline.
 *  2. SYNC QUEUE   — when offline, Add/Edit/Delete operations are
 *     saved here. When internet returns, they are replayed to Supabase.
 * ─────────────────────────────────────────────────────────────
 */

import { openDB } from 'idb';

const DB_NAME    = 'flutter-library-db';
const DB_VERSION = 1;

// Open (or create) the IndexedDB database
async function getDB() {
  return openDB(DB_NAME, DB_VERSION, {
    upgrade(db) {
      // questions cache — mirrors Supabase table
      if (!db.objectStoreNames.contains('questions')) {
        db.createObjectStore('questions', { keyPath: 'id' });
      }
      // pending operations queue — replayed when back online
      if (!db.objectStoreNames.contains('syncQueue')) {
        const store = db.createObjectStore('syncQueue', {
          keyPath: 'queueId',
          autoIncrement: true,
        });
        store.createIndex('by_created', 'createdAt');
      }
    },
  });
}

// ── LOCAL CACHE ──────────────────────────────────────────────

/** Save all questions from Supabase into IndexedDB */
export async function cacheQuestions(questions) {
  const db = await getDB();
  const tx = db.transaction('questions', 'readwrite');
  await tx.store.clear();
  for (const q of questions) await tx.store.put(q);
  await tx.done;
}

/** Read all cached questions (used when offline) */
export async function getCachedQuestions() {
  const db = await getDB();
  return db.getAll('questions');
}

/** Update a single question in cache (after add/edit/fav toggle) */
export async function upsertCachedQuestion(q) {
  const db = await getDB();
  await db.put('questions', q);
}

/** Remove a question from cache */
export async function deleteCachedQuestion(id) {
  const db = await getDB();
  await db.delete('questions', id);
}

// ── SYNC QUEUE ───────────────────────────────────────────────

/**
 * Enqueue an operation to be synced later.
 * @param {'add'|'edit'|'delete'|'fav'} type
 * @param {object} payload  — the data needed to replay the operation
 */
export async function enqueueOperation(type, payload) {
  const db = await getDB();
  await db.add('syncQueue', {
    type,
    payload,
    createdAt: Date.now(),
    retries: 0,
  });
}

/** Get all pending operations in order */
export async function getPendingOperations() {
  const db = await getDB();
  return db.getAllFromIndex('syncQueue', 'by_created');
}

/** Remove a successfully synced operation from the queue */
export async function removeSyncedOperation(queueId) {
  const db = await getDB();
  await db.delete('syncQueue', queueId);
}

/** How many operations are waiting to sync */
export async function getPendingCount() {
  const db = await getDB();
  return db.count('syncQueue');
}
