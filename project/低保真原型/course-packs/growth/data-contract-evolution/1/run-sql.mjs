import fs from 'node:fs/promises';
import assert from 'node:assert/strict';
import {DatabaseSync} from 'node:sqlite';
const fixture=JSON.parse(await fs.readFile(new URL('./input/fixture.json',import.meta.url),'utf8'));
const tables={...fixture};
if(fixture.versions)tables.version_rows=fixture.versions.flatMap(v=>v.rows.map(r=>({...r,version:v.version,unit:v.unit})));
const db=new DatabaseSync(':memory:');
for(const [name,rows] of Object.entries(tables)){
 if(!Array.isArray(rows)||!rows.length||typeof rows[0]!=='object')continue;
 const columns=[...new Set(rows.flatMap(r=>Object.keys(r)))].filter(k=>rows.every(r=>r[k]===undefined||r[k]===null||['string','number','boolean'].includes(typeof r[k])));
 if(['history','increment'].includes(name))for(const key of ['cents','amount_cents'])if(!columns.includes(key))columns.push(key);
 db.exec('CREATE TABLE "'+name+'" ('+columns.map(c=>'"'+c+'"').join(',')+')');
 const insert=db.prepare('INSERT INTO "'+name+'" VALUES('+columns.map(()=>'?').join(',')+')');
 for(const row of rows)insert.run(...columns.map(c=>row[c]??null));
}
const query=await fs.readFile(new URL(process.argv.includes('--reference')?'./reference/query.sql':'./query.sql',import.meta.url),'utf8');
const rows=db.prepare(query).all().map(r=>({...r}));
const expected=JSON.parse(await fs.readFile(new URL('./reference/sql-rows.json',import.meta.url),'utf8'));
assert.deepEqual(rows,expected);
await fs.writeFile(new URL('./sql-result.json',import.meta.url),JSON.stringify(rows,null,2));
console.log(JSON.stringify({status:'passed',runtime:process.version,rows:rows.length,scope:'Actual SQLite query over the supplied synthetic tables'}));
db.close();
