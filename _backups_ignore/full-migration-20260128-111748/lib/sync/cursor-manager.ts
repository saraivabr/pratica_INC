/**
 * Cursor Manager for Incremental Sync
 * Manages cursor state for each agent/table combination
 */

import { dbQuery } from '@/lib/db';
import { CursorState } from './types';

export class CursorManager {
  private agentName: string;

  constructor(agentName: string) {
    this.agentName = agentName;
  }

  /**
   * Get current cursor state for a table
   */
  async getCursor(tableName: string): Promise<CursorState | null> {
    interface CursorRow {
      agent_name: string;
      table_name: string;
      last_sync_at: string;
      last_id?: number;
      last_offset?: number;
      metadata?: Record<string, unknown>;
    }
    const result = await dbQuery<CursorRow>(
      `SELECT * FROM sync_cursors
       WHERE agent_name = $1 AND table_name = $2`,
      [this.agentName, tableName]
    );

    if (result.rows.length === 0) {
      return null;
    }

    const row = result.rows[0];
    return {
      agentName: row.agent_name,
      tableName: row.table_name,
      lastSyncAt: new Date(row.last_sync_at),
      lastId: row.last_id,
      lastOffset: row.last_offset,
      metadata: row.metadata,
    };
  }

  /**
   * Update cursor state
   */
  async updateCursor(
    tableName: string,
    updates: Partial<Omit<CursorState, 'agentName' | 'tableName'>>
  ): Promise<void> {
    const existing = await this.getCursor(tableName);

    if (existing) {
      await dbQuery(
        `UPDATE sync_cursors
         SET last_sync_at = COALESCE($3, last_sync_at),
             last_id = COALESCE($4, last_id),
             last_offset = COALESCE($5, last_offset),
             metadata = COALESCE($6, metadata),
             updated_at = NOW()
         WHERE agent_name = $1 AND table_name = $2`,
        [
          this.agentName,
          tableName,
          updates.lastSyncAt?.toISOString(),
          updates.lastId,
          updates.lastOffset,
          updates.metadata ? JSON.stringify(updates.metadata) : null,
        ]
      );
    } else {
      await dbQuery(
        `INSERT INTO sync_cursors
         (agent_name, table_name, last_sync_at, last_id, last_offset, metadata)
         VALUES ($1, $2, $3, $4, $5, $6)`,
        [
          this.agentName,
          tableName,
          updates.lastSyncAt?.toISOString() || new Date().toISOString(),
          updates.lastId || null,
          updates.lastOffset || 0,
          updates.metadata ? JSON.stringify(updates.metadata) : '{}',
        ]
      );
    }
  }

  /**
   * Reset cursor for a table
   */
  async resetCursor(tableName: string): Promise<void> {
    await dbQuery(
      `DELETE FROM sync_cursors
       WHERE agent_name = $1 AND table_name = $2`,
      [this.agentName, tableName]
    );
  }

  /**
   * Get all cursors for this agent
   */
  async getAllCursors(): Promise<CursorState[]> {
    const result = await dbQuery(
      `SELECT * FROM sync_cursors WHERE agent_name = $1`,
      [this.agentName]
    );

    return result.rows.map((row: Record<string, unknown>) => ({
      agentName: row.agent_name as string,
      tableName: row.table_name as string,
      lastSyncAt: new Date(row.last_sync_at as string),
      lastId: row.last_id as number | undefined,
      lastOffset: row.last_offset as number | undefined,
      metadata: row.metadata as Record<string, unknown> | undefined,
    }));
  }

  /**
   * Check if a full sync is needed (no cursor or cursor is stale)
   */
  async needsFullSync(tableName: string, maxAgeHours: number = 24): Promise<boolean> {
    const cursor = await this.getCursor(tableName);

    if (!cursor) {
      return true;
    }

    const hoursSinceSync =
      (Date.now() - cursor.lastSyncAt.getTime()) / (1000 * 60 * 60);

    return hoursSinceSync > maxAgeHours;
  }
}

/**
 * Create the sync_cursors table if not exists
 */
export async function ensureSyncCursorsTable(): Promise<void> {
  await dbQuery(`
    CREATE TABLE IF NOT EXISTS sync_cursors (
      id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
      agent_name VARCHAR(100) NOT NULL,
      table_name VARCHAR(100) NOT NULL,
      last_sync_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT NOW(),
      last_id INTEGER,
      last_offset INTEGER DEFAULT 0,
      metadata JSONB DEFAULT '{}',
      created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
      updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
      UNIQUE(agent_name, table_name)
    )
  `);

  await dbQuery(`
    CREATE INDEX IF NOT EXISTS idx_sync_cursors_agent
    ON sync_cursors(agent_name)
  `);
}
