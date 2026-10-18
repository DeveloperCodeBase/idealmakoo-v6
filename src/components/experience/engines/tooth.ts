// @ts-nocheck
// Adapted from the user-supplied landingpage source. Public React boundaries are strictly typed.
import * as THREE from 'three';

import { ANATOMY_BOUNDS, toothField, smoothstep, occlusalCrease } from './anatomy';

// Continuous anatomical field meshing from the supplied landing experience.
// The hero now uses separate upper/lower molars, including distinct root systems.
export function buildMolarGeometry(quality = 'standard', morphology = 'maxillary') {
  const molarField = (x, y, z) => toothField(x, y, z, morphology);
  const bounds = ANATOMY_BOUNDS;
  const nx = quality === 'high' ? 65 : 47;
  const ny = quality === 'high' ? 97 : 71;
  const nz = quality === 'high' ? 57 : 41;
  const sx = (bounds.max[0] - bounds.min[0]) / (nx - 1);
  const sy = (bounds.max[1] - bounds.min[1]) / (ny - 1);
  const sz = (bounds.max[2] - bounds.min[2]) / (nz - 1);
  const values = new Float32Array(nx * ny * nz);
  const gridIndex = (x, y, z) => x + nx * (y + ny * z);
  for (let z = 0; z < nz; z++) {
    for (let y = 0; y < ny; y++) {
      for (let x = 0; x < nx; x++) {
        values[gridIndex(x, y, z)] = molarField(bounds.min[0] + x * sx, bounds.min[1] + y * sy, bounds.min[2] + z * sz);
      }
    }
  }

  const positions = [], normals = [], colors = [], surfaceData = [], indices = [];
  const edgeCache = new Map();
  const offset = [[0, 0, 0], [1, 0, 0], [1, 1, 0], [0, 1, 0], [0, 0, 1], [1, 0, 1], [1, 1, 1], [0, 1, 1]];
  const tetrahedra = [[0, 5, 1, 6], [0, 1, 2, 6], [0, 2, 3, 6], [0, 3, 7, 6], [0, 7, 4, 6], [0, 4, 5, 6]];
  const cornerIds = new Array(8);
  const cornerPos = new Array(8);
  const gradientStep = .0024;

  function vertex(a, b) {
    const idA = cornerIds[a], idB = cornerIds[b];
    const key = idA < idB ? `${idA}:${idB}` : `${idB}:${idA}`;
    const cached = edgeCache.get(key);
    if (cached !== undefined) return cached;
    const va = values[idA], vb = values[idB];
    const t = Math.abs(va - vb) > 1e-9 ? va / (va - vb) : .5;
    const pa = cornerPos[a], pb = cornerPos[b];
    const x = pa[0] + (pb[0] - pa[0]) * t;
    const y = pa[1] + (pb[1] - pa[1]) * t;
    const z = pa[2] + (pb[2] - pa[2]) * t;
    const e = gradientStep;
    let gx = molarField(x + e, y, z) - molarField(x - e, y, z);
    let gy = molarField(x, y + e, z) - molarField(x, y - e, z);
    let gz = molarField(x, y, z + e) - molarField(x, y, z - e);
    const length = Math.hypot(gx, gy, gz) || 1;
    gx /= length; gy /= length; gz /= length;
    const index = positions.length / 3;
    positions.push(x, y, z);
    normals.push(gx, gy, gz);

    const enamel = smoothstep(y, -.245, .16);
    const variation = (Math.sin(x * 13 + z * 9) * Math.sin(y * 16 + z * 3) + Math.sin(x * 7 - z * 11 + y * 5) * .5) * .003;
    const cervicalWarmth = Math.exp(-Math.pow((y + .12) / .13, 2)) * .014;
    const fissure = y > .55 && gy > .28 ? occlusalCrease(x, z, morphology) / .065 : 0;
    // Opaque ivory dentine under pearly enamel; roots are subtly warmer, not
    // neon tinted or painted brown. The real grooves carry only gentle tone.
    colors.push(.842 + enamel * .112 + variation - fissure * .012,
      .774 + enamel * .170 + variation - cervicalWarmth - fissure * .016,
      .651 + enamel * .267 + variation - cervicalWarmth - fissure * .020);
    surfaceData.push(enamel, smoothstep(y, .30, 1.06), Math.min(1, fissure));
    edgeCache.set(key, index);
    return index;
  }

  function triangle(a, b, c) {
    if (a === b || a === c || b === c) return;
    const ax = positions[b * 3] - positions[a * 3];
    const ay = positions[b * 3 + 1] - positions[a * 3 + 1];
    const az = positions[b * 3 + 2] - positions[a * 3 + 2];
    const bx = positions[c * 3] - positions[a * 3];
    const by = positions[c * 3 + 1] - positions[a * 3 + 1];
    const bz = positions[c * 3 + 2] - positions[a * 3 + 2];
    const cx = ay * bz - az * by, cy = az * bx - ax * bz, cz = ax * by - ay * bx;
    // Small tetrahedral triangles close the cusp seams and root tips. Dropping
    // them at a display-scale epsilon leaves holes in an otherwise closed field.
    if (cx * cx + cy * cy + cz * cz === 0) return;
    const nx = normals[a * 3] + normals[b * 3] + normals[c * 3];
    const ny = normals[a * 3 + 1] + normals[b * 3 + 1] + normals[c * 3 + 1];
    const nz = normals[a * 3 + 2] + normals[b * 3 + 2] + normals[c * 3 + 2];
    if (cx * nx + cy * ny + cz * nz < 0) indices.push(a, c, b);
    else indices.push(a, b, c);
  }

  for (let z = 0; z < nz - 1; z++) {
    for (let y = 0; y < ny - 1; y++) {
      for (let x = 0; x < nx - 1; x++) {
        let negative = 0;
        for (let c = 0; c < 8; c++) {
          const o = offset[c];
          cornerIds[c] = gridIndex(x + o[0], y + o[1], z + o[2]);
          cornerPos[c] = [bounds.min[0] + (x + o[0]) * sx, bounds.min[1] + (y + o[1]) * sy, bounds.min[2] + (z + o[2]) * sz];
          if (values[cornerIds[c]] < 0) negative++;
        }
        if (negative === 0 || negative === 8) continue;
        for (const tet of tetrahedra) {
          const inside = [], outside = [];
          for (const c of tet) (values[cornerIds[c]] < 0 ? inside : outside).push(c);
          if (inside.length === 1) {
            triangle(vertex(inside[0], outside[0]), vertex(inside[0], outside[1]), vertex(inside[0], outside[2]));
          } else if (inside.length === 3) {
            triangle(vertex(outside[0], inside[0]), vertex(outside[0], inside[2]), vertex(outside[0], inside[1]));
          } else if (inside.length === 2) {
            const ac = vertex(inside[0], outside[0]), ad = vertex(inside[0], outside[1]);
            const bc = vertex(inside[1], outside[0]), bd = vertex(inside[1], outside[1]);
            triangle(ac, ad, bd);
            triangle(ac, bd, bc);
          }
        }
      }
    }
  }

  const geometry = new THREE.BufferGeometry();
  geometry.setAttribute('position', new THREE.Float32BufferAttribute(positions, 3));
  geometry.setAttribute('normal', new THREE.Float32BufferAttribute(normals, 3));
  geometry.setAttribute('color', new THREE.Float32BufferAttribute(colors, 3));
  geometry.setAttribute('toothSurface', new THREE.Float32BufferAttribute(surfaceData, 3));
  geometry.setIndex(indices);
  geometry.computeBoundingBox();
  geometry.computeBoundingSphere();
  geometry.userData.description = morphology === 'mandibular' ? 'Constructed mandibular molar: five unequal cusps, branching fissures and two curved flattened roots' : 'Constructed maxillary molar: four unequal cusps, oblique ridge, central fossa and three divergent curved roots';
  geometry.userData.morphology = morphology;
  return geometry;
}

