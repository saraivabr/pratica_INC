const ZAPI_INSTANCE = "3ED40028A79321A51CE376A164AA5E9E"
const ZAPI_TOKEN = "636347DC24AEBB3F31F4E04C"
const ZAPI_SECURITY_TOKEN = "F9992ada0ed6b49a395fc8eb96ee9af70S"

const EVOLUTION_API_URL = "https://projeto1-evolution-api.robuvi.easypanel.host"
const EVOLUTION_API_KEY = "429683C4C977415CAAFCCE10F7D57E11"
const EVOLUTION_INSTANCE = "pratica"

export async function sendOTP(phone: string, code: string, token?: string) {
  const cleanPhone = phone.replace(/\D/g, "")
  const normalizedPhone = cleanPhone.startsWith("55") ? cleanPhone : "55" + cleanPhone

  console.log(`[WhatsApp] Iniciando envio para ${normalizedPhone}`)

  const loginUrl = `https://pratica.escreve.ai/api/auth/verify-link?token=${token}`
  const messageText = `Olá! Seu acesso ao *Portal Prática* está pronto.\n\nCódigo: *${code}*\n\nOu acesse direto pelo link:\n${loginUrl}`

  // 1. TENTATIVA Z-API (Prioritária)
  try {
    console.log("[WhatsApp] Tentando via Z-API...")
    const zResponse = await fetch(`https://api.z-api.io/instances/${ZAPI_INSTANCE}/token/${ZAPI_TOKEN}/send-text`, {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        "client-token": ZAPI_SECURITY_TOKEN
      },
      body: JSON.stringify({
        phone: normalizedPhone,
        message: messageText
      })
    })

    const zData = await zResponse.json()
    
    // Se a Z-API aceitou, retornamos sucesso
    if (zResponse.ok && !zData.error) {
      console.log("[WhatsApp] Sucesso via Z-API:", zData)
      return { success: true, data: zData }
    }
    
    console.warn("[WhatsApp] Z-API falhou ou retornou erro:", zData)
  } catch (e) {
    console.error("[WhatsApp] Erro de conexão com Z-API:", e)
  }

  // 2. TENTATIVA EVOLUTION API (Fallback)
  try {
    console.log("[WhatsApp] Tentando via Evolution API (Fallback)...")
    const eResponse = await fetch(`${EVOLUTION_API_URL}/message/sendText/${EVOLUTION_INSTANCE}`, {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        "apikey": EVOLUTION_API_KEY
      },
      body: JSON.stringify({
        number: normalizedPhone,
        text: messageText
      })
    })

    const eData = await eResponse.json()

    if (eResponse.ok) {
      console.log("[WhatsApp] Sucesso via Evolution API:", eData)
      return { success: true, data: eData }
    }
    
    console.error("[WhatsApp] Evolution API falhou:", eData)
    return { success: false, error: eData }

  } catch (error) {
    console.error("[WhatsApp] Erro fatal em ambas as APIs:", error)
    return { success: false, error }
  }
}