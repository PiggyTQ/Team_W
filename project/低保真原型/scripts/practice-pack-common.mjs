import {createHash} from 'node:crypto';

export const packRoot = new URL('../course-packs/practice-20261113/', import.meta.url);
export const pair = (zh, en) => ({zh, en});
export const chapter = (zh, en, bodyZh, bodyEn) => ({title: pair(zh, en), body: pair(bodyZh, bodyEn)});
export const source = (id, kind, publisher, title, url, zh, en) => ({
  id, kind, publisher, title, url, checkedOn: '2026-11-13', use: pair(zh, en)
});
export const choice = (id, zh, en, feedbackZh, feedbackEn) => ({
  id, label: pair(zh, en), feedback: pair(feedbackZh, feedbackEn)
});
export const column = (id, zh, en) => ({id, label: pair(zh, en)});
export const row = (id, ...cells) => ({id, cells: cells.map(cell => typeof cell === 'number' ? String(cell) : cell)});
export const step = (id, {title, assignment, impact, member, lead, question, hint, check, handoff, minEvidence, sourceIds, choices}) => ({
  id, title, assignment, impact, member, lead, question, hint, check, handoff, minEvidence, sourceIds, choices
});

export const sha256 = bytes => createHash('sha256').update(bytes).digest('hex');
