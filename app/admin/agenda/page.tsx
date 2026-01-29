"use client"

import { useEffect } from "react"
import { useRouter } from "next/navigation"

export default function AdminAgendaRedirect() {
  const router = useRouter()

  useEffect(() => {
    router.replace("/agenda")
  }, [router])

  return null
}
