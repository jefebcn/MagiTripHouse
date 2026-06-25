import { NextResponse } from 'next/server'
import { prisma } from '@/lib/prisma'
import { auth } from '@/lib/auth'

export async function POST() {
  const session = await auth()
  if (!session) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })

  const products = [
    {
      name: 'Cali Spain Cherryboof x Tropicana',
      category: 'premium',
      emoji: '🍒',
      shipFrom: 'italy',
      tags: ['weed', 'cali', 'spain'],
      variants: [
        { label: '10g',  price: 80 },
        { label: '25g',  price: 150 },
        { label: '50g',  price: 250 },
        { label: '100g', price: 480 },
        { label: '500g', price: 2000 },
        { label: '1kg',  price: 3500 },
      ],
      sortOrder: 50,
    },
    {
      name: 'Cali Spain Lemon Cherry',
      category: 'premium',
      emoji: '🍋',
      shipFrom: 'italy',
      tags: ['weed', 'cali', 'spain'],
      variants: [
        { label: '10g',  price: 80 },
        { label: '25g',  price: 150 },
        { label: '50g',  price: 250 },
        { label: '100g', price: 480 },
        { label: '500g', price: 2000 },
        { label: '1kg',  price: 3500 },
      ],
      sortOrder: 51,
    },
    {
      name: 'Dry',
      category: 'hash',
      emoji: '💎',
      shipFrom: 'italy',
      tags: ['hash', 'dry'],
      variants: [
        { label: '10g',  price: 60 },
        { label: '25g',  price: 125 },
        { label: '50g',  price: 220 },
        { label: '100g', price: 390 },
        { label: '500g', price: 1500 },
        { label: '1kg',  price: 2700 },
      ],
      sortOrder: 52,
    },
  ]

  const created = []
  for (const p of products) {
    const product = await prisma.product.create({
      data: {
        name:         p.name,
        category:     p.category,
        emoji:        p.emoji,
        shipFrom:     p.shipFrom,
        tags:         p.tags,
        variants:     p.variants,
        sortOrder:    p.sortOrder,
        hidden:       false,
        isOnSale:     false,
        isComingSoon: false,
      },
    })
    created.push({ id: product.id, name: product.name })
  }

  return NextResponse.json({ ok: true, created })
}
