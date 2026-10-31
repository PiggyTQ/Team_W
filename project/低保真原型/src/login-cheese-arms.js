import * as THREE from 'three';

const UP = new THREE.Vector3(0, 1, 0);
const clamp = THREE.MathUtils.clamp;

/** Two rigid bones bend toward an outer elbow hint, keeping a solid joint. */
export const CHEESE_ARM_LENGTHS = Object.freeze({upper: .10, fore: .12});
export function solveArmElbow(shoulder, wrist, hint, upperLength = CHEESE_ARM_LENGTHS.upper, foreLength = CHEESE_ARM_LENGTHS.fore) {
  const direction = new THREE.Vector3().subVectors(wrist, shoulder);
  const distance = Math.max(direction.length(), .0001);
  direction.divideScalar(distance);
  const reach = clamp(distance, Math.abs(upperLength - foreLength) + .0001, upperLength + foreLength - .0001);
  const along = (upperLength * upperLength - foreLength * foreLength + reach * reach) / (2 * reach);
  const height = Math.sqrt(Math.max(0, upperLength * upperLength - along * along));
  const bend = new THREE.Vector3().subVectors(hint, shoulder);
  bend.addScaledVector(direction, -bend.dot(direction));
  if (bend.lengthSq() < .000001) bend.set(0, 0, 1).addScaledVector(direction, -direction.z);
  bend.normalize();
  return new THREE.Vector3().copy(shoulder).addScaledVector(direction, along).addScaledVector(bend, height);
}

