"""Merge completed one-off collection into a new, self-contained development snapshot."""
import sys,csv,json,re,collections,datetime,sqlite3,shutil,hashlib,zipfile
from pathlib import Path
P=Path(__file__).parent
if P.name=='dataset_enriched_v3_1':P=P.parent
OLD=P/'dataset_final';BASE=P/'dataset_enriched_v3_1'
sys.path.insert(0,str(P/'dataset_v2/pipeline'))
import common,build
common.VERSION=build.VERSION='3.1.0';build.BASE=BASE
def read(p):
    with p.open(encoding='utf-8-sig',newline='') as f:return list(csv.DictReader(f))
def get(p):return json.loads(p.read_text(encoding='utf-8'))
def js(p,x):common.write_json(BASE/p,x)
def cs(p,x,fields=None):common.write_csv(BASE/p,x,fields)
def dt(n):return datetime.datetime.fromtimestamp(n/1000,datetime.timezone.utc).isoformat() if isinstance(n,(int,float)) and n>0 else None
for d in ['data','audit','sources','evaluation']:(BASE/d).mkdir(exist_ok=True)
for fn in ['student_profile_schema.json','matching_policy.json','official_knowledge_facts.json','action_templates.json','learning_resources.json']:
    shutil.copy2(OLD/'data'/fn,BASE/'data'/fn)
actions=get(BASE/'data/action_templates.json')
action_updates={
'ML_AI':dict(title='用可追溯职业资料构建 RAG 助手并评估回答',deliverables=['资料来源清单和检索流程','回答附来源的可运行原型','独立问题集和错误分析','无法回答时的提示与修正记录'],acceptance=['回答可以定位到资料依据','缺少依据时明确表示未知','评估问题与开发示例分开','展示检索错误和模型错误各一个案例']),
'DATA_ENG':dict(title='构建可重复运行的岗位数据导入与质量检查流程',deliverables=['字段映射和清洗规则','去重后的数据库','来源、日期与异常记录','重复运行的验证结果'],acceptance=['同一输入重复导入不增加重复岗位','缺失年份不猜测','不同薪资周期不直接合并','每条岗位可追溯到来源']),
'DATA_ANALYST':dict(title='分析岗位样本并制作带分母和限制说明的看板',deliverables=['可重跑的分析查询','按职业和资历分组的指标','数据质量与样本分布图','结论和适用范围说明'],acceptance=['国内与国际样本分别计算','每个比例有明确分母','区分文本技能提及与招聘硬性要求','不将便利样本表述为全国趋势']),
'CYBERSEC':dict(title='对自有实验网站开展权限和隐私保护检查',deliverables=['实验授权范围与资产清单','权限配置和日志检查记录','隐私字段与保留策略','修复前后验证与总结'],acceptance=['仅在自有或明确授权的环境实践','学生资料不被其他用户读取','日志不记录简历原文和密钥','能够说明问题复现与修复证据']),
'DEVOPS_SRE':dict(title='部署服务并完成监控、回滚和备份恢复演练',deliverables=['部署与配置说明','监控和告警样例','备份与恢复记录','发布失败回滚与故障复盘'],acceptance=['服务异常可以发现并告警','恢复后验证数据完整性','更新失败可回退到可用版本','配置和密钥管理方式有明确说明'])}
for a in actions:
    if a['occupation_id'] in action_updates:a.update(action_updates[a['occupation_id']])
    a['schema_version']='3.1.0'
js('data/action_templates.json',actions)
shutil.copy2(OLD/'schema.sql',BASE/'schema.sql')
shutil.copy2(OLD/'sources/official_knowledge_sources.json',BASE/'sources/official_knowledge_sources.json')
old=read(OLD/'data/jobs_base_80cn.csv');international=read(OLD/'data/jobs_international_reference.csv')
for j in old:
    for k in ['salary_min','salary_max','salary_months']:j[k]=float(j[k]) if j[k] else None
    for k in ['public_display_allowed','automated_refresh_allowed','description_chars']:j[k]=int(j[k])
    for k in ['published_at','last_verified_at']:j[k]=j[k] or None
    j.update(description_basis='legacy_supplied_normalized_text',origin_name='赛题提供' if j['market']=='CN' else j['source_id'],origin_category='legacy_supplied',employer_contact_verified=False,classification_review='not_manually_adjudicated',snapshot_date='2026-10-12',schema_version='3.1.0',platform_updated_at=None,degree_raw=None,salary_basis='legacy_supplied_field',student_target_evidence=None,specialty_track=None,track_assignment_method=None)
