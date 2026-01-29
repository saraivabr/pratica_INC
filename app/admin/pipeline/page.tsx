"use client"

import { useEffect } from "react"
import { useRouter } from "next/navigation"

export default function AdminPipelineRedirect() {
  const router = useRouter()

  useEffect(() => {
    router.replace("/pipeline")
  }, [router])

  return null
}
