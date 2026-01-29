/**
 * Base Sync Agent Class
 * All CV CRM sync agents inherit from this class
 */

import { dbQuery } from '@/lib/db';
import { getGlobalRateLimiter } from './rate-limiter';
import { CursorManager } from './cursor-manager';
import {
  SyncResult,
  BatchSyncResult,
  SyncLog,
  SyncStatus,
  CVCRMApiResponse,
  AgentConfig,
} from './types';

export interface SyncOptions {
  fullSync?: boolean;
  limit?: number;
  batchSize?: number;
}

export abstract class BaseSyncAgent<TCVCRMData = any, TDBData = any> {
  protected config: AgentConfig;
  protected cursorManager: CursorManager;
  protected rateLimiter = getGlobalRateLimiter();
  protected currentSyncId?: string;

  constructor(config: AgentConfig) {
    this.config = config;
    this.cursorManager = new CursorManager(config.name);
  }

  /**
   * Abstract methods - must be implemented by child classes
   */
  abstract transformData(cvcrmData: TCVCRMData): TDBData;
  abstract getUpsertQuery(tableName: string): { sql: string; getParams: (data: TDBData) => any[] };

  /**
   * Fetch data from CV CRM API with rate limiting and pagination
   */
  protected async fetchFromCVCRM<T = TCVCRMData>(
    endpoint: string,
    token: string,
    params: Record<string, any> = {}
  ): Promise<CVCRMApiResponse<T>> {
    const baseUrl = process.env.CVCRM_BASE_URL || 'https://pratica.cvcrm.com.br';
    const email = process.env.CVCRM_EMAIL || '';

    const queryParams = new URLSearchParams();
    Object.entries(params).forEach(([key, value]) => {
      if (value !== undefined && value !== null) {
        queryParams.set(key, String(value));
      }
    });

    const url = `${baseUrl}${endpoint}${queryParams.toString() ? '?' + queryParams.toString() : ''}`;

    return this.rateLimiter.execute(async () => {
      const fetchOptions = {
        method: 'GET',
        headers: {
          accept: 'application/json',
          email,
          token,
        },
      };

      const response = await fetch(url, fetchOptions);

      if (!response.ok) {
        throw new Error(`CV CRM API error: ${response.status} - ${await response.text()}`);
      }

      return response.json();
    });
  }

  /**
   * Upsert data into database
   */
  protected async upsertData(tableName: string, data: TDBData): Promise<SyncResult> {
    try {
      const { sql, getParams } = this.getUpsertQuery(tableName);
      const params = getParams(data);

      const result = await dbQuery(sql, params);

      return {
        success: true,
        operation: result.rowCount === 1 ? 'created' : 'updated',
        data: data as any,
      };
    } catch (error) {
      return {
        success: false,
        operation: 'error',
        error: error instanceof Error ? error.message : String(error),
        data: data as any,
      };
    }
  }

  /**
   * Log sync start
   */
  protected async logSyncStart(tableName: string, syncType: 'full' | 'incremental'): Promise<string> {
    const result = await dbQuery<{ id: string }>(
      `INSERT INTO sync_logs
       (agent_name, table_name, sync_type, status, started_at)
       VALUES ($1, $2, $3, 'running', NOW())
       RETURNING id`,
      [this.config.name, tableName, syncType]
    );

    const syncId = result.rows[0]?.id;
    if (!syncId) {
      throw new Error('Failed to create sync log');
    }

    this.currentSyncId = syncId;
    return syncId;
  }

  /**
   * Log sync completion
   */
  protected async logSyncComplete(
    syncId: string,
    status: SyncStatus,
    stats: Partial<SyncLog>
  ): Promise<void> {
    await dbQuery(
      `UPDATE sync_logs
       SET status = $1,
           completed_at = NOW(),
           total_items = $2,
           created = $3,
           updated = $4,
           skipped = $5,
           errors = $6,
           error_details = $7,
           metadata = $8
       WHERE id = $9`,
      [
        status,
        stats.totalItems || 0,
        stats.created || 0,
        stats.updated || 0,
        stats.skipped || 0,
        stats.errors || 0,
        JSON.stringify(stats.errorDetails || []),
        JSON.stringify(stats.metadata || {}),
        syncId,
      ]
    );
  }

