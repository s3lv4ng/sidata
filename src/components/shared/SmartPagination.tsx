'use client'

import { Button } from '@/components/ui/button'
import { ChevronLeft, ChevronRight, MoreHorizontal } from 'lucide-react'

interface SmartPaginationProps {
  currentPage: number
  totalPages: number
  onPageChange: (page: number) => void
  totalItems?: number
  itemsPerPage?: number
  showItemCount?: boolean
  label?: string // e.g., "data", "catatan", "respons"
}

export default function SmartPagination({
  currentPage,
  totalPages,
  onPageChange,
  totalItems,
  itemsPerPage,
  showItemCount = true,
  label = 'data',
}: SmartPaginationProps) {
  if (totalPages <= 1) return null

  // Generate page numbers with ellipsis
  const getPageNumbers = () => {
    const pages: (number | 'ellipsis-start' | 'ellipsis-end')[] = []

    if (totalPages <= 7) {
      // Show all pages
      for (let i = 1; i <= totalPages; i++) pages.push(i)
    } else {
      // Always show first page
      pages.push(1)

      if (currentPage > 3) {
        pages.push('ellipsis-start')
      }

      // Show pages around current
      const start = Math.max(2, currentPage - 1)
      const end = Math.min(totalPages - 1, currentPage + 1)

      for (let i = start; i <= end; i++) {
        pages.push(i)
      }

      if (currentPage < totalPages - 2) {
        pages.push('ellipsis-end')
      }

      // Always show last page
      pages.push(totalPages)
    }

    return pages
  }

  const perPage = itemsPerPage || 10
  const startItem = (currentPage - 1) * perPage + 1
  const endItem = Math.min(currentPage * perPage, totalItems || 0)

  return (
    <div className="shrink-0 border-t bg-background px-4 py-3 sticky bottom-0 z-10">
      <div className="flex items-center justify-between flex-wrap gap-2">
        {showItemCount && totalItems !== undefined && (
          <p className="text-xs text-muted-foreground">
            Menampilkan {startItem}–{endItem} dari {totalItems} {label}
          </p>
        )}
        <div className="flex items-center gap-1.5 ml-auto">
          <Button
            variant="outline"
            size="icon"
            disabled={currentPage === 1}
            onClick={() => onPageChange(currentPage - 1)}
            className="h-8 w-8"
            title="Halaman sebelumnya"
          >
            <ChevronLeft className="w-4 h-4" />
          </Button>

          {getPageNumbers().map((page, idx) => {
            if (page === 'ellipsis-start' || page === 'ellipsis-end') {
              return (
                <span key={`ellipsis-${idx}`} className="flex items-center justify-center w-8 h-8 text-muted-foreground">
                  <MoreHorizontal className="w-4 h-4" />
                </span>
              )
            }
            return (
              <Button
                key={page}
                variant={currentPage === page ? 'default' : 'outline'}
                size="icon"
                onClick={() => onPageChange(page)}
                className={`h-8 w-8 text-xs ${currentPage === page ? 'shadow-sm' : ''}`}
              >
                {page}
              </Button>
            )
          })}

          <Button
            variant="outline"
            size="icon"
            disabled={currentPage === totalPages}
            onClick={() => onPageChange(currentPage + 1)}
            className="h-8 w-8"
            title="Halaman berikutnya"
          >
            <ChevronRight className="w-4 h-4" />
          </Button>
        </div>
      </div>
    </div>
  )
}
