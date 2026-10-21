/* =====================================================================
   角色：上傳 → 解析 → 轉正縮放 → 自動拆零件 → 自動骨架 → 動作
   ===================================================================== */
const CHAR_H = 1.55;                // 角色正規化後的高度
const charState = { files:null, yaw:0, up:'z', name:'', kind:'default', info:null };
let charTemplate = null;            // 已綁好骨架的角色（遊戲與預覽都 clone 它）
let rawChar = null;                 // 原始模型（未轉正）

/* ── 預設角色：圓滾滾的藍色小機器人（原創），零件分開以便自動綁骨架 ── */
function makeDefaultCharacter(){
  const g = new THREE.Group();
  const blue = toon(0x4f8cff), navy = toon(0x22306b), red = toon(0xff6b6b), yellow = toon(0xffcf3f,{ emissive:0x553300 }), white = toon(0xffffff);
  g.add(mesh(G.sphere, blue, .46,.44,.42, 0,.55,0));
  g.add(mesh(G.sphere, navy, .32,.22,.12, 0,.6,.34));
  for(const sx of [-1,1]){
    g.add(mesh(G.sphere, toon(0x7ef0ff,{ emissive:0x1a6f7a }), .06,.08,.04, sx*.12,.62,.45));
    g.add(mesh(G.sphere, blue, .13,.11,.13, sx*.6,.5,.02));            // 手
    g.add(mesh(G.sphere, red, .17,.1,.21, sx*.22,.08,.06));             // 腳
  }
  g.add(mesh(G.cyl, navy, .025,.2,.025, 0,1.07,0));
  g.add(mesh(G.sphere, yellow, .075,.075,.075, 0,1.2,0));
  g.add(mesh(G.sphere, white, .1,.05,.04, 0,.36,.41));
  return g;
}

/* ── 材質：轉成卡通材質，保留顏色與貼圖 ── */
function prepareMaterials(root){
  root.traverse(o => {
    if(!o.isMesh) return;
    o.castShadow = true;
    if(o.geometry && !o.geometry.attributes.normal) o.geometry.computeVertexNormals();
    const conv = m => {
      if(!m) return toon(0xdddddd);
      if(m.map){ m.side = THREE.DoubleSide; return m; }
      const c = (m.color ? m.color.getHex() : 0xdddddd);
      const t = new THREE.MeshToonMaterial({ color:c, gradientMap:gradTex, side:THREE.DoubleSide, vertexColors: !!(o.geometry && o.geometry.attributes.color) });
      if(m.opacity !== undefined && m.opacity < 1){ t.transparent = true; t.opacity = m.opacity; }
      return t;
    };
    o.material = Array.isArray(o.material) ? o.material.map(conv) : conv(o.material);
  });
}

