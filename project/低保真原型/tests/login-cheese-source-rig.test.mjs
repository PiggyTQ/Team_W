import test from 'node:test';
import assert from 'node:assert/strict';
import * as THREE from 'three';
import {readFileSync, writeFileSync} from 'node:fs';
import {createHash} from 'node:crypto';
import {tmpdir} from 'node:os';
import {join} from 'node:path';
import {createSourceCheeseRig, sourceCoreTransform} from '../src/login-cheese-source-rig.js';
import {createCheeseSourceBook} from '../src/login-cheese-source-book.js';

const url = name => new URL(`../public/mascot/${name}`, import.meta.url);
const metadata = JSON.parse(readFileSync(process.env.CHEESE_RIG_METADATA || url('cheese-source-articulated-rig.json')));
const raw = readFileSync(process.env.CHEESE_RIG_ASSET || url('cheese-source-articulated.glb'));
const jsonLength = raw.readUInt32LE(12);
const doc = JSON.parse(raw.subarray(20, 20 + jsonLength).toString());
const binaryStart = 28 + jsonLength;
const report = {asset: createHash('sha256').update(raw).digest('hex'),
  metadataAsset: metadata.outputSHA256, sourceTriangles: metadata.partAudit.reduce((sum, part) => sum + part.totalTriangles, 0),
  tolerances: {restPosition: 1e-6, bodyPenetration: .006, existingContactRegression: .0001, shoulderSocketExclusion: .012,
    palmPer60HzFrame: .035, jointRadiansPer60HzFrame: .30, anklePer60HzFrame: .020, floorMinimum: -.004},
  samples: {}};
process.on('exit', () => writeFileSync(process.env.CHEESE_RIG_REPORT || join(tmpdir(), `career-rig-validation-${process.pid}.json`), JSON.stringify(report, null, 2)));
function accessor(index) {
  const a = doc.accessors[index], view = doc.bufferViews[a.bufferView];
  const width = {SCALAR: 1, VEC2: 2, VEC3: 3, VEC4: 4}[a.type];
  const bytes = {5126: 4, 5125: 4, 5123: 2, 5121: 1}[a.componentType];
  const output = a.componentType === 5126 ? new Float32Array(a.count * width) : new Uint32Array(a.count * width);
  const read = {5126: 'readFloatLE', 5125: 'readUInt32LE', 5123: 'readUInt16LE', 5121: 'readUInt8'}[a.componentType];
  const start = binaryStart + (view.byteOffset || 0) + (a.byteOffset || 0), stride = view.byteStride || bytes * width;
  for (let i = 0; i < a.count; i++) for (let j = 0; j < width; j++) output[i * width + j] = raw[read](start + i * stride + j * bytes);
  return new THREE.BufferAttribute(output, width, a.normalized || false);
}
function fixture() {
  const source = new THREE.Group();
  for (const node of doc.nodes.filter(node => node.mesh !== undefined)) {
    const part = new THREE.Group(); part.name = node.name; source.add(part);
    for (const [index, primitive] of doc.meshes[node.mesh].primitives.entries()) {
      const geometry = new THREE.BufferGeometry();
      for (const [gltf, attribute] of Object.entries(primitive.attributes)) {
        const semantic = {POSITION: 'position', NORMAL: 'normal', TEXCOORD_0: 'uv', COLOR_0: 'color'}[gltf] || (gltf.startsWith('_') ? gltf.toLowerCase() : null);
        if (semantic) geometry.setAttribute(semantic, accessor(attribute));
      }
      geometry.setIndex(accessor(primitive.indices));
      const material = new THREE.MeshStandardMaterial(); material.name = doc.materials[primitive.material].name;
      geometry.userData = {...primitive.extras};
      const mesh = new THREE.Mesh(geometry, material); mesh.name = `${node.name}_primitive_${index}`;
      mesh.userData = {...primitive.extras}; part.add(mesh);
    }
  }
  const rig = createSourceCheeseRig(source, metadata);
  const applyPose = rig.pose;
  rig.pose = (...args) => {const result = applyPose(...args); rig.object.updateMatrixWorld(true); return result;};
  rig.pose(); return rig;
}
const point = new THREE.Vector3();
function actualVertex(mesh, index, target = new THREE.Vector3()) {
  target.fromBufferAttribute(mesh.geometry.attributes.position, index);
  if (mesh.isSkinnedMesh) mesh.applyBoneTransform(index, target);
  return target.applyMatrix4(mesh.matrixWorld);
}
function boneWeights(mesh, vertex) {
  const result = new Array(mesh.skeleton.bones.length).fill(0);
  const index = mesh.geometry.attributes.skinIndex, weight = mesh.geometry.attributes.skinWeight;
  for (let slot = 0; slot < 4; slot++) result[index.array[vertex * 4 + slot]] += weight.array[vertex * 4 + slot];
  return result;
}
function actualBounds(object) {
  const bounds = new THREE.Box3().makeEmpty();
  object.traverse(mesh => {if (mesh.isMesh) for (let i = 0; i < mesh.geometry.attributes.position.count; i++) bounds.expandByPoint(actualVertex(mesh, i, point));});
  return bounds;
}
function scenarios() {
  const poses = [{label: 'rest', p: {}}];
  for (const [name, key] of [['welcome', 'greeting'], ['privacy', 'cover'], ['clutch', 'clutch'], ['think', 'think'], ['dance', 'dance']]) {
    for (let i = 0; i <= 20; i++) poses.push({label: `${name}:${i}`, p: {[key]: i / 20, wave: name === 'welcome' ? i / 20 : 0, elapsed: i * .075}});
  }
  for (let i = 0; i <= 40; i++) poses.push({label: `sit:${i}`, p: {sit: i / 40}, book: {progress: 1, seat: i / 40, turn: .36}});
  for (let i = 0; i <= 10; i++) poses.push({label: `error-peek:${i}`, p: {cover: 1, errorPeek: i / 10, reducedMotion: true}});
  return poses;
}