skills=read(OLD/'data/competency_dictionary.csv')
newskills=[('HADOOP','Apache Hadoop','Hadoop'),('PADDLE','PaddlePaddle','PaddlePaddle|飞桨'),('HIVE','Apache Hive','Hive'),('FLINK','Apache Flink','Flink'),('HBASE','Apache HBase','HBase'),('CLICKHOUSE','ClickHouse','ClickHouse'),('SHELL','Shell 脚本','Shell|Bash'),('PROMETHEUS','Prometheus','Prometheus'),('GRAFANA','Grafana','Grafana'),('ZABBIX','Zabbix','Zabbix'),('NGINX','Nginx','Nginx'),('HDFS','HDFS','HDFS'),('VECTORDB','向量数据库','向量数据库|vector database'),('PROMPT','提示词设计','Prompt|提示词'),('AGENT','AI 智能体','Agent|智能体'),('CV','计算机视觉','计算机视觉|Computer Vision'),('TRANSFORMER','Transformer','Transformer'),('REINFORCEMENT','强化学习','强化学习|reinforcement learning'),('WAF','Web 应用防火墙','WAF'),('NMAP','Nmap','Nmap'),('BURP','Burp Suite','Burp Suite'),('SQLMAP','Sqlmap','Sqlmap'),('WIRESHARK','Wireshark','Wireshark'),('VULNSCAN','漏洞扫描','漏洞扫描|漏洞检测'),('HARDEN','安全加固','安全加固'),('MLFLOW','MLflow','MLflow'),('AIRFLOW','Apache Airflow','Airflow'),('DATAWAREHOUSE','数据仓库','数据仓库|数仓|data warehouse'),('DATAMODEL','数据建模','数据建模|维度建模|data modeling'),('TCPIP','TCP/IP','TCP/IP'),('HYPERVISOR','云虚拟机管理','虚拟机|VMware|KVM')]
byid={s['competency_id']:s for s in skills}
for suffix,name,aliases in newskills:
    cid='SK_'+suffix
    if cid not in byid:
        s=dict(competency_id=cid,canonical_name=name,dimension_id='PS',category_id='PS_SPECIALTY',aliases=aliases,default_importance='',corpus_job_count='',corpus_prevalence='',top_occupations='',dictionary_version='3.1.0');skills.append(s);byid[cid]=s
for cid,aliases in {'SK_SPARK':['Spark'],'SK_RAG':['RAG'],'SK_SOC':['SOC'],'SK_VULN':['漏洞挖掘'],'SK_INCIDENT':['安全事件响应','安全事件'],'SK_STATS':['统计分析'],'SK_THREAT':['威胁建模'],'SK_DATAVIZ':['数据可视化']}.items():
    if cid in byid:byid[cid]['aliases']+='|'+'|'.join(aliases)
for s in skills:s['dictionary_version']='3.1.0';s['default_importance']=''
collected=get(BASE/'work/collected_jobs.json');summary=get(BASE/'work/collection_summary.json')
overrides=get(BASE/'audit/classification_review_overrides.json') if (BASE/'audit/classification_review_overrides.json').exists() else []
overrideby={r['source_record_key']:r for r in overrides}
exclusions=get(BASE/'audit/occupation_review_exclusions.json') if (BASE/'audit/occupation_review_exclusions.json').exists() else []
excludedkeys={r['source_record_key'] for r in exclusions}
reviewed_hashes={r['description_sha256']:overrideby[r['source_record_key']] for r in collected if r['source_record_key'] in overrideby}
for r in collected:
    if r['source_record_key'] in excludedkeys:continue
    if r['source_record_key'] not in overrideby and r['description_sha256'] in reviewed_hashes and r['occupation_id']=='DATA_ENG':
        ov=dict(reviewed_hashes[r['description_sha256']]);ov['source_record_key']=r['source_record_key'];ov['reason']+=' 与已审阅记录的描述完全相同。';overrides.append(ov);overrideby[r['source_record_key']]=ov
