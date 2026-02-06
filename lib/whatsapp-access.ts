/**
 * Shared WhatsApp instance access control.
 *
 * Centralizes the "can this user access this instance?" check
 * used across all WhatsApp API routes.
 */

import { withTenant } from '@/lib/tenant-context';

/**
 * Check if a user can access a given WhatsApp instance.
 *
 * - Admins/gerentes can access any instance within the workspace.
 * - Regular users can only access their own instance.
 */
export async function canAccessInstance(
  user: { role?: string | null; evolution_instance_name?: string | null },
  workspaceId: number,
  instanceName: string
): Promise<boolean> {
  if (!instanceName) return false;

  const isAdmin = user.role === 'admin' || user.role === 'gerente';

  if (isAdmin) {
    return withTenant(workspaceId, async (client) => {
      const { rows } = await client.query(
        `SELECT 1 FROM users WHERE workspace_id = $1 AND evolution_instance_name = $2 LIMIT 1`,
        [workspaceId, instanceName]
      );
      return rows.length > 0;
    });
  }

  return !!user.evolution_instance_name && user.evolution_instance_name === instanceName;
}
