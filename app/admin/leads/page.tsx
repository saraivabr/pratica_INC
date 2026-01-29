"use client"

import { useEffect } from "react"
import { useRouter } from "next/navigation"

export default function AdminLeadsRedirect() {
  const router = useRouter()

  useEffect(() => {
    router.replace("/clientes")
  }, [router])

  return null
}
