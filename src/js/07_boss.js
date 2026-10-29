/* =====================================================================
   魔王
   ===================================================================== */
const BOSSES = {
  megaknight: { name:'大劍士', sub:'安平老街的守護者', hp:22, w:1.6, h:2.0, drop:'sword', fly:false },
  bigflame:   { name:'炎炎大王', sub:'夜市的火爆老闆', hp:26, w:1.9, h:2.1, drop:'fire', fly:false },
  cloudking:  { name:'雷雲王', sub:'古堡的最終魔王', hp:50, w:3.4, h:2.4, drop:null, fly:true },
};
function setupArena(b){
  const gates = [];
  for(const gx of [b.x0, b.x1+1]){
    const g = new THREE.Group();
    for(let i=0;i<3;i++) g.add(mesh(G.box, toon(0x4a3f6b), .3,8,.3, 0,4,-.9+i*.9));
    for(let k=0;k<4;k++) g.add(mesh(G.box, toon(0x6c5d99), .36,.25,2.2, 0,1+k*2,0));
    g.position.set(gx, -9, 0); scene.add(g); gates.push(g);
  }
  arena = { x0:b.x0, x1:b.x1, cx:(b.x0+b.x1+1)/2, active:false, gates, gateY:-9 };
  const def = BOSSES[b.type];
  let m;
  if(b.type === 'cloudking'){
    m = new THREE.Group();
    const white = toon(0xf4f2ff), grey = toon(0xc9c3e6);
    [[0,0,0,1.2],[-1.1,-.2,0,.9],[1.1,-.2,0,.9],[-.6,.6,0,.85],[.6,.6,0,.85],[-1.8,-.4,0,.6],[1.8,-.4,0,.6]].forEach(([x,y,z,r],i) => m.add(mesh(G.sphere, i%2?grey:white, r,r*.85,r, x,y,z)));
    addEyes(m, .15, 1.05, .35, 2.4, true);
    m.add(mesh(G.box, basic(0x1d1d2b), .6,.12,.05, 0,-.38,1.05));
    const crown = new THREE.Group();
    crown.add(mesh(G.cyl, toon(0xffcf3f,{ emissive:0x664400 }), .55,.3,.55, 0,0,0));
    for(let i=0;i<5;i++){ const a = i/5*Math.PI*2; crown.add(mesh(G.cone, toon(0xffcf3f,{ emissive:0x664400 }), .12,.35,.12, Math.cos(a)*.48,.3,Math.sin(a)*.48)); }
    crown.position.y = 1.15; m.add(crown);
    m.userData.bolts = [];
    for(const sx of [-1,1]){ const bt = mesh(G.bolt, toon(0xffe14d,{ emissive:0xaa8800 }), .5,.7,.5, sx*1.3,-1.1,0); bt.rotation.z = sx*.3; m.add(bt); m.userData.bolts.push(bt); }
    m.position.set(arena.cx, 9, 0);
  } else {
    m = ENEMY[b.type === 'megaknight' ? 'knight' : 'flame'].build();
    m.scale.setScalar(b.type === 'megaknight' ? 2.2 : 2.4);
    if(b.type === 'megaknight'){
      m.add(mesh(G.box, toon(0xd94b4b), .5,.6,.06, 0,.62,-.36));
      m.add(mesh(G.sphereLo, toon(0xff6b6b), .08,.16,.2, 0,1.18,-.05));
      addc(m, mesh(G.torus, toon(0xffcf3f), .2,.2,.2, 0,.92,0)).rotation.x = Math.PI/2;
    }
    m.position.set(arena.cx + 4, 3, 0);
  }
  addOutline(m); scene.add(m);
  const mats = []; m.traverse(o => { if(o.isMesh && !o.userData.isOutline && o.material && o.material.isMeshToonMaterial){ o.material = o.material.clone(); o.material.userData.em = o.material.emissive.getHex(); mats.push(o.material); } });
  boss = { type:b.type, def, x: def.fly ? arena.cx : arena.cx + 4, y: def.fly ? 6.6 : 3, baseY:6.6, vx:0, vy:0, w:def.w, h:def.h, hp:def.hp, max:def.hp,
           t:0, st:'idle', stT:0, atkT:2.4, pattern:0, hurtT:0, tickCD:0, dead:false, deadT:0, mesh:m, mats, dir:-1, onGround:true, minionT:6, hops:0 };
}
function startBoss(){
  arena.active = true;
  state = 'cutscene'; cutT = 0; sfx.boss(); Music.play('boss');
  showBanner(boss.def.sub, boss.def.name);
  $('bossName').textContent = boss.def.name; $('bossbar').hidden = false; updateBossBar();
}
let cutT = 0;
function updateCutscene(dt){
  cutT += dt;
  arena.gateY = damp(arena.gateY, 0, 4, dt); arena.gates.forEach(g => g.position.y = arena.gateY);
  if(boss.mesh) boss.mesh.rotation.y = Math.sin(cutT*8)*.2*(1 - Math.min(1, cutT/1.6));
  if(cutT > 1.8){ state = 'playing'; hideBanner(); }
}
function updateBossBar(){ $('bossfill').style.width = (boss ? Math.max(0, boss.hp/boss.max*100) : 0) + '%'; }
function damageBoss(d){
  if(!boss || boss.dead) return;
  boss.hp -= d; boss.hurtT = .25; sfx.hit(); updateBossBar(); addShake(.15);
  burst(boss.x, boss.y + boss.h*.6, ['#ffffff','#ffe14d'], 8, 4);
  if(boss.hp <= 0){
    boss.dead = true; boss.deadT = 0; sfx.die(); addShake(.6); hitStop = .35; Music.stop();
    lvl.bossBeaten = true;   // v2.5 打倒後就算死掉，魔王也不會復活
    for(const e of enemies) if(e.minion && !e.dead) killEnemy(e);
    for(const s of shots) if(!s.dead && !s.friendly) removeShot(s);
    for(const it of items) if(!it.dead && it.type === 'boulder') removeItem(it);
    if(P) P.inv = Math.max(P.inv, 2.5);
  }
}
function bossMinion(types){
  if(enemies.filter(e => !e.dead && e.x > arena.x0 && e.x < arena.x1 + 1).length >= 2) return;
  const e = spawnEnemy(pick(types), Math.random() < .5 ? arena.x0 + 2 : arena.x1 - 1, 11, { minion:true });
  e.dir = e.x < arena.cx ? 1 : -1;
}
function telegraphStrike(x){
  const ringM = new THREE.Mesh(new THREE.RingGeometry(.3,.75,24), new THREE.MeshBasicMaterial({ color:0xffe14d, transparent:true, opacity:.85, side:THREE.DoubleSide, depthWrite:false }));
  ringM.rotation.x = -Math.PI/2; ringM.position.set(x, 3.05, 0); scene.add(ringM);
  fx.push({ mesh:ringM, t:0, life:.9, update:(f,k) => { f.mesh.material.opacity = .5 + Math.sin(k*30)*.35; f.mesh.scale.setScalar(1 + k*.4); if(k >= 1) { f.mesh.geometry.dispose(); f.mesh.material.dispose(); } } });
  setTimeout(() => {
    if(!boss || boss.dead || state === 'result') return;
    const bolt = new THREE.Mesh(new THREE.CylinderGeometry(.22,.4,12,8), new THREE.MeshBasicMaterial({ color:0xfff7a0 }));
    bolt.position.set(x, 9, 0); scene.add(bolt);
    fx.push({ mesh:bolt, t:0, life:.3, update:(f,k) => { f.mesh.scale.x = f.mesh.scale.z = 1 + Math.sin(k*40)*.4; if(k >= 1){ f.mesh.geometry.dispose(); f.mesh.material.dispose(); } } });
    sfx.zap(); sfx.boom(); addShake(.25); burst(x, 3.2, ['#fff7a0','#ffffff','#9fd3ff'], 18, 6);
    if(P && !P.dead && Math.abs(P.x - x) < .8 && P.y < 6) hurtPlayer(x);
  }, 900);
}
// 打王時不定時從天上掉小吃
function bossSnackDrop(dt, angry){
  if(arena.snackT === undefined){ arena.snackT = 3; arena.hpStep = 5; }
  arena.snackT -= dt;
  // 魔王每掉 20% 血，一定掉一個道具
  const step = Math.ceil(boss.hp/boss.max*5);
  let forced = false;
  if(step < arena.hpStep){ arena.hpStep = step; forced = true; }
  if(arena.snackT > 0 && !forced) return;
  if(!forced) arena.snackT = (angry ? 4.5 : 6) + Math.random()*3;
  if(!P || P.dead || items.filter(it => it.drop && !it.dead).length >= (forced ? 3 : 2)){ if(forced) arena.hpStep = step + 1; arena.snackT = 1.5; return; }
  const heals = Object.keys(SNACKS).filter(k => SNACKS[k].type !== 'ability');
  const abils = Object.keys(SNACKS).filter(k => SNACKS[k].type === 'ability');
  const r = Math.random();
  const kind = P.hp <= 3 && r < .7 ? pick(heals) : r < .12 ? 'cotton' : pick(Math.random() < .55 ? abils : heals);
  let x = arena.x0 + 2 + Math.random()*(arena.x1 - arena.x0 - 3);
  if(Math.abs(x - boss.x) < 2.5) x = clamp(boss.x + (x < boss.x ? -3.5 : 3.5), arena.x0 + 1.5, arena.x1 - .5);
  const it = spawnItem(kind, x, (boss.def.fly ? boss.baseY : 3) + 9, { drop:true, life:11 });
  it.vy = -1; sfx.select();
  if(!arena.toldSnack){ arena.toldSnack = true; toast('🎁 天上掉小吃了，快去接！'); }
}
function updateBoss(dt){
  if(!boss || !arena) return;
  if(!arena.active){ arena.gates.forEach(g => g.position.y = arena.gateY); if(boss.def.fly) boss.mesh.position.y = boss.baseY + 1 + Math.sin(performance.now()/600)*.3; return; }
  arena.gateY = damp(arena.gateY, boss.dead ? -9 : 0, 4, dt); arena.gates.forEach(g => g.position.y = arena.gateY);
  const b = boss;
  if(b.dead){
    b.deadT += dt;
    b.mesh.rotation.z += dt*6; b.mesh.scale.multiplyScalar(Math.pow(.6, dt));
    if(Math.random() < .5) burst(b.x + (Math.random()-.5)*3, b.y + 1 + (Math.random()-.5)*2, ['#ffe14d','#ffffff','#ff9ec4'], 8, 5);
    if(b.deadT > 2.2 && !door){
      scene.remove(b.mesh); b.mats.forEach(m => m.dispose());
      makeDoor(arena.cx, 3); $('bossbar').hidden = true;
      if(b.def.drop){ const it = spawnItem('abil', b.x, b.y + 1, { ability:b.def.drop, life:20 }); it.vy = 8; }
      showBanner('擊敗！', b.def.name); setTimeout(hideBanner, 1600);
      sfx.clear(); Music.play(THEMES[lvl.def.theme].song);
      for(const e of enemies) if(e.minion && !e.dead) killEnemy(e);
    }
    return;
  }
  b.t += dt; b.stT += dt; b.hurtT = Math.max(0, b.hurtT - dt); b.tickCD -= dt; b.minionT -= dt;
  const angry = b.hp < b.max/2;
  bossSnackDrop(dt, angry);
  const toP = P ? Math.sign(P.x - b.x) || 1 : -1;
  if(b.type === 'cloudking'){
    const half = (arena.x1 - arena.x0)/2 - 3;
    b.x = arena.cx + Math.sin(b.t*(angry ? .75 : .55))*half;
    b.y = b.baseY + Math.sin(b.t*1.7)*.5;
    b.atkT -= dt;
    if(b.atkT <= 0){
      const pat = b.pattern++ % 4;
      if(pat === 0 || pat === 2){ for(const ox of [-2.2, 0, 2.2]){ const it = spawnItem('boulder', clamp(b.x + ox, arena.x0+1, arena.x1), b.y - .4, { life:7 }); it.vy = 2; } sfx.stone(); }
      if(pat === 1){ for(let i=0;i<3;i++) setTimeout(() => { if(!boss || boss.dead || !P || state !== 'playing') return; const dx = P.x - boss.x, dy = (P.y + .5) - (boss.y + .4), L = Math.hypot(dx,dy) || 1; spawnShot('wind', boss.x, boss.y + .4, dx/L*6.5, dy/L*6.5, { life:3, dmg:1, r:.35 }); sfx.puff(); }, i*380); }
      if(pat === 3 || (angry && pat === 1)){ telegraphStrike(P ? P.x : b.x); if(angry) telegraphStrike(clamp((P ? P.x : b.x) + pick([-3, 3]), arena.x0 + 1, arena.x1)); }
      if(pat === 2) bossMinion(['flame','icy','knight','rocky','acorn','spark','bomber','ninja','archer','laserbot','yoyokid']);
      b.atkT = angry ? 2.0 : 2.8;
    }
  } else if(b.type === 'megaknight'){
    b.vy -= GRAV*dt; moveBody(b, dt, { noMovers:true });
    if(b.st === 'idle' || b.st === 'walk'){
      b.st = 'walk'; b.dir = toP; b.vx = b.dir*1.6;
      if(b.stT > (angry ? 1.4 : 2.2)){ b.st = pick(['tele','tele','jump']); b.stT = 0; b.vx = 0; if(b.st === 'tele') sfx.slash(); }
    } else if(b.st === 'tele'){ b.vx = 0; if(b.stT > .55){ b.st = 'dash'; b.stT = 0; b.dir = toP; sfx.slash(); } }
    else if(b.st === 'dash'){ b.vx = b.dir*(angry ? 11 : 9); if(Math.random() < .6) emit(b.x - b.dir, b.y + 1, 0, -b.dir*2, 1, 0, .3, '#e8edf7', .3); if(b.stT > .55 || b.hitWall){ b.st = 'walk'; b.stT = 0; b.vx = 0; } }
    else if(b.st === 'jump'){ if(b.stT < .05){ b.vy = 14; b.vx = toP*4; } if(b.onGround && b.stT > .3){ b.st = 'walk'; b.stT = 0; b.vx = 0; addShake(.35); sfx.boom();
        for(const d of [-1,1]) spawnShot('wave', b.x + d*1, 3.35, d*6.5, 0, { life:1.6, dmg:1, r:.3 }); } }
    if(b.minionT <= 0){ bossMinion(['acorn','knight','ninja']); b.minionT = 7; }
  } else if(b.type === 'bigflame'){
    b.vy -= GRAV*dt; moveBody(b, dt, { noMovers:true });
    if(b.st === 'idle'){ if(b.stT > (angry ? .5 : .9)){ b.st = pick(['hop','hop','volley']); b.stT = 0; b.hops = 3; } }
    else if(b.st === 'hop'){
      if(b.onGround && b.stT > .45){
        if(b.hops-- <= 0){ b.st = 'idle'; b.stT = 0; b.vx = 0; }
        else { b.vy = 11; b.dir = toP; b.vx = b.dir*3.5; b.stT = 0; }
      }
      if(b.onGround && b.vx !== 0 && b.stT > .1 && b.stT < .14){ addShake(.25); sfx.stone(); }
    } else if(b.st === 'volley'){
      b.vx = 0;
      if(b.stT > .3 && !b.shot1){ b.shot1 = true; for(let i=0;i<(angry ? 7 : 5);i++){ const vx = toP*(2.5 + i*1.3); spawnShot('fireball', b.x, b.y + 1.8, vx, 9 + (i%2)*2, { life:2.5, dmg:1, r:.25, grav:14 }); } sfx.breath(); sfx.boom(); }
      if(b.stT > 1.3){ b.st = 'idle'; b.stT = 0; b.shot1 = false; }
    }
    if(b.onGround && Math.abs(b.vx) < .1 && b.st === 'hop') b.vx = 0;
    if(b.minionT <= 0){ bossMinion(['flame','frog','archer']); b.minionT = 8; }
  }
  if(!b.def.fly){ const lo = arena.x0 + 1 + b.w/2, hi = arena.x1 - b.w/2; if(b.x < lo || b.x > hi){ b.x = clamp(b.x, lo, hi); b.hitWall = true; if(b.st === 'dash'){ b.st = 'walk'; b.stT = 0; b.vx = 0; } } }
  if(P && !P.dead && aabb(P, b)){ if(P.stone && b.tickCD <= 0){ damageBoss(3); b.tickCD = .6; } else hurtPlayer(b.x); }
}

