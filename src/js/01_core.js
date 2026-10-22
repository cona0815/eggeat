import * as THREE from 'three';
import { OBJLoader } from 'three/addons/loaders/OBJLoader.js';
import { MTLLoader } from 'three/addons/loaders/MTLLoader.js';
import { GLTFLoader } from 'three/addons/loaders/GLTFLoader.js';
import { STLLoader } from 'three/addons/loaders/STLLoader.js';
import { EffectComposer } from 'three/addons/postprocessing/EffectComposer.js';
import { RenderPass } from 'three/addons/postprocessing/RenderPass.js';
import { UnrealBloomPass } from 'three/addons/postprocessing/UnrealBloomPass.js';
import { OutputPass } from 'three/addons/postprocessing/OutputPass.js';
import { RoundedBoxGeometry } from 'three/addons/geometries/RoundedBoxGeometry.js';
import { mergeVertices, mergeGeometries } from 'three/addons/utils/BufferGeometryUtils.js';

const VERSION = 'v2.3', BUILD_DATE = '2026-10-22';

/* =====================================================================
   小工具
   ===================================================================== */
const $ = id => document.getElementById(id);
const clamp = (v,a,b) => Math.max(a, Math.min(b, v));
const lerp = (a,b,t) => a + (b-a)*t;
const damp = (a,b,k,dt) => lerp(a, b, 1 - Math.exp(-k*dt));
const rand = (a,b) => a + Math.random()*(b-a);
const pick = arr => arr[Math.floor(Math.random()*arr.length)];
function mulberry32(a){ return function(){ a|=0; a=a+0x6D2B79F5|0; let t=Math.imul(a^a>>>15,1|a); t=t+Math.imul(t^t>>>7,61|t)^t; return ((t^t>>>14)>>>0)/4294967296; }; }
const store = {
  get(k, d){ try{ const v = localStorage.getItem(k); return v === null ? d : JSON.parse(v); }catch(e){ return d; } },
  set(k, v){ try{ localStorage.setItem(k, JSON.stringify(v)); }catch(e){} },
  del(k){ try{ localStorage.removeItem(k); }catch(e){} },
};

/* =====================================================================
   存檔
   ===================================================================== */
const SAVE_KEY = 'dqfood_save_v2';
const SAVE = Object.assign({
  unlocked: 1, best: {}, snacks: {}, seenTips: {},
  settings: { music: 70, sfx: 80, quality: 'auto', touch: 'auto' },
}, store.get(SAVE_KEY, {}));
SAVE.settings = Object.assign({ music: 70, sfx: 80, quality: 'auto', touch: 'auto' }, SAVE.settings || {});
function saveGame(){ store.set(SAVE_KEY, SAVE); }

/* =====================================================================
   渲染器、場景、光線
   ===================================================================== */
const stage = $('stage');
const renderer = new THREE.WebGLRenderer({ antialias:true, powerPreference:'high-performance' });
renderer.setPixelRatio(Math.min(window.devicePixelRatio || 1, 2));
renderer.shadowMap.enabled = true;
renderer.shadowMap.type = THREE.PCFSoftShadowMap;
renderer.outputColorSpace = THREE.SRGBColorSpace;
stage.appendChild(renderer.domElement);

const scene = new THREE.Scene();
const camera = new THREE.PerspectiveCamera(38, 16/9, 0.1, 400);
const CAM_DIST = 12.5;
let camDist = CAM_DIST, targetDist = CAM_DIST;

const hemi = new THREE.HemisphereLight(0xffffff, 0x8a7a66, 1.15);
scene.add(hemi);
const sun = new THREE.DirectionalLight(0xffffff, 1.7);
sun.castShadow = true;
sun.shadow.mapSize.set(2048, 2048);
Object.assign(sun.shadow.camera, { left:-18, right:18, top:13, bottom:-9, near:1, far:60 });
sun.shadow.bias = -0.0008; sun.shadow.radius = 3;
scene.add(sun, sun.target);
const rim = new THREE.DirectionalLight(0xcfe6ff, 0.9);
rim.position.set(-6, 9, -12); scene.add(rim);
const fillPoint = new THREE.PointLight(0xffd59a, 0, 14, 1.6);   // 夜市／古堡用的暖色補光（跟著玩家）
scene.add(fillPoint);

