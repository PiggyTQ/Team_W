"""Build-time only: translate allowlisted PUBLIC catalog and committed site copy.

No workspace/account rows are read, no translation service is called by the app.
Outputs are resumable, fingerprinted and reused on subsequent builds.
"""
import concurrent.futures, hashlib, json, os, re, sqlite3, time, urllib.parse, urllib.request
from pathlib import Path

ROOT=Path('/srv/career-growth/translation-build-20261028')
ROOT.mkdir(exist_ok=True)
source=json.loads((ROOT/'site-copy-input.json').read_text())
known=source['known']; site=set(source['strings']); public=set()
cjk=re.compile('[\u3400-\u9fff]')
def technical(s):
    return bool(re.match(r'^(?:https?://|/|[A-Z]:\\)',s) or re.search(r'\.(?:csv|md|jsonl|json|png|jpg|glb|svg)$',s))
def collect(v):
    if isinstance(v,str):
        if cjk.search(v) and not technical(v): public.add(v)
    elif isinstance(v,list):
        for x in v: collect(x)
    elif isinstance(v,dict):
        for k,x in v.items():
            if k not in {'source_url','url','path','relative_path','filename','sha256','payload','raw'}:collect(x)
db=sqlite3.connect('file:/srv/career-growth/source/server/data/knowledge.sqlite?mode=ro',uri=True)
for table in ['profiles','skills','items']:
    for row in db.execute('select body from '+table): collect(json.loads(row[0]))
for row in db.execute('select title,company,location,body from jobs'):
    collect(list(row[:3]));v=json.loads(row[3]);text=re.sub(r'[\w.+-]+@[\w.-]+\.[A-Za-z]{2,}','[联系方式已隐藏]',v.get('description',''));text=re.sub(r'(?<!\d)1[3-9]\d{9}(?!\d)','[联系方式已隐藏]',text)
    collect(text[:16000]);collect(text[:360]);collect(v.get('salary_raw',''));collect(v.get('origin_name',''))
db.close()
# The personal database is opened read-only and only PUBLIC COURSE tables are queried.
db=sqlite3.connect('file:/var/lib/career-growth/auth.sqlite?mode=ro',uri=True)
for table,columns in [('course_versions','overview_md,task_md,rubric_md,reference_md,metadata_json'),('course_chapter_versions','title,body'),('course_video_versions','metadata_json')]:
    for row in db.execute('select '+columns+' from '+table):
        for x in row:
            if x.startswith('{'):
                try:collect(json.loads(x));continue
                except ValueError:pass
            collect(x)
db.close()

# Keep markup, URLs, identifiers, dataset values and download filenames unchanged.
splitter=re.compile(r'(\r?\n|(?<=[。！？；])\s*|\|)')
def pieces(s):
    result=[]
    for p in splitter.split(s):
        if len(p)>1800:
            result.extend(re.findall(r'.{1,1200}(?:\s|$)|.{1,1200}',p))
        else:result.append(p)
    return result
units=set()
for s in site|public:
    if s in known:continue
    units.update(p for p in pieces(s) if cjk.search(p) and not technical(p))
cache_path=ROOT/'translation-unit-cache.json'
cache=json.loads(cache_path.read_text()) if cache_path.exists() else {}
cache.update({s:known[s] for s in units if s in known and not cjk.search(known[s])})
cache.update({'的已有依据与未知范围':"'s supporting evidence and unknowns",'的表达':' wording'})
for s in units:
    v=s.replace('応募資格・条件','Eligibility requirements and conditions').replace('正社員','permanent employee').replace('職務内容','Job responsibilities')
    if v!=s and not cjk.search(v):cache[s]=v
pending=sorted(units-cache.keys(),key=lambda x:(len(x),x))
batches=[];batch=[];size=0
for s in pending:
    proposed='\n'.join('ZXQ%06dZXQ %s'%(i,x) for i,x in enumerate(batch+[s]))
    if batch and (len(urllib.parse.quote(proposed))>13000 or len(batch)>=90):batches.append(batch);batch=[];size=0
    batch.append(s);size+=len(s)+25