/* =====================================================================
   關卡流程
   ===================================================================== */
function clearEntities(){
  for(const e of enemies) disposeEnemy(e);
  for(const i of items) scene.remove(i.mesh);
  for(const s of shots) removeShot(s);
  for(const f of fx) scene.remove(f.mesh);
  for(const s of springs) scene.remove(s.mesh);
  for(const m of movers) scene.remove(m.mesh);
  for(const c of checkpoints) scene.remove(c.mesh);
  for(const s of signs) scene.remove(s.mesh);
  if(boss){ scene.remove(boss.mesh); boss.mats.forEach(m => m.dispose()); }
  if(door) scene.remove(door.mesh);
  if(arena) arena.gates.forEach(g => scene.remove(g));
  if(P){ clearOrbs(); scene.remove(P.root); P = null; }
  enemies = []; items = []; shots = []; fx = []; springs = []; movers = []; checkpoints = []; signs = [];
  parts.length = 0; boss = null; arena = null; door = null;
}
function spawnEntities(demo){
  for(const s of lvl.spawns) spawnEnemy(s.type, s.x, s.y, s);
  for(const it of lvl.items) if(!collected.has(it.id)){ const o = spawnItem(it.type, it.x, it.y + (it.type === 'star' ? .3 : 0)); o.id = it.id; }
  for(const s of lvl.springs) makeSpring(s.x, s.y);
  for(const m of lvl.movers) makeMover(m);
  for(const c of lvl.checkpoints) makeCheckpoint(c.x, c.y);
  for(const s of lvl.signs) makeSign(s);
  if(lvl.door) makeDoor(lvl.door.x, lvl.door.y);
  if(lvl.boss && lvl.bossBeaten) makeDoor((lvl.boss.x0 + lvl.boss.x1 + 1)/2, 3);
  else if(lvl.boss) setupArena(lvl.boss);
}
function loadLevel(i, demo=false){
  clearEntities();
  levelIndex = i; lvl = new Level(LEVELS[i]);
  if(!demo){ collected = new Set(); respawnPt = null; levelTime = 0; levelDeaths = 0; enemiesDefeated = 0; snacksFound = new Set(); levelStars = 0; }
  buildWorld();
  spawnEntities(demo);
  clearing = false;
  if(!demo){
    const sp = respawnPt || { x:2.5, y:3 };
    createPlayer(sp.x, sp.y);
    camX = sp.x + 6; camY = 7; camDist = CAM_DIST;
    $('lvname').textContent = `${i+1}. ${LEVELS[i].name}`;
    $('bossbar').hidden = true;
    updateHUD(true);
  }
}
function respawn(){
  // 從存檔點重來：地形（打破的方塊）保留，敵人重生，拿過的星星不再出現
  const keepAbility = null;
  clearEntities();
  spawnEntities(false);
  const sp = respawnPt || { x:2.5, y:3 };
  createPlayer(sp.x, sp.y);
  if(keepAbility) gainAbility(keepAbility, true);
  camX = sp.x + 6; camY = 7; camDist = CAM_DIST;
  $('bossbar').hidden = true; clearing = false;
  updateHUD(true);
}
function rankFor(stars, total, deaths, time, par){
  const r = total ? stars/total : 1;
  if(r >= .9 && deaths === 0 && time <= par) return 'S';
  if(r >= .7 && deaths <= 1) return 'A';
  if(r >= .4) return 'B';
  return 'C';
}
function fmtTime(s){ s = Math.floor(s); return Math.floor(s/60) + ':' + String(s%60).padStart(2,'0'); }
function levelClear(){
  if(clearing) return; clearing = true;
  Music.stop(); sfx.clear();
  P.vx = 0; P.emote = 'win'; P.emoteT = 3;
  const next = levelIndex + 1;
  const rank = rankFor(levelStars, lvl.starTotal, levelDeaths, levelTime, lvl.def.par);
  const prev = SAVE.best[levelIndex] || {};
  const order = { S:4, A:3, B:2, C:1 };
  SAVE.best[levelIndex] = { stars:Math.max(prev.stars || 0, levelStars), rank: (order[rank] > (order[prev.rank] || 0)) ? rank : prev.rank, time: Math.min(prev.time || 9999, levelTime) };
  if(next < LEVELS.length) SAVE.unlocked = Math.max(SAVE.unlocked, next + 1);
  saveGame();
  setTimeout(() => { if(!clearing || state !== 'playing') return; irisClose(() => {
    const stats = [['星星', `${levelStars}/${lvl.starTotal}`], ['小吃', `${snacksFound.size}/${lvl.snackTotal}`], ['時間', fmtTime(levelTime)], ['打倒', enemiesDefeated]];
    if(next >= LEVELS.length) showResult(rank, '全部破關！', stats, `你和自己做的角色一起吃遍台南、打倒了雷雲王！小吃圖鑑收集了 ${Object.keys(SAVE.snacks).length}/${SNACK_ORDER.length} 種。`,
      [['再玩一次', () => startLevel(0, true), 'go'], ['小吃圖鑑', () => { goTitle(); openPanel('dex'); }], ['回標題', goTitle]]);
    else showResult(rank, '過關！', stats, LEVELS[levelIndex].name + (rank === 'S' ? '　完美！' : rank === 'A' ? '　很棒！' : '　再挑戰拿 S 吧！'),
      [['下一關 →', () => startLevel(next), 'go'], ['重玩這關', () => startLevel(levelIndex)], ['回標題', goTitle]]);
  }); }, 1400);
}
