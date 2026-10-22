/* =====================================================================
   畫面：角色動作、世界動畫、鏡頭、HUD
   ===================================================================== */
const _sc = new THREE.Vector3();
function playerMode(p){
  if(p.dead) return 'spin';
  if(clearing) return 'win';
  if(p.emote) return p.emote;
  if(p.spinT > 0) return 'spin';
  if(p.atk || p.throwT > 0) return 'attack';
  if(p.dashT > 0) return 'dash';
  if(p.pound) return 'pound';
  if(p.inv > 1.3) return 'hurt';
  if(p.shieldUp) return 'breath';
  if(p.inhaling) return 'inhale';
  if(keys.atk && (p.ability === 'fire' || p.ability === 'ice') && !p.mouth && !p.puffed) return 'breath';
  if(keys.atk && p.ability === 'spark' && !p.mouth && !p.puffed) return 'pound';
  if(p.mouth) return p.onGround && Math.abs(p.vx) > .5 ? 'walk' : 'full';
  if(p.swallowT > 0) return 'swallow';
  if(p.puffed) return 'float';
  if(!p.onGround) return p.vy > 0 ? 'jump' : 'fall';
  if(Math.abs(p.vx) > .5) return 'walk';
  return 'idle';
}
function animatePlayer(dt){
  const p = P; if(!p) return;
  p.root.position.set(p.x, p.y + .03, p.dead ? 1.5 : 0);   // 地面頂板比碰撞面高一點點，腳底對齊它
  const mode = playerMode(p);
  const faceCam = mode === 'wave' || mode === 'dance' || mode === 'win';
  const targetYaw = faceCam ? 0 : (p.face > 0 ? .75 : -.75);
  if(mode !== 'spin') p.turn.rotation.y = damp(p.turn.rotation.y, targetYaw, 12, dt);
  else p.turn.rotation.y += dt*(p.dead ? 10 : 18);
  if(Math.abs(p.vx) > .3 && p.onGround) p.walkPh += Math.abs(p.vx)*dt*2.3;   // 全速約每秒 2 個步伐循環
  let sx = 1, sy = 1, sz = 1, by = 0;
  if(p.puffed){ const k = 1.32 + Math.sin(p.t*8)*.03; sx = sz = k; sy = k*.96; by = .05; }
  else if(p.mouth){ sx = sz = 1.2; sy = 1.06; }
  else if(p.inhaling){ sx = 1.1 + Math.sin(p.t*40)*.03; sy = .95; sz = 1.1; }
  else if(p.swallowT > 0){ const k = p.swallowT/.35; sy = 1 - .25*Math.sin(k*Math.PI); sx = sz = 1 + .2*Math.sin(k*Math.PI); }
  else if(p.blastT > 0){ p.blastT -= dt; const k = Math.sin(Math.max(0,p.blastT)/.35*Math.PI); sx = sz = 1 + k*.4; sy = 1 + k*.3; }
  else if(p.pound){ sx = sz = 1.15; sy = .85; }
  else if(!p.onGround){ sy = p.vy > 0 ? 1.08 : .97; sx = sz = p.vy > 0 ? .95 : 1.02; }
  else if(p.landT > 0){ sy = .84; sx = sz = 1.12; }
  else if(mode === 'dance' || mode === 'win'){ by = Math.abs(Math.sin(p.t*8))*.12; }
  _sc.set(sx, sy, sz);
  p.anim.scale.lerp(_sc, Math.min(1, dt*18));
  p.animBY = damp(p.animBY || 0, by, 18, dt); p.anim.position.y = p.animBY;
  // 二段跳翻一圈（繞身體中心轉）
  if(p.flipT > 0){ const th = -p.face*(1 - p.flipT/.42)*Math.PI*2, hh = CHAR_H*.45; p.anim.rotation.z = th; p.anim.position.x = Math.sin(th)*hh; p.anim.position.y += hh*(1 - Math.cos(th)); }
  else { p.anim.rotation.z = 0; p.anim.position.x = 0; }
  if(p.model){
    const k = p.atk ? p.atk.t/p.atk.dur : (p.throwT > 0 ? 1 - p.throwT/.22 : 0);
    animateRig(p.model, { mode, t:p.t, phase:p.walkPh, k }, dt);
  }
  p.stoneMesh.visible = p.stone; p.turn.visible = !p.stone;
  p.root.visible = !(p.inv > 0 && !p.dead && Math.floor(p.inv*14) % 2 === 0);
  // 揮劍光弧
  const slashing = p.atk && p.atk.type === 'slash';
  p.slash.visible = !!slashing;
  if(slashing){ const k = p.atk.t/p.atk.dur; p.slash.position.set(p.face*.4, .62, .3); p.slash.rotation.set(0, p.face > 0 ? 0 : Math.PI, Math.PI*.55 - k*Math.PI*1.1); p.slash.material.opacity = .9*(1-k*.6); }
  // 麵條鞭
  const whipping = p.atk && p.atk.type === 'whip';
  p.whip.visible = !!whipping;
  if(whipping){ const k = p.atk.t/p.atk.dur, reach = .4 + 3.0*Math.sin(Math.min(1, k*1.6)*Math.PI/2);
    p.whip.children.forEach((b, i) => { const u = i/19; b.position.set(p.face*(.4 + u*reach), .6 + Math.sin(u*9 - k*14)*.14*(1-u*.3), .25); }); }
  // 大鎚
  const hammering = p.atk && p.atk.type === 'hammer';
  p.hammer.visible = !!hammering;
  if(hammering){ const k = p.atk.t/p.atk.dur; p.hammer.position.set(p.face*.35, .45, .35); p.hammer.rotation.set(0, 0, -p.face*lerp(-.9, 1.9, easeOutBack(Math.min(1, k*1.6)))); }
  p.armor.visible = p.dashT > 0 && p.ability === 'coffin';
  if(p.armor.visible) p.armor.rotation.z = -p.face*.12;
  p.shield.visible = p.shieldUp || (p.dashT > 0 && p.ability === 'wangguo');
  if(p.shield.visible){ p.shield.position.set(p.face*.8, .62, .25); p.shield.rotation.set(0, 0, -p.face*Math.PI/2); }
  // 雨傘：滑翔時撐在頭上，攻擊時往前揮
  const umbAtk = p.atk && p.atk.type === 'umbrella';
  p.umb.visible = p.ability === 'umbrella' && (p.gliding || umbAtk);
  if(p.umb.visible){
    if(umbAtk){ const k = p.atk.t/p.atk.dur; p.umb.position.set(p.face*.6, .7, .3); p.umb.rotation.set(0, 0, -p.face*lerp(.2, 2.0, easeOutBack(Math.min(1, k*1.4)))); }
    else { p.umb.position.set(0, 2.15, 0); p.umb.rotation.set(0, 0, Math.sin(p.t*3)*.08); }
  }
  if(p.floatT > 0 && Math.random() < .15) emit(p.x + (Math.random()-.5)*.9, p.y + .3, .2, 0, -.3, 0, .6, Math.random()<.5 ? '#ffb3d9' : '#c9b8ff', .2);
  p.bubbleMesh.visible = p.bubble; if(p.bubble) p.bubbleMesh.scale.setScalar(1 + Math.sin(p.t*4)*.04);
  if(p.ability && Math.random() < .1) emit(p.x + (Math.random()-.5)*.8, p.y + 1.4, .2, 0, .8, 0, .5, ABIL[p.ability].css, .2);
  if(p.speedT > 0 && Math.random() < .4) emit(p.x - p.face*.4, p.y + .3, 0, -p.face*2, .5, 0, .3, '#ffd28a', .2);
  fillPoint.position.set(p.x, p.y + 2.2, 2.2);
}

