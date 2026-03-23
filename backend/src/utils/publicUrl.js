/**
 * Build absolute URLs for uploaded assets so production (Vercel + Render) works:
 * browsers must load /uploads/* from the API origin, not the frontend origin.
 */

function getPublicBase(req) {
  const env =
    process.env.PUBLIC_API_URL ||
    process.env.API_BASE_URL ||
    process.env.RENDER_EXTERNAL_URL ||
    process.env.BACKEND_URL;
  if (env) {
    return String(env).replace(/\/$/, '');
  }
  if (req) {
    const host = req.get('host');
    const proto = req.get('x-forwarded-proto') || req.protocol || 'https';
    if (host) {
      return `${proto}://${host}`;
    }
  }
  return '';
}

/**
 * @param {string|null|undefined} pathOrUrl
 * @param {import('express').Request} [req] - optional; improves URL when env vars missing
 * @returns {string|undefined}
 */
function toAbsoluteUrl(pathOrUrl, req) {
  if (pathOrUrl == null || pathOrUrl === '') return pathOrUrl;
  const s = String(pathOrUrl).trim();
  if (/^https?:\/\//i.test(s)) return s;
  if (s.startsWith('//')) return `https:${s}`;
  const base = getPublicBase(req);
  if (!base) {
    // Dev: keep /uploads/... so Vite proxy can forward to the API
    return s.startsWith('/') ? s : `/${s}`;
  }
  const path = s.startsWith('/') ? s : `/${s}`;
  return `${base}${path}`;
}

function mapHomework(doc) {
  const o = doc && typeof doc.toObject === 'function' ? doc.toObject() : { ...doc };
  // Normalize into the new schema: { type: 'link'|'file', url: absolute URL }
  if (!o.type) {
    if (o.materialType) o.type = o.materialType;
    else o.type = 'file';
  }

  const rawUrl = o.url || o.s3Url;
  if (rawUrl) {
    o.url = toAbsoluteUrl(rawUrl);
  }
  return o;
}

function mapExam(exam) {
  const o = exam && typeof exam.toObject === 'function' ? exam.toObject() : { ...exam };
  if (o.questionPaperUrl) {
    o.questionPaperUrl = toAbsoluteUrl(o.questionPaperUrl);
  }
  return o;
}

function mapExamAttempt(att) {
  const o = att && typeof att.toObject === 'function' ? att.toObject() : { ...att };
  if (o.answerSheetUrl) {
    o.answerSheetUrl = toAbsoluteUrl(o.answerSheetUrl);
  }
  return o;
}

function mapRecordedLecture(doc) {
  const o = doc && typeof doc.toObject === 'function' ? doc.toObject() : { ...doc };
  if (o.s3Url) {
    o.s3Url = toAbsoluteUrl(o.s3Url);
  }
  return o;
}

module.exports = {
  getPublicBase,
  toAbsoluteUrl,
  mapHomework,
  mapExam,
  mapExamAttempt,
  mapRecordedLecture,
};
