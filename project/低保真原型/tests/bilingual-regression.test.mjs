import test from 'node:test';
import assert from 'node:assert/strict';
import React from 'react';
import {existsSync} from 'node:fs';
import {execFileSync} from 'node:child_process';
import {setLanguage,displayText,displayPublicText,protectUserContent,localizedElement,registerPublicTranslations} from '../src/i18n/render.js';
import {createPublicTranslations} from '../server/public-translations.mjs';
import {createKnowledgeStore} from '../server/knowledge-store.mjs';
import {compileCareerReport} from '../server/report-copy.mjs';
const chinese=/[\u3400-\u9fff]/;

test('current JSX, attributes, messages and bundled data have complete translation entries',()=>{
  const result=execFileSync(process.execPath,['scripts/prepare-bilingual.mjs','--check'],{encoding:'utf8'});
  assert.equal(JSON.parse(result).exactMissing,0);
});
test('screenshot regressions translate entire sentences; unknown copy never becomes a mixed word salad',()=>{
  protectUserContent();setLanguage('en');
  for(const text of ['本周日程','先从独立探索开始','展示数据库与来源说明','从账户记录导出职业准备文档','正文阅读','实践与素材','参考与自查','视频参考','阅读位置单独保存，不代表任务完成。'])assert.equal(chinese.test(displayText(text)),false,text);
  assert.equal(displayText('这里有尚未收录的紫色独角鲸提示'),'这里有尚未收录的紫色独角鲸提示');
  setLanguage('zh');assert.equal(displayText('本周日程'),'本周日程');
});
test('personal text stays original even when equal to site copy; public scopes still translate that same title',()=>{
  setLanguage('en');protectUserContent({title:'正文阅读',text:'本人项目甲：处理重复行与缺失值'});
  assert.equal(displayText('正文阅读'),'正文阅读');assert.equal(displayPublicText('正文阅读'),'Read');
  const publicTree=localizedElement(React.Fragment,{'data-i18n':'public'},React.createElement('strong',null,'正文阅读'));
  assert.equal(publicTree.props.children.props.children,'Read');
  const privateTree=localizedElement('p',{translate:'no'},'本人项目甲：处理重复行与缺失值');assert.equal(privateTree.props.children,'本人项目甲：处理重复行与缺失值');
  const input=localizedElement('input',{value:'本人项目甲',placeholder:'正文阅读'});assert.equal(input.props.value,'本人项目甲');
  registerPublicTranslations({'公开新增测试条目':'A new public entry','正文阅读':'Wrong replacement'});assert.equal(displayPublicText('公开新增测试条目'),'A new public entry');assert.equal(displayPublicText('正文阅读'),'Read');
  protectUserContent();setLanguage('zh');
});
test('public translation envelopes keep original catalog data and provide complete paragraphs for careers and jobs',()=>{
  const k=createKnowledgeStore(existsSync('server/data/knowledge.sqlite')?'server/data/knowledge.sqlite':'.deploy-cache/knowledge-v2.sqlite'),copy=createPublicTranslations();
  try{
    for(const career of ['data','ai','security','ops','frontend','backend','engineering','testing','software','delivery']){
      const original=k.get('/api/catalog/profiles/'+career,new URLSearchParams()),before=JSON.stringify(original),result=copy.envelope(original);
      assert.equal(JSON.stringify(original),before);assert.equal(chinese.test(result.publicTranslations[original.profile.definition]),false);assert.ok(result.publicTranslations[original.profile.definition]);
    }
    const jobs=k.get('/api/catalog/jobs',new URLSearchParams('market=CN&limit=20'));
    const result=copy.envelope(jobs);for(const job of jobs.items)for(const field of ['title','location','text'])if(chinese.test(job[field])){assert.ok(result.publicTranslations[job[field]],job.id+':'+field);assert.equal(chinese.test(result.publicTranslations[job[field]]),false);}
  }finally{k.close();}
});
test('textarea labels and hints translate while typed values and default content stay original',()=>{
  setLanguage('en');protectUserContent();
  const textarea=localizedElement('textarea',{'aria-label':'正文阅读',placeholder:'正文阅读',value:'本人输入的原文'},'默认原文');
  assert.equal(textarea.props['aria-label'],'Read');assert.equal(textarea.props.placeholder,'Read');assert.equal(textarea.props.value,'本人输入的原文');assert.equal(textarea.props.children,'默认原文');
  const cloned=localizedElement('label',null,React.createElement('textarea',{'aria-label':'正文阅读',value:'本人输入的原文'}));assert.equal(cloned.props.children.props['aria-label'],'Read');assert.equal(cloned.props.children.props.value,'本人输入的原文');setLanguage('zh');
});
test('English report translates generated sections while preserving original personal material',()=>{
  const personal='本人项目甲：记录12条测试结果，未声称能力认证。',contribution='我负责整理原始记录';
  const state={claims:[{id:'mine',version:1,status:'已确认',title:'本人原始项目',text:personal,contribution,skill:'SQL'}],tasks:[],budget:3};
  const text=compileCareerReport({state,profile:null,metadata:{version:'demo'},notice:'Demo',skillRows:[],language:'en',now:'2026-10-28T01:00:00Z'});
  assert.ok(text.startsWith('# Career preparation record'));assert.ok(text.includes(personal));assert.ok(text.includes(contribution));assert.ok(text.includes('not independently verified'));assert.ok(!text.includes('生成时间'));
});
