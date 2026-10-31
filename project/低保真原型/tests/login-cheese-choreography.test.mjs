import test from 'node:test';
import assert from 'node:assert/strict';
import {createCheeseChoreography} from '../src/login-cheese-choreography.js';

const make = initial => createCheeseChoreography(initial, {random: () => .5});
function run(controller, seconds, hz = 60, options) {
  const frames = Math.round(seconds * hz);
  let pose;
  for (let i = 0; i < frames; i++) pose = controller.step(1 / hz, options);
  return pose;
}
const near = (a, b, epsilon = 1e-8) => assert.ok(Math.abs(a - b) <= epsilon, `${a} ≠ ${b}`);

test('initial greeting is followed by idle thought and small alternating dance steps', () => {
  const c = make();
  let p = run(c, .7);
  assert.equal(p.motionState, 'welcome'); assert.ok(p.greeting > .8); assert.ok(p.wave > .1);
  run(c, 2.2);
  p = run(c, 4.8);
  assert.equal(p.motionState, 'idle'); assert.ok(p.think > .6);
  const steps = [];
  for (let i = 0; i < 260; i++) steps.push(c.step(1 / 60));
  assert.ok(steps.some(pose => pose.stepLeft > .3));
  assert.ok(steps.some(pose => pose.stepRight > .3));
  assert.ok(steps.every(pose => Math.abs(pose.rootX) < .025 && pose.rootY < .013));
});

test('email sits on the original rig and continuously turns complete pages', () => {
  const c = make({focus: 'email'});
  let p = run(c, 3);
  assert.equal(p.motionState, 'reading'); assert.ok(p.read > .99); assert.ok(p.sit > .99);
  assert.ok(p.bookOpen > .99); assert.equal(p.bookCarry, 0);
  const pages = [];
  for (let i = 0; i < 300; i++) pages.push(c.step(1 / 60));
  assert.ok(pages.some(pose => pose.pageTurn % 1 > .2 && pose.pageTurn % 1 < .8));
  assert.ok(pages.at(-1).pageTurn >= 2);
  assert.ok(pages.every(pose => pose.rootY === 0), 'body lowering belongs only to the source rig');
});

test('privacy closes eyes before book stow and folds before carrying across the silhouette', () => {
  const c = make({focus: 'email'}); run(c, 3);
  c.update({secret: true, focus: 'password'});
  let p = run(c, .2);
  assert.equal(p.motionState, 'privacy'); assert.ok(p.eyesClosed > .99);
  assert.ok(p.bookPresence > .9); assert.ok(p.cover < .01, 'hands do not leave a visible book to cover eyes');
  const poses = [];
  for (let i = 0; i < 300; i++) poses.push(c.step(1 / 60));
  assert.ok(poses.some(pose => pose.bookPhase === 'fold'));
  assert.ok(poses.some(pose => pose.bookPhase === 'carry'));
  assert.ok(poses.every(pose => pose.bookCarry === 0 || pose.bookOpen === 0));
  assert.ok(poses.every(pose => pose.bookStow === 0 || pose.bookCarry === 1));
  p = poses.at(-1); assert.ok(p.bookPresence < .001); assert.ok(p.cover > .99);
  assert.ok(p.eyesClosed > .999);
});

test('an already lifted page finishes before the book closes', () => {
  const c = make({focus: 'email'});
  let p;
  for (let i = 0; i < 300; i++) {
    p = c.step(1 / 60);
    if (p.pageTurning && p.pageTurn % 1 > .25) break;
  }
  assert.ok(p.pageTurning);
  const before = p.pageTurn;
  c.update({secret: true});
  p = run(c, .1);
  assert.ok(p.bookOpen > .999); assert.ok(p.pageTurn > before); assert.ok(p.eyesClosed > .9);
  p = run(c, 3.5);
  assert.equal(p.pageTurning, false); assert.ok(p.bookPresence < .001);
});

test('both privacy hands wait for full stow and return before the next book pickup', () => {
  const c = make({focus: 'email'}); run(c, 4);
  c.update({secret: true, focus: 'password'});
  let raised = null;
  for (let frame = 0; frame < 360; frame++) {
    const p = c.step(1 / 60);
    if (p.cover > .005 && raised === null) raised = p;
    if (p.bookPresence > .002) assert.ok(p.cover < .005, 'both hands must still support/stow the visible book');
  }
  assert.ok(raised && raised.bookPresence < .002 && raised.sit < .08);
  assert.ok(c.snapshot().cover > .999);
  c.update({secret: false, focus: 'email'});
  let nextBook = null;
  for (let frame = 0; frame < 360; frame++) {
    const p = c.step(1 / 60);
    if (p.bookPresence > .002 && nextBook === null) nextBook = p;
  }
  assert.ok(nextBook && nextBook.cover < .025, 'release the two eye covers before picking up a visible book');
  assert.equal(c.snapshot().motionState, 'reading');
  assert.ok(c.snapshot().bookOpen > .99);
});