test('the actual skinned source vertices reproduce the approved rest pose', () => {
  const rig = fixture(); rig.pose({}); rig.object.updateWorldMatrix(true, true);
  let maximum = 0, compared = 0;
  rig.object.traverse(mesh => {
    if (!mesh.isMesh) return;
    const original = mesh.geometry.attributes.position;
    for (let i = 0; i < original.count; i++) {
      const expected = new THREE.Vector3().fromBufferAttribute(original, i);
      maximum = Math.max(maximum, expected.distanceTo(actualVertex(mesh, i, point))); compared++;
    }
  });
  report.samples.rest = {vertices: compared, maxPositionError: maximum};
  assert.ok(maximum < 1e-6, `rest position drift ${maximum}`);
  const meshes = rig.arms.flatMap(arm => arm.meshes), fixed = meshes.map(mesh => ({
    index: mesh.geometry.attributes.skinIndex.array.slice(), weight: mesh.geometry.attributes.skinWeight.array.slice()}));
  const book = createCheeseSourceBook(); let averageError = 0, averagingSamples = 0;
  for (const progress of [.124, .325, .93, 1]) {
    rig.pose({sit: progress}, book.arrange({progress, seat: progress, leftSupport: progress === 1 ? 1 : 0}));
    for (const mesh of meshes) {
      const matrices = mesh.skeleton.bones.slice(0, 4).map((bone, i) => new THREE.Matrix4().multiplyMatrices(mesh.matrixWorld, mesh.bindMatrixInverse)
        .multiply(bone.matrixWorld).multiply(mesh.skeleton.boneInverses[i]).multiply(mesh.bindMatrix));
      for (let i = 0; i < mesh.geometry.attributes.position.count; i += 17) {
        const weights = boneWeights(mesh, i), original = new THREE.Vector3().fromBufferAttribute(mesh.geometry.attributes.position, i);
        const shoulder = weights[5] || 0;
        const merged = [weights[0] + .5 * shoulder, weights[1] + .5 * shoulder, weights[2] + .5 * weights[4], weights[3] + .5 * weights[4]], expected = new THREE.Vector3();
        for (let bone = 0; bone < 4; bone++) expected.addScaledVector(original.clone().applyMatrix4(matrices[bone]), merged[bone]);
        averageError = Math.max(averageError, expected.distanceTo(actualVertex(mesh, i))); averagingSamples++;
      }
    }
  }
  rig.pose({cover: 1}); rig.pose({});
  const fixedWeights = meshes.every((mesh, i) => mesh.geometry.attributes.skinWeight.array.every((value, j) => value === fixed[i].weight[j]) &&
    mesh.geometry.attributes.skinIndex.array.every((value, j) => value === fixed[i].index[j]));
  report.samples.affineWrist = {fixedSkinAttributes: fixedWeights, bookSourceSamples: averagingSamples, maxOriginalFourBoneLBSError: averageError};
  assert.ok(fixedWeights, 'runtime poses must not mutate the exported skin indices or weights');
  assert.ok(averageError < 1e-6, `wrist corrective changes original book skinning by ${averageError}`); book.dispose();
});

test('source upper arms and forearms keep their measured bone lengths through all poses', () => {
  const rig = fixture(), book = createCheeseSourceBook(); let worst = 0;
  for (const item of scenarios()) {
    rig.pose(item.p, item.book ? book.arrange(item.book) : null);
    for (const arm of rig.arms) {
      const a = arm.upper.getWorldPosition(new THREE.Vector3()), b = arm.fore.getWorldPosition(new THREE.Vector3()), c = arm.hand.getWorldPosition(new THREE.Vector3());
      worst = Math.max(worst, Math.abs(a.distanceTo(b) - arm.upperLength), Math.abs(b.distanceTo(c) - arm.foreLength));
    }
  }
  report.samples.fixedBones = {poses: scenarios().length, maxLengthError: worst};
  assert.ok(worst < 1e-10, `a source bone was scaled by ${worst}`); book.dispose();
});

test('the actual rigid original fingertip surfaces retain their pair distances', () => {
  const rig = fixture(), book = createCheeseSourceBook(); const pairs = [];
  for (const arm of rig.arms) for (const mesh of arm.meshes) {
    if (!mesh.userData.sourceSurface && mesh.name.includes('closure')) continue;
    const weight = mesh.geometry.attributes.skinWeight, index = mesh.geometry.attributes.skinIndex, ids = [];
    for (let i = 0; i < weight.count; i++) if (index.getW(i) === 3 && weight.getW(i) > .999999) ids.push(i);
    if (ids.length < 2) continue;
    for (let sample = 0; sample < Math.min(ids.length - 1, 50); sample++) {
      const a = ids[sample], b = ids[ids.length - sample - 1];
      pairs.push({mesh, a, b, distance: new THREE.Vector3().fromBufferAttribute(mesh.geometry.attributes.position, a).distanceTo(new THREE.Vector3().fromBufferAttribute(mesh.geometry.attributes.position, b))});
    }
  }
  let worst = 0;
  for (const item of scenarios()) {
    rig.pose(item.p, item.book ? book.arrange(item.book) : null);
    for (const pair of pairs) worst = Math.max(worst, Math.abs(actualVertex(pair.mesh, pair.a).distanceTo(actualVertex(pair.mesh, pair.b)) - pair.distance));
  }
  report.samples.fingers = {pairs: pairs.length, poses: scenarios().length, maxPairDistanceError: worst};
  assert.ok(pairs.length >= 50, 'test must inspect many actual source hand vertices');
  assert.ok(worst < 1e-6, `original rigid fingers changed their distances by ${worst}`); book.dispose();
});

