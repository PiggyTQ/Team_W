"""Bounded one-off public recruitment acquisition; no login, bypass or schedule."""
import sys,json,re,time,datetime,urllib.request,urllib.parse,urllib.robotparser,hashlib
import threading,concurrent.futures
from pip._vendor import requests
from html.parser import HTMLParser
from pathlib import Path
sys.path.insert(0,str(Path(__file__).parent/'dataset_v2/pipeline'))
from common import clean,redact,classify,digest,write_json
BASE=Path(__file__).parent/'dataset_enriched_v3_1'
WORK=BASE/'work';WORK.mkdir(parents=True,exist_ok=True)
ORIGIN='https://www.ncss.cn'
UA='TeamCareerResearch/1.0 (limited public recruitment research)'
QUERIES=['算法工程师','AI应用','大模型','数据工程师','数据开发','数据分析师','网络安全工程师','安全服务工程师','渗透测试','运维工程师','DevOps','SRE']
TARGET=60
rate_lock=threading.Lock();last_request=0.0;thread_session=threading.local()
def fetch(url):
    global last_request
    with rate_lock:
        time.sleep(max(0,1.1-(time.monotonic()-last_request)));last_request=time.monotonic()
    if not hasattr(thread_session,'session'):
        thread_session.session=requests.Session();thread_session.session.headers.update({'User-Agent':UA,'Referer':ORIGIN+'/student/jobs/index.html'})
    r=thread_session.session.get(url,timeout=22,allow_redirects=False)
    r.raise_for_status()
    if r.is_redirect:raise ValueError('redirect skipped')
    return r.content.decode('utf-8')
def group(role):return 'DATA' if role in ('DATA_ENG','DATA_ANALYST','DATA_SCI') else role
def role_for(title):
    if re.search(r'销售|售前|售后|讲师|教师|培训|标注|招聘|运营|助理|办公室|电气|电力|机械|环保|消防',title):return None
    if re.search(r'数据分析|data analyst',title,re.I):return 'DATA_ANALYST'
    if re.search(r'数据工程|数据开发|大数据开发|数仓|数据仓库',title):return 'DATA_ENG'
    if re.search(r'网络安全|信息安全|渗透测试|安全服务|安全运维|安全工程师|安全研究',title):return 'CYBERSEC'
    if re.search(r'运维|devops|\bsre\b',title,re.I):return 'DEVOPS_SRE'
    if re.search(r'算法|AI应用|大模型|机器学习|人工智能',title,re.I):return 'ML_AI'
    return None
def capture(s,pattern):
    m=re.search(pattern,s,re.S|re.I);return clean(m.group(1)) if m else ''
class Tree(HTMLParser):
    def __init__(self):
        super().__init__(convert_charrefs=True);self.root={'tag':'root','attrs':{},'children':[]};self.stack=[self.root];self.nodes=[]
    def handle_starttag(self,tag,attrs):
        n={'tag':tag,'attrs':dict(attrs),'children':[]};self.stack[-1]['children'].append(n);self.nodes.append(n)
        if tag not in ['area','base','br','col','embed','hr','img','input','link','meta','param','source','track','wbr']:self.stack.append(n)
    def handle_endtag(self,tag):
        for i in range(len(self.stack)-1,0,-1):
            if self.stack[i]['tag']==tag:self.stack=self.stack[:i];break
    def handle_data(self,data):self.stack[-1]['children'].append(data)
    def node_text(self,n):
        if isinstance(n,str):return n
        if n['tag'] in ['script','style']:return ''
        t=''.join(self.node_text(c) for c in n['children'])
        return t+('\n' if n['tag'] in ['br','p','div','li','pre','tr'] else '')
    def field(self,cls=None,id=None):
        n=next((n for n in self.nodes if (cls and cls in n['attrs'].get('class','').split()) or (id and n['attrs'].get('id')==id)),None)
        return clean(self.node_text(n)) if n else ''
