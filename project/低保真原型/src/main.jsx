import {MailTokenForm,readMailLink} from './AccountMailActions';
import AdminConsole from './AdminConsole';
import LoginPage from './LoginPage';
import PersonalSuggestions from './PersonalSuggestions';
import BrandLogo from './BrandLogo';
import HomeCompanion from './HomeCompanion';
import {useServerWorkspace} from './useServerWorkspace';
import {useAgentSession} from './useAgentSession';
import AgentWorkflow from './AgentWorkflow';
import {agentMessageAvailable,hasExternalConsent} from './agent-contract';
import AgentNotes from './AgentNotes';
import ServerSaveStatus from './ServerSaveStatus';
import CoursePlaceholder from './CoursePlaceholder';
import CourseReader,{CoursePractice,CourseTaskMaterials,CourseTaskReading} from './CourseReader';
import AccountSecurityPanel from './AccountSecurityPanel';
import {CareerKnowledge,KnowledgeIndex,ServerReportExport,PracticeTemplates} from './CatalogData';
import {SERVER_AUTH,apiRequest,authRequest,credentialsFromForm} from './auth-client';
import {authMessage,validateCredentials,safeAuthTarget} from './auth-contract';
import SettingsPreferences from './SettingsPreferences';
import AccountWorkspace,{AccountAvatar} from './AccountWorkspace';
import AssessmentHub from './AssessmentHub';
import {assessmentEntryMode} from './assessment-hub-model';
import './assessment-hub.css';
import ExperienceWriter from './ExperienceWriter';
import WritingHint from './WritingHint';
import './experience-writing.css';
import SearchWorkbench from './SearchWorkbench';
import JobEventEditor from './JobEventEditor';
import {TaskDeliveryGuide,TaskReadiness} from './TaskDeliveryGuide';
import {submitTaskAttempt} from './task-attempt-model';
import {canRejectClaim,rejectClaimCandidate} from './model';
import {validCompareIds,reviewReminders,workspaceAnchor} from './site-quality-model';
import './site-quality.css';
import ExecutionDesk from './ExecutionDesk';
import ReviewDesk from './ReviewDesk';
import './action-cycle.css';
import React, { useState, useEffect, useRef } from "react";
import { createRoot } from "react-dom/client";
import {useLanguage,protectUserContent,getFormattingLocale,OriginalText,displayText} from './i18n/render';
import LanguageSwitch from './i18n/LanguageSwitch';
import {GuidedStart,ComparePicker} from './GuidedStart';
import {EducationEditor,EducationOutput,JDTailor} from './CompletionPanels';
import ResumeProfileEditor from './ResumeProfileEditor';
import ResumeImport,{ResumeImportEntry} from './ResumeImport';
import CurrentResumes from './CurrentResumes';
import SkillPicker from './SkillPicker';
import {AssessmentPreparation,PlanAdjustment,PlanChangePreview} from './WorkspacePreparation';
import {applyPlanChange} from './workspace-focus-model';
import './workspace-focus.css';
import './resume-import.css';
import ResumeSourceGroup from './ResumeSourceGroup';
import ResumeSections,{ResumeContactLine} from './ResumeSections';
import {confirmedResumeProfile,resumeFactSection} from './resume-content-model';
import {educationFacts,resumeUnavailable,dependencyBlock,tailoringError} from './completion-model';
import {targetResumeStudio} from './report-studio-model';

import { KEY, pages, careers, learning, fresh, uid, cname, confirmed, usedHours, checkStart, makeTask, makeAnalysis, addClaim, invalidate, scenarioState } from "./model";
import spec from "./spec.json";
import {purgePrivateMaterials,freezeReport,validScopeRefs,consultationBody,reportReferencesUnavailable} from './alignment-model';
import {ReportRevision,ReportExport,ScopePicker,EvidencePicker,ReportPreflight} from './AlignmentDialogs';
import './alignment.css';
import "./style.css";
import { Icon, navIcons, PageHead, Outcome, PublicView, DashboardView, CareerBrowser, RouteView, PlanOverview, LearningCatalogue, ProfileOverview, AssessmentResultView, WorkStatus, ReportWorkspace, OpportunitiesView, AssistantWorkbench } from "./experience";
import "./experience.css";
import "./landing-intro.css";
import "./outcome-stage.css";
import "./landing-journey.css";
import "./scroll-journey.css";
import "./landing-continuity.css";
import "./continuity.css";
import {SavedSearches,AdminHistory,AdminReviewDraft} from "./ContinuityPanels";
import {planningReportBody,saveSearchPreset,recordAdminAction} from "./continuity-model";
import "./assistant.css";
import "./map-workspace.css";
import "./growth.css";
import "./job-discovery.css";
import FlowNavigation from "./FlowNavigation";
import WorkspaceContextBar from "./WorkspaceContextBar";