/* 後製：發光 */
const composerRT = new THREE.WebGLRenderTarget(1, 1, { type:THREE.HalfFloatType, samples:4 });
const composer = new EffectComposer(renderer, composerRT);
composer.addPass(new RenderPass(scene, camera));
const bloomPass = new UnrealBloomPass(new THREE.Vector2(256, 256), 0.55, 0.45, 0.86);
composer.addPass(bloomPass);
composer.addPass(new OutputPass());

/* =====================================================================
   卡通材質與描邊
   ===================================================================== */
const gradTex = (() => {
  const t = new THREE.DataTexture(new Uint8Array([110,190,255]), 3, 1, THREE.RedFormat);
  t.minFilter = t.magFilter = THREE.NearestFilter; t.needsUpdate = true; return t;
})();
const _toonCache = new Map();
function toon(color, opt){
  const key = color + (opt ? JSON.stringify(opt) : '');
  if(!_toonCache.has(key)) _toonCache.set(key, new THREE.MeshToonMaterial({ color, gradientMap:gradTex, ...(opt||{}) }));
  return _toonCache.get(key);
}
const _basicCache = new Map();
function basic(color){ if(!_basicCache.has(color)) _basicCache.set(color, new THREE.MeshBasicMaterial({ color })); return _basicCache.get(color); }

function makeOutlineMat(uniform){
  const m = new THREE.MeshBasicMaterial({ color:0x1f2a5a, side:THREE.BackSide });
  m.onBeforeCompile = sh => {
    sh.uniforms.uThick = uniform;
    sh.vertexShader = 'uniform float uThick;\n' + sh.vertexShader.replace('#include <project_vertex>', `
      vec4 mvPosition = vec4( transformed, 1.0 );
      #ifdef USE_INSTANCING
        mvPosition = instanceMatrix * mvPosition;
      #endif
      mvPosition = modelViewMatrix * mvPosition;
      vec3 olN = normalize( normalMatrix * normal );
      mvPosition.xyz += olN * uThick * ( -mvPosition.z ) * 0.01;
      gl_Position = projectionMatrix * mvPosition;`);
  };
  m.customProgramCacheKey = () => 'outline';
  return m;
}
const outlineMat = makeOutlineMat({ value:0.30 });
const outlineMatThin = makeOutlineMat({ value:0.12 });
outlineMatThin.customProgramCacheKey = () => 'outline-thin';
const _smoothGeo = new WeakMap();
function smoothGeometry(geo){
  if(_smoothGeo.has(geo)) return _smoothGeo.get(geo);
  const g = new THREE.BufferGeometry();
  g.setAttribute('position', geo.attributes.position.clone());
  if(geo.index) g.setIndex(geo.index.clone());
  const m = mergeVertices(g, 1e-3); m.computeVertexNormals();
  _smoothGeo.set(geo, m); return m;
}
function addOutline(root, minSize=0.06, mat=outlineMat){
  const list = [];
  root.traverse(o => {
    if(!o.isMesh || o.isInstancedMesh || o.userData.isOutline || o.userData.noOutline) return;
    const m0 = Array.isArray(o.material) ? o.material[0] : o.material;
    if(!m0 || m0.isMeshBasicMaterial || m0.transparent) return;
    if(o.children.some(c => c.userData.isOutline)) return;
    if(!o.geometry.boundingSphere) o.geometry.computeBoundingSphere();
    if(o.geometry.boundingSphere.radius*Math.max(o.scale.x,o.scale.y,o.scale.z) < minSize) return;
    list.push(o);
  });
  for(const o of list){
    const ol = new THREE.Mesh(smoothGeometry(o.geometry), mat);
    ol.userData.isOutline = true; ol.castShadow = false; ol.raycast = () => {};
    o.add(ol);
  }
  return root;
}

