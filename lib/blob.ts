import { put } from '@vercel/blob'

export async function uploadToBlob(
  file: File | Blob,
  filename: string,
): Promise<{ url: string; contentType: string }> {
  const blob = await put(`products/${filename}`, file, {
    access: 'public',
    addRandomSuffix: true,
  })
  return { url: blob.url, contentType: blob.contentType ?? 'application/octet-stream' }
}
