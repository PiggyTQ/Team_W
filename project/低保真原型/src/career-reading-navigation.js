export const careerReadingSections=[['overview','职业全貌','Career overview'],['work','代表案例','Representative case'],['preparation','能力与准备','Preparation'],['growth','成长与协作','Growth and collaboration'],['practice','入门体验','First practice'],['sources','来源与范围','Sources and scope']];
const valid=id=>careerReadingSections.some(([key])=>key===id);
export function readingAnchorSection(hash=''){
 const id=hash.replace(/^#/,'');
 if(id.startsWith('career-source-'))return 'sources';
 if(id==='career-deliverables')return 'work';
 if(id.startsWith('trial-source-'))return 'practice';
 return careerReadingSections.find(([key])=>id==='career-'+key)?.[0]||null;
}
export function careerReadingPosition(url){
 const parsed=new URL(url,'https://avemly.invalid'),section=parsed.searchParams.get('section');
 return {active:readingAnchorSection(parsed.hash)||(valid(section)?section:'overview'),hash:parsed.hash,invalidSection:Boolean(section&&!valid(section))};
}
export function careerReadingSectionUrl(url,section,hash=''){
 const next=new URL(url,'https://avemly.invalid');
 next.searchParams.set('section',valid(section)?section:'overview');
 next.hash=hash;
 return next.pathname+next.search+next.hash;
}
