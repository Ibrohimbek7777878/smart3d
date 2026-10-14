/* Smart3D engine/glbexport.js — glTF 2.0 Binary (.glb) Exporter.
 *
 * 6 YILLIK ARXITEKTURA STANDARTI (Kamchilik 21):
 *   1. glTF 2.0 Binary (.glb) konteyneri (12-bayt sarlavha + JSON chunk + BIN chunk).
 *   2. Har bir mebel moduli panellarga (yon devorlar, tub, qopqoq, tokchalar,
 *      orqa devor, fasad eshiklari va tutqichlar) ajratilgan holda eksport qilinadi.
 *   3. PBR materiallar: korpus (LDSP/MDF), fasad (grafit/mat), orqa devor (HDF),
 *      ichki javonlar (polka), metall tutqich (ruchka), pol va devorlar.
 *   4. Standart birlik: Metr (glTF standard unit), Y-up o'qi (Blender, Three.js,
 *      iOS AR QuickLook, Android SceneViewer va Telegram 3D mosligi uchun).
 *   5. To'liq zero-dependency: brauzerda ham, Node.js muhitida ham ishlaydi.
 */

import { getModulePanels } from './assembler.js';

/** glTF PBR material konfiguratsiyalari. */
const MATERIAL_DEFS = {
  korpus: {
    name: 'cat_korpus',
    baseColorFactor: [0.85, 0.79, 0.66, 1.0],
    roughnessFactor: 0.60,
    metallicFactor: 0.05
  },
  fasad: {
    name: 'cat_fasad',
    baseColorFactor: [0.28, 0.33, 0.41, 1.0],
    roughnessFactor: 0.38,
    metallicFactor: 0.05
  },
  orqa: {
    name: 'cat_orqa',
    baseColorFactor: [0.81, 0.77, 0.70, 1.0],
    roughnessFactor: 0.85,
    metallicFactor: 0.00
  },
  polka: {
    name: 'cat_polka',
    baseColorFactor: [0.88, 0.84, 0.74, 1.0],
    roughnessFactor: 0.60,
    metallicFactor: 0.05
  },
  handle: {
    name: 'cat_handle',
    baseColorFactor: [0.12, 0.16, 0.22, 1.0],
    roughnessFactor: 0.22,
    metallicFactor: 0.85
  },
  wall: {
    name: 'cat_wall',
    baseColorFactor: [0.91, 0.89, 0.83, 1.0],
    roughnessFactor: 0.95,
    metallicFactor: 0.00
  },
  floor: {
    name: 'cat_floor',
    baseColorFactor: [0.92, 0.85, 0.75, 1.0],
    roughnessFactor: 0.55,
    metallicFactor: 0.05
  },
  other: {
    name: 'cat_other',
    baseColorFactor: [0.85, 0.82, 0.77, 1.0],
    roughnessFactor: 0.60,
    metallicFactor: 0.05
  }
};

/**
 * 24 ta cho'qqi uchun standart 36 ta uint16 indekslari (6 ta yuz × 2 uchburchak).
 * Har bir yuz uchun: [0, 1, 2, 0, 2, 3] + offset.
 */
function createBoxIndices() {
  const indices = new Uint16Array(36);
  let ptr = 0;
  for (let face = 0; face < 6; face++) {
    const b = face * 4;
    indices[ptr++] = b + 0;
    indices[ptr++] = b + 1;
    indices[ptr++] = b + 2;
    indices[ptr++] = b + 0;
    indices[ptr++] = b + 2;
    indices[ptr++] = b + 3;
  }
  return indices;
}

/**
 * Smart3D koordinatalari va burchagi bo'yicha panelning 24 ta cho'qqi va normallarini hisoblash.
 * Chiqish birligi: metr (glTF Y-up: X=right, Y=up, Z=-depth).
 */
