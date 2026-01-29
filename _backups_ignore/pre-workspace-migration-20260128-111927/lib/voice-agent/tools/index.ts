/**
 * Voice Agent Tools - Unified Export
 *
 * Central hub for all voice agent tool definitions and utilities
 */

import { VoiceAgentToolDefinition } from '../types'

// Import tools from sibling files
import { LEADS_TOOLS } from './leads'
import { RESERVAS_TOOLS } from './reservas'
import { METRICS_TOOLS } from './metrics'
import { ATENDIMENTOS_TOOLS } from './atendimentos'

// ============================================================================
// Combined Tools Array
// ============================================================================

export const ALL_VOICE_AGENT_TOOLS: VoiceAgentToolDefinition[] = [
  ...LEADS_TOOLS,
  ...RESERVAS_TOOLS,
  ...METRICS_TOOLS,
  ...ATENDIMENTOS_TOOLS,
]

// ============================================================================
// Tool Name Type
// ============================================================================

export type TOOL_NAMES = typeof ALL_VOICE_AGENT_TOOLS[number]['name']

// ============================================================================
// Tool Utilities
// ============================================================================

/**
 * Find a tool by name
 */
export function findTool(name: string): VoiceAgentToolDefinition | undefined {
  return ALL_VOICE_AGENT_TOOLS.find((tool) => tool.name === name)
}

/**
 * Execute a tool by name
 */
export async function executeTool(
  name: string,
  args: Record<string, any>,
  tenantId: number
): Promise<any> {
  const tool = findTool(name)

  if (!tool) {
    throw new Error(`Tool not found: ${name}`)
  }

  return tool.execute(args, tenantId)
}

/**
 * Get minimal tools for testing Gemini Live API compatibility
 * Starts with the simplest possible tool (no parameters) to isolate format issues
 */
export function getToolsForGeminiMinimal(): object[] {
  return [
    {
      name: 'get_dashboard_summary',
      description: 'Retorna um resumo geral do dashboard com estatisticas basicas do CRM incluindo total de leads, reservas e vendas.',
    }
  ]
}

/**
 * Convert tools to Gemini function declaration format
 * Uses lowercase types as per OpenAPI schema format
 */
export function getToolsForGemini(): {
  name: string
  description: string
  parameters: {
    type: string
    properties: Record<string, {
      type: string
      description: string
      enum?: string[]
    }>
    required?: string[]
  }
}[] {
  return ALL_VOICE_AGENT_TOOLS.map((tool) => ({
    name: tool.name,
    description: tool.description,
    parameters: {
      type: 'object',
      properties: Object.entries(tool.parameters.properties).reduce(
        (acc, [key, value]) => ({
          ...acc,
          [key]: {
            type: value.type.toLowerCase(),
            description: value.description,
            ...(value.enum && { enum: value.enum }),
          },
        }),
        {} as Record<string, { type: string; description: string; enum?: string[] }>
      ),
      ...(tool.parameters.required && tool.parameters.required.length > 0 && { required: tool.parameters.required }),
    },
  }))
}

// ============================================================================
// Re-exports
// ============================================================================

export { LEADS_TOOLS } from './leads'
export { RESERVAS_TOOLS } from './reservas'
export { METRICS_TOOLS } from './metrics'
export { ATENDIMENTOS_TOOLS } from './atendimentos'