/* 共用幾何 */
function facet(g){ g.deleteAttribute('normal'); g.computeVertexNormals(); return g; }
const G = {
  sphere: new THREE.SphereGeometry(1, 20, 14),
  sphereLo: new THREE.SphereGeometry(1, 10, 8),
  hemi: new THREE.SphereGeometry(1, 16, 8, 0, Math.PI*2, 0, Math.PI/2),
  box: new THREE.BoxGeometry(1,1,1),
  rbox: new RoundedBoxGeometry(1,1,1, 3, .18),
  cone: new THREE.ConeGeometry(1, 1, 12),
  cyl: new THREE.CylinderGeometry(1, 1, 1, 16),
  torus: new THREE.TorusGeometry(1, .2, 8, 24),
  dodeca: facet(new THREE.DodecahedronGeometry(1, 0)),
  ico: facet(new THREE.IcosahedronGeometry(1, 1)),
  capsule: new THREE.CapsuleGeometry(.5, 1, 6, 12),
  star: (() => {
    const s = new THREE.Shape();
    for(let i=0;i<10;i++){ const r = i%2 ? 0.42 : 1; const a = Math.PI/2 + i*Math.PI/5; const x = Math.cos(a)*r, y = Math.sin(a)*r; i ? s.lineTo(x,y) : s.moveTo(x,y); }
    s.closePath();
    const g = new THREE.ExtrudeGeometry(s, { depth:0.32, bevelEnabled:true, bevelThickness:0.08, bevelSize:0.08, bevelSegments:2 });
    g.center(); return g;
  })(),
  heart: (() => {
    const s = new THREE.Shape();
    s.moveTo(0,-0.9); s.bezierCurveTo(-1.3,-0.1,-1.0,1.0,0,0.45); s.bezierCurveTo(1.0,1.0,1.3,-0.1,0,-0.9);
    const g = new THREE.ExtrudeGeometry(s, { depth:0.35, bevelEnabled:true, bevelThickness:0.1, bevelSize:0.1, bevelSegments:2 });
    g.center(); return g;
  })(),
  bolt: (() => {
    const s = new THREE.Shape(); s.moveTo(.2,1); s.lineTo(-.35,.05); s.lineTo(.05,.05); s.lineTo(-.2,-1); s.lineTo(.4,.15); s.lineTo(0,.15); s.closePath();
    const g = new THREE.ExtrudeGeometry(s, { depth:.18, bevelEnabled:false }); g.center(); return g;
  })(),
};
// parent.add() 會回傳 parent；要接著調整子物件時用 addc()
function addc(parent, child){ parent.add(child); return child; }
function mesh(geo, mat, sx=1, sy=sx, sz=sx, x=0, y=0, z=0){
  const m = new THREE.Mesh(geo, mat); m.scale.set(sx,sy,sz); m.position.set(x,y,z); m.castShadow = true; return m;
}

/* =====================================================================
   畫質
   ===================================================================== */
