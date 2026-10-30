import test from 'node:test';
import assert from 'node:assert/strict';
import React from 'react';
import fs from 'node:fs';
import {setLanguage,getLanguage,displayText,localizedElement,protectUserContent} from '../src/i18n/render.js';

test('all extracted source copy has an English entry, with stable Chinese keys',()=>{
  const source=JSON.parse(fs.readFileSync(new URL('../src/i18n/source-copy.json',import.meta.url)));
  const lines=fs.readFileSync(new URL('../src/i18n/en.tsv',import.meta.url),'utf8').trimEnd().split(/\r?\n/);
  const ids=lines.map(line=>Number(line.slice(0,line.indexOf('|'))));
  assert.equal(new Set(ids).size,source.length);assert.equal(lines.length,source.length);
});
test('language affects display only and supports returning to Chinese',()=>{
  protectUserContent();setLanguage('en');assert.equal(getLanguage(),'en');assert.equal(displayText('目标计划'),'Goals and plans');
  assert.match(displayText('本地材料 2 项、任务 1 项'),/2/);
  setLanguage('zh');assert.equal(displayText('目标计划'),'目标计划');
});
test('implicit select values stay Chinese while labels become English',()=>{
  setLanguage('en');const option=localizedElement('option',null,'职业知识');assert.equal(option.props.value,'职业知识');assert.equal(option.props.children,'Career knowledge');
  const explicit=localizedElement('option',{value:'main'},'主计划');assert.equal(explicit.props.value,'main');assert.equal(explicit.props.children,'Main plan');
});
test('form values and component business props are never translated',()=>{
  const input=localizedElement('input',{value:'数据分析',placeholder:'搜索职业、工作任务…'});assert.equal(input.props.value,'数据分析');assert.equal(input.props.placeholder,'Search careers or work tasks…');
  const component=localizedElement(function Field(){},{label:'主计划'},'主计划');assert.equal(component.props.label,'主计划');assert.equal(component.props.children,'主计划');
});
test('user-authored text stays original, including when embedded in interface labels',()=>{
  protectUserContent({claims:[{text:'我的特殊项目：数据分析与测试',title:'原创个人项目甲'}]});
  assert.equal(displayText('我的特殊项目：数据分析与测试'),'我的特殊项目：数据分析与测试');
  assert.match(displayText('原文：我的特殊项目：数据分析与测试'),/^Original: 我的特殊项目：数据分析与测试$/);
  protectUserContent();
});
test('fragments translate visible text without replacing stateful component identities',()=>{
  const fragment=localizedElement(React.Fragment,null,'职业探索');assert.equal(fragment.props.children,'Career exploration');
  const component=()=>null;assert.equal(localizedElement(component,{key:'same'}).type,component);
});
test('original source and textarea text bypass display translation',()=>{
  const source=localizedElement('span',{translate:'no'},'职业探索');assert.equal(source.props.children,'职业探索');
  const text=localizedElement('textarea',{defaultValue:'我的笔记'},'我的笔记');assert.equal(text.props.children,'我的笔记');setLanguage('zh');
});

test('module-level JSX and cloned labels translate when rendered later',()=>{
 setLanguage('zh');const stored=localizedElement(React.Fragment,null,'先看日常工作，');
 setLanguage('en');const rendered=localizedElement('h3',null,stored);assert.equal(rendered.props.children.props.children,'Explore daily work,');
 const input=React.createElement('input',{'aria-label':'示例邮箱',value:'我的原文'});const result=localizedElement('label',null,input);assert.equal(result.props.children.props['aria-label'],'Demo email');assert.equal(result.props.children.props.value,'我的原文');
 assert.equal(displayText('第2种成果，共5种'),'Outcome 2 of 5');setLanguage('zh');
});
