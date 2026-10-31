const clamp = (value, min, max) => Math.min(max, Math.max(min, value));
const finite = value => Number.isFinite(value) ? value : 0;
const CHANNELS = ['rootX', 'rootY', 'rootZ', 'tiltX', 'turnY', 'tiltZ', 'eyesClosed'];
const WELCOME_SECONDS = 1.65;
const REACTION_SECONDS = .82;

// Analytic critically damped spring. Retargeting changes neither its position
// nor velocity, including when an input interrupts an unfinished gesture.
export function advanceCheeseSpring(position, velocity, target, seconds, frequency = 16) {
  const dt = Math.max(0, finite(seconds));
  const omega = Math.max(.01, finite(frequency));
  const displacement = position - target, carry = velocity + omega * displacement;
  const decay = Math.exp(-omega * dt);
  return {
    position: target + (displacement + carry * dt) * decay,
    velocity: (velocity - omega * carry * dt) * decay,
  };
}

/** One pose controller for the unchanged source model, in model-space units. */
export function createCheeseMotionController(initial = {}, {random = Math.random} = {}) {
  let state = {...initial}, clock = 0, enteredAt = 0, currentMode = '';
  let transient = {kind: 'welcome', start: 0, end: WELCOME_SECONDS};
  let pointerX = 0, pointerY = 0, blinkStart = -Infinity;
  const nextBlinkDelay = () => 3.8 + clamp(finite(random()), 0, 1) * 2.4;
  let nextBlink = nextBlinkDelay();
  const position = Object.fromEntries(CHANNELS.map(key => [key, key === 'eyesClosed' && initial.secret ? 1 : 0]));
  const velocity = Object.fromEntries(CHANNELS.map(key => [key, 0]));
  let targets = {...position}, lastSnapshot;

  function priorityMode() {
    if (state.secret) return 'privacy';
    if (state.error) return 'error';
    if (state.focus === 'email') return 'reading';
    if (transient && clock < transient.end) return transient.kind;
    if (state.activity === 'think' || state.activity === 'rest') return state.activity;
    return 'idle';
  }
  function cancelBlockedGestures() {
    if (state.secret || state.error || state.focus === 'email') transient = null;
  }
  cancelBlockedGestures();

  function update(next = {}) {
    const previous = state;
    state = {...next};
    if (state.activity !== previous.activity && (state.activity === 'think' || state.activity === 'rest')) transient = null;
    if (!state.greeting && previous.greeting && transient?.kind === 'welcome') transient = null;
    cancelBlockedGestures();
    const blocked = state.secret || state.error || state.focus === 'email';
    if (!blocked && state.greeting && !previous.greeting) {
      if (transient?.kind !== 'welcome' || clock >= transient.end) {
        transient = {kind: 'welcome', start: clock, end: clock + WELCOME_SECONDS};
      }
    }
    if (state.reactionActive === false && transient?.kind === 'recoil') transient = null;
    if (!blocked && state.reactionActive !== false && (state.reaction || 0) !== (previous.reaction || 0)) {
      // Several taps acknowledge one interaction; they never restart the
      // moving pose at the impact keyframe or postpone its recovery.
      if (transient?.kind !== 'recoil' || clock >= transient.end) {
        transient = {kind: 'recoil', start: clock, end: clock + REACTION_SECONDS};
      }
    }
    if ((previous.secret && !state.secret) || (previous.activity === 'rest' && state.activity !== 'rest')) {
      blinkStart = -Infinity; nextBlink = clock + nextBlinkDelay();
    }
  }

  function look(x = 0, y = 0) {
    pointerX = clamp(finite(x), -.6, .6);
    pointerY = clamp(finite(y), -.4, .4);
  }

  function step(seconds = 0, {reducedMotion = false} = {}) {
    const dt = Math.max(0, finite(seconds));
    clock += dt;
    const reduced = Boolean(reducedMotion), mode = priorityMode();
    if (mode !== currentMode) {currentMode = mode; enteredAt = clock;}
    const localTime = Math.max(0, clock - enteredAt);
    targets = Object.fromEntries(CHANNELS.map(key => [key, 0]));
    const awake = mode !== 'privacy' && mode !== 'rest';
    if (!reduced && awake && clock >= nextBlink) {
      blinkStart = clock; nextBlink = clock + nextBlinkDelay();
    }
    // No skeleton is invented: the authored hands, frames and feet remain
    // still. Feedback is a small whole-character change of attention.
    if (mode === 'privacy') {
      targets.eyesClosed = 1; targets.turnY = -.235; targets.tiltX = .008;
    } else if (mode === 'error') {
      targets.tiltX = -.008; targets.tiltZ = -.009;
    } else if (mode === 'reading') {
      targets.turnY = .034; targets.tiltX = .010; targets.tiltZ = -.006;
    } else if (mode === 'think') {
      targets.turnY = .020; targets.tiltX = .006; targets.tiltZ = -.023;
    } else if (mode === 'rest') {
      targets.tiltX = .014; targets.tiltZ = .009; targets.eyesClosed = 1;
    } else if (mode === 'welcome') {
      const elapsed = clock - transient.start;
      const progress = clamp(elapsed / WELCOME_SECONDS, 0, 1);
      const envelope = Math.sin(progress * Math.PI) ** 2;
      targets.tiltX = reduced ? -.008 : -.020 * Math.sin(progress * Math.PI * 2) * envelope;
      targets.turnY = reduced ? .012 : .026 * envelope;
    } else if (mode === 'recoil') {
      const progress = clamp((clock - transient.start) / REACTION_SECONDS, 0, 1);
      const acknowledgement = reduced ? .7 : Math.sin(progress * Math.PI) ** 2;
      targets.tiltX = -.018 * acknowledgement; targets.tiltZ = .014 * acknowledgement;
    }
    if (mode !== 'privacy' && mode !== 'rest' && !reduced) {
      targets.turnY += pointerX * .045; targets.tiltX -= pointerY * .020;
      const blinkTime = clock - blinkStart;
      if (blinkTime >= 0 && blinkTime < .24) {
        const close = clamp(blinkTime / .08, 0, 1);
        const open = clamp((blinkTime - .11) / .13, 0, 1);
        targets.eyesClosed = Math.max(targets.eyesClosed, close * close * (3 - 2 * close) * (1 - open * open * (3 - 2 * open)));
      }
    }
    if (!reduced && awake && mode !== 'recoil' && mode !== 'welcome') {
      // At most 1.5 mm. No scale/deformation of the cheese or its short feet.
      targets.rootY = .00075 * (1 - Math.cos(localTime * 1.1));
    }
    for (const key of CHANNELS) {
      if (reduced) {position[key] = targets[key]; velocity[key] = 0;}
      else {
        const next = advanceCheeseSpring(position[key], velocity[key], targets[key], dt, key === 'eyesClosed' ? 38 : 16);
        position[key] = next.position; velocity[key] = next.velocity;
      }
    }
    position.eyesClosed = clamp(position.eyesClosed, 0, 1);
    const settling = CHANNELS.some(key => Math.abs(position[key] - targets[key]) > .00001 || Math.abs(velocity[key]) > .0001);
    lastSnapshot = {
      ...position, velocity: {...velocity}, motionState: mode,
      activity: mode === 'reading' ? 'attention' : mode,
      elapsed: localTime, reactionProgress: transient?.kind === 'recoil' ? clamp((clock - transient.start) / REACTION_SECONDS, 0, 1) : 0,
      // Privacy and rest become static after settling. Awake states schedule blinks;
      // reduced motion never has an autonomous loop.
      needsFrame: !reduced && (settling || (mode !== 'privacy' && mode !== 'rest')),
    };
    return lastSnapshot;
  }
  return {update, look, step, snapshot: () => lastSnapshot || step(0)};
}
