"use client"

import { AppShell } from "@/components/app-shell"
import { useRouter } from "next/navigation"

export default function ClientesPage() {
  const router = useRouter()
  
  // Redireciona para /leads (página já implementada)
  router.replace("/leads")
  
  return null
}