/* ── 幾何拆解：依材質群組、依相連零件 ── */
function geoSubset(geo, triList){
  // triList: 三角形編號（依 index 或頂點順序）→ 新的非索引幾何
  const idx = geo.index ? geo.index.array : null;
  const out = new THREE.BufferGeometry();
  for(const name of ['position','normal','uv','color']){
    const a = geo.attributes[name]; if(!a) continue;
    const isz = a.itemSize, arr = new Float32Array(triList.length*3*isz);
    let o = 0;
    for(const t of triList) for(let k=0;k<3;k++){
      const vi = idx ? idx[t*3+k] : t*3+k;
      for(let c=0;c<isz;c++) arr[o++] = a.array[vi*isz + c];
    }
    out.setAttribute(name, new THREE.BufferAttribute(arr, isz));
  }
  return out;
}
function splitMesh(m){
  const geo = m.geometry, pos = geo.attributes.position;
  if(!pos) return [m];
  const triCount = (geo.index ? geo.index.count : pos.count)/3;
  if(triCount < 2 || triCount > 250000) return [m];
  const mats = Array.isArray(m.material) ? m.material : null;
  // 依材質群組分
  let groups;
  if(mats && geo.groups.length){ groups = geo.groups.map(g => ({ mat:mats[g.materialIndex] || mats[0], tris:Array.from({ length:g.count/3 }, (_,i) => g.start/3 + i) })); }
  else groups = [{ mat: mats ? mats[0] : m.material, tris:Array.from({ length:triCount }, (_,i) => i) }];
  // 每個群組再依「相連」拆成零件（位置相同的頂點視為同一點）
  const idx = geo.index ? geo.index.array : null;
  const keyOf = vi => Math.round(pos.getX(vi)*500) + ',' + Math.round(pos.getY(vi)*500) + ',' + Math.round(pos.getZ(vi)*500);
  const out = [];
  for(const grp of groups){
    const ids = new Map(); const parent = [];
    const find = a => { while(parent[a] !== a){ parent[a] = parent[parent[a]]; a = parent[a]; } return a; };
    const idOf = vi => { const k = keyOf(vi); let id = ids.get(k); if(id === undefined){ id = parent.length; parent.push(id); ids.set(k, id); } return id; };
    const triRoot = new Int32Array(grp.tris.length);
    grp.tris.forEach((t, j) => {
      const a = idOf(idx ? idx[t*3] : t*3), b = idOf(idx ? idx[t*3+1] : t*3+1), c = idOf(idx ? idx[t*3+2] : t*3+2);
      const ra = find(a), rb = find(b), rc = find(c); parent[rb] = ra; parent[find(rc)] = ra;
      triRoot[j] = a;
    });
    const buckets = new Map();
    grp.tris.forEach((t, j) => { const r = find(triRoot[j]); if(!buckets.has(r)) buckets.set(r, []); buckets.get(r).push(t); });
    if(buckets.size > 160){ out.push({ geo:geoSubset(geo, grp.tris), mat:grp.mat }); continue; }
    for(const tris of buckets.values()) out.push({ geo:geoSubset(geo, tris), mat:grp.mat });
  }
  if(out.length <= 1 && !mats) return [m];
  return out.map(({ geo:g, mat }) => {
    if(!g.attributes.normal) g.computeVertexNormals();
    const n = new THREE.Mesh(g, mat); n.position.copy(m.position); n.quaternion.copy(m.quaternion); n.scale.copy(m.scale); n.castShadow = true; return n;
  });
}

