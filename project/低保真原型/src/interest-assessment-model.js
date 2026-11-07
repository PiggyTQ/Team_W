export const interestGroups = Object.freeze([
  {
    id: 'NT',
    name: '理性探索型',
    keywords: '思考 · 创新 · 解题',
    title: '喜欢思考、创新和解决复杂问题',
    types: ['INTJ', 'INTP', 'ENTJ', 'ENTP'],
    description: '喜欢研究新技术、制定方案和解决难题，享受逻辑推演与创新带来的成就感。',
    preference: '更喜欢有思考空间、可以尝试新方法的任务。',
    interests: ['科研', '技术研发', '战略规划', '产品创新'],
  },
  {
    id: 'NF',
    name: '价值协作型',
    keywords: '意义 · 成长 · 关系',
    title: '喜欢创造价值、理解他人和建立联系',
    types: ['INFJ', 'INFP', 'ENFJ', 'ENFP'],
    description: '关注工作的意义、个人成长与人际关系，喜欢有创造性、能帮助他人的事情。',
    preference: '更喜欢交流想法、理解需求，并与他人一起创造价值。',
    interests: ['教育', '心理咨询', '创意策划', '用户研究'],
  },
  {
    id: 'SJ',
    name: '秩序执行型',
    keywords: '目标 · 秩序 · 计划',
    title: '喜欢明确目标、稳定秩序和落实计划',
    types: ['ISTJ', 'ISFJ', 'ESTJ', 'ESFJ'],
    description: '喜欢明确的目标、清晰的流程和可预期的安排，愿意把计划一步步落实。',
    preference: '更喜欢分工明确、结果稳定、能持续积累的任务。',
    interests: ['项目管理', '运营', '行政', '财务', '质量管理'],
  },
  {
    id: 'SP',
    name: '灵活实践型',
    keywords: '动手 · 反馈 · 应变',
    title: '喜欢动手实践、即时反馈和灵活应变',
    types: ['ISTP', 'ISFP', 'ESTP', 'ESFP'],
    description: '喜欢边做边学，享受变化、动手尝试和及时反馈，愿意灵活应对现场问题。',
    preference: '更喜欢可以快速看到结果、留有发挥空间的任务。',
    interests: ['设计创作', '现场技术', '活动执行', '商业拓展'],
  },
]);

export const getInterestGroup = value => interestGroups.find(group => group.id === value) || null;

// Brief editorial keywords based on the Myers & Briggs Foundation type overview.
// Source and scope are documented in the third-version design record.
export const interestTraits = Object.freeze({
  INTJ: ['独立思考', '长远规划', '善于分析'],
  INTP: ['理性好奇', '逻辑探索', '乐于解题'],
  ENTJ: ['果断组织', '目标导向', '统筹推进'],
  ENTP: ['机敏创新', '喜欢挑战', '善于联想'],
  INFJ: ['关注意义', '善于洞察', '坚定理想'],
  INFP: ['重视价值', '富有想象', '真诚共情'],
  ENFJ: ['关心他人', '善于沟通', '鼓励成长'],
  ENFP: ['热情好奇', '想象丰富', '灵活开放'],
  ISTJ: ['务实可靠', '条理清晰', '重视责任'],
  ISFJ: ['体贴细致', '认真负责', '注重关怀'],
  ESTJ: ['务实果断', '组织有序', '注重执行'],
  ESFJ: ['热心合作', '关注他人', '讲求协调'],
  ISTP: ['冷静观察', '动手探索', '灵活应变'],
  ISFP: ['温和友善', '重视体验', '随性灵活'],
  ESTP: ['灵活务实', '乐于行动', '善于应变'],
  ESFP: ['热情友好', '享受当下', '乐于合作'],
});

export function getInterestType(value) {
  const group = interestGroups.find(item => item.types.includes(value));
  return group ? {id: value, group} : null;
}