function setFlash(mats, on){
  for(const m of mats){ m.emissive.setHex(on ? 0xffffff : m.userData.em); m.emissiveIntensity = on ? .7 : 1; }
}
function animateWorld(dt){
  const now = performance.now()/1000;
  for(const e of enemies){
    if(e.dead) continue;
    const m = e.mesh;
    m.position.set(e.x, e.y, 0);
    const look = e.d.move === 'bob' || e.type === 'ghost' ? Math.sign(e.dir)*.3 : e.dir*.6;
    if(!e.kicked) m.rotation.y = damp(m.rotation.y, look, 8, dt);
    let s = 1;
    if(e.frozen > 0){ m.rotation.z = 0; }
    else if(e.d.move === 'walk' || e.d.move === 'drift'){ m.position.y += Math.abs(Math.sin(e.t*8))*.05; m.rotation.z = Math.sin(e.t*8)*.07; }
    else if(e.d.move === 'hop'){ const air = !e.onGround; m.scale.y = air ? 1.12 : 1; }
    if(e.hurtT > 0) s = 1 + Math.sin(e.hurtT*60)*.08;
    if(e.pulled){ s *= .85; m.rotation.z += dt*12; }
    if(e.kicked){ m.rotation.z -= e.vx*dt*.8; }
    if(e.d.move !== 'hop') m.scale.setScalar(s);
    setFlash(e.mats, e.hurtT > .12);
    e.ice.visible = e.frozen > 0;
    const u = m.userData;
    if(u.feet && e.d.move !== 'hop'){ const w = Math.sin(e.t*9)*.06; u.feet[0].position.z = .05 + w; u.feet[1].position.z = .05 - w; }
    e.blinkT -= dt;
    if(u.eyes){
      const blink = e.blinkT < .12 && e.blinkT > 0;
      for(const o of u.eyes){ if(o.userData.sy === undefined) o.userData.sy = o.scale.y; o.scale.y = blink ? o.userData.sy*.1 : o.userData.sy; }
      if(e.blinkT <= 0) e.blinkT = 2 + Math.random()*3;
    }
    if(e.type === 'bird'){ const w = Math.sin(e.t*18)*.5; u.wings[0].rotation.z = w; u.wings[1].rotation.z = -w; }
    if(e.type === 'flame' && u.flame) u.flame.scale.y = .55 + Math.sin(e.t*14)*.08;
    if(e.type === 'knight' && u.sword) u.sword.rotation.z = e.slashT > 0 ? -1.6 + e.slashT*5 : -.2;
    if(e.type === 'spark' && u.aura){ u.aura.visible = e.auraOn > 0; if(e.auraOn > 0) u.aura.scale.setScalar(1 + Math.sin(e.t*40)*.05); }
    if(e.type === 'bomber' && u.fuse) u.fuse.scale.setScalar(.07*(.8 + Math.sin(e.t*20)*.3));
    if(e.type === 'parasol' && u.umbrella){ u.umbrella.rotation.z = Math.sin(e.t*1.4)*.2; u.umbrella.visible = !e.landed || true; }
    if(e.type === 'archer' && u.bow){ u.bow.position.x = e.drawT > 0 ? .5 : .42; u.bow.rotation.y = e.drawT > 0 ? -.5 : 0; }
    if(e.type === 'laserbot' && u.visor){ const ch = e.charge > 0; u.visor.material.emissive.setHex(ch ? 0xff2244 : 0x2a8a9a); u.visor.scale.y = ch ? 1 + Math.sin(e.t*40)*.3 : 1; }
    if(e.type === 'yoyokid' && u.yoyo){ const k = e.slashT > 0 ? Math.sin((1 - e.slashT/.45)*Math.PI) : 0; u.yoyo.position.set(.45 + k*2.2, .3, .1); u.yoyo.rotation.z -= dt*20; }
    if(e.type === 'cannon' && u.barrel){ e.recoil = Math.max(0, (e.recoil || 0) - dt); u.barrel.position.x = .15 - e.recoil*.8; m.rotation.y = e.dir > 0 ? 0 : Math.PI; }
  }
  for(const it of items){
    if(it.dead) continue;
    const m = it.mesh;
    if(it.type === 'star'){ m.position.set(it.x, it.baseY + .25 + Math.sin(now*3 + it.x)*.08, 0); m.rotation.y = now*2.4 + it.x; }
    else if(it.type === 'abil'){ m.position.set(it.x, it.y + .38, 0); m.rotation.z += dt*6; m.visible = it.life > 2 || Math.floor(it.life*8)%2 === 0; }
    else if(it.type === 'boulder'){ m.position.set(it.x, it.y, 0); m.rotation.z -= it.vx*dt; m.visible = it.life > 1.5 || Math.floor(it.life*8)%2 === 0; }
    else if(SNACKS[it.type]){ m.position.set(it.x, it.y + .1 + (it.drop && !it.landed ? 0 : Math.sin(now*3 + it.x)*.07), 0); m.children[0].rotation.y = it.drop && !it.landed ? now*5 : Math.sin(now*1.4 + it.x)*.6;
      if(it.drop) m.visible = it.life > 2.5 || Math.floor(it.life*8)%2 === 0;
      if(Math.random() < .05) emit(it.x + (Math.random()-.5)*.3, it.y + .8, .2, 0, 1.2, 0, .8, '#ffffff', .2); }
    else { m.position.set(it.x, it.y + Math.sin(now*3)*.06, 0); m.rotation.y = now*1.5; }
  }
  for(const s of shots){
    if(s.dead) continue;
    const m = s.mesh; m.position.set(s.x, s.y, 0);
    if(s.kind === 'star') m.rotation.z -= dt*14*Math.sign(s.vx);
    else if(s.kind === 'puff'){ m.scale.setScalar(.25 + s.t*1.6); m.material.opacity = Math.max(0, .75 - s.t*2.4); }
    else if(s.kind === 'wind'){ m.rotation.z += dt*10; m.rotation.y = .6; }
    else if(s.kind === 'fish' || s.kind === 'shrimp'){ m.rotation.z = Math.atan2(s.vy, Math.abs(s.vx))*Math.sign(s.vx); m.scale.x = Math.sign(s.vx) || 1; }
    else if(s.kind === 'oyster'){ m.rotation.y += dt*16; }
    else if(s.kind === 'shuriken' || s.kind === 'shurikenH'){ m.rotation.z += dt*20; }
    else if(s.kind === 'arrow' || s.kind === 'arrowH'){ m.scale.x = Math.sign(s.vx) || 1; }
    else if(s.kind === 'yoyo'){ m.rotation.z -= dt*25; const ln = m.userData.line; if(ln && P){ const a = ln.geometry.attributes.position; a.setXYZ(0, P.x + P.face*.35, P.y + .6, .2); a.setXYZ(1, s.x, s.y, 0); a.needsUpdate = true; } }
    else if(s.kind === 'meatball' || s.kind === 'bomb' || s.kind === 'bombH' || s.kind === 'ice'){ m.rotation.z -= s.vx*dt; }
    else if(s.kind === 'wave'){ m.scale.y = .7 + Math.sin(s.t*30)*.2; }
  }
  for(const sp of springs){ sp.squash = Math.max(0, sp.squash - dt*4); sp.pad.position.y = .5 - sp.squash*.3; }
  for(const m of movers) m.mesh.position.set(m.x, m.top, 0);
  for(const c of checkpoints){
    const pos = c.flag.geometry.attributes.position;
    for(let i=0;i<pos.count;i++){ const x = pos.getX(i) + .45; pos.setZ(i, Math.sin(now*6 - x*4)*.08*x); }
    pos.needsUpdate = true;
    c.flag.material = toon(c.active ? 0x3fc6a4 : 0xb0b8c8, { side:THREE.DoubleSide });
    c.flag.position.y = damp(c.flag.position.y, c.active ? 2.1 : 1.0, 4, dt);
  }
  if(door){ door.star.rotation.y = now*2; door.star.position.y = 2.75 + Math.sin(now*3)*.1; if(Math.random() < .1) emit(door.x + (Math.random()-.5)*1.4, door.y + Math.random()*2.4, .3, 0, .8, 0, .8, '#fff2a0', .2); }
  if(boss && !boss.dead){
    const b = boss;
    if(b.def.fly){ b.mesh.position.set(b.x, b.y + 1.2, 0); b.mesh.rotation.z = Math.sin(b.t*1.3)*.06;
      (b.mesh.userData.bolts || []).forEach((o,i) => o.visible = Math.sin(now*10 + i*2) > -.2);
      if(Math.random() < .08) emit(b.x + (Math.random()-.5)*3, b.y + .2, 0, 0, -3, 0, .5, '#9fd3ff', .18); }
    else if(arena && arena.active){
      b.mesh.position.set(b.x, b.y, 0);
      b.mesh.rotation.y = damp(b.mesh.rotation.y, b.dir*.6, 8, dt);
      const tele = b.st === 'tele' || (b.st === 'volley' && b.stT < .3);
      b.mesh.rotation.z = tele ? Math.sin(b.t*40)*.05 : (b.st === 'dash' ? -b.dir*.2 : 0);
      const sw = b.mesh.userData.sword; if(sw) sw.rotation.z = b.st === 'tele' ? -2.2 : b.st === 'dash' ? .9 : -.2;
      const fl = b.mesh.userData.flame; if(fl) fl.scale.y = .55 + Math.sin(b.t*14)*.1 + (b.st === 'volley' ? .3 : 0);
    }
    setFlash(b.mats, b.hurtT > .1 || (b.st === 'tele' && Math.sin(b.t*30) > 0));
  }
  for(const f of flickers){
    if(f.fn){ if(!f.always && Math.abs(f.cx - camX) > 34) continue; f.t += dt; f.fn(f, dt); continue; }
    f.t += dt;
    if(f.sway) f.o.rotation.z = Math.sin(f.t*1.5)*.08;
    if(f.bob) f.o.position.y += Math.sin(f.t*1.2)*f.bob*dt;
    if(f.drift) f.o.position.x += f.drift*dt;
    if(f.glow) f.o.material.opacity = .7 + Math.sin(f.t*3)*.15;
    if(f.torch){ f.o.scale.y = 1 + Math.sin(f.t*20)*.2; if(Math.random() < .3 && Math.abs(f.wx - camX) < 16) emit(f.wx + (Math.random()-.5)*.1, f.wy, -2.0, (Math.random()-.5)*.3, 1.2, 0, .5, Math.random()<.5 ? '#ffb02e' : '#ff6a2b', .25); }
  }
  // 告示牌
  let near = null;
  if(P && state === 'playing') for(const s of signs) if(Math.abs(P.x - s.x) < 1.6 && Math.abs(P.y - s.y) < 2) near = s;
  const el = $('sign');
  if(near){ const t = adaptKeys(near.text); if(el.textContent !== t) el.textContent = t; el.hidden = false; } else el.hidden = true;
}

