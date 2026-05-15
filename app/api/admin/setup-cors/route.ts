import { NextResponse } from 'next/server'
import { S3Client, PutBucketCorsCommand } from '@aws-sdk/client-s3'

const r2 = new S3Client({
  region: 'auto',
  endpoint: process.env.R2_ENDPOINT!,
  credentials: {
    accessKeyId:     process.env.R2_ACCESS_KEY_ID!,
    secretAccessKey: process.env.R2_SECRET_ACCESS_KEY_ID!,
  },
})

export async function GET() {
  try {
    await r2.send(new PutBucketCorsCommand({
      Bucket: process.env.R2_BUCKET_NAME!,
      CORSConfiguration: {
        CORSRules: [{
          AllowedOrigins: ['*'],
          AllowedMethods: ['GET', 'PUT', 'HEAD', 'DELETE'],
          AllowedHeaders: ['*'],
          ExposeHeaders:  ['ETag'],
          MaxAgeSeconds:  3600,
        }],
      },
    }))
    return NextResponse.json({ ok: true, message: 'CORS configurato su R2' })
  } catch (err: any) {
    return NextResponse.json({ ok: false, error: err.message }, { status: 500 })
  }
}
