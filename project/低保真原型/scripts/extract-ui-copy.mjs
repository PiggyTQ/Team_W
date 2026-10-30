import fs from 'node:fs/promises';
import path from 'node:path';
import {transform} from 'esbuild';
const strings=new Set();
for(const file of await fs.readdir('src')){
  if(!/\.(jsx|js)$/.test(file))continue;
  const source=await fs.readFile(path.join('src',file),'utf8');
  const {code}=await transform(source,{loader:file.endsWith('jsx')?'jsx':'js',charset:'utf8',supported:{'template-literal':false}});
  for(const match of code.matchAll(/"(?:[^"\\]|\\.)*"/g)){
    try{const value=JSON.parse(match[0].replace(/\\x([\da-f]{2})/gi,'\\u00$1'));if(/[\u3400-\u9fff]/.test(value))strings.add(value);}catch{}
  }
}
const list=[...strings].sort((a,b)=>a.length-b.length||a.localeCompare(b,'zh-CN'));
await fs.mkdir('src/i18n',{recursive:true});
// Append only: existing numeric translation IDs must never be re-sorted.
let existing=[];try{existing=JSON.parse(await fs.readFile('src/i18n/source-copy.json','utf8'));}catch{}
const merged=[...existing,...list.filter(value=>!existing.includes(value))];
await fs.writeFile('src/i18n/source-copy.json',JSON.stringify(merged,null,2));
console.log(JSON.stringify({strings:list.length,characters:list.join('').length,short:list.filter(s=>s.length<12).length}));
