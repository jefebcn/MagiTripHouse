'use client'
import useSWR from 'swr'

export interface Variant { label: string; price: number }

export interface Product {
  id: string
  name: string
  description?: string | null
  category: string
  tags: string[]
  variants: Variant[]
  stock?: number | null
  imageUrl?: string | null
  mediaType?: string | null
  emoji: string
  badge?: string | null
  origin?: string | null
  sortOrder: number
  createdAt: string
}

const fetcher = (url: string) => fetch(url).then((r) => r.json())

export function useProducts() {
  const { data, error, isLoading, mutate } = useSWR<Product[]>(
    '/api/products',
    fetcher,
    { refreshInterval: 30_000 },
  )
  return {
    products: data ?? [],
    isLoading,
    isError: !!error,
    mutate,
  }
}
