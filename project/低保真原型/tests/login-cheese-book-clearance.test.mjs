import test from 'node:test';
import assert from 'node:assert/strict';
import * as THREE from 'three';
import {createCheeseBook} from '../src/login-cheese-book.js';
import {createCheeseArms} from '../src/login-cheese-arms.js';

test('opening, closing and interrupted stowing keep the book outside the torso envelope', () => {
  const book = createCheeseBook();
  // Conservatively contains the repaired torso, including its side walls.
  const torso = new THREE.Box3(new THREE.Vector3(-.335, .15, -.25), new THREE.Vector3(.335, .85, .24));
  for (let p = 0; p <= 100; p++) for (const stow of [0, .25, .5, .75, 1]) for (const turn of [.0, .25, .5, .75]) {
    book.arrange(p / 100, stow, turn); book.object.updateMatrixWorld(true);
    if (!book.object.visible) continue;
    book.object.traverse(mesh => {
      if (!mesh.isMesh || !mesh.visible) return;
      const bounds = new THREE.Box3().setFromObject(mesh);
      assert.equal(bounds.intersectsBox(torso), false, `book enters torso at progress=${p / 100}, stow=${stow}, turn=${turn}`);
    });
  }
});

test('a turning leaf clears both hands throughout its sweep', () => {
  const book = createCheeseBook(), arms = createCheeseArms(), ray = new THREE.Raycaster();
  const a = new THREE.Vector3(), b = new THREE.Vector3(), direction = new THREE.Vector3();
  for (let frame = 1; frame < 40; frame++) {
    const grip = book.arrange(1, 0, frame / 40);
    arms.pose({read: 1, bookGrip: grip});
    book.object.updateMatrixWorld(true); arms.object.updateMatrixWorld(true);
    const hands = [];
    for (const side of ['Left', 'Right']) arms.object.getObjectByName(`Cheese_${side}_Mitten`).traverse(mesh => {
      if (mesh.isMesh) {mesh.material.side = THREE.DoubleSide; hands.push(mesh);}
    });
    const leaf = book.object.children.find(mesh => mesh.geometry?.type === 'PlaneGeometry');
    const {position} = leaf.geometry.attributes, indices = leaf.geometry.index.array;
    for (let i = 0; i < indices.length; i += 3) for (let edge = 0; edge < 3; edge++) {
      a.fromBufferAttribute(position, indices[i + edge]).applyMatrix4(leaf.matrixWorld);
      b.fromBufferAttribute(position, indices[i + (edge + 1) % 3]).applyMatrix4(leaf.matrixWorld);
      direction.subVectors(b, a); const length = direction.length();
      ray.set(a, direction.normalize()); ray.near = .00001; ray.far = length - .00001;
      assert.equal(ray.intersectObjects(hands, false).length, 0, `turning leaf crosses a hand at frame ${frame}`);
    }
  }
});

test('the short right arm follows the held book without stretching or losing its grip', () => {
  const book = createCheeseBook(), arms = createCheeseArms();
  for (let frame = 0; frame <= 100; frame++) {
    const progress = frame / 100, grip = book.arrange(progress, 0, 0);
    arms.pose({read: progress, carry: 1 - progress, bookGrip: grip});
    const palm = arms.object.getObjectByName('Cheese_Right_Mitten');
    assert.ok(palm.position.distanceTo(grip.right) < .002, `right palm loses its book at progress ${progress}`);
  }
});
