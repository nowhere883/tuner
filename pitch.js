// 音高识别 + 音名换算。浏览器里挂在 window.PitchDetector，Node 里用 require 做测试。
(function (root) {
  const NOTE_NAMES = ['C', 'C#', 'D', 'D#', 'E', 'F', 'F#', 'G', 'G#', 'A', 'A#', 'B'];
  const NOTE_INDEX = {
    C: 0, 'C#': 1, Db: 1, D: 2, 'D#': 3, Eb: 3, E: 4, F: 5, 'F#': 6, Gb: 6,
    G: 7, 'G#': 8, Ab: 8, A: 9, 'A#': 10, Bb: 10, B: 11,
  };

  // "Eb2" -> MIDI 编号（A4 = 69）
  function noteToMidi(name) {
    const m = /^([A-G](?:#|b)?)(-?\d)$/.exec(name);
    if (!m) throw new Error('音名格式不对: ' + name);
    return (parseInt(m[2], 10) + 1) * 12 + NOTE_INDEX[m[1]];
  }
  function midiToFreq(midi, a4 = 440) {
    return a4 * Math.pow(2, (midi - 69) / 12);
  }
  function noteToFreq(name, a4 = 440) {
    return midiToFreq(noteToMidi(name), a4);
  }
  function freqToMidi(freq, a4 = 440) {
    return 69 + 12 * Math.log2(freq / a4);
  }
  function midiToName(midi) {
    const n = Math.round(midi);
    return NOTE_NAMES[((n % 12) + 12) % 12] + (Math.floor(n / 12) - 1);
  }
  // f 比 ref 高多少音分（100 音分 = 1 个半音）
  function cents(freq, ref) {
    return 1200 * Math.log2(freq / ref);
  }

  // YIN 算法：找信号重复的周期。返回 { freq, clarity, rms }，没有清晰音高时返回 null。
  function detectPitch(buf, sampleRate, opts = {}) {
    const minFreq = opts.minFreq || 55;
    const maxFreq = opts.maxFreq || 1100;
    const threshold = opts.threshold || 0.12;
    const minRms = opts.minRms || 0.006;

    let rms = 0;
    for (let i = 0; i < buf.length; i++) rms += buf[i] * buf[i];
    rms = Math.sqrt(rms / buf.length);
    if (rms < minRms) return null;

    const tauMin = Math.max(2, Math.floor(sampleRate / maxFreq));
    const tauMax = Math.min(Math.ceil(sampleRate / minFreq), Math.floor(buf.length / 2));
    const W = buf.length - tauMax;

    // 差分函数
    const d = new Float32Array(tauMax + 2);
    for (let tau = 1; tau <= tauMax + 1; tau++) {
      let sum = 0;
      for (let j = 0; j < W - 1; j++) {
        const diff = buf[j] - buf[j + tau];
        sum += diff * diff;
      }
      d[tau] = sum;
    }
    // 累积均值归一化
    const cmnd = new Float32Array(tauMax + 2);
    cmnd[0] = 1;
    let running = 0;
    for (let tau = 1; tau <= tauMax + 1; tau++) {
      running += d[tau];
      cmnd[tau] = running > 0 ? (d[tau] * tau) / running : 1;
    }

    // 第一个低于阈值的谷（取最早的谷能避免认成低八度）
    let tau = -1;
    for (let t = tauMin; t <= tauMax; t++) {
      if (cmnd[t] < threshold) {
        while (t + 1 <= tauMax && cmnd[t + 1] < cmnd[t]) t++;
        tau = t;
        break;
      }
    }
    if (tau === -1) {
      // 没有特别干净的谷，退而求其次取全局最低点，太乱就放弃
      let best = tauMin;
      for (let t = tauMin; t <= tauMax; t++) if (cmnd[t] < cmnd[best]) best = t;
      if (cmnd[best] > 0.3) return null;
      tau = best;
    }

    // 抛物线插值，让频率精度到小数
    let better = tau;
    if (tau > 1 && tau < tauMax + 1) {
      const a = cmnd[tau - 1], b = cmnd[tau], c = cmnd[tau + 1];
      const denom = a - 2 * b + c;
      if (denom !== 0) better = tau + (a - c) / (2 * denom);
    }
    return { freq: sampleRate / better, clarity: 1 - cmnd[tau], rms };
  }

  const api = { noteToMidi, midiToFreq, noteToFreq, freqToMidi, midiToName, cents, detectPitch };
  if (typeof module !== 'undefined' && module.exports) module.exports = api;
  else root.PitchDetector = api;
})(typeof window !== 'undefined' ? window : globalThis);
