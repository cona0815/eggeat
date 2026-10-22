/* =====================================================================
   v2.3 會動的場景小生物：蝴蝶、花、鳥群、兔子、鴿子、旗子、氣球、煙火、螢火蟲、蝙蝠
   全部放進 flickers，用 fn(f, dt) 更新；離鏡頭太遠就不更新
   ===================================================================== */
const _wingGeo = new THREE.CircleGeometry(1, 10);
function wing(col, sx){ const pv = new THREE.Group(); const w = new THREE.Mesh(_wingGeo, new THREE.MeshToonMaterial({ color:col, gradientMap:gradTex, side:THREE.DoubleSide }));
  w.userData.ownMat = true; w.scale.set(.22, .17, 1); w.position.x = sx*.2; w.rotation.x = -Math.PI/2; pv.add(w); return pv; }
function buildCritters(theme, W, rnd, add, noShadow, groundTop){
  const live = (o, fn, extra={}) => { flickers.push({ o, t:rnd()*10, fn, cx:o.position.x, ...extra }); return o; };
  const ink = basic(0x1d1d2b);

  // 蝴蝶（白天）
  const butterfly = (x, y, z, col) => {
    const g = new THREE.Group(); g.add(mesh(G.cyl, ink, .03,.22,.03)); g.children[0].rotation.z = Math.PI/2;
    const l = wing(col, -1), r = wing(col, 1); g.add(l, r); g.position.set(x, y, z); add(noShadow(g));
    live(g, (f, dt) => { const px = g.position.x; g.position.x = f.cx + Math.sin(f.t*.45)*2.6; g.position.y = y + Math.sin(f.t*1.4)*.5 + Math.sin(f.t*3.1)*.15;
      g.rotation.y = g.position.x > px ? 0 : Math.PI; const a = Math.sin(f.t*22)*.9; l.rotation.x = a; r.rotation.x = -a; });
  };
  // 會搖的花
  const flower = (x, y, z, col) => {
    const g = new THREE.Group(); g.add(mesh(G.cyl, toon(0x4f9a3f), .03,.5,.03, 0,.25,0));
    const head = new THREE.Group(); head.position.y = .52; g.add(head);
    head.add(mesh(G.sphereLo, toon(col), .2,.2,.04));
    head.add(mesh(G.sphereLo, toon(0xffd23f), .07,.07,.06, 0,0,.03));
    g.position.set(x, y, z); add(noShadow(g));
    live(g, (f) => { g.rotation.z = Math.sin(f.t*1.8)*.14; head.rotation.z = f.t*.3; });
  };
  // 背景鳥群／蝙蝠群：從畫面一邊飛到另一邊，循環
  const flock = (col, bat) => {
    const g = new THREE.Group(); const birds = [];
    for(let i=0;i<5;i++){ const b = new THREE.Group(); const l = wing(col, -1), r = wing(col, 1); l.scale.set(bat?1.4:1.2,1,1); r.scale.set(bat?1.4:1.2,1,1);
      b.add(l, r, mesh(G.sphereLo, toon(col), .1,.08,.08)); b.position.set(-Math.abs(i-2)*.7, -Math.abs(i-2)*.45 + (i%2)*.1, i*.2); g.add(b); birds.push({ b, l, r, ph:i }); }
    g.position.set(rnd()*W, 13 + rnd()*5, -14 - rnd()*6); add(noShadow(g));
    live(g, (f, dt) => { g.position.x += (bat ? 4.2 : 3.2)*dt; g.position.y += Math.sin(f.t*.7)*.3*dt;
      if(g.position.x > camX + 40){ g.position.x = camX - 40; g.position.y = (bat ? 11 : 13) + Math.random()*5; }
      for(const k of birds){ const a = Math.sin(f.t*(bat ? 18 : 9) + k.ph)*.8; k.l.rotation.x = a; k.r.rotation.x = -a; } }, { always:true });
  };
  // 會跳的兔子（草原背景）
  const bunny = (x, z) => {
    const g = new THREE.Group(); const top = groundTop(x);
    g.add(mesh(G.sphere, toon(0xffffff), .32,.28,.4, 0,.28,0)); g.add(mesh(G.sphere, toon(0xffffff), .22,.22,.22, 0,.55,.3));
    for(const sx of [-1,1]) { const e = mesh(G.sphere, toon(0xffffff), .06,.22,.05, sx*.08,.85,.28); e.rotation.z = sx*.15; g.add(e); g.add(mesh(G.sphereLo, toon(0xffb3c8), .03,.14,.02, sx*.08,.85,.32)); }
    g.add(mesh(G.sphereLo, ink, .03,.04,.02, .1,.6,.5)); g.add(mesh(G.sphereLo, ink, .03,.04,.02, -.1,.6,.5));
    g.position.set(x, top, z); g.rotation.y = Math.PI/2; add(noShadow(addOutline(g, .03)));
    let hopT = rnd()*3, dir = 1, vy = 0, yy = 0;
    live(g, (f, dt) => { hopT -= dt; if(hopT <= 0 && yy === 0){ vy = 4.5; hopT = 1.2 + Math.random()*2.5; if(Math.abs(g.position.x - f.cx) > 4) dir = Math.sign(f.cx - g.position.x); else if(Math.random() < .3) dir = -dir; g.rotation.y = dir*Math.PI/2; }
      if(vy !== 0 || yy > 0){ vy -= 18*dt; yy += vy*dt; g.position.x += dir*1.8*dt; if(yy <= 0){ yy = 0; vy = 0; } }
      g.position.y = groundTop(g.position.x) + yy; g.scale.y = yy > 0 ? 1.1 : 1; });
  };
  // 啄米的鴿子（老街）
  const pigeon = (x, z) => {
    const g = new THREE.Group(); const top = groundTop(x);
    g.add(mesh(G.sphere, toon(0x9aa0b4), .26,.22,.2, 0,.24,0)); const head = mesh(G.sphere, toon(0x7a8098), .13,.13,.13, .22,.42,0); g.add(head);
    head.add(mesh(G.cone, toon(0xffb02e), .3,.5,.3, .8,0,0)); head.children[0].rotation.z = -Math.PI/2; head.add(mesh(G.sphereLo, ink, .25,.25,.25, .4,.3,.6));
    g.add(mesh(G.sphere, toon(0x6f7690), .2,.12,.18, -.18,.3,0));
    g.position.set(x, top, z); if(rnd() < .5) g.rotation.y = Math.PI; add(noShadow(addOutline(g, .03)));
    let flyT = 0;
    live(g, (f, dt) => { const peck = Math.max(0, Math.sin(f.t*5)); head.position.set(.22 + peck*.06, .42 - peck*.2, 0);
      if(P && Math.abs(P.x - g.position.x) < 1.5 && Math.abs(P.y - g.position.y) < 2 && flyT <= 0) flyT = 2.2;
      if(flyT > 0){ flyT -= dt; g.position.y = groundTop(f.cx) + Math.sin((1 - flyT/2.2)*Math.PI)*4; g.position.x += (g.rotation.y ? -3 : 3)*dt; if(flyT <= 0){ g.position.x = f.cx; g.position.y = groundTop(f.cx); } } });
  };
  // 飄動的旗子
  const banner = (x, z, col) => {
    const top = groundTop(x), g = new THREE.Group();
    g.add(mesh(G.cyl, toon(0x6a4a3a), .04,2.6,.04, 0,1.3,0));
    const segs = []; for(let i=0;i<4;i++){ const s = mesh(G.box, toon(i%2 ? 0xffffff : col), .3,.8,.03, .17 + i*.3, 2.15, 0); g.add(s); segs.push(s); }
    g.position.set(x, top, z); add(noShadow(g));
    live(g, (f) => segs.forEach((s, i) => { s.position.z = Math.sin(f.t*4 - i*.9)*.12*(i+1)*.5; s.rotation.y = Math.cos(f.t*4 - i*.9)*.3; }));
  };
  // 往上飄的氣球（雲海）
  const balloon = (x) => {
    const g = new THREE.Group(), col = pick([0xff6b9a, 0x69c3ff, 0xffd23f, 0x7ef07a, 0xc9a8ff]);
    g.add(mesh(G.sphere, toon(col), .45,.55,.45, 0,.6,0)); g.add(mesh(G.cone, toon(col), .12,.14,.12, 0,.02,0));
    const str = mesh(G.cyl, toon(0xffffff), .01,1.1,.01, 0,-.55,0); g.add(str);
    const z = -3 - rnd()*8, y0 = rnd()*16;
    g.position.set(x, y0, z); add(noShadow(addOutline(g, .03)));
    live(g, (f, dt) => { g.position.y += .9*dt; g.position.x = f.cx + Math.sin(f.t*.8)*.6; g.rotation.z = Math.sin(f.t*1.3)*.12; if(g.position.y > 22) g.position.y = -2; });
  };
  // 煙火（夜市、古堡偶爾）
  const fireworks = (cols, every) => {
    const o = new THREE.Object3D(); o.position.x = 0; add(o);
    let next = 1 + rnd()*2;
    live(o, (f, dt) => { next -= dt; if(next > 0 || !QUALITY[quality].detail) return; next = every*(.6 + Math.random()*.8);
      const x = camX + (Math.random() - .5)*30, y = 13 + Math.random()*6, z = -18 - Math.random()*8, col = pick(cols);
      for(let i=0;i<4;i++) emit(x, y - 6 + i*1.5, z, 0, 0, 0, .25 + i*.05, '#ffe9b0', .25);
      setTimeout(() => { for(let i=0;i<36;i++){ const a = i/36*Math.PI*2, s = 5 + Math.random()*1.5; emit(x, y, z, Math.cos(a)*s, Math.sin(a)*s, 0, 1.3, i%3 ? col : '#ffffff', .45, 3, 1.4); } }, 300);
    }, { always:true });
  };
  // 螢火蟲／幽光
  const firefly = (x, y, z, col) => {
    const s = new THREE.Sprite(new THREE.SpriteMaterial({ map:glowTexture(col), transparent:true, depthWrite:false, blending:THREE.AdditiveBlending }));
    s.userData.ownMat = true; s.scale.set(.6,.6,1); s.position.set(x, y, z); add(s);
    live(s, (f) => { s.position.x = f.cx + Math.sin(f.t*.6)*1.5; s.position.y = y + Math.sin(f.t*.9)*.8; s.material.opacity = .45 + Math.sin(f.t*4)*.35; });
  };
  // 晃動的蠟燭（古堡）
  const candle = (x, y, z) => {
    const g = new THREE.Group(); g.add(mesh(G.cyl, toon(0xfff2d6), .08,.35,.08, 0,.17,0));
    const fl = mesh(G.cone, toon(0xffb02e,{ emissive:0xcc5500 }), .06,.16,.06, 0,.44,0); g.add(fl);
    const gl = new THREE.Sprite(new THREE.SpriteMaterial({ map:glowTexture('#ffb070'), transparent:true, depthWrite:false, blending:THREE.AdditiveBlending, opacity:.8 }));
    gl.userData.ownMat = true; gl.scale.set(1.1,1.1,1); gl.position.y = .45; g.add(gl);
    g.position.set(x, y, z); add(noShadow(g));
    live(g, (f) => { g.position.y = y + Math.sin(f.t*1.1)*.25; fl.scale.y = 1 + Math.sin(f.t*18)*.25; });
  };

  const okGround = x => { const t = groundTop(x); return t > 0 ? t : null; };
  const petals = [0xff6b9a, 0xffd23f, 0xffffff, 0xc9a8ff, 0xff9a5a, 0x69c3ff];
  if(theme === 'meadow'){
    for(let x=4;x<W-2;x+=2.2 + rnd()*3){ const t = okGround(x); if(t !== null) flower(x, t, 1.1 + rnd()*.4, pick(petals)); }
    for(let x=8;x<W;x+=9 + rnd()*8){ const t = okGround(x); if(t !== null) butterfly(x, t + 1.6 + rnd()*1.5, -.5 + rnd()*1.5, pick([0xff9ad6, 0xffd23f, 0x8fd0ff, 0xffffff])); }
    for(let x=14;x<W;x+=24 + rnd()*14){ const t = okGround(x); if(t !== null) bunny(x, -2.6); }
    flock(0x3a3f5c); flock(0x3a3f5c);
  } else if(theme === 'oldstreet'){
    for(let x=10;x<W;x+=11 + rnd()*9){ const t = okGround(x); if(t !== null) pigeon(x, -1.3 - rnd()*.5); }
    for(let x=6;x<W;x+=16 + rnd()*8){ const t = okGround(x); if(t !== null) banner(x, -2.2, pick([0xd94b4b, 0x3a7ad9, 0xf2a020])); }
    for(let x=8;x<W;x+=14 + rnd()*8){ const t = okGround(x); if(t !== null) butterfly(x, t + 1.8 + rnd(), -.5, pick([0xffffff, 0xffd23f])); }
    flock(0x5a4a5a);
  } else if(theme === 'sky'){
    for(let x=4;x<W;x+=7 + rnd()*6) balloon(x);
    for(let x=10;x<W;x+=12 + rnd()*8) butterfly(x, 6 + rnd()*5, -1 + rnd()*2, pick([0xff9ad6, 0x8fd0ff, 0xffd23f]));
    flock(0x6a6a9a); flock(0x6a6a9a); flock(0x6a6a9a);
  } else if(theme === 'nightmarket'){
    fireworks(['#ff6b9a','#ffd23f','#69c3ff','#7ef07a','#c9a8ff'], 2.6);
    for(let x=6;x<W;x+=3.5 + rnd()*4) firefly(x, 4.5 + rnd()*4, -1.5 + rnd()*2, pick(['#fff3a0', '#b8ffb0']));
    for(let x=10;x<W;x+=14 + rnd()*10){ const t = okGround(x); if(t !== null) banner(x, -2.4, pick([0xd94b4b, 0xffc94d])); }
  } else if(theme === 'castle'){
    flock(0x2a2440, true); flock(0x2a2440, true); flock(0x2a2440, true);
    for(let x=6;x<W;x+=6 + rnd()*5){ const t = okGround(x); if(t !== null) candle(x, t + 2.5 + rnd()*2.5, -1.8 - rnd()*.8); }
    for(let x=8;x<W;x+=5 + rnd()*5) firefly(x, 5 + rnd()*5, -1 + rnd()*2, pick(['#c9a8ff', '#8fd0ff']));
    fireworks(['#c9a8ff','#ffd23f'], 7);
  }
}
