import {advanceCheeseSpring} from './login-cheese-motion-state.js';

const clamp = (value, min = 0, max = 1) => Math.max(min, Math.min(max, value));
const finite = value => Number.isFinite(value) ? value : 0;
const smooth = (from, to, value) => {
  const t = clamp((value - from) / (to - from));
  return t * t * (3 - 2 * t);
};
const envelope = (time, start, up, down, end) => smooth(start, up, time) * (1 - smooth(down, end, time));
const FIXED_STEP = 1 / 240;
const WELCOME_SECONDS = 2.6;
const RECOIL_SECONDS = 1.78;
const PAGE_SECONDS = .8;
const AUTH_ERROR_SECONDS = 2.25;
const CHANNELS = ['read', 'sit', 'leftSupport', 'cover', 'clutch', 'greeting', 'wave', 'think', 'dance',
  'stepLeft', 'stepRight', 'rootX', 'rootY', 'rootZ', 'tiltX', 'turnY', 'tiltZ', 'eyesClosed', 'errorPeek'];
const credentialFeedback = event => event?.type === 'invalid-credentials' && event.id != null;

/**
 * Interruptible, model-space choreography for the source character's own rig.
 *
 * bookProgress is the single reversible transport path, not a second clock:
 * 0-.15 outside-silhouette drop/catch; .15-.63 closed-book transport;
 * .63-.94 cover opening; .94-1 hand retraction / reading preparation.
 * On exit these intervals run in reverse: retract -> fold -> carry -> stow.
 * pageTurn is an unbounded leaf phase; integer boundaries are the resting leaf.
 * The renderer must use the actual `sit` output for both book and source limbs.
 * rootY intentionally contains no seated-body lowering (the original rig owns it).
 */