test('the mirrored right hand stays rigid and both wrist loft seams stay welded', {skip: !metadata.rightHandReplacementSkin}, () => {
  const rig = fixture(), arm = rig.arms.find(part => part.side > 0), hints = metadata.rightHandReplacementSkin;
  const key = point => point.toArray().map(value => Math.round(value * 1e7)).join(',');
  const endpoints = new Map(), seams = [];
  for (const [primitive, mesh] of arm.meshes.entries()) {
    if (primitive === hints.loftPrimitive) continue;
    const position = mesh.geometry.attributes.position;
    for (let i = 0; i < position.count; i++) endpoints.set(key(new THREE.Vector3().fromBufferAttribute(position, i)), {mesh, i});
  }
  const loft = arm.meshes[hints.loftPrimitive];
  for (let i = 0; i < hints.loftProgress.length; i++) {
    if (hints.loftProgress[i] !== 0 && hints.loftProgress[i] !== 1) continue;
    const match = endpoints.get(key(new THREE.Vector3().fromBufferAttribute(loft.geometry.attributes.position, i)));
    assert.ok(match, `loft endpoint ${i} must coincide with its authored forearm or hand`);
    seams.push({loftIndex: i, mesh: match.mesh, endpointIndex: match.i});
  }
  let maximumSeam = 0;
  const book = createCheeseSourceBook();
  const compare = () => {
    for (const seam of seams) maximumSeam = Math.max(maximumSeam,
      actualVertex(loft, seam.loftIndex).distanceTo(actualVertex(seam.mesh, seam.endpointIndex)));
  };
  for (const cover of [0, .25, .5, .75, 1]) {rig.pose({cover}); compare();}
  rig.pose({sit: 1}, book.arrange({progress: 1, seat: 1, leftSupport: 1})); compare();
  let rigidVertices = 0;
  for (const primitive of hints.rigidHandPrimitives) {
    const mesh = arm.meshes[primitive];
    for (let i = 0; i < mesh.geometry.attributes.position.count; i++) {
      const weights = boneWeights(mesh, i);
      assert.equal(weights[3], 1, 'the mirrored palm and fingers must belong wholly to the hand bone'); rigidVertices++;
    }
  }
  report.samples.replacementWrist = {rigidVertices, seamVertices: seams.length, poses: 6, maxSeamDistance: maximumSeam};
  assert.ok(maximumSeam < 1e-6, `the replacement wrist separates from its forearm or palm by ${maximumSeam}`); book.dispose();
});

test('both original palms shield their own eyes in the actual orthographic privacy view', async () => {
  const {createCheeseChoreography} = await import('../src/login-cheese-choreography.js');
  const controller = createCheeseChoreography({secret: true}, {random: () => .5});
  const rig = fixture(), avatar = new THREE.Group(); avatar.add(rig.object);
  let pose;
  for (let frame = 0; frame < 480; frame++) {
    pose = controller.step(1 / 60);
    avatar.position.set(pose.rootX, pose.rootY, pose.rootZ); avatar.rotation.set(pose.tiltX, pose.turnY, pose.tiltZ);
    avatar.updateMatrixWorld(true); rig.pose(pose); avatar.updateMatrixWorld(true);
  }
  const viewBack = new THREE.Vector3(1.48, 1.38 - .50, 3.7 - .015).normalize();
  const rows = [];
  for (const arm of rig.arms) {
    const triangles = [], strains = [], seenEdges = new Set();
    for (const mesh of arm.meshes) {
      const index = mesh.geometry.index, source = mesh.geometry.attributes.position;
      const actual = [], influences = [];
      for (let i = 0; i < source.count; i++) {actual.push(actualVertex(mesh, i)); influences.push(boneWeights(mesh, i));}
      for (let i = 0; i < index.count; i += 3) {
        const ids = [0, 1, 2].map(j => index.getX(i + j));
        if (ids.every(id => influences[id][3] + influences[id][4] >= .7)) triangles.push(ids.map(id => actual[id]));
        if (!mesh.name.endsWith('primitive_0')) continue;
        for (let edge = 0; edge < 3; edge++) {
          const a = ids[edge], b = ids[(edge + 1) % 3], key = `${Math.min(a, b)}:${Math.max(a, b)}`;
          if (seenEdges.has(key)) continue; seenEdges.add(key);
          const length = new THREE.Vector3().fromBufferAttribute(source, a).distanceTo(new THREE.Vector3().fromBufferAttribute(source, b));
          if (length > .0001) strains.push(actual[a].distanceTo(actual[b]) / length);
        }
      }
    }
    const rayHits = [];
    for (const dy of [-.03, 0, .03]) for (const dx of [-.03, 0, .03]) {
      const eye = new THREE.Vector3((arm.side < 0 ? -.137683 : .153798) + dx, .557 + dy, .17636).applyMatrix4(rig.core.matrixWorld);
      const ray = new THREE.Ray(eye.clone().addScaledVector(viewBack, 10), viewBack.clone().negate());
      const hit = triangles.some(face => {
        const point = ray.intersectTriangle(...face, false, new THREE.Vector3());
        return point && point.distanceTo(ray.origin) < 10 - .002;
      });
      rayHits.push(hit);
    }
    const handQ = arm.hand.getWorldQuaternion(new THREE.Quaternion());
    const inward = new THREE.Vector3(-arm.side, 0, 0), finger = arm.palmAxis.clone().addScaledVector(inward, -arm.palmAxis.dot(inward)).normalize().applyQuaternion(handQ);
    const palmFacing = inward.applyQuaternion(handQ).dot(new THREE.Vector3(0, 0, -1).applyQuaternion(avatar.quaternion));
    strains.sort((a, b) => a - b);
    rows.push({side: arm.name, rays: rayHits, covered: rayHits.filter(Boolean).length, centerCovered: rayHits[4],
      fingerUp: finger.y, palmFacingInward: palmFacing, fixedLengthReachError: arm.error,
      elbowRadians: arm.fore.quaternion.angleTo(new THREE.Quaternion()), wristRadians: arm.hand.quaternion.angleTo(new THREE.Quaternion()),
      wristHalfRadians: arm.wristRoll.quaternion.angleTo(new THREE.Quaternion()),
      originalShellStretch: {edges: strains.length, maximum: strains.at(-1), p95: strains[Math.floor(strains.length * .95)], overThree: strains.filter(value => value > 3).length}});
  }
  report.samples.doublePrivacy = {camera: 'actual parallel orthographic rays at avatar/controller world transform',
    eyeGridRadius: .03, pose: {cover: pose.cover, turnY: pose.turnY}, arms: rows};
  assert.ok(rows.every(row => row.centerCovered && row.covered >= 7), `original palms do not cover their own iris region: ${JSON.stringify(rows)}`);
  assert.ok(rows.every(row => row.fingerUp > .95 && row.palmFacingInward > .95), 'palms must face the eyes with original fingers pointing up');
});

