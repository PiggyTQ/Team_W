import ProductIcon from './ProductIcon';
import ReportDecisionDesk,{ReportSnapshotBrief} from './ReportDecisionDesk';
import CareerDetail from './CareerDetail';
import './output-workspace.css';
import ProfileInsights from './ProfileInsights';
import PlanGoalContext from './PlanGoalContext';
import React, { useState, useLayoutEffect, useRef } from "react";
import LandingIntro from "./LandingIntro";
import HomeScroll from "./HomeScroll";
import HomePolish from './HomePolish';
import WorkspaceHome from './WorkspaceHome';
import {activeWorkspaceTask,pendingMaterials} from './workspace-guidance';
import PlanStructureDisclosure from './PlanStructureDisclosure';
import {ResumeEducation,EducationOutput} from './CompletionPanels';
import {educationFacts,resumeUnavailable} from './completion-model';
import ReportStoryStudio,{ReportVersionTrail} from './ReportStoryStudio';
import ThematicReport from './ThematicReport';
import ResumeCompositionControls from './ResumeCompositionControls';
import {confirmedResumeProfile} from './resume-content-model';
import ResumeDocumentStudio from './ResumeDocumentStudio';
import {resumeStudioDraft,orderedResumeFacts,selectResumeFact,resumeRelations,targetResumeStudio} from './report-studio-model';
import './report-studio.css';
import LandingTail,{PublicNavigation} from './LandingTail';
import {EntryDeck,JourneyPath,DirectionGallery} from './LandingJourney';
import LearningCentre from "./LearningCentre";
import {SavedSearches} from "./ContinuityPanels";
import { careers, learning, cname, confirmed, usedHours } from "./model";
import { practiceDestination } from './flow-navigation';
import AssistantPageHeader from './AssistantPageHeader';
import AssistantWorkspace from './AssistantWorkspace';
import SegmentedControl from './SegmentedControl';
import BudgetCapacity from './BudgetCapacity';
import ControlIcon from './ControlIcon';
import {PageIntroduction} from './PageGuidance';
import GrowthOverview from './GrowthOverview';
import EvidenceAssessment from './EvidenceAssessment';
import { ReportReferences } from "./AlignmentDialogs";
import {reportRows,reportReferencesUnavailable} from './alignment-model';
import {careerMatches} from './workspace-search-model';
import {displayText} from './i18n/render';
import {jobPreparationSource} from './route-model';
import {PlanBoard} from "./TaskEditing";
import {reportIsStale} from "./alignment-model";
import { OpportunitySummary, isArchivedJob } from './JobDiscovery';

// Let a tall panel reveal its bottom before it sticks inside the workspace.
function StickyAside({ className, children }) {
  const ref = useRef(null);
  useLayoutEffect(() => {
    const panel = ref.current;
    const workspace = panel.closest('main');
    const measure = () => {
      panel.style.setProperty('--panel-sticky-top', Math.min(16, workspace.clientHeight - parseFloat(getComputedStyle(workspace).paddingTop) - panel.offsetHeight - 16) + 'px');
    };
    const observer = new ResizeObserver(measure);
    observer.observe(panel);
    observer.observe(workspace);
    measure();
    return () => observer.disconnect();
  }, []);
  return <aside ref={ref} className={className + ' sticky-context-panel'}>{children}</aside>;
}

function Icon(props){return <ProductIcon {...props}/>;}
const navIcons = { "U03": "home", "U04": "user", "U05": "compass", "U06": "map", "U07": "plan", "U08": "book", "U10": "file", "U11": "chat" };
function PageHead({ title, description, action, persistentDescription=false }) {
  return <header className="screen-heading"><div><h1>{title}</h1><PageIntroduction title={title} description={description} persistent={persistentDescription}/></div>{action}</header>;
}
function Outcome({ title, children }) {
  return <aside className="outcome"><Icon name="file" /><div><h3>{title}</h3>{children}</div></aside>;
}
function PublicView({ s, go, open, link }) {
  return <><HomeScroll/><HomePolish/>
 <PublicNavigation logged={s.logged} go={go} open={open} Icon={Icon}/>
 <LandingIntro go={go} open={open} />
 <EntryDeck link={link} Icon={Icon}/>
 <JourneyPath open={open}/>
 <DirectionGallery careers={careers} open={open}/>
 <LandingTail go={go} open={open} link={link}/>
 </>;
}
function DashboardView({ s, link, open, precheck, startTask, update, tell, suggestions }) {
  const pending = pendingMaterials(s), next = activeWorkspaceTask(s);
  const action = s.analysisStale ? {
    title: '职业准备依据已变化', desc: '复查变化的材料与引用，再确认需要更新的分析范围。', to: '/assessment?tab=四维与差距', label: '核对并更新依据'
  } : pending.length ? {
    title: pending.length+' 项材料待确认', desc: '核对原文与本人贡献后，再将材料用于职业准备分析。', to: '/assessment?tab=原文确认', label: '核对待确认材料'
  } : next ? {
    title: next.title, desc: next.purpose, task: next, label: next.status==='受阻'?'记录并处理阻塞':'继续任务'
  } : s.goal ? {
    title: '核对'+cname(s.goal)+'的准备情况', desc: '对照职业要求，检查已有材料与待补充内容。', to: '/assessment?tab=四维与差距', label: '查看职业准备'
  } : {
    title: '用已有经历查看职业准备', desc: '选择一个对照方向，查看已有材料能支持什么，以及还需要验证什么。', to: '/assessment?tab=四维与差距', label: '查看职业准备'
  };
  return <WorkspaceHome s={s} link={link} open={open} startTask={startTask} update={update} tell={tell} action={action} pending={pending} Icon={Icon} suggestions={suggestions}/>;
}

