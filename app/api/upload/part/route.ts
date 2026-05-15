import { NextResponse } from 'next/server'
import { S3Client, UploadPartCommand } from '@aws-sdk/client-s3'
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

  const uploadId   = req.headers.get('x-upload-id')!
  const key        = req.headers.get('x-key')!
  const partNumber = parseInt(req.headers.get('x-part') ?? '1', 10)

  const buffer = Buffer.from(await req.arrayBuffer())

  const result = await r2.send(new UploadPartCommand({
    Bucket:     process.env.R2_BUCKET_NAME!,
    Key:        key,
    UploadId:   uploadId,
    PartNumber: partNumber,
    Body:       buffer,
  }))

  return NextResponse.json({ etag: result.ETag })
}
