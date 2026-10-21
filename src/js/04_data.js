/* =====================================================================
   能力
   ===================================================================== */
const ABIL = {
  /* 敵人複製能力 */
  fire:  { name:'火焰', icon:'🔥', color:0xff6a2b, css:'#ff6a2b', hint:'按住 J 噴火' },
  ice:   { name:'冰凍', icon:'❄️', color:0x58c8ff, css:'#58c8ff', hint:'按住 J 吹冰，凍住敵人' },
  sword: { name:'寶劍', icon:'🗡️', color:0x47b04b, css:'#47b04b', hint:'按 J 揮劍' },
  rock:  { name:'石頭', icon:'🪨', color:0x8d8478, css:'#8d8478', hint:'按 J 變石頭壓扁敵人' },
  spark: { name:'電電', icon:'⚡', color:0xffd23f, css:'#e8b800', hint:'按住 J 放電，四周都打得到' },
  bomb:  { name:'炸彈', icon:'💣', color:0x3a3f5c, css:'#3a3f5c', hint:'按 J 丟炸彈，炸開鐵塊' },
  shuriken:{ name:'飛鏢', icon:'✴️', color:0xb8c2d8, css:'#7d88a6', hint:'按 J 一次丟出三支飛鏢' },
  arrow: { name:'弓箭', icon:'🏹', color:0xc98a4b, css:'#a8703a', hint:'按 J 射箭，一箭穿過好幾隻' },
  laser: { name:'雷射', icon:'🔆', color:0x7ff0ff, css:'#2fb8d0', hint:'按 J 發射雷射光束' },
  umbrella:{ name:'雨傘', icon:'☂️', color:0xff6b9a, css:'#e0507e', hint:'按 J 揮傘；按住跳慢慢飄下' },
  yoyo:  { name:'溜溜球', icon:'🪀', color:0xff6b9a, css:'#d94b8a', hint:'按 J 甩出溜溜球再收回' },
  /* 台南小吃特別能力 */
  noodle:  { name:'麵條鞭',   snack:true, icon:'🍜', color:0xffc94a, css:'#e0a420', hint:'按 J 甩出超長麵條鞭' },
  shrimp:  { name:'蝦捲飛彈', snack:true, icon:'🍤', color:0xff9a3d, css:'#ff9a3d', hint:'按 J 發射會追蹤的蝦捲' },
  coffin:  { name:'吐司衝撞', snack:true, icon:'🍞', color:0xd99a4e, css:'#d99a4e', hint:'按 J 穿上吐司盔甲往前衝' },
  douhua:  { name:'豆花彈跳', snack:true, icon:'🍮', color:0xf3e3c3, css:'#c9a46a', hint:'跳更高；空中按 J 重壓震波' },
  fish:    { name:'魚躍拋',   snack:true, icon:'🐟', color:0xb8c6d6, css:'#8fa3ba', hint:'按 J 拋出會彈跳的虱目魚' },
  wangguo: { name:'碗粿盾',   snack:true, icon:'🥣', color:0xd8b98a, css:'#b48a52', hint:'按住 J 舉盾反彈子彈；放開撞擊' },
  mango:   { name:'芒果冰沙', snack:true, icon:'🥭', color:0xffb52e, css:'#f2a000', hint:'按 J 射出冰塊，凍住敵人' },
  rouyuan: { name:'肉圓彈彈', snack:true, icon:'🥟', color:0xe9c8a0, css:'#c9965c', hint:'按 J 丟出在地上彈跳的肉圓' },
  eel:     { name:'鱔魚旋風', snack:true, icon:'🌀', color:0x7a4a2a, css:'#8a5a32', hint:'按 J 原地旋轉，捲走四周敵人' },
  oyster:  { name:'蚵仔煎飛盤',snack:true, icon:'🥏', color:0xf2d36b, css:'#d4a82a', hint:'按 J 丟出會飛回來的蚵仔煎' },
  zongzi:  { name:'粽子大鎚', snack:true, icon:'🔨', color:0x5a9a3a, css:'#4f8a32', hint:'按 J 大鎚重擊，打碎鐵塊' },
  pengbing:{ name:'椪餅膨膨', snack:true, icon:'🫓', color:0xe2b066, css:'#c98f3a', hint:'按 J 膨脹放出衝擊波' },
};
const COPY_ABILITIES = ['fire','ice','sword','rock','spark','bomb','shuriken','arrow','laser','umbrella','yoyo'];

/* =====================================================================
   台南小吃（模型取自大橋大車拚，並補齊新品項）
   ===================================================================== */
const SNACKS = {
  noodle:     { name:'擔仔麵',   type:'ability', fact:'台南的代表小吃。早年漁夫在休漁的季節挑著扁擔賣麵，小小一碗加上肉燥和鮮蝦，香味十足。' },
  shrimp:     { name:'蝦捲',     type:'ability', fact:'安平的名產。用網紗把蝦仁等餡料包起來下鍋油炸，外皮酥脆、裡面鮮甜。' },
  coffin:     { name:'棺材板',   type:'ability', fact:'台南發明的點心。把厚片吐司炸酥後挖空，填進雞肉、海鮮做成的奶油濃湯，再蓋上蓋子。' },
  douhua:     { name:'安平豆花', type:'ability', fact:'口感綿密的豆花加上糖水，安平一帶的豆花特別有名，夏天加冰更消暑。' },
  fish:       { name:'虱目魚粥', type:'ability', fact:'虱目魚是台南重要的養殖魚。魚肉配上熱粥，是很多台南人的早餐。' },
  wangguo:    { name:'碗粿',     type:'ability', fact:'用在來米漿裝在碗裡蒸熟，裡面藏著肉燥、蛋黃和香菇，吃的時候淋上醬汁。' },
  mango:      { name:'芒果冰',   type:'ability', fact:'台南玉井是有名的芒果產地，夏天把新鮮芒果鋪在刨冰上，又香又甜。' },
  rouyuan:    { name:'肉圓',     type:'ability', fact:'台南的肉圓多半是用「蒸」的，外皮Q彈，內餡有豬肉和筍丁，再淋上醬汁。' },
  eel:        { name:'鱔魚意麵', type:'ability', fact:'用大火快炒鱔魚和意麵，有甜酸勾芡和乾炒兩種口味，鍋氣十足。' },
  oyster:     { name:'蚵仔煎',   type:'ability', fact:'新鮮的蚵仔加上地瓜粉漿和蛋一起煎，起鍋前淋上甜辣醬，是夜市常客。' },
  zongzi:     { name:'菜粽',     type:'ability', fact:'台南的菜粽用花生和糯米包成，吃的時候撒上花生粉，常配一碗味噌湯。' },
  pengbing:   { name:'椪餅',     type:'ability', fact:'又叫「膨餅」，中間是空心的。傳統上可以敲開一個洞，打蛋進去用麻油煎。' },
  beef:       { name:'牛肉湯',   type:'heal', heal:6, fact:'台南人的早餐好朋友。生牛肉片用滾燙的湯一沖就熟，又嫩又鮮。吃了體力全滿，還會跑更快！' },
  almond:     { name:'杏仁茶',   type:'heal', heal:1, fact:'用杏仁磨漿煮成的熱飲，常搭配油條一起吃。喝了會產生護身泡泡，擋下一次傷害。' },
  wintermelon:{ name:'冬瓜茶',   type:'heal', heal:2, fact:'用冬瓜和糖熬煮成的古早味飲料，台南有開了很多年的老店。喝了補 2 格體力。' },
  shrimprice: { name:'蝦仁飯',   type:'heal', heal:3, fact:'台南特色小吃，用蝦仁和醬汁拌炒出香噴噴的米飯，常配一顆半熟鴨蛋。補 3 格體力。' },
  migao:      { name:'米糕',     type:'heal', heal:4, fact:'蒸好的糯米飯鋪上肉燥、魚鬆和小黃瓜片，是台南人愛吃的點心。補 4 格體力。' },
};
const SNACK_ORDER = ['noodle','shrimp','coffin','douhua','fish','wangguo','mango','rouyuan','eel','oyster','zongzi','pengbing','beef','almond','wintermelon','shrimprice','migao'];

