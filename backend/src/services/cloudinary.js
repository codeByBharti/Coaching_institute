const cloudinary = require('cloudinary').v2;
const streamifier = require('streamifier');

let configured = false;

function ensureCloudinary() {
  if (configured) return;
  const CLOUDINARY_CLOUD_NAME = String(process.env.CLOUDINARY_CLOUD_NAME || '').trim();
  const CLOUDINARY_API_KEY = String(process.env.CLOUDINARY_API_KEY || '').trim();
  const CLOUDINARY_API_SECRET = String(process.env.CLOUDINARY_API_SECRET || '').trim();
  if (!CLOUDINARY_CLOUD_NAME || !CLOUDINARY_API_KEY || !CLOUDINARY_API_SECRET) {
    throw new Error('Cloudinary env vars are missing');
  }
  cloudinary.config({
    cloud_name: CLOUDINARY_CLOUD_NAME,
    api_key: CLOUDINARY_API_KEY,
    api_secret: CLOUDINARY_API_SECRET,
  });
  configured = true;
}

function uploadBufferToCloudinary(buffer, mimetype, originalName, folder = 'homework') {
  ensureCloudinary();

  return new Promise((resolve, reject) => {
    const uploadStream = cloudinary.uploader.upload_stream(
      {
        folder,
        // Let Cloudinary auto-detect the resource type to improve inline viewing.
        resource_type: 'auto',
        access_mode: 'public',
        // Cloudinary will generate a unique public_id automatically.
        use_filename: true,
        unique_filename: true,
      },
      (err, result) => {
        if (err) return reject(err);

        resolve({
          secure_url: result?.secure_url,
          public_id: result?.public_id,
        });
      }
    );

    const readable = streamifier.createReadStream(buffer);
    // Cloudinary can infer type from buffer; mimetype helps for some cases.
    readable.on('error', reject);
    uploadStream.on('error', reject);
    readable.pipe(uploadStream);
  });
}

async function destroyCloudinaryAsset(publicId) {
  if (!publicId) return;
  try {
    // If cloudinary isn't configured, don't hard-crash delete.
    if (!process.env.CLOUDINARY_CLOUD_NAME) return;
    ensureCloudinary();
    await cloudinary.uploader.destroy(publicId, { invalidate: true });
  } catch (e) {
    // Deletion failures should not break student/teacher flow.
    console.error('Cloudinary destroy failed:', e.message);
  }
}

module.exports = { uploadBufferToCloudinary, destroyCloudinaryAsset };

/**
 * Best-effort conversion: if an item has an existing Cloudinary URL but the asset is not publicly accessible,
 * convert it into a signed URL that works reliably.
 *
 * @param {string} secureUrl
 * @returns {string|undefined}
 */
function privateDownloadUrlFromSecureUrl(secureUrl) {
  if (!secureUrl || !/^https?:\/\//i.test(String(secureUrl))) return undefined;
  try {
    ensureCloudinary();
  } catch {
    return undefined;
  }

  // Examples:
  // https://res.cloudinary.com/<cloud>/image/upload/v123456/homework/file_x1y2z3.pdf
  // public_id would be: homework/file_x1y2z3
  const uploadTypeMatch = String(secureUrl).match(/\/(image|video|raw)\/upload\//i);
  const resourceType = uploadTypeMatch?.[1]?.toLowerCase() || 'raw';

  const m = String(secureUrl).match(/\/upload\/(?:v\d+\/)?(.+?)\.([a-z0-9]+)$/i);
  if (!m?.[1]) return undefined;
  const publicId = m[1];
  const extension = m[2];

  try {
    // Helpful debug: if signatures fail, we need to know what we signed.
    console.log('[cloudinary] signing private download:', {
      resourceType,
      publicId,
      extension,
    });
    return cloudinary.utils.private_download_url(publicId, extension, {
      resource_type: resourceType,
      type: 'upload',
      secure: true,
    });
  } catch {
    return undefined;
  }
}

module.exports.privateDownloadUrlFromSecureUrl = privateDownloadUrlFromSecureUrl;

/**
 * Build multiple signed private-download URL candidates because Cloudinary
 * can classify the same file under different resource_type values.
 *
 * @param {string} secureUrl
 * @returns {string[]}
 */
function privateDownloadUrlCandidatesFromSecureUrl(secureUrl) {
  if (!secureUrl || !/^https?:\/\//i.test(String(secureUrl))) return [];
  try {
    ensureCloudinary();
  } catch {
    return [];
  }

  const uploadTypeMatch = String(secureUrl).match(/\/(image|video|raw)\/upload\//i);
  const detectedResourceType = uploadTypeMatch?.[1]?.toLowerCase() || 'raw';
  const m = String(secureUrl).match(/\/upload\/(?:v\d+\/)?(.+?)\.([a-z0-9]+)$/i);
  if (!m?.[1]) return [];
  const publicId = m[1];
  const extension = m[2];

  const resourceTypes = [detectedResourceType, 'raw', 'image', 'video'];
  const seen = new Set();
  const urls = [];
  for (const rt of resourceTypes) {
    if (!rt || seen.has(rt)) continue;
    seen.add(rt);
    try {
      const u = cloudinary.utils.private_download_url(publicId, extension, {
        resource_type: rt,
        type: 'upload',
        secure: true,
      });
      if (u) urls.push(u);
    } catch {
      // ignore single variant failure, keep trying others
    }
  }
  return urls;
}

module.exports.privateDownloadUrlCandidatesFromSecureUrl = privateDownloadUrlCandidatesFromSecureUrl;

