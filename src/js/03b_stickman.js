/* =====================================================================
   v2.9 火柴人角色（預設）：捏造型＋自己畫；上傳 3D 模型改成進階選項
   ===================================================================== */
const STICK_COLORS = ['#3a3a3a','#ff5a5a','#ff9a3d','#ffcf3f','#47b04b','#4f8cff','#a86aff','#ff7ec7','#8a5a32','#ffffff'];
const STICK_DEFAULT = { headShape:'circle', face:'smile', accessory:'none', headColor:'#ffffff', bodyColor:'#3a3a3a', thickness:'mid' };
let stickCfg = { ...STICK_DEFAULT };
let drawnImage = null;           // 自己畫的圖（canvas），用在「自己畫」角色
const hexNum = c => parseInt(c.slice(1), 16);

/* 臉：畫在透明貼圖上，貼在頭的正面 */
function faceTexture(face){
  const c = document.createElement('canvas'); c.width = c.height = 128; const g = c.getContext('2d');
  g.strokeStyle = g.fillStyle = '#1f2433'; g.lineWidth = 9; g.lineCap = 'round'; g.lineJoin = 'round';
  if(face === 'cool'){
    g.fillRect(22, 46, 36, 18); g.fillRect(70, 46, 36, 18); g.fillRect(52, 50, 24, 6);
    g.beginPath(); g.moveTo(46, 92); g.lineTo(84, 88); g.stroke();
  } else if(face === 'angry'){
    for(const [x, d] of [[40, 1], [88, -1]]){ g.beginPath(); g.arc(x, 60, 8, 0, Math.PI*2); g.fill(); g.beginPath(); g.moveTo(x - 16*d, 36); g.lineTo(x + 12*d, 46); g.stroke(); }
    g.beginPath(); g.arc(64, 104, 18, Math.PI*1.15, Math.PI*1.85); g.stroke();
  } else if(face === 'dot'){
    for(const x of [42, 86]){ g.beginPath(); g.arc(x, 58, 8, 0, Math.PI*2); g.fill(); }
    g.beginPath(); g.moveTo(50, 92); g.lineTo(78, 92); g.stroke();
  } else {  // smile
    for(const x of [42, 86]){ g.beginPath(); g.arc(x, 56, 10, 0, Math.PI*2); g.fill(); g.fillStyle = '#fff'; g.beginPath(); g.arc(x + 3, 52, 3.5, 0, Math.PI*2); g.fill(); g.fillStyle = '#1f2433'; }
    g.beginPath(); g.arc(64, 74, 24, Math.PI*.18, Math.PI*.82); g.stroke();
    g.fillStyle = 'rgba(255,120,140,.55)'; for(const x of [24, 104]){ g.beginPath(); g.ellipse(x, 82, 11, 7, 0, 0, Math.PI*2); g.fill(); }
  }
  const t = new THREE.CanvasTexture(c); t.colorSpace = THREE.SRGBColorSpace; return t;
}

