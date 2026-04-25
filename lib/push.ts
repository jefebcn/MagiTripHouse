import webpush from 'web-push'
import { prisma } from './prisma'

const vapidEmail = process.env.VAPID_EMAIL!
webpush.setVapidDetails(
  vapidEmail.startsWith('mailto:') ? vapidEmail : `mailto:${vapidEmail}`,
  process.env.NEXT_PUBLIC_VAPID_PUBLIC_KEY!,
  process.env.VAPID_PRIVATE_KEY!,
)

export interface PushPayload {
  title: string
  body: string
  url?: string
  emoji?: string
}

export async function sendPushToAll(payload: PushPayload) {
  const subs = await prisma.pushSubscription.findMany()
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
