import { NextResponse } from 'next/server'
import { S3Client, CompleteMultipartUploadCommand } from '@aws-sdk/client-s3'
import { auth } from '@/lib/auth'

const r2 = new S3Client({
  region: 'auto',
  endpoint: process.env.R2_ENDPOINT!,
  credentials: {
    accessKeyId:     process.env.R2_ACCESS_KEY_ID!,
    secretAccessKey: process.env.R2_SECRET_ACCESS_KEY_ID!,
  },
})

export const maxDuration = 30

export async function POST(req: Request) {
  const session = await auth()
  if (!session) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })

  const { uploadId, key, parts } = await req.json() as {
    uploadId: string
    key: string
    parts: { partNumber: number; etag: string }[]
  }

  await r2.send(new CompleteMultipartUploadCommand({
    Bucket:           process.env.R2_BUCKET_NAME!,
    Key:              key,
    UploadId:         uploadId,
    MultipartUpload: {
      Parts: parts.map(p => ({ PartNumber: p.partNumber, ETag: p.etag })),
    },
  }))

  const publicUrl = `${process.env.R2_PUBLIC_URL}/${key}`
  return NextResponse.json({ publicUrl })
}