/* 捏出來的 3D 火柴人：直接做好骨架（跟上傳角色用同一套動作） */
function buildStickman(cfg){
  const root = new THREE.Group(), rig = new THREE.Group(); rig.name = 'rig'; root.add(rig);
  const lineR = { thin:.032, mid:.05, thick:.072 }[cfg.thickness] || .05;
  const bodyM = toon(hexNum(cfg.bodyColor)), headM = toon(hexNum(cfg.headColor));
  const hipY = .56, shoulderY = .98, headR = .25, headY = shoulderY + .06 + headR;
  const limb = (len, r) => { const g = new THREE.Group(); const m = mesh(G.cyl, bodyM, r, len, r, 0, -len/2, 0); g.add(m); g.add(mesh(G.sphere, bodyM, r*1.7, r*1.7, r*1.7, 0, -len, 0)); return g; };

  // 身體（以屁股為中心）
  const body = new THREE.Group(); body.userData.rigRole = 'body'; body.position.set(0, hipY, 0); rig.add(body);
  body.add(mesh(G.cyl, bodyM, lineR, shoulderY - hipY + .02, lineR, 0, (shoulderY - hipY)/2, 0));
  body.add(mesh(G.sphere, bodyM, lineR*1.4, lineR*1.4, lineR*1.4, 0, 0, 0));
  body.add(mesh(G.cyl, bodyM, lineR*.9, .1, lineR*.9, 0, shoulderY - hipY + .05, 0));   // 脖子
  // 頭
  const hy = headY - hipY; let head, faceZ;
  if(cfg.headShape === 'square'){ head = mesh(G.rbox, headM, headR*1.8, headR*1.8, headR*1.6, 0, hy, 0); faceZ = headR*.8 + .005; }
  else if(cfg.headShape === 'triangle'){ head = mesh(G.cone, headM, headR*1.15, headR*2.1, headR*1.15, 0, hy, 0); faceZ = headR*.62; }
  else { head = mesh(G.sphere, headM, headR, headR, headR*.95, 0, hy, 0); faceZ = headR*.93; }
  body.add(head);
  const faceMat = new THREE.MeshBasicMaterial({ map:faceTexture(cfg.face), transparent:true, depthWrite:false });
  const face = new THREE.Mesh(new THREE.PlaneGeometry(headR*1.5, headR*1.5), faceMat); face.position.set(0, hy - (cfg.headShape === 'triangle' ? headR*.25 : 0), faceZ + .012);
  face.userData.noOutline = true; body.add(face);
  // 頭上配件（跟著頭一起晃）
  const top = new THREE.Group(); top.userData.rigRole = 'top'; top.position.set(0, hy + headR*.85, 0); body.add(top);
  const topY = cfg.headShape === 'triangle' ? headR*.25 : 0;
  if(cfg.accessory === 'hat'){ top.add(mesh(G.cyl, toon(0x3a7ad9), .2, .05, .2, 0, topY + .02, .02)); top.add(mesh(G.sphere, toon(0x3a7ad9), .19, .14, .19, 0, topY + .06, 0)); top.add(mesh(G.box, toon(0x3a7ad9), .2, .025, .16, 0, topY + .03, .2)); }
  else if(cfg.accessory === 'crown'){ const gold = toon(0xffcf3f, { emissive:0x553300 }); top.add(mesh(G.cyl, gold, .17, .1, .17, 0, topY + .06, 0)); for(let i=0;i<5;i++){ const a = i/5*Math.PI*2; top.add(mesh(G.cone, gold, .05, .12, .05, Math.cos(a)*.15, topY + .16, Math.sin(a)*.15)); } }
  else if(cfg.accessory === 'antenna'){ top.add(mesh(G.cyl, bodyM, .015, .24, .015, 0, topY + .1, 0)); top.add(mesh(G.sphere, toon(0xff5a5a, { emissive:0x551111 }), .055, .055, .055, 0, topY + .24, 0)); }
  else if(cfg.accessory === 'bow'){ const pink = toon(0xff7ec7); for(const s of [-1,1]){ const w = mesh(G.cone, pink, .07, .14, .05, s*.09, topY + .02, 0); w.rotation.z = s*Math.PI/2; top.add(w); } top.add(mesh(G.sphere, pink, .045, .045, .045, 0, topY + .02, 0)); }
  // 手（掛在身體上）
  for(const side of [-1, 1]){
    const arm = new THREE.Group(); arm.userData.rigRole = 'arm'; arm.userData.rigSide = side; arm.userData.weight = side > 0 ? 1 : .9;
    arm.position.set(side*lineR*1.2, shoulderY - hipY - .02, 0); body.add(arm);
    const a = limb(.44, lineR); a.rotation.z = side*.42; arm.add(a);
    if(side > 0) arm.userData.weapon = true;
  }
  // 腳
  for(const side of [-1, 1]){
    const leg = new THREE.Group(); leg.userData.rigRole = 'leg'; leg.userData.rigSide = side; leg.userData.halfZ = lineR*1.7; leg.userData.legH = hipY;
    leg.position.set(side*.03, hipY, 0); rig.add(leg);
    const l = limb(hipY - lineR*1.6, lineR); l.rotation.z = side*.2; leg.add(l);
  }
  // 帽子掛點（吃到能力時的帽子）
  const hat = new THREE.Group(); hat.userData.rigRole = 'hat'; hat.position.set(0, topY + .02, 0); hat.scale.setScalar(.85); top.add(hat);
  root.traverse(o => { if(o.isMesh) o.castShadow = true; });
  addOutline(root, 0.0001, outlineMat);
  root.userData.mouthY = hy + hipY - .05; root.userData.charHeight = headY + headR;
  return { root, info:{ arms:2, legs:2, tops:cfg.accessory === 'none' ? 0 : 1, parts:10, stick:true } };
}

