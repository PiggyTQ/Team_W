import fs from 'node:fs/promises';
import {createLocalServer} from './local-service.mjs';
const {solve}=await import(process.argv.includes('--reference')?'./reference/solution.mjs':'./solution.mjs');
const fixture=JSON.parse(await fs.readFile(new URL('./input/fixture.json',import.meta.url),'utf8'));
let ui='';try{ui=await fs.readFile(new URL(process.argv.includes('--reference')?'./reference/ui.html':'./index.html',import.meta.url),'utf8');}catch{}
const server=createLocalServer("retry-concurrency",fixture,solve,{ui});
server.listen(0,'127.0.0.1',()=>console.log(JSON.stringify({port:server.address().port,host:'127.0.0.1'})));
