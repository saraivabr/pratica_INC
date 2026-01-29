"use client"

import Link from "next/link"
import Image from "next/image"
import { Menu } from "lucide-react"
import { Button } from "@/components/ui/button"
import { DropdownMenu, DropdownMenuContent, DropdownMenuItem, DropdownMenuTrigger } from "@/components/ui/dropdown-menu"

export function Header() {
  return (
    <header className="sticky top-0 z-40 w-full border-b border-border bg-card/95 backdrop-blur supports-[backdrop-filter]:bg-card/60">
      <div className="container flex h-16 items-center justify-between px-4">
        <Link href="/" className="flex items-center gap-2">
          <Image
            src="/logo-pratica-icon.svg"
            alt="Pratica Incorporadora"
            width={36}
            height={36}
            className="h-9 w-9"
          />
          <span className="font-semibold text-lg hidden sm:inline-block">Pratica Incorporadora</span>
        </Link>

        <nav className="hidden md:flex items-center gap-6">
          <Link href="/" className="text-sm font-medium text-muted-foreground hover:text-foreground transition-colors">
            Início
          </Link>
          <Link
            href="/empreendimentos"
            className="text-sm font-medium text-muted-foreground hover:text-foreground transition-colors"
          >
            Empreendimentos
          </Link>
          <Link
            href="/calculadora"
            className="text-sm font-medium text-muted-foreground hover:text-foreground transition-colors"
          >
            Calculadora
          </Link>
        </nav>

        <DropdownMenu>
          <DropdownMenuTrigger asChild className="md:hidden">
            <Button variant="ghost" size="icon">
              <Menu className="h-5 w-5" />
              <span className="sr-only">Menu</span>
            </Button>
          </DropdownMenuTrigger>
          <DropdownMenuContent align="end">
            <DropdownMenuItem asChild>
              <Link href="/">Início</Link>
            </DropdownMenuItem>
            <DropdownMenuItem asChild>
              <Link href="/empreendimentos">Empreendimentos</Link>
            </DropdownMenuItem>
            <DropdownMenuItem asChild>
              <Link href="/calculadora">Calculadora</Link>
            </DropdownMenuItem>
          </DropdownMenuContent>
        </DropdownMenu>
      </div>
    </header>
  )
}
