import * as THREE from 'three';

const clamp = THREE.MathUtils.clamp;
const smooth = (a, b, value) => THREE.MathUtils.smoothstep(value, a, b);
const vector = value => new THREE.Vector3().fromArray(value);
const Y = new THREE.Vector3(0, 1, 0);

export function sourceCoreTransform(seat = 0) {
  const s = clamp(seat, 0, 1), angle = .04 * s;
  return {angle, y: -.095 * s + .13 * (1 - Math.cos(angle)), z: -.13 * Math.sin(angle)};
}

/** A fixed-length chain; a new target changes angles, never source scale. */
export function solveSourceArm(shoulder, goal, pole, upper, fore) {
  const axis = goal.clone().sub(shoulder), requestedDistance = axis.length();
  axis.normalize();
  if (requestedDistance < 1e-8) axis.copy(Y);
  const distance = clamp(requestedDistance, Math.abs(upper - fore) + .0001, upper + fore - .0001);
  const along = (upper * upper - fore * fore + distance * distance) / (2 * distance);
  const height = Math.sqrt(Math.max(0, upper * upper - along * along));
  const bend = pole.clone().sub(shoulder).addScaledVector(axis, -pole.clone().sub(shoulder).dot(axis));
  if (bend.lengthSq() < 1e-10) bend.set(1, 0, 0).addScaledVector(axis, -axis.x);
  bend.normalize();
  return {elbow: shoulder.clone().addScaledVector(axis, along).addScaledVector(bend, height),
    wrist: shoulder.clone().addScaledVector(axis, distance), error: Math.max(0, requestedDistance - distance)};
}

function segmentDistance(point, from, to) {
  const axis = to.clone().sub(from), t = point.clone().sub(from).dot(axis) / axis.lengthSq();
  return {t, distance: point.distanceTo(from.clone().addScaledVector(axis, clamp(t, 0, 1)))};
}

function frameRotation(fromAxis, fromNormal, toAxis, toNormal) {
  const frame = (axis, normal) => {
    const x = axis.clone().normalize();
    const z = normal.clone().addScaledVector(x, -normal.dot(x)).normalize();
    const y = new THREE.Vector3().crossVectors(z, x).normalize();
    z.crossVectors(x, y).normalize();
    return new THREE.Quaternion().setFromRotationMatrix(new THREE.Matrix4().makeBasis(x, y, z));
  };
  return frame(toAxis, toNormal).multiply(frame(fromAxis, fromNormal).invert());
}

function blendDirection(from, to, weight, length) {
  const rotation = new THREE.Quaternion().setFromUnitVectors(from.clone().normalize(), to.clone().normalize());
  rotation.slerpQuaternions(new THREE.Quaternion(), rotation.clone(), clamp(weight, 0, 1));
  return from.applyQuaternion(rotation).normalize().multiplyScalar(length);
}

function wristMidpoint(fore, hand) {
  const sum = new THREE.Quaternion(fore.x + hand.x, fore.y + hand.y, fore.z + hand.z, fore.w + hand.w);
  const difference = new THREE.Quaternion(fore.x - hand.x, fore.y - hand.y, fore.z - hand.z, fore.w - hand.w);
  const options = [sum, difference].filter(value => value.lengthSq() > 1e-10).map(value => value.normalize());
  const reference = fore;
  options.sort((a, b) => Math.abs(reference.dot(b)) - Math.abs(reference.dot(a)));
  return options[0];
}

/** Distance along the authored surface, welded across UV/material seams. */
function shoulderSurfaceDistance(part, socket, shoulderCap = null) {
  if (!socket) return () => Infinity;
  const points = [], ids = new Map(), edges = [];
  const key = point => `${Math.round(point.x * 1e7)},${Math.round(point.y * 1e7)},${Math.round(point.z * 1e7)}`;
  const meshes = [];
  part.traverse(mesh => {if (mesh.isMesh) meshes.push(mesh);});
  for (const mesh of meshes) {
    const position = mesh.geometry.attributes.position, local = new Uint32Array(position.count);
    for (let i = 0; i < position.count; i++) {
      const point = new THREE.Vector3().fromBufferAttribute(position, i), id = key(point);
      if (!ids.has(id)) {ids.set(id, points.length); points.push(point); edges.push(new Set());}
      local[i] = ids.get(id);
    }
    const index = mesh.geometry.index, count = index ? index.count : position.count;
    for (let i = 0; i < count; i += 3) {
      const triangle = [0, 1, 2].map(j => local[index ? index.getX(i + j) : i + j]);
      for (let j = 0; j < 3; j++) {
        const a = triangle[j], b = triangle[(j + 1) % 3]; edges[a].add(b); edges[b].add(a);
      }
    }
  }
  const distance = new Float64Array(points.length); distance.fill(Infinity);
  const heap = [];
  const push = (id, value) => {
    let i = heap.length; heap.push([id, value]);
    while (i) {const parent = (i - 1) >> 1; if (heap[parent][1] <= value) break; heap[i] = heap[parent]; i = parent;}
    heap[i] = [id, value];
  };
  const pop = () => {
    const first = heap[0], tail = heap.pop();
    if (heap.length) {
      let i = 0;
      while (i * 2 + 1 < heap.length) {
        let child = i * 2 + 1;
        if (child + 1 < heap.length && heap[child + 1][1] < heap[child][1]) child++;
        if (heap[child][1] >= tail[1]) break;
        heap[i] = heap[child]; i = child;
      }
      heap[i] = tail;
    }
    return first;
  };
  points.forEach((point, id) => {if (shoulderCap?.available ? shoulderCap(point) : socket.distanceToPoint(point) <= .002) {distance[id] = 0; push(id, 0);}});
  while (heap.length) {
    const [id, current] = pop();
    if (current > distance[id] || current > .12) continue;
    for (const next of edges[id]) {
      const candidate = current + points[id].distanceTo(points[next]);
      if (candidate < distance[next]) {distance[next] = candidate; push(next, candidate);}
    }
  }
  return point => distance[ids.get(key(point))] ?? Infinity;
}

/** Contact closures contain separate palm and shoulder components. The whole
 * shoulder cap, including a rounded bulge outside its old bbox, is socket. */
