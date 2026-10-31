import { createHash } from 'node:crypto';

const sha256 = (value) => createHash('sha256').update(value, 'utf8').digest('hex');
const isRecord = (value) => value !== null && typeof value === 'object' && !Array.isArray(value);
const label = (value, max = 160) => typeof value === 'string' && value.length > 0
  && value.length <= max && value.trim() === value && !/[\u0000-\u001f]/u.test(value);
const digestPattern = /^[a-f0-9]{64}$/u;
const reviewedAtPattern = /^\d{4}-\d{2}-\d{2}T\d{2}:\d{2}:\d{2}(?:\.\d{1,3})?(?:Z|[+-]\d{2}:\d{2})$/u;

function validReviewDate(value) {
  if (typeof value !== 'string' || !reviewedAtPattern.test(value) || !Number.isFinite(Date.parse(value))) return false;
  // Date.parse normalizes impossible calendar dates such as February 30.
  const [year, month, day] = value.slice(0, 10).split('-').map(Number);
  return month >= 1 && month <= 12 && day >= 1
    && day <= new Date(Date.UTC(year, month, 0)).getUTCDate();
}

function validSource(source) {
  return isRecord(source) && label(source.id) && label(source.version)
    && source.status === 'published' && source.reviewStatus === 'approved'
    && source.withdrawn !== true && source.revoked !== true
    && source.withdrawnAt == null && source.revokedAt == null
    && Array.isArray(source.purposes) && source.purposes.includes('agent_advice')
    && label(source.reviewer) && validReviewDate(source.reviewedAt)
    && typeof source.content === 'string' && source.content.trim().length > 0
    && source.content.length <= 2_000_000;
}

function duplicates(values, keyOf) {
  const seen = new Set();
  const repeated = new Set();
  for (const value of values) {
    const key = keyOf(value);
    if (key === null) continue;
    if (seen.has(key)) repeated.add(key);
    seen.add(key);
  }
  return repeated;
}

const sourceKey = (source) => isRecord(source) && label(source.id) && label(source.version)
  ? JSON.stringify([source.id, source.version]) : null;

