"use client"

import useSWR from "swr"
import { Empreendimento } from "@/types/empreendimento"

const fetcher = (url: string) => fetch(url).then((res) => res.json())

export function useEmpreendimentos() {
  const { data, error, isLoading, mutate } = useSWR<Empreendimento[]>(
    "/api/empreendimentos",
    fetcher,
    {
      revalidateOnFocus: false,
      dedupingInterval: 60000, // 1 minuto
    }
  )

  return {
    empreendimentos: data || [],
    isLoading,
    isError: error,
    mutate,
  }
}

export function useEmpreendimento(id: string) {
  const { data, error, isLoading } = useSWR<Empreendimento>(
    `/api/empreendimentos/${id}`,
    fetcher,
    {
      revalidateOnFocus: false,
    }
  )

  return {
    empreendimento: data,
    isLoading,
    isError: error,
  }
}
