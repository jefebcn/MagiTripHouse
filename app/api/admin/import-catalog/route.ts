import { NextResponse } from 'next/server'
import { prisma } from '@/lib/prisma'
import { auth } from '@/lib/auth'
import { CATALOG_PRODUCTS } from '@/lib/catalog-import-data'

export const dynamic = 'force-dynamic'

export async function POST() {
  const session = await auth()
  if (!session) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })

  const existing = await prisma.product.findMany({ select: { name: true } })
  const existingNames = new Set(existing.map((p) => p.name))

  const toCreate = CATALOG_PRODUCTS.filter((p) => !existingNames.has(p.name))
  const skippedNames = CATALOG_PRODUCTS.filter((p) => existingNames.has(p.name)).map((p) => p.name)

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
        hidden: true,
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