function authoredShoulderCap(part, shoulder, palmContact) {
  const keys = new Set(), key = point => `${Math.round(point.x * 1e7)},${Math.round(point.y * 1e7)},${Math.round(point.z * 1e7)}`;
  part.traverse(mesh => {
    if (!mesh.isMesh || !(mesh.userData.sourceSurface === false || mesh.geometry.userData.sourceSurface === false || mesh.geometry.userData.contactClosure)) return;
    const position = mesh.geometry.attributes.position, index = mesh.geometry.index, parent = Array.from({length: position.count}, (_, i) => i), welded = new Map();
    const find = id => {while (parent[id] !== id) {parent[id] = parent[parent[id]]; id = parent[id];} return id;};
    const union = (a, b) => {a = find(a); b = find(b); if (a !== b) parent[b] = a;};
    for (let i = 0; i < position.count; i++) {
      const id = key(new THREE.Vector3().fromBufferAttribute(position, i));
      if (welded.has(id)) union(i, welded.get(id)); else welded.set(id, i);
    }
    for (let i = 0; i < index.count; i += 3) {union(index.getX(i), index.getX(i + 1)); union(index.getX(i), index.getX(i + 2));}
    const components = new Map();
    for (let i = 0; i < position.count; i++) {const id = find(i); if (!components.has(id)) components.set(id, []); components.get(id).push(i);}
    for (const ids of components.values()) {
      const center = new THREE.Vector3(); for (const i of ids) center.add(new THREE.Vector3().fromBufferAttribute(position, i)); center.divideScalar(ids.length);
      if (palmContact && center.distanceToSquared(vector(palmContact.center)) < center.distanceToSquared(shoulder)) continue;
      for (const i of ids) keys.add(key(new THREE.Vector3().fromBufferAttribute(position, i)));
    }
  });
  const contains = point => keys.has(key(point)); contains.available = keys.size > 0; return contains;
}

function skinnedPart(part, bones, weights) {
  const original = [];
  part.traverse(mesh => {if (mesh.isMesh) original.push(mesh);});
  const skeleton = new THREE.Skeleton(bones);
  const meshes = [];
  part.updateWorldMatrix(true, true);
  for (const mesh of original) {
    // Exported part nodes are identity; source attributes remain the bind pose.
    const geometry = mesh.geometry;
    const positions = geometry.attributes.position;
    const indices = new Uint16Array(positions.count * 4), values = new Float32Array(positions.count * 4);
    const point = new THREE.Vector3();
    for (let i = 0; i < positions.count; i++) {
      point.fromBufferAttribute(positions, i);
      const influence = weights(point, mesh, i);
      influence.forEach(([bone, weight], j) => {indices[i * 4 + j] = bone; values[i * 4 + j] = weight;});
    }
    geometry.setAttribute('skinIndex', new THREE.Uint16BufferAttribute(indices, 4));
    geometry.setAttribute('skinWeight', new THREE.Float32BufferAttribute(values, 4));
    const originalMaterials = Array.isArray(mesh.material) ? mesh.material : [mesh.material];
    const materials = originalMaterials.map(material => {const copy = material.clone(); if (copy.aoMap) copy.aoMapIntensity = .18; return copy;});
    const skin = new THREE.SkinnedMesh(geometry, Array.isArray(mesh.material) ? materials : materials[0]);
    skin.name = mesh.name; skin.userData = {...mesh.userData}; skin.castShadow = true; skin.receiveShadow = true; skin.frustumCulled = false;
    mesh.parent.add(skin); mesh.parent.remove(mesh); skin.bind(skeleton); meshes.push(skin);
  }
  return {skeleton, meshes};
}

/** Diffuse only the elbow split; the original socket and rigid hand stay fixed. */
function smoothArmWeights(meshes, foreLimit, wrist) {
  const vertices = [], ids = new Map(), neighbors = [];
  const key = point => `${Math.round(point.x * 1e7)},${Math.round(point.y * 1e7)},${Math.round(point.z * 1e7)}`;
  for (const mesh of meshes) {
    const position = mesh.geometry.attributes.position, skin = mesh.geometry.attributes.skinWeight;
    const local = new Uint32Array(position.count);
    for (let i = 0; i < position.count; i++) {
      const point = new THREE.Vector3().fromBufferAttribute(position, i), id = key(point);
      if (!ids.has(id)) {
        ids.set(id, vertices.length);
        const core = skin.getX(i), hand = skin.getW(i), amount = skin.getY(i) + skin.getZ(i);
        const ratio = amount > 1e-8 ? skin.getZ(i) / amount : 1;
        vertices.push({point, core, hand, amount, ratio, references: [],
          fixed: core > .999999 || amount < .0001,
          maximum: foreLimit(point)});
        neighbors.push(new Set());
      }
      local[i] = ids.get(id); vertices[local[i]].references.push([skin, i]);
    }
    const index = mesh.geometry.index;
    for (let i = 0; i < index.count; i += 3) {
      const face = [0, 1, 2].map(j => local[index.getX(i + j)]);
      for (let j = 0; j < 3; j++) {const a = face[j], b = face[(j + 1) % 3]; neighbors[a].add(b); neighbors[b].add(a);}
    }
  }
  const connections = neighbors.map((ids, i) => [...ids].map(id => [id, 1 / Math.max(.001, vertices[i].point.distanceTo(vertices[id].point))]));
  let maximumPrevious = Float64Array.from(vertices, vertex => vertex.maximum);
  for (let iteration = 0; iteration < 20; iteration++) {
    const next = maximumPrevious.slice();
    vertices.forEach((vertex, i) => {
      if (vertex.core > .999999) return;
      let sum = 0, total = 0;
      for (const [id, weight] of connections[i]) {sum += maximumPrevious[id] * weight; total += weight;}
      if (total) next[i] = THREE.MathUtils.lerp(maximumPrevious[i], (sum / total + .03 * vertex.maximum) / 1.03, .5);
    }); maximumPrevious = next;
  }
  vertices.forEach((vertex, i) => {vertex.maximum = maximumPrevious[i];});
  let corePrevious = Float64Array.from(vertices, vertex => vertex.core);
  for (let iteration = 0; iteration < 70; iteration++) {
    const next = corePrevious.slice();
    vertices.forEach((vertex, i) => {
      if (vertex.core > .999999 || vertex.hand > .999999) return;
      let sum = 0, total = 0;
      for (const [id, weight] of connections[i]) {sum += corePrevious[id] * weight; total += weight;}
      if (total) next[i] = clamp(THREE.MathUtils.lerp(corePrevious[i], (sum / total + .02 * vertex.core) / 1.02, .6), 0, 1 - vertex.hand);
    });
    corePrevious = next;
  }
  vertices.forEach((vertex, i) => {vertex.core = corePrevious[i]; vertex.fixed = vertex.core > .999999 || vertex.amount < .0001;});
  let handPrevious = Float64Array.from(vertices, vertex => vertex.hand);
  for (let iteration = 0; iteration < 100; iteration++) {
    const next = handPrevious.slice();
    vertices.forEach((vertex, i) => {
      // The actual authored finger/palm shell is rigid. Only the non-rigid
      // wrist collar between it and the forearm is allowed to redistribute.
      if (vertex.core > .999999 || vertex.hand > .999999 ||
        (vertex.hand < .0001 && vertex.point.distanceTo(wrist) > .115)) return;
      let sum = 0, total = 0;
      for (const [id, weight] of connections[i]) {sum += handPrevious[id] * weight; total += weight;}
      if (!total) return;
      const target = (sum / total + .005 * vertex.hand) / 1.005;
      next[i] = clamp(THREE.MathUtils.lerp(handPrevious[i], target, .6), 0, 1 - vertex.core);
    });
    handPrevious = next;
  }
  let previous = Float64Array.from(vertices, vertex => vertex.ratio);
  for (let iteration = 0; iteration < 120; iteration++) {
    const next = previous.slice();
    vertices.forEach((vertex, i) => {
      if (vertex.fixed) return;
      let sum = 0, total = 0;
      for (const [id, weight] of connections[i]) {sum += previous[id] * weight; total += weight;}
      if (!total) return;
      const target = (sum / total + .005 * vertex.ratio) / 1.005;
      next[i] = Math.min(vertex.maximum, THREE.MathUtils.lerp(previous[i], target, .6));
    });
    previous = next;
  }
  vertices.forEach((vertex, i) => {
    if (vertex.amount < .0001) return;
    for (const [skin, index] of vertex.references) {
      const hand = handPrevious[i], amount = 1 - vertex.core - hand;
      skin.setX(index, vertex.core);
      skin.setY(index, amount * (1 - previous[i]));
      skin.setZ(index, amount * previous[i]); skin.setW(index, hand); skin.needsUpdate = true;
    }
  });
}

