"""Build a reproducible, private demo catalog from existing project datasets.

No source approval, publication permission or verification flags are upgraded.
This file is a catalog artifact, never an account database or a public asset.
"""
import argparse
import csv
import hashlib
import json
import pathlib
import sqlite3

root = pathlib.Path(__file__).resolve().parents[2]
parser = argparse.ArgumentParser()
parser.add_argument('--output', default=str(root / '低保真原型/.deploy-cache/knowledge.sqlite'))
args = parser.parse_args()
out = pathlib.Path(args.output).resolve()
out.parent.mkdir(parents=True, exist_ok=True)
if out.exists():
    raise SystemExit('Output already exists; choose a new artifact path')
base = root / '数据集/dataset_enriched_v3_1'
final = root / '职业画像最终版_V3'
dump = lambda value: json.dumps(value, ensure_ascii=False, separators=(',', ':'))
load = lambda path: json.loads(path.read_text(encoding='utf-8-sig'))
mapping = {'DATA_ANALYST':'data','ML_AI':'ai','CYBERSEC':'security','DEVOPS_SRE':'ops','SW_FE':'frontend','SW_BE':'backend','DATA_ENG':'engineering','SW_TEST':'testing','SW_GENERAL':'software','IMPLEMENTATION':'delivery'}
inputs = [base/'data/website_base.sqlite', final/'基础职业画像_最终.json', final/'细分职业画像_最终.json', final/'资历职业画像_最终.json', final/'职业关系_最终.json', final/'岗位条件与例外_最终.json', final/'证据索引.json', final/'参考来源_最终.json', base/'data/learning_resources.json']
manifest = [{'path':str(p.relative_to(root)).replace('\\','/'),'sha256':hashlib.sha256(p.read_bytes()).hexdigest()} for p in inputs]
src = sqlite3.connect((base/'data/website_base.sqlite').as_uri()+'?mode=ro',uri=True)
src.row_factory = sqlite3.Row
db = sqlite3.connect(out)
db.executescript('''
CREATE TABLE metadata(key TEXT PRIMARY KEY, value TEXT NOT NULL);
CREATE TABLE profiles(id TEXT PRIMARY KEY, career TEXT NOT NULL, kind TEXT NOT NULL, title TEXT NOT NULL, body TEXT NOT NULL CHECK(json_valid(body)));
CREATE INDEX profiles_career ON profiles(career,kind,id);
CREATE TABLE skills(id TEXT PRIMARY KEY, name TEXT NOT NULL, dimension TEXT NOT NULL, body TEXT NOT NULL CHECK(json_valid(body)));
CREATE TABLE jobs(id TEXT PRIMARY KEY, career TEXT, occupation TEXT NOT NULL, market TEXT NOT NULL, title TEXT NOT NULL, company TEXT NOT NULL, location TEXT NOT NULL, search_text TEXT NOT NULL, body TEXT NOT NULL CHECK(json_valid(body)));
CREATE INDEX jobs_filter ON jobs(career,market,id);
CREATE TABLE mentions(job_id TEXT NOT NULL,skill_id TEXT NOT NULL,body TEXT NOT NULL CHECK(json_valid(body)));
CREATE INDEX mentions_job ON mentions(job_id);
CREATE INDEX mentions_skill ON mentions(skill_id,job_id);
CREATE TABLE items(kind TEXT NOT NULL,id TEXT NOT NULL,career TEXT,body TEXT NOT NULL CHECK(json_valid(body)),PRIMARY KEY(kind,id));
CREATE INDEX items_career ON items(kind,career,id);
CREATE INDEX items_job_reference ON items(kind,json_extract(body,'$.job_id'));
''')
for name in ['基础职业画像_最终.json','细分职业画像_最终.json','资历职业画像_最终.json']:
    for v in load(final/name):
        db.execute('INSERT INTO profiles VALUES(?,?,?,?,?)',(v['profile_id'],mapping[v['occupation_id']],v['profile_type'],v['name_zh'],dump(v)))