errors=json.loads((WORK/'collection_errors.json').read_text(encoding='utf-8')) if '--resume' in sys.argv and (WORK/'collection_errors.json').exists() else []
listing={};searchruns=[]
robot=fetch(ORIGIN+'/robots.txt')
robotinfo={'url':ORIGIN+'/robots.txt','checked_at':datetime.datetime.now(datetime.timezone.utc).isoformat(),'response_sha256':digest(robot),'status':'html_404_page_no_valid_robot_directives' if '<html' in robot.lower() and '404' in robot else 'parsed'}
rp=urllib.robotparser.RobotFileParser();rp.parse(robot.splitlines() if robotinfo['status']=='parsed' else [])
if robotinfo['status']=='parsed' and not rp.can_fetch(UA,ORIGIN+'/student/jobs/index.html'):raise RuntimeError('robots disallow')
write_json(WORK/'robots_check.json',robotinfo)
if '--resume' in sys.argv:
    listing={x['listing']['jobId']:x for x in json.loads((WORK/'listing_candidates.json').read_text(encoding='utf-8'))}
    searchruns=json.loads((WORK/'search_runs.json').read_text(encoding='utf-8'))
query_set=['数据分析'] if '--analyst-supplement' in sys.argv else ([] if '--resume' in sys.argv else QUERIES)
for q in query_set:
    for page in [1,2,3]:
        url=ORIGIN+'/student/jobs/jobslist/ajax/?'+urllib.parse.urlencode({'jobName':q,'offset':page,'limit':20,'jobType':''})
        try:
            x=json.loads(fetch(url))
            if not x.get('flag'):raise RuntimeError('query denied: '+str(x.get('global')))
            rows=x.get('data',{}).get('list',[])
            searchruns.append({'query':q,'page':page,'returned':len(rows),'reported_count':x['data'].get('pagenation',{}).get('count')})
            for r in rows:
                role=role_for(r.get('jobName',''))
                if role:
                    if r['jobId'] not in listing:listing[r['jobId']]={'listing':r,'queries':[],'role':role}
                    listing[r['jobId']]['queries'].append(q)
            print('Search',q,page,len(rows),'eligible unique',len(listing),flush=True)
            if not rows:break
        except Exception as e:
            errors.append({'stage':'search','query':q,'page':page,'error':str(e)})
            print('Search failed',q,page,str(e),flush=True);break
if query_set:
    write_json(WORK/'listing_candidates.json',list(listing.values()))
    write_json(WORK/'search_runs.json',searchruns)
accepted=json.loads((WORK/'collected_jobs.json').read_text(encoding='utf-8')) if '--resume' in sys.argv and (WORK/'collected_jobs.json').exists() else []
rejected=[];counts={g:sum(group(r['occupation_id'])==g for r in accepted) for g in ['ML_AI','DATA','CYBERSEC','DEVOPS_SRE']};seen={digest(r['company_name']+'|'+r['title']+'|'+re.sub(r'\s+','',r['description'])) for r in accepted}
accepted_keys={r['source_record_key'] for r in accepted}
invalid_keys={r.get('job_id') for r in errors if r.get('stage')=='detail' and any(t in r.get('error','') for t in (['missing title','classification mismatch'] if '--analyst-supplement' in sys.argv else ['missing title','insufficient technical','classification mismatch']))}
# Order across companies and occupations, rather than taking a single employer's whole list.
ordered=sorted(listing.items(),key=lambda kv:(group(kv[1]['role']),hashlib.sha256(kv[0].encode()).hexdigest()))
def detail_pages():
    iterator=iter(ordered)
    def next_eligible():
        for jid,item in iterator:
            wanted=(item['role']=='DATA_ANALYST' and sum(r['occupation_id']=='DATA_ANALYST' for r in accepted)<35) if '--analyst-supplement' in sys.argv else counts[group(item['role'])]<TARGET
            if wanted and 'ncss:'+jid not in accepted_keys and jid not in invalid_keys:return jid,item
        return None
    with concurrent.futures.ThreadPoolExecutor(max_workers=2) as pool:
        pending=[]
        for _ in range(2):
            entry=next_eligible()
            if entry:pending.append((entry,pool.submit(fetch,ORIGIN+'/student/jobs/'+entry[0]+'/detail.html')))
        while pending:
            (jid,item),future=pending.pop(0)
            try:result=future.result()
            except Exception as e:result=e
            yield jid,item,result
            entry=next_eligible()
            if entry:pending.append((entry,pool.submit(fetch,ORIGIN+'/student/jobs/'+entry[0]+'/detail.html')))
