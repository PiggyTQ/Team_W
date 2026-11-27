// Freeze local trial snapshots after author reproduction. This is not publication or human review.
import fs from 'node:fs/promises';
import {maintainContent} from './practice-content.mjs';
const catalog=JSON.parse(await fs.readFile('course-packs/growth/catalog.json','utf8'));
for(const p of catalog.projects.filter(p=>!p.legacy)){
 await maintainContent({action:'candidate',id:p.id,version:p.version});
 await maintainContent({action:'source-review',id:p.id,version:p.version});
 await maintainContent({action:'technical',id:p.id,version:p.version});
 await maintainContent({action:'freeze',id:p.id,version:p.version});
}
console.log('32 local trial snapshots frozen. Human content review, pilot, maintainer assignment and public redistribution remain pending.');
