/* =====================================================================
   輸入：鍵盤、觸控、手把
   ===================================================================== */
const keys = { left:false, right:false, jump:false, down:false, atk:false, drop:false, emote:false };
const justPressed = new Set();
const KEYMAP = { ArrowLeft:'left', KeyA:'left', ArrowRight:'right', KeyD:'right', ArrowUp:'jump', KeyW:'jump', Space:'jump',
                 ArrowDown:'down', KeyS:'down', KeyJ:'atk', KeyX:'atk', KeyK:'drop', KeyC:'drop', KeyE:'emote' };
function press(k){ if(!keys[k]) justPressed.add(k); keys[k] = true; }
function release(k){ keys[k] = false; }
function releaseAll(){ Object.keys(keys).forEach(release); justPressed.clear(); }
const consume = k => { if(justPressed.has(k)){ justPressed.delete(k); return true; } return false; };
window.addEventListener('keydown', e => {
  if(e.code === 'KeyP' || e.code === 'Escape'){
    if(state === 'playing') pauseGame(); else if(state === 'paused' && $('settings').hidden) resumeGame();
    else closeTopPanel();
    e.preventDefault(); return;
  }
  const k = KEYMAP[e.code]; if(!k) return;
  if(state === 'playing' || state === 'cutscene') e.preventDefault();
  if(!e.repeat) press(k);
});
window.addEventListener('keyup', e => { const k = KEYMAP[e.code]; if(k) release(k); });
window.addEventListener('blur', releaseAll);
document.querySelectorAll('#touch .tb').forEach(b => {
  const k = b.dataset.k;
  const on = e => { e.preventDefault(); press(k); b.classList.add('on'); };
  const off = e => { e.preventDefault(); release(k); b.classList.remove('on'); };
  b.addEventListener('pointerdown', on); b.addEventListener('pointerup', off); b.addEventListener('pointercancel', off); b.addEventListener('pointerleave', off);
});
const isTouchDevice = window.matchMedia('(pointer: coarse)').matches || 'ontouchstart' in window;
function touchVisible(){ const t = SAVE.settings.touch; return t === 'on' || (t === 'auto' && isTouchDevice); }
const padPrev = {};
function pollGamepad(){
  const pads = navigator.getGamepads ? navigator.getGamepads() : [];
  const gp = pads && [...pads].find(p => p && p.connected);
  if(!gp) return;
  const b = i => !!(gp.buttons[i] && gp.buttons[i].pressed);
  const ax = gp.axes[0] || 0, ay = gp.axes[1] || 0;
  const cur = { left: b(14) || ax < -.4, right: b(15) || ax > .4, jump: b(0) || b(12), down: b(13) || ay > .6, atk: b(2) || b(1), drop: b(3), emote: b(4) || b(5) };
  for(const k of Object.keys(cur)){ if(cur[k] && !padPrev[k]) press(k); if(!cur[k] && padPrev[k]) release(k); padPrev[k] = cur[k]; }
  const start = b(9);
  if(start && !padPrev.start){ if(state === 'playing') pauseGame(); else if(state === 'paused') resumeGame(); else if(state === 'title' && $('map').hidden) openPanel('map'); }
  if(state !== 'playing' && cur.jump && !padPrev.menuA){ const el = document.activeElement; if(el && el.tagName === 'BUTTON') el.click(); }
  padPrev.start = start; padPrev.menuA = cur.jump;
}

/* =====================================================================
   畫面切換
   ===================================================================== */
const PANELS = ['map','dex','how','settings'];
let panelStack = [];
function openPanel(id){
  sfx.select();
  $(id).hidden = false; panelStack.push(id);
  if(id === 'map') renderLevelList();
  if(id === 'dex') renderDex();
  if(id === 'settings') syncSettingsUI();
  setTimeout(() => { const f = $(id).querySelector('.lv:not(:disabled), .btn, button'); f && f.focus(); }, 30);
}
function closeTopPanel(){ const id = panelStack.pop(); if(id){ $(id).hidden = true; sfx.select(); } }
document.querySelectorAll('[data-close]').forEach(b => b.onclick = closeTopPanel);
function hideAllScreens(){ ['title','pause','result',...PANELS].forEach(id => $(id).hidden = true); panelStack = []; }

