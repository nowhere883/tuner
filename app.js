(function () {
  const P = window.PitchDetector;
  const $ = (id) => document.getElementById(id);
  const SVGNS = 'http://www.w3.org/2000/svg';

  const IN_TUNE = 4;   // ±4 音分以内算准
  const CLOSE = 12;    // ±12 音分以内算接近
  const saved = JSON.parse(localStorage.getItem('tuner') || '{}');
  const state = {
    inst: saved.inst || 'guitar',
    preset: saved.preset || {},          // 每种乐器各记一个上次用的预设
    a4: saved.a4 || 440,
    auto: saved.auto !== false,
    selected: 0,
    done: new Set(),
    running: false,
  };
  const save = () => localStorage.setItem('tuner', JSON.stringify({
    inst: state.inst, preset: state.preset, a4: state.a4, auto: state.auto,
  }));

  const inst = () => TUNINGS[state.inst];
  const preset = () => inst().presets.find((p) => p.id === state.preset[state.inst]) || inst().presets[0];
  const pitchClass = (n) => n.replace(/-?\d$/, '');
  const pretty = (pc) => pc.replace('#', '♯').replace(/^([A-G])b$/, '$1♭');

  // ---------- 琴头（SVG 画的） ----------
  const W = 400, NUT = 432;
  // 琴头左右边缘在某个高度的 x 坐标（上宽下窄）
  const leftEdge = (y) => 112 + ((y - 70) / (NUT - 70)) * 24;
  const rightEdge = (y) => W - leftEdge(y);

  function geometry(n) {
    const rows = n === 6 ? [128, 214, 300] : [176, 292];
    const half = n / 2;
    const slots = n === 6 ? [150, 170, 190, 210, 230, 250] : [158, 186, 214, 242];
    return Array.from({ length: n }, (_, i) => {
      // 左边：最粗的弦接最下面的弦钮；右边：从上往下
      const left = i < half;
      const y = left ? rows[half - 1 - i] : rows[i - half];
      const postX = left ? leftEdge(y) + 42 : rightEdge(y) - 42;
      return { left, y, postX, slot: slots[i] };
    });
  }

  function el(tag, attrs, parent) {
    const e = document.createElementNS(SVGNS, tag);
    for (const k in attrs) e.setAttribute(k, attrs[k]);
    if (parent) parent.appendChild(e);
    return e;
  }

  function buildHeadstock() {
    const svg = $('headstock');
    const notes = preset().notes;
    const n = notes.length;
    const uke = state.inst === 'ukulele';
    svg.innerHTML = `
      <defs>
        <linearGradient id="wood" x1="0" x2="1">
          <stop offset="0" stop-color="${uke ? '#5a3312' : '#5b2a0c'}"/>
          <stop offset=".18" stop-color="${uke ? '#a8692f' : '#a65a22'}"/>
          <stop offset=".5" stop-color="${uke ? '#d49a58' : '#cf8441'}"/>
          <stop offset=".82" stop-color="${uke ? '#a8692f' : '#a65a22'}"/>
          <stop offset="1" stop-color="${uke ? '#5a3312' : '#5b2a0c'}"/>
        </linearGradient>
        <linearGradient id="woodShade" x1="0" y1="0" x2="0" y2="1">
          <stop offset="0" stop-color="#000" stop-opacity=".0"/>
          <stop offset=".85" stop-color="#000" stop-opacity=".1"/>
          <stop offset="1" stop-color="#000" stop-opacity=".45"/>
        </linearGradient>
        <filter id="grain" x="0" y="0" width="100%" height="100%">
          <feTurbulence type="fractalNoise" baseFrequency="0.9 0.012" numOctaves="3" seed="7"/>
          <feColorMatrix values="0 0 0 0 .22  0 0 0 0 .1  0 0 0 0 .03  0 0 0 1.1 -.42"/>
        </filter>
        <filter id="shadow" x="-30%" y="-10%" width="160%" height="130%">
          <feDropShadow dx="0" dy="14" stdDeviation="14" flood-color="#000" flood-opacity=".7"/>
        </filter>
        <filter id="strGlow" x="-50%" y="-5%" width="200%" height="110%">
          <feGaussianBlur stdDeviation="2.2" result="b"/>
          <feMerge><feMergeNode in="b"/><feMergeNode in="SourceGraphic"/></feMerge>
        </filter>
        <linearGradient id="chromeV" x1="0" y1="0" x2="0" y2="1">
          <stop offset="0" stop-color="#fafbfc"/><stop offset=".35" stop-color="#9aa1a8"/>
          <stop offset=".55" stop-color="#e9ecef"/><stop offset="1" stop-color="#4a5056"/>
        </linearGradient>
        <radialGradient id="bushing" cx=".38" cy=".32" r=".75">
          <stop offset="0" stop-color="#ffffff"/><stop offset=".45" stop-color="#b9bfc5"/>
          <stop offset=".8" stop-color="#6b7279"/><stop offset="1" stop-color="#3a3f44"/>
        </radialGradient>
        <radialGradient id="post" cx=".4" cy=".35" r=".7">
          <stop offset="0" stop-color="#e9edf0"/><stop offset="1" stop-color="#7d848b"/>
        </radialGradient>
        <linearGradient id="nut" x1="0" y1="0" x2="0" y2="1">
          <stop offset="0" stop-color="#fffdf5"/><stop offset="1" stop-color="#cfc7b2"/>
        </linearGradient>
        <linearGradient id="board" x1="0" x2="1">
          <stop offset="0" stop-color="#140b07"/><stop offset=".5" stop-color="#2d1b12"/><stop offset="1" stop-color="#140b07"/>
        </linearGradient>
        <linearGradient id="fade" x1="0" y1="0" x2="0" y2="1">
          <stop offset=".75" stop-color="#0b0d10" stop-opacity="0"/><stop offset="1" stop-color="#0b0d10" stop-opacity="1"/>
        </linearGradient>
        <clipPath id="headClip"><path id="headPath"/></clipPath>
      </defs>`;

    const head = 'M136 434 C131 330 120 170 112 70 C110 44 124 30 147 32 C170 34 184 20 200 20 ' +
      'C216 20 230 34 253 32 C276 30 290 44 288 70 C280 170 269 330 264 434 Z';
    svg.querySelector('#headPath').setAttribute('d', head);
    const geo = geometry(n);

    // 侧面的旋钮（先画，压在琴头下面）
    geo.forEach((g) => {
      const edge = g.left ? leftEdge(g.y) : rightEdge(g.y);
      const dir = g.left ? -1 : 1;
      const grp = el('g', {}, svg);
      // 轴
      el('rect', { x: g.left ? edge - 20 : edge, y: g.y - 6, width: 20, height: 12, rx: 3, fill: 'url(#chromeV)' }, grp);
      // 齿轮盒
      el('rect', { x: g.left ? edge - 10 : edge - 8, y: g.y - 15, width: 18, height: 30, rx: 4, fill: 'url(#chromeV)', stroke: '#2e3236', 'stroke-width': 1 }, grp);
      // 旋钮把手（像个小水滴）
      const x0 = edge + dir * 18, x1 = edge + dir * 46;
      el('path', {
        d: `M${x0} ${g.y - 9} C${x0 + dir * 6} ${g.y - 24} ${x1} ${g.y - 26} ${x1} ${g.y} C${x1} ${g.y + 26} ${x0 + dir * 6} ${g.y + 24} ${x0} ${g.y + 9} Z`,
        fill: 'url(#chromeV)', stroke: '#2e3236', 'stroke-width': 1,
      }, grp);
      el('path', {
        d: `M${x0 + dir * 8} ${g.y - 12} C${x0 + dir * 16} ${g.y - 18} ${x1 - dir * 6} ${g.y - 16} ${x1 - dir * 4} ${g.y - 6}`,
        fill: 'none', stroke: 'rgba(255,255,255,.85)', 'stroke-width': 2.5, 'stroke-linecap': 'round',
      }, grp);
    });

    // 指板
    const boardG = el('g', {}, svg);
    el('path', { d: `M139 ${NUT} L261 ${NUT} L268 560 L132 560 Z`, fill: 'url(#board)' }, boardG);
    [492, 548].forEach((y) => el('rect', { x: 132, y: y, width: 136, height: 4, fill: 'url(#chromeV)', opacity: .9 }, boardG));
    if (!uke) el('circle', { cx: 200, cy: 520, r: 5, fill: '#e8e2d0', opacity: .85 }, boardG);

    // 琴头本体：木色 + 木纹 + 底部阴影 + 边缘高光
    el('path', { d: head, fill: 'url(#wood)', filter: 'url(#shadow)' }, svg);
    el('rect', { x: 100, y: 10, width: 200, height: 430, filter: 'url(#grain)', 'clip-path': 'url(#headClip)', opacity: .9 }, svg);
    el('path', { d: head, fill: 'url(#woodShade)' }, svg);
    el('path', { d: head, fill: 'none', stroke: '#2a1205', 'stroke-width': 3 }, svg);
    el('path', { d: head, fill: 'none', stroke: 'rgba(255,214,160,.28)', 'stroke-width': 1.2, transform: 'translate(200 230) scale(.975) translate(-200 -230)' }, svg);
    // 顶部小装饰
    el('path', { d: 'M184 46 Q200 36 216 46 Q200 56 184 46 Z', fill: 'rgba(255,240,210,.55)' }, svg);

    // 琴枕
    el('rect', { x: 135, y: NUT - 6, width: 130, height: 12, rx: 2, fill: 'url(#nut)', stroke: '#8f8672', 'stroke-width': .8 }, svg);

    // 弦
    const widths = uke ? [1.8, 2.3, 2.0, 1.6] : [3.4, 2.9, 2.4, 1.9, 1.4, 1.1];
    geo.forEach((g, i) => {
      const wound = !uke && i < 3;
      const start = g.postX + (g.left ? 7 : -7);
      el('path', {
        d: `M${start} ${g.y} L${g.slot} ${NUT} L${g.slot + (g.slot - 200) * 0.06} 560`,
        fill: 'none', stroke: wound ? '#d2ac74' : '#e7eaee', 'stroke-width': widths[i], 'stroke-linecap': 'round',
        class: 'string-line', id: 'str' + i,
      }, svg);
    });

    // 正面的弦柱（压在弦上面）
    geo.forEach((g) => {
      el('circle', { cx: g.postX, cy: g.y, r: 17, fill: 'rgba(0,0,0,.35)', transform: 'translate(0 3)' }, svg);
      el('circle', { cx: g.postX, cy: g.y, r: 16, fill: 'url(#bushing)', stroke: '#2e3236', 'stroke-width': 1 }, svg);
      el('circle', { cx: g.postX, cy: g.y, r: 8, fill: 'url(#post)', stroke: '#3a3f44', 'stroke-width': 1 }, svg);
      el('rect', { x: g.postX - 1.2, y: g.y - 6, width: 2.4, height: 12, fill: '#3a3f44', rx: 1 }, svg);
    });

    // 底部淡出
    el('rect', { x: 0, y: 440, width: W, height: 120, fill: 'url(#fade)' }, svg);

    // 两侧的弦按钮
    const box = $('stringBtns');
    box.innerHTML = '';
    geo.forEach((g, i) => {
      const b = document.createElement('button');
      b.className = 'sbtn';
      b.style.left = ((g.left ? 36 : W - 36) / W) * 100 + '%';
      b.style.top = (g.y / 560) * 100 + '%';
      const pc = pitchClass(notes[i]);
      b.innerHTML = pc[0] + (pc.length > 1 ? '<span class="acc">' + pretty(pc).slice(1) + '</span>' : '');
      b.setAttribute('aria-label', (n - i) + '弦 ' + pretty(pc) + '，点击播放标准音');
      b.onclick = () => {
        state.selected = i;
        setAuto(false);
        updateStrings();
        playRef();
      };
      box.appendChild(b);
    });
    updateStrings();
  }

  // 根据状态刷新弦和按钮的高亮
  let liveOk = -1, ringing = false;
  function updateStrings() {
    const btns = $('stringBtns').children;
    for (let i = 0; i < btns.length; i++) {
      const sel = i === state.selected;
      btns[i].setAttribute('aria-pressed', sel);
      btns[i].classList.toggle('done', state.done.has(i) && i !== liveOk);
      btns[i].classList.toggle('live-ok', i === liveOk);
      const s = $('str' + i);
      s.classList.toggle('active', sel && state.running);
      s.classList.toggle('ringing', sel && ringing);
      s.classList.toggle('ok', i === liveOk || state.done.has(i));
    }
  }

  function render() {
    document.querySelectorAll('.tabs button').forEach((b) =>
      b.setAttribute('aria-selected', b.dataset.inst === state.inst));
    $('presetName').textContent = preset().name;
    $('a4Value').textContent = state.a4;
    $('autoBtn').setAttribute('aria-pressed', state.auto);
    buildHeadstock();
  }

  function setAuto(v) { state.auto = v; save(); $('autoBtn').setAttribute('aria-pressed', v); }
  $('autoBtn').onclick = () => setAuto(!state.auto);

  function resetProgress() {
    state.done.clear();
    state.selected = 0;
    liveOk = -1;
    lastShown = null;
    showIdle();
  }

  document.querySelectorAll('.tabs button').forEach((b) => b.onclick = () => {
    if (state.inst === b.dataset.inst) return;
    state.inst = b.dataset.inst;
    save(); stopRef(); resetProgress(); render();
  });

  // 预设弹窗
  $('presetBtn').onclick = () => {
    const list = $('presetList');
    list.innerHTML = '';
    inst().presets.forEach((p) => {
      const li = document.createElement('li');
      const b = document.createElement('button');
      b.setAttribute('aria-current', p.id === preset().id);
      b.innerHTML = '<div class="t"><span>' + p.name + '</span><span>' +
        p.notes.map((n) => pretty(pitchClass(n))).join(' ') + '</span></div><div class="d">' + p.desc + '</div>';
      b.onclick = () => {
        state.preset[state.inst] = p.id;
        save(); stopRef(); resetProgress(); render();
        $('presetDialog').close();
      };
      li.appendChild(b);
      list.appendChild(li);
    });
    $('presetDialog').showModal();
  };
  document.querySelectorAll('dialog').forEach((d) => {
    d.addEventListener('click', (e) => { if (e.target === d || e.target.closest('[data-close]')) d.close(); });
  });

  // 基准音
  $('settingsBtn').onclick = () => $('settingsDialog').showModal();
  const setA4 = (v) => { state.a4 = Math.min(450, Math.max(430, v)); save(); $('a4Value').textContent = state.a4; };
  $('a4Minus').onclick = () => setA4(state.a4 - 1);
  $('a4Plus').onclick = () => setA4(state.a4 + 1);
  $('a4Reset').onclick = () => setA4(440);

  // ---------- 读数显示 ----------
  const app = document.querySelector('.app');
  const strip = $('strip');
  const readout = document.querySelector('.readout');
  function setTone(cls) {
    strip.classList.remove('tune-ok', 'tune-close', 'tune-off', 'idle');
    readout.classList.remove('r-ok', 'r-close', 'r-off');
    if (cls) { strip.classList.add('tune-' + cls); readout.classList.add('r-' + cls); }
  }
  function moveBubble(c) {
    const clamped = Math.max(-50, Math.min(50, c));
    const half = strip.clientWidth / 2 - 62; // 留出 ♭ ♯ 的位置
    $('bubble').style.transform = 'translateX(' + (clamped / 50) * half + 'px)';
  }
  function setBubbleNote(name) {
    const m = /^(.+?)(-?\d)$/.exec(name);
    $('bubbleNote').textContent = pretty(m[1]);
    $('bubbleOct').textContent = m[2];
  }
  function showIdle() {
    setTone(null);
    if (state.running) {
      strip.classList.add('idle');
      setBubbleNote(preset().notes[state.selected]);
      $('status').textContent = allDone() ? '全部调好了' : (state.auto ? '弹一根弦' : '弹 ' + (preset().notes.length - state.selected) + ' 弦');
    } else {
      $('status').textContent = '需要用到麦克风';
    }
    $('freq').innerHTML = '&nbsp;';
    moveBubble(0);
    if (ringing || liveOk !== -1) { ringing = false; liveOk = -1; updateStrings(); }
  }

  let lastShown = null;
  let inTuneSince = 0;
  function showReading(freq) {
    const p = preset();
    const targets = p.notes.map((n) => P.noteToFreq(n, state.a4));

    let idx = state.selected;
    if (state.auto) {
      // 找音分差最小的那根弦
      let best = Infinity;
      targets.forEach((t, i) => {
        const d = Math.abs(P.cents(freq, t));
        if (d < best) { best = d; idx = i; }
      });
      if (idx !== state.selected) { state.selected = idx; inTuneSince = 0; }
    }

    const target = targets[idx];
    const c = P.cents(freq, target);
    const heard = P.midiToName(P.freqToMidi(freq, state.a4));

    setBubbleNote(p.notes[idx]);
    $('freq').textContent = freq.toFixed(1) + ' Hz · 目标 ' + target.toFixed(1) + ' Hz';
    moveBubble(c);
    ringing = true;
    let ok = -1;

    if (Math.abs(c) > 300) {
      // 差太多，多半是弹错弦或者调得离谱
      setTone('off');
      $('status').textContent = '听到的是 ' + pretty(pitchClass(heard)) + '，' + (c < 0 ? '要拧紧很多' : '要放松很多');
      inTuneSince = 0;
    } else if (Math.abs(c) <= IN_TUNE) {
      setTone('ok');
      $('status').textContent = '准了';
      ok = idx;
      if (!inTuneSince) inTuneSince = performance.now();
      if (performance.now() - inTuneSince > 500 && !state.done.has(idx)) {
        state.done.add(idx);
        if (navigator.vibrate) navigator.vibrate(60);
      }
    } else {
      setTone(Math.abs(c) <= CLOSE ? 'close' : 'off');
      $('status').textContent = (c < 0 ? '偏低 ' : '偏高 ') + Math.abs(Math.round(c)) + ' 音分 · ' + (c < 0 ? '拧紧一点' : '放松一点');
      inTuneSince = 0;
    }
    liveOk = ok;
    updateStrings();
    lastShown = performance.now();
  }
  const allDone = () => state.done.size === preset().notes.length;

  // ---------- 麦克风 ----------
  let ctx, analyser, stream, buf, raf, frame = 0;
  const history = [];

  function ensureCtx() {
    if (!ctx) ctx = new (window.AudioContext || window.webkitAudioContext)();
    if (ctx.state === 'suspended') ctx.resume();
  }

  async function start() {
    ensureCtx(); // iOS 要求在点击的那一刻创建音频，放到等权限之后会被拦
    $('status').textContent = '正在打开麦克风…';
    try {
      stream = await navigator.mediaDevices.getUserMedia({
        audio: { echoCancellation: false, noiseSuppression: false, autoGainControl: false },
      });
    } catch (e) {
      $('status').textContent = e.name === 'NotAllowedError' ? '没有麦克风权限，去 设置 › Safari › 麦克风 打开' : '打不开麦克风';
      return;
    }
    const src = ctx.createMediaStreamSource(stream);
    analyser = ctx.createAnalyser();
    analyser.fftSize = 4096;
    src.connect(analyser);
    buf = new Float32Array(analyser.fftSize);
    state.running = true;
    app.classList.add('on');
    strip.classList.add('on');
    showIdle();
    updateStrings();
    loop();
  }

  function stop() {
    cancelAnimationFrame(raf);
    if (stream) stream.getTracks().forEach((t) => t.stop());
    stream = null;
    state.running = false;
    history.length = 0;
    strip.classList.remove('on');
    showIdle();
    updateStrings();
  }

  function loop() {
    raf = requestAnimationFrame(loop);
    if (frame++ % 2) return; // 每秒算 30 次就够了，省电
    // 播参考音时不听，免得把自己放的声音当成琴声
    if (refNodes) return;
    analyser.getFloatTimeDomainData(buf);
    const uke = state.inst === 'ukulele';
    const r = P.detectPitch(buf, ctx.sampleRate, { minFreq: uke ? 110 : 55, maxFreq: uke ? 1000 : 700 });
    if (r && r.clarity > 0.85) {
      history.push(r.freq);
      if (history.length > 5) history.shift();
      // 取中位数，去掉偶尔跳到八度上的读数
      const sorted = [...history].sort((a, b) => a - b);
      if (history.length >= 3) showReading(sorted[Math.floor(sorted.length / 2)]);
    } else {
      history.length = 0;
      // 声音消失后读数停留一会儿，方便看
      if (lastShown && performance.now() - lastShown > 1500) { lastShown = null; showIdle(); }
    }
  }

  $('startBtn').onclick = start;

  // 切到后台就关麦克风，回来再点一下继续
  document.addEventListener('visibilitychange', () => {
    if (document.hidden && state.running) { stop(); $('startBtn').querySelector('span').textContent = '点这里继续调音'; }
  });

  // ---------- 参考音 ----------
  let refNodes = null;
  function playRef() {
    ensureCtx();
    stopRef();
    const f = P.noteToFreq(preset().notes[state.selected], state.a4);
    const t0 = ctx.currentTime;
    const out = ctx.createGain();
    out.gain.setValueAtTime(0, t0);
    out.gain.linearRampToValueAtTime(0.3, t0 + 0.01);
    out.gain.exponentialRampToValueAtTime(0.001, t0 + 2.2);
    out.connect(ctx.destination);
    // 几个泛音叠起来，高泛音衰减更快，听着像拨弦，手机外放也清楚
    const oscs = [1, 2, 3, 4, 5].map((k, i) => {
      const o = ctx.createOscillator();
      const g = ctx.createGain();
      const a = [1, 0.6, 0.35, 0.2, 0.1][i];
      g.gain.setValueAtTime(a, t0);
      g.gain.exponentialRampToValueAtTime(a * 0.02, t0 + 2.2 / (1 + i * 0.6));
      o.frequency.value = f * k;
      o.connect(g).connect(out);
      o.start(t0);
      o.stop(t0 + 2.3);
      return o;
    });
    refNodes = { oscs };
    oscs[0].onended = () => { if (refNodes && refNodes.oscs === oscs) refNodes = null; history.length = 0; };
  }
  function stopRef() {
    if (!refNodes) return;
    refNodes.oscs.forEach((o) => { try { o.stop(); } catch (e) {} });
    refNodes = null;
  }

  // ---------- 启动 ----------
  render();
  showIdle();
  window.addEventListener('resize', () => moveBubble(0));
  if ('serviceWorker' in navigator && location.protocol !== 'file:') {
    navigator.serviceWorker.register('sw.js').catch(() => {});
  }
})();
