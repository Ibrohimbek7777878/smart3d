/* Smart3D engine/photo-render.js — 1080p Foto-render va 360° Panorama Dvigateli.
 *
 * 6 YILLIK ARXITEKTURA STANDARTI (Kamchilik 22):
 *   1. 1080p / 4K Ultra-HD Offscreen Rendering:
 *      - Kadr nisbati 16:9 (1920x1080), anti-aliasing va yuqori aniqlikdagi teksturalar bilan.
 *      - Professional branding / o'lchov watermark bilan birga to'g'ridan-to'g'ri PNG eksport.
 *   2. 360° Ekvirektangulyar Panorama:
 *      - Ko'z balandligida (Z = 1500mm) xonaning markazidan 6-tomonlama CubeCamera o'rnatish.
 *      - GPU-tezlashtirilgan kubdan-ekvirektangulyar proyeksiyaga o'tkazish (2048x1024, 2:1).
 *      - VR garnitura, mobil telefon va ijtimoiy tarmoqlar (Facebook/Telegram 360) uchun tayyor.
 *   3. Nolinchi tashqi kutubxona (Three.js WebGL native).
 */
import * as THREE from 'three';

/**
 * 1080p Ultra-HD kadrni render qilib yuklab beradi.
 * @param {object} sp — createScene qaytargan sahnа obyekti
 * @param {object} opts — { width: 1920, height: 1080, title: 'Smart3D', download: true }
 */
export async function render1080p(sp, opts = {}) {
  const width = opts.width || 1920;
  const height = opts.height || 1080;
  const renderer = sp.renderer;
  const scene = sp.scene;
  const cam3d = sp.cam3d;

  // 1. 3D rejimiga o'tish (agar 2D bo'lsa)
  const prevMode = sp.getMode();
  if (prevMode !== '3d') {
    sp.setMode('3d');
  }

  // 2. Asl holatni saqlab olish (o'lcham keyin sp._resize() bilan konteynerdan tiklanadi —
  //    domElement.width × DPR qayta qo'llansa, har renderda canvas 2× kattalashib ketadi)
  const origDpr = renderer.getPixelRatio();
  const origGridVis = sp.groups.grid ? sp.groups.grid.visible : true;

  // Gridni vaqtincha yashirish
  if (sp.groups.grid) sp.groups.grid.visible = false;

  // 3. Renderer va kamerani 1080p o'lchamga sozlash
  renderer.setPixelRatio(1);
  renderer.setSize(width, height, false);
  cam3d.aspect = width / height;
  cam3d.updateProjectionMatrix();

  // Chiroq va soyalarni yangilash
  renderer.render(scene, cam3d);

  // 4. WebGL kanvasidan 2D kanvasga ko'chirish va watermark qo'shish
  const offscreen = document.createElement('canvas');
  offscreen.width = width;
  offscreen.height = height;
  const ctx = offscreen.getContext('2d');

  // Asosiy 3D tasvirni chizish
  ctx.drawImage(renderer.domElement, 0, 0, width, height);

  // Elegant brending va ma'lumot badge-i
  const badgeW = 380;
  const badgeH = 80;
  const badgeX = width - badgeW - 40;
  const badgeY = height - badgeH - 40;

  // Shisha effektli to'rtburchak (Glassmorphic badge)
  ctx.save();
  ctx.fillStyle = 'rgba(24, 24, 27, 0.75)';
  ctx.strokeStyle = 'rgba(255, 255, 255, 0.15)';
  ctx.lineWidth = 1.5;
  ctx.beginPath();
  ctx.roundRect(badgeX, badgeY, badgeW, badgeH, 12);
  ctx.fill();
  ctx.stroke();

  // Rangli brend indikatori
  ctx.fillStyle = '#f59e0b';
  ctx.beginPath();
  ctx.arc(badgeX + 30, badgeY + 40, 8, 0, Math.PI * 2);
  ctx.fill();

  // Matnlar
  ctx.fillStyle = '#ffffff';
  ctx.font = 'bold 20px -apple-system, BlinkMacSystemFont, "Segoe UI", Roboto, sans-serif';
  ctx.fillText('BITTADA SMART3D', badgeX + 50, badgeY + 36);

  ctx.fillStyle = '#a1a1aa';
  ctx.font = '14px -apple-system, BlinkMacSystemFont, "Segoe UI", Roboto, sans-serif';
  const now = new Date().toLocaleDateString('uz-UZ', { year: 'numeric', month: 'short', day: 'numeric' });
  ctx.fillText(`1080p Ultra-HD Render | ${now}`, badgeX + 50, badgeY + 60);

  ctx.restore();

  // 5. Asl renderer holatini tiklash
  if (sp.groups.grid) sp.groups.grid.visible = origGridVis;
  renderer.setPixelRatio(origDpr);
  sp._resize();                      // o'lcham + kamera nisbati konteynerdan
  if (prevMode !== '3d') sp.setMode(prevMode);
  sp._invalidate();

  // 6. Eksport / Yuklab olish
  const dataUrl = offscreen.toDataURL('image/png', 0.95);
  if (opts.download !== false) {
    const a = document.createElement('a');
    a.href = dataUrl;
    a.download = `Smart3D_1080p_Render_${Date.now()}.png`;
    document.body.appendChild(a);
    a.click();
    document.body.removeChild(a);
  }

  return { dataUrl, width, height };
}

/**
 * 360° Ekvirektangulyar panoramani render qiladi.
 * @param {object} sp — createScene qaytargan sahnа obyekti
 * @param {object} opts — { width: 2048, height: 1024, eyeHeight: 1500, download: true }
 */
