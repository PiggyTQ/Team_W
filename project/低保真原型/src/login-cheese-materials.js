import * as THREE from 'three';

const ROOT = '/mascot/materials/';
const SOURCE_MAPS = [
  ['map', 'cheddar-source-color-4k.png', THREE.SRGBColorSpace],
  ['normalMap', 'cheddar-source-normal-4k.png', THREE.NoColorSpace],
  ['roughnessMap', 'cheddar-source-roughness-4k.png', THREE.NoColorSpace],
];
const AO_MAPS = [
  ['Cheddar v1', 'source-ao.png'],
  ['Accessories analytic', 'source-ao-accessories.png'],
  ['Eyes analytic', 'source-ao-eyes.png'],
];

function release(texture) {
  texture?.source?.data?.close?.(); texture?.dispose();
}

/** Original texture payloads and a geometric AO bake; no geometry or palette edits. */
export async function restoreCheeseMaterialDetails(root, renderer, isAlive = () => true) {
  const materials = new Set();
  root.traverse(mesh => {
    if (mesh.isMesh) for (const material of Array.isArray(mesh.material) ? mesh.material : [mesh.material]) materials.add(material);
  });
  const loader = new THREE.TextureLoader();
  const anisotropy = Math.min(4, renderer.capabilities.getMaxAnisotropy());
  const jobs = [];
  const cheese = [...materials].find(material => material.name.startsWith('Cheddar v1'));
  const highResolution = !navigator.connection?.saveData && renderer.capabilities.maxTextureSize >= 4096;
  function request(material, slot, file, colorSpace) {
    jobs.push(loader.loadAsync(ROOT + file).then(texture => {
      texture.colorSpace = colorSpace; texture.flipY = false;
      texture.channel = 0; texture.anisotropy = anisotropy;
      texture.wrapS = texture.wrapT = THREE.RepeatWrapping;
      return {material, slot, texture};
    }));
  }
  if (cheese && highResolution) for (const [slot, file, colorSpace] of SOURCE_MAPS) request(cheese, slot, file, colorSpace);
  for (const [prefix, file] of AO_MAPS) {
    const material = [...materials].find(material => material.name.startsWith(prefix));
    if (material) request(material, 'aoMap', file, THREE.NoColorSpace);
  }
  const results = await Promise.allSettled(jobs), replaced = new Set();
  let detailCount = 0, aoCount = 0;
  for (const result of results) {
    if (result.status !== 'fulfilled') continue; // The embedded PBR textures remain a valid fallback.
    const {material, slot, texture} = result.value;
    if (!isAlive()) {release(texture); continue;}
    if (material[slot]) replaced.add(material[slot]);
    material[slot] = texture;
    if (slot === 'roughnessMap') material.metalnessMap = texture;
    if (slot === 'aoMap') {material.aoMapIntensity = .7; aoCount++;}
    else detailCount++;
    material.needsUpdate = true;
  }
  for (const texture of replaced) release(texture);
  return {quality: detailCount === 3 ? 'source-4k' : 'embedded-2k', aoMaps: aoCount,
    failures: results.filter(result => result.status === 'rejected').length};
}