let ambT = 0;
function emitAmbient(dt){
  if(!lvl || !QUALITY[quality].detail) return;
  ambT += dt;
  while(ambT > .05){
    ambT -= .05;
    const x = camX + (Math.random()-.5)*26, y = camY + (Math.random()-.3)*12, z = -4 + Math.random()*6;
    const th = lvl.def.theme;
    if(th === 'meadow') emit(x, y, z, .6 + Math.random()*.6, -.2 + Math.random()*.3, 0, 4, Math.random()<.7 ? '#ffffff' : '#fff2a8', .14, -.05, 0);
    else if(th === 'sky') emit(x, y, z, .2, .3 + Math.random()*.4, 0, 3, Math.random()<.5 ? '#ffffff' : '#ffd6ec', .16, 0, 0);
    else if(th === 'oldstreet') emit(x, y, z, .4, -.3, 0, 4, Math.random()<.6 ? '#ffb8c8' : '#ffe0a0', .15, .05, 0);
    else if(th === 'nightmarket') emit(x, y, z, (Math.random()-.5)*.3, .4 + Math.random()*.4, 0, 3, ['#ffd23f','#ff6b9a','#69c3ff','#7ef07a'][Math.floor(Math.random()*4)], .16, -.05, 0);
    else emit(x, y, z, (Math.random()-.5)*.4, .3 + Math.random()*.4, 0, 3.5, Math.random()<.6 ? '#ffe27a' : '#c9a8ff', .17, -.05, 0);
  }
}

