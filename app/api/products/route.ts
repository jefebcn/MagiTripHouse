import { NextResponse } from 'next/server'
import { prisma } from '@/lib/prisma'
import { auth } from '@/lib/auth'

export async function GET(req: Request) {
  const showAll = new URL(req.url).searchParams.get('all') === 'true'
  if (showAll) {
    const session = await auth()
    if (!session) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
  }
  const products = await prisma.product.findMany({
    where: showAll ? {} : { hidden: false },
    orderBy: [{ sortOrder: 'asc' }],
  })
  products.sort((a, b) => {
    const aOut = a.stock === 0 ? 1 : 0
    const bOut = b.stock === 0 ? 1 : 0
    if (aOut !== bOut) return aOut - bOut
    return (a.sortOrder ?? 99) - (b.sortOrder ?? 99)
  })

  // Il costo d'acquisto è riservato all'admin: rimuovilo dalle varianti per il pubblico
  if (!showAll) {
    for (const p of products) {
      if (Array.isArray(p.variants)) {
        p.variants = (p.variants as { label: string; price: number; cost?: number }[])
          .map(({ label, price }) => ({ label, price }))
      }
    }
  }

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
      hidden:       body.hidden ?? false,
      shipFrom:     body.shipFrom ?? 'spain',
      bundleItems:  body.bundleItems ?? null,
    },
  })
  return NextResponse.json(product, { status: 201 })
}