/* 小吃模型：以 3dcar 的 envFood 為基礎改成卡通材質（原單位約半徑 5，最後統一縮放） */
const _snackCache = new Map();
function snackModel(kind){
  if(_snackCache.has(kind)) return _snackCache.get(kind).clone();
  const g = new THREE.Group();
  const M = c => toon(c);
  const cream = M(0xf6e7cc), red = M(0xb84a3a), gold = M(0xe0a656), green = M(0x5fa24f);
  const add = (geo, mat, x, y, z) => { const m = new THREE.Mesh(geo, mat); m.position.set(x,y,z); m.castShadow = true; g.add(m); return m; };
  const bevel = (w,h,d,r) => new RoundedBoxGeometry(w,h,d,2,r);
  const bowl = (soup, rim=red) => {
    const profile = [new THREE.Vector2(1.6,-3.3),new THREE.Vector2(2.6,-3),new THREE.Vector2(4.7,-.8),new THREE.Vector2(5.2,1),new THREE.Vector2(4.65,1),new THREE.Vector2(4.2,-.6),new THREE.Vector2(2.3,-2.6)];
    add(new THREE.LatheGeometry(profile,24), cream, 0,0,0);
    add(new THREE.TorusGeometry(5,.18,6,24), rim, 0,.95,0).rotation.x = Math.PI/2;
    add(new THREE.CylinderGeometry(4.55,4.55,.2,24), M(soup), 0,.55,0);
  };
  const plate = () => add(new THREE.CylinderGeometry(5.8,5.3,.65,24), cream, 0,-2,0);
  const scallion = (n=5, y=1.25, r=2.8) => { for(let k=0;k<n;k++) add(new THREE.SphereGeometry(.35,5,4), green, Math.sin(k*3)*r, y, Math.cos(k*3)*r); };
  const chopsticks = () => { for(const x of [-.35,.35]){ const c = add(new THREE.CylinderGeometry(.12,.12,10,6), M(0x8a5a3a), 3+x,2.2,0); c.rotation.x = Math.PI/2; c.rotation.z = .18; } };
  switch(kind){
    case 'noodle': bowl(0xb88244);
      for(let k=0;k<5;k++) add(new THREE.TorusGeometry(1.5+k*.4,.18,5,18), M(0xf0d08a), 0,.78,0).rotation.x = Math.PI/2;
      for(let k=0;k<6;k++) add(new THREE.SphereGeometry(.55,7,5), M(0x9a603c), Math.sin(k*2)*2,.98,Math.cos(k*2)*2);
      add(new THREE.TorusGeometry(.9,.42,6,12,Math.PI*1.3), M(0xff8a5a), 1.8,1.2,-1).rotation.x = -Math.PI/2;
      scallion(); chopsticks(); break;
    case 'shrimp': plate();
      for(let k=-1;k<=1;k++){ const r = add(new THREE.CylinderGeometry(1,1,6.5,12), gold, k*2.4,-.6,0); r.rotation.x = Math.PI/2; add(new THREE.TorusGeometry(.8,.16,4,12), cream, k*2.4,-.6,3.28); }
      for(let k=0;k<3;k++) add(new THREE.SphereGeometry(.85,7,5), green, -3+k*1.1,-1.1,-3.8); break;
    case 'coffin': plate();
      add(bevel(8.5,3.5,6.5,.45), gold, 0,-.2,0); add(bevel(6.3,.35,4.4,.25), M(0xf8eac4), 0,1.65,0);
      for(const v of [[-1.8,.7],[1.2,-.8],[1.8,1.2],[-1,-1]]) add(new THREE.SphereGeometry(.55,6,5), v[0] > 0 ? M(0xff9a6a) : green, v[0],2,v[1]);
      add(bevel(8.5,.8,6.5,.35), M(0xc98a3c), 0,3,-3.2).rotation.x = -.8; break;
    case 'wangguo': bowl(0x8a5530);
      add(new THREE.SphereGeometry(3.55,18,10), M(0xf2e2c4), 0,.6,0).scale.y = .4;
      add(new THREE.CylinderGeometry(1.8,1.8,.2,12), M(0x8a4a2a), 0,2,0);
      add(new THREE.SphereGeometry(.7,10,8), M(0xf2b632), 0,2.1,0).scale.y = .5; break;
    case 'douhua': bowl(0xcda778, M(0x7a5a3a));
      for(let k=0;k<4;k++){ const t = add(new THREE.SphereGeometry(1.8,10,6), M(0xfff4d6), Math.sin(k*2)*1.9,.8,Math.cos(k*2)*1.9); t.scale.set(1,.22,.75); }
      for(let k=0;k<6;k++) add(new THREE.SphereGeometry(.4,6,5), M(0xc98a4b), Math.sin(k*1.7)*2.6,1.1,Math.cos(k*1.7)*2.6); break;
    case 'beef': bowl(0x8c5432, M(0x8a5a2b));
      for(let k=0;k<5;k++){ const b = add(bevel(2.2,.3,1.7,.12), M(0xe08a8a), Math.sin(k*2)*2,.85,Math.cos(k*2)*2); b.rotation.y = k; }
      for(let k=0;k<5;k++) add(bevel(1.6,.12,.18,.05), M(0xfff1a8), Math.sin(k*2.6)*1.2,1.05,Math.cos(k*2.6)*1.2).rotation.y = k;
      scallion(); chopsticks(); break;
    case 'mango':
      add(new THREE.CylinderGeometry(4.7,3,2,20), cream, 0,-2,0);
      add(new THREE.SphereGeometry(4.1,14,10), M(0xf6f0e0), 0,-.5,0).scale.y = .7;
      for(let k=0;k<9;k++) add(bevel(1.5,1.1,1.3,.18), M(0xffb02e), Math.sin(k*2)*2.5,1.3+(k%3)*.25,Math.cos(k*2)*2.5);
      add(new THREE.SphereGeometry(1.2,12,10), M(0xfff4c2), 0,2.2,0); break;
    case 'almond':
      add(new THREE.CylinderGeometry(2.8,2.2,7,20), cream, 0,0,0);
      add(new THREE.CylinderGeometry(2.7,2.7,.15,20), M(0xeee0bd), 0,3.6,0);
      add(new THREE.CylinderGeometry(.15,.15,5,8), red, 1,5,0).rotation.z = -.2;
      { const yt = add(new THREE.CylinderGeometry(.45,.45,7,10), gold, -3.4,-.4,0); yt.rotation.z = .25; } break;
    case 'pengbing':
      add(new THREE.SphereGeometry(4.6,20,12), gold, 0,0,0).scale.y = .6;
      add(new THREE.CircleGeometry(1.6,20), red, 0,2.79,0).rotation.x = -Math.PI/2;
      add(new THREE.TorusGeometry(3.2,.18,6,24), M(0xc98a3c), 0,1.9,0).rotation.x = Math.PI/2; break;
    case 'fish': bowl(0xf6f1e2, M(0x3f9fc9));
      for(const [x,z,r] of [[-1.2,0,.3],[1.4,.8,-.4],[.2,-1.6,1.1]]){ const f = add(new THREE.SphereGeometry(1.7,12,8), M(0xe4eaf0), x,1,z); f.scale.set(1,.22,.6); f.rotation.y = r; }
      for(let k=0;k<5;k++) add(bevel(1.2,.12,.18,.05), M(0xfff1a8), Math.sin(k*2.6)*2.2,1.15,Math.cos(k*2.6)*2.2).rotation.y = k;
      scallion(7, 1.2, 3); break;
    case 'rouyuan':
      add(new THREE.CylinderGeometry(5.4,4.6,.8,24), cream, 0,-1.6,0);
      for(const x of [-2.1, 2.1]){
        const d = add(new THREE.SphereGeometry(2.4,18,12), M(0xeccba0), x,-.2,0); d.scale.y = .62;
        const s = add(new THREE.SphereGeometry(1.8,14,8), M(0xb8452f), x,.75,0); s.scale.y = .25;
      }
      scallion(6, 1.1, 2.4); break;
    case 'eel': plate();
      for(let k=0;k<4;k++) add(new THREE.TorusGeometry(1.4+k*.5,.22,5,18), M(0xf0cf7a), 0,-1.1,0).rotation.x = Math.PI/2;
      for(let k=0;k<6;k++){ const e = add(bevel(3,.5,.7,.2), M(0x4a2c18), Math.sin(k*1.1)*2.2,-.5,Math.cos(k*1.1)*2.2); e.rotation.y = k*1.1 + .6; e.rotation.z = .2; }
      for(let k=0;k<5;k++) add(new THREE.TorusGeometry(.6,.12,4,10), M(0xf6f0e6), Math.sin(k*2.3)*2.8,-.6,Math.cos(k*2.3)*2.8).rotation.x = Math.PI/2; break;
    case 'oyster': plate();
      add(new THREE.CylinderGeometry(4.6,4.8,.9,24), M(0xf2e2b0), 0,-1.2,0);
      for(let k=0;k<7;k++) add(new THREE.SphereGeometry(.85,8,6), M(0x9a9690), Math.sin(k*2.1)*2.6,-.6,Math.cos(k*2.1)*2.6).scale.y = .55;
      for(let k=0;k<4;k++) add(new THREE.SphereGeometry(1.2,10,6), M(0xe0583a), Math.sin(k*1.6)*1.4,-.55,Math.cos(k*1.6)*1.4).scale.y = .18;
      scallion(6, -.5, 3.2); break;
    case 'zongzi':
      add(new THREE.CylinderGeometry(5.4,4.6,.6,24), cream, 0,-2,0);
      for(const [x,r] of [[-1.8,.3],[2,-.4]]){
        const z = add(new THREE.ConeGeometry(2.6,4.4,3), M(0x4f8a32), x,.6,0); z.rotation.y = r;
        add(new THREE.TorusGeometry(1.6,.14,5,16), M(0xd8c08a), x,.2,0).rotation.x = Math.PI/2;
      }
      add(new THREE.SphereGeometry(1.4,10,6), M(0xe8cf9a), 0,-1.5,2.6).scale.y = .35; break;
    case 'wintermelon':
      add(new THREE.CylinderGeometry(2.6,2.1,7.5,20), M(0x9a5a28), 0,0,0);
      add(new THREE.CylinderGeometry(2.7,2.7,.4,20), M(0xffffff), 0,3.9,0);
      add(new THREE.CylinderGeometry(2.62,2.62,2.2,20), M(0x3f8a3a), 0,-.4,0);
      add(new THREE.CylinderGeometry(.18,.18,5,8), M(0xff6b6b), .8,5.5,0).rotation.z = -.2; break;
    case 'shrimprice': bowl(0xc98a4b);
      add(new THREE.SphereGeometry(3.6,16,10), M(0xd9b07a), 0,.9,0).scale.y = .45;
      for(let k=0;k<4;k++) add(new THREE.TorusGeometry(.7,.32,6,12,Math.PI*1.3), M(0xff8a5a), Math.sin(k*1.6)*1.8,2,Math.cos(k*1.6)*1.8).rotation.x = -Math.PI/2;
      add(new THREE.SphereGeometry(1.1,12,8), M(0xfff6e6), 2.6,1.6,1).scale.y = .5;
      add(new THREE.SphereGeometry(.55,10,8), M(0xf2a020), 2.6,1.95,1).scale.y = .5;
      scallion(4, 2, 1.2); break;
    case 'migao':
      add(new THREE.CylinderGeometry(3.4,3,3.4,20), M(0xcfd6de), 0,-1.2,0);
      add(new THREE.SphereGeometry(3.2,16,10), M(0xa8743c), 0,.6,0).scale.y = .4;
      add(new THREE.CylinderGeometry(1.8,1.8,.3,14), M(0x5a301c), 0,1.75,0);
      add(new THREE.SphereGeometry(1.2,10,6), M(0xe8c890), -1.6,1.7,1.2).scale.y = .4;
      for(let k=0;k<3;k++) add(new THREE.CylinderGeometry(.7,.7,.15,12), M(0x8fca5a), 1.2+k*.4,1.9+k*.05,-1+k*.8); break;
  }
  // 統一大小：寬約 1、底部在 y=0
  const b = new THREE.Box3().setFromObject(g), sz = b.getSize(new THREE.Vector3()), c = b.getCenter(new THREE.Vector3());
  const s = Math.min(1.05/Math.max(sz.x, sz.z), .9/sz.y);
  const wrap = new THREE.Group(); g.position.set(-c.x, -b.min.y, -c.z); wrap.add(g); wrap.scale.setScalar(s);
  addOutline(wrap, 0.0001);
  _snackCache.set(kind, wrap);
  return wrap.clone();
}