function updateCamera(dt, demo=false){
  const tanH = Math.tan(THREE.MathUtils.degToRad(camera.fov/2));
  const inArena = !demo && arena && arena.active && boss && !boss.dead;
  targetDist = inArena ? clamp((arena.x1 + 2 - arena.x0)/camera.aspect/(2*tanH), CAM_DIST, 24) : CAM_DIST;
  camDist = damp(camDist, targetDist, 2, dt);
  const visH = 2*camDist*tanH, visW = visH*camera.aspect;
  let tx, ty;
  if(demo){ demoT += dt; tx = 12 + (Math.sin(demoT*.06 - 1.4)*.5 + .5)*(lvl.w - 24); ty = 7; }
  else if(state === 'cutscene' && boss){ tx = clamp(boss.x, arena.x0 + visW/2, arena.x1 + 1 - visW/2); ty = 3 + visH/2 - 1.2; }
  else if(inArena){ const aw = arena.x1 + 1 - arena.x0; tx = aw <= visW ? arena.cx : clamp(P ? P.x : arena.cx, arena.x0 + visW/2, arena.x1 + 1 - visW/2); ty = 3 + visH/2 - 1.2; }
  else if(P){ tx = P.x + P.face*1.6 + P.vx*.15; ty = clamp(P.y + 1.0, 5.4, LH - 5); }
  else { tx = camX; ty = camY; }
  tx = clamp(tx, visW/2, lvl.w - visW/2);
  camX = damp(camX, tx, demo ? 1 : 5, dt);
  camY = damp(camY, ty, 3, dt);
  shakeAmp = Math.max(0, shakeAmp - dt*1.6);
  const sx = (Math.random()-.5)*shakeAmp, sy = (Math.random()-.5)*shakeAmp;
  camera.position.set(camX + sx, camY + 1.4 + sy, camDist);
  camera.lookAt(camX + sx*.6, camY + sy*.6, 0);
  if(window.__freeCam){ const f = window.__freeCam; camera.position.set(f.x, f.y, f.z); camera.lookAt(f.tx, f.ty, f.tz || 0); }
  sun.position.set(camX + 8, camY + 16, 12); sun.target.position.set(camX, camY - 2, 0);
}