/* ── 正規化＋自動骨架 ── */
function buildRiggedCharacter(raw, up, yawSteps, thinOutline){
  const orient = new THREE.Group(); orient.add(raw);
  if(up === 'z') orient.rotation.x = -Math.PI/2;
  else if(up === 'x') orient.rotation.z = Math.PI/2;
  const yawG = new THREE.Group(); yawG.add(orient); yawG.rotation.y = yawSteps*Math.PI/2;
  const box0 = new THREE.Box3().setFromObject(yawG);
  const size = box0.getSize(new THREE.Vector3()), center = box0.getCenter(new THREE.Vector3());
  const s = Math.min(CHAR_H/Math.max(size.y,1e-6), 1.8/Math.max(size.x, size.z, 1e-6));
  yawG.position.set(-center.x, -box0.min.y, -center.z);
  const norm = new THREE.Group(); norm.add(yawG); norm.scale.setScalar(s);
  const root = new THREE.Group(); root.add(norm);
  root.updateMatrixWorld(true);

  // 拆零件
  const meshes = []; norm.traverse(o => { if(o.isMesh) meshes.push(o); });
  for(const m of meshes){
    const pieces = splitMesh(m);
    if(pieces.length === 1 && pieces[0] === m) continue;
    const p = m.parent; pieces.forEach(x => p.add(x)); p.remove(m);
  }
  root.updateMatrixWorld(true);
  const parts = []; norm.traverse(o => { if(o.isMesh) parts.push({ m:o, box:new THREE.Box3().setFromObject(o) }); });
  for(const p of parts){ p.c = p.box.getCenter(new THREE.Vector3()); p.sz = p.box.getSize(new THREE.Vector3()); p.vol = Math.max(1e-6, p.sz.x*p.sz.y*p.sz.z); }
  const total = new THREE.Box3().setFromObject(norm);
  const H = total.max.y - total.min.y;

  // 身體＝體積大、靠中間、高度在中段的零件
  let body = null, bestScore = -1;
  for(const p of parts){
    if(p.c.y < H*.12 || p.c.y > H*.9) continue;
    const score = p.vol / (1 + Math.abs(p.c.x)*4);
    if(score > bestScore){ bestScore = score; body = p; }
  }
  if(!body) body = parts.reduce((a,b) => b.vol > a.vol ? b : a, parts[0]);
  const bb = body.box, bodyCx = body.c.x, bodyCz = body.c.z, bodyHalfW = (bb.max.x - bb.min.x)/2, bodyH = bb.max.y - bb.min.y;

  const role = new Map();
  for(const p of parts){
    if(p === body){ role.set(p, ['body',0]); continue; }
    const dx = p.c.x - bodyCx, side = Math.sign(dx) || 1;
    const outside = Math.abs(dx) > bodyHalfW*.82 || p.box.min.x > bb.max.x - .02 || p.box.max.x < bb.min.x + .02;
    if(p.box.max.y <= bb.min.y + bodyH*.38 && p.c.y < H*.3){
      role.set(p, Math.abs(dx) < H*.05 ? ['body',0] : ['leg', side]);
    } else if(outside && p.c.y > H*.12){
      role.set(p, ['arm', side]);
    } else if(p.c.y > bb.max.y - bodyH*.12 && p.box.min.y > bb.min.y + bodyH*.55){
      role.set(p, ['top',0]);
    } else role.set(p, ['body',0]);
  }

  // 建立關節
  const rig = new THREE.Group(); rig.name = 'rig'; root.add(rig);
  const unionBox = list => { const b = new THREE.Box3(); list.forEach(p => b.union(p.box)); return b; };
  const bodyPivot = new THREE.Group(); bodyPivot.userData.rigRole = 'body';
  bodyPivot.position.set(bodyCx, bb.min.y, bodyCz); rig.add(bodyPivot);
  const info = { arms:0, legs:0, tops:0, parts:parts.length };
  const pivotsFor = (kind, side) => parts.filter(p => role.get(p)[0] === kind && (side === undefined || role.get(p)[1] === side));
  const made = [];
  for(const side of [-1, 1]){
    const legs = pivotsFor('leg', side);
    if(legs.length){
      const b = unionBox(legs), c = b.getCenter(new THREE.Vector3());
      const g = new THREE.Group(); g.userData.rigRole = 'leg'; g.userData.rigSide = side;
      g.position.set(c.x, b.max.y, c.z); g.userData.halfZ = (b.max.z - b.min.z)/2; g.userData.legH = b.max.y - b.min.y;
      rig.add(g); made.push([g, legs]); info.legs++;
    }
    const arms = pivotsFor('arm', side);
    if(arms.length){
      const near = arms.reduce((a,b) => Math.abs(b.c.x - bodyCx) < Math.abs(a.c.x - bodyCx) ? b : a);
      const g = new THREE.Group(); g.userData.rigRole = 'arm'; g.userData.rigSide = side;
      g.userData.weight = unionBox(arms).getSize(new THREE.Vector3()).y;
      g.position.set(bodyCx + side*bodyHalfW*.78 - bodyPivot.position.x, clamp(near.c.y, bb.min.y + bodyH*.25, bb.max.y - bodyH*.1) - bodyPivot.position.y, bodyCz - bodyPivot.position.z);
      bodyPivot.add(g); made.push([g, arms]); info.arms++;
    }
  }
  const tops = pivotsFor('top');
  if(tops.length){
    const g = new THREE.Group(); g.userData.rigRole = 'top';
    g.position.set(0, bb.max.y - bodyPivot.position.y - bodyH*.08, 0); bodyPivot.add(g); made.push([g, tops]); info.tops = tops.length;
  }
  made.push([bodyPivot, pivotsFor('body')]);
  root.updateMatrixWorld(true);
  // 帽子掛點：頭頂配件的最上緣，或身體頂端；跟著身體動
  const hatParent = (made.find(([g]) => g.userData.rigRole === 'top') || [bodyPivot])[0];
  const hatY = tops.length ? unionBox(tops).max.y : bb.max.y;
  const hatAnchor = new THREE.Group(); hatAnchor.userData.rigRole = 'hat';
  hatAnchor.position.copy(hatParent.worldToLocal(new THREE.Vector3(bodyCx, hatY - .03, bodyCz)));
  hatAnchor.scale.setScalar(clamp(bodyHalfW*2/.75, .7, 1.5));
  hatParent.add(hatAnchor);
  root.userData.mouthY = clamp(body.c.y, .3, 1.1);
  for(const [g, list] of made) for(const p of list) g.attach(p.m);
  // 武器手：比較高的那隻手（通常拿著劍）
  const armGroups = made.filter(([g]) => g.userData.rigRole === 'arm');
  if(armGroups.length){ const w = armGroups.reduce((a,b) => b[0].userData.weight > a[0].userData.weight ? b : a); w[0].userData.weapon = true; }
  root.remove(norm);
  addOutline(root, 0.0001, thinOutline ? outlineMatThin : outlineMat);
  root.userData.charHeight = H;
  return { root, info };
}

