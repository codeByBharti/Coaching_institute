const fs = require('fs');
const path = require('path');
const crypto = require('crypto');

const { uploadBuffer: uploadToS3, deleteObject: deleteFromS3 } = require('./s3');
const { toAbsoluteUrl } = require('../utils/publicUrl');

function hasRealAwsConfig() {
  const bucket = process.env.AWS_S3_BUCKET;
  const region = process.env.AWS_REGION;
  const key = process.env.AWS_ACCESS_KEY_ID;
  const secret = process.env.AWS_SECRET_ACCESS_KEY;
  if (!bucket || !region || !key || !secret) return false;
  if (key === 'your-access-key' || secret === 'your-secret-key') return false;
  return true;
}

function ensureDir(dirPath) {
  fs.mkdirSync(dirPath, { recursive: true });
}

function safeName(originalName) {
  const base = path.basename(originalName || 'file');
  return base.replace(/[^\w.\-]+/g, '_');
}

function makeLocalKey(prefix, originalName) {
  const random = crypto.randomBytes(12).toString('hex');
  return `${prefix}/${Date.now()}-${random}-${safeName(originalName)}`;
}

function uploadsRoot() {
  // backend/src/services -> backend/uploads
  return path.join(__dirname, '..', '..', 'uploads');
}

/**
 * @param {Buffer} buffer
 * @param {string} mimeType
 * @param {string} originalName
 * @param {string} prefix
 * @param {import('express').Request} [req] - pass from route handlers so production URLs use the API host
 */
async function uploadBuffer(buffer, mimeType, originalName, prefix, req) {
  if (hasRealAwsConfig()) {
    try {
      return await uploadToS3(buffer, mimeType, originalName, prefix);
    } catch (e) {
      // fall through to local
      console.error('S3 upload failed, falling back to local storage:', e.message);
    }
  }

  const key = makeLocalKey(prefix, originalName);
  const fullPath = path.join(uploadsRoot(), key);
  ensureDir(path.dirname(fullPath));
  fs.writeFileSync(fullPath, buffer);
  const relative = `/uploads/${key.replace(/\\/g, '/')}`;
  const url = toAbsoluteUrl(relative, req);
  return { key, url };
}

async function deleteKey(key) {
  if (!key) return;

  // If the key looks like a local key (contains prefix/filename), try local first.
  const fullPath = path.join(uploadsRoot(), key);
  try {
    if (fs.existsSync(fullPath)) {
      fs.unlinkSync(fullPath);
      return;
    }
  } catch (e) {
    // ignore
  }

  // Otherwise attempt S3 deletion if configured
  if (hasRealAwsConfig()) {
    try {
      await deleteFromS3(key);
    } catch (e) {
      console.error('Failed to delete from S3:', e.message);
    }
  }
}

module.exports = { uploadBuffer, deleteKey };

