import fs from 'node:fs/promises';
import {createHash} from 'node:crypto';
const sourceText=await fs.readFile('src/i18n/source-copy.json','utf8');
const source=JSON.parse(sourceText),catalog={},seen=new Set();
for(const line of (await fs.readFile('src/i18n/en.tsv','utf8')).trimEnd().split(/\r?\n/)){
  const separator=line.indexOf('|'),id=Number(line.slice(0,separator)),english=line.slice(separator+1).replace(/\\n/g,'\n');
  if(separator<1||!Number.isInteger(id)||!source[id]||seen.has(id)||!english.trim())throw Error('Invalid translation: '+line);
  seen.add(id);
  if(!source[id].startsWith('/')&&!source[id].startsWith('?'))catalog[source[id]]=english;
}
if(seen.size!==source.length)throw Error(`Translation coverage ${seen.size}/${source.length}`);
await fs.writeFile('src/i18n/catalog.json',JSON.stringify(catalog,null,2));
await fs.writeFile('src/i18n/manifest.json',JSON.stringify({sourceStrings:source.length,translatedStrings:seen.size,displayEntries:Object.keys(catalog).length,sourceSHA256:createHash('sha256').update(sourceText).digest('hex')},null,2));
console.log(`Translated ${seen.size}/${source.length} source strings; generated ${Object.keys(catalog).length} display entries.`);