test('a rejected-password peek reveals only the right eye and returns to shielding', () => {
  const rig = fixture(), avatar = new THREE.Group(); avatar.add(rig.object); avatar.rotation.y = .28;
  const viewBack = new THREE.Vector3(1.48, 1.38 - .50, 3.7 - .015).normalize();
  const sample = errorPeek => {
    rig.pose({cover: 1, errorPeek, reducedMotion: true}); avatar.updateMatrixWorld(true);
    return rig.arms.map(arm => {
      const faces = [];
      for (const mesh of arm.meshes) {
        const index = mesh.geometry.index;
        for (let i = 0; i < index.count; i += 3) {
          const ids = [0, 1, 2].map(j => index.getX(i + j));
          if (ids.every(id => {const w = boneWeights(mesh, id); return w[3] + w[4] >= .7;})) faces.push(ids.map(id => actualVertex(mesh, id)));
        }
      }
      const hits = [];
      for (const dy of [-.03, 0, .03]) for (const dx of [-.03, 0, .03]) {
        const eye = new THREE.Vector3((arm.side < 0 ? -.137683 : .153798) + dx, .557 + dy, .17636).applyMatrix4(rig.core.matrixWorld);
        const ray = new THREE.Ray(eye.clone().addScaledVector(viewBack, 10), viewBack.clone().negate());
        hits.push(faces.some(face => {const hit = ray.intersectTriangle(...face, false, new THREE.Vector3()); return hit && hit.distanceTo(ray.origin) < 10 - .002;}));
      }
      return {side: arm.name, covered: hits.filter(Boolean).length, centerCovered: hits[4], rays: hits};
    });
  };
  const covered = sample(0), peek = sample(1), restored = sample(0);
  report.samples.passwordErrorPeek = {rightPalmLowering: .075, rightPalmOutward: .055, covered, peek, restored};
  assert.ok(covered.every(row => row.covered >= 7), 'the initial error pose starts with both eyes shielded');
  assert.ok(peek[0].covered >= 7 && peek[0].centerCovered, 'the left eye must remain covered throughout password feedback');
  assert.ok(!peek[1].centerCovered && peek[1].covered <= 3, `right eye must be visible: ${JSON.stringify(peek)}`);
  assert.deepEqual(restored, covered, 'the same exact source hand returns to its initial shielding pose');
});

test('the right elbow has a continuous weight collar and its former spike edges stay bounded', () => {
  const rig = fixture(), book = createCheeseSourceBook(), arm = rig.arms.find(part => part.side > 0);
  rig.pose({sit: 1}, book.arrange({progress: 1, seat: 1, leftSupport: 1}));
  const inverse = rig.core.matrixWorld.clone().invert(), ids = new Map(), points = [], edges = new Map();
  for (const mesh of arm.meshes) {
    if (!mesh.name.includes('primitive_0')) continue;
    const positions = mesh.geometry.attributes.position, skin = mesh.geometry.attributes.skinWeight, index = mesh.geometry.index;
    const local = [];
    for (let i = 0; i < positions.count; i++) {
      const original = new THREE.Vector3().fromBufferAttribute(positions, i), key = original.toArray().join(',');
      if (!ids.has(key)) {
        const actualWeights = boneWeights(mesh, i), shoulder = actualWeights[5] || 0, wrist = actualWeights[4] || 0;
        ids.set(key, points.length); points.push({original, actual: actualVertex(mesh, i).applyMatrix4(inverse),
          weights: [actualWeights[0] + .5 * shoulder, actualWeights[1] + .5 * shoulder, actualWeights[2] + .5 * wrist, actualWeights[3] + .5 * wrist],
          actualWeights, sourceIndex: i});
      }
      local[i] = ids.get(key);
    }
    for (let i = 0; i < index.count; i += 3) for (let edge = 0; edge < 3; edge++) {
      const a = local[index.getX(i + edge)], b = local[index.getX(i + (edge + 1) % 3)];
      edges.set(`${Math.min(a, b)}:${Math.max(a, b)}`, [a, b]);
    }
  }
  let maximumWeightJump = 0, hardSeams = 0, stretchOverThree = 0, maximumStretch = 0, maximumExportedWeightJump = 0;
  const witnesses = [], hardSeamWitnesses = [];
  for (const [ia, ib] of edges.values()) {
    const a = points[ia], b = points[ib], length = a.original.distanceTo(b.original);
    if (length < .0001) continue;
    const jump = a.weights.reduce((sum, value, bone) => sum + Math.abs(value - b.weights[bone]), 0) / 2;
    maximumExportedWeightJump = Math.max(maximumExportedWeightJump, a.actualWeights.reduce((sum, value, bone) => sum + Math.abs(value - b.actualWeights[bone]), 0) / 2);
    const stretch = a.actual.distanceTo(b.actual) / length;
    maximumWeightJump = Math.max(maximumWeightJump, jump); maximumStretch = Math.max(maximumStretch, stretch);
    if (jump > .5) {hardSeams++; hardSeamWitnesses.push({a: a.original.toArray(), b: b.original.toArray(), wa: a.weights, wb: b.weights, jump});} if (stretch > 3) stretchOverThree++;
    // These three actual source edges formed the visible outer elbow spike:
    // they stretched 18.4–26.9 times before the topology-based collar.
    const sourceWitness = [[
      [.38464993238449097, .4224202632904053, -.10783355683088303], [.39048054814338684, .41576364636421204, -.10871684551239014]], [
      [.3887637257575989, .42450109124183655, -.10330801457166672], [.3927864730358124, .419950932264328, -.10383819043636322]], [
      [.3920307755470276, .4247712790966034, -.10045141726732254], [.3927864730358124, .419950932264328, -.10383819043636322]]];
    if (sourceWitness.some(([x, y]) => (a.original.distanceToSquared(new THREE.Vector3(...x)) < 1e-14 && b.original.distanceToSquared(new THREE.Vector3(...y)) < 1e-14) ||
      (b.original.distanceToSquared(new THREE.Vector3(...x)) < 1e-14 && a.original.distanceToSquared(new THREE.Vector3(...y)) < 1e-14))) {
      witnesses.push({sourceIndices: [a.sourceIndex, b.sourceIndex], sourceCoordinates: [a.original.toArray(), b.original.toArray()], sourceLength: length, stretch, jump});
    }
  }
  report.samples.rightElbowQuality = {before: {hardSeams: 47, stretchOverThree: 391, maximumStretch: 26.903177697548944},
    after: {hardSeams, maximumWeightJump, maximumExportedWeightJump, stretchOverThree, maximumStretch}, elbowSpikeWitnesses: witnesses, hardSeamWitnesses,
    weightConvention: 'Anatomical core/upper/fore/hand coordinates merge each affine-average intermediate bone equally into its two endpoints; fixed exported weights are checked separately.',
    limitation: 'Remaining high-stretch collar edges are reported; this is not a claim that every arm edge has low strain.'};
  assert.equal(hardSeams, 0, `binary source weight seam returned: ${hardSeams}`);
  assert.equal(witnesses.length, metadata.arms.right.continuousMirroredLeftArm ? 0 : 3,
    'old spike witnesses must be present only when the original folded right arm is retained');
  assert.ok(witnesses.every(edge => edge.stretch < 2.5 && edge.jump < .2), `outer elbow spike returned: ${JSON.stringify(witnesses)}`);
  book.dispose();
});

