import {careerDetailContent} from './career-detail-content.js';

export const puzzleCell = {width: 176, height: 126, columns: 3};

export function capabilitySkills(careerId) {
  const content = Object.hasOwn(careerDetailContent, careerId) ? careerDetailContent[careerId] : careerDetailContent.data;
  return content.skills.flatMap(group => group.items.map(name => ({id: name, name, level: group.label, description: group.application})));
}

const knownSkills = new Set(Object.keys(careerDetailContent).flatMap(id => capabilitySkills(id).map(skill => skill.id)));
export function capabilityMastery(preferences = {}) {
  const saved = preferences?.capabilityMastery;
  if (!saved || typeof saved !== 'object' || Array.isArray(saved)) return {};
  return Object.fromEntries(Object.entries(saved).filter(([id, value]) => knownSkills.has(id) && typeof value === 'boolean'));
}

export function setCapabilityMastery(preferences = {}, id, mastered) {
  if (!knownSkills.has(id) || typeof mastered !== 'boolean') return preferences;
  return {...preferences, capabilityMastery: {...capabilityMastery(preferences), [id]: mastered}};
}

function edge(x, y, endX, endY, sign, trim = 0) {
  const length = Math.hypot(endX - x, endY - y), dx = (endX - x) / length, dy = (endY - y) / length, middle = length / 2;
  const point = (along, depth) => `${x + dx * along + dy * depth * sign} ${y + dy * along - dx * depth * sign}`;
  const end = point(length - trim, 0);
  if (!sign) return ` L ${end}`;
  return ` L ${point(middle - 11, 0)} C ${point(middle - 5, 0)} ${point(middle - 5, 3)} ${point(middle - 9, 7)}`
    + ` C ${point(middle - 25, 28)} ${point(middle + 25, 28)} ${point(middle + 9, 7)}`
    + ` C ${point(middle + 5, 3)} ${point(middle + 5, 0)} ${point(middle + 11, 0)} L ${end}`;
}

// Opposing edges share the same boundary; changing a status never moves a piece.
export function puzzlePiecePath(row, column, rows = 3, columns = 3) {
  const {width: w, height: h} = puzzleCell;
  const right = (r, c) => (r + c) % 2 === 0 ? 1 : -1;
  const bottom = (r, c) => -right(r, c);
  // Keep connector curves unchanged; round only the straight edges at each corner.
  const tl = row === 0 && column === 0 ? 14 : 5;
  const tr = row === 0 && column === columns - 1 ? 14 : 5;
  const br = row === rows - 1 && column === columns - 1 ? 14 : 5;
  const bl = row === rows - 1 && column === 0 ? 14 : 5;
  return `M ${tl} 0`
    + edge(0, 0, w, 0, row ? -bottom(row - 1, column) : 0, tr) + ` Q ${w} 0 ${w} ${tr}`
    + edge(w, 0, w, h, column < columns - 1 ? right(row, column) : 0, br) + ` Q ${w} ${h} ${w - br} ${h}`
    + edge(w, h, 0, h, row < rows - 1 ? bottom(row, column) : 0, bl) + ` Q 0 ${h} 0 ${h - bl}`
    + edge(0, h, 0, 0, column ? -right(row, column - 1) : 0, tl) + ` Q 0 0 ${tl} 0 Z`;
}