function CareerBrowser({ s, url, filter, onFilter, move, link, open, toggleCompare, update }) {
  const [filtersOpen, setFiltersOpen] = useState(false);
  const params = new URL(url, location.origin).searchParams, q = params.get("q") || "", current = careers.find((c) => c.id === params.get("career"));
  const listPosition = useRef(null), wasDetail = useRef(Boolean(current));
  useLayoutEffect(() => {
    let frame;
    if (!current && wasDetail.current && listPosition.current) {
      const position = listPosition.current;
      frame = requestAnimationFrame(() => {
        window.scrollTo(0, position.page);
        document.getElementById('main')?.scrollTo(0, position.main);
      });
    }
    wasDetail.current = Boolean(current);
    return () => cancelAnimationFrame(frame);
  }, [current?.id]);
  const [group, setGroup] = useState("\u5168\u90E8\u65B9\u5411");
  const matches = careers.filter((c) => careerMatches(c,q,displayText) && (filter !== "\u6709\u76F8\u5173\u6750\u6599" || confirmed(s).some((x) => x.skill === c.skill)) && (group === "\u5168\u90E8\u65B9\u5411" || (group === "\u6570\u636E\u4E0E\u667A\u80FD" ? ["data", "ai", "engineering"].includes(c.id) : group === "\u5F00\u53D1\u4E0E\u4EA4\u4ED8" ? ["frontend", "backend", "software", "delivery", "testing"].includes(c.id) : ["security", "ops"].includes(c.id))));
  function query(v) {
    move(`/careers?q=${encodeURIComponent(v)}`, true);
  }
  return <div className={`explore-layout ${filtersOpen ? "filters-open" : ""}`}><button className="mobile-filter-toggle" aria-expanded={filtersOpen} onClick={() => setFiltersOpen(!filtersOpen)}><Icon name="search" size={16}/><span>{filtersOpen ? "收起筛选与比较篮" : "筛选与比较篮"}</span><span>{s.compare.length} / 3 已选</span></button><StickyAside className="explore-filter"><h2>按你关心的工作找<svg className="filter-title-flourish" viewBox="0 0 40 48" fill="none" stroke="currentColor" strokeWidth="3" strokeLinecap="round" aria-hidden="true"><path d="M10 19C27 15 33 8 29 7S13 11 10 19ZM13 28c16 11 23 7 17 2s-14-4-17-2ZM9 29l-5 9M4 12l2-7"/></svg></h2><label className="field"><span>搜索职业、工作任务或技能</span><div className="search-input"><Icon name="search" size={18} /><input aria-label="搜索职业、工作任务或技能" name="career-search" value={q} onChange={(e) => query(e.target.value)} placeholder="例如：数据、SQL…" /></div></label><label className="field"><span>候选来源</span><select aria-label="候选来源" value={["\u5168\u90E8", "\u6709\u76F8\u5173\u6750\u6599", "\u5174\u8DA3\u63A2\u7D22"].includes(filter) ? filter : "\u5168\u90E8"} onChange={(e) => onFilter(e.target.value)}><option>全部</option><option>有相关材料</option><option>兴趣探索</option></select></label><fieldset><legend>基础方向</legend>{["\u5168\u90E8\u65B9\u5411", "\u6570\u636E\u4E0E\u667A\u80FD", "\u5F00\u53D1\u4E0E\u4EA4\u4ED8", "\u5B89\u5168\u4E0E\u8FD0\u7EF4"].map((x) => <label key={x} className="check"><input type="radio" name="career-group" checked={group === x} onChange={() => setGroup(x)} />{x}</label>)}</fieldset><p className="caption explore-invitation">没有确认方向？先自由探索！</p><details className="comparison-pocket"><summary>我的比较篮 <span>{s.compare.length} / 3</span></summary><h3>我的比较篮 <span>{s.compare.length} / 3</span></h3>{s.compare.length ? s.compare.map((cid) => <div key={cid}><span>{cname(cid)}</span><button aria-label={`\u79FB\u9664${cname(cid)}`} onClick={() => toggleCompare(cid)}>移除</button></div>) : <p>选两个感兴趣的方向，比一比工作、已有材料和未知。</p>}{link("/careers?tab=\u6BD4\u8F83", "\u6253\u5F00\u6BD4\u8F83", "button primary")}</details></StickyAside>
 <div className="explore-main">{current ? <CareerDetail key={current.id} current={current} s={s} q={q} link={link} open={open} toggleCompare={toggleCompare} update={update}/> : <><div className="section-heading exploration-section-heading"><img className="exploration-mascot" src="/illustrations/cheese-scenes/explore.png" alt="" aria-hidden="true"/><div><h2>从日常工作认识职业</h2><p>当前范围 {matches.length} 个原创摘要 · 不按薪酬或适合度排名</p></div><span className="status-chip">十个基础方向</span></div>{matches.length ? <div className="occupation-grid" onClickCapture={e => {if (!e.target.closest("button")) listPosition.current = {page:window.scrollY, main:document.getElementById("main")?.scrollTop || 0};}}>{matches.map((c) => <article key={c.id} className="exploration-career-card" data-career={c.id}><img className="career-card-background" src={`/illustrations/career-backgrounds/${c.id}.png`} alt="" aria-hidden="true" loading="lazy"/><div className="occupation-card-top"><span className="occupation-avatar"><Icon name={c.id} /></span><button aria-label={`\u6536\u85CF${c.name}`} onClick={() => update({ favorites: s.favorites.includes(c.id) ? s.favorites.filter((x) => x !== c.id) : [...s.favorites, c.id] })} aria-pressed={s.favorites.includes(c.id)}><ProductIcon name="heart" size={17} filled={s.favorites.includes(c.id)}/>{s.favorites.includes(c.id) ? "\u5DF2\u6536\u85CF" : "\u6536\u85CF"}</button></div><h3>{link(`/careers?career=${c.id}&q=${encodeURIComponent(q)}`, c.name)}</h3><p>{c.task}</p><div className="occupation-output"><span>会形成什么</span><p>{c.output}</p></div><div className="occupation-tags"><span>{c.skill}</span><span>{c.branch.split(" / ")[0]}</span></div><div className="occupation-actions">{link(`/careers?career=${c.id}&q=${encodeURIComponent(q)}`, "\u4E86\u89E3\u5DE5\u4F5C \u2192")}<button onClick={() => toggleCompare(c.id)} aria-pressed={s.compare.includes(c.id)}>{s.compare.includes(c.id) ? "\u79FB\u51FA\u6BD4\u8F83" : "\u52A0\u5165\u6BD4\u8F83"}</button></div></article>)}</div> : <div className="light-empty"><Icon name="search" size={28} /><h3>没有找到符合条件的方向</h3><p>可清空关键词，或暂时不按个人材料筛选。</p><button onClick={() => {
    onFilter("\u5168\u90E8");
    setGroup("\u5168\u90E8\u65B9\u5411");
    query("");
  }}>放宽筛选</button></div>}</>}</div></div>;
}
function RouteView({ s, tab, url, move, link, open, precheck }) {
  const params = new URL(url, location.origin).searchParams, skills = tab === "\u6280\u80FD\u5148\u4FEE", list = params.get("view") === "\u5217\u8868", career = params.get("career") || s.goal || "data";
  const [scope, setScope] = useState("\u5F53\u524D\u65B9\u5411");
  const template = learning.find((l) => l.career === career);
  const skillNodes = [{ title: "\u7406\u89E3\u95EE\u9898\u4E0E\u6570\u636E", note: "\u5EFA\u8BAE\u57FA\u7840 \xB7 \u672A\u77E5\u4E5F\u53EF\u9605\u8BFB", skill: "\u7406\u89E3\u8868\u683C" }, { title: "SQL \u67E5\u8BE2", note: "\u4EFB\u9009\u4E00\u6761\u6280\u672F\u8DEF\u5F84", skill: "SQL" }, { title: "\u8868\u683C\u5DE5\u5177", note: "\u4E0E SQL \u4E3A OR \u5907\u9009", skill: "\u8868\u683C\u5DE5\u5177" }, { title: "\u8D28\u91CF\u95EE\u9898\u6E05\u5355", note: "\u5FC5\u8981\u4EA4\u4ED8\u4E4B\u4E00", skill: "\u8D28\u91CF\u95EE\u9898\u6E05\u5355" }, { title: "\u8BF4\u660E\u5904\u7406\u7406\u7531\u4E0E\u5C40\u9650", note: "\u5FC5\u8981\u4EA4\u4ED8\u4E4B\u4E00", skill: "\u8868\u8FBE\u4E0E\u5C40\u9650" }];
  return <><div className="route-controls"><label className="field"><span>当前方向</span><select aria-label="当前方向" value={career} onChange={(e) => move(`/career-map?tab=${encodeURIComponent(tab || "\u804C\u4E1A\u5173\u7CFB")}&career=${e.target.value}&view=${list ? "\u5217\u8868" : "\u56FE"}`)}>{careers.map((c) => <option key={c.id} value={c.id}>{c.name}</option>)}</select></label><label className="field"><span>范围</span><select aria-label="范围" value={scope} onChange={(e) => setScope(e.target.value)}><option>当前方向</option><option>相关方向与分支</option></select></label><label className="field"><span>查看方式</span><select aria-label="查看方式" value={list ? "\u5217\u8868" : "\u56FE"} onChange={(e) => move(`/career-map?tab=${encodeURIComponent(tab || "\u804C\u4E1A\u5173\u7CFB")}&career=${career}&view=${e.target.value}`)}><option>图</option><option>列表</option></select></label></div><div className="route-layout"><section className="route-canvas"><header><h2>{skills ? "\u5B66\u4E60\u987A\u5E8F\u4E0D\u662F\u5168\u5957\u5FC5\u4FEE\u8BFE" : "\u6709\u54EA\u4E9B\u76F8\u90BB\u5DE5\u4F5C\u503C\u5F97\u4E86\u89E3\uFF1F"}</h2><p>{skills ? "\u7406\u89E3\u57FA\u7840\u3001\u9009\u62E9\u4E00\u6761\u5DE5\u5177\u8DEF\u5F84\uFF0C\u518D\u5F62\u6210\u5B8C\u6574\u4EA7\u7269\u3002" : "\u5148\u770B\u4EFB\u52A1\u5DEE\u5F02\u548C\u5171\u4EAB\u57FA\u7840\u3002\u56FE\u4E2D\u7684\u6865\u63A5\u4EC5\u4E3A\u5408\u6210\u63A2\u7D22\u8BF4\u660E\uFF0C\u4E0D\u627F\u8BFA\u8F6C\u5C97\u3002"}</p></header>{skills && career !== "data" ? <div className="light-empty"><Icon name="map" size={30} /><h3>这个职业的技能路线还未发布</h3><p>不把数据分析路线套用到其他方向，也不补造必需关系。可以先看该方向的原创任务预览，或整理已有材料。</p>{link("/learning", "查看可用学习内容 \u2192")}{link(`/careers?career=${career}`, "\u56DE\u804C\u4E1A\u8BE6\u60C5 \u2192")}</div> : skills ? list ? <ol className="route-equivalent">{skillNodes.map((n) => <li key={n.title}><button onClick={() => open("skill", { skill: n.skill, career })}>{n.title}</button><p>{n.note} · {confirmed(s).some((c) => c.skill === n.skill) ? "\u6709\u76F8\u5173\u786E\u8BA4\u6750\u6599\uFF0C\u6838\u9A8C\u672A\u77E5" : "尚无相关经历材料"}</p></li>)}</ol> : <div className="branch-map"><button className="root-node" onClick={() => open("skill", { skill: "\u7406\u89E3\u8868\u683C", career })}>理解问题与数据<small>建议基础；未知仍可阅读</small></button><div className="branch-stem" /><div className="tool-choices"><button onClick={() => open("skill", { skill: "SQL", career })}>SQL 查询<small>{confirmed(s).some((c) => c.skill === "SQL") ? "\u6709\u76F8\u5173\u786E\u8BA4\u6750\u6599" : "\u6750\u6599\u72B6\u6001\u672A\u77E5"}</small></button><span>OR<br />任选其一</span><button onClick={() => open("skill", { skill: "\u8868\u683C\u5DE5\u5177", career })}>表格工具<small>替代技术路径</small></button></div><div className="branch-stem" /><button className="delivery-node" onClick={() => open("skill", { skill: "\u8D28\u91CF\u95EE\u9898\u6E05\u5355", career })}>问题清单 + 处理理由 + 限制说明<small>AND · 按产物标准记录，不因已读自动满足</small></button></div> : list ? <div className="relation-list">{careers.filter((c) => [career, "data", "ai", "engineering"].includes(c.id)).map((c) => <article key={c.id}><h3>{link(`/careers?career=${c.id}`, c.name)}</h3><p>{c.task}</p><button onClick={() => open("relation", { from: career, to: c.id })}>查看共同基础与局限</button></article>)}</div> : <div className="occupation-map"><div className="neighbor-nodes">{careers.filter((c) => [career, "data", "ai", "engineering"].includes(c.id) && c.id !== career).slice(0, scope === "\u5F53\u524D\u65B9\u5411" ? 2 : 3).map((c) => <div key={c.id}><button onClick={() => open("relation", { from: career, to: c.id })} className="relation-edge">学习桥接说明</button><button className="neighbor-node" onClick={() => move(`/careers?career=${c.id}`)}>{c.name}<small>{c.branch}</small></button></div>)}</div><button className="focus-node" onClick={() => move(`/careers?career=${career}`)}><Icon name="compass" size={25} />{cname(career)}<small>当前探索方向</small></button></div>}<div className="map-legend"><span>建议基础</span><span>OR 任选技术</span><span>AND 必要产物</span><small>阅读 / 任务 / 证据 / 核验分别记录</small></div></section><aside className="context-block route-help"><h2>选择技能后可以做什么？</h2><ol><li>看它与当前工作任务的关系。</li><li>检查你已有的材料和未知项。</li><li>选择先阅读、补材料，或开始小范围验证。</li></ol><button className="primary" onClick={() => precheck({ title: template?.title || "\u5F53\u524D\u65B9\u5411\u77ED\u9A8C\u8BC1", template: template?.id || "external", career, purpose: "\u6F84\u6E05\u5F53\u524D\u65B9\u5411\u7684\u5DF2\u6709\u6750\u6599\u4E0E\u672A\u77E5\u8303\u56F4", product: template?.product || "\u5B9E\u9645\u884C\u52A8\u3001\u7ED3\u679C\u4E0E\u9650\u5236\u8BB0\u5F55" })}>检查时间并安排实践</button>{link("/assessment?tab=\u6210\u679C\u6863\u6848", "\u5DF2\u6709\u6210\u679C\u5148\u8865\u6750\u6599 \u2192")}{link("/learning", "\u5148\u770B\u6709\u9650\u5B66\u4E60\u5185\u5BB9 \u2192")}<p className="caption">当前展示原创合成图例。未获准的真实关系和缺失依赖不会被自动补齐。</p></aside></div></>;
}
function PlanOverview({ s, open, link, precheck, startTask, update, confirmAction, adjustment }) {
  const active = s.tasks.filter((t) => !["\u5B8C\u6210", "\u8DF3\u8FC7", "\u53D6\u6D88", "\u5EF6\u671F"].includes(t.status));
  return <><div className="plan-overview"><div className="plan-primary"><section className="goal-statement">
   <div className="plan-goal-summary"><span className="caption">当前主目标</span><h2>{s.goal ? cname(s.goal) : "\u8FD8\u6CA1\u5B9A\u65B9\u5411\uFF1F\u5148\u505A\u4E00\u6B21\u72EC\u7ACB\u63A2\u7D22\u3002"}</h2><p>{s.decision.reason || "\u4F60\u7684\u9009\u62E9\u7406\u7531\u4F1A\u4FDD\u7559\u5728\u8FD9\u91CC\u3002\u53EF\u5148\u8BB0\u5F55\u7591\u95EE\uFF0C\u4E0D\u5FC5\u4E3A\u5F00\u59CB\u884C\u52A8\u5F3A\u884C\u786E\u5B9A\u76EE\u6807\u3002"}</p><span className="caption">备用：{cname(s.backup)} · 计划 v{s.planVersion}</span></div>
   <PlanGoalContext s={s} link={link}/>
   <div className="plan-goal-actions"><button onClick={() => open("goal", { goal: s.goal || "data", backup: s.backup || "", reason: s.decision.reason })}>编辑目标并预览</button>{adjustment}</div>
  </section></div><aside className="weekly-budget"><div className="section-heading"><h2>本周时间预算</h2><Icon name="clock" /></div><BudgetCapacity s={s} link={link}/><button onClick={() => open("scenario", { budget: s.budget ?? 0, goal: s.goal || "", base: s.planVersion, policy: "\u5EF6\u540E\u8D85\u989D\u4EFB\u52A1" })}>调整预算 / 临时推演</button></aside></div>
  <PlanStructureDisclosure s={s} update={update} precheck={precheck} startTask={startTask} link={link}/>{!s.tasks.length&&s.taskDraft&&<div className="draft-recovery"><div>未开始的预检草稿：{s.taskDraft.title}<small>目的和选择已保留，没有占用任务预算。</small></div><button onClick={()=>open("precheck",s.taskDraft)}>恢复预检草稿</button></div>}{s.tasks.length>0&&<PlanBoard s={s} open={open} link={link} precheck={precheck} startTask={startTask} update={update} confirmAction={confirmAction}/>}</>;
}