test('actual source feet stay above the floor throughout the sit and wake sweep', () => {
  const rig = fixture(); const findings = []; let minimum = Infinity, bodyMinimum = Infinity;
  for (let frame = 0; frame <= 100; frame++) {
    const sit = frame / 100;
    rig.pose({sit});
    const feet = rig.legs.map(leg => ({name: leg.name, min: Math.min(...leg.meshes.map(mesh => actualBounds(mesh).min.y))}));
    const body = actualBounds(rig.object.getObjectByName(metadata.parts.body)).min.y;
    minimum = Math.min(minimum, ...feet.map(foot => foot.min)); bodyMinimum = Math.min(bodyMinimum, body);
    for (const foot of feet) if (foot.min < -.004) findings.push({sit, foot: foot.name, minY: foot.min});
  }
  rig.pose({sit: 1});
  const lowVertices = [];
  for (const leg of rig.legs) for (const mesh of leg.meshes) {
    for (let i = 0; i < mesh.geometry.attributes.position.count; i++) {
      const y = actualVertex(mesh, i, point).y;
      if (y < -.025) lowVertices.push({leg: leg.name, vertex: i, y, original: new THREE.Vector3().fromBufferAttribute(mesh.geometry.attributes.position, i).toArray(), weights: Array.from(mesh.geometry.attributes.skinWeight.array.slice(i * 4, i * 4 + 4))});
    }
  }
  lowVertices.sort((a, b) => a.y - b.y);
  report.samples.floor = {worstVertices: lowVertices.slice(0, 8), poses: 101, minimumFootY: minimum, minimumBodyY: bodyMinimum, failures: findings.slice(0, 10)};
  assert.ok(bodyMinimum > 0, `source body crosses the floor: ${bodyMinimum}`);
  assert.equal(findings.length, 0, `source foot penetrates the floor: ${JSON.stringify(findings.slice(0, 5))}`);
});



/** Exact source closed Body query, with an XY broad phase for +Z ray parity. */
function sourceBodyQuery() {
  const packed = [], bounds = [], bins = new Map(), size = .035;
  const materialOf = [];
  for (const primitive of doc.meshes[0].primitives) {
    const positions = accessor(primitive.attributes.POSITION), indices = accessor(primitive.indices);
    for (let face = 0; face < indices.count; face += 3) {
      const vertices = [0, 1, 2].map(j => new THREE.Vector3().fromBufferAttribute(positions, indices.getX(face + j)));
      const id = packed.length; packed.push(vertices); materialOf.push(primitive.material);
      const min = vertices.reduce((v, point) => v.min(point), new THREE.Vector3(Infinity, Infinity, Infinity));
      const max = vertices.reduce((v, point) => v.max(point), new THREE.Vector3(-Infinity, -Infinity, -Infinity));
      bounds.push(new THREE.Box3(min, max));
      for (let x = Math.floor(min.x / size); x <= Math.floor(max.x / size); x++) for (let y = Math.floor(min.y / size); y <= Math.floor(max.y / size); y++) {
        const key = `${x},${y}`; if (!bins.has(key)) bins.set(key, []); bins.get(key).push(id);
      }
    }
  }
  const face = new THREE.Triangle(), nearest = new THREE.Vector3();
  return point => {
    const gx = Math.floor(point.x / size), gy = Math.floor(point.y / size), candidates = bins.get(`${gx},${gy}`) || [];
    const hits = [];
    for (const id of candidates) {
      const [a, b, c] = packed[id];
      const ax = b.x - a.x, ay = b.y - a.y, bx = c.x - a.x, by = c.y - a.y;
      const denominator = ax * by - ay * bx; if (Math.abs(denominator) < 1e-13) continue;
      const u = ((point.x - a.x) * by - (point.y - a.y) * bx) / denominator;
      const v = (ax * (point.y - a.y) - ay * (point.x - a.x)) / denominator;
      if (u >= -1e-8 && v >= -1e-8 && u + v <= 1 + 1e-8) hits.push(a.z + u * (b.z - a.z) + v * (c.z - a.z));
    }
    hits.sort((a, b) => a - b);
    const unique = hits.filter((value, i) => !i || Math.abs(value - hits[i - 1]) > 1e-7);
    if (unique.filter(z => z > point.z + 1e-7).length % 2 === 0) return {inside: false, depth: 0};
    let distance = Math.min(...unique.map(z => Math.abs(z - point.z))), material = -1;
    const radius = Math.ceil(distance / size) + 1;
    const near = new Set();
    for (let x = gx - radius; x <= gx + radius; x++) for (let y = gy - radius; y <= gy + radius; y++) for (const id of bins.get(`${x},${y}`) || []) near.add(id);
    for (const id of near) {
      if (bounds[id].distanceToPoint(point) >= distance) continue;
      face.set(...packed[id]); face.closestPointToPoint(point, nearest);
      const value = nearest.distanceTo(point);
      if (value < distance) {distance = value; material = materialOf[id];}
      if (distance < .002) break;
    }
    return {inside: true, depth: distance, material};
  };
}

