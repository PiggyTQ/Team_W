import test from 'node:test';
import assert from 'node:assert/strict';
import {advanceCheeseSpring, createCheeseMotionController} from '../src/login-cheese-motion-state.js';

const keys = ['rootX', 'rootY', 'rootZ', 'tiltX', 'turnY', 'tiltZ', 'eyesClosed'];
const deterministic = state => createCheeseMotionController(state, {random: () => .5});
const near = (actual, expected, tolerance = 1e-10) => assert.ok(Math.abs(actual - expected) <= tolerance, actual + ' differs from ' + expected);
function advance(controller, seconds, rate = 120) {
  const count = Math.ceil(seconds * rate), dt = seconds / count;
  let pose;
  for (let i = 0; i < count; i++) pose = controller.step(dt);
  return pose;
}

test('privacy owns the actual pose even when every competing action is requested', () => {
  const controller = deterministic({focus: 'email'});
  advance(controller, .5);
  controller.update({secret: true, focus: 'email', error: true, greeting: true, reaction: 1, reactionActive: true, activity: 'think'});
  controller.look(.6, -.4);
  let pose = advance(controller, .65);
  assert.equal(pose.motionState, 'privacy');
  assert.ok(pose.eyesClosed > .999);
  near(pose.turnY, -.235, .0002);
  near(pose.rootX, 0); near(pose.rootZ, 0);
  controller.update({secret: true, reaction: 2, reactionActive: true, greeting: true, activity: 'rest'});
  pose = advance(controller, .35);
  assert.equal(pose.motionState, 'privacy');
  assert.equal(pose.reactionProgress, 0);
  assert.ok(pose.eyesClosed > .999);
  controller.update({secret: false, reaction: 2, reactionActive: true});
  assert.equal(controller.step(0).motionState, 'idle', 'suppressed gestures must not play after privacy ends');
});

test('error and email attention suppress lower priority responses without queueing them', () => {
  const controller = deterministic({error: true, focus: 'email', activity: 'rest'});
  assert.equal(controller.step(0).motionState, 'error');
  controller.update({focus: 'email', greeting: true, reaction: 1, reactionActive: true, activity: 'think'});
  let pose = advance(controller, .4);
  assert.equal(pose.motionState, 'reading');
  assert.equal(pose.activity, 'attention');
  assert.ok(pose.eyesClosed < .001);
  assert.ok(pose.turnY > .03);
  controller.update({greeting: true, reaction: 1, reactionActive: true});
  pose = controller.step(0);
  assert.equal(pose.motionState, 'idle', 'leaving an input must not replay an old click');
});

test('interrupting or reversing a pose preserves position and velocity at the boundary', () => {
  const controller = deterministic({focus: 'email'});
  controller.update({secret: true});
  const before = advance(controller, .08);
  assert.ok(before.velocity.turnY < -.2);
  controller.update({focus: 'email'});
  const boundary = controller.step(0);
  for (const key of keys) {
    near(boundary[key], before[key]);
    near(boundary.velocity[key], before.velocity[key]);
  }
  const after = controller.step(1 / 120);
  assert.ok(Math.abs(after.turnY - boundary.turnY) < .02, 'a reversal must continue from its moving pose');
  const settled = advance(controller, .8);
  near(settled.turnY, .034, .00001);
  assert.ok(settled.eyesClosed < .00001);
});

test('repeated taps coalesce rather than restarting an unfinished acknowledgement', () => {
  const controller = deterministic();
  advance(controller, 2);
  controller.update({reaction: 1, reactionActive: true});
  const first = advance(controller, .3);
  controller.update({reaction: 2, reactionActive: true});
  const repeated = controller.step(0);
  near(repeated.reactionProgress, first.reactionProgress);
  for (const key of keys) near(repeated.velocity[key], first.velocity[key]);
  assert.equal(advance(controller, .55).motionState, 'idle', 'extra taps must not postpone recovery');
  controller.update({reaction: 3, reactionActive: true});
  assert.equal(controller.step(0).motionState, 'recoil', 'a new tap after recovery can acknowledge again');
});

test('rapid email/privacy flips keep bounded motion and finish at the final requested state', () => {
  const controller = deterministic({focus: 'email'});
  let before = controller.step(0);
  for (let i = 0; i < 70; i++) {
    controller.update(i % 2 ? {focus: 'email'} : {secret: true});
    const boundary = controller.step(0);
    for (const key of keys) {
      near(boundary[key], before[key]);
      near(boundary.velocity[key], before.velocity[key]);
    }
    const after = controller.step(.013);
    assert.ok(Math.abs(after.turnY - boundary.turnY) < .03);
    assert.ok(after.eyesClosed >= 0 && after.eyesClosed <= 1);
    before = after;
  }
  controller.update({secret: true});
  const final = advance(controller, .85);
  assert.equal(final.motionState, 'privacy');
  near(final.turnY, -.235, .00001);
  assert.ok(final.eyesClosed > .9999);
});

