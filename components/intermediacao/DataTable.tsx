"use client"

import { useState, useMemo } from "react"
import { cn } from "@/lib/utils"
import { Button } from "@/components/ui/button"
import { Checkbox } from "@/components/ui/checkbox"
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table"
import { Skeleton } from "@/components/ui/skeleton"
import {
  ChevronLeft,
  ChevronRight,
  ChevronsLeft,
  ChevronsRight,
  ArrowUpDown,
  ArrowUp,
  ArrowDown,
} from "lucide-react"

export interface ColumnDef<T> {
  id: string
  header: string | React.ReactNode
  accessorKey?: keyof T
  cell?: (item: T) => React.ReactNode
  sortable?: boolean
  className?: string
  headerClassName?: string
}

interface PaginationConfig {
  page: number
  pageSize: number
  total: number
  onPageChange: (page: number) => void
}

interface DataTableProps<T extends { id: string | number }> {
  data: T[]
  columns: ColumnDef<T>[]
  loading?: boolean
  selectable?: boolean
  selectedIds?: (string | number)[]
  onSelectionChange?: (ids: (string | number)[]) => void
  pagination?: PaginationConfig
  emptyState?: React.ReactNode
  className?: string
  onRowClick?: (item: T) => void
}

type SortDirection = "asc" | "desc" | null

