import fs from 'node:fs/promises';
import path from 'node:path';

export const selectedProject=process.argv.includes('--project')?process.argv[process.argv.indexOf('--project')+1]:null;
export const selectedForAuthoring=p=>!p.legacy&&(!selectedProject||p.id===selectedProject);
export async function assertUnfrozen(projects){
 const selected=projects.filter(selectedForAuthoring);
 if(!selected.length)throw Error('NO_PROJECT_SELECTED');
 let state;try{state=JSON.parse(await fs.readFile(path.resolve('course-packs/growth-maintenance.json'),'utf8'));}catch(error){if(error.code==='ENOENT')return;throw error;}
 for(const p of selected)if(state.items[p.id+':'+p.version]?.frozen)throw Error('FROZEN_VERSION: create a new revision before authoring '+p.id+':'+p.version);
}
