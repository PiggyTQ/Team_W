import fs from 'node:fs';
import path from 'node:path';
import {pathToFileURL} from 'node:url';
const root=path.resolve(process.argv[2]||'.');
const source=fs.readFileSync(path.join(root,'src/auth-contract.js'),'utf8');
const {authMessage}=await import(pathToFileURL(path.join(root,'src/auth-contract.js')).href);
const file=path.join(root,'src/i18n/agent-en.json'),copy=JSON.parse(fs.readFileSync(file,'utf8'));
const codes=[...source.matchAll(/^\s+(AI_[A-Z0-9_]+):\[/gm)].map(m=>m[1]);let added=0;
for(const code of codes){const zh=authMessage(code,'zh'),en=authMessage(code,'en');if(!copy[zh])added++;copy[zh]=en;}
fs.writeFileSync(file,JSON.stringify(copy,null,2)+'\n');
console.log(JSON.stringify({aiErrorCodes:codes.length,translationsAdded:added,globalTranslationFilesChanged:false}));
