const ZAPI_INSTANCE = "3ED40028A79321A51CE376A164AA5E9E"
const ZAPI_TOKEN = "636347DC24AEBB3F31F4E04C"
const ZAPI_CLIENT_TOKEN = "F9992ada0ed6b49a395fc8eb96ee9af70S"

export async function sendOTP(phone: string, code: string) {
  // Normaliza o telefone para o formato internacional esperado pelo Z-API
  let normalizedPhone = phone.replace(/\D/g, "")
  if (!normalizedPhone.startsWith("55")) {
    normalizedPhone = "55" + normalizedPhone
  }

  const url = `https://api.z-api.io/instances/${ZAPI_INSTANCE}/token/${ZAPI_TOKEN}/send-button-otp`

  try {
    const response = await fetch(url, {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        "client-token": ZAPI_CLIENT_TOKEN
      },
      body: JSON.stringify({
        phone: normalizedPhone,
        message: `Seu código de acesso para o App Prática é: ${code}\n\nEste código expira em 5 minutos.`, 
        code: code
      })
    })

    const data = await response.json()
    return { success: response.ok, data }
  } catch (error) {
    console.error("Erro ao enviar OTP via Z-API:", error)
    return { success: false, error }
  }
}
