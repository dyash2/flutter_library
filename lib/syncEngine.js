/**
 * syncEngine.js
 * ─────────────────────────────────────────────────────────────
 * Replays all queued offline operations against Supabase
 * in the correct order (FIFO). Called automatically when:
 *  - The app detects the browser came back online
 *  - The app loads and there are pending operations
 * ─────────────────────────────────────────────────────────────
 */

import { supabase } from './supabaseClient';
import {
  getPendingOperations,
  removeSyncedOperation,
  upsertCachedQuestion,
  deleteCachedQuestion,
} from './offlineDB';

/**
 * Run the sync. Returns { synced, failed } counts.
 * @param {function} onProgress  — called after each op (for UI feedback)
 */
export async function runSync(onProgress) {
  const ops = await getPendingOperations();
  if (ops.length === 0) return { synced: 0, failed: 0 };

  let synced = 0;
  let failed = 0;

  for (const op of ops) {
    try {
      await replayOperation(op);
      await removeSyncedOperation(op.queueId);
      synced++;
      onProgress?.({ synced, failed, total: ops.length, current: op });
    } catch (err) {
      console.error(`[sync] Failed to replay op ${op.type}:`, err);
      failed++;
    }
  }

  return { synced, failed };
}

/** Replay a single queued operation against Supabase */
async function replayOperation(op) {
  const { type, payload } = op;

  switch (type) {
    case 'add': {
      // payload has a temp id (prefixed "offline_") — strip it so Supabase generates a real UUID
      const { id, created_at, updated_at, ...fields } = payload;
      const { data, error } = await supabase.from('questions').insert([fields]).select().single();
      if (error) throw error;
      // Update local cache: replace temp record with real one
      await deleteCachedQuestion(id);
      await upsertCachedQuestion(data);
      break;
    }

    case 'edit': {
      const { id, created_at, updated_at, ...fields } = payload;
      // Skip if this was an offline-only question that got a real id via 'add' sync above
      const { error } = await supabase.from('questions').update(fields).eq('id', id);
      if (error) throw error;
      break;
    }

    case 'delete': {
      // If it was an offline-only question (never reached server), just ignore
      if (String(payload.id).startsWith('offline_')) return;
      const { error } = await supabase.from('questions').delete().eq('id', payload.id);
      if (error) throw error;
      break;
    }

    case 'fav': {
      if (String(payload.id).startsWith('offline_')) return;
      const { error } = await supabase
        .from('questions')
        .update({ is_favourite: payload.is_favourite })
        .eq('id', payload.id);
      if (error) throw error;
      break;
    }

    default:
      console.warn('[sync] Unknown op type:', type);
  }
}
