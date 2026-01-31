import { NextRequest } from "next/server"

// Server-Sent Events para atualização em tempo real do dashboard
export async function GET(request: NextRequest) {
  const encoder = new TextEncoder()

  const stream = new ReadableStream({
    async start(controller) {
      // Função para buscar e enviar stats
      const sendStats = async () => {
        try {
          const response = await fetch(`${process.env.NEXT_PUBLIC_BASE_URL || 'http://localhost:3000'}/api/crm/stats`)
          const stats = await response.json()

          const data = `data: ${JSON.stringify(stats)}\n\n`
          controller.enqueue(encoder.encode(data))
        } catch (error) {
          console.error('Error fetching stats:', error)
        }
      }

      // Enviar dados iniciais
      await sendStats()

      // Atualizar a cada 30 segundos
      const interval = setInterval(sendStats, 30000)

      // Cleanup quando a conexão fechar
      request.signal.addEventListener('abort', () => {
        clearInterval(interval)
        controller.close()
      })
    },
  })

  return new Response(stream, {
    headers: {
      'Content-Type': 'text/event-stream',
      'Cache-Control': 'no-cache',
      'Connection': 'keep-alive',
    },
  })
}