function LearningCatalogue(props) { return <LearningCentre {...props}/>; }
function ProfileOverview({ s, link }) {
  return <ProfileInsights s={s} link={link}/>;
}

function AssessmentResultView(props) { return <EvidenceAssessment {...props} />; }
function WorkStatus({ task, link, s }) {
  const latest=task.attempts.at(-1),base='/work/'+encodeURIComponent(task.id);
  const material=(s?.claims||[]).filter(c=>c.taskId===task.id&&c.attemptId===latest?.id),pending=material.some(c=>['待确认','疑似重复','矛盾'].includes(c.status)),allConfirmed=material.length>0&&material.every(c=>c.status==='已确认');
  const materialText=pending?'候选待本人确认':allConfirmed?'本人已确认，核验未知':material.length?'候选已处置':'未形成候选';
  const steps=[
   {label:'任务执行',text:task.status,to:base,done:task.completed},
   {label:'成果尝试',text:latest?'已提交 v'+latest.version:'未提交',to:base+'?tab=尝试与反馈',done:!!latest},
   {label:'检查方法与结果',text:task.check+' · 非独立实核',to:base+'?tab=尝试与反馈',done:latest?.result==='自检记录'},
   {label:'个人材料确认',text:materialText,to:material.length?'/assessment?tab=原文确认':base+'?tab=完成回执',done:allConfirmed}
  ];
  return <nav className="work-status milestone-trail" aria-label="任务过程与独立状态">{steps.map(step=>React.cloneElement(link(step.to,<><span className="milestone-symbol">{step.done?<ControlIcon name="check" size={15}/>:<i/>}</span><span className="milestone-copy"><span>{step.label}</span><small>{step.text}</small></span><ControlIcon name="arrow" size={14}/></>),{key:step.label,'data-recorded':step.done}))}</nav>;
}
function ReportWorkspace({ s, tab, id, link, open, update, go, tell, createReport, reportSnapshot, defaultBody, tabs }) {
  const [editing, setEditing] = useState(false);
  const r = s.reports.find((r2) => r2.id === id);
  const draft=resumeStudioDraft(s),studioFacts=orderedResumeFacts(s,draft),selectedFacts=draft.claimIds.map(id=>confirmed(s).find(c=>c.id===id)).filter(Boolean),targetJob=s.jobs.find(j=>j.id===draft.target);
  const changeDraft=patch=>update(x=>({...x,resumeStudioDraft:{...resumeStudioDraft(x),...patch}}));
  const openStudioPreview=()=>{
    if(draft.target&&!targetJob){tell('原岗位已不可用，请重新选择岗位，或明确选择通用简历。');return;}
    if(!draft.claimIds.length&&!draft.educationIds.length){tell('请选择至少一项确认经历或教育记录；缺材料可返回事实源补充。');return;}
    const issue=resumeRelations(s,draft).issue;if(issue){tell(issue+' 请先清空失效关联并重新编排。');return;}
    open('resumePreview',{claimIds:draft.claimIds,educationIds:draft.educationIds,target:draft.target,name:draft.name||(draft.includeProfile?confirmedResumeProfile(s)?.name:'')||'示例用户',includeProfile:draft.includeProfile&&!!confirmedResumeProfile(s),placements:draft.placements,wording:'保留原文',tailoring:draft.tailoring,sourceResumeId:draft.sourceResumeId,studio:true});
  };
  if(id && !r) return <section className="unavailable-object"><h1>找不到这份报告</h1><p>报告已移除或链接失效，请从列表重新选择；不会显示另一份报告代替。</p><div className="actions">{link("/reports","回报告列表","button")}{link("/app","回工作区")}</div></section>;
  const withdrawn = !!r&&reportReferencesUnavailable(s,r);
  return <div className="output-workspace"><PageHead title={tab === "岗位简历" ? "岗位求职简历" : "职业规划报告"} description={tab === "岗位简历" ? "围绕目标选经历，核对表达后保存与导出。" : "把选择、依据与行动整理成可以回看的阶段判断。"} />{tabs(["\u804C\u4E1A\u62A5\u544A", "\u5C97\u4F4D\u7B80\u5386"])}{tab === "\u5C97\u4F4D\u7B80\u5386" ? <div className="resume-layout resume-document-layout"><ResumeDocumentStudio s={s} draft={draft} change={changeDraft} link={link} preview={openStudioPreview} controls={<section className="workspace-section"><h2>选择要呈现的经历</h2><p>没有目标岗位也可制作通用简历。只使用本人确认事实，缺少数字留空。</p><form onSubmit={(e) => {
    e.preventDefault();openStudioPreview();
  }}><div className="cols2"><label className="field"><span>姓名（示例用途，不参与分析）</span><input aria-label="姓名（示例用途，不参与分析）" name="name" autoComplete="off" value={draft.name} onChange={e=>changeDraft({name:e.target.value})} placeholder="填写示例姓名…" /></label><label className="field"><span>目标岗位</span><select aria-label="目标岗位" name="target" value={draft.target} onChange={e=>changeDraft({target:e.target.value,tailoring:{}})}><option value="">通用简历</option>{draft.target&&!targetJob&&<option value={draft.target}>原岗位已不可用，请重新选择</option>}{s.jobs.map((j) => <option key={j.id} value={j.id}>{j.title}</option>)}</select></label></div>{studioFacts.length ? studioFacts.map((c, i) => <label className="resume-fact" key={c.id}><input type="checkbox" name="claims" value={c.id} checked={draft.claimIds.includes(c.id)} onChange={e=>changeDraft(selectResumeFact(draft,c.id,e.target.checked))} /><div><h3>{c.title}</h3><p>{c.contribution || "\u672C\u4EBA\u8D21\u732E\u5F85\u586B\u5199\uFF0C\u4E0D\u8865\u9020"}</p><small>材料 v{c.version} · {c.skill} · 本人确认，未独立核验</small></div></label>) : <div className="light-empty"><h3>先核对课程、项目或实习经历，确认后就能选择要写进简历的内容。</h3><p>已有课程项目或自主作品都可以记录，不把它们冒充实习。</p>{link("/assessment", "\u8865\u7ECF\u5386\u5E76\u672C\u4EBA\u786E\u8BA4 \u2192")}</div>}<ResumeEducation s={s} selectedIds={draft.educationIds} onToggle={(id,checked)=>changeDraft({educationIds:checked?[...draft.educationIds,id]:draft.educationIds.filter(x=>x!==id)})}/><ResumeCompositionControls s={s} draft={draft} change={changeDraft} link={link}/>{link('/assessment','编辑教育、经历与技能 →')}<button className="primary" type="submit">核对所选内容 <Icon name="arrow" size={16} /></button></form></section>}/><section className="workspace-section resume-history"><h2>已保存的简历版本</h2><p>{link("/assessment?tab=当前简历","按目标查看和选择当前简历 →")}</p>{s.resumes.length ? s.resumes.map((v) => <article className="report-directory-row" key={v.id}><Icon name="file" /><div><h3>{v.title} · v{v.version}</h3><p>{v.target ? v.jobSnapshot?.title||s.jobs.find((j) => j.id === v.target)?.title||"原岗位已不可用" : "\u901A\u7528\u7B80\u5386"} · 本人资料 v{v.profileVersion}</p></div>{resumeUnavailable(s,v) ? <span className="status-chip">依据已撤回，请重建</span> : <button onClick={() => open("resumeExport", { resumeId: v.id })}>查看 / 打印为 PDF（模拟输出）</button>}<button onClick={()=>{if(v.target&&!s.jobs.some(j=>j.id===v.target)){changeDraft({target:v.target,name:v.name||'',claimIds:v.claimIds.filter(id=>confirmed(s).some(c=>c.id===id)),educationIds:(v.educationFacts||[]).filter(e=>educationFacts(s).some(x=>x.id===e.id)).map(e=>e.id),includeProfile:!!v.profileSnapshot,placements:v.placements||{},tailoring:{}});tell('原岗位已不可用，请在编排区重新选择岗位，或明确选择通用简历。');return;}const ids=v.claimIds.filter(cid=>confirmed(s).some(c=>c.id===cid));if(!ids.length&&!(v.educationFacts||[]).some(e=>educationFacts(s).some(x=>x.id===e.id))){go("/reports?tab=岗位简历");tell("旧版依据已不可用，请在上方重新选择有效经历。");return;}open("resumePreview",{claimIds:ids,educationIds:(v.educationFacts||[]).filter(e=>educationFacts(s).some(x=>x.id===e.id)).map(e=>e.id),tailoring:{},target:v.target,wording:v.wording,name:v.name,sourceResumeId:v.id,includeProfile:!!v.profileSnapshot,placements:v.placements||{}});}}>基于此版本修订</button></article>) : <p className="muted">保存前会先对比原文和措辞，允许调整经历顺序。</p>}</section></div> : r ? <><div className="report-toolbar">{link("/reports", "\u2190 \u8FD4\u56DE\u62A5\u544A\u76EE\u5F55")}<span>v{r.version} · 本人资料 v{r.profileVersion} · 计划 v{r.planVersion}</span><div><a className="button" href="#report-versions">版本对照</a><button disabled={withdrawn} onClick={() => setEditing(!editing)}>{editing ? "\u9605\u8BFB\u5DF2\u4FDD\u5B58\u5FEB\u7167" : "\u7F16\u8F91\u62A5\u544A\u6B63\u6587"}</button><button onClick={() => open("export", { reportId: r.id, selection: [...r.sections], private: false })}>选择片段导出</button></div></div>{reportIsStale(s,r) && <div className="notice">依据有变化。旧快照保留，更新会建立新草稿，不自动覆盖人工改写。</div>}{r.retainedOldReferences && <div className="notice">包含保留的人工段落或旧依据，请逐段核对；新版本编号不表示所有依据都已更新。</div>}{withdrawn && <div className="notice">引用已撤回或删除，受影响内容停止导出；请先使用有效依据更新。</div>}<ReportSnapshotBrief report={r} blocked={withdrawn}/><div className="report-reading-layout"><aside className="report-outline"><h2>报告目录</h2>{(withdrawn?[]:reportRows(r.body)).map((row,i)=><a key={row.id} href={"#report-section-"+i} onClick={editing?e=>{e.preventDefault();setEditing(false);requestAnimationFrame(()=>document.getElementById("report-section-"+i)?.scrollIntoView({block:"start"}));}:undefined}>{row.title}</a>)}<hr /><span className="caption">保存快照</span>{s.reports.filter((x) => x.title === r.title).map((x) => <p key={x.id}>{link(`/reports/${x.id}`, `\u7248\u672C ${x.version}${x.id === r.id ? " \xB7 \u5F53\u524D" : ""}`)}</p>)}</aside><section className="report-paper"><header><span>职业探索与阶段准备</span><h2>{r.title}</h2><p>个人资料 v{r.profileVersion} · 计划 v{r.planVersion} · 本地示例输出</p></header>{withdrawn ? <p>引用已不可访问，请先更新报告依据。</p> : editing ? <><label className="field"><span>章节正文 / 人工编辑草稿（自动保留）</span><textarea aria-label="章节正文 / 人工编辑草稿（自动保留）" className="reportbody" value={s.reportDrafts?.[r.id] ?? r.body} onChange={(e) => update({ reportDrafts: { ...s.reportDrafts, [r.id]: e.target.value } })} /></label><button className="primary" onClick={() => {
    if(reportReferencesUnavailable(s,r)){setEditing(false);tell('报告引用已不可访问，请使用有效依据建立新草稿。');return;}
    const n = reportSnapshot(r.title, s.reportDrafts?.[r.id] ?? r.body, r);
    update((x) => ({ ...x, reports: [...x.reports, n] }));
    go(`/reports/${n.id}`);
    setEditing(false);
    tell("\u5DF2\u4FDD\u5B58\u65B0\u5FEB\u7167\uFF0C\u65E7\u7248\u672C\u672A\u8986\u76D6\u3002");
  }}>人工编辑另存新版本</button></> : withdrawn ? <p>引用已不可访问，请先更新报告依据。</p> : <ThematicReport body={r.body} all/>}<footer>本人确认不等于能力核验 · 未提供的信息保持未知 · 私人反思默认不对外发送</footer></section><aside className="report-reference"><h2>这份内容从哪里来？</h2><p>确认材料</p><ReportReferences s={s} r={r} />{!r.claimIds.length && <p className="muted">尚无确认材料，报告保留缺项。</p>}<div className="next-links">{link("/assessment", "\u56DE\u4E8B\u5B9E\u6E90\u4FEE\u6539 \u2192")}{link("/plan", "\u56DE\u8BA1\u5212\u4FEE\u6539 \u2192")}</div><button onClick={() => open("reportMerge", { reportId: r.id, old: withdrawn ? "" : s.reportDrafts?.[r.id] ?? r.body, new: defaultBody(r), choice: "\u4FDD\u7559\u4EBA\u5DE5\u6BB5\u843D" })}>按新依据建立草稿 / 对比冲突</button><p className="caption">人工内容与新依据冲突时逐项选择；撤回引用不能通过手写绕过。</p></aside></div><ReportVersionTrail key={r.id} s={s} report={r} link={link}/></> : <ReportDecisionDesk s={s} link={link} update={update} createReport={createReport}/>}</div>;
}
function OpportunitiesView({ s, tab, url, link, move, open, precheck, startTask, update, confirmAction }) {
  const [part, setPart] = useState("概览与来源"), [status, setStatus] = useState("\u5168\u90E8");
  const [recordsOpen,setRecordsOpen]=useState(false);
  const params = new URL(url, location.origin).searchParams;
  if(params.has("job") && !s.jobs.some(j=>j.id===params.get("job"))) return <section className="unavailable-object"><h2>找不到这条岗位记录</h2><p>该对象不存在或已移除，没有自动打开其他研究卡。</p><div className="actions">{link("/careers?tab=我的机会","回本人机会重新选择","button")}{link("/app","回工作区")}</div></section>;
  const visibleJobs = s.jobs.filter(j => status === "全部" || (isArchivedJob(j) ? "归档" : j.status) === status);
  const job = visibleJobs.find((j) => j.id === params.get("job")) || visibleJobs[0];
  const relatedTask = s.tasks.find((t) => t.id === job?.taskId), events = s.events.filter((e) => e.jobId === job?.id).slice().sort((a,b)=>b.date.localeCompare(a.date));
  const actions = job ? <><button className={part==='概览与来源'||part==='笔记与准备'?'primary':''} onClick={() => job.taskId && relatedTask ? startTask(relatedTask) : precheck({ title: `\u51C6\u5907\uFF1A${job.title}`, purpose: "\u6838\u5BF9\u5C97\u4F4D\u8981\u6C42\u4E0E\u672C\u4EBA\u6750\u6599", career: job.career, association: job.career === s.goal ? "\u4E3B\u8BA1\u5212" : "\u72EC\u7ACB\u63A2\u7D22", jobId: job.id, source: jobPreparationSource(job.id) })}>{job.taskId ? relatedTask&&["取消","延期","跳过"].includes(relatedTask.status)?"编辑并恢复准备任务":relatedTask?.status==="完成"?"查看准备任务成果":"继续同一准备任务" : "准备清单预检"}</button><button onClick={() => {
    update(x=>targetResumeStudio(x,job.id));
    move("/reports?tab=\u5C97\u4F4D\u7B80\u5386");
  }}>制作岗位简历</button>{s.stage === "S2" && <button className={part==='申请进展'?'primary':''} onClick={() => {setPart("申请进展");open("application", { jobId: job.id, type: "\u6295\u9012", date: (/* @__PURE__ */ new Date()).toISOString().slice(0, 10), material: "", note: "", next: "" });}}>记录本人申请 / 面试 / 结果</button>}</> : null;
  if(s.jobs.length && !visibleJobs.length) return <><OpportunitySummary s={s} link={link} onStatus={setStatus}/><div className="empty"><h3>这个状态下还没有岗位记录</h3><p>研究状态筛选：{status}。这不会删除本人记录。</p><button onClick={()=>setStatus("全部")}>显示全部本人机会</button></div></>;
  return <>{s.presets.length>0&&<SavedSearches s={s} update={update} go={move} confirmAction={confirmAction}/>}{s.jobs.length>0&&<OpportunitySummary s={s} link={link} onStatus={setStatus}/>}<div className="opportunity-toolbar"><div><Icon name="file" /><span>{tab === "\u6211\u7684\u673A\u4F1A" ? "\u628A\u51C6\u5907\u4E0E\u6C42\u804C\u4E8B\u4EF6\u5206\u5F00\u8BB0\u5F55" : "\u4ECE\u804C\u4E1A\u8BA4\u8BC6\u8D70\u5411\u5177\u4F53\u5C97\u4F4D\u51C6\u5907"}<small>没有实时岗位源。本人输入不进入公开库；收藏和导出不等于投递。</small></span></div><button className="primary" onClick={() => open("job", { title: "", company: "", career: s.goal || "data", location: "\u672A\u77E5", form: "\u672A\u77E5", text: "", source: "\u672C\u4EBA\u8F93\u5165\uFF08\u79C1\u6709\uFF09", date: (/* @__PURE__ */ new Date()).toISOString().slice(0, 10), note: "", consent: false })}>手动添加岗位</button></div>{!s.jobs.length ? <div className="opportunities-empty"><div><Icon name="compass" size={30} /><h2>先保存一份你想了解的岗位。</h2><p>记录你为什么关注它，核对地点、具体要求与未知项，再决定需要补材料还是做准备任务。</p><div className="actions"><button onClick={() => open("job", { title: "", company: "", career: s.goal || "data", location: "\u672A\u77E5", form: "\u672A\u77E5", text: "", source: "\u672C\u4EBA\u8F93\u5165\uFF08\u79C1\u6709\uFF09", date: (/* @__PURE__ */ new Date()).toISOString().slice(0, 10), note: "", consent: false })}>添加岗位研究卡</button>{link("/careers?tab=企业与岗位", "去发现企业与岗位", "button primary")}</div></div><ol><li>研究卡：保存来源、原文与本人笔记</li><li>准备项：任务进入同一周预算</li><li>本人事件：投递 / 面试 / 结果另行记录</li></ol></div> : <><button className="opportunity-record-toggle" aria-expanded={recordsOpen} aria-controls="opportunity-record-list" onClick={()=>setRecordsOpen(!recordsOpen)}><span>{recordsOpen?'收起岗位与筛选':'切换岗位与筛选'}</span><small>{visibleJobs.length} 项</small></button><div className={`opportunities-layout ${recordsOpen?'records-open':''}`}><aside className="opportunity-list" id="opportunity-record-list"><div className="section-heading"><h2>我的研究卡</h2><span>{s.jobs.length} 项</span></div><label className="field"><span>研究准备状态</span><select aria-label="研究准备状态" value={status} onChange={(e) => setStatus(e.target.value)}>{["\u5168\u90E8", "\u6536\u85CF", "\u8C03\u7814\u4E2D", "\u51C6\u5907", "\u6682\u505C", "\u5F52\u6863"].map((x) => <option key={x}>{x}</option>)}</select></label>{visibleJobs.map((j) => <button className="opportunity-select" key={j.id} aria-pressed={job?.id === j.id} onClick={() => {setRecordsOpen(false);move(`/careers?tab=${encodeURIComponent(tab)}&job=${encodeURIComponent(j.id)}`);}}><span className="status-chip">{isArchivedJob(j) ? "\u5DF2\u5F52\u6863" : j.status}</span><h3>{j.title}</h3><p>{j.company || "\u4F01\u4E1A\u672A\u77E5"} · {j.location}</p><small>{cname(j.career)} · 在招未核验</small></button>)}<button onClick={() => open("companyCompare", { selected: s.jobs.slice(0, 3).map((j) => j.id) })}>比较企业 / 岗位条件</button></aside><section className="opportunity-detail"><header><div><h2>{job.title}</h2><p>{job.company || "\u4F01\u4E1A\u672A\u77E5"} · {job.location} · {job.form}</p><span className="caption">{job.source} · 资料日期 {job.date || "\u672A\u77E5"} · 截止日未知</span></div><button onClick={() => open("job", { ...job, status:isArchivedJob(job)?"归档":job.status, consent: true })}>编辑研究与笔记</button></header>{job.catalogId && <div className="personal-source-link">{link(`/careers?tab=企业与岗位&source=${encodeURIComponent(job.catalogId)}`, "回看来源目录 →")}<small>私人笔记和申请事件不会回写到目录；保存时的资料快照保留。</small></div>}<div className="opportunity-next-actions" aria-label="当前岗位的下一步">{actions}</div><div className="opportunity-status"><div><span>研究准备</span><p>{isArchivedJob(job) ? "\u5DF2\u5F52\u6863" : job.status}</p></div><div><span>准备任务</span><p>{relatedTask?.status || "\u672A\u5173\u8054"}</p></div><div><span>本人求职事件</span><p>{events.length ? `${events.length} \u6761\u8BB0\u5F55` : "\u5C1A\u672A\u8BB0\u5F55"}</p></div></div><SegmentedControl className="detail-tabs" aria-label="职业详情模式">{["\u6982\u89C8\u4E0E\u6765\u6E90", "\u8981\u6C42\u5BF9\u7167", "\u7B14\u8BB0\u4E0E\u51C6\u5907", "\u7533\u8BF7\u8FDB\u5C55"].map((x) => <button key={x} aria-pressed={part === x} onClick={() => setPart(x)}>{x}</button>)}</SegmentedControl><div className="opportunity-content">{part === "\u6982\u89C8\u4E0E\u6765\u6E90" && <><h3>保存的是哪一份工作？</h3>{job.sourceSnapshot && <details className="personal-source-snapshot"><summary>加入我的机会时的来源快照</summary><p>{job.sourceSnapshot.title} · {job.sourceSnapshot.date}</p><blockquote>{job.sourceSnapshot.text}</blockquote><p>来源：{job.sourceSnapshot.source}；该快照不随私人笔记编辑而覆盖。</p></details>}<p>{job.text}</p><dl className="facts"><dt>原始来源</dt><dd>{job.source}</dd><dt>资料日期</dt><dd>{job.date || "\u672A\u77E5"}；不是在招核验日期</dd><dt>岗位有效性</dt><dd>未知 / 未核验，不冒充实时机会</dd><dt>薪酬原文</dt><dd>{job.salaryRaw || "\u672A\u63D0\u4F9B"}；单位、周期和奖金口径待核对，不换算</dd></dl><button onClick={() => open("original", { jobId: job.id })}>查看来源说明</button></>}{part === "\u8981\u6C42\u5BF9\u7167" && <><h3>要求原文与本人已有材料</h3><blockquote>{job.text}</blockquote><p>必要、优先、备选与例外保留单岗范围；不自动扩成整个职业的统一门槛。</p><div className="matched-materials">{confirmed(s).length ? confirmed(s).map((c) => <article key={c.id}><Icon name="file" size={18} /><div><h4>{c.title}</h4><p>{c.contribution || "\u8D21\u732E\u5F85\u8865\u5145"} · {c.skill} · 版本 {c.version}</p></div><span className="status-chip">本人确认，未实核</span></article>) : <p>当前没有确认材料，要求对照保持未知。</p>}</div>{link("/assessment?tab=\u56DB\u7EF4\u4E0E\u5DEE\u8DDD", "\u53BB\u8BC4\u4F30\u9875\u6838\u5BF9\u5DEE\u8DDD \u2192")}</>}{part === "\u7B14\u8BB0\u4E0E\u51C6\u5907" && <><h3>我为什么关注它？</h3><p>{job.note || "\u8FD8\u6CA1\u6709\u8BB0\u5F55\u5173\u6CE8\u7406\u7531\u4E0E\u5F85\u6838\u5B9E\u95EE\u9898\uFF0C\u53EF\u4ECE\u201C\u7F16\u8F91\u7814\u7A76\u4E0E\u7B14\u8BB0\u201D\u8865\u5145\u3002"}</p><h3>准备清单与主计划共用同一个任务</h3>{relatedTask ? <div className="linked-preparation"><h4>{relatedTask.title}</h4><p>{relatedTask.purpose}</p><small>{relatedTask.status} · {relatedTask.hours} 小时 · {relatedTask.association} · {relatedTask.id}</small><p>在计划页改期、受阻或取消后，这里同步显示，不重复计算预算。</p></div> : <p>还没有准备任务。跨职业准备默认独立探索，不更改主职业目标。</p>}{link("/plan", "\u67E5\u770B\u7EDF\u4E00\u8BA1\u5212\u548C\u603B\u9884\u7B97 \u2192")}</>}{part === "\u7533\u8BF7\u8FDB\u5C55" && <><div className="section-heading"><div><h3>本人记录的求职事件</h3><p>不是企业认证状态，不由浏览原站、准备任务或导出材料推断。</p></div></div>{events.length ? <div className="application-timeline">{events.map((ev) => <article key={ev.id}><span className="step-circle"><Icon name="file" size={13} /></span><div><small>{ev.date} · 本人手动记录</small><h3>{ev.type}</h3><p>{ev.note || "\u6CA1\u6709\u8865\u5145\u7B14\u8BB0"}</p><div className="material-snapshot">材料快照：{ev.materialSnapshot?.title || ev.material || "\u672A\u9009\u62E9\u6750\u6599"}{ev.materialSnapshot?.version && ` v${ev.materialSnapshot.version}`}</div>{ev.next && <p>下一行动：{ev.next}</p>}<div className="job-event-edit-actions"><button onClick={()=>open('application',{...ev,version:ev.version||1})}>修订这条事件</button></div>{ev.history?.length>0&&<details className="job-event-history"><summary>查看事件修订历史（{ev.history.length}）</summary>{[...ev.history].reverse().map((h,i)=><div key={i}><small>v{h.version||1} · {h.date} · {h.type}</small><p translate="no">{h.note||'当时没有补充笔记'}</p></div>)}</details>}</div></article>)}</div> : <div className="light-empty"><h3>还没有本人申请记录。</h3><p>收藏或准备不代表投递。发生实际事件后，再记录日期、材料快照、笔记与下一步。</p></div>}<p className="caption">撤回、未录用、无回复和归档分别保留；岗位失效不删除历史，不自动改变能力判断。</p></>}</div><footer className="opportunity-actions"><button onClick={() => confirmAction(isArchivedJob(job) ? "恢复本人机会？" : "归档本人机会？", `只改变个人研究卡状态，保留私人笔记、求职事件与材料快照。${relatedTask ? "关联任务："+relatedTask.title+"（"+relatedTask.id+"，"+relatedTask.status+"）；另有 "+s.jobs.filter(j=>j.id!==job.id&&j.taskId===relatedTask.id).length+" 份岗位卡共用。归档不会取消或重复创建任务。" : "当前没有关联准备任务。"} 不改变发现目录。`, () => update(prev=>({...prev,jobs:prev.jobs.map(j=>j.id===job.id?{...j,archived:!isArchivedJob(j),status:isArchivedJob(j)&&j.status==="归档"?"收藏":j.status}:j)})))}>{isArchivedJob(job) ? "恢复机会" : "归档"}</button></footer></section></div></>}</>;
}
function AssistantWorkbench(props) { return <AssistantWorkspace {...props} />; }

export {
  AssessmentResultView,
  AssistantWorkbench,
  CareerBrowser,
  DashboardView,
  Icon,
  LearningCatalogue,
  OpportunitiesView,
  Outcome,
  PageHead,
  PlanOverview,
  ProfileOverview,
  PublicView,
  ReportWorkspace,
  RouteView,
  WorkStatus,
  navIcons
};







