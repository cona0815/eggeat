/* =====================================================================
   遊戲狀態
   ===================================================================== */
let state = 'boot';          // boot title playing paused dying cutscene result between
let P = null;
let enemies = [], items = [], shots = [], fx = [], springs = [], movers = [], checkpoints = [], signs = [];
let boss = null, arena = null, door = null;
let lives = 3, starCount = 0, levelStars = 0, deathT = 0, clearing = false;
let levelTime = 0, levelDeaths = 0, enemiesDefeated = 0, snacksFound = new Set(), collected = new Set();
let respawnPt = null;
let camX = 10, camY = 7, demoT = 0, shakeAmp = 0, hitStop = 0;
function addShake(a){ shakeAmp = Math.max(shakeAmp, a); }
const GRAV = 30, FALL_K = 1.55, JUMP_V = 12.6, JUMP2_V = 13.2, FLAP_V = 6.4, MAX_FALL = 21, PUFF_FALL = 2.6, WALK = 5.4, ACC = 42;

function aabb(a, b){ return a.x - a.w/2 < b.x + b.w/2 && a.x + a.w/2 > b.x - b.w/2 && a.y < b.y + b.h && a.y + a.h > b.y; }
const solidT = t => t===SOLID || t===BLOCK || t===METAL;

/* ── 地形碰撞：x 中心、y 腳底；支援移動平台 ── */
function moveBody(b, dt, opt){
  b.hitWall = false; b.hitCeil = false;
  if(b.riding){ b.x += b.riding.dxF; b.y += b.riding.dyF; }
  b.x += b.vx*dt;
  const yb = b.y + 0.04, yt = b.y + b.h - 0.04;
  if(b.vx > 0){
    const tx = Math.floor(b.x + b.w/2);
    for(let ty=Math.floor(yb); ty<=Math.floor(yt); ty++) if(solidT(lvl.get(tx,ty))){ b.x = tx - b.w/2 - 0.001; b.vx = 0; b.hitWall = true; break; }
  } else if(b.vx < 0){
    const tx = Math.floor(b.x - b.w/2);
    for(let ty=Math.floor(yb); ty<=Math.floor(yt); ty++) if(solidT(lvl.get(tx,ty))){ b.x = tx + 1 + b.w/2 + 0.001; b.vx = 0; b.hitWall = true; break; }
  }
  const prevY = b.y;
  b.y += b.vy*dt;
  b.onGround = false; b.riding = null;
  const xl = Math.floor(b.x - b.w/2 + 0.04), xr = Math.floor(b.x + b.w/2 - 0.04);
  if(b.vy <= 0){
    const ty = Math.floor(b.y);
    for(let tx=xl; tx<=xr; tx++){
      const t = lvl.get(tx,ty);
      if(solidT(t) || (t===ONEWAY && prevY >= ty+1-0.02)){ b.y = ty+1; b.vy = 0; b.onGround = true; break; }
    }
    if(!b.onGround && !(opt && opt.noMovers)) for(const m of movers){
      if(b.x + b.w/2 > m.x + .05 && b.x - b.w/2 < m.x + m.w - .05 && prevY >= m.top - .06 && b.y <= m.top){
        b.y = m.top; b.vy = 0; b.onGround = true; b.riding = m; break;
      }
    }
  } else {
    const ty = Math.floor(b.y + b.h);
    for(let tx=xl; tx<=xr; tx++) if(solidT(lvl.get(tx,ty))){ b.y = ty - b.h - 0.001; b.vy = 0; b.hitCeil = true; break; }
  }
}
function groundAhead(e){
  const ax = e.x + e.dir*(e.w/2 + 0.08);
  const t = lvl.get(Math.floor(ax), Math.floor(e.y - 0.1));
  if(t===SOLID || t===ONEWAY || t===BLOCK || t===METAL) return true;
  return movers.some(m => ax > m.x && ax < m.x + m.w && Math.abs(e.y - m.top) < .1);
}
function clearPath(x0, x1, y){
  const a = Math.floor(Math.min(x0,x1)), b = Math.floor(Math.max(x0,x1));
  for(let tx=a+1; tx<b; tx++) if(solidT(lvl.get(tx, Math.floor(y)))) return false;
  return true;
}

/* =====================================================================
   玩家
   ===================================================================== */
function attachPlayerModel(){
  P.modelHolder.clear();
  P.model = charTemplate.clone(true);
  P.modelHolder.add(P.model);
  P.mouthY = P.model.userData.mouthY || .55;
  setHat();
}
function setHat(){
  if(!P || !P.model) return;
  const anchor = getPivots(P.model).hat;
  if(P.hat){ P.hat.parent && P.hat.parent.remove(P.hat); P.hat = null; }
  if(P.ability && anchor){ P.hat = makeHat(P.ability); anchor.add(P.hat); }
}
function createPlayer(x, y){
  const root = new THREE.Group(), turn = new THREE.Group(), anim = new THREE.Group(), modelHolder = new THREE.Group();
  root.add(turn); turn.add(anim); anim.add(modelHolder);
  const stoneMesh = mesh(G.dodeca, toon(0x9a9188), .72,.66,.66, 0,.66,0); stoneMesh.visible = false; root.add(stoneMesh);
  addEyes(stoneMesh, .1, .9, .25, 1.6, true); addOutline(stoneMesh, .1);
  const slash = new THREE.Mesh(new THREE.TorusGeometry(1.1, .09, 6, 28, Math.PI*0.95), new THREE.MeshBasicMaterial({ color:0xb8ffb0, transparent:true, opacity:.9 }));
  slash.visible = false; root.add(slash);
  const whip = new THREE.Group(); for(let i=0;i<20;i++) whip.add(mesh(G.sphereLo, toon(0xffd76a), .1,.1,.1)); whip.visible = false; root.add(whip);
  const armor = new THREE.Group();
  armor.add(mesh(G.rbox, toon(0xd99a4e), 1.35,1.4,1.1, 0,.7,0)); armor.add(mesh(G.rbox, toon(0xf6e2b0), 1.2,.14,.96, 0,1.42,0));
  armor.children.forEach(c => { c.material = c.material.clone(); c.material.transparent = true; c.material.opacity = .8; });
  armor.visible = false; root.add(armor);
  const shield = new THREE.Group();
  shield.add(mesh(G.hemi, toon(0xf6e7cc), .75,.45,.75, 0,0,0)); addc(shield, mesh(new THREE.TorusGeometry(.72,.06,6,24), toon(0xb84a3a), 1,1,1, 0,.02,0)).rotation.x = Math.PI/2;
  shield.rotation.z = -Math.PI/2; shield.position.set(.75,.6,.2); shield.visible = false; root.add(shield);
  const bubble = new THREE.Mesh(new THREE.SphereGeometry(.95, 24, 16), new THREE.MeshBasicMaterial({ color:0x9fe0ff, transparent:true, opacity:.25, depthWrite:false }));
  bubble.position.y = .6; bubble.visible = false; root.add(bubble);
  const hammer = new THREE.Group();
  hammer.add(mesh(G.cyl, toon(0x8a5a3a), .05,1.1,.05, 0,.55,0));
  const head = mesh(new THREE.ConeGeometry(.42,.7,3), toon(0x4f8a32), 1,1,1, 0,1.2,0); head.rotation.z = Math.PI/2; hammer.add(head);
  addc(hammer, mesh(new THREE.TorusGeometry(.26,.05,5,12), toon(0xd8c08a), 1,1,1, 0,1.2,0)).rotation.y = Math.PI/2;
  addOutline(hammer, .03); hammer.visible = false; root.add(hammer);
  const umb = new THREE.Group();
  umb.add(mesh(G.hemi, toon(0xff6b9a), .7,.38,.7, 0,0,0)); for(let i=0;i<4;i++){ const a = i/4*Math.PI*2+.4; umb.add(mesh(G.hemi, toon(0xffffff), .24,.1,.24, Math.cos(a)*.42,.2,Math.sin(a)*.42)); }
  umb.add(mesh(G.cyl, toon(0x6a4a3a), .025,.9,.025, 0,-.45,0)); addOutline(umb, .05); umb.visible = false; root.add(umb);
  scene.add(root);
  if(P && P.orbs) P.orbs.forEach(o => o.parent && o.parent.remove(o));
  P = { x, y, vx:0, vy:0, w:.9, h:1.1, face:1, onGround:false, riding:null,
        hp:6, inv:0, puffed:false, mouth:null, ability:null, inhaling:false, inhaleArmed:false, inhaleSnd:0,
        stone:false, stoneT:0, atk:null, atkCD:0, breathT:0, swallowT:0, landT:0, t:0, dead:false, jumpHeld:false,
        speedT:0, floatT:0, airJumps:0, laserT:0, gliding:false, bubble:false, dashT:0, dashHit:null, pound:false, shieldUp:false, shieldT:0, spinT:0, emote:null, emoteT:0, idleT:0, walkPh:0,
        root, turn, anim, modelHolder, model:null, hat:null, stoneMesh, slash, whip, armor, shield, bubbleMesh:bubble, hammer, umb, orbs:[], orbA:0, orbT:0, flipT:0 };
  attachPlayerModel();
}
function fishballMesh(){ const m = new THREE.Group(); m.add(mesh(G.sphere, toon(0xfbf6ea), .3,.28,.3)); m.add(mesh(G.sphereLo, toon(0xe8d8b8), .1,.04,.1, 0,.26,0)); return addOutline(m, .04); }
function summonOrbs(){
  for(let i=0;i<3;i++){ const m = fishballMesh(); world.add(m); P.orbs.push(m); }
  P.orbT = 10; P.orbA = 0; sfx.ability(); burst(P.x, P.y + .7, ['#ffffff','#ffe9b0','#ff9a5a'], 18, 4, .3, .5);
}
function clearOrbs(fx){ for(const m of P.orbs){ if(fx) burst(m.position.x, m.position.y, ['#ffffff'], 5, 2); if(m.parent) m.parent.remove(m); } P.orbs.length = 0; }
function launchOrbs(){
  P.orbs.forEach((m, i) => { const s = spawnShot('fishball', m.position.x, m.position.y, P.face*14, (i - 1)*1.2, { friendly:true, dmg:3, life:1.1, r:.32, pierce:true }); });
  clearOrbs(); P.throwT = .22; sfx.spit();
}
function mouthPos(){ return { x: P.x + P.face*0.5, y: P.y + Math.min(.75, P.mouthY || .55) }; }