js('audit/classification_review_overrides.json',overrides)
sources=get(OLD/'sources/registry.json');sourceids={s['source_id'] for s in sources};new=[];future=[];duplicates=[];foreign=[]
seendup={j['duplicate_key']:j['job_id'] for j in old}
for r in collected:
    if r['source_record_key'] in excludedkeys:continue
    if r['source_record_key'] in overrideby:
        r=dict(r);r['occupation_id']=overrideby[r['source_record_key']]['corrected_role'];r['classification_method']='assistant_semantic_review_of_responsibilities_not_human_gold'
    l=r['listing_metadata'];origin=r['listed_origin']
    if re.search(r'海外|境外|国外|卢旺达|非洲|肯尼亚|新加坡|马来西亚|越南|印度|泰国|美国|德国|英国|日本|阿联酋|沙特|法国|韩国|荷兰|澳大利亚|俄罗斯|印尼|印度尼西亚|柬埔寨|菲律宾|埃及|伊拉克|巴西|南非|阿布扎比|迪拜|雅加达|东南亚',r['title']+' '+r['location_raw']):
        foreign.append(dict(source_record_key=r['source_record_key'],title=r['title'],company_name=r['company_name'],location_raw=r['location_raw'],source_url=r['source_url'],reason='explicit_overseas_or_ambiguous_in_title_or_location_not_in_domestic_base'));continue
    cat='platform_direct' if origin=='国家大学生就业服务平台' else 'university_or_education_republication' if any(t in origin for t in ['大学','学院','教育','高校']) else 'third_party_republication'
    sid='ncss_'+common.digest(origin)[:12]
    if sid not in sourceids:
        sources.append(dict(source_id=sid,name='国家大学生就业服务平台 / '+origin,region='CN',kind='public_recruitment_snapshot',homepage='https://www.ncss.cn/student/jobs/index.html',origin_name=origin,origin_category=cat,access_basis='unauthenticated_public_search_and_detail_pages',permission_status='reuse_scope_not_verified',permission_evidence=None,allowed_purposes=['local_research_candidate'],public_display_allowed=False,automated_refresh_allowed=False,model_training_allowed=False,enabled=False,robots_status=summary['robots']['status']));sourceids.add(sid)
    published=dt(l.get('publishDate'));updated=dt(l.get('updateDate'))
    if published and datetime.datetime.fromisoformat(published)>datetime.datetime.fromisoformat(r['fetched_at'])+datetime.timedelta(days=1):future.append(r);continue
    j={k:None for k in old[0]}
    j.update(job_id='job_'+common.digest(sid+'|'+r['source_record_key'])[:24],source_id=sid,source_record_key=r['source_record_key'],source_url=r['source_url'],market='CN',source_region='CN',country_raw='CN',country_basis='domestic_platform_job_location_not_employer_verified',title=r['title'],company_name=r['company_name'],location_raw=r['location_raw'],city=None,company_size_raw=l.get('recScale'),company_type_raw=l.get('recProperty'),occupation_id=r['occupation_id'],classification_method=r['classification_method'],description=r['description'],description_chars=len(r['description']),published_at=published,date_raw=str(l.get('publishDate','')),date_basis='platform_listing_publish_timestamp_not_employer_original_date',first_imported_at=r['fetched_at'],last_verified_at=r['fetched_at'],posting_status=r['posting_status'],seniority=common.seniority(r['title'],r['description']),license_status='pending_evidence',public_display_allowed=0,automated_refresh_allowed=0,review_status='not_reviewed',schema_version='3.1.0',snapshot_date='2026-10-12',description_basis='public_detail_normalized_redacted_text',origin_name=origin,origin_category=cat,employer_contact_verified=False,classification_review='rule_classification_with_description_evidence',platform_updated_at=updated,degree_raw=l.get('degreeName'))
    low=l.get('lowMonthPay');high=l.get('highMonthPay')
    j.update(salary_raw=f'{low}-{high} K/月' if low or high else '面议',salary_min=low*1000 if low else None,salary_max=high*1000 if high else None,salary_currency='CNY',salary_period='month' if low or high else None,salary_months=None,salary_basis='public_platform_listing_lowMonthPay_highMonthPay_K_per_month')
    j['content_hash']=common.digest(json.dumps({k:j[k] for k in ['title','company_name','location_raw','description','salary_raw','published_at']},ensure_ascii=False,sort_keys=True))
    if j['seniority']=='unknown' and re.search(r'校园招聘|\d{2,4}届',j['title']):j['seniority']='entry'
    student=re.search(r'校招|校园招聘|应届|毕业生|实习|在校|\d{2,4}届',j['title']+'\n'+j['description'])
    j['student_target_evidence']=student.group(0) if student else None
    if r['source_record_key'] in overrideby:j['classification_review']='assistant_semantic_review_not_human_adjudicated'
    title=j['title'];role=j['occupation_id']
    if role=='ML_AI':track='LLM_AI_APPLICATION' if re.search(r'大模型|AI应用|智能体|Agent|LLM',title,re.I) or r['source_record_key'] in overrideby else 'COMPUTER_VISION' if re.search(r'视觉|感知|图像',title) else 'NLP_SPEECH' if re.search(r'NLP|语言|语音',title,re.I) else 'ML_ALGORITHM'
    elif role=='CYBERSEC':track='PENETRATION_TESTING' if re.search(r'渗透|攻防|安全研究',title) else 'SECURITY_SERVICES'
    elif role=='DEVOPS_SRE':track='RELIABILITY_SRE' if re.search(r'SRE|可靠性',title,re.I) else 'DEVOPS_DELIVERY' if re.search(r'DevOps',title,re.I) else 'CLOUD_OPERATIONS' if '云' in title else 'SYSTEM_NETWORK_OPERATIONS'
    elif role in ('DATA_ANALYST','DATA_ENG'):track='DATA_ANALYTICS' if role=='DATA_ANALYST' else 'DATA_ENGINEERING'
    else:track='NETWORK_COMMUNICATIONS'
    j['specialty_track']=track;j['track_assignment_method']='project_title_track_rule_not_human_validated'
    j['duplicate_key']=common.digest('|'.join([j['company_name'].casefold(),j['title'].casefold(),j['location_raw'].casefold(),re.sub(r'\s+','',j['description']).casefold()]))
    if j['duplicate_key'] in seendup:duplicates.append(dict(job_id=j['job_id'],retained_job_id=seendup[j['duplicate_key']],reason='exact_company_title_location_description'));continue
    seendup[j['duplicate_key']]=j['job_id'];new.append(j)
