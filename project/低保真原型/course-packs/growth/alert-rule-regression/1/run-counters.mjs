import fs from 'node:fs/promises';
import assert from 'node:assert/strict';
import {solve} from './reference/solution.mjs';
const input=JSON.parse(await fs.readFile(new URL('./input/counter-reset.json',import.meta.url),'utf8'));
const result=solve(input);
assert.deepEqual(result.map(r=>r.firing),[false,false,true,false,false,false,false,false]);
assert.equal(result[3].rate,null);assert.equal(result[4].rate,0.01);assert.equal(result[6].rate,null);assert.equal(result[7].rate,null);
console.log(JSON.stringify({scope:'Actual original Node rule evaluator, not PromQL or promtool',runtime:process.version,result}));
