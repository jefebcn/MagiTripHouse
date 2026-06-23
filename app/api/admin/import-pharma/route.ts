import { NextResponse } from 'next/server'
import { prisma } from '@/lib/prisma'
import { auth } from '@/lib/auth'
import { PHARMA_PRODUCTS } from '@/lib/catalog-pharma-data'

export const dynamic = 'force-dynamic'

export async function POST() {
  const session = await auth()
  if (!session) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })

  const existing = await prisma.product.findMany({ select: { name: true } })
  const existingNames = new Set(existing.map((p) => p.name))

  const toCreate = PHARMA_PRODUCTS.filter((p) => !existingNames.has(p.name))
  const skippedNames = PHARMA_PRODUCTS.filter((p) => existingNames.has(p.name)).map((p) => p.name)

  const created: string[] = []
  for (const p of toCreate) {
    await prisma.product.create({
      data: {
        name: p.name,
        emoji: p.emoji,
        category: p.category,
        origin: p.origin,
        tags: p.tags,
        variants: p.variants,
        stock: p.stock,
        hidden: false,
        shipFrom: 'pharma',
        sortOrder: 99,
      },
    })
    created.push(p.name)
  }

  return NextResponse.json({
    ok: true,
    created: created.length,
    skipped: skippedNames.length,
    createdProducts: created,
    skippedProducts: skippedNames,
  })
}
