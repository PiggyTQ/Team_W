import fs from 'node:fs/promises';
import {createHash} from 'node:crypto';
const sourceText=await fs.readFile('src/i18n/source-copy.json','utf8'),source=JSON.parse(sourceText);
const catalog=JSON.parse(await fs.readFile('src/i18n/site-complete-en.json','utf8')),reviewed=JSON.parse(await fs.readFile('src/i18n/reviewed-en.json','utf8'));
const entries={...catalog,...reviewed};
const lines=source.map((text,id)=>{
  const value=entries[text]||text;
  if(!entries[text]&&!/^[/？?]/.test(text)&&!/(?:^|[/\\])[^\s]*\.(?:png|jpg|svg|glb|gltf|csv|json|md)(?:$|[?#])/.test(text))throw Error('Missing source copy: '+text);
  return id+'|'+value.replaceAll('\r','').replaceAll('\n','\\n');
});
await fs.writeFile('src/i18n/en.tsv',lines.join('\n')+'\n');
await fs.writeFile('src/i18n/manifest.json',JSON.stringify({sourceStrings:source.length,translatedStrings:source.length,displayEntries:Object.keys(entries).length,sourceSHA256:createHash('sha256').update(sourceText).digest('hex'),reviewedOverrides:Object.keys(reviewed).length,contentManifest:'checks/全站双语_20261028/translation-manifest.json'},null,2)+'\n');
console.log('Finalized bilingual source index: '+source.length+' stable IDs');