function terms(value) {
  const normalized = value.normalize('NFKC').toLowerCase();
  const result = new Set(normalized.match(/[\p{Script=Latin}\p{Number}]+(?:[+#.][\p{Script=Latin}\p{Number}]+)*/gu) ?? []);
  for (const run of normalized.match(/\p{Script=Han}+/gu) ?? []) {
    const points = Array.from(run);
    if (points.length === 1) result.add(run);
    for (let index = 0; index < points.length - 1; index += 1) result.add(points[index] + points[index + 1]);
  }
  return result;
}

/**
 * Reviewed advice knowledge is separate from the website's demonstration data.
 * Approval is supplied by a trusted publishing workflow; this module only
 * enforces its metadata and integrity contract, and never creates approvals.
 *
 * Pack: {version, sources: [{id, version, status: 'published',
 * reviewStatus: 'approved', purposes: ['agent_advice'], reviewer,
 * reviewedAt: ISO timestamp, content, title?}], chunks: [{id, sourceId,
 * sourceVersion, start, end, sha256, career, market, language}]}.
 * Offsets are Unicode code points with an exclusive end, not UTF-16 indices.
 * A chunk's SHA-256 covers the exact UTF-8 source span before normalization.
 */
export function createReviewedKnowledge({ loadPack = () => ({ version: 'empty-v1', sources: [], chunks: [] }) } = {}) {
  if (typeof loadPack !== 'function') throw new TypeError('loadPack must be a function');
  const knownSnapshots = new WeakSet();

  function snapshot() {
    // Read again for every request: withdrawal must not leave a reusable cache.
    const pack = loadPack();
    const validPack = isRecord(pack) && label(pack.version)
      && Array.isArray(pack.sources) && Array.isArray(pack.chunks)
      && pack.sources.length <= 10_000 && pack.chunks.length <= 10_000;
    const version = validPack ? pack.version : 'invalid-pack';
    const sourceRows = validPack ? pack.sources : [];
    const chunkRows = validPack ? pack.chunks : [];
    const repeatedSources = duplicates(sourceRows, sourceKey);
    const repeatedChunks = duplicates(chunkRows, (chunk) => isRecord(chunk) && label(chunk.id) ? chunk.id : null);
    const sources = new Map();
    for (const source of sourceRows) {
      const key = sourceKey(source);
      if (validSource(source) && !repeatedSources.has(key)) {
        sources.set(key, { source, points: Array.from(source.content) });
      }
    }

    const chunks = [];
    const reviewRecords = [];
    for (const chunk of chunkRows) {
      if (!isRecord(chunk) || !label(chunk.id) || repeatedChunks.has(chunk.id)
        || !label(chunk.sourceId) || !label(chunk.sourceVersion)
        || !label(chunk.career, 100) || !/^[A-Z]{2}$/u.test(chunk.market ?? '')
        || !/^[a-z]{2,3}(?:-[A-Za-z0-9]{2,8})*$/u.test(chunk.language ?? '')
        || !Number.isSafeInteger(chunk.start) || !Number.isSafeInteger(chunk.end)
        || chunk.start < 0 || chunk.end <= chunk.start || chunk.end - chunk.start > 12_000
        || typeof chunk.sha256 !== 'string' || !digestPattern.test(chunk.sha256)) continue;
      const found = sources.get(JSON.stringify([chunk.sourceId, chunk.sourceVersion]));
      if (!found || chunk.end > found.points.length) continue;
      const text = found.points.slice(chunk.start, chunk.end).join('');
      if (!text.trim() || sha256(text) !== chunk.sha256) continue;
      const result = {
        id: chunk.id, sourceId: chunk.sourceId, sourceVersion: chunk.sourceVersion,
        text, start: chunk.start, end: chunk.end, sha256: chunk.sha256,
        career: chunk.career, market: chunk.market, language: chunk.language,
      };
      if (label(found.source.title, 300)) result.sourceTitle = found.source.title;
      result.reviewedBy=found.source.reviewer;
      result.reviewedAt=found.source.reviewedAt;
      chunks.push(Object.freeze(result));
      reviewRecords.push({
        chunkId: chunk.id, sourceId: found.source.id, sourceVersion: found.source.version,
        sourceDigest: sha256(found.source.content), reviewer: found.source.reviewer,
        reviewedAt: found.source.reviewedAt,
      });
    }
    chunks.sort((left, right) => left.id < right.id ? -1 : left.id > right.id ? 1 : 0);
    reviewRecords.sort((left, right) => left.chunkId < right.chunkId ? -1 : left.chunkId > right.chunkId ? 1 : 0);
    const result = Object.freeze({
      version, digest: sha256(JSON.stringify({ version, chunks, reviewRecords })),
      chunks: Object.freeze(chunks),
    });
    knownSnapshots.add(result);
    return result;
  }

  function search(current, { query, career, market = 'CN', language = 'zh', limit = 5 } = {}) {
    // Do not accept caller-constructed snapshots or caller-supplied text.
    if (!knownSnapshots.has(current)) throw new TypeError('A snapshot from this knowledge instance is required');
    if (typeof query !== 'string' || !query.trim() || query.length > 4_000
      || !label(career, 100) || !/^[A-Z]{2}$/u.test(market)
      || !/^[a-z]{2,3}(?:-[A-Za-z0-9]{2,8})*$/u.test(language)
      || !Number.isInteger(limit) || limit < 1 || limit > 20) return [];
    const queryTerms = terms(query);
    if (!queryTerms.size) return [];
    const phrase = query.normalize('NFKC').toLowerCase().trim();
    return current.chunks
      .filter((chunk) => chunk.career === career && chunk.market === market && chunk.language === language)
      .map((chunk) => {
        const chunkTerms = terms(chunk.text);
        const normalizedText = chunk.text.normalize('NFKC').toLowerCase();
        let score = 0;
        for (const term of queryTerms) {
          if (chunkTerms.has(term) || (/^\p{Script=Han}$/u.test(term) && normalizedText.includes(term))) score += 1;
        }
        if (score > 0 && normalizedText.includes(phrase)) score += 2;
        return { chunk, score };
      })
      .filter(({ score }) => score > 0)
      .sort((left, right) => right.score - left.score
        || (left.chunk.id < right.chunk.id ? -1 : left.chunk.id > right.chunk.id ? 1 : 0))
      .slice(0, limit)
      .map(({ chunk }) => chunk);
  }

  return Object.freeze({ snapshot, search });
}
