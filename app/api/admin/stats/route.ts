import { NextResponse } from 'next/server'
import { prisma } from '@/lib/prisma'
import { auth } from '@/lib/auth'

export const dynamic = 'force-dynamic'

export async function GET() {
  const session = await auth()
  if (!session) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })

  const now = new Date()
  // "Oggi" parte dalla mezzanotte italiana, non da quella UTC del server
  const romeOffsetMin = (() => {
    const parts = new Intl.DateTimeFormat('en-US', { timeZone: 'Europe/Rome', hour12: false, year: 'numeric', month: '2-digit', day: '2-digit', hour: '2-digit', minute: '2-digit', second: '2-digit' })
      .formatToParts(now).reduce<Record<string, string>>((a, p) => { a[p.type] = p.value; return a }, {})
    const asUtc = Date.UTC(+parts.year, +parts.month - 1, +parts.day, +parts.hour % 24, +parts.minute, +parts.second)
    return Math.round((asUtc - Math.floor(now.getTime() / 1000) * 1000) / 60000)
  })()
  const romeNow = new Date(now.getTime() + romeOffsetMin * 60000)
  const todayStart = new Date(Date.UTC(romeNow.getUTCFullYear(), romeNow.getUTCMonth(), romeNow.getUTCDate()) - romeOffsetMin * 60000)
  const weekStart = new Date(todayStart); weekStart.setDate(todayStart.getDate() - 7)
  const monthStart = new Date(todayStart); monthStart.setDate(todayStart.getDate() - 30)
  const yearStart = new Date(todayStart); yearStart.setFullYear(todayStart.getFullYear() - 1)

  const [allOrders, users, affiliates, payouts, products, warehousePayments, partnerPending] = await Promise.all([
    prisma.order.findMany({ orderBy: { createdAt: 'desc' } }),
    prisma.user.findMany({ select: { createdAt: true } }),
    prisma.affiliate.findMany({ orderBy: { joinedAt: 'desc' } }),
    prisma.commissionPayout.findMany({ orderBy: { requestedAt: 'desc' } }),
    prisma.product.findMany({ select: { id: true, name: true, category: true, variants: true } }),
    prisma.warehousePayment.findMany({ select: { total: true, paidAt: true } }),
    prisma.partnerClaim.count({ where: { status: 'pending' } }),
  ])
  // Gli ordini annullati non contano in fatturato, grammi e profitto
  const orders = allOrders.filter(o => o.status !== 'cancelled')

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

  // Mappa prodotto → categoria (per il costo di default)
  const catById = new Map<string, string>()
  const catByName = new Map<string, string>()
  for (const p of products) {
    if (p.category) { catById.set(p.id, p.category); catByName.set(p.name, p.category) }
  }
  // Costo di default per grammo quando il costo esplicito non è impostato:
  // Cali €4.2/g · Dry €3.4/g · Frozen €5.5/g
  const defaultCostPerGram = (id?: string, name?: string): number | null => {
    const n = (name ?? '').toLowerCase()
    if (n.includes('froz')) return 5.5
    if (n.includes('dry'))  return 3.4
    if (n.includes('cali')) return 4.2
    const cat = (id && catById.get(id)) || (name && catByName.get(name)) || ''
    if (cat === 'frozen') return 5.5
    if (cat === 'hash')   return 3.4
    if (cat === 'premium') return 4.2
    return null
  }
  // Costo di default per pezzo: vapepen €18/pezzo
  // Costi d'acquisto comunicati dal titolare: valgono su tutto lo storico e prima di ogni altro costo.
  // perGram = € al grammo · perPiece = € al pezzo (il numero del formato è il numero di pezzi)
  const OWNER_COSTS: { match: string; perGram?: number; perPiece?: number }[] = [
    { match: 'squama',    perGram: 28 },
    { match: 'packwoods', perPiece: 18 },
    { match: 'ace premium', perPiece: 18 },
  ]
  const ownerCost = (name?: string) => {
    const n = (name ?? '').toLowerCase()
    return OWNER_COSTS.find(c => n.includes(c.match)) ?? null
  }

  const defaultCostPerPiece = (name?: string): number | null => {
    const n = (name ?? '').toLowerCase()
    if (n.includes('vape') || n.includes('vapepen') || n.includes('vaporizz')) return 18
    return null
  }

  const revenue = (from?: Date) =>
    orders
      .filter(o => !from || new Date(o.createdAt) >= from)
      .reduce((sum, o) => sum + o.total, 0)

  function parseGrams(label: string): number {
    return parseFloat(label.replace(/[^0-9.]/g, '')) || 0
  }
  const round2 = (n: number) => Math.round(n * 100) / 100

  // Per-product aggregation: grams, revenue, qty, orders count, cost, profit
  type ProductStat = { grams: number; revenue: number; qty: number; ordersCount: number; cost: number; profit: number; costKnown: boolean }
  const productStats: Record<string, ProductStat> = {}
  const productCounts: Record<string, number> = {}
  let gramsTotal = 0, gramsToday = 0, gramsWeek = 0, gramsMonth = 0, gramsYear = 0
  let costTotal = 0, profitTotal = 0, revenueWithKnownCost = 0
  // Spedizione Spagna/Italia: €10 addebitati al cliente (già nel totale), ~€20 pagati dal negozio
  const SHIP_FEE_CHARGED = 10, SHIP_COST_PAID = 20
  type OrderEcon = { at: Date; total: number; items: number; cost: number; unknown: number; shipCost: number; discount: number }
  const orderEcon: OrderEcon[] = []
  const missingCost: Record<string, number> = {}

  for (const order of orders) {
    const items = Array.isArray(order.items)
      ? (order.items as { label?: string; id?: string; name?: string; qty?: number; price?: number }[])
      : []
    const orderDate = new Date(order.createdAt)
    const seenProducts = new Set<string>()
    let oItems = 0, oCost = 0, oUnknown = 0
    for (const item of items) {
      const key = item.label ?? item.id ?? '?'
      const qty = item.qty ?? 1
      productCounts[key] = (productCounts[key] ?? 0) + qty

      const productName = item.name ?? item.label ?? item.id ?? '?'
      const gramsPerUnit = parseGrams(item.label ?? '')
      const g = gramsPerUnit * qty
      const rev = (item.price ?? 0) * qty

      // Costo esplicito per variante; se assente, costo di default per grammo (Cali/Dry/Frozen)
      // oppure per pezzo (vapepen €18/pz)
      const explicitUnitCost = lookupCost(item.id, item.name, item.label)
      const owner = ownerCost(item.name)
      let lineCost = 0
      let hasCost = false
      if (owner) {
        const units = parseGrams(item.label ?? '') || 1   // grammi o pezzi del formato
        lineCost = units * (owner.perGram ?? owner.perPiece ?? 0) * qty
        hasCost = true
      } else if (explicitUnitCost != null) {
        lineCost = explicitUnitCost * qty
        hasCost = true
      } else {
        const cpg = defaultCostPerGram(item.id, item.name)
        const cpp = defaultCostPerPiece(item.name)
        if (cpg != null && gramsPerUnit > 0) {
          lineCost = gramsPerUnit * cpg * qty
          hasCost = true
        } else if (cpp != null) {
          const piecesPerUnit = parseGrams(item.label ?? '') || 1  // "1pz", "3pz"… (1 se senza numero)
          lineCost = piecesPerUnit * cpp * qty
          hasCost = true
        }
      }

      if (!productStats[productName]) productStats[productName] = { grams: 0, revenue: 0, qty: 0, ordersCount: 0, cost: 0, profit: 0, costKnown: false }
      productStats[productName].grams   += g
      productStats[productName].revenue += rev
      productStats[productName].qty     += qty
      oItems += rev
      if (hasCost) oCost += lineCost
      else { oUnknown += rev; missingCost[productName] = (missingCost[productName] ?? 0) + rev }
      if (hasCost) {
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
    const shipped = (order.note ?? '').includes('[Spagna]') || (order.note ?? '').includes('[Italia]')
    const shipFee = shipped ? SHIP_FEE_CHARGED : 0
    orderEcon.push({
      at: orderDate, total: order.total, items: oItems, cost: oCost, unknown: oUnknown,
      shipCost: shipped ? SHIP_COST_PAID : 0,
      // Sconti e credito affiliato: differenza fra prodotti + spedizione addebitata e totale pagato
      discount: Math.max(0, oItems + shipFee - order.total),
    })
  }

  // Perdita netta spedizione: il negozio paga ~€20 e incassa €10 → −€10 per ordine spedito (Spagna/Italia)
  const SHIP_NET_LOSS = 10
  const shippingLossOrders = orders.filter(o => {
    const n = o.note ?? ''
    return n.includes('[Spagna]') || n.includes('[Italia]')
  }).length

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

  // ── Andamento: ultimi 14 giorni (giorni italiani) ──
  const DAY = 86_400_000
  const daily = Array.from({ length: 14 }, (_, i) => {
    const start = new Date(todayStart.getTime() - (13 - i) * DAY)
    const end = new Date(start.getTime() + DAY)
    const d = orderEcon.filter(o => o.at >= start && o.at < end)
    const revenue = d.reduce((s, o) => s + o.total, 0)
    const profit = d.reduce((s, o) => s + o.total - o.cost - o.shipCost, 0)
    return { date: start.toISOString(), revenue: round2(revenue), profit: round2(profit), orders: d.length }
  })

  // ── Periodi a confronto (stessa durata, subito prima) ──
  // Conto economico di un periodo: incasso − costo merce − spedizioni pagate − affitto = utile netto
  const windowStats = (from: Date, to: Date) => {
    const list = orderEcon.filter(o => o.at >= from && o.at < to)
    const sum = (f: (o: OrderEcon) => number) => list.reduce((s, o) => s + f(o), 0)
    const revenue = sum(o => o.total)
    const cost = sum(o => o.cost)
    const shipCost = sum(o => o.shipCost)
    const rent = warehousePayments.filter(w => w.paidAt >= from && w.paidAt < to).reduce((s, w) => s + w.total, 0)
    const grossProfit = revenue - cost - shipCost
    const net = grossProfit - rent
    return {
      revenue: round2(revenue), orders: list.length, avg: list.length ? round2(revenue / list.length) : 0,
      cost: round2(cost), shipCost: round2(shipCost), discounts: round2(sum(o => o.discount)), rent: round2(rent),
      grossProfit: round2(grossProfit), net: round2(net),
      margin: revenue > 0 ? round2((grossProfit / revenue) * 100) : null,
      unknownRevenue: round2(sum(o => o.unknown)),
    }
  }
  const end = new Date(now.getTime() + 1000)
  const periods = {
    today: { cur: windowStats(todayStart, end), prev: windowStats(new Date(todayStart.getTime() - DAY), new Date(now.getTime() - DAY)) },
    week:  { cur: windowStats(weekStart, end),  prev: windowStats(new Date(weekStart.getTime() - 7 * DAY), weekStart) },
    month: { cur: windowStats(monthStart, end), prev: windowStats(new Date(monthStart.getTime() - 30 * DAY), monthStart) },
    total: { cur: windowStats(new Date(0), end), prev: null },
  }

  // ── Cose da fare ──
  const STALE_DAYS = 21
  const staleLimit = new Date(now.getTime() - STALE_DAYS * DAY)
  const todo = {
    awaitingPayment: allOrders.filter(o => o.status === 'pending' && o.createdAt >= staleLimit).length,
    toShip: allOrders.filter(o => o.status === 'paid').length,
    stalePending: allOrders.filter(o => o.status === 'pending' && o.createdAt < staleLimit).length,
    partnerClaims: partnerPending,
    payouts: payouts.filter(p => p.status === 'pending').length,
  }

  return NextResponse.json({
    daily,
    periods,
    todo,
    revenue: {
      today: revenue(todayStart),
      week: revenue(weekStart),
      month: revenue(monthStart),
      total: revenue(),
    },
    orders: {
      total: orders.length,
      pending: orders.filter(o => o.status === 'pending').length,
      paid: orders.filter(o => o.status === 'paid').length,
      cancelled: allOrders.length - orders.length,
      shipped: orders.filter(o => o.status === 'shipped').length,
      delivered: orders.filter(o => o.status === 'delivered').length,
    },
    users: {
      total: users.length,
      today: users.filter(u => new Date(u.createdAt) >= todayStart).length,
      week: users.filter(u => new Date(u.createdAt) >= weekStart).length,
    },
    recentOrders: allOrders.slice(0, 6).map(o => ({
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
    // Prodotti venduti senza costo d'acquisto: il loro incasso è contato tutto come guadagno
    missingCost: Object.entries(missingCost).sort((a, b) => b[1] - a[1]).map(([name, revenue]) => ({ name, revenue: round2(revenue) })),
    profit: {
      cost: costTotal,
      profit: profitTotal,
      revenueWithKnownCost,
      margin: revenueWithKnownCost > 0 ? (profitTotal / revenueWithKnownCost) * 100 : null,
      coverage: productStatsList.length > 0 ? productStatsList.filter(p => p.costKnown).length / productStatsList.length : 0,
      warehouseRent: round2(warehousePayments.reduce((s, p) => s + p.total, 0)),
      shippingOrders: shippingLossOrders,
      shippingLoss: round2(shippingLossOrders * SHIP_NET_LOSS),
      net: round2(profitTotal - warehousePayments.reduce((s, p) => s + p.total, 0) - shippingLossOrders * SHIP_NET_LOSS),
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
