"""Read-only validation and independent reference calculations for the course pack."""
import collections
import csv
import hashlib
import json
import pathlib
import re
import statistics
import sys

ROOT=pathlib.Path(sys.argv[1]).resolve() if len(sys.argv)>1 else pathlib.Path(__file__).resolve().parents[1]
def load(p):return json.loads((ROOT/p).read_text(encoding='utf-8'))
def lines(p):return [json.loads(x) for x in (ROOT/p).read_text(encoding='utf-8').splitlines() if x.strip()]
def csvrows(p):
 with (ROOT/p).open(encoding='utf-8-sig',newline='') as f:return list(csv.DictReader(f))
checks=[]
def check(name,result):
 if not result:raise AssertionError(name)
 checks.append(name)
catalog=load('catalog-ready.json');courses=catalog['courses']
check('four existing course identifiers preserved',{c['id'] for c in courses}=={'quality','ai-eval','log','restore'})
check('sixteen nonempty original chapters',sum(len(c['chapters']) for c in courses)==16 and all(len(ch['body'])>400 for c in courses for ch in c['chapters']))
check('not falsely marked as published',catalog['publishedToWebsite'] is False and catalog['collectionOnly'] is True)
for c in courses:
 for p in [c['practice_path'],c['reference_path']]:check('file exists: '+p,(ROOT/p).is_file())
 for i,ch in enumerate(c['chapters']):check('chapter identifier: '+ch['id'],ch['id']==f"{c['id']}-chapter-{i+1}")
q='quality_数据质量小项目/'
raw=csvrows(q+'practice/input/penguins_source.csv');dirty=csvrows(q+'practice/input/penguins_exercise.csv')
check('public source is 344 by 8',len(raw)==344 and len(raw[0])==8)
receipts=load('source-receipts.json');raw_receipt=next(r for r in receipts if r['source_id']=='SRC-002')
check('downloaded original bytes unchanged',hashlib.sha256((ROOT/q/'practice/input/penguins_source.csv').read_bytes()).hexdigest()==raw_receipt['sha256'])
check('source species control counts',dict(collections.Counter(r['species'] for r in raw))=={'Adelie':152,'Gentoo':124,'Chinstrap':68})
check('dirty CSV/JSONL are equal',dirty==lines(q+'practice/input/penguins_exercise.jsonl') and len(dirty)==346)
fields=list(raw[0]);seen=set();dedup=[];duplicates=[]
for row in dirty:
 key=tuple(row[k] for k in fields)
 if key in seen:duplicates.append(row['record_id']);continue
 seen.add(key);row=dict(row)
 if row['species'].strip().lower()=='adelie':row['species']='Adelie'
 if row['body_mass_g'] not in ['NA',''] and float(row['body_mass_g'])<=0:row['body_mass_g']='NA'
 dedup.append(row)
check('exact teaching duplicate pair',duplicates==['Q345','Q346'] and len(dedup)==344)
check('negative mass excluded without zero fill',next(r for r in dedup if r['record_id']=='Q010')['body_mass_g']=='NA')
check('unknown island retained',next(r for r in dedup if r['record_id']=='Q020')['island']=='Unknown_Island')
summaries=csvrows(q+'reference/results/summary.csv')
for summary in summaries:
 group=[r for r in dedup if r['species']==summary['species']];valid=[float(r['body_mass_g']) for r in group if r['body_mass_g'] not in ['NA','']]
 check('independent quality summary: '+summary['species'],len(group)==int(summary['records_after_duplicate_exclusion']) and len(valid)==int(summary['valid_body_mass_records']) and round(statistics.mean(valid),2)==float(summary['body_mass_mean_g']))