function startLevel(i, reset=false){
  if(reset || lives <= 0){ lives = 3; starCount = 0; }
  hideAllScreens();
  $('hud').hidden = false; $('touch').hidden = !touchVisible(); document.body.classList.add('playing');
  releaseAll();
  loadLevel(i);
  irisOpen();
  Music.play(THEMES[LEVELS[i].theme].song);
  state = 'playing';
  showBanner(`第 ${i+1} 關`, LEVELS[i].name); setTimeout(hideBanner, 1600);
}
function pauseGame(){ if(state !== 'playing') return; Music.duck(true); state = 'paused'; $('pause').hidden = false; $('pauseInfo').textContent = `${LEVELS[levelIndex].name}　★ ${levelStars}/${lvl.starTotal}　${fmtTime(levelTime)}`; setTimeout(() => $('btnResume').focus(), 30); }
function resumeGame(){ Music.duck(false); hideAllScreens(); state = 'playing'; releaseAll(); }
function goTitle(){
  hideAllScreens(); $('hud').hidden = true; $('touch').hidden = true; $('sign').hidden = true; document.body.classList.remove('playing');
  hideBanner(); irisClear();
  loadLevel(Math.min(SAVE.unlocked, LEVELS.length) - 1, true); state = 'title'; $('title').hidden = false;
  Music.duck(false); Music.play('title'); updateDexCount();
  setTimeout(() => $('btnPlay').focus(), 30);
}
function afterDeath(){
  lives--; levelDeaths++;
  if(lives <= 0){
    showResult('', 'GAME OVER', null, '別灰心！換個能力、換條路線再挑戰一次。', [['從這關重來', () => startLevel(levelIndex, true), 'go'], ['回標題', goTitle]]);
  } else {
    state = 'playing'; respawn(); irisOpen(); Music.play(THEMES[lvl.def.theme].song);
  }
}
function showResult(rank, title, stats, text, btns){
  state = 'result';
  $('resRank').textContent = rank; $('resRank').hidden = !rank;
  $('resTitle').textContent = title; $('resText').textContent = text;
  $('resStats').innerHTML = stats ? stats.map(([k,v]) => `<div><b>${v}</b><small>${k}</small></div>`).join('') : '';
  $('resStats').hidden = !stats;
  const box = $('resBtns'); box.innerHTML = '';
  btns.forEach(([label, fn, cls]) => { const b = document.createElement('button'); b.className = 'btn' + (cls ? ' '+cls : ''); b.textContent = label; b.onclick = () => { sfx.select(); fn(); }; box.appendChild(b); });
  $('result').hidden = false; $('touch').hidden = true; $('sign').hidden = true;
  setTimeout(() => box.querySelector('button')?.focus(), 50);
}

/* ── 選關 ── */
function renderLevelList(){
  const box = $('levelList'); box.innerHTML = '';
  LEVELS.forEach((L, i) => {
    const lockd = i + 1 > SAVE.unlocked;
    const best = SAVE.best[i] || {};
    const tmp = new Level(L);
    const snackKinds = [...new Set(tmp.items.filter(it => SNACKS[it.type]).map(it => it.type))];
    const got = snackKinds.filter(k => SAVE.snacks[k]).length;
    const b = document.createElement('button');
    b.className = 'lv' + (lockd ? ' locked' : ''); b.disabled = lockd;
    b.innerHTML = `<div class="thumb" style="background:${THEMES[L.theme].thumb}">${lockd ? '🔒' : (i+1)}${best.rank ? `<span class="rk">${best.rank}</span>` : ''}</div>
      <div class="body"><b>${L.name}</b><small>${THEMES[L.theme].name}${L.width && tmp.boss ? '・魔王關' : ''}</small>
      <div class="stars num">★ ${best.stars || 0}/${tmp.starTotal}　🍜 ${got}/${snackKinds.length}</div></div>`;
    b.onclick = () => startLevel(i, true);
    box.appendChild(b);
  });
}