test('the free hand withdraws gradually before the covers fold', () => {
  const c = make({focus: 'email'}); run(c, 4);
  assert.ok(c.snapshot().leftSupport > .99);
  c.update({secret: true});
  let previous = c.snapshot().leftSupport, maximumStep = 0, firstFold = null;
  for (let frame = 0; frame < 240; frame++) {
    const pose = c.step(1 / 60);
    maximumStep = Math.max(maximumStep, Math.abs(pose.leftSupport - previous)); previous = pose.leftSupport;
    if (pose.bookOpen < .999 && firstFold === null) firstFold = {time: frame / 60, support: pose.leftSupport};
  }
  assert.ok(maximumStep < .08, 'a released original hand must not snap off the cover');
  assert.ok(firstFold.time > .3 && firstFold.support < .015, 'withdraw the hand before the cover sweeps through it');
});

test('rapid focus reversals preserve pose and velocity and retrace the same book path', () => {
  const c = make({focus: 'email'}); run(c, .4);
  const before = c.snapshot();
  c.update({focus: 'password', secret: true});
  const unchanged = c.step(0);
  for (const key of ['bookProgress', 'sit', 'read', 'rootX', 'rootY', 'rootZ', 'eyesClosed']) {
    near(unchanged[key], before[key]); near(unchanged.velocity[key], before.velocity[key]);
  }
  run(c, .15);
  const back = c.snapshot(); c.update({focus: 'email', secret: false});
  const reversed = c.step(0);
  near(reversed.bookProgress, back.bookProgress); near(reversed.velocity.bookProgress, back.velocity.bookProgress);
  const p = run(c, 3); assert.ok(p.bookOpen > .999); assert.ok(p.sit > .999);
});

test('clicking during email first stows the book, recoils once, then resumes reading', () => {
  const c = make({focus: 'email'}); run(c, 3);
  c.update({reaction: 1, reactionActive: true});
  let p = run(c, .15);
  assert.equal(p.motionState, 'reaction-stow'); assert.equal(p.clutch, 0); assert.equal(p.rootZ, 0);
  const poses = [];
  for (let i = 0; i < 420; i++) {
    if (i === 30) c.update({reaction: 2});
    if (i === 60) c.update({reactionActive: false});
    poses.push(c.step(1 / 60));
  }
  assert.ok(poses.some(pose => pose.clutch > .7 && pose.rootZ < -.07));
  assert.ok(poses.every(pose => pose.clutch < .01 || pose.bookPresence < .03));
  assert.ok(poses.every(pose => pose.rootZ > -.11 && pose.rootZ < .001));
  p = poses.at(-1); assert.equal(p.motionState, 'reading'); assert.ok(p.read > .99); assert.ok(p.bookOpen > .99);
  assert.ok(Math.abs(p.rootZ) < .001);
});

test('privacy cannot be reopened by taps, greeting, reaction timers or page focus', () => {
  const c = make({secret: true, focus: 'password'}); run(c, 2);
  c.update({greeting: true, reaction: 1, activity: 'think'});
  const poses = [];
  for (let i = 0; i < 120; i++) {
    if (i === 30) c.update({reaction: 2, reactionActive: false, focus: 'email'});
    poses.push(c.step(1 / 60));
  }
  assert.ok(poses.every(pose => pose.motionState === 'privacy' && pose.eyesClosed > .999));
  assert.ok(poses.every(pose => pose.bookPresence === 0 && pose.clutch === 0));
});

test('30, 60 and 144 Hz use identical local simulation time and source-rig transforms', () => {
  const outputs = [30, 60, 144].map(hz => {
    const c = make({focus: 'email'}); run(c, 1, hz);
    c.update({secret: true, focus: 'password'}); run(c, .5, hz);
    c.update({secret: false, focus: 'email'}); return run(c, 2, hz);
  });
  for (const p of outputs.slice(1)) {
    for (const key of ['elapsed', 'bookProgress', 'sit', 'read', 'eyesClosed', 'turnY', 'pageTurn']) near(p[key], outputs[0][key]);
  }
});

