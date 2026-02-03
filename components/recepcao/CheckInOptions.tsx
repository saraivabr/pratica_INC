"use client"

import { Loader2, Navigation, User, QrCode } from "lucide-react"
import { Button } from "@/components/ui/button"
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card"

interface CheckInOptionsProps {
  onCheckinGps: () => void
  onCheckinManual: () => void
  gpsLoading?: boolean
  manualLoading?: boolean
  disabled?: boolean
}

export function CheckInOptions({
  onCheckinGps,
  onCheckinManual,
  gpsLoading = false,
  manualLoading = false,
  disabled = false,
}: CheckInOptionsProps) {
  const isLoading = gpsLoading || manualLoading

  return (
    <Card>
      <CardHeader>
        <CardTitle className="text-base">Fazer Check-in</CardTitle>
        <CardDescription>
          Escolha uma opcao para entrar na fila
        </CardDescription>
      </CardHeader>
      <CardContent className="space-y-3">
        <Button
          className="w-full"
          onClick={onCheckinGps}
          disabled={disabled || isLoading}
        >
          {gpsLoading ? (
            <Loader2 className="h-4 w-4 mr-2 animate-spin" />
          ) : (
            <Navigation className="h-4 w-4 mr-2" />
          )}
          Check-in por GPS
        </Button>

        <Button
          className="w-full"
          variant="outline"
          onClick={onCheckinManual}
          disabled={disabled || isLoading}
        >
          {manualLoading ? (
            <Loader2 className="h-4 w-4 mr-2 animate-spin" />
          ) : (
            <User className="h-4 w-4 mr-2" />
          )}
          Check-in Manual
        </Button>

        <div className="flex items-center gap-2 text-xs text-muted-foreground justify-center">
          <QrCode className="h-4 w-4" />
          <span>Ou escaneie o QR Code do local</span>
        </div>
      </CardContent>
    </Card>
  )
}
