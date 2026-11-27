import cases from './content/career-growth-collaboration-20261127.json' with {type:'json'};
export const CAREER_GROWTH_VERSION='career-growth-collaboration-20261127';
export const careerGrowthIds=Object.keys(cases);
export function careerGrowthCase(id,language='zh'){
 if(!Object.hasOwn(cases,id))return null;
 const translate=value=>Array.isArray(value)?value.length===2&&value.every(v=>typeof v==='string')?value[language==='en'?1:0]:value.map(translate):value&&typeof value==='object'?Object.fromEntries(Object.entries(value).map(([k,v])=>[k,translate(v)])):value;
 return {id,version:CAREER_GROWTH_VERSION,...translate(cases[id])};
}
