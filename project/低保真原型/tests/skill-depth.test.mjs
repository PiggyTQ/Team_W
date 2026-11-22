import test from 'node:test';
import assert from 'node:assert/strict';
import depths from '../src/i18n/skill-depth.json' with {type:'json'};
import curriculum from '../src/i18n/skill-learning-curriculum.json' with {type:'json'};
import labs from '../src/i18n/skill-depth-labs.json' with {type:'json'};
import {DatabaseSync} from 'node:sqlite';

test('all career skills have individual bilingual teaching, new worked scenarios and scoped checks',()=>{
 assert.deepEqual(Object.keys(depths).sort(),Object.keys(curriculum).sort());
 for(const field of ['concept','method','example','verify','limits']){
  assert.equal(new Set(Object.values(depths).map(d=>d[field][0])).size,123);
  for(const [key,d] of Object.entries(depths)){
   assert.ok(d[field].length===2&&d[field].every(t=>t.trim().length>0),key+':'+field);
   if(field==='example')for(const t of d[field])assert.equal(t.split('^').length,3,key);
  }
 }
});
test('SQL teaching exposes join inflation, preserves unmatched rows and distinguishes ON/WHERE',()=>{
 const db=new DatabaseSync(':memory:');
 try{
  db.exec(labs['data:sql-joins'].code);
  assert.deepEqual(Object.values(db.prepare('SELECT COUNT(*),SUM(order_amount) FROM orders o LEFT JOIN lines l ON l.order_id=o.order_id').get()),[3,220]);
  const q='SELECT o.order_id FROM orders o LEFT JOIN lines l ON l.order_id=o.order_id';
  assert.deepEqual(db.prepare(q+' AND l.line_amount>15 ORDER BY o.order_id').all().map(r=>r.order_id),['U','V']);
  assert.deepEqual(db.prepare(q+' WHERE l.line_amount>15').all().map(r=>r.order_id),['U']);
 }finally{db.close();}
});