/** A source fusion contact may start inside the newly closed body. Only that
 * exact vertex's measured rest depth is inherited, never a whole hand/region.
 * Existing deep contact must not grow; new contacts keep the original 6 mm cap.
 */
function compareOriginalContact(query) {
  const baseline = new Map();
  return (original, actual) => {
    const key = original.toArray().join(',');
    if (!baseline.has(key)) baseline.set(key, query(original));
    const rest = baseline.get(key), result = query(actual);
    const baselineDepth = rest.inside ? rest.depth : 0;
    const currentDepth = result.inside ? result.depth : 0;
    const inheritedContact = baselineDepth > .006;
    const limit = inheritedContact ? baselineDepth + .0001 : .006;
    return {...result, baselineDepth, addedDepth: currentDepth - baselineDepth,
      inheritedContact, allowedDepth: limit, violation: currentDepth > limit};
  };
}

test('animated source forearms and hands do not deeply enter the closed torso or glasses', () => {
  const rig = fixture(), book = createCheeseSourceBook(), query = sourceBodyQuery();
  const compare = compareOriginalContact(query);
  const findings = [], rows = []; let inspected = 0, maximumDepth = 0, maximumReachError = 0, maximumAddedDepth = 0;
  const inverse = new THREE.Matrix4();
  for (const item of scenarios()) {
    const grip = item.book ? book.arrange(item.book) : null;
    const telemetry = rig.pose(item.p, grip); maximumReachError = Math.max(maximumReachError, telemetry.armReachError);
    inverse.copy(rig.core.matrixWorld).invert();
    let count = 0, depth = 0, sample = null, regressions = 0, worstRegression = null;
    // Original rest contacts are authored fusion contacts. The moving hand's
    // shoulder attachment and its .065 neighbourhood intentionally overlap.
    if (item.label === 'rest') continue;
    for (const arm of rig.arms) for (const mesh of arm.meshes) {
      if (!mesh.name.includes('primitive_0')) continue; // retained original cheddar surface, not cap fans
      const positions = mesh.geometry.attributes.position;
      for (let i = 0; i < positions.count; i += 21) {
        const original = new THREE.Vector3().fromBufferAttribute(positions, i);
        if (original.distanceTo(arm.shoulder) < .065) continue;
        const skin = mesh.geometry.attributes.skinWeight;
        if (skin.getZ(i) + skin.getW(i) < .75) continue;
        const actual = actualVertex(mesh, i).applyMatrix4(inverse);
        // Test original forearm and hand surface, excluding the pinned upper arm collar.
        const result = compare(original, actual); inspected++;
        maximumAddedDepth = Math.max(maximumAddedDepth, result.addedDepth);
        const evidence = {side: arm.name, mesh: mesh.name, vertex: i, source: original.toArray(), actual: actual.toArray(),
          nearestMaterial: result.material, baselineDepth: result.baselineDepth, currentDepth: result.depth,
          addedDepth: result.addedDepth, inheritedContact: result.inheritedContact, allowedDepth: result.allowedDepth};
        if (result.violation) {regressions++; if (!worstRegression || result.addedDepth > worstRegression.addedDepth) worstRegression = evidence;}
        if (result.inside && result.depth > .004) {
          count++; if (result.depth > depth) {depth = result.depth; sample = evidence;}
        }
      }
    }
    rows.push({pose: item.label, deepVertices: count, depth, sample, regressions});
    maximumDepth = Math.max(maximumDepth, depth);
    if (regressions > 0) findings.push({pose: item.label, deepVertices: count, depth, regressions, sample: worstRegression});
  }
  report.samples.collision = {poses: rows.length, inspectedSourceVertices: inspected, maximumDepth, maximumAddedDepth, maximumReachError, failures: findings.slice(0, 12), worst: rows.sort((a, b) => b.depth - a.depth).slice(0, 8)};
  assert.equal(findings.length, 0, `moving source hand/forearm intersects original Body: ${JSON.stringify(findings.slice(0, 3))}`);
  book.dispose();
});