for r in src.execute('SELECT * FROM competencies'):
    v=json.loads(r['payload_json'])
    db.execute('INSERT INTO skills VALUES(?,?,?,?)',(r['competency_id'],r['name'],r['dimension'],dump(v)))
for r in src.execute('SELECT * FROM jobs'):
    v=json.loads(r['payload_json']); title=v.get('title') or '未命名岗位';company=v.get('company_name') or '未知';loc=v.get('location_raw') or v.get('city') or '未知'
    text=' '.join(str(v.get(k) or '') for k in ['title','company_name','location_raw','city','description','occupation_id'])
    db.execute('INSERT INTO jobs VALUES(?,?,?,?,?,?,?,?,?)',(r['job_id'],mapping.get(r['occupation_id']),r['occupation_id'],r['market'],title,company,loc,text,dump(v)))
for r in src.execute('SELECT * FROM job_competencies'):
    db.execute('INSERT INTO mentions VALUES(?,?,?)',(r['job_id'],r['competency_id'],r['payload_json']))
def add(kind,values,key,career_key='occupation_id'):
    for v in values:
        identifier=str(v[key]); db.execute('INSERT OR REPLACE INTO items VALUES(?,?,?,?)',(kind,identifier,mapping.get(v.get(career_key)),dump(v)))
relations=load(final/'职业关系_最终.json')
for kind,values in relations.items():
    if isinstance(values,list):
        for v in values:
            if isinstance(v,dict) and v.get('relation_id'):
                db.execute('INSERT INTO items VALUES(?,?,?,?)',('relations',v['relation_id'],mapping.get(v.get('from_profile_id','').split('.')[0]),dump(v)))
for table,kind,key in [('sources','sources','source_id'),('official_knowledge_sources','references','source_id'),('official_knowledge_facts','facts','fact_id'),('action_templates','actions','action_id')]:
    values=[json.loads(r['payload_json']) for r in src.execute('SELECT payload_json FROM '+table)]
    for i,v in enumerate(values):
        identifier=str(v.get(key) or v.get('id') or i)
        db.execute('INSERT OR REPLACE INTO items VALUES(?,?,?,?)',(kind,identifier,mapping.get(v.get('occupation_id')),dump(v)))
add('resources',load(base/'data/learning_resources.json'),'resource_id')
# Preserve full evidence and condition semantics, including alternatives and unknowns.
for filename,kind in [('岗位条件与例外_最终.json','conditions'),('证据索引.json','evidence'),('参考来源_最终.json','profileSources')]:
    value=load(final/filename)
    values=value if isinstance(value,list) else [{'id':k,'value':v} for k,v in value.items()]
    for i,v in enumerate(values):
        identifier=str(v.get('condition_id') or v.get('evidence_id') or v.get('job_id') or v.get('source_id') or v.get('reference_id') or v.get('id') or i)
        db.execute('INSERT OR REPLACE INTO items VALUES(?,?,?,?)',(kind,identifier,mapping.get(v.get('occupation_id')),dump(v)))
metadata={'version':'demo-20261027-v1','snapshotDate':'2026-10-12','profileDate':'2026-10-14','demoOnly':True,'humanReviewed':False,'liveRecruitment':False,'reviewBypass':'Explicitly authorized for group assignment demonstration, 2026-10-27','sourceManifest':manifest}
for k,v in metadata.items():db.execute('INSERT INTO metadata VALUES(?,?)',(k,dump(v)))
db.commit()
assert db.execute('PRAGMA integrity_check').fetchone()[0]=='ok'
counts={t:db.execute('SELECT count(*) FROM '+t).fetchone()[0] for t in ['profiles','skills','jobs','mentions','items']}
db.execute('VACUUM');db.close();src.close()
print(dump({'output':str(out),'counts':counts,'sha256':hashlib.sha256(out.read_bytes()).hexdigest()}))
