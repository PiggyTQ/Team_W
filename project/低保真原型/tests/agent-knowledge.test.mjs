import test from 'node:test';
import assert from 'node:assert/strict';
import { createHash } from 'node:crypto';
import { createReviewedKnowledge } from '../server/agent/knowledge.mjs';

const digest = (text) => createHash('sha256').update(text, 'utf8').digest('hex');
const text = '数据质量需要保留原值。SQL 查询记录。';
function pack() {
  return {
    version: 'reviewed-test-v1',
    sources: [{
      id: 'test-source', version: '1', status: 'published', reviewStatus: 'approved',
      purposes: ['agent_advice'], reviewer: 'synthetic-test-reviewer',
      reviewedAt: '2026-10-27T10:00:00Z', content: text, title: '合成测试知识',
    }],
    chunks: [{
      id: 'test-chunk', sourceId: 'test-source', sourceVersion: '1',
      start: 0, end: Array.from(text).length, sha256: digest(text),
      career: 'DATA_ANALYST', market: 'CN', language: 'zh',
    }],
  };
}

test('knowledge defaults to an empty reviewed library', () => {
  const knowledge = createReviewedKnowledge();
  const snapshot = knowledge.snapshot();
  assert.equal(snapshot.version, 'empty-v1');
  assert.match(snapshot.digest, /^[a-f0-9]{64}$/u);
  assert.deepEqual(snapshot.chunks, []);
  assert.deepEqual(knowledge.search(snapshot, { query: '数据', career: 'DATA_ANALYST' }), []);
});

test('approved exact source spans support deterministic Chinese and Latin retrieval', () => {
  const knowledge = createReviewedKnowledge({ loadPack: pack });
  const snapshot = knowledge.snapshot();
  assert.equal(snapshot.chunks.length, 1);
  for (const query of ['数据质量', '数', 'SQL', 'ｓｑｌ']) {
    assert.equal(knowledge.search(snapshot, { query, career: 'DATA_ANALYST' })[0].text, text);
  }
  assert.equal(snapshot.chunks[0].sourceTitle, '合成测试知识');
  assert.equal(Object.isFrozen(snapshot.chunks[0]), true);
  assert.equal(knowledge.snapshot().digest, snapshot.digest);
});

test('publication, review and purpose gates fail closed independently', () => {
  const invalid = [
    { status: 'withdrawn' }, { status: 'draft' }, { reviewStatus: 'pending' },
    { withdrawn: true }, { revoked: true }, { withdrawnAt: '2026-10-28T00:00:00Z' },
    { revokedAt: '2026-10-28T00:00:00Z' },
    { purposes: ['website_demo'] }, { purposes: [] }, { reviewer: '' },
    { reviewedAt: 'not-a-date' }, { reviewedAt: '2026-02-30T10:00:00Z' },
    { reviewedAt: '2026-10-27' }, { version: '' }, { content: '' },
  ];
  for (const mutation of invalid) {
    const input = pack();
    Object.assign(input.sources[0], mutation);
    assert.equal(createReviewedKnowledge({ loadPack: () => input }).snapshot().chunks.length, 0, JSON.stringify(mutation));
  }
});

test('missing chunk scope, source version, location or hash excludes the chunk', () => {
  const invalid = [
    { career: '' }, { market: '' }, { language: '' }, { sourceVersion: '2' },
    { sourceId: 'not-present' }, { start: -1 }, { end: 999 }, { start: 0.5 },
    { end: 0 }, { sha256: '0'.repeat(64) }, { sha256: undefined },
  ];
  for (const mutation of invalid) {
    const input = pack();
    Object.assign(input.chunks[0], mutation);
    assert.equal(createReviewedKnowledge({ loadPack: () => input }).snapshot().chunks.length, 0, JSON.stringify(mutation));
  }
});

test('Unicode offsets are code points and text is never taken from the chunk payload', () => {
  const input = pack();
  input.sources[0].content = '😀数据质量😀';
  Object.assign(input.chunks[0], { start: 1, end: 5, sha256: digest('数据质量'), text: '伪造正文' });
  const knowledge = createReviewedKnowledge({ loadPack: () => input });
  assert.equal(knowledge.snapshot().chunks[0].text, '数据质量');
  input.chunks[0].start = 2;
  assert.equal(knowledge.snapshot().chunks.length, 0);
});

test('scope filters never cross career, market or language and irrelevant input returns no match', () => {
  const knowledge = createReviewedKnowledge({ loadPack: pack });
  const snapshot = knowledge.snapshot();
  for (const options of [
    { career: 'SW_BE' }, { market: 'US' }, { language: 'en' },
    { query: '没有关联' }, { career: undefined }, { limit: 0 }, { limit: 21 }, { query: '???' },
  ]) assert.deepEqual(knowledge.search(snapshot, { query: '数据', career: 'DATA_ANALYST', ...options }), []);
});

test('a source withdrawal is observed by the next load and changes the snapshot digest', () => {
  const input = pack();
  let loads = 0;
  const knowledge = createReviewedKnowledge({ loadPack: () => { loads += 1; return input; } });
  const first = knowledge.snapshot();
  input.sources[0].status = 'withdrawn';
  const second = knowledge.snapshot();
  assert.equal(loads, 2);
  assert.equal(first.chunks.length, 1);
  assert.equal(second.chunks.length, 0);
  assert.notEqual(first.digest, second.digest);
});

test('source and chunk duplicate identities are quarantined instead of silently overwritten', () => {
  const repeatedSource = pack();
  repeatedSource.sources.push({ ...repeatedSource.sources[0], status: 'withdrawn' });
  assert.equal(createReviewedKnowledge({ loadPack: () => repeatedSource }).snapshot().chunks.length, 0);
  const repeatedChunk = pack();
  repeatedChunk.chunks.push({ ...repeatedChunk.chunks[0], sha256: '0'.repeat(64) });
  assert.equal(createReviewedKnowledge({ loadPack: () => repeatedChunk }).snapshot().chunks.length, 0);
});

test('snapshots resist tampering and retrieval rejects forged snapshots', () => {
  const knowledge = createReviewedKnowledge({ loadPack: pack });
  const snapshot = knowledge.snapshot();
  assert.throws(() => { snapshot.chunks[0].text = 'untrusted'; }, TypeError);
  assert.throws(() => { snapshot.chunks.push({ text: 'untrusted' }); }, TypeError);
  assert.throws(() => knowledge.search({ ...snapshot }, { query: '数据', career: 'DATA_ANALYST' }), TypeError);
});

test('stable ties use chunk IDs and digest tracks review and source content changes', () => {
  const input = pack();
  input.chunks.push({ ...input.chunks[0], id: 'a-chunk' });
  const knowledge = createReviewedKnowledge({ loadPack: () => input });
  const first = knowledge.snapshot();
  assert.deepEqual(knowledge.search(first, { query: '数据', career: 'DATA_ANALYST', limit: 2 }).map((item) => item.id), ['a-chunk', 'test-chunk']);
  input.sources[0].reviewer = 'another-synthetic-test-reviewer';
  const second = knowledge.snapshot();
  assert.notEqual(first.digest, second.digest);
  input.sources[0].content += '追加内容';
  assert.notEqual(second.digest, knowledge.snapshot().digest);
});

test('invalid packs do not publish partially valid content', () => {
  for (const input of [null, {}, { ...pack(), version: '' }, { ...pack(), sources: null }]) {
    const knowledge = createReviewedKnowledge({ loadPack: () => input });
    assert.deepEqual(knowledge.snapshot().chunks, []);
  }
});