import UnifiedPlan from './UnifiedPlan';
import {TaskEditor,TaskExecutionList,ReviewEditor,AINoteEditor} from './TaskEditing';
import {stoppedTask} from './task-edit-model';
import './task-editing.css';
import JobDiscovery from "./JobDiscovery";
import AssistantChat from "./AssistantChat";
import CheesePanelCompanion from './CheesePanelCompanion';
import MapWorkspace, { MapSkillDetails } from "./MapWorkspace";
import AtlasPracticeContext from "./AtlasPracticeContext";
import {atlasTasks,atlasReturn,atlasReading,atlasTaskSkill,atlasSavedDraft,storeTaskDraft,atlasPracticeKey} from "./career-atlas-model";
import AssistantPageHeader from "./AssistantPageHeader";
import ExternalPractice from "./ExternalPractice";
import {TaskPrecheckFields,JobResearchFields} from './FocusedIntake';
import './focused-intake.css';
import { taskRoute } from "./flow-navigation";
import './i18n/language.css';
import './landing-quality.css';
import './workspace-quality.css';
import './workspace-space.css';
import './workspace-controls.css';
import './interaction-integrity.css';
import WorkspaceSidebar from './WorkspaceSidebar';
import {useSidebarLayout} from './sidebar-layout';
import './sidebar-layout.css';
import './document-studio.css';
import './document-editions.css';
import './report-composition.css';
import SegmentedControl from './SegmentedControl';
import WorkspaceSearch from './WorkspaceSearch';
import {PageGuidanceProvider} from './PageGuidance';
import OperationGuide from './OperationGuide';
import {beginOperationGuideSession} from './operation-guide-model';
import {normalizeWorkspaceRoute} from './route-model';
import './workspace-layout.css';
import './workspace-density.css';
import './workspace-type.css';
import './empty-spaces.css';
import './home-rhythm.css';
import './home-composition.css';
import './home-unified.css';
import './home-start.css';
import './record-visuals.css';
import './workspace-rhythm.css';
import StorageRecovery from './StorageRecovery';
import {loadPrototypeState,savePrototypeState} from './storage-recovery-model';
import './login-page.css';
import './jimo-theme.css';
import './jimo-white.css';
import './text-boundaries.css';
import './soft-controls.css';
import './usage-faq.css';
import './type-scale.css';
import './reading-proportions.css';
import './home-reading-flow.css';
import './career-loop.css';
import './workspace-priority.css';
import './workspace-dashboard.css';
import './warm-workspace.css';
import './workspace-page-proportions.css';
import './career-detail.css';
import './workspace-warm-details.css';
import './dashboard-fit.css';
import './assistant-fit.css';
import './workspace-fit-details.css';
import './assistant-studio.css';
import './auth-nook.css';
import './workspace-utility-fit.css';
import './plan-adjustment-fit.css';
import StatusToast from './StatusToast';
import './workspace-hierarchy.css';
import './assessment-disclosure.css';
import './job-disclosure.css';
import './workspace-complete.css';
import './home-polish.css';
import './reference-palette.css';
import './avemly-brand.css';
import './liquiglass-material.css';
import './cheese-palette.css';
import './workbench-reference.css';
import './career-exploration-reference.css';
import './learning-assistant-reference.css';
import './report-atlas-account.css';
// Real-account mode never reads the prototype's persisted login flag or private
// business records. Business APIs will be added in a separate slice.
const livePageRecords=new Map();
const prototypeStorage=SERVER_AUTH?{getItem:key=>livePageRecords.get(key)??null,setItem:(key,value)=>livePageRecords.set(key,value)}:{getItem:key=>localStorage.getItem(key),setItem:(key,value)=>localStorage.setItem(key,value)};
const fmt = (d) => new Intl.DateTimeFormat(getFormattingLocale(), { dateStyle: "medium" }).format(new Date(d));
const today = () => (/* @__PURE__ */ new Date()).toISOString().slice(0, 10);
const viewRoutes = ["/", "/onboarding", "/app", "/careers", "/careers?tab=\u6BD4\u8F83", "/assessment?tab=\u8D44\u6599\u7ECF\u5386", "/assessment?tab=\u539F\u6587\u786E\u8BA4", "/assessment?tab=\u56DB\u7EF4\u4E0E\u5DEE\u8DDD", "/career-map", "/plan", "/plan?tab=\u65B9\u6848\u8C03\u6574", "/plan?tab=\u6267\u884C", "/learning?tab=\u7EFC\u5408\u9879\u76EE", "/plan?precheck=1", "/work/task-demo", "/work/task-demo?tab=\u5C1D\u8BD5\u4E0E\u53CD\u9988", "/work/task-demo?tab=\u5B8C\u6210\u56DE\u6267", "/plan?tab=\u590D\u76D8", "/reports", "/reports?tab=\u804C\u4E1A\u62A5\u544A", "/assistant", "/careers?tab=\u6211\u7684\u673A\u4F1A", "/careers?tab=\u85AA\u916C\u53C2\u8003", "/settings", "/admin/quality", "/admin/data", "/admin/content"];
function B({ children, primary = false, ...props }) {
  return <button className={primary ? "primary" : ""} {...props}>{children}</button>;
}
function Field({ label, children }) {
  return <label className="field"><span>{label}</span>{React.isValidElement(children) ? React.cloneElement(children, { "aria-label": children.props["aria-label"] || label }) : children}</label>;
}
function Empty({ title, children }) {
  return <div className="empty"><h3>{title}</h3>{children}</div>;
}
function Notice({ children }) {
  return <div className="notice">{children}</div>;
}
function Pill({ children }) {
  return <span className="pill">{children}</span>;
}
function Panel({ title, children, aside, id }) {
  return <section className="panel" id={id}><header className="section-head"><h2>{title}</h2>{aside}</header>{children}</section>;
}
function Black({ label = "\u56FE\u50CF / \u89C6\u9891\u5360\u4F4D" }) {
  return <figure className="media"><img className="black" src="/black.svg" width="800" height="300" alt={`${label}\uFF1A\u5168\u9ED1\u5360\u4F4D\u56FE\u7247`} /><figcaption>{label} · 全黑占位</figcaption></figure>;
}
function Modal({ title, children, onClose, drawer = false, className = '', companion = null }) {
  const ref = useRef(null);
  const [companionActive, setCompanionActive] = useState(false);
  const isEditor = target => !!target?.matches?.('textarea,input:not([type="button"]):not([type="submit"]):not([type="checkbox"]):not([type="radio"]),[contenteditable="true"]');
  useEffect(() => {
    const prev = document.activeElement;
    const el = ref.current;
    const previousOverflow=document.documentElement.style.overflow;
    if(className==='auth-dialog')document.documentElement.style.overflow='hidden';
    el.showModal();
    const cancel = (e) => {
      e.preventDefault();
      onClose();
    };
    el.addEventListener("cancel", cancel);
    return () => {
      el.removeEventListener("cancel", cancel);
      el.close();
      if(className==='auth-dialog')document.documentElement.style.overflow=previousOverflow;
      prev?.focus?.();
    };
  }, []);
  return <dialog ref={ref} className={[drawer ? 'drawer' : '',className,companion ? 'cheese-assisted-panel' : ''].filter(Boolean).join(' ')} aria-labelledby={className==='auth-dialog'?'auth-heading':'dialog-title'} onFocusCapture={companion ? e=>setCompanionActive(isEditor(e.target)) : undefined} onBlurCapture={companion ? e=>setCompanionActive(isEditor(e.relatedTarget)&&e.currentTarget.contains(e.relatedTarget)) : undefined}><header className="section-head"><h2 id="dialog-title">{title}</h2><LanguageSwitch/><B onClick={onClose} aria-label="关闭面板">关闭</B></header>{companion&&<CheesePanelCompanion scene={companion} active={companionActive}/>} {children}</dialog>;
}
function App() {
  useEffect(()=>{
    const dismiss=e=>document.querySelectorAll('.workspace-utilities[open]').forEach(menu=>{if(!menu.contains(e.target))menu.open=false;});
    document.addEventListener('pointerdown',dismiss);
    return()=>document.removeEventListener('pointerdown',dismiss);
  },[]);
  const language=useLanguage();
  const [initialStorage]=useState(()=>loadPrototypeState(prototypeStorage));
  const [storageStatus,setStorageStatus]=useState(initialStorage.status);
  const storageBlocked=useRef(initialStorage.status!=='ready'),originalStorage=useRef(initialStorage.raw);
  const [s, setS] = useState(initialStorage.state), [url, setUrl] = useState(() => normalizeWorkspaceRoute(location.pathname + location.search).to), [modal, setModal] = useState(null), [form, setForm] = useState({}), [error, setError] = useState(""), [toast, setToast] = useState(""), [aiSide, setAiSide] = useState(false), [mobile, setMobile] = useState(false), [search, setSearch] = useState(""), [careerFilter, setCareerFilter] = useState("\u5168\u90E8"), [claimFilter, setClaimFilter] = useState("\u5168\u90E8"), [authMode, setAuthMode] = useState("\u767B\u5F55"), [importState, setImportState] = useState("idle");
  const [navigationNotice,setNavigationNotice]=useState(() => normalizeWorkspaceRoute(location.pathname+location.search).invalidTab);
  useEffect(()=>{const u=new URL(url,location.origin),section=u.searchParams.get('section');const anchor=u.pathname!=='/'&&u.hash?workspaceAnchor(u.hash):null;const target=anchor|| (u.pathname==='/plan'&&u.searchParams.get('adjust')==='1'?'plan-adjustment':u.pathname==='/careers'&&u.searchParams.get('focus')==='salary'?'salary-context':u.pathname==='/settings'?{'feedback':'settings-feedback','data':'settings-data','authorization':'settings-authorization'}[section]:null);if(!target)return;const frame=requestAnimationFrame(()=>document.getElementById(target)?.scrollIntoView({block:'start'}));return()=>cancelAnimationFrame(frame);},[url]);
  useEffect(()=>{const canonical=normalizeWorkspaceRoute(location.pathname+location.search);if(canonical.to!==location.pathname+location.search)history.replaceState({},"",canonical.to+location.hash);},[]);
  protectUserContent(s,form,{query:search});
  const timer = useRef(null), urlObj = new URL(url, location.origin), path = urlObj.pathname, tab = urlObj.searchParams.get("tab") || "", id = path.split("/")[2], page = pages.find((p) => p[1] === (path.startsWith("/work") ? "/work" : path.startsWith("/reports") ? "/reports" : path)) || pages[2];
  const publicRoute=path==='/'||path==='/companion';
  const sidebarLayout=useSidebarLayout(path,Boolean(modal));
  const update = (fn) => setS((prev) => SERVER_AUTH&&(!authUser?.id||authUser.id!==authSubject.current)?prev:typeof fn === "function" ? fn(prev) : { ...prev, ...fn });
  const [toastRevision,setToastRevision]=useState(0);
  const tell = (msg) => {setToast(msg);setToastRevision(value=>value+1);};
  const [authFeedback,setAuthFeedback]=useState(null);
  const [authReady,setAuthReady]=useState(!SERVER_AUTH),[authBusy,setAuthBusy]=useState(false),[authFields,setAuthFields]=useState({}),[authUser,setAuthUser]=useState(null);
  const [mailLink,setMailLink]=useState(()=>SERVER_AUTH?readMailLink():null);
  useEffect(()=>{const changed=()=>{const next=readMailLink();if(next)setMailLink(next);};window.addEventListener('hashchange',changed);return()=>window.removeEventListener('hashchange',changed);},[]);
  const workspace=useServerWorkspace(SERVER_AUTH?authUser:null,s,setS);
  const agentContext={workspace:page[0].startsWith('U')&&page[0]!=='U02'&&page[0]!=='U12'?page[0]:'U11',career:careers.some(c=>c.id===(s.assessmentCareer||s.goal))?(s.assessmentCareer||s.goal):'data'};
  const liveAgent=useAgentSession({user:SERVER_AUTH?authUser:null,state:s,workspace,context:agentContext,update,language});
  const authController=useRef(null),authSubject=useRef(null);
  const authFeedbackRevision=useRef(0);
  // The auth adapter reports its semantic result here; the companion
  // receives an event id and kind, never the submitted email or password.
  const reportAuthFailure=({code,message})=>{
    setError(message);
    if(code==='INVALID_CREDENTIALS')setAuthFeedback({type:'invalid-credentials',id:++authFeedbackRevision.current});
    else setAuthFeedback(null);
  };
  useEffect(()=>{
    if(!SERVER_AUTH)return;
    let cancelled=false;
    const check=async()=>{
      if(authController.current)return;const checkedSubject=authSubject.current;
      try {
        const result=await authRequest('session');if(cancelled)return;
        if(authController.current||authSubject.current!==checkedSubject)return;
        const subject=result.user?.id||null;
        if(subject!==authSubject.current){clearTimeout(timer.current);livePageRecords.clear();setS({...fresh(),logged:Boolean(subject)});setForm({});setModal(null);setAiSide(false);}
        authSubject.current=subject;setAuthUser(result.user);
        if(!subject)setS(previous=>previous.logged?{...fresh(),logged:false}:previous);
      }catch{if(!cancelled&&authSubject.current===null)setS({...fresh(),logged:false});}
      finally{if(!cancelled)setAuthReady(true);}
    };
    let lastTouch=Date.now();
    const touch=()=>{if(authSubject.current&&!authController.current&&Date.now()-lastTouch>120000){lastTouch=Date.now();authRequest('refresh',{data:{}}).catch(()=>check());}};
    check();const interval=setInterval(check,60000);const focus=()=>{if(document.visibilityState==='visible')check();};
    document.addEventListener('visibilitychange',focus);
    window.addEventListener('account-session-changed',check);
    document.addEventListener('pointerdown',touch);document.addEventListener('keydown',touch);
    return()=>{cancelled=true;clearInterval(interval);document.removeEventListener('visibilitychange',focus);window.removeEventListener('account-session-changed',check);document.removeEventListener('pointerdown',touch);document.removeEventListener('keydown',touch);authController.current?.abort();};
  },[]);
  const clearAuthFeedback=()=>{setAuthFeedback(null);setError('');setAuthFields({});};
  const submitServerAuth=async event=>{
    event.preventDefault();if(authController.current||!authReady)return;
    const formElement=event.currentTarget,mode=authMode==='注册'?'register':authMode==='找回'?'recover':'login';
    clearAuthFeedback();
    const data=credentialsFromForm(formElement,mode),fields=validateCredentials(mode,data);
    if(Object.keys(fields).length){setAuthFields(fields);formElement.elements.namedItem(Object.keys(fields)[0])?.focus();return;}
    const controller=new AbortController();authController.current=controller;setAuthBusy(true);
    try {
      await authRequest('session',{signal:controller.signal});
      const result=await authRequest(mode,{data,signal:controller.signal});
      if(controller.signal.aborted)return;
      if(mode==='recover'){setAuthMode('登录');tell(language==='en'?'Request accepted. If this address has an account, check your inbox.':'请求已受理。如果该邮箱有关联账户，请稍后查收邮件。');return;}
      const target=safeAuthTarget(form.intent||sessionStorage.getItem('intent')||'/app');
      authSubject.current=result.user.id;setAuthUser(result.user);livePageRecords.clear();
      setS({...fresh(),logged:true});setForm({});setModal(null);setAiSide(false);
      sessionStorage.setItem('intent',target);
      const guideSession=beginOperationGuideSession(localStorage);
      window.dispatchEvent(new CustomEvent('operation-guide-session',{detail:guideSession}));
      const password=formElement.elements.namedItem('password');if(password)password.value='';
      move(target);tell(language==='en'?'Signed in. Loading your account records.':'登录成功，正在恢复你的账户记录。');
    }catch(error){if(!controller.signal.aborted){setAuthFields(error.fields||{});reportAuthFailure({code:error.code,message:authMessage(error.code,language)});}}
    finally{if(authController.current===controller){authController.current=null;setAuthBusy(false);}}
  };
  const logoutServer=async()=>{
    try{await workspace.flush();await authRequest('logout',{data:{}});clearTimeout(timer.current);authSubject.current=null;setAuthUser(null);livePageRecords.clear();setS(fresh());setForm({});setAiSide(false);setModal(null);sessionStorage.removeItem('intent');move('/');}
    catch(error){tell(authMessage(error.code,language));}
  };
  const open = (type, data = {}) => {
    setError("");
    if(type==='auth')setAuthFeedback(null);
    setForm(data);
    setModal({ ...data, type });
    setAiSide(false);
  };
  const close = () => {
    if(modal?.type==='auth'){authController.current?.abort();authController.current=null;setAuthBusy(false);}
    if (modal?.type === "auth" && path !== "/" && (!s.logged || path === '/auth')) move("/");
    if (modal?.type === "import") {
      clearTimeout(timer.current);
      setImportState("cancelled");
    }
    setModal(null);
    setError("");
  };
  const move = (to, replace = false, {preserveScroll = false} = {}) => {
    if (!to.startsWith("/") || to.startsWith("//")) return;
    const canonical=normalizeWorkspaceRoute(to);
    window.history[replace ? "replaceState" : "pushState"]({}, "", canonical.to);
    setUrl(canonical.to);
    setNavigationNotice(canonical.invalidTab);
    setMobile(false);
    if (!preserveScroll) {
      window.scrollTo(0, 0);
      document.getElementById("main")?.scrollTo(0, 0);
    }
  };
  const go = (to) => {
    if (to.startsWith("/assistant") && path !== "/assistant") update({ aiReturn: url });
    if (to !== "/" && !s.logged) {
      open("auth", { intent: to });
      return;
    }
    setModal(null);
    setError("");
    move(to);
  };
  const withMapReturn=to=>{const back=path==='/assessment'&&atlasReturn({atlas:{},source:urlObj.searchParams.get('mapReturn')});if(back&&/^\/assessment([?]|$)/.test(to)){const next=new URL(to,location.origin);if(!next.searchParams.has('mapReturn'))next.searchParams.set('mapReturn',back);return next.pathname+next.search+next.hash;}return to;};
  const tabs = (names) => <SegmentedControl className="tabs" aria-label="页面模式">{names.map((n) => <a key={n} aria-current={(tab || names[0]) === n ? "page" : void 0} href={withMapReturn(`${path}?tab=${encodeURIComponent(n)}`)} onClick={(e) => {
    e.preventDefault();
    move(withMapReturn(`${path}?tab=${encodeURIComponent(n)}`));
  }}>{path === "/assessment" ? { "\u8D44\u6599\u7ECF\u5386": "\u8D44\u6599\u4E0E\u7ECF\u5386", "\u539F\u6587\u786E\u8BA4": "\u63D0\u53D6\u4E0E\u786E\u8BA4", "\u56DB\u7EF4\u4E0E\u5DEE\u8DDD": "\u804C\u4E1A\u8BC4\u4F30", "\u6210\u679C\u6863\u6848": "\u6211\u7684\u753B\u50CF" }[n] || n : path === "/settings" && n === "偏好与通知" ? "偏好与支持" : n}</a>)}</SegmentedControl>;
  const link = (to, label, cls = "") => <a className={cls} href={withMapReturn(to)} onClick={(e) => {
    if (!e.metaKey && !e.ctrlKey) {
      e.preventDefault();
      go(withMapReturn(to));
    }
  }}>{label}</a>;
  const activeTab = (n, first) => tab === n || !tab && n === first;
  useEffect(() => {
    if(SERVER_AUTH||storageBlocked.current)return;
    setStorageStatus(savePrototypeState(prototypeStorage,s).status);
  }, [s]);
  useEffect(() => {
    const pop = () => {
      const canonical=normalizeWorkspaceRoute(location.pathname+location.search);
      if(canonical.to!==location.pathname+location.search)history.replaceState({},"",canonical.to+location.hash);
      setUrl(canonical.to);
      setNavigationNotice(canonical.invalidTab);
      setModal(null);
    };
    addEventListener("popstate", pop);
    return () => {
      removeEventListener("popstate", pop);
      clearTimeout(timer.current);
    };
  }, []);
  useEffect(() => {
    if (authReady&&(path === '/auth' || !publicRoute && !s.logged) && !storageBlocked.current) open("auth", { intent: path === "/auth" ? sessionStorage.getItem("intent") || "/app" : url });
  }, [path, s.logged,authReady]);
  useEffect(() => {
    if (s.logged && urlObj.searchParams.get("precheck") === "1") precheck();
  }, [url, s.logged]);
  useEffect(() => {
    document.title = path==='/companion'?(language==='en'?'Meet Cheese Scholar · Avemly':'认识芝识分子 · Avemly'):language==='en'?`${displayText(page[2])} · Avemly`:`${page[2]} · Avemly`;
  }, [page[2],language,path]);
  const setTask = (tid, patch) => update((x) => ({ ...x, tasks: x.tasks.map((t) => t.id === tid ? { ...t, ...typeof patch === "function" ? patch(t) : patch } : t) }));
  const confirmAction = (title, impact, action) => open("confirm", { title, impact, action });
  const persistCurrentRecords=()=>{
    if(SERVER_AUTH){workspace.flush().catch(error=>tell(authMessage(error.code,language)));return;}
    const result=savePrototypeState(prototypeStorage,s);
    if(result.status==='saved'){storageBlocked.current=false;originalStorage.current=null;}
    else if(storageBlocked.current)tell('本次记录未能保存，原有记录未改动；请下载本次记录，或稍后重试替换。');
    setStorageStatus(previous=>storageBlocked.current?previous:result.status);
  };
  const retryStorage=()=>{
    if(!storageBlocked.current){persistCurrentRecords();return;}
    const recovered=loadPrototypeState(prototypeStorage);
    if(recovered.raw!==null)originalStorage.current=recovered.raw;
    if(recovered.status!=='ready'){setStorageStatus(recovered.status);return;}
    confirmAction('恢复已读取的本机记录？','将载入本机原有记录，替换当前临时工作区。请先下载本次临时记录；取消可继续当前操作。',()=>{
      storageBlocked.current=false;setStorageStatus('ready');setS(recovered.state);setForm({});setAiSide(false);
    });
  };
  const storageRecovery=<StorageRecovery status={storageStatus} hasOriginal={originalStorage.current!==null} onRetry={retryStorage}
    onBackup={()=>download('本次临时记录_原型示例.json',JSON.stringify({...s,logged:undefined},null,2),'application/json')}
    onBackupOriginal={()=>download('原始本机记录_待修复.txt',originalStorage.current||'','text/plain;charset=utf-8')}
    onReplace={()=>confirmAction('用本次记录替换原有本机记录？','这会尝试覆盖当前浏览器的原有记录。请先下载原始记录与本次记录；取消不会写入或删除任何内容。',persistCurrentRecords)}/>;
  const saveTaskDraft=draft=>update(x=>storeTaskDraft(x,draft));
  useEffect(()=>{if(modal?.type==='precheck'&&form.atlas)update(x=>storeTaskDraft(x,form));},[modal,form]);
  const precheck = (d = {}) => {
    const saved=d.atlas&&atlasSavedDraft(s,d);
    if(saved)d={...saved,...(d.unavailable!==undefined?{unavailable:d.unavailable}:{})};
    const draft = { title: "\u77ED\u9A8C\u8BC1\u884C\u52A8", template: "external", kind: "\u672C\u4EBA\u8BB0\u5F55\u7684\u5916\u90E8\u884C\u52A8", purpose: s.decision.question || "", hours: 1, association: "\u72EC\u7ACB\u63A2\u7D22", career: s.goal, product: "\u5B9E\u9645\u884C\u52A8\u3001\u7ED3\u679C\u3001\u53CD\u9988\u4E0E\u9650\u5236", source: url, ...d };
    if(SERVER_AUTH&&learning.some(l=>l.id===draft.template)){const course=workspace.catalog?.courses.find(c=>c.id===draft.template);if(!course||course.status!=='published'){tell('课程目录未就绪，请先读取或重试课程目录。');return;}draft.courseVersion=draft.courseVersion||course.content_version;if(d.hours===undefined)draft.hours=learning.find(l=>l.id===draft.template)?.hours||1;}
    saveTaskDraft(draft);
    open("precheck", draft);
  };
  const addCandidate = (c) => {
    update((x) => addClaim(x, c));
    tell("\u5DF2\u5EFA\u7ACB\u5F85\u786E\u8BA4\u5019\u9009\uFF0C\u5C1A\u672A\u5199\u5165\u786E\u8BA4\u753B\u50CF\u3002");
  };
  const feedback = () => open("feedback", { object: `${page[0]} / ${s.analysis?.id || "\u5F53\u524D\u5185\u5BB9"} / v${s.profileVersion}`, text: "" });
  const startTask = async (t) => {
    if(dependencyBlock(s,t)&&!t.completed){tell("交付依赖尚未完成，请先在分阶段计划查看依赖任务。");go("/plan");return;}
    if (stoppedTask(t)) {open('taskEdit',{taskId:t.id,restore:true});tell('该行动已暂停；先编辑并确认预算，不会直接恢复。');return;}
    if(SERVER_AUTH){try{await workspace.command('task.start',{taskId:t.id,taskVersion:t.version});}catch(error){tell(authMessage(error.code,language));return;}}
    else setTask(t.id, { status: t.status === "\u5B8C\u6210" ? "\u5B8C\u6210" : "\u8FDB\u884C\u4E2D" });
    if (t.mode === "S2" && s.stage === "S2") go(`/work/${t.id}`);
    else go(taskRoute(s, t));
  };
  const createReport = async () => {
    let preview={};
    if(SERVER_AUTH){try{await workspace.flush();const current=workspace.current();const result=await apiRequest('/api/services/report-preview',{data:{baseVersion:current.revision}});if(workspace.current().owner!==current.owner)return;preview={liveBody:result.body,liveDigest:result.digest,liveBaseVersion:result.baseVersion};}catch(error){tell(authMessage(error.code,language));return;}}
    open('reportPreflight',{title:'我的职业规划报告',allowMissing:false,...preview});
  };
  const reportSnapshot = (title,body,prior) => {if(prior&&reportReferencesUnavailable(s,prior))throw Error('报告引用已不可访问，请使用有效依据建立新草稿。');const n=freezeReport(s,title,body,prior);return prior?{...n,profileVersion:prior.profileVersion,planVersion:prior.planVersion,claimIds:prior.claimIds,claimRefs:prior.claimRefs,claimSnapshots:prior.claimSnapshots,inputSnapshot:prior.inputSnapshot,sectionRecords:n.sectionRecords.map(row=>({...prior.sectionRecords?.find(old=>old.id===row.id),...row})),retainedOldReferences:true}:n;};
  const defaultBody = (r) => r?.kind === "consult" ? consultationBody(s,r.help) : planningReportBody(s);
  function publicPage() {
    return <PublicView s={s} go={go} open={open} link={link} />;
  }
  function onboarding() {
    return <Panel title="设置职业偏好与每周可用时间"><Notice>背景与兴趣只是自述；不用于推断人格，不形成能力评分。</Notice><form onSubmit={(e) => {
      e.preventDefault();
      update({ onboard: true });
      go(sessionStorage.getItem("intent") || "/app");
    }}><div className="cols3"><Field label="你的意图"><select value={s.preferences.intent} onChange={(e) => update({ preferences: { ...s.preferences, intent: e.target.value } })}>{["\u65B9\u5411\u672A\u5B9A", "\u76EE\u6807\u5DF2\u5B9A", "\u5DF2\u6709\u4F5C\u54C1"].map((x) => <option key={x}>{x}</option>)}</select></Field><Field label="学习阶段（选填）"><select value={s.preferences.stage} onChange={(e) => update({ preferences: { ...s.preferences, stage: e.target.value } })}>{["\u672A\u77E5", "\u672C\u79D1\u5728\u8BFB", "\u7814\u7A76\u751F\u5728\u8BFB", "\u5176\u4ED6"].map((x) => <option key={x}>{x}</option>)}</select></Field><Field label="兴趣（选填）"><input name="interest" autoComplete="off" value={s.preferences.interest} onChange={(e) => update({ preferences: { ...s.preferences, interest: e.target.value } })} /></Field></div><Field label="地域与工作条件（未知可保留）"><input name="location" autoComplete="off" value={s.preferences.location} onChange={(e) => update({ preferences: { ...s.preferences, location: e.target.value } })} /></Field><Field label="每周总预算（小时，包含独立探索）"><input type="number" min="0" max="168" name="budget" value={s.budget ?? ""} onChange={(e) => update({ budget: e.target.value === "" ? null : Number(e.target.value) })} /></Field><div className="actions"><B primary type="submit">保存设置并恢复入口</B><B type="button" onClick={() => {
      update({ onboard: true });
      go(sessionStorage.getItem("intent") || "/app");
    }}>跳过全部，继续探索</B></div></form></Panel>;
  }
  function dashboard() {
    return <DashboardView s={s} link={link} open={(type, data) => {
      if (type === "aiEntry") {
        update({ aiReturn: url });
        setAiSide(true);
      } else open(type, data);
    }} precheck={precheck} startTask={startTask} update={update} tell={tell} suggestions={<PersonalSuggestions owner={authUser?.id} workspace={workspace} state={s} link={link}/>}/>;
  }
  function assessment() {
    const originMapTask=s.tasks.find(t=>t.id===s.originTask);
    const materialReturn=atlasReturn({atlas:{},source:urlObj.searchParams.get('mapReturn')});
    const claims=s.claims.filter(c=>claimFilter==='全部'||c.status===claimFilter);
    const isEntry=assessmentEntryMode(tab,urlObj.search);
    const entryPanel=<>{['课程项目','实习（本人记录）','校园经历','技能记录','荣誉奖项','个人简介'].includes(urlObj.searchParams.get('resumeType'))&&<Notice>正在为简历补充：{urlObj.searchParams.get('resumeType')}。<B onClick={()=>{const type=urlObj.searchParams.get('resumeType');update({claimDraft:{...s.claimDraft,type,skill:'未知'}});requestAnimationFrame(()=>document.getElementById('resume-material-form')?.querySelector('select')?.focus());}}>选择此资料类型</B></Notice>}<ResumeSourceGroup search={urlObj.search}><ResumeProfileEditor s={s} update={update} link={link}/><EducationEditor s={s} update={update} link={link}/></ResumeSourceGroup><ResumeImportEntry s={s} update={update} link={link} go={go} tell={tell}/><ExperienceWriter draft={s.claimDraft} change={claimDraft=>update({claimDraft})} importFile={()=>open('import')} save={candidate=>{update(x=>({...addClaim(x,candidate),claimDraft:{...fresh().claimDraft,skill:'未知'}}));go('/assessment?tab=原文确认');}}/><Panel title="材料状态"><p>{s.claims.length} 项记录；已确认 {confirmed(s).length} 项。未确认材料不参与确定结论。</p>{link("/assessment?tab=\u539F\u6587\u786E\u8BA4", "\u67E5\u770B\u539F\u6587\u4E0E\u5019\u9009 \u2192")}</Panel></>;
    const reviewPanel=<><Panel title="核对经历与个人贡献"><Field label="处理队列"><select value={claimFilter} onChange={(e) => setClaimFilter(e.target.value)}>{["\u5168\u90E8", "\u5F85\u786E\u8BA4", "\u7591\u4F3C\u91CD\u590D", "\u77DB\u76FE", "\u5DF2\u62D2\u7EDD", "\u5DF2\u786E\u8BA4", "\u5DF2\u64A4\u56DE"].map((x) => <option key={x}>{x}</option>)}</select></Field>{!claims.length ? <GuidedStart title={s.claims.length?'当前筛选下没有材料':'先记录经历，再逐项确认'} description="逐项核对经历原文、自己负责的部分和材料来源。手填或导入后，先确认内容，再用于分析、报告和简历。" steps={['准备一段课程项目、作品或实际经历。','写清自己负责的部分，未知可以留空。','保存候选后，回到这里逐项修正与确认。']}>{link('/assessment?tab=资料经历','手填已有经历','button primary')}<B onClick={()=>open('import')}>{SERVER_AUTH?"导入 PDF / 粘贴材料":"导入文件（模拟解析）"}</B>{s.claims.length>0?<B onClick={()=>setClaimFilter('全部')}>查看全部材料</B>:link('/learning','没有经历？先了解实践','button')}</GuidedStart> : claims.map((c) => <article className="record" key={c.id}><div className="section-head"><h3>{c.title}</h3><Pill>{c.status} · v{c.version}</Pill></div><div className="cols2"><div><span className="muted">原文 / {c.origin} / {c.id}</span><p>{c.text}</p></div><div><p>本人贡献：{c.contribution || "\u5F85\u8865\u5145"}</p><p>关联技能：{c.skill}；辅助：{c.aid || "\u672A\u8BF4\u660E"}</p><p>实际核验：未核验</p></div></div><div className="actions">{!["\u5DF2\u786E\u8BA4", "\u5DF2\u64A4\u56DE"].includes(c.status) && <B primary onClick={() => open("claim", { claimId: c.id, text: c.text, contribution: c.contribution || "", skill: c.skill, resolve: c.status === "\u7591\u4F3C\u91CD\u590D" ? "\u4FDD\u7559\u4E3A\u72EC\u7ACB\u6750\u6599" : "\u4FEE\u6B63\u4E3A\u672C\u4EBA\u9648\u8FF0" })}>{c.status === "\u5DF2\u62D2\u7EDD" ? "\u660E\u786E\u91CD\u65B0\u5BA1\u9605" : "\u4FEE\u6B63 / \u786E\u8BA4\u6B64\u9879"}</B>}{canRejectClaim(c) && <B onClick={() => update((x) => rejectClaimCandidate(x,c.id))}>拒绝此候选</B>}{c.status === "\u5DF2\u786E\u8BA4" && <B onClick={() => open("claim", { claimId: c.id, text: c.text, contribution: c.contribution || "", skill: c.skill, resolve: "\u4FEE\u6B63\u4E3A\u672C\u4EBA\u9648\u8FF0" })}>编辑确认声明</B>}{c.status === "\u5DF2\u786E\u8BA4" && <B onClick={() => confirmAction("\u64A4\u56DE\u6B64\u58F0\u660E\uFF1F", "\u76F8\u5173\u5206\u6790\u3001\u62A5\u544A\u548C\u7B80\u5386\u5F15\u7528\u5C06\u5931\u6548\uFF1B\u65E7\u5FEB\u7167\u4FDD\u7559\u7248\u672C\u4F46\u4E0D\u80FD\u5BFC\u51FA\u53D7\u9650\u5185\u5BB9\u3002", () => {
      if(SERVER_AUTH){workspace.command('claim.withdraw',{claimId:c.id,claimVersion:c.version,confirmation:'WITHDRAW_CLAIM'}).then(()=>tell(authMessage('CLAIM_WITHDRAWN',language))).catch(error=>tell(authMessage(error.code,language)));return;}
      update((x) => ({ ...invalidate(x), profileVersion: x.profileVersion + 1, claims: x.claims.map((y) => y.id === c.id ? { ...y, status: "\u5DF2\u64A4\u56DE", withdrawnThrough:y.version,version: y.version + 1 } : y) }));
      tell("\u58F0\u660E\u5DF2\u64A4\u56DE\uFF0C\u5173\u8054\u8F93\u51FA\u9700\u66F4\u65B0\u3002");
    })}>撤回声明</B>}</div></article>)}</Panel>{modal === null && s.lastReceipt && <Notice>{s.lastReceipt} {link(s.originTask ? `/work/${s.originTask}?tab=\u5B8C\u6210\u56DE\u6267` : "/plan", "\u8FD4\u56DE\u6765\u6E90\u4EFB\u52A1 / \u8BA1\u5212 \u2192")} · {link("/assessment?tab=\u56DB\u7EF4\u4E0E\u5DEE\u8DDD", "\u6309\u9700\u66F4\u65B0\u5206\u6790")}</Notice>}</>;
    const analysisPanel=<>{!confirmed(s).length&&!s.analysis&&<Notice>先核对一段经历，再主动建立模拟对照。当前未知保持未知。{link('/assessment?tab=资料经历','补充已有经历 →')}</Notice>} {(confirmed(s).length>0||s.analysis)&&<Panel title="对照职业要求，查看准备差距"><p>职业范围：{cname(s.assessmentCareer || s.goal || "data")} · 个人 v{s.profileVersion} · {SERVER_AUTH?"入库职业资料 · 材料对照规则 D1":"原创示例 v1 · 示例规则 R1"}</p>{!confirmed(s).length || s.adminSource.status === "\u5DF2\u64A4\u56DE" ? <Notice>资料不足或来源用途已撤回，不能生成个性化能力判断。可先补材料，或继续自选方向。{link("/assessment?tab=资料经历", "\u8865\u5145\u8D44\u6599")} · {link("/careers", "\u7EE7\u7EED\u63A2\u7D22")}</Notice> : <B primary onClick={async () => {
      if(SERVER_AUTH){try{await workspace.command('assessment.create');tell('已按服务器保存材料与职业库建立规则对照，未调用 AI 或核验能力。');}catch(error){tell(error.code==='VERSION_CONFLICT'?'资料版本已变化，请先处理保存冲突后重试。':'材料对照失败，已有资料保留，请重试。');}return;}
      update(prev => ({...prev, analysisHistory:[...(prev.analysisHistory || []), ...(prev.analysis ? [prev.analysis] : [])].filter((x,i,all)=>all.findIndex(y=>y.id===x.id)===i), analysis:makeAnalysis(prev), analysisStale:false}));
      tell("\u5DF2\u51BB\u7ED3\u8F93\u5165\u5E76\u521B\u5EFA\u6A21\u62DF\u5206\u6790\u5FEB\u7167\uFF1B\u6CA1\u6709\u6267\u884C\u771F\u5B9E\u80FD\u529B\u5206\u6790\u3002");
    }}>{SERVER_AUTH?(s.analysis?"更新职业材料对照":"建立职业材料对照"):(s.analysis ? "显式更新模拟分析" : "创建模拟差距快照")}</B>}{s.analysisStale && <Notice>当前依据已变更，下面是旧快照；请显式更新。</Notice>}{s.analysis && <><p>快照 {s.analysis.id} · 本人画像 v{s.analysis.profileVersion} · {fmt(s.analysis.date)}</p><AssessmentResultView s={s} link={link} precheck={precheck} feedback={feedback} /></>}</Panel>}</>;
    return <>{materialReturn?<div className="atlas-material-return">{link(materialReturn,'返回刚才的地图位置 →')}<span>核对完成后，可回同一支线继续对照。</span></div>:<AtlasPracticeContext task={originMapTask} link={link}/>}
<PageHead title="我的经历与职业准备" description="在一处核对经历、看清准备缺口，再把确认材料用于简历。"/><SegmentedControl className="tabs assessment-mode-tabs" aria-label="页面模式">{React.cloneElement(link('/assessment?tab=准备总览','准备总览'),{'aria-current':!isEntry?'page':undefined})}{React.cloneElement(link('/assessment?tab=资料经历','资料与经历'),{'aria-current':isEntry?'page':undefined})}</SegmentedControl>{isEntry?entryPanel:<AssessmentHub s={s} tab={tab} hash={urlObj.hash||location.hash} update={update} link={link} go={go} open={open} tell={tell} review={reviewPanel} analysis={analysisPanel}/>}</>;
  }
  function careerPage() {
    const selectedCompare=validCompareIds(s.compare);
    const current = careers.find((c) => c.id === urlObj.searchParams.get("career"));
    const rows = careers.filter((c) => (!search || `${c.name}${c.task}${c.skill}`.includes(search)) && (careerFilter === "\u5168\u90E8" || careerFilter === "\u6709\u76F8\u5173\u6750\u6599" && confirmed(s).some((x) => x.skill === c.skill) || careerFilter === "\u5174\u8DA3\u63A2\u7D22"));
    if (!tab || tab === "\u804C\u4E1A\u65B9\u5411") return <><PageHead persistentDescription title="职业探索与比较" description="通过真实工作任务，了解职业的意义与差异。" />{tabs(["\u804C\u4E1A\u65B9\u5411", "\u6BD4\u8F83", "\u4F01\u4E1A\u4E0E\u5C97\u4F4D", "\u6211\u7684\u673A\u4F1A"])}<CareerBrowser s={s} url={url} filter={careerFilter} onFilter={setCareerFilter} move={move} link={link} open={open} toggleCompare={toggleCompare} update={update} /></>;
    if (["\u4F01\u4E1A\u4E0E\u5C97\u4F4D", "\u6211\u7684\u673A\u4F1A"].includes(tab)) return <><PageHead title={tab === "\u6211\u7684\u673A\u4F1A" ? "\u6211\u7684\u673A\u4F1A\u4E0E\u6C42\u804C\u8FDB\u5C55" : "\u4F01\u4E1A\u4E0E\u76EE\u6807\u5C97\u4F4D\u7814\u7A76"} description={tab === "企业与岗位" ? "查找来源、了解企业与具体岗位要求；主动加入后再进入个人机会管理。" : "这里只管理本人保存或导入的机会。私人笔记、准备任务、材料版本与求职事件分别记录。"} />{tabs(["\u804C\u4E1A\u65B9\u5411", "\u6BD4\u8F83", "\u4F01\u4E1A\u4E0E\u5C97\u4F4D", "\u6211\u7684\u673A\u4F1A"])}{tab === "企业与岗位" ? <JobDiscovery s={s} update={update} link={link} url={url} /> : <OpportunitiesView s={s} tab={tab} url={url} link={link} move={go} open={open} precheck={precheck} startTask={startTask} update={update} confirmAction={confirmAction} />}</>;
    return <><PageHead title="职业探索与比较" description="职业原创知识、岗位研究与私人输入分别管理。"/><p className="caption">当前全部为合成示例。</p>{tabs(["\u804C\u4E1A\u65B9\u5411", "\u6BD4\u8F83", "\u4F01\u4E1A\u4E0E\u5C97\u4F4D", "\u6211\u7684\u673A\u4F1A"])}
 {activeTab("\u804C\u4E1A\u65B9\u5411", "\u804C\u4E1A\u65B9\u5411") && <><div className="toolbar"><Field label="搜索职业、工作任务或技能"><input name="career-search" autoComplete="off" value={urlObj.searchParams.get("q") || ""} onChange={(e) => move(`/careers?q=${encodeURIComponent(e.target.value)}${current ? `&career=${current.id}` : ""}`, true)} placeholder="例如：数据、SQL…" /></Field><Field label="候选来源"><select value={careerFilter} onChange={(e) => setCareerFilter(e.target.value)}>{["\u5168\u90E8", "\u6709\u76F8\u5173\u6750\u6599", "\u5174\u8DA3\u63A2\u7D22"].map((x) => <option key={x}>{x}</option>)}</select></Field></div>{!confirmed(s).length && <Notice>没有确认材料，以下是原创精选与自选方向，按职业编号稳定排列，不是完整个性化推荐。</Notice>}{current ? <Panel title={`${current.name} \xB7 \u804C\u4E1A\u8BE6\u60C5`} aside={link(`/careers?q=${urlObj.searchParams.get("q") || ""}`, "\u8FD4\u56DE\u7B5B\u9009\u5217\u8868")}><div className="cols2"><div><h3>工作任务</h3><p>{current.task}</p><h3>细分与责任范围</h3><p>{current.branch}。支持任务 → 独立承担局部 → 跨范围协作为责任说明示例，不按年限自动分档。</p><h3>环境与协作</h3><p>{current.env}；具体条件以岗位原文为准。</p><h3>实例产物</h3><p>{current.output}；原创合成摘要 v1，非市场需求统计。</p></div><Black label={`${current.name} \u5DE5\u4F5C\u6837\u4F8B`} /></div><details><summary>技能与条件：必要 / 优先 / 备选 / 例外</summary><p>这里只描述原创学习示例：{current.skill} 或相应工具属于示例技术选项，不是所有岗位统一门槛。学历、经验、资质与例外需核对具体岗位，未知保持未知。</p></details><div className="actions"><B onClick={() => open("skill", { skill: current.skill, career: current.id })}>查看 {current.skill} 节点</B><B onClick={() => toggleCompare(current.id)}>{s.compare.includes(current.id) ? "\u79FB\u51FA\u6BD4\u8F83" : "\u52A0\u5165\u6BD4\u8F83"}</B><B onClick={() => update({ favorites: s.favorites.includes(current.id) ? s.favorites.filter((x) => x !== current.id) : [...s.favorites, current.id] })}>{s.favorites.includes(current.id) ? "\u53D6\u6D88\u6536\u85CF" : "\u6536\u85CF\u65B9\u5411"}</B><B primary onClick={() => open("goal", { goal: current.id, reason: s.decision.reason || "", backup: s.backup || "" })}>预览目标选择</B>{link(`/career-map?career=${current.id}`, "\u67E5\u770B\u804C\u4E1A\u5173\u7CFB\u4E0E\u6280\u80FD\u8DEF\u7EBF")}</div></Panel> : <Panel title={`\u539F\u521B\u804C\u4E1A\u76EE\u5F55 \xB7 ${careers.filter((c) => !urlObj.searchParams.get("q") || `${c.name}${c.task}${c.skill}`.includes(urlObj.searchParams.get("q"))).length} \u9879`}><div className="career-list">{careers.filter((c) => (!urlObj.searchParams.get("q") || `${c.name}${c.task}${c.skill}`.includes(urlObj.searchParams.get("q"))) && (careerFilter !== "\u6709\u76F8\u5173\u6750\u6599" || confirmed(s).some((x) => x.skill === c.skill))).map((c) => <article className="record" key={c.id}><div><h3>{link(`/careers?career=${c.id}&q=${urlObj.searchParams.get("q") || ""}`, c.name)}</h3><p>{c.task}</p><small>原创合成摘要 · v1 · 非真实招聘要求</small></div><div className="actions"><B onClick={() => toggleCompare(c.id)}>{s.compare.includes(c.id) ? "\u79FB\u51FA\u6BD4\u8F83" : "\u52A0\u5165\u6BD4\u8F83"}</B><B onClick={() => update({ favorites: s.favorites.includes(c.id) ? s.favorites.filter((x) => x !== c.id) : [...s.favorites, c.id] })}>{s.favorites.includes(c.id) ? "\u5DF2\u6536\u85CF" : "\u6536\u85CF"}</B></div></article>)}</div>{!careers.some((c) => (!urlObj.searchParams.get("q") || `${c.name}${c.task}${c.skill}`.includes(urlObj.searchParams.get("q"))) && (careerFilter !== "\u6709\u76F8\u5173\u6750\u6599" || confirmed(s).some((x) => x.skill === c.skill))) && <Empty title="没有找到符合条件的方向"><p>可清空关键词或放宽材料筛选。</p><B onClick={() => {
      setCareerFilter("\u5168\u90E8");
      move("/careers");
    }}>放宽筛选</B></Empty>}</Panel>}<div className="sticky-actions"><span>比较篮 {s.compare.length} / 3 · {s.compare.map(cname).join("\u3001") || "\u672A\u9009\u62E9"}</span>{link("/careers?tab=\u6BD4\u8F83", "\u6253\u5F00\u6BD4\u8F83", "button")}</div></>}
 {tab === "\u6BD4\u8F83" && <Panel title="并排比较职业要求与准备情况"><>{selectedCompare.length!==s.compare.length&&<Notice>部分旧方向已不可用，已在本页排除；请重新选择有效方向。</Notice>}<ComparePicker selected={selectedCompare} toggle={toggleCompare} link={link}/></>{selectedCompare.length < 2 ? null : <div id="comparison-result"><div className="table-wrap"><table><thead><tr><th>比较维度</th>{selectedCompare.map((i) => <th key={i}>{cname(i)} <B onClick={() => toggleCompare(i)} aria-label={`\u79FB\u9664${cname(i)}`}>移除</B></th>)}</tr></thead><tbody>{[["\u5DE5\u4F5C\u4EFB\u52A1", "task"], ["\u73AF\u5883\u534F\u4F5C", "env"], ["\u793A\u4F8B\u4EA7\u7269", "output"]].map(([label, key]) => <tr key={key}><td>{label}</td>{selectedCompare.map((i) => <td key={i}>{careers.find((c) => c.id === i)[key]}</td>)}</tr>)}<tr><td>个人材料与未知</td>{selectedCompare.map((i) => <td key={i}>{confirmed(s).some((x) => x.skill === careers.find((c) => c.id === i).skill) ? "\u6709\u76F8\u5173\u786E\u8BA4\u6750\u6599\uFF1B\u4E0D\u4EE3\u8868\u638C\u63E1" : "\u76F8\u5173\u6750\u6599\u4E0D\u8DB3\uFF0C\u4FDD\u6301\u672A\u77E5"}</td>)}</tr><tr><td>选择出口</td>{selectedCompare.map((i) => <td key={i}><B onClick={() => open("goal", { goal: i, reason: s.decision.reason, backup: "" })}>设为目标草稿</B></td>)}</tr></tbody></table></div><Field label="选择理由与取舍"><textarea value={s.decision.reason} onChange={(e) => update({ decision: { ...s.decision, reason: e.target.value } })} placeholder="例如：想先了解日常工作，不急于确定方向…" /></Field><Field label="待验证的同一个问题"><textarea value={s.decision.question} onChange={(e) => update({ decision: { ...s.decision, question: e.target.value } })} placeholder="例如：我是否愿意处理数据质量问题…" /></Field><Field label="当前判断"><select value={s.decision.result} onChange={(e) => update({ decision: { ...s.decision, result: e.target.value } })}>{["\u4ECD\u672A\u77E5", "\u7EE7\u7EED\u6BD4\u8F83", "\u5148\u5C0F\u8303\u56F4\u9A8C\u8BC1", "\u5DF2\u6709\u503E\u5411\uFF0C\u51C6\u5907\u786E\u8BA4"].map((x) => <option key={x}>{x}</option>)}</select></Field><div className="actions"><B onClick={() => {
      update({ decision: { ...s.decision, saved: true, version: s.version } });
      tell("\u53D6\u820D\u548C\u672A\u77E5\u5DF2\u6682\u5B58\uFF0C\u672A\u66F4\u6539\u4E3B\u76EE\u6807\u3002");
    }}>暂存，暂不决定</B><B primary onClick={() => precheck({ title: "\u804C\u4E1A\u6BD4\u8F83\u77ED\u9A8C\u8BC1", purpose: s.decision.question, source: "/careers?tab=\u6BD4\u8F83" })}>先验证，保持主目标</B>{link("/assessment", "\u5148\u8865\u5DF2\u6709\u6750\u6599")}</div><p className="muted">比较依据：原创合成职业 v1、本人画像 v{s.profileVersion}；不生成总分或强制排名。</p></div>}</Panel>}
 {["\u4F01\u4E1A\u4E0E\u5C97\u4F4D", "\u6211\u7684\u673A\u4F1A"].includes(tab) && <><Panel title={tab === "\u6211\u7684\u673A\u4F1A" ? "\u6211\u7684\u673A\u4F1A \xB7 \u7814\u7A76\u51C6\u5907\u4E0E\u7533\u8BF7\u4E8B\u4EF6\u5206\u5F00" : "\u4F01\u4E1A\u4E0E\u76EE\u6807\u5C97\u4F4D\u7814\u7A76"} aside={<B primary onClick={() => open("job", { title: "", company: "", career: s.goal || "data", location: "\u672A\u77E5", form: "\u672A\u77E5", text: "", source: "\u672C\u4EBA\u8F93\u5165\uFF08\u79C1\u6709\uFF09", date: today(), note: "", consent: false })}>手动添加岗位</B>}><Notice>未连接实时招聘数据源。不编造真实岗位、企业文化或薪酬。收藏、看原站和导出简历都不等于投递。</Notice>{s.jobs.length > 0 && <div className="actions"><B onClick={() => open("companyCompare", { selected: s.jobs.slice(0, 3).map((j) => j.id) })}>企业 / 岗位字段比较（最多三项）</B></div>}{!s.jobs.length ? <Empty title="还没有保存感兴趣的岗位"><p>可以手填本人允许处理的岗位描述，或从原型场景 PT05 查看两个合成研究卡。</p><B onClick={() => open("fixture")}>打开示例场景选择</B></Empty> : s.jobs.map((j) => <article className="record" key={j.id}><div className="section-head"><h3>{j.title}</h3><Pill>{j.archived ? "\u5DF2\u5F52\u6863" : j.status}</Pill></div><p>{j.company || "\u4F01\u4E1A\u672A\u77E5"} · {cname(j.career)} · {j.location} · {j.form}</p><p>{j.text}</p><p>薪酬原文：{j.salaryRaw || "\u672A\u63D0\u4F9B"}；币种 / 周期 / 奖金待核对，不换算、不聚合。</p><small>来源：{j.source} · 资料日期：{j.date || "\u672A\u77E5"} · 有效在招：未核验 · 截止日：未知</small><details><summary>条件原文、本人笔记与材料</summary><p>原文：{j.text}；保持必要 / 优先 / 备选 / 例外语义，不向整个职业泛化。</p><p>本人笔记：{j.note || "\u672A\u586B\u5199"}。私人输入不进入公开库或薪酬统计。</p><p>准备任务：{s.tasks.find((t) => t.id === j.taskId)?.title || "\u672A\u5173\u8054"} · {s.tasks.find((t) => t.id === j.taskId)?.status || "\u672A\u5F00\u59CB"}</p><p>申请事件：{s.events.filter((x) => x.jobId === j.id).length} 条（本人记录，不是企业认证）</p></details><div className="actions"><B onClick={() => open("job", { ...j, consent: true })}>编辑研究与笔记</B><B onClick={() => j.taskId && s.tasks.some((t) => t.id === j.taskId) ? startTask(s.tasks.find((t) => t.id === j.taskId)) : precheck({ title: `\u51C6\u5907\uFF1A${j.title}`, purpose: "\u6838\u5BF9\u5C97\u4F4D\u8981\u6C42\u4E0E\u672C\u4EBA\u6750\u6599", career: j.career, association: j.career === s.goal ? "\u4E3B\u8BA1\u5212" : "\u72EC\u7ACB\u63A2\u7D22", jobId: j.id, source: "/careers?tab=\u6211\u7684\u673A\u4F1A" })}>{j.taskId ? "\u7EE7\u7EED\u540C\u4E00\u51C6\u5907\u4EFB\u52A1" : "\u51C6\u5907\u6E05\u5355\u9884\u68C0"}</B>{s.stage === "S2" && <B onClick={() => open("application", { jobId: j.id, type: "\u6295\u9012", date: today(), material: "", note: "", next: "" })}>记录本人申请 / 面试 / 结果</B>}<B onClick={() => {
      update(x=>targetResumeStudio(x,j.id));
      go("/reports?tab=\u5C97\u4F4D\u7B80\u5386");
    }}>制作岗位简历</B><B onClick={() => open("original", { jobId: j.id })}>查看来源说明</B><B onClick={() => confirmAction("\u5F52\u6863\u5C97\u4F4D\u7814\u7A76\u5361\uFF1F", "\u4FDD\u7559\u672C\u4EBA\u6C42\u804C\u4E8B\u4EF6\u3001\u6750\u6599\u5FEB\u7167\u53CA\u5171\u4EAB\u4EFB\u52A1\uFF1B\u4E0D\u4F1A\u5220\u9664\u5386\u53F2\u6210\u679C\u3002", () => {
      update((x) => ({ ...x, jobs: x.jobs.map((y) => y.id === j.id ? { ...y, archived: true } : y) }));
      tell("\u5DF2\u5F52\u6863\u7814\u7A76\u5361\uFF0C\u5386\u53F2\u4FDD\u7559\u3002");
    })}>归档</B></div>{s.events.filter((x) => x.jobId === j.id).map((ev) => <p key={ev.id} className="event">{ev.date} · 本人记录：{ev.type} · 材料快照：{ev.material || "\u672A\u9009\u62E9"} · {ev.note || "\u65E0\u7B14\u8BB0"} {ev.next && `\uFF1B\u4E0B\u4E00\u884C\u52A8\uFF1A${ev.next}`}</p>)}</article>)}</Panel>{s.presets.length > 0 && <Panel title="保存的搜索条件">{s.presets.map((p) => <div className="record" key={p.id}><p>{p.query} · {p.scope} · {p.date} · 通知：未开启</p><B onClick={() => {
      update({ searchFilters: p });
      go("/assistant?tab=\u81EA\u7136\u8BED\u8A00\u68C0\u7D22");
    }}>恢复并修改条件</B></div>)}</Panel>}</>}

 </>;
  }
  function toggleCompare(cid) {
    const current=validCompareIds(s.compare);
    if(current.includes(cid))update({compare:current.filter(id=>id!==cid)});
    else if(current.length>=3)tell('最多比较三个方向，请先移除一个。');
    else if(careers.some(c=>c.id===cid))update({compare:[...current,cid]});
  }

  function mapPage() {
    return <><KnowledgeIndex mode="skills" link={link}/><MapWorkspace update={update} s={s} url={url} move={move} link={link} open={open} precheck={precheck} askAI={selection => { update({ aiReturn:url, aiDraft:`请解释当前地图中的 ${selection}：用途、关系依据和未知项。不要推断我的能力。` }); setAiSide(true); }} /></>;
  }
  function planPage() {
    const practiceId = urlObj.searchParams.get("practice");
    if (tab === "执行" && practiceId !== null) return <ExternalPractice s={s} task={s.tasks.find(t => t.id === practiceId)} record={urlObj.searchParams.get("step") === "record"} link={link} setTask={setTask} open={open} tell={tell} />;
    const unified = tab !== '复盘' && (tab !== '执行' || urlObj.searchParams.get('view') === 'calendar');
    const planMode = unified ? '计划总览' : tab;
    return <><PageHead action={unified?<a href="#weekly-actions" className="button">查看本周日程</a>:link('/plan#weekly-actions','查看本周日程','button')} title={tab === '复盘' ? '实践复盘' : unified ? '目标与行动计划' : '行动推进台'} description={tab === '复盘' ? '记录实际结果、反馈、困难与下一步。' : '从目标到每周安排，在同一处规划和推进。'} /><SegmentedControl className="tabs" aria-label="页面模式">{['计划总览','执行','复盘'].map(name=>React.cloneElement(link('/plan?tab='+encodeURIComponent(name),name),{key:name,'aria-current':planMode===name?'page':undefined}))}</SegmentedControl>
 {unified&&SERVER_AUTH&&<CareerKnowledge career={s.goal||'data'} precheck={precheck} link={link}/>}
 {unified && <UnifiedPlan s={s} open={open} link={link} precheck={precheck} startTask={startTask} update={update} adjustment={<PlanAdjustment s={s} open={open} update={update} expanded={urlObj.searchParams.get('adjust')==='1'}/>} />}
 {tab === '执行' && !unified && <div className="action-cycle"><ExecutionDesk s={s} url={url} link={link} open={open} startTask={startTask} precheck={precheck} viewSwitch={<SegmentedControl as="div" className="task-view-switch" role="group" aria-label="行动显示方式">{link('/plan?tab=执行&view=list','列表','button selected')}{link('/plan#weekly-actions','日程','button')}</SegmentedControl>}/></div>}
 {tab === "复盘" && <div className="action-cycle"><ReviewDesk s={s} taskId={urlObj.searchParams.get("task")} update={update} link={link} open={open} go={go} tell={tell}/></div>}
 </>;
  }
  function taskList() {return <TaskExecutionList s={s} url={url} link={link} open={open} startTask={startTask} precheck={precheck}/>;}
  function recordCoursePosition(index,course){update(prev=>({...prev,reading:{...prev.reading,[course.id]:{chapter:index,chapterId:course.chapters[index].id,version:course.content_version,updatedAt:new Date().toISOString()}}}));}
  function learningPage() {
    return <><PageHead title="学习与实践中心" description="按目标选内容，先阅读，再决定一次实践的范围与投入。" />{tabs(["\u8DEF\u7EBF\u4E0E\u8D44\u6E90", "\u77ED\u4F53\u9A8C", "\u7EFC\u5408\u9879\u76EE"])}<PracticeTemplates precheck={precheck}/><KnowledgeIndex mode="resources" link={link}/><LearningCatalogue live={SERVER_AUTH} catalog={workspace.catalog} catalogError={workspace.catalogError} retryCatalog={workspace.retryCatalog} s={s} tab={tab} url={url} move={move} link={link} open={open} precheck={precheck} update={update} startTask={startTask} /></>;
  }
  function workPage() {
    const t = s.tasks.find((t2) => t2.id === id);
    if (!t) return <Empty title="任务不存在或不属于当前示例账户"><p>不读取其他对象；可从计划选择有效任务。LF 演示可载入 PT06。</p>{link("/plan", "\u8FD4\u56DE\u8BA1\u5212")} <B onClick={() => open("fixture")}>载入示例场景</B></Empty>;
    if (s.stage === "S1" || t.mode === "S1") return <Empty title="外部实践：手动记录进展"><p>执行留在 U07，不模拟未开放的学习工作区。</p><B onClick={() => {
      go("/plan?tab=\u6267\u884C");
      open("task", { taskId: t.id });
    }}>在计划详情继续</B></Empty>;
    if (stoppedTask(t)) return <Empty title="这项任务已暂停"><p>{t.status}不会记为完成。已有尝试和成果保留，先明确恢复安排并核对总预算。</p><B onClick={()=>open('taskEdit',{taskId:t.id,restore:true})}>编辑并恢复任务</B>{link('/plan?tab=执行&task='+encodeURIComponent(t.id),'返回原任务记录')}</Empty>;
    const l = learning.find((l2) => l2.id === t.template) || learning[0];
    const latest = t.attempts.at(-1);
    return <><PageHead title={t.title} persistentDescription description={`\u6B63\u5728\u56DE\u7B54\uFF1A${t.purpose}`} action={link("/plan?tab=\u6267\u884C", "\u8FD4\u56DE\u8BA1\u5212")} /><WorkStatus task={t} link={link} s={s} /><AtlasPracticeContext task={t} link={link} /><Notice>{SERVER_AUTH?'本任务使用已发布的离线教学内容。检查只记录本人自检，参考成果用于对照；未运行用户代码或独立核验能力。':'本页使用原创合成任务；检查为自检或预录文本反馈，没有执行代码或真实能力核验。'}</Notice>{SERVER_AUTH&&learning.some(l=>l.id===t.template)&&<CourseTaskMaterials task={t}/>}{(t.completed||t.status==='完成')&&<Notice>本任务已完成，成果版本已保留。下一轮行动请{link('/plan','回计划安排')}，经预算预检另建任务。</Notice>}{tabs(["\u5F53\u524D\u4EFB\u52A1", "\u7B14\u8BB0\u4E0E\u9605\u8BFB", "\u5C1D\u8BD5\u4E0E\u53CD\u9988", "\u8D21\u732E\u4E0E\u8868\u8FBE", "\u5B8C\u6210\u56DE\u6267"])}
 {activeTab("\u5F53\u524D\u4EFB\u52A1", "\u5F53\u524D\u4EFB\u52A1") && <><Panel title="这项任务做什么，怎样算完成？"><p>为什么做：{t.purpose}</p><p>交付物：{t.standard}</p>{t.deliveryNote&&<p>本人补充说明：{t.deliveryNote}</p>}<p>先修与满足方法：{l.prereq}</p><p>预计投入：{t.hours} 小时；退出条件：可记录受阻、延期、跳过或取消，不计完成。</p><details className="quality-task-media"><summary>查看任务媒体占位</summary><Black label="任务图像 / 视频" /></details><div className="actions"><B primary onClick={() => go(`/work/${t.id}?tab=\u5C1D\u8BD5\u4E0E\u53CD\u9988`)}>填写尝试产物</B><B onClick={() => go(`/work/${t.id}?tab=\u7B14\u8BB0\u4E0E\u9605\u8BFB`)}>先阅读与记笔记</B><B onClick={() => open("task", { taskId: t.id })}>记录阻塞 / 暂停</B></div></Panel><Panel title="分开的状态"><div className="cols3"><p>任务执行：{t.status}</p><p>检查：{t.check}</p><p>声明：{t.claimStatus}</p></div></Panel></>}
 {tab === "\u7B14\u8BB0\u4E0E\u9605\u8BFB" && (SERVER_AUTH&&learning.some(l=>l.id===t.template)?<Panel title="课程阅读与当前任务笔记"><CourseTaskReading task={t} chapter={s.reading[t.template]?.chapter||0} onPosition={recordCoursePosition} onSave={(index,c)=>{recordCoursePosition(index,c);go('/work/'+t.id);}} precheck={precheck}/><Field label="当前任务笔记（自动保留）"><textarea value={t.note} onChange={e=>setTask(t.id,{note:e.target.value})}/></Field></Panel>:<Panel title="业务、方案、实践、表达"><nav className="tabs">{l.chapters.map((c, i) => <B key={c} onClick={() => update({ reading: { ...s.reading, [l.id]: { chapter: i, version: 1 } } })} aria-pressed={s.reading[l.id]?.chapter === i}>{c}</B>)}</nav><h3>{l.chapters[s.reading[l.id]?.chapter || 0]}</h3><p>原创学习示例：把要回答的问题、观察到的事实、处理理由和局限分别记录。使用合成数据，不扩大为真实生产结论。</p><Black label="章节示例图" /><Field label="当前任务笔记（自动保留）"><textarea value={t.note} onChange={(e) => setTask(t.id, { note: e.target.value })} /></Field><B onClick={() => tell("\u7B14\u8BB0\u4E0E\u9605\u8BFB\u4F4D\u7F6E\u5DF2\u4FDD\u7559\uFF1B\u672A\u53D8\u66F4\u4EFB\u52A1\u5B8C\u6210\u6216\u80FD\u529B\u72B6\u6001\u3002")}>保存笔记与阅读位置</B> {link(`/work/${t.id}?tab=\u5C1D\u8BD5\u4E0E\u53CD\u9988`, "\u7EE7\u7EED\u5F53\u524D\u4EFB\u52A1\u4EA7\u7269")}</Panel>)}
 {tab === "\u5C1D\u8BD5\u4E0E\u53CD\u9988" && <><div className="quality-task-layout"><div className="quality-task-editor"><Panel title="当前尝试草稿"><Field label="阶段 / 里程碑"><select value={t.milestone} onChange={(e) => setTask(t.id, { milestone: e.target.value })}>{["\u4E1A\u52A1\u7406\u89E3", "\u65B9\u6848\u53D6\u820D", "\u5B9E\u8DF5\u4EA7\u7269", "\u8868\u8FBE\u4E0E\u5C40\u9650"].map((x) => <option key={x}>{x}</option>)}</select></Field><Field label="产物文本（每次提交形成独立版本）"><textarea aria-describedby="task-draft-writing-hint" value={t.draft} onChange={(e) => setTask(t.id, { draft: e.target.value })} placeholder="记录问题清单、处理理由、描述统计与限制…" /></Field><WritingHint id="task-draft-writing-hint">先写用了什么材料、做了哪一步、留下了什么。还没完成的部分也可以如实记下来。</WritingHint><Field label="本人贡献"><textarea aria-describedby="task-contribution-writing-hint" value={t.contribution} onChange={(e) => setTask(t.id, { contribution: e.target.value })} /></Field><WritingHint id="task-contribution-writing-hint">只写自己负责的部分，例如整理资料、实现一段功能或检查结果；参考与协作方式在下方单独说明。</WritingHint><Field label="参考与辅助方式"><select value={t.aid} onChange={(e) => setTask(t.id, { aid: e.target.value })}>{["\u65E0", "\u53C2\u8003\u9605\u8BFB", "\u8DDF\u505A\u590D\u73B0", "AI \u8F85\u52A9", "\u56E2\u961F\u8D21\u732E", "\u72EC\u7ACB\u6539\u9020"].map((x) => <option key={x}>{x}</option>)}</select></Field><div className="actions"><B onClick={() => tell("\u5F53\u524D\u5C1D\u8BD5\u8349\u7A3F\u5DF2\u4FDD\u5B58\uFF0C\u5C1A\u672A\u63D0\u4EA4\u3002")}>保存草稿</B><B primary disabled={t.completed||t.status==='完成'} onClick={async () => {
      try {
        if(SERVER_AUTH){await workspace.command('task.submit',{taskId:t.id,taskVersion:t.version,confirmation:'SUBMIT_ATTEMPT'});tell(authMessage('ATTEMPT_SAVED',language));return;}
        const next=submitTaskAttempt(s,t.id),a=next.tasks.find(x=>x.id===t.id).attempts.at(-1);
        update(next);
        tell(`\u5DF2\u63D0\u4EA4 v${a.version}\uFF0C\u5C1A\u672A\u68C0\u67E5\uFF0C\u4E0D\u4EE3\u8868\u5DF2\u5B8C\u6210\u3002`);
      } catch(e) { tell(e.message); }
    }}>提交为 v{t.attempts.length + 1}</B></div></Panel></div><TaskDeliveryGuide task={t} link={link}/></div><Panel title="尝试版本与对应反馈">{!t.attempts.length ? <GuidedStart title="从草稿到一次可回看的尝试" description="在本页上方填写产物、本人贡献和辅助来源。保存草稿不会提交，提交后才会出现版本与检查入口。" steps={['先保存尚未完成的草稿。','准备好后提交当前版本，旧版本保留。','为对应版本记录自检或查看模拟反馈。']}>{link('/work/'+encodeURIComponent(t.id)+'?tab=尝试与反馈','回到草稿与提交区','button primary')}{link('/work/'+encodeURIComponent(t.id),'查看任务与交付标准','button')}</GuidedStart> : t.attempts.map((a) => <article className="record" key={a.id}><h3>尝试 v{a.version} · {a.milestone || "\u5B9E\u8DF5\u4EA7\u7269"}</h3><p className="preserve">{a.text}</p><p>本人贡献：{a.contribution || "\u5F85\u8BF4\u660E"}；辅助：{a.aid || "\u672A\u8BF4\u660E"}</p><Pill>{a.result}</Pill><p>{a.feedback || "\u6CA1\u6709\u68C0\u67E5\u8BB0\u5F55\u3002"}</p><div className="actions"><B primary onClick={() => runCheck(t.id, a.id, "\u81EA\u68C0\u8BB0\u5F55")}>记录本人自检（非实核）</B>{!SERVER_AUTH&&<details className="demo-tools"><summary>演示反馈 / 检查异常</summary><B onClick={() => runCheck(t.id, a.id, "\u5F85\u4FEE\u8BA2")}>模拟：文本反馈待修订</B><B onClick={() => runCheck(t.id, a.id, "\u670D\u52A1\u6545\u969C")}>模拟：检查服务故障</B></details>}<B onClick={() => {
      setTask(t.id, { draft: a.text, contribution: a.contribution, aid: a.aid });
      tell(`\u5DF2\u590D\u5236 v${a.version} \u5230\u65B0\u8349\u7A3F\uFF1B\u65E7\u7248\u672C\u4FDD\u6301\u4E0D\u53D8\u3002`);
    }}>以此版本修订重交</B></div></article>)}</Panel></>}
 {tab === "\u8D21\u732E\u4E0E\u8868\u8FBE" && <Panel title="核对项目成果与个人贡献"><Field label="本人实际做了什么"><textarea value={t.contribution} onChange={(e) => setTask(t.id, { contribution: e.target.value })} /></Field><p>区分参考阅读、复现、独立改造、团队贡献；没有实际成果数字则留空。</p><Field label="反思与局限（私人片段，默认不导出）"><textarea value={t.reflection} onChange={(e) => setTask(t.id, { reflection: e.target.value })} /></Field><B onClick={() => tell("\u8868\u8FBE\u4E0E\u79C1\u4EBA\u53CD\u601D\u5DF2\u4FDD\u5B58\uFF0C\u672A\u751F\u6210\u65B0\u7684\u80FD\u529B\u58F0\u660E\u3002")}>保存本人表达</B> {link(`/work/${t.id}?tab=\u5B8C\u6210\u56DE\u6267`, "\u67E5\u770B\u5B8C\u6210\u6761\u4EF6")}</Panel>}
 {tab === "\u5B8C\u6210\u56DE\u6267" && <Panel title="完成范围回执"><TaskReadiness s={s} task={t} link={link}/><dl className="facts"><dt>任务执行</dt><dd>{t.status}</dd><dt>成果提交</dt><dd>{latest ? `v${latest.version} \xB7 ${latest.id}` : "\u672A\u63D0\u4EA4"}</dd><dt>检查方法 / 状态</dt><dd>{t.check}；没有真实运行或独立核验</dd><dt>声明确认</dt><dd>{t.claimStatus}</dd></dl><p>本合成任务允许以本人自检记录完成有限范围；必须有提交版本、贡献说明、标准确认及该版本的自检。示例反馈待修订与服务故障不能代替自检。</p><label className="check"><input id="task-standard-confirmation" type="checkbox" checked={t.selfcheck || false} onChange={(e) => setTask(t.id, { selfcheck: e.target.checked })} />我已逐项核对交付物，确认本次仅为本人自检范围。</label><div className="actions"><B primary onClick={async () => {
      if(!t.completed&&dependencyBlock(s,t)){tell("交付依赖尚未完成，请先在分阶段计划查看依赖任务。");return;}
      if (!latest || !t.selfcheck || !t.contribution.trim() || latest.result !== "\u81EA\u68C0\u8BB0\u5F55") {
        tell("\u5B8C\u6210\u6761\u4EF6\u672A\u6EE1\u8DB3\uFF1A\u9700\u6700\u65B0\u63D0\u4EA4\u7248\u672C\u3001\u8D21\u732E\u8BF4\u660E\u3001\u5BF9\u5E94\u81EA\u68C0\u8BB0\u5F55\u53CA\u9010\u9879\u6807\u51C6\u786E\u8BA4\u3002");
        return;
      }
      if(SERVER_AUTH){try{await workspace.command('task.complete',{taskId:t.id,taskVersion:t.version,confirmation:'COMPLETE_LIMITED_SCOPE'});tell(authMessage('LIMITED_COMPLETION_SAVED',language));}catch(error){tell(authMessage(error.code,language));}return;}
      setTask(t.id, { status: "\u5B8C\u6210", completed: true });
      tell("\u5DF2\u8BB0\u5F55\u6709\u9650\u4EFB\u52A1\u8303\u56F4\u5B8C\u6210\uFF1B\u4E0D\u4EE3\u8868\u80FD\u529B\u6838\u9A8C\u6216\u58F0\u660E\u5DF2\u786E\u8BA4\u3002");
    }}>记录有限范围完成</B>{t.completed && latest && <B onClick={() => open("evidence", { taskId: t.id, attemptId: latest.id, skills: [atlasTaskSkill(t)||l.skill], contribution: t.contribution })}>选择成果版本 → 本人确认</B>}<B onClick={() => go("/plan?tab=复盘&task="+encodeURIComponent(t.id))}>稍后确认，先复盘</B>{link(t.source, "\u8FD4\u56DE\u539F\u7591\u95EE / \u6765\u6E90")}</div></Panel>}
 </>;
  }
  async function runCheck(tid, aid, result) {
    if(SERVER_AUTH){try{const task=s.tasks.find(row=>row.id===tid);await workspace.command('task.selfcheck',{taskId:tid,taskVersion:task.version,attemptId:aid,confirmation:'SELF_CHECK_ONLY'});tell('已保存此版本对应的自检记录，未独立核验。');}catch(error){tell(authMessage(error.code,language));}return;}
    setTask(tid, (t) => ({ ...t, check: t.attempts.at(-1)?.id===aid?result:t.check, attempts: t.attempts.map((a) => a.id === aid ? { ...a, result, feedback: result === "\u670D\u52A1\u6545\u969C" ? "\u6A21\u62DF\u68C0\u67E5\u670D\u52A1\u6545\u969C\uFF1A\u672A\u5B8C\u6210\u68C0\u67E5\uFF0C\u4E0D\u5224\u65AD\u4EA7\u7269\u4E0D\u5408\u683C\u3002\u53EF\u91CD\u8BD5\u3002" : result === "\u5F85\u4FEE\u8BA2" ? "\u9884\u5F55\u6587\u672C\u53CD\u9988\u793A\u4F8B\uFF1A\u8BF7\u8865\u5145\u5904\u7406\u7406\u7531\u3001\u63CF\u8FF0\u7EDF\u8BA1\u548C\u9650\u5236\u8BF4\u660E\uFF1B\u6CA1\u6709\u6267\u884C\u4EE3\u7801\u3002" : "\u672C\u4EBA\u81EA\u68C0\u8BB0\u5F55\uFF1A\u4EC5\u8BB0\u5F55\u7528\u6237\u58F0\u660E\u7684\u6838\u5BF9\u52A8\u4F5C\uFF0C\u4E0D\u6784\u6210\u72EC\u7ACB\u6838\u9A8C\u3002" } : a) }));
    tell(result === "\u670D\u52A1\u6545\u969C" ? "\u68C0\u67E5\u670D\u52A1\u6545\u969C\uFF08\u6A21\u62DF\uFF09\uFF0C\u53EF\u5BF9\u540C\u4E00\u7248\u672C\u91CD\u8BD5\uFF1B\u672A\u6539\u53D8\u80FD\u529B\u5224\u65AD\u3002" : "\u5DF2\u4FDD\u5B58\u6B64\u7248\u672C\u5BF9\u5E94\u7684\u793A\u4F8B\u53CD\u9988 / \u81EA\u68C0\u8BB0\u5F55\u3002");
  }
  const conv = s.conversations.find((c) => c.id === s.conversationId) || s.conversations[0];
  const sendAI = () => {
      if(SERVER_AUTH){liveAgent.send();return;}
      if (!s.aiDraft.trim()) {
        tell("\u8BF7\u5148\u8F93\u5165\u95EE\u9898\u3002");
        return;
      }
      const refs=validScopeRefs(s),scope=refs.length?s.aiScope:s.aiScope.filter(x=>x!=='本人确认片段');
      const msg = [{ id:uid('msg'),role:'user',text:s.aiDraft,scope,claimRefs:refs }, { id:uid('msg'),role:'assistant',text:'模拟回答：先确认要回答的问题，再比较有限范围的行动。预算、先修和已有材料需在业务页预览确认；未知仍保持未知。',scope,claimRefs:refs }];
      update({ conversations: s.conversations.map((c) => c.id === conv.id ? { ...c, messages: [...c.messages, ...msg] } : c), aiDraft: "", aiClaimRefs:refs, aiScope:scope, authorized:refs.length>0, proposal: { id: uid("proposal"), base: s.planVersion, context: s.profileVersion } });
  };
  const proposalContent = () => (s.proposal && <article className="result-card"><h3>可确认的行动卡（模拟提议）</h3><p>基线计划 v{s.proposal.base}；本人材料 v{s.proposal.context}。尚未应用。</p><div className="actions"><B onClick={() => {
      if (s.proposal.base !== s.planVersion || s.proposal.context !== s.profileVersion) {
        tell("\u63D0\u8BAE\u8FC7\u671F\uFF0C\u5DF2\u91CD\u65B0\u7ED1\u5B9A\u5F53\u524D\u7248\u672C\uFF0C\u8BF7\u518D\u6B21\u9884\u89C8\u3002");
        update({ proposal: { ...s.proposal, base: s.planVersion, context: s.profileVersion } });
        return;
      }
      go("/plan?tab=\u65B9\u6848\u8C03\u6574");
      open("scenario", { budget: s.budget ?? 0, goal: s.goal || "", base: s.planVersion, policy: "\u5EF6\u540E\u8D85\u989D\u4EFB\u52A1" });
    }}>预览计划方案</B><B onClick={() => go("/careers?tab=\u6BD4\u8F83")}>打开职业比较</B><B onClick={() => precheck({ title: "AI \u63D0\u8BAE\u9A8C\u8BC1\u884C\u52A8", purpose: "\u6F84\u6E05\u5F53\u524D\u672A\u77E5\u95EE\u9898" })}>预检任务草稿</B><B onClick={() => {
      update({ proposal: null });
      tell("\u5DF2\u53D6\u6D88\u63D0\u8BAE\uFF0C\u4E8B\u5B9E\u4E0E\u8BA1\u5212\u672A\u6539\u53D8\u3002");
    }}>取消提议，继续讨论</B></div></article>);
  function aiContent(side = false) {
    if (!side||SERVER_AUTH) return <>{side&&<div className="agent-side-actions"><B onClick={()=>{liveAgent.cancel();update({aiReturn:url});setAiSide(false);go('/assistant');}}>展开同一会话</B></div>}{SERVER_AUTH&&!side&&<AgentWorkflow key={authUser?.id} user={authUser} state={s} workspace={workspace}/>}<AssistantChat s={s} conv={conv} update={update} open={open} send={sendAI} proposal={SERVER_AUTH?null:proposalContent()} liveAgent={SERVER_AUTH?liveAgent:null} /></>;
    return <><Notice>模拟 AI · 未连接模型。会话 {conv?.id || "\u65E0"}；计划 v{s.planVersion}；本人资料 {s.authorized ? "\u4EC5\u9009\u4E2D\u786E\u8BA4\u7247\u6BB5" : "\u672A\u6388\u6743\uFF0C\u4EC5\u901A\u7528\u77E5\u8BC6"}。私人反思默认排除。</Notice><Field label="意图 / 六种咨询模式"><select value={conv?.mode || "\u804C\u4E1A\u54A8\u8BE2"} onChange={(e) => update({ conversations: s.conversations.map((c) => c.id === conv.id ? { ...c, mode: e.target.value } : c) })}>{["\u804C\u4E1A\u54A8\u8BE2", "\u8BC4\u4F30\u89E3\u91CA", "\u8BA1\u5212\u63A8\u6F14", "\u5B66\u4E60\u8F85\u5BFC", "\u6210\u679C\u53CD\u9988", "\u62A5\u544A\u7F16\u8F91"].map((x) => <option key={x}>{x}</option>)}</select></Field><div className="actions"><B onClick={() => open("scope")}>选择本次可用资料</B>{side ? <B onClick={() => {
      update({ aiReturn: url });
      setAiSide(false);
      go("/assistant");
    }}>展开同一会话</B> : link(s.aiReturn || "/app", "\u8FD4\u56DE\u539F\u5DE5\u4F5C\u533A\u4E0E\u6807\u7B7E")}</div><div className="messages" aria-live="polite">{conv?.messages.length ? conv.messages.map((m) => <article key={m.id} className={m.role === "user" ? "user-message" : "assistant-message"}><span className="muted">{m.role === "user" ? "\u672C\u4EBA\u95EE\u9898" : "\u9884\u5F55\u6A21\u62DF\u56DE\u7B54"}</span><p>{m.text}</p>{m.role !== "user" && <small>引用：原创职业示例 v1；不生成个人能力结论。范围：{m.scope.join("\u3001")}</small>}</article>) : <p>会话尚无内容。关闭侧栏不删除会话；展开后保留相同会话 ID。</p>}</div><Field label="当前问题（本机自动保留）"><textarea value={s.aiDraft} onChange={(e) => update({ aiDraft: e.target.value })} placeholder="例如：每周只有三小时，怎么安排…" /></Field><div className="actions"><B primary onClick={() => {
      sendAI();
    }}>发送并显示模拟结果</B><B onClick={() => tell("\u6A21\u62DF AI \u65AD\u6D41 / \u4E0D\u53EF\u7528\uFF1A\u95EE\u9898\u8349\u7A3F\u5DF2\u4FDD\u7559\uFF0C\u53EF\u91CD\u8BD5\u6216\u8D70\u624B\u52A8\u4E3B\u7EBF\u3002")}>模拟 AI 失败</B></div>{proposalContent()}</>;
  }
  function assistantPage() {
    if (!tab || tab === "咨询与方案") return <AssistantWorkbench s={s} conv={conv} link={link} update={update} open={open} aiContent={aiContent} tabs={tabs} confirmAction={confirmAction} />;
    return <><AssistantPageHeader s={s} tab={tab} link={link}/>{tabs(['咨询与方案','自然语言检索'])}<SearchWorkbench s={s} update={update} link={link} tell={tell}/>{s.presets.length>0&&<SavedSearches s={s} update={update} go={go} confirmAction={confirmAction}/>}</>;
  }

  function settingsPage() {
    return <AccountWorkspace s={s} user={authUser} update={update} link={link} live={SERVER_AUTH}><KnowledgeIndex accountRole="knowledge" link={link}/><PageHead accountRole="heading" title="个人设置与资料管理" description="管理个人背景、站内提醒、授权范围与本机资料。修改偏好后，可先预览对计划的影响。" />{tabs(["\u504F\u597D\u4E0E\u901A\u77E5", "资料与隐私"])}{SERVER_AUTH&&<AccountSecurityPanel accountRole="security" onNotice={tell} user={authUser} sync={workspace} download={download} onDeleted={()=>{clearTimeout(timer.current);authSubject.current=null;setAuthUser(null);setS(fresh());setForm({});setModal(null);setAiSide(false);sessionStorage.removeItem("intent");move("/");tell("账户及在线业务记录已删除；备份按 14 天保留策略到期清除。");}}/>}{activeTab("\u504F\u597D\u4E0E\u901A\u77E5", "\u504F\u597D\u4E0E\u901A\u77E5") && <SettingsPreferences live={SERVER_AUTH} onReceipt={async()=>{try{await workspace.flush();tell("偏好已保存至账户。");}catch(error){tell(authMessage(error.code,language));}}} s={s} update={update} tell={tell} link={link}/>}{tab === "资料与隐私" && <Panel id="settings-authorization" title="按用途选择范围"><p>目前：{SERVER_AUTH?(hasExternalConsent(s)?"已确认 DeepSeek 外发范围":"尚未同意外部模型处理"):(s.authorized?"允许模拟读取选中确认片段":"未授权个人片段，仅通用知识")}。{SERVER_AUTH?"确认外发授权后，问题及所选范围将发送至 DeepSeek。":"没有真实外部传输。"}</p><B onClick={() => open("scope")}>修改资料范围</B><B onClick={() => confirmAction("\u64A4\u56DE\u8D44\u6599\u5904\u7406\u6388\u6743\uFF1F", "停止后续外发，相关消息与笔记停止展示，未应用提议失效。已发送给外部模型的内容无法通过本地撤回追溯收回。", () => {
      update((x) => ({ ...x, aiExternalConsent:null, authorized: false, aiClaimRefs: [], aiScope: ["\u804C\u4E1A\u539F\u521B\u77E5\u8BC6"], proposal: null, aiDraft: "", conversations: x.conversations.map((c) => ({ ...c, messages: c.messages.filter((m) => !m.scope?.includes("\u672C\u4EBA\u786E\u8BA4\u7247\u6BB5")) })) }));
      tell("\u6388\u6743\u5DF2\u64A4\u56DE\uFF0C\u4E2A\u4EBA\u4E0A\u4E0B\u6587\u5DF2\u505C\u6B62\u4F7F\u7528\u3002");
    })}>撤回授权</B></Panel>}{tab === "资料与隐私" && <><Panel id="settings-data" title="资料与相关分析、报告"><p>材料 {s.claims.length} 项、任务 {s.tasks.length} 项、报告 {s.reports.length} 份。{SERVER_AUTH?"记录保存至当前账户，其他账户无法访问。":"示例保存在当前浏览器，不具备真实账户隔离。"}</p><B onClick={() => download("\u672C\u4EBA\u6570\u636E_\u539F\u578B\u793A\u4F8B.json", JSON.stringify({ ...s, logged: void 0 }, null, 2), "application/json")}>导出本地示例 JSON</B><B onClick={() => confirmAction("\u5220\u9664\u672C\u4EBA\u6750\u6599\u4E0E\u6D3E\u751F\u5185\u5BB9\uFF1F", "\u6750\u6599\u3001\u5206\u6790\u3001\u4F1A\u8BDD\u6B63\u6587\u53CA\u62A5\u544A / \u7B80\u5386\u5F15\u7528\u505C\u6B62\u8BBF\u95EE\uFF1B\u4EFB\u52A1\u5386\u53F2\u4FDD\u7559\u8131\u654F\u72B6\u6001\u3002\u8FD9\u91CC\u53EA\u80FD\u5220\u9664\u672C\u6D4F\u89C8\u5668\u793A\u4F8B\uFF0C\u4E0D\u4EE3\u8868\u771F\u5B9E\u540E\u7AEF\u6216\u5907\u4EFD\u5DF2\u5220\u9664\u3002", () => {
      clearTimeout(timer.current);
      update(purgePrivateMaterials);
      setSearch("");
      setForm({});
      setAiSide(false);
      tell("\u672C\u5730\u6750\u6599\u5904\u7406\u5B8C\u6210\uFF0C\u771F\u5B9E\u670D\u52A1\u5220\u9664\u672A\u5B9E\u73B0\u3002");
    })}>查看影响并删除</B></Panel>{SERVER_AUTH?<Panel title="真实账户"><p>当前邮箱：{authUser?.email}。数据按账户保存；修改密码、导出、清空与注销请使用上方“账户安全与服务器数据”。邮件找回尚未接入。</p></Panel>:<Panel title="本机演示账户范围"><p>注销会清除当前浏览器中的演示设置、材料、任务、讨论、岗位和输出。已下载的文件不能远程收回；真实服务账户和备份不在本原型内。</p><B onClick={()=>confirmAction("注销本机演示账户？","清空本机全部演示数据并返回公开首页；不声称已注销真实后台账户。",()=>{clearTimeout(timer.current);setS(fresh());sessionStorage.removeItem("intent");setSearch("");setForm({});setAiSide(false);move("/");tell("本机演示账户已清空，未调用真实注销服务。");})}>注销本机演示账户</B></Panel>}{s.deletion && <Notice>处理状态：{s.deletion.status} · {s.deletion.date} · {s.deletion.detail}</Notice>}</>}{activeTab("偏好与通知","偏好与通知") && <details className="settings-feedback" id="settings-feedback" open={urlObj.searchParams.get("section")==="feedback"}><summary>反馈与回复（{s.feedback.length}）</summary><Panel title="本人反馈工单">{s.feedback.length ? s.feedback.map((f) => <article className="record" key={f.id}><h3>{f.id} · {f.status}</h3><p>{f.object} · {f.text}</p><p>处理回执：{f.reply || "\u5F85\u5904\u7406\uFF1B\u4E0D\u4F1A\u76F4\u63A5\u4FEE\u6539\u4E2A\u4EBA\u4E8B\u5B9E\u3002"}</p></article>) : <GuidedStart title="查看反馈进度与回复" description="可反馈某个结论、引用或操作问题。提交时说明具体对象与版本；未提交时，这里不会生成工单。" steps={['找到有疑问的页面、对象或版本。','只提交需要处理的片段，不附无关私人资料。','保留工单编号，在此查看状态与回复。']}><B primary onClick={feedback}>提交具体版本反馈</B>{link('/assessment?tab=四维与差距','回看评估依据','button')}{link('/assistant','回看AI讨论','button')}</GuidedStart>}</Panel></details>}</AccountWorkspace>;
  }
  function adminPage() {
    if (s.role === "student") return <Empty title="当前演示角色没有管理职责"><p>原型只模拟角色分离，不代表真实鉴权。请在演示设置选择对应职责，再打开工作区。管理员不默认获得私人简历访问权。</p><B onClick={() => open("fixture")}>选择演示职责</B>{link("/app", "\u8FD4\u56DE\u672C\u4EBA\u5DE5\u4F5C\u533A")}</Empty>;
    const allowed = path === "/admin/quality" ? "quality" : path === "/admin/data" ? "data" : "content";
    if (s.role !== allowed) return <Empty title="职责不匹配，拒绝访问"><p>当前角色不能处理该管理对象。</p><B onClick={() => open("fixture")}>切换演示职责</B></Empty>;
    if (allowed === "quality") return <><h1>运营质量与反馈</h1>{tabs(["\u5F85\u5904\u7406\u53CD\u9988", "\u8D28\u91CF\u4E0E\u670D\u52A1", "\u6743\u9650\u5BA1\u8BA1"])}{activeTab("\u5F85\u5904\u7406\u53CD\u9988", "\u5F85\u5904\u7406\u53CD\u9988") && <Panel title="具体结论 / 版本反馈">{s.feedback.length ? s.feedback.map((f) => <article className="record" key={f.id}><h3>{f.id} · {f.status}</h3><p>对象：{f.object}；问题：{f.text}</p><B onClick={() => open("processFeedback", { feedbackId: f.id, status: "\u5904\u7406\u4E2D", reply: f.reply || "" })}>处理并记录本人可见回执</B></article>) : <Empty title="暂无待处理工单"><p>从个人评估或 AI 页提交反馈；管理页只处理所提交片段，不读取私人材料全文。</p>{link("/assessment?tab=\u56DB\u7EF4\u4E0E\u5DEE\u8DDD", "\u56DE\u672C\u4EBA\u9875\u9762\u63D0\u4EA4\u6D4B\u8BD5\u53CD\u9988")}</Empty>}</Panel>}{tab === "\u8D28\u91CF\u4E0E\u670D\u52A1" && <Panel title="服务与研究状态"><p>模型：未连接；解析：模拟；检查：文本 / 自检；数据源：未发布；真实用户测试：未执行。研究指标不以合成演示当测量结果。</p><B onClick={() => tell("\u5DF2\u6A21\u62DF\u751F\u6210\u8131\u654F\u8D28\u91CF\u8BB0\u5F55\uFF0C\u65E0\u79C1\u4EBA\u6750\u6599\u6B63\u6587\u3002")}>运行模拟质量检查</B><B onClick={() => open("feedback", { object: "\u8D28\u91CF\u8BB0\u5F55 / \u793A\u4F8B v1", text: "" })}>登记质量问题</B></Panel>}{tab === "\u6743\u9650\u5BA1\u8BA1" && <Panel title="用途与权限日志"><B onClick={() => {
      update((x) => ({ ...x, audit: [...x.audit, { id: uid("audit"), action: "\u62D2\u7EDD\u8BBF\u95EE\u5176\u4ED6 owner \u6750\u6599", date: today() }] }));
      tell("\u6A21\u62DF\u8FD4\u56DE 403\uFF1A\u4E0D\u8BFB\u53D6\u5176\u4ED6 owner \u5BF9\u8C61\u3002\u771F\u5B9E\u63A5\u53E3\u9274\u6743\u5F85\u5B9E\u73B0\u3002");
    }}>模拟越权访问拒绝</B>{s.audit.map((a) => <p key={a.id}>{a.date} · {a.action}</p>)}<p>日志只保存动作与对象标识，不保存简历全文。</p></Panel>}</>;
    if (allowed === "data") return <><h1>来源与岗位审核</h1>{tabs(["\u6765\u6E90\u7528\u9014", "\u8BED\u4E49\u4E0E\u6761\u4EF6", "\u53D1\u5E03\u4E0E\u64A4\u56DE"])}<Panel title={`\u5408\u6210\u6765\u6E90\u6279\u6B21 \xB7 v${s.adminSource.version}`}><Notice>管理操作仅修改原型状态，不更改项目真实数据集或真人审核记录。</Notice>{activeTab("\u6765\u6E90\u7528\u9014", "\u6765\u6E90\u7528\u9014") && <><p>来源：原创合成研究卡；企业同名不自动合并；读取日期不等于仍在招聘。公开展示、内部分析、周期获取等用途独立批准。</p><Field label="来源 / 用途审阅理由"><textarea value={s.adminSource.reason} onChange={(e) => update({ adminSource: { ...s.adminSource, reason: e.target.value } })} /></Field><label className="check"><input type="checkbox" checked={s.adminSource.purpose} onChange={(e) => update({ adminSource: { ...s.adminSource, purpose: e.target.checked } })} />模拟批准：仅原型合成内容展示用途</label><p>公开招聘 / 训练 / 周期获取：未批准，保持关闭。</p></>}{tab === "\u8BED\u4E49\u4E0E\u6761\u4EF6" && <><blockquote>构造原句：“熟悉 Python 或 Java；相关经验优先；应届可接受。”</blockquote><p>技术为 OR 备选；经验为优先；应届为例外。不能变成两种语言和经验全必需。</p><Field label="语义归类"><select value={s.adminSource.classification || "\u4FE1\u606F\u4E0D\u8DB3"} onChange={(e) => update({ adminSource: { ...s.adminSource, classification: e.target.value } })}>{["\u4FE1\u606F\u4E0D\u8DB3", "\u4FDD\u7559\u539F\u804C\u4E1A", "\u91CD\u5F52\u7C7B", "\u8303\u56F4\u5916", "\u591A\u89D2\u8272\u5F85\u62C6\u5206"].map((x) => <option key={x}>{x}</option>)}</select></Field><label className="check"><input type="checkbox" checked={s.adminSource.semantic} onChange={(e) => update({ adminSource: { ...s.adminSource, semantic: e.target.checked } })} />已审阅构造原句的职责 / 必要 / 优先 / OR / 例外范围（模拟）</label><p>薪酬：未提供，单位/周期未知，面议不置零，不发布聚合。</p></>}{tab === "\u53D1\u5E03\u4E0E\u64A4\u56DE" && <><p>状态：{s.adminSource.status}。依赖：职业 / 分析 / 搜索 / 报告。</p><B primary onClick={() => {
      if (!s.adminSource.purpose || !s.adminSource.semantic || !s.adminSource.reason.trim()) {
        tell("\u53D1\u5E03\u88AB\u963B\u6B62\uFF1A\u7F3A\u6765\u6E90\u7528\u9014\u3001\u8BED\u4E49\u5BA1\u9605\u6216\u5BA1\u9605\u7406\u7531\u3002");
        return;
      }
      update({ adminSource: recordAdminAction({ ...s.adminSource, status: "\u6A21\u62DF\u5DF2\u53D1\u5E03", version: s.adminSource.version + 1 }, "模拟发布", s.adminSource.reason) });
      tell("\u5408\u6210\u6765\u6E90\u5DF2\u5728\u539F\u578B\u5185\u53D1\u5E03\uFF0C\u771F\u5B9E\u6570\u636E\u672A\u5BA1\u6838\u53D1\u5E03\u3002");
    }}>预检并模拟发布</B><B onClick={() => confirmAction("\u64A4\u56DE\u6765\u6E90\u7248\u672C\uFF1F", "\u4E0B\u6E38\u65B0\u5206\u6790 / \u68C0\u7D22 / \u62A5\u544A\u505C\u7528\u8BE5\u4F9D\u636E\uFF1B\u65E7\u6210\u679C\u4FDD\u7559\uFF0C\u8F93\u51FA\u9700\u66F4\u65B0\u3002", () => {
      update((x) => ({ ...invalidate(x), adminSource: recordAdminAction({ ...x.adminSource, status: "\u5DF2\u64A4\u56DE", version: x.adminSource.version + 1 }, "模拟撤回", "下游新分析/检索/报告停用该依据；旧成果保留") }));
      tell("\u6A21\u62DF\u64A4\u56DE\u5DF2\u8BB0\u5F55\uFF0C\u4E0B\u6E38\u4F9D\u636E\u663E\u793A\u5931\u6548\u3002");
    })}>撤回并查看下游影响</B><B onClick={() => {
      update({ adminSource: recordAdminAction({ ...s.adminSource, status: "\u9694\u79BB", version: s.adminSource.version + 1 }, "隔离来源", s.adminSource.reason) });
      tell("\u5DF2\u9694\u79BB\uFF0C\u539F\u578B\u53D1\u5E03\u5165\u53E3\u5173\u95ED\u3002");
    }}>隔离</B></>}<p className="muted">当前状态：{s.adminSource.status}；用途审阅与语义审阅分别记录，均不是已完成真人审核。</p><AdminHistory record={s.adminSource}/></Panel></>;
    return <><h1>职业与学习内容</h1>{tabs(["\u804C\u4E1A\u6280\u80FD", "\u5173\u7CFB\u5148\u4FEE", "\u5B66\u4E60\u9879\u76EE", "\u53D1\u5E03\u5386\u53F2"])}<Panel title={`\u539F\u521B\u4EFB\u52A1\u4E0E\u5185\u5BB9 \xB7 v${s.adminContent.version}`}><p>当前状态：{s.adminContent.status}；用途：原型演示；实际负责人：待团队指派，不伪造审核人。</p>{activeTab("\u804C\u4E1A\u6280\u80FD", "\u804C\u4E1A\u6280\u80FD") && <><p>三层：基础职业 → 细分任务 → 责任范围。技能别名按稳定 ID 归并；没有原文的技能不提取，姓名、性别和联系方式不作匹配。</p><AdminReviewDraft s={s} update={update}/></>}{tab === "\u5173\u7CFB\u5148\u4FEE" && <><p>学习建议与必要交付分开；SQL OR 表格工具；问题清单 AND 限制说明。已读不自动满足依赖。</p><label className="check"><input type="checkbox" checked={s.adminContent.dependencies} onChange={(e) => update({ adminContent: { ...s.adminContent, dependencies: e.target.checked } })} />依赖端点、满足方法、替代组已检查（模拟）</label><label className="check"><input type="checkbox" checked={s.adminContent.cycle} onChange={(e) => update({ adminContent: { ...s.adminContent, cycle: e.target.checked } })} />模拟依赖循环 / 失效来源（应阻止发布）</label></>}{tab === "\u5B66\u4E60\u9879\u76EE" && <><p>数据质量最小 / 标准范围、业务章节、产物、贡献与自检标准。</p><label className="check"><input type="checkbox" checked={s.adminContent.standard} onChange={(e) => update({ adminContent: { ...s.adminContent, standard: e.target.checked } })} />任务标准 / 资源 / 检查方式齐备（模拟）</label><label className="check"><input type="checkbox" checked={s.adminContent.license} onChange={(e) => update({ adminContent: { ...s.adminContent, license: e.target.checked } })} />原创内容用途许可已登记（模拟）</label></>}{tab === "\u53D1\u5E03\u5386\u53F2" && <><p>发布 / 撤回影响：U06 路线、U08 目录、U09 任务、U10 引用。旧成果不覆盖。</p><B primary onClick={() => {
      const c = s.adminContent;
      if (!c.standard || !c.license || !c.dependencies || c.cycle || s.adminSource.status === "\u5DF2\u64A4\u56DE") {
        tell("\u53D1\u5E03\u88AB\u963B\u6B62\uFF1A\u6807\u51C6\u3001\u8BB8\u53EF\u3001\u4F9D\u8D56\u7F3A\u5931\u6216\u5B58\u5728\u5FAA\u73AF / \u5931\u6548\u6765\u6E90\u3002\u8BF7\u5230\u5BF9\u5E94\u6807\u7B7E\u4FEE\u8BA2\u3002");
        return;
      }
      update({ adminContent: recordAdminAction({ ...c, status: "\u6A21\u62DF\u5DF2\u53D1\u5E03", version: c.version + 1 }, "模拟发布", "已预检标准、许可及依赖；仅本机演示") });
      tell("\u5185\u5BB9\u7248\u672C\u5DF2\u5728\u539F\u578B\u5185\u6A21\u62DF\u53D1\u5E03\uFF0C\u672A\u5BA3\u79F0\u771F\u4EBA\u6279\u51C6\u3002");
    }}>检查依赖并模拟发布</B><B onClick={() => confirmAction("\u64A4\u56DE\u5B66\u4E60\u5185\u5BB9\uFF1F", "\u65B0\u4EFB\u52A1\u505C\u6B62\u91C7\u7528\u8BE5\u7248\u672C\uFF1B\u5DF2\u4FDD\u5B58\u5C1D\u8BD5\u4FDD\u7559\uFF0C\u5E76\u63D0\u793A\u7248\u672C\u53D8\u5316\u3002", () => {
      update((x) => ({ ...invalidate(x), adminContent: recordAdminAction({ ...x.adminContent, status: "\u5DF2\u64A4\u56DE", version: x.adminContent.version + 1 }, "模拟撤回", "新任务停用该版本；已保存尝试保留") }));
      tell("\u6A21\u62DF\u64A4\u56DE\u5DF2\u4FDD\u5B58\u3002");
    })}>撤回内容版本</B></>}<AdminHistory record={s.adminContent}/></Panel></>;
  }
  function reportPage() {
    return <><ServerReportExport sync={workspace} download={download}/><ReportWorkspace s={s} tab={tab} id={id} link={link} open={open} update={update} go={go} tell={tell} createReport={createReport} reportSnapshot={reportSnapshot} defaultBody={defaultBody} tabs={tabs} /></>;
  }
  function download(name, text, type = "text/plain;charset=utf-8") {
    const a = document.createElement("a"), u = URL.createObjectURL(new Blob([text], { type }));
    a.href = u;
    a.download = name;
    a.click();
    setTimeout(() => URL.revokeObjectURL(u), 1e3);
    tell("\u5DF2\u5BFC\u51FA\u672C\u5730\u539F\u578B\u6587\u4EF6\uFF1B\u5185\u5BB9\u5747\u4FDD\u7559\u793A\u4F8B\u4E0E\u5C40\u9650\u6807\u8BC6\u3002");
  }
  function dialogContent() {
    if (!modal) return null;
    const f = form, set = (key, val) => {setForm((x) => ({ ...x, [key]: val }));setError("");if(modal.type==='auth')setAuthFeedback(null);};
    const input = (label, key, type = "text") => <Field label={label}><input name={key} type={type} autoComplete={type === "email" ? "email" : "off"} value={f[key] ?? ""} onChange={(e) => set(key, e.target.value)} /></Field>;
    const area = (label, key) => <Field label={label}><textarea name={key} value={f[key] ?? ""} onChange={(e) => set(key, e.target.value)} /></Field>;
    const select = (label, key, options) => <Field label={label}><select value={f[key] ?? options[0]} onChange={(e) => set(key, e.target.value)}>{options.map((o) => <option key={typeof o === "string" ? o : o[0]} value={typeof o === "string" ? o : o[0]}>{typeof o === "string" ? o : o[1]}</option>)}</select></Field>;
    const fail = (msg) => setError(msg);
    let title = "", body = null, drawer = false;
    switch (modal.type) {
      case "workspaceSwitch":
        title = "\u5207\u6362\u5DE5\u4F5C\u533A";
        body = <><p>学生规划与管理审核分开。原型角色切换仅用于演示，不代表真实权限。</p><div className="workspace-switch"><B primary onClick={() => {
          update({ role: "student" });
          close();
          go("/app");
        }}>学生本人 · 我的职业规划</B>{[["quality", "/admin/quality", "\u8FD0\u8425\u8D28\u91CF\u4E0E\u53CD\u9988"], ["data", "/admin/data", "\u6765\u6E90\u4E0E\u5C97\u4F4D\u5BA1\u6838"], ["content", "/admin/content", "\u804C\u4E1A\u4E0E\u5B66\u4E60\u5185\u5BB9"]].map(([role, to, name]) => <B key={role} onClick={() => {
          update({ role });
          close();
          go(to);
        }}>{name} →</B>)}</div></>;
        break;
      case "relation":
        title = "\u5B66\u4E60\u6865\u63A5\uFF1A\u5171\u540C\u57FA\u7840\u4E0E\u5C40\u9650";
        drawer = true;
        body = <><h3>{cname(f.from)} 与 {cname(f.to)}</h3><p>原创合成探索示意：可以比较两类任务中的问题拆解、输入记录和结果表达，再查看各自需要补充的专业基础。</p><p>这是学习关系说明，不是市场迁移记录、升职路径或成功概率。没有依据的具体依赖保持未知。</p>{link(`/careers?career=${f.to}`, "\u4E86\u89E3\u53E6\u4E00\u65B9\u5411\u7684\u65E5\u5E38\u4EFB\u52A1 \u2192")}{link("/careers?tab=\u6BD4\u8F83", "\u56DE\u5230\u804C\u4E1A\u6BD4\u8F83 \u2192")}</>;
        break;
      case "notifications":
        title = "\u7AD9\u5185\u63D0\u9192";
        body = <><p>提醒偏好：{s.notifications ? "\u5DF2\u5F00\u542F\u7AD9\u5185\u63D0\u9192" : "\u5DF2\u5173\u95ED"}。不发送外部消息。</p>{s.claims.some((c) => c.status === "\u5F85\u786E\u8BA4") && <p>{link("/assessment?tab=\u539F\u6587\u786E\u8BA4", "\u6709\u6750\u6599\u5F85\u672C\u4EBA\u786E\u8BA4 \u2192")}</p>}{s.analysisStale && <p>{link("/assessment?tab=\u56DB\u7EF4\u4E0E\u5DEE\u8DDD", "\u6709\u4F9D\u636E\u53D8\u5316\u5F85\u68C0\u67E5 \u2192")}</p>}{s.tasks.filter((t) => t.status === "\u53D7\u963B").map((t) => <p key={t.id}><B onClick={() => {
          close();
          go("/plan?tab=执行&task="+encodeURIComponent(t.id));
        }}>继续处理受阻任务：{t.title}</B></p>)}{reviewReminders(s).map(t=><p key={t.id}>{link("/plan?tab=复盘&task="+encodeURIComponent(t.id),"已完成，待留下一次复盘："+t.title)}</p>)}<p className="caption">仅显示当前本地对象的待办，不模拟真实定时通知。</p>{link("/settings", "\u4FEE\u6539\u63D0\u9192\u504F\u597D \u2192")}</>;
        break;
      case "taskSearch":
        title = "\u672C\u4EBA\u4EFB\u52A1\u641C\u7D22";
        body = <><p>仅在本人任务标题中查找“{f.query}”；不查询私人全文或公开数据。</p>{s.tasks.filter((t) => t.title.includes(f.query)).map((t) => <p key={t.id}><B onClick={() => {
          close();
          startTask(t);
        }}>{t.title} · {t.status}</B></p>)}{!s.tasks.some((t) => t.title.includes(f.query)) && <p>没有找到任务，可换关键词或回计划查看。</p>}{link("/plan", "\u67E5\u770B\u5168\u90E8\u8BA1\u5212 \u2192")}</>;
        break;
      case "confirm":
        title = f.title;
        body = <><Notice>{f.impact}</Notice><div className="actions"><B primary onClick={() => {
          f.action();
          close();
        }}>确认操作</B><B onClick={close}>取消，保持原状态</B></div></>;
        break;
      case "auth":
        title = '登录 · Avemly';
        body = <LoginPage mode={authMode} live={SERVER_AUTH} busy={authBusy||!authReady} fieldErrors={authFields} onModeChange={value=>{setAuthMode(value);setError('');setAuthFeedback(null);setAuthFields({});setForm(previous=>({...previous,agree:false}));}} form={f} setField={set} error={error} authFeedback={authFeedback} languageSwitch={<LanguageSwitch/>}
          onSubmit={SERVER_AUTH?submitServerAuth:e=>{
            e.preventDefault();
            setAuthFeedback(null);setError('');
            if(authMode==='找回'){setError('');tell('模拟找回请求已受理，没有发送邮件。');return;}
            if(authMode==='注册'&&!f.agree){fail('请阅读并主动确认原型使用说明。');return;}
            const target=f.intent||'/app';
            sessionStorage.setItem('intent',target);
            const guideSession=beginOperationGuideSession(localStorage);
            window.dispatchEvent(new CustomEvent('operation-guide-session',{detail:guideSession}));
            update({logged:true});close();move(s.onboard?target:'/onboarding');tell('已进入模拟本人会话。');
          }}
          onCancel={()=>{authController.current?.abort();authController.current=null;setAuthBusy(false);setModal(null);setError('');setAuthFeedback(null);setAuthFields({});if(path!=='/')move('/');}}
          onFailure={()=>reportAuthFailure({code:'SERVICE_UNAVAILABLE',message:'模拟会话服务失败：邮箱保留，可重新提交或取消。'})}
          onPasswordFailure={()=>reportAuthFailure({code:'INVALID_CREDENTIALS',message:language==='en'?'Incorrect demo password. Try again; your input is still here.':'模拟密码不正确：请检查后重试，输入已保留。'})}
          onAuthFeedbackClear={clearAuthFeedback}
          onRestore={()=>{setAuthFeedback(null);sessionStorage.setItem('intent',f.intent||'/app');move('/auth');}}/>;
        break;
      case "legal":
        title = "\u6570\u636E\u3001\u4F7F\u7528\u4E0E\u9690\u79C1\u8BF4\u660E";
        body = SERVER_AUTH?<><p>真实账户认证已接入，邮箱用作登录名且尚未验证归属。密码只保存加盐哈希，会话可通过退出撤销。</p><p>本人资料、计划、任务和报告等记录已接入账户数据库，保存结果以页面状态为准。课程资料正在收集中；AI、邮箱验证和邮件找回尚未接入。账户注销会删除在线数据，权限保护的备份最长保留 14 天。</p><B onClick={close}>已了解，返回</B></>:<><p>本原型是 PRD 3.5 + 2026-10-16 Teal 增补的本地演示。不会读取项目真实招聘库，职业摘要和任务均为原创合成示例，不代表用途已批准、真实在招或实际能力分析。</p><p>交互记录保存在当前浏览器 localStorage；不要输入真实敏感材料。真实账户鉴权、处理同意、索引撤回、备份策略和数据源审核须接真实服务另行验收。</p><p>无联系人 CRM、自动投递、外部消息、心理诊断、ATS 通过率或录用概率。</p><B onClick={close}>已了解，返回</B></>;
        break;
      case "example": {
        title = "\u5B8C\u6574\u5408\u6210\u6848\u4F8B \xB7 \u5404\u9636\u6BB5\u53EF\u5207\u6362";
        const stages = ["\u8BA4\u8BC6\u8981\u6C42", "\u786E\u8BA4\u6750\u6599", "\u5DEE\u8DDD\u4E0E\u53D6\u820D", "\u884C\u52A8\u4E0E\u6210\u679C", "\u62A5\u544A\u66F4\u65B0"];
        const st = Number(f.step || 0);
        body = <><nav className="tabs">{stages.map((x, i) => <B key={x} aria-pressed={st === i} onClick={() => set("step", i)}>{x}</B>)}</nav><Black label={stages[st]} /><h3>{stages[st]}</h3><p>{["\u6570\u636E\u5206\u6790\u4E0E AI \u90FD\u662F\u63A2\u7D22\u65B9\u5411\u3002\u5148\u4E86\u89E3\u4EFB\u52A1\u548C\u73AF\u5883\uFF0C\u6CA1\u6709\u4E2A\u4EBA\u6392\u540D\u3002", "SQL \u8BFE\u7A0B\u62A5\u544A\u9700\u786E\u8BA4\u672C\u4EBA\u8D21\u732E\uFF0C\u672A\u5B9E\u9645\u6838\u9A8C\u3002", "SQL \u72EC\u7ACB\u4EA7\u51FA\u672A\u77E5\uFF0C\u5148\u9A8C\u8BC1\u6570\u636E\u8D28\u91CF\u4EFB\u52A1\uFF0C\u4E0D\u5F3A\u884C\u4E0B\u7ED3\u8BBA\u3002", "\u6BCF\u5468 3 \u5C0F\u65F6\uFF0C\u9009\u62E9 2 \u5C0F\u65F6\u6700\u5C0F\u8303\u56F4\u3002\u63D0\u4EA4\u3001\u53CD\u9988\u3001\u672C\u4EBA\u786E\u8BA4\u5206\u5F00\u3002", "\u4FDD\u7559\u65E7\u62A5\u544A\u4EBA\u5DE5\u6BB5\u843D\uFF1B\u65B0\u4F9D\u636E\u53E6\u5EFA\u8349\u7A3F\uFF1B\u79C1\u4EBA\u53CD\u601D\u4E0D\u9ED8\u8BA4\u5BFC\u51FA\u3002"][st]}</p><B primary onClick={() => open("auth", { intent: "/careers" })}>开始自己的模拟流程</B></>;
        break;
      }
      case "careerPreview": {
        const c = careers.find((x) => x.id === f.career);
        title = `${c?.name} \xB7 \u516C\u5F00\u5408\u6210\u6458\u8981`;
        body = <><p>{c?.task}</p><p>示例产物：{c?.output}。非招聘广告，完整探索需模拟认证。</p><B onClick={() => {
          close();
          go(`/careers?career=${f.career}`);
        }}>进入完整职业探索</B></>;
        break;
      }
      case "skill":
        if (f.mapNode) {
          title = f.mapNode.title + ' · 节点详情';
          drawer = true;
          body = <MapSkillDetails update={update} node={f.mapNode} atlasDraft={f.atlasDraft} s={s} career={f.career} url={f.mapUrl || url} link={link} open={open} precheck={precheck} />;
          break;
        }
        title = `${f.skill} \xB7 \u8282\u70B9\u8BE6\u60C5`;
        drawer = true;
        body = <><Pill>原创合成节点 v1 · 同一技能 ID 复用</Pill><p>用途：支持数据处理、问题记录和解释；范围随具体任务而定，个人状态未知。</p><p>建议学习：理解表格，未知也能阅读。必要交付：问题清单 AND 限制说明。技术路径：SQL OR 表格工具，任选其一，不合并成全部必需。</p><p>资源：免费中文原创离线材料；成果：问题清单、方法与限制；检查：自检或示例文本反馈，没有真实运行器。</p><div className="actions"><B primary onClick={() => precheck({ title: `${f.skill} \u77ED\u9A8C\u8BC1`, template: "quality", purpose: `\u6F84\u6E05 ${f.skill} \u7684\u5DF2\u6709\u6750\u6599\u4E0E\u672A\u77E5\u8303\u56F4`, product: learning[0].product, kind: "\u539F\u521B\u6A21\u62DF\u5B9E\u8DF5" })}>生成学习 / 验证预检草稿</B><B onClick={() => {
          close();
          go("/assessment?tab=\u6210\u679C\u6863\u6848");
        }}>已有成果，先补材料</B><B onClick={() => {
          close();
          go("/learning");
        }}>先阅读资源</B></div></>;
        break;
      case "import":
        if(SERVER_AUTH){title='导入 PDF / 粘贴材料';body=<ResumeImport s={s} update={update} link={link} onClose={close} onSaved={(record,added)=>{close();tell(added?'原稿与候选已保存，请逐项确认本人贡献。':'简历原稿已保存。');go(added?'/assessment?tab=原文确认':'/assessment?tab=当前简历');}}/>;break;}
        title = "\u5BFC\u5165\u6750\u6599 \xB7 \u6A21\u62DF\u89E3\u6790\u4F5C\u4E1A";
        body = <><Notice>不解析真实文件。文件仅检查扩展名与大小，随后生成明确标注的合成候选；可随时手填。</Notice><label className="check"><input type="checkbox" checked={f.consent || false} onChange={(e) => set("consent", e.target.checked)} />允许演示读取文件名与类型（不上传，不发送外部模型）</label><Field label="选择文本型 PDF / DOCX（演示限额 10 MB）"><input type="file" accept=".pdf,.docx" onChange={(e) => {
          const file = e.target.files[0];
          if (!file) return;
          if (!/\.(pdf|docx)$/i.test(file.name) || file.size > 10 * 1024 * 1024) {
            setImportState("unsupported");
            fail("\u683C\u5F0F\u4E0D\u652F\u6301\u6216\u8D85\u8FC7 10 MB\uFF0C\u8BF7\u9009\u62E9 PDF / DOCX\uFF0C\u6216\u4F7F\u7528\u624B\u586B\u3002");
            return;
          }
          set("file", file.name);
          setImportState("ready");
          setError("");
        }} /></Field><p>状态：{{ idle: "\u7B49\u5F85\u9009\u62E9", ready: "\u6587\u4EF6\u5F85\u89E3\u6790", running: "\u6B63\u5728\u6A21\u62DF\u5904\u7406\u2026", failed: "\u89E3\u6790\u5931\u8D25\uFF08\u6A21\u62DF\uFF09", cancelled: "\u4F5C\u4E1A\u5DF2\u53D6\u6D88", done: "\u5019\u9009\u5DF2\u751F\u6210", unsupported: "\u683C\u5F0F / \u5927\u5C0F\u4E0D\u652F\u6301" }[importState]}</p><div className="actions"><B primary onClick={() => {
          if (!f.consent || !f.file) {
            fail("\u8BF7\u9009\u62E9\u5141\u8BB8\u683C\u5F0F\u7684\u6587\u4EF6\u5E76\u786E\u8BA4\u6F14\u793A\u8303\u56F4\u3002");
            return;
          }
          clearTimeout(timer.current);
          setImportState("running");
          timer.current = setTimeout(() => {
            setImportState("done");
            setForm((x) => ({ ...x, result: true }));
          }, 600);
        }}>开始 / 重试模拟解析</B><B onClick={() => {
          clearTimeout(timer.current);
          setImportState("failed");
          fail("\u6A21\u62DF\u89E3\u6790\u670D\u52A1\u5931\u8D25\uFF0C\u53EF\u91CD\u8BD5\u6216\u6539\u624B\u586B\u3002");
        }}>模拟解析失败</B><B onClick={() => {
          clearTimeout(timer.current);
          setImportState("cancelled");
          setForm((x) => ({ ...x, result: false }));
          tell("\u89E3\u6790\u5DF2\u53D6\u6D88\uFF0C\u4E0D\u4F1A\u665A\u5230\u56DE\u5199\u3002");
        }}>取消作业</B></div>{f.result && importState === "done" && <><p>合成候选原文：“在课程练习中整理 Python 表格，贡献待本人说明。”</p><B primary onClick={() => {
          if (s.claims.some((c) => c.importKey === f.file)) {
            tell("\u540C\u4E00\u5BFC\u5165\u5DF2\u6709\u5019\u9009\uFF1B\u5DF2\u62D2\u7EDD\u9879\u4E0D\u4F1A\u81EA\u52A8\u590D\u6D3B\uFF0C\u8BF7\u5728\u961F\u5217\u660E\u786E\u91CD\u5BA1\u3002");
          } else addCandidate({ title: "\u5BFC\u5165\u5019\u9009\uFF08\u5408\u6210\uFF0C\u4E0D\u6765\u81EA\u6587\u4EF6\u5185\u5BB9\uFF09", text: "\u5728\u8BFE\u7A0B\u7EC3\u4E60\u4E2D\u6574\u7406 Python \u8868\u683C\uFF0C\u8D21\u732E\u5F85\u672C\u4EBA\u8BF4\u660E\u3002", contribution: "", skill: "Python", type: "\u8BFE\u7A0B\u9879\u76EE", origin: "\u6A21\u62DF\u89E3\u6790", importKey: f.file });
          close();
          go("/assessment?tab=\u539F\u6587\u786E\u8BA4");
        }}>保存合成候选并逐项确认</B></>}<p>扫描型 PDF / OCR 不支持，不能生成空白成功。</p><B onClick={() => {
          close();
          go("/assessment");
        }}>改用手填</B></>;
        break;
      case "claim": {
        title = "核对经历原文并确认";
        const c = s.claims.find((c2) => c2.id === f.claimId);
        body = <><blockquote>{c?.text}</blockquote>{c?.supportScope && <p>技能：{c.skill}；支持范围：{c.supportScope}；产物位置：{c.artifactLocation}；辅助：{c.aid || "未知"}</p>}{area("\u4FEE\u6B63\u4E3A\u672C\u4EBA\u786E\u8BA4\u7684\u9648\u8FF0", "text")}{area("\u672C\u4EBA\u8D21\u732E\uFF08\u65E0\u5219\u7559\u7A7A\uFF0C\u4E0D\u7F16\u9020\uFF09", "contribution")}{select("\u91CD\u590D / \u77DB\u76FE\u5904\u7F6E", "resolve", ["\u4FEE\u6B63\u4E3A\u672C\u4EBA\u9648\u8FF0", "\u4FDD\u7559\u4E3A\u72EC\u7ACB\u6750\u6599", "\u5173\u8054\u5DF2\u6709\u6750\u6599\uFF0C\u4E0D\u91CD\u590D\u8BA1\u6570", "\u4ECD\u5F85\u5904\u7406"])}<Notice>确认只表示本人确认内容，不表示能力已被实际核验。</Notice><B primary onClick={async () => {
          if (!f.text?.trim()) {
            fail("\u9648\u8FF0\u4E0D\u80FD\u4E3A\u7A7A\u3002");
            return;
          }
          if (f.resolve === "\u4ECD\u5F85\u5904\u7406") {
            close();
            tell("\u5DF2\u7559\u5F85\u5904\u7406\uFF0C\u672A\u7528\u4E8E\u5206\u6790\u3002");
            return;
          }
          if(SERVER_AUTH){try{await workspace.command('claim.confirm',{claimId:f.claimId,claimVersion:c.version,text:f.text,contribution:f.contribution||'',resolution:f.resolve==='关联已有材料，不重复计数'?'link_duplicate':'confirm',confirmation:'CONFIRM_SELF_REPORT'});close();tell(authMessage('CLAIM_CONFIRMED',language));}catch(error){fail(authMessage(error.code,language));}return;}
          update((x) => ({ ...invalidate(x), profileVersion: x.profileVersion + 1, claims: x.claims.map((y) => y.id === f.claimId ? { ...y, text: f.text, contribution: f.contribution, status: f.resolve === "\u5173\u8054\u5DF2\u6709\u6750\u6599\uFF0C\u4E0D\u91CD\u590D\u8BA1\u6570" ? "\u5DF2\u5173\u8054\u91CD\u590D" : "\u5DF2\u786E\u8BA4", version: y.version + 1 } : y), tasks: x.tasks.map((t) => t.id === c?.taskId ? { ...t, claimStatus: `相关候选已本人确认；另有 ${x.claims.filter(z=>z.taskId===t.id&&z.id!==f.claimId&&!["已确认","已关联重复","已拒绝","已撤回"].includes(z.status)).length} 项待处理；未实际核验` } : t), lastReceipt: `\u786E\u8BA4\u56DE\u6267\uFF1A${f.claimId} \u5DF2\u6309\u9879\u5904\u7406\uFF1B\u5176\u4ED6\u672A\u786E\u8BA4\u9879\u4FDD\u7559\uFF0C\u5206\u6790\u9700\u663E\u5F0F\u66F4\u65B0\u3002` }));
          close();
          tell("\u672C\u4EBA\u786E\u8BA4\u5DF2\u4FDD\u5B58\uFF1B\u6CA1\u6709\u81EA\u52A8\u8BA4\u5B9A\u80FD\u529B\u638C\u63E1\u3002");
        }}>确认这一项并查看回执</B></>;
        break;
      }
      case "goal":
        title = "预览职业目标调整";
        body = <>{select("\u552F\u4E00\u4E3B\u804C\u4E1A\u76EE\u6807", "goal", careers.map((c) => [c.id, c.name]))}{select("\u5907\u7528\u65B9\u5411", "backup", [["", "\u6682\u4E0D\u9009\u62E9"], ...careers.map((c) => [c.id, c.name])])}{area("\u7406\u7531\u4E0E\u5F85\u9A8C\u8BC1\u53D6\u820D", "reason")}<Notice>当前主目标：{cname(s.goal)} → {cname(f.goal)}。旧成果不删除；跨职业准备不自动转为主计划，任务预算重新核对。</Notice><B primary onClick={() => {
          if (f.goal === f.backup) {
            fail("\u4E3B\u76EE\u6807\u4E0E\u5907\u7528\u65B9\u5411\u5E94\u4E0D\u540C\u3002");
            return;
          }
          update((x) => ({ ...x, goal: f.goal, backup: f.backup || null, decision: { ...x.decision, reason: f.reason || "", version: x.version + 1 }, planVersion: x.planVersion + 1, version: x.version + 1, analysisStale: !!x.analysis, proposal: null }));
          close();
          go("/plan");
          tell("\u76EE\u6807\u5DF2\u786E\u8BA4\u4FDD\u5B58\uFF0C\u8BA1\u5212\u672A\u81EA\u52A8\u589E\u6DFB\u4EFB\u52A1\u3002");
        }}>确认目标版本</B></>;
        break;
      case "precheck": {
        title = "\u7EDF\u4E00\u5F00\u59CB\u9884\u68C0";
        const duplicate = f.atlas ? atlasTasks(s.tasks,f).find(t=>!t.completed) : s.tasks.find((t) => t.template === f.template && t.purpose === f.purpose && !["\u53D6\u6D88", "\u8DF3\u8FC7"].includes(t.status));
        body = <><AtlasPracticeContext task={f} link={link}/><TaskPrecheckFields s={s} data={f} input={input} area={area} select={select} change={patch=>setForm(x=>({...x,...patch}))}/><details className="intake-disclosure intake-preflight-notes"><summary>先修与来源说明</summary><p>当前总预算 {s.budget ?? "\u672A\u5B9A"} 小时；已安排 {usedHours(s)} 小时；本行动 {f.hours} 小时。来源：{f.source}；主目标 {cname(s.goal)}。</p><p>{f.template==='quality'?'先修：建议未知可继续；SQL OR 表格工具任选；问题清单、处理理由、描述统计 AND 限制说明共同交付。':learning.find(l=>l.id===f.template)?.prereq||'先看实践步骤与成果标准；缺少材料保持未知，可选择手工记录。'} S1 手工记录，S2 可使用已发布教学内容提交尝试；课程版本随任务保存。</p></details>{duplicate && <Notice>发现同目的 / 模板已有任务 {duplicate.id}，建议续用；不重复计算预算。<B onClick={() => {
          close();
          startTask(duplicate);
        }}>续用已有任务</B><label className="check"><input type="checkbox" checked={f.another || false} onChange={(e) => set("another", e.target.checked)} />明确另开一个任务（仍计预算）</label></Notice>}<div className="actions"><B primary onClick={async () => {
          if (!f.title?.trim()) {
            fail("\u8BF7\u586B\u5199\u884C\u52A8\u6807\u9898\u3002");
            return;
          }
          if (duplicate && !f.another) {
            fail("\u8BF7\u7EED\u7528\u5DF2\u6709\u4EFB\u52A1\uFF0C\u6216\u660E\u786E\u52FE\u9009\u53E6\u5F00\u4EFB\u52A1\u3002");
            return;
          }
          const err = s.adminContent.status === "\u5DF2\u64A4\u56DE" && f.template !== "external" ? "\u4EFB\u52A1\u5185\u5BB9\u5DF2\u64A4\u56DE\uFF0C\u8BF7\u4FDD\u5B58\u8349\u7A3F\u6216\u624B\u7F16\u5916\u90E8\u884C\u52A8\u3002" : checkStart(s, f);
          if (err) {
            fail(err);
            return;
          }
          if(SERVER_AUTH){
            const keys=['title','template','career','purpose','hours','association','kind','source','product','courseVersion','atlas','learningStage','priority','placementReason','jobId','another'];
            const draft=Object.fromEntries(keys.filter(key=>f[key]!==undefined).map(key=>[key,key==='hours'?Number(f[key]):f[key]]));
            try{const receipt=await workspace.command('task.create',{draft,confirmation:'CREATE_TASK'});const created=workspace.current().state.tasks.find(row=>row.id===receipt.refs.taskId);close();go(created.mode==='S2'?'/work/'+created.id:taskRoute(workspace.current().state,created));tell(authMessage('TASK_CREATED',language));}catch(error){fail(authMessage(error.code,language));}return;
          }
          const t = makeTask(s, f);
          update((x) => ({ ...x, tasks: [...x.tasks, t], taskDraft: null, ...(t.atlas?{atlasDrafts:Object.fromEntries(Object.entries(x.atlasDrafts||{}).filter(([key])=>key!==atlasPracticeKey(t.atlas)))}:{}), planVersion: x.planVersion + 1, jobs: x.jobs.map((j) => j.id === f.jobId ? { ...j, taskId: t.id, status: "\u51C6\u5907" } : j) }));
          close();
          if (t.mode === "S2") go(`/work/${t.id}`);
          else {
            go(taskRoute(s,t));
          }
          tell(`\u5DF2\u521B\u5EFA ${t.id}\uFF1B${t.mode} \u6A21\u62DF / \u672C\u4EBA\u8BB0\u5F55\u8DEF\u5F84\u3002`);
        }}>确认预算并创建任务</B><B onClick={() => {
          saveTaskDraft({ ...f });
          close();
          tell("\u9884\u68C0\u8349\u7A3F\u5DF2\u4FDD\u5B58\uFF0C\u5C1A\u672A\u5F00\u59CB\u4EFB\u52A1\u3002");
        }}>仅存草稿</B><B onClick={() => {
          saveTaskDraft({ ...f });
          close();
        }}>取消并返回来源</B><B onClick={() => open("budgetQuick", { budget: s.budget ?? 0, returnDraft: f })}>设置总预算后返回</B></div></>;
        break;
      }
      case "budgetQuick":
        title = "设置每周可投入时间";
        body = <>{input("\u6BCF\u5468\u603B\u9884\u7B97\uFF08\u5C0F\u65F6\uFF09", "budget", "number")}<B primary onClick={() => {
          if (Number(f.budget) <= 0 || Number(f.budget) > 168) {
            fail("\u8BF7\u586B\u5199\u5927\u4E8E 0 \u4E14\u4E0D\u8D85\u8FC7 168 \u7684\u5C0F\u65F6\u6570\u3002");
            return;
          }
          update({ budget: Number(f.budget) });
          open("precheck", f.returnDraft);
        }}>保存预算并回预检</B></>;
        break;
      case "scenario": {
        title = "\u9884\u7B97 / \u76EE\u6807\u53D8\u66F4\u65B9\u6848 \xB7 \u526F\u672C\u9884\u89C8";
        const newBudget = Number(f.budget), overflow = usedHours(s) > newBudget;
        body = <>{input("\u5047\u8BBE\u6BCF\u5468\u603B\u9884\u7B97\uFF08\u5C0F\u65F6\uFF09", "budget", "number")}{select("\u5047\u8BBE\u4E3B\u76EE\u6807", "goal", [["", "\u4E0D\u786E\u5B9A / \u72EC\u7ACB\u63A2\u7D22"], ...careers.map((c) => [c.id, c.name])])}{select("\u8D85\u989D\u5904\u7406\u65B9\u6848", "policy", ["\u5EF6\u540E\u8D85\u989D\u4EFB\u52A1", "\u7F29\u5C0F\u540E\u7EED\u4EFB\u52A1\u8303\u56F4"])}<p>基线 v{f.base}；当前 v{s.planVersion}。预算 {s.budget} → {f.budget}；目标 {cname(s.goal)} → {cname(f.goal)}。</p><p>已完成成果保留。{overflow ? "\u9884\u7B97\u4E0B\u964D\uFF0C\u90E8\u5206\u5F85\u6267\u884C\u4EFB\u52A1\u9700\u5EF6\u671F\u6216\u7F29\u5C0F\u8303\u56F4\uFF1B\u672A\u8986\u76D6\u5DEE\u8DDD\u4ECD\u5217\u4E3A\u672A\u77E5\u3002" : "\u5F53\u524D\u4EFB\u52A1\u6295\u5165\u53EF\u653E\u5165\u65B0\u9884\u7B97\u3002"}</p><PlanChangePreview s={s} draft={f}/><div className="actions"><B onClick={() => {
          update({ scenario: { ...f } });
          close();
          tell("\u65B9\u6848\u526F\u672C\u5DF2\u4FDD\u5B58\uFF0C\u771F\u5B9E\u8BA1\u5212\u4E0E\u753B\u50CF\u672A\u6539\u3002");
        }}>保存临时方案</B><B primary onClick={() => {
          try { update(applyPlanChange(s,f)); } catch (err) { fail(err.message); return; }
          close();
          tell("\u5DF2\u786E\u8BA4\u65B0\u8BA1\u5212\u7248\u672C\uFF1B\u6210\u679C\u4E0E\u58F0\u660E\u672A\u6539\u3002");
        }}>本人确认并应用</B><B onClick={() => {
          setForm({ ...f, base: s.planVersion, stale: false });
          tell("\u5DF2\u6309\u5F53\u524D\u57FA\u7EBF\u91CD\u5EFA\u9884\u89C8\uFF0C\u8BF7\u518D\u6B21\u6838\u5BF9\u3002");
        }}>重新预览当前基线</B><B onClick={close}>取消，回原计划</B></div></>;
        break;
      }
      case "taskEdit":
        title = "编辑任务安排";
        body = <TaskEditor s={s} taskId={f.taskId} restore={f.restore} desiredStatus={f.desiredStatus} update={update} command={SERVER_AUTH?workspace.command:null} close={close} tell={tell} link={link}/>;
        break;
      case "reviewEdit":
        title = "修订本人复盘";
        body = <ReviewEditor s={s} reviewId={f.reviewId} update={update} close={close} tell={tell}/>;
        break;
      case "task": {
        const t = s.tasks.find((t2) => t2.id === f.taskId);
        title = "\u4EFB\u52A1\u8BE6\u60C5 \xB7 \u540C\u4E00 taskId";
        drawer = true;
        if (!t) {
          body = <p>任务已删除，请返回计划。</p>;
          break;
        }
        body = <><h3>{t.title}</h3><p>{t.id} · {t.mode} · {t.status} · {t.association} · {t.hours} 小时</p><p>目的：{t.purpose}；交付物：{t.standard}；补充说明：{t.deliveryNote||"暂无"}；检查方法：本人记录 / 自检，未实际核验；退出条件：可停止不计完成。</p><Field label="状态"><select value={t.status} onChange={(e) => {
          open('taskEdit',{taskId:t.id,desiredStatus:e.target.value,restore:stoppedTask(t)});
        }}>{["\u5F85\u5F00\u59CB", "\u8FDB\u884C\u4E2D", "\u53D7\u963B", "\u5EF6\u671F", "\u5B8C\u6210", "\u8DF3\u8FC7", "\u53D6\u6D88"].filter((v) => t.mode === "S1" || v !== "\u5B8C\u6210" || t.completed).map((v) => <option key={v}>{v}</option>)}</select></Field><Field label="日期（未知可留空）"><input type="date" value={t.due} onChange={(e) => setTask(t.id, { due: e.target.value })} /></Field><Field label="行动结果 / 受阻原因（自动保留）"><textarea value={t.note} onChange={(e) => setTask(t.id, { note: e.target.value })} /></Field><p>当前记录为本人自述；“完成”不等于实际核验或声明确认。</p><div className="actions"><B onClick={()=>open("taskEdit",{taskId:t.id})}>编辑任务安排</B><B onClick={() => {
          if (t.status === "\u5B8C\u6210" && !t.note.trim()) {
            fail("\u8BB0\u5F55\u5B8C\u6210\u524D\u8BF7\u8BF4\u660E\u5B9E\u9645\u884C\u52A8\u548C\u7ED3\u679C\u3002");
            setTask(t.id, { status: "\u8FDB\u884C\u4E2D" });
            return;
          }
          close();
          tell("\u4EFB\u52A1\u8BE6\u60C5\u5DF2\u4FDD\u7559\uFF0C\u5173\u8054\u5C97\u4F4D\u5361\u540C\u6B65\u3002");
        }}>保存并返回</B>{t.mode === "S1" && <B onClick={() => {
          if (!t.note.trim()) {
            fail("\u8BF7\u5148\u8BB0\u5F55\u5B9E\u9645\u7ED3\u679C\u3002");
            return;
          }
          addCandidate({ title: t.title, text: t.note, contribution: t.contribution||"\u5F85\u672C\u4EBA\u8BF4\u660E", skill: atlasTaskSkill(t)||"\u672A\u77E5", taskId: t.id, origin: "\u672C\u4EBA\u5916\u90E8\u884C\u52A8\u8BB0\u5F55", type: t.kind });
          update({ originTask: t.id });
          close();
          go("/assessment?tab=\u539F\u6587\u786E\u8BA4");
        }}>外部成果 → 待确认候选</B>}{t.mode === "S2" && s.stage === "S2" && <B primary onClick={() => {
          close();
          go(`/work/${t.id}`);
        }}>打开 S2 任务工作区</B>}</div>{link(t.source, "\u8FD4\u56DE\u539F\u95EE\u9898 / \u5C97\u4F4D")}</>;
        break;
      }
      case "externalRecord":
        title = "\u8865\u5F55\u5DF2\u53D1\u751F\u7684\u5B9E\u9645\u884C\u52A8";
        body = <><InvestigationFields data={f} change={patch=>setForm(x=>({...x,...patch}))}/>{input("\u884C\u52A8\u6807\u9898", "title")}{area("\u539F\u7591\u95EE / \u76EE\u7684", "purpose")}{area("\u672C\u4EBA\u5B9E\u9645\u884C\u52A8\u548C\u7ED3\u679C", "text")}{area("\u672C\u4EBA\u8D21\u732E", "contribution")}<Notice>补录不补造事前预算、实际平台执行或企业反馈；材料仍待本人确认。</Notice><B primary onClick={async () => {
          if (!f.title?.trim() || !f.text?.trim()) {
            fail("\u8BF7\u586B\u5199\u5B9E\u9645\u6807\u9898\u4E0E\u7ED3\u679C\u3002");
            return;
          }
          if(SERVER_AUTH){const keys=['title','text','purpose','contribution','observationType','occurredOn','investigationMethod','investigationSource'];try{await workspace.command('experience.record',{...Object.fromEntries(keys.filter(key=>f[key]!==undefined).map(key=>[key,f[key]])),confirmation:'RECORD_SELF_REPORT'});close();tell(authMessage('EXPERIENCE_RECORDED',language));}catch(error){fail(authMessage(error.code,language));}return;}
          const t = { ...makeTask(s, { title: f.title, purpose: f.purpose || "\u8865\u5F55\u5DF2\u53D1\u751F\u884C\u52A8", hours: 0, kind: "\u672C\u4EBA\u8BB0\u5F55\u7684\u5916\u90E8\u884C\u52A8" }), status: "\u5B8C\u6210", completed: true, note: f.text, observationType:f.observationType||"待本人说明",occurredOn:f.occurredOn||"",investigationMethod:f.investigationMethod||"",investigationSource:f.investigationSource||"" };
          update((x) => ({ ...addClaim(x, { title: f.title, text: f.text, contribution: f.contribution, skill: "\u672A\u77E5", taskId: t.id, origin: "\u5916\u90E8\u8865\u5F55\u81EA\u8FF0" }), tasks: [...x.tasks, t] }));
          close();
          tell("\u8865\u5F55\u5DF2\u4FDD\u5B58\uFF0C\u6750\u6599\u5019\u9009\u5F85\u786E\u8BA4\uFF1B\u672A\u8865\u9020\u9884\u7B97\u548C\u68C0\u67E5\u3002");
        }}>{SERVER_AUTH?"保存本人行动记录":"保存真实类型自述（原型本地）"}</B></>;
        break;
      case "reading": {
        if(SERVER_AUTH){const course=workspace.catalog?.courses.find(c=>c.id===f.template);title=course?.status==='published'?course.title+' · 内容 v'+course.content_version:'课程目录';body=course?.status==='published'?<CourseReader key={course.id+course.content_version} course={course} chapter={f.chapter} onPosition={recordCoursePosition} onSave={(index,c)=>{recordCoursePosition(index,c);close();tell('阅读位置已保留，账户保存结果以上方状态为准；没有创建或完成任务。');}} precheck={precheck}/>:<><CoursePlaceholder course={course}/>{workspace.catalogError&&<B onClick={workspace.retryCatalog}>重试课程目录</B>}</>;break;}
        title = "\u539F\u521B\u7AE0\u8282\u9605\u8BFB";
        const l = learning.find((x) => x.id === f.template), chapter = Number(f.chapter) || 0;
        body = <><h3>{l.title} · v1</h3><nav className="tabs">{l.chapters.map((x, i) => <B key={x} aria-pressed={chapter === i} onClick={() => {
          set("chapter", i);
          update({ reading: { ...s.reading, [l.id]: { chapter: i, version: 1 } } });
        }}>{x}</B>)}</nav><Black label="章节图像 / 视频" /><h3>{l.chapters[chapter]}</h3><p>原创合成内容：先写问题，保留观察依据，说明处理选择，再记录限制。阅读位置独立保存，不创建任务、不形成能力声明。</p><B onClick={() => {
          update({ reading: { ...s.reading, [l.id]: { chapter, version: 1 } } });
          close();
          tell("\u5DF2\u4FDD\u5B58\u7EED\u8BFB\u4F4D\u7F6E\uFF0C\u4EFB\u52A1\u4E0E\u80FD\u529B\u72B6\u6001\u672A\u53D8\u3002");
        }}>保存位置并返回</B><B onClick={() => precheck(f.atlasDraft||{ title: l.title, template: l.id, purpose: `\u5B9E\u8DF5${l.title}\uFF0C\u9A8C\u8BC1\u539F\u95EE\u9898`, hours: l.hours, product: l.product, career: l.career, kind: "\u539F\u521B\u6A21\u62DF\u5B9E\u8DF5" })}>转入统一实践预检</B></>;
        break;
      }
      case "resource":
        title = "学习资源不可用，选择替代内容";
        body = <><Notice>模拟资源已失效，不提供空壳执行页。</Notice><p>可换用原创离线示例，或保存为草稿并记录受阻。</p><B primary onClick={() => {
          const l = learning.find((x) => x.id === f.template);
          open("reading", atlasReading(f.atlasDraft?{...f.atlasDraft,unavailable:false}:null,s.reading)||{ template: l.id, chapter: s.reading[l.id]?.chapter||0 });
        }}>替换为原创离线资源</B><B onClick={() => {
          const l = learning.find((x) => x.id === f.template);
          precheck({...(f.atlasDraft||{title:l.title,template:l.id,purpose:"资源不可用时保留目的",hours:l.hours}),unavailable:true});
        }}>查看受阻预检 / 存草稿</B></>;
        break;
      case "evidence":
        title = "选择成果版本与声明候选";
        body = <EvidencePicker s={s} f={f} set={set} update={update} command={SERVER_AUTH?workspace.command:null} close={close} go={go} fail={fail} />;
        break;
      case "job":
        title = "\u672C\u4EBA\u5C97\u4F4D\u7814\u7A76\u5361";
        body = <><JobResearchFields data={f} input={input} area={area} select={select} careers={careers}/><label className="check"><input type="checkbox" checked={f.consent || false} onChange={(e) => set("consent", e.target.checked)} />仅保存到本人本地研究卡，不进入公开库、AI 或薪酬聚合。</label><B primary onClick={() => {
          if (!f.title?.trim() || !f.text?.trim() || !f.consent) {
            fail("\u8BF7\u586B\u5199\u6807\u9898\u3001\u8981\u6C42\u539F\u6587\u5E76\u786E\u8BA4\u4FDD\u5B58\u8303\u56F4\u3002");
            return;
          }
          const j = { ...f, id: f.id || uid("job"), status: f.status || "\u6536\u85CF", archived:f.status==="归档", source: f.source || "\u672C\u4EBA\u79C1\u6709\u8F93\u5165", location: f.location || "\u672A\u77E5", date: f.date || "\u672A\u77E5" };
          update({ jobs: f.id ? s.jobs.map((x) => x.id === f.id ? j : x) : [...s.jobs, j] });
          close();
          tell("\u7814\u7A76\u5361\u5DF2\u4FDD\u5B58\uFF0C\u672A\u8BB0\u5F55\u6295\u9012\u3001\u672A\u6838\u9A8C\u5728\u62DB\uFF0C\u4E3B\u76EE\u6807\u672A\u6539\u53D8\u3002");
        }}>保存本人研究卡</B></>;
        break;
      case "companyCompare":
        title = "\u4F01\u4E1A / \u5C97\u4F4D\u6761\u4EF6\u6BD4\u8F83";
        body = <><p>不生成文化星级或综合排名；同名企业不会自动合并。</p>{s.jobs.map((j) => <label className="check" key={j.id}><input type="checkbox" checked={(f.selected || []).includes(j.id)} onChange={(e) => {
          if (e.target.checked && (f.selected || []).length >= 3) {
            fail("\u6700\u591A\u6BD4\u8F83\u4E09\u9879\u3002");
            return;
          }
          set("selected", e.target.checked ? [...f.selected || [], j.id] : (f.selected || []).filter((x) => x !== j.id));
        }} />{j.company || "\u4F01\u4E1A\u672A\u77E5"} · {j.title}</label>)}<div className="table-wrap"><table><thead><tr><th>对象</th><th>已知地点 / 形式</th><th>具体条件 / 来源</th></tr></thead><tbody>{s.jobs.filter((j) => (f.selected || []).includes(j.id)).map((j) => <tr key={j.id}><td>{j.company || "\u672A\u77E5"}<br />{j.title}</td><td>{j.location} / {j.form}</td><td>{j.text}<br />{j.source} · {j.date} · 在招未核验</td></tr>)}</tbody></table></div><B onClick={close}>保留研究卡并返回</B></>;
        break;
      case "original":
        title = "\u5C97\u4F4D\u6765\u6E90\u4E0E\u65F6\u6548";
        {
          const j = s.jobs.find((x) => x.id === f.jobId);
          body = <><p>{j?.source}</p><p>资料日期：{j?.date}。没有实时招聘源，没有企业确认或原站浏览能力；此入口不改变投递状态。</p><B onClick={close}>返回同一研究卡</B></>;
        }
        break;
      case "application":
        title=f.id?'修订本人求职事件':'本人记录求职事件';
        body=<JobEventEditor s={s} data={f} update={update} close={close} precheck={precheck} tell={tell}/>;
        break;
      case "reportPreflight":
        title = "报告创建预检";
        body = <ReportPreflight s={s} f={f} set={set} reportSnapshot={reportSnapshot} defaultBody={defaultBody} update={update} command={SERVER_AUTH?workspace.command:null} close={close} go={go} fail={fail} />;
        break;
      case "reportMerge":
        title = "旧人工编辑与新依据逐段对比";
        body = <ReportRevision s={s} f={f} update={update} close={close} go={go} fail={fail} />;
        break;
      case "export":
        title = "选择报告片段与导出范围";
        body = <ReportExport s={s} f={f} set={set} download={download} fail={fail} />;
        break;
      case "resumePreview": {
        title = "\u7B80\u5386\u539F\u6587\u4E0E\u63AA\u8F9E\u5DEE\u5F02\u9884\u89C8";
        const list = f.claimIds.map((cid) => s.claims.find((c) => c.id === cid)).filter(Boolean);
        body = <>{f.sourceResumeId&&<Notice>基于已有简历另存修订版；旧快照保持不变。本次只采用当前仍可访问的确认材料，不可访问的经历不会加入修订稿；版本与措辞需重新核对。</Notice>}<p>姓名：{f.name}；岗位：{s.jobs.find((j) => j.id === f.target)?.title || "\u901A\u7528"}；个人 v{s.profileVersion}</p><ResumeContactLine profile={f.includeProfile?confirmedResumeProfile(s):null}/>{select("\u63AA\u8F9E\u6A21\u677F\uFF08\u4E0D\u589E\u52A0\u4E8B\u5B9E\uFF09", "wording", ["\u4FDD\u7559\u539F\u6587", "\u6309\u8D21\u732E\u7EC4\u7EC7\u63AA\u8F9E\uFF08\u6A21\u62DF\uFF09"])}<EducationOutput facts={educationFacts(s).filter(e=>(f.educationIds||[]).includes(e.id))}/><JDTailor job={s.jobs.find(j=>j.id===f.target)} facts={list} value={f.tailoring||{}} change={v=>{set("tailoring",v);if(f.studio)update(x=>({...x,resumeStudioDraft:{...x.resumeStudioDraft,tailoring:v}}));}}/><div className="table-wrap"><table><thead><tr><th>原文事实</th><th>建议输出 / 顺序</th></tr></thead><tbody>{list.map((c, i) => <tr key={c.id}><td>{c.title}<br />{c.text}<br />贡献：{c.contribution || "\u672A\u586B\u5199"}</td><td>{f.wording === "\u4FDD\u7559\u539F\u6587" ? c.text : `\u672C\u4EBA\u8BB0\u5F55\uFF1A${c.contribution || "\u8D21\u732E\u5F85\u8865\u5145"}\uFF1B\u7ECF\u5386\u539F\u6587\uFF1A${c.text}`}<br /><B disabled={i === 0} onClick={() => {
          const ids = [...f.claimIds];
          [ids[i - 1], ids[i]] = [ids[i], ids[i - 1]];
          set("claimIds", ids);
          if(f.studio)update(x=>({...x,resumeStudioDraft:{...x.resumeStudioDraft,claimIds:ids}}));
        }}>上移此经历</B></td></tr>)}</tbody></table></div><p>数字成果：未提供则不生成。本人确认并不代表企业核验；输出保留辅助与自述限定。</p><B primary onClick={() => {
          if(f.target&&!s.jobs.some(j=>j.id===f.target)){fail('原岗位已不可用，请回编排页重新选择。');return;}
          if(f.includeProfile&&!confirmedResumeProfile(s)){fail('联系资料已不可用，请回简历重新选择。');return;}
          const issue=tailoringError(s.jobs.find(j=>j.id===f.target),list,f.tailoring||{});if(issue){fail(issue);return;}
          if(list.length!==f.claimIds.length||list.some(c=>c.status!=='已确认')||(f.educationIds||[]).some(id=>!educationFacts(s).some(e=>e.id===id))){fail("部分经历已不可用，请重新选择。");return;}
          const r = { id: uid("resume"), prior:f.sourceResumeId||null, title: `${f.name} \xB7 ${f.target ? "\u5C97\u4F4D" : "\u901A\u7528"}\u7B80\u5386\uFF08\u793A\u4F8B\uFF09`, name: f.name, target: f.target, claimIds: f.claimIds, profileVersion: s.profileVersion, version: s.resumes.filter((r2) => r2.target === f.target).length + 1, educationFacts:educationFacts(s).filter(e=>(f.educationIds||[]).includes(e.id)).map(e=>({...e,history:undefined})),profileSnapshot:f.includeProfile?{...confirmedResumeProfile(s),history:undefined}:null,placements:{...f.placements},tailoring:JSON.parse(JSON.stringify(f.tailoring||{})),jobSnapshot:s.jobs.find(j=>j.id===f.target)?{...s.jobs.find(j=>j.id===f.target)}:null,wording: f.wording, facts: list.map((c) => ({ ...c })), date: today() };
          update({ resumes: [...s.resumes, r] });
          close();
          tell("\u7B80\u5386\u7248\u672C\u5DF2\u4FDD\u5B58\uFF0C\u53EF\u9884\u89C8\u6253\u5370\uFF1B\u6CA1\u6709\u81EA\u52A8\u6295\u9012\u3002");
        }}>本人确认并保存简历版本</B></>;
        break;
      }
      case "resumeExport": {
        title = "\u7B80\u5386 PDF \u8F93\u51FA\u9884\u89C8\uFF08\u6D4F\u89C8\u5668\u6253\u5370\uFF09";
        const r = s.resumes.find((x) => x.id === f.resumeId);
        if(!r||resumeUnavailable(s,r)){body=<p>简历依据已撤回，停止输出；请返回岗位简历重建。</p>;break;}
        body = <><div id="printable"><h2>{r.title}</h2><p>目标：{r.jobSnapshot?.title || s.jobs.find((j) => j.id === r.target)?.title || "\u901A\u7528"} · v{r.version} · {r.date}</p><ResumeContactLine profile={r.profileSnapshot}/><ResumeSections facts={r.facts} education={r.educationFacts||[]} placements={r.placements||{}} renderFact={c=><section key={c.id}><h3>{c.title}</h3><p>{r.wording=== "保留原文" || !c.contribution&&!['projects','work','campus'].includes(resumeFactSection(c,r.placements)) ? c.text : `本人记录：${c.contribution || "贡献待补充"}；经历原文：${c.text}`}</p><p>{(c.contribution||["projects","work","campus"].includes(resumeFactSection(c,r.placements)))&&<>本人贡献：{c.contribution || "\u672A\u586B\u5199"}；</>}辅助：{c.aid || "\u672A\u8BF4\u660E"}；材料 v{c.version}</p></section>}/>{Object.entries(r.tailoring?.rows||{}).filter(([,row])=>row.confirmed&&row.wording?.trim()).map(([key,row])=><section key={key}><h3>岗位相关表达 · 本人确认</h3><p className="preserve">{row.wording}</p></section>)}<p>【原型示例输出】基于本人确认记录，未实际核验；未生成未知成果数字。</p></div><B primary onClick={() => {
          document.body.classList.add("printing");
          window.print();
          document.body.classList.remove("printing");
          tell("\u5DF2\u6253\u5F00\u6D4F\u89C8\u5668\u6253\u5370\u5BF9\u8BDD\u6846\uFF0C\u53EF\u53E6\u5B58\u4E3A PDF\uFF1B\u5E76\u975E\u771F\u5B9E\u540E\u53F0\u5BFC\u51FA\u3002");
        }}>浏览器打印 / 另存为 PDF</B><B onClick={() => download(`\u7B80\u5386_\u793A\u4F8B_v${r.version}.txt`, document.getElementById("printable").innerText)}>下载相同内容 TXT 示例</B></>;
        break;
      }
      case "scope":
        title = "选择可用于本次讨论的资料";
        body = <ScopePicker s={s} f={f} set={set} update={update} close={close} tell={tell} external={SERVER_AUTH} />;
        break;
      case "aiNoteEdit":
        title="编辑本人笔记";
        body=<AINoteEditor s={s} noteId={f.noteId} update={update} back={()=>open("aiNotes")} tell={tell}/>;
        break;
      case "aiNotes":
        title = "本人保存的AI回答笔记";
        body = <AgentNotes s={s} open={open} update={update} confirmAction={confirmAction} close={close} go={go}/>;
        break;
      case "rename":
        title = "\u4F1A\u8BDD\u6539\u540D";
        body = <>{input("\u4E3B\u9898\u540D\u79F0", "title")}<B onClick={() => {
          if (!f.title.trim()) {
            fail("\u8BF7\u8F93\u5165\u4E3B\u9898\u540D\u79F0\u3002");
            return;
          }
          update({ conversations: s.conversations.map((c) => c.id === f.convId ? { ...c, title: f.title } : c) });
          close();
        }}>保存主题名</B></>;
        break;
      case "feedback":
        title = "\u63D0\u4EA4\u5177\u4F53\u5BF9\u8C61\u53CD\u9988";
        body = <>{input("\u5BF9\u8C61\u4E0E\u7248\u672C", "object")}{area("\u54EA\u91CC\u4E0D\u51C6\u786E / \u5E0C\u671B\u7EA0\u6B63\u4EC0\u4E48", "text")}<B primary onClick={() => {
          if (!f.text?.trim()) {
            fail("\u8BF7\u586B\u5199\u5177\u4F53\u95EE\u9898\u3002");
            return;
          }
          const ticket = { id: uid("feedback"), object: f.object, text: f.text, status: "\u5DF2\u53D7\u7406", date: today() };
          update({ feedback: [...s.feedback, ticket] });
          close();
          tell(`\u539F\u9875\u53D7\u7406\u56DE\u6267\uFF1A${ticket.id}\u3002\u672C\u4EBA\u53EF\u5728\u8D26\u6237\u53CD\u9988\u72B6\u6001\u4E2D\u67E5\u770B\uFF1B\u6CA1\u6709\u76F4\u63A5\u4FEE\u6539\u4E8B\u5B9E\u3002`);
        }}>提交并留在原页面看回执</B></>;
        break;
      case "processFeedback":
        title = "\u5904\u7F6E\u5DE5\u5355 \xB7 \u672C\u4EBA\u53EF\u89C1\u56DE\u6267";
        body = <>{select("\u5904\u7406\u72B6\u6001", "status", ["\u5904\u7406\u4E2D", "\u5F85\u8865\u5145", "\u5DF2\u5904\u7406", "\u4E0D\u91C7\u7EB3\uFF08\u8BF4\u660E\u539F\u56E0\uFF09"])}{area("\u5904\u7406\u7406\u7531\u4E0E\u56DE\u6267", "reply")}<B primary onClick={() => {
          if (!f.reply?.trim()) {
            fail("\u8BF7\u586B\u5199\u672C\u4EBA\u53EF\u89C1\u7684\u5904\u7406\u7406\u7531\u3002");
            return;
          }
          update({ feedback: s.feedback.map((x) => x.id === f.feedbackId ? { ...x, status: f.status, reply: f.reply } : x) });
          close();
          tell("\u5DF2\u5728\u7BA1\u7406\u539F\u9875\u4FDD\u5B58\u5904\u7F6E\uFF0C\u7528\u6237\u53EF\u4ECE U12 \u67E5\u56DE\u6267\u3002");
        }}>保存处置</B></>;
        break;
      case "fixture":
        if(SERVER_AUTH){title='演示设置不可用';body=<p>真实账户模式不允许载入模拟登录或管理身份。</p>;break;}
        title = "\u539F\u578B\u6F14\u793A\u8BBE\u7F6E\u4E0E\u72B6\u6001\u573A\u666F";
        body = <><Notice>切换 PT 场景会替换本浏览器当前示例数据，请先导出需要保留的本地记录。这里是演示工具，不是新增产品页面。</Notice><div className="fixture-grid">{[["PT01", "\u9996\u6B21\u4F7F\u7528 / \u65E0\u8D44\u6599"], ["PT02", "\u81EA\u8FF0\u672A\u786E\u8BA4 / 3 \u5C0F\u65F6"], ["PT03", "\u5DF2\u6709\u4F5C\u54C1 / \u91CD\u590D\u4E0E\u77DB\u76FE"], ["PT04", "\u9884\u7B97 8 \u5C0F\u65F6\u5F85\u964D\u4E3A 2"], ["PT05", "\u8DE8\u804C\u4E1A\u5C97\u4F4D / \u5171\u4EAB\u4EFB\u52A1"], ["PT06", "v1 \u53CD\u9988 / \u4FEE\u8BA2\u91CD\u4EA4"], ["PT07", "\u4EBA\u5DE5\u62A5\u544A / \u4F9D\u636E\u66F4\u65B0"]].map(([key, label]) => <B key={key} onClick={() => confirmAction(`\u8F7D\u5165 ${key}\uFF1F`, "\u5F53\u524D\u672C\u673A\u793A\u4F8B\u5C06\u88AB\u66FF\u6362\uFF1B\u6CA1\u6709\u5916\u90E8\u6570\u636E\u6216\u771F\u5B9E\u8D26\u6237\u53D7\u5F71\u54CD\u3002", () => {
          setS(scenarioState(key));
          move("/app");
          tell(`\u5DF2\u8F7D\u5165 ${key} \u5408\u6210\u793A\u4F8B\u3002`);
        })}>{key} · {label}</B>)}</div><Field label="功能阶段（仅模拟）"><select value={s.stage} onChange={(e) => update({ stage: e.target.value })}><option>S1</option><option>S2</option></select></Field><Field label="演示职责（真实鉴权未实现）"><select value={s.role} onChange={(e) => update({ role: e.target.value })}>{[["student", "\u5B66\u751F\u672C\u4EBA"], ["quality", "\u8FD0\u8425\u8D28\u91CF"], ["data", "\u6765\u6E90\u4E0E\u5C97\u4F4D\u5BA1\u6838"], ["content", "\u804C\u4E1A\u4E0E\u5B66\u4E60\u5185\u5BB9"]].map(([k, v]) => <option key={k} value={k}>{v}</option>)}</select></Field><div className="actions"><B onClick={() => {
          update({ logged: false });
          open("auth", { intent: url });
          tell("\u5DF2\u6A21\u62DF\u4F1A\u8BDD\u8FC7\u671F\uFF0C\u5141\u8BB8\u7684\u672C\u5730\u8349\u7A3F\u4FDD\u7559\uFF0C\u91CD\u65B0\u8BA4\u8BC1\u540E\u6062\u590D\u3002");
        }}>模拟会话过期</B><B onClick={() => confirmAction("\u91CD\u7F6E\u5168\u90E8\u672C\u5730\u539F\u578B\u6570\u636E\uFF1F", "\u6E05\u7A7A\u5F53\u524D\u793A\u4F8B\u5E76\u8FD4\u56DE\u516C\u5F00\u9996\u9875\u3002", () => {
          setS(fresh());
          move("/");
        })}>重置全部示例</B><B onClick={close}>完成设置并返回</B></div></>;
        break;
      case "coverage":
        title = "PRD \u8986\u76D6\u7D22\u5F15 \xB7 15 \u6A21\u677F / 27 \u89C6\u56FE / 43 \u9700\u6C42";
        drawer = true;
        body = <><p>仅表示原型有入口和可操作状态，不代表真实服务 / 软件验收通过。</p><details open><summary>27 个低保真视图（部分需 PT 场景）</summary>{spec.views.map((v, i) => <p key={v.view_id}>{link(viewRoutes[i], `${v.view_id} \xB7 ${v.title}`)} <B onClick={() => {
          close();
          go(viewRoutes[i]);
        }}>打开视图</B></p>)}</details><details><summary>43 项需求与模板落点</summary>{spec.features.map((f2) => <p key={f2.requirement_id}><strong>{f2.requirement_id} {f2.name}</strong> · {f2.page_ids.join(" / ")}<br /><OriginalText value={f2.acceptance_obligation}/></p>)}</details><details><summary>14 条完整链路</summary>{spec.flows.map((f2) => <p key={f2.flow_id}>{f2.flow_id} {f2.title} · {f2.page_ids.join(" \u2192 ")}</p>)}</details><details><summary>43 项验收原文（真实服务均待验收）</summary>{spec.acceptance.map((a) => <p key={a.check_id}>{a.check_id} · <OriginalText value={a.acceptance}/></p>)}</details></>;
        break;
      default:
        title = "\u539F\u578B\u8F85\u52A9\u89C6\u56FE";
        body = <p>请返回原页面继续。</p>;
    }
    return <Modal key={modal.type} title={title} onClose={close} drawer={drawer} className={modal.type==='auth'?'auth-dialog':modal.type==='reading'?'course-dialog':''} companion={modal.type==='aiNotes'?'read':modal.type==='aiNoteEdit'?'note':null}>{modal.type!=='auth'&&error && <p className="error" role="alert">{error}</p>}{body}</Modal>;
  }
  const content = () => path === "/" ? publicPage() : path === "/companion" ? <HomeCompanion standalone onBack={()=>go("/")} onExplore={()=>go("/careers")}/> : SERVER_AUTH&&!authReady ? <p role="status">正在验证账户会话…</p> : SERVER_AUTH&&s.logged&&!workspace.ready ? <p role="status">正在读取账户记录，请稍候。读取失败时可使用上方重试。</p> : !s.logged ? <Empty title={SERVER_AUTH?"登录后继续":"登录演示工作区后继续"}><B onClick={() => open("auth", { intent: url })}>{SERVER_AUTH?"打开登录":"打开演示登录"}</B></Empty> : path === "/onboarding" ? onboarding() : path === "/app" ? dashboard() : path === "/assessment" ? assessment() : path === "/careers" ? careerPage() : path === "/career-map" ? mapPage() : path === "/plan" ? planPage() : path === "/learning" ? learningPage() : path.startsWith("/work") ? workPage() : path.startsWith("/reports") ? reportPage() : path === "/assistant" ? assistantPage() : path === "/settings" ? settingsPage() : path.startsWith("/admin/") ? SERVER_AUTH?<AdminConsole/>:adminPage() : <Empty title="页面不存在">{link("/app", "\u8FD4\u56DE\u5DE5\u4F5C\u533A")}</Empty>;
  const admin = path.startsWith("/admin/");
  const groups = [["工作区", ["U03"]], ["职业成长", ["U05", "U04", "U07", "U08", "U10"]], ["辅助工具", ["U06", "U11"]]];
  if(mailLink)return <MailTokenForm key={mailLink.token} link={mailLink} onBack={()=>{setMailLink(null);setAuthMode('登录');open('auth',{intent:'/app'});}}/>;
  return <>{(publicRoute || admin)&&<LanguageSwitch floating/>}<a className="skip" href="#main">跳到主要内容</a><div className="prototype-bar"><span>{SERVER_AUTH?'小组展示 · 历史职业数据 · AI 只读服务按配置开放':'交互低保真 · 合成示例 / 模拟服务 · 本机保存'}</span><div><B onClick={() => open("coverage")}>覆盖索引</B>{!SERVER_AUTH&&<B onClick={() => open("fixture")}>演示设置 / 场景</B>}</div></div>{!publicRoute && (!SERVER_AUTH||authReady&&s.logged&&workspace.ready) && <><header className="app-header">{React.cloneElement(link("/", <BrandLogo/>, "brand"),{"aria-label":"Avemly",title:"Avemly"})}<B onClick={() => setMobile(!mobile)} aria-expanded={mobile} aria-controls="workspace-sidebar">{mobile?"收起导航":"导航"}</B><WorkspaceSearch s={s} query={search} setQuery={setSearch} scope={form.globalScope || "职业知识"} setScope={value=>setForm(x=>({...x,globalScope:value}))} go={go} open={open} startTask={startTask}/>{!admin&&<><span className="workspace-local-label">{SERVER_AUTH?"账户存储":"本机演示"}</span><button type="button" className="workspace-alert-button" aria-label={displayText('站内提醒')} onClick={()=>open('notifications')}><svg width="22" height="22" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round" aria-hidden="true"><path d="M18 8a6 6 0 0 0-12 0c0 7-3 7-3 9h18c0-2-3-2-3-9M10 21h4"/></svg></button><LanguageSwitch/></>}<details className="workspace-utilities" key={url} onKeyDown={e=>{if(e.key==="Escape"){e.currentTarget.open=false;e.currentTarget.querySelector("summary").focus();}}} onBlur={e=>{if(!e.currentTarget.contains(e.relatedTarget))e.currentTarget.open=false;}}><summary aria-label={displayText("账户与工具")} title={displayText("账户与工具")}><span className="workspace-account-avatar"><AccountAvatar preferences={s.preferences} size={32}/></span><span className="workspace-account-label">账户与工具</span></summary><div className="header-right">{!admin&&<><p className="workspace-demo-note">{SERVER_AUTH?authUser?.email:"本机演示 · 合成示例，数据保存在本机。"}</p><B onClick={()=>open("coverage")}>覆盖索引</B>{!SERVER_AUTH&&<B onClick={()=>open("fixture")}>演示设置 / 场景</B>}</>}<B onClick={() => open("notifications")}>站内提醒</B>{path !== "/assistant" && <B onClick={() => {
    update({ aiReturn: url });
    setAiSide(!aiSide);
  }}>AI 侧栏</B>}{link("/settings", "\u8D26\u6237\u4E0E\u6570\u636E")}<B onClick={() => confirmAction(SERVER_AUTH?'退出当前账户？':"\u9000\u51FA\u6A21\u62DF\u4F1A\u8BDD\uFF1F", SERVER_AUTH?'退出前会保存本页改动并撤销会话。已保存的账户记录将保留。':"\u672C\u673A\u8349\u7A3F\u4FDD\u7559\uFF1B\u79C1\u4EBA\u5185\u5BB9\u5728\u91CD\u65B0\u8BA4\u8BC1\u524D\u4E0D\u53EF\u4ECE\u754C\u9762\u8BBF\u95EE\u3002\u771F\u5B9E\u8D26\u6237\u548C\u591A\u7528\u6237\u9694\u79BB\u5C1A\u672A\u63A5\u5165\u3002", () => {
    if(SERVER_AUTH){logoutServer();return;}
    update({ logged: false, authorized: false, aiClaimRefs:[], aiScope: ["\u804C\u4E1A\u539F\u521B\u77E5\u8BC6"] });
    setAiSide(false);
    move("/");
  })}>退出</B></div></details></header><WorkspaceSidebar s={s} page={page[0]} admin={admin} mobile={mobile} collapsed={sidebarLayout.collapsed} toggle={sidebarLayout.toggle} go={go} open={open} Icon={Icon} navIcons={navIcons}/></>}
 <PageGuidanceProvider routeKey={path+tab}><main id="main" className={publicRoute ? "publicmain" : `workspace ${!admin?"student-workspace":""} ${path==="/app"?"workbench-home":""} ${path === "/career-map" ? "atlas-workspace" : ""} ${path === "/assistant" && (!tab || tab === "咨询与方案") ? "assistant-workspace" : ""}`}>{SERVER_AUTH&&authUser&&!publicRoute&&<ServerSaveStatus sync={workspace} onDownload={()=>download("职业成长_本页未保存记录.json",JSON.stringify(workspace.current().state||s,null,2),"application/json")} onReload={()=>confirmAction("重新载入账户记录？","这会用服务器最新记录替换本页未保存改动。请先下载本页记录；取消会保留当前输入。",()=>workspace.reload().catch(error=>tell(authMessage(error.code,language))))}/>} {!SERVER_AUTH&&storageRecovery}{!publicRoute && (<WorkspaceContextBar s={s} path={path} tab={tab} search={urlObj.search} page={page[2]} admin={admin} hideGuide={path==="/career-map"} link={link}/>)}{navigationNotice&&<div role="status" className="notice route-recovery">该页签已不可用，已返回本页默认内容。请从页面页签继续。</div>}<div className={`page-surface surface-${page[0]}`}>{content()}</div>{path !== "/assistant" && <footer><span>{SERVER_AUTH?'课程正文与实践素材已接入；AI 只读建议按服务与授权状态开放。':'本原型不接真实登录、AI 或后台；媒体使用全黑图片占位。'}</span><B onClick={() => open("legal")}>使用说明与边界</B></footer>}</main></PageGuidanceProvider>
 {!publicRoute&&<FlowNavigation s={s} path={path} tab={tab} search={urlObj.search} link={link} />}
 {!publicRoute&&<OperationGuide s={s} path={path} tab={tab} search={urlObj.search} modal={modal?.type} error={error} toast={toast} go={go}/>}
 {aiSide && s.logged && <Modal title="AI 上下文侧栏 · 同一会话" drawer className="cheese-context-drawer" companion="perch" onClose={() => setAiSide(false)}>{aiContent(true)}</Modal>}{dialogContent()}<StatusToast message={toast} revision={toastRevision} onDismiss={()=>setToast("")}/></>;
}
createRoot(document.getElementById("root")).render(<App />);















