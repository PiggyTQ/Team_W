import test from 'node:test';
import assert from 'node:assert/strict';
import * as THREE from 'three';
import {restoreCheeseMaterialDetails} from '../src/login-cheese-materials.js';

function fixture() {
  const root = new THREE.Group();
  const cheese = new THREE.MeshPhysicalMaterial({roughness: .47, clearcoat: .025});
  cheese.name = 'Cheddar v1 | original UV PBR';
  const eyes = new THREE.MeshPhysicalMaterial({roughness: 1, clearcoat: 1});
  eyes.name = 'Eyes analytic | independent atlas PBR';
  const accessories = new THREE.MeshPhysicalMaterial({roughness: 1, clearcoat: 1});
  accessories.name = 'Accessories analytic | original UV PBR';
  const old = [new THREE.Texture(), new THREE.Texture(), new THREE.Texture()];
  [cheese.map, cheese.normalMap, cheese.roughnessMap] = old;
  cheese.metalnessMap = cheese.roughnessMap;
  for (const material of [cheese, eyes, accessories]) root.add(new THREE.Mesh(new THREE.BoxGeometry(), material));
  return {root, cheese, eyes, accessories, old};
}
const renderer = {capabilities: {maxTextureSize: 8192, getMaxAnisotropy: () => 8}};

async function withLoader(load, run) {
  const original = THREE.TextureLoader.prototype.loadAsync;
  THREE.TextureLoader.prototype.loadAsync = load;
  try {await run();} finally {THREE.TextureLoader.prototype.loadAsync = original;}
}

test('source details retain material factors and per-atlas UV orientation', async () => {
  const f = fixture(), loaded = [];
  await withLoader(async url => {const texture = new THREE.Texture(); texture.name = url; loaded.push(texture); return texture;}, async () => {
    const report = await restoreCheeseMaterialDetails(f.root, renderer);
    assert.equal(report.quality, 'source-4k'); assert.equal(report.aoMaps, 3); assert.equal(report.failures, 0);
    assert.equal(f.cheese.map.colorSpace, THREE.SRGBColorSpace);
    assert.equal(f.cheese.normalMap.colorSpace, THREE.NoColorSpace);
    assert.equal(f.cheese.roughnessMap, f.cheese.metalnessMap);
    assert.equal(f.cheese.roughness, .47); assert.equal(f.cheese.clearcoat, .025);
    assert.equal(f.eyes.roughness, 1); assert.equal(f.accessories.clearcoat, 1);
    assert.notEqual(f.cheese.aoMap, f.eyes.aoMap); assert.notEqual(f.eyes.aoMap, f.accessories.aoMap);
    for (const texture of loaded) {assert.equal(texture.flipY, false); assert.equal(texture.channel, 0);}
  });
});

test('a failed source normal download retains its embedded fallback', async () => {
  const f = fixture(), normal = f.cheese.normalMap;
  await withLoader(async url => {
    if (url.includes('normal-4k')) throw new Error('fixture network failure');
    return new THREE.Texture();
  }, async () => {
    const report = await restoreCheeseMaterialDetails(f.root, renderer);
    assert.equal(report.failures, 1); assert.equal(report.quality, 'embedded-2k');
    assert.equal(f.cheese.normalMap, normal); assert.ok(f.cheese.map);
    assert.equal(report.aoMaps, 3);
  });
});

test('unmount during source loading frees late textures without replacing disposed-scene materials', async () => {
  const f = fixture(), disposed = [], originals = [...f.old];
  await withLoader(async url => {
    const texture = new THREE.Texture(); texture.name = url;
    texture.addEventListener('dispose', () => disposed.push(url)); return texture;
  }, async () => {
    await restoreCheeseMaterialDetails(f.root, renderer, () => false);
    assert.equal(disposed.length, 6); assert.equal(f.cheese.map, originals[0]);
    assert.equal(f.cheese.normalMap, originals[1]); assert.equal(f.cheese.aoMap, null);
  });
});

test('GPUs below original texture dimensions keep the embedded texture set', async () => {
  const f = fixture(), requests = [];
  await withLoader(async url => {requests.push(url); return new THREE.Texture();}, async () => {
    const report = await restoreCheeseMaterialDetails(f.root, {capabilities: {maxTextureSize: 2048, getMaxAnisotropy: () => 1}});
    assert.equal(report.quality, 'embedded-2k'); assert.equal(report.aoMaps, 3);
    assert.ok(requests.every(url => !url.includes('4k')));
  });
});
