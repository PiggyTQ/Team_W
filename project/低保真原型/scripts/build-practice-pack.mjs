import {mkdirSync, readFileSync, readdirSync, writeFileSync} from 'node:fs';
import {validatePracticeProject} from '../src/practice-project-schema.js';
import {packRoot, sha256} from './practice-pack-common.mjs';
import {quality} from './practice-pack-quality.mjs';
import {ai} from './practice-pack-ai.mjs';
import {log} from './practice-pack-log.mjs';
import {restore} from './practice-pack-restore.mjs';

const check = process.argv.includes('--check');
const oldRoot = new URL('../../资料收集/展示资料包_20261027/', import.meta.url);
const legacy = JSON.parse(readFileSync(new URL('catalog-ready.json', oldRoot), 'utf8')).courses;
const projects = [quality, ai, log, restore];
const entries = new Map();
const json = value => JSON.stringify(value, null, 2) + '\n';
const csv = value => '"' + String(value).replaceAll('"', '""') + '"';
const write = (file, body) => {
  const url = new URL(file, packRoot);
  if (check) {
    const current = readFileSync(url, 'utf8');
    if (current !== body) throw new Error('Out-of-date practice pack file: ' + file);
  } else {
    mkdirSync(new URL('.', url), {recursive: true});
    writeFileSync(url, body);
  }
  if (file !== 'file-manifest.json') entries.set(file, body);
};
const register = file => {
  const url = new URL(file, packRoot);
  const body = readFileSync(url, 'utf8');
  const normalized = body.replace(/\r\n/g, '\n');
  if (body !== normalized) {
    if (check) throw new Error('Practice pack files must use LF: ' + file);
    writeFileSync(url, normalized);
  }
  entries.set(file, normalized);
};
register('quality/dft-source.csv');
register('quality/source-receipt.json');
if (sha256(entries.get('quality/dft-source.csv')) !== quality.provenance.sampleSha256) {
  throw new Error('Official data extract does not match its receipt');
}

const sources = [['source_id', 'title', 'publisher', 'url', 'accessed_on', 'kind', 'project', 'use_zh', 'use_en']];
const courses = [];
for (const project of projects) {
  validatePracticeProject(project, {id: project.id, version: 2, career: project.career});
  const root = project.id + '/';
  const old = legacy.find(course => course.id === project.id);
  const video = project.sources.find(source => source.kind === 'video');
  const releaseNotes = project.steps.map(step => '## ' + step.title.zh + '\n\n' + step.assignment.zh).join('\n\n');
  const overview = [
    '# ' + project.title.zh, project.brief.zh, project.outcome.zh, project.boundary.zh,
    '## 原始出处', ...project.sources.map(source => '- [' + source.title + '](' + source.url + ') · ' + source.publisher)
  ].join('\n\n') + '\n';
  const rubric = project.steps.map(step => '- ' + step.title.zh + ' · ' + step.check.zh).join('\n') + '\n';
  write(root + 'project.json', json(project));
  write(root + 'course.md', overview);
  write(root + 'practice/task.md', releaseNotes + '\n');
  write(root + 'practice/rubric.md', rubric);
  write(root + 'reference/reading-notes.md', project.reference.zh + '\n');
  const worksheet = [
    ['row_id', ...project.dataset.columns.map(column => column.id)],
    ...project.dataset.rows.map(row => [row.id, ...row.cells.map(cell => typeof cell === 'string' ? cell : cell.en)])
  ].map(line => line.map(csv).join(',')).join('\n') + '\n';
  write(root + 'practice/input/worksheet.csv', worksheet);
  if (project.id === 'quality') {
    // Register the original public extract in the course's download section.
    write(root + 'practice/input/dft-source.csv', entries.get(root + 'dft-source.csv'));
    write(root + 'practice/input/source-receipt.json', entries.get(root + 'source-receipt.json'));
  }
  for (const source of project.sources) {
    sources.push([source.id, source.title, source.publisher, source.url, source.checkedOn, source.kind, project.id, source.use.zh, source.use.en]);
  }
  const chapters = project.reading.map((chapter, index) => {
    const body = chapter.body.zh + '\n';
    write(root + 'chapters/' + String(index + 1).padStart(2, '0') + '.md', body);
    return {id: project.id + '-chapter-' + (index + 1), ordinal: index + 1, title: chapter.title.zh, body};
  });
  courses.push({
    id: project.id, career_id: project.career, title: project.title.zh, content_version: project.version,
    introduction: overview, practice_path: root + 'practice/task.md', reference_path: root + 'reference/reading-notes.md',
    project_path: root + 'project.json', source_ids: project.sources.map(source => source.id), chapters,
    videos: [{
      ...old.videos[0], title: video.title, provider: video.publisher, source_url: video.url,
      viewing_guide_zh: video.use.zh, duration_seconds: null, playback_verified: false
    }]
  });
}
write('sources.csv', sources.map(line => line.map(csv).join(',')).join('\n') + '\n');
write('来源说明.md', [
  '# 教学项目资料说明',
  '四套项目正文、工单、事件记录与提示由本项目编写。机构原文通过链接查阅。',
  '数据质量项目的原始摘录来自英国交通部 STATS19 2024 碰撞数据，含 Crown copyright 数据，适用 Open Government Licence v3.0。采集地址、文件指纹、筛选规则及许可见 quality/source-receipt.json。',
  '练习工作表加入教学问题。AI 评测、安全日志和故障恢复的数据是原创教学数据。视频仅提供外链。',
  '案例来源和每一步使用目的见 sources.csv 及各项目的阅读页。'
].join('\n\n') + '\n');
write('catalog-ready.json', json({schemaVersion: 2, courses}));
const manifest = [...entries.keys()].sort().map(file => ({
  path: file, bytes: Buffer.byteLength(entries.get(file)), sha256: sha256(entries.get(file))
}));
write('file-manifest.json', json({files: manifest}));
if (check) {
  const expected = new Set([...entries.keys(), 'file-manifest.json']);
  const actual = readdirSync(packRoot, {recursive: true, withFileTypes: true}).filter(row => row.isFile());
  if (actual.length !== expected.size) throw new Error('Unexpected files in practice pack');
}
console.log(JSON.stringify({courses: courses.length, chapters: courses.length * 4, sources: sources.length - 1, files: manifest.length, checked: check}));
