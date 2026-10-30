import * as THREE from 'three';

/** Independent covers, page blocks and a curled turning leaf. */
export function createCheeseBook() {
  const book = new THREE.Group();
  book.scale.setScalar(.9);
  book.name = 'Login book · articulated covers and turning page';
  const paper = new THREE.MeshStandardMaterial({color: 0xfff5df, roughness: .86});
  const cover = new THREE.MeshStandardMaterial({color: 0x183552, roughness: .47});
  const ink = new THREE.MeshStandardMaterial({color: 0xc4ae83, roughness: .95});
  const leafMaterial = paper.clone(); leafMaterial.side = THREE.DoubleSide;
  const width = .176, height = .234;
  const halves = [-1, 1].map(side => {
    const hinge = new THREE.Group(); book.add(hinge);
    const board = new THREE.Mesh(new THREE.BoxGeometry(width + .012, height + .018, .009), cover);
    board.position.set(side * width / 2, 0, -.012);
    const pages = new THREE.Mesh(new THREE.BoxGeometry(width, height, .015), paper);
    pages.position.set(side * width / 2, 0, .001);
    hinge.add(board, pages); board.castShadow = true; pages.castShadow = true;
    for (let row = 0; row < 7; row++) {
      const line = new THREE.Mesh(new THREE.BoxGeometry(width * (row === 6 ? .53 : .71), .0022, .0008), ink);
      line.position.set(side * width / 2, height * .32 - row * .024, .0093); hinge.add(line);
    }
    return hinge;
  });
  const spine = new THREE.Mesh(new THREE.CylinderGeometry(.011, .011, height + .018, 12), cover);
  spine.position.z = -.009; book.add(spine);
  const bookmark = new THREE.Mesh(new THREE.BoxGeometry(.016, .047, .002), new THREE.MeshStandardMaterial({color: 0xe6aa36, roughness: .65}));
  bookmark.position.set(.027, -height / 2 - .012, .009); halves[1].add(bookmark);
  const segments = 14;
  const leafWidth = width - .012;
  const pageGeometry = new THREE.PlaneGeometry(leafWidth, height, segments, 1);
  const page = new THREE.Mesh(pageGeometry, leafMaterial);
  page.position.z = .013; page.castShadow = true; book.add(page);
  const positions = pageGeometry.attributes.position;
  function pose(open, turn, presence) {
    const closing = 1 - open;
    halves[0].rotation.y = closing * Math.PI / 2;
    halves[1].rotation.y = -closing * Math.PI / 2;
    page.visible = open > .85 && turn > 0 && turn < 1;
    if (page.visible) {
      const angle = turn * Math.PI;
      for (let i = 0; i < positions.count; i++) {
        const u = (i % (segments + 1)) / segments, distance = u * leafWidth;
        positions.setXYZ(i, distance * Math.cos(angle), i <= segments ? height / 2 : -height / 2,
          distance * Math.sin(angle) + Math.sin(u * Math.PI) * Math.sin(angle) * .028);
      }
      positions.needsUpdate = true; pageGeometry.computeVertexNormals();
    }
    book.visible = presence > .008;
  }
  const rightGrip = new THREE.Vector3(), leftGrip = new THREE.Vector3();
  function arrange(progress, stow, turn) {
    const open = THREE.MathUtils.smoothstep(progress, .45, .85);
    const transport = 1 - THREE.MathUtils.smoothstep(progress, 0, .45);
    const slide = THREE.MathUtils.smoothstep(transport, 0, .6);
    const sideTurn = THREE.MathUtils.smoothstep(transport, .6, .85);
    const tuck = THREE.MathUtils.smoothstep(transport, .85, 1);
    const sideStow = stow * THREE.MathUtils.smoothstep(slide, .98, 1);
    // Fold in front of the torso. Only the closed book travels sideways;
    // turning it back and tucking it away begins outside the body silhouette.
    book.position.set(.38 * slide + .025 * sideStow, .36 - .025 * sideStow, .30 - .18 * tuck - .14 * sideStow);
    book.rotation.set(-open * .28, (1 - open) * Math.PI / 2 + sideTurn * Math.PI / 2, 0);
    pose(open, turn, 1 - sideStow);
    book.updateMatrix(); halves.forEach(hinge => hinge.updateMatrix());
    rightGrip.set(THREE.MathUtils.lerp(.26, .025, slide), THREE.MathUtils.lerp(-.005, -.035, open), .05).applyMatrix4(halves[1].matrix).applyMatrix4(book.matrix);
    leftGrip.set(-.26, -.035, .05).applyMatrix4(halves[0].matrix).applyMatrix4(book.matrix);
    return {right: rightGrip, left: leftGrip, support: THREE.MathUtils.smoothstep(progress, .86, .98), hold: 1 - THREE.MathUtils.smoothstep(stow, .15, .65), front: 1 - tuck, turn: THREE.MathUtils.lerp(1.12, .40, sideTurn), pitch: THREE.MathUtils.lerp(.65, -.13, open), open};
  }
  return {object: book, pose, arrange};
}
