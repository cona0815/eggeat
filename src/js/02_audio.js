/* =====================================================================
   音效（Web Audio 合成）與配樂（music/ 資料夾的 mp3，缺檔時用合成曲）
   ===================================================================== */
let actx = null, sfxBus = null, musicBus = null;
function getActx(){
  if(!actx){
    actx = new (window.AudioContext || window.webkitAudioContext)();
    sfxBus = actx.createGain(); sfxBus.connect(actx.destination);
    musicBus = actx.createGain(); musicBus.connect(actx.destination);
    applyVolumes();
  }
  if(actx.state === 'suspended') actx.resume();
  return actx;
}
function applyVolumes(){
  if(!actx) return;
  sfxBus.gain.value = (SAVE.settings.sfx/100);
  musicBus.gain.value = (SAVE.settings.music/100)*0.9;
}
function tone(f, d=0.1, type='square', vol=0.05, slide=null, delay=0){
  if(SAVE.settings.sfx <= 0) return;
  try{
    getActx();
    const t0 = actx.currentTime + delay;
    const o = actx.createOscillator(), g = actx.createGain();
    o.type = type; o.frequency.setValueAtTime(f, t0);
    if(slide) o.frequency.exponentialRampToValueAtTime(slide, t0+d);
    g.gain.setValueAtTime(vol, t0); g.gain.exponentialRampToValueAtTime(0.0001, t0+d);
    o.connect(g); g.connect(sfxBus); o.start(t0); o.stop(t0+d+0.02);
  }catch(e){}
}
let _noiseBuf = null;
function noise(d=.2, vol=.08, freq=1200, type='bandpass', delay=0){
  if(SAVE.settings.sfx <= 0) return;
  try{
    getActx();
    if(!_noiseBuf){ _noiseBuf = actx.createBuffer(1, actx.sampleRate*.6, actx.sampleRate); const ch = _noiseBuf.getChannelData(0); for(let i=0;i<ch.length;i++) ch[i] = Math.random()*2-1; }
    const t0 = actx.currentTime + delay;
    const s = actx.createBufferSource(); s.buffer = _noiseBuf;
    const f = actx.createBiquadFilter(); f.type = type; f.frequency.value = freq;
    const g = actx.createGain(); g.gain.setValueAtTime(vol, t0); g.gain.exponentialRampToValueAtTime(0.0001, t0+d);
    s.connect(f); f.connect(g); g.connect(sfxBus); s.start(t0); s.stop(t0+d+.02);
  }catch(e){}
}
const sfx = {
  jump(){ tone(420,0.12,'square',0.04,760); },
  flap(){ tone(300,0.08,'triangle',0.05,520); },
  puff(){ tone(520,0.14,'sine',0.06,200); noise(.1,.03,2400,'highpass'); },
  inhale(){ tone(180,0.16,'sawtooth',0.016,420); noise(.16,.03,900); },
  gulp(){ tone(600,0.08,'square',0.05,240); tone(240,0.1,'square',0.04,120,0.07); },
  spit(){ tone(900,0.16,'square',0.05,300); },
  swallow(){ tone(500,0.1,'triangle',0.06,200); tone(200,0.12,'triangle',0.05,140,0.08); },
  ability(){ [660,880,1100,1320].forEach((f,i)=>tone(f,0.12,'square',0.045,null,i*0.07)); },
  hit(){ tone(260,0.08,'square',0.06,120); noise(.06,.05,1800); },
  pop(){ tone(800,0.06,'triangle',0.06,1400); },
  coin(){ tone(1180,0.06,'square',0.035); tone(1580,0.1,'square',0.035,null,0.05); },
  hurt(){ tone(380,0.22,'sawtooth',0.06,110); },
  heal(){ [520,660,780].forEach((f,i)=>tone(f,0.1,'triangle',0.06,null,i*0.06)); },
  slash(){ tone(1400,0.09,'sawtooth',0.03,300); noise(.08,.04,4000,'highpass'); },
  stone(){ tone(120,0.2,'square',0.07,60); noise(.2,.06,300,'lowpass'); },
  breath(){ noise(.1,.04,700 + Math.random()*400); },
  zap(){ tone(1600 + Math.random()*400,0.05,'sawtooth',0.025,800); },
  boom(){ tone(110,0.35,'square',0.08,40); noise(.4,.12,500,'lowpass'); },
  clear(){ [523,659,784,1046,784,1046].forEach((f,i)=>tone(f,0.16,'square',0.05,null,i*0.11)); },
  die(){ [600,500,400,300,200].forEach((f,i)=>tone(f,0.14,'square',0.05,null,i*0.1)); },
  boss(){ tone(90,0.6,'sawtooth',0.07,55); noise(.6,.06,200,'lowpass'); },
  flag(){ [784,988,1175,1568].forEach((f,i)=>tone(f,0.1,'triangle',0.06,null,i*0.06)); },
  spring(){ tone(300,0.18,'sine',0.07,900); },
  select(){ tone(880,0.05,'square',0.03); },
  deny(){ tone(200,0.12,'square',0.04,150); },
};

