/**
 * Migration script: Vercel Blob → Cloudflare R2
 *
 * Usage:
 *   BLOB_READ_WRITE_TOKEN=... \
 *   R2_ACCESS_KEY_ID=... \
 *   R2_SECRET_ACCESS_KEY_ID=... \
 *   R2_ENDPOINT=https://xxxx.r2.cloudflarestorage.com \
 *   R2_BUCKET_NAME=magic-trip-house-media \
 *   R2_PUBLIC_URL=https://pub-xxxx.r2.dev \
 *   DATABASE_URL=postgresql://... \
 *   node migrate-to-r2.mjs
 */

import { list } from '@vercel/blob'
import { S3Client, PutObjectCommand } from '@aws-sdk/client-s3'
import { createRequire } from 'module'
const require = createRequire(import.meta.url)
const { PrismaClient } = require('@prisma/client')

const {
  BLOB_READ_WRITE_TOKEN,
  R2_ACCESS_KEY_ID,
  R2_SECRET_ACCESS_KEY_ID,
  R2_ENDPOINT,
  R2_BUCKET_NAME,
  R2_PUBLIC_URL,
  DATABASE_URL,
} = process.env

// Validate env vars
const missing = [
  'BLOB_READ_WRITE_TOKEN', 'R2_ACCESS_KEY_ID', 'R2_SECRET_ACCESS_KEY_ID',
  'R2_ENDPOINT', 'R2_BUCKET_NAME', 'R2_PUBLIC_URL', 'DATABASE_URL',
].filter(k => !process.env[k])

if (missing.length) {
  console.error('❌ Missing env vars:', missing.join(', '))
  process.exit(1)
}

const r2 = new S3Client({
  region: 'auto',
  endpoint: R2_ENDPOINT,
  credentials: {
    accessKeyId: R2_ACCESS_KEY_ID,
    secretAccessKey: R2_SECRET_ACCESS_KEY_ID,
  },
})

const prisma = new PrismaClient()

async function uploadToR2(url, key, contentType) {
  const res = await fetch(url, {
    headers: { Authorization: `Bearer ${BLOB_READ_WRITE_TOKEN}` },
  })
  if (!res.ok) throw new Error(`Failed to download ${url}: ${res.status}`)
  const buffer = Buffer.from(await res.arrayBuffer())
  await r2.send(new PutObjectCommand({
    Bucket: R2_BUCKET_NAME,
    Key: key,
    Body: buffer,
    ContentType: contentType || 'application/octet-stream',
  }))
  return `${R2_PUBLIC_URL}/${key}`
}

async function main() {
  console.log('📦 Fetching all blobs from Vercel Blob...')

  // List all blobs (paginated)
  let cursor
  const allBlobs = []
  do {
    const result = await list({ token: BLOB_READ_WRITE_TOKEN, cursor, limit: 100 })
    allBlobs.push(...result.blobs)
    cursor = result.cursor
  } while (cursor)

  console.log(`Found ${allBlobs.length} blobs\n`)
  if (allBlobs.length === 0) {
    console.log('Nothing to migrate.')
    return
  }

  // Load all products from DB
  const products = await prisma.product.findMany()
  console.log(`Found ${products.length} products in DB\n`)

  // Build a map: blobUrl → product id(s)
  const urlToProducts = {}
  for (const p of products) {
    if (p.imageUrl) {
      if (!urlToProducts[p.imageUrl]) urlToProducts[p.imageUrl] = []
      urlToProducts[p.imageUrl].push(p.id)
    }
  }

  let migrated = 0
  let skipped = 0
  let errors = 0

  for (const blob of allBlobs) {
    const key = `products/${blob.pathname.split('/').pop()}`
    const contentType = blob.contentType || (
      blob.pathname.match(/\.(mp4|mov|webm)$/i) ? 'video/mp4' : 'image/jpeg'
    )

    process.stdout.write(`  ↑ ${blob.pathname} ... `)

    try {
      const newUrl = await uploadToR2(blob.downloadUrl, key, contentType)

      // Update products that reference this blob URL
      const productIds = urlToProducts[blob.url] || []
      for (const id of productIds) {
        await prisma.product.update({
          where: { id },
          data: { imageUrl: newUrl },
        })
        console.log(`✓ → ${newUrl} (updated product ${id})`)
      }
      if (productIds.length === 0) {
        console.log(`✓ → ${newUrl} (no product references)`)
      }
      migrated++
    } catch (err) {
      console.log(`✗ ERROR: ${err.message}`)
      errors++
    }
  }

  await prisma.$disconnect()

  console.log('\n─────────────────────────────────')
  console.log(`✅ Migrated : ${migrated}`)
  console.log(`⏭  Skipped  : ${skipped}`)
  console.log(`❌ Errors   : ${errors}`)
  console.log('─────────────────────────────────')
  console.log('\nDone! Remember to update R2_PUBLIC_URL in Vercel if needed.')
}

main().catch(err => {
  console.error('Fatal:', err)
  process.exit(1)
})