if (process.env.CHEESE_RIG_PROBE === '1') {
test('diagnostic: real source forearm roll clearances', () => {
  const rig = fixture(), book = createCheeseSourceBook(), query = sourceBodyQuery(); const results = [];
  for (const [label, state, armName, prop] of [['read', {sit: 1}, 'right', {progress: 1, seat: 1}], ['cover', {cover: 1}, 'left', null]]) {
    for (let step = -8; step <= 8; step++) {
      const roll = step * Math.PI / 8;
      rig.pose(state, prop ? book.arrange(prop) : null);
      const arm = rig.arms.find(arm => arm.name === armName);
      const parentWorld = arm.fore.parent.getWorldQuaternion(new THREE.Quaternion());
      const axis = arm.hand.getWorldPosition(new THREE.Vector3()).sub(arm.fore.getWorldPosition(new THREE.Vector3())).normalize().applyQuaternion(parentWorld.invert());
      arm.fore.quaternion.premultiply(new THREE.Quaternion().setFromAxisAngle(axis, roll));
      rig.object.updateMatrixWorld(true); arm.skeleton.update();
      const inverse = rig.core.matrixWorld.clone().invert(); let count = 0, depth = 0;
      for (const mesh of arm.meshes) {
        if (!mesh.name.includes('primitive_0')) continue;
        for (let i = 0; i < mesh.geometry.attributes.position.count; i += 13) {
          const skin = mesh.geometry.attributes.skinWeight;
          if (skin.getZ(i) + skin.getW(i) < .75) continue;
          const original = new THREE.Vector3().fromBufferAttribute(mesh.geometry.attributes.position, i);
          if (original.distanceTo(arm.shoulder) < .065) continue;
          const result = query(actualVertex(mesh, i).applyMatrix4(inverse));
          if (result.inside && result.depth > .004) {count++; depth = Math.max(depth, result.depth);}
        }
      }
      results.push({label, roll, count, depth});
    }
  }
  report.rollProbe = results;
  book.dispose();
});

test('diagnostic: right original curved forearm contact envelope', () => {
  const rig = fixture(), book = createCheeseSourceBook(), query = sourceBodyQuery(), results = [];
  for (const x of [.272, .29, .31, .33, .35, .37]) {
    const grip = book.arrange({progress: 1, seat: 1}); grip.rightGrip.x = x;
    const pose = rig.pose({sit: 1}, grip), inverse = rig.core.matrixWorld.clone().invert();
    const arm = rig.arms.find(arm => arm.name === 'right'); let count = 0, depth = 0;
    for (const mesh of arm.meshes) {
      if (!mesh.name.includes('primitive_0')) continue;
      for (let i = 0; i < mesh.geometry.attributes.position.count; i += 7) {
        const skin = mesh.geometry.attributes.skinWeight; if (skin.getZ(i) + skin.getW(i) < .75) continue;
        const original = new THREE.Vector3().fromBufferAttribute(mesh.geometry.attributes.position, i); if (original.distanceTo(arm.shoulder) < .065) continue;
        const result = query(actualVertex(mesh, i).applyMatrix4(inverse));
        if (result.inside && result.depth > .004) {count++; depth = Math.max(depth, result.depth);}
      }
    }
    results.push({x, count, depth, reachError: pose.armReachError});
  }
  report.rightContactEnvelope = results; book.dispose();
});

}

