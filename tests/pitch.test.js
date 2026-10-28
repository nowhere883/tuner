// 用合成的"拨弦声"测试音高识别：带泛音、二次泛音比基音还响、衰减、噪声。
// 运行：node tests/pitch.test.js
const P = require('../pitch.js');
const TUNINGS = require('../tunings.js');

function pluck(freq, sr, len, { noise = 0.02, offset = 0.05, inharm = 0 } = {}) {
  const amps = [0.5, 1.0, 0.6, 0.35, 0.2, 0.1]; // 二次泛音最强，最容易被认成高八度
  const buf = new Float32Array(len);
  let seed = 12345;
  const rand = () => ((seed = (seed * 1103515245 + 12345) % 2147483648) / 2147483648) * 2 - 1;
  for (let i = 0; i < len; i++) {
    const t = i / sr + offset;
    let v = 0;
    amps.forEach((a, k) => {
      const f = freq * (k + 1) * (1 + inharm * k * k); // 真实琴弦泛音略偏高
      v += a * Math.exp(-t * (1.5 + k)) * Math.sin(2 * Math.PI * f * t + k);
    });
    buf[i] = 0.25 * v + noise * rand();
  }
  return buf;
}

let fail = 0, total = 0, worst = 0;
const notes = new Set();
for (const inst of Object.values(TUNINGS)) for (const p of inst.presets) p.notes.forEach((n) => notes.add(n));

for (const sr of [44100, 48000]) {
  for (const name of notes) {
    for (const detune of [-30, -8, 0, 7, 25]) {
      const target = P.noteToFreq(name);
      const f = target * Math.pow(2, detune / 1200);
      const r = P.detectPitch(pluck(f, sr, 4096), sr);
      total++;
      const err = r ? Math.abs(P.cents(r.freq, f)) : Infinity;
      worst = Math.max(worst, err);
      if (err > 1.5) {
        fail++;
        console.log(`失败 ${name} ${detune}音分 @${sr}: 识别 ${r ? r.freq.toFixed(2) : '无'} Hz，应为 ${f.toFixed(2)} Hz`);
      }
    }
  }
}

// 静音和纯噪声不应该报出音高
const silent = P.detectPitch(new Float32Array(4096), 48000);
let s2 = 987654321;
const noiseOnly = new Float32Array(4096).map(() => ((s2 = (s2 * 1103515245 + 12345) % 2147483648) / 2147483648 - 0.5) * 0.3);
total += 2;
if (silent !== null) { fail++; console.log('失败：静音报出了音高'); }
if (P.detectPitch(noiseOnly, 48000) !== null) { fail++; console.log('失败：纯噪声报出了音高'); }

// 泛音偏高的真实琴弦：只要求在 ±4 音分内（真实调音器也会受这个影响）
for (const name of ['E2', 'A2', 'G3', 'E4', 'G4']) {
  const f = P.noteToFreq(name);
  const r = P.detectPitch(pluck(f, 48000, 4096, { inharm: 0.0003 }), 48000);
  total++;
  const err = r ? P.cents(r.freq, f) : Infinity;
  if (Math.abs(err) > 4) { fail++; console.log(`失败：带泛音偏移的 ${name} 误差 ${err.toFixed(2)} 音分`); }
}

// 音名换算
const checks = [['A4', 440], ['E2', 82.41], ['Eb2', 77.78], ['G4', 392.0], ['C2', 65.41]];
for (const [n, hz] of checks) {
  total++;
  if (Math.abs(P.noteToFreq(n) - hz) > 0.01) { fail++; console.log(`失败：${n} 换算成 ${P.noteToFreq(n)}`); }
}

console.log(`共 ${total} 项，失败 ${fail} 项，最大误差 ${worst.toFixed(3)} 音分（${notes.size} 个音）`);
process.exit(fail ? 1 : 0);
