import { NextResponse } from 'next/server'
import { prisma } from '@/lib/prisma'
import { auth } from '@/lib/auth'

type Ctx = { params: { id: string } }

export async function PUT(req: Request, { params }: Ctx) {
  const session = await auth()
  if (!session) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })

  const body = await req.json()
  const product = await prisma.product.update({
    where: { id: params.id },
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
      badge:       body.badge ?? null,
      origin:      body.origin ?? null,
      sortOrder:   body.sortOrder ?? 99,
    },
  })
  return NextResponse.json(product)
}

export async function DELETE(_req: Request, { params }: Ctx) {
  const session = await auth()
  if (!session) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })

  await prisma.product.delete({ where: { id: params.id } })
  return NextResponse.json({ ok: true })
}

export async function PATCH(req: Request, { params }: Ctx) {
  const session = await auth()
  if (!session) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })

  const body = await req.json()
  const product = await prisma.product.update({
    where: { id: params.id },
    data: body,
  })
  return NextResponse.json(product)
}
