import { dbQuery } from '@/lib/db';
import { sendTextMessage as sendEvolutionMessage, formatPhoneNumber } from '@/lib/evolution-api';
import { sendTextMessage as sendZapiMessage } from '@/lib/zapi';

interface CorretorInstance {
  instanceName: string;
  connected: boolean;
}

/**
 * Busca a instância Evolution de um corretor.
 * Retorna null se o corretor não tem instância configurada.
 */
export async function getCorretorEvolutionInstance(corretorId: string): Promise<CorretorInstance | null> {
  const { rows } = await dbQuery(
    `SELECT evolution_instance_name, evolution_connected
     FROM users WHERE id = $1`,
    [corretorId]
  );
  if (!rows[0]?.evolution_instance_name) return null;
  return {
    instanceName: rows[0].evolution_instance_name,
    connected: rows[0].evolution_connected === true,
  };
}

/**
 * Envia mensagem para CLIENTE via Evolution (WhatsApp do corretor).
 * Se corretor não tem Evolution conectado, NÃO envia (sem fallback Z-API).
 * Retorna true se enviou, false se não tinha instância disponível.
 */
export async function sendToClient(
  clientPhone: string,
  message: string,
  corretorId: string,
): Promise<boolean> {
  const instance = await getCorretorEvolutionInstance(corretorId);

  if (instance?.connected) {
    await sendEvolutionMessage(instance.instanceName, {
      number: formatPhoneNumber(clientPhone),
      text: message,
    });
    return true;
  }

  console.warn(`[sendToClient] Corretor ${corretorId} sem Evolution conectado. Mensagem para ${clientPhone} não enviada.`);
  return false;
}

/**
 * Envia mensagem para CORRETOR via Z-API (número do sistema).
 * Este é o canal correto para sistema->corretor.
 */
export async function sendToCorretor(
  corretorPhone: string,
  message: string,
): Promise<void> {
  await sendZapiMessage(corretorPhone, message);
}
