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
  const yearStart = new Date(todayStart); yearStart.setFullYear(todayStart.getFullYear() - 1)

  const [orders, users, affiliates] = await Promise.all([
    prisma.order.findMany({ orderBy: { createdAt: 'desc' } }),
    prisma.user.findMany({ select: { createdAt: true } }),
    prisma.affiliate.findMany({ orderBy: { joinedAt: 'desc' } }),
  ])

  const revenue = (from?: Date) =>
    orders
      .filter(o => !from || new Date(o.createdAt) >= from)
      .reduce((sum, o) => sum + o.total, 0)

  function parseGrams(label: string): number {
    return parseFloat(label.replace(/[^0-9.]/g, '')) || 0
  }

  // Top products by quantity sold + grams aggregation
  const productCounts: Record<string, number> = {}
  const gramsByProduct: Record<string, number> = {}
  let gramsTotal = 0, gramsToday = 0, gramsWeek = 0, gramsMonth = 0, gramsYear = 0

  for (const order of orders) {
    const items = Array.isArray(order.items)
      ? (order.items as { label?: string; id?: string; name?: string; qty?: number }[])
      : []
    const orderDate = new Date(order.createdAt)
    for (const item of items) {
      const key = item.label ?? item.id ?? '?'
      const qty = item.qty ?? 1
      productCounts[key] = (productCounts[key] ?? 0) + qty

      const g = parseGrams(item.label ?? '') * qty
      if (g > 0) {
        const productName = item.name ?? item.label ?? item.id ?? '?'
        gramsByProduct[productName] = (gramsByProduct[productName] ?? 0) + g
        gramsTotal += g
        if (orderDate >= todayStart)  gramsToday += g
        if (orderDate >= weekStart)   gramsWeek  += g
        if (orderDate >= monthStart)  gramsMonth += g
        if (orderDate >= yearStart)   gramsYear  += g
      }
    }
  }
  const topProducts = Object.entries(productCounts)
    .sort((a, b) => b[1] - a[1])
    .slice(0, 5)
    .map(([name, count]) => ({ name, count }))

  const gramsByProductList = Object.entries(gramsByProduct)
    .sort((a, b) => b[1] - a[1])
    .map(([name, grams]) => ({ name, grams }))

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
    grams: {
      total: gramsTotal,
      today: gramsToday,
      week: gramsWeek,
      month: gramsMonth,
      year: gramsYear,
    },
    gramsByProduct: gramsByProductList,
    affiliates: affiliates.map(a => ({
      ...a,
      referralCount: refCounts[a.code] ?? 0,
      referralRevenue: refRevenue[a.code] ?? 0,
    })),
  })
}
