import React from 'react';
import LearningCover from './LearningCover';
import {CheesePose} from './CheeseAvatar';
import {learning, careers, cname} from './model';
import {useLanguage, displayPublicText} from './i18n/render';
import {guidedTask, projectRoute} from './practice-project-model';
import ui from './i18n/practice-project-ui.json';
import './learning-focus.css';
import './resource-centre.css';

export default function LearningCentre({s, url, link, precheck, startTask, move, live = false, catalog, catalogError, retryCatalog}) {
  const language = useLanguage(), t = ui[language];
  const params = new URL(url, location.origin).searchParams;
  const goal = s.goal || s.assessmentCareer;
  const selected = params.get('career');
  const direction = selected || (learning.some(unit => unit.career === goal) ? goal : 'all');
  const showMissingDirection = direction !== 'all' && !learning.some(unit => unit.career === direction);
  const hours = params.get('hours') || '全部';
  const browse = patch => {
    const next = new URL(url, location.origin);
    Object.entries(patch).forEach(([key, value]) => value == null ? next.searchParams.delete(key) : next.searchParams.set(key, value));
    move(next.pathname + next.search, true, {preserveScroll:true});
  };
  const list = learning.filter(unit => (direction === 'all' || unit.career === direction) &&
    (params.get('scope') !== '当前目标相关' || unit.career === s.goal) &&
    (hours !== '2 小时以内' || unit.hours <= 2) && (hours !== '2 小时以上' || unit.standard > 2));
  const availableDirections = careers.filter(item => learning.some(unit => unit.career === item.id) || item.id === goal);
  const useGoalFilter = goal && availableDirections.some(item => item.id === goal);

  return <div className="library-layout learning-focus resource-centre project-centre">
    <aside className="library-filters">
      <h2>筛选项目</h2>
      <div className="catalog-toolbar">
        <label className="field"><span>项目方向</span>
          <select aria-label="项目方向" value={direction} onChange={event => browse({career:event.target.value, scope:null})}>
            <option value="all">全部方向</option>
            {availableDirections.map(item => <option key={item.id} value={item.id}>{item.name}</option>)}
          </select>
        </label>
        <label className="field"><span>预计投入</span>
          <select aria-label="预计投入" value={hours} onChange={event => browse({hours:event.target.value})}>
            <option>全部</option>
            <option value="2 小时以内">{t.shortEffort}</option>
            <option value="2 小时以上">{t.longEffort}</option>
          </select>
        </label>
      </div>
      {useGoalFilter && <button type="button" onClick={() => browse({career:goal, hours:null, scope:null})}>
        {t.match} · {displayPublicText(cname(goal))}
      </button>}
      <p className="resource-filter-note">完成实践后，项目成果会自动归入“我的资源”。</p>
    </aside>
    <section className="library-results" aria-label="资源中心项目">
      <div className="catalog-intent"><div>
        <h2>选择一个项目，开始实践</h2>
        <p>先了解项目任务、公开案例和要交付的成果，再确认实践投入。</p>
      </div></div>
      {!selected && goal && !learning.some(unit => unit.career === goal) && <p className="project-card-source" data-i18n="off">{t.noMatch}</p>}
      {!catalog ? <div className="light-empty">
        <p role={catalogError ? 'alert' : 'status'} data-page-reveal-pending={catalogError ? undefined : ''}>{catalogError ? '课程目录读取失败，已有记录保留。' : '正在读取已发布课程…'}</p>
        {catalogError && <button onClick={retryCatalog}>重试课程目录</button>}
      </div> : !list.length ? <div className="light-empty cheese-learning-empty">
        <CheesePose pose="read" width={112} height={134}/>
        <div><h3>{showMissingDirection ? t.noMatch : '当前筛选下没有项目'}</h3><p>试试其他项目方向或预计投入。</p>
          <button onClick={() => browse({career:'all', hours:null, scope:null})}>重置筛选</button>
        </div>
      </div> : <div className="learning-grid">{list.map(unit => {
        const course = catalog?.courses.find(item => item.id === unit.id);
        const pending = live && course?.status !== 'published';
        const info = course?.projectSummary;
        const active = s.tasks.find(task => task.template === unit.id && !task.completed && ['待开始','进行中','受阻'].includes(task.status));
        const done = s.tasks.some(task => task.template === unit.id && task.completed && task.status === '完成');
        return <article className="learning-card" data-career={unit.career} data-learning-project={unit.id} key={unit.id}>
          <div className="learning-media"><LearningCover career={unit.career}/></div>
          <div className="learning-card-body"><div className="learning-card-content"><div className="learning-card-intro">
            <h3>{info?.title[language] || course?.title || unit.title}</h3>
            <div className="task-meta">
              <span>{cname(unit.career)}</span><span>{unit.hours}–{unit.standard} {t.duration}</span>
              {unit.career === goal && <span className="project-match">{t.match}</span>}
            </div>
            {info && <p className="project-card-brief">{info.brief[language]}</p>}
            <div className="learning-output"><span>项目成果</span><p>{info?.outcome[language] || unit.product}</p></div>
            {info && <p className="project-card-source">{t.officialCase} {info.case.publisher}</p>}
            <div className="actions">
              {pending ? <button disabled>课程资料准备中</button> :
                active ? <button className="primary" onClick={() => startTask(active)}>{guidedTask(active) ? t.resume : t.legacy}</button> :
                course?.content_version >= 2 ? link(projectRoute(unit.id), t.openProject, 'button primary') :
                <button className="primary" onClick={() => precheck({
                  title:course?.title || unit.title, template:unit.id, career:unit.career, hours:unit.hours,
                  purpose:unit.product, product:unit.product, source:projectRoute(unit.id), courseVersion:course?.content_version
                })}>{t.schedule}</button>}
              {!pending && link(projectRoute(unit.id, {view:'reading'}), s.reading[unit.id] ? '继续阅读资料' : '查看项目资料', 'button')}
              {done && link('/learning?tab=我的资源&source=practice', '查看已完成成果', 'resource-completed-link')}
            </div>
          </div></div></div>
        </article>;
      })}</div>}
    </section>
  </div>;
}
