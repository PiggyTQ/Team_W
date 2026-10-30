import test from 'node:test';
import assert from 'node:assert/strict';
import * as THREE from 'three';
import {readFileSync} from 'node:fs';
import {createCheeseSourceBook, SOURCE_BOOK_LAYOUT, SOURCE_BOOK_ARM_METRICS} from '../src/login-cheese-source-book.js';

const source = JSON.parse(readFileSync(new URL('../public/mascot/cheese-source-articulated-rig.json', import.meta.url)));
function coreTransform(seat) {
  const angle = .04 * seat;
  const matrix = new THREE.Matrix4().makeRotationX(angle);
  matrix.setPosition(0, -.095 * seat + .13 * (1 - Math.cos(angle)), -.13 * Math.sin(angle));
  return matrix;
}

const triangle = new THREE.Triangle();
function eachTriangle(mesh, visit, inverse = null) {
  const positions = mesh.geometry.attributes.position;
  const indices = mesh.geometry.index;
  const count = indices?.count ?? positions.count;
  for (let i = 0; i < count; i += 3) {
    for (let j = 0; j < 3; j++) {
      const vertex = indices ? indices.getX(i + j) : i + j;
      triangle[['a', 'b', 'c'][j]].fromBufferAttribute(positions, vertex).applyMatrix4(mesh.matrixWorld);
      if (inverse) triangle[['a', 'b', 'c'][j]].applyMatrix4(inverse);
    }
    visit(triangle);
  }
}

test('the reversible transport clears the source torso at every seated height', () => {
  const book = createCheeseSourceBook();
  const point = new THREE.Vector3();
  for (const seat of [0, .25, .5, .75, 1]) for (let frame = 0; frame <= 250; frame++) {
    const progress = frame / 250;
    book.arrange({progress, seat, turn: .37});
    book.object.updateMatrixWorld(true);
    const inverse = coreTransform(seat).invert();
    const torso = new THREE.Box3(new THREE.Vector3(-.335, .1121, -.25), new THREE.Vector3(.335, 1.0, .17));
    if (!book.object.visible) continue;
    book.object.traverse(mesh => {
      if (!mesh.isMesh || !mesh.visible) return;
      eachTriangle(mesh, face => assert.equal(torso.intersectsTriangle(face), false, `torso collision q=${progress} seat=${seat} mesh=${mesh.name || mesh.geometry.type}`), inverse);
      const positions = mesh.geometry.attributes.position;
      for (let i = 0; i < positions.count; i++) {
        point.fromBufferAttribute(positions, i).applyMatrix4(mesh.matrixWorld);
        assert.ok(point.y > .018, 'the covers, page and ribbon must stay above the floor');
      }
    });
  }
  book.dispose();
});

test('opening and a full curled-page sweep stay below or in front of the glasses', () => {
  const book = createCheeseSourceBook();
  for (const seat of [0, .5, 1]) for (let frame = 0; frame <= 100; frame++) {
    for (const progress of [.63, .69, .75, .81, .87, .94, 1]) {
      book.arrange({progress, seat, turn: frame / 100});
      book.object.updateMatrixWorld(true);
      // Actual source Accessories bounds, tested after undoing the exact core
      // sit/lean rather than an approximate world-space box from an older rig.
      const glasses = new THREE.Box3(new THREE.Vector3(-.338603, .424827, -.132817), new THREE.Vector3(.344390, .764360, .220602));
      const inverse = coreTransform(seat).invert();
      book.object.traverse(mesh => {
        if (!mesh.isMesh || !mesh.visible) return;
        eachTriangle(mesh, face => assert.equal(glasses.intersectsTriangle(face), false, `glasses collision q=${progress} turn=${frame / 100} seat=${seat} mesh=${mesh.name}`), inverse);
      });
    }
  }
  book.dispose();
});

test('both fixed-length source arms can reach the designated wrist offsets', () => {
  const book = createCheeseSourceBook();
  const leftShoulder = new THREE.Vector3(), rightShoulder = new THREE.Vector3();
  const lengths = {};
  for (const side of ['left', 'right']) {
    const arm = source.arms[side];
    const v = name => new THREE.Vector3(...arm[name]);
    lengths[side] = v('shoulder').distanceTo(v('elbow')) + v('elbow').distanceTo(v('wrist'));
    assert.ok(Math.abs(lengths[side] - SOURCE_BOOK_ARM_METRICS[side].reach) < 1e-12);
    assert.ok(Math.abs(v('wrist').distanceTo(v('palm')) - SOURCE_BOOK_ARM_METRICS[side].palmLength) < 1e-12);
  }
  for (const seat of [0, .5, 1]) for (let frame = 0; frame <= 300; frame++) {
    const pose = book.arrange({progress: frame / 300, seat, turn: .35});
    leftShoulder.fromArray(source.arms.left.shoulder).applyMatrix4(coreTransform(seat));
    rightShoulder.fromArray(source.arms.right.shoulder).applyMatrix4(coreTransform(seat));
    if (pose.rightHold > .99) {
      assert.ok(rightShoulder.distanceTo(pose.rightWrist) < lengths.right, `right original arm would stretch at q=${frame / 300}: ${rightShoulder.distanceTo(pose.rightWrist)} > ${lengths.right}`);
      assert.ok(Math.abs(pose.rightWrist.distanceTo(pose.rightGrip) - SOURCE_BOOK_ARM_METRICS.right.palmLength) < 1e-12);
    }
    if (pose.leftHold > .99) {
      assert.ok(leftShoulder.distanceTo(pose.leftWrist) < lengths.left, `left original arm would stretch at q=${frame / 300}`);
      assert.ok(Math.abs(pose.leftWrist.distanceTo(pose.leftGrip) - SOURCE_BOOK_ARM_METRICS.left.palmLength) < 1e-12);
    }
  }
  book.dispose();
});

