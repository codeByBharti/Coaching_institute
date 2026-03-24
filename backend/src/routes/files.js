const path = require('path');
const express = require('express');
const {
  privateDownloadUrlFromSecureUrl,
  privateDownloadUrlCandidatesFromSecureUrl,
} = require('../services/cloudinary');
const { getPublicBase } = require('../utils/publicUrl');

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

function normalizeSourceUrl(sourceUrl, req) {
  let parsed;
  try {
    parsed = new URL(sourceUrl);
  } catch {
    return sourceUrl;
  }

  const host = String(parsed.hostname || '').toLowerCase();
  const isLocalHost =
    host === 'localhost' ||
    host === '127.0.0.1' ||
    host === '::1';

  // Production fix: old DB rows may still store localhost uploads URL.
  // Rewrite to current public backend host so live links work.
  if (isLocalHost && parsed.pathname.startsWith('/uploads/')) {
    const base = getPublicBase(req);
    if (base) {
      return `${base}${parsed.pathname}${parsed.search || ''}`;
    }
  }

  return sourceUrl;
}

async function fetchUpstreamFile(sourceUrl, req) {
  const normalizedSourceUrl = normalizeSourceUrl(sourceUrl, req);
  let parsed;
  try {
    parsed = new URL(normalizedSourceUrl);
  } catch {
    return { error: { status: 400, message: 'Invalid file URL' } };
  }

  if (!/^https?:$/i.test(parsed.protocol) || isBlockedHost(parsed.hostname)) {
    return { error: { status: 400, message: 'Blocked file URL' } };
  }

  let downloadSource = parsed.toString();
  let upstream = await fetch(downloadSource, { method: 'GET', redirect: 'follow' });

  // Cloudinary assets may be private; retry once using a signed private download URL.
  if (!upstream.ok && String(parsed.hostname).toLowerCase().includes('res.cloudinary.com')) {
    const candidates = privateDownloadUrlCandidatesFromSecureUrl(downloadSource);
    // Backward-compatible single candidate fallback if list builder returns nothing
    if (candidates.length === 0) {
      const signed = privateDownloadUrlFromSecureUrl(downloadSource);
      if (signed) candidates.push(signed);
    }
    for (const candidate of candidates) {
      downloadSource = candidate;
      upstream = await fetch(downloadSource, { method: 'GET', redirect: 'follow' });
      if (upstream.ok) break;
    }
  }

  if (!upstream.ok) {
    console.error('[files] upstream fetch failed:', {
      status: upstream.status,
      source: downloadSource,
    });
    return {
      error: {
        status: 502,
        message: `Failed to fetch file from source (upstream ${upstream.status})`,
      },
      parsed,
      source: downloadSource,
    };
  }

  return { upstream, parsed };
}

function shouldRedirectToCloudinary() {
  // Redirects cause CORS issues in browsers. Only allow in local dev.
  return process.env.NODE_ENV !== 'production';
}

router.get('/download', async (req, res) => {
  const sourceUrl = String(req.query.url || '').trim();
  const result = await fetchUpstreamFile(sourceUrl, req);
  if (result.error) {
    const host = String(result.parsed?.hostname || '').toLowerCase();
    if (host.includes('res.cloudinary.com') && shouldRedirectToCloudinary()) {
      const list = privateDownloadUrlCandidatesFromSecureUrl(result.source || sourceUrl);
      const redirectUrl = list[0] || privateDownloadUrlFromSecureUrl(result.source || sourceUrl) || (result.source || sourceUrl);
      return res.redirect(302, redirectUrl);
    }
    return res.status(result.error.status).json({ message: result.error.message });
  }
  const { upstream, parsed } = result;

  const requestedName = String(req.query.name || '').trim();
  const fallbackName = path.basename(parsed.pathname || '') || 'download';
  const fileName = requestedName || fallbackName;

  try {
    const upstreamType = upstream.headers.get('content-type') || '';
    const contentType = upstreamType.split(';')[0] || inferMimeFromName(fileName);
    res.setHeader('Content-Type', contentType);
    res.setHeader(
      'Content-Disposition',
      `attachment; filename*=UTF-8''${encodeURIComponent(fileName)}`
    );
    // Stream to avoid memory issues on Render/large files.
    if (upstream.body && typeof upstream.body.getReader === 'function') {
      const { Readable } = require('stream');
      const nodeStream = Readable.fromWeb(upstream.body);
      nodeStream.on('error', () => res.end());
      return nodeStream.pipe(res.status(200));
    }
    const fileBuffer = Buffer.from(await upstream.arrayBuffer());
    return res.status(200).send(fileBuffer);
  } catch (e) {
    return res.status(500).json({ message: 'Download proxy failed' });
  }
});

router.get('/open', async (req, res) => {
  const sourceUrl = String(req.query.url || '').trim();
  const result = await fetchUpstreamFile(sourceUrl, req);
  if (result.error) {
    const host = String(result.parsed?.hostname || '').toLowerCase();
    if (host.includes('res.cloudinary.com') && shouldRedirectToCloudinary()) {
      const list = privateDownloadUrlCandidatesFromSecureUrl(result.source || sourceUrl);
      const redirectUrl = list[0] || privateDownloadUrlFromSecureUrl(result.source || sourceUrl) || (result.source || sourceUrl);
      return res.redirect(302, redirectUrl);
    }
    return res.status(result.error.status).json({ message: result.error.message });
  }
  const { upstream, parsed } = result;

  const requestedName = String(req.query.name || '').trim();
  const fallbackName = path.basename(parsed.pathname || '') || 'file';
  const fileName = requestedName || fallbackName;

  try {
    const upstreamType = upstream.headers.get('content-type') || '';
    const contentType = upstreamType.split(';')[0] || inferMimeFromName(fileName);
    res.setHeader('Content-Type', contentType);
    res.setHeader(
      'Content-Disposition',
      `inline; filename*=UTF-8''${encodeURIComponent(fileName)}`
    );
    if (upstream.body && typeof upstream.body.getReader === 'function') {
      const { Readable } = require('stream');
      const nodeStream = Readable.fromWeb(upstream.body);
      nodeStream.on('error', () => res.end());
      return nodeStream.pipe(res.status(200));
    }
    const fileBuffer = Buffer.from(await upstream.arrayBuffer());
    return res.status(200).send(fileBuffer);
  } catch (e) {
    return res.status(500).json({ message: 'Open proxy failed' });
  }
});

module.exports = router;
