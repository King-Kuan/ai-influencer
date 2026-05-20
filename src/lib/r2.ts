import { S3Client, PutObjectCommand } from '@aws-sdk/client-s3';

let r2Client: S3Client | null = null;

function getR2Client() {
  if (!r2Client) {
    if (!process.env.R2_ACCOUNT_ID || !process.env.R2_ACCESS_KEY_ID || !process.env.R2_SECRET_ACCESS_KEY) {
      throw new Error("R2 configuration missing in environment variables");
    }
    r2Client = new S3Client({
      region: 'auto',
      endpoint: `https://${process.env.R2_ACCOUNT_ID}.r2.cloudflarestorage.com`,
      credentials: {
        accessKeyId: process.env.R2_ACCESS_KEY_ID!,
        secretAccessKey: process.env.R2_SECRET_ACCESS_KEY!
      }
    });
  }
  return r2Client;
}

export async function uploadToR2Temp(imageBuffer: Buffer, key: string) {
  const client = getR2Client();
  const bucket = process.env.R2_BUCKET_NAME;
  if (!bucket) throw new Error("R2_BUCKET_NAME is missing");

  await client.send(new PutObjectCommand({
    Bucket: bucket,
    Key: key,
    Body: imageBuffer,
    ContentType: 'image/png',
    Metadata: { 'x-amz-meta-ttl': '300' }
  }));
  
  // return public URL 
  return `https://${bucket}.${process.env.R2_ACCOUNT_ID}.r2.cloudflarestorage.com/${key}`;
}
