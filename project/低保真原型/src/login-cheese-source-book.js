import * as THREE from 'three';

const clamp01 = value => THREE.MathUtils.clamp(Number.isFinite(value) ? value : 0, 0, 1);
const smooth = (a, b, value) => THREE.MathUtils.smoothstep(value, a, b);
const mix = THREE.MathUtils.lerp;

/** Coordinates are in the unscaled source avatar frame, Y up and +Z forward. */
export const SOURCE_BOOK_LAYOUT = Object.freeze({
  width: .64,
  height: .16,
  readCenter: Object.freeze([.04, .245, .285]),
  readPitch: -.60,
  standingLift: .095,
  torsoFront: .182,
  torsoHalfWidth: .335,
  seatedGlassesBottom: .3207,
  glassesFront: .246,
  sideX: .43,
  gripHeight: .035,
  standingReachInset: .013,
});

// Measured from cheese-source-articulated-rig.json, never enlarged to reach a
// pose. The source palm is aimed along shoulder -> cover; its measured length
// is then subtracted from the contact target to obtain the true wrist target.
export const SOURCE_BOOK_ARM_METRICS = Object.freeze({
  left: Object.freeze({
    shoulder: Object.freeze([-.278298, .436643, -.012296]),
    palmLength: .06130252849597646, reach: .29663694518546246,
  }),
  right: Object.freeze({
    shoulder: Object.freeze([.300083, .44289, .002991]),
    palmLength: .06130252849597646, reach: .29663694518546246,
  }),
});

/**
 * A small working book for the original short arms. The right cover stays under
 * the right palm while the other cover folds onto it; the prop never grows the
 * character's hands or arms. All transport and gripping use the same matrices.
 */