/* 裝飾用小吃：同材質合併成一個網格、沒有描邊，攤位上大量擺放也不吃效能 */
const _flatCache = new Map();
function snackFlat(kind){
  if(!_flatCache.has(kind)){
    const src = snackModel(kind); src.updateMatrixWorld(true);
    const byMat = new Map();
    src.traverse(o => {
      if(!o.isMesh || o.userData.isOutline) return;
      let g = o.geometry.index ? o.geometry.toNonIndexed() : o.geometry.clone();
      for(const k of Object.keys(g.attributes)) if(k !== 'position' && k !== 'normal') g.deleteAttribute(k);
      g.applyMatrix4(o.matrixWorld);
      if(!byMat.has(o.material)) byMat.set(o.material, []);
      byMat.get(o.material).push(g);
    });
    const grp = new THREE.Group();
    for(const [mat, list] of byMat){ const merged = mergeGeometries(list, false); if(merged) grp.add(new THREE.Mesh(merged, mat)); list.forEach(x => x.dispose()); }
    _flatCache.set(kind, grp);
  }
  return _flatCache.get(kind).clone();
}

/* 帽子：複製能力用專屬帽子；小吃能力把小吃頂在頭上 */
function makeHat(ab){
  const g = new THREE.Group();
  if(ab === 'fire'){
    addc(g, mesh(new THREE.TorusGeometry(.28,.05,8,24), toon(0xffcf3f), 1,1,1, 0,0,0)).rotation.x = Math.PI/2;
    [[-.16,.05],[0,.12],[.16,.05]].forEach(([x,z]) => g.add(mesh(G.cone, toon(0xff7a2b,{ emissive:0xaa3300 }), .1,.32,.1, x,.15,z)));
  } else if(ab === 'ice'){
    g.add(mesh(G.sphere, toon(0x58c8ff), .32,.2,.32, 0,.02,0)); g.add(mesh(G.sphereLo, toon(0xffffff), .1,.1,.1, 0,.22,0));
    g.add(mesh(G.cyl, toon(0xffffff), .33,.06,.33, 0,-.02,0));
  } else if(ab === 'sword'){
    const c = mesh(G.cone, toon(0x47b04b), .3,.6,.3, 0,.22,-.08); c.rotation.x = -0.5; g.add(c);
    g.add(mesh(G.cyl, toon(0xffcf3f), .3,.05,.3, 0,-.02,0));
  } else if(ab === 'rock'){
    addc(g, mesh(new THREE.TorusGeometry(.3,.06,8,24), toon(0xd94b4b), 1,1,1, 0,-.06,0)).rotation.x = Math.PI/2;
    g.add(mesh(G.box, toon(0xd94b4b), .08,.16,.04, .08,-.14,-.3));
  } else if(ab === 'spark'){
    addc(g, mesh(new THREE.TorusGeometry(.3,.05,8,24), toon(0x3a3f5c), 1,1,1, 0,-.04,0)).rotation.x = Math.PI/2;
    for(const sx of [-1,1]){ const b = mesh(G.bolt, toon(0xffd23f,{ emissive:0x886600 }), .16,.2,.16, sx*.18,.2,0); b.rotation.z = sx*.3; g.add(b); }
  } else if(ab === 'bomb'){
    g.add(mesh(G.sphere, toon(0x2f3450), .3,.2,.3, 0,.02,0));
    g.add(mesh(G.cyl, toon(0xd8c08a), .03,.18,.03, .05,.25,0));
    g.add(mesh(G.sphereLo, toon(0xff8a2b,{ emissive:0xcc4400 }), .05,.05,.05, .06,.36,0));
  } else if(ab === 'shuriken'){
    addc(g, mesh(new THREE.TorusGeometry(.3,.06,8,24), toon(0x3a3f5c), 1,1,1, 0,-.04,0)).rotation.x = Math.PI/2;
    for(const sx of [-1,1]){ const t = mesh(G.box, toon(0x3a3f5c), .3,.06,.03, -.36,-.02 + sx*.06,-.15); t.rotation.z = sx*.4; g.add(t); }
    g.add(mesh(G.box, toon(0xcfd6e6), .12,.12,.03, 0,-.02,.3));
  } else if(ab === 'arrow'){
    g.add(mesh(G.cone, toon(0x4f8a32), .3,.42,.3, 0,.14,0)); g.add(mesh(G.cyl, toon(0x3f7a2a), .32,.05,.32, 0,-.05,0));
    const f = mesh(G.box, toon(0xff6b6b), .03,.34,.08, .14,.3,-.05); f.rotation.z = -.5; g.add(f);
  } else if(ab === 'laser'){
    g.add(mesh(G.box, toon(0x3a3f5c), .62,.1,.1, 0,-.12,.28)); g.add(mesh(G.box, toon(0x7ff0ff,{ emissive:0x2a8a9a }), .5,.06,.04, 0,-.12,.34));
    g.add(mesh(G.cyl, toon(0xcfd6e6), .02,.25,.02, .2,.08,0)); g.add(mesh(G.sphereLo, toon(0xff5a7a,{ emissive:0xaa2244 }), .05,.05,.05, .2,.22,0));
  } else if(ab === 'umbrella'){
    g.add(mesh(G.hemi, toon(0xff6b9a), .36,.22,.36, 0,.04,0)); g.add(mesh(G.cyl, toon(0x6a4a3a), .02,.12,.02, 0,.3,0));
  } else if(ab === 'yoyo'){
    g.add(mesh(G.sphere, toon(0xff6b9a), .3,.16,.3, 0,.04,0)); g.add(mesh(G.box, toon(0xff6b9a), .36,.03,.18, 0,-.02,.28));
  } else if(ABIL[ab] && ABIL[ab].snack){
    const s = snackModel(ab); s.scale.multiplyScalar(.5); s.position.y = -.02; g.add(s);
  }
  addOutline(g, .03);
  return g;
}

