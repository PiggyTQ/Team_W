import GrowthProjectPage from './GrowthProjectPage';
import {growthProject} from './practice-registry';
import LearningDiscussion from './LearningDiscussion';
import React, {useEffect, useRef, useState} from 'react';
import {useCatalog} from './CatalogData';
import CourseReader, {CourseDownload} from './CourseReader';
import CourseMarkdown from './CourseMarkdown';
import ProductIcon from './ProductIcon';
import LearningCover from './LearningCover';
import ProjectCoach from './ProjectCoach';
import ProjectPractice from './ProjectPractice';
import ProjectDeliverable from './ProjectDeliverable';
import {useLanguage, displayPublicText} from './i18n/render';
import ui from './i18n/practice-project-ui.json';
import {cname, learning} from './model';
import {courseReadingPosition, guidedTask, projectStepIssue, PRACTICE_COURSES, projectRoute} from './practice-project-model';
import './practice-project.css';

const caseIcons = {quality: 'file', 'ai-eval': 'brain', log: 'search', restore: 'route'};
const views = ['overview', 'reading', 'practice', 'outcome'];

export default function PracticeProjectPage(props) {
  return growthProject(props.courseId) ? <GrowthProjectPage {...props}/> : <LegacyPracticeProjectPage {...props}/>;
}

function LegacyPracticeProjectPage(props) {
  const {courseId, url, state, live, ownerId, link, catalog, requestedTask} = props;
  const language = useLanguage(), t = ui[language];
  const requestPath = live && PRACTICE_COURSES.includes(courseId) && requestedTask !== false
    ? '/api/catalog/courses/' + courseId + (requestedTask?.courseVersion ? '?version=' + requestedTask.courseVersion : '') : null;
  const request = useCatalog(requestPath);
  const [local, setLocal] = useState({course:null,error:false});
  useEffect(() => {
    if (live) return;
    let active=true;
    import('./local-practice-courses').then(module=>{
      if(active)setLocal({course:module.localPracticeCourse(courseId),error:false});
    }).catch(()=>{if(active)setLocal({course:null,error:true});});
    return()=>{active=false;};
  }, [live, courseId]);
  if (!PRACTICE_COURSES.includes(courseId)) return <ProjectState title={t.noProject} link={link} t={t}/>;
  if (requestedTask === false) return <ProjectState title={t.noTask} link={link} t={t}/>;
  const course = live ? request.data?.course : local.course;
  const valid = course?.id === courseId && (!requestedTask?.courseVersion || requestedTask.courseVersion === course.content_version);
  if (!course && (live ? request.loading : !local.error)) return <p role="status">{t.loading}</p>;
  if (!valid || !['published','local_trial','retired'].includes(course.status)) return <ProjectState title={request.error ? displayPublicText(request.error) : t.noMaterial} link={link} t={t} retry={live ? request.retry : null}/>;
  if(course.status==='retired')return <section className="practice-project project-legacy">
    {link('/learning',t.back,'project-back')}<h1>{course.title}</h1>
    <p>{language==='en'?'Retired — historical materials and your records remain readable.':'已退役；历史材料与本人记录仍可回看。'}</p>
    {requestedTask&&<><pre translate="no">{requestedTask.attempts.at(-1)?.text||requestedTask.draft||JSON.stringify(requestedTask.projectPractice,null,2)}</pre><button onClick={()=>props.download(courseId+'-history.json',JSON.stringify(requestedTask,null,2),'application/json')}>{language==='en'?'Export this record':'导出本次记录'}</button></>}
    <CourseReader key={courseId+':'+course.content_version} course={course} chapter={0} onPosition={props.onPosition} onSave={(index,item)=>{props.onPosition(index,item);props.move('/learning');}}/>
  </section>;

  const params = new URL(url, location.origin).searchParams;
  const latest = catalog?.courses.find(item => item.id === courseId);
  const record = courseReadingPosition(state.reading[courseId], course.content_version);
  const numbered = params.has('chapter') ? Number(params.get('chapter')) - 1
    : record?.chapter ?? 0;
  const chapter = Number.isInteger(numbered) && numbered >= 0 && numbered < course.chapters.length ? numbered : 0;
  if (!course.project) return <section className="practice-project project-legacy">
    {link('/learning', t.back, 'project-back')}
    <h1>{course.title}</h1>
    <p>{t.legacyVersion} v{course.content_version}</p>
    {requestedTask && link('/work/' + encodeURIComponent(requestedTask.id), t.backToWork, 'button primary')}
    {latest?.content_version > course.content_version && link(projectRoute(courseId), t.overview, 'button')}
    <CourseReader key={courseId + ':' + course.content_version} course={course} chapter={chapter}
      onPosition={props.onPosition} onSave={(index, item) => {props.onPosition(index, item);props.move('/learning');}}/>
  </section>;
  const matchingTask = requestedTask || null;
  return <ProjectWorkspace key={(ownerId || 'local') + ':' + courseId + ':' + course.content_version + ':' + (matchingTask?.id || 'preview')}
    {...props} task={matchingTask} course={course} project={course.project} chapter={chapter} params={params} language={language} t={t}/>;
}

