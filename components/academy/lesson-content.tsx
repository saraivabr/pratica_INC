'use client'

import * as React from 'react'
import {
  Info,
  AlertTriangle,
  CheckCircle2,
  Lightbulb,
  AlertCircle,
  LucideIcon,
} from 'lucide-react'

import { cn } from '@/lib/utils'

// ============================================================================
// Types
// ============================================================================

export type CalloutVariant = 'info' | 'warning' | 'success' | 'tip' | 'error'

export interface CalloutProps extends React.HTMLAttributes<HTMLDivElement> {
  variant?: CalloutVariant
  title?: string
  children: React.ReactNode
}

export interface CodeBlockProps extends React.HTMLAttributes<HTMLPreElement> {
  language?: string
  children: string
}

export interface LessonContentProps extends React.HTMLAttributes<HTMLDivElement> {
  content: string
}

// ============================================================================
// Callout Component
// ============================================================================

const calloutConfig: Record<
  CalloutVariant,
  { icon: LucideIcon; bgClass: string; borderClass: string; iconClass: string }
> = {
  info: {
    icon: Info,
    bgClass: 'bg-blue-50 dark:bg-blue-950/30',
    borderClass: 'border-blue-200 dark:border-blue-800',
    iconClass: 'text-blue-600 dark:text-blue-400',
  },
  warning: {
    icon: AlertTriangle,
    bgClass: 'bg-amber-50 dark:bg-amber-950/30',
    borderClass: 'border-amber-200 dark:border-amber-800',
    iconClass: 'text-amber-600 dark:text-amber-400',
  },
  success: {
    icon: CheckCircle2,
    bgClass: 'bg-emerald-50 dark:bg-emerald-950/30',
    borderClass: 'border-emerald-200 dark:border-emerald-800',
    iconClass: 'text-emerald-600 dark:text-emerald-400',
  },
  tip: {
    icon: Lightbulb,
    bgClass: 'bg-purple-50 dark:bg-purple-950/30',
    borderClass: 'border-purple-200 dark:border-purple-800',
    iconClass: 'text-purple-600 dark:text-purple-400',
  },
  error: {
    icon: AlertCircle,
    bgClass: 'bg-red-50 dark:bg-red-950/30',
    borderClass: 'border-red-200 dark:border-red-800',
    iconClass: 'text-red-600 dark:text-red-400',
  },
}

function Callout({
  className,
  variant = 'info',
  title,
  children,
  ...props
}: CalloutProps) {
  const config = calloutConfig[variant]
  const Icon = config.icon

  return (
    <div
      data-slot="callout"
      className={cn(
        'my-4 flex gap-3 rounded-lg border p-4',
        config.bgClass,
        config.borderClass,
        className
      )}
      role="note"
      {...props}
    >
      <Icon className={cn('mt-0.5 h-5 w-5 shrink-0', config.iconClass)} />
      <div className="flex-1 space-y-1">
        {title && (
          <p className={cn('font-semibold', config.iconClass)}>{title}</p>
        )}
        <div className="text-sm text-foreground/90">{children}</div>
      </div>
    </div>
  )
}

// ============================================================================
// CodeBlock Component
// ============================================================================

function CodeBlock({ className, language, children, ...props }: CodeBlockProps) {
  const [copied, setCopied] = React.useState(false)

  const handleCopy = async () => {
    await navigator.clipboard.writeText(children)
    setCopied(true)
    setTimeout(() => setCopied(false), 2000)
  }

  return (
    <div className="relative my-4 group">
      {language && (
        <div className="absolute top-0 left-0 px-3 py-1 text-xs font-medium text-muted-foreground bg-muted rounded-tl-lg rounded-br-lg">
          {language}
        </div>
      )}
      <button
        onClick={handleCopy}
        className={cn(
          'absolute top-2 right-2 px-2 py-1 text-xs rounded',
          'bg-muted hover:bg-muted/80 text-muted-foreground',
          'opacity-0 group-hover:opacity-100 transition-opacity'
        )}
        type="button"
      >
        {copied ? 'Copiado!' : 'Copiar'}
      </button>
      <pre
        data-slot="code-block"
        className={cn(
          'overflow-x-auto rounded-lg bg-muted/50 dark:bg-muted/30 p-4',
          'border border-border',
          'text-sm leading-relaxed',
          language && 'pt-8',
          className
        )}
        {...props}
      >
        <code className="font-mono text-foreground">{children}</code>
      </pre>
    </div>
  )
}

