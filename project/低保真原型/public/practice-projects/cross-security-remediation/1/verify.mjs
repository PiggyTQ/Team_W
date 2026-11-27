import fs from 'node:fs/promises';
import assert from 'node:assert/strict';
const reference=process.argv.includes('--reference');
const {solve}=await import(process.argv.includes('--counterexample')?'./reference/broken.mjs':process.argv.includes('--counterexample')?'./reference/broken.mjs':process.argv.includes('--counterexample')?'./reference/broken.mjs':reference?'./reference/solution.mjs':'./solution.mjs');
const input=JSON.parse(await fs.readFile(new URL('./input/fixture.json',import.meta.url),'utf8'));
const expected=JSON.parse(await fs.readFile(new URL('./reference/result.json',import.meta.url),'utf8'));
if(!reference&&input.rule){input.rule=JSON.parse(await fs.readFile(new URL('./rules.json',import.meta.url),'utf8'));}
const actual=await solve(structuredClone(input));
assert.deepEqual(actual,expected,'Result must include every ID, boundary, permission and value.');
await fs.writeFile(new URL('./result.json',import.meta.url),JSON.stringify(actual,null,2));
console.log(JSON.stringify({status:'passed',scope:'local learner execution, self-reported to Avemly',runtime:process.version,project:"cross-security-remediation",version:1,executedAt:new Date().toISOString()}));
