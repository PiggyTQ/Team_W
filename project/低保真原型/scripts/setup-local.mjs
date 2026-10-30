import {existsSync,mkdirSync} from 'node:fs';
import {resolve} from 'node:path';
import {execFileSync} from 'node:child_process';

// Never initialize or replace a developer's existing account store.
const database=resolve('server/data/auth.sqlite');
if(existsSync(database))throw new Error('Local account database already exists; initialization stopped without replacing it.');
process.env.AI_ENABLED='0';
process.env.MAIL_ENABLED='0';
process.env.BACKUP_REMOTE_ENABLED='0';
mkdirSync('server/data',{recursive:true});
const catalog=resolve('server/data/knowledge.sqlite');
if(!existsSync(catalog))execFileSync(process.argv[2]||'python',['scripts/build-demo-knowledge.py','--output',catalog],{stdio:'inherit'});
const {createAuthServer}=await import('../server/auth-server.mjs');
const server=await createAuthServer({database,knowledgeDatabase:catalog,origin:'http://127.0.0.1:5184',production:false});
await new Promise(resolve=>server.listen(0,'127.0.0.1',resolve));
await new Promise((resolve,reject)=>server.close(error=>error?reject(error):resolve()));
const {DatabaseSync}=await import('node:sqlite');
const {importCoursePack}=await import('../server/course-library.mjs');
const db=new DatabaseSync(database);
try{
  db.exec('PRAGMA foreign_keys=ON;');
  importCoursePack(db,resolve('../资料收集/展示资料包_20261027'));
  if(db.prepare('PRAGMA integrity_check').get().integrity_check!=='ok')throw new Error('Local database integrity check failed');
  console.log('Local catalog and four courses initialized. AI and external services remain disabled.');
}finally{db.close();}
