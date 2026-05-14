/**
 * Migration script: Vercel Blob → Cloudflare R2
 * Run via GitHub Actions (workflow_dispatch) — see .github/workflows/migrate-to-r2.yml
 */

import { list } from '@vercel/blob'
import { S3Client, PutObjectCommand } from '@aws-sdk/client-s3'
import { neon } from '@neondatabase/serverless'

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

console.log('DATABASE_URL prefix:', DATABASE_URL.slice(0, 20) + '...')

const r2 = new S3Client({
  region: 'auto',
  endpoint: R2_ENDPOINT,
  credentials: {
    accessKeyId: R2_ACCESS_KEY_ID,
    secretAccessKey: R2_SECRET_ACCESS_KEY_ID,
  },
})

const sql = neon(DATABASE_URL)

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

  // Load all products from DB using raw SQL
  const products = await sql`SELECT id, "imageUrl" FROM "Product" WHERE "imageUrl" IS NOT NULL`
  console.log(`Found ${products.length} products in DB\n`)

  // Build map: blobUrl → product ids
  const urlToProducts = {}
  for (const p of products) {
    if (p.imageUrl) {
      if (!urlToProducts[p.imageUrl]) urlToProducts[p.imageUrl] = []
      urlToProducts[p.imageUrl].push(p.id)
    }
  }

  let migrated = 0
  let errors = 0

  for (const blob of allBlobs) {
    const key = `products/${blob.pathname.split('/').pop()}`
    const contentType = blob.contentType ||
      (blob.pathname.match(/\.(mp4|mov|webm)$/i) ? 'video/mp4' : 'image/jpeg')

    process.stdout.write(`  ↑ ${blob.pathname} ... `)

    try {
      const newUrl = await uploadToR2(blob.downloadUrl, key, contentType)

      const productIds = urlToProducts[blob.url] || []
      for (const id of productIds) {
        await sql`UPDATE "Product" SET "imageUrl" = ${newUrl} WHERE id = ${id}`
        console.log(`✓ → ${newUrl} (updated product ${id})`)
      }
      if (productIds.length === 0) {
        console.log(`✓ uploaded (no product references)`)
      }
      migrated++
    } catch (err) {
      console.log(`✗ ERROR: ${err.message}`)
      errors++
    }
  }

  console.log('\n─────────────────────────────────')
  console.log(`✅ Migrated : ${migrated}`)
  console.log(`❌ Errors   : ${errors}`)
  console.log('─────────────────────────────────')
}

main().catch(err => {
  console.error('Fatal:', err)
  process.exit(1)
})
