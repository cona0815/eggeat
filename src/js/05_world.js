/* =====================================================================
   關卡資料結構
   ===================================================================== */
const EMPTY=0, SOLID=1, ONEWAY=2, BLOCK=3, SPIKE=4, METAL=5;
const LH = 24;
class Level {
  constructor(def){
    this.def = def; this.w = def.width; this.h = LH;
    this.grid = new Uint8Array(this.w*this.h);
    this.spawns = []; this.items = []; this.signs = []; this.checkpoints = []; this.springs = []; this.movers = [];
    this.door = null; this.boss = null; this.starTotal = 0;
    const self = this;
    const set = (x,y,t) => { if(x>=0 && x<self.w && y>=0 && y<self.h) self.grid[y*self.w+x] = t; };
    let uid = 0;
    def.build({
      ground(x0,x1,top){ for(let x=x0;x<=x1;x++) for(let y=0;y<top;y++) set(x,y,SOLID); },
      box(x0,x1,y0,y1){ for(let x=x0;x<=x1;x++) for(let y=y0;y<=y1;y++) set(x,y,SOLID); },
      plat(x0,x1,y){ for(let x=x0;x<=x1;x++) set(x,y,ONEWAY); },
      blocks(x0,x1,y0,y1){ for(let x=x0;x<=x1;x++) for(let y=y0;y<=y1;y++) set(x,y,BLOCK); },
      metal(x0,x1,y0,y1){ for(let x=x0;x<=x1;x++) for(let y=y0;y<=y1;y++) set(x,y,METAL); },
      spikes(x0,x1,y){ for(let x=x0;x<=x1;x++) set(x,y,SPIKE); },
      enemy(type,x,y,opt={}){ self.spawns.push({ type, x:x+0.5, y, ...opt }); },
      item(type,x,y){ self.items.push({ id:'i'+(uid++), type, x:x+0.5, y }); },
      stars(x0,x1,y){ for(let x=x0;x<=x1;x++){ self.items.push({ id:'s'+(uid++), type:'star', x:x+0.5, y }); self.starTotal++; } },
      door(x,y){ self.door = { x:x+0.5, y }; },
      boss(type,x0,x1){ self.boss = { type, x0, x1 }; },
      checkpoint(x,y){ self.checkpoints.push({ x:x+0.5, y }); },
      spring(x,y){ self.springs.push({ x:x+0.5, y }); },
      mover(x,y,w,dx,dy,speed){ self.movers.push({ x, y, w, dx, dy, speed }); },
      sign(x,y,text){ self.signs.push({ x:x+0.5, y, text }); },
    });
    this.snackTotal = this.items.filter(i => SNACKS[i.type]).length;
  }
  get(x,y){ if(x<0 || x>=this.w) return SOLID; if(y<0 || y>=this.h) return EMPTY; return this.grid[y*this.w+x]; }
  setT(x,y,t){ if(x>=0 && x<this.w && y>=0 && y<this.h) this.grid[y*this.w+x] = t; }
  topAt(x){ for(let y=this.h-1;y>=0;y--){ const t = this.get(x,y); if(t===SOLID) return y+1; } return -1; }
}

/* =====================================================================
   建立場景
   ===================================================================== */
let lvl = null, levelIndex = 0;
const tileRefs = new Map();
function disposeTree(o){
  o.traverse(c => { if(c.userData.ownGeo && c.geometry) c.geometry.dispose(); if(c.userData.ownMat && c.material) c.material.dispose(); });
}
function skyTexture(c1, c2){
  const cv = document.createElement('canvas'); cv.width = 4; cv.height = 256;
  const g = cv.getContext('2d'); const gr = g.createLinearGradient(0,0,0,256); gr.addColorStop(0,c1); gr.addColorStop(1,c2);
  g.fillStyle = gr; g.fillRect(0,0,4,256);
  const t = new THREE.CanvasTexture(cv); t.colorSpace = THREE.SRGBColorSpace; return t;
}

