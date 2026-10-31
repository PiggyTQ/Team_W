import fs from 'node:fs';
let source=fs.readFileSync('deploy/backend-command-smoke.mjs','utf8').replaceAll('\r\n','\n');
function insert(before,extra){if(source.split(before).length!==2)throw Error('Ambiguous smoke insertion');source=source.replace(before,extra+'\n'+before);}
insert(" await put({budget:4,goal:'data'",` const firstContext=(await request('/api/agent/personal-context')).body;
 assert.equal(firstContext.automaticModelCalls,false);assert.ok(firstContext.adviceKey);
 const firstCard=firstContext.suggestions[0];assert.equal((await request('/api/agent/suggestions/feedback',{adviceKey:firstContext.adviceKey,suggestionId:firstCard.id,status:'dismissed'})).status,200);
 await put({aiDraft:'PRIVATE_UNSENT_DRAFT'});assert.equal((await request('/api/agent/personal-context')).body.contextRevision,firstContext.contextRevision);check('ordinary drafts do not refresh context or call a model');`);
insert(" await command('assessment.create');",` const updatedContext=(await request('/api/agent/suggestions')).body;
 assert.notEqual(updatedContext.adviceKey,firstContext.adviceKey);assert.ok(updatedContext.suggestions.some(s=>s.id==='plan-small-step'));
 assert.equal((await request('/api/agent/suggestions/feedback',{adviceKey:firstContext.adviceKey,suggestionId:firstCard.id,status:'read'})).status,409);
 assert.equal((await request('/api/agent/personal-context',undefined,'GET',{'X-Account-Id':'different-synthetic-owner'})).status,409);
 assert.equal(JSON.stringify(updatedContext).includes('PRIVATE_UNSENT_DRAFT'),false);check('events update personal advice and reject stale feedback and foreign account access');`);
insert(" const before=await saved(),off=",` const exported=(await request('/api/workspace/export')).body;assert.ok(exported.personalContext.events.length>0);
 assert.equal(JSON.stringify(exported.personalContext).includes('PRIVATE_UNSENT_DRAFT'),false);check('event metadata exports without draft or source bodies');`);
insert(' report.passed=true;',` assert.equal((await request('/api/agent/context-events')).body.items.length,0);check('workspace clear purges context events and suggestion feedback');`);
fs.writeFileSync('deploy/personal-context-smoke.mjs',source);