function exhale(){
  const m = mouthPos();
  spawnShot('puff', m.x, m.y, P.face*9, 0, { friendly:true, dmg:1, life:.28, r:.35 });
  P.puffed = false; P.inhaleArmed = false; sfx.puff();
}
function spitStar(){
  const m = mouthPos();
  spawnShot('star', m.x, m.y, P.face*15, 0, { friendly:true, dmg:4, life:.75, r:.45 });
  P.mouth = null; P.inhaleArmed = false; P.atkCD = .2; sfx.spit();
}
function swallow(){
  const got = P.mouth; P.mouth = null; P.swallowT = .35; P.inhaleArmed = false;
  if(got && got !== 'none') gainAbility(got); else sfx.swallow();
}
function gainAbility(a, silent){
  P.ability = a; P.stone = false; P.pound = false; P.shieldUp = false; setHat();
  if(!silent){ sfx.ability(); burst(P.x, P.y+.6, [ABIL[a].css,'#ffffff','#ffcf3f'], 26, 6, .35, .8); toast(`${ABIL[a].icon} 獲得能力：${ABIL[a].name}！`); }
  updateHUD(true);
}
function dropAbility(){
  if(!P.ability) return;
  const it = spawnItem('abil', P.x, P.y + .6, { ability:P.ability, life:8 });
  it.vx = -P.face*3.5; it.vy = 7;
  P.ability = null; P.stone = false; P.pound = false; P.shieldUp = false; setHat(); updateHUD(true); sfx.pop();
}
function loseAbility(){
  const a = ABIL[P.ability];
  burst(P.x, P.y + 1.2, [a.css, '#ffffff', '#9aa6c0'], 20, 5, .34, .7);
  toast(`💥 ${a.name}不見了！`);
  P.ability = null; P.stone = false; P.pound = false; P.shieldUp = false; setHat(); updateHUD(true);
}
function eatCotton(){
  P.floatT = 15; sfx.heal(); setTimeout(() => sfx.ability(), 150);
  burst(P.x, P.y + .7, ['#ffb3d9','#ffffff','#c9b8ff'], 26, 5, .4, .9);
  toast('🍭 棉花糖！15 秒內可以一直飄'); updateHUD(true);
}
function eatSnack(kind, fromBoss){
  const s = SNACKS[kind];
  const first = !SAVE.snacks[kind];
  SAVE.snacks[kind] = true; saveGame(); if(!fromBoss) snacksFound.add(kind);
  P.mouth = null; P.puffed = false;
  if(s.type === 'ability'){
    P.hp = Math.min(6, P.hp + 2);
    gainAbility(kind, true);
    burst(P.x, P.y+.6, [ABIL[kind].css,'#ffffff','#ffcf3f'], 30, 6, .38, .9);
    sfx.heal(); setTimeout(() => sfx.ability(), 160);
    toast(`${ABIL[kind].icon} 吃到${s.name}！獲得「${ABIL[kind].name}」`);
  } else {
    if(kind === 'beef'){ P.hp = 6; P.speedT = 8; }
    else if(kind === 'almond'){ P.bubble = true; }
    else P.hp = Math.min(6, P.hp + s.heal);
    sfx.heal(); burst(P.x, P.y+.6, ['#ffffff','#ff9ec4','#ffd76a'], 18, 4);
    toast(kind === 'beef' ? '🍲 牛肉湯！體力全滿＋加速' : kind === 'almond' ? '🥛 杏仁茶！護身泡泡' : `${s.name}！體力 +${s.heal}`);
  }
  if(first) setTimeout(() => toast(`📖 圖鑑新發現：${s.name}`), 1500);
  updateHUD(true);
}
function hurtPlayer(srcX, dmg=1){
  if(!P || P.dead || clearing || state !== 'playing') return;
  if(P.inv > 0 || P.stone || P.dashT > 0 || P.pound || P.spinT > 0) return;
  if(P.shieldUp && Math.sign(srcX - P.x) === P.face){ sfx.hit(); P.vx = -P.face*3; return; }
  if(P.bubble){ P.bubble = false; P.inv = 1.2; sfx.pop(); burst(P.x, P.y+.6, ['#9fe0ff','#ffffff'], 16, 4); updateHUD(true); return; }
  P.hp -= dmg; P.inv = 1.6;
  P.vx = (P.x < srcX ? -1 : 1) * 6; P.vy = 6;
  P.puffed = false; P.mouth = null; P.inhaling = false; P.atk = null; P.shieldUp = false;
  sfx.hurt(); burst(P.x, P.y+.5, ['#ff6b6b','#ffffff'], 12, 4); addShake(.28); hitStop = Math.max(hitStop, .1);
  updateHUD(true);
  if(P.hp <= 0) killPlayer();
}
// v2.5 掉進洞不會直接死：扣 2 格體力，回到最後站穩的地方
function pitFall(){
  const p = P;
  if(p.hp <= 2 || !p.safe){ p.hp = 0; killPlayer(); return; }
  p.hp -= 2; p.x = p.safe.x; p.y = p.safe.y + .2; p.vx = 0; p.vy = 0; p.inv = 2;
  p.puffed = false; p.pound = false; p.stone = false; p.dashT = 0; p.airJumps = 0; p.riding = null;
  sfx.hurt(); addShake(.25); burst(p.x, p.y + .6, ['#ffffff','#ffcf3f'], 14, 3); toast('掉下去了！扣 2 格體力'); updateHUD(true);
}
function killPlayer(){
  if(P.dead) return;
  P.dead = true; P.hp = 0; P.flipT = 0; state = 'dying'; deathT = 0; P.vy = 13; P.vx = 0;
  Music.stop(); sfx.die(); updateHUD(true);
}

/* 攻擊範圍判定（敵人＋魔王＋方塊） */
function hitArea(rect, dmg, srcX, o={}){
  let hits = 0;
  for(const e of enemies){
    if(e.dead || !aabb(rect, e)) continue;
    if(o.set){ if(o.set.has(e)) continue; o.set.add(e); }
    if(o.tick){ if(e.tickCD > 0) continue; e.tickCD = o.tick; }
    if(o.freeze && !e.d.invul) e.frozen = o.freeze;
    damageEnemy(e, dmg, srcX); hits++;
  }
  if(boss && arena && arena.active && !boss.dead && aabb(rect, boss)){
    if(o.set){ if(!o.set.has(boss)){ o.set.add(boss); damageBoss(dmg); hits++; } }
    else if(o.tick){ if(boss.tickCD <= 0){ boss.tickCD = o.tick; damageBoss(dmg); hits++; } }
    else { damageBoss(dmg); hits++; }
  }
  if(o.blocks) breakTilesInRect(rect.x - rect.w/2, rect.x + rect.w/2, rect.y, rect.y + rect.h, o.metal);
  return hits;
}
function breakTile(tx, ty, metal){
  const t = lvl.get(tx,ty);
  if(t !== BLOCK && !(metal && t === METAL)) return false;
  lvl.setT(tx,ty,EMPTY); removeTileMesh(tx,ty);
  burst(tx+.5, ty+.5, t === METAL ? ['#9aa6c0','#ffffff','#5a6480'] : ['#ffcf3f','#ffffff','#ffe9a8'], 12, 4); sfx.pop();
  return true;
}
function breakTilesInRect(x0,x1,y0,y1,metal){
  for(let tx=Math.floor(Math.min(x0,x1)); tx<=Math.floor(Math.max(x0,x1)); tx++)
    for(let ty=Math.floor(y0); ty<=Math.floor(y1); ty++) breakTile(tx,ty,metal);
}
function startAttack(type, dur){ P.atk = { type, t:0, dur, set:new Set() }; }

