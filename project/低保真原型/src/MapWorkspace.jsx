import React from 'react';
import { careers, learning, cname, confirmed } from './model';
import { taskRoute } from './flow-navigation';

import {mapSkills} from './map-data';
import CareerAtlas from './CareerAtlas';
import {atlasAction,atlasView,atlasTasks,atlasReading,atlasSavedDraft} from './career-atlas-model';
export {mapSkills} from './map-data';

export function MapSkillDetails({ node, s, career, url, link, open, precheck, update, atlasDraft }) {
  const materials = confirmed(s).filter(c => c.skill === node.skill);
  const proposed=atlasDraft||atlasAction(atlasView(new URL(url,location.origin).searchParams,career),url);
  const draft=atlasSavedDraft(s,proposed)||proposed;
  const tasks = atlasTasks(s.tasks,draft);
  const reading=atlasReading(draft,s.reading);
  return <><p className="map-demo-label">原创合成路线 v1 · 非能力认证</p><h3>{node.title}</h3><p>{node.purpose}</p><dl className="facts"><dt>用途与范围</dt><dd>数据分析原创示例；不外推到其他职业。</dd><dt>先修类型</dt><dd>{node.rule}：{node.dependency}</dd><dt>资源与成本</dt><dd>免费中文离线示例；约 1 小时起，可在预检中调整。无真实代码运行器。</dd><dt>成果标准</dt><dd>{node.standard}</dd><dt>检查方法</dt><dd>本人自检或预录文本反馈；没有独立核验。</dd><dt>已有材料</dt><dd>{materials.length ? `${materials.length} 项相关本人确认材料，不等于掌握` : '未知；没有确认材料，不记为零'}</dd><dt>阅读状态</dt><dd>{s.reading.quality ? '已保存阅读位置；不自动满足交付依赖' : '尚无阅读记录；不代表没有学过'}</dd></dl>
    {materials.map(c => <p key={c.id}>材料：{c.title} · v{c.version}</p>)}
    {update && <label className="field"><span>自述学习状态（不改变材料或核验状态）</span><select aria-label="自述学习状态" value={s.mapNodeStatus?.[`${career}:${node.id}`] || '未知'} onChange={e => update({ mapNodeStatus: { ...s.mapNodeStatus, [`${career}:${node.id}`]:e.target.value } })}><option>未知</option><option>已学习</option><option>暂时跳过</option></select></label>}
    <div className="actions"><button onClick={() => open('reading', reading)}>只阅读原创资源</button><button className="primary" onClick={() => precheck(draft)}>生成学习 / 验证草稿</button></div>
    {tasks.map(t => <p key={t.id}>{link(taskRoute(s, t), `${t.completed ? '查看已有成果' : '继续已有任务'}：${t.title}`)} <small>{t.status} · 同一任务，不重复计预算</small></p>)}
    {link('/assessment?tab=成果档案&mapReturn='+encodeURIComponent(url), '已有成果先补材料')}<button onClick={()=>open('resource',{template:'quality',atlasDraft:draft})}>模拟资源失效 / 查看替代</button><p className="caption">生成草稿后仍需预算、归属与交付预检；阅读与跳转均不标记完成。</p>
  </>;
}

export default function MapWorkspace(props){return <CareerAtlas {...props}/>;}
