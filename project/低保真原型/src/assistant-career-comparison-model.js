import {careerText} from './career-exploration-model.js';

export const assistantComparisonModes=['work','outputs','starting'];
export const comparisonMode=value=>assistantComparisonModes.includes(value)?value:'work';

// Read only the public snapshot supplied for this discussion. Never substitute
// a newer profile by looking up the selected career id in the local catalog.
export function discussionCareerProfile(items,id,language='zh'){
 const original=items.find(row=>row.ref?.kind==='career'&&row.ref?.id===id&&row.ref?.part==='profile')?.publicContent;
 if(!id||!original||typeof original!=='object'||Array.isArray(original)||original.id&&original.id!==id)return null;
 const localize=value=>typeof value==='string'?careerText(value,language):Array.isArray(value)?value.map(localize):value&&typeof value==='object'?Object.fromEntries(Object.entries(value).map(([key,item])=>[key,localize(item)])):value;
 return localize(original);
}

export function sameCasePracticeRoute(id){
 return '/careers?career='+encodeURIComponent(id)+'&section=practice';
}

export function hasDetailedComparison(profile,mode){
 if(!profile)return false;
 if(mode==='outputs')return Boolean(Array.isArray(profile.deliverables)&&profile.deliverables[0]?.example?.kind);
 if(mode==='starting')return Boolean(profile.practice&&typeof profile.practice==='object'&&!Array.isArray(profile.practice)&&typeof profile.practice.input==='string'&&Array.isArray(profile.practice.steps)&&Array.isArray(profile.practice.checks));
 return Boolean(profile.case&&Array.isArray(profile.workflow)&&profile.workflow.length>0);
}