test('the spring has the same physical result across frame partitions', () => {
  const whole = deterministic({focus: 'email'}), pieces = deterministic({focus: 'email'});
  for (const controller of [whole, pieces]) {
    advance(controller, .17); controller.update({secret: true});
  }
  const a = whole.step(.65), b = advance(pieces, .65, 144);
  for (const key of keys) {
    near(a[key], b[key], 1e-11); near(a.velocity[key], b.velocity[key], 1e-11);
  }
});

test('negative and invalid time do not advance or corrupt the controller', () => {
  const controller = deterministic({secret: true});
  const before = advance(controller, .12);
  for (const invalid of [-1, NaN, Infinity, -Infinity]) {
    const after = controller.step(invalid);
    for (const key of keys) {
      near(after[key], before[key]); near(after.velocity[key], before.velocity[key]);
    }
    near(after.elapsed, before.elapsed);
  }
  const huge = controller.step(1000);
  for (const key of keys) assert.ok(Number.isFinite(huge[key]) && Number.isFinite(huge.velocity[key]));
  assert.ok(huge.eyesClosed > .99999);
});

test('a critically damped transition approaches its target without overshoot or frame dependence', () => {
  let position = 0, velocity = 0, previous = 0;
  for (let i = 0; i < 120; i++) {
    const next = advanceCheeseSpring(position, velocity, 1, 1 / 120);
    position = next.position; velocity = next.velocity;
    assert.ok(position >= previous && position <= 1);
    previous = position;
  }
  const once = advanceCheeseSpring(0, 0, 1, 1);
  near(position, once.position); near(velocity, once.velocity);
  assert.ok(position > .9999);
});

test('reduced motion supplies static semantic poses and schedules no autonomous frames', () => {
  const controller = deterministic();
  let pose = controller.step(0, {reducedMotion: true});
  assert.equal(pose.motionState, 'welcome'); assert.equal(pose.needsFrame, false);
  controller.update({activity: 'rest'});
  pose = controller.step(0, {reducedMotion: true});
  assert.equal(pose.motionState, 'rest'); near(pose.eyesClosed, 1);
  const still = controller.step(10, {reducedMotion: true});
  for (const key of keys) near(still[key], pose[key]);
  assert.equal(still.needsFrame, false);
  controller.update({activity: 'think'});
  pose = controller.step(0, {reducedMotion: true});
  assert.equal(pose.motionState, 'think'); assert.equal(pose.needsFrame, false);
  assert.ok(pose.tiltZ < -.02); near(pose.eyesClosed, 0);
  controller.update({secret: true});
  pose = controller.step(0, {reducedMotion: true});
  near(pose.eyesClosed, 1); near(pose.turnY, -.235);
  assert.equal(pose.needsFrame, false);
});

test('keyboard interaction no longer bypasses smooth motion with an instant flag', () => {
  const controller = deterministic({focus: 'email'});
  const before = controller.step(0);
  controller.update({activity: 'think', instant: true});
  const boundary = controller.step(0);
  for (const key of keys) near(boundary[key], before[key]);
  const moving = controller.step(1 / 60);
  assert.ok(moving.tiltZ < 0 && moving.tiltZ > -.023);
  assert.equal(moving.needsFrame, true);
});

test('idle stays small and never invents a walk, dance, body scale or sideways travel', () => {
  const controller = deterministic();
  let maxY = 0, maxTurn = 0, seenBlink = false;
  for (let i = 0; i < 60 * 28; i++) {
    const pose = controller.step(1 / 60);
    if (i < 120) continue;
    assert.equal(pose.motionState, 'idle');
    near(pose.rootX, 0); near(pose.rootZ, 0);
    assert.ok(!Object.hasOwn(pose, 'scale'));
    maxY = Math.max(maxY, Math.abs(pose.rootY)); maxTurn = Math.max(maxTurn, Math.abs(pose.turnY));
    seenBlink ||= pose.eyesClosed > .5;
  }
  assert.ok(maxY > .0005 && maxY <= .0015);
  assert.ok(maxTurn < .002);
  assert.ok(seenBlink, 'quiet idle should still blink occasionally');
});

test('a paused local clock does not skip a gesture while no frames are rendered', () => {
  const controller = deterministic();
  advance(controller, 2); controller.update({reaction: 1, reactionActive: true});
  const moving = advance(controller, .22);
  for (let i = 0; i < 20; i++) {
    const paused = controller.step(0);
    near(paused.reactionProgress, moving.reactionProgress);
    for (const key of keys) near(paused[key], moving[key]);
  }
  assert.equal(advance(controller, .7).motionState, 'idle');
});

test('explicit rest settles into a static original pose and wakes without resetting position', () => {
  const controller = deterministic({activity: 'think'});
  advance(controller, 2);
  controller.update({activity: 'rest'});
  const resting = advance(controller, 2);
  assert.equal(resting.motionState, 'rest');
  assert.equal(resting.needsFrame, false);
  near(resting.eyesClosed, 1, .000001);
  near(resting.rootY, 0, .000001);
  controller.update({activity: 'idle'});
  const boundary = controller.step(0);
  for (const key of keys) near(boundary[key], resting[key]);
  assert.equal(boundary.needsFrame, true);
  assert.ok(advance(controller, .5).eyesClosed < .001);
});