function updatePlayer(dt, first){
  const p = P;
  p.t += dt;
  for(const k of ['inv','atkCD','swallowT','landT','dashT','speedT','spinT','emoteT','floatT','laserT']) p[k] = Math.max(0, p[k] - dt);
  p.gliding = false;
  if(p.emoteT <= 0) p.emote = null;
  const atkPress = first && consume('atk'), jumpPress = first && consume('jump'), downPress = first && consume('down'), dropPress = first && consume('drop'), emotePress = first && consume('emote');
  if(emotePress && p.onGround && !p.mouth){ p.emote = p.emote === 'wave' ? 'dance' : 'wave'; p.emoteT = 2.2; }

  if(p.stone){
    p.stoneT += dt; p.vx = 0; p.vy = Math.max(p.vy - GRAV*1.8*dt, -24);
    const wasG = p.onGround; moveBody(p, dt);
    if(p.onGround && !wasG){ sfx.stone(); burst(p.x, p.y+.1, ['#c9c0b4','#8d8478'], 14, 3.5); addShake(.22); }
    hitArea({ x:p.x, w:p.w+.1, y:p.y-.05, h:p.h }, 3, p.x, { tick:.5 });
    if((atkPress && p.stoneT > .35) || p.stoneT > 4){ p.stone = false; sfx.pop(); }
    if(dropPress) dropAbility();
    if(p.y < -3){ pitFall(); }
    return;
  }

  const dir = (keys.right ? 1 : 0) - (keys.left ? 1 : 0);
  const ab = p.ability;
  const holdBreath = (ab === 'fire' || ab === 'ice' || ab === 'spark') && keys.atk && !p.puffed && !p.mouth;
  const cd0 = p.atkCD;
  if(atkPress){
    p.emote = null;
    if(p.puffed) exhale();
    else if(p.mouth) spitStar();
    else if(ab === 'sword'){ if(p.atkCD <= 0){ startAttack('slash', .26); p.atkCD = .32; sfx.slash(); } }
    else if(ab === 'rock'){ p.stone = true; p.stoneT = 0; p.vy = Math.min(p.vy, 0); p.puffed = false; sfx.stone(); return; }
    else if(ab === 'bomb'){ if(p.atkCD <= 0 && shots.filter(s => s.kind === 'bomb').length < 2){ const m = mouthPos(); spawnShot('bomb', m.x, m.y+.2, p.face*6.5 + p.vx*.3, 7, { friendly:true, dmg:4, life:2.4, r:.3, grav:22 }); p.atkCD = .4; sfx.puff(); } }
    else if(ab === 'noodle'){ if(p.atkCD <= 0){ startAttack('whip', .32); p.atkCD = .42; sfx.slash(); } }
    else if(ab === 'shrimp'){ if(p.atkCD <= 0 && shots.filter(s => s.kind === 'shrimp').length < 2){ const m = mouthPos(); spawnShot('shrimp', m.x, m.y, p.face*11, 0, { friendly:true, dmg:3, life:1.6, r:.32, homing:true }); p.atkCD = .3; sfx.spit(); } }
    else if(ab === 'coffin'){ if(p.atkCD <= 0){ p.dashT = .45; p.atkCD = .9; p.dashHit = new Set(); p.puffed = false; sfx.stone(); } }
    else if(ab === 'douhua'){ if(!p.onGround){ p.pound = true; p.puffed = false; p.vy = -22; p.dashHit = new Set(); sfx.flap(); } else if(p.atkCD <= 0){ shockwave(2.2); p.atkCD = .5; } }
    else if(ab === 'fish'){ if(p.atkCD <= 0 && shots.filter(s => s.kind === 'fish').length < 3){ const m = mouthPos(); spawnShot('fish', m.x, m.y+.2, p.face*7.5, 8, { friendly:true, dmg:2, life:1.8, r:.32, grav:22, maxBounces:2 }); p.atkCD = .28; sfx.puff(); } }
    else if(ab === 'mango'){ if(p.atkCD <= 0 && shots.filter(s => s.kind === 'ice').length < 3){ const m = mouthPos(); spawnShot('ice', m.x, m.y, p.face*12, 0, { friendly:true, dmg:2, life:1, r:.3, freeze:3 }); p.atkCD = .25; sfx.zap(); } }
    else if(ab === 'rouyuan'){ if(p.atkCD <= 0){ const m = mouthPos(); for(const v of [6, 8.5]) spawnShot('meatball', m.x, m.y+.1, p.face*v, 6, { friendly:true, dmg:2, life:2.6, r:.3, grav:24, maxBounces:6, bounceV:7 }); p.atkCD = .55; sfx.puff(); } }
    else if(ab === 'eel'){ if(p.atkCD <= 0){ p.spinT = .8; p.atkCD = 1.0; p.dashHit = null; sfx.slash(); } }
    else if(ab === 'oyster'){ if(p.atkCD <= 0 && !shots.some(s => s.kind === 'oyster')){ const m = mouthPos(); spawnShot('oyster', m.x, m.y, p.face*12, 0, { friendly:true, dmg:2, life:3, r:.4, boomerang:true }); p.atkCD = .3; sfx.slash(); } }
    else if(ab === 'zongzi'){ if(p.atkCD <= 0){ startAttack('hammer', .45); p.atkCD = .6; sfx.slash(); } }
    else if(ab === 'pengbing'){ if(p.atkCD <= 0){ blast(2.7); p.atkCD = .9; } }
    else if(ab === 'shuriken'){ if(p.atkCD <= 0){ const m = mouthPos(); for(const a of [-.2, 0, .2]) spawnShot('shuriken', m.x, m.y, p.face*13*Math.cos(a), 13*Math.sin(a), { friendly:true, dmg:2, life:.6, r:.28 }); p.atkCD = .35; sfx.slash(); } }
    else if(ab === 'arrow'){ if(p.atkCD <= 0){ const m = mouthPos(); spawnShot('arrow', m.x, m.y, p.face*17, 0, { friendly:true, dmg:3, life:.8, r:.25, pierce:true }); p.atkCD = .4; sfx.slash(); } }
    else if(ab === 'laser'){ if(p.atkCD <= 0){ fireLaser(); p.atkCD = .7; } }
    else if(ab === 'umbrella'){ if(p.atkCD <= 0){ startAttack('umbrella', .28); p.atkCD = .34; sfx.slash(); } }
    else if(ab === 'yoyo'){ if(p.atkCD <= 0 && !shots.some(s => s.kind === 'yoyo')){ const m = mouthPos(); spawnShot('yoyo', m.x, m.y, p.face*15, 0, { friendly:true, dmg:2, life:1.2, r:.32, boomerang:true, quick:true }); p.atkCD = .3; sfx.flap(); } }
    else if(ab === 'guoshao'){ if(p.atkCD <= 0){ if(!p.orbs.length) summonOrbs(); else launchOrbs(); p.atkCD = .3; } }
    else if(ab === 'wangguo'){ p.shieldUp = true; p.shieldT = 0; }
    else if(!ab) p.inhaleArmed = true;
  }
  if(p.atkCD > cd0 && !p.atk && p.dashT <= 0 && p.spinT <= 0) p.throwT = .22;
  p.throwT = Math.max(0, (p.throwT || 0) - dt);
  // 鍋燒意麵：魚丸繞著身體轉，碰到敵人會打、碰到子彈會擋掉
  if(p.orbs.length){
    if(ab !== 'guoshao') clearOrbs();
    else {
      p.orbT -= dt; p.orbA += dt*5.5;
      p.orbs.forEach((m, i) => {
        const a = p.orbA + i*Math.PI*2/p.orbs.length, ox = p.x + Math.cos(a)*1.3, oy = p.y + .7 + Math.sin(a)*1.05;
        m.position.set(ox, oy, .4); m.rotation.y += dt*6;
        if(p.orbT < 2) m.visible = Math.floor(p.orbT*8) % 2 === 0;
        hitArea({ x:ox, y:oy - .32, w:.64, h:.64 }, 2, p.x, { tick:.35 });
        for(const s of shots) if(!s.dead && !s.friendly && Math.hypot(s.x - ox, s.y - oy) < .55){ removeShot(s); burst(ox, oy, ['#ffffff','#ffe9b0'], 6, 2.5); sfx.pop(); }
      });
      if(p.orbT <= 0) clearOrbs(true);
    }
  }
  if(ab === 'wangguo' && p.shieldUp){
    p.shieldT += dt;
    if(!keys.atk){ p.shieldUp = false; if(p.shieldT > .12 && p.atkCD <= 0){ p.dashT = .22; p.dashHit = new Set(); p.atkCD = .5; sfx.hit(); } }
  }
  if(!keys.atk) p.inhaleArmed = false;
  p.inhaling = p.inhaleArmed && keys.atk && !p.mouth && !p.puffed && !ab;

  if(dir !== 0 && !p.inhaling && !holdBreath && !p.shieldUp && p.dashT <= 0) p.face = dir;
  let maxV = p.puffed ? 3.4 : p.mouth ? 4.3 : WALK*(p.speedT > 0 ? 1.4 : 1);
  if(p.inhaling || (holdBreath && ab !== 'spark')) maxV = p.onGround ? 0 : 1.5;
  if(holdBreath && ab === 'spark') maxV *= .45;
  if(p.shieldUp) maxV = 1.2;
  if(p.spinT > 0) maxV = 7;
  if(p.emote) maxV = 0;
  if(p.inv <= 1.3 && p.dashT <= 0) p.vx += clamp(dir*maxV - p.vx, -ACC*dt, ACC*dt);

  if(jumpPress && !p.inhaling){
    p.emote = null;
    if(p.onGround){ p.vy = JUMP_V*(ab === 'douhua' ? 1.3 : 1); p.jumpHeld = true; sfx.jump(); burst(p.x, p.y+.05, ['#ffffff'], 5, 2, .25, .3); }
    else if(!p.mouth && !p.pound && (p.airJumps < 1 || p.floatT > 0 || ab === 'pengbing')){
      // 平常只能兩段跳；吃了棉花糖（或椪餅能力）才能一直飄
      p.airJumps++;
      if(p.airJumps === 1 && !p.puffed){
        // 第二段跳：跟第一段一樣有力，會翻一圈，不會鼓起來慢慢飄
        p.vy = JUMP2_V; p.jumpHeld = false; p.flipT = .42; p.flipDir = p.face; sfx.jump(); burst(p.x, p.y + .2, ['#ffffff','#fff3a0'], 8, 3, .28, .35);
      } else { if(!p.puffed){ p.puffed = true; sfx.puff(); } p.vy = FLAP_V; sfx.flap(); burst(p.x - p.face*.3, p.y + .3, ['#ffffff'], 3, 2, .3, .35); }
    } else if(!p.mouth) sfx.deny();
  }
  if(!keys.jump && p.jumpHeld && p.vy > 0 && !p.puffed){ p.vy *= 0.5; p.jumpHeld = false; }
  if(p.pound){ p.vy = -22; p.vx = 0; }
  else if(p.puffed){ p.vy -= GRAV*0.42*dt; if(p.vy < -PUFF_FALL) p.vy = -PUFF_FALL; }
  else if(ab === 'umbrella' && keys.jump && p.vy < 0){ p.vy -= GRAV*.35*dt; if(p.vy < -2.2) p.vy = -2.2; p.gliding = true; }
  else { p.vy -= GRAV*(p.vy < 0 ? FALL_K : 1)*dt; if(p.vy < -MAX_FALL) p.vy = -MAX_FALL; }
  p.flipT = Math.max(0, p.flipT - dt);
  if(p.dashT > 0){ p.vx = p.face*(ab === 'wangguo' ? 9 : 12); if(p.vy < -2) p.vy = -2; if(Math.random() < .7) emit(p.x - p.face*.5, p.y + .3 + Math.random()*.5, 0, -p.face*2, 1, 0, .35, ab === 'wangguo' ? '#f6e7cc' : '#e7b06a', .22); }

  const wasGround = p.onGround;
  moveBody(p, dt);
  if(p.y + p.h > LH - .5){ p.y = LH - .5 - p.h; p.vy = Math.min(p.vy, 0); }
  if(p.onGround){
    p.jumpHeld = false; p.airJumps = 0;
    // 記住最後站穩的地方（腳下左右都是實心地面），掉進洞時回到這裡
    if(!p.riding){ const fy = Math.round(p.y) - 1; if(solidT(lvl.get(Math.floor(p.x - .5), fy)) && solidT(lvl.get(Math.floor(p.x + .5), fy))) p.safe = { x:p.x, y:p.y }; }
    if(!wasGround){ p.landT = .15; if(p.puffed) exhale(); if(p.pound){ p.pound = false; shockwave(3.2); } else if(p.vy === 0) burst(p.x, p.y+.05, ['#ffffff'], 4, 1.5, .22, .25); }
  }

  if(downPress && p.mouth) swallow();
  if(dropPress && p.ability) dropAbility();
  if(p.inhaling) doInhale(dt);
  if(holdBreath) doBreath(dt); else p.breathT = 0;
  if(p.atk) doMelee(dt);
  if(p.dashT > 0 || p.pound) hitArea({ x:p.x + p.face*.2, w:p.w+.3, y:p.y-.05, h:p.h }, 3, p.x, { set:p.dashHit || (p.dashHit = new Set()), blocks:p.dashT > 0 });
  if(p.spinT > 0){
    hitArea({ x:p.x, w:2.8, y:p.y-.2, h:1.6 }, 1, p.x, { tick:.15 });
    for(let i=0;i<2;i++){ const a = p.t*20 + i*Math.PI; emit(p.x + Math.cos(a)*1.2, p.y + .6 + Math.sin(a*.5)*.3, Math.sin(a)*1.2, -Math.sin(a)*3, .5, Math.cos(a)*3, .3, i ? '#8a5a32' : '#f0cf7a', .28); }
  }
  // 冰凍敵人：踢出去
  for(const e of enemies){
    if(e.dead || e.frozen <= 0 || e.kicked || !aabb(p, e)) continue;
    e.kicked = true; e.frozen = 4; e.vx = p.face*11; e.vy = 2; sfx.hit();
  }
  // 尖刺、掉落
  const tx0 = Math.floor(p.x - p.w/2 + .1), tx1 = Math.floor(p.x + p.w/2 - .1), ty = Math.floor(p.y + .2);
  for(let tx=tx0; tx<=tx1; tx++) if(lvl.get(tx,ty) === SPIKE){ hurtPlayer(p.x - p.face); if(!P.dead) p.vy = 9; break; }
  if(p.y < -3){ pitFall(); return; }

  // 彈簧
  for(const s of springs){
    if(p.vy <= 0 && Math.abs(p.x - s.x) < .7 && p.y <= s.y + .55 && p.y >= s.y - .2){
      p.vy = 21; p.puffed = false; p.pound = false; p.airJumps = 0; s.squash = 1; sfx.spring(); burst(s.x, s.y + .5, ['#ffffff','#ffcf3f'], 8, 3);
    }
  }
  // 存檔點
  for(const c of checkpoints){
    if(!c.active && Math.abs(p.x - c.x) < .8 && p.y < c.y + 2.5){
      c.active = true; respawnPt = { x:c.x, y:c.y }; sfx.flag(); toast('🚩 存檔！'); burst(c.x, c.y + 2, ['#3fc6a4','#ffffff','#ffcf3f'], 20, 5);
    }
  }
  // 魔王場地
  if(arena && !arena.active && !boss.dead && p.x > arena.x0 + 3) startBoss();
  if(arena && arena.active && !boss.dead) p.x = clamp(p.x, arena.x0 + .5, arena.x1 + .5);

  // 道具
  for(const it of items){
    if(it.dead || !aabb(p, it)) continue;
    if(it.type === 'star'){ removeItem(it); collected.add(it.id); starCount++; levelStars++; sfx.coin(); burst(it.x, it.y+.3, ['#ffd43b','#ffffff'], 6, 2.5, .22, .3);
      if(starCount % 40 === 0){ lives++; toast('星星 40 顆！生命 +1'); } updateHUD(true); }
    else if(SNACKS[it.type]){ removeItem(it); if(!it.drop) collected.add(it.id); eatSnack(it.type, it.drop); }
    else if(it.type === 'life'){ removeItem(it); collected.add(it.id); lives++; sfx.heal(); toast('生命 +1'); updateHUD(true); }
    else if(it.type === 'cotton'){ removeItem(it); collected.add(it.id); eatCotton(); }
  }
  if(door && aabb(p, door)) levelClear();
  p.idleT = (p.onGround && Math.abs(p.vx) < .3 && !keys.atk) ? p.idleT + dt : 0;
  if(p.idleT > 7 && !p.emote){ p.emote = 'wave'; p.emoteT = 2; p.idleT = 0; }
}

