import webpush from 'web-push'
import { prisma } from './prisma'

export interface PushPayload {
  title: string
  body: string
  url?: string
  emoji?: string
}

export async function sendPushToAll(payload: PushPayload) {
  return sendPushToSubs(await prisma.pushSubscription.findMany(), payload)
}

export async function sendPushToUser(userId: string, payload: PushPayload) {
  if (!userId) return { sent: 0, removed: 0 }
  const subs = await prisma.pushSubscription.findMany({ where: { userId } })
  return sendPushToSubs(subs, payload)
}

type Sub = { endpoint: string; p256dh: string; auth: string }

async function sendPushToSubs(subs: Sub[], payload: PushPayload) {
  if (!subs.length) return { sent: 0, removed: 0 }
  const email = process.env.VAPID_EMAIL ?? ''
  webpush.setVapidDetails(
    email.startsWith('mailto:') ? email : `mailto:${email}`,
    process.env.NEXT_PUBLIC_VAPID_PUBLIC_KEY!,
    process.env.VAPID_PRIVATE_KEY!,
  )
  const results = await Promise.allSettled(
    subs.map((sub) =>
      webpush.sendNotification(
        { endpoint: sub.endpoint, keys: { p256dh: sub.p256dh, auth: sub.auth } },
        JSON.stringify(payload),
      ),
    ),
  )
  // Remove stale subscriptions (410 Gone)
  const stale: string[] = []
  results.forEach((r, i) => {
    if (r.status === 'rejected') {
      const err = r.reason as { statusCode?: number }
      if (err?.statusCode === 410) stale.push(subs[i].endpoint)
    }
  })
  if (stale.length) {
    await prisma.pushSubscription.deleteMany({ where: { endpoint: { in: stale } } })
  }
  return { sent: subs.length - stale.length, removed: stale.length }
}
