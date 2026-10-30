import {spawn} from 'node:child_process';
import {createInterface} from 'node:readline';
const p=spawn(process.execPath,['.deploy-cache/_npx/1754c0e0ba65ba82/node_modules/@cloudbase/cloudbase-mcp/dist/cli.cjs'],{stdio:['pipe','pipe','pipe']});
let id=0;const pending=new Map();const lines=createInterface({input:p.stdout});
lines.on('line',line=>{let msg;try{msg=JSON.parse(line)}catch{return;}if(msg.id&&pending.has(msg.id)){pending.get(msg.id)(msg);pending.delete(msg.id)}});
const send=(method,params)=>new Promise(resolve=>{const n=++id;pending.set(n,resolve);p.stdin.write(JSON.stringify({jsonrpc:'2.0',id:n,method,params})+'\n')});
const timer=setTimeout(()=>{console.error('MCP timed out');p.kill();process.exit(1)},45000);
try{await send('initialize',{protocolVersion:'2024-11-05',capabilities:{},clientInfo:{name:'prototype-cloudbase-deploy',version:'1.0.0'}});p.stdin.write(JSON.stringify({jsonrpc:'2.0',method:'notifications/initialized'})+'\n');const r=await send('tools/list',{});console.log(JSON.stringify(r.result?.tools?.map(t=>/auth|env/i.test(t.name)?t:{name:t.name})||r));}finally{clearTimeout(timer);p.kill();}