function ProjectState({title, link, t, retry}) {
  return <section className="practice-project project-empty">
    <h1>{title}</h1>
    {retry && <button type="button" onClick={retry}>{t.tryAgain}</button>}
    {link('/learning', t.back, 'button')}
  </section>;
}

function ProjectWorkspace({course, project, chapter, params, task, language, t, state, live, link, move,
    onPosition, precheck, startTask, liveAgent, workspace, onSave, onResponse, onCommand, onCandidate, download}) {
  const copy = value => value[language];
  const sourceHeading = language === 'en' ? 'Case and method sources' : '案例与方法来源';
  const sourceNote = language === 'en'
    ? 'Avemly designs this practice. The sources below provide case and method references.'
    : '本站设计教学练习；下列资料提供案例参考与方法依据。';
  const picked = params.get('view');
  const view = views.includes(picked) ? picked : 'overview';
  const [role, setRole] = useState('member');
  const [scope, setScope] = useState('core');
  const [olderPosition] = useState(() => Boolean(state.reading[project.id] && !courseReadingPosition(state.reading[project.id],course.content_version)));
  const unit = learning.find(item => item.id === project.id);
  const active = state.tasks.find(item => item.template === project.id && !item.completed && ['待开始', '进行中', '受阻'].includes(item.status));
  const currentRole = task?.projectPractice?.role || role;
  const currentScope = task?.projectPractice?.scope || scope;
  const nextStep = project.steps.find(item => projectStepIssue(item, task?.projectPractice)) || project.steps[0];
  const [openingStep] = useState(() => nextStep);
  const step = project.steps.find(item => item.id === params.get('step')) || openingStep;
  const heading = useRef(null);
  useEffect(() => {
    heading.current?.focus({preventScroll: true});
  }, [view, step.id, chapter]);
  useEffect(() => {
    if (view === 'reading' && (state.reading[project.id]?.version !== course.content_version ||
      state.reading[project.id]?.chapter !== chapter)) onPosition(chapter, course);
  }, [view, chapter, project.id, course.content_version]);

  const route = (next, extra = {}) => projectRoute(project.id, {
    view: next === 'overview' ? undefined : next,
    task: task?.id,
    ...(next === 'practice' ? {step: (view === 'practice' ? step : nextStep).id} : {}),
    ...extra
  });
  const jump = (next, extra) => move(route(next, extra));
  function begin() {
    precheck({
      title: project.title.zh, template: project.id, career: project.career,
      courseVersion: course.content_version, hours: scope === 'extended' ? unit.standard : unit.hours,
      purpose: project.brief.zh, product: project.outcome.zh, kind: '离线教学实践',
      practiceRole: role, practiceScope: scope, source: projectRoute(project.id)
    });
  }

  return <LearningDiscussion context={{intent:'learning',career:project.career,refs:task?[{kind:'task',id:task.id,part:step.id}]:[]}} disabled={view!=='practice'||!task}><section className="practice-project" data-project={project.id} data-project-view={view} data-i18n="off">
    {link('/learning', <><ProductIcon name="arrowBack" size={17}/>{t.back}</>, 'project-back')}
    <header className={`project-masthead project-masthead-${view}`}>
      <div>
        <h1>{copy(project.title)}</h1>
        {view === 'overview' && <p>{copy(project.brief)}</p>}
        <div className="project-meta">
          <span>{displayPublicText(cname(project.career))}</span>
          <span>{task ? task.hours : unit.hours + '–' + unit.standard} {t.duration}</span>
          {task && <span>{displayPublicText(task.status)}</span>}
        </div>
      </div>
      <div className="project-masthead-cover" aria-hidden="true"><LearningCover career={project.career}/></div>
    </header>
    <nav className="project-nav" aria-label={t.projectNav}>
      {views.map(name => <a key={name} href={route(name)} aria-current={view === name ? 'page' : undefined}
        onClick={event => {
          if (event.button || event.ctrlKey || event.metaKey || event.shiftKey || event.altKey) return;
          event.preventDefault();
          jump(name);
        }}>
        <ProductIcon name={{overview:caseIcons[project.id],reading:'book',practice:'check',outcome:'file'}[name]} size={17} accent={false}/>
        {t[name]}
      </a>)}
    </nav>

    {view === 'overview' && <div className="project-grid project-overview">
      <div className="project-paper">
        <h2 ref={heading} tabIndex={-1}>{t.brief}</h2>
        <dl className="project-brief">
          <div><dt>{t.deliverable}</dt><dd>{copy(project.outcome)}</dd></div>
          <div><dt>{t.audience}</dt><dd>{copy(project.audience)}</dd></div>
        </dl>
        {task ? <div className="project-buttons">
          {link(route(task.completed ? 'outcome' : 'practice'), task.completed ? t.outcome : t.resume, 'button primary')}
        </div> : active ? <div className="project-buttons">
          <button className="primary" onClick={() => startTask(active)}>{guidedTask(active) ? t.resume : t.legacy}</button>
        </div> : <div className="project-setup">
          <fieldset>
            <legend>{t.role}</legend>
            <div className="project-role-options">{Object.entries(project.roles).map(([id, item]) => <label key={id} className="project-option">
              <input type="radio" name="practice-role" value={id} checked={role === id} onChange={() => setRole(id)}/>
              <span><strong>{copy(item.title)}</strong><small>{copy(item.responsibility)}</small></span>
            </label>)}</div>
          </fieldset>
          <label className="project-field">
            <span>{t.scope}</span>
            <select value={scope} onChange={event => setScope(event.target.value)}>
              <option value="core">{t.core} · {unit.hours} {t.duration}</option>
              <option value="extended">{t.extended} · {unit.standard} {t.duration}</option>
            </select>
          </label>
          <p className="project-muted">{scope === 'extended' ? t.extendedDelivery : t.coreDelivery}</p>
          <div className="project-buttons">
            <button className="primary" onClick={begin}>{t.schedule}</button>
            {link(route('reading'), t.readStart, 'button')}
          </div>
        </div>}
      </div>
      <aside className="project-rail">
        <div className="project-rail-section">
          <h2>{t.stepNav}</h2>
          <ol className="project-overview-steps">
            {project.steps.map(item => <li key={item.id}><strong>{copy(item.title)}</strong><p>{copy(item.impact)}</p></li>)}
          </ol>
        </div>
        <div className="project-rail-section">
          <h2>{sourceHeading}</h2>
          <p className="project-source-note">{sourceNote}</p>
          <ProjectSources project={project} t={t} copy={copy} ids={project.sources.filter(row => row.kind === 'case').map(row => row.id)}/>
          {link(route('reading'), t.readStart)}
        </div>
      </aside>
    </div>}

    {view === 'reading' && <div className="project-grid project-reading">
      <div className="project-paper">
        <div className="project-reading-heading">
          <h2 ref={heading} tabIndex={-1}>{copy(project.reading[chapter].title)}</h2>
          <span>{chapter + 1} / {project.reading.length}</span>
        </div>
        {olderPosition && <p className="project-muted">{t.latest}</p>}
        <CourseMarkdown text={copy(project.reading[chapter].body)}/>
        <div className="project-buttons">
          {chapter < project.reading.length - 1
            ? <button className="primary" onClick={() => jump('reading', {chapter: chapter + 2})}>{t.nextChapter}</button>
            : link(route(task ? 'practice' : 'overview'), task ? t.practice : t.overview, 'button primary')}
          <span className="project-muted">{t.readTrack} · {chapter + 1}/{project.reading.length}</span>
        </div>
      </div>
      <aside className="project-rail">
        <nav className="project-rail-section" aria-label={t.learningNav}>
          <h2>{t.learningNav}</h2>
          <ol className="project-chapters">
            {project.reading.map((item, index) => <li key={index}>
              <button type="button" aria-current={chapter === index ? 'step' : undefined} onClick={() => jump('reading', {chapter:index + 1})}>
                <span>{index + 1}</span>{copy(item.title)}
              </button>
            </li>)}
          </ol>
        </nav>
        <div className="project-rail-section">
          <h2>{sourceHeading}</h2>
          <p className="project-source-note">{sourceNote}</p>
          <ProjectSources project={project} t={t} copy={copy} ids={project.steps[chapter].sourceIds}/>
          <details className="project-disclosure"><summary>{t.allSources}</summary><ProjectSources project={project} t={t} copy={copy}/></details>
        </div>
        <ProjectFiles course={course} project={project} t={t} live={live} download={download}/>
      </aside>
    </div>}

    {view === 'practice' && <ProjectPractice key={step.id} {...{task,project,step,state,t,language,copy,route,jump,heading,onSave,onResponse,currentRole,currentScope,link}}>
      <ProjectCoach key={(task?.id || 'preview') + ':' + step.id} {...{project,step,task,state,liveAgent,workspace,language,link}}/>
      <ProjectFiles course={course} project={project} t={t} live={live} download={download}/>
    </ProjectPractice>}

    {view === 'outcome' && <ProjectDeliverable {...{task,project,state,language,t,copy,route,heading,link,onCommand,onCandidate,download}}/>}
  </section></LearningDiscussion>;
}