/* =====================================================================
   敵人
   ===================================================================== */
function addEyes(g, y, z, sp, s=1, angry=false){
  const ink = basic(0x1d1d2b), wh = basic(0xffffff);
  const eyes = [];
  for(const sx of [-1,1]){
    const e = mesh(G.sphereLo, ink, .065*s,.1*s,.05*s, sx*sp, y, z); g.add(e); eyes.push(e);
    const h = mesh(G.sphereLo, wh, .024*s,.024*s,.02*s, sx*sp+.018*s, y+.04*s, z+.04*s); g.add(h); eyes.push(h);
    if(angry){ const b = mesh(G.box, ink, .14*s,.035*s,.03*s, sx*sp, y+.14*s, z+.01); b.rotation.z = -sx*0.45; g.add(b); }
  }
  g.userData.eyes = (g.userData.eyes || []).concat(eyes);
  return eyes;
}
function addCheeks(g, y, z, sp, col=0xff9aa8){ for(const sx of [-1,1]) g.add(mesh(G.sphereLo, toon(col), .06,.035,.02, sx*sp, y, z)); }
function addFeet(g, col, sp=.18, sz=1){
  const feet = [];
  for(const sx of [-1,1]){ const f = mesh(G.sphereLo, toon(col), .12*sz,.07*sz,.15*sz, sx*sp,.05,.05); g.add(f); feet.push(f); }
  g.userData.feet = feet; return feet;
}
const ENEMY = {
  acorn: { name:'橡果怪', hp:2, speed:1.1, move:'walk', ability:null, w:.8, h:.85, build(){
      const g = new THREE.Group();
      g.add(mesh(G.sphere, toon(0xc98a4b), .4,.42,.38, 0,.44,0));
      g.add(mesh(G.sphere, toon(0x7a4a24), .45,.26,.43, 0,.68,0));
      for(let i=0;i<6;i++){ const a = i/6*Math.PI*2; g.add(mesh(G.sphereLo, toon(0x6a3e1c), .05,.03,.05, Math.cos(a)*.3,.83,Math.sin(a)*.3)); }
      g.add(mesh(G.cyl, toon(0x5a3518), .04,.16,.04, 0,.94,0));
      addEyes(g, .46, .35, .12); addCheeks(g, .36, .35, .22); addFeet(g, 0x5a3518);
      return g; } },
  flame: { name:'火球怪', hp:2, speed:1.0, move:'walk', ability:'fire', w:.8, h:.9, build(){
      const g = new THREE.Group();
      g.add(mesh(G.sphere, toon(0xff6a3d), .4,.38,.38, 0,.42,0));
      const f1 = mesh(G.cone, toon(0xffb02e,{ emissive:0xaa4400 }), .26,.55,.26, 0,.97,0); g.add(f1);
      g.add(mesh(G.cone, toon(0xffe45c,{ emissive:0xaa8800 }), .14,.36,.14, .05,1.04,.08));
      addEyes(g, .46, .34, .12, 1, true); addFeet(g, 0x9c2f1a);
      g.userData.flame = f1; return g; } },
  icy: { name:'冰晶怪', hp:2, speed:1.25, move:'walk', ability:'ice', w:.8, h:.85, build(){
      const g = new THREE.Group();
      g.add(mesh(G.ico, toon(0x9fe3ff), .42,.4,.4, 0,.44,0));
      g.add(mesh(G.sphere, toon(0xffffff), .3,.12,.3, 0,.8,0));
      for(const sx of [-1,1]) g.add(mesh(G.cone, toon(0xd6f4ff), .07,.22,.07, sx*.18,.95,0));
      addEyes(g, .48, .37, .12); addCheeks(g, .38, .36, .22, 0xbfe0ff); addFeet(g, 0x4b9fd1);
      return g; } },
  knight: { name:'小劍士', hp:3, speed:1.3, move:'walk', ability:'sword', w:.8, h:.95, build(){
      const g = new THREE.Group();
      g.add(mesh(G.sphere, toon(0x8a63d2), .38,.4,.36, 0,.44,0));
      g.add(mesh(G.sphere, toon(0xb9c2d6), .4,.3,.38, 0,.74,0));
      g.add(mesh(G.box, toon(0xff6b6b), .06,.26,.32, 0,1.06,0));
      g.add(mesh(G.box, toon(0x8e96ad), .52,.06,.06, 0,.6,.32));
      addEyes(g, .48, .37, .1); addCheeks(g, .38, .35, .2, 0xc9a8ff);
      const sw = new THREE.Group();
      sw.add(mesh(G.box, toon(0xe8edf7), .07,.62,.03, 0,.38,0)); sw.add(mesh(G.box, toon(0xffcf3f), .26,.06,.08, 0,.07,0));
      sw.position.set(.42,.32,.1); g.add(sw); g.userData.sword = sw;
      addFeet(g, 0x4b3a7a); return g; } },
  rocky: { name:'石頭怪', hp:3, speed:.6, move:'walk', ability:'rock', w:.85, h:.85, build(){
      const g = new THREE.Group();
      g.add(mesh(G.dodeca, toon(0x9a9188), .44,.42,.42, 0,.44,0));
      g.add(mesh(G.dodeca, toon(0x7f776e), .14,.1,.12, .2,.78,.1));
      addEyes(g, .5, .37, .13, 1, true); addFeet(g, 0x5f5850, .2);
      return g; } },
  spark: { name:'電電球', hp:2, speed:.8, move:'walk', ability:'spark', w:.8, h:.85, build(){
      const g = new THREE.Group();
      g.add(mesh(G.sphere, toon(0xffd23f,{ emissive:0x553a00 }), .4,.4,.4, 0,.44,0));
      for(let i=0;i<5;i++){ const a = i/5*Math.PI*2; const b = mesh(G.bolt, toon(0xfff2a0,{ emissive:0x887700 }), .12,.16,.12, Math.cos(a)*.42,.5+Math.sin(a)*.42,0); b.rotation.z = a; g.add(b); }
      const aura = new THREE.Mesh(new THREE.SphereGeometry(1.3, 20, 14), new THREE.MeshBasicMaterial({ color:0xfff27a, transparent:true, opacity:.22, depthWrite:false }));
      aura.position.y = .45; aura.visible = false; g.add(aura); g.userData.aura = aura;
      addEyes(g, .48, .37, .12); addFeet(g, 0x8a6a00);
      return g; } },
  bomber: { name:'炸彈兵', hp:2, speed:.9, move:'walk', ability:'bomb', w:.8, h:.9, build(){
      const g = new THREE.Group();
      g.add(mesh(G.sphere, toon(0x3a3f5c), .4,.4,.38, 0,.44,0));
      g.add(mesh(G.cyl, toon(0xd8c08a), .05,.2,.05, 0,.92,0));
      const spark = mesh(G.sphereLo, toon(0xff8a2b,{ emissive:0xcc4400 }), .07,.07,.07, 0,1.04,0); g.add(spark); g.userData.fuse = spark;
      g.add(mesh(G.box, toon(0xffffff), .5,.08,.05, 0,.6,.34));
      addEyes(g, .46, .36, .12, 1, true); addFeet(g, 0xd8c08a);
      return g; } },
  frog: { name:'跳跳蛙', hp:2, speed:0, move:'hop', ability:null, w:.85, h:.7, build(){
      const g = new THREE.Group();
      g.add(mesh(G.sphere, toon(0x6cc24a), .44,.32,.38, 0,.34,0));
      g.add(mesh(G.sphere, toon(0xd9f2a8), .3,.2,.12, 0,.28,.3));
      for(const sx of [-1,1]){ g.add(mesh(G.sphere, toon(0x6cc24a), .14,.14,.14, sx*.2,.62,.1)); }
      const ink = basic(0x1d1d2b); const eyes = [];
      for(const sx of [-1,1]){ const e = mesh(G.sphereLo, ink, .06,.07,.04, sx*.2,.64,.22); g.add(e); eyes.push(e); }
      g.userData.eyes = eyes; addCheeks(g, .42, .34, .26); addFeet(g, 0x4f9a3a, .26, 1.2);
      return g; } },
  bird: { name:'啾啾鳥', hp:1, speed:1.6, move:'fly', ability:null, w:.7, h:.6, build(){
      const g = new THREE.Group();
      g.add(mesh(G.sphere, toon(0xffd84a), .32,.3,.3, 0,.3,0));
      addc(g, mesh(G.cone, toon(0xff8a3d), .08,.18,.08, 0,.28,.34)).rotation.x = Math.PI/2;
      addEyes(g, .38, .26, .1, .9); addCheeks(g, .26, .26, .18);
      const wl = mesh(G.sphereLo, toon(0xfff1b0), .22,.08,.14, -.34,.36,0), wr = mesh(G.sphereLo, toon(0xfff1b0), .22,.08,.14, .34,.36,0);
      g.add(wl, wr); g.userData.wings = [wl, wr]; return g; } },
  parasol: { name:'傘傘妹', hp:1, speed:.8, move:'drift', ability:'umbrella', w:.7, h:.9, build(){
      const g = new THREE.Group();
      g.add(mesh(G.sphere, toon(0xffb3c8), .28,.28,.26, 0,.3,0));
      const um = new THREE.Group();
      um.add(mesh(G.hemi, toon(0xff6b9a), .55,.32,.55, 0,0,0));
      for(let i=0;i<4;i++){ const a = i/4*Math.PI*2+.4; um.add(mesh(G.hemi, toon(0xffffff), .2,.08,.2, Math.cos(a)*.32,.18,Math.sin(a)*.32)); }
      um.add(mesh(G.cyl, toon(0x6a4a3a), .02,.5,.02, 0,-.25,0));
      um.position.y = .95; g.add(um); g.userData.umbrella = um;
      addEyes(g, .34, .25, .1, .9); addCheeks(g, .24, .24, .17);
      return g; } },
  ghost: { name:'燈籠鬼', hp:2, speed:.9, move:'ghost', ability:null, w:.8, h:.9, build(){
      const g = new THREE.Group();
      g.add(mesh(G.capsule, toon(0xff4b3a,{ emissive:0x661a10 }), .8,.62,.8, 0,.48,0));
      for(const y of [.18,.78]) g.add(mesh(G.cyl, toon(0x3a2a20), .3,.06,.3, 0,y,0));
      g.add(mesh(G.cyl, toon(0xffd23f), .02,.14,.02, 0,.92,0));
      const glow = new THREE.Sprite(new THREE.SpriteMaterial({ map:glowTexture('#ffb070'), transparent:true, depthWrite:false, blending:THREE.AdditiveBlending }));
      glow.scale.set(1.8,1.8,1); glow.position.y = .5; g.add(glow);
      addEyes(g, .52, .41, .12, 1, true);
      g.add(mesh(G.box, basic(0x1d1d2b), .2,.05,.03, 0,.34,.42));
      return g; } },
  spiky: { name:'刺刺球', hp:1, speed:0, move:'bob', ability:null, invul:true, noInhale:true, w:.8, h:.8, build(){
      const g = new THREE.Group();
      g.add(mesh(G.sphere, toon(0x2f3561), .36,.36,.36, 0,.4,0));
      const n = 14;
      for(let i=0;i<n;i++){
        const y = 1 - (i+.5)*2/n, r = Math.sqrt(1-y*y), a = i*2.39996;
        const dir = new THREE.Vector3(Math.cos(a)*r, y, Math.sin(a)*r);
        const c = mesh(G.cone, toon(0xffffff), .09,.28,.09); c.position.copy(dir.clone().multiplyScalar(.42)).add(new THREE.Vector3(0,.4,0));
        c.quaternion.setFromUnitVectors(new THREE.Vector3(0,1,0), dir); g.add(c);
      }
      addEyes(g, .46, .33, .11, 1, true);
      return g; } },
  ninja: { name:'小忍者', hp:2, speed:2.0, move:'walk', ability:'shuriken', w:.8, h:.85, build(){
      const g = new THREE.Group();
      g.add(mesh(G.sphere, toon(0x2f3450), .38,.4,.36, 0,.44,0));
      g.add(mesh(G.box, toon(0xf6e2c8), .5,.16,.06, 0,.5,.33));
      for(const sx of [-1,1]){ const t = mesh(G.box, toon(0xd94b4b), .3,.05,.03, -.4,.66 + sx*.05,-.1); t.rotation.z = sx*.4; g.add(t); }
      g.add(mesh(G.box, toon(0xd94b4b), .78,.07,.74, 0,.66,0));
      addEyes(g, .5, .37, .11, 1, true); addFeet(g, 0x1f2340);
      return g; } },
  archer: { name:'弓箭手', hp:2, speed:.5, move:'walk', ability:'arrow', w:.8, h:.95, build(){
      const g = new THREE.Group();
      g.add(mesh(G.sphere, toon(0x6cc24a), .38,.4,.36, 0,.44,0));
      g.add(mesh(G.cone, toon(0x3f7a2a), .4,.5,.4, 0,.98,0));
      const bow = new THREE.Group();
      bow.add(mesh(new THREE.TorusGeometry(.38,.03,6,16,Math.PI), toon(0x8a5a32), 1,1,1, 0,0,0)); bow.children[0].rotation.z = -Math.PI/2;
      bow.add(mesh(G.cyl, toon(0xf2e6d0), .006,.76,.006, 0,0,0));
      bow.position.set(.42,.45,.12); g.add(bow); g.userData.bow = bow;
      addEyes(g, .48, .37, .11); addCheeks(g, .38, .35, .2); addFeet(g, 0x8a5a32);
      return g; } },
  laserbot: { name:'雷射機器人', hp:3, speed:.6, move:'walk', ability:'laser', w:.85, h:.9, build(){
      const g = new THREE.Group();
      g.add(mesh(G.rbox, toon(0xcfd6e6), .7,.62,.6, 0,.42,0));
      const eye = mesh(G.box, toon(0x7ff0ff,{ emissive:0x2a8a9a }), .5,.12,.05, 0,.5,.31); g.add(eye); g.userData.visor = eye;
      g.add(mesh(G.cyl, toon(0x7d88a6), .03,.3,.03, 0,.86,0)); g.add(mesh(G.sphereLo, toon(0xff5a7a,{ emissive:0xaa2244 }), .07,.07,.07, 0,1.03,0));
      addFeet(g, 0x5a6480, .2);
      return g; } },
  yoyokid: { name:'溜溜球小子', hp:2, speed:1.2, move:'walk', ability:'yoyo', w:.8, h:.85, build(){
      const g = new THREE.Group();
      g.add(mesh(G.sphere, toon(0xffb347), .38,.4,.36, 0,.44,0));
      g.add(mesh(G.sphere, toon(0xff6b9a), .4,.18,.38, 0,.74,0)); g.add(mesh(G.box, toon(0xff6b9a), .46,.04,.24, 0,.7,.3));
      const yo = new THREE.Group(); for(const z of [-.05,.05]){ const d = mesh(G.cyl, toon(0x69c3ff), .14,.05,.14, 0,0,z); d.rotation.x = Math.PI/2; yo.add(d); }
      yo.position.set(.45,.3,.1); g.add(yo); g.userData.yoyo = yo;
      addEyes(g, .48, .36, .11); addCheeks(g, .38, .35, .21); addFeet(g, 0xa86a2a);
      return g; } },
  cannon: { name:'砲台', hp:4, speed:0, move:'static', ability:null, noInhale:true, w:.95, h:.9, build(){
      const g = new THREE.Group();
      g.add(mesh(G.rbox, toon(0x6a5a8a), .9,.5,.8, 0,.25,0));
      const barrel = new THREE.Group();
      addc(barrel, mesh(G.cyl, toon(0x3a3352), .26,.7,.26, 0,0,0)).rotation.z = Math.PI/2;
      addc(barrel, mesh(new THREE.TorusGeometry(.26,.06,6,16), toon(0xffcf3f), 1,1,1, .35,0,0)).rotation.y = Math.PI/2;
      barrel.position.set(.15,.62,0); g.add(barrel); g.userData.barrel = barrel;
      addEyes(g, .3, .41, .16, 1.1, true);
      return g; } },
};