export function DataTable<T extends { id: string | number }>({
  data,
  columns,
  loading = false,
  selectable = false,
  selectedIds = [],
  onSelectionChange,
  pagination,
  emptyState,
  className,
  onRowClick,
}: DataTableProps<T>) {
  const [sortColumn, setSortColumn] = useState<string | null>(null)
  const [sortDirection, setSortDirection] = useState<SortDirection>(null)

  // Ordenacao local (quando nao ha paginacao server-side)
  const sortedData = useMemo(() => {
    if (!sortColumn || !sortDirection) return data

    const column = columns.find((c) => c.id === sortColumn)
    if (!column?.accessorKey) return data

    return [...data].sort((a, b) => {
      const aVal = a[column.accessorKey!]
      const bVal = b[column.accessorKey!]

      if (aVal == null) return 1
      if (bVal == null) return -1

      if (typeof aVal === "string" && typeof bVal === "string") {
        return sortDirection === "asc"
          ? aVal.localeCompare(bVal)
          : bVal.localeCompare(aVal)
      }

      if (typeof aVal === "number" && typeof bVal === "number") {
        return sortDirection === "asc" ? aVal - bVal : bVal - aVal
      }

      return 0
    })
  }, [data, sortColumn, sortDirection, columns])

  const handleSort = (columnId: string) => {
    if (sortColumn === columnId) {
      if (sortDirection === "asc") {
        setSortDirection("desc")
      } else if (sortDirection === "desc") {
        setSortColumn(null)
        setSortDirection(null)
      }
    } else {
      setSortColumn(columnId)
      setSortDirection("asc")
    }
  }

  const allSelected =
    data.length > 0 && selectedIds.length === data.length

  const someSelected =
    selectedIds.length > 0 && selectedIds.length < data.length

  const handleSelectAll = () => {
    if (allSelected) {
      onSelectionChange?.([])
    } else {
      onSelectionChange?.(data.map((item) => item.id))
    }
  }

  const handleSelectOne = (id: string | number) => {
    if (selectedIds.includes(id)) {
      onSelectionChange?.(selectedIds.filter((i) => i !== id))
    } else {
      onSelectionChange?.([...selectedIds, id])
    }
  }

  const getCellValue = (item: T, column: ColumnDef<T>) => {
    if (column.cell) {
      return column.cell(item)
    }
    if (column.accessorKey) {
      const value = item[column.accessorKey]
      return value != null ? String(value) : "-"
    }
    return "-"
  }

  // Loading skeleton
  if (loading) {
    return (
      <div className={cn("border rounded-lg", className)}>
        <Table>
          <TableHeader>
            <TableRow>
              {selectable && (
                <TableHead className="w-12">
                  <Skeleton className="h-4 w-4" />
                </TableHead>
              )}
              {columns.map((column) => (
                <TableHead key={column.id} className={column.headerClassName}>
                  <Skeleton className="h-4 w-20" />
                </TableHead>
              ))}
            </TableRow>
          </TableHeader>
          <TableBody>
            {Array.from({ length: 5 }).map((_, i) => (
              <TableRow key={i}>
                {selectable && (
                  <TableCell>
                    <Skeleton className="h-4 w-4" />
                  </TableCell>
                )}
                {columns.map((column) => (
                  <TableCell key={column.id} className={column.className}>
                    <Skeleton className="h-4 w-full max-w-[120px]" />
                  </TableCell>
                ))}
              </TableRow>
            ))}
          </TableBody>
        </Table>
      </div>
    )
  }

  // Empty state
  if (data.length === 0) {
    if (emptyState) {
      return <>{emptyState}</>
    }
    return (
      <div className="border rounded-lg p-8 text-center text-muted-foreground">
        Nenhum registro encontrado
      </div>
    )
  }

  // Paginacao
  const totalPages = pagination
    ? Math.ceil(pagination.total / pagination.pageSize)
    : 1

  return (
    <div className={cn("space-y-4", className)}>
      <div className="border rounded-lg overflow-hidden">
        <Table>
          <TableHeader>
            <TableRow>
              {selectable && (
                <TableHead className="w-12">
                  <Checkbox
                    checked={allSelected}
                    onCheckedChange={handleSelectAll}
                    aria-label="Selecionar todos"
                    className={someSelected ? "data-[state=checked]:bg-primary/50" : ""}
                  />
                </TableHead>
              )}
              {columns.map((column) => (
                <TableHead
                  key={column.id}
                  className={cn(
                    column.sortable && "cursor-pointer select-none",
                    column.headerClassName
                  )}
                  onClick={() => column.sortable && handleSort(column.id)}
                >
                  <div className="flex items-center gap-2">
                    {column.header}
                    {column.sortable && (
                      <span className="text-muted-foreground">
                        {sortColumn === column.id ? (
                          sortDirection === "asc" ? (
                            <ArrowUp className="h-4 w-4" />
                          ) : (
                            <ArrowDown className="h-4 w-4" />
                          )
                        ) : (
                          <ArrowUpDown className="h-4 w-4 opacity-50" />
                        )}
                      </span>
                    )}
                  </div>
                </TableHead>
              ))}
            </TableRow>
          </TableHeader>
          <TableBody>
            {sortedData.map((item) => (
              <TableRow
                key={item.id}
                className={cn(
                  onRowClick && "cursor-pointer",
                  selectedIds.includes(item.id) && "bg-muted/50"
                )}
                onClick={() => onRowClick?.(item)}
              >
                {selectable && (
                  <TableCell onClick={(e) => e.stopPropagation()}>
                    <Checkbox
                      checked={selectedIds.includes(item.id)}
                      onCheckedChange={() => handleSelectOne(item.id)}
                      aria-label={`Selecionar item ${item.id}`}
                    />
                  </TableCell>
                )}
                {columns.map((column) => (
                  <TableCell key={column.id} className={column.className}>
                    {getCellValue(item, column)}
                  </TableCell>
                ))}
              </TableRow>
            ))}
          </TableBody>
        </Table>
      </div>

      {/* Paginacao */}
      {pagination && totalPages > 1 && (
        <div className="flex items-center justify-between px-2">
          <p className="text-sm text-muted-foreground">
            Mostrando{" "}
            <span className="font-medium">
              {(pagination.page - 1) * pagination.pageSize + 1}
            </span>{" "}
            a{" "}
            <span className="font-medium">
              {Math.min(pagination.page * pagination.pageSize, pagination.total)}
            </span>{" "}
            de <span className="font-medium">{pagination.total}</span> resultados
          </p>

          <div className="flex items-center gap-2">
            <Button
              variant="outline"
              size="icon"
              onClick={() => pagination.onPageChange(1)}
              disabled={pagination.page === 1}
            >
              <ChevronsLeft className="h-4 w-4" />
            </Button>
            <Button
              variant="outline"
              size="icon"
              onClick={() => pagination.onPageChange(pagination.page - 1)}
              disabled={pagination.page === 1}
            >
              <ChevronLeft className="h-4 w-4" />
            </Button>

            <span className="text-sm text-muted-foreground px-2">
              Pagina {pagination.page} de {totalPages}
            </span>

            <Button
              variant="outline"
              size="icon"
              onClick={() => pagination.onPageChange(pagination.page + 1)}
              disabled={pagination.page === totalPages}
            >
              <ChevronRight className="h-4 w-4" />
            </Button>
            <Button
              variant="outline"
              size="icon"
              onClick={() => pagination.onPageChange(totalPages)}
              disabled={pagination.page === totalPages}
            >
              <ChevronsRight className="h-4 w-4" />
            </Button>
          </div>
        </div>
      )}
    </div>
  )
}