const QUALITY = {
  high:{ label:'高', pr:2,    bloom:true,  outline:true,  shadow:true,  detail:true },
  mid: { label:'中', pr:1.25, bloom:false, outline:true,  shadow:true,  detail:true },
  low: { label:'低', pr:1,    bloom:false, outline:false, shadow:false, detail:false },
};
let quality = SAVE.settings.quality === 'auto' ? 'high' : (QUALITY[SAVE.settings.quality] ? SAVE.settings.quality : 'high');
let world = null;
function applyQuality(){
  const q = QUALITY[quality];
  renderer.setPixelRatio(Math.min(window.devicePixelRatio || 1, q.pr));
  composer.setPixelRatio(renderer.getPixelRatio());
  sun.castShadow = q.shadow;
  outlineMat.visible = q.outline; outlineMatThin.visible = q.outline;
  if(world) world.traverse(o => { if(o.userData.detail) o.visible = q.detail; });
  resize();
}
function resize(){
  const w = window.innerWidth, h = window.innerHeight;
  renderer.setSize(w, h); composer.setSize(w, h);
  camera.aspect = w / h; camera.updateProjectionMatrix();
  particleMat.uniforms.uPx.value = (h * renderer.getPixelRatio()) / (2*Math.tan(THREE.MathUtils.degToRad(camera.fov/2)));
}
let fpsAcc = 0, fpsN = 0, lowSecs = 0;
function frameStats(dt, active){
  if(SAVE.settings.quality !== 'auto' || !active) return;
  fpsAcc += dt; fpsN++;
  if(fpsAcc >= 1){
    const fps = fpsN/fpsAcc; fpsAcc = 0; fpsN = 0;
    lowSecs = fps < 35 ? lowSecs + 1 : 0;
    if(lowSecs >= 3 && quality !== 'low'){ quality = quality === 'high' ? 'mid' : 'low'; lowSecs = 0; applyQuality(); syncSettingsUI(); }
  }
}

/* =====================================================================
   粒子
   ===================================================================== */
const MAXP = 1200;
const pGeo = new THREE.BufferGeometry();
const pPos = new Float32Array(MAXP*3), pCol = new Float32Array(MAXP*3), pSize = new Float32Array(MAXP), pAlpha = new Float32Array(MAXP);
pGeo.setAttribute('position', new THREE.BufferAttribute(pPos,3));
pGeo.setAttribute('pcolor', new THREE.BufferAttribute(pCol,3));
pGeo.setAttribute('psize', new THREE.BufferAttribute(pSize,1));
pGeo.setAttribute('palpha', new THREE.BufferAttribute(pAlpha,1));
const particleMat = new THREE.ShaderMaterial({
  uniforms:{ uPx:{ value:600 } },
  vertexShader:`attribute vec3 pcolor; attribute float psize; attribute float palpha; uniform float uPx;
    varying vec3 vC; varying float vA;
    void main(){ vC=pcolor; vA=palpha; vec4 mv=modelViewMatrix*vec4(position,1.0);
      gl_PointSize = psize * uPx / -mv.z; gl_Position = projectionMatrix*mv; }`,
  fragmentShader:`varying vec3 vC; varying float vA;
    void main(){ vec2 d=gl_PointCoord-0.5; float r=length(d); if(r>0.5) discard;
      float a = smoothstep(0.5,0.28,r)*vA; gl_FragColor=vec4(vC + (0.35-r)*0.5, a); }`,
  transparent:true, depthWrite:false,
});
const points = new THREE.Points(pGeo, particleMat);
points.frustumCulled = false; points.renderOrder = 5;
scene.add(points);
const parts = [];
const _c = new THREE.Color();
function emit(x,y,z, vx,vy,vz, life, color, size=0.3, grav=0, drag=0){
  if(parts.length >= MAXP) parts.shift();
  _c.set(color);
  parts.push({ x,y,z,vx,vy,vz,life,max:life,r:_c.r,g:_c.g,b:_c.b,size,grav,drag });
}
function burst(x,y,colors,n=14,spd=4,size=0.32,life=0.6){
  for(let i=0;i<n;i++){ const a=Math.random()*Math.PI*2, s=spd*(0.4+Math.random()*0.8);
    emit(x,y,(Math.random()-.5)*0.6, Math.cos(a)*s, Math.sin(a)*s, (Math.random()-.5)*2, life*(0.6+Math.random()*0.6), colors[i%colors.length], size*(0.7+Math.random()*0.6), 6, 1.5); }
}
function ring(x,y,color,n=18,spd=6,size=.3){
  for(let i=0;i<n;i++){ const a = i/n*Math.PI*2; emit(x,y,0, Math.cos(a)*spd, Math.sin(a)*spd, 0, .4, color, size, 0, 3); }
}
function updateParticles(dt){
  let n = 0;
  for(let i=parts.length-1;i>=0;i--){
    const p = parts[i]; p.life -= dt;
    if(p.life <= 0){ parts.splice(i,1); continue; }
    p.vy -= p.grav*dt; const k = Math.max(0, 1-p.drag*dt); p.vx*=k; p.vy*=k; p.vz*=k;
    p.x += p.vx*dt; p.y += p.vy*dt; p.z += p.vz*dt;
  }
  for(const p of parts){
    pPos[n*3]=p.x; pPos[n*3+1]=p.y; pPos[n*3+2]=p.z;
    pCol[n*3]=p.r; pCol[n*3+1]=p.g; pCol[n*3+2]=p.b;
    const t = p.life/p.max; pSize[n] = p.size*(0.5+0.5*t); pAlpha[n] = Math.min(1, t*1.6);
    n++;
  }
  pGeo.setDrawRange(0, n);
  for(const k of ['position','pcolor','psize','palpha']) pGeo.attributes[k].needsUpdate = true;
}

