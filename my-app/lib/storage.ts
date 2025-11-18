import { S3Client, PutObjectCommand } from "@aws-sdk/client-s3"

const s3Client = new S3Client({ region: process.env.AWS_REGION })

export async function uploadToStorage(
  path: string,
  buffer: Buffer
): Promise<string> {
  const bucketName = process.env.AWS_S3_BUCKET_NAME

  if (!bucketName) {
    throw new Error("AWS_S3_BUCKET_NAME not configured")
  }

  const command = new PutObjectCommand({
    Bucket: bucketName,
    Key: path,
    Body: buffer,
    ContentType: "application/pdf",
  })

  try {
    await s3Client.send(command)
    const url = `https://${bucketName}.s3.amazonaws.com/${path}`
    console.log("roy: uploaded to S3", url)
    return url
  } catch (error) {
    console.error("roy: S3 upload error:", error)
    throw error
  }
}