/* ── 合成備用曲（記譜：每小節 16 格；- 延長；. 休止；鼓 k s h） ── */
/*FALLBACK_TRACKS*/
TRACKS.oldstreet = TRACKS.meadow; TRACKS.nightmarket = TRACKS.sky;
const NOTE_IDX = { C:0, 'C#':1, D:2, 'D#':3, E:4, F:5, 'F#':6, G:7, 'G#':8, A:9, 'A#':10, B:11 };
function noteFreq(n){ const m = n.match(/^([A-G]#?)(-?\d)$/); if(!m) return 0; const midi = (parseInt(m[2],10)+1)*12 + NOTE_IDX[m[1]]; return 440*Math.pow(2, (midi-69)/12); }
function parseTrack(t){
  const out = { bpm:t.bpm, ch:{}, len:0 };
  for(const k of ['lead','arp','bass','drum']){
    if(!t[k]) continue;
    const tok = t[k].join(' ').trim().split(/\s+/);
    out.ch[k] = tok.map((x,i) => { if(x === '-' || x === '.') return null;
      if(k === 'drum') return x;
      let len = 1; while(tok[i+len] === '-') len++;
      return { f:noteFreq(x), len }; });
    out.len = tok.length;
  }
  return out;
}
const SYNTH_SONGS = Object.fromEntries(Object.entries(TRACKS).map(([k,v]) => [k, parseTrack(v)]));

/* ── 配樂播放器 ── */
const MUSIC_FILES = { title:'music/title.mp3', meadow:'music/meadow.mp3', oldstreet:'music/oldstreet.mp3', sky:'music/title.mp3',
                      nightmarket:'music/nightmarket.mp3', castle:'music/castle.mp3', boss:'music/boss.mp3' };
const _musicCache = new Map();     // url → Promise<AudioBuffer|null>
function loadMusic(url){
  if(_musicCache.has(url)) return _musicCache.get(url);
  const p = fetch(url).then(r => { if(!r.ok) throw new Error(r.status); return r.arrayBuffer(); })
    .then(buf => new Promise((res, rej) => getActx().decodeAudioData(buf, res, rej)))
    .catch(() => null);
  _musicCache.set(url, p); return p;
}
const Music = (() => {
  let cur = null;            // { name, gain, src?, timer? }
  let want = null, duckK = 1;
  function fadeOut(node, t=.6){
    if(!node || !actx) return;
    const now = actx.currentTime;
    node.gain.gain.cancelScheduledValues(now); node.gain.gain.setValueAtTime(node.gain.gain.value, now); node.gain.gain.linearRampToValueAtTime(0, now + t);
    setTimeout(() => { try{ node.src && node.src.stop(); }catch(e){} if(node.timer) clearInterval(node.timer); try{ node.gain.disconnect(); }catch(e){} }, t*1000 + 100);
  }
  function startSynth(name, gain){
    const song = SYNTH_SONGS[name] || SYNTH_SONGS.meadow;
    let step = 0, nextT = actx.currentTime + .1;
    const voice = (t, f, dur, type, vol, vib) => {
      const o = actx.createOscillator(), g = actx.createGain();
      o.type = type; o.frequency.setValueAtTime(f, t);
      if(vib){ const l = actx.createOscillator(), lg = actx.createGain(); l.frequency.value = 5.5; lg.gain.value = f*.006; l.connect(lg); lg.connect(o.frequency); l.start(t + Math.min(.12, dur*.5)); l.stop(t + dur + .05); }
      g.gain.setValueAtTime(0.0001, t); g.gain.exponentialRampToValueAtTime(vol, t + .008);
      g.gain.setValueAtTime(vol, t + Math.max(.01, dur*.7)); g.gain.exponentialRampToValueAtTime(0.0001, t + dur);
      o.connect(g); g.connect(gain); o.start(t); o.stop(t + dur + .02);
    };
    const drum = (t, kind) => {
      if(kind === 'k'){ const o = actx.createOscillator(), g = actx.createGain(); o.frequency.setValueAtTime(150, t); o.frequency.exponentialRampToValueAtTime(45, t+.12);
        g.gain.setValueAtTime(.32, t); g.gain.exponentialRampToValueAtTime(0.0001, t+.16); o.connect(g); g.connect(gain); o.start(t); o.stop(t+.18); return; }
      if(!_noiseBuf){ _noiseBuf = actx.createBuffer(1, actx.sampleRate*.6, actx.sampleRate); const ch = _noiseBuf.getChannelData(0); for(let i=0;i<ch.length;i++) ch[i] = Math.random()*2-1; }
      const src = actx.createBufferSource(); src.buffer = _noiseBuf; const flt = actx.createBiquadFilter(), g = actx.createGain();
      if(kind === 's'){ flt.type = 'bandpass'; flt.frequency.value = 1800; g.gain.setValueAtTime(.16, t); g.gain.exponentialRampToValueAtTime(0.0001, t+.13); }
      else { flt.type = 'highpass'; flt.frequency.value = 7000; g.gain.setValueAtTime(.06, t); g.gain.exponentialRampToValueAtTime(0.0001, t+.04); }
      src.connect(flt); flt.connect(g); g.connect(gain); src.start(t); src.stop(t+.15);
    };
    const tick = () => {
      const spb = 60/song.bpm/4;
      while(nextT < actx.currentTime + .18){
        const ch = song.ch;
        if(ch.lead && ch.lead[step]) voice(nextT, ch.lead[step].f, ch.lead[step].len*spb*.95, 'square', .05, true);
        if(ch.arp && ch.arp[step]) voice(nextT, ch.arp[step].f, spb*.8, 'square', .016, false);
        if(ch.bass && ch.bass[step]) voice(nextT, ch.bass[step].f, ch.bass[step].len*spb*.9, 'triangle', .14, false);
        if(ch.drum && ch.drum[step]) drum(nextT, ch.drum[step]);
        step = (step + 1) % song.len; nextT += spb;
      }
    };
    tick(); return setInterval(tick, 25);
  }
  async function play(name){
    want = name;
    if(cur && cur.name === name) return;
    if(SAVE.settings.music <= 0){ if(cur){ fadeOut(cur); cur = null; } return; }
    try{ getActx(); }catch(e){ return; }
    const old = cur; cur = { name, gain:null };
    const buf = await loadMusic(MUSIC_FILES[name] || MUSIC_FILES.meadow);
    if(want !== name || !cur || cur.name !== name) return;
    const gain = actx.createGain(); gain.gain.value = 0; gain.connect(musicBus);
    gain.gain.linearRampToValueAtTime(duckK, actx.currentTime + .8);
    cur.gain = gain;
    if(buf){ const src = actx.createBufferSource(); src.buffer = buf; src.loop = true; src.connect(gain); src.start(); cur.src = src; }
    else { gain.gain.value = 0; gain.gain.linearRampToValueAtTime(duckK*.55, actx.currentTime + .5); cur.timer = startSynth(name, gain); }
    if(old && old.gain) fadeOut(old, .7);
  }
  return {
    play,
    stop(){ want = null; if(cur && cur.gain) fadeOut(cur, .4); cur = null; },
    duck(on){ duckK = on ? .3 : 1; if(cur && cur.gain && actx) cur.gain.gain.setTargetAtTime(duckK, actx.currentTime, .1); },
    refresh(){ const n = want; if(cur && cur.gain) fadeOut(cur, .2); cur = null; if(n) play(n); },
    preload(names){ for(const n of names){ const u = MUSIC_FILES[n]; if(u) loadMusic(u); } },
    get current(){ return cur ? cur.name : null; },
  };
})();
document.addEventListener('visibilitychange', () => { if(!actx) return; if(document.hidden) actx.suspend(); else actx.resume(); });
