// 调弦预设。notes 按屏幕从左到右排列：吉他从 6 弦（最粗）到 1 弦，尤克里里从 4 弦到 1 弦。
(function (root) {
  const TUNINGS = {
    guitar: {
      name: '吉他',
      stringLabel: (i, n) => n - i + '弦',
      presets: [
        { id: 'std', name: '标准调弦', notes: ['E2', 'A2', 'D3', 'G3', 'B3', 'E4'], desc: '最常用，绝大多数曲谱都用它' },
        { id: 'dropd', name: 'Drop D', notes: ['D2', 'A2', 'D3', 'G3', 'B3', 'E4'], desc: '只把 6 弦降一个全音，摇滚、指弹常用' },
        { id: 'halfdown', name: '降半音（Eb）', notes: ['Eb2', 'Ab2', 'Db3', 'Gb3', 'Bb3', 'Eb4'], desc: '六根弦都降半音，弹起来更松、声音更厚' },
        { id: 'wholedown', name: '降全音（D）', notes: ['D2', 'G2', 'C3', 'F3', 'A3', 'D4'], desc: '六根弦都降一个全音' },
        { id: 'dropc', name: 'Drop C', notes: ['C2', 'G2', 'C3', 'F3', 'A3', 'D4'], desc: '降全音后再把 6 弦降一个全音，重型音乐常用' },
        { id: 'dadgad', name: 'DADGAD', notes: ['D2', 'A2', 'D3', 'G3', 'A3', 'D4'], desc: '凯尔特、民谣指弹常用' },
        { id: 'doubledropd', name: 'Double Drop D', notes: ['D2', 'A2', 'D3', 'G3', 'B3', 'D4'], desc: '6 弦和 1 弦都降到 D' },
        { id: 'openg', name: 'Open G', notes: ['D2', 'G2', 'D3', 'G3', 'B3', 'D4'], desc: '空弦就是 G 和弦，布鲁斯、滑棒常用' },
        { id: 'opend', name: 'Open D', notes: ['D2', 'A2', 'D3', 'F#3', 'A3', 'D4'], desc: '空弦就是 D 和弦' },
        { id: 'opene', name: 'Open E', notes: ['E2', 'B2', 'E3', 'G#3', 'B3', 'E4'], desc: '空弦就是 E 和弦，弦张力较大' },
        { id: 'opena', name: 'Open A', notes: ['E2', 'A2', 'E3', 'A3', 'C#4', 'E4'], desc: '空弦就是 A 和弦' },
        { id: 'openc', name: 'Open C', notes: ['C2', 'G2', 'C3', 'G3', 'C4', 'E4'], desc: '空弦就是 C 和弦，声音开阔' },
      ],
    },
    ukulele: {
      name: '尤克里里',
      stringLabel: (i, n) => n - i + '弦',
      presets: [
        { id: 'std', name: '标准调弦（高音 G）', notes: ['G4', 'C4', 'E4', 'A4'], desc: '最常用，4 弦比 3 弦还高' },
        { id: 'lowg', name: '低音 G', notes: ['G3', 'C4', 'E4', 'A4'], desc: '4 弦换成低八度的 G，低音更足' },
        { id: 'dtuning', name: 'D 调（ADF#B）', notes: ['A4', 'D4', 'F#4', 'B4'], desc: '老式调弦，整体升一个全音' },
        { id: 'halfdown', name: '降半音', notes: ['F#4', 'B3', 'D#4', 'G#4'], desc: '四根弦都降半音' },
        { id: 'baritone', name: '上低音（Baritone）', notes: ['D3', 'G3', 'B3', 'E4'], desc: '上低音尤克里里用，和吉他高四根弦一样' },
      ],
    },
  };

  if (typeof module !== 'undefined' && module.exports) module.exports = TUNINGS;
  else root.TUNINGS = TUNINGS;
})(typeof window !== 'undefined' ? window : globalThis);