/* ── 骨架動作 ── */
const _pivotCache = new WeakMap();
function getPivots(root){
  let p = _pivotCache.get(root);
  if(p) return p;
  p = { body:null, arms:[], legs:[], tops:[], hat:null };
  root.traverse(o => {
    const r = o.userData.rigRole; if(!r) return;
    if(r === 'body') p.body = o; else if(r === 'arm') p.arms.push(o); else if(r === 'leg') p.legs.push(o); else if(r === 'top') p.tops.push(o); else if(r === 'hat') p.hat = o;
  });
  p.weaponSide = (p.arms.find(a => a.userData.weapon) || p.arms[0] || { userData:{ rigSide:1 } }).userData.rigSide;
  _pivotCache.set(root, p); return p;
}
const _rest = new WeakMap();
function restPos(o){ let r = _rest.get(o); if(!r){ r = o.position.clone(); _rest.set(o, r); } return r; }
const easeOutBack = k => { const c1 = 1.70158, c3 = c1 + 1; return 1 + c3*Math.pow(k-1,3) + c1*Math.pow(k-1,2); };
/* mode: idle walk jump fall float inhale full attack breath hurt swallow dash pound wave dance win spin */
function animateRig(root, st, dt){
  const P_ = getPivots(root);
  const t = st.t, ph = st.phase !== undefined ? st.phase : t*11, k = clamp(st.k || 0, 0, 1);
  const sm = (o, prop, target, rate=14) => { o.rotation[prop] = damp(o.rotation[prop], target, rate, dt); };
  let bx = 0, bz = 0, by = 0, topAmp = .03, topSpd = 3;
  switch(st.mode){
    case 'walk': bz = Math.sin(ph)*.08; bx = .1; topAmp = .12; topSpd = 11; break;
    case 'jump': bx = -.08; topAmp = .05; break;
    case 'fall': bx = .05; topAmp = .15; topSpd = 14; break;
    case 'float': bz = Math.sin(t*3)*.07; topAmp = .1; topSpd = 6; break;
    case 'inhale': bx = .22; topAmp = .06; topSpd = 30; break;
    case 'attack': bx = lerp(-.18, .28, k); break;
    case 'breath': bx = .2; break;
    case 'hurt': bx = -.35; bz = Math.sin(t*30)*.08; break;
    case 'dash': bx = .38; break;
    case 'dance': bz = Math.sin(t*8)*.22; by = Math.sin(t*4)*.55; topAmp = .25; topSpd = 8; break;
    case 'wave': bz = Math.sin(t*3)*.05; break;
    case 'win': by = Math.sin(t*5)*.4; topAmp = .2; topSpd = 10; break;
    case 'spin': by = t*14; break;
    default: bz = Math.sin(t*1.6)*.03; by = Math.sin(t*.5)*.12;
  }
  if(P_.body){
    // 走路時的上下起伏只作用在身體，腳不會跟著離地
    const br = restPos(P_.body), bob = st.mode === 'walk' ? Math.abs(Math.sin(ph))*.045 : 0;
    P_.body.position.y = damp(P_.body.position.y, br.y + bob, 20, dt);
    sm(P_.body, 'x', bx); sm(P_.body, 'z', bz);
    if(st.mode === 'spin') P_.body.rotation.y = by; else sm(P_.body, 'y', by, 8);
  }
  for(const a of P_.arms){
    const s = a.userData.rigSide, weapon = s === P_.weaponSide;
    let rx = 0, rz = s*(.12 + Math.sin(t*2 + s)*.05);
    switch(st.mode){
      case 'walk': rx = -Math.sin(ph)*.65*s; rz = s*.18; break;
      case 'jump': rz = s*1.35; break;
      case 'fall': rz = s*(.95 + Math.sin(t*16 + s)*.25); break;
      case 'float': rz = s*(1.1 + Math.sin(t*12)*.45); break;
      case 'inhale': rx = -1.3; rz = s*.3 + Math.sin(t*40)*.05; break;
      case 'full': rx = -.55; rz = -s*.25; break;
      case 'attack': if(weapon){ rx = lerp(-1.4, 1.7, easeOutBack(k)); rz = s*.25; } else rz = s*.55; break;
      case 'breath': rx = -1.05 + Math.sin(t*30)*.06; rz = s*.2; break;
      case 'hurt': rz = s*1.6 + Math.sin(t*30)*.2; break;
      case 'swallow': rx = -.3; rz = -s*.3; break;
      case 'dash': rx = .95; rz = s*.3; break;
      case 'pound': rz = s*2.3; break;
      case 'wave': if(weapon){ rz = s*(2.3 + Math.sin(t*12)*.35); } break;
      case 'dance': rz = s*(1.15 + Math.sin(t*8 + (s > 0 ? 0 : Math.PI))*.85); rx = Math.sin(t*4)*.4; break;
      case 'win': rz = s*(2.2 + Math.sin(t*10 + s)*.3); break;
      case 'spin': rz = s*1.5; break;
    }
    const fast = st.mode === 'attack' ? 40 : 16;
    sm(a, 'x', rx, fast); sm(a, 'z', rz, fast);
  }
  const grounded = st.mode === 'idle' || st.mode === 'walk' || st.mode === 'dance' || st.mode === 'wave' || st.mode === 'win' || st.mode === 'hurt' || st.mode === 'attack' || st.mode === 'breath' || st.mode === 'inhale' || st.mode === 'full' || st.mode === 'swallow';
  for(const l of P_.legs){
    const s = l.userData.rigSide, rest = restPos(l), half = l.userData.halfZ || .1;
    let rx = 0, rz = 0, ly = 0, lz = 0;
    switch(st.mode){
      case 'walk': {
        // 步行循環：往前跨的腳抬起、腳尖微翹；著地的腳踩穩往後推
        const f = ph + (s > 0 ? 0 : Math.PI), swing = Math.max(0, Math.cos(f));
        lz = Math.sin(f)*.1; ly = swing*.1; rx = -swing*.28;
        break;
      }
      case 'jump': rx = -.45 + s*.15; break;
      case 'fall': rx = Math.sin(t*14)*.3*s; break;
      case 'float': rx = Math.sin(t*6)*.25*s; rz = s*.15; break;
      case 'dash': rx = .5; break;
      case 'pound': rx = -.9; break;
      case 'hurt': rx = .45*s; break;
      case 'dance': rx = Math.max(0, Math.sin(t*8 + (s > 0 ? 0 : Math.PI)))*-.7; rz = s*.12; break;
      case 'win': rx = Math.sin(t*10)*.3*s; break;
    }
    sm(l, 'x', rx, 18); sm(l, 'z', rz, 18);
    // 腳轉動時腳跟或腳尖會往下掉，這裡把那段距離補回來
    if(grounded) ly = Math.max(ly, half*Math.abs(Math.sin(l.rotation.x)) + (l.userData.legH || .1)*(1 - Math.cos(l.rotation.z))*.5);
    l.position.y = damp(l.position.y, rest.y + ly, 22, dt);
    l.position.z = damp(l.position.z, rest.z + lz, 22, dt);
  }
  for(const tp of P_.tops){ sm(tp, 'z', Math.sin(t*topSpd - .8)*topAmp + (P_.body ? -P_.body.rotation.z*.6 : 0), 12); sm(tp, 'x', Math.cos(t*topSpd*.7)*topAmp*.5, 12); }
}