function buildWorld(){
  if(world){ scene.remove(world); disposeTree(world); }
  world = new THREE.Group(); scene.add(world);
  tileRefs.clear();
  const th = THEMES[lvl.def.theme], theme = lvl.def.theme;
  if(scene.background && scene.background.dispose) scene.background.dispose();
  scene.background = skyTexture(th.sky[0], th.sky[1]);
  scene.fog = new THREE.Fog(th.fog, 30, 110);
  hemi.color.set(th.night ? 0xb8b0ff : 0xffffff);
  hemi.groundColor.set(th.night ? 0x40304a : 0x8a7a66);
  hemi.intensity = th.night ? .85 : 1.15;
  sun.intensity = th.night ? 1.0 : (theme === 'oldstreet' ? 1.5 : 1.7);
  sun.color.set(theme === 'oldstreet' ? 0xffe0b8 : th.night ? 0xc8c0ff : 0xffffff);
  fillPoint.intensity = th.night ? 1.6 : 0;
  const BLOOM = { meadow:[.5,.92], oldstreet:[.55,.9], sky:[.25,.98], nightmarket:[.8,.82], castle:[.75,.85] }[theme];
  bloomPass.strength = BLOOM[0]; bloomPass.threshold = BLOOM[1];

  const counts = { solid:0, top:0, one:0, block:0, spike:0, metal:0 };
  for(let y=0;y<lvl.h;y++) for(let x=0;x<lvl.w;x++){
    const t = lvl.get(x,y);
    if(t===SOLID){ counts.solid++; if(lvl.get(x,y+1)!==SOLID) counts.top++; }
    else if(t===ONEWAY) counts.one++; else if(t===BLOCK) counts.block++; else if(t===SPIKE) counts.spike++; else if(t===METAL) counts.metal++;
  }
  const inst = (geo, mat, n) => { const m = new THREE.InstancedMesh(geo, mat, Math.max(1,n)); m.count = n; m.castShadow = true; m.receiveShadow = true; m.userData.ownGeo = true; m.userData.ownMat = true; world.add(m); return m; };
  const tmat = c => new THREE.MeshToonMaterial({ color:c, gradientMap:gradTex });
  const dirtGeo = theme === 'sky' ? new RoundedBoxGeometry(1.02,1.02,3,2,.12) : new THREE.BoxGeometry(1,1,3);
  const mDirt = inst(dirtGeo, tmat(0xffffff), counts.solid);
  const topGeo = theme === 'oldstreet' || theme === 'castle' ? new RoundedBoxGeometry(1.02,.3,3.1,2,.06) : new THREE.BoxGeometry(1.04,.3,3.08);
  const mTop  = inst(topGeo, tmat(0xffffff), counts.top);
  const oneGeo = theme === 'sky' ? new THREE.SphereGeometry(.62, 14, 10).scale(1, .42, 1.6) : new RoundedBoxGeometry(1.02, .26, 2.2, 2, .07);
  const mOne  = inst(oneGeo, tmat(th.oneway), counts.one);
  const mBlk  = inst(new RoundedBoxGeometry(0.94,0.94,0.94, 3, .13), tmat(th.block), counts.block);
  const mBlkS = inst(G.star.clone(), new THREE.MeshToonMaterial({ color:0xffffff, gradientMap:gradTex, emissive:0x886600 }), counts.block);
  const mMet  = inst(new RoundedBoxGeometry(0.96,0.96,0.96, 2, .08), tmat(0x7d8aa6), counts.metal);
  const mMetI = inst(new RoundedBoxGeometry(0.62,0.62,0.12, 2, .05), tmat(0x4e5872), counts.metal);
  const mSpk  = inst(new THREE.ConeGeometry(0.2,0.75,6), tmat(0xd9dde8), counts.spike*6);
  const lipGeo = new THREE.SphereGeometry(1, 12, 8, 0, Math.PI*2, Math.PI/2, Math.PI/2).scale(.3,.2,.16);
  const hasLip = theme === 'meadow' || theme === 'sky';
  const mLip  = inst(lipGeo, tmat(th.top), hasLip ? counts.top*2 : 0); mLip.castShadow = false;
  const tuftGeo = new THREE.ConeGeometry(.07, .28, 4); tuftGeo.translate(0, .14, 0);
  const mTuft = inst(tuftGeo, tmat(new THREE.Color(th.top).offsetHSL(0, .05, -.06).getHex()), th.tufts ? counts.top*7 : 0);
  mTuft.castShadow = false; mTuft.userData.detail = true;
  const puffGeo = new THREE.SphereGeometry(.42, 12, 8);
  const mPuff = inst(puffGeo, tmat(0xffffff), theme === 'sky' ? counts.top*2 : 0); mPuff.castShadow = false;
  const stripeGeo = new THREE.BoxGeometry(1.04,.08,.12);
  const mStripe = inst(stripeGeo, new THREE.MeshToonMaterial({ color:0xffd23f, gradientMap:gradTex, emissive:0x443300 }), theme === 'nightmarket' ? counts.top : 0);

  const colTop = new Int16Array(lvl.w).fill(-1);
  for(let x=0;x<lvl.w;x++) for(let y=lvl.h-1;y>=0;y--) if(lvl.get(x,y)===SOLID){ colTop[x] = y; break; }
  const M = new THREE.Matrix4(), Q = new THREE.Quaternion(), S = new THREE.Vector3(1,1,1), V = new THREE.Vector3();
  const C1 = new THREE.Color(th.dirt), C2 = new THREE.Color(th.dirt2), DK = new THREE.Color(th.dirt).multiplyScalar(.62), TC = new THREE.Color();
  const GT1 = new THREE.Color(th.top), GT2 = new THREE.Color(th.top).offsetHSL(.01, 0, theme === 'nightmarket' ? .05 : .04);
  const rndT = mulberry32(99 + levelIndex);
  const ids = { solid:0, top:0, one:0, block:0, spike:0, metal:0 };
  for(let y=0;y<lvl.h;y++) for(let x=0;x<lvl.w;x++){
    const t = lvl.get(x,y);
    if(t===SOLID){
      M.compose(V.set(x+.5,y+.5,0), Q.identity(), S.set(1,1,1)); mDirt.setMatrixAt(ids.solid, M);
      const depth = Math.min(1, Math.max(0, (colTop[x] - y)/5));
      const pat = theme === 'oldstreet' ? ((x + (y%2 ? .5 : 0))|0)%2 : (x+y)%2;     // 紅磚交錯
      TC.copy(pat ? C1 : C2).lerp(DK, depth*.7); mDirt.setColorAt(ids.solid, TC); ids.solid++;
      if(lvl.get(x,y+1)!==SOLID){
        const ti = ids.top++;
        M.compose(V.set(x+.5,y+.88,0), Q.identity(), S.set(1,1,1)); mTop.setMatrixAt(ti, M); mTop.setColorAt(ti, x%2 ? GT1 : GT2);
        if(hasLip) for(let k=0;k<2;k++){ M.compose(V.set(x+.25+k*.5, y+.76, 1.5), Q.identity(), S.set(1,1,1)); mLip.setMatrixAt(ti*2+k, M); }
        if(th.tufts) for(let k=0;k<7;k++){
          const z = k < 4 ? .9 + rndT()*.6 : -1.4 + rndT()*1.0;
          Q.setFromEuler(new THREE.Euler((rndT()-.5)*.5, rndT()*3, (rndT()-.5)*.5));
          const sc = .6 + rndT()*.8; M.compose(V.set(x + rndT(), y+1.02, z), Q, S.set(sc, sc, sc)); mTuft.setMatrixAt(ti*7+k, M); Q.identity();
        }
        if(theme === 'sky') for(let k=0;k<2;k++){ const sc = .8 + rndT()*.6; M.compose(V.set(x+.25+k*.5, y+1.0, -1 + rndT()*2), Q.identity(), S.set(sc, sc*.7, sc)); mPuff.setMatrixAt(ti*2+k, M); }
        if(theme === 'nightmarket'){ M.compose(V.set(x+.5, y+.98, 1.52), Q.identity(), S.set(1,1,1)); mStripe.setMatrixAt(ti, M); }
      }
    } else if(t===ONEWAY){
      M.compose(V.set(x+.5,y+.88,0), Q.identity(), S.set(1,1,1)); mOne.setMatrixAt(ids.one++, M);
    } else if(t===BLOCK){
      const a = ids.block++;
      M.compose(V.set(x+.5,y+.5,0), Q.identity(), S.set(1,1,1)); mBlk.setMatrixAt(a, M);
      M.compose(V.set(x+.5,y+.5,0.5), Q.identity(), S.set(.28,.28,.28)); mBlkS.setMatrixAt(a, M);
      tileRefs.set(y*lvl.w+x, [{ mesh:mBlk, id:a },{ mesh:mBlkS, id:a }]);
    } else if(t===METAL){
      const a = ids.metal++;
      M.compose(V.set(x+.5,y+.5,0), Q.identity(), S.set(1,1,1)); mMet.setMatrixAt(a, M);
      M.compose(V.set(x+.5,y+.5,.47), Q.identity(), S.set(1,1,1)); mMetI.setMatrixAt(a, M);
      tileRefs.set(y*lvl.w+x, [{ mesh:mMet, id:a },{ mesh:mMetI, id:a }]);
    } else if(t===SPIKE){
      for(let i=0;i<6;i++){ M.compose(V.set(x+.27+(i%2)*.46, y+.37, -0.8+Math.floor(i/2)*0.8), Q.identity(), S.set(1,1,1)); mSpk.setMatrixAt(ids.spike++, M); }
    }
  }
  for(const m of [mDirt,mTop,mOne,mBlk,mBlkS,mMet,mMetI,mSpk,mLip,mTuft,mPuff,mStripe]){ m.instanceMatrix.needsUpdate = true; if(m.instanceColor) m.instanceColor.needsUpdate = true; }
  buildDecor(th);
  world.traverse(o => { if(o.userData.detail) o.visible = QUALITY[quality].detail; });
}
function removeTileMesh(x,y){
  const r = tileRefs.get(y*lvl.w+x); if(!r) return;
  const Z = new THREE.Matrix4().makeScale(0,0,0);
  for(const { mesh:m, id } of r){ m.setMatrixAt(id, Z); m.instanceMatrix.needsUpdate = true; }
  tileRefs.delete(y*lvl.w+x);
}