export async function render360Panorama(sp, opts = {}) {
  const panoW = opts.width || 2048;
  const panoH = opts.height || 1024;
  const cubeRes = 1024;
  const renderer = sp.renderer;
  const scene = sp.scene;

  // 1. Markaz koordinatalarini aniqlash (sp.bbox = {minX, minY, maxX, maxY, cx, cy})
  const bbox = sp.bbox || { cx: 2100, cy: 1550 };
  const eyeX = bbox.cx;
  const eyeY = bbox.cy;
  const eyeZ = opts.eyeHeight || 1500; // Standart ko'z balandligi: 1.5 metr

  const prevMode = sp.getMode();
  if (prevMode !== '3d') sp.setMode('3d');

  const origGridVis = sp.groups.grid ? sp.groups.grid.visible : true;
  if (sp.groups.grid) sp.groups.grid.visible = false;

  // 2. Cube Camera va RenderTarget yaratish
  const cubeTarget = new THREE.WebGLCubeRenderTarget(cubeRes, {
    format: THREE.RGBAFormat,
    generateMipmaps: true,
    minFilter: THREE.LinearMipmapLinearFilter
  });
  const cubeCamera = new THREE.CubeCamera(10, 100000, cubeTarget);
  cubeCamera.position.set(eyeX, eyeY, eyeZ);
  cubeCamera.up.set(0, 0, 1);
  scene.add(cubeCamera);

  // 6 ta tomonni render qilish
  cubeCamera.update(renderer, scene);
  scene.remove(cubeCamera);

  // 3. GPU Shader orqali CubeMap'dan Ekvirektangulyar (2:1) tasvirga o'tkazish
  const panoTarget = new THREE.WebGLRenderTarget(panoW, panoH, {
    format: THREE.RGBAFormat,
    minFilter: THREE.LinearFilter,
    magFilter: THREE.LinearFilter
  });

  const panoScene = new THREE.Scene();
  const panoCam = new THREE.OrthographicCamera(-1, 1, 1, -1, 0, 1);

  // Ekvirektangulyar proyeksiyalash shaderi
  // Smart3D koordinatalari: Z-up, Y-north, X-east
  const panoMat = new THREE.ShaderMaterial({
    uniforms: {
      tCube: { value: cubeTarget.texture }
    },
    vertexShader: `
      varying vec2 vUv;
      void main() {
        vUv = uv;
        gl_Position = vec4(position, 1.0);
      }
    `,
    fragmentShader: `
      uniform samplerCube tCube;
      varying vec2 vUv;
      #define PI 3.14159265358979323846

      void main() {
        // vUv.x: [0..1] -> burchak [0..2PI]
        // vUv.y: [0..1] -> vertikal burchak [-PI/2..PI/2]
        float theta = vUv.x * 2.0 * PI - PI;
        float phi = (1.0 - vUv.y) * PI - (PI / 2.0);

        // Z-up koordinatalar tizimiga mos vektor
        vec3 dir;
        dir.x = cos(phi) * sin(theta);
        dir.y = cos(phi) * cos(theta);
        dir.z = sin(phi);

        gl_FragColor = textureCube(tCube, dir);
      }
    `,
    depthTest: false,
    depthWrite: false
  });

  const quad = new THREE.Mesh(new THREE.PlaneGeometry(2, 2), panoMat);
  panoScene.add(quad);

  // Render to PanoTarget
  renderer.setRenderTarget(panoTarget);
  renderer.render(panoScene, panoCam);
  renderer.setRenderTarget(null);

  // 4. PanoTarget piksellarini 2D Canvas'ga o'qish
  const pixels = new Uint8Array(panoW * panoH * 4);
  renderer.readRenderTargetPixels(panoTarget, 0, 0, panoW, panoH, pixels);

  const canvas = document.createElement('canvas');
  canvas.width = panoW;
  canvas.height = panoH;
  const ctx = canvas.getContext('2d');
  const imgData = ctx.createImageData(panoW, panoH);

  // WebGL Y o'qi pastdan tepaga, 2D canvas esa tepadan pastga bo'lgani uchun qatorlarni teskari tartibda ko'chirish
  for (let y = 0; y < panoH; y++) {
    const srcY = panoH - 1 - y;
    const srcOffset = srcY * panoW * 4;
    const dstOffset = y * panoW * 4;
    for (let x = 0; x < panoW * 4; x++) {
      imgData.data[dstOffset + x] = pixels[srcOffset + x];
    }
  }
  ctx.putImageData(imgData, 0, 0);

  // Suv belgisi (Watermark)
  ctx.save();
  ctx.fillStyle = 'rgba(255, 255, 255, 0.8)';
  ctx.font = 'bold 24px -apple-system, BlinkMacSystemFont, "Segoe UI", Roboto, sans-serif';
  ctx.fillText('Bittada Smart3D — 360° Virtual Tur', 40, panoH - 40);
  ctx.restore();

  // Tozalash
  cubeTarget.dispose();
  panoTarget.dispose();
  panoMat.dispose();
  quad.geometry.dispose();

  if (sp.groups.grid) sp.groups.grid.visible = origGridVis;
  if (prevMode !== '3d') sp.setMode(prevMode);
  sp._invalidate();

  const dataUrl = canvas.toDataURL('image/jpeg', 0.92);

  if (opts.download !== false) {
    const a = document.createElement('a');
    a.href = dataUrl;
    a.download = `Smart3D_360_Panorama_${Date.now()}.jpg`;
    document.body.appendChild(a);
    a.click();
    document.body.removeChild(a);
  }

  return { dataUrl, width: panoW, height: panoH, canvas };
}