/* =====================================================================
   主題與關卡
   ===================================================================== */
const THEMES = {
  meadow:     { name:'草原', sky:['#6fc0f0','#e9f8ff'], dirt:0xb47a46, dirt2:0xa36c3c, top:0x6cc24a, oneway:0xd0a060, block:0xffcf3f, fog:0xd8f0ff, song:'meadow', thumb:'linear-gradient(180deg,#6fc0f0,#bfe8a0)', night:false, tufts:true },
  oldstreet:  { name:'老街', sky:['#ffb27a','#ffe9c8'], dirt:0xa8503a, dirt2:0x96452f, top:0xc9b8a0, oneway:0x8a5a3a, block:0xffc94d, fog:0xffe0c0, song:'oldstreet', thumb:'linear-gradient(180deg,#ffb27a,#e8a080)', night:false },
  sky:        { name:'雲海', sky:['#9fb2ff','#ffe7f2'], dirt:0xf6f3ff, dirt2:0xe9e4ff, top:0xffffff, oneway:0xffffff, block:0xffcf3f, fog:0xf0eaff, song:'sky', thumb:'linear-gradient(180deg,#9fb2ff,#ffe7f2)', night:false },
  nightmarket:{ name:'夜市', sky:['#141a4a','#4a2a6a'], dirt:0x4a4560, dirt2:0x403b55, top:0x8a8298, oneway:0xd9534f, block:0xffc94d, fog:0x2a2450, song:'nightmarket', thumb:'linear-gradient(180deg,#141a4a,#a04a7a)', night:true },
  castle:     { name:'古堡', sky:['#2f2a5c','#b5799f'], dirt:0x7d7690, dirt2:0x6e6782, top:0xa59fb8, oneway:0x8b6a4a, block:0xffc94d, fog:0x5e507c, song:'castle', thumb:'linear-gradient(180deg,#2f2a5c,#b5799f)', night:true },
};