export function createCheeseChoreography(initial = {}, {random = Math.random} = {}) {
  let state = {secret: false, focus: '', activity: 'idle', reaction: 0, error: false, ...initial};
  let clock = 0, accumulator = 0, idleStart = 0, previousMode = '';
  let welcome = state.secret || state.focus === 'email' ? null : {start: 0, end: WELCOME_SECONDS};
  let reaction = null, privacyTapAt = -Infinity;
  let lastFeedbackId = credentialFeedback(state.authFeedback) ? state.authFeedback.id : null;
  let authError = lastFeedbackId != null ? {phase: 'waiting', start: 0} : null;
  let pointerX = 0, pointerY = 0;
  let blinkStart = -Infinity;
  const blinkDelay = () => 3.4 + clamp(finite(random())) * 2.2;
  let nextBlink = blinkDelay();
  const position = Object.fromEntries(CHANNELS.map(key => [key, key === 'eyesClosed' && state.secret ? 1 : 0]));
  const velocity = Object.fromEntries(CHANNELS.map(key => [key, 0]));
  let bookProgress = 0, bookVelocity = 0;
  let pageIndex = 0, pageElapsed = -1, pageWait = .7, pageTurn = 0;
  let targets = {...position}, lastReduced = false, currentMode = 'idle', bookWanted = false;

  function requestedMode() {
    if (authError) return 'auth-error';
    if (credentialFeedback(state.authFeedback)) return 'privacy';
    if (state.secret) return 'privacy';
    if (state.error) return 'error';
    if (reaction) return reaction.phase === 'waiting' ? 'reaction-stow' : 'recoil';
    if (state.focus === 'email') return 'reading';
    if (welcome && clock < welcome.end) return 'welcome';
    if (state.activity === 'think' || state.activity === 'rest') return state.activity;
    return 'idle';
  }

  function update(next = {}) {
    const previous = state;
    state = {...state, ...next};
    if (credentialFeedback(state.authFeedback) && state.authFeedback.id !== lastFeedbackId) {
      lastFeedbackId = state.authFeedback.id;
      // A repeated render never replays the event. Rapid duplicate responses
      // acknowledge once rather than restarting a half-lowered hand.
      if (!authError) authError = {phase: 'waiting', start: clock};
      welcome = null; reaction = null;
    }
    if (Object.hasOwn(next, 'authFeedback') && next.authFeedback == null) authError = null;
    // No position, velocity or transport progress is touched on retarget.
    if (state.secret || state.error || state.focus === 'email' ||
      (state.activity !== previous.activity && state.activity !== 'idle')) welcome = null;
    if (state.secret || state.error) reaction = null;
    if (state.greeting && !previous.greeting && !state.secret && !state.error && !authError && !credentialFeedback(state.authFeedback) && state.focus !== 'email') {
      if (!welcome || clock >= welcome.end) welcome = {start: clock, end: clock + WELCOME_SECONDS};
    }
    if (!state.greeting && previous.greeting) welcome = null;
    if ((state.reaction || 0) !== (previous.reaction || 0)) {
      if (state.secret) privacyTapAt = clock;
      else if (!state.error && !reaction && !authError) {
        // A burst of taps acknowledges once and cannot reset or prolong recoil.
        reaction = {phase: 'waiting', start: clock}; welcome = null;
      }
    }
    if (previous.secret && !state.secret || previous.activity === 'rest' && state.activity !== 'rest') {
      blinkStart = -Infinity; nextBlink = clock + blinkDelay();
    }
  }

  function look(x = 0, y = 0) {
    pointerX = clamp(finite(x), -.6, .6);
    pointerY = clamp(finite(y), -.4, .4);
  }

  function integrate(dt, reduced) {
    clock += dt;
    // A static renderer schedules only this frame. Discard timed performances
    // so a greeting or tap cannot wait forever for a stopped animation clock.
    if (reduced) {welcome = null; reaction = null; authError = null; privacyTapAt = -Infinity;}
    if (authError?.phase === 'active' && clock - authError.start >= AUTH_ERROR_SECONDS && position.errorPeek < .008) authError = null;
    currentMode = requestedMode();
    if (currentMode !== previousMode) {
      if (currentMode === 'idle') idleStart = clock;
      previousMode = currentMode;
    }
    bookWanted = currentMode === 'reading';

    // Finish an already lifted page before closing the covers. Privacy closes
    // the eyes immediately; the book can finish its collision-free exit below.
    const canReadPage = bookWanted && bookProgress > .972 && position.sit > .98 && !reduced;
    if (pageElapsed >= 0) {
      pageElapsed = Math.min(PAGE_SECONDS, pageElapsed + dt);
      pageTurn = pageIndex + smooth(0, PAGE_SECONDS, pageElapsed);
      if (pageElapsed >= PAGE_SECONDS - 1e-9) {
        pageIndex++; pageTurn = pageIndex; pageElapsed = -1; pageWait = 2.3;
      }
    } else if (canReadPage) {
      pageWait -= dt;
      if (pageWait <= 0) {pageElapsed = 0; pageTurn = pageIndex;}
    } else if (!bookWanted) pageWait = .7;
    const finishLeaf = !bookWanted && pageElapsed >= 0 && bookProgress > .94;
    // Give the free hand time to withdraw while the covers remain open. Tying
    // this to the last 5% of the transport compressed it into three frames.
    const withdrawHand = !bookWanted && position.leftSupport > .015 && bookProgress > .94;
    // The two privacy hands return together before either one takes the book.
    const handsReturned = reduced || position.cover < .001;
    const bookTarget = bookWanted && handsReturned || !reduced && (finishLeaf || withdrawHand) ? 1 : 0;
    if (reduced) {bookProgress = bookTarget; bookVelocity = 0; pageElapsed = -1; pageTurn = pageIndex;}
    else {
      const frequency = bookTarget === 1 && bookVelocity >= 0 && bookProgress < .63 ? bookProgress < .15 ? 1.9 : 1.7 : 2.8;
      const advance = advanceCheeseSpring(bookProgress, bookVelocity, bookTarget, dt, frequency);
      bookProgress = clamp(advance.position); bookVelocity = advance.velocity;
      if (bookProgress === 0 && bookVelocity < 0 || bookProgress === 1 && bookVelocity > 0) bookVelocity = 0;
    }

    targets = Object.fromEntries(CHANNELS.map(key => [key, 0]));
    targets.read = smooth(.12, .63, bookProgress);
    targets.sit = smooth(.12, .60, bookProgress);
    targets.leftSupport = bookWanted && bookProgress > .94 ? 1 : 0;
    const safelyStowed = bookProgress < .01 && position.sit < .08;
    if (reaction?.phase === 'waiting' && safelyStowed) {
      reaction = {phase: 'active', start: clock}; currentMode = 'recoil';
    }
    if (reaction?.phase === 'active' && clock - reaction.start >= RECOIL_SECONDS &&
      position.clutch < .008 && Math.abs(position.rootZ) < .002) {
      reaction = null; currentMode = requestedMode();
    }
    const handSpace = 1 - smooth(.035, .18, bookProgress);
    const localIdle = Math.max(0, clock - idleStart);

    if (currentMode === 'privacy' || currentMode === 'auth-error') {
      targets.eyesClosed = 1;
      // Close the eyes immediately; both original hands lift only after the
      // book has disappeared and the source short legs have returned upright.
      targets.cover = reduced || bookProgress < .003 && position.sit < .08 ? 1 : 0;
      targets.turnY = .28;
      const tap = envelope(clock - privacyTapAt, 0, .13, .23, .55);
      targets.tiltZ = .008 * tap;
      if (authError && targets.cover === 1 && position.cover > .985 && position.eyesClosed > .999) {
        if (authError.phase === 'waiting') authError = {phase: 'active', start: clock};
        const t = Math.max(0, clock - authError.start);
        targets.errorPeek = envelope(t, 0, .26, 1.24, 1.78);
        const shake = envelope(t, .37, .55, 1.16, 1.40);
        targets.turnY += .055 * Math.sin((t - .37) * Math.PI * 4) * shake;
      }
    } else if (currentMode === 'error') {
      targets.tiltX = -.012; targets.tiltZ = -.012;
    } else if (currentMode === 'reading' || currentMode === 'reaction-stow') {
      targets.tiltX = .025 * position.sit;
      targets.turnY = .018 * position.sit;
    } else if (currentMode === 'welcome') {
      const t = Math.max(0, clock - welcome.start), fraction = clamp(t / WELCOME_SECONDS);
      targets.greeting = envelope(t, 0, .32, 2.00, WELCOME_SECONDS) * handSpace;
      targets.wave = targets.greeting * (.52 + .26 * Math.sin(fraction * Math.PI * 4));
      targets.tiltZ = -.025 * targets.greeting;
      targets.turnY = .035 * targets.greeting;
    } else if (currentMode === 'recoil') {
      const t = Math.max(0, clock - reaction.start);
      const recoil = envelope(t, 0, .34, .87, 1.65);
      targets.clutch = envelope(t, 0, .28, 1.02, 1.68) * handSpace;
      targets.rootZ = -.095 * recoil;
      targets.rootX = -.016 * recoil;
      targets.tiltX = -.065 * recoil;
      targets.turnY = -.08 * recoil;
      targets.eyesClosed = .66 * envelope(t, 0, .10, .34, .66);
      targets.stepLeft = envelope(t, .08, .20, .29, .43) + envelope(t, 1.00, 1.13, 1.24, 1.42);
      targets.stepRight = envelope(t, .32, .45, .56, .72) + envelope(t, 1.20, 1.32, 1.43, 1.60);
      targets.rootY = .006 * Math.max(targets.stepLeft, targets.stepRight);
    } else if (currentMode === 'rest') {
      targets.eyesClosed = 1; targets.tiltX = .025; targets.tiltZ = .012;
    } else {
      const cycle = localIdle % 14;
      targets.think = handSpace * (currentMode === 'think' ? .9 : envelope(cycle, 3.6, 4.2, 5.8, 6.5) * .82);
      targets.dance = currentMode === 'idle' ? envelope(cycle, 7.4, 8.0, 10.1, 10.8) * handSpace : 0;
      const danceClock = cycle - 7.4;
      targets.stepLeft = targets.dance * Math.max(0, Math.sin(danceClock * Math.PI * 2));
      targets.stepRight = targets.dance * Math.max(0, -Math.sin(danceClock * Math.PI * 2));
      targets.rootX = .018 * Math.sin(danceClock * Math.PI * 2) * targets.dance;
      targets.rootY = .008 * (targets.stepLeft + targets.stepRight);
      targets.tiltZ = -.028 * targets.think + .026 * Math.sin(danceClock * Math.PI * 2) * targets.dance;
      targets.tiltX = -.012 * targets.think;
      targets.turnY = .055 * targets.think;
    }

    const mayLook = currentMode === 'idle' || currentMode === 'welcome' || currentMode === 'think';
    if (mayLook && !reduced) {
      targets.turnY += pointerX * .045;
      targets.tiltX -= pointerY * .025;
    }
    const canBlink = currentMode !== 'privacy' && currentMode !== 'auth-error' && currentMode !== 'rest' && currentMode !== 'recoil';
    if (canBlink && !reduced && clock >= nextBlink) {
      blinkStart = clock; nextBlink = clock + blinkDelay();
    }
    if (canBlink && !reduced) {
      targets.eyesClosed = Math.max(targets.eyesClosed, envelope(clock - blinkStart, 0, .07, .12, .25));
    }
    if (!reduced && (currentMode === 'idle' || currentMode === 'think')) {
      targets.rootY += .00075 * (1 - Math.cos(localIdle * 1.1));
    }
    if (reduced) {
      for (const key of ['rootX', 'rootY', 'rootZ', 'tiltX', 'turnY', 'tiltZ', 'stepLeft', 'stepRight', 'dance', 'wave']) targets[key] = 0;
      targets.think = currentMode === 'think' ? .9 : 0;
    }
    for (const key of CHANNELS) {
      if (reduced) {position[key] = targets[key]; velocity[key] = 0;}
      else {
        // The short original arms travel round the body before meeting the
        // face. Give that full gesture time; eye privacy still closes first.
        const frequency = key === 'eyesClosed' ? 46 : key === 'cover' ? 4 : key.startsWith('step') ? 20 : 11;
        const advance = advanceCheeseSpring(position[key], velocity[key], targets[key], dt, frequency);
        position[key] = advance.position; velocity[key] = advance.velocity;
      }
    }
    for (const key of ['read', 'sit', 'cover', 'clutch', 'greeting', 'wave', 'think', 'dance', 'stepLeft', 'stepRight', 'eyesClosed', 'errorPeek']) {
      position[key] = clamp(position[key]);
    }
  }

  function snapshot() {
    const open = smooth(.63, .94, bookProgress);
    const carry = 1 - smooth(.15, .63, bookProgress);
    const stow = 1 - smooth(0, .15, bookProgress);
    const phase = bookProgress < .003 ? 'hidden' : bookWanted ?
      bookProgress < .12 ? 'drop' : bookProgress < .15 ? 'catch' : bookProgress < .63 ? 'carry-in' : bookProgress < .94 ? 'unfold' : 'reading' :
      pageElapsed >= 0 ? 'retract' : bookProgress > .94 ? 'retract' : bookProgress > .63 ? 'fold' : bookProgress > .15 ? 'carry' : 'stow';
    const mode = requestedMode();
    const recoilTime = reaction?.phase === 'active' ? Math.max(0, clock - reaction.start) : 0;
    const settling = Math.abs(bookProgress - (bookWanted ? 1 : 0)) > .0001 || Math.abs(bookVelocity) > .0001 ||
      CHANNELS.some(key => Math.abs(position[key] - targets[key]) > .00005 || Math.abs(velocity[key]) > .0002);
    const automatic = mode === 'idle' || mode === 'reading' || mode === 'think' || mode === 'welcome' || Boolean(reaction) || Boolean(authError);
    return {
      ...position, tiltY: position.turnY,
      eyesClosedRight: position.eyesClosed * (1 - smooth(.6, .94, position.errorPeek)),
      authErrorPhase: !authError ? 'none' : authError.phase === 'waiting' ? bookProgress > .003 ? 'stow' : 'cover' : clock - authError.start < 1.3 ? 'peek' : 'recover',
      bookProgress, bookOpen: open, bookCarry: carry, bookStow: stow,
      bookPresence: 1 - stow, bookHold: 1 - stow, bookPhase: phase,
      pageTurn, pageTurning: pageElapsed >= 0,
      handRead: position.read, handGreeting: position.wave, handCover: position.cover,
      handClutch: position.clutch, handThink: position.think,
      footForward: position.sit, footLiftLeft: position.stepLeft, footLiftRight: position.stepRight,
      motionState: mode, activity: mode === 'reaction-stow' ? 'stow-for-reaction' : mode,
      reactionPhase: reaction?.phase === 'waiting' ? 'stow' : reaction ? recoilTime < .4 ? 'impact' : recoilTime < .95 ? 'clutch' : 'recover' : 'none',
      reactionProgress: reaction?.phase === 'active' ? clamp(recoilTime / RECOIL_SECONDS) : 0,
      elapsed: clock, reducedMotion: lastReduced, velocity: {...velocity, bookProgress: bookVelocity},
      needsFrame: !lastReduced && (automatic || settling || pageElapsed >= 0),
    };
  }

  function step(seconds = 0, {reducedMotion = false} = {}) {
    // A fixed simulation partition makes 30/60/144 Hz follow the same path.
    // Background time is suspended by the scene owner; giant external deltas
    // are bounded here as a second guard, without replacing animation clocks.
    const dt = clamp(finite(seconds), 0, 1);
    lastReduced = Boolean(reducedMotion);
    accumulator += dt;
    let advanced = false;
    while (accumulator + 1e-10 >= FIXED_STEP) {
      integrate(FIXED_STEP, lastReduced); accumulator -= FIXED_STEP; advanced = true;
    }
    if (!advanced && lastReduced) integrate(0, true);
    return snapshot();
  }
  return {update, look, step, snapshot};
}
