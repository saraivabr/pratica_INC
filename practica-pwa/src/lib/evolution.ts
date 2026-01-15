const EVOLUTION_API_URL = process.env.EVOLUTION_API_URL
const EVOLUTION_API_KEY = process.env.EVOLUTION_API_KEY
const EVOLUTION_INSTANCE = process.env.EVOLUTION_INSTANCE_NAME

interface SendTextResponse {
  success: boolean
  messageId?: string
  error?: string
}

export async function sendText(
  number: string,
  text: string
): Promise<SendTextResponse> {
  if (!EVOLUTION_API_URL || !EVOLUTION_API_KEY || !EVOLUTION_INSTANCE) {
    console.error("Evolution API not configured")
    return { success: false, error: "API not configured" }
  }

  try {
    const response = await fetch(
      `${EVOLUTION_API_URL}/message/sendText/${EVOLUTION_INSTANCE}`,
      {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
          apikey: EVOLUTION_API_KEY,
        },
        body: JSON.stringify({
          number,
          text,
        }),
      }
    )

    if (!response.ok) {
      const errorData = await response.text()
      console.error("Evolution API error:", errorData)
      return { success: false, error: errorData }
    }

    const data = await response.json()
    return { success: true, messageId: data.key?.id }
  } catch (error) {
    console.error("Error sending message:", error)
    return { success: false, error: String(error) }
  }
}

export async function sendMedia(
  number: string,
  mediaUrl: string,
  mediatype: "document" | "image" | "video",
  caption?: string,
  fileName?: string
): Promise<SendTextResponse> {
  if (!EVOLUTION_API_URL || !EVOLUTION_API_KEY || !EVOLUTION_INSTANCE) {
    return { success: false, error: "API not configured" }
  }

  try {
    const response = await fetch(
      `${EVOLUTION_API_URL}/message/sendMedia/${EVOLUTION_INSTANCE}`,
      {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
          apikey: EVOLUTION_API_KEY,
        },
        body: JSON.stringify({
          number,
          mediatype,
          mimetype:
            mediatype === "document"
              ? "application/pdf"
              : mediatype === "image"
              ? "image/jpeg"
              : "video/mp4",
          caption,
          media: mediaUrl,
          fileName,
        }),
      }
    )

    if (!response.ok) {
      return { success: false, error: await response.text() }
    }

    return { success: true }
  } catch (error) {
    return { success: false, error: String(error) }
  }
}