jobs=old+new;cn=[j for j in jobs if j['market']=='CN'];newids={j['job_id'] for j in new}
dictionary=common.compiled_dictionary(skills);relations=[]
benefit=re.compile(r'福利|待遇|提供培训|培训机会|导师指导|导师带教|我们提供|benefits|we offer',re.I)
for j in jobs:
    for r in common.extract(j,dictionary):
        if benefit.search(r['evidence_text']):continue
        r['requirement_type']='negated' if r['negated'] else 'mentioned';r['extraction_method']='dictionary_mention_with_exact_span';r['schema_version']='3.1.0';r['evidence_basis']='normalized_source_description_not_semantic_requirement_validation';relations.append(r)
profiles=build.make_profiles(jobs,relations,skills)
for p in profiles:
    p['schema_version']='3.1.0';p['profile_status']='research_draft';p['coverage_status']='historical_30plus_unvalidated' if p['sample_size']>=30 else 'sparse_unvalidated';p['limitation']='便利样本；只有文本提及频率，不能证明硬性要求、学生能力或全国需求；未完成双人标注。'
paths=build.make_paths(profiles)
cs('data/jobs_base_80cn.csv',jobs);cs('data/jobs_cn.csv',cn);cs('data/jobs_cn_new_specialties.csv',new,list(jobs[0]));cs('data/jobs_international_reference.csv',international)
cs('data/competency_dictionary.csv',skills);cs('data/job_competencies.csv',relations);cs('data/job_competencies_new_specialties.csv',[r for r in relations if r['job_id'] in newids],list(relations[0]))
js('data/occupation_profiles.json',profiles);js('data/occupation_transitions_candidates.json',paths);js('sources/registry.json',sources)
tracks=[]
for track in sorted({j['specialty_track'] for j in new}):
    subset=[j for j in new if j['specialty_track']==track];ids={j['job_id'] for j in subset};freq=collections.Counter(r['competency_id'] for r in relations if r['job_id'] in ids and r['dimension']=='PS' and not r['negated'])
    tracks.append(dict(track_id=track,occupation_id=subset[0]['occupation_id'],market='CN',sample_size=len(subset),company_count=len({j['company_name'] for j in subset}),source_job_ids=sorted(ids),top_skill_mentions=[dict(competency_id=cid,job_count=n,denominator=len(subset),prevalence=n/len(subset)) for cid,n in freq.most_common(15)],status='exploratory_unvalidated_small_convenience_sample',assignment_basis='project_title_track_rule',public_display_allowed=False))
js('data/occupation_track_profiles.json',tracks)
cards=get(OLD/'data/occupation_catalog.json');counts=collections.Counter(j['occupation_id'] for j in cn)
for c in cards:
    n=counts[c['occupation_id']];c.update(domestic_job_count=n,newly_collected_domestic_job_count=sum(j['occupation_id']==c['occupation_id'] for j in new),domestic_sample_status='sample_available_unvalidated' if n>=30 else 'small_sample_unvalidated' if n else 'insufficient',matching_mode='historical_skill_evidence_prototype' if n>=30 else 'exploration_only',schema_version='3.1.0')