// ============================================================================
// Simple Markdown Parser
// ============================================================================

interface ParsedElement {
  type:
    | 'paragraph'
    | 'heading1'
    | 'heading2'
    | 'heading3'
    | 'code'
    | 'callout'
    | 'list'
    | 'image'
  content: string
  meta?: {
    language?: string
    variant?: CalloutVariant
    title?: string
    items?: string[]
    alt?: string
    src?: string
  }
}

function parseMarkdown(content: string): ParsedElement[] {
  const elements: ParsedElement[] = []
  const lines = content.split('\n')
  let i = 0

  while (i < lines.length) {
    const line = lines[i]

    // Skip empty lines
    if (line.trim() === '') {
      i++
      continue
    }

    // Code blocks
    if (line.startsWith('```')) {
      const language = line.slice(3).trim()
      const codeLines: string[] = []
      i++
      while (i < lines.length && !lines[i].startsWith('```')) {
        codeLines.push(lines[i])
        i++
      }
      elements.push({
        type: 'code',
        content: codeLines.join('\n'),
        meta: { language: language || undefined },
      })
      i++
      continue
    }

    // Callout blocks (:::info, :::warning, :::tip, :::success, :::error)
    const calloutMatch = line.match(/^:::(\w+)(?:\s+(.+))?$/)
    if (calloutMatch) {
      const variant = calloutMatch[1] as CalloutVariant
      const title = calloutMatch[2]
      const calloutLines: string[] = []
      i++
      while (i < lines.length && !lines[i].startsWith(':::')) {
        calloutLines.push(lines[i])
        i++
      }
      elements.push({
        type: 'callout',
        content: calloutLines.join('\n').trim(),
        meta: { variant, title },
      })
      i++
      continue
    }

    // Headings
    if (line.startsWith('# ')) {
      elements.push({ type: 'heading1', content: line.slice(2) })
      i++
      continue
    }
    if (line.startsWith('## ')) {
      elements.push({ type: 'heading2', content: line.slice(3) })
      i++
      continue
    }
    if (line.startsWith('### ')) {
      elements.push({ type: 'heading3', content: line.slice(4) })
      i++
      continue
    }

    // Unordered lists
    if (line.match(/^[-*]\s/)) {
      const items: string[] = []
      while (i < lines.length && lines[i].match(/^[-*]\s/)) {
        items.push(lines[i].replace(/^[-*]\s/, ''))
        i++
      }
      elements.push({
        type: 'list',
        content: '',
        meta: { items },
      })
      continue
    }

    // Images
    const imageMatch = line.match(/^!\[([^\]]*)\]\(([^)]+)\)$/)
    if (imageMatch) {
      elements.push({
        type: 'image',
        content: '',
        meta: { alt: imageMatch[1], src: imageMatch[2] },
      })
      i++
      continue
    }

    // Regular paragraph
    const paragraphLines: string[] = [line]
    i++
    while (
      i < lines.length &&
      lines[i].trim() !== '' &&
      !lines[i].startsWith('#') &&
      !lines[i].startsWith('```') &&
      !lines[i].startsWith(':::') &&
      !lines[i].match(/^[-*]\s/) &&
      !lines[i].match(/^!\[/)
    ) {
      paragraphLines.push(lines[i])
      i++
    }
    elements.push({
      type: 'paragraph',
      content: paragraphLines.join(' '),
    })
  }

  return elements
}

// ============================================================================
// Inline formatting helper
// ============================================================================