/* =====================================================================
   場景裝飾
   ===================================================================== */
const flickers = [];         // 會閃爍的燈（夜市、古堡）
function buildDecor(th){
  flickers.length = 0;
  const rnd = mulberry32(1234 + levelIndex*77);
  const W = lvl.w, theme = lvl.def.theme;
  const add = o => { world.add(o); return o; };
  const noShadow = o => { o.traverse(c => c.castShadow = false); return o; };
  const T = c => toon(c);
  const groundTop = x => lvl.topAt(Math.floor(clamp(x, 0, W-1)));

  // 遠景雲
  for(let x=-20;x<W+30;x+=10+rnd()*10){
    const c = new THREE.Group(); const z = -28 - rnd()*14, y = 13 + rnd()*8;
    const mat = T(th.night ? 0x5a4f8a : theme === 'oldstreet' ? 0xffe2c8 : 0xffffff);
    for(let i=0;i<4;i++) c.add(mesh(G.sphereLo, mat, 1.6+rnd()*1.2, 1.1+rnd()*.6, 1.2, i*1.8-2.7, rnd()*.6, 0));
    c.position.set(x, y, z); add(noShadow(c));
  }
  // 遠山
  const mtnCol = { meadow:[0x9ccf8a,0x7fb6c9], oldstreet:[0xd99a7a,0xc28a8a], sky:[0xd9d2ff,0xc3d5ff], nightmarket:[0x2a2458,0x221d48], castle:[0x4a3f72,0x3a325e] }[theme];
  for(let layer=0; layer<2; layer++){
    for(let x=-30;x<W+40;x+=14+rnd()*12){
      const h = (layer ? 16 : 11) + rnd()*8;
      const m = new THREE.Mesh(new THREE.ConeGeometry(h*.9, h, 6), T(mtnCol[layer]));
      m.userData.ownGeo = true; m.position.set(x, -6 + h/2, layer ? -78 - rnd()*10 : -52 - rnd()*8); m.rotation.y = rnd()*3;
      if(theme === 'sky') m.scale.y = .5;
      if(theme === 'oldstreet' || theme === 'nightmarket') m.scale.y = .6;
      add(m);
    }
  }
  // 太陽／月亮
  if(!th.night){
    const col = theme === 'oldstreet' ? '#ffd29a' : '#fff6c8';
    const glow = new THREE.Sprite(new THREE.SpriteMaterial({ map:glowTexture(col), transparent:true, depthWrite:false, fog:false, blending:THREE.AdditiveBlending, opacity:.6 }));
    glow.userData.ownMat = true; glow.scale.set(26,26,1); glow.position.set(W*.5, theme === 'oldstreet' ? 20 : 36, -95); add(glow);
    const disk = new THREE.Mesh(new THREE.CircleGeometry(4, 32), new THREE.MeshBasicMaterial({ color:theme === 'oldstreet' ? 0xffc890 : 0xfff3b0, fog:false }));
    disk.userData.ownGeo = true; disk.userData.ownMat = true; disk.position.set(W*.5, theme === 'oldstreet' ? 20 : 36, -94); add(disk);
  } else {
    const moon = new THREE.Mesh(new THREE.SphereGeometry(4, 32, 20), new THREE.MeshBasicMaterial({ color:0xfff3c4, fog:false }));
    moon.userData.ownGeo = true; moon.userData.ownMat = true; moon.position.set(W*.6, 26, -80); add(moon);
    const n = 300, pos = new Float32Array(n*3);
    for(let i=0;i<n;i++){ pos[i*3] = -20 + rnd()*(W+40); pos[i*3+1] = 8 + rnd()*34; pos[i*3+2] = -90 - rnd()*10; }
    const g = new THREE.BufferGeometry(); g.setAttribute('position', new THREE.BufferAttribute(pos,3));
    const st = new THREE.Points(g, new THREE.PointsMaterial({ color:0xfff6d8, size:.55, fog:false }));
    st.userData.ownGeo = true; st.userData.ownMat = true; add(st);
  }

  if(theme === 'meadow'){
    for(let x=-10;x<W+20;x+=9+rnd()*8){ const h = mesh(G.sphereLo, T(rnd()<.5?0x8fd46a:0x79c45a), 6+rnd()*4, 4+rnd()*3, 3, x, -0.5, -16-rnd()*10); h.castShadow=false; add(h); }
    // 遠方的三合院
    for(let x=20;x<W;x+=45+rnd()*30){
      const h = new THREE.Group();
      h.add(mesh(G.box, T(0xf2e6d0), 6,2.2,2.5, 0,1.1,0));
      const roof = mesh(G.box, T(0xc0503a), 6.6,.5,3, 0,2.45,0); h.add(roof);
      for(const sx of [-1,1]){ h.add(mesh(G.box, T(0xf2e6d0), 2,2,4, sx*3.6,1,1.5)); h.add(mesh(G.box, T(0xc0503a), 2.4,.45,4.4, sx*3.6,2.2,1.5)); }
      h.add(mesh(G.box, T(0x7a4a2a), .9,1.4,.1, 0,.7,1.26));
      h.position.set(x, 1.5, -24 - rnd()*6); add(noShadow(h));
    }
    for(let x=2;x<W-2;x+=5+rnd()*7){
      const top = groundTop(x); if(top < 0) continue;
      const tr = new THREE.Group();
      if(rnd() < .35){ // 榕樹
        tr.add(mesh(G.cyl, T(0x7a5232), .3,2,.3, 0,1,0));
        for(let i=0;i<4;i++) tr.add(mesh(G.sphereLo, T(i%2?0x4f9e44:0x5aae4c), 1.2+rnd()*.3,.8,1, (i-1.5)*.9,2.4+rnd()*.3,0));
        for(let i=0;i<4;i++) tr.add(mesh(G.cyl, T(0x8a6242), .03,1.2,.03, (i-1.5)*.8,1.6,.3));
      } else {
        tr.add(mesh(G.cyl, T(0x8a5a32), .16,1.4,.16, 0,.7,0));
        tr.add(mesh(G.sphereLo, T(rnd()<.5?0x4fae4a:0x62c25a), .8,.75,.8, 0,1.7,0));
        tr.add(mesh(G.sphereLo, T(0x4fae4a), .55,.5,.55, .45,1.35,.1));
      }
      tr.position.set(x, top, -1.9 - rnd()*0.6); addOutline(tr); add(tr);
    }
    // 木柵欄
    for(let x=3;x<W-3;x+=11+rnd()*9){
      const top = groundTop(x); if(top < 0 || groundTop(x+3) !== top) continue;
      const f = new THREE.Group();
      for(let i=0;i<4;i++) f.add(mesh(G.box, T(0xc99a64), .14,.8,.1, i*.9,.4,0));
      for(const y of [.28,.6]) f.add(mesh(G.box, T(0xb5844e), 2.9,.1,.08, 1.35,y,.05));
      f.position.set(x, top, -1.35); add(f);
    }
    for(let x=1;x<W;x+=2.3+rnd()*3){
      const top = groundTop(x); if(top < 0) continue;
      const f = new THREE.Group(); f.add(mesh(G.cyl, T(0x4f9e3a), .02,.3,.02, 0,.15,0));
      f.add(mesh(G.sphereLo, T([0xffffff,0xffd84a,0xff8fb1][Math.floor(rnd()*3)]), .09,.09,.05, 0,.32,0));
      f.position.set(x, top, 1.1 + rnd()*.3); f.userData.detail = true; add(noShadow(f));
    }
  }
  else if(theme === 'oldstreet'){
    const SHOPS = ['蝦捲','豆花','蚵仔煎','劍獅','古早味','冰菓室','碗粿','肉圓','紅茶','蜜餞'];
    const wallCols = [0xb8583a, 0xd9b48a, 0x9a4a32, 0xc98a5a];
    let si = 0;
    for(let x=-4;x<W+6;x+=5.6){
      const top = Math.max(3, groundTop(x)); const h = new THREE.Group();
      const wc = wallCols[Math.floor(rnd()*wallCols.length)], hh = 3.8 + rnd()*1.2;
      h.add(mesh(G.box, T(wc), 5,hh,2.2, 0,hh/2,0));
      h.add(mesh(G.box, T(0x5a3a2a), 5.2,.18,2.4, 0,1.95,0));                 // 騎樓橫樑
      for(const ax of [-1.4, 1.4]){ h.add(mesh(G.box, T(0x2a1c18), 1.5,1.75,.1, ax,.88,1.11)); addc(h, mesh(G.cyl, T(0x2a1c18), .75,.1,.75, ax,1.75,1.11)).rotation.x = Math.PI/2; }
      for(const wx of [-1.4, 1.4]){ h.add(mesh(G.box, T(0xf2e6d0), 1.1,1.0,.08, wx,hh-1.15,1.11)); h.add(mesh(G.box, T(0x2f5a66), .9,.82,.1, wx,hh-1.15,1.13)); }
      h.add(mesh(G.box, T(0x7a2e22), 5.5,.32,2.6, 0,hh+.16,0));
      h.add(mesh(G.box, T(0x7a2e22), 5.5,.2,.2, 0,hh+.42,1.0));
      const sign = new THREE.Mesh(new THREE.PlaneGeometry(2.4,.85), new THREE.MeshBasicMaterial({ map:signTexture(SHOPS[si % SHOPS.length], ['#c0392b','#1f6f8b','#2e7d32','#8e44ad'][si%4]), color:0xe6e6e6 }));
      sign.userData.ownGeo = true; sign.userData.ownMat = true; sign.position.set(0, 2.45, 1.2); h.add(sign);
      if(si % 3 === 0){ addc(h, mesh(G.cyl, T(0xd94b4b), .42,.08,.42, 0,hh-.3,1.14)).rotation.x = Math.PI/2; h.add(mesh(G.sphereLo, T(0xffcf3f), .2,.2,.08, 0,hh-.3,1.2)); }
      addOutline(h, .1);
      h.position.set(x, top, -5.2); add(noShadow(h));
      if(si % 2 === 0) for(const lx of [-1.2, 1.2]){
        const l = new THREE.Group();
        l.add(mesh(G.sphere, toon(0xff3b2f,{ emissive:0x881500 }), .3,.36,.3, 0,0,0));
        for(const y of [-.34,.34]) l.add(mesh(G.cyl, T(0x3a2a20), .13,.06,.13, 0,y,0));
        l.add(mesh(G.cyl, T(0x3a2a20), .01,.6,.01, 0,.65,0));
        const gl = new THREE.Sprite(new THREE.SpriteMaterial({ map:glowTexture('#ff9a5a'), transparent:true, depthWrite:false, blending:THREE.AdditiveBlending, opacity:.55 }));
        gl.userData.ownMat = true; gl.scale.set(1.5,1.5,1); l.add(gl);
        l.position.set(x + lx, top + 1.5, -3.9); add(noShadow(l)); flickers.push({ o:l, t:rnd()*6, sway:true });
      }
      si++;
    }
    // 廟宇（燕尾脊）
    for(let x=60;x<W;x+=80){
      const t = new THREE.Group();
      t.add(mesh(G.box, T(0xc0392b), 8,4,3, 0,2,0));
      t.add(mesh(G.box, T(0x2e7d32), 9.4,.5,3.6, 0,4.3,0));
      t.add(mesh(G.box, T(0xffb52e), 7,.4,2.4, 0,4.8,0));
      for(const sx of [-1,1]){ const e = mesh(G.cone, T(0xffb52e), .25,1.4,.25, sx*4.4,5.2,0); e.rotation.z = -sx*.9; t.add(e); }
      t.add(mesh(G.box, T(0x7a1f1a), 2,2.6,.1, 0,1.3,1.52));
      for(const sx of [-1,1]) t.add(mesh(G.cyl, T(0xd94b4b), .25,4,.25, sx*2.6,2,1.4));
      t.position.set(x, 3, -9); add(noShadow(t));
    }
  }
  else if(theme === 'sky'){
    for(let x=-10;x<W+20;x+=7+rnd()*8){
      const c = new THREE.Group(); const cc = T([0xf4ecff,0xffeaf4,0xeaf2ff][Math.floor(rnd()*3)]); for(let i=0;i<5;i++) c.add(mesh(G.sphereLo, cc, 1.5+rnd(), 1+rnd()*.5, 1.2, i*1.6-3, rnd()*.5, 0));
      c.position.set(x, -4 + rnd()*1.5, -9 - rnd()*12); add(noShadow(c));
    }
    const rainbow = new THREE.Group();
    [0xff6b6b,0xffa94d,0xffd43b,0x69db7c,0x4dabf7,0x9775fa].forEach((c,i) => {
      const r = new THREE.Mesh(new THREE.TorusGeometry(18-i*0.7, 0.36, 8, 60, Math.PI), new THREE.MeshBasicMaterial({ color:c, transparent:true, opacity:.55 }));
      r.userData.ownGeo = true; r.userData.ownMat = true; rainbow.add(r);
    });
    rainbow.position.set(W*0.45, -2, -48); add(rainbow);
    // 浮島
    for(let x=30;x<W;x+=40+rnd()*20){
      const is = new THREE.Group();
      addc(is, mesh(G.cone, T(0xb08a5a), 2.4,3,2.4, 0,-1.5,0)).rotation.x = Math.PI;
      is.add(mesh(G.cyl, T(0x7fcf6a), 2.5,.5,2.5, 0,.25,0));
      is.add(mesh(G.cyl, T(0x8a5a32), .15,1.2,.15, .6,1,0)); is.add(mesh(G.sphereLo, T(0x5fbf5a), .9,.8,.9, .6,1.9,0));
      is.position.set(x, 12 + rnd()*5, -16 - rnd()*8); add(noShadow(is)); flickers.push({ o:is, t:rnd()*6, bob:.4 });
    }
    // 熱氣球
    for(let x=15;x<W;x+=35+rnd()*25){
      const b = new THREE.Group();
      const cols = [0xff6b6b,0xffcf3f,0x69c3ff,0x9775fa];
      b.add(mesh(G.sphere, T(cols[Math.floor(rnd()*4)]), 1.3,1.5,1.3, 0,2,0));
      b.add(mesh(G.cyl, T(0xffffff), .9,.25,.9, 0,.7,0));
      b.add(mesh(G.box, T(0x8a5a32), .6,.5,.6, 0,0,0));
      b.position.set(x, 10 + rnd()*6, -10 - rnd()*12); add(noShadow(b)); flickers.push({ o:b, t:rnd()*6, bob:.7, drift:.3 });
    }
  }
  else if(theme === 'nightmarket'){
    const STALLS = ['肉圓','鱔魚意麵','棺材板','米糕','蚵仔煎','雞排','紅茶','冬瓜茶','豆花','蝦捲','炒鱔魚','烤玉米'];
    const awn = canvasTex('awning', 128, 64, (g,w,h) => { for(let i=0;i<8;i++){ g.fillStyle = i%2 ? '#ffffff' : '#e5383b'; g.fillRect(i*w/8,0,w/8,h); } });
    const awn2 = canvasTex('awning2', 128, 64, (g,w,h) => { for(let i=0;i<8;i++){ g.fillStyle = i%2 ? '#fff3c4' : '#1f8a70'; g.fillRect(i*w/8,0,w/8,h); } });
    let si = 0;
    for(let x=0;x<W+4;x+=4.2){
      const top = Math.max(3, groundTop(x)); const s = new THREE.Group();
      s.add(mesh(G.box, T(0x8a5a3a), 3.4,1.1,1.2, 0,.55,0));
      s.add(mesh(G.box, T(0xf2e6d0), 3.4,.12,1.3, 0,1.12,0));
      for(const sx of [-1.6,1.6]) s.add(mesh(G.cyl, T(0xcfd6de), .05,2.6,.05, sx,1.3,-.5));
      const a = new THREE.Mesh(new THREE.BoxGeometry(3.8,.12,1.6), new THREE.MeshToonMaterial({ map: si%2 ? awn2 : awn, gradientMap:gradTex }));
      a.userData.ownGeo = true; a.userData.ownMat = true; a.position.set(0,2.6,.1); a.rotation.x = .25; s.add(a);
      const sign = new THREE.Mesh(new THREE.PlaneGeometry(2.6,.8), new THREE.MeshBasicMaterial({ map:signTexture(STALLS[si % STALLS.length], ['#ffcf3f','#ff6b9a','#69c3ff','#3fc6a4'][si%4], '#1f2a5a') }));
      sign.userData.ownGeo = true; sign.userData.ownMat = true; sign.position.set(0, 3.2, -.2); s.add(sign);
      // 攤位上的小吃
      if(si % 2 === 0){ const food = snackFlat(SNACK_ORDER[(si/2) % SNACK_ORDER.length]); food.scale.setScalar(.7); food.position.set(-.8, 1.18, .2); s.add(food); }
      const bulb = new THREE.Sprite(new THREE.SpriteMaterial({ map:glowTexture('#ffd28a'), transparent:true, depthWrite:false, blending:THREE.AdditiveBlending, opacity:.85 }));
      bulb.userData.ownMat = true; bulb.scale.set(2.4,2.4,1); bulb.position.set(.6, 2.2, .3); s.add(bulb); flickers.push({ o:bulb, t:rnd()*6, glow:true });
      s.add(mesh(G.sphereLo, toon(0xfff2c0,{ emissive:0xffcc66 }), .12,.12,.12, .6,2.3,.3));
      s.position.set(x, top, -3.6); add(noShadow(s)); si++;
    }
    // 串燈
    const bulbs = [];
    for(let x=-2;x<W+2;x+=7){
      for(let i=0;i<14;i++){ const u = i/13; bulbs.push([x + u*7, 8.4 - Math.sin(u*Math.PI)*1.2, -2.2]); }
    }
    const bm = new THREE.InstancedMesh(new THREE.SphereGeometry(.09, 8, 6), new THREE.MeshBasicMaterial({ color:0xffffff }), bulbs.length);
    bm.userData.ownGeo = true; bm.userData.ownMat = true;
    const BC = [0xffd23f,0xff6b9a,0x69c3ff,0x7ef07a,0xffffff], Mx = new THREE.Matrix4(), Cc = new THREE.Color();
    bulbs.forEach((b,i) => { Mx.makeTranslation(b[0], b[1], b[2]); bm.setMatrixAt(i, Mx); bm.setColorAt(i, Cc.set(BC[i%BC.length]).multiplyScalar(1.6)); });
    bm.instanceColor.needsUpdate = true; add(bm);
    for(let x=-2;x<W+2;x+=7) add(mesh(G.cyl, T(0x3a3352), .06,8.5,.06, x,4.25,-2.2));
    // 遠方人群剪影
    const crowd = [];
    for(let x=-5;x<W+5;x+=1.3+rnd()*1.5) crowd.push([x, .9 + rnd()*.4, -7 - rnd()*2]);
    const cb = new THREE.InstancedMesh(G.capsule, T(0x2a2350), crowd.length), ch = new THREE.InstancedMesh(G.sphereLo, T(0x2a2350), crowd.length);
    crowd.forEach(([x,h,z],i) => {
      Mx.compose(new THREE.Vector3(x, 3.8, z), new THREE.Quaternion(), new THREE.Vector3(.5, h, .5)); cb.setMatrixAt(i, Mx);
      Mx.compose(new THREE.Vector3(x, 3.85 + h*.95, z), new THREE.Quaternion(), new THREE.Vector3(.28,.28,.28)); ch.setMatrixAt(i, Mx);
    });
    add(cb); add(ch);
  }
  else { // castle
    for(let x=-6;x<W+12;x+=13+rnd()*9){
      const t = new THREE.Group(); const h = 16+rnd()*7, r = 1.4+rnd()*.9;
      t.add(mesh(G.cyl, T(0x5a5174), r,h,r, 0,h/2,0));
      t.add(mesh(G.cone, T(0x9c4f6e), r*1.3,2.6,r*1.3, 0,h+1.3,0));
      const win = mesh(G.box, toon(0xffd66b,{ emissive:0xcc8a00 }), .35,.6,.1, 0,h*.7,r); t.add(win);
      t.position.set(x, -10, -30 - rnd()*12); add(noShadow(t));
    }
    // 城牆與火把
    for(let x=0;x<W;x+=6){
      const top = groundTop(x); if(top < 0) continue;
      const w = new THREE.Group();
      w.add(mesh(G.box, T(0x5e5774), 6,2.6,1, 0,1.3,0));
      for(let i=0;i<3;i++) w.add(mesh(G.box, T(0x5e5774), 1,.7,1, -2+i*2,2.95,0));
      for(const bx of [-2.2, -.7, .8, 2.3]) w.add(mesh(G.box, T(0x534c68), 1.3,.08,.05, bx, .9 + (bx > 0 ? .6 : 0), .52));
      const win = mesh(G.box, toon(0xffd66b,{ emissive:0xb07000 }), .7,1.1,.1, 0,1.5,.52); w.add(win);
      if(x % 12 === 0){
        const fl = mesh(G.cone, toon(0xffb02e,{ emissive:0xcc5500 }), .14,.4,.14, 2.4,2.05,.7); w.add(fl); w.add(mesh(G.cyl, T(0x5a3a2a), .05,.5,.05, 2.4,1.65,.7));
        const gl = new THREE.Sprite(new THREE.SpriteMaterial({ map:glowTexture('#ffb070'), transparent:true, depthWrite:false, blending:THREE.AdditiveBlending, opacity:.7 }));
        gl.userData.ownMat = true; gl.scale.set(2.2,2.2,1); gl.position.set(2.4,2.1,.75); w.add(gl);
        flickers.push({ o:fl, t:rnd()*6, torch:true, wx:x+3+2.4, wy:top+2.3 });
      }
      w.position.set(x+3, top, -3.4); add(noShadow(w));
    }
  }
}
