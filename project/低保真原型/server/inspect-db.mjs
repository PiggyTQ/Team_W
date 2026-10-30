import {DatabaseSync} from 'node:sqlite';
import {statSync} from 'node:fs';
const path=process.env.AUTH_DATABASE||'/var/lib/career-growth/auth.sqlite';
const db=new DatabaseSync(path,{readOnly:true});
const counts={};for(const {name} of db.prepare("SELECT name FROM sqlite_master WHERE type='table' AND name NOT LIKE 'sqlite_%' ORDER BY name").all())counts[name]=db.prepare(`SELECT count(*) AS total FROM "${name.replaceAll('"','""')}"`).get().total;
const report={checkedAt:new Date().toISOString(),integrity:db.prepare('PRAGMA integrity_check').get(),foreignKeyErrors:db.prepare('PRAGMA foreign_key_check').all().length,tableCount:Object.keys(counts).length,rows:counts,databaseBytes:statSync(path).size,migrations:Object.hasOwn(counts,'schema_migrations')?db.prepare('SELECT version,name,applied_at FROM schema_migrations ORDER BY version').all():[]};
db.close();console.log(JSON.stringify(report,null,2));