/* 自己畫的角色：把畫變成紙片人，整個身體一起動 */
function buildDrawnCharacter(img){
  const root = new THREE.Group(), rig = new THREE.Group(); rig.name = 'rig'; root.add(rig);
  const body = new THREE.Group(); body.userData.rigRole = 'body'; rig.add(body);
  const H = CHAR_H, W = H*img.width/img.height;
  const tex = new THREE.CanvasTexture(img); tex.colorSpace = THREE.SRGBColorSpace; tex.anisotropy = 4;
  const front = new THREE.Mesh(new THREE.PlaneGeometry(W, H), new THREE.MeshBasicMaterial({ map:tex, transparent:true, alphaTest:.25, side:THREE.DoubleSide }));
  front.position.set(0, H/2, 0); body.add(front);
  // 白色紙邊（稍微大一點、放在後面）讓畫在場景裡看得清楚
  const edge = document.createElement('canvas'); edge.width = img.width + 16; edge.height = img.height + 16; const eg = edge.getContext('2d');
  for(let a=0;a<16;a++){ const r = 7; eg.drawImage(img, 8 + Math.cos(a/16*Math.PI*2)*r, 8 + Math.sin(a/16*Math.PI*2)*r); }
  eg.globalCompositeOperation = 'source-in'; eg.fillStyle = '#ffffff'; eg.fillRect(0, 0, edge.width, edge.height);
  const et = new THREE.CanvasTexture(edge); et.colorSpace = THREE.SRGBColorSpace;
  const back = new THREE.Mesh(new THREE.PlaneGeometry(W*edge.width/img.width, H*edge.height/img.height), new THREE.MeshBasicMaterial({ map:et, transparent:true, alphaTest:.25, side:THREE.DoubleSide }));
  back.position.set(0, H/2, -.02); body.add(back);
  const top = new THREE.Group(); top.userData.rigRole = 'top'; top.position.set(0, H*.92, 0); body.add(top);
  const hat = new THREE.Group(); hat.userData.rigRole = 'hat'; hat.position.set(0, H*.04, 0); top.add(hat);
  root.userData.mouthY = H*.75; root.userData.charHeight = H;
  return { root, info:{ arms:0, legs:0, tops:0, parts:1, drawn:true } };
}

/* ── 標題畫面：捏造型選項 ── */
const STICK_OPTS = [
  ['headShape', '頭型', [['circle','圓頭'],['square','方頭'],['triangle','三角頭']]],
  ['face', '表情', [['smile','微笑'],['cool','酷酷'],['dot','普通'],['angry','生氣']]],
  ['accessory', '配件', [['none','無'],['hat','帽子'],['crown','皇冠'],['antenna','天線'],['bow','蝴蝶結']]],
  ['thickness', '粗細', [['thin','細'],['mid','中'],['thick','粗']]],
  ['headColor', '頭顏色', 'color'],
  ['bodyColor', '身體色', 'color'],
];
function buildStickPanel(){
  const box = $('cpStick'); box.innerHTML = '';
  for(const [key, label, opts] of STICK_OPTS){
    const row = document.createElement('div'); row.className = 'srow'; row.innerHTML = `<span class="lab">${label}</span>`;
    const wrap = document.createElement('div'); wrap.className = 'opts';
    if(opts === 'color') STICK_COLORS.forEach(c => { const b = document.createElement('button'); b.className = 'sw'; b.style.background = c; b.dataset.v = c; b.title = c; wrap.appendChild(b); });
    else opts.forEach(([v, t]) => { const b = document.createElement('button'); b.className = 'chip'; b.dataset.v = v; b.textContent = t; wrap.appendChild(b); });
    wrap.querySelectorAll('button').forEach(b => b.onclick = () => { stickCfg[key] = b.dataset.v; syncStickPanel(); useStick(); sfx.select(); });
    row.appendChild(wrap); box.appendChild(row);
  }
  const r = document.createElement('div'); r.className = 'row'; r.innerHTML = '<button class="btn sm" id="btnStickRandom">🎲 隨機</button><button class="btn sm" id="btnStickReset">↺ 重設</button>'; box.appendChild(r);
  $('btnStickRandom').onclick = () => { for(const [key, , opts] of STICK_OPTS) stickCfg[key] = opts === 'color' ? pick(STICK_COLORS) : pick(opts)[0]; if(stickCfg.headColor === stickCfg.bodyColor) stickCfg.headColor = '#ffffff'; syncStickPanel(); useStick(); previewAct('dance'); sfx.select(); };
  $('btnStickReset').onclick = () => { stickCfg = { ...STICK_DEFAULT }; syncStickPanel(); useStick(); sfx.select(); };
  syncStickPanel();
}
function syncStickPanel(){
  $('cpStick').querySelectorAll('.srow').forEach((row, i) => { const key = STICK_OPTS[i][0]; row.querySelectorAll('button').forEach(b => b.classList.toggle('on', b.dataset.v === stickCfg[key])); });
}
function useStick(){
  charState.kind = 'stick'; rebuildTemplate(); setTag(); idbSet('stick', { ...stickCfg }); idbSet('charKind', 'stick');
  setStatus('火柴人已更新！按「走路」「跳舞」看看它怎麼動。');
}

