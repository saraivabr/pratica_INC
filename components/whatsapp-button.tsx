"use client"

import { Button } from "@/components/ui/button"
import { MessageCircle } from "lucide-react"

interface WhatsAppButtonProps {
    phone?: string
    message?: string
    variant?: "default" | "outline" | "secondary" | "ghost" | "link" | "destructive"
    size?: "default" | "sm" | "lg" | "icon"
    className?: string
    fullWidth?: boolean
}

export function WhatsAppButton({
    phone = "558199999999", // Número padrão (pode ser alterado depois)
    message = "Olá! Gostaria de mais informações sobre os seus empreendimentos.",
    variant = "default",
    size = "lg",
    className = "",
    fullWidth = true
}: WhatsAppButtonProps) {
    const handleClick = () => {
        const encodedMessage = encodeURIComponent(message)
        const url = `https://wa.me/${phone}?text=${encodedMessage}`
        window.open(url, "_blank")
    }

    return (
        <Button
            onClick={handleClick}
            variant={variant}
            size={size}
            className={`${fullWidth ? "w-full" : ""} ${className} bg-primary hover:bg-primary/90 text-primary-foreground border-0`}
        >
            <MessageCircle className="mr-2 h-5 w-5" />
            Falar no WhatsApp
        </Button>
    )
}