/* ── 解析上傳檔 ── */
async function expandFiles(list){
  const out = [];
  for(const f of list){
    if(/\.zip$/i.test(f.name)){
      if(!window.JSZip) throw new Error('壓縮檔工具沒載入，請確認網路後重新整理');
      const zip = await window.JSZip.loadAsync(f.data);
      for(const path of Object.keys(zip.files)){
        const zf = zip.files[path]; if(zf.dir || /__MACOSX|\/\._/.test(path)) continue;
        out.push({ name:path.split('/').pop(), data: await zf.async('arraybuffer') });
      }
    } else out.push(f);
  }
  return out;
}
async function parseCharacter(files){
  const list = await expandFiles(files);
  const find = re => list.find(f => re.test(f.name));
  const blobUrls = new Map();
  for(const f of list){ if(/\.(png|jpe?g|bin)$/i.test(f.name)) blobUrls.set(f.name.toLowerCase(), URL.createObjectURL(new Blob([f.data]))); }
  const manager = new THREE.LoadingManager();
  manager.setURLModifier(url => { const key = decodeURIComponent(url.split(/[\\/]/).pop()).toLowerCase(); return blobUrls.get(key) || url; });
  const txt = d => new TextDecoder().decode(d);
  const glb = find(/\.(glb|gltf)$/i);
  if(glb){
    const gl = await new Promise((res, rej) => new GLTFLoader(manager).parse(/\.gltf$/i.test(glb.name) ? txt(glb.data) : glb.data, '', res, rej));
    return { obj: gl.scene, name: glb.name, defaultUp:'y' };
  }
  const obj = find(/\.obj$/i);
  if(obj){
    const loader = new OBJLoader(manager);
    const mtl = find(/\.mtl$/i);
    if(mtl){ const mc = new MTLLoader(manager).parse(txt(mtl.data), ''); mc.preload(); loader.setMaterials(mc); }
    return { obj: loader.parse(txt(obj.data)), name: obj.name, defaultUp:'z' };
  }
  const stl = find(/\.stl$/i);
  if(stl){
    const geo = new STLLoader().parse(stl.data);
    const m = new THREE.Mesh(geo, new THREE.MeshToonMaterial({ color: geo.attributes.color ? 0xffffff : 0xffb347, vertexColors: !!geo.attributes.color, gradientMap:gradTex }));
    return { obj: m, name: stl.name, defaultUp:'z' };
  }
  throw new Error('找不到模型檔（需要 .obj、.glb 或 .stl）');
}