test('the real welcome, read, stow, privacy, recoil and idle timeline clears the source body and floor', async () => {
  const {createCheeseChoreography} = await import('../src/login-cheese-choreography.js');
  const controller = createCheeseChoreography({}, {random: () => .5});
  const rig = fixture(), book = createCheeseSourceBook(), query = sourceBodyQuery();
  const compare = compareOriginalContact(query);
  const avatar = new THREE.Group(); avatar.add(rig.object, book.object);
  const failures = [], floorFailures = [], originalContactEvidence = []; let sampledFrames = 0, checked = 0, maxDepth = 0, maxAddedDepth = 0, maxExistingContactIncrease = 0, maxReachError = 0, minFootY = Infinity, minBodyY = Infinity;
  let criticalFullSurfaceFrames = 0;
  const criticalFrames = {welcome: [21, 84], 'email-read': [12, 24, 36, 48, 120, 300], 'password-stow': [6, 18, 42, 60, 84, 180, 240], 'tap-recoil': [12, 30, 60, 84], 'idle-think-dance': [270, 510]};
  const sockets = new Map(rig.arms.map(arm => {const data = metadata.partAudit.find(part => part.node === metadata.arms[arm.name].node); const loop = [...data.loops].sort((a, b) => new THREE.Vector3(...a.center).distanceToSquared(arm.shoulder) - new THREE.Vector3(...b.center).distanceToSquared(arm.shoulder))[0]; return [arm.name, new THREE.Box3(new THREE.Vector3(...loop.min), new THREE.Vector3(...loop.max))];}));
  let frame = 0, maxReachFrame = null, previousArms = null, maxPalmJump = 0, maxWristJump = 0, maxJointAngle = 0, maxJointFrame = null, maxPalmFrame = null, maxWristFrame = null, previousLegs = null, maxAnkleJump = 0, maxFootAngle = 0, maxAnkleFrame = null;
  const sequence = [
    {name: 'welcome', seconds: 2.8, state: {}},
    {name: 'email-read', seconds: 6, state: {focus: 'email'}},
    {name: 'password-stow', seconds: 5, state: {focus: 'password', secret: true}},
    {name: 'privacy-exit', seconds: 1.5, state: {focus: '', secret: false}},
    {name: 'tap-recoil', seconds: 2.5, state: {reaction: 1, reactionActive: true}},
    {name: 'idle-think-dance', seconds: 15, state: {reactionActive: false, activity: 'idle'}},
  ];
  for (const segment of sequence) {
    controller.update(segment.state);
    for (let i = 0; i < Math.round(segment.seconds * 60); i++, frame++) {
      const pose = controller.step(1 / 60);
      avatar.position.set(pose.rootX, pose.rootY, pose.rootZ); avatar.rotation.set(pose.tiltX, pose.turnY, pose.tiltZ);
      avatar.updateMatrixWorld(true);
      const grip = book.arrange({progress: pose.bookProgress, turn: pose.pageTurn, seat: pose.sit, leftSupport: pose.leftSupport});
      const telemetry = rig.pose(pose, grip); avatar.updateMatrixWorld(true);
      const currentArms = rig.arms.map(arm => ({side: arm.name,
        wrist: arm.hand.getWorldPosition(new THREE.Vector3()),
        palm: arm.hand.localToWorld(arm.palmAxis.clone()),
        rotations: [arm.upper, arm.fore, arm.hand].map(bone => bone.getWorldQuaternion(new THREE.Quaternion())),
      }));
      if (previousArms) for (let a = 0; a < currentArms.length; a++) {
        const palmJump = currentArms[a].palm.distanceTo(previousArms[a].palm);
        if (palmJump > maxPalmJump) {maxPalmJump = palmJump; maxPalmFrame = {segment: segment.name, time: i / 60, side: currentArms[a].side, before: previousArms[a].palm.toArray(), after: currentArms[a].palm.toArray(), pose};}
        const wristJump = currentArms[a].wrist.distanceTo(previousArms[a].wrist);
        if (wristJump > maxWristJump) {maxWristJump = wristJump; maxWristFrame = {segment: segment.name, time: i / 60, side: currentArms[a].side, before: previousArms[a].wrist.toArray(), after: currentArms[a].wrist.toArray(), pose};}
        for (let joint = 0; joint < 3; joint++) {
          const angle = currentArms[a].rotations[joint].angleTo(previousArms[a].rotations[joint]);
          if (angle > maxJointAngle) {maxJointAngle = angle; maxJointFrame = {segment: segment.name, time: i / 60, side: currentArms[a].side, joint};}
        }
      }
      previousArms = currentArms;
      const currentLegs = rig.legs.map(leg => ({side: leg.name,
        ankle: leg.foot.getWorldPosition(new THREE.Vector3()),
        rotation: leg.foot.getWorldQuaternion(new THREE.Quaternion()),
      }));
      if (previousLegs) for (let leg = 0; leg < currentLegs.length; leg++) {
        const jump = currentLegs[leg].ankle.distanceTo(previousLegs[leg].ankle);
        if (jump > maxAnkleJump) {maxAnkleJump = jump; maxAnkleFrame = {segment: segment.name, time: i / 60, side: currentLegs[leg].side};}
        maxFootAngle = Math.max(maxFootAngle, currentLegs[leg].rotation.angleTo(previousLegs[leg].rotation));
      }
      previousLegs = currentLegs;
      if (telemetry.armReachError > maxReachError) {maxReachError = telemetry.armReachError; maxReachFrame = {segment: segment.name, time: i / 60, pose, arms: rig.arms.map(arm => ({side: arm.name, error: arm.error}))};}
      const critical = criticalFrames[segment.name]?.includes(i) || false;
      if (frame % 6 && !critical) continue;
      if (critical) criticalFullSurfaceFrames++;
      sampledFrames++;
      const inverse = rig.core.matrixWorld.clone().invert(); let count = 0, depth = 0, sample = null, regressions = 0, worstRegression = null;
      for (const arm of rig.arms) for (const mesh of arm.meshes) {
        if (!critical && !mesh.name.includes('primitive_0')) continue;
        const positions = mesh.geometry.attributes.position, skin = mesh.geometry.attributes.skinWeight;
        for (let vertex = 0; vertex < positions.count; vertex += critical ? 1 : 27) {
          const original = new THREE.Vector3().fromBufferAttribute(positions, vertex);
          if (critical ? sockets.get(arm.name).distanceToPoint(original) < .012 : original.distanceTo(arm.shoulder) < .065 || skin.getZ(vertex) + skin.getW(vertex) < .75) continue;
          const actual = actualVertex(mesh, vertex).applyMatrix4(inverse), result = compare(original, actual); checked++;
          maxAddedDepth = Math.max(maxAddedDepth, result.addedDepth);
          if (result.inheritedContact) maxExistingContactIncrease = Math.max(maxExistingContactIncrease, result.addedDepth);
          const evidence = {arm: arm.name, mesh: mesh.name, vertex, actual: actual.toArray(), source: original.toArray(),
            baselineDepth: result.baselineDepth, currentDepth: result.depth, addedDepth: result.addedDepth,
            inheritedContact: result.inheritedContact, allowedDepth: result.allowedDepth};
          if (result.violation) {regressions++; if (!worstRegression || result.addedDepth > worstRegression.addedDepth) worstRegression = evidence;}
          if (frame === 0 && result.inheritedContact && originalContactEvidence.length < 12) originalContactEvidence.push(evidence);
          if (result.inside && result.depth > .004) {
            count++; if (result.depth > depth) {depth = result.depth; sample = evidence;}
          }
        }
      }
      maxDepth = Math.max(maxDepth, depth);
      if (regressions > 0) failures.push({segment: segment.name, time: i / 60, book: pose.bookProgress, seat: pose.sit, count, depth, regressions, sample: worstRegression});
      const footY = Math.min(...rig.legs.flatMap(leg => leg.meshes.map(mesh => actualBounds(mesh).min.y)));
      const bodyY = actualBounds(rig.object.getObjectByName(metadata.parts.body)).min.y;
      minFootY = Math.min(minFootY, footY); minBodyY = Math.min(minBodyY, bodyY);
      if (footY < -.004 || bodyY < -.004) floorFailures.push({segment: segment.name, time: i / 60, footY, bodyY});
    }
  }
  report.samples.realTimeline = {continuity: {maxPalmJump, maxWristJump, maxJointAngle, maxJointFrame, maxPalmFrame, maxWristFrame, maxAnkleJump, maxFootAngle, maxAnkleFrame}, maxReachFrame, criticalFullSurfaceFrames, sampledFrames, inspectedSourceVertices: checked, maxDepth, maxAddedDepth, maxExistingContactIncrease, originalContactEvidence, maxReachError, minFootY, minBodyY, failures: failures.slice(0, 8), floorFailures: floorFailures.slice(0, 8)};
  assert.equal(failures.length, 0, `actual choreography entered body: ${JSON.stringify(failures.slice(0, 3))}`);
  assert.equal(floorFailures.length, 0, `actual choreography entered floor: ${JSON.stringify(floorFailures.slice(0, 3))}`);
  assert.ok(maxPalmJump < .035, `source palm has a single-frame jump ${maxPalmJump}`);
  assert.ok(maxWristJump < .035, `source wrist has a single-frame jump ${maxWristJump}`);
  assert.ok(maxAnkleJump < .020, `source ankle has an abrupt frame displacement ${maxAnkleJump}: ${JSON.stringify(maxAnkleFrame)}`);
  assert.ok(maxFootAngle < .20, `source foot has an abrupt frame rotation ${maxFootAngle}`);
  assert.ok(maxJointAngle < .30, `source joint has an abrupt frame rotation ${maxJointAngle}: ${JSON.stringify(maxJointFrame)}`);
  assert.ok(maxReachError < .003, `a real trajectory asks beyond original arm reach: ${maxReachError}`);
  book.dispose();
});