function doInhale(dt){
  const p = P, f = p.face, m = mouthPos(), cy = m.y, range = 3.9;
  if(Math.random() < .9){
    const d = .8 + Math.random()*(range-.8), oy = (Math.random()-.5)*(1 + d*.35);
    emit(p.x + f*d, cy + oy, (Math.random()-.5)*.5, -f*(5 + d*2), -oy*3, 0, .25, Math.random()<.5 ? '#ffffff' : '#bfe6ff', .18);
  }
  p.inhaleSnd -= dt; if(p.inhaleSnd <= 0){ sfx.inhale(); p.inhaleSnd = .18; }
  const inZone = (x, y) => { const dx = (x - p.x)*f, dy = y - cy; return dx > 0 && dx < range && Math.abs(dy) < 1.0 + dx*.2 && clearPath(p.x, x, cy) ? dx : -1; };
  for(const e of enemies){
    if(e.dead || e.d.noInhale) continue;
    const dx = inZone(e.x, e.y + e.h/2); if(dx < 0) continue;
    e.pulled = true; e.frozen = 0; e.kicked = false;
    const nx = e.x - f*(5 + (range-dx)*4)*dt;
    if(!solidT(lvl.get(Math.floor(nx - f*e.w/2), Math.floor(e.y + .3)))) e.x = nx;
    e.y += clamp(cy - e.h/2 - e.y, -4*dt, 4*dt);
    if(dx < .85){ eat(e.d.ability || 'none'); killQuiet(e); enemiesDefeated++; return; }
  }
  for(const it of items){
    if(it.dead || (it.type !== 'abil' && it.type !== 'boulder')) continue;
    const dx = inZone(it.x, it.y + .35); if(dx < 0) continue;
    it.x -= f*(6 + (range-dx)*4)*dt; it.y += clamp(cy - .35 - it.y, -4*dt, 4*dt); it.pulled = true;
    if(dx < .85){ removeItem(it); if(it.type === 'abil'){ p.inhaleArmed = false; gainAbility(it.ability); } else eat('none'); return; }
  }
  for(let d=1; d<=2; d++){
    const tx = Math.floor(p.x + f*(p.w/2 + d - .5));
    for(const ty of [Math.floor(cy), Math.floor(p.y + .1)]){
      if(lvl.get(tx,ty) === BLOCK && clearPath(p.x, tx + .5, ty + .5)){ lvl.setT(tx,ty,EMPTY); removeTileMesh(tx,ty); burst(tx+.5,ty+.5,['#ffcf3f','#ffffff'],8,3); eat('none'); return; }
    }
  }
}
function eat(kind){ P.mouth = kind; P.inhaling = false; P.inhaleArmed = false; sfx.gulp(); }

