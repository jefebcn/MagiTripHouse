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

  const [orders, users, affiliates, payouts, products] = await Promise.all([
    prisma.order.findMany({ orderBy: { createdAt: 'desc' } }),
    prisma.user.findMany({ select: { createdAt: true } }),
    prisma.affiliate.findMany({ orderBy: { joinedAt: 'desc' } }),
    prisma.commissionPayout.findMany({ orderBy: { requestedAt: 'desc' } }),
    prisma.product.findMany({ select: { id: true, name: true, variants: true } }),
  ])

  // Lookup costo d'acquisto per prodotto+taglio (per id e per nome, come fallback)
  const costByIdLabel = new Map<string, number>()
  const costByNameLabel = new Map<string, number>()
  for (const p of products) {
    const variants = Array.isArray(p.variants)
      ? (p.variants as { label?: string; price?: number; cost?: number }[])
      : []
    for (const v of variants) {
      if (v.cost != null && v.label) {
        costByIdLabel.set(`${p.id}__${v.label}`, v.cost)
        costByNameLabel.set(`${p.name}__${v.label}`, v.cost)
      }
    }
  }
  const lookupCost = (id?: string, name?: string, label?: string): number | null => {
    if (label && id && costByIdLabel.has(`${id}__${label}`)) return costByIdLabel.get(`${id}__${label}`)!
    if (label && name && costByNameLabel.has(`${name}__${label}`)) return costByNameLabel.get(`${name}__${label}`)!
    return null
  }

  const revenue = (from?: Date) =>
    orders
      .filter(o => !from || new Date(o.createdAt) >= from)
      .reduce((sum, o) => sum + o.total, 0)

  function parseGrams(label: string): number {
    return parseFloat(label.replace(/[^0-9.]/g, '')) || 0
  }

  // Per-product aggregation: grams, revenue, qty, orders count, cost, profit
  type ProductStat = { grams: number; revenue: number; qty: number; ordersCount: number; cost: number; profit: number; costKnown: boolean }
  const productStats: Record<string, ProductStat> = {}
  const productCounts: Record<string, number> = {}
  let gramsTotal = 0, gramsToday = 0, gramsWeek = 0, gramsMonth = 0, gramsYear = 0
  let costTotal = 0, profitTotal = 0, revenueWithKnownCost = 0

  for (const order of orders) {
    const items = Array.isArray(order.items)
      ? (order.items as { label?: string; id?: string; name?: string; qty?: number; price?: number }[])
      : []
    const orderDate = new Date(order.createdAt)
    const seenProducts = new Set<string>()
    for (const item of items) {
      const key = item.label ?? item.id ?? '?'
      const qty = item.qty ?? 1
      productCounts[key] = (productCounts[key] ?? 0) + qty

      const productName = item.name ?? item.label ?? item.id ?? '?'
      const g = parseGrams(item.label ?? '') * qty
      const rev = (item.price ?? 0) * qty
      const unitCost = lookupCost(item.id, item.name, item.label)
      const lineCost = unitCost != null ? unitCost * qty : 0

      if (!productStats[productName]) productStats[productName] = { grams: 0, revenue: 0, qty: 0, ordersCount: 0, cost: 0, profit: 0, costKnown: false }
      productStats[productName].grams   += g
      productStats[productName].revenue += rev
      productStats[productName].qty     += qty
      if (unitCost != null) {
        productStats[productName].cost   += lineCost
        productStats[productName].profit += rev - lineCost
        productStats[productName].costKnown = true
        costTotal += lineCost
        profitTotal += rev - lineCost
        revenueWithKnownCost += rev
      }
      if (!seenProducts.has(productName)) {
        productStats[productName].ordersCount += 1
        seenProducts.add(productName)
      }
      if (g > 0) {
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

  const productStatsList = Object.entries(productStats)
    .sort((a, b) => b[1].grams - a[1].grams)
    .map(([name, s]) => ({
      name,
      grams: s.grams,
      revenue: s.revenue,
      qty: s.qty,
      ordersCount: s.ordersCount,
      avgPricePerGram: s.grams > 0 ? s.revenue / s.grams : 0,
      cost: s.cost,
      profit: s.profit,
      costKnown: s.costKnown,
      margin: s.costKnown && s.revenue > 0 ? (s.profit / s.revenue) * 100 : null,
    }))

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
    productStats: productStatsList,
    profit: {
      cost: costTotal,
      profit: profitTotal,
      revenueWithKnownCost,
      margin: revenueWithKnownCost > 0 ? (profitTotal / revenueWithKnownCost) * 100 : null,
      coverage: productStatsList.length > 0 ? productStatsList.filter(p => p.costKnown).length / productStatsList.length : 0,
    },
    affiliates: affiliates.map(a => ({
      ...a,
      referralCount: refCounts[a.code] ?? 0,
      referralRevenue: refRevenue[a.code] ?? 0,
      balance: a.commissionEarned - a.commissionPaid,
    })),
    commissions: {
      totalEarned: affiliates.reduce((s, a) => s + a.commissionEarned, 0),
      totalPaid: affiliates.reduce((s, a) => s + a.commissionPaid, 0),
      totalPending: payouts.filter(p => p.status === 'pending').reduce((s, p) => s + p.amount, 0),
    },
    pendingPayouts: payouts.filter(p => p.status === 'pending'),
  })
}
