// Extract only committed site copy. Account records are never read by this tool.
import fs from 'node:fs/promises';
import path from 'node:path';
import {transform} from 'esbuild';
import {getEnglishTranslations} from '../src/i18n/render.js';
const known=getEnglishTranslations(),strings=new Set(JSON.parse(await fs.readFile('src/i18n/source-copy.json','utf8')));
async function scan(dir){for(const entry of await fs.readdir(dir,{withFileTypes:true})){
  const name=path.join(dir,entry.name);if(entry.isDirectory()){if(entry.name!=='i18n')await scan(name);continue;}
  if(/\.(jsx|js)$/.test(name)){
    const {code}=await transform(await fs.readFile(name,'utf8'),{loader:name.endsWith('jsx')?'jsx':'js',charset:'utf8',supported:{'template-literal':false}});
    for(const match of code.matchAll(/"(?:[^"\\]|\\.)*"/g))try{const s=JSON.parse(match[0].replace(/\\x([\da-f]{2})/gi,'\\u00$1'));if(/[\u3400-\u9fff]/.test(s))strings.add(s);}catch{}
  }else if(name.endsWith('.json')){const walk=x=>{if(typeof x==='string'&&/[\u3400-\u9fff]/.test(x))strings.add(x);else if(x&&typeof x==='object')Object.values(x).forEach(walk);};walk(JSON.parse(await fs.readFile(name,'utf8')));}
}}
await scan('src');
const values=[...strings].filter(s=>!/^[/？?]/.test(s)&&!/(?:^|[/\\])[^\s]*\.(?:png|jpg|svg|glb|gltf|csv|json|md)(?:$|[?#])/.test(s));
const missing=values.filter(x=>!known[x]);
if(process.argv.includes('--check')){
  if(missing.length)throw Error('Missing complete English translations: '+JSON.stringify(missing));
}else await fs.writeFile('checks/全站双语_20261028/site-copy-input.json',JSON.stringify({known,strings:values}));
console.log(JSON.stringify({siteStrings:values.length,exactMissing:missing.length}));