function doBreath(dt){
  const p = P, f = p.face, ab = p.ability, m = mouthPos();
  if(ab === 'spark'){
    for(let i=0;i<3;i++){ const a = Math.random()*Math.PI*2, r = .6 + Math.random()*1.1; emit(p.x + Math.cos(a)*r, p.y + .6 + Math.sin(a)*r, .3, 0, 0, 0, .12, Math.random()<.5 ? '#fff27a' : '#ffffff', .3); }
    p.breathT -= dt; if(p.breathT <= 0){ sfx.zap(); p.breathT = .09; }
    hitArea({ x:p.x, w:3.4, y:p.y - .6, h:2.4 }, 1, p.x, { tick:.2 });
    return;
  }
  const fire = ab === 'fire';
  for(let i=0;i<3;i++){
    const sp = 7 + Math.random()*4;
    emit(m.x, m.y + (Math.random()-.5)*.2, (Math.random()-.5)*.4, f*sp, (Math.random()-.5)*2.4 + (fire ? .8 : 0), 0, .3,
         fire ? ['#ff6a2b','#ffb02e','#ffe45c'][i] : ['#58c8ff','#e6f7ff','#9fe3ff'][i], .34, fire ? -3 : 1, 1);
  }
  p.breathT -= dt; if(p.breathT <= 0){ sfx.breath(); p.breathT = .12; }
  const x0 = p.x + f*.3, x1 = p.x + f*2.7;
  hitArea({ x:(x0+x1)/2, w:Math.abs(x1-x0), y:p.y - .1, h:1.2 }, 1, p.x, { tick:.22, freeze: fire ? 0 : 2.5, blocks: fire });
}
function doMelee(dt){
  const p = P, a = p.atk, f = p.face;
  a.t += dt; const k = a.t/a.dur;
  if(a.type === 'slash') hitArea({ x:p.x + f*1.0, w:1.9, y:p.y - .2, h:1.6 }, 2, p.x, { set:a.set, blocks:true });
  else if(a.type === 'umbrella') hitArea({ x:p.x + f*.9, w:1.7, y:p.y - .1, h:1.5 }, 2, p.x, { set:a.set, blocks:true });
  else if(a.type === 'whip'){ const reach = .4 + 3.0*Math.sin(Math.min(1, k*1.6)*Math.PI/2); hitArea({ x:p.x + f*(.3 + reach/2 + .2), w:reach, y:p.y + .15, h:.85 }, 2, p.x, { set:a.set, blocks:true }); }
  else if(a.type === 'hammer' && k > .45 && !a.impact){
    a.impact = true;
    hitArea({ x:p.x + f*1.1, w:1.8, y:p.y - .3, h:1.9 }, 4, p.x, { set:a.set, blocks:true, metal:true });
    breakTilesInRect(p.x + f*.6, p.x + f*1.6, p.y - .9, p.y - .1, true);
    sfx.boom(); addShake(.3); burst(p.x + f*1.2, p.y + .1, ['#d8c08a','#ffffff','#4f8a32'], 16, 5);
  }
  if(a.t >= a.dur) p.atk = null;
}
function fireLaser(){
  const p = P, f = p.face, m = mouthPos();
  let len = 0;
  for(; len < 10; len += .25){ const t = lvl.get(Math.floor(m.x + f*len), Math.floor(m.y)); if(solidT(t) && t !== BLOCK) break; }
  hitArea({ x:m.x + f*len/2, w:len, y:m.y - .3, h:.6 }, 3, p.x, { set:new Set(), blocks:true });
  const beam = new THREE.Mesh(new THREE.CylinderGeometry(.12,.12,Math.max(.1,len),10), new THREE.MeshBasicMaterial({ color:0x9ff6ff, transparent:true, opacity:.95 }));
  beam.rotation.z = Math.PI/2; beam.position.set(m.x + f*len/2, m.y, .1); scene.add(beam);
  fx.push({ mesh:beam, t:0, life:.25, update:(fo, k) => { fo.mesh.scale.x = fo.mesh.scale.z = 1 + Math.sin(k*40)*.3; fo.mesh.material.opacity = .95*(1-k); if(k >= 1){ fo.mesh.geometry.dispose(); fo.mesh.material.dispose(); } } });
  for(let i=0;i<10;i++) emit(m.x + f*Math.random()*len, m.y, .2, 0, (Math.random()-.5)*2, 0, .3, Math.random()<.5 ? '#9ff6ff' : '#ffffff', .25);
  sfx.zap(); sfx.zap(); addShake(.08);
}
function shockwave(r){
  const p = P; p.dashHit = new Set();
  sfx.stone(); sfx.boss(); addShake(.35);
  for(let i=0;i<26;i++){ const s = (i%2 ? 1 : -1)*(4 + Math.random()*5); emit(p.x, p.y + .1, (Math.random()-.5), s, 1 + Math.random()*2, 0, .45, i%3 ? '#fffbf0' : '#a0662e', .32, 4, 2); }
  hitArea({ x:p.x, w:r*2, y:p.y - .3, h:1.8 }, 3, p.x, { set:new Set() });
  for(let tx=Math.floor(p.x - r); tx<=Math.floor(p.x + r); tx++) breakTile(tx, Math.floor(p.y), false);
}
function blast(r){
  const p = P; sfx.boom(); addShake(.25); p.blastT = .35;
  ring(p.x, p.y + .6, '#ffd28a', 24, r*3, .35); ring(p.x, p.y + .6, '#ffffff', 16, r*2.2, .3);
  hitArea({ x:p.x, w:r*2, y:p.y + .6 - r, h:r*2 }, 3, p.x, { set:new Set(), blocks:true });
}
function explode(x, y, r, dmg, friendly){
  sfx.boom(); addShake(friendly ? .3 : .25);
  burst(x, y, ['#ffb02e','#ff6a2b','#ffe45c','#3a3f5c'], 26, 6, .45, .7);
  const s = new THREE.Mesh(G.sphere, new THREE.MeshBasicMaterial({ color:0xffd07a, transparent:true, opacity:.8, depthWrite:false }));
  s.position.set(x, y, 0); s.scale.setScalar(.2); scene.add(s);
  fx.push({ mesh:s, t:0, life:.3, update:(f, k) => { f.mesh.scale.setScalar(.2 + k*r); f.mesh.material.opacity = .8*(1-k); } });
  const rect = { x, w:r*2, y:y - r, h:r*2 };
  if(friendly) hitArea(rect, dmg, x, { set:new Set(), blocks:true, metal:true });
  else if(P && !P.dead && aabb(rect, P)) hurtPlayer(x, 1);
}

/* =====================================================================
   敵人
   ===================================================================== */
