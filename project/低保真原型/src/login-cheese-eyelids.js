import * as THREE from 'three';

/** A lid follows the authored eye surface; no replacement eyeballs or spheres. */
export function createCheeseEyelids() {
  const object = new THREE.Group(); object.name = 'Cheese_Authored_Eye_Lids';
  const boundary = {value: .66}, rightBoundary = {value: .66};
  const skin = new THREE.MeshStandardMaterial({color: 0xffcb35, roughness: .57, metalness: 0, transparent: true, depthWrite: true});
  skin.name = 'Cheddar / original eye contour lid';
  skin.onBeforeCompile = shader => {
    shader.uniforms.cheeseLidBoundary = boundary;
    shader.uniforms.cheeseRightLidBoundary = rightBoundary;
    shader.vertexShader = 'varying vec2 cheeseEyePoint;\n' + shader.vertexShader.replace('#include <begin_vertex>', '#include <begin_vertex>\ncheeseEyePoint = position.xy;');
    shader.fragmentShader = 'varying vec2 cheeseEyePoint;\nuniform float cheeseLidBoundary;\nuniform float cheeseRightLidBoundary;\n' + shader.fragmentShader.replace('#include <alphatest_fragment>',
      'float lidBoundary = cheeseEyePoint.x > 0.0 ? cheeseRightLidBoundary : cheeseLidBoundary;\ndiffuseColor.a *= smoothstep(lidBoundary - 0.0015, lidBoundary + 0.0015, cheeseEyePoint.y);\n#include <alphatest_fragment>');
  };
  skin.customProgramCacheKey = () => 'cheese-source-eye-lid-v3-independent';
  skin.userData.upperLidBoundary = boundary;
  skin.userData.rightLidBoundary = rightBoundary;
  const ink = new THREE.MeshStandardMaterial({color: 0x56402b, roughness: .7, transparent: true, opacity: 0});
  const rightInk = ink.clone();
  const lines = [];
  function pose(amount = 0, rightAmount = amount) {
    const closure = THREE.MathUtils.clamp(amount, 0, 1);
    const rightClosure = THREE.MathUtils.clamp(rightAmount, 0, 1);
    object.visible = Math.max(closure, rightClosure) > .001;
    boundary.value = THREE.MathUtils.lerp(.66, .460, closure);
    rightBoundary.value = THREE.MathUtils.lerp(.66, .460, rightClosure);
    ink.opacity = THREE.MathUtils.smoothstep(closure, .94, 1) * .7;
    rightInk.opacity = THREE.MathUtils.smoothstep(rightClosure, .94, 1) * .7;
    for (const line of lines) line.visible = line.material.opacity > .001;
  }
  function captureEyeSurface(mesh) {
    const geometry = mesh.geometry.clone(), position = geometry.attributes.position, normal = geometry.attributes.normal;
    for (let i = 0; i < position.count; i++) {
      position.setXYZ(i, position.getX(i) + normal.getX(i) * .0015,
        position.getY(i) + normal.getY(i) * .0015, position.getZ(i) + normal.getZ(i) * .0015);
    }
    position.needsUpdate = true; geometry.computeBoundingSphere();
    const surface = new THREE.Mesh(geometry, skin); surface.name = 'Upper_Lid_Skin';
    surface.receiveShadow = true; object.add(surface);
    // Project the crease onto this actual sculpt, so it follows the source
    // eye rather than floating in front of the glasses or below the eye.
    surface.updateMatrixWorld(true);
    const ray = new THREE.Raycaster();
    for (const x of [-.148, .163]) {
      const points = Array.from({length: 13}, (_, i) => {
        const offset = (i / 12 - .5) * .083;
        const point = new THREE.Vector3(x + offset, .549 + .007 * (offset / .0415) ** 2, .18);
        ray.set(new THREE.Vector3(point.x, point.y, 1), new THREE.Vector3(0, 0, -1));
        const hit = ray.intersectObject(surface, false)[0];
        if (hit) point.copy(hit.point).addScaledVector(hit.face.normal, .0017);
        return point;
      });
      const line = new THREE.Mesh(new THREE.TubeGeometry(new THREE.CatmullRomCurve3(points), 24, .0012, 6, false), x > 0 ? rightInk : ink);
      line.name = 'Authored_Eye_Closed_Crease'; object.add(line); lines.push(line);
    }
  }
  pose(); return {object, pose, captureEyeSurface};
}
