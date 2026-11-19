export function source(publisher, title, url, version) {
  return {publisher, title, url, ...(version ? {version} : {})};
}

export function tree(id, frameworks, branches, assessment) {
  return {id, version: 1, frameworks, branches, ...(assessment ? {assessment} : {})};
}

export function branch(id, title, purpose, leaves, project) {
  return {id, title, purpose, leaves, ...(project ? {project} : {})};
}

export function leaf(id, title, sources, lesson, exercise, checks) {
  return {id, version: 1, title, sources, lesson, exercise, checks};
}

// The first option in the authored record is the key. The library varies
// the public option order while keeping the two languages in sync.
export function check(zh, en) {
  const [prompt, correct, other, last, explanation] = zh;
  return {
    prompt: [prompt, en[0]], options: [[correct, en[1]], [other, en[2]], [last, en[3]]],
    explanation: [explanation, en[4]]
  };
}