function spawnEnemy(type, x, y, opt={}){
  const d = ENEMY[type];
  const m = addOutline(d.build()); m.traverse(o => { if(o.isMesh && !o.userData.isOutline) o.castShadow = true; });
  const mats = [];
  m.traverse(o => { if(o.isMesh && !o.userData.isOutline && o.material && o.material.isMeshToonMaterial){ o.material = o.material.clone(); o.material.userData.em = o.material.emissive.getHex(); mats.push(o.material); } });
  const ice = new THREE.Mesh(G.rbox, new THREE.MeshToonMaterial({ color:0xbfeaff, transparent:true, opacity:.55, gradientMap:gradTex }));
  ice.scale.set(1.05,1.05,1.05); ice.position.y = .5; ice.visible = false; m.add(ice);
  scene.add(m);
  const e = { type, d, x, y, homeX:x, baseY:y, vx:0, vy:0, w:d.w, h:d.h, dir:opt.dir || -1, hp:d.hp, t:Math.random()*5,
              mesh:m, mats, ice, frozen:0, hurtT:0, tickCD:0, shootT:1.5+Math.random(), slashT:0, slashCD:0, pulled:false, onGround:false, dead:false,
              blinkT:2 + Math.random()*3, hopT:1 + Math.random(), active: d.move !== 'drift', auraT:0, auraOn:0, kicked:false, minion:!!opt.minion, passive:!!opt.passive };
  enemies.push(e); return e;
}
function disposeEnemy(e){ scene.remove(e.mesh); e.mats.forEach(m => m.dispose()); e.ice.material.dispose(); }
function killEnemy(e){
  if(e.dead) return; e.dead = true; enemiesDefeated++;
  burst(e.x, e.y + e.h/2, ['#ffffff','#ffcf3f','#ff9ec4'], 22, 6, .36);
  for(let i=0;i<5;i++){ const a = i/5*Math.PI*2; emit(e.x, e.y + e.h/2, .3, Math.cos(a)*7, Math.sin(a)*7, 0, .35, '#fff6a0', .5, 0, 4); }
  disposeEnemy(e); sfx.pop(); hitStop = Math.max(hitStop, .06); addShake(.12);
}
function killQuiet(e){ e.dead = true; disposeEnemy(e); }
function damageEnemy(e, dmg, srcX){
  if(e.dead) return;
  if(e.d.invul){ if(e.hurtT<=0){ sfx.hit(); e.hurtT = 0.3; } return; }
  e.hp -= dmg; e.hurtT = 0.25;
  if(!e.kicked){ e.vx = (e.x >= srcX ? 1 : -1) * 3; if(e.d.move === 'walk' || e.d.move === 'hop') e.vy = 3; }
  sfx.hit(); burst(e.x, e.y + e.h/2, ['#ffffff','#ffe066'], 8, 3.5, .28, .35); addShake(.06);
  if(e.hp <= 0) killEnemy(e);
}
function updateEnemy(e, dt){
  e.t += dt; e.hurtT = Math.max(0, e.hurtT - dt); e.frozen = Math.max(0, e.frozen - dt); e.slashCD -= dt; e.tickCD -= dt;
  if(e.pulled){ e.pulled = false; return; }
  const near = Math.abs(e.x - camX) < 17 || (arena && arena.active);
  if(!near && !e.kicked) return;
  if(!e.active){ if(P && Math.abs(P.x - e.x) < 12) e.active = true; else return; }
  if(e.kicked){
    e.vy -= GRAV*dt; moveBody(e, dt, { noMovers:true }); e.vx = Math.sign(e.vx || 1)*11;
    if(Math.random() < .5) emit(e.x, e.y + .3, 0, -e.vx*.1, 1, 0, .3, '#e6f7ff', .25);
    for(const o of enemies){ if(o !== e && !o.dead && aabb(o, e)){ damageEnemy(o, 3, e.x); killEnemy(e); return; } }
    if(boss && arena && arena.active && !boss.dead && aabb(e, boss)){ damageBoss(3); killEnemy(e); return; }
    if(e.hitWall || e.y < -4){ killEnemy(e); }
    return;
  }
  if(e.frozen > 0){ e.vx *= .9; if(e.d.move !== 'fly' && e.d.move !== 'ghost' && e.d.move !== 'bob'){ e.vy -= GRAV*dt; moveBody(e, dt); } return; }
  const mv = e.d.move;
  if(mv === 'walk'){
    let spd = e.d.speed; if((e.type === 'spark' && e.auraOn > 0) || e.charge > 0 || e.drawT > 0) spd = 0;
    if(e.hurtT <= 0) e.vx = e.dir*spd;
    e.vy -= GRAV*dt; if(e.vy < -MAX_FALL) e.vy = -MAX_FALL;
    moveBody(e, dt);
    if(e.hurtT <= 0 && (e.hitWall || (e.onGround && !groundAhead(e)))) e.dir *= -1;
  } else if(mv === 'hop'){
    e.vy -= GRAV*dt; moveBody(e, dt);
    if(e.onGround){ e.vx *= .8; e.hopT -= dt;
      if(e.hopT <= 0){ const toP = P && Math.abs(P.x - e.x) < 10 ? Math.sign(P.x - e.x) : (Math.random() < .5 ? -1 : 1); e.dir = toP || 1; e.vy = 9.5; e.vx = e.dir*3.2; e.hopT = 1.2 + Math.random()*.7; } }
    if(e.hitWall) e.dir *= -1;
  } else if(mv === 'fly'){
    e.x += e.dir*e.d.speed*dt; e.y = e.baseY + Math.sin(e.t*2.2)*.7;
    if(Math.abs(e.x - e.homeX) > 4) e.dir = e.x > e.homeX ? -1 : 1;
  } else if(mv === 'bob'){
    e.y = e.baseY + Math.sin(e.t*1.5)*1.2;
  } else if(mv === 'drift'){
    if(!e.landed){ e.vy = -1.1; e.y += e.vy*dt; e.x += Math.sin(e.t*1.4)*.8*dt; const t = lvl.get(Math.floor(e.x), Math.floor(e.y)); if(solidT(t) || t === ONEWAY){ e.y = Math.floor(e.y) + 1; e.landed = true; } if(e.y < -4) killQuiet(e); }
    else { e.vx = e.dir*.8; e.vy -= GRAV*dt; moveBody(e, dt); if(e.hitWall || (e.onGround && !groundAhead(e))) e.dir *= -1; }
  } else if(mv === 'ghost'){
    if(P && !P.dead && Math.abs(P.x - e.x) < 9){ const dx = P.x - e.x, dy = (P.y + .3) - e.y, L = Math.hypot(dx, dy) || 1; e.x += dx/L*e.d.speed*dt; e.baseY += dy/L*e.d.speed*dt*.6; e.dir = Math.sign(dx) || 1; }
    e.y = e.baseY + Math.sin(e.t*2)*.3;
  }
  if(e.y < -4){ killQuiet(e); return; }
  if(P && !P.dead){
    const dxp = P.x - e.x, adx = Math.abs(dxp), ady = Math.abs(P.y - e.y);
    if(e.type === 'flame' && !e.passive){ e.shootT -= dt; if(e.shootT <= 0 && adx < 7 && ady < 2.5){ e.dir = Math.sign(dxp) || 1; spawnShot('fireball', e.x + e.dir*.5, e.y + .5, e.dir*5, 0, { life:1.6, dmg:1, r:.22 }); e.shootT = 2.8; sfx.breath(); } }
    if(e.type === 'knight'){
      if(e.slashCD <= 0 && adx < 1.9 && ady < 1.3){ e.dir = Math.sign(dxp) || 1; e.slashT = .3; e.slashCD = 1.7; sfx.slash(); }
      if(e.slashT > 0){ e.slashT -= dt; if(aabb({ x:e.x + e.dir*.9, w:1.2, y:e.y, h:1.1 }, P)) hurtPlayer(e.x); }
    }
    if(e.type === 'spark'){ e.auraT -= dt; if(e.auraT <= 0 && adx < 6){ e.auraOn = 1.1; e.auraT = 3.2; sfx.zap(); } if(e.auraOn > 0){ e.auraOn -= dt; if(Math.hypot(dxp, P.y + .5 - e.y - .45) < 1.5) hurtPlayer(e.x); if(Math.random() < .5) emit(e.x + (Math.random()-.5)*2.4, e.y + .45 + (Math.random()-.5)*2.4, .2, 0, 0, 0, .1, '#fff27a', .25); } }
    if(e.type === 'bomber'){ e.shootT -= dt; if(e.shootT <= 0 && adx < 8 && ady < 3){ e.dir = Math.sign(dxp) || 1; const t = .9; spawnShot('bombH', e.x, e.y + 1, dxp/t, 9, { life:2.5, dmg:1, r:.28, grav:20 }); e.shootT = 3; sfx.puff(); } }
    if(e.type === 'cannon'){ e.shootT -= dt; if(Math.sign(dxp) !== e.dir && adx < 8){ e.turnT = (e.turnT || 0) + dt; if(e.turnT > 1.2){ e.dir *= -1; e.turnT = 0; } } if(e.shootT <= 0 && adx < 11 && Math.sign(dxp) === e.dir && ady < 3){ spawnShot('cannonball', e.x + e.dir*.6, e.y + .62, e.dir*6.5, 0, { life:3, dmg:1, r:.25 }); e.shootT = 2.6; sfx.boom(); e.recoil = .2; } }
    if(e.type === 'ninja'){ e.shootT -= dt; if(e.onGround && Math.random() < dt*.4){ e.vy = 9; } if(e.shootT <= 0 && adx < 7 && ady < 2.5){ e.dir = Math.sign(dxp) || 1; spawnShot('shurikenH', e.x + e.dir*.5, e.y + .5, e.dir*7, 0, { life:1.4, dmg:1, r:.22 }); e.shootT = 2.4; sfx.slash(); } }
    if(e.type === 'archer'){ e.shootT -= dt; if(e.shootT <= 0 && adx < 9 && ady < 2){ e.dir = Math.sign(dxp) || 1; e.drawT = .5; e.shootT = 2.8; } if(e.drawT > 0){ e.drawT -= dt; if(e.drawT <= 0){ spawnShot('arrowH', e.x + e.dir*.5, e.y + .55, e.dir*9, 0, { life:1.5, dmg:1, r:.2 }); sfx.slash(); } } }
    if(e.type === 'laserbot'){
      e.shootT -= dt;
      if(e.shootT <= 0 && !e.charge && adx < 8 && ady < 1.5){ e.dir = Math.sign(dxp) || 1; e.charge = .9; e.shootT = 3.5; sfx.zap(); }
      if(e.charge > 0){ e.charge -= dt; if(Math.random() < .5) emit(e.x + e.dir*.45, e.y + .55, .3, 0, 0, 0, .15, '#ff5a7a', .3);
        if(e.charge <= 0){ e.charge = 0; const len = 8, y = e.y + .55;
          const beam = new THREE.Mesh(new THREE.CylinderGeometry(.1,.1,len,8), new THREE.MeshBasicMaterial({ color:0xff5a7a, transparent:true, opacity:.9 }));
          beam.rotation.z = Math.PI/2; beam.position.set(e.x + e.dir*(.4 + len/2), y, .1); scene.add(beam);
          fx.push({ mesh:beam, t:0, life:.35, update:(fo,k) => { fo.mesh.material.opacity = .9*(1-k); if(k >= 1){ fo.mesh.geometry.dispose(); fo.mesh.material.dispose(); } } });
          sfx.zap(); if(aabb({ x:e.x + e.dir*(.4 + len/2), w:len, y:y - .25, h:.5 }, P)) hurtPlayer(e.x); } }
    }
    if(e.type === 'yoyokid'){ if(e.slashCD <= 0 && adx < 2.8 && ady < 1.3){ e.dir = Math.sign(dxp) || 1; e.slashT = .45; e.slashCD = 1.8; sfx.flap(); }
      if(e.slashT > 0){ e.slashT -= dt; if(aabb({ x:e.x + e.dir*1.4, w:2.4, y:e.y + .2, h:.6 }, P)) hurtPlayer(e.x); } }
    if(aabb(P, e) && !P.stone) hurtPlayer(e.x);
  }
}

/* =====================================================================
   道具、投射物、特效
   ===================================================================== */