function computeBoxVerticesAndNormals(cx, cy, cz, cs, sn, px, py, pz, pw, pd, ph) {
  const hw = pw / 2, hd = pd / 2, hh = ph / 2;

  // 8 ta lokal burchak (Smart3D mm da, panel markaziga nisbatan)
  const corners = [
    [-hw, -hd, -hh], // 0: c000
    [+hw, -hd, -hh], // 1: c100
    [+hw, +hd, -hh], // 2: c110
    [-hw, +hd, -hh], // 3: c010
    [-hw, -hd, +hh], // 4: c001
    [+hw, -hd, +hh], // 5: c101
    [+hw, +hd, +hh], // 6: c111
    [-hw, +hd, +hh]  // 7: c011
  ];

  // Lokal burchaklarni modul aylanishi va dunyo koordinatasiga o'tkazish
  function toWorldGltf(pt) {
    const lx = px + pt[0];
    const ly = py + pt[1];
    const lz = pz + pt[2];

    const wx = cx + lx * cs - ly * sn;
    const wy = cy + lx * sn + ly * cs;
    const wz = cz + lz;

    // mm -> metr va Z-up -> Y-up (X=wx, Y=wz, Z=-wy)
    return [wx / 1000, wz / 1000, -wy / 1000];
  }

  const wCorners = corners.map(toWorldGltf);

  // 6 ta yuz (har bir yuzda 4 ta cho'qqi va normal, CCW winding)
  // Smart3D o'qlari bo'yicha normallar:
  // 1. Yuqori yuz (+Z in Smart3D -> +Y in glTF: [0, 1, 0])
  // 2. Pastki yuz (-Z in Smart3D -> -Y in glTF: [0, -1, 0])
  // 3. O'ng yuz (+X in Smart3D -> rotated: [cs, 0, -sn])
  // 4. Chap yuz (-X in Smart3D -> rotated: [-cs, 0, sn])
  // 5. Old/fasad yuz (+Y in Smart3D -> rotated: [-sn, 0, -cs])
  // 6. Orqa yuz (-Y in Smart3D -> rotated: [sn, 0, cs])

  const faces = [
    {
      indices: [4, 5, 6, 7], // c001, c101, c111, c011 (Top)
      normal: [0, 1, 0]
    },
    {
      indices: [3, 2, 1, 0], // c010, c110, c100, c000 (Bottom)
      normal: [0, -1, 0]
    },
    {
      indices: [1, 2, 6, 5], // c100, c110, c111, c101 (Right)
      normal: [cs, 0, -sn]
    },
    {
      indices: [3, 0, 4, 7], // c010, c000, c001, c011 (Left)
      normal: [-cs, 0, sn]
    },
    {
      indices: [2, 3, 7, 6], // c110, c010, c011, c111 (Front / Fasad)
      normal: [-sn, 0, -cs]
    },
    {
      indices: [0, 1, 5, 4], // c000, c100, c101, c001 (Back / Orqa)
      normal: [sn, 0, cs]
    }
  ];

  const positions = new Float32Array(24 * 3);
  const normals = new Float32Array(24 * 3);

  let minX = Infinity, minY = Infinity, minZ = Infinity;
  let maxX = -Infinity, maxY = -Infinity, maxZ = -Infinity;

  let vPtr = 0;
  for (const f of faces) {
    for (const cIdx of f.indices) {
      const p = wCorners[cIdx];
      positions[vPtr * 3 + 0] = p[0];
      positions[vPtr * 3 + 1] = p[1];
      positions[vPtr * 3 + 2] = p[2];

      normals[vPtr * 3 + 0] = f.normal[0];
      normals[vPtr * 3 + 1] = f.normal[1];
      normals[vPtr * 3 + 2] = f.normal[2];

      if (p[0] < minX) minX = p[0]; if (p[0] > maxX) maxX = p[0];
      if (p[1] < minY) minY = p[1]; if (p[1] > maxY) maxY = p[1];
      if (p[2] < minZ) minZ = p[2]; if (p[2] > maxZ) maxZ = p[2];

      vPtr++;
    }
  }

  return {
    positions,
    normals,
    bounds: { min: [minX, minY, minZ], max: [maxX, maxY, maxZ] }
  };
}

/**
 * Butun loyiha (mebellar, xona poli, devorlari)ni sanoat darajasidagi glTF 2.0 Binary (.glb) ga yig'ish.
 * @param {Object} doc — Smart3D loyiha hujjati
 * @param {Object} catalog — fragmentlar katalogi
 * @param {Object} opts — qo'shimcha parametrlar
 * @returns {{glb: Uint8Array, stats: Object}}
 */