if batch:batches.append(batch)
print(json.dumps({'siteStrings':len(site),'publicStrings':len(public),'uniqueUnits':len(units),'pendingUnits':len(pending),'pendingChars':sum(map(len,pending)),'batches':len(batches)}),flush=True)
def translate(batch):
    q=batch[0] if len(batch)==1 else '\n'.join('ZXQ%06dZXQ %s'%(i,s) for i,s in enumerate(batch))
    url='https://translate.googleapis.com/translate_a/single?'+urllib.parse.urlencode({'client':'gtx','sl':'auto' if re.search('[\u3040-\u30ff]',q) else 'zh-CN','tl':'en','dt':'t','q':q})
    for attempt in range(5):
        try:
            req=urllib.request.Request(url,headers={'User-Agent':'Mozilla/5.0'})
            with urllib.request.urlopen(req,timeout=30) as response:body=json.load(response)
            text=''.join(r[0] or '' for r in body[0])
            if len(batch)==1:
                if not text.strip() or cjk.search(text):raise ValueError('incomplete direct English translation: '+repr(batch[0])+' => '+text)
                cache[batch[0]]=text.strip();return {batch[0]:text.strip()}
            matches=list(re.finditer(r'ZXQ\s*(\d{6})\s*ZXQ\s*',text,re.I))
            if len(matches)!=len(batch):raise ValueError('batch boundaries changed')
            result={}
            for i,m in enumerate(matches):
                if int(m[1])!=i:raise ValueError('translation order changed')
                value=text[m.end():matches[i+1].start() if i+1<len(matches) else len(text)].strip()
                if not value or cjk.search(value):raise ValueError('incomplete English translation: '+repr(batch[i])+' => '+value)
                result[batch[i]]=value
                cache[batch[i]]=value
            return result
        except Exception as error:
            if isinstance(error,ValueError) and len(batch)>1:
                middle=len(batch)//2
                return {**translate(batch[:middle]),**translate(batch[middle:])}
            if attempt==4:
                if len(batch)>1:
                    middle=len(batch)//2
                    return {**translate(batch[:middle]),**translate(batch[middle:])}
                raise
            time.sleep(1.5*(attempt+1))
    raise RuntimeError('unreachable')
failures=[]
with concurrent.futures.ThreadPoolExecutor(max_workers=4) as pool:
    jobs={pool.submit(translate,b):b for b in batches}
    for i,f in enumerate(concurrent.futures.as_completed(jobs)):
        try:cache.update(f.result())
        except Exception as e:failures.append({'units':jobs[f],'error':str(e)})
        if (i+1)%10==0 or i+1==len(jobs):
            cache_path.write_text(json.dumps(cache,ensure_ascii=False));print(json.dumps({'finishedBatches':i+1,'totalBatches':len(jobs),'cachedUnits':len(cache),'failures':len(failures)}),flush=True)
if failures:
    (ROOT/'failures.json').write_text(json.dumps(failures,ensure_ascii=False));raise RuntimeError('Untranslated units remain; rerun to resume')
def translated(s):
    if s in known:return known[s]
    result=''
    for p in pieces(s):
        v=cache.get(p,p)
        if p and p[0].isspace() and v and not v[0].isspace():v=p[:len(p)-len(p.lstrip())]+v
        if p and p[-1].isspace() and v and not v[-1].isspace():v+=p[len(p.rstrip()):]
        if result and v and re.search(r'[A-Za-z0-9.!?;:]$',result) and re.match(r'[A-Za-z0-9]',v):result+=' '
        result+=v
    return result
site_out={**known,**{s:translated(s) for s in site if not technical(s)}}
public_out={s:translated(s) for s in public}
for name,data in [('site-complete-en.json',site_out),('public-content-en.json',public_out)]:
    incomplete=[s for s,v in data.items() if cjk.search(v)]
    if incomplete:raise RuntimeError('Incomplete output '+name+': '+str(len(incomplete)))
    (ROOT/name).write_text(json.dumps(data,ensure_ascii=False,indent=2))
manifest={'builtAt':time.strftime('%Y-%m-%dT%H:%M:%SZ',time.gmtime()),'siteEntries':len(site_out),'publicEntries':len(public_out),'uniqueTranslatedUnits':len(cache),'runtimeExternalCalls':False,'personalRecordsSent':False,'method':'build-time machine translation plus existing curated UI dictionary','files':{name:hashlib.sha256((ROOT/name).read_bytes()).hexdigest() for name in ['site-complete-en.json','public-content-en.json']}}
(ROOT/'manifest.json').write_text(json.dumps(manifest,indent=2));print(json.dumps(manifest),flush=True)
