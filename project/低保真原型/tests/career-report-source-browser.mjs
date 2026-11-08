import {chromium} from '@playwright/test';
import assert from 'node:assert/strict';
import {captureCareerReportSources} from '../src/career-report-sources.js';

const origin=process.env.CAREER_PREVIEW_ORIGIN||'http://127.0.0.1:5184';
const state={preferences:{interestType:'INTJ',interest:'中文与🙂、𠮷和组合字符 e\u0301',capabilityMastery:{SQL:true}},education:[{id:'学校𠮷',version:1,status:'已确认',school:'学校🙂',courses:'课程尾部🙂'.repeat(200)}],claims:[{id:'claim',version:1,status:'已确认',skill:'SQL',text:'确认原文🙂'.repeat(200)}],tasks:[{id:'task-𠮷',version:2,status:'完成',completed:true,note:'长成果尾部𠮷'.repeat(200),attempts:[{id:'attempt',version:1,text:'已提交产物🙂'.repeat(500),result:'自检记录'}]}],reportSources:{uploads:[{id:'upload-🙂',createdAt:'2026-11-08T00:00:00.000Z',title:'上传𠮷',description:'长项目说明🙂'.repeat(500),contribution:'本人负责',career:'data',completed:true,file:{name:'成果🙂.md',type:'text/markdown',size:100}}],planRecords:{goals:[{id:'goal',title:'周目标🙂',period:'week',periodStart:'2026-11-02',due:'2026-11-08',progress:20,priority:'高'}]},status:'ready'}};
const expected=captureCareerReportSources(state),browser=await chromium.launch({channel:process.env.CAREER_BROWSER_CHANNEL||'msedge',headless:true});
try{
 const page=await browser.newPage();await page.goto(origin);
 const actual=await page.evaluate(async input=>{const {captureCareerReportSources}=await import('/src/career-report-sources.js');return captureCareerReportSources(input);},state);
 assert.deepEqual(actual,expected);
 console.log('PASS report source snapshots and complete-text change signatures match across Node and browser, including supplementary Unicode.');
}finally{await browser.close();}
