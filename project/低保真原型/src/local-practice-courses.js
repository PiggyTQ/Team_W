import {registeredProject,growthProject} from './practice-registry.js';
import quality from '../course-packs/practice-20261113/quality/project.json';
import evaluation from '../course-packs/practice-20261113/ai-eval/project.json';
import log from '../course-packs/practice-20261113/log/project.json';
import restore from '../course-packs/practice-20261113/restore/project.json';
import {learning} from './model.js';

const projects = [quality, evaluation, log, restore];
export function localPracticeCourse(id) {
  if(growthProject(id)){const growth=registeredProject(id);return {id,growth,title:growth.title.zh,career_id:growth.career,content_version:growth.version,status:'local_trial',canStart:true,chapters:[],assets:[]};}
  const project = projects.find(row => row.id === id);
  if (!project) return null;
  return {
    id, project, title: project.title.zh, career_id: project.career,
    content_version: project.version, status: 'published',
    chapters: project.reading.map((chapter, index) => ({
      id: id + '-chapter-' + (index + 1), ordinal: index + 1, title: chapter.title.zh, body: chapter.body.zh
    })),
    assets: []
  };
}
export const localPracticeCatalog = {courses: learning.map(unit => {
  const {project, ...course} = localPracticeCourse(unit.id);
  if(!project)return course;
  return {...course, projectSummary: {
    title: project.title, brief: project.brief, outcome: project.outcome,
    case: project.sources.find(row => row.kind === 'case')
  }};
})};