/* ── 小吃圖鑑 ── */
const dexImgs = {};
let dexRenderer = null;
function snackThumb(kind){
  if(dexImgs[kind]) return dexImgs[kind];
  if(!dexRenderer){ dexRenderer = new THREE.WebGLRenderer({ antialias:true, alpha:true, preserveDrawingBuffer:true }); dexRenderer.setSize(200, 200); dexRenderer.outputColorSpace = THREE.SRGBColorSpace; }
  const sc = new THREE.Scene(); sc.add(new THREE.HemisphereLight(0xffffff, 0x99aacc, 1.3)); const dl = new THREE.DirectionalLight(0xffffff, 1.5); dl.position.set(2,4,5); sc.add(dl);
  const m = snackModel(kind); m.rotation.y = -.5; sc.add(m);
  const cam = new THREE.PerspectiveCamera(30, 1, .1, 20); cam.position.set(0, 1.5, 2.6); cam.lookAt(0, .32, 0);
  dexRenderer.render(sc, cam);
  dexImgs[kind] = dexRenderer.domElement.toDataURL('image/png');
  return dexImgs[kind];
}
function snackLevel(kind){ for(let i=0;i<LEVELS.length;i++){ if(new Level(LEVELS[i]).items.some(it => it.type === kind)) return i; } return -1; }
function updateDexCount(){ const n = Object.keys(SAVE.snacks).filter(k => SNACKS[k]).length; $('dexCount').textContent = `${n}/${SNACK_ORDER.length}`; $('dexCount2').textContent = `${n}/${SNACK_ORDER.length}`; }
function renderDex(sel){
  updateDexCount();
  const box = $('dexGrid'); box.innerHTML = '';
  if(sel){
    const s = SNACKS[sel], known = SAVE.snacks[sel];
    const d = document.createElement('div'); d.className = 'dex-detail';
    const what = s.type === 'ability' ? `特別能力：${ABIL[sel].icon} ${ABIL[sel].name}　${ABIL[sel].hint}` : '補給品';
    d.innerHTML = known ? `<img alt="" src="${snackThumb(sel)}"><div><b style="font-size:20px">${s.name}</b><div style="font-weight:700;color:var(--muted)">${what}</div><p>${s.fact}</p></div>`
                        : `<img alt="" src="${snackThumb(sel)}" style="filter:brightness(0) opacity(.35)"><div><b style="font-size:20px">？？？</b><p>還沒吃過。在第 ${snackLevel(sel)+1} 關可以找到它。</p></div>`;
    box.appendChild(d);
  }
  for(const k of SNACK_ORDER){
    const known = SAVE.snacks[k], s = SNACKS[k];
    const c = document.createElement('button'); c.className = 'dex-card' + (known ? '' : ' unknown');
    c.innerHTML = `<img alt="" src="${snackThumb(k)}"><b>${known ? s.name : '？？？'}</b><small>${known ? (s.type === 'ability' ? ABIL[k].name : '補給') : '尚未發現'}</small>`;
    c.onclick = () => { sfx.select(); renderDex(k); $('dex').querySelector('.panel').scrollTop = 0; };
    box.appendChild(c);
  }
}

/* ── 設定 ── */
function syncSettingsUI(){
  const st = SAVE.settings;
  $('volMusic').value = st.music; $('volMusicV').textContent = st.music;
  $('volSfx').value = st.sfx; $('volSfxV').textContent = st.sfx;
  document.querySelectorAll('#qualSeg button').forEach(b => { b.classList.toggle('on', b.dataset.q === st.quality); b.textContent = b.dataset.q === 'auto' ? `自動${st.quality === 'auto' ? `（${QUALITY[quality].label}）` : ''}` : QUALITY[b.dataset.q].label; });
  document.querySelectorAll('#touchSeg button').forEach(b => b.classList.toggle('on', b.dataset.t === st.touch));
}
$('volMusic').oninput = e => { const was = SAVE.settings.music; SAVE.settings.music = +e.target.value; applyVolumes(); syncSettingsUI(); saveGame(); if(was === 0 && SAVE.settings.music > 0) Music.refresh(); };
$('volSfx').oninput = e => { SAVE.settings.sfx = +e.target.value; applyVolumes(); syncSettingsUI(); saveGame(); };
$('volSfx').onchange = () => sfx.coin();
document.querySelectorAll('#qualSeg button').forEach(b => b.onclick = () => { SAVE.settings.quality = b.dataset.q; quality = b.dataset.q === 'auto' ? 'high' : b.dataset.q; lowSecs = 0; applyQuality(); saveGame(); syncSettingsUI(); });
document.querySelectorAll('#touchSeg button').forEach(b => b.onclick = () => { SAVE.settings.touch = b.dataset.t; saveGame(); syncSettingsUI(); if(state === 'playing' || state === 'paused') $('touch').hidden = !touchVisible(); });
$('btnReset').onclick = () => { $('resetConfirm').hidden = false; };
$('btnResetNo').onclick = () => { $('resetConfirm').hidden = true; };
$('btnResetYes').onclick = () => { SAVE.unlocked = 1; SAVE.best = {}; SAVE.snacks = {}; saveGame(); $('resetConfirm').hidden = true; updateDexCount(); toast('進度已清除'); };