js('data/occupation_catalog.json',cards)
reviewnotes=get(BASE/'audit/semantic_review_notes.json') if (BASE/'audit/semantic_review_notes.json').exists() else []
reviewneeded=[]
for j in new:
    reasons=[]
    if any(w in j['description'] for w in ['元/天','元/日','元/小时']):reasons.append('description_has_nonmonthly_salary_or_multiple_employment_stages')
    if re.search(r'计量|校准|测量不确定度',j['description']):reasons.append('industrial_metrology_hybrid_requirements')
    if re.search(r'博士后|博士|研究员',j['title']):reasons.append('research_or_advanced_track_not_default_entry')
    if j['degree_raw']=='不限' and re.search(r'本科|硕士|博士',j['description']):reasons.append('degree_header_description_may_differ')
    if reasons:reviewneeded.append(dict(job_id=j['job_id'],source_record_key=j['source_record_key'],occupation_id=j['occupation_id'],title=j['title'],source_url=j['source_url'],review_reasons='|'.join(reasons)))
cs('audit/priority_review_new_jobs.csv',reviewneeded,['job_id','source_record_key','occupation_id','title','source_url','review_reasons'])
cs('audit/coverage_by_occupation.csv',[dict(occupation_id=role,name_zh=common.ROLE_NAMES.get(role,role),domestic_job_count=counts[role],new_job_count=sum(j['occupation_id']==role for j in new),new_distinct_companies=len({j['company_name'] for j in new if j['occupation_id']==role}),new_student_related_mentions=sum(bool(j['student_target_evidence']) for j in new if j['occupation_id']==role),new_explicit_closed=sum(j['posting_status']=='closed' for j in new if j['occupation_id']==role),new_visible_unverified=sum(j['posting_status']=='visible_unverified' for j in new if j['occupation_id']==role),coverage_claim='convenience_sample_not_accuracy_or_national_representation') for role in common.ROLE_NAMES])
cs('audit/exact_duplicates_removed.csv',duplicates,['job_id','retained_job_id','reason'])
js('audit/future_dated_excluded.json',[{'source_record_key':r['source_record_key'],'publish_timestamp':r['listing_metadata'].get('publishDate')} for r in future])
js('audit/foreign_or_ambiguous_locations_excluded.json',foreign)
js('audit/collection_summary.json',summary)
for fn in ['collection_errors.json','collection_rejected.json','search_runs.json','robots_check.json']:shutil.copy2(BASE/'work'/fn,BASE/'audit'/fn)
cs('sources/new_job_provenance.csv',[dict(job_id=j['job_id'],source_record_key=j['source_record_key'],source_url=j['source_url'],origin_name=j['origin_name'],origin_category=j['origin_category'],published_at=j['published_at'],last_verified_at=j['last_verified_at'],posting_status=j['posting_status'],description_sha256=common.digest(j['description']),source_html_sha256=next(r['source_html_sha256'] for r in collected if r['source_record_key']==j['source_record_key']),classification_evidence=next(r['classification_evidence'] for r in collected if r['source_record_key']==j['source_record_key'])) for j in new])
sample=build.stratified_sample(new,min(120,len(new)))
cs('evaluation/new_specialties_review_sample.csv',[dict(job_id=j['job_id'],occupation_id=j['occupation_id'],title=j['title'],company_name=j['company_name'],description=j['description'],source_url=j['source_url'],human_occupation='',human_competencies_json='',reviewer='',review_status='not_reviewed') for j in sample])
for fn in ['review_sample_300.csv']:shutil.copy2(OLD/'evaluation'/fn,BASE/'evaluation'/fn)
build.create_db(jobs,skills,relations,profiles,paths,sources)
db=BASE/'data/website_base.sqlite'
if db.exists():db.unlink()
(BASE/'data/website_research.sqlite').rename(db)
con=sqlite3.connect(db)
for table,records,key in [('occupation_catalog',cards,'occupation_id'),('official_knowledge_sources',get(BASE/'sources/official_knowledge_sources.json'),'source_id'),('official_knowledge_facts',get(BASE/'data/official_knowledge_facts.json'),'fact_id'),('action_templates',get(BASE/'data/action_templates.json'),'action_id')]:
    con.execute('CREATE TABLE '+table+' (id TEXT PRIMARY KEY,payload_json TEXT NOT NULL)');con.executemany('INSERT INTO '+table+' VALUES (?,?)',[(r[key],json.dumps(r,ensure_ascii=False)) for r in records])
