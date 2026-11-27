import catalog from '../course-packs/growth/catalog.json' with {type:'json'};

export const practiceRegistry = catalog.projects;
export const practiceRoutes = catalog.progression;
export const registeredProject = id => practiceRegistry.find(project => project.id === id);
export const growthProject = id => registeredProject(id)?.legacy === false;
export const growthLearning = practiceRegistry.filter(project => !project.legacy).map(project => ({
  id: project.id,
  title: project.title.zh,
  career: project.career,
  hours: project.estimatedHours[0],
  standard: project.estimatedHours[1],
  skill: project.skills[0] || project.career,
  product: project.outputs.zh.join('、'),
  prereq: project.prior || '',
  chapters: ['assignment', 'inputs', 'work', 'delivery']
}));
