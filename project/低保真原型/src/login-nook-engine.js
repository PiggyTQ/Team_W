import * as THREE from 'three';
import {RoundedBoxGeometry} from 'three/addons/geometries/RoundedBoxGeometry.js';
import {RoomEnvironment} from 'three/addons/environments/RoomEnvironment.js';

/** One lit scene, with articulated paws. No permanent animation loop or timers. */
export function createLoginNookScene(host, initial = {}, onFailure) {
  const scene = new THREE.Scene();
  let renderer;
  let environment;
  let observer;
  let alive = true;
  let raf = 0;
  const cleanups = [];

  function dispose() {
    if (!alive) return;
    alive = false;
    cancelAnimationFrame(raf);
    observer?.disconnect();
    cleanups.forEach(cleanup => cleanup());
    const geometries = new Set();
    const materials = new Set();
    scene.traverse(object => {
      if (object.geometry) geometries.add(object.geometry);
      if (object.material) for (const material of Array.isArray(object.material) ? object.material : [object.material]) materials.add(material);
      object.shadow?.dispose?.();
    });
    geometries.forEach(geometry => geometry.dispose());
    materials.forEach(material => material.dispose());
    environment?.dispose();
    renderer?.renderLists.dispose();
    renderer?.dispose();
    renderer?.forceContextLoss();
    renderer?.domElement.remove();
  }

  try {
    renderer = new THREE.WebGLRenderer({alpha: true, antialias: true, powerPreference: 'low-power'});
    renderer.setPixelRatio(Math.min(globalThis.devicePixelRatio || 1, 1.5));
    renderer.setClearColor(0xe6ecdf, 0);
    renderer.outputColorSpace = THREE.SRGBColorSpace;
    renderer.toneMapping = THREE.ACESFilmicToneMapping;
    renderer.toneMappingExposure = 1.06;
    renderer.shadowMap.enabled = true;
    renderer.shadowMap.type = THREE.VSMShadowMap;
    renderer.domElement.setAttribute('aria-hidden', 'true');
    renderer.domElement.style.display = 'block';
    renderer.domElement.style.width = '100%';
    renderer.domElement.style.height = '100%';
    host.appendChild(renderer.domElement);

    const camera = new THREE.OrthographicCamera(-3, 3, 2.2, -2.2, .1, 40);
    camera.position.set(3.6, 3.05, 9);
    camera.lookAt(0, 1.7, 0);

    const pmrem = new THREE.PMREMGenerator(renderer);
    const room = new RoomEnvironment();
    environment = pmrem.fromScene(room, .055);
    scene.environment = environment.texture;
    scene.environmentIntensity = .55;
    room.dispose();
    pmrem.dispose();
    scene.add(new THREE.HemisphereLight(0xfffcf1, 0x788875, 1.7));
    const key = new THREE.DirectionalLight(0xfff2da, 3.05);
    key.position.set(-3.5, 7, 6);
    key.castShadow = true;
    key.shadow.mapSize.set(1024, 1024);
    Object.assign(key.shadow.camera, {left: -4, right: 4, top: 5, bottom: -4, near: .5, far: 18});
    key.shadow.bias = -.0005;
    key.shadow.normalBias = .024;
    key.shadow.radius = 5;
    key.shadow.blurSamples = 8;
    scene.add(key);
    const fill = new THREE.DirectionalLight(0xcbd9c9, 1.05);
    fill.position.set(5, 3, -3);
    scene.add(fill);

    const ceramic = color => new THREE.MeshPhysicalMaterial({color, roughness: .38, metalness: 0, clearcoat: .28, clearcoatRoughness: .4});
    const matte = color => new THREE.MeshStandardMaterial({color, roughness: .88, metalness: 0});
    const ivory = ceramic(0xf5f1e7);
    const pawIvory = ceramic(0xf9f5ec);
    const ink = ceramic(0x244c3d);
    const innerEar = matte(0xd8b4a1);
    const scarf = matte(0xb87558);
    const paper = matte(0xf2f1df);
    const sage = matte(0xa8b99a);
    const cover = matte(0x899f7e);
    const pearl = ceramic(0xfffced);
    const sphere = new THREE.SphereGeometry(1, 40, 28);
    const limb = new THREE.CapsuleGeometry(1, 1, 8, 20);

    function mesh(geometry, material, parent, position = [0, 0, 0], scale = [1, 1, 1]) {
      const object = new THREE.Mesh(geometry, material);
      object.position.set(...position);
      object.scale.set(...scale);
      object.castShadow = true;
      object.receiveShadow = true;
      parent.add(object);
      return object;
    }
    const box = (width, height, depth, radius, material, parent, position) =>
      mesh(new RoundedBoxGeometry(width, height, depth, 5, radius), material, parent, position);
    const tube = (points, radius, material, parent) => mesh(new THREE.TubeGeometry(
      new THREE.CatmullRomCurve3(points.map(point => new THREE.Vector3(...point))), 28, radius, 8, false), material, parent);

    const ground = new THREE.Mesh(new THREE.PlaneGeometry(40, 40), new THREE.ShadowMaterial({opacity: .15}));
    ground.rotation.x = -Math.PI / 2;
    ground.position.y = -.025;
    ground.receiveShadow = true;
    scene.add(ground);

    // A single quiet notebook gives the cat a physical place to sit.
    const book = new THREE.Group();
    book.rotation.y = -.18;
    scene.add(book);
    box(3.16, .11, 2.02, .045, cover, book, [0, .055, 0]);
    for (let index = 0; index < 3; index++) {
      box(2.98, .034, 1.88, .015, paper, book, [0, .122 + index * .033, 0]);
    }
    box(3.16, .065, 2.02, .025, sage, book, [0, .237, 0]);
    box(.17, .018, .55, .008, scarf, book, [.98, .28, .86]);
    mesh(sphere, sage, book, [1.27, .36, .39], [.18, .075, .13]);

    const cat = new THREE.Group();
    cat.position.set(-.07, .25, .05);
    cat.rotation.y = .3;
    scene.add(cat);
    mesh(sphere, ivory, cat, [0, .94, 0], [.65, .81, .52]);
    for (const side of [-1, 1]) mesh(sphere, pawIvory, cat, [side * .4, .15, .3], [.27, .145, .37]);
    tube([[.48, .35, -.05], [.98, .38, -.1], [1.15, .75, -.08], [1.08, .99, .01], [.92, .88, .06]], .105, ivory, cat);
    mesh(sphere, ivory, cat, [.92, .88, .06], [.105, .105, .105]);

    const head = new THREE.Group();
    head.position.y = 2.03;
    cat.add(head);
    mesh(sphere, ivory, head, [0, 0, 0], [1, .78, .64]);

    function earShape(side, inset = false) {
      const shape = new THREE.Shape();
      if (inset) {
        shape.moveTo(-.18, -.11);
        shape.quadraticCurveTo(-.15, .08, -.12, .27);
        shape.quadraticCurveTo(-.11, .33, -.065, .27);
        shape.lineTo(.15, -.095);
        shape.quadraticCurveTo(-.015, -.16, -.18, -.11);
      } else {
        shape.moveTo(-.35, -.19);
        shape.quadraticCurveTo(-.32, .07, -.29, .45);
        shape.quadraticCurveTo(-.29, .57, -.18, .48);
        shape.lineTo(.32, -.12);
        shape.quadraticCurveTo(.02, -.3, -.35, -.19);
      }
      const geometry = new THREE.ExtrudeGeometry(shape, {
        depth: inset ? .018 : .25, steps: 1, bevelEnabled: true,
        bevelThickness: inset ? .025 : .08, bevelSize: inset ? .025 : .08, bevelSegments: 5, curveSegments: 18,
      });
      if (side === 1) geometry.scale(-1, 1, 1);
      return geometry;
    }
    for (const side of [-1, 1]) {
      mesh(earShape(side), ivory, head, [side * .62, .65, -.1]);
      mesh(earShape(side, true), innerEar, head, [side * .64, .72, .223]);
    }

    const eyes = [];
    for (const side of [-1, 1]) {
      const eye = new THREE.Group();
      eye.position.set(side * .36, .08, .6);
      head.add(eye);
      const pupil = mesh(sphere, ink, eye, [0, 0, 0], [.077, .115, .04]);
      mesh(sphere, pearl, pupil, [.23, .32, .79], [.21, .16, .18]);
      eyes.push(eye);
    }
    const noseShape = new THREE.Shape();
    noseShape.moveTo(-.075, .025);
    noseShape.quadraticCurveTo(0, .06, .075, .025);
    noseShape.quadraticCurveTo(.045, -.025, 0, -.055);
    noseShape.quadraticCurveTo(-.045, -.025, -.075, .025);
    mesh(new THREE.ExtrudeGeometry(noseShape, {depth: .025, bevelEnabled: true, bevelSegments: 3, steps: 1, bevelSize: .012, bevelThickness: .008, curveSegments: 12}), ink, head, [0, -.14, .648]);
    tube([[0, -.185, .663], [0, -.23, .663], [-.055, -.26, .651], [-.09, -.235, .646]], .011, ink, head);
    tube([[0, -.23, .663], [.055, -.26, .651], [.09, -.235, .646]], .011, ink, head);

    // The scarf and small ceramic tag carry the same terracotta accent as Nook.
    const collar = mesh(new THREE.TorusGeometry(.46, .095, 16, 64), scarf, cat, [0, 1.38, 0], [1.15, 1, 1]);
    collar.rotation.x = Math.PI / 2;
    const scarfEnd = box(.25, .5, .07, .034, scarf, cat, [.31, 1.1, .51]);
    scarfEnd.rotation.z = -.2;
    const tag = mesh(new THREE.CylinderGeometry(.105, .105, .045, 40), pearl, cat, [0, 1.27, .555]);
    tag.rotation.x = Math.PI / 2;
    tube([[-.035, 1.285, .582], [0, 1.25, .59], [.037, 1.294, .582]], .013, ink, cat);

    const arms = [];
    for (const side of [-1, 1]) {
      const upper = mesh(limb, ivory, cat);
      const lower = mesh(limb, ivory, cat);
      const joint = mesh(sphere, ivory, cat, [0, 0, 0], [.145, .145, .145]);
      const paw = new THREE.Group();
      cat.add(paw);
      mesh(sphere, pawIvory, paw, [0, 0, 0], [.25, .31, .18]);
      // Subtle toes stay in the same ceramic material, without cartoon outlines.
      for (const offset of [-.075, .075]) mesh(sphere, pawIvory, paw, [offset, .19, .025], [.09, .12, .13]);
      arms.push({side, upper, lower, joint, paw});
    }

    const up = new THREE.Vector3(0, 1, 0);
    const a = new THREE.Vector3();
    const b = new THREE.Vector3();
    const direction = new THREE.Vector3();
    function segment(object, from, to, radius) {
      direction.subVectors(to, from);
      object.position.copy(from).add(to).multiplyScalar(.5);
      object.quaternion.setFromUnitVectors(up, direction.clone().normalize());
      object.scale.set(radius, direction.length() / 3, radius);
    }

    const reduce = matchMedia('(prefers-reduced-motion: reduce)');
    const fine = matchMedia('(hover: hover) and (pointer: fine)');
    let state = {...initial};
    let visible = !document.hidden;
    let intersecting = true;
    let last = performance.now();
    let coverValue = initial.secret ? 1 : 0;
    let lookX = initial.focus === 'email' ? .48 : 0;
    let lookY = 0;
    let targetX = lookX;
    let targetY = lookY;
    let greetingStart = initial.greeting ? performance.now() : -10000;

    function pose(now) {
      const elapsed = now - greetingStart;
      const waveActive = state.greeting && !state.secret && !state.instant && !reduce.matches && elapsed < 800;
      const waveProgress = Math.max(0, Math.min(elapsed / 800, 1));
      const waveAmount = waveActive ? Math.sin(Math.PI * waveProgress) : 0;
      const happy = state.greeting && !state.secret;
      head.rotation.y = state.secret ? 0 : lookX * .1;
      head.rotation.x = state.secret ? -.025 : -lookY * .07;
      for (const eye of eyes) {
        eye.children[0].position.x = state.secret ? 0 : lookX * .025;
        eye.children[0].position.y = state.secret ? 0 : lookY * .03;
        eye.scale.y = happy ? .34 : 1;
      }
      for (const arm of arms) {
        const {side, upper, lower, joint, paw} = arm;
        const shoulder = a.set(side * .53, 1.17, .09);
        const hand = b.set(side * (.58 - coverValue * .22), .48 + coverValue * 1.63, .41 + coverValue * .44);
        const elbow = new THREE.Vector3(side * (.67 + coverValue * .08), .82 + coverValue * .69, .25 + coverValue * .21);
        if (side === -1 && waveActive) {
          hand.x -= waveAmount * (.18 + Math.sin(waveProgress * Math.PI * 5) * .075);
          hand.y += waveAmount * 1.65;
          hand.z += waveAmount * .12;
          elbow.x -= waveAmount * .23;
          elbow.y += waveAmount * .42;
        }
        segment(upper, shoulder, elbow, .14);
        segment(lower, elbow, hand, .145);
        joint.position.copy(elbow);
        paw.position.copy(hand);
        paw.rotation.z = side * (-.12 + coverValue * .23) + (side === -1 ? waveAmount * .2 : 0);
      }
      return waveActive;
    }

    function schedule() {
      if (alive && visible && intersecting && !raf) raf = requestAnimationFrame(draw);
    }
    function draw(now) {
      raf = 0;
      if (!alive || !visible || !intersecting) return;
      const delta = THREE.MathUtils.clamp((now - last) / 1000, 0, .05);
      last = now;
      const immediate = reduce.matches || state.instant;
      const blend = immediate ? 1 : 1 - Math.exp(-delta * 19);
      const desired = state.secret ? 1 : 0;
      coverValue = THREE.MathUtils.lerp(coverValue, desired, blend);
      lookX = THREE.MathUtils.lerp(lookX, targetX, blend);
      lookY = THREE.MathUtils.lerp(lookY, targetY, blend);
      const waving = pose(now);
      renderer.render(scene, camera);
      if (waving || Math.abs(coverValue - desired) > .001 || Math.abs(lookX - targetX) > .001 || Math.abs(lookY - targetY) > .001) schedule();
    }

    function resize() {
      const width = host.clientWidth;
      const height = host.clientHeight;
      if (!width || !height) return;
      renderer.setSize(width, height, false);
      const aspect = width / height;
      const view = Math.max(4.35, 3.85 / aspect);
      camera.left = -view * aspect / 2;
      camera.right = view * aspect / 2;
      camera.top = view / 2;
      camera.bottom = -view / 2;
      camera.updateProjectionMatrix();
      schedule();
    }

    function listen(target, event, handler) {
      target.addEventListener(event, handler);
      cleanups.push(() => target.removeEventListener(event, handler));
    }
    const surface = host.closest('.auth-dialog, .auth-page, [role="dialog"]') || host.parentElement;
    function move(event) {
      if (reduce.matches || !fine.matches || state.secret || event.pointerType === 'touch') return;
      const bounds = host.getBoundingClientRect();
      targetX = THREE.MathUtils.clamp((event.clientX - bounds.left - bounds.width / 2) / bounds.width, -.65, .65);
      targetY = THREE.MathUtils.clamp(-(event.clientY - bounds.top - bounds.height * .42) / bounds.height, -.45, .45);
      schedule();
    }
    function leave() {
      targetX = !state.secret && state.focus === 'email' ? .48 : 0;
      targetY = 0;
      schedule();
    }
    listen(surface, 'pointermove', move);
    listen(surface, 'pointerleave', leave);
    listen(document, 'visibilitychange', () => {
      visible = !document.hidden;
      if (!visible) {cancelAnimationFrame(raf); raf = 0;}
      else {last = performance.now(); schedule();}
    });
    listen(renderer.domElement, 'webglcontextlost', event => {
      event.preventDefault();
      dispose();
      onFailure?.();
    });
    const mediaChange = () => {
      targetX = !reduce.matches && !state.secret && state.focus === 'email' ? .48 : 0;
      targetY = 0;
      schedule();
    };
    listen(reduce, 'change', mediaChange);
    listen(fine, 'change', mediaChange);
    observer = new ResizeObserver(resize);
    observer.observe(host);
    if (typeof IntersectionObserver !== 'undefined') {
      const intersection = new IntersectionObserver(entries => {
        intersecting = entries[0]?.isIntersecting !== false;
        if (!intersecting) {cancelAnimationFrame(raf); raf = 0;}
        else {last = performance.now(); schedule();}
      });
      intersection.observe(host);
      cleanups.push(() => intersection.disconnect());
    }

    function update(next) {
      if (!alive) return;
      if (next.greeting && !state.greeting) greetingStart = performance.now();
      state = {...next};
      targetX = !reduce.matches && !state.secret && state.focus === 'email' ? .48 : 0;
      targetY = 0;
      schedule();
    }
    resize();
    update(initial);
    return {update, dispose};
  } catch (error) {
    dispose();
    throw error;
  }
}
