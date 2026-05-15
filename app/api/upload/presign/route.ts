import { NextResponse } from 'next/server'
import { S3Client, PutObjectCommand } from '@aws-sdk/client-s3'
import { getSignedUrl } from '@aws-sdk/s3-request-presigner'
import { auth } from '@/lib/auth'

const r2 = new S3Client({
  region: 'auto',
  endpoint: process.env.R2_ENDPOINT!,
  credentials: {
    accessKeyId:     process.env.R2_ACCESS_KEY_ID!,
    secretAccessKey: process.env.R2_SECRET_ACCESS_KEY_ID!,
  },
})

export const maxDuration = 10

export async function POST(req: Request) {
  const session = await auth()
  if (!session) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })

  const { filename, contentType } = await req.json()
  const ext = (filename as string).split('.').pop()?.toLowerCase() ?? 'bin'
  const key = `products/${Date.now()}_${Math.random().toString(36).slice(2)}.${ext}`

  const signedUrl = await getSignedUrl(
    r2,
    new PutObjectCommand({
      Bucket:      process.env.R2_BUCKET_NAME!,
      Key:         key,
      ContentType: contentType || 'application/octet-stream',
    }),
    { expiresIn: 600 },
  )

  return NextResponse.json({
    signedUrl,
    publicUrl: `${process.env.R2_PUBLIC_URL}/${key}`,
  })
}