/* ── 自己畫：手繪畫布 ── */
const DRAW_W = 260, DRAW_H = 300;
let dpCanvas, dp, penColor = '#3a3a3a', penSize = 8, erasing = false, isDrawing = false, lastP = null, strokeCount = 0, undoStack = [];
function initDrawPad(){
  dpCanvas = $('drawCanvas'); dp = dpCanvas.getContext('2d');
  const gc = $('guideCanvas').getContext('2d'); gc.clearRect(0, 0, DRAW_W, DRAW_H);
  gc.strokeStyle = '#c9d6e6'; gc.lineWidth = 4; gc.lineCap = 'round'; gc.setLineDash([8, 8]);
  const cx = DRAW_W/2;
  gc.beginPath(); gc.arc(cx, 64, 32, 0, Math.PI*2); gc.stroke();
  gc.beginPath(); gc.moveTo(cx, 96); gc.lineTo(cx, 196); gc.stroke();
  gc.beginPath(); gc.moveTo(cx, 124); gc.lineTo(cx - 40, 162); gc.moveTo(cx, 124); gc.lineTo(cx + 40, 162); gc.stroke();
  gc.beginPath(); gc.moveTo(cx, 196); gc.lineTo(cx - 32, 268); gc.moveTo(cx, 196); gc.lineTo(cx + 32, 268); gc.stroke();
  gc.setLineDash([]);
  const pos = e => { const r = dpCanvas.getBoundingClientRect(); const t = e.touches && e.touches[0] ? e.touches[0] : e; return { x:(t.clientX - r.left)*DRAW_W/r.width, y:(t.clientY - r.top)*DRAW_H/r.height }; };
  const style = () => { dp.globalCompositeOperation = erasing ? 'destination-out' : 'source-over'; dp.strokeStyle = dp.fillStyle = penColor; dp.lineWidth = penSize; dp.lineCap = 'round'; dp.lineJoin = 'round'; };
  const start = e => { e.preventDefault(); try{ undoStack.push(dp.getImageData(0, 0, DRAW_W, DRAW_H)); if(undoStack.length > 20) undoStack.shift(); }catch(_){}
    isDrawing = true; strokeCount++; lastP = pos(e); style(); dp.beginPath(); dp.arc(lastP.x, lastP.y, penSize/2, 0, Math.PI*2); dp.fill(); };
  const move = e => { if(!isDrawing) return; e.preventDefault(); const p = pos(e); style(); dp.beginPath(); dp.moveTo(lastP.x, lastP.y); dp.lineTo(p.x, p.y); dp.stroke(); lastP = p; };
  const end = () => { isDrawing = false; };
  dpCanvas.addEventListener('pointerdown', e => { dpCanvas.setPointerCapture(e.pointerId); start(e); });
  dpCanvas.addEventListener('pointermove', move); dpCanvas.addEventListener('pointerup', end); dpCanvas.addEventListener('pointercancel', end);
  const pc = $('penColors'); STICK_COLORS.forEach((c, i) => { const b = document.createElement('button'); b.className = 'sw' + (i === 0 ? ' on' : ''); b.style.background = c; b.dataset.c = c;
    b.onclick = () => { penColor = c; erasing = false; $('btnEraser').classList.remove('on'); pc.querySelectorAll('.sw').forEach(s => s.classList.toggle('on', s === b)); }; pc.appendChild(b); });
  document.querySelectorAll('#cpDraw [data-size]').forEach(b => b.onclick = () => { penSize = +b.dataset.size; erasing = false; $('btnEraser').classList.remove('on'); document.querySelectorAll('#cpDraw [data-size]').forEach(x => x.classList.toggle('on', x === b)); });
  $('btnEraser').onclick = () => { erasing = !erasing; $('btnEraser').classList.toggle('on', erasing); };
  $('btnUndo').onclick = () => { if(undoStack.length) dp.putImageData(undoStack.pop(), 0, 0); };
  $('btnClear').onclick = () => { try{ undoStack.push(dp.getImageData(0, 0, DRAW_W, DRAW_H)); }catch(_){} dp.clearRect(0, 0, DRAW_W, DRAW_H); strokeCount = 0; };
  $('btnGuide').onclick = () => { const g = $('guideCanvas'); const show = g.style.display === 'none'; g.style.display = show ? '' : 'none'; $('btnGuide').classList.toggle('on', show); };
  $('btnDrawEdit').onclick = () => setDrawEditing(true);
  $('btnDrawUse').onclick = () => {
    const img = snapshotDrawing();
    if(!img){ setStatus('先畫一個角色再按「用這張畫」喔！', true); sfx.deny(); return; }
    drawnImage = img; charState.kind = 'draw'; rebuildTemplate(); setTag(); setDrawEditing(false);
    try{ idbSet('drawn', img.toDataURL('image/png')); idbSet('drawRaw', dpCanvas.toDataURL('image/png')); idbSet('charKind', 'draw'); }catch(_){}
    setStatus('✔ 你畫的角色上場了！它會跟著走路、跳躍。想改就按「繼續畫」。'); previewAct('dance'); sfx.ability();
  };
}
function snapshotDrawing(){
  const d = dp.getImageData(0, 0, DRAW_W, DRAW_H).data; let x0 = DRAW_W, y0 = DRAW_H, x1 = -1, y1 = -1;
  for(let y=0;y<DRAW_H;y++) for(let x=0;x<DRAW_W;x++) if(d[(y*DRAW_W + x)*4 + 3] > 20){ if(x < x0) x0 = x; if(x > x1) x1 = x; if(y < y0) y0 = y; if(y > y1) y1 = y; }
  if(x1 < 0) return null;
  const pad = 6; x0 = Math.max(0, x0 - pad); y0 = Math.max(0, y0 - pad); x1 = Math.min(DRAW_W - 1, x1 + pad); y1 = Math.min(DRAW_H - 1, y1 + pad);
  const c = document.createElement('canvas'); c.width = (x1 - x0 + 1)*2; c.height = (y1 - y0 + 1)*2;
  const g = c.getContext('2d'); g.imageSmoothingQuality = 'high'; g.drawImage(dpCanvas, x0, y0, x1 - x0 + 1, y1 - y0 + 1, 0, 0, c.width, c.height);
  return c;
}
function setDrawEditing(on){
  $('drawStage').hidden = !on; $('preview').style.visibility = on ? 'hidden' : ''; $('pvHint').hidden = on;
  $('drawTools').hidden = !on; $('drawDone').hidden = on; $('actRow').style.visibility = on ? 'hidden' : '';
}