const geometryCache = new Map();

export function createTooth(options = {}) {
  const group = new THREE.Group();
  group.name = 'Anatomical enamel molar';
  const quality = options.quality === 'high' ? 'high' : 'standard';
  const morphology = options.morphology === 'mandibular' ? 'mandibular' : 'maxillary';
  const cacheKey = quality + ':' + morphology;
  let cached = geometryCache.get(cacheKey);
  if (!cached) {
    cached = { geometry: buildMolarGeometry(quality, morphology), references: 0 };
    geometryCache.set(cacheKey, cached);
  }
  cached.references++;
  const geometry = cached.geometry;
  const material = new THREE.MeshPhysicalMaterial({
    color: 0xfffef9,
    vertexColors: true,
    metalness: 0,
    roughness: .22,
    clearcoat: .86,
    clearcoatRoughness: .105,
    ior: 1.54,
    transmission: .12,
    thickness: .34,
    attenuationColor: new THREE.Color(0xfff0d8),
    attenuationDistance: .72,
    envMapIntensity: 1.02,
    specularIntensity: 1.0,
    ...options.material,
  });
  // The solid crown is dominantly diffuse. Limited volume transmission varies
  // with enamel and viewing thickness, so edges glow without becoming glass.
  material.onBeforeCompile = shader => {
    shader.vertexShader = shader.vertexShader.replace('#include <common>', `#include <common>
      attribute vec3 toothSurface;
      varying vec3 vToothLocalPosition, vToothSurface;
    `);
    shader.vertexShader = shader.vertexShader.replace('#include <begin_vertex>', `#include <begin_vertex>
      vToothLocalPosition = position; vToothSurface = toothSurface;
    `);
    shader.fragmentShader = shader.fragmentShader.replace('#include <common>', `#include <common>
      varying vec3 vToothLocalPosition, vToothSurface;
    `);
    shader.fragmentShader = shader.fragmentShader.replace('#include <roughnessmap_fragment>', `#include <roughnessmap_fragment>
      float crownEnamel = vToothSurface.x;
      float enamelVariation = sin(vToothLocalPosition.x*31.0+vToothLocalPosition.z*17.0+sin(vToothLocalPosition.y*9.0))
        * sin(vToothLocalPosition.y*23.0-vToothLocalPosition.z*13.0);
      roughnessFactor = clamp(roughnessFactor + (1.0-crownEnamel)*0.18 + enamelVariation*0.015 + vToothSurface.z*0.026, 0.15, 0.50);
    `);
    shader.fragmentShader = shader.fragmentShader.replace('#include <normal_fragment_maps>', `#include <normal_fragment_maps>
      // Perikymata follow the curved neck. Sparse irregular relief prevents
      // striped plastic highlights, while anatomical cusp facets stay dominant.
      float cervicalArc = vToothLocalPosition.y + 0.018*sin(atan(vToothLocalPosition.z,vToothLocalPosition.x)*2.0);
      float perikymata = sin(cervicalArc*154.0 + sin(vToothLocalPosition.x*9.0+vToothLocalPosition.z*5.0)*0.7);
      float fineGrain = sin(dot(vToothLocalPosition,vec3(117.0,39.0,87.0))) * sin(dot(vToothLocalPosition,vec3(-61.0,133.0,51.0)));
      float rootStriae = sin(vToothLocalPosition.x*91.0+vToothLocalPosition.z*67.0+sin(vToothLocalPosition.y*12.0));
      float toothGrain = (perikymata*0.000070*(1.0-vToothSurface.y*0.65) + fineGrain*0.000024)*crownEnamel
        + rootStriae*0.00014*(1.0-crownEnamel);
      vec3 toothSigmaX = dFdx(-vViewPosition), toothSigmaY = dFdy(-vViewPosition);
      vec3 toothR1 = cross(toothSigmaY,normal), toothR2 = cross(normal,toothSigmaX);
      float toothDet = dot(toothSigmaX,toothR1);
      normal = normalize(abs(toothDet)*normal-sign(toothDet)*(dFdx(toothGrain)*toothR1+dFdy(toothGrain)*toothR2));
    `);
    shader.fragmentShader = shader.fragmentShader.replace('#include <lights_physical_fragment>', `#include <lights_physical_fragment>
      #ifdef USE_CLEARCOAT
        material.clearcoat *= mix(0.14,1.0,crownEnamel);
        material.clearcoatRoughness = mix(0.29,material.clearcoatRoughness,crownEnamel);
      #endif
    `);
    // Expand the installed Three chunk so modulation occurs before refraction,
    // while retaining its actual IOR, attenuation and opaque dentine mixture.
    const transmissionChunk = THREE.ShaderChunk.transmission_fragment
      .replace('material.transmission = transmission;', `
        float enamelEdge = pow(1.0-abs(dot(normal,normalize(vViewPosition))),2.0)*vToothSurface.y;
        material.transmission = transmission*crownEnamel*(0.12+0.88*enamelEdge);`)
      .replace('material.thickness = thickness;', 'material.thickness = thickness*mix(1.75,0.30,enamelEdge);');
    shader.fragmentShader = shader.fragmentShader.replace('#include <transmission_fragment>', transmissionChunk);
  };
  material.customProgramCacheKey = () => 'anatomical-solid-enamel-v5';
  const mesh = new THREE.Mesh(geometry, material);
  mesh.name = 'Continuous crown and root enamel surface';
  mesh.castShadow = true;
  mesh.receiveShadow = true;
  const rotation = Array.isArray(options.rotation) ? options.rotation : [0, 0, 0];
  mesh.rotation.set(rotation[0] || 0, rotation[1] || 0, rotation[2] || 0);
  if (typeof options.scale === 'number') group.scale.setScalar(options.scale);
  group.add(mesh);
  let disposed = false;

  return {
    group,
    mesh,
    triangleCount: geometry.index.count / 3,
    bounds: { min: geometry.boundingBox.min.toArray(), max: geometry.boundingBox.max.toArray() },
    update(time, reducedMotion = false) {
      if (options.animate === true && !reducedMotion) {
        mesh.rotation.z = (rotation[2] || 0) + Math.sin(time * .42) * .008;
        mesh.rotation.y = (rotation[1] || 0) + Math.sin(time * .26) * .024;
      }
    },
    dispose() {
      if (disposed) return;
      disposed = true;
      cached.references--;
      if (cached.references === 0) { geometry.dispose(); geometryCache.delete(cacheKey); }
      material.dispose();
    },
  };
}

export default createTooth;