/* ── 按鈕 ── */
$('btnPlay').onclick = () => openPanel('map');
$('btnDex').onclick = () => openPanel('dex');
$('btnSettings').onclick = () => openPanel('settings');
$('btnHow').onclick = () => openPanel('how');
$('btnPause').onclick = () => pauseGame();
$('btnResume').onclick = resumeGame;
$('btnRetry').onclick = () => { hideAllScreens(); Music.duck(false); state = 'playing'; levelDeaths++; respawn(); irisOpen(); };
$('btnPauseSet').onclick = () => openPanel('settings');
$('btnHome').onclick = goTitle;
document.querySelectorAll('#actRow .chip').forEach(c => c.onclick = () => { previewAct(c.dataset.act); sfx.select(); });
const fileIn = $('fileIn'), dropZone = $('dropZone');
fileIn.onchange = () => { if(fileIn.files.length) useFiles([...fileIn.files]); fileIn.value = ''; };
['dragenter','dragover'].forEach(ev => dropZone.addEventListener(ev, e => { e.preventDefault(); dropZone.classList.add('over'); }));
['dragleave','drop'].forEach(ev => dropZone.addEventListener(ev, e => { e.preventDefault(); dropZone.classList.remove('over'); }));
dropZone.addEventListener('drop', e => { const f = [...(e.dataTransfer?.files || [])]; if(f.length) useFiles(f); });
$('btnYaw').onclick = () => { if(!rawChar){ setStatus('預設角色已經朝正面了，上傳自己的角色後才需要轉向。'); return; } charState.yaw = (charState.yaw + 1) % 4; const info = rebuildTemplate(); saveCharSettings(); setStatus('已轉 90°。正面朝向你就對了。' + rigSummary(info)); };
$('btnUp').onclick = () => { if(!rawChar){ setStatus('上傳自己的角色後才需要扶正。'); return; } const order = ['z','y','x']; charState.up = order[(order.indexOf(charState.up) + 1) % 3]; const info = rebuildTemplate(); saveCharSettings(); setStatus('已換一個直立方向，直到角色站好為止。' + rigSummary(info)); };
$('btnDefault').onclick = async () => { rawChar = null; charState.files = null; await idbDel('char'); rebuildTemplate(); setTag(); setStatus('已換回預設角色。'); };
const startTitleMusic = () => { if(state === 'title' && !Music.current) Music.play('title'); };
document.addEventListener('pointerdown', startTitleMusic); document.addEventListener('keydown', startTitleMusic);

/* =====================================================================
   主迴圈
   ===================================================================== */
let last = performance.now();
function frame(now){
  requestAnimationFrame(frame);
  const dt = Math.min(.05, (now - last)/1000); last = now;
  pollGamepad();
  frameStats(dt, state === 'playing' || state === 'title');
  if(state === 'playing'){
    if(hitStop > 0) hitStop -= dt;
    else {
      levelTime += dt;
      const steps = 2, h = dt/steps;
      for(let s=0; s<steps; s++){
        if(state !== 'playing') break;
        updateMovers(h);
        if(P && !P.dead) updatePlayer(h, s === 0);
        for(const e of enemies) if(!e.dead) updateEnemy(e, h);
        updateItems(h); updateShots(h); updateBoss(h);
      }
      enemies = enemies.filter(e => !e.dead); items = items.filter(i => !i.dead);
      justPressed.clear();
    }
    updateHUD(); updateTimer();
  } else {
    justPressed.clear();
    if(state === 'cutscene'){ updateCutscene(dt); updateMovers(dt); }
    else if(state === 'dying'){
      deathT += dt;
      if(deathT > .5){ P.vy -= GRAV*.8*dt; P.y += P.vy*dt; }
      if(deathT > 2.2){ state = 'between'; irisClose(afterDeath); }
    }
  }
  if(state !== 'paused') updateFx(dt);
  if(lvl){
    if(P && state !== 'paused') animatePlayer(dt);
    if(state !== 'paused') animateWorld(dt);
    updateCamera(dt, state === 'title' || state === 'boot');
  }
  if(state !== 'paused'){ emitAmbient(dt); updateParticles(dt); }
  if(QUALITY[quality].bloom) composer.render(); else renderer.render(scene, camera);
  if(state === 'title' && !$('title').hidden) renderPreview(dt);
}

/* =====================================================================
   啟動
   ===================================================================== */
async function boot(){
  const fill = $('bootFill'), txt = $('bootText');
  const step = (p, t) => { fill.style.width = p + '%'; txt.textContent = t; };
  window.addEventListener('resize', resize);
  applyQuality(); syncSettingsUI();
  step(20, '搭建關卡…');
  loadLevel(0, true);
  requestAnimationFrame(frame);
  step(45, '準備台南小吃…');
  await new Promise(r => setTimeout(r, 30));
  SNACK_ORDER.forEach(k => snackModel(k));
  step(70, '叫醒你的角色…');
  await restoreCharacter();
  step(90, '調音中…');
  Music.preload(['title', 'meadow']);
  await new Promise(r => setTimeout(r, 200));
  step(100, '出發！');
  $('boot').hidden = true;
  goTitle();
}
boot();

// 測試／除錯用
window.__dq = { get state(){ return state; }, get P(){ return P; }, get enemies(){ return enemies; }, get boss(){ return boss; }, get arena(){ return arena; },
  get items(){ return items; }, get shots(){ return shots; }, get door(){ return door; }, get lvl(){ return lvl; }, get charState(){ return charState; },
  startLevel, loadLevel, gainAbility, damageBoss, hurtPlayer, eatSnack, keys, press, release, Music, SAVE, VERSION, BUILD_DATE, getPivots, get charTemplate(){ return charTemplate; }, get world(){ return world; }, THREE };
