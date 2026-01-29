import "server-only";

const BASE_URL = "https://api.elevenlabs.io";

interface SipOutboundCallResponse {
  call_id?: string;
  status?: string;
  message?: string;
}

export async function createSipOutboundCall(params: {
  agentId: string;
  agentPhoneNumberId: string;
  toNumber: string;
  metadata?: Record<string, unknown>;
}): Promise<SipOutboundCallResponse> {
  const apiKey = process.env.ELEVENLABS_API_KEY;
  if (!apiKey) {
    throw new Error("ELEVENLABS_API_KEY is required");
  }

  const response = await fetch(`${BASE_URL}/v1/convai/sip-trunk/outbound-call`, {
    method: "POST",
    headers: {
      "Content-Type": "application/json",
      "xi-api-key": apiKey,
    },
    body: JSON.stringify({
      agent_id: params.agentId,
      agent_phone_number_id: params.agentPhoneNumberId,
      to_number: params.toNumber,
      conversation_initiation_client_data: params.metadata
        ? {
            dynamic_variables: params.metadata,
          }
        : undefined,
    }),
  });

  if (!response.ok) {
    const errorText = await response.text();
    throw new Error(`ElevenLabs SIP call failed: ${response.status} ${errorText}`);
  }

  return response.json();
}