/* 畫布貼圖小工具 */
const _texCache = new Map();
function canvasTex(key, w, h, paint){
  if(_texCache.has(key)) return _texCache.get(key);
  const c = document.createElement('canvas'); c.width = w; c.height = h; paint(c.getContext('2d'), w, h);
  const t = new THREE.CanvasTexture(c); t.colorSpace = THREE.SRGBColorSpace; t.anisotropy = 4;
  _texCache.set(key, t); return t;
}
function glowTexture(color){
  return canvasTex('glow'+color, 128, 128, (g) => {
    const gr = g.createRadialGradient(64,64,0,64,64,64); gr.addColorStop(0, color); gr.addColorStop(.25, color + 'aa'); gr.addColorStop(1, color + '00');
    g.fillStyle = gr; g.fillRect(0,0,128,128);
  });
}
function signTexture(text, bg='#c0392b', fg='#ffffff', w=256, h=96){
  return canvasTex('sign|'+text+bg+fg+w+h, w, h, (g) => {
    g.fillStyle = bg; g.beginPath(); g.roundRect(0,0,w,h,16); g.fill();
    g.strokeStyle = 'rgba(0,0,0,.25)'; g.lineWidth = 6; g.beginPath(); g.roundRect(4,4,w-8,h-8,12); g.stroke();
    g.fillStyle = fg; g.font = `900 ${Math.floor(h*.52)}px "Noto Sans TC","Microsoft JhengHei",sans-serif`;
    g.textAlign = 'center'; g.textBaseline = 'middle'; g.fillText(text, w/2, h/2 + 3, w - 20);
  });
}
const _labelCache = new Map();
function textLabel(text){
  if(!_labelCache.has(text)){
    const c = document.createElement('canvas'), x = c.getContext('2d'), fs = 44;
    x.font = `900 ${fs}px "Noto Sans TC","Microsoft JhengHei",sans-serif`;
    const w = Math.ceil(x.measureText(text).width) + 44; c.width = w; c.height = 76;
    x.font = `900 ${fs}px "Noto Sans TC","Microsoft JhengHei",sans-serif`;
    x.fillStyle = '#1f2a5a'; x.beginPath(); x.roundRect(0,0,w,76,24); x.fill();
    x.fillStyle = '#ffffff'; x.beginPath(); x.roundRect(5,5,w-10,66,19); x.fill();
    x.fillStyle = '#1f2a5a'; x.textAlign = 'center'; x.textBaseline = 'middle'; x.fillText(text, w/2, 40);
    const t = new THREE.CanvasTexture(c); t.colorSpace = THREE.SRGBColorSpace;
    _labelCache.set(text, { mat:new THREE.SpriteMaterial({ map:t, depthWrite:false, color:0xdedede }), ratio:w/76 });
  }
  const { mat, ratio } = _labelCache.get(text);
  const sp = new THREE.Sprite(mat); sp.scale.set(.42*ratio, .42, 1); sp.renderOrder = 4; return sp;
}