export function buildGLB(doc, catalog = {}, opts = {}) {
  const materialsList = [];
  const matIndexMap = new Map();

  function getMaterialIndex(slot) {
    const key = MATERIAL_DEFS[slot] ? slot : 'other';
    if (matIndexMap.has(key)) return matIndexMap.get(key);
    const def = MATERIAL_DEFS[key];
    const idx = materialsList.length;
    materialsList.push({
      name: def.name,
      pbrMetallicRoughness: {
        baseColorFactor: def.baseColorFactor,
        roughnessFactor: def.roughnessFactor,
        metallicFactor: def.metallicFactor
      },
      doubleSided: true
    });
    matIndexMap.set(key, idx);
    return idx;
  }

  // Pre-seed common materials
  ['korpus', 'fasad', 'orqa', 'polka', 'handle', 'wall', 'floor'].forEach(getMaterialIndex);

  // Standart 36 ta indeks
  const boxIndices = createBoxIndices();

  // Barcha panellarni to'plash
  const panelGeometries = [];
  const nodes = [];
  const meshes = [];
  const topLevelNodeIndices = [];

  /* ── 1. Mebellar va ularning panellari ── */
  for (const p of doc.placements || []) {
    const frag = catalog[p.frg];
    if (!frag) continue;

    const w = +p.w || +frag.w || 600;
    const d = +p.d || +frag.d || 600;
    const h = +p.h || +frag.h || 720;
    const ox = +p.x || 0, oy = +p.y || 0, oz = +p.z || 0;
    const rot = ((+p.rot || 0) % 360 + 360) % 360;
    const qty = Math.max(1, Math.round(+p.qty || 1));

    const asm = getModulePanels(frag, w, d, h, opts);

    for (let n = 0; n < qty; n++) {
      const modName = `${frag.name || p.frg}${qty > 1 ? ' (' + (n + 1) + ')' : ''}`;
      const modNodeIndex = nodes.length;
      const childNodeIndices = [];

      const rad = rot * Math.PI / 180;
      const cs = Math.cos(rad), sn = Math.sin(rad);
      const cx = ox + (w / 2) * cs - (d / 2) * sn;
      const cy = oy + (w / 2) * sn + (d / 2) * cs;
      const cz = oz + h / 2;

      // Modul panellarini qo'shish
      for (const panel of asm.panels) {
        const geom = computeBoxVerticesAndNormals(
          cx, cy, cz, cs, sn,
          panel.x, panel.y, panel.z,
          panel.w, panel.d, panel.h
        );
        const geomIndex = panelGeometries.length;
        panelGeometries.push(geom);

        const meshIdx = meshes.length;
        meshes.push({
          name: `Mesh_${panel.name || panel.id}`,
          geomIndex,
          materialIndex: getMaterialIndex(panel.slot || 'korpus')
        });

        const panelNodeIdx = nodes.length;
        nodes.push({
          name: `${panel.name || panel.id} (${panel.w}×${panel.d}×${panel.h} mm)`,
          mesh: meshIdx
        });
        childNodeIndices.push(panelNodeIdx);

        // Tutqich (handle) bor bo'lsa
        if (panel.handle) {
          const hGeom = computeBoxVerticesAndNormals(
            cx, cy, cz, cs, sn,
            panel.handle.x, panel.handle.y, panel.handle.z,
            panel.handle.w, panel.handle.d, panel.handle.h
          );
          const hGeomIndex = panelGeometries.length;
          panelGeometries.push(hGeom);

          const hMeshIdx = meshes.length;
          meshes.push({
            name: `Mesh_Tutqich_${panel.id}`,
            geomIndex: hGeomIndex,
            materialIndex: getMaterialIndex('handle')
          });

          const handleNodeIdx = nodes.length;
          nodes.push({
            name: `Tutqich (${panel.name || panel.id})`,
            mesh: hMeshIdx
          });
          childNodeIndices.push(handleNodeIdx);
        }
      }

      // Modul ota-tuguni (Group node)
      nodes.push({
        name: `${modName} [${w}×${d}×${h} mm]`,
        children: childNodeIndices
      });
      topLevelNodeIndices.push(modNodeIndex + childNodeIndices.length);
    }
  }

  /* ── 2. Xona geometriyasi (Pol va devorlar) ── */
  const room = doc.room || {};
  const outline = room.outline || [];
  const wh = +room.wall_height || 2700;

  if (outline.length >= 3) {
    const roomChildNodes = [];

    // Pol qutisi (qalinligi 40mm)
    let minX = Infinity, maxX = -Infinity, minY = Infinity, maxY = -Infinity;
    for (const pt of outline) {
      if (+pt[0] < minX) minX = +pt[0]; if (+pt[0] > maxX) maxX = +pt[0];
      if (+pt[1] < minY) minY = +pt[1]; if (+pt[1] > maxY) maxY = +pt[1];
    }
    const rw = maxX - minX, rd = maxY - minY;
    const rcx = minX + rw / 2, rcy = minY + rd / 2;

    const floorGeom = computeBoxVerticesAndNormals(
      rcx, rcy, -20, 1, 0,
      0, 0, 0,
      rw + 100, rd + 100, 40
    );
    const floorGeomIdx = panelGeometries.length;
    panelGeometries.push(floorGeom);

    const floorMeshIdx = meshes.length;
    meshes.push({
      name: 'Mesh_Pol',
      geomIndex: floorGeomIdx,
      materialIndex: getMaterialIndex('floor')
    });

    const floorNodeIdx = nodes.length;
    nodes.push({
      name: `Xona poli (${Math.round(rw)}×${Math.round(rd)} mm)`,
      mesh: floorMeshIdx
    });
    roomChildNodes.push(floorNodeIdx);

    // Devorlar (har bir devor segmenti uchun alohida panel)
    for (let i = 0; i < outline.length; i++) {
      const p1 = outline[i];
      const p2 = outline[(i + 1) % outline.length];
      const dx = +p2[0] - +p1[0];
      const dy = +p2[1] - +p1[1];
      const wallLen = Math.hypot(dx, dy);
      if (wallLen < 10) continue;

      const wallThick = 150; // 150mm devor qalinligi
      const angle = Math.atan2(dy, dx);
      const wcs = Math.cos(angle), wsn = Math.sin(angle);
      const wMidX = (+p1[0] + +p2[0]) / 2;
      const wMidY = (+p1[1] + +p2[1]) / 2;

      // Devor markazini xonadan tashqariga qarab surish
      const nx = -wsn * (wallThick / 2);
      const ny = wcs * (wallThick / 2);

      const wallGeom = computeBoxVerticesAndNormals(
        wMidX + nx, wMidY + ny, wh / 2, wcs, wsn,
        0, 0, 0,
        wallLen, wallThick, wh
      );
      const wallGeomIdx = panelGeometries.length;
      panelGeometries.push(wallGeom);

      const wallMeshIdx = meshes.length;
      meshes.push({
        name: `Mesh_Devor_${i + 1}`,
        geomIndex: wallGeomIdx,
        materialIndex: getMaterialIndex('wall')
      });

      const wallNodeIdx = nodes.length;
      nodes.push({
        name: `Devor ${i + 1} (${Math.round(wallLen)}×${wh} mm)`,
        mesh: wallMeshIdx
      });
      roomChildNodes.push(wallNodeIdx);
    }

    const roomNodeIdx = nodes.length;
    nodes.push({
      name: `Xona (${Math.round(rw)}×${Math.round(rd)}×${wh} mm)`,
      children: roomChildNodes
    });
    topLevelNodeIndices.push(roomNodeIdx);
  }

  /* ── 3. Binar buferni (BIN chunk) yig'ish ── */
  const totalBoxes = panelGeometries.length;
  const totalVerts = totalBoxes * 24;

  const posByteLength = totalVerts * 3 * 4;  // float32
  const normByteLength = totalVerts * 3 * 4; // float32
  const idxByteLength = 36 * 2;              // 36 ta uint16 = 72 bayt

  // Har bir bo'lim 4 baytga karrali (aligned)
  const posOffset = 0;
  const normOffset = posOffset + posByteLength;
  const idxOffset = normOffset + normByteLength;

  const rawBinLength = idxOffset + idxByteLength;
  // glTF 2.0: BIN chunk 4 baytga bo'linishi kerak
  const binPadding = (4 - (rawBinLength % 4)) % 4;
  const totalBinLength = rawBinLength + binPadding;

  const binBuffer = new Uint8Array(totalBinLength);
  const posView = new Float32Array(binBuffer.buffer, binBuffer.byteOffset + posOffset, totalVerts * 3);
  const normView = new Float32Array(binBuffer.buffer, binBuffer.byteOffset + normOffset, totalVerts * 3);
  const idxView = new Uint16Array(binBuffer.buffer, binBuffer.byteOffset + idxOffset, 36);

  // 1) Standart 36 ta indeksni yozish
  idxView.set(boxIndices);

  // 2) Cho'qqi va normallarni yozish
  for (let b = 0; b < totalBoxes; b++) {
    const geom = panelGeometries[b];
    posView.set(geom.positions, b * 24 * 3);
    normView.set(geom.normals, b * 24 * 3);
  }

  /* ── 4. glTF JSON obyektini yaratish ── */
  const accessors = [];

  // Accessor 0: Umumiy indekslar accesssori (har bir box primitive uchun bitta)
  accessors.push({
    bufferView: 2,
    byteOffset: 0,
    componentType: 5123, // UNSIGNED_SHORT
    count: 36,
    type: 'SCALAR',
    min: [0],
    max: [23]
  });

  // Accessor 1..N: Har bir box uchun pozitsiya va normal accessorlari
  const gltfMeshes = [];
  for (let m = 0; m < meshes.length; m++) {
    const meshInfo = meshes[m];
    const geom = panelGeometries[meshInfo.geomIndex];

    const posAccessorIdx = accessors.length;
    accessors.push({
      bufferView: 0,
      byteOffset: meshInfo.geomIndex * 24 * 3 * 4,
      componentType: 5126, // FLOAT
      count: 24,
      type: 'VEC3',
      min: geom.bounds.min,
      max: geom.bounds.max
    });

    const normAccessorIdx = accessors.length;
    accessors.push({
      bufferView: 1,
      byteOffset: meshInfo.geomIndex * 24 * 3 * 4,
      componentType: 5126, // FLOAT
      count: 24,
      type: 'VEC3'
    });

    gltfMeshes.push({
      name: meshInfo.name,
      primitives: [
        {
          attributes: {
            POSITION: posAccessorIdx,
            NORMAL: normAccessorIdx
          },
          indices: 0, // Umumiy 36 indeks accesssori
          material: meshInfo.materialIndex,
          mode: 4 // TRIANGLES
        }
      ]
    });
  }

  const gltfJson = {
    asset: {
      version: '2.0',
      generator: 'Smart3D glTF/GLB Engine 2026'
    },
    scene: 0,
    scenes: [
      {
        name: 'Smart3D Furniture Scene',
        nodes: topLevelNodeIndices
      }
    ],
    nodes,
    materials: materialsList,
    meshes: gltfMeshes,
    accessors,
    bufferViews: [
      {
        buffer: 0,
        byteOffset: posOffset,
        byteLength: posByteLength,
        byteStride: 12,
        target: 34962 // ARRAY_BUFFER
      },
      {
        buffer: 0,
        byteOffset: normOffset,
        byteLength: normByteLength,
        byteStride: 12,
        target: 34962 // ARRAY_BUFFER
      },
      {
        buffer: 0,
        byteOffset: idxOffset,
        byteLength: idxByteLength,
        target: 34963 // ELEMENT_ARRAY_BUFFER
      }
    ],
    buffers: [
      {
        byteLength: totalBinLength
      }
    ]
  };

  /* ── 5. GLB konteynerini yig'ish (Header + JSON + BIN) ── */
  const jsonText = JSON.stringify(gltfJson);
  const encoder = new TextEncoder();
  const jsonBytes = encoder.encode(jsonText);

  // JSON chunk ham 4 baytga bo'linishi kerak (0x20 Space bilan to'ldiriladi)
  const jsonPadding = (4 - (jsonBytes.length % 4)) % 4;
  const jsonChunkLength = jsonBytes.length + jsonPadding;

  const totalGlbLength = 12 + 8 + jsonChunkLength + 8 + totalBinLength;
  const glb = new Uint8Array(totalGlbLength);
  const dataView = new DataView(glb.buffer, glb.byteOffset, glb.byteLength);

  let offset = 0;

  // 1) 12-baytlik GLB Header
  dataView.setUint32(offset, 0x46546C67, true); offset += 4; // Magic: 'glTF'
  dataView.setUint32(offset, 2, true); offset += 4;          // Version: 2
  dataView.setUint32(offset, totalGlbLength, true); offset += 4; // Total Length

  // 2) JSON Chunk Header
  dataView.setUint32(offset, jsonChunkLength, true); offset += 4;
  dataView.setUint32(offset, 0x4E4F534A, true); offset += 4; // Type: 'JSON'

  // JSON ma'lumotlari
  glb.set(jsonBytes, offset);
  offset += jsonBytes.length;
  for (let i = 0; i < jsonPadding; i++) {
    glb[offset++] = 0x20; // Space padding
  }

  // 3) BIN Chunk Header
  dataView.setUint32(offset, totalBinLength, true); offset += 4;
  dataView.setUint32(offset, 0x004E4942, true); offset += 4; // Type: 'BIN\0'

  // BIN ma'lumotlari
  glb.set(binBuffer, offset);
  offset += totalBinLength;

  return {
    glb,
    stats: {
      totalBoxes,
      totalVerts,
      totalIndices: totalBoxes * 36,
      meshesCount: gltfMeshes.length,
      nodesCount: nodes.length,
      byteLength: totalGlbLength
    }
  };
}