/** The mirrored hand has an authored wrist connector. Its two palm surfaces
 * are a single rigid hand; only the loft carries the forearm-to-hand bend.
 * Use the exact retained forearm boundary weights, not the old claw's plane. */
function bindReplacementHand(meshes, hints) {
  if (!hints) return;
  const key = point => `${Math.round(point[0] * 1e7)},${Math.round(point[1] * 1e7)},${Math.round(point[2] * 1e7)}`;
  const rigid = new Set(hints.rigidHandPrimitives), sourceWeights = new Map();
  for (const [primitive, mesh] of meshes.entries()) {
    const position = mesh.geometry.attributes.position, weights = mesh.geometry.attributes.skinWeight;
    if (hints.primitiveVertexCounts[primitive] !== position.count) throw new Error('Replacement hand skin hints do not match the asset');
    if (rigid.has(primitive) || primitive === hints.loftPrimitive) continue;
    for (let i = 0; i < position.count; i++) {
      sourceWeights.set(key([position.getX(i), position.getY(i), position.getZ(i)]),
        [weights.getX(i), weights.getY(i), weights.getZ(i), weights.getW(i)]);
    }
  }
  const boundary = hints.forearmBoundaryPositions.map(point => {
    const weights = sourceWeights.get(key(point));
    if (!weights) throw new Error('Replacement wrist boundary does not coincide with the retained forearm');
    return weights;
  });
  for (const [primitive, mesh] of meshes.entries()) {
    if (!rigid.has(primitive) && primitive !== hints.loftPrimitive) continue;
    const weights = mesh.geometry.attributes.skinWeight;
    for (let i = 0; i < weights.count; i++) {
      if (rigid.has(primitive)) {weights.setXYZW(i, 0, 0, 0, 1); continue;}
      const [a, b, u] = hints.loftForearmAnchorEdges[i];
      const progress = smooth(0, 1, hints.loftProgress[i]);
      const from = boundary[a].map((value, bone) => THREE.MathUtils.lerp(value, boundary[b][bone], u));
      weights.setXYZW(i, from[0] * (1 - progress), from[1] * (1 - progress),
        from[2] * (1 - progress), from[3] * (1 - progress) + progress);
    }
    weights.needsUpdate = true;
  }
}

/** Split a wide wrist bend into two rigid rotations about the same source
 * joint. The authored fingers keep bone 3; only their soft collar uses 4. */
function splitWristInfluences(meshes) {
  for (const mesh of meshes) {
    const weights = mesh.geometry.attributes.skinWeight, indices = mesh.geometry.attributes.skinIndex;
    for (let i = 0; i < weights.count; i++) {
      const fore = weights.getZ(i), hand = weights.getW(i), distal = fore + hand;
      if (distal < 1e-8 || hand < 1e-8 || hand > .999999) continue;
      const fraction = hand / distal;
      if (fraction <= .5) {
        indices.setZ(i, 2); indices.setW(i, 4);
        weights.setZ(i, distal * (1 - 2 * fraction)); weights.setW(i, distal * 2 * fraction);
      } else {
        indices.setZ(i, 4); indices.setW(i, 3);
        weights.setZ(i, distal * (2 - 2 * fraction)); weights.setW(i, distal * (2 * fraction - 1));
      }
    }
    weights.needsUpdate = true; indices.needsUpdate = true;
  }
}