for jid,item,s in detail_pages():
    role=item['role'];g=group(role)
    if '--analyst-supplement' not in sys.argv and counts[g]>=TARGET:continue
    url=ORIGIN+'/student/jobs/'+jid+'/detail.html'
    try:
        if robotinfo['status']=='parsed' and not rp.can_fetch(UA,url):raise ValueError('robots disallow')
        if isinstance(s,Exception):raise s
        if '验证码' in clean(s) and 'mainContent' not in s:raise ValueError('challenge page; skipped')
        tree=Tree();tree.feed(s)
        title=tree.field(cls='job-title');jd=tree.field(cls='mainContent');company=tree.field(id='corpName')
        if jd.startswith('{'):
            try:
                structured=json.loads(jd)
                if isinstance(structured,dict) and ('gwzz' in structured or 'rzzg' in structured):jd='岗位职责\n'+clean(structured.get('gwzz',''))+'\n任职要求\n'+clean(structured.get('rzzg',''))
            except (ValueError,TypeError):pass
        jd=redact(jd)
        if not title or not company or len(jd)<80:raise ValueError('missing title/company or short description')
        confirmed=role_for(title)
        if confirmed!=role:raise ValueError('listing/detail classification mismatch')
        # Business analyst and non-IT equipment operations require technical evidence.
        tech=re.search(r'Python|SQL|Excel|Power\s?BI|Tableau|R语言|Linux|Java|C\+\+|TensorFlow|PyTorch|机器学习|深度学习|数据仓库|数据库|云平台|网络协议|漏洞|渗透|信息安全|安全事件|防火墙|服务器|日志|容器|Docker|Shell|Hadoop|Spark|数据建模|统计分析',jd,re.I)
        if not tech:raise ValueError('insufficient technical responsibility/skill evidence')
        l=item['listing'];loc=tree.field(cls='site-tag') or l.get('areaCodeName','')
        # Same company's identical title and content in multiple campuses is one evidence record.
        dedup=digest(company+'|'+title+'|'+re.sub(r'\s+','',jd))
        if dedup in seen:
            rejected.append({'job_id':jid,'reason':'duplicate_company_title_description'});continue
        seen.add(dedup)
        basis='explicit_closed_label' if '职位已下线' in clean(s) else 'detail_visible_no_closed_label_employer_not_contacted'
        row={'source_record_key':'ncss:'+jid,'source_url':url,'title':title,'company_name':company,'location_raw':loc,'occupation_id':role,'description':jd,'description_sha256':digest(jd),'source_html_sha256':digest(s),'listed_origin':tree.field(cls='source-sp') or l.get('sourcesNameCh') or '国家大学生就业服务平台','listing_metadata':l,'query_terms':item['queries'],'fetched_at':datetime.datetime.now(datetime.timezone.utc).isoformat(),'posting_status':'closed' if basis=='explicit_closed_label' else 'visible_unverified','status_basis':basis,'classification_method':'specific_title_plus_technical_description_evidence','classification_evidence':tech.group(0),'public_display_allowed':0,'automated_refresh_allowed':0,'rights_status':'reuse_scope_not_verified','privacy':'contact_redaction_applied_not_exhaustive'}
        accepted.append(row);counts[g]+=1
        write_json(WORK/'collected_jobs.json',accepted)
        print('Accepted',len(accepted),counts,title,flush=True)
    except Exception as e:
        errors.append({'stage':'detail','job_id':jid,'url':url,'error':str(e)})
        print('Detail skipped',jid,str(e),flush=True)
    write_json(WORK/'collection_errors.json',errors)
write_json(WORK/'collection_rejected.json',rejected)
write_json(WORK/'collection_summary.json',{'accepted':len(accepted),'group_counts':counts,'occupation_counts':dict(__import__('collections').Counter(r['occupation_id'] for r in accepted)),'distinct_companies':len({r['company_name'] for r in accepted}),'errors':len(errors),'duplicate_rejected':len(rejected),'queries':searchruns,'robots':robotinfo,'scheduler_installed':False,'public_display_permission_confirmed':False})
print('COMPLETE',counts,flush=True)
