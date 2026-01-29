import { useEffect, useRef } from 'react'
import { useRouter } from 'next/navigation'

export function useUnsavedChangesWarning(hasUnsavedChanges: boolean, message = 'Você tem alterações não salvas. Deseja realmente sair?') {
  const router = useRouter()
  const savedMessage = useRef(message)

  useEffect(() => {
    savedMessage.current = message
  }, [message])

  useEffect(() => {
    const handleBeforeUnload = (e: BeforeUnloadEvent) => {
      if (hasUnsavedChanges) {
        e.preventDefault()
        e.returnValue = savedMessage.current
        return savedMessage.current
      }
    }

    window.addEventListener('beforeunload', handleBeforeUnload)

    return () => {
      window.removeEventListener('beforeunload', handleBeforeUnload)
    }
  }, [hasUnsavedChanges])

  // Para navegação interna do Next.js (quando usar Link ou router.push)
  useEffect(() => {
    if (!hasUnsavedChanges) return

    // Interceptar cliques em links
    const handleLinkClick = (e: MouseEvent) => {
      const target = e.target as HTMLElement
      const link = target.closest('a')

      if (link && link.href && !link.href.startsWith(window.location.origin)) {
        return // Link externo, deixar o beforeunload lidar
      }

      if (link && hasUnsavedChanges) {
        if (!window.confirm(savedMessage.current)) {
          e.preventDefault()
        }
      }
    }

    document.addEventListener('click', handleLinkClick)

    return () => {
      document.removeEventListener('click', handleLinkClick)
    }
  }, [hasUnsavedChanges])
}