export function ProjectSources({project, t, copy, ids}) {
  const rows = ids ? project.sources.filter(row => ids.includes(row.id)) : project.sources;
  return <ul className="project-sources">
    {rows.map(source => <li key={source.id}>
      <span>{t[source.kind]} · {source.publisher}</span>
      <a href={source.url} target="_blank" rel="noreferrer">{source.title}</a>
      <p>{copy(source.use)}</p>
      <small>{t.checked} {source.checkedOn}</small>
    </li>)}
  </ul>;
}

function ProjectFiles({course, project, t, live, download}) {
  const files = course.assets || [];
  const labels = {'worksheet.csv':t.input, 'dft-source.csv':t.original, 'source-receipt.json':t.receipt};
  const basics = files.filter(file => Object.hasOwn(labels, file.filename));
  if (!live) return <section className="project-rail-section project-files">
    <h2>{t.materials}</h2>
    <button type="button" onClick={() => {
      const csv = value => '"' + String(value).replaceAll('"', '""') + '"';
      const rows = [['row_id', ...project.dataset.columns.map(column => column.id)], ...project.dataset.rows.map(row =>
        [row.id, ...row.cells.map(cell => typeof cell === 'string' ? cell : cell.en)])];
      download(project.id + '-worksheet.csv', rows.map(row => row.map(csv).join(',')).join('\n'), 'text/csv;charset=utf-8');
    }}>{t.input}</button>
  </section>;
  if (!files.length) return null;
  return <section className="project-rail-section project-files">
    <h2>{t.materials}</h2>
    <ul>
      {basics.map(file => <li key={file.id}><span>{labels[file.filename]}</span><CourseDownload asset={file}/></li>)}
    </ul>
    <details className="project-disclosure"><summary>{t.otherFiles}</summary>
      <ul>{files.filter(file => !basics.includes(file) && file.role !== 'reference').map(file => <li key={file.id}><CourseDownload asset={file}/></li>)}</ul>
    </details>
  </section>;
}
