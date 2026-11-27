import {readFileSync, realpathSync, statSync} from 'node:fs';
import {resolve, sep, extname, basename} from 'node:path';
import {createHash} from 'node:crypto';

const digest = bytes => createHash('sha256').update(bytes).digest('hex');
const fail = (code, status = 400) => {throw Object.assign(new Error(code), {code, status});};

export function importGrowthPack(db, packRoot, {now = Date.now} = {}) {
  const root = realpathSync(resolve(packRoot));
  const read = relative => {
    if (typeof relative !== 'string' || relative.includes('\\') || relative.split('/').includes('..')) fail('INVALID_COURSE_PATH');
    const file = realpathSync(resolve(root, relative));
    if (!file.startsWith(root + sep) || statSync(file).size > 2 * 1024 * 1024) fail('INVALID_COURSE_PATH');
    return readFileSync(file);
  };
  const catalog = JSON.parse(read('catalog.json'));
  if (catalog.schemaVersion !== 3 || !Array.isArray(catalog.projects) || catalog.projects.length > 200) fail('INVALID_COURSE_PACK');
  const projects = catalog.projects.filter(project => !project.legacy || project.version >= 3);
  if (new Set(projects.map(p => p.id)).size !== projects.length) fail('INVALID_COURSE_PACK');
  const prepared = projects.map(row => {
    if (!/^[a-z][a-z-]{1,50}$/.test(row.id) || !Number.isInteger(row.version)) fail('INVALID_COURSE_PACK');
    const prefix = `${row.id}/${row.version}/`;
    const manifestBytes = read(prefix + 'manifest.json');
    const manifest = JSON.parse(manifestBytes);
    if (manifest.projectId !== row.id || manifest.version !== row.version || !Array.isArray(manifest.files) || manifest.files.length > 100) fail('INVALID_COURSE_PACK');
    const seen = new Set();
    const assets = manifest.files.map(file => {
      if (seen.has(file.path)) fail('DUPLICATE_COURSE_FILE');
      seen.add(file.path);
      const bytes = read(prefix + file.path);
      if (bytes.length !== file.bytes || digest(bytes) !== file.sha256) fail('COURSE_FILE_HASH_MISMATCH');
      return {...file, body: bytes};
    });
    for (const name of ['project.json','assignment.md','input/fixture.json','reference/result.json','reference/solution.mjs','rubric.json']) if (!seen.has(name)) fail('INVALID_PROJECT_MATERIAL');
    const project = JSON.parse(assets.find(a => a.path === 'project.json').body);
    if (project.id !== row.id || project.version !== row.version || project.status !== 'local_trial') fail('INVALID_PROJECT_MATERIAL');
    if(!['data','ai','security','ops','frontend','backend','engineering','testing','software','delivery'].includes(project.career)||project.career!==row.career||
      ![1,2,3,'integrated'].includes(project.level)||!Array.isArray(project.requiredFiles)||project.requiredFiles.length<2||project.requiredFiles.length>20||
      project.requiredFiles.some(name=>typeof name!=='string'||!/^[a-zA-Z0-9._-]{1,80}$/.test(name)||name.includes('..'))||
      !Array.isArray(project.handoffs)||project.handoffs.length>8||!project.title?.zh||!project.title?.en)fail('INVALID_PROJECT_MATERIAL');
    return {row, project, assets, packHash: digest(manifestBytes)};
  });
  db.exec('BEGIN IMMEDIATE');
  let imported = 0;
  try {
    for (const {row, project, assets, packHash} of prepared) {
      const old = db.prepare('SELECT pack_hash FROM course_versions WHERE course_id=? AND version=?').get(row.id, row.version);
      if (old) {
        if (old.pack_hash !== packHash) fail('COURSE_VERSION_EXISTS', 409);
        continue;
      }
      const existing = db.prepare('SELECT * FROM courses WHERE id=?').get(row.id);
      if (existing && existing.content_version >= row.version) fail('COURSE_VERSION_EXISTS', 409);
      if (!existing) db.prepare('INSERT INTO courses(id,title,career_id,position,status,content_version,license) VALUES(?,?,?,?,?,?,?)').run(row.id,row.title.zh,row.career,40+catalog.projects.indexOf(row),'draft',row.version,'Avemly original synthetic materials');
      const text = name => assets.find(a => a.path === name).body.toString('utf8');
      const guided=project.adapter==='legacy-guided'?project.guidedProject:null;
      if(guided&&(guided.id!==project.id||guided.version!==project.version||guided.steps?.length!==4||guided.reading?.length!==4))fail('INVALID_PROJECT_MATERIAL');
      db.prepare('INSERT INTO course_versions VALUES(?,?,?,?,?,?,?,?,?)').run(row.id,row.version,packHash,text('assignment.md'),text('assignment.md'),text('rubric.json'),text('reference/result.json'),JSON.stringify({title:row.title.zh,...(guided?{project:guided}:{growth:project}),localTrial:true}),now());
      const chapters=guided?guided.reading.map(ch=>({title:ch.title.zh,body:ch.body.zh})):['assignment.md','input/dictionary.md'].map(name=>({title:name,body:text(name)}));
      for (const [index, chapter] of chapters.entries()) {
        db.prepare('INSERT INTO course_chapter_versions VALUES(?,?,?,?,?,?)').run(row.id,row.version,`${row.id}-chapter-${index+1}`,index+1,chapter.title,chapter.body);
      }
      for (const file of assets) {
        const role = file.path.startsWith('reference/') ? 'reference' : file.path.startsWith('input/') ? 'input' : 'task';
        const extension = extname(file.path);
        const mime = extension === '.zip' ? 'application/zip' : extension === '.json' ? 'application/json' : extension === '.html' ? 'text/html; charset=utf-8' : 'text/plain; charset=utf-8';
        db.prepare('INSERT INTO course_assets VALUES(?,?,?,?,?,?,?,?,?,?)').run(row.id,row.version,digest(file.path).slice(0,24),file.path,basename(file.path),role,mime,file.sha256,file.bytes,file.body);
      }
      db.prepare("UPDATE courses SET content_version=?,title=?,status=CASE WHEN status='retired' THEN 'retired' ELSE 'draft' END WHERE id=?").run(row.version,row.title.zh,row.id);
      imported++;
    }
    db.exec('COMMIT');
    return {imported, unchanged: prepared.length-imported, hashes: prepared.map(p=>({id:p.row.id,version:p.row.version,hash:p.packHash}))};
  } catch (error) {
    db.exec('ROLLBACK');
    throw error;
  }
}
