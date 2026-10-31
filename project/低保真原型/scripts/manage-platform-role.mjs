// Operator CLI only; role assignment is intentionally absent from public APIs.
import {DatabaseSync} from 'node:sqlite';
import {randomUUID} from 'node:crypto';
import {createPlatformAdmin,platformRoles} from '../server/platform-admin.mjs';
const [mode,userId,role]=process.argv.slice(2),database=process.env.AUTH_DATABASE;
if(!database||!['grant','revoke','list'].includes(mode)||!userId||mode!=='list'&&!platformRoles.includes(role))throw Error('Usage: AUTH_DATABASE=<path> node scripts/manage-platform-role.mjs grant|revoke|list <user-id> [editor|reviewer|publisher|operator]');
const db=new DatabaseSync(database);db.exec('PRAGMA foreign_keys=ON');const admin=createPlatformAdmin({db});
try{if(!db.prepare('SELECT 1 FROM users WHERE id=?').get(userId))throw Error('USER_NOT_FOUND');
 if(mode!=='list'){db.exec('BEGIN IMMEDIATE');try{if(mode==='grant')db.prepare('INSERT OR IGNORE INTO platform_roles VALUES(?,?)').run(userId,role);else db.prepare('DELETE FROM platform_roles WHERE user_id=? AND role=?').run(userId,role);db.prepare('INSERT INTO platform_audit VALUES(?,NULL,?,?,?)').run(randomUUID(),'role.'+mode,userId+':'+role,Date.now());db.exec('COMMIT');}catch(e){db.exec('ROLLBACK');throw e;}}
 console.log(JSON.stringify({userId,roles:admin.roles(userId)}));
}finally{db.close();}
