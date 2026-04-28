import { NextResponse } from 'next/server'
import { prisma } from '@/lib/prisma'
import { auth } from '@/lib/auth'

export const dynamic = 'force-dynamic'

export async function GET() {
  const session = await auth()
  if (!session) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })

  const now = new Date()
  const todayStart = new Date(now); todayStart.setHours(0, 0, 0, 0)
  const weekStart = new Date(todayStart); weekStart.setDate(todayStart.getDate() - 7)
  const monthStart = new Date(todayStart); monthStart.setDate(todayStart.getDate() - 30)

  const [orders, users, affiliates] = await Promise.all([
    prisma.order.findMany({ orderBy: { createdAt: 'desc' } }),
    prisma.user.findMany({ select: { createdAt: true } }),
    prisma.affiliate.findMany({ orderBy: { joinedAt: 'desc' } }),
  ])

  const revenue = (from?: Date) =>
    orders
      .filter(o => !from || new Date(o.createdAt) >= from)
      .reduce((sum, o) => sum + o.total, 0)

  // Top products by quantity sold
  const productCounts: Record<string, number> = {}
  for (const order of orders) {
    const items = Array.isArray(order.items)
      ? (order.items as { label?: string; id?: string; qty?: number }[])
      : []
    for (const item of items) {
      const key = item.label ?? item.id ?? '?'
      productCounts[key] = (productCounts[key] ?? 0) + (item.qty ?? 1)
    }
  }
  const topProducts = Object.entries(productCounts)
    .sort((a, b) => b[1] - a[1])
    .slice(0, 5)
    .map(([name, count]) => ({ name, count }))

  // Referral counts per affiliate code
  const refCounts: Record<string, number> = {}
  for (const a of affiliates) {
    if (a.referredBy) {
      refCounts[a.referredBy] = (refCounts[a.referredBy] ?? 0) + 1
    }
  }

  // Revenue attributed to each affiliate code (from orders with referredBy)
  const refRevenue: Record<string, number> = {}
  for (const o of orders) {
    if (o.referredBy) {
      refRevenue[o.referredBy] = (refRevenue[o.referredBy] ?? 0) + o.total
    }
  }

  return NextResponse.json({
    revenue: {
      today: revenue(todayStart),
      week: revenue(weekStart),
      month: revenue(monthStart),
      total: revenue(),
    },
    orders: {
      total: orders.length,
      pending: orders.filter(o => o.status === 'pending').length,
      shipped: orders.filter(o => o.status === 'shipped').length,
      delivered: orders.filter(o => o.status === 'delivered').length,
    },
    users: {
      total: users.length,
      today: users.filter(u => new Date(u.createdAt) >= todayStart).length,
      week: users.filter(u => new Date(u.createdAt) >= weekStart).length,
    },
    recentOrders: orders.slice(0, 5).map(o => ({
      id: o.id,
      userId: o.userId,
      total: o.total,
      status: o.status,
      createdAt: o.createdAt,
    })),
    topProducts,
    affiliates: affiliates.map(a => ({
      ...a,
      referralCount: refCounts[a.code] ?? 0,
      referralRevenue: refRevenue[a.code] ?? 0,
    })),
  })
}
