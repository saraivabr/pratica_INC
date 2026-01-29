'use client'

import * as React from 'react'
import Link from 'next/link'
import { LucideIcon } from 'lucide-react'

import { cn } from '@/lib/utils'
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from '@/components/ui/card'
import { ProgressBar } from './progress-bar'

export interface CategoryCardProps extends React.HTMLAttributes<HTMLDivElement> {
  id: string
  name: string
  description?: string
  icon: LucideIcon
  iconColor?: string
  totalModules: number
  totalLessons: number
  completedLessons: number
  href?: string
}

function CategoryCard({
  className,
  id,
  name,
  description,
  icon: Icon,
  iconColor = 'text-primary',
  totalModules,
  totalLessons,
  completedLessons,
  href,
  ...props
}: CategoryCardProps) {
  const progress = totalLessons > 0 ? (completedLessons / totalLessons) * 100 : 0
  const isComplete = progress === 100

  const cardContent = (
    <Card
        data-slot="category-card"
        className={cn(
          'group relative cursor-pointer transition-all duration-300',
          'hover:shadow-lg hover:border-primary/30 hover:-translate-y-1',
          'dark:hover:border-primary/40 dark:hover:shadow-primary/5',
          isComplete && 'border-emerald-500/30 dark:border-emerald-500/40',
          className
        )}
        {...props}
      >
        <CardHeader className="pb-3">
          <div className="flex items-start gap-4">
            <div
              className={cn(
                'flex h-12 w-12 shrink-0 items-center justify-center rounded-xl',
                'bg-primary/10 transition-colors duration-300',
                'group-hover:bg-primary/20 dark:bg-primary/20 dark:group-hover:bg-primary/30'
              )}
            >
              <Icon className={cn('h-6 w-6', iconColor)} />
            </div>
            <div className="flex-1 space-y-1">
              <CardTitle className="text-lg leading-tight group-hover:text-primary transition-colors">
                {name}
              </CardTitle>
              {description && (
                <CardDescription className="line-clamp-2">
                  {description}
                </CardDescription>
              )}
            </div>
          </div>
        </CardHeader>

        <CardContent className="pt-0">
          <div className="space-y-3">
            <div className="flex items-center justify-between text-sm">
              <span className="text-muted-foreground">
                {totalModules} {totalModules === 1 ? 'modulo' : 'modulos'} &bull;{' '}
                {totalLessons} {totalLessons === 1 ? 'aula' : 'aulas'}
              </span>
              <span
                className={cn(
                  'font-medium',
                  isComplete
                    ? 'text-emerald-600 dark:text-emerald-400'
                    : 'text-muted-foreground'
                )}
              >
                {completedLessons}/{totalLessons}
              </span>
            </div>

            <ProgressBar
              value={completedLessons}
              max={totalLessons}
              showPercentage
              percentagePosition="hidden"
            />
          </div>
        </CardContent>

        {isComplete && (
          <div className="absolute top-3 right-3">
            <span className="inline-flex items-center rounded-full bg-emerald-500/10 px-2.5 py-0.5 text-xs font-medium text-emerald-600 dark:bg-emerald-500/20 dark:text-emerald-400">
              Completo
            </span>
          </div>
        )}
      </Card>
  )

  if (href) {
    return <Link href={href} className="block">{cardContent}</Link>
  }

  return <div className="block">{cardContent}</div>
}

export { CategoryCard }