/* ── 分頁：捏火柴人／自己畫／上傳 3D（進階） ── */
function setCharTab(t, apply = true){
  document.querySelectorAll('#charTabs [data-ct]').forEach(b => b.classList.toggle('on', b.dataset.ct === t));
  $('cpStick').hidden = t !== 'stick'; $('cpDraw').hidden = t !== 'draw'; $('cpUpload').hidden = t !== 'upload';
  if(t !== 'draw') setDrawEditing(false);
  if(!apply) return;
  if(t === 'stick'){ useStick(); }
  else if(t === 'draw'){
    if(drawnImage){ charState.kind = 'draw'; rebuildTemplate(); setTag(); idbSet('charKind', 'draw'); setDrawEditing(false); setStatus('目前用你畫的角色。想改就按「繼續畫」。'); }
    else { setDrawEditing(true); setStatus('照著淡淡的範例線畫一個火柴人（或任何角色），畫好按「✔ 用這張畫」。'); }
  } else {
    if(rawChar){ charState.kind = 'upload'; rebuildTemplate(); setTag(); idbSet('charKind', 'upload'); setStatus(`目前角色：「${charState.name}」。${rigSummary(charState.info)}`); }
    else setStatus('進階：把 Tinkercad 匯出的 .OBJ zip 拖進黃色框，手腳分開做的零件會自動動起來。');
  }
}
function initCharUI(){
  buildStickPanel(); initDrawPad();
  document.querySelectorAll('#charTabs [data-ct]').forEach(b => b.onclick = () => { setCharTab(b.dataset.ct); sfx.select(); });
}
