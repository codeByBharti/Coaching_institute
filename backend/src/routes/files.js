const path = require('path');
const express = require('express');
const { privateDownloadUrlFromSecureUrl } = require('../services/cloudinary');

const router = express.Router();

const MIME_MAP = {
  '.pdf': 'application/pdf',
  '.doc': 'application/msword',
  '.docx': 'application/vnd.openxmlformats-officedocument.wordprocessingml.document',
  '.ppt': 'application/vnd.ms-powerpoint',
  '.pptx': 'application/vnd.openxmlformats-officedocument.presentationml.presentation',
};

function inferMimeFromName(fileName) {
  const ext = path.extname(String(fileName || '')).toLowerCase();
  return MIME_MAP[ext] || 'application/octet-stream';
}

function isBlockedHost(hostname) {
  const h = String(hostname || '').toLowerCase();
  if (!h) return true;
  if (h.startsWith('10.') || h.startsWith('192.168.') || h.startsWith('169.254.')) return true;
  const m = h.match(/^172\.(\d+)\./);
  if (m) {
    const second = Number(m[1]);
    if (second >= 16 && second <= 31) return true;
  }
  return false;
}

async function fetchUpstreamFile(sourceUrl) {
  let parsed;
  try {
    parsed = new URL(sourceUrl);
  } catch {
    return { error: { status: 400, message: 'Invalid file URL' } };
  }

  if (!/^https?:$/i.test(parsed.protocol) || isBlockedHost(parsed.hostname)) {
    return { error: { status: 400, message: 'Blocked file URL' } };
  }

  let downloadSource = parsed.toString();
  let upstream = await fetch(downloadSource, { method: 'GET' });

  // Cloudinary assets may be private; retry once using a signed private download URL.
  if (!upstream.ok && String(parsed.hostname).toLowerCase().includes('res.cloudinary.com')) {
    const signed = privateDownloadUrlFromSecureUrl(downloadSource);
    if (signed) {
      downloadSource = signed;
      upstream = await fetch(downloadSource, { method: 'GET' });
    }
  }

  if (!upstream.ok) {
    console.error('[files] upstream fetch failed:', {
      status: upstream.status,
      source: downloadSource,
    });
    return { error: { status: 502, message: 'Failed to fetch file from source' } };
  }

  return { upstream, parsed };
}

router.get('/download', async (req, res) => {
  const sourceUrl = String(req.query.url || '').trim();
  const result = await fetchUpstreamFile(sourceUrl);
  if (result.error) return res.status(result.error.status).json({ message: result.error.message });
  const { upstream, parsed } = result;

  const requestedName = String(req.query.name || '').trim();
  const fallbackName = path.basename(parsed.pathname || '') || 'download';
  const fileName = requestedName || fallbackName;

  try {
    const upstreamType = upstream.headers.get('content-type') || '';
    const contentType = upstreamType.split(';')[0] || inferMimeFromName(fileName);
    const fileBuffer = Buffer.from(await upstream.arrayBuffer());

    res.setHeader('Content-Type', contentType);
    res.setHeader(
      'Content-Disposition',
      `attachment; filename*=UTF-8''${encodeURIComponent(fileName)}`
    );
    return res.status(200).send(fileBuffer);
  } catch (e) {
    return res.status(500).json({ message: 'Download proxy failed' });
  }
});

router.get('/open', async (req, res) => {
  const sourceUrl = String(req.query.url || '').trim();
  const result = await fetchUpstreamFile(sourceUrl);
  if (result.error) return res.status(result.error.status).json({ message: result.error.message });
  const { upstream, parsed } = result;

  const requestedName = String(req.query.name || '').trim();
  const fallbackName = path.basename(parsed.pathname || '') || 'file';
  const fileName = requestedName || fallbackName;

  try {
    const upstreamType = upstream.headers.get('content-type') || '';
    const contentType = upstreamType.split(';')[0] || inferMimeFromName(fileName);
    const fileBuffer = Buffer.from(await upstream.arrayBuffer());

    res.setHeader('Content-Type', contentType);
    res.setHeader(
      'Content-Disposition',
      `inline; filename*=UTF-8''${encodeURIComponent(fileName)}`
    );
    return res.status(200).send(fileBuffer);
  } catch (e) {
    return res.status(500).json({ message: 'Open proxy failed' });
  }
});

module.exports = router;
