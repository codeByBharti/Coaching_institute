const cloudinary = require('cloudinary').v2;
const streamifier = require('streamifier');

let configured = false;

function ensureCloudinary() {
  if (configured) return;
  const { CLOUDINARY_CLOUD_NAME, CLOUDINARY_API_KEY, CLOUDINARY_API_SECRET } = process.env;
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
        // Study material is typically PDFs/DOCs; raw ensures correct handling for non-images.
        resource_type: 'raw',
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