export function createCheeseSourceBook() {
  const book = new THREE.Group();
  book.name = 'Source_Cheese_Reading_Book';
  const paper = new THREE.MeshStandardMaterial({color: 0xfff4db, roughness: .84});
  const cover = new THREE.MeshStandardMaterial({color: 0x193956, roughness: .48});
  const ink = new THREE.MeshStandardMaterial({color: 0xbfa87c, roughness: .92});
  const ribbonMaterial = new THREE.MeshStandardMaterial({color: 0xd9a334, roughness: .65});
  const turningPaper = paper.clone();
  turningPaper.side = THREE.DoubleSide;
  turningPaper.transparent = true;
  turningPaper.depthWrite = true;
  const materials = [paper, cover, ink, ribbonMaterial, turningPaper];
  const halfWidth = SOURCE_BOOK_LAYOUT.width / 2;
  const paperWidth = halfWidth - .009;
  const paperHeight = SOURCE_BOOK_LAYOUT.height - .009;
  const halves = [-1, 1].map(side => {
    const hinge = new THREE.Group();
    hinge.name = side < 0 ? 'Source_Book_Left_Cover' : 'Source_Book_Right_Cover';
    book.add(hinge);
    const board = new THREE.Mesh(new THREE.BoxGeometry(halfWidth, SOURCE_BOOK_LAYOUT.height, .0035), cover);
    board.position.set(side * halfWidth / 2, 0, -.0035);
    const pageBlock = new THREE.Mesh(new THREE.BoxGeometry(paperWidth, paperHeight, .006), paper);
    pageBlock.position.set(side * (paperWidth / 2 + .001), 0, .002);
    hinge.add(board, pageBlock);
    for (const mesh of [board, pageBlock]) {mesh.castShadow = true; mesh.receiveShadow = true;}
    for (let row = 0; row < 5; row++) {
      const line = new THREE.Mesh(new THREE.BoxGeometry(paperWidth * (row === 4 ? .50 : .70), .0013, .0004), ink);
      line.position.set(side * paperWidth / 2, paperHeight * .28 - row * .016, .0053);
      hinge.add(line);
    }
    return hinge;
  });
  const spine = new THREE.Mesh(new THREE.CylinderGeometry(.0045, .0045, SOURCE_BOOK_LAYOUT.height, 12), cover);
  spine.position.z = -.002;
  book.add(spine);
  const ribbon = new THREE.Mesh(new THREE.BoxGeometry(.009, .025, .001), ribbonMaterial);
  ribbon.position.set(.027, -SOURCE_BOOK_LAYOUT.height / 2 - .008, .0058);
  halves[1].add(ribbon);

  // The leaf is inset from both gripping corners, keeping its sweep away from
  // the original thick fingers. A changing cylindrical curl uses real vertices.
  const segments = 18;
  const leafWidth = paperWidth - .020;
  const leafHeight = paperHeight - .005;
  const pageGeometry = new THREE.PlaneGeometry(leafWidth, leafHeight, segments, 2);
  const page = new THREE.Mesh(pageGeometry, turningPaper);
  page.name = 'Source_Book_Curled_Turning_Leaf';
  page.castShadow = true;
  page.receiveShadow = true;
  page.position.z = .0068;
  book.add(page);
  const positions = pageGeometry.attributes.position;
  const original = positions.array.slice();

  const leftGrip = new THREE.Vector3();
  const rightGrip = new THREE.Vector3();
  const rightCatchGrip = new THREE.Vector3();
  const leftWrist = new THREE.Vector3();
  const rightWrist = new THREE.Vector3();
  const leftShoulder = new THREE.Vector3();
  const rightShoulder = new THREE.Vector3();
  const leftHandDirection = new THREE.Vector3();
  const rightHandDirection = new THREE.Vector3();
  const coreMatrix = new THREE.Matrix4();
  const leftRotation = new THREE.Quaternion();
  const rightRotation = new THREE.Quaternion();
  const leftNormal = new THREE.Vector3();
  const rightNormal = new THREE.Vector3();
  const combined = new THREE.Matrix4();
  const readCenter = new THREE.Vector3();

  function turnPage(phase, weight) {
    // Phase can count pages indefinitely. The leaf settles into the static page
    // block before the next cycle, so wrapping never exposes a jumping sheet.
    const cycle = ((Number.isFinite(phase) ? phase : 0) % 1 + 1) % 1;
    const angle = cycle * Math.PI;
    const lift = Math.sin(angle);
    const opacity = smooth(.015, .075, cycle) * (1 - smooth(.925, .985, cycle)) * weight;
    turningPaper.opacity = opacity;
    page.visible = opacity > .0001;
    for (let i = 0; i < positions.count; i++) {
      const u = (original[i * 3] + leafWidth / 2) / leafWidth;
      const distance = u * leafWidth;
      const curl = Math.sin(u * Math.PI) * lift * .012;
      positions.setXYZ(i, distance * Math.cos(angle), original[i * 3 + 1], distance * lift + curl);
    }
    positions.needsUpdate = true;
    pageGeometry.computeVertexNormals();
    return {phase: cycle, opacity};
  }

  function arrange(params = {}) {
    const progress = clamp01(typeof params === 'number' ? params : params.progress ?? 1);
    const seat = clamp01(params.seat ?? 1);
    const reducedMotion = Boolean(params.reducedMotion);
    const open = smooth(.63, .94, progress);
    const carry = 1 - smooth(.15, .63, progress);
    const dropProgress = clamp01(progress / .15);
    const catchLift = .25;
    // The closed book drops outside the original silhouette. At the catch
    // boundary its position exactly meets the waiting palm; the remaining
    // lift then eases onto the same reversible carry path used for stowing.
    const entryLift = reducedMotion ? 0 : progress <= .15 ?
      mix(1.03, catchLift, dropProgress * dropProgress) :
      catchLift * (1 - smooth(.15, .42, progress));
    const entrySide = reducedMotion ? 0 : .035 * (1 - smooth(.15, .42, progress));
    const presence = clamp01(params.presence ?? smooth(0, reducedMotion ? .15 : .012, progress));
    // Backward movement starts only after the spine has cleared the silhouette.
    const side = smooth(.60, 1, carry);
    const lift = (1 - seat) * SOURCE_BOOK_LAYOUT.standingLift;
    const gripEdge = halfWidth - .008;
    const rightDistance = mix(gripEdge, .008, smooth(0, .45, carry));
    const sideYaw = side * Math.PI / 2;
    readCenter.set(SOURCE_BOOK_LAYOUT.readCenter[0], SOURCE_BOOK_LAYOUT.readCenter[1] + lift,
      SOURCE_BOOK_LAYOUT.readCenter[2] - SOURCE_BOOK_LAYOUT.standingReachInset * (1 - seat));
    // Design the transport around the supporting palm, keeping it outside the
    // original thick forearm's body corner throughout the carry, not just at
    // its endpoints. Undo the closed cover's local offset to locate the spine.
    const rightPalmX = mix(readCenter.x + gripEdge, SOURCE_BOOK_LAYOUT.sideX + .006, smooth(.45, 1, carry));
    book.position.set(
      rightPalmX - rightDistance * Math.cos(sideYaw) - .006 * Math.sin(sideYaw) + entrySide,
      readCenter.y - .01 * (1 - open) - .004 * Math.sin(open * Math.PI) + entryLift,
      readCenter.z - .032 * (1 - open) - .19 * side,
    );
    // Ry cancels the right hinge's closing rotation. It remains a stable support
    // while the left cover folds, rather than sweeping a closed book forward.
    book.rotation.set(SOURCE_BOOK_LAYOUT.readPitch * open, (1 - open) * Math.PI / 2 + side * Math.PI / 2,
      reducedMotion ? 0 : .07 * Math.sin(dropProgress * Math.PI) * (1 - smooth(.12, .15, progress)));
    halves[0].rotation.y = (1 - open) * Math.PI / 2;
    halves[1].rotation.y = -(1 - open) * Math.PI / 2;
    const turn = turnPage(params.turn ?? 0, smooth(.94, 1, progress));
    book.visible = presence > .0001;
    for (const material of materials) {
      material.transparent = true;
      material.opacity = material === turningPaper ? turn.opacity * presence : presence;
    }

    book.updateMatrix();
    for (const hinge of halves) hinge.updateMatrix();
    // The supporting palm slides towards the spine as the closed prop is moved
    // sideways. That keeps the original wrist inside its measured source reach.
    const gripY = SOURCE_BOOK_LAYOUT.gripHeight;
    combined.multiplyMatrices(book.matrix, halves[0].matrix);
    leftGrip.set(-gripEdge, gripY, .006).applyMatrix4(combined);
    leftRotation.setFromRotationMatrix(combined);
    leftNormal.set(0, 0, 1).applyQuaternion(leftRotation);
    combined.multiplyMatrices(book.matrix, halves[1].matrix);
    rightGrip.set(rightDistance, gripY, .006).applyMatrix4(combined);
    rightCatchGrip.copy(rightGrip);
    if (!reducedMotion && progress < .15) rightCatchGrip.y += catchLift - entryLift;
    rightRotation.setFromRotationMatrix(combined);
    rightNormal.set(0, 0, 1).applyQuaternion(rightRotation);
    const angle = .04 * seat;
    coreMatrix.makeRotationX(angle);
    coreMatrix.setPosition(0, -.095 * seat + .13 * (1 - Math.cos(angle)), -.13 * Math.sin(angle));
    leftShoulder.fromArray(SOURCE_BOOK_ARM_METRICS.left.shoulder).applyMatrix4(coreMatrix);
    rightShoulder.fromArray(SOURCE_BOOK_ARM_METRICS.right.shoulder).applyMatrix4(coreMatrix);
    // Renderers may supply their actual animated shoulders in the same avatar
    // coordinate system; the default exactly matches the seated core transform.
    if (params.leftShoulder?.isVector3) leftShoulder.copy(params.leftShoulder);
    if (params.rightShoulder?.isVector3) rightShoulder.copy(params.rightShoulder);
    leftHandDirection.subVectors(leftGrip, leftShoulder).normalize();
    rightHandDirection.subVectors(rightGrip, rightShoulder).normalize();
    leftWrist.copy(leftGrip).addScaledVector(leftHandDirection, -SOURCE_BOOK_ARM_METRICS.left.palmLength);
    rightWrist.copy(rightGrip).addScaledVector(rightHandDirection, -SOURCE_BOOK_ARM_METRICS.right.palmLength);
    // The free hand joins only after the sweeping cover is fully open. On
    // exit it clears that arc before the covers begin folding back together.
    const leftHold = Number.isFinite(params.leftSupport) ? clamp01(params.leftSupport) : smooth(.94, .995, progress);
    const rightHold = reducedMotion ? smooth(.025, .63, progress) : smooth(.15, .38, progress);
    const rightCatchHold = reducedMotion ? 0 : smooth(0, .11, progress) * (1 - smooth(.38, .48, progress));
    return {
      leftGrip, rightGrip, left: leftGrip, right: rightGrip,
      rightCatchGrip, rightCatchHold, dropProgress,
      leftWrist, rightWrist, leftRotation, rightRotation, leftNormal, rightNormal,
      leftShoulder, rightShoulder, leftHandDirection, rightHandDirection,
      leftHold, rightHold, hold: rightHold, support: leftHold,
      open, carry, stow: 1 - presence, presence, progress,
      phase: progress < .15 ? reducedMotion ? 'stow' : 'drop' : progress < .38 && !reducedMotion ? 'catch' : progress < .63 ? 'carry' : progress < .94 ? 'fold' : 'read',
      pagePhase: turn.phase, pageOpacity: turningPaper.opacity,
      front: 1 - side, pitch: book.rotation.x, turn: book.rotation.y,
      readCenter, position: book.position, rotation: book.rotation,
    };
  }

  function dispose() {
    const geometries = new Set();
    book.traverse(child => {if (child.isMesh) geometries.add(child.geometry);});
    for (const geometry of geometries) geometry.dispose();
    for (const material of materials) material.dispose();
    book.clear();
  }
  arrange({progress: 0, seat: 0});
  return {object: book, arrange, dispose, layout: SOURCE_BOOK_LAYOUT};
}
