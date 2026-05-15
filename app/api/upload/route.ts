import { NextResponse } from 'next/server'
import { S3Client, PutObjectCommand } from '@aws-sdk/client-s3'
import { auth } from '@/lib/auth'

const r2 = new S3Client({
  region: 'auto',
  endpoint: process.env.R2_ENDPOINT!,
  credentials: {
    accessKeyId:     process.env.R2_ACCESS_KEY_ID!,
    secretAccessKey: process.env.R2_SECRET_ACCESS_KEY_ID!,
  },
})

export const maxDuration = 60

export async function POST(req: Request) {
  const session = await auth()
  if (!session) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })

  const formData = await req.formData()
  const file = formData.get('file') as File | null
  if (!file) return NextResponse.json({ error: 'Nessun file ricevuto' }, { status: 400 })

  const ext = file.name.split('.').pop()?.toLowerCase() ?? 'bin'
  const key = `products/${Date.now()}_${Math.random().toString(36).slice(2)}.${ext}`
  const contentType = file.type || (ext.match(/mp4|mov|webm/) ? 'video/mp4' : 'image/jpeg')

  const buffer = Buffer.from(await file.arrayBuffer())

  await r2.send(new PutObjectCommand({
    Bucket:      process.env.R2_BUCKET_NAME!,
    Key:         key,
    Body:        buffer,
    ContentType: contentType,
  }))

  return NextResponse.json({ publicUrl: `${process.env.R2_PUBLIC_URL}/${key}` })
}