const LEVELS = [
  { name:'蒲公英草原', theme:'meadow', width:200, par:150, build(g){
      g.ground(0,30,3);
      g.sign(3,3,'← → 移動，空白鍵跳'); g.stars(7,10,5);
      g.sign(12,3,'按住 J 把敵人吸進嘴裡，再按 J 吐出星星！'); g.enemy('acorn',17,3); g.enemy('acorn',25,3);
      g.sign(28,3,'在空中再按跳，會鼓起來飄喔');
      g.ground(34,64,3); g.box(42,45,3,4);
      g.sign(36,3,'吸住火球怪後按 ↓ 吞下去，就能複製火焰！'); g.enemy('flame',39,3);
      g.plat(48,52,7); g.stars(48,52,8); g.enemy('bird',54,8.5);
      g.sign(57,3,'吃台南小吃會得到特別能力！'); g.item('noodle',60,3);
      g.ground(68,100,3); g.enemy('acorn',72,3); g.enemy('knight',80,3);
      g.blocks(86,87,3,5); g.stars(90,94,4); g.enemy('archer',98,3); g.enemy('icy',96,3);
      g.ground(104,138,3); g.checkpoint(107,3);
      g.item('cotton',110,3); g.spring(112,3); g.plat(114,120,10); g.stars(114,120,11); g.item('wintermelon',121,11);
      g.enemy('frog',124,3); g.box(128,131,3,4); g.box(132,135,3,6); g.enemy('rocky',133,7);
      g.mover(140,5.5,3, 6,0, 1.6);
      g.ground(151,199,3); g.enemy('bird',157,8); g.enemy('yoyokid',162,3); g.item('beef',166,3);
      g.enemy('flame',172,3); g.stars(174,178,5); g.enemy('bomber',182,3); g.metal(187,187,3,5); g.stars(188,190,4);
      g.door(195,3);
  }},
  { name:'安平老街', theme:'oldstreet', width:212, par:190, build(g){
      g.ground(0,40,3); g.enemy('knight',12,3); g.enemy('acorn',20,3); g.item('shrimp',26,3);
      g.sign(24,3,'安平蝦捲：發射會追著敵人跑的蝦捲'); g.blocks(32,33,3,5); g.enemy('spark',37,3);
      g.ground(44,70,3); g.box(50,53,3,5); g.plat(55,62,8); g.stars(55,62,9); g.enemy('bomber',58,9);
      g.enemy('ninja',63,3); g.enemy('cannon',67,3,{ dir:-1 }); g.mover(71,4.5,3, 3,0, 1.4);
      g.ground(78,110,3); g.checkpoint(80,3); g.item('douhua',85,3); g.enemy('frog',90,3);
      g.spikes(96,98,3); g.plat(95,99,6); g.stars(95,99,7); g.enemy('parasol',104,12); g.item('oyster',108,3);
      g.ground(112,150,3); g.enemy('bomber',116,3); g.sign(118,3,'鐵塊要用炸彈或大鎚才打得破'); g.metal(121,122,3,5); g.stars(121,122,7);
      g.stars(124,128,4); g.enemy('spark',130,3); g.enemy('archer',134,3); g.enemy('knight',140,3); g.item('wangguo',144,3);
      g.ground(154,211,3); g.checkpoint(157,3); g.enemy('acorn',165,3); g.enemy('flame',172,3); g.item('shrimprice',178,3);
      g.boss('megaknight',186,207);
  }},
  { name:'棉花糖雲海', theme:'sky', width:212, par:190, build(g){
      g.ground(0,18,3); g.stars(4,7,5); g.enemy('acorn',12,3);
      g.plat(21,25,5); g.plat(28,32,7); g.stars(28,32,8); g.enemy('bird',30,10);
      g.ground(35,55,3); g.enemy('icy',41,3); g.enemy('spiky',47,5); g.item('mango',52,3);
      g.item('cotton',50,3); g.spring(54,3); g.plat(57,61,8); g.plat(64,68,8); g.stars(64,68,9); g.enemy('parasol',66,15);
      g.mover(70,5,3, 0,4, 1.2); g.plat(76,79,7);
      g.ground(82,104,3); g.checkpoint(84,3); g.item('fish',88,3); g.spikes(92,95,3); g.plat(91,96,6); g.enemy('knight',100,3);
      g.mover(106,5,3, 7,0, 1.8); g.enemy('spiky',109,8); g.enemy('bird',112,9);
      g.ground(117,140,3); g.enemy('rocky',121,3); g.enemy('ninja',126,3); g.item('almond',133,3); g.enemy('spark',137,3);
      g.box(141,143,0,5); g.stars(141,143,7);
      g.ground(144,170,3); g.checkpoint(146,3); g.enemy('parasol',152,14); g.enemy('bomber',158,3); g.item('beef',163,3);
      g.mover(172,4.5,3, 0,5, 1.3); g.plat(176,180,9); g.stars(176,180,10); g.enemy('spiky',183,7);
      g.ground(186,211,3); g.enemy('bird',192,8); g.enemy('yoyokid',198,3); g.door(206,3);
  }},
  { name:'花園夜市', theme:'nightmarket', width:222, par:200, build(g){
      g.ground(0,36,3); g.enemy('ghost',14,4); g.item('rouyuan',20,3); g.enemy('flame',27,3); g.stars(30,34,5);
      g.ground(40,72,3); g.enemy('bomber',46,3); g.plat(50,56,6); g.stars(50,56,7); g.item('eel',58,3); g.enemy('frog',62,3);
      g.enemy('cannon',70,3,{ dir:-1 }); g.mover(73,4.5,3, 4,0, 1.5);
      g.ground(82,118,3); g.checkpoint(84,3); g.enemy('ghost',92,5); g.item('coffin',96,3); g.metal(102,102,3,5);
      g.enemy('laserbot',107,3); g.spikes(112,114,3); g.plat(111,115,6); g.item('migao',113,7);
      g.ground(122,160,3); g.enemy('ninja',128,3); g.item('cotton',131,3); g.spring(134,3); g.plat(136,142,10); g.stars(136,142,11); g.enemy('ghost',145,7);
      g.enemy('archer',150,3); g.item('beef',156,3);
      g.ground(164,221,3); g.checkpoint(167,3); g.enemy('flame',175,3); g.stars(178,182,5);
      g.boss('bigflame',196,217);
  }},
  { name:'雷雲古堡', theme:'castle', width:206, par:220, build(g){
      g.ground(0,30,3); g.box(10,12,3,4); g.enemy('knight',18,3); g.spikes(22,24,3); g.plat(21,25,6); g.enemy('cannon',29,3,{ dir:-1 });
      g.ground(34,62,3); g.item('zongzi',37,3); g.enemy('rocky',42,3); g.metal(47,48,3,5); g.stars(47,48,7); g.enemy('ghost',52,6); g.enemy('spiky',57,6);
      g.ground(66,100,3); g.checkpoint(68,3); g.enemy('laserbot',56,3); g.spikes(72,76,3); g.mover(71,6,3, 5,0, 1.6); g.enemy('spark',82,3);
      g.item('pengbing',86,3); g.enemy('archer',92,3); g.stars(94,98,5);
      g.ground(104,140,3); g.enemy('ninja',110,3); g.item('wintermelon',114,3); g.enemy('ghost',120,6); g.blocks(126,127,3,5);
      g.enemy('flame',132,3); g.item('shrimp',137,3);
      g.ground(144,205,3); g.checkpoint(147,3); g.enemy('yoyokid',160,3); g.item('almond',152,3); g.item('cotton',166,3); g.item('beef',156,3); g.stars(158,162,4);
      g.boss('cloudking',172,193);
  }},
];