function splitShoulderInfluences(meshes) {
  for (const mesh of meshes) {
    const weights = mesh.geometry.attributes.skinWeight, indices = mesh.geometry.attributes.skinIndex;
    for (let i = 0; i < weights.count; i++) {
      const core = weights.getX(i), upper = weights.getY(i), proximal = core + upper;
      if (proximal < 1e-8 || core < 1e-8 || upper < 1e-8) continue;
      const fraction = upper / proximal;
      if (fraction <= .5) {
        indices.setX(i, 0); indices.setY(i, 5);
        weights.setX(i, proximal * (1 - 2 * fraction)); weights.setY(i, proximal * 2 * fraction);
      } else {
        indices.setX(i, 5); indices.setY(i, 1);
        weights.setX(i, proximal * (2 - 2 * fraction)); weights.setY(i, proximal * (2 * fraction - 1));
      }
    }
    weights.needsUpdate = true; indices.needsUpdate = true;
  }
}

function poseShoulderCorrective(arm, amount) {
  if (!arm.shoulderVolume) return;
  const relative = arm.upper.quaternion, half = new THREE.Quaternion().slerp(relative, .5);
  const upper = new THREE.Matrix4().makeRotationFromQuaternion(relative), rounded = new THREE.Matrix4().makeRotationFromQuaternion(half);
  const matrix = arm.shoulderVolume.matrix; matrix.identity();
  for (let column = 0; column < 3; column++) for (let row = 0; row < 3; row++) {
    const i = column * 4 + row;
    matrix.elements[i] = THREE.MathUtils.lerp(.5 * ((column === row ? 1 : 0) + upper.elements[i]), rounded.elements[i], amount);
  }
  matrix.setPosition(arm.shoulder.clone().lerp(arm.upper.position, .5));
  arm.shoulderVolume.quaternion.copy(half); arm.shoulderVolume.matrixWorldNeedsUpdate = true;
}

function poseWristCorrective(arm, foreQ, handQ, amount) {
  const localHand = foreQ.clone().invert().multiply(handQ);
  const half = foreQ.clone().invert().multiply(wristMidpoint(foreQ, handQ));
  const hand = new THREE.Matrix4().makeRotationFromQuaternion(localHand), rounded = new THREE.Matrix4().makeRotationFromQuaternion(half);
  const matrix = arm.wristRoll.matrix; matrix.identity();
  for (let column = 0; column < 3; column++) for (let row = 0; row < 3; row++) {
    const i = column * 4 + row;
    const average = .5 * ((column === row ? 1 : 0) + hand.elements[i]);
    matrix.elements[i] = THREE.MathUtils.lerp(average, rounded.elements[i], amount);
  }
  matrix.setPosition(arm.wristRoll.position);
  arm.wristRoll.quaternion.copy(half); arm.wristRoll.matrixWorldNeedsUpdate = true;
}