function spawnItem(type, x, y, extra={}){
  let m;
  if(type === 'star'){ m = mesh(G.star, toon(0xffd43b,{ emissive:0x7a5a00 }), .26,.26,.26); }
  else if(SNACKS[type]){ m = new THREE.Group(); const s = snackModel(type); s.rotation.x = .35; s.scale.multiplyScalar(1.15); m.add(s); const lb = textLabel(SNACKS[type].name); lb.position.y = 1.3; m.add(lb); }
  else if(type === 'life'){ m = mesh(G.heart, toon(0xff7aa8,{ emissive:0x661133 }), .3,.3,.3); }
  else if(type === 'cotton'){ m = new THREE.Group(); m.add(mesh(G.cyl, toon(0xf2e6d0), .03,.6,.03, 0,.3,0)); for(const [x,y,r,c] of [[0,.82,.3,0xffb3d9],[.18,.72,.2,0xffc9e6],[-.17,.74,.22,0xc9b8ff],[0,1.02,.18,0xffd6ec]]) m.add(mesh(G.sphere, toon(c), r,r*.9,r, x,y,0)); const lb = textLabel('棉花糖'); lb.position.y = 1.45; m.add(lb); }
  else if(type === 'abil'){ m = mesh(G.star, toon(ABIL[extra.ability].color,{ emissive:0x333333 }), .38,.38,.38); }
  else if(type === 'boulder'){ m = new THREE.Group(); m.add(mesh(G.dodeca, toon(0x8f8aa3), .38,.36,.36, 0,.38,0)); }
  if(type !== 'snack') addOutline(m, .04);
  scene.add(m);
  const it = { type, x, y, baseY:y, vx:0, vy:0, w:.75, h:.75, t:Math.random()*6, mesh:m, life: extra.life || Infinity, dead:false, onGround:false, ...extra };
  items.push(it); return it;
}
function removeItem(it){ it.dead = true; scene.remove(it.mesh); }
function updateItems(dt){
  for(const it of items){
    if(it.dead) continue;
    it.t += dt;
    if(it.pulled){ it.pulled = false; continue; }
    if(it.drop){
      it.vy = Math.max(it.vy - GRAV*.3*dt, -4.5);
      if(!it.onGround){ if(Math.random() < .4) emit(it.x + (Math.random()-.5)*.5, it.y + .5, .2, 0, .5, 0, .5, pick(['#ffe14d','#ffffff','#ff9ec4']), .22); }
      const wasG = it.onGround; moveBody(it, dt);
      if(it.onGround && !wasG && !it.landed){ it.landed = true; burst(it.x, it.y + .2, ['#ffe14d','#ffffff'], 10, 3); sfx.coin(); }
      it.life -= dt;
      if(it.life <= 0 || it.y < -4){ if(it.life <= 0) burst(it.x, it.y + .5, ['#ffffff'], 8, 2); removeItem(it); }
      continue;
    }
    if(it.type === 'abil' || it.type === 'boulder'){
      it.vy -= GRAV*dt; const wasG = it.onGround;
      const vx0 = it.vx; moveBody(it, dt);
      if(it.type === 'abil'){ if(it.onGround) it.vy = 6.5; if(it.hitWall) it.vx = -(vx0 || 3); }
      else { if(it.onGround){ it.vx *= .8; if(!wasG) burst(it.x, it.y, ['#c9c3e6'], 6, 2); }
        if(P && !P.dead && !it.onGround && it.vy < -3 && aabb(it, P)) hurtPlayer(it.x); }
      it.life -= dt;
      if(it.life <= 0 || it.y < -4) removeItem(it);
    }
  }
}

function spawnShot(kind, x, y, vx, vy, opt={}){
  let m;
  if(kind === 'star'){ m = mesh(G.star, toon(0xffe14d,{ emissive:0x997700 }), .45,.45,.45); }
  else if(kind === 'puff'){ m = new THREE.Mesh(G.sphere, new THREE.MeshBasicMaterial({ color:0xffffff, transparent:true, opacity:.75 })); m.scale.setScalar(.25); m.userData.ownMat = true; }
  else if(kind === 'fireball'){ m = mesh(G.sphere, toon(0xff7a2b,{ emissive:0xcc4400 }), .22,.22,.22); }
  else if(kind === 'cannonball'){ m = mesh(G.sphere, toon(0x2f2a40), .25,.25,.25); }
  else if(kind === 'bomb' || kind === 'bombH'){ m = new THREE.Group(); m.add(mesh(G.sphere, toon(kind === 'bomb' ? 0x3a3f5c : 0x5a2a3a), .26,.26,.26)); m.add(mesh(G.sphereLo, toon(0xff8a2b,{ emissive:0xcc4400 }), .07,.07,.07, 0,.3,0)); }
  else if(kind === 'shrimp'){ m = new THREE.Group(); const r = mesh(G.cyl, toon(0xe7a43c,{ emissive:0x553300 }), .14,.55,.14); r.rotation.z = Math.PI/2; m.add(r); addc(m, mesh(G.cone, toon(0xff6a3d), .09,.16,.09, -.34,0,0)).rotation.z = Math.PI/2; }
  else if(kind === 'fish'){ m = new THREE.Group(); m.add(mesh(G.sphere, toon(0xcfd8e2), .3,.13,.1)); addc(m, mesh(G.cone, toon(0x9aa9ba), .12,.18,.05, -.34,0,0)).rotation.z = Math.PI/2; m.add(mesh(G.sphereLo, basic(0x1d1d2b), .03,.03,.03, .2,.04,.08)); }
  else if(kind === 'ice'){ m = new THREE.Group(); m.add(mesh(G.rbox, toon(0xd6f4ff,{ emissive:0x224466 }), .36,.36,.36)); m.add(mesh(G.rbox, toon(0xffb52e), .2,.2,.2, 0,.2,0)); }
  else if(kind === 'meatball'){ m = mesh(G.sphere, toon(0xeccba0), .26,.2,.26); m.add(mesh(G.sphere, toon(0xb8452f), .8,.4,.8, 0,.6,0)); }
  else if(kind === 'oyster'){ m = new THREE.Group(); m.add(mesh(G.cyl, toon(0xf2d36b), .42,.08,.42)); m.add(mesh(G.sphereLo, toon(0x9a9690), .1,.06,.1, .15,.06,.1)); m.add(mesh(G.sphereLo, toon(0xe0583a), .12,.04,.12, -.1,.06,-.1)); }
  else if(kind === 'wind'){ m = new THREE.Mesh(new THREE.TorusGeometry(.35,.09,6,18), new THREE.MeshBasicMaterial({ color:0xeef2ff, transparent:true, opacity:.9 })); m.userData.ownGeo = true; m.userData.ownMat = true; }
  else if(kind === 'wave'){ m = mesh(G.cone, toon(0xffb02e,{ emissive:0xaa4400 }), .3,.7,.3); }
  else if(kind === 'shuriken' || kind === 'shurikenH'){ m = new THREE.Group(); const c = kind === 'shuriken' ? 0xcfd6e6 : 0x5a5f7a; m.add(mesh(G.box, toon(c), .55,.14,.06)); m.add(mesh(G.box, toon(c), .14,.55,.06)); addc(m, mesh(G.cyl, toon(0x3a3f5c), .08,.08,.08)).rotation.x = Math.PI/2; }
  else if(kind === 'arrow' || kind === 'arrowH'){ m = new THREE.Group(); const sh = mesh(G.cyl, toon(0x9a6a3a), .03,.8,.03); sh.rotation.z = Math.PI/2; m.add(sh); const hd = mesh(G.cone, toon(0xcfd6e6), .08,.2,.08, .45,0,0); hd.rotation.z = -Math.PI/2; m.add(hd); m.add(mesh(G.box, toon(kind === 'arrow' ? 0xff6b6b : 0x6a3a9a), .16,.14,.02, -.36,0,0)); }
  else if(kind === 'fishball'){ m = new THREE.Group(); m.add(mesh(G.sphere, toon(0xfbf6ea), .3,.28,.3)); m.add(mesh(G.sphereLo, toon(0xe8d8b8), .1,.04,.1, 0,.26,0)); }
  else if(kind === 'yoyo'){ m = new THREE.Group(); for(const z of [-.06,.06]){ const d = mesh(G.cyl, toon(0xff6b9a), .24,.07,.24, 0,0,z); d.rotation.x = Math.PI/2; m.add(d); } }
  if(kind !== 'puff' && kind !== 'wind') addOutline(m, .04);
  scene.add(m);
  if(kind === 'yoyo'){ const line = new THREE.Line(new THREE.BufferGeometry().setFromPoints([new THREE.Vector3(), new THREE.Vector3()]), new THREE.LineBasicMaterial({ color:0x1f2a5a })); line.frustumCulled = false; scene.add(line); m.userData.line = line; }
  const s = { kind, pierceAll:!!opt.pierce, quick:!!opt.quick, x, y, vx, vy, life:opt.life ?? 1, dmg:opt.dmg ?? 1, friendly:!!opt.friendly, r:opt.r ?? .3, grav:opt.grav || 0, mesh:m, dead:false, t:0,
              bounces:0, maxBounces:opt.maxBounces || 0, bounceV:opt.bounceV || 7, homing:!!opt.homing, freeze:opt.freeze || 0, boomerang:!!opt.boomerang, set:new Set() };
  shots.push(s); return s;
}
function removeShot(s){ if(s.mesh.userData.line){ scene.remove(s.mesh.userData.line); s.mesh.userData.line.geometry.dispose(); } s.dead = true; scene.remove(s.mesh); if(s.mesh.userData.ownGeo) s.mesh.geometry.dispose(); if(s.mesh.userData.ownMat) s.mesh.material.dispose(); }
function nearestTarget(x, y, dir, range){
  let best = null, bd = range;
  for(const e of enemies){ if(e.dead) continue; const dx = e.x - x; if(dir && Math.sign(dx) !== dir && Math.abs(dx) > .5) continue; const d = Math.hypot(dx, e.y + e.h/2 - y); if(d < bd){ bd = d; best = e; } }
  if(boss && arena && arena.active && !boss.dead){ const d = Math.hypot(boss.x - x, boss.y + boss.h/2 - y); if(d < bd) best = boss; }
  return best;
}
function updateShots(dt){
  for(const s of shots){
    if(s.dead) continue;
    s.t += dt; s.life -= dt;
    if(s.homing){
      const tg = nearestTarget(s.x, s.y, Math.sign(s.vx), 9);
      if(tg){ const dx = tg.x - s.x, dy = tg.y + tg.h/2 - s.y, L = Math.hypot(dx,dy) || 1, sp = 11; s.vx = damp(s.vx, dx/L*sp, 6, dt); s.vy = damp(s.vy, dy/L*sp, 6, dt); }
    }
    if(s.boomerang){
      const turn = s.quick ? .24 : .45;
      if(s.t > turn){ const dx = P.x - s.x, dy = P.y + .6 - s.y, L = Math.hypot(dx,dy) || 1, sp = s.quick ? 18 : 14; s.vx = damp(s.vx, dx/L*sp, s.quick ? 14 : 8, dt); s.vy = damp(s.vy, dy/L*sp, s.quick ? 14 : 8, dt); if(L < .7 || s.t > 2.5){ removeShot(s); continue; } if(!s.back){ s.back = true; s.set.clear(); } }
    }
    if(s.grav) s.vy -= s.grav*dt;
    s.x += s.vx*dt; s.y += s.vy*dt;
    if(s.kind === 'puff') s.vx *= Math.pow(.02, dt);
    if(s.kind === 'star' && Math.random() < .6) emit(s.x, s.y, 0, -s.vx*.1, (Math.random()-.5), 0, .3, '#ffe14d', .25);
    if(s.kind === 'fireball' && Math.random() < .7) emit(s.x, s.y, 0, 0, 1, 0, .3, '#ffb02e', .22);
    if(s.kind === 'shrimp' && Math.random() < .5) emit(s.x - Math.sign(s.vx)*.3, s.y, 0, 0, .5, 0, .3, '#ffd08a', .2);
    if(s.kind === 'ice' && Math.random() < .5) emit(s.x, s.y, 0, 0, 0, 0, .25, '#e6f7ff', .2);
    if((s.kind === 'bomb' || s.kind === 'bombH') && Math.random() < .6) emit(s.x, s.y + .3, 0, 0, 1, 0, .2, '#ffb02e', .15);
    if(s.life <= 0){ if(s.kind === 'bomb') explode(s.x, s.y, 1.8, 4, true); else if(s.kind === 'bombH') explode(s.x, s.y, 1.4, 1, false); removeShot(s); continue; }
    const t = lvl.get(Math.floor(s.x), Math.floor(s.y));
    if(solidT(t) && !s.boomerang){
      if(s.kind === 'bomb'){ explode(s.x, s.y + .3, 1.8, 4, true); removeShot(s); continue; }
      if(s.kind === 'bombH'){ explode(s.x, s.y + .3, 1.4, 1, false); removeShot(s); continue; }
      if(s.maxBounces && s.vy < 0 && s.bounces < s.maxBounces && t !== BLOCK){ s.bounces++; s.y = Math.floor(s.y) + 1.01; s.vy = s.bounceV; sfx.flap(); continue; }
      if(s.friendly && ['star','shrimp','fish','ice','meatball'].includes(s.kind)) breakTile(Math.floor(s.x), Math.floor(s.y), false);
      burst(s.x, s.y, ['#ffffff'], 5, 2, .2, .3); removeShot(s); continue;
    }
    const box = { x:s.x, w:s.r*2, y:s.y - s.r, h:s.r*2 };
    if(s.friendly){
      if(s.kind === 'bomb'){ if(enemies.some(e => !e.dead && aabb(box, e)) || (boss && arena && arena.active && !boss.dead && aabb(box, boss))){ explode(s.x, s.y, 1.8, 4, true); removeShot(s); } continue; }
      const pierce = s.boomerang || s.pierceAll;
      const hits = hitArea(box, s.dmg, s.x - s.vx, { set:s.set, freeze:s.freeze });
      if(hits && !pierce){ burst(s.x, s.y, ['#ffe14d','#ffffff'], 10, 4); removeShot(s); }
    } else {
      // 被碗粿盾反彈
      if(P && P.shieldUp && aabb(box, { x:P.x + P.face*.7, w:1, y:P.y, h:1.3 })){ s.friendly = true; s.vx = -s.vx*1.2; s.vy = Math.abs(s.vy)*.5; s.dmg = 2; s.set = new Set(); sfx.hit(); continue; }
      if(P && !P.dead && aabb(box, P)){
        if(P.stone){ removeShot(s); continue; }
        if(s.kind === 'bombH'){ explode(s.x, s.y, 1.4, 1, false); removeShot(s); continue; }
        hurtPlayer(s.x); removeShot(s);
      }
    }
  }
  shots = shots.filter(s => !s.dead);
}
function updateFx(dt){
  for(const f of fx){ f.t += dt; const k = Math.min(1, f.t/f.life); if(f.update) f.update(f, k, dt); if(f.t >= f.life){ f.dead = true; scene.remove(f.mesh); } }
  fx = fx.filter(f => !f.dead);
}

