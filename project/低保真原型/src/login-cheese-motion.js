import * as THREE from 'three';
import {GLTFLoader} from 'three/addons/loaders/GLTFLoader.js';
import {createCheeseEyelids} from './login-cheese-eyelids.js';
import {createCheeseChoreography} from './login-cheese-choreography.js';
import {restoreCheeseMaterialDetails} from './login-cheese-materials.js';
import {createSourceCheeseRig} from './login-cheese-source-rig.js';
import {createCheeseSourceBook} from './login-cheese-source-book.js';

const MODEL = '/mascot/cheese-source-articulated.glb?v=continuous-mirrored-hand-20261027';

/** Complete source-derived anatomy and materials, with one pose clock. */
export function createLoginCheeseScene(host, initial = {}, onFailure, onReady) {
  host.dataset.modelLoaded = 'false'; delete host.dataset.failureReason;
  host.dataset.modelSource = 'cheese-source-articulated';
  host.dataset.studio = 'source-softbox-material-20261025';
  const scene = new THREE.Scene(), avatar = new THREE.Group(); scene.add(avatar);
  const eyelids = createCheeseEyelids();
  const controller = createCheeseChoreography(initial);
  const book = createCheeseSourceBook(); avatar.add(book.object);
  const reduce = matchMedia('(prefers-reduced-motion: reduce)');
  const fine = matchMedia('(hover: hover) and (pointer: fine)');
  const cleanups = [];
  let renderer, environment, resizeObserver, intersectionObserver, draw;
  let alive = true, ready = false, raf = 0, meshCount = 0;
  let visible = !document.hidden, intersecting = true, last = performance.now();
  let state = {...initial}, rig, lastActivity;

  function listen(target, type, fn) {
    target.addEventListener(type, fn); cleanups.push(() => target.removeEventListener(type, fn));
  }
  function disposeObject(object) {
    const geometries = new Set(), materials = new Set(), textures = new Set(), skeletons = new Set();
    object.traverse(child => {
      if (child.geometry) geometries.add(child.geometry);
      if (child.skeleton) skeletons.add(child.skeleton);
      for (const material of child.material ? (Array.isArray(child.material) ? child.material : [child.material]) : []) {
        materials.add(material);
        for (const value of Object.values(material)) if (value?.isTexture) textures.add(value);
      }
      child.shadow?.dispose?.();
    });
    textures.forEach(texture => {texture.source?.data?.close?.(); texture.dispose();});
    skeletons.forEach(skeleton => skeleton.dispose());
    materials.forEach(material => material.dispose()); geometries.forEach(geometry => geometry.dispose());
  }
  function dispose() {
    if (!alive) return;
    alive = false; host.dataset.modelLoaded = 'false'; cancelAnimationFrame(raf); raf = 0;
    resizeObserver?.disconnect(); intersectionObserver?.disconnect(); cleanups.forEach(cleanup => cleanup());
    disposeObject(scene); environment?.dispose(); renderer?.renderLists.dispose(); renderer?.dispose();
    renderer?.forceContextLoss(); renderer?.domElement.remove();
  }
  function schedule() {
    if (alive && ready && visible && intersecting && !raf) raf = requestAnimationFrame(draw);
  }
  function syncVisibility() {
    // The local controller clock stops with the renderer, so returning to the
    // tab cannot jump to a later point in a gesture or an idle cycle.
    cancelAnimationFrame(raf); raf = 0; last = performance.now(); schedule();
  }

  try {
    renderer = new THREE.WebGLRenderer({alpha: true, antialias: true, powerPreference: 'low-power'});
    renderer.setPixelRatio(Math.min(devicePixelRatio || 1, 2));
    renderer.setClearColor(0xfffcf5, 0); renderer.outputColorSpace = THREE.SRGBColorSpace;
    renderer.toneMapping = THREE.NeutralToneMapping; renderer.toneMappingExposure = 1;
    renderer.shadowMap.enabled = true; renderer.shadowMap.type = THREE.PCFShadowMap;
    renderer.domElement.setAttribute('aria-hidden', 'true');
    Object.assign(renderer.domElement.style, {width: '100%', height: '100%', display: 'block'}); host.appendChild(renderer.domElement);
    const camera = new THREE.OrthographicCamera(-.6, .6, .6, -.6, .01, 20);
    camera.position.set(1.48, 1.38, 3.7); camera.lookAt(0, .50, .015);
    const pmrem = new THREE.PMREMGenerator(renderer), studio = new THREE.Scene();
    // Native linear world colour and the three original circular softboxes,
    // centred on the character. No unrelated room/windows in the reflections.
    studio.background = new THREE.Color(.88, .84, .77).multiplyScalar(.12);
    for (const [radiance, size, position, color] of [
      [8, 1.2, [-1.35, 1.75, 1.6], new THREE.Color(1, 1, 1)],
      [.95, 1.35, [1.5, .85, .85], new THREE.Color(1, .85, .65)],
      [2.1, 1.2, [.6, 1.45, -1.1], new THREE.Color(1, 1, 1)],
    ]) {
      const card = new THREE.Mesh(new THREE.CircleGeometry(size / 2, 48),
        new THREE.MeshBasicMaterial({color: color.multiplyScalar(radiance), toneMapped: false}));
      card.position.fromArray(position); card.lookAt(0, 0, 0); studio.add(card);
    }
    environment = pmrem.fromScene(studio, .04); scene.environment = environment.texture;
    scene.environmentIntensity = 1.3; disposeObject(studio); pmrem.dispose();
    const fill = new THREE.DirectionalLight(new THREE.Color(1, .85, .65), 1.15);
    fill.position.set(1.5, 1.35, .85); fill.target.position.set(0, .5, 0); scene.add(fill, fill.target);
    const rim = new THREE.DirectionalLight(0xffffff, .36);
    rim.position.set(.6, 1.95, -1.1); rim.target.position.set(0, .5, 0); scene.add(rim, rim.target);
    // Four bounded key samples plus the circular reflection approximate the
    // source area light's soft self-occlusion without unshadowed direct fill.
    const keyCenter = new THREE.Vector3(-1.35, 2.25, 1.6), keyTarget = new THREE.Vector3(0, .5, 0);
    const keyForward = keyTarget.clone().sub(keyCenter).normalize();
    const keyRight = new THREE.Vector3().crossVectors(keyForward, new THREE.Vector3(0, 1, 0)).normalize();
    const keyUp = new THREE.Vector3().crossVectors(keyRight, keyForward).normalize();
    for (const [u, v] of [[-.28, -.28], [.28, -.28], [-.28, .28], [.28, .28]]) {
      const keyShadow = new THREE.DirectionalLight(0xffffff, 1.05);
      keyShadow.position.copy(keyCenter).addScaledVector(keyRight, u).addScaledVector(keyUp, v);
      keyShadow.target.position.copy(keyTarget);
      keyShadow.castShadow = true; keyShadow.shadow.mapSize.set(1024, 1024);
      Object.assign(keyShadow.shadow.camera, {left: -.65, right: .65, top: .75, bottom: -.75, near: .1, far: 5});
      keyShadow.shadow.bias = -.0003; keyShadow.shadow.normalBias = .0025; keyShadow.shadow.radius = 5;
      scene.add(keyShadow, keyShadow.target);
    }
    const contactShadow = new THREE.ShaderMaterial({
      transparent: true, depthWrite: false, toneMapped: false,
      uniforms: {shadowColor: {value: new THREE.Color(0x62543f)}},
      vertexShader: 'varying vec2 shadowUv; void main() { shadowUv = uv; gl_Position = projectionMatrix * modelViewMatrix * vec4(position, 1.0); }',
      fragmentShader: 'uniform vec3 shadowColor; varying vec2 shadowUv; void main() { vec2 p = (shadowUv - 0.5) * 2.0; float falloff = pow(max(0.0, 1.0 - dot(p, p)), 2.8); gl_FragColor = vec4(shadowColor, falloff * 0.16); #include <colorspace_fragment> }'.replace(' #include', '\n#include').replace('> }', '>\n}'),
    });
    const ground = new THREE.Mesh(new THREE.PlaneGeometry(.86, .48), contactShadow);
    ground.rotation.x = -Math.PI / 2; ground.position.set(0, -.008, .04); scene.add(ground);

    draw = function drawScene(now) {
      raf = 0;
      if (!alive || !ready || !visible || !intersecting) return;
      const dt = Math.min(.1, Math.max(0, (now - last) / 1000)); last = now;
      const pose = controller.step(dt, {reducedMotion: reduce.matches});
      avatar.position.set(pose.rootX, pose.rootY, pose.rootZ);
      avatar.rotation.set(pose.tiltX, pose.turnY, pose.tiltZ);
      avatar.scale.set(1, 1, 1);
      const grip = book.arrange({progress: pose.bookProgress, turn: pose.pageTurn, seat: pose.sit, leftSupport: pose.leftSupport, reducedMotion: pose.reducedMotion});
      const rigPose = rig.pose(pose, grip); eyelids.pose(pose.eyesClosed, pose.eyesClosedRight);
      host.dataset.motionState = pose.motionState; host.dataset.eyesClosed = pose.eyesClosed.toFixed(3);
      host.dataset.bookOpen = grip.open.toFixed(3); host.dataset.pageTurn = pose.pageTurn.toFixed(3);
      host.dataset.bookStow = pose.bookStow.toFixed(3); host.dataset.bookPhase = pose.bookPhase;
      host.dataset.reactionPhase = pose.reactionPhase;
      host.dataset.authErrorPhase = pose.authErrorPhase;
      host.dataset.errorPeek = pose.errorPeek.toFixed(3);
      host.dataset.eyesClosedRight = pose.eyesClosedRight.toFixed(3);
      host.dataset.bookDrop = grip.dropProgress.toFixed(3);
      host.dataset.armReachError = rigPose.armReachError.toFixed(4);
      const activity = pose.activity === 'idle' ? (pose.think > .4 ? 'think' : pose.dance > .3 ? 'dance' : 'idle') : pose.activity;
      if (lastActivity !== activity) {lastActivity = activity; state.onMotionState?.(activity);}
      host.dataset.poseSnapshot = JSON.stringify({
        activity: pose.activity, sourceDerivedGeometry: true, originalSourceParts: true, localContactRepair: true, morphTargets: 0,
        sit: pose.sit, read: pose.read, cover: pose.cover, clutch: pose.clutch,
        stepLeft: pose.stepLeft, stepRight: pose.stepRight, wave: pose.wave, think: pose.think, dance: pose.dance,
        rootX: pose.rootX, rootY: pose.rootY, rootZ: pose.rootZ, tiltX: pose.tiltX, turnY: pose.turnY, tiltZ: pose.tiltZ,
        eyesClosed: pose.eyesClosed, eyesClosedRight: pose.eyesClosedRight, errorPeek: pose.errorPeek,
        authErrorPhase: pose.authErrorPhase, bookDrop: grip.dropProgress, bookOpen: grip.open, pageTurn: pose.pageTurn,
        armReachError: rigPose.armReachError, coreY: rigPose.coreY, bookPhase: pose.bookPhase,
      });
      renderer.render(scene, camera);
      if (pose.needsFrame) schedule();
    };
    function resize() {
      const width = host.clientWidth, height = host.clientHeight;
      if (!width || !height) return;
      renderer.setSize(width, height, false);
      const aspect = width / height, viewHeight = Math.max(1.24, 1.16 / aspect);
      camera.left = -viewHeight * aspect / 2; camera.right = viewHeight * aspect / 2;
      camera.top = viewHeight / 2; camera.bottom = -viewHeight / 2; camera.updateProjectionMatrix(); schedule();
    }
    const surface = host.closest('.auth-dialog, .auth-page, [role="dialog"]') || host.parentElement;
    function resetLook() {controller.look(0, 0); last = performance.now(); schedule();}
    listen(surface, 'pointermove', event => {
      if (reduce.matches || !fine.matches || state.secret || state.activity === 'rest' || event.pointerType === 'touch') return;
      const bounds = host.getBoundingClientRect();
      controller.look((event.clientX - bounds.left - bounds.width / 2) / bounds.width,
        -(event.clientY - bounds.top - bounds.height * .42) / bounds.height); schedule();
    });
    listen(surface, 'pointerleave', resetLook);
    listen(document, 'visibilitychange', () => {visible = !document.hidden; syncVisibility();});
    listen(renderer.domElement, 'webglcontextlost', event => {event.preventDefault(); dispose(); onFailure?.(new Error('WebGL context lost'));});
    listen(reduce, 'change', resetLook); listen(fine, 'change', resetLook);
    resizeObserver = new ResizeObserver(resize); resizeObserver.observe(host);
    if (typeof IntersectionObserver !== 'undefined') {
      intersectionObserver = new IntersectionObserver(entries => {intersecting = entries[0]?.isIntersecting !== false; syncVisibility();});
      intersectionObserver.observe(host);
    }
    new GLTFLoader().load(MODEL, async gltf => {
      if (!alive) {disposeObject(gltf.scene); return;}
      try {
      const response = await fetch('/mascot/cheese-source-articulated-rig.json', {cache: 'no-store'});
      if (!response.ok) throw new Error('Source rig metadata unavailable');
      const metadata = await response.json();
      const details = await restoreCheeseMaterialDetails(gltf.scene, renderer, () => alive);
      if (!alive) {disposeObject(gltf.scene); return;}
      host.dataset.materialQuality = details.quality;
      host.dataset.materialAoMaps = String(details.aoMaps);
      host.dataset.materialFallbacks = String(details.failures);
      // Bind the source-derived limbs; the body, UVs and source texture maps
      // keep their native shape. Runtime rotates fixed-length joint chains.
      gltf.scene.traverse(mesh => {
        if (!mesh.isMesh) return;
        meshCount++; mesh.castShadow = true; mesh.receiveShadow = true;
        if (/Eyes analytic/.test(mesh.material?.name || '')) eyelids.captureEyeSurface(mesh);
      });
      rig = createSourceCheeseRig(gltf.scene, metadata);
      rig.core.add(eyelids.object); avatar.add(rig.object); ready = true; last = performance.now();
      host.dataset.modelLoaded = 'true'; host.dataset.modelMeshCount = String(meshCount);
      resize(); onReady?.();
      } catch (error) {
        disposeObject(gltf.scene);
        if (alive) {dispose(); onFailure?.(error);}
      }
    }, undefined, error => {if (alive) {dispose(); onFailure?.(error);}});
    function update(next) {
      if (!alive) return;
      state = {...next}; controller.update(state); controller.look(0, 0);
      // A newly requested frame after a static privacy/reduced-motion state
      // starts now; elapsed wall time must not become a giant simulation step.
      if (!raf) last = performance.now(); schedule();
    }
    resize(); return {update, dispose};
  } catch (error) {dispose(); throw error;}
}