/** Closed rounded limbs; input contains only existing animation progress. */
export function createCheeseArms() {
  const object = new THREE.Group(); object.name = 'Cheese_Articulated_Arms';
  const material = new THREE.MeshStandardMaterial({color: 0xedbe43, roughness: .46, metalness: 0});
  material.name = 'Cheddar / articulated solid limbs';
  const sphere = new THREE.SphereGeometry(1, 28, 20);
  const fingerShape = new THREE.CapsuleGeometry(1, 1, 5, 14);
  const upperShape = new THREE.CylinderGeometry(1.1, .85, 1, 20);
  const foreShape = new THREE.CylinderGeometry(1.1, .9, 1, 20);
  const arms = [];

  function mesh(geometry, parent) {
    const value = new THREE.Mesh(geometry, material);
    value.castShadow = true; value.receiveShadow = true; parent.add(value); return value;
  }
  function roundedSegment(parent, start, end, radius) {
    const value = mesh(fingerShape, parent), direction = new THREE.Vector3().subVectors(end, start);
    value.position.copy(start).add(end).multiplyScalar(.5);
    // The shared capsule has total height three; these short segments overlap
    // inside the palm and at each finger joint so every visible end is round.
    value.scale.set(radius, direction.length() / 3, radius);
    value.quaternion.setFromUnitVectors(UP, direction.normalize());
    return value;
  }
  for (const side of [-1, 1]) {
    const group = new THREE.Group(); group.name = side < 0 ? 'Cheese_Left_Arm' : 'Cheese_Right_Arm'; object.add(group);
    const shoulder = new THREE.Vector3(side * .30, .42, .10);
    const upper = mesh(upperShape, group), fore = mesh(foreShape, group);
    const shoulderJoint = mesh(sphere, group), elbowJoint = mesh(sphere, group), wristJoint = mesh(sphere, group);
    upper.name = 'Upper_Arm'; fore.name = 'Forearm'; shoulderJoint.name = 'Shoulder'; elbowJoint.name = 'Elbow'; wristJoint.name = 'Wrist';
    shoulderJoint.scale.setScalar(.029); elbowJoint.scale.setScalar(.034); wristJoint.scale.setScalar(.035);
    shoulderJoint.position.copy(shoulder);
    const hand = new THREE.Group(); hand.name = side < 0 ? 'Cheese_Left_Mitten' : 'Cheese_Right_Mitten'; group.add(hand);
    const palm = mesh(sphere, hand); palm.position.set(0, -.013, 0); palm.scale.set(.065, .080, .040);
    const fingers = [];
    const lengths = [.049, .063, .060, .046];
    for (let i = 0; i < 4; i++) {
      const finger = new THREE.Group(); finger.position.set((i - 1.5) * .028, .045, .003); hand.add(finger);
      const length = lengths[i], rootLength = length * .54, tipLength = length * .46;
      roundedSegment(finger, new THREE.Vector3(0, -.009, 0), new THREE.Vector3(0, rootLength, 0), .0155);
      const tip = new THREE.Group(); tip.position.y = rootLength - .006; finger.add(tip);
      roundedSegment(tip, new THREE.Vector3(0, -.006, 0), new THREE.Vector3(0, tipLength + .008, 0), .015);
      fingers.push({root: finger, tip});
    }
    const thumb = new THREE.Group(); thumb.position.set(-side * .052, -.017, .016); hand.add(thumb);
    roundedSegment(thumb, new THREE.Vector3(0, -.014, 0), new THREE.Vector3(-side * .022, .035, .014), .022);
    const wrist = new THREE.Vector3(), rotation = new THREE.Euler(), hint = new THREE.Vector3();
    arms.push({side, shoulder, shoulderJoint, upper, fore, elbowJoint, wristJoint, hand, fingers, thumb, wrist, rotation, hint});
  }

  function bone(mesh, start, end, radius) {
    const direction = new THREE.Vector3().subVectors(end, start);
    mesh.position.copy(start).add(end).multiplyScalar(.5);
    mesh.scale.set(radius, direction.length(), radius);
    mesh.quaternion.setFromUnitVectors(UP, direction.normalize());
  }
  function pose(progress = {}) {
    const cover = progress.cover || 0, read = progress.read || 0, think = progress.think || 0;
    const clutch = progress.clutch || 0, carry = progress.carry || 0, dance = progress.dance || 0;
    const wave = progress.wave || 0, greeting = progress.greeting || 0;
    for (const arm of arms) {
      const {side, shoulder, hand, wrist, rotation, hint} = arm, left = side < 0;
      shoulder.set(side * .30, .42 + .05 * clutch, .10 + .09 * (progress.bookGrip?.front ?? read) + .07 * cover + .06 * clutch);
      arm.shoulderJoint.position.copy(shoulder);
      const base = left ? [-.35, .49, .23] : [.37, .35, .10];
      const targets = left ? [
        [cover, [-.16, .56, .29], -.15], [read, [-.234, .34, .35], -1.12],
        [think, [-.21, .46, .25], -.55], [clutch, [-.25, .70, .29], -.28],
        [dance, [-.37, .56, .20], -.28], [greeting * (1 - cover) * (1 - clutch), [-.36, .60, .22], -.18 + wave * .52],
      ] : [
        [cover, [.16, .56, .29], .15], [read, [.234, .34, .35], 1.12],
        [clutch, [.25, .70, .29], .28], [carry, [.38, .35, .10], .40],
        [dance, [.37, .53, .19], .25 + wave * .32],
      ];
      let total = targets.reduce((sum, [weight]) => sum + weight, 0);
      const divisor = Math.max(1, total), baseWeight = Math.max(0, 1 - total);
      hand.position.set(...base).multiplyScalar(baseWeight);
      let turn = (left ? -1.18 : 1.18) * baseWeight;
      for (const [weight, target, angle] of targets) {
        hand.position.x += target[0] * weight / divisor;
        hand.position.y += target[1] * weight / divisor;
        hand.position.z += target[2] * weight / divisor;
        turn += angle * weight / divisor;
      }
      const book = progress.bookGrip;
      let pitch = -.13 * read - .10 * cover;
      if (book) {
        const hold = left ? book.support * (1 - cover) * (1 - clutch) : book.hold;
        hand.position.lerp(left ? book.left : book.right, hold);
        turn = THREE.MathUtils.lerp(turn, left ? -1.12 : book.turn, hold);
        pitch = THREE.MathUtils.lerp(pitch, left ? -.13 : book.pitch, hold);
      }
      rotation.set(pitch, side * (.08 * read + .10 * carry), turn);
      hand.quaternion.setFromEuler(rotation);
      const handScale = .82 * (1 + cover * .12);
      hand.scale.setScalar(handScale);
      const curl = clamp(.2 + read * .45 + carry * .48 + think * .16 - cover * .12 - greeting * .13, .06, .78);
      const holding = book ? (left ? book.support : book.hold) : Math.max(read, carry);
      const curlDirection = THREE.MathUtils.lerp(1, -1, holding);
      for (let i = 0; i < arm.fingers.length; i++) {
        arm.fingers[i].root.rotation.x = curlDirection * curl * .45;
        arm.fingers[i].tip.rotation.x = curlDirection * curl * .9;
      }
      arm.thumb.rotation.y = -side * curl * .26;
      wrist.set(0, -.068 * handScale, 0).applyQuaternion(hand.quaternion).add(hand.position);
      // A hand target cannot stretch the short original proportions. Clamp
      // the wrist first, then move its whole palm by the same correction.
      const reach = new THREE.Vector3().subVectors(wrist, shoulder);
      const limit = CHEESE_ARM_LENGTHS.upper + CHEESE_ARM_LENGTHS.fore - .0001;
      if (reach.length() > limit) {
        const correction = reach.setLength(limit).add(shoulder).sub(wrist);
        wrist.add(correction); hand.position.add(correction);
      }
      hint.set(side * .41, .33 + .08 * clutch, .16);
      const elbow = solveArmElbow(shoulder, wrist, hint);
      bone(arm.upper, shoulder, elbow, .029); bone(arm.fore, elbow, wrist, .032);
      arm.elbowJoint.position.copy(elbow); arm.wristJoint.position.copy(wrist);
    }
  }
  pose();
  return {object, pose};
}