con.execute('CREATE TABLE occupation_track_profiles (id TEXT PRIMARY KEY,payload_json TEXT NOT NULL)');con.executemany('INSERT INTO occupation_track_profiles VALUES (?,?)',[(r['track_id'],json.dumps(r,ensure_ascii=False)) for r in tracks])
con.commit();byjob={j['job_id']:j for j in jobs};known={s['competency_id'] for s in skills}
checks=dict(sqlite_integrity=con.execute('PRAGMA integrity_check').fetchone()[0]=='ok',foreign_keys=not con.execute('PRAGMA foreign_key_check').fetchall(),unique_job_ids=len(byjob)==len(jobs),domestic_share_80plus=len(cn)/len(jobs)>=.8,evidence_exact=all(byjob[r['job_id']]['description'][r['evidence_start']:r['evidence_end']]==r['evidence_text'] and byjob[r['job_id']]['description'][r['match_start']:r['match_end']]==r['matched_text'] for r in relations),skill_references=all(r['competency_id'] in known for r in relations),all_new_sources_traced=all(j['source_url'] and j['origin_name'] and j['last_verified_at'] for j in new),no_unreviewed_public_jobs=con.execute('SELECT COUNT(*) FROM public_jobs').fetchone()[0]==0,no_measured_accuracy_claim=all(r['confidence'] is None for r in relations),all_four_groups_nonzero=all(any(j['occupation_id'] in roles for j in new) for roles in [('ML_AI',),('DATA_ENG','DATA_ANALYST'),('CYBERSEC',),('DEVOPS_SRE',)]),review_exclusions_absent=all(j['source_record_key'] not in excludedkeys for j in new),salary_ranges_valid=all(j['salary_min'] is None or j['salary_max'] is None or j['salary_min']<=j['salary_max'] for j in new),track_evidence_resolves=all(jid in byjob for t in tracks for jid in t['source_job_ids']))
assert all(checks.values()),checks
con.close()
quality=dict(version='3.1.0-domestic-enriched-base',snapshot_date='2026-10-12',base_jobs=len(jobs),domestic_jobs=len(cn),domestic_share=len(cn)/len(jobs),international_in_base=len(jobs)-len(cn),international_reference_jobs=len(international),new_domestic_jobs=len(new),new_occupation_counts=dict(collections.Counter(j['occupation_id'] for j in new)),new_companies=len({j['company_name'] for j in new}),new_company_counts_by_role={role:len({j['company_name'] for j in new if j['occupation_id']==role}) for role in sorted({j['occupation_id'] for j in new})},new_status_counts=dict(collections.Counter(j['posting_status'] for j in new)),new_origin_categories=dict(collections.Counter(j['origin_category'] for j in new)),new_jobs_with_complete_platform_date=sum(bool(j['published_at']) for j in new),new_seniority_counts=dict(collections.Counter(j['seniority'] for j in new)),new_published_date_min=min(j['published_at'] for j in new if j['published_at']),new_published_date_max=max(j['published_at'] for j in new if j['published_at']),competencies=len(skills),job_competency_mentions=len(relations),occupation_catalog=len(cards),market_profiles=len(profiles),human_reviewed_rows=0,employer_contact_verified_jobs=0,public_display_eligible_jobs=0,checks=checks,scheduler_installed=False)
js('audit/quality_report.json',quality)
quality['foreign_or_ambiguous_locations_excluded']=len(foreign);quality['future_dates_excluded']=len(future);js('audit/quality_report.json',quality)
quality['occupation_review_exclusions']=len(exclusions);js('audit/quality_report.json',quality)
cs('data/data_dictionary.csv',[dict(table=table,field=k,example_type=type(v).__name__,note='空值为未知；来源和日期解释见 README。') for table,row in [('jobs',jobs[0]),('job_competencies',relations[0])] for k,v in row.items()])
policy=get(BASE/'data/matching_policy.json');policy['version']='3.1.0-design-only';js('data/matching_policy.json',policy)
shutil.copy2(P/'collect_domestic_once.py',BASE/'collect_domestic_once.py');shutil.copy2(Path(__file__),BASE/'build_enriched_once.py')
print(json.dumps(quality,ensure_ascii=False,indent=2))
