import { memo } from "react"
import { Skeleton } from "@/components/ui/skeleton"
import { Card, CardContent, CardHeader } from "@/components/ui/card"

interface EmpreendimentoSkeletonProps {
    variant?: 'full' | 'compact'
}

const SKELETON_GRID_ITEMS = Array.from({ length: 12 }, (_, i) => i)
const SKELETON_GRID_ITEMS_COMPACT = Array.from({ length: 4 }, (_, i) => i)

export const EmpreendimentoSkeleton = memo(function EmpreendimentoSkeleton({
    variant = 'full'
}: EmpreendimentoSkeletonProps) {
    const gridItems = variant === 'compact' ? SKELETON_GRID_ITEMS_COMPACT : SKELETON_GRID_ITEMS

    return (
        <div
            className="min-h-screen bg-background pb-20 md:pb-0"
            role="status"
            aria-label="Carregando informações do empreendimento"
            aria-busy="true"
        >
            <span className="sr-only">Carregando...</span>
            <div className="h-16 border-b bg-white" />

            <main className="container mx-auto px-4 py-6 md:py-10 space-y-8">
                {/* Header Skeleton */}
                <div className="space-y-4">
                    <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
                        <div className="space-y-2">
                            <Skeleton className="h-4 w-32" style={{ animationDelay: '0ms' }} />
                            <Skeleton className="h-10 w-64 md:w-96" style={{ animationDelay: '75ms' }} />
                        </div>
                        <div className="space-y-2 text-left sm:text-right">
                            <Skeleton className="h-4 w-24 ml-auto" style={{ animationDelay: '150ms' }} />
                            <Skeleton className="h-8 w-40 ml-auto" style={{ animationDelay: '225ms' }} />
                        </div>
                    </div>

                    <div className="flex gap-2">
                        <Skeleton className="h-6 w-24" style={{ animationDelay: '300ms' }} />
                        <Skeleton className="h-6 w-32" style={{ animationDelay: '375ms' }} />
                    </div>
                </div>

                {/* Gallery Skeleton */}
                <div className="grid grid-cols-2 md:grid-cols-4 grid-rows-2 gap-2 h-[250px] md:h-[450px] rounded-xl overflow-hidden">
                    <Skeleton className="col-span-2 row-span-2" style={{ animationDelay: '0ms' }} />
                    <Skeleton className="col-span-1 row-span-1 hidden md:block" style={{ animationDelay: '100ms' }} />
                    <Skeleton className="col-span-1 row-span-1 hidden md:block" style={{ animationDelay: '200ms' }} />
                    <Skeleton className="col-span-1 row-span-1 hidden md:block" style={{ animationDelay: '300ms' }} />
                    <Skeleton className="col-span-1 row-span-1 hidden md:block" style={{ animationDelay: '400ms' }} />
                </div>

                <div className="grid lg:grid-cols-3 gap-8">
                    <div className="lg:col-span-2 space-y-8">
                        <div className="flex gap-4">
                            <Skeleton className="h-10 flex-1" style={{ animationDelay: '0ms' }} />
                            <Skeleton className="h-10 flex-1" style={{ animationDelay: '100ms' }} />
                            <Skeleton className="h-10 flex-1" style={{ animationDelay: '200ms' }} />
                        </div>

                        <Card>
                            <CardContent className="p-8 space-y-4">
                                <Skeleton className="h-6 w-48" />
                                <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
                                    {gridItems.map((i) => (
                                        <Skeleton
                                            key={i}
                                            className="h-20 w-full"
                                            style={{ animationDelay: `${i * 50}ms` }}
                                        />
                                    ))}
                                </div>
                            </CardContent>
                        </Card>
                    </div>

                    {variant === 'full' && (
                        <div className="space-y-6">
                            <Card>
                                <CardHeader>
                                    <Skeleton className="h-6 w-32" />
                                </CardHeader>
                                <CardContent className="space-y-4">
                                    <Skeleton className="h-4 w-full" style={{ animationDelay: '0ms' }} />
                                    <Skeleton className="h-4 w-full" style={{ animationDelay: '100ms' }} />
                                    <Skeleton className="h-12 w-full" style={{ animationDelay: '200ms' }} />
                                    <Skeleton className="h-12 w-full" style={{ animationDelay: '300ms' }} />
                                </CardContent>
                            </Card>
                        </div>
                    )}
                </div>
            </main>
        </div>
    )
})
