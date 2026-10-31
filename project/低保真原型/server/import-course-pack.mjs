import {DatabaseSync} from 'node:sqlite';
import {resolve} from 'node:path';
import {createBusinessStore} from './business-store.mjs';
import {COLLECTIONS} from './business-store.mjs';
import {importCoursePack} from './course-library.mjs';
import {createHash} from 'node:crypto';
const [database,root]=process.argv.slice(2);
if(!database||!root)throw new Error('Usage: node server/import-course-pack.mjs DATABASE PACK_DIRECTORY');
const db=new DatabaseSync(resolve(database));
try{
  createBusinessStore(db);
  const personalFingerprint=()=>createHash('sha256').update(JSON.stringify({users:db.prepare('SELECT id FROM users ORDER BY id').all(),workspaces:db.prepare('SELECT * FROM account_workspaces ORDER BY user_id').all(),collections:Object.fromEntries(Object.entries(COLLECTIONS).map(([key,table])=>[key,db.prepare(`SELECT user_id,id,payload_hash,object_revision FROM ${table} ORDER BY user_id,id`).all()]))})).digest('hex');
  const before=personalFingerprint(),result=importCoursePack(db,resolve(root));
  if(before!==personalFingerprint())throw new Error('Personal records unexpectedly changed');
  if(db.prepare('PRAGMA integrity_check').get().integrity_check!=='ok'||db.prepare('PRAGMA foreign_key_check').all().length)throw new Error('Database integrity check failed');
  console.log(JSON.stringify({...result,personalRecordsUnchanged:true}));
}finally{db.close();}