check('24 issue entries, not 24 unique bad rows',len(csvrows(q+'reference/results/issues.csv'))==24)
check('341 valid body masses after declared exercise rule',sum(int(s['valid_body_mass_records']) for s in summaries)==341)
ai=lines('ai-eval_AI调用与评估体验/practice/input/eval_cases.jsonl');judgments=lines('ai-eval_AI调用与评估体验/reference/results/reference_judgments.jsonl')
check('twelve cases paired to twelve references',{c['case_id'] for c in ai}=={r['case_id'] for r in judgments} and len(ai)==len(judgments)==12)
check('four separate criteria per case',all(set(r['criterion_results'])=={'F01','F02','F03','F04'} for r in judgments))
check('all model examples explicitly synthetic',all('未调用模型' in r['generation_method'] for r in ai) and all(r['model_called'] is False for r in judgments))
check('task unknowns retained',[r['case_id'] for r in judgments if r['task_verdict']=='无法判断']==['E006','E010'])
logs=lines('log_离线合成日志分析/practice/input/app_logs.jsonl')
check('120 unique synthetic events and 60 requests',len(logs)==len({r['event_id'] for r in logs})==120 and len({r['request_id'] for r in logs})==60 and all(r['synthetic'] for r in logs))
check('every request has exactly two events',set(collections.Counter(r['request_id'] for r in logs).values())=={2})
check('five errors and two warnings',sum(r['level']=='ERROR' for r in logs)==5 and sum(r['level']=='WARN' for r in logs)==2)
timeline=csvrows('log_离线合成日志分析/reference/results/event_timeline.csv')
check('reference event timeline matches actual filtered input',[r['event_id'] for r in timeline]==[r['event_id'] for r in logs if r['level'] in ['ERROR','WARN']])
check('ISO timezone retained in CSV',all(r['timestamp'].endswith('+08:00') for r in timeline))
metrics=csvrows('restore_模拟恢复记录/practice/input/monitoring.csv');incident=csvrows('restore_模拟恢复记录/practice/input/timeline.csv')
check('12 monitoring windows and 12 incident events',len(metrics)==len(incident)==12)
qualifying=[r for r in metrics if r['window_start']>='2026-10-01T09:08:00+08:00' and r['release']=='v1' and int(r['errors'])/int(r['requests'])<.01 and float(r['p95_ms'])<300]
reference=load('restore_模拟恢复记录/reference/results/verification.json')
check('post-switch qualifying pair independently computed',[r['window_start'] for r in qualifying[:2]]==reference['first_qualifying_post_switch_pair'])
check('healthy path does not erase business errors',all(r['health_http_status']=='200' for r in metrics) and any(int(r['errors'])>=100 for r in metrics))
check('no real recovery claimed',reference['actual_rollback_executed'] is False and reference['root_cause']=='unknown')
sources=csvrows('sources.csv')
check('13 unique source records',len(sources)==len({r['source_id'] for r in sources})==13)
check('all 13 source fetches succeeded',all(r['status']=='retrieved' and r['http_status']==200 for r in receipts))
videos=[v for c in courses for v in c['videos']]
check('four external video references, no fictional local file',len(videos)==4 and all(v['delivery']=='external_reference' and v['local_file'] is None and v['playback_verified'] is False for v in videos))
check('unknown total durations remain null',all(v['duration_seconds'] is None for v in videos))
bad=[]
for p in ROOT.rglob('*.md'):
 text=p.read_text(encoding='utf-8')
 for target in re.findall(r'\]\(([^)]+)\)',text):
  if not re.match(r'^[a-z]+:',target) and not target.startswith('#'):
   if not (p.parent/target.split('#')[0]).exists():bad.append(str(p.relative_to(ROOT))+': '+target)
check('internal markdown links resolve',not bad)
print(json.dumps({'status':'passed','checks':len(checks),'names':checks,'source_rows':344,'exercise_rows':346,'ai_cases':12,'synthetic_log_events':120,'monitoring_windows':12,'external_video_references':4,'local_video_files':0,'video_playback_verified':False},ensure_ascii=True,indent=2))