function rebuildTemplate(){
  const built = rawChar ? buildRiggedCharacter(rawChar.clone(true), charState.up, charState.yaw, true)
                        : buildRiggedCharacter(makeDefaultCharacter(), 'y', 0, false);
  charTemplate = built.root; charState.info = built.info;
  refreshPreviewModel();
  if(typeof P !== 'undefined' && P && P.modelHolder) attachPlayerModel();
  return built.info;
}
function rigSummary(info){
  if(!info) return '';
  const bits = [];
  if(info.arms) bits.push(`手 ×${info.arms}`);
  if(info.legs) bits.push(`腳 ×${info.legs}`);
  if(info.tops) bits.push(`頭頂配件 ×${info.tops}`);
  return bits.length ? `已自動辨識：${bits.join('、')}（共 ${info.parts} 個零件），會跟著動作。` : `這個模型沒有分開的手腳，會用整個身體做動作。想要手腳會動，在 Tinkercad 把手、腳做成獨立的零件就行。`;
}

/* ── IndexedDB：記住上傳的角色 ── */
function idb(){ return new Promise((res, rej) => { const r = indexedDB.open('dqgulp', 1); r.onupgradeneeded = () => r.result.createObjectStore('kv'); r.onsuccess = () => res(r.result); r.onerror = () => rej(r.error); }); }
async function idbSet(k, v){ try{ const db = await idb(); await new Promise((res, rej) => { const tx = db.transaction('kv','readwrite'); tx.objectStore('kv').put(v, k); tx.oncomplete = res; tx.onerror = () => rej(tx.error); }); }catch(e){} }
async function idbGet(k){ try{ const db = await idb(); return await new Promise((res) => { const tx = db.transaction('kv','readonly'); const r = tx.objectStore('kv').get(k); r.onsuccess = () => res(r.result); r.onerror = () => res(null); }); }catch(e){ return null; } }
async function idbDel(k){ try{ const db = await idb(); db.transaction('kv','readwrite').objectStore('kv').delete(k); }catch(e){} }

function setStatus(msg, err=false){ const s = $('charStatus'); s.textContent = msg; s.classList.toggle('err', err); }
function setTag(){ $('charTag').textContent = rawChar ? '我的角色' : '預設'; }

async function useFiles(fileList){
  try{
    setStatus('讀取中…');
    const files = [];
    for(const f of fileList) files.push({ name:f.name, data: await f.arrayBuffer() });
    const parsed = await parseCharacter(files);
    prepareMaterials(parsed.obj);
    rawChar = parsed.obj;
    Object.assign(charState, { files, up:parsed.defaultUp, yaw:0, name:parsed.name, kind:'upload' });
    const info = rebuildTemplate(); setTag();
    await idbSet('char', { files, up:charState.up, yaw:charState.yaw, name:charState.name });
    setStatus(`✔ 已換成「${parsed.name}」，下次打開還在。${rigSummary(info)}`);
    previewAct('wave'); sfx.ability();
  }catch(e){
    console.error(e);
    setStatus('讀不到這個檔案：' + (e.message || e) + '。Tinkercad 請用「匯出 → .OBJ」下載的 zip。', true);
  }
}
async function restoreCharacter(){
  const saved = await idbGet('char');
  if(saved && saved.files){
    try{
      const parsed = await parseCharacter(saved.files);
      prepareMaterials(parsed.obj);
      rawChar = parsed.obj;
      Object.assign(charState, { files:saved.files, up:saved.up || parsed.defaultUp, yaw:saved.yaw || 0, name:saved.name || parsed.name, kind:'upload' });
    }catch(e){ rawChar = null; }
  }
  const info = rebuildTemplate(); setTag();
  setStatus(rawChar ? `目前角色：「${charState.name}」。${rigSummary(info)}` : '用預設角色。上傳你在 Tinkercad 做的角色，它會跟著動起來！');
}
function saveCharSettings(){ if(rawChar) idbSet('char', { files:charState.files, up:charState.up, yaw:charState.yaw, name:charState.name }); }

