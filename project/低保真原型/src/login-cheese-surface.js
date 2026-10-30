/**
 * glTF repeats vertices across UV and material boundaries. All copies at an
 * exact spatial position within one closed model part must use identical
 * anatomical weights, including skin and eye copies along an eyelid. Separate
 * capped arm parts keep their own domain at their original contact positions.
 */
export function synchronizeSplitVertexWeights(surfaces, channels = 5) {
  const shared = new Map();
  const keyFor = (base, offset, part) => `${base[offset]}|${base[offset + 1]}|${base[offset + 2]}|${part || 0}`;
  for (const {base, weights, seamGroups} of surfaces) {
    for (let i = 0; i < base.length / 3; i++) {
      const key = keyFor(base, i * 3, seamGroups?.[i]), offset = i * channels;
      let merged = shared.get(key);
      if (!merged) {merged = new Float32Array(channels); shared.set(key, merged);}
      for (let channel = 0; channel < channels; channel++) {
        merged[channel] = Math.max(merged[channel], weights[offset + channel]);
      }
    }
  }
  for (const {base, weights, seamGroups} of surfaces) {
    for (let i = 0; i < base.length / 3; i++) {
      const merged = shared.get(keyFor(base, i * 3, seamGroups?.[i])), offset = i * channels;
      for (let channel = 0; channel < channels; channel++) weights[offset + channel] = merged[channel];
    }
  }
}

/** Preserve authored hand shading while following the clean forearm bend. */
export function createJointNormalDeformer({geometry, base, weights, seamGroups}) {
  if (!seamGroups || !weights.some((weight, i) => i % 5 < 2 && weight > 0 && weight < 1)) return null;
  const unique = new Map(), welded = new Uint32Array(base.length / 3);
  for (let i = 0; i < welded.length; i++) {
    const j = i * 3, key = `${base[j]}|${base[j + 1]}|${base[j + 2]}`;
    if (!unique.has(key)) unique.set(key, unique.size);
    welded[i] = unique.get(key);
  }
  const index = geometry.index.array;
  function surfaceNormals(positions) {
    const sum = new Float32Array(unique.size * 3);
    for (let i = 0; i < index.length; i += 3) {
      const ia = index[i] * 3, ib = index[i + 1] * 3, ic = index[i + 2] * 3;
      const ax = positions[ib] - positions[ia], ay = positions[ib + 1] - positions[ia + 1], az = positions[ib + 2] - positions[ia + 2];
      const bx = positions[ic] - positions[ia], by = positions[ic + 1] - positions[ia + 1], bz = positions[ic + 2] - positions[ia + 2];
      const nx = ay * bz - az * by, ny = az * bx - ax * bz, nz = ax * by - ay * bx;
      for (let corner = 0; corner < 3; corner++) {
        const j = welded[index[i + corner]] * 3;
        sum[j] += nx; sum[j + 1] += ny; sum[j + 2] += nz;
      }
    }
    return sum;
  }
  const original = surfaceNormals(base), authored = geometry.attributes.normal.array;
  return function updateJointNormals(target, normal) {
    const posed = surfaceNormals(target);
    for (let i = 0; i < welded.length; i++) {
      const weight = Math.max(weights[i * 5], weights[i * 5 + 1]);
      if (weight <= 0 || weight >= 1) continue;
      const j = welded[i] * 3, aLength = Math.hypot(original[j], original[j + 1], original[j + 2]);
      const bLength = Math.hypot(posed[j], posed[j + 1], posed[j + 2]);
      if (aLength < 1e-12 || bLength < 1e-12) continue;
      const ax = original[j] / aLength, ay = original[j + 1] / aLength, az = original[j + 2] / aLength;
      const bx = posed[j] / bLength, by = posed[j + 1] / bLength, bz = posed[j + 2] / bLength;
      let qx = ay * bz - az * by, qy = az * bx - ax * bz, qz = ax * by - ay * bx, qw = 1 + ax * bx + ay * by + az * bz;
      if (qw < 1e-6) {qx = -ay; qy = ax; qz = 0; qw = 0; if (Math.hypot(qx, qy) < 1e-6) {qx = 0; qy = -az; qz = ay;}}
      const qLength = Math.hypot(qx, qy, qz, qw); qx /= qLength; qy /= qLength; qz /= qLength; qw /= qLength;
      const n = i * 3, nx = authored[n], ny = authored[n + 1], nz = authored[n + 2];
      const tx = 2 * (qy * nz - qz * ny), ty = 2 * (qz * nx - qx * nz), tz = 2 * (qx * ny - qy * nx);
      normal.setXYZ(i, nx + qw * tx + qy * tz - qz * ty, ny + qw * ty + qz * tx - qx * tz, nz + qw * tz + qx * ty - qy * tx);
    }
  };
}
