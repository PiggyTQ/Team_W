import test from 'node:test';
import assert from 'node:assert/strict';
import {scenarioState} from '../src/model.js';
import {profileInsights,profileArchive,hasProfileValue} from '../src/profile-insights-model.js';

test('空画像保留未知，不用默认年级或空白文本计为有记录',()=>{
 const s=scenarioState('PT01'),p=profileInsights(s);assert.equal(p.recorded,0);assert.equal(p.facts.length,0);assert.equal(p.dimensions.length,4);assert.equal(p.gaps.length,3);
 for(const value of ['未知',' unknown ','—','未填写','   ','无',null])assert.equal(hasProfileValue(value),false);
 assert.ok(p.dimensions.every(d=>!d.has));assert.equal('score' in p,false);
});
test('候选、拒绝与撤回不参与依据，贡献不能自动认证协作',()=>{
 const s=scenarioState('PT05');s.claims.push({...s.claims[0],id:'pending',status:'矛盾'},{...s.claims[0],id:'withdrawn',status:'已撤回'},{...s.claims[0],id:'rejected',status:'已拒绝'});
 const p=profileInsights(s);assert.equal(p.facts.length,2);assert.equal(p.pending.length,1);assert.equal(p.contributions.length,2);assert.match(p.dimensions[2].limit,/不等于协作能力证明/);assert.equal(p.gaps[0].id,'pending');
 assert.equal(profileArchive(s.claims,'confirmed').length,2);assert.equal(profileArchive(s.claims,'pending').length,1);assert.equal(profileArchive(s.claims,'excluded').length,2);
});
test('切换职业只改变关联材料和待补项，不重写本人数据',()=>{
 const s=scenarioState('PT05'),before=JSON.stringify(s),a=profileInsights(s);assert.equal(a.related.length,1);assert.equal(JSON.stringify(s),before);
 const b=profileInsights({...s,assessmentCareer:'ops'});assert.equal(b.related.length,0);assert.equal(b.facts.length,a.facts.length);assert.ok(b.gaps.some(g=>g.id==='related'));assert.equal(b.career.skill,'Linux');
});
test('完整记录不制造短板，去掉贡献和复盘后立即重新呈现信息缺口',()=>{
 const s=scenarioState('PT05');s.preferences.location='上海';s.reviews=[{id:'r1',result:'整理了失败原因',next:'对照新产物核查'}];let p=profileInsights(s);assert.equal(p.recorded,4);assert.equal(p.gaps.length,0);
 s.claims=s.claims.map(c=>({...c,contribution:'未知'}));s.reviews=[{id:'empty',result:'未知'}];p=profileInsights(s);assert.equal(p.recorded,2);assert.equal(p.contributions.length,0);assert.ok(p.gaps.some(g=>g.id==='contribution'));assert.ok(p.gaps.some(g=>g.id==='review'));
});
