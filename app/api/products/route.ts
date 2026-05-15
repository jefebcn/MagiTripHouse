import { NextResponse } from 'next/server'
import { prisma } from '@/lib/prisma'
import { auth } from '@/lib/auth'

export async function GET() {
  const products = await prisma.product.findMany({
    orderBy: [
      { sortOrder: 'asc' },
    ],
  })
  // Prodotti esauriti sempre in fondo, mantenendo l'ordine interno
  products.sort((a, b) => {
    const aOut = a.stock === 0 ? 1 : 0
    const bOut = b.stock === 0 ? 1 : 0
    if (aOut !== bOut) return aOut - bOut
    return (a.sortOrder ?? 99) - (b.sortOrder ?? 99)
  })
  return NextResponse.json(products)
}

export async function POST(req: Request) {
  const session = await auth()
  if (!session) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })

  const body = await req.json()
  const product = await prisma.product.create({
    data: {
      name:        body.name,
      description: body.description ?? null,
      category:    body.category ?? 'premium',
      tags:        body.tags ?? [],
      variants:    body.variants ?? [],
      stock:       body.stock ?? null,
      imageUrl:    body.imageUrl ?? null,
      mediaType:   body.mediaType ?? null,
      emoji:       body.emoji ?? '🌿',
      badge:        body.badge ?? null,
      origin:       body.origin ?? null,
      sortOrder:    body.sortOrder ?? 99,
      isOnSale:     body.isOnSale ?? false,
      isComingSoon: body.isComingSoon ?? false,
      bundleItems:  body.bundleItems ?? null,
    },
  })
  return NextResponse.json(product, { status: 201 })
}
