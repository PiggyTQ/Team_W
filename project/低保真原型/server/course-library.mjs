import {readFileSync,realpathSync,statSync} from 'node:fs';
import {resolve,sep,extname,basename} from 'node:path';
import {createHash,randomUUID} from 'node:crypto';

const fail=(code,status=400)=>Object.assign(new Error(code),{code,status});
const hash=value=>createHash('sha256').update(value).digest('hex');
const parse=row=>JSON.parse(row.metadata_json);
const IDS=['quality','ai-eval','log','restore'];
export function ensureCourseSchema(db,now=Date.now){
  db.exec(`CREATE TABLE IF NOT EXISTS course_versions(
    course_id TEXT NOT NULL REFERENCES courses(id),version INTEGER NOT NULL CHECK(version>0),pack_hash TEXT NOT NULL,
    overview_md TEXT NOT NULL,task_md TEXT NOT NULL,rubric_md TEXT NOT NULL,reference_md TEXT NOT NULL,
    metadata_json TEXT NOT NULL CHECK(json_valid(metadata_json)),published_at INTEGER NOT NULL,PRIMARY KEY(course_id,version));
  CREATE TABLE IF NOT EXISTS course_chapter_versions(
    course_id TEXT NOT NULL,version INTEGER NOT NULL,id TEXT NOT NULL,ordinal INTEGER NOT NULL,title TEXT NOT NULL,body TEXT NOT NULL,
    PRIMARY KEY(course_id,version,id),UNIQUE(course_id,version,ordinal),FOREIGN KEY(course_id,version) REFERENCES course_versions(course_id,version));
  CREATE TABLE IF NOT EXISTS course_video_versions(
    course_id TEXT NOT NULL,version INTEGER NOT NULL,id TEXT NOT NULL,metadata_json TEXT NOT NULL CHECK(json_valid(metadata_json)),
    PRIMARY KEY(course_id,version,id),FOREIGN KEY(course_id,version) REFERENCES course_versions(course_id,version));
  CREATE TABLE IF NOT EXISTS course_assets(
    course_id TEXT NOT NULL,version INTEGER NOT NULL,id TEXT NOT NULL,relative_path TEXT NOT NULL,filename TEXT NOT NULL,role TEXT NOT NULL,
    mime TEXT NOT NULL,sha256 TEXT NOT NULL,bytes INTEGER NOT NULL,body BLOB NOT NULL,PRIMARY KEY(course_id,version,id),
    UNIQUE(course_id,version,relative_path),FOREIGN KEY(course_id,version) REFERENCES course_versions(course_id,version));`);
  db.prepare('INSERT OR IGNORE INTO schema_migrations VALUES(?,?,?)').run(2,'Versioned published courses and authenticated material downloads',now());
}
export function importCoursePack(db,packRoot,{now=Date.now}={}){
  const root=realpathSync(resolve(packRoot));
  const read=path=>{
    if(typeof path!=='string'||path.includes('\\')||path.split('/').includes('..'))throw fail('INVALID_COURSE_PATH');
    const full=realpathSync(resolve(root,path));if(!full.startsWith(root+sep)||statSync(full).size>2*1024*1024)throw fail('INVALID_COURSE_PATH');
    return readFileSync(full);
  };
  const manifest=JSON.parse(read('file-manifest.json')),known=new Map();
  for(const entry of manifest.files){if(known.has(entry.path))throw fail('DUPLICATE_COURSE_FILE');const bytes=read(entry.path);if(bytes.length!==entry.bytes||hash(bytes)!==entry.sha256)throw fail('COURSE_FILE_HASH_MISMATCH');known.set(entry.path,entry);}
  const document=JSON.parse(read('catalog-ready.json')),packHash=hash(read('catalog-ready.json'));
  const checked=path=>{if(!known.has(path))throw fail('UNREGISTERED_COURSE_FILE');return read(path);};
  const text=path=>checked(path).toString('utf8').replace(/\r\n/g,'\n');
  if(document.schemaVersion!==1||document.courses.length!==4||new Set(document.courses.map(c=>c.id)).size!==4||document.courses.some(c=>!IDS.includes(c.id)))throw fail('INVALID_COURSE_PACK');
  const prepared=document.courses.map(course=>{
    if(!Number.isInteger(course.content_version)||course.content_version<1||course.chapters.length!==4||course.videos.length!==1)throw fail('INVALID_COURSE_PACK');
    const prefix=course.practice_path.slice(0,course.practice_path.indexOf('/'));
    for(const [i,ch]of course.chapters.entries())if(ch.id!==`${course.id}-chapter-${i+1}`||ch.ordinal!==i+1||!ch.body?.trim()||ch.body!==text(`${prefix}/chapters/${String(i+1).padStart(2,'0')}.md`))throw fail('INVALID_COURSE_CHAPTER');
    for(const video of course.videos){let u;try{u=new URL(video.source_url);}catch{throw fail('INVALID_COURSE_VIDEO');}if(u.protocol!=='https:'||video.delivery!=='external_reference'||video.playback_verified!==false||video.duration_seconds!==null)throw fail('INVALID_COURSE_VIDEO');}
    if(course.introduction!==text(`${prefix}/course.md`))throw fail('INVALID_COURSE_PACK');
    const assets=[];
    const allowed=['.md','.csv','.json','.jsonl','.log','.txt'];
    for(const [path]of known){
      if(!path.startsWith(prefix+'/'))continue;const local=path.slice(prefix.length+1);
      const role=local.startsWith('practice/input/')?'input':local==='practice/data_dictionary.md'?'dictionary':local==='practice/task.md'?'task':local==='practice/rubric.md'?'rubric':local.startsWith('reference/')?'reference':null;
      if(!role)continue;if(!allowed.includes(extname(path)))throw fail('INVALID_COURSE_FILE_TYPE');
      assets.push({local,role,bytes:checked(path)});
    }
    assets.push({local:'sources.csv',role:'source',bytes:checked('sources.csv')},{local:'来源说明.md',role:'source',bytes:checked('来源说明.md')});
    return {course,prefix,assets,task:text(course.practice_path),rubric:text(`${prefix}/practice/rubric.md`),reference:text(course.reference_path)};
  });
  db.exec('BEGIN IMMEDIATE');let imported=0;
  try{
    for(const {course,prefix,assets,task,rubric,reference}of prepared){
      const existing=db.prepare('SELECT pack_hash FROM course_versions WHERE course_id=? AND version=?').get(course.id,course.content_version);
      if(existing){if(existing.pack_hash!==packHash)throw fail('COURSE_VERSION_EXISTS',409);continue;}
      if(!db.prepare('SELECT id FROM courses WHERE id=?').get(course.id))throw fail('COURSE_NOT_FOUND',404);
      db.prepare('INSERT INTO course_versions VALUES(?,?,?,?,?,?,?,?,?)').run(course.id,course.content_version,packHash,course.introduction,task,rubric,reference,JSON.stringify({sourceIds:course.source_ids,origin:'project_authored_offline_teaching_with_cited_sources',practiceId:`${course.id}-task-01`,folder:prefix}),now());
      for(const chapter of course.chapters){
        db.prepare('INSERT INTO course_chapter_versions VALUES(?,?,?,?,?,?)').run(course.id,course.content_version,chapter.id,chapter.ordinal,chapter.title,chapter.body);
        const result=db.prepare("UPDATE course_chapters SET title=?,body=?,status='published' WHERE id=? AND course_id=?").run(chapter.title,chapter.body,chapter.id,course.id);if(result.changes!==1)throw fail('INVALID_COURSE_CHAPTER');
      }
      for(const video of course.videos){
        db.prepare('INSERT INTO course_video_versions VALUES(?,?,?,?)').run(course.id,course.content_version,video.id,JSON.stringify(video));
        const result=db.prepare("UPDATE course_media SET url=?,duration_seconds=NULL,status='published' WHERE id=? AND course_id=?").run(video.source_url,video.id,course.id);if(result.changes!==1)throw fail('INVALID_COURSE_VIDEO');
      }
      for(const asset of assets){const name=basename(asset.local),mime=extname(name)==='.csv'?'text/csv; charset=utf-8':'text/plain; charset=utf-8';
        db.prepare('INSERT INTO course_assets VALUES(?,?,?,?,?,?,?,?,?,?)').run(course.id,course.content_version,hash(asset.local).slice(0,24),asset.local,name,asset.role,mime,hash(asset.bytes),asset.bytes.length,asset.bytes);
      }
      db.prepare("UPDATE courses SET title=?,content_version=?,status='published',license=? WHERE id=?").run(course.title,course.content_version,'项目编写正文与教学练习；公开数据按原来源说明；视频仅外链',course.id);imported++;
    }
    if(imported)db.prepare('INSERT INTO security_events VALUES(?,?,?,?,?)').run(randomUUID(),null,'COURSE_PACK_PUBLISHED','course',now());
    db.exec('COMMIT');return {imported,unchanged:4-imported,packHash};
  }catch(error){db.exec('ROLLBACK');throw error;}
}
export function createCourseLibrary(db){
  const availability=()=>db.prepare("SELECT count(*) count,sum(CASE WHEN status='published' THEN 1 ELSE 0 END) published FROM courses").get();
  function course(id,requestedVersion){
    const base=db.prepare('SELECT * FROM courses WHERE id=?').get(id);if(!base)throw fail('NOT_FOUND',404);
    const version=requestedVersion===undefined?base.content_version:Number(requestedVersion);
    if(!Number.isInteger(version)||version<1)throw fail('INVALID_COURSE_VERSION');
    const material=db.prepare('SELECT * FROM course_versions WHERE course_id=? AND version=?').get(id,version);
    if(!material){if(base.status==='published'||requestedVersion!==undefined)throw fail('COURSE_VERSION_UNAVAILABLE',404);return {...base,chapters:db.prepare('SELECT id,ordinal,title,status,body FROM course_chapters WHERE course_id=? ORDER BY ordinal').all(id),videos:db.prepare('SELECT id,kind,url,duration_seconds,status FROM course_media WHERE course_id=?').all(id),assets:[]};}
    return {...base,content_version:version,packHash:material.pack_hash,overview:material.overview_md,practice:material.task_md,rubric:material.rubric_md,reference:material.reference_md,metadata:parse(material),chapters:db.prepare('SELECT id,ordinal,title,body FROM course_chapter_versions WHERE course_id=? AND version=? ORDER BY ordinal').all(id,version).map(ch=>({...ch,status:'published'})),videos:db.prepare('SELECT metadata_json FROM course_video_versions WHERE course_id=? AND version=? ORDER BY id').all(id,version).map(row=>({...parse(row),kind:'video',status:'external_reference',url:parse(row).source_url})),assets:db.prepare('SELECT id,relative_path,filename,role,mime,sha256,bytes FROM course_assets WHERE course_id=? AND version=? ORDER BY role,relative_path').all(id,version).map(a=>({...a,url:`/api/catalog/courses/${id}/assets/${version}/${a.id}`}))};
  }
  const catalog=()=>({courses:db.prepare('SELECT id FROM courses ORDER BY position').all().map(row=>course(row.id)),notice:availability().published===availability().count?'COURSE_LIBRARY_READY':'COURSE_CONTENT_PENDING'});
  const map=()=>new Map(db.prepare('SELECT id,status,content_version FROM courses').all().map(row=>[row.id,{...row,versions:db.prepare('SELECT version,pack_hash FROM course_versions WHERE course_id=?').all(row.id)}]));
  function asset(courseId,version,id){
    if(!/^[a-f0-9]{24}$/.test(id)||!Number.isInteger(Number(version)))throw fail('NOT_FOUND',404);
    const row=db.prepare('SELECT * FROM course_assets WHERE course_id=? AND version=? AND id=?').get(courseId,Number(version),id);if(!row)throw fail('NOT_FOUND',404);return row;
  }
  return {catalog,course,map,asset,availability};
}
