// Telugu script -> simple English letters (e.g. ఓం మహాశాస్త్రే నమః -> Om mahaashaastre namaha).
// Same words, written in English letters: this is not a translation of the meaning.
(function () {
  'use strict';
  const VOW = { 'అ': 'a', 'ఆ': 'aa', 'ఇ': 'i', 'ఈ': 'ee', 'ఉ': 'u', 'ఊ': 'oo', 'ఋ': 'ru', 'ౠ': 'roo', 'ఎ': 'e', 'ఏ': 'e', 'ఐ': 'ai', 'ఒ': 'o', 'ఓ': 'o', 'ఔ': 'au' };
  const SIGN = { 'ా': 'aa', 'ి': 'i', 'ీ': 'ee', 'ు': 'u', 'ూ': 'oo', 'ృ': 'ru', 'ౄ': 'roo', 'ె': 'e', 'ే': 'e', 'ై': 'ai', 'ొ': 'o', 'ో': 'o', 'ౌ': 'au' };
  const CON = { 'క': 'k', 'ఖ': 'kh', 'గ': 'g', 'ఘ': 'gh', 'ఙ': 'n', 'చ': 'ch', 'ఛ': 'chh', 'జ': 'j', 'ఝ': 'jh', 'ఞ': 'n',
    'ట': 't', 'ఠ': 'th', 'డ': 'd', 'ఢ': 'dh', 'ణ': 'n', 'త': 't', 'థ': 'th', 'ద': 'd', 'ధ': 'dh', 'న': 'n',
    'ప': 'p', 'ఫ': 'ph', 'బ': 'b', 'భ': 'bh', 'మ': 'm', 'య': 'y', 'ర': 'r', 'ఱ': 'r', 'ల': 'l', 'ళ': 'l', 'వ': 'v',
    'శ': 'sh', 'ష': 'sh', 'స': 's', 'హ': 'h' };
  const VIRAMA = '్';
  const NASAL = { k: 'n', g: 'n', c: 'n', j: 'n', t: 'n', d: 'n', p: 'm', b: 'm' };

  function word(w) {
    let out = '';
    for (let i = 0; i < w.length; i++) {
      const ch = w[i], nx = w[i + 1];
      if (CON[ch] !== undefined) {
        out += CON[ch];
        if (nx === VIRAMA) { i++; continue; }
        if (SIGN[nx] !== undefined) { out += SIGN[nx]; i++; continue; }
        out += 'a';
      } else if (VOW[ch] !== undefined) out += VOW[ch];
      else if (ch === 'ం' || ch === 'ఁ') {
        // anusvara: "n" before most consonants, "m" before p/b or at the end
        const after = w.slice(i + 1).replace(/^[^ఀ-౿]*/, '');
        const c0 = after && CON[after[0]] ? CON[after[0]][0] : '';
        out += c0 ? (NASAL[c0] || 'm') : 'm';
      } else if (ch === 'ః') out += 'ha';
      else if (ch === '।') out += ' |';
      else if (ch === '॥') out += ' ||';
      else if (ch === '‌' || ch === '‍') continue;
      else out += ch;
    }
    return out;
  }
  function toEnglish(text) {
    if (!text) return '';
    let s = String(text).replace(/ఓం|ఓమ్/g, 'Om');
    s = s.replace(/[ఀ-౿]+/g, word);
    return s.replace(/(^|[.!?|]\s*)([a-z])/g, (m, a, b) => a + b.toUpperCase());
  }
  window.TL = toEnglish;
})();