/* =====================================================================
   彈簧、移動平台、存檔點、告示牌、門
   ===================================================================== */
function makeSpring(x, y){
  const g = new THREE.Group();
  g.add(mesh(G.cyl, toon(0x6a5a8a), .42,.12,.42, 0,.06,0));
  for(let i=0;i<4;i++) addc(g, mesh(new THREE.TorusGeometry(.26,.05,6,16), toon(0xcfd6de), 1,1,1, 0,.15+i*.09,0)).rotation.x = Math.PI/2;
  const pad = mesh(G.cyl, toon(0xff6b6b), .45,.1,.45, 0,.5,0); g.add(pad);
  addOutline(g, .05); g.position.set(x, y, 0); scene.add(g);
  springs.push({ x, y, mesh:g, pad, squash:0 });
}
function makeMover(d){
  const g = new THREE.Group();
  const th = lvl.def.theme;
  if(th === 'sky'){ for(let i=0;i<d.w;i++) g.add(mesh(G.sphere, toon(0xffffff), .6,.32,1.0, i+.5,-.15,0)); }
  else { g.add(mesh(new RoundedBoxGeometry(d.w,.32,1.6,2,.08), toon(th === 'nightmarket' ? 0xd9534f : 0xc99a64), 1,1,1, d.w/2,-.16,0));
    for(let i=0;i<d.w;i++) g.add(mesh(G.box, toon(0x8a5a3a), .06,.34,1.62, i+.05,-.16,0)); }
  const arrow = mesh(G.cone, toon(0xffcf3f,{ emissive:0x665500 }), .14,.3,.14, d.w/2,-.45,0); arrow.rotation.z = d.dx ? -Math.PI/2*Math.sign(d.dx) : Math.PI; g.add(arrow);
  addOutline(g, .05); scene.add(g);
  const m = { bx:d.x, by:d.y, x:d.x, top:d.y, w:d.w, dx:d.dx, dy:d.dy, speed:d.speed, ph:0, dxF:0, dyF:0, mesh:g };
  movers.push(m); g.position.set(m.x, m.top, 0); return m;
}
function updateMovers(dt){
  for(const m of movers){
    m.ph += dt*m.speed*.6; const k = (1 - Math.cos(m.ph))/2;
    const nx = m.bx + m.dx*k, ny = m.by + m.dy*k;
    m.dxF = nx - m.x; m.dyF = ny - m.top; m.x = nx; m.top = ny;
  }
}
function makeCheckpoint(x, y){
  const g = new THREE.Group();
  g.add(mesh(G.cyl, toon(0xe8edf7), .06,2.4,.06, 0,1.2,0));
  g.add(mesh(G.sphereLo, toon(0xffcf3f), .12,.12,.12, 0,2.45,0));
  const flag = new THREE.Mesh(new THREE.PlaneGeometry(.9,.6, 6, 1), toon(0xb0b8c8, { side:THREE.DoubleSide }));
  flag.position.set(.46, 2.1, 0); flag.userData.ownGeo = true; g.add(flag);
  g.add(mesh(G.cyl, toon(0x6a5a8a), .3,.12,.3, 0,.06,0));
  addOutline(g, .05); g.position.set(x, y, -.3); scene.add(g);
  const c = { x, y, mesh:g, flag, active:false };
  if(respawnPt && Math.abs(respawnPt.x - x) < .1){ c.active = true; }
  checkpoints.push(c);
}
function makeSign(s){
  const g = new THREE.Group();
  g.add(mesh(G.cyl, toon(0x8a5a3a), .05,.9,.05, 0,.45,0));
  g.add(mesh(G.rbox, toon(0xf2d39a), .8,.55,.1, 0,1.0,0));
  const ex = mesh(G.box, toon(0xd94b4b), .08,.22,.05, 0,1.05,.07); g.add(ex); g.add(mesh(G.box, toon(0xd94b4b), .08,.07,.05, 0,.86,.07));
  addOutline(g, .05); g.position.set(s.x, s.y, -.6); scene.add(g);
  signs.push({ ...s, mesh:g });
}
function makeDoor(x, y){
  const g = new THREE.Group();
  g.add(mesh(G.rbox, toon(0x3d2b6b), 1.5,2.1,.4, 0,1.05,-.1));
  addc(g, mesh(G.cyl, toon(0x3d2b6b), .75,.4,.75, 0,2.1,-.1)).rotation.x = Math.PI/2;
  g.add(mesh(G.box, toon(0x1b1438), 1.0,1.7,.1, 0,.85,.12));
  const st = mesh(G.star, toon(0xffd43b,{ emissive:0x997700 }), .45,.45,.45, 0,2.75,0); g.add(st);
  const gl = new THREE.Sprite(new THREE.SpriteMaterial({ map:glowTexture('#fff2a0'), transparent:true, depthWrite:false, blending:THREE.AdditiveBlending }));
  gl.scale.set(2.4,2.4,1); gl.position.y = 2.75; g.add(gl);
  addOutline(g); g.position.set(x, y, -.2); scene.add(g);
  door = { x, y, w:1.0, h:1.8, mesh:g, star:st };
}