test('grips are actual cover anchors and an interrupted path has no hysteresis', () => {
  const book = createCheeseSourceBook();
  const points = new Map();
  const forward = [.12, .28, .47, .65, .78, .90, .97, 1];
  for (const progress of forward) {
    const pose = book.arrange({progress, seat: .7, turn: .35});
    points.set(progress, {left: pose.leftGrip.toArray(), right: pose.rightGrip.toArray(), position: book.object.position.toArray(), rotation: book.object.quaternion.toArray()});
  }
  for (const progress of [...forward].reverse()) {
    const pose = book.arrange({progress, seat: .7, turn: .35});
    assert.deepEqual({left: pose.leftGrip.toArray(), right: pose.rightGrip.toArray(), position: book.object.position.toArray(), rotation: book.object.quaternion.toArray()}, points.get(progress));
    book.object.updateMatrixWorld(true);
    const cover = book.object.getObjectByName('Source_Book_Right_Cover');
    const local = cover.worldToLocal(pose.rightGrip.clone());
    assert.ok(local.x >= .008 - 1e-10 && local.x <= SOURCE_BOOK_LAYOUT.width / 2 - .008 + 1e-10);
    assert.ok(Math.abs(local.y - SOURCE_BOOK_LAYOUT.gripHeight) < 1e-10);
    assert.ok(Math.abs(local.z - .006) < 1e-10);
  }
  book.dispose();
});

test('a falling closed book meets a reachable waiting palm before the carry takes over', () => {
  const book = createCheeseSourceBook();
  let previousHeight = Infinity;
  const waitingPoints = [];
  for (let frame = 1; frame <= 60; frame++) {
    const progress = .15 * frame / 60;
    const pose = book.arrange({progress, seat: 0});
    assert.ok(book.object.position.y < previousHeight, 'the visible entry must travel down from above');
    previousHeight = book.object.position.y;
    assert.equal(pose.open, 0, 'falling covers stay closed');
    assert.equal(pose.rightHold, 0, 'the hand must not chase the book while it is in the air');
    assert.ok(pose.rightShoulder.distanceTo(pose.rightCatchGrip) - SOURCE_BOOK_ARM_METRICS.right.palmLength < SOURCE_BOOK_ARM_METRICS.right.reach,
      'the waiting palm must stay inside the original arm reach');
    waitingPoints.push(pose.rightCatchGrip.clone());
  }
  const landed = book.arrange({progress: .15, seat: 0});
  assert.ok(landed.rightCatchGrip.distanceTo(landed.rightGrip) < 1e-12, 'book and waiting palm must meet without a snap');
  assert.equal(landed.rightCatchHold, 1);
  for (const point of waitingPoints) assert.ok(Math.abs(point.y - landed.rightGrip.y) < .003,
    'the waiting hand stays at the catch height instead of following the falling book');
  const handoff = book.arrange({progress: .38, seat: 0});
  assert.equal(handoff.rightHold, 1);
  assert.equal(handoff.rightCatchHold, 1, 'the waiting grasp stays engaged until the normal grasp has fully taken over');
  for (const progress of [.15, .17, .21, .25, .42]) {
    const pose = book.arrange({progress, seat: 0});
    assert.ok(pose.rightCatchGrip.distanceTo(pose.rightGrip) < 1e-12, 'catch and real grip paths coincide through handoff');
  }
  const gentle = book.arrange({progress: .08, seat: 0, reducedMotion: true});
  assert.equal(gentle.rightCatchHold, 0);
  assert.ok(book.object.position.y < .4, 'reduced motion keeps the book on the original low carry path');
  book.dispose();
});

test('a page reset is invisible, and reversing a turn reuses the same geometry', () => {
  const book = createCheeseSourceBook();
  const leaf = book.object.getObjectByName('Source_Book_Curled_Turning_Leaf');
  for (const turn of [0, .0001, .9999, 1, 2, -1]) {
    const pose = book.arrange({progress: 1, seat: 1, turn});
    assert.equal(pose.pageOpacity, 0);
    assert.equal(leaf.visible, false);
  }
  const pages = new Map();
  for (const turn of [.05, .25, .5, .75, .95]) {
    book.arrange({progress: 1, seat: 1, turn});
    pages.set(turn, leaf.geometry.attributes.position.array.slice());
  }
  for (const turn of [.95, .75, .5, .25, .05]) {
    book.arrange({progress: 1, seat: 1, turn});
    assert.deepEqual(leaf.geometry.attributes.position.array, pages.get(turn));
  }
  book.arrange({progress: 1, seat: 1, turn: .5});
  const bounds = new THREE.Box3().setFromObject(book.object);
  assert.ok(bounds.max.x - bounds.min.x < .70, 'opened book must remain narrower than the source character silhouette');
  book.dispose();
});
