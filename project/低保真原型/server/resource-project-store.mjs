import {randomUUID} from 'node:crypto';
import {normalizeResourceProject,resourceProjectError,RESOURCE_PROJECT_MAX_COUNT,RESOURCE_PROJECT_TOTAL_BYTES} from '../src/resource-project-model.js';

export function createResourceProjectStore(db,{now=Date.now}={}){
 db.exec(`CREATE TABLE IF NOT EXISTS resource_projects(user_id TEXT NOT NULL REFERENCES users(id) ON DELETE CASCADE,id TEXT NOT NULL,metadata_json TEXT NOT NULL CHECK(json_valid(metadata_json)),body BLOB NOT NULL,created_at INTEGER NOT NULL,PRIMARY KEY(user_id,id));`);
 const metadata=row=>JSON.parse(row.metadata_json);
 function list(userId){return db.prepare('SELECT metadata_json FROM resource_projects WHERE user_id=? ORDER BY created_at DESC,rowid DESC').all(userId).map(metadata);}
 function get(userId,id){const row=db.prepare('SELECT metadata_json,body FROM resource_projects WHERE user_id=? AND id=?').get(userId,id);if(!row)throw resourceProjectError('RESOURCE_PROJECT_NOT_FOUND');return {...metadata(row),body:Buffer.from(row.body)};}
 function upload(userId,input){
  const project=normalizeResourceProject(input,input.file),encoded=input.file?.base64;
  if(typeof encoded!=='string'||encoded.length!==Math.ceil(project.file.size/3)*4||!/^[A-Za-z0-9+/]*={0,2}$/.test(encoded))throw resourceProjectError('RESOURCE_PROJECT_INVALID');
  const body=Buffer.from(encoded,'base64');if(body.length!==project.file.size||body.toString('base64')!==encoded)throw resourceProjectError('RESOURCE_PROJECT_INVALID');
  const ownTransaction=!db.isTransaction;if(ownTransaction)db.exec('BEGIN IMMEDIATE');
  try{
   const usage=db.prepare('SELECT count(*) count,coalesce(sum(length(body)),0) bytes FROM resource_projects WHERE user_id=?').get(userId);
   if(usage.count>=RESOURCE_PROJECT_MAX_COUNT||usage.bytes+body.length>RESOURCE_PROJECT_TOTAL_BYTES)throw resourceProjectError('RESOURCE_PROJECT_QUOTA');
   const created=now(),record={...project,id:randomUUID(),createdAt:new Date(created).toISOString()};
   db.prepare('INSERT INTO resource_projects VALUES(?,?,?,?,?)').run(userId,record.id,JSON.stringify(record),body,created);
   if(ownTransaction)db.exec('COMMIT');return record;
  }catch(error){if(ownTransaction)db.exec('ROLLBACK');throw error;}
 }
 function remove(userId,id){const result=db.prepare('DELETE FROM resource_projects WHERE user_id=? AND id=?').run(userId,id);if(!result.changes)throw resourceProjectError('RESOURCE_PROJECT_NOT_FOUND');return {deleted:true};}
 function clear(userId){db.prepare('DELETE FROM resource_projects WHERE user_id=?').run(userId);}
 function exportData(userId){return db.prepare('SELECT metadata_json,body FROM resource_projects WHERE user_id=? ORDER BY created_at DESC,rowid DESC').all(userId).map(row=>({...metadata(row),base64:Buffer.from(row.body).toString('base64')}));}
 return {list,get,upload,remove,clear,exportData};
}
