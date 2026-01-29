/**
 * API Authentication and Workspace Context Helpers
 *
 * NEW: User Workspace Architecture (v2)
 * - Each user has their own isolated workspace (1 user = 1 workspace by default)
 * - Replaced tenant-based isolation with user workspace isolation
 * - More secure: zero risk of data leakage between users
 *
 * Use requireWorkspaceContext() at the start of protected API routes.
 */

import { NextRequest, NextResponse } from 'next/server';
import { getAuthenticatedUser } from '@/lib/api-auth';
import { dbQuery } from '@/lib/db';
import { User } from '@/lib/supabase';

export interface Workspace {
  id: number;
  owner_id: string;
  name: string;
  slug: string;
  type: 'personal' | 'shared';
  settings: any;
  cvcrm_config: any;
  evolution_instance_name?: string;
  evolution_connected: boolean;
  is_active: boolean;
  plan: string;
  created_at: string;
  updated_at: string;
}

export interface WorkspaceContext {
  workspaceId: number;
  workspace: Workspace;
  user: User;
  error?: never;
}

export interface WorkspaceContextError {
  workspaceId: 0;
  workspace: null;
  user: User | null;
  error: NextResponse;
}

export type WorkspaceContextResult = WorkspaceContext | WorkspaceContextError;

/**
 * Validates authentication and resolves workspace context for API routes.
 *
 * @example
 * export async function GET(request: NextRequest) {
 *   const ctx = await requireWorkspaceContext(request);
 *   if (ctx.error) return ctx.error;
 *
 *   // ctx.workspaceId, ctx.user, ctx.workspace are now available
 *   const leads = await dbQuery(
 *     'SELECT * FROM cvcrm_leads WHERE workspace_id = $1',
 *     [ctx.workspaceId]
 *   );
 * }
 */
export async function requireWorkspaceContext(
  request: NextRequest
): Promise<WorkspaceContextResult> {
  // 1. Authenticate user
  const user = await getAuthenticatedUser(request);
  if (!user) {
    return {
      workspaceId: 0,
      workspace: null,
      user: null,
      error: NextResponse.json(
        { error: 'Não autorizado' },
        { status: 401 }
      ),
    };
  }

  // 2. Get workspace_id from user
  let workspaceId = (user as any).workspace_id;

  // 3. If user doesn't have workspace_id, create one automatically
  if (!workspaceId) {
    console.warn(
      `[requireWorkspaceContext] User ${(user as any).id} sem workspace_id. Criando automaticamente...`
    );
    
    try {
      workspaceId = await autoCreateWorkspace(user);
    } catch (error: any) {
      console.error('[requireWorkspaceContext] Erro ao criar workspace:', error);
      return {
        workspaceId: 0,
        workspace: null,
        user,
        error: NextResponse.json(
          { error: 'Erro ao configurar workspace. Tente novamente.' },
          { status: 500 }
        ),
      };
    }
  }

  // 4. Load workspace details
  const { rows } = await dbQuery(
    `SELECT * FROM workspaces WHERE id = $1 LIMIT 1`,
    [workspaceId]
  );

  const workspace = rows[0];

  if (!workspace) {
    console.error(
      `[requireWorkspaceContext] Workspace ${workspaceId} não encontrado para user ${(user as any).id}`
    );
    return {
      workspaceId: 0,
      workspace: null,
      user,
      error: NextResponse.json(
        { error: 'Workspace não encontrado. Entre em contato com o suporte.' },
        { status: 400 }
      ),
    };
  }

  // 5. Check workspace status
  if (!workspace.is_active) {
    return {
      workspaceId: 0,
      workspace: null,
      user,
      error: NextResponse.json(
        { error: 'Workspace inativo. Entre em contato com o suporte.' },
        { status: 403 }
      ),
    };
  }

  // 6. Return successful context
  return {
    workspaceId: workspace.id,
    workspace,
    user,
  };
}

/**
 * Auto-create workspace for user if they don't have one
 * This happens when:
 * - User was created before migration 022
 * - Trigger failed during user creation
 */
async function autoCreateWorkspace(user: any): Promise<number> {
  try {
    const userId = user.id;
    const userName = user.nome || 'Usuário';

    // Create workspace
    const { rows } = await dbQuery(
      `INSERT INTO workspaces (owner_id, name, slug, type)
       VALUES ($1, $2, $3, 'personal')
       RETURNING id`,
      [userId, `${userName} - Workspace`, `user-${userId}-${Date.now()}`]
    );

    const workspaceId = rows[0].id;

    // Update user with workspace_id
    await dbQuery(
      `UPDATE users SET workspace_id = $1 WHERE id = $2`,
      [workspaceId, userId]
    );

    console.log(`[autoCreateWorkspace] Workspace ${workspaceId} criado para usuário ${userId}`);

    return workspaceId;
  } catch (error: any) {
    console.error('[autoCreateWorkspace] Error:', error);
    throw new Error('Falha ao criar workspace: ' + error.message);
  }
}

/**
 * Type guard to check if context has an error
 */
export function hasError(ctx: WorkspaceContextResult): ctx is WorkspaceContextError {
  return 'error' in ctx && ctx.error !== undefined;
}

// ============================================================================
// BACKWARD COMPATIBILITY
// ============================================================================

/**
 * @deprecated Use requireWorkspaceContext instead
 * Kept for backward compatibility during migration
 */
export const requireTenantContext = requireWorkspaceContext;

/**
 * @deprecated Use WorkspaceContext instead
 */
export type TenantContext = WorkspaceContext;

/**
 * @deprecated Use WorkspaceContextError instead
 */
export type TenantContextError = WorkspaceContextError;

/**
 * @deprecated Use WorkspaceContextResult instead
 */
export type TenantContextResult = WorkspaceContextResult;
