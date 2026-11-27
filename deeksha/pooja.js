(function () {
  'use strict';
  const $ = (id) => document.getElementById(id);
  const CFG = window.DEEKSHA_CONFIG || {};
  const SEGMENTS = window.POOJA_SEGMENTS || [];
  const PROOF = new URLSearchParams(location.search).get('proof') === '1';
  const TL = window.TL || ((s) => s);

  // Storage: the pooja's saved place, text size/language, and the days marked, all kept apart from the calendar's settings.
  const K_SESSION = 'deeksha.pooja.session.v1';
  const K_PREFS = 'deeksha.pooja.prefs.v1';
  const K_LOG = 'deeksha.pooja.log.v1';
  const get = (k, d) => { try { return JSON.parse(localStorage.getItem(k)) || d; } catch (e) { return d; } };
  const put = (k, v) => { try { localStorage.setItem(k, JSON.stringify(v)); } catch (e) {} };

  // Booklet order. Sections not added yet show as "Coming soon".
  const ORDER = [
    { id: 'vighneshwara', te: 'విఘ్నేశ్వర పూజ', en: 'Vighneshwara Pooja' },
    { id: 'subrahmanya', te: 'శ్రీ సుబ్రహ్మణ్య స్వామి పూజ', en: 'Subrahmanya Swamy Pooja' },
    { id: 'ashtottarams', te: 'అష్టోత్తర శతనామావళులు', en: 'Durga, Lakshmi, Saraswati, Shiva, Vishnu' },
    { id: 'ayyappa-pooja', te: 'అయ్యప్ప పూజ', en: 'Ayyappa Pooja' },
    { id: 'sharanu-ghosha', te: 'అయ్యప్ప శరణు ఘోష', en: 'Sharanu Ghosha' },
    { id: 'harathi', te: 'మంగళ హారతి · హరివరాసనం', en: 'Mangala Harathi and Harivarasanam' }
  ];
  // Full daily pooja in booklet order; the five extra ashtottarams are optional and opened on their own.
  const DAILY = CFG.dailyPooja || ['vighneshwara', 'subrahmanya', 'ayyappa-pooja', 'sharanu-ghosha', 'harathi'];
  const usable = (s) => s && (s.proofread || PROOF);
  const seg = (id) => SEGMENTS.find((s) => s.id === id);
  const MON_L = ['January','February','March','April','May','June','July','August','September','October','November','December'];
  const DOW_L = ['Sunday','Monday','Tuesday','Wednesday','Thursday','Friday','Saturday'];
  const dayKey = (d) => d.getFullYear() + '-' + String(d.getMonth() + 1).padStart(2, '0') + '-' + String(d.getDate()).padStart(2, '0');
  const longDate = (d) => DOW_L[d.getDay()] + ', ' + d.getDate() + ' ' + MON_L[d.getMonth()];

  function deekshaDay() { // read-only view of the calendar's settings
    const s = Object.assign({}, CFG, get('deeksha.settings.v1', {}));
    if (!s.start || !s.end) return '';
    const ymd = (x) => { const p = x.split('-').map(Number); return new Date(p[0], p[1] - 1, p[2]); };
    const t = new Date(); t.setHours(0, 0, 0, 0);
    const a = ymd(s.start), b = ymd(s.end), total = Math.round((b - a) / 864e5) + 1;
    if (t < a || t > b) return '';
    return 'Day ' + (Math.round((t - a) / 864e5) + 1) + ' of ' + total;
  }
  const esc = (s) => String(s).replace(/[&<>"]/g, (c) => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;' }[c]));

  // ---------- prefs: text size + language ----------
  const SIZES = [17, 19, 20, 22, 24, 26, 28, 30, 32];
  let prefs = Object.assign({ size: 22, lang: 'te' }, get(K_PREFS, {}));
  if (!SIZES.includes(prefs.size)) prefs.size = 22;
  const EN = () => prefs.lang === 'en';
  function applyPrefs() {
    document.documentElement.style.setProperty('--mantra-size', prefs.size + 'px');
    document.body.classList.toggle('en', EN());
    document.documentElement.lang = EN() ? 'en' : 'te';
    $('langTe').setAttribute('aria-pressed', EN() ? 'false' : 'true');
    $('langEn').setAttribute('aria-pressed', EN() ? 'true' : 'false');
    $('rSmaller').disabled = prefs.size === SIZES.at(0);
    $('rBigger').disabled = prefs.size === SIZES.at(-1);
  }

  // ---------- saved place ----------
  let S = get(K_SESSION, null);
  const saveS = () => { if (S) { S.updatedAt = Date.now(); put(K_SESSION, S); } };
  function startSession(queue) { S = { queue, qi: 0, step: 0, scroll: 0, startedAt: Date.now() }; saveS(); }
  const curSeg = () => seg(S.queue[S.qi]);
  const curStep = () => curSeg().steps[S.step];

  function screen(name) {
    ['home', 'reader', 'finish'].forEach((n) => { $(n).hidden = n !== name; });
    history.replaceState(null, '', location.pathname + location.search + (name === 'reader' ? '#read' : ''));
    window.scrollTo(0, 0);
  }

  // ---------- home ----------
  const TICK = '<span class="tick" aria-label="Done today"><svg viewBox="0 0 24 24"><path d="M5 12.5l4.5 4.5L19 7.5"/></svg></span>';
  function renderHome() {
    $('proofBanner').hidden = !PROOF;
    const today = new Date(), dd = deekshaDay();
    $('homeDate').textContent = longDate(today) + (dd ? ' · ' + dd : '');
    const doneToday = (get(K_LOG, {})[dayKey(today)] || {}).segments || [];

    const ok = S && S.queue && S.queue.length && usable(seg(S.queue[S.qi]));
    $('resume').hidden = !ok;
    if (ok) {
      const g = curSeg(), st = curStep();
      $('resumeTitle').textContent = g.title.te + ' · ' + st.title.te;
      const mins = Math.round((Date.now() - (S.updatedAt || Date.now())) / 60000);
      $('resumeMeta').textContent = 'Step ' + (S.step + 1) + ' of ' + g.steps.length + ' · ' + st.title.en +
        (mins >= 1 ? ' · left ' + (mins < 60 ? mins + ' min' : Math.round(mins / 60) + ' h') + ' ago' : '');
      $('resumeBar').style.width = Math.round(((S.step + 1) / g.steps.length) * 100) + '%';
    }

    const ready = DAILY.filter((id) => usable(seg(id)));
    $('startDaily').disabled = !ready.length;
    $('startDaily').textContent = ok ? 'Start from the beginning' : 'Start pooja';
    $('startDaily').className = ok ? 'ghost wide big' : 'primary wide big';
    $('dailyHint').textContent = ready.length
      ? 'Reads ' + ready.map((id) => seg(id).title.en).join(', then ') + ', in the booklet’s order.'
      : 'Sections appear here once they are checked against the booklet.';

    $('cards').innerHTML = ORDER.map((o, n) => {
      const g = seg(o.id), can = usable(g);
      return '<button type="button" class="card" ' + (can ? 'data-seg="' + o.id + '"' : 'disabled') + '>' +
        '<span class="c-num">' + (n + 1) + '</span>' +
        '<span class="c-main"><span class="c-te">' + esc(o.te) + '</span><span class="c-en">' + esc(o.en) +
        (g ? ' · ' + g.steps.length + (g.steps.length === 1 ? ' step' : ' steps') + ' · about ' + g.minutes + ' min' : '') + '</span>' +
        (!can ? '<span class="tag">Coming soon</span>' : (!g.proofread ? '<span class="tag">Not yet checked</span>' : '')) + '</span>' +
        (doneToday.includes(o.id) ? TICK : '') + '</button>';
    }).join('');
    $('proofLink').innerHTML = PROOF ? 'Proofreading preview. <a href="pooja.html">Leave the preview</a>.' : '';
  }
  $('cards').addEventListener('click', (e) => {
    const b = e.target.closest('[data-seg]'); if (!b) return;
    if (S && !confirm('Start ' + seg(b.dataset.seg).title.en + ' from the beginning? Your saved place will be replaced.')) return;
    startSession([b.dataset.seg]); openReader(false);
  });
  $('startDaily').addEventListener('click', () => {
    const ready = DAILY.filter((id) => usable(seg(id))); if (!ready.length) return;
    if (S && !confirm('Start from the beginning? Your saved place will be replaced.')) return;
    startSession(ready); openReader(false);
  });
  $('resumeGo').addEventListener('click', () => openReader(true));
  $('resumeClear').addEventListener('click', () => {
    if (!confirm('Forget your saved place?')) return;
    S = null; localStorage.removeItem(K_SESSION); renderHome();
  });

  // ---------- reader ----------
  const body = $('rBody');
  const glue = (t) => t.replace(/\s+([।॥|]+)/g, '\u00a0$1'); // keep end marks on the same line as the last word
  const line = (te) => esc(glue(EN() ? TL(te) : te));
  function sankalpa(b) {
    const parts = b.text.split(/(\([^)]*\))/);
    return parts.map((p) => {
      if (/^\(.*\)$/.test(p)) {
        const inner = p.slice(1, -1);
        return '<span class="inl">(' + esc(EN() ? ((b.bracketsEn || {})[inner] || TL(inner)) : inner) + ')</span>';
      }
      return line(p);
    }).join('');
  }
  function renderStep(restoreScroll) {
    const g = curSeg(), st = curStep(), n = g.steps.length;
    $('rSeg').textContent = EN() ? g.title.en : g.title.te;
    $('rPos').textContent = 'Step ' + (S.step + 1) + ' of ' + n + (S.queue.length > 1 ? ' · section ' + (S.qi + 1) + ' of ' + S.queue.length : '');
    $('rProgress').style.width = Math.round(((S.step + 1) / n) * 100) + '%';
    $('rUnchecked').hidden = !!g.proofread;
    $('stepTitle').textContent = EN() ? st.title.en : st.title.te;
    $('stepSub').textContent = EN() ? TL(st.title.te) : st.title.en;

    let html = '';
    st.blocks.forEach((b) => {
      if (b.type === 'instruction') html += '<p class="b-instr">' + esc(EN() && b.en ? b.en : b.te) + '</p>';
      else if (b.type === 'subhead') html += '<h3 class="b-sub">' + esc(EN() && b.en ? b.en : b.te) + '</h3>';
      else if (b.type === 'mantra') html += '<div class="b-mantra">' + b.lines.map((l) => '<p>' + line(l) + '</p>').join('') + '</div>';
      else if (b.type === 'sankalpa') html += '<p class="b-sank">' + sankalpa(b) + '</p>';
      else if (b.type === 'namavali') {
        html += '<ol class="names">' + b.names.map((x, i) => '<li><span class="n">' + (i + 1) + '</span><span>' + line(x) + '</span></li>').join('') + '</ol>' +
          (b.closing ? '<p class="closing">' + line(b.closing) + '</p>' : '');
      }
    });
    $('blocks').innerHTML = html;

    const lastStep = S.step === n - 1, lastSeg = S.qi === S.queue.length - 1;
    $('rBack').disabled = S.step === 0 && S.qi === 0;
    $('rNext').querySelector('span').textContent = lastStep && lastSeg ? 'Finish' : 'Next';

    if (restoreScroll) requestAnimationFrame(() => requestAnimationFrame(() => { body.scrollTop = S.scroll || 0; }));
    else { body.scrollTop = 0; S.scroll = 0; }
    saveS();
  }

  let scrollT = 0;
  body.addEventListener('scroll', () => { clearTimeout(scrollT); scrollT = setTimeout(() => { if (S) { S.scroll = Math.round(body.scrollTop); saveS(); } }, 150); }, { passive: true });

  function go(delta) {
    const n = curSeg().steps.length;
    if (delta > 0) {
      if (S.step < n - 1) S.step++;
      else if (S.qi < S.queue.length - 1) { S.qi++; S.step = 0; }
      else return finish();
    } else {
      if (S.step > 0) S.step--;
      else if (S.qi > 0) { S.qi--; S.step = curSeg().steps.length - 1; }
      else return;
    }
    renderStep(false);
    body.focus({ preventScroll: true });
  }
  $('rNext').addEventListener('click', () => go(1));
  $('rBack').addEventListener('click', () => go(-1));
  let sx = 0, sy = 0;
  body.addEventListener('touchstart', (e) => { sx = e.touches[0].clientX; sy = e.touches[0].clientY; }, { passive: true });
  body.addEventListener('touchend', (e) => {
    const dx = e.changedTouches[0].clientX - sx, dy = e.changedTouches[0].clientY - sy;
    if (Math.abs(dx) > 80 && Math.abs(dx) > Math.abs(dy) * 2) go(dx < 0 ? 1 : -1);
  }, { passive: true });

  function openReader(restore) { screen('reader'); renderStep(restore); }
  $('rClose').addEventListener('click', () => { saveS(); screen('home'); renderHome(); });

  // keep the line you were reading in place when the text size or language changes
  function keepPlace(change) {
    const top = body.getBoundingClientRect().top;
    const els = [...$('blocks').querySelectorAll('p, h3, li')];
    const idx = els.findIndex((el) => el.getBoundingClientRect().bottom > top + 8);
    const before = idx >= 0 ? els[idx].getBoundingClientRect().top - top : 0;
    change();
    const after = [...$('blocks').querySelectorAll('p, h3, li')][idx];
    if (after) body.scrollTop += (after.getBoundingClientRect().top - top) - before;
  }
  function resize(dir) {
    const j = Math.max(0, Math.min(SIZES.length - 1, SIZES.indexOf(prefs.size) + dir));
    if (SIZES.at(j) === prefs.size) return;
    keepPlace(() => { prefs.size = SIZES.at(j); put(K_PREFS, prefs); applyPrefs(); });
  }
  $('rSmaller').addEventListener('click', () => resize(-1));
  $('rBigger').addEventListener('click', () => resize(1));
  function setLang(l) {
    if (prefs.lang === l) return;
    keepPlace(() => { prefs.lang = l; put(K_PREFS, prefs); applyPrefs(); if (S && !$('reader').hidden) { const sc = body.scrollTop; renderStep(false); body.scrollTop = sc; S.scroll = sc; saveS(); } });
  }
  $('langTe').addEventListener('click', () => setLang('te'));
  $('langEn').addEventListener('click', () => setLang('en'));
  document.addEventListener('visibilitychange', () => { if (document.visibilityState === 'hidden' && S) saveS(); });

  // ---------- finish + calendar mark ----------
  let finished = null;
  function finish() {
    const mins = Math.max(1, Math.round((Date.now() - S.startedAt) / 60000));
    finished = { segments: S.queue.slice(), mins };
    S = null; localStorage.removeItem(K_SESSION);
    screen('finish');
    const dd = deekshaDay();
    $('finMeta').textContent = finished.segments.map((id) => seg(id).title.en).join(', ') + ' · ' + mins + ' min' + (dd ? ' · ' + dd : '');
    paintMark();
  }
  function paintMark() {
    const rec = get(K_LOG, {})[dayKey(new Date())];
    $('markBtn').disabled = !!rec;
    $('markBtn').textContent = rec ? 'Marked on today’s date' : 'Mark today on the calendar';
    $('markHint').textContent = rec ? 'A small diya now sits on ' + longDate(new Date()) + ' in your calendar.' : 'Adds a small diya to today’s date on your calendar.';
    $('toCalendar').hidden = !rec;
  }
  $('markBtn').addEventListener('click', () => {
    const log = get(K_LOG, {}), k = dayKey(new Date()), prev = log[k] || { segments: [] };
    log[k] = { segments: [...new Set(prev.segments.concat(finished ? finished.segments : []))], at: Date.now(), mins: finished ? finished.mins : null };
    put(K_LOG, log); paintMark();
  });
  $('finHome').addEventListener('click', () => { screen('home'); renderHome(); });

  // ---------- start ----------
  applyPrefs();
  const valid = S && S.queue && S.queue.every((id) => seg(id)) && seg(S.queue[S.qi]) && curSeg().steps[S.step];
  if (S && !valid) { S = null; localStorage.removeItem(K_SESSION); }
  if (S && location.hash === '#read' && usable(curSeg())) openReader(true); // reload while reading: same step, same spot
  else { screen('home'); renderHome(); }
})();
