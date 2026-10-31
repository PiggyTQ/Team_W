import test from 'node:test';
import assert from 'node:assert/strict';
import * as THREE from 'three';
import {readFileSync} from 'node:fs';
import {createCheeseArms, solveArmElbow, CHEESE_ARM_LENGTHS} from '../src/login-cheese-arms.js';
import {createCheeseEyelids} from '../src/login-cheese-eyelids.js';

test('arm IK keeps both bone lengths while the hand moves around the face', () => {
  const shoulder = new THREE.Vector3(.30, .42, .18), hint = new THREE.Vector3(.41, .33, .16);
  for (const target of [[.25, .34, .35], [.16, .50, .29], [.25, .61, .25], [.37, .52, .20]]) {
    const wrist = new THREE.Vector3(...target), elbow = solveArmElbow(shoulder, wrist, hint);
    assert.ok(Math.abs(elbow.distanceTo(shoulder) - CHEESE_ARM_LENGTHS.upper) < 1e-8);
    assert.ok(Math.abs(elbow.distanceTo(wrist) - CHEESE_ARM_LENGTHS.fore) < 1e-8);
  }
});

test('all action poses keep the upper arm, elbow and wrist connected', () => {
  const rig = createCheeseArms();
  for (const progress of [{greeting: 1, wave: .65}, {read: 1}, {cover: 1}, {clutch: 1}, {think: 1, carry: 1}, {dance: 1}]) {
    rig.pose(progress); rig.object.updateMatrixWorld(true);
    for (const side of ['Left', 'Right']) {
      const arm = rig.object.getObjectByName(`Cheese_${side}_Arm`);
      const upper = arm.getObjectByName('Upper_Arm'), fore = arm.getObjectByName('Forearm');
      const elbow = arm.getObjectByName('Elbow').getWorldPosition(new THREE.Vector3());
      const wrist = arm.getObjectByName('Wrist').getWorldPosition(new THREE.Vector3());
      assert.ok(Math.abs(upper.scale.y - .10) < 1e-7, 'upper arm must keep the short source proportions');
      assert.ok(Math.abs(fore.scale.y - .12) < 1e-7, 'forearm must never stretch to reach a gesture');
      assert.ok(upper.localToWorld(new THREE.Vector3(0, .5, 0)).distanceTo(elbow) < 1e-7);
      assert.ok(fore.localToWorld(new THREE.Vector3(0, -.5, 0)).distanceTo(elbow) < 1e-7);
      assert.ok(fore.localToWorld(new THREE.Vector3(0, .5, 0)).distanceTo(wrist) < 1e-7);
    }
    rig.object.traverse(child => {
      if (!child.isMesh) return;
      assert.ok(child.scale.toArray().every(value => value > 0 && Number.isFinite(value)));
      assert.ok(child.position.toArray().every(Number.isFinite));
    });
  }
});

test('eyelids cover the source eye contour without changing the source geometry', () => {
  const glb = readFileSync(new URL('../public/mascot/cheese-source-faithful.glb', import.meta.url));
  const jsonLength = glb.readUInt32LE(12), doc = JSON.parse(glb.subarray(20, 20 + jsonLength));
  const binaryOffset = 28 + jsonLength;
  const material = doc.materials.findIndex(material => material.name.startsWith('Eyes analytic'));
  const primitive = doc.meshes.flatMap(mesh => mesh.primitives).find(primitive => primitive.material === material);
  function attribute(index) {
    const accessor = doc.accessors[index], view = doc.bufferViews[accessor.bufferView];
    const dimensions = {VEC3: 3, SCALAR: 1}[accessor.type];
    const bytes = accessor.componentType === 5126 || accessor.componentType === 5125 ? 4 : 2;
    const values = new (accessor.componentType === 5126 ? Float32Array : Uint32Array)(accessor.count * dimensions);
    for (let i = 0; i < accessor.count; i++) for (let j = 0; j < dimensions; j++) {
      const offset = binaryOffset + (view.byteOffset || 0) + (accessor.byteOffset || 0) + i * (view.byteStride || dimensions * bytes) + j * bytes;
      values[i * dimensions + j] = accessor.componentType === 5126 ? glb.readFloatLE(offset) : bytes === 4 ? glb.readUInt32LE(offset) : glb.readUInt16LE(offset);
    }
    return new THREE.BufferAttribute(values, dimensions);
  }
  const geometry = new THREE.BufferGeometry();
  geometry.setAttribute('position', attribute(primitive.attributes.POSITION));
  geometry.setAttribute('normal', attribute(primitive.attributes.NORMAL));
  geometry.setIndex(attribute(primitive.indices));
  const before = geometry.attributes.position.array.slice();
  const eyes = createCheeseEyelids();
  eyes.captureEyeSurface(new THREE.Mesh(geometry));
  assert.deepEqual(geometry.attributes.position.array, before, 'source vertices must stay untouched');
  eyes.pose(0); assert.equal(eyes.object.visible, false);
  eyes.pose(1); assert.equal(eyes.object.visible, true);
  for (const lid of eyes.object.children) assert.equal(lid.scale.y, 1);
  const skin = eyes.object.getObjectByName('Upper_Lid_Skin').material;
  geometry.computeBoundingBox();
  assert.ok(skin.userData.upperLidBoundary.value + .0015 < geometry.boundingBox.min.y, 'full closure must cover every source-eye vertex');
  const creases = eyes.object.children.filter(child => child.name === 'Authored_Eye_Closed_Crease');
  assert.equal(creases.length, 2);
  for (const crease of creases) {
    crease.geometry.computeBoundingBox();
    assert.ok(crease.geometry.boundingBox.min.y > geometry.boundingBox.min.y + .04);
    assert.ok(crease.geometry.boundingBox.max.y < geometry.boundingBox.max.y - .04);
    assert.ok(crease.geometry.boundingBox.max.z < geometry.boundingBox.max.z + .01, 'crease must hug the source eye surface');
  }
  let previous = .465;
  for (const amount of [.75, .5, .25, 0]) {
    eyes.pose(amount);
    assert.ok(skin.userData.upperLidBoundary.value > previous, 'opening must lift the upper eyelid edge');
    previous = skin.userData.upperLidBoundary.value;
  }
  eyes.pose(.4);
  assert.equal(eyes.object.children.filter(lid => lid.geometry?.type === 'TubeGeometry' && lid.visible).length, 0);
});
