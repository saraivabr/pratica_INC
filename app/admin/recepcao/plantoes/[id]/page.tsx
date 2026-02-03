"use client"

import { useEffect } from "react"
import { useRouter, useParams } from "next/navigation"
import { Loader2 } from "lucide-react"

// Redirect to fila page
export default function PlantaoPage() {
  const router = useRouter()
  const params = useParams()

  useEffect(() => {
    router.replace(`/admin/recepcao/plantoes/${params.id}/fila`)
  }, [router, params.id])

  return (
    <div className="min-h-screen flex items-center justify-center">
      <Loader2 className="h-8 w-8 animate-spin text-primary" />
    </div>
  )
}
