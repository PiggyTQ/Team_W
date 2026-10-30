import fs from 'node:fs';
import {authMessage} from '../src/auth-contract.js';
const source=fs.readFileSync('src/auth-contract.js','utf8'),file='src/i18n/agent-en.json',copy=JSON.parse(fs.readFileSync(file,'utf8'));
let added=0;
for(const [,code]of source.matchAll(/^\s+([A-Z][A-Z0-9_]+):\[/gm)){
  const zh=authMessage(code,'zh');if(!copy[zh]){copy[zh]=authMessage(code,'en');added++;}
}
const labels={'已保存此版本对应的自检记录，未独立核验。':'The self-check for this version is saved. It has not been independently verified.','保存本人行动记录':'Save my action record','冻结输入并建立报告草稿':'Freeze inputs and create a report draft','我了解缺项和资料范围，创建带明确缺项的草稿。':'I understand the missing information and data scope, and want a draft that states those gaps.'};
for(const [zh,en]of Object.entries(labels))if(!copy[zh]){copy[zh]=en;added++;}
fs.writeFileSync(file,JSON.stringify(copy,null,2)+'\n');console.log(JSON.stringify({translationsAdded:added}));
