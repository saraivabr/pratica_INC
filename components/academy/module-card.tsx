'use client'

import * as React from 'react'
import Link from 'next/link'
import Image from 'next/image'
import { Award, Clock, CheckCircle2 } from 'lucide-react'

import { cn } from '@/lib/utils'
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from '@/components/ui/card'
import { Badge } from '@/components/ui/badge'
import { ProgressBar } from './progress-bar'

export interface ModuleCardProps extends React.HTMLAttributes<HTMLDivElement> {
  id: string
  title: string
  description?: string
  imageUrl?: string
  fallbackGradient?: string
  durationMinutes?: number
  totalLessons: number
  completedLessons: number
  hasCertificate?: boolean
  certificateEarned?: boolean
  href?: string
}

function formatDuration(minutes: number): string {
  if (minutes < 60) {
    return `${minutes}min`
  }
  const hours = Math.floor(minutes / 60)
  const remainingMinutes = minutes % 60
  if (remainingMinutes === 0) {
    return `${hours}h`
  }
  return `${hours}h ${remainingMinutes}min`
}

function ModuleCard({
  className,
  id,
  title,
  description,
  imageUrl,
  fallbackGradient = 'from-primary/80 to-primary/40',
  durationMinutes,
  totalLessons,
  completedLessons,
  hasCertificate = false,
  certificateEarned = false,
  href,
  ...props
}: ModuleCardProps) {
  const progress = totalLessons > 0 ? (completedLessons / totalLessons) * 100 : 0
  const isComplete = progress === 100

  const cardContent = (
    <Card
        data-slot="module-card"
        className={cn(
          'group relative overflow-hidden cursor-pointer transition-all duration-300',
          'hover:shadow-lg hover:border-primary/30 hover:-translate-y-1',
          'dark:hover:border-primary/40 dark:hover:shadow-primary/5',
          isComplete && 'border-emerald-500/30 dark:border-emerald-500/40',
          className
        )}
        {...props}
      >
        {/* Image / Gradient Header */}
        <div className="relative h-32 w-full overflow-hidden">
          {imageUrl ? (
            <Image
              src={imageUrl}
              alt={title}
              fill
              className="object-cover transition-transform duration-300 group-hover:scale-105"
            />
          ) : (
            <div
              className={cn(
                'h-full w-full bg-gradient-to-br transition-all duration-300',
                fallbackGradient,
                'group-hover:opacity-90'
              )}
            />
          )}

          {/* Badges overlay */}
          <div className="absolute top-2 left-2 right-2 flex items-start justify-between">
            {isComplete && (
              <Badge className="bg-emerald-500 hover:bg-emerald-600 text-white shadow-md">
                <CheckCircle2 className="mr-1 h-3 w-3" />
                Concluido
              </Badge>
            )}
            {hasCertificate && certificateEarned && (
              <Badge className="bg-amber-500 hover:bg-amber-600 text-white shadow-md ml-auto">
                <Award className="mr-1 h-3 w-3" />
                Certificado
              </Badge>
            )}
          </div>
        </div>

        <CardHeader className="pb-2">
          <CardTitle className="text-base leading-tight line-clamp-2 group-hover:text-primary transition-colors">
            {title}
          </CardTitle>
          {description && (
            <CardDescription className="line-clamp-2 text-sm">
              {description}
            </CardDescription>
          )}
        </CardHeader>

        <CardContent className="pt-0">
          <div className="space-y-3">
            {/* Duration and lessons info */}
            <div className="flex items-center justify-between text-sm text-muted-foreground">
              {durationMinutes && (
                <span className="flex items-center gap-1">
                  <Clock className="h-3.5 w-3.5" />
                  {formatDuration(durationMinutes)}
                </span>
              )}
              <span className="flex items-center gap-1">
                {completedLessons}/{totalLessons}{' '}
                {totalLessons === 1 ? 'aula' : 'aulas'}
              </span>
            </div>

            {/* Progress bar */}
            <ProgressBar
              value={completedLessons}
              max={totalLessons}
              size="sm"
              showPercentage
              percentagePosition="outside"
            />
          </div>
        </CardContent>
      </Card>
  )

  if (href) {
    return <Link href={href} className="block">{cardContent}</Link>
  }

  return <div className="block">{cardContent}</div>
}

export { ModuleCard }