/* ── 提示文字：觸控時把按鍵名稱換成畫面按鈕 ── */
function adaptKeys(t){
  if(!touchVisible()) return t;
  return t.replace(/← →/g, '◀ ▶').replace(/空白鍵跳/g, '按「跳」跳起來').replace(/空白鍵/g, '「跳」').replace(/按住 J/g, '按住「吸」').replace(/按 J/g, '按「吸」').replace(/再按 J/g, '再按「吸」').replace(/J /g, '「吸」').replace(/按 ↓/g, '按「吞」').replace(/↓ /g, '「吞」').replace(/K 丟掉/g, '「丟」丟掉');
}
/* ── HUD ── */
let lastHud = '';
function updateHUD(force=false){
  if(!P) return;
  const sig = [P.hp, lives, starCount, P.ability, P.mouth, P.bubble, Math.ceil(P.floatT)].join('|');
  if(!force && sig === lastHud) return; lastHud = sig;
  $('hp').innerHTML = Array.from({ length:6 }, (_,i) => `<i class="${i < P.hp ? '' : 'off'}"></i>`).join('') + (P.bubble ? '<i class="bubble"></i>' : '');
  $('lives').textContent = `♥ ×${lives}`;
  $('stars').textContent = `★ ${starCount}` + (P.floatT > 0 ? `　🍭 ${Math.ceil(P.floatT)}` : '');
  const ab = P.ability ? ABIL[P.ability] : null;
  $('abIcon').textContent = ab ? ab.icon : (P.mouth ? '😮' : '○');
  $('abIcon').style.background = ab ? ab.css : '';
  $('abName').textContent = ab ? (ab.snack ? `${ab.name}（${SNACKS[P.ability].name}）` : ab.name) : (P.mouth ? '嘴巴塞滿了' : '沒有能力');
  $('abHint').textContent = adaptKeys(ab ? ab.hint + '　K 丟掉' : (P.mouth ? (P.mouth === 'none' ? 'J 吐星星' : 'J 吐星星　↓ 吞下得能力') : '按住 J 吸住敵人'));
}
let _lastSec = -1;
function updateTimer(){ const s = Math.floor(levelTime); if(s !== _lastSec){ _lastSec = s; $('timer').textContent = fmtTime(levelTime); } }
let toastTimer = 0;
function toast(msg){
  const t = $('toast'); t.textContent = msg; t.classList.add('show');
  clearTimeout(toastTimer); toastTimer = setTimeout(() => t.classList.remove('show'), 1700);
}
function showBanner(sub, title){ $('bannerSub').textContent = sub; $('bannerTitle').textContent = title; $('banner').classList.add('show'); }
function hideBanner(){ $('banner').classList.remove('show'); }

/* ── 圓形轉場 ── */
const iris = $('iris');
function irisOpen(){
  iris.classList.remove('anim'); iris.classList.add('on');
  iris.style.left = '50%'; iris.style.top = '55%'; iris.style.width = iris.style.height = '0px';
  void iris.offsetWidth;
  iris.classList.add('anim'); iris.style.width = iris.style.height = '300vmax';
  setTimeout(() => iris.classList.remove('on','anim'), 650);
}
function irisClose(cb){
  const v = new THREE.Vector3(P ? P.x : camX, (P ? P.y : camY) + .6, 0).project(camera);
  iris.classList.remove('anim'); iris.style.width = iris.style.height = '300vmax';
  iris.style.left = ((v.x*.5 + .5)*100) + '%'; iris.style.top = ((-v.y*.5 + .5)*100) + '%';
  iris.classList.add('on'); void iris.offsetWidth;
  iris.classList.add('anim'); iris.style.width = iris.style.height = '0px';
  setTimeout(() => cb && cb(), 600);
}
function irisClear(){ iris.classList.remove('on','anim'); }