/* ── 角色預覽（標題畫面） ── */
const pvCanvas = $('preview');
const pvRenderer = new THREE.WebGLRenderer({ canvas:pvCanvas, antialias:true, alpha:true });
pvRenderer.setPixelRatio(Math.min(window.devicePixelRatio || 1, 2));
pvRenderer.setSize(360, 270, false);
pvRenderer.outputColorSpace = THREE.SRGBColorSpace;
const pvScene = new THREE.Scene();
pvScene.add(new THREE.HemisphereLight(0xffffff, 0x99aacc, 1.2));
const pvSun = new THREE.DirectionalLight(0xffffff, 1.6); pvSun.position.set(2,4,5); pvScene.add(pvSun);
const pvCam = new THREE.PerspectiveCamera(30, 4/3, 0.1, 50); pvCam.position.set(0, 1.25, 5.2); pvCam.lookAt(0, .78, 0);
const pvGround = new THREE.Mesh(new THREE.CircleGeometry(.95, 40), toon(0x9fd86b)); pvGround.rotation.x = -Math.PI/2; pvScene.add(pvGround);
const pvTurn = new THREE.Group(), pvAnim = new THREE.Group(); pvScene.add(pvTurn); pvTurn.add(pvAnim);
let pvModel = null, pvT = 0, pvAct = null, pvActT = 0;
const PV_LABEL = { walk:'走路', jump:'跳躍', float:'飄浮', attack:'攻擊', wave:'揮手', dance:'跳舞' };
function refreshPreviewModel(){ pvAnim.clear(); pvModel = charTemplate ? charTemplate.clone(true) : null; if(pvModel) pvAnim.add(pvModel); }
function previewAct(a){
  pvAct = a; pvActT = 0;
  document.querySelectorAll('#actRow .chip').forEach(c => c.classList.toggle('on', c.dataset.act === a));
  $('pvHint').textContent = PV_LABEL[a] || '待機';
}
function renderPreview(dt){
  if(!pvModel) return;
  pvT += dt; pvActT += dt;
  let mode = 'idle', k = 0, y = 0, sc = 1;
  if(pvAct){
    const dur = pvAct === 'attack' ? .9 : 3;
    if(pvActT > dur){ pvAct = null; previewAct(null); }
    else {
      mode = pvAct;
      if(pvAct === 'jump'){ const c = (pvActT % 1.1)/1.1; y = Math.sin(c*Math.PI)*.7; mode = c < .5 ? 'jump' : 'fall'; }
      if(pvAct === 'float'){ y = .5 + Math.sin(pvT*3)*.12; sc = 1.32; }
      if(pvAct === 'attack'){ k = Math.min(1, (pvActT % .45)/.32); }
      if(pvAct === 'dance') y = Math.abs(Math.sin(pvT*4))*.12;
    }
  }
  const face = pvAct === 'walk' ? 1 : (Math.floor(pvT/3) % 2 ? -1 : 1);
  pvTurn.rotation.y = damp(pvTurn.rotation.y, pvAct === 'dance' || pvAct === 'wave' ? 0 : face*.7, 6, dt);
  pvAnim.position.y = damp(pvAnim.position.y, y, 14, dt);
  const s = damp(pvAnim.scale.x, sc, 10, dt); pvAnim.scale.set(s, s*(mode === 'idle' ? 1 + Math.sin(pvT*3)*.02 : 1), s);
  animateRig(pvModel, { mode, t:pvT, phase:pvT*12, k }, dt);
  pvRenderer.render(pvScene, pvCam);
}