/** Skin the approved source parts and their explicitly authored repairs. */
export function createSourceCheeseRig(source, metadata) {
  const object = new THREE.Group(); object.name = 'Cheese_Source_Articulated_Rig';
  const core = new THREE.Group(); core.name = 'Cheese_Original_Proportions_Core'; object.add(core); core.add(source);
  const arms = [], legs = [];
  for (const [name, data] of Object.entries(metadata.arms)) {
    const part = source.getObjectByName(data.node);
    if (!part) throw new Error(`Missing original arm ${data.node}`);
    const side = name === 'left' ? -1 : 1;
    const mirroredArm = Boolean(data.continuousMirroredLeftArm);
    const sourcePalmNormal = data.sourcePalmNormal ? vector(data.sourcePalmNormal) : new THREE.Vector3(-side, 0, 0);
    const shoulder = vector(data.shoulder), elbow = vector(data.elbow), wrist = vector(data.wrist), palm = vector(data.palm);
    const attach = new THREE.Bone(), upper = new THREE.Bone(), fore = new THREE.Bone(), hand = new THREE.Bone(), wristRoll = new THREE.Bone();
    attach.name = `${name}_source_attachment`; upper.name = `${name}_source_shoulder`; fore.name = `${name}_source_elbow`; hand.name = `${name}_source_wrist`;
    core.add(attach); attach.add(upper); upper.position.copy(shoulder); upper.add(fore); fore.position.copy(elbow).sub(shoulder);
    fore.add(hand); hand.position.copy(wrist).sub(elbow);
    wristRoll.name = `${name}_source_wrist_roll`; fore.add(wristRoll); wristRoll.position.copy(wrist).sub(elbow);
    wristRoll.matrixAutoUpdate = false; wristRoll.matrix.makeTranslation(...wristRoll.position.toArray());
    let shoulderVolume = null;
    if (side > 0) {
      shoulderVolume = new THREE.Bone(); shoulderVolume.name = `${name}_source_shoulder_volume`;
      attach.add(shoulderVolume); shoulderVolume.position.copy(shoulder); shoulderVolume.matrixAutoUpdate = false;
      shoulderVolume.matrix.makeTranslation(...shoulder.toArray());
    }
    core.updateMatrixWorld(true);
    const upperAxis = elbow.clone().sub(shoulder), foreAxis = wrist.clone().sub(elbow), palmAxis = palm.clone().sub(wrist);
    const shoulderContact = metadata.partAudit?.find(item => item.node === data.node)?.loops
      ?.slice().sort((a, b) => vector(a.center).distanceToSquared(shoulder) - vector(b.center).distanceToSquared(shoulder))[0];
    const palmContact = metadata.partAudit?.find(item => item.node === data.node)?.loops?.find(loop => loop !== shoulderContact);
    const isShoulderCap = authoredShoulderCap(part, shoulder, palmContact);
    const socket = shoulderContact ? new THREE.Box3(vector(shoulderContact.min), vector(shoulderContact.max)) : null;
    const surfaceDistance = shoulderSurfaceDistance(part, socket, side > 0 ? isShoulderCap : null);
    const replacementHand = side > 0 ? metadata.rightHandReplacementSkin : null;
    const foreLimit = point => {
      if (side < 0 || mirroredArm) return 1;
      const upperDistance = segmentDistance(point, shoulder, elbow).distance;
      const foreDistance = segmentDistance(point, elbow, wrist).distance;
      // The thick folded wrist comes back beside the socket. Surface distance
      // alone mistakes its back for proximal upper arm; a point distinctly
      // nearer the authored forearm axis must remain free of that collar.
      const distalSurface = smooth(.005, .025, upperDistance - foreDistance);
      return Math.max(smooth(.045, .09, surfaceDistance(point)), distalSurface);
    };
    const bind = skinnedPart(part, [attach, upper, fore, hand, wristRoll, ...(shoulderVolume ? [shoulderVolume] : [])], (point, mesh) => {
      const role = mesh.userData.replacementRole || mesh.geometry.userData.replacementRole;
      if (replacementHand && role?.startsWith('mirrored_left_hand')) return [[0, 0], [1, 0], [2, 0], [3, 1]];
      if (isShoulderCap(point)) return [[0, 1], [1, 0], [2, 0], [3, 0]];
      const d0 = segmentDistance(point, shoulder, elbow), d1 = segmentDistance(point, elbow, wrist);
      const along = d0.distance < d1.distance ? clamp(d0.t, 0, 1) * upperAxis.length() : upperAxis.length() + clamp(d1.t, 0, 1) * foreAxis.length();
      // The source shoulder is an elliptical fused socket, not a small sphere
      // around its centre. Pin its true perimeter, then blend along the mesh.
      // The folded original right hand returns near the shoulder in space;
      // Euclidean falloff would incorrectly pin that distal hip-contact pad.
      const shoulderFalloff = side > 0 && !mirroredArm ? .022 : .078;
      const anchor = socket ? 1 - smooth(side > 0 && !mirroredArm ? .0001 : .004, shoulderFalloff,
        side > 0 && !mirroredArm ? surfaceDistance(point) : socket.distanceToPoint(point)) :
        1 - smooth(.018, .055, point.distanceTo(shoulder));
      const shoulderBand = foreLimit(point);
      const elbowWeight = smooth(upperAxis.length() - .025, upperAxis.length() + .025, along) * shoulderBand;
      const projectedHand = smooth(-.032, -.005, point.clone().sub(wrist).dot(palmAxis.clone().normalize()));
      const handWeight = projectedHand;
      return [[0, anchor], [1, (1 - anchor) * (1 - handWeight) * (1 - elbowWeight)],
        [2, (1 - anchor) * (1 - handWeight) * elbowWeight], [3, (1 - anchor) * handWeight]];
    });
    smoothArmWeights(bind.meshes, foreLimit, wrist);
    bindReplacementHand(bind.meshes, replacementHand);
    splitWristInfluences(bind.meshes);
    if (shoulderVolume) splitShoulderInfluences(bind.meshes);
    const planeNormal = new THREE.Vector3().crossVectors(upperAxis, foreAxis).normalize();
    arms.push({name, side, shoulder, elbow, wrist, palm, attach, upper, fore, hand, wristRoll, shoulderVolume, upperAxis, foreAxis, palmAxis, planeNormal,
      upperLength: upperAxis.length(), foreLength: foreAxis.length(), palmLength: palmAxis.length(), replacementHand: !!replacementHand, mirroredArm, sourcePalmNormal, ...bind, error: 0});
  }
  for (const [name, data] of Object.entries(metadata.legs)) {
    const part = source.getObjectByName(data.node);
    if (!part) throw new Error(`Missing original foot ${data.node}`);
    const hip = vector(data.hip), ankle = vector(data.ankle);
    const attach = new THREE.Bone(), shin = new THREE.Bone(), foot = new THREE.Bone();
    attach.name = `${name}_source_hip_attachment`; shin.name = `${name}_source_shin`; foot.name = `${name}_source_foot`;
    core.add(attach); attach.add(shin); shin.position.copy(hip); shin.add(foot); foot.position.copy(ankle).sub(hip);
    core.updateMatrixWorld(true);
    const bind = skinnedPart(part, [attach, shin, foot], point => {
      const anchored = smooth(hip.y - .024, hip.y + .002, point.y);
      // The approved shoe has a tall rounded heel and wide toe. A Y-only
      // split mistakes its rear rim for shin, driving that original surface
      // beneath the floor when the short leg folds forward. Keep the outer
      // shoe shell rigid with the foot; only its central upper neck bends.
      const radial = Math.hypot(point.x - ankle.x, point.z - ankle.z);
      const shoeShell = smooth(.030, .057, radial);
      const shoeHeight = 1 - smooth(ankle.y + .030, hip.y - .011, point.y);
      const footWeight = Math.max(shoeShell, shoeHeight);
      return [[0, anchored], [1, (1 - anchored) * (1 - footWeight)], [2, (1 - anchored) * footWeight]];
    });
    legs.push({name, side: name === 'left' ? -1 : 1, hip, ankle, shin, foot, axis: ankle.clone().sub(hip), ...bind});
  }

  function pose(p = {}, book = null) {
    if (book) book = {...book, leftHold: book.leftHold < .005 ? 0 : book.leftHold, rightHold: book.rightHold < .001 ? 0 : book.rightHold};
    const seat = clamp(p.sit || 0, 0, 1), transform = sourceCoreTransform(seat);
    core.position.set(0, transform.y, transform.z); core.rotation.x = transform.angle;
    object.updateWorldMatrix(true, true);
    const coreRotation = core.quaternion.clone(), inverseCore = coreRotation.clone().invert();
    const rootRotation = object.parent?.quaternion.clone() || new THREE.Quaternion();
    const worldToCoreRotation = core.getWorldQuaternion(new THREE.Quaternion()).invert();
    for (const arm of arms) {
      const elapsedStep = !p.reducedMotion && Number.isFinite(p.elapsed) && Number.isFinite(arm.lastPoseElapsed) ? clamp(p.elapsed - arm.lastPoseElapsed, 0, .1) : Infinity;
      arm.lastPoseElapsed = p.elapsed;
      const {side, shoulder, wrist, palm, palmAxis, upperAxis, foreAxis} = arm;
      const restPalm = palm.clone().applyMatrix4(core.matrix), contact = restPalm.clone();
      let palmDirection = palmAxis.clone().applyQuaternion(coreRotation), handRoll = 0;
      let bookHandAvatar = null;
      let privacyHandAvatar = null;
      let privacyWristAvatar = null;
      const catchHold = side > 0 ? clamp(book?.rightCatchHold || 0, 0, 1) : 0;
      const greetingEnd = book?.rightCatchGrip ? .035 : .10;
      const greetingStart = book?.rightCatchGrip ? 0 : .025;
      const greeting = ((p.greeting || 0) < .002 ? 0 : p.greeting) * (book ? 1 - smooth(greetingStart, greetingEnd, book.progress || 0) : 1);
      const choose = (weight, target, direction) => {
        if (!weight) return;
        contact.lerp(new THREE.Vector3(...target), clamp(weight, 0, 1));
        blendDirection(palmDirection, new THREE.Vector3(...direction), weight, arm.palmLength);
      };
      if (side < 0) {
        choose(greeting, [-.43, .635 + .018 * Math.sin((p.elapsed || 0) * 4), .20], [-.12, 1, .30]);
        handRoll = greeting ? (p.wave || 0) * .34 * Math.sin((p.elapsed || 0) * 6) : 0;
        choose(p.think || 0, [-.265, .455, .295], [.2, .7, .6]);
      }
      if (side < 0) choose((p.dance || 0) * .7,
        [-.39, .53 + .015 * Math.sin((p.elapsed || 0) * 4 + side), .08], [-.2, 1, .3]);
      if (catchHold && book.rightCatchGrip) {
        // Prepare the palm at the reachable landing point, never at the
        // falling prop's off-screen position. At contact this anchor and the
        // real cover grip coincide, so normal transport takes over smoothly.
        contact.lerp(book.rightCatchGrip, catchHold);
        blendDirection(palmDirection, new THREE.Vector3(.12, 1, .15), catchHold, arm.palmLength);
      }
      if (book && (side < 0 ? book.leftHold : book.rightHold)) {
        const hold = side < 0 ? book.leftHold : book.rightHold;
        const grip = side < 0 ? book.leftGrip : book.rightGrip;
        const shoulderAvatar = shoulder.clone().applyMatrix4(core.matrix);
        contact.lerp(grip, hold);
        const gripDirection = grip.clone().sub(shoulderAvatar);
        if (side > 0 && !arm.mirroredArm) {
          // The authored right fingers start folded backwards. Turn them up
          // before rolling onto the cover; the direct backward-to-forward
          // blend pulls the wrist close to its socket and snaps the elbow.
          const upright = new THREE.Vector3(.15, 1, .15).normalize();
          const uprightQ = new THREE.Quaternion().setFromUnitVectors(palmAxis.clone().normalize(), upright);
          const targetQ = new THREE.Quaternion().setFromUnitVectors(palmAxis.clone().normalize(), gripDirection.clone().normalize());
          const rotationHold = Math.min(hold, smooth(.18, .72, book.progress || 0));
          bookHandAvatar = rotationHold < .5 ? coreRotation.clone().slerp(uprightQ, smooth(0, .5, rotationHold)) :
            uprightQ.clone().slerp(targetQ, smooth(.5, 1, rotationHold));
          palmDirection.copy(palmAxis).applyQuaternion(bookHandAvatar);
        } else blendDirection(palmDirection, gripDirection, hold, arm.palmLength);
      }
      if (side < 0) choose(p.clutch || 0, [-.43, .66, .18], [.1, .9, .4]);
      const privacyAmount = clamp(p.cover || 0, 0, 1);
      const privacy = privacyAmount < .001 ? 0 : privacyAmount;
      const privacyBlend = smooth(.001, .06, privacy);
      const movement = Math.max(side < 0 ? greeting : 0, side < 0 ? p.think || 0 : 0,
        side < 0 ? (p.dance || 0) * .7 : 0, side < 0 ? p.clutch || 0 : 0, privacy,
        catchHold, book ? (side < 0 ? book.leftHold : book.rightHold) : 0);
      // A fused hand starts beside/back of the source body. Move around its
      // outer contour before coming forward; a straight palm interpolation
      // cuts through the cheek even when its final target is reachable.
      const clearanceArc = Math.sin(Math.PI * clamp(movement, 0, 1));
      const clutch = side < 0 ? clamp(p.clutch || 0, 0, 1) : 0;
      const cover = privacy;
      const outwardPose = Math.max(clutch, side < 0 ? greeting : 0);
      contact.x += side * (.060 - .055 * outwardPose) * clearanceArc;
      contact.z += (.040 - .015 * Math.max(clutch, cover)) * clearanceArc;
      if (book) {
        const hold = side < 0 ? book.leftHold : book.rightHold;
        if (side < 0 && hold < .3) contact.z += .05 * Math.sin(Math.PI * hold / .3);
        if (side > 0) contact.x += .028 * smooth(0, .12, hold) * (1 - smooth(.12, .4, hold));
      }
      if (privacy) {
        const previousDirection = palmDirection.clone();
        const previousHand = new THREE.Quaternion().setFromUnitVectors(palmAxis.clone().normalize(), previousDirection.clone().normalize());
        const previousWrist = contact.clone().sub(palmAxis.clone().applyQuaternion(previousHand));
        // The larger mirrored palm rests beside the back of the torso. Its
        // first/last few millimetres must travel outward before travelling
        // forward, otherwise the original embedded contact gets compressed.
        if (side > 0 && arm.replacementHand) previousWrist.z -= (.040 - .015 * cover) * clearanceArc;
        // Both original hands come round the outside first, then close over
        // their own lens. The right authored hand starts behind the hip, so
        // interpolating directly to the face would cut through the torso.
        const outside = new THREE.Vector3(side * .44, side > 0 ? .46 : .53, .19);
        const shield = new THREE.Vector3(side < 0 ? -.15 : .17, side < 0 || arm.replacementHand || arm.mirroredArm ? .605 : .625, .33);
        // A rejected password briefly lowers only the right shielding hand.
        // Keep the same inward palm frame and exact wrist offset so the
        // gesture bends the existing arm instead of separating its palm.
        const errorPeek = side > 0 ? clamp(p.errorPeek || 0, 0, 1) * smooth(.95, 1, privacy) : 0;
        shield.y -= .075 * errorPeek;
        shield.x += .055 * errorPeek;
        const first = smooth(0, .52, privacy), closing = smooth(.52, 1, privacy);
        contact.copy(restPalm).lerp(outside, first).lerp(shield, closing);
        const sourceNormal = arm.sourcePalmNormal.clone();
        const sourceFingers = palmAxis.clone().addScaledVector(sourceNormal, -palmAxis.dot(sourceNormal)).normalize();
        const shieldNormal = new THREE.Vector3(0, 0, -1);
        const shielding = frameRotation(sourceFingers, sourceNormal, Y, shieldNormal);
        privacyHandAvatar = coreRotation.clone().slerp(shielding, smooth(.15, .9, privacy));
        palmDirection.copy(palmAxis).applyQuaternion(privacyHandAvatar);
        // The original right palm curls behind its hip. Its wrist must go
        // round the outer side before turning up; solving a linearly moving
        // palm while rotating it sweeps the wrist across the shoulder axis
        // and reverses the IK bend plane halfway through lifting.
        const matchingArm = side < 0 || arm.mirroredArm;
        const outerWrist = new THREE.Vector3(side * (matchingArm ? .45 : .47), matchingArm ? .47 : .33, matchingArm ? .19 : -.02);
        const forwardWrist = new THREE.Vector3(side * (matchingArm ? .41 : .44), matchingArm ? .49 : .42, matchingArm ? .32 : .27);
        const shieldWrist = shield.clone().sub(palmAxis.clone().applyQuaternion(shielding));
        privacyWristAvatar = wrist.clone().applyMatrix4(core.matrix);
        if (privacy < .25) {
          privacyWristAvatar.lerp(outerWrist, smooth(0, .25, privacy));
          if (side > 0 && arm.replacementHand) privacyWristAvatar.z = THREE.MathUtils.lerp(wrist.clone().applyMatrix4(core.matrix).z, outerWrist.z, smooth(.025, .25, privacy));
        }
        else if (privacy < .68) privacyWristAvatar.copy(outerWrist).lerp(forwardWrist, smooth(.25, .68, privacy));
        else privacyWristAvatar.copy(forwardWrist).lerp(shieldWrist, smooth(.68, 1, privacy));
        privacyWristAvatar.copy(previousWrist.lerp(privacyWristAvatar, privacyBlend));
        blendDirection(previousDirection, palmDirection, privacyBlend, arm.palmLength); palmDirection.copy(previousDirection);
      }
      const desiredHandAvatar = new THREE.Quaternion().setFromUnitVectors(palmAxis.clone().normalize(), palmDirection.clone().normalize());
      const wristAvatar = privacyWristAvatar || contact.clone().sub(palmAxis.clone().applyQuaternion(desiredHandAvatar));
      const wristCore = wristAvatar.applyMatrix4(core.matrix.clone().invert());
      const poleTarget = side > 0 ? new THREE.Vector3(.49, shoulder.y - .025, .16) :
        new THREE.Vector3(-.49, shoulder.y - .025, .16);
      // Catching starts above the shoulder and lowers into the reading pose.
      // Keep the elbow outside/below that swept wrist axis, avoiding a bend
      // plane reversal as the prop crosses shoulder height.
      if (side > 0 && book?.rightCatchGrip) poleTarget.set(.60, shoulder.y - .15, 0);
      if (privacy) poleTarget.lerp(new THREE.Vector3(side * .45, .35, .32), privacy);
      const pole = arm.elbow.clone().lerp(poleTarget, clamp(movement, 0, 1));
      const jointShoulder = shoulder.clone().applyAxisAngle(Y, -side * .70 * privacy);
      const shoulderRotation = new THREE.Quaternion().setFromAxisAngle(Y, -side * .70 * privacy);
      // Protract the socket without narrowing the original shoulder span;
      // an uncorrected Y arc pulls the thick proximal arm inside the frames.
      const shoulderShift = new THREE.Vector3(side * .015 * privacy + (side > 0 ? .004 * (book?.rightHold || 0) : 0), -.03 * privacy, .01 * privacy);
      jointShoulder.add(shoulderShift); arm.attach.position.copy(shoulderShift);
      const bookElbowClearance = side > 0 && book ? book.rightHold * (.012 + .006 * smooth(.2, .4, book.progress || 0) * (1 - smooth(.6, .85, book.progress || 0))) : 0;
      jointShoulder.x += bookElbowClearance;
      if (privacy) {
        const privacyPole = arm.elbow.clone().lerp(jointShoulder.clone().add(new THREE.Vector3(side * .40, .02, -.05)), smooth(0, .55, privacy));
        privacyPole.lerp(new THREE.Vector3(side < 0 ? -.4 : .45, .2, side < 0 || arm.mirroredArm ? .15 : .30), smooth(.72, 1, privacy));
        pole.lerp(privacyPole, privacyBlend);
      }
      arm.attach.quaternion.copy(shoulderRotation);
      arm.upper.position.copy(shoulder).add(new THREE.Vector3(bookElbowClearance, 0, 0).applyQuaternion(shoulderRotation.clone().invert()));
      const solved = solveSourceArm(jointShoulder, wristCore, pole, arm.upperLength, arm.foreLength);
      arm.error = solved.error;
      const nextUpper = solved.elbow.clone().sub(jointShoulder), nextFore = solved.wrist.clone().sub(solved.elbow);
      const nextNormal = new THREE.Vector3().crossVectors(nextUpper, nextFore).normalize();
      // One shared bend plane maps the authored thick curved arm as a volume.
      // Independent shortest-arc rotations introduce an arbitrary axial twist
      // between upper and forearm, folding its inner surface through the body.
      const upperQ = frameRotation(upperAxis, arm.planeNormal, nextUpper, nextNormal);
      if (side > 0 && book?.rightHold) {
        const untwisted = new THREE.Quaternion().setFromUnitVectors(upperAxis.clone().normalize(), nextUpper.clone().normalize());
        upperQ.slerp(untwisted, clamp(book.rightHold, 0, 1));
      }
      // The shoulder owns the bend-plane roll. Transport the distal axis by
      // its shortest rotation so a changing elbow pole cannot spin the thick
      // forearm around its own axis during the first book pickup.
      const foreQ = new THREE.Quaternion().setFromUnitVectors(foreAxis.clone().normalize(), nextFore.clone().normalize());
      if (side > 0 && book?.rightHold) {
        const transportedAxis = foreAxis.clone().applyQuaternion(upperQ).normalize();
        const transported = new THREE.Quaternion().setFromUnitVectors(transportedAxis, nextFore.clone().normalize()).multiply(upperQ);
        foreQ.slerp(transported, .7 * clamp(book.rightHold, 0, 1));
      }
      if (privacy) {
        // Start from one shared anatomical bend plane, then distribute the
        // palm-facing roll across the whole chain instead of twisting only
        // the short wrist collar through a half turn.
        const commonUpper = frameRotation(upperAxis, arm.planeNormal, nextUpper, nextNormal);
        const commonFore = frameRotation(foreAxis, arm.planeNormal, nextFore, nextNormal);
        upperQ.slerp(commonUpper, privacyBlend);
        const privateFore = commonFore.clone();
        const foreDirection = nextFore.clone().normalize();
        const sourcePalmNormal = arm.sourcePalmNormal.clone();
        const fromFacing = sourcePalmNormal.clone().applyQuaternion(commonFore);
        const toFacing = sourcePalmNormal.clone().applyQuaternion(inverseCore.clone().multiply(privacyHandAvatar));
        fromFacing.addScaledVector(foreDirection, -fromFacing.dot(foreDirection)).normalize();
        toFacing.addScaledVector(foreDirection, -toFacing.dot(foreDirection)).normalize();
        let roll = Math.atan2(foreDirection.dot(fromFacing.clone().cross(toFacing)), fromFacing.dot(toFacing));
        const previousRoll = arm.previousPrivacyRoll ?? roll;
        while (roll - previousRoll > Math.PI) roll -= Math.PI * 2;
        while (roll - previousRoll < -Math.PI) roll += Math.PI * 2;
        arm.previousPrivacyRoll = roll;
        // When the palm normal is nearly parallel to the forearm, its axial
        // projection has no stable angle. Limit only that free axial twist;
        // the exact elbow/wrist positions and palm orientation stay fixed.
        const previousApplied = arm.appliedPrivacyRoll ?? 0;
        const step = 4 * elapsedStep;
        arm.appliedPrivacyRoll = previousApplied + clamp(roll - previousApplied, -step, step);
        privateFore.premultiply(new THREE.Quaternion().setFromAxisAngle(foreDirection, arm.appliedPrivacyRoll));
        foreQ.slerp(privateFore, privacyBlend);
      } else {
        arm.previousPrivacyRoll = 0;
        arm.appliedPrivacyRoll = 0;
      }
      // A small source-forearm pronation brings the rounded inner surface in
      // front of the frame during privacy, rather than pushing through it.
      const pronation = 0;
      const foreRoll = new THREE.Quaternion().setFromAxisAngle(nextFore.clone().normalize(), pronation);
      foreQ.premultiply(foreRoll);
      arm.upper.quaternion.copy(shoulderRotation.clone().invert().multiply(upperQ));
      arm.fore.quaternion.copy(upperQ.clone().invert().multiply(foreQ));
      const handDirection = palmDirection.clone().applyQuaternion(inverseCore).normalize();
      const handQ = bookHandAvatar ? inverseCore.clone().multiply(bookHandAvatar) : side > 0 && !arm.mirroredArm ?
        new THREE.Quaternion().setFromUnitVectors(palmAxis.clone().normalize(), handDirection) :
        frameRotation(palmAxis, arm.planeNormal, handDirection, nextNormal.clone().applyQuaternion(foreRoll));
      if (privacyHandAvatar) handQ.slerp(inverseCore.clone().multiply(privacyHandAvatar), privacyBlend);
      if (side > 0 && book?.rightHold) {
        const transportedAxis = palmAxis.clone().applyQuaternion(foreQ).normalize();
        const transported = new THREE.Quaternion().setFromUnitVectors(transportedAxis, handDirection).multiply(foreQ);
        handQ.slerp(transported, .7 * clamp(book.rightHold, 0, 1) * smooth(.84, .97, book.progress || 0));
      }
      if (handRoll) handQ.multiply(new THREE.Quaternion().setFromAxisAngle(palmAxis.clone().normalize(), handRoll));
      arm.hand.quaternion.copy(foreQ.clone().invert().multiply(handQ));
      poseWristCorrective(arm, foreQ, handQ, smooth(.75, .95, privacy));
      poseShoulderCorrective(arm, arm.mirroredArm ? 0 : smooth(.65, .95, privacy));
    }
    object.updateWorldMatrix(true, true);
    for (const leg of legs) {
      const lift = leg.name === 'left' ? p.stepLeft || 0 : p.stepRight || 0;
      const hipWorld = core.localToWorld(leg.hip.clone());
      const target = leg.ankle.clone(); target.z += .055 * seat - .025 * lift;
      object.localToWorld(target); target.y = leg.ankle.y + .030 * lift;
      const length = leg.axis.length(), dy = clamp(target.y - hipWorld.y, -length + .0001, length - .0001);
      // Solve the short original shin onto the ground arc, rather than scale
      // it or shrink the original shoe to imitate a seated human skeleton.
      const horizontal = Math.sqrt(Math.max(0, length * length - dy * dy));
      const forward = new THREE.Vector3(0, 0, 1).applyQuaternion(rootRotation); forward.y = 0; forward.normalize();
      const originalHeading = target.clone().sub(hipWorld); originalHeading.y = 0;
      if (originalHeading.lengthSq() < 1e-10) originalHeading.copy(forward);
      originalHeading.normalize();
      // At rest the two authored ankles sit slightly outside their hip axes.
      // Rotate that true horizontal heading onto the seated forward arc over
      // the first quarter of sitting, instead of snapping it to +Z at .001.
      blendDirection(originalHeading, forward, smooth(0, .25, seat), 1);
      target.copy(hipWorld).addScaledVector(originalHeading, horizontal); target.y = hipWorld.y + dy;
      const localTarget = core.worldToLocal(target);
      const direction = localTarget.sub(leg.hip).normalize();
      leg.shin.quaternion.setFromUnitVectors(leg.axis.clone().normalize(), direction);
      leg.foot.quaternion.copy(leg.shin.quaternion.clone().invert().multiply(worldToCoreRotation));
    }
    object.updateWorldMatrix(true, true);
    for (const part of [...arms, ...legs]) part.skeleton.update();
    return {coreY: transform.y, corePitch: transform.angle,
      armReachError: Math.max(...arms.map(arm => arm.error)), sourceScale: [1, 1, 1]};
  }
  pose();
  return {object, core, arms, legs, pose};
}
