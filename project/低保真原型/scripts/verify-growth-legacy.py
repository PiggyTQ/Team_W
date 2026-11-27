"""Recalculate retained teaching references without changing their materials."""
from pathlib import Path
import csv, json, hashlib
from datetime import datetime, timezone

root=Path('course-packs/practice-20261113')
report=[]
for project_id in ['quality','ai-eval','log','restore']:
    folder=root/project_id
    project=json.loads((folder/'project.json').read_text(encoding='utf-8'))
    rows=project['dataset']['rows']
    result={'id':project_id,'version':2,'scope':'Retained local teaching files, not a new upstream download','passed':False}
    if project_id=='quality':
        original=folder/'practice/input/dft-source.csv'
        receipt=json.loads((folder/'source-receipt.json').read_text(encoding='utf-8'))
        assert hashlib.sha256(original.read_bytes()).hexdigest()==receipt['sampleSha256']
        source=list(csv.DictReader(original.open(encoding='utf-8-sig',newline='')))
        groups={}
        for row in source:
            value=groups.setdefault(row['speed_limit'],{'records':0,'casualties':0})
            value['records']+=1;value['casualties']+=int(row['number_of_casualties'])
        assert len(source)==16 and groups=={'20':{'records':12,'casualties':12},'30':{'records':3,'casualties':3},'50':{'records':1,'casualties':2}}
        by_key={};conflicts=[];duplicates=[]
        for row in rows:
            key=row['cells'][0]
            if key in by_key:
                (duplicates if by_key[key]['cells']==row['cells'] else conflicts).append(row['id'])
            else:by_key[key]=row
        assert duplicates==['Q17'] and conflicts==['Q18']
        result.update(groups=groups,negative={'sameKeyConflict':'Q18','mustNotSilentlyDeduplicate':True},sourceSampleDigest=receipt['sampleSha256'],upstreamFullFileReverified=False)
    elif project_id=='ai-eval':
        matches={candidate:sum(row['cells'][2]['en']==row['cells'][column]['en'] for row in rows) for candidate,column in [('A',3),('B',4)]}
        assert matches=={'A':9,'B':11}
        critical=[row['id'] for row in rows if row['cells'][2]['en']=='Verify' and row['cells'][3]['en']!='Verify']
        assert critical==['E05','E06','E10']
        assert {row['id'] for row in rows[:-1]}!={row['id'] for row in rows}
        result.update(matches=matches,critical=critical,negative={'omittedId':'E12','complete':False})
    elif project_id=='log':
        timeline=[{'id':row['id'],'utc':datetime.fromisoformat('2026-11-26T'+row['cells'][0].replace('Z','+00:00')).astimezone(timezone.utc).strftime('%H:%M:%S')} for row in rows]
        assert next(r for r in timeline if r['id']=='L06')['utc']=='01:58:17'
        assert [r['id'] for r in timeline]==[r['id'] for r in sorted(timeline,key=lambda r:r['utc'])]
        assert rows[0]['cells'][3]=='backup-01' and rows[5]['cells'][3]=='files-02'
        result.update(timeline=timeline,linked=['L03','L05','L06','L07','L08'],negative={'ticketCoversFiles02':False},intrusionProven=False)
    else:
        windows=[{'id':r['id'],'version':r['cells'][1],'requests':int(r['cells'][3]),'rate':int(r['cells'][4])/int(r['cells'][3]),'cpu':int(r['cells'][5])} for r in rows]
        eligible=lambda r:r['version']=='v17' and r['requests']>=100 and r['rate']<.01 and r['cpu']<=65
        assert not eligible(windows[6]) and eligible(windows[7]) and eligible(windows[8])
        assert abs(windows[3]['rate']-18/210)<1e-12 and windows[5]['rate']==.12
        result.update(windows=windows,eligibleRecovery=['R08','R09'],negative={'lowTrafficR07Recovery':False})
    result['passed']=True
    result['retainedFiles']=[{'path':f.relative_to(folder).as_posix(),'sha256':hashlib.sha256(f.read_bytes()).hexdigest()} for f in sorted(folder.rglob('*')) if f.is_file()]
    report.append(result)
Path('checks/practice-growth-20261126/legacy-reference.json').write_text(json.dumps(report,ensure_ascii=False,indent=2),encoding='utf-8')
print('Four retained reference sets independently recalculated; local source bytes unchanged.')
