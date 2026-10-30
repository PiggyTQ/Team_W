import React, {useEffect, useRef, useState} from 'react';

/** The login companion is local decoration; it never receives field values. */
export default function LoginNookScene({secret = false, focus, greeting = false, reaction = 0, reactionActive = false, language, onReact, onMotionState, label, activity = 'idle', error = false, authFeedback = null}) {
  const mount = useRef(null);
  const engine = useRef(null);
  const latest = useRef(null);
  const [status, setStatus] = useState('loading');
  const pose = secret ? 'privacy' : error ? 'attentive' : greeting ? 'greeting' : focus === 'email' ? 'reading'
    : activity === 'rest' ? 'rest' : activity === 'think' ? 'think' : 'idle';
  latest.current = {secret, focus, greeting, reaction, reactionActive, activity, error, authFeedback, language, onMotionState};

  useEffect(() => {
    let disposed = false;
    const fail = error => {
      if (disposed) return;
      if (mount.current) mount.current.dataset.failureReason = error?.message || 'WebGL unavailable';
      console.warn('Cheese companion fallback:', error?.message || 'WebGL unavailable');
      engine.current?.dispose();
      engine.current = null;
      setStatus('fallback');
      latest.current?.onMotionState?.('fallback');
    };
    import('./login-cheese-engine.js').then(({createLoginCheeseScene}) => {
      if (disposed || !mount.current) return;
      engine.current = createLoginCheeseScene(mount.current, latest.current, fail,
        () => {if (!disposed) setStatus('ready');});
    }).catch(fail);
    return () => {
      disposed = true;
      engine.current?.dispose();
      engine.current = null;
    };
  }, []);

  useEffect(() => {
    engine.current?.update(latest.current);
  }, [secret, focus, greeting, reaction, reactionActive, language, activity, error, authFeedback, onMotionState]);

  function retainInputFocus(event) {
    // A playful tap must not blur a field or end password privacy.
    // Keyboard navigation still focuses and activates this ordinary button.
    if (event.button === 0 && document.activeElement?.matches('.auth-form input')) event.preventDefault();
  }

  return <button className="auth-nook-scene" type="button" onPointerDown={retainInputFocus} onClick={onReact} aria-label={label}
    data-renderer={status} data-model="source-articulated-cheese-glb" data-pose={pose} data-secret={secret}>
    <span className="auth-nook-canvas" ref={mount} aria-hidden="true" />
    {status !== 'ready' && <span className="cheese-scene-fallback" aria-hidden="true">
      <img src="/mascot/cheese-source-poster.png" alt="" draggable="false" />
    </span>}
  </button>;
}