test('reduced motion keeps state indication while suppressing dance, stepping and automatic page turns', () => {
  const c = make({focus: 'email'});
  let p = run(c, 2, 60, {reducedMotion: true});
  assert.equal(p.sit, 1); assert.equal(p.bookOpen, 1); assert.equal(p.pageTurn, 0);
  assert.equal(p.needsFrame, false);
  c.update({secret: true, focus: 'password'});
  p = c.step(0, {reducedMotion: true});
  assert.equal(p.eyesClosed, 1); assert.equal(p.bookPresence, 0);
  c.update({secret: false, focus: '', activity: 'idle'});
  p = run(c, 12, 60, {reducedMotion: true});
  assert.equal(p.dance, 0); assert.equal(p.stepLeft, 0); assert.equal(p.rootX, 0); assert.equal(p.rootY, 0);
});

test('negative and non-finite frame deltas cannot advance or corrupt the pose', () => {
  const c = make(); run(c, .4); const before = c.snapshot();
  for (const delta of [-1, NaN, Infinity, -Infinity]) {
    const p = c.step(delta); near(p.elapsed, before.elapsed); near(p.wave, before.wave);
    assert.ok(Object.values(p.velocity).every(Number.isFinite));
  }
});

test('reduced motion resolves greeting and taps in the single frame a static renderer schedules', () => {
  const c = make();
  const draw = () => c.step(0, {reducedMotion: true});
  let p = draw();
  assert.equal(p.motionState, 'idle'); assert.equal(p.needsFrame, false);
  c.update({focus: 'email'}); p = draw();
  assert.equal(p.motionState, 'reading'); assert.equal(p.bookOpen, 1); assert.equal(p.leftSupport, 1);
  for (const reaction of [1, 2]) {
    c.update({reaction}); p = draw();
    assert.equal(p.motionState, 'reading'); assert.equal(p.bookOpen, 1); assert.equal(p.clutch, 0);
    assert.equal(p.needsFrame, false); assert.equal(p.reactionPhase, 'none');
  }
  c.update({secret: true, focus: 'password', reaction: 3}); p = draw();
  assert.equal(p.motionState, 'privacy'); assert.equal(p.eyesClosed, 1); assert.equal(p.bookPresence, 0);
  c.update({secret: false, focus: '', greeting: true, reaction: 4}); p = draw();
  assert.equal(p.motionState, 'idle'); assert.equal(p.clutch, 0); assert.equal(p.needsFrame, false);
});

test('a credential result peeks with one eye once, then returns to the privacy pose', () => {
  const c = make({focus: 'email'}); run(c, 3);
  c.update({secret: false, focus: '', error: true, authFeedback: {type: 'invalid-credentials', id: 1}});
  const poses = [];
  for (let i = 0; i < 600; i++) poses.push(c.step(1 / 60));
  const peeks = poses.filter(p => p.errorPeek > .8);
  assert.ok(peeks.length > 12, 'one eye should remain visible long enough to read the feedback');
  assert.ok(peeks.every(p => p.eyesClosed > .999 && p.eyesClosedRight < .5 && p.cover > .985 && p.bookPresence < .002));
  const peakYaw = peeks.map(p => p.turnY);
  assert.ok(Math.max(...peakYaw) - Math.min(...peakYaw) > .02, 'the gentle head shake must be visible');
  let p = poses.at(-1); assert.equal(p.authErrorPhase, 'none'); assert.equal(p.motionState, 'privacy');
  assert.ok(p.errorPeek < .001 && p.eyesClosedRight > .999 && p.cover > .999);
  c.update({authFeedback: {type: 'invalid-credentials', id: 1}});
  assert.ok(run(c, 3).errorPeek < .001, 'the same server result cannot replay on a rerender');
  c.update({authFeedback: {type: 'invalid-credentials', id: 2}});
  p = run(c, .8); assert.ok(p.errorPeek > .8, 'a later failed attempt gets its own feedback');
  const before = c.snapshot(); c.update({secret: true, authFeedback: null});
  near(c.step(0).errorPeek, before.errorPeek);
  p = run(c, 1); assert.ok(p.errorPeek < .001 && p.eyesClosedRight > .999);
});

test('ordinary service errors never peek and reduced motion keeps static privacy', () => {
  const ordinary = make({error: true});
  const p = run(ordinary, 4); assert.equal(p.errorPeek, 0); assert.equal(p.authErrorPhase, 'none');
  const reduced = make({authFeedback: {type: 'invalid-credentials', id: 1}});
  const quiet = reduced.step(0, {reducedMotion: true});
  assert.equal(quiet.errorPeek, 0); assert.equal(quiet.turnY, 0); assert.equal(quiet.eyesClosedRight, 1);
  assert.equal(quiet.needsFrame, false);
});
