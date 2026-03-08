const { S3Client, PutObjectCommand, DeleteObjectCommand } = require('@aws-sdk/client-s3');
const crypto = require('crypto');

const REGION = process.env.AWS_REGION;
const BUCKET = process.env.AWS_S3_BUCKET;

const s3 = new S3Client({ region: REGION });

function generateKey(prefix, originalName) {
  const ext = originalName.includes('.') ? originalName.split('.').pop() : 'mp4';
  const random = crypto.randomBytes(16).toString('hex');
  return `${prefix}/${Date.now()}-${random}.${ext}`;
}

async function uploadBuffer(buffer, mimeType, originalName, prefix = 'lectures') {
  if (!BUCKET) {
    throw new Error('AWS_S3_BUCKET not configured');
  }
  const Key = generateKey(prefix, originalName);
  await s3.send(
    new PutObjectCommand({
      Bucket: BUCKET,
      Key,
      Body: buffer,
      ContentType: mimeType,
    })
  );

  const url = `https://${BUCKET}.s3.${REGION}.amazonaws.com/${Key}`;
  return { key: Key, url };
}

async function deleteObject(key) {
  if (!BUCKET) {
    throw new Error('AWS_S3_BUCKET not configured');
  }
  await s3.send(
    new DeleteObjectCommand({
      Bucket: BUCKET,
      Key: key,
    })
  );
}

module.exports = {
  uploadBuffer,
  deleteObject,
};