function renderInlineFormatting(text: string): React.ReactNode {
  // Parse inline markdown: **bold**, *italic*, `code`, [link](url)
  const parts: React.ReactNode[] = []
  let remaining = text
  let key = 0

  const patterns = [
    {
      regex: /\*\*(.+?)\*\*/,
      render: (match: string) => (
        <strong key={key++} className="font-semibold">
          {match}
        </strong>
      ),
    },
    {
      regex: /\*(.+?)\*/,
      render: (match: string) => (
        <em key={key++} className="italic">
          {match}
        </em>
      ),
    },
    {
      regex: /`(.+?)`/,
      render: (match: string) => (
        <code
          key={key++}
          className="rounded bg-muted px-1.5 py-0.5 text-sm font-mono"
        >
          {match}
        </code>
      ),
    },
    {
      regex: /\[(.+?)\]\((.+?)\)/,
      render: (_text: string, url: string) => (
        <a
          key={key++}
          href={url}
          target="_blank"
          rel="noopener noreferrer"
          className="text-primary underline underline-offset-2 hover:text-primary/80"
        >
          {_text}
        </a>
      ),
    },
  ]

  while (remaining.length > 0) {
    let matched = false

    for (const { regex, render } of patterns) {
      const match = remaining.match(regex)
      if (match && match.index !== undefined) {
        // Add text before match
        if (match.index > 0) {
          parts.push(remaining.slice(0, match.index))
        }
        // Add formatted element
        if (match.length === 3) {
          // Link pattern
          parts.push(render(match[1], match[2]))
        } else {
          parts.push((render as (text: string, url?: string) => React.ReactNode)(match[1]))
        }
        remaining = remaining.slice(match.index + match[0].length)
        matched = true
        break
      }
    }

    if (!matched) {
      parts.push(remaining)
      break
    }
  }

  return parts.length === 1 && typeof parts[0] === 'string' ? parts[0] : parts
}

// ============================================================================
// LessonContent Component
// ============================================================================

function LessonContent({ className, content, ...props }: LessonContentProps) {
  const elements = React.useMemo(() => parseMarkdown(content), [content])

  return (
    <div
      data-slot="lesson-content"
      className={cn(
        'prose prose-neutral dark:prose-invert max-w-none',
        'prose-headings:font-semibold prose-headings:tracking-tight',
        'prose-p:leading-relaxed',
        'prose-a:text-primary prose-a:no-underline hover:prose-a:underline',
        className
      )}
      {...props}
    >
      {elements.map((element, index) => {
        switch (element.type) {
          case 'heading1':
            return (
              <h1
                key={index}
                className="text-3xl font-bold mt-8 mb-4 first:mt-0"
              >
                {renderInlineFormatting(element.content)}
              </h1>
            )
          case 'heading2':
            return (
              <h2 key={index} className="text-2xl font-semibold mt-6 mb-3">
                {renderInlineFormatting(element.content)}
              </h2>
            )
          case 'heading3':
            return (
              <h3 key={index} className="text-xl font-semibold mt-4 mb-2">
                {renderInlineFormatting(element.content)}
              </h3>
            )
          case 'paragraph':
            return (
              <p key={index} className="my-3 leading-7">
                {renderInlineFormatting(element.content)}
              </p>
            )
          case 'code':
            return (
              <CodeBlock key={index} language={element.meta?.language}>
                {element.content}
              </CodeBlock>
            )
          case 'callout':
            return (
              <Callout
                key={index}
                variant={element.meta?.variant}
                title={element.meta?.title}
              >
                {renderInlineFormatting(element.content)}
              </Callout>
            )
          case 'list':
            return (
              <ul key={index} className="my-3 list-disc pl-6 space-y-1">
                {element.meta?.items?.map((item, itemIndex) => (
                  <li key={itemIndex} className="leading-7">
                    {renderInlineFormatting(item)}
                  </li>
                ))}
              </ul>
            )
          case 'image':
            return (
              <figure key={index} className="my-6">
                {/* eslint-disable-next-line @next/next/no-img-element */}
                <img
                  src={element.meta?.src}
                  alt={element.meta?.alt || ''}
                  className="rounded-lg border max-w-full h-auto mx-auto"
                  loading="lazy"
                />
                {element.meta?.alt && (
                  <figcaption className="mt-2 text-center text-sm text-muted-foreground">
                    {element.meta.alt}
                  </figcaption>
                )}
              </figure>
            )
          default:
            return null
        }
      })}
    </div>
  )
}

export { LessonContent, Callout, CodeBlock }
