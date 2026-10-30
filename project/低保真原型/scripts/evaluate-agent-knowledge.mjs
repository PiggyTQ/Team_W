import fs from 'node:fs';
import assert from 'node:assert/strict';
import {reviewedLibrary,loadGuidance} from '../server/agent/library.mjs';
const cases=JSON.parse(fs.readFileSync(new URL('../knowledge/evaluation-cases-v1.json',import.meta.url)));
const k=reviewedLibrary(),snapshot=k.snapshot(),results=[];
for(const c of cases.retrieval){const hits=k.search(snapshot,{query:c.query,career:c.career,limit:3});const rank=hits.findIndex(h=>h.sourceId===c.expected)+1;results.push({id:c.id,career:c.career,expected:c.expected,rank:rank||null,pass:rank>0,actual:hits.map(h=>h.sourceId)});assert.ok(hits.every(h=>h.career===c.career));}
const pack=loadGuidance();assert.ok(pack.sources.every(s=>s.review.humanApprovalClaimed===false));
assert.ok(pack.sources.every(s=>!s.content.includes('当前国内样本明显偏重')&&!s.content.includes('当前样本偏向')));
const report={knowledgeVersion:snapshot.version,knowledgeDigest:snapshot.digest,caseVersion:cases.version,paidCalls:0,method:'expected source present in top 3; this does not prove semantic answer quality',cases:results,total:results.length,passed:results.filter(r=>r.pass).length,studentStudyCompleted:false};
const directory=new URL('../checks/AI业务闭环_20261028/',import.meta.url);fs.mkdirSync(directory,{recursive:true});fs.writeFileSync(new URL('retrieval-report.json',directory),JSON.stringify(report,null,2)+'\n');
console.log(JSON.stringify({passed:report.passed,total:report.total,failures:results.filter(r=>!r.pass)}));if(report.passed!==report.total)process.exitCode=1;