  /**
   * Sync a single table from CV CRM
   */
  async syncTable(
    tableName: string,
    endpoint: string,
    tokenEnvVar: string,
    options: SyncOptions = {}
  ): Promise<BatchSyncResult> {
    const startTime = Date.now();
    const startedAt = new Date();

    const {
      fullSync = false,
      limit,
      batchSize = 100,
    } = options;

    // Determine sync type
    const syncType = fullSync ? 'full' : 'incremental';

    // Log sync start
    const syncId = await this.logSyncStart(tableName, syncType);

    const results: SyncResult[] = [];
    let offset = 0;
    let hasMore = true;
    let totalFetched = 0;

    try {
      while (hasMore) {
        // Check if we've reached the limit
        if (limit && totalFetched >= limit) {
          break;
        }

        const fetchLimit = limit ? Math.min(batchSize, limit - totalFetched) : batchSize;

        // Fetch batch from CV CRM
        const token = process.env[tokenEnvVar];
        if (!token) {
          throw new Error(`Missing environment variable: ${tokenEnvVar}`);
        }

        const response = await this.fetchFromCVCRM<TCVCRMData>(endpoint, token, {
          limit: fetchLimit,
          offset,
        });

        // Extract data array from response
        const data = (response.data || response.leads || response.registros || []) as TCVCRMData[];

        if (!Array.isArray(data) || data.length === 0) {
          hasMore = false;
          break;
        }

        // Process each item
        for (const item of data) {
          try {
            const transformed = this.transformData(item);
            const result = await this.upsertData(tableName, transformed);
            results.push(result);
          } catch (error) {
            results.push({
              success: false,
              operation: 'error',
              error: error instanceof Error ? error.message : String(error),
            });
          }
        }

        totalFetched += data.length;
        offset += data.length;

        // Check if there are more items
        if (data.length < fetchLimit) {
          hasMore = false;
        }
      }

      // Calculate statistics
      const created = results.filter((r) => r.operation === 'created').length;
      const updated = results.filter((r) => r.operation === 'updated').length;
      const skipped = results.filter((r) => r.operation === 'skipped').length;
      const errors = results.filter((r) => r.operation === 'error').length;

      // Update cursor
      await this.cursorManager.updateCursor(tableName, {
        lastSyncAt: new Date(),
        lastOffset: offset,
        metadata: { totalFetched, created, updated, errors },
      });

      // Log completion
      await this.logSyncComplete(syncId, errors > 0 ? 'partial' : 'completed', {
        totalItems: totalFetched,
        created,
        updated,
        skipped,
        errors,
        errorDetails: results
          .filter((r) => r.operation === 'error')
          .map((r, i) => ({ id: i, error: r.error || 'Unknown error' })),
      });

      const completedAt = new Date();
      const duration = Date.now() - startTime;

      return {
        total: totalFetched,
        created,
        updated,
        skipped,
        errors,
        results,
        duration,
        startedAt,
        completedAt,
      };
    } catch (error) {
      // Log error
      await this.logSyncComplete(syncId, 'error', {
        totalItems: totalFetched,
        errors: 1,
        errorDetails: [{ id: 0, error: error instanceof Error ? error.message : String(error) }],
      });

      throw error;
    }
  }

  /**
   * Sync all tables for this agent
   */
  async syncAll(options: SyncOptions = {}): Promise<Record<string, BatchSyncResult>> {
    const results: Record<string, BatchSyncResult> = {};

    for (const endpoint of this.config.endpoints) {
      for (const tableName of this.config.tables) {
        console.log(`[${this.config.name}] Syncing ${tableName} from ${endpoint.path}...`);

        const result = await this.syncTable(
          tableName,
          endpoint.path,
          endpoint.tokenEnvVar,
          options
        );

        results[tableName] = result;

        console.log(
          `[${this.config.name}] ${tableName}: ${result.created} created, ${result.updated} updated, ${result.errors} errors`
        );
      }
    }

    return results;
  }

  /**
   * Get sync status for this agent
   */
  async getSyncStatus(): Promise<SyncLog[]> {
    const result = await dbQuery<any>(
      `SELECT * FROM sync_logs
       WHERE agent_name = $1
       ORDER BY started_at DESC
       LIMIT 10`,
      [this.config.name]
    );

    return result.rows.map(row => ({
      id: String(row.id),
      agentName: String(row.agent_name),
      tableName: String(row.table_name),
      syncType: String(row.sync_type) as 'full' | 'incremental',
      status: String(row.status) as SyncStatus,
      startedAt: new Date(row.started_at as string),
      completedAt: row.completed_at ? new Date(row.completed_at as string) : undefined,
      totalItems: Number(row.total_items),
      created: Number(row.created),
      updated: Number(row.updated),
      skipped: Number(row.skipped),
      errors: Number(row.errors),
      errorDetails: (row.error_details as any) || [],
      metadata: (row.metadata as any) || {},
    }));
  }

  /**
   * Reset sync state (useful for development/testing)
   */
  async resetSync(tableName: string): Promise<void> {
    await this.cursorManager.resetCursor(tableName);
    console.log(`[${this.config.name}] Reset cursor for ${tableName}`);
  }
}
