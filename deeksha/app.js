(function () {
  'use strict';

  const BASE = window.DEEKSHA_CONFIG || {};
  const KEY = 'deeksha.settings.v1';
  const MON = ['JAN','FEB','MAR','APR','MAY','JUN','JUL','AUG','SEP','OCT','NOV','DEC'];
  const MON_S = ['Jan','Feb','Mar','Apr','May','Jun','Jul','Aug','Sep','Oct','Nov','Dec'];
  const MON_L = ['January','February','March','April','May','June','July','August','September','October','November','December'];
  const DOW = ['Sun','Mon','Tue','Wed','Thu','Fri','Sat'];
  const DOW_L = ['Sunday','Monday','Tuesday','Wednesday','Thursday','Friday','Saturday'];
  const $ = (id) => document.getElementById(id);

  // ---------- settings (config.js defaults + saved overrides) ----------
  function load() {
    let saved = {};
    try { saved = JSON.parse(localStorage.getItem(KEY) || '{}'); } catch (e) {}
    const s = Object.assign({ wallpaperIndex: 0, mark: 'check' }, BASE, saved, { wallpapers: BASE.wallpapers || [] });
    if (s.auto === undefined) s.auto = s.rotateSeconds > 0;
    return s;
  }
  function save(patch) {
    const next = Object.assign({}, load(), patch);
    const keep = { title: next.title, start: next.start, end: next.end, rotateSeconds: next.rotateSeconds,
                   embers: next.embers, diya: next.diya, mark: next.mark, wallpaperIndex: next.wallpaperIndex, auto: next.auto };
    try { localStorage.setItem(KEY, JSON.stringify(keep)); } catch (e) {}
    S = load();
  }
  let S = load();

  // A shared link can carry settings: ?title=...&start=yyyy-mm-dd&end=yyyy-mm-dd
  (function readLink() {
    const q = new URLSearchParams(location.search);
    const ok = (d) => /^\d{4}-\d{2}-\d{2}$/.test(d || '');
    const patch = {};
    if (q.get('title')) patch.title = q.get('title').slice(0, 40);
    if (ok(q.get('start'))) patch.start = q.get('start');
    if (ok(q.get('end'))) patch.end = q.get('end');
    if (Object.keys(patch).length) {
      if (patch.start && patch.end && patch.end < patch.start) { const t = patch.start; patch.start = patch.end; patch.end = t; }
      save(patch);
      history.replaceState(null, '', location.pathname);
    }
  })();

  const ymd = (s) => { const p = String(s).split('-').map(Number); return new Date(p[0], p[1] - 1, p[2]); };
  const midnight = (d) => new Date(d.getFullYear(), d.getMonth(), d.getDate());
  const longDate = (d) => DOW_L[d.getDay()] + ', ' + d.getDate() + ' ' + MON_L[d.getMonth()];
  const shortDate = (d) => d.getDate() + ' ' + MON_S[d.getMonth()];

  // ---------- one source of truth for every number on the page ----------
  function model() {
    const now = new Date(), start = ymd(S.start), end = ymd(S.end), today = midnight(now);
    const total = Math.round((end - start) / 86400000) + 1;
    const days = [];
    let done = 0, todayIdx = -1;
    for (let i = 0; i < total; i++) {
      const d = new Date(start.getFullYear(), start.getMonth(), start.getDate() + i);
      const past = d < today, isToday = d.getTime() === today.getTime();
      if (past) done++;
      if (isToday) todayIdx = i;
      days.push({ d, i, past, today: isToday, we: d.getDay() === 0 || d.getDay() === 6, final: i === total - 1, row: Math.floor(i / 7) });
    }
    const state = today < start ? 'before' : today > end ? 'after' : 'during';
    const dayNum = state === 'during' ? todayIdx + 1 : state === 'after' ? total : 0;
    const daysToStart = Math.round((start - today) / 86400000);
    const focusRow = state === 'during' ? days[todayIdx].row : state === 'before' ? 0 : days[total - 1].row;
    return { now, start, end, today, total, days, done, left: Math.max(0, total - done), state, dayNum, daysToStart, focusRow };
  }

  // ---------- calendar ----------
  const CROSS = '<svg aria-hidden="true" viewBox="0 0 100 100" preserveAspectRatio="none">' +
                '<line x1="8" y1="8" x2="92" y2="92"/><line x1="92" y1="8" x2="8" y2="92"/></svg>';
  const CHECK = '<span class="chk" aria-hidden="true"><svg viewBox="0 0 24 24"><path d="M5 12.5l4.5 4.5L19 7.5"/></svg></span>';

  const board = $('board');
  let lastDayKey = '', M = null;

  function renderCalendar(force) {
    const key = new Date().toDateString() + S.start + S.end + S.mark + S.title;
    if (!force && key === lastDayKey) return;
    lastDayKey = key;
    M = model();
    const { start, end, total, days, done, left, state, dayNum, today } = M;
    const checkMode = S.mark !== 'cross';
    document.body.classList.toggle('mark-check', checkMode);

    $('title').textContent = S.title || 'Mandala Deeksha';
    $('rangeLabel').textContent = MON_S[start.getMonth()] + ' ' + start.getDate() + ' → ' + MON_S[end.getMonth()] + ' ' + end.getDate() + ' · ' + total + ' days';
    $('todayLine').textContent = longDate(today);

    let dow = '';
    for (let i = 0; i < 7; i++) {
      const w = (start.getDay() + i) % 7;
      dow += '<div class="dow' + (w === 0 || w === 6 ? ' we' : '') + '">' + DOW[w] + '</div>';
    }
    $('dow').innerHTML = dow;

    $('days').innerHTML = days.map((x) => {
      const cls = ['cell', 'row-' + x.row, x.row === M.focusRow && 'in-week', x.past && 'past', x.past && (checkMode ? 'check' : 'cross'),
                   x.today && 'today', x.we && 'we', x.final && 'final'].filter(Boolean).join(' ');
      const label = x.d.toDateString() + (x.past ? ', completed' : x.today ? ', today' : '') + (x.final ? ', final day' : '');
      return '<div class="' + cls + '" title="' + label + '" aria-label="' + label + '">' +
               '<span class="num display">' + x.d.getDate() + '</span>' +
               '<span class="mon">' + MON[x.d.getMonth()] + '</span>' +
               (x.past ? (checkMode ? CHECK : CROSS) : '') +
             '</div>';
    }).join('');
    document.querySelectorAll('.cell.past svg line').forEach((l, n) => { l.style.animationDelay = (n * 18) + 'ms'; });

    board.className = board.className.replace(/\brows-\d+\b/g, '').trim() + ' rows-' + Math.ceil(total / 7);
    $('done').textContent = done;
    $('left').textContent = left;

    if (state === 'before') { $('dayNum').textContent = '0'; $('dayOf').textContent = 'starts ' + shortDate(start); }
    else if (state === 'after') { $('dayNum').textContent = total; $('dayOf').textContent = 'complete'; }
    else { $('dayNum').textContent = dayNum; $('dayOf').textContent = 'of ' + total; }

    // phone-only lines
    $('compact').textContent =
      state === 'before' ? 'Begins ' + longDate(start) + ' · ' + total + ' days' :
      state === 'after'  ? 'All ' + total + ' days completed · Swamiye Saranam' :
                           done + ' completed · ' + left + ' left including today';
    $('infoDate').textContent = longDate(today);
    $('infoDay').textContent =
      state === 'before' ? 'Starts in ' + M.daysToStart + (M.daysToStart === 1 ? ' day' : ' days') :
      state === 'after'  ? 'Deeksha complete' : 'Day ' + dayNum + ' of ' + total;
    $('infoFinal').textContent = 'Final day · ' + shortDate(end);
    $('infoState').hidden = true;

    const C = 2 * Math.PI * 52, ring = $('ringFill');
    ring.style.strokeDasharray = C;
    ring.style.strokeDashoffset = C;
    requestAnimationFrame(() => { ring.style.strokeDashoffset = C * (1 - Math.min(1, done / total)); });

    story.dirty = true;
  }

  // week strip <-> full calendar
  function showRow(row) {
    document.querySelectorAll('#days .cell').forEach((c) => c.classList.toggle('in-week', c.classList.contains('row-' + row)));
  }
  $('fullBtn').addEventListener('click', () => {
    const open = board.classList.toggle('collapsed') === false;
    $('fullBtn').setAttribute('aria-expanded', open ? 'true' : 'false');
    $('fullBtn').textContent = open ? 'Show this week' : 'Full calendar';
    if (!open) showRow(M.focusRow);
  });
  $('todayBtn').addEventListener('click', () => {
    showRow(M.focusRow);
    const target = document.querySelector('#days .cell.today') ||
                   document.querySelectorAll('#days .cell')[M.state === 'before' ? 0 : M.total - 1];
    if (!target) return;
    if (!board.classList.contains('collapsed')) target.scrollIntoView({ block: 'center', behavior: 'smooth' });
    else board.scrollIntoView({ block: 'nearest', behavior: 'smooth' });
    target.classList.remove('pulse'); void target.offsetWidth; target.classList.add('pulse');
    setTimeout(() => target.classList.remove('pulse'), 3200);
  });

  // ---------- clock + live countdown ----------
  const pad = (n) => String(n).padStart(2, '0');
  function tick() {
    const now = new Date();
    $('clockTime').textContent = now.toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' });
    $('clockDate').textContent = now.toLocaleDateString(undefined, { weekday: 'long', day: 'numeric', month: 'long' });

    renderCalendar(false); // rolls over at midnight automatically
    let target, label;
    if (M.state === 'before') { target = ymd(S.start); label = 'Time until your Deeksha begins'; }
    else { target = ymd(S.end); target.setDate(target.getDate() + 1); label = M.state === 'after' ? 'Deeksha complete' : 'Time until the final day ends'; }
    let ms = Math.max(0, target - now);
    const d = Math.floor(ms / 86400000); ms -= d * 86400000;
    const h = Math.floor(ms / 3600000); ms -= h * 3600000;
    const m = Math.floor(ms / 60000); ms -= m * 60000;
    const s = Math.floor(ms / 1000);
    $('countdown').innerHTML = d + '<small>DAYS</small>' + pad(h) + '<small>HRS</small>' + pad(m) + '<small>MIN</small>' + pad(s) + '<small>SEC</small>';
    $('mCountLabel').textContent = label;
    $('mDays').textContent = d; $('mHours').textContent = pad(h); $('mMins').textContent = pad(m);
  }

  // ---------- wallpapers ----------
  const layers = [$('bgA'), $('bgB')];
  let front = 0, rotateTimer = null, currentUrl = '', currentWp = null;
  function showWallpaper(i, instant) {
    const list = S.wallpapers; if (!list.length) return;
    i = ((i % list.length) + list.length) % list.length;
    const wp = list[i];
    const next = layers[1 - front];
    const img = new Image();
    let url = wp.src;
    img.onerror = () => { if (wp.remote && url !== wp.remote) { url = wp.remote; img.src = url; } };
    img.onload = () => {
      next.style.backgroundImage = 'url("' + url + '")';
      next.style.setProperty('--pos', wp.focus || '70% 50%');
      next.style.setProperty('--pos-m', wp.focusMobile || wp.focus || '75% 40%');
      if (instant) next.style.transition = 'none';
      next.classList.add('on'); layers[front].classList.remove('on');
      if (instant) requestAnimationFrame(() => { next.style.transition = ''; });
      front = 1 - front;
      currentUrl = url; currentWp = wp; story.dirty = true;
    };
    img.src = wp.src;
    save({ wallpaperIndex: i });
    document.querySelectorAll('.thumb').forEach((t) => t.setAttribute('aria-pressed', +t.dataset.i === i ? 'true' : 'false'));
  }
  function buildThumbs() {
    const html = S.wallpapers.map((w, i) =>
      '<button type="button" class="thumb" data-i="' + i + '" aria-label="Wallpaper: ' + w.name + '" aria-pressed="false" ' +
      'style="background-image:url(&quot;' + w.src + '&quot;)' + (w.remote ? ',url(&quot;' + w.remote + '&quot;)' : '') + '"><span>' + w.name + '</span></button>'
    ).join('');
    ['thumbs', 'mThumbs'].forEach((id) => {
      $(id).innerHTML = html;
      $(id).addEventListener('click', (e) => {
        const b = e.target.closest('.thumb'); if (!b) return;
        showWallpaper(+b.dataset.i); restartRotate();
      });
    });
  }
  function restartRotate() {
    clearInterval(rotateTimer);
    $('autoBtn').setAttribute('aria-pressed', S.auto ? 'true' : 'false');
    $('mAuto').checked = !!S.auto;
    if (S.auto && S.rotateSeconds > 0) rotateTimer = setInterval(() => showWallpaper(S.wallpaperIndex + 1), S.rotateSeconds * 1000);
  }
  $('autoBtn').addEventListener('click', () => { save({ auto: !S.auto }); restartRotate(); });
  $('mAuto').addEventListener('change', () => {
    const on = $('mAuto').checked;
    save({ auto: on, rotateSeconds: on && !S.rotateSeconds ? 300 : S.rotateSeconds }); restartRotate();
  });

  // ---------- embers (lamp sparks drifting up) ----------
  const cv = $('embers'), cx = cv.getContext('2d');
  let parts = [], raf = 0;
  function sizeCanvas() { cv.width = innerWidth * devicePixelRatio; cv.height = innerHeight * devicePixelRatio; }
  function spawn() {
    return { x: Math.random() * cv.width, y: cv.height + Math.random() * cv.height * .3,
             r: (Math.random() * 1.6 + .6) * devicePixelRatio, vy: (Math.random() * .35 + .15) * devicePixelRatio,
             sway: Math.random() * Math.PI * 2, a: Math.random() * .5 + .3 };
  }
  function frame() {
    cx.clearRect(0, 0, cv.width, cv.height);
    for (const p of parts) {
      p.y -= p.vy; p.sway += .01; p.x += Math.sin(p.sway) * .25 * devicePixelRatio;
      if (p.y < -10) Object.assign(p, spawn(), { y: cv.height + 10 });
      const fade = Math.min(1, p.y / (cv.height * .35));
      cx.beginPath(); cx.arc(p.x, p.y, p.r, 0, Math.PI * 2);
      cx.fillStyle = 'rgba(255,' + (170 + Math.round(p.a * 60)) + ',90,' + (p.a * fade).toFixed(3) + ')';
      cx.shadowColor = 'rgba(255,160,60,.9)'; cx.shadowBlur = 8 * devicePixelRatio;
      cx.fill();
    }
    raf = requestAnimationFrame(frame);
  }
  function setEmbers(on) {
    cancelAnimationFrame(raf); cx.clearRect(0, 0, cv.width, cv.height);
    if (!on || matchMedia('(prefers-reduced-motion: reduce)').matches) return;
    sizeCanvas(); parts = Array.from({ length: 46 }, spawn); frame();
  }
  addEventListener('resize', () => { if (S.embers) sizeCanvas(); });
  document.addEventListener('visibilitychange', () => { if (document.hidden) cancelAnimationFrame(raf); else setEmbers(S.embers); });

  // ---------- diya ----------
  const diya = $('diya');
  function applyDiya() { document.body.classList.toggle('no-diya', S.diya === false); }
  function setDiyaLit(on) {
    diya.setAttribute('aria-pressed', on ? 'true' : 'false');
    document.body.classList.toggle('diya-out', !on);
    diya.classList.remove('ignite');
    if (on) { void diya.offsetWidth; diya.classList.add('ignite'); }
  }
  diya.addEventListener('click', () => setDiyaLit(diya.getAttribute('aria-pressed') !== 'true'));

  // ---------- sheets (close buttons, tap outside to close) ----------
  document.querySelectorAll('dialog').forEach((dlg) => {
    dlg.addEventListener('click', (e) => {
      if (e.target.closest('[data-close]')) dlg.close();
      if (e.target === dlg) dlg.close(); // tap on the dimmed backdrop
    });
  });
  $('wpBtn').addEventListener('click', () => $('wpSheet').showModal());

  // ---------- settings ----------
  const dlg = $('settings');
  function openSettings() {
    $('sTitle').value = S.title; $('sStart').value = S.start; $('sEnd').value = S.end;
    $('sMark').value = S.mark === 'cross' ? 'cross' : 'check';
    $('sEmbers').checked = !!S.embers; $('sDiya').checked = S.diya !== false; $('sRotate').value = String(S.rotateSeconds || 0);
    dlg.returnValue = '';
    dlg.showModal();
  }
  $('settingsBtn').addEventListener('click', openSettings);
  $('settingsBtnM').addEventListener('click', openSettings);
  $('sClose').addEventListener('click', () => dlg.close('cancel'));
  dlg.addEventListener('close', () => {
    if (dlg.returnValue !== 'save') return;
    let start = $('sStart').value, end = $('sEnd').value;
    if (!start || !end) return;
    if (ymd(end) < ymd(start)) { const t = start; start = end; end = t; }
    const rotate = +$('sRotate').value;
    save({ title: $('sTitle').value.trim() || 'Mandala Deeksha', start, end, mark: $('sMark').value,
           embers: $('sEmbers').checked, diya: $('sDiya').checked, rotateSeconds: rotate, auto: rotate > 0 });
    renderCalendar(true); tick(); setEmbers(S.embers); restartRotate(); applyDiya();
  });
  $('sReset').addEventListener('click', () => {
    if (!confirm('Reset your title, dates and appearance to the defaults?')) return;
    try { localStorage.removeItem(KEY); } catch (e) {}
    S = load(); dlg.close('cancel');
    renderCalendar(true); tick(); setEmbers(S.embers); restartRotate(); showWallpaper(0); applyDiya(); setDiyaLit(true);
  });
  $('sShare').addEventListener('click', async () => {
    const u = new URL(location.href.split('?')[0]);
    u.searchParams.set('title', $('sTitle').value.trim() || 'Mandala Deeksha');
    u.searchParams.set('start', $('sStart').value);
    u.searchParams.set('end', $('sEnd').value);
    const link = u.toString(), btn = $('sShare');
    try {
      if (navigator.share) { await navigator.share({ title: 'Deeksha countdown', url: link }); return; }
      await navigator.clipboard.writeText(link);
      btn.textContent = 'Link copied';
    } catch (e) { if (e && e.name === 'AbortError') return; prompt('Copy this link:', link); }
    setTimeout(() => { btn.textContent = 'Share link with these dates'; }, 2000);
  });

  // ---------- Instagram story image (1080 × 1920) ----------
  const story = { dirty: true, blob: null, file: null, url: '' };

  function loadImg(src) {
    return new Promise((res) => {
      if (!src) return res(null);
      const im = new Image();
      im.onload = () => res(im); im.onerror = () => res(null);
      im.src = src;
    });
  }
  function rr(c, x, y, w, h, r) { c.beginPath(); c.moveTo(x + r, y); c.arcTo(x + w, y, x + w, y + h, r); c.arcTo(x + w, y + h, x, y + h, r); c.arcTo(x, y + h, x, y, r); c.arcTo(x, y, x + w, y, r); c.closePath(); }
  function spaced(c, text, x, y, sp) { // letter-spaced text, left aligned
    for (const ch of text) { c.fillText(ch, x, y); x += c.measureText(ch).width + sp; }
  }
  function wrap(c, text, maxW) {
    const words = text.split(' '), lines = [];
    let line = '';
    for (const w of words) { const t = line ? line + ' ' + w : w; if (c.measureText(t).width > maxW && line) { lines.push(line); line = w; } else line = t; }
    if (line) lines.push(line);
    return lines;
  }
  function drawDiya(c, x, y, k) { // x,y = centre of the bowl rim
    const g = c.createRadialGradient(x, y - 70 * k, 4, x, y - 70 * k, 120 * k);
    g.addColorStop(0, 'rgba(255,190,90,.75)'); g.addColorStop(1, 'rgba(255,140,40,0)');
    c.fillStyle = g; c.beginPath(); c.arc(x, y - 70 * k, 120 * k, 0, 7); c.fill();
    const fl = (w, h, col) => { c.fillStyle = col; c.beginPath(); c.moveTo(x, y - 6 * k);
      c.bezierCurveTo(x - w, y - 18 * k, x - w * .9, y - h * .55, x, y - h); c.bezierCurveTo(x + w * .9, y - h * .55, x + w, y - 18 * k, x, y - 6 * k); c.fill(); };
    const og = c.createLinearGradient(0, y - 120 * k, 0, y); og.addColorStop(0, '#FF4E1A'); og.addColorStop(.5, '#FF9628'); og.addColorStop(1, '#FFC24F');
    fl(30 * k, 118 * k, og); fl(19 * k, 84 * k, '#FFD563'); fl(9 * k, 50 * k, '#FFF8E2');
    const bg = c.createLinearGradient(0, y, 0, y + 62 * k); bg.addColorStop(0, '#C8642F'); bg.addColorStop(1, '#4A1A08');
    c.fillStyle = bg; c.beginPath(); c.moveTo(x - 86 * k, y); c.bezierCurveTo(x - 80 * k, y + 47 * k, x - 32 * k, y + 61 * k, x, y + 61 * k);
    c.bezierCurveTo(x + 32 * k, y + 61 * k, x + 80 * k, y + 47 * k, x + 86 * k, y); c.fill();
    c.fillStyle = '#D9874A'; c.beginPath(); c.ellipse(x, y, 86 * k, 13 * k, 0, 0, 7); c.fill();
    c.fillStyle = '#3A1606'; c.beginPath(); c.ellipse(x, y + 1, 74 * k, 8 * k, 0, 0, 7); c.fill();
    c.fillStyle = '#FFD28A'; for (let i = -4; i <= 4; i++) { c.beginPath(); c.arc(x + i * 13 * k, y + 33 * k + Math.abs(i) * -1.6 * k, 2.6 * k, 0, 7); c.fill(); }
  }

  async function makeStory() {
    try { await document.fonts.ready; } catch (e) {}
    const W = 1080, H = 1920, c = document.createElement('canvas');
    c.width = W; c.height = H;
    const g = c.getContext('2d');
    const m = model();
    const D = "'Bricolage Grotesque', Inter, sans-serif", I = 'Inter, system-ui, sans-serif';

    // background: current wallpaper, framed like the phone view
    g.fillStyle = '#0A0806'; g.fillRect(0, 0, W, H);
    const img = await loadImg(currentUrl);
    if (img) {
      const s = Math.max(W / img.width, H / img.height), iw = img.width * s, ih = img.height * s;
      const pos = ((currentWp && (currentWp.focusMobile || currentWp.focus)) || '75% 40%').split(' ').map(parseFloat);
      g.drawImage(img, (W - iw) * (pos[0] / 100), (H - ih) * ((pos[1] || 50) / 100), iw, ih);
    }
    let sh = g.createLinearGradient(0, 0, 0, H);
    sh.addColorStop(0, 'rgba(8,6,4,.86)'); sh.addColorStop(.2, 'rgba(8,6,4,.5)'); sh.addColorStop(.36, 'rgba(8,6,4,.4)');
    sh.addColorStop(.52, 'rgba(8,6,4,.8)'); sh.addColorStop(1, 'rgba(8,6,4,.95)');
    g.fillStyle = sh; g.fillRect(0, 0, W, H);

    const L = 84; // left margin; top/bottom kept clear of Instagram's own bars
    g.textBaseline = 'alphabetic';
    g.fillStyle = '#FFB547'; g.font = '700 30px ' + I;
    spaced(g, 'SWAMIYE SARANAM AYYAPPA', L, 250, 6);
    drawDiya(g, W - 150, 268, .78);

    g.font = '800 92px ' + D;
    const tl = wrap(g, S.title || 'Mandala Deeksha', W - L - 230);
    const tg = g.createLinearGradient(0, 290, 0, 290 + tl.length * 100); tg.addColorStop(0, '#FFF6E3'); tg.addColorStop(1, '#FFD58A');
    g.fillStyle = tg;
    tl.slice(0, 2).forEach((ln, n) => g.fillText(ln, L, 360 + n * 98));
    let y = 360 + (Math.min(2, tl.length) - 1) * 98 + 62;
    g.fillStyle = '#F2EBDF'; g.font = '500 38px ' + I; g.fillText(longDate(m.today), L, y);

    // ring
    const rcx = W / 2, rcy = y + 300, R = 200;
    g.fillStyle = 'rgba(10,8,6,.55)'; g.beginPath(); g.arc(rcx, rcy, R + 34, 0, 7); g.fill();
    g.lineCap = 'round'; g.lineWidth = 26;
    g.strokeStyle = 'rgba(255,220,170,.14)'; g.beginPath(); g.arc(rcx, rcy, R, 0, 7); g.stroke();
    const frac = Math.min(1, m.done / m.total);
    if (frac > 0) {
      g.save(); g.shadowColor = 'rgba(255,181,71,.7)'; g.shadowBlur = 24; g.strokeStyle = '#FFB547';
      g.beginPath(); g.arc(rcx, rcy, R, -Math.PI / 2, -Math.PI / 2 + frac * Math.PI * 2); g.stroke(); g.restore();
    }
    g.textAlign = 'center';
    g.fillStyle = '#E6DCCB'; g.font = '700 32px ' + I; g.fillText('DAY', rcx, rcy - 92);
    g.fillStyle = '#FFB547'; g.font = '800 168px ' + D; g.fillText(String(m.dayNum), rcx, rcy + 52);
    g.fillStyle = '#E6DCCB'; g.font = '500 40px ' + I;
    g.fillText(m.state === 'before' ? 'starts ' + shortDate(m.start) : m.state === 'after' ? 'complete' : 'of ' + m.total, rcx, rcy + 118);

    y = rcy + R + 92;
    g.fillStyle = '#F7F1E6'; g.font = '500 38px ' + I;
    g.fillText(m.state === 'during' ? m.done + ' completed  ·  ' + m.left + ' left' : m.state === 'before' ? 'Begins ' + shortDate(m.start) : 'All ' + m.total + ' days completed', rcx, y);

    // full calendar
    const rows = Math.ceil(m.total / 7), gap = 12, cw = (W - L * 2 - gap * 6) / 7;
    const top = y + 54, room = 1680 - top - 50;
    const ch = Math.min(104, (room - gap * (rows - 1)) / rows);
    g.font = '700 22px ' + I;
    for (let i = 0; i < 7; i++) {
      const w = (m.start.getDay() + i) % 7;
      g.fillStyle = w === 0 || w === 6 ? '#FFB547' : '#BDB2A0';
      g.fillText(DOW[w].toUpperCase(), L + i * (cw + gap) + cw / 2, top + 22);
    }
    const checkMode = S.mark !== 'cross';
    m.days.forEach((x) => {
      const cxp = L + (x.i % 7) * (cw + gap), cyp = top + 44 + x.row * (ch + gap);
      rr(g, cxp, cyp, cw, ch, 18);
      if (x.today) { g.save(); g.shadowColor = 'rgba(255,170,60,.8)'; g.shadowBlur = 30; g.fillStyle = '#FFB547'; g.fill(); g.restore(); }
      else { g.fillStyle = x.past ? 'rgba(0,0,0,.45)' : 'rgba(30,24,18,.8)'; g.fill();
             g.lineWidth = x.final ? 3 : 1.5; g.strokeStyle = x.final ? 'rgba(255,181,71,.9)' : 'rgba(255,220,170,.16)'; g.stroke(); }
      const ink = x.today ? '#1C1206' : x.past ? (checkMode ? '#C9BEAA' : '#7D7466') : '#F7F1E6';
      g.fillStyle = ink; g.font = '800 ' + Math.round(ch * .4) + 'px ' + D;
      g.fillText(String(x.d.getDate()), cxp + cw / 2, cyp + ch * .55);
      g.fillStyle = x.today ? '#4A2E08' : x.past ? '#8F8576' : x.we ? '#FFB547' : '#BDB2A0';
      g.font = '700 ' + Math.round(ch * .16) + 'px ' + I;
      g.fillText(MON[x.d.getMonth()], cxp + cw / 2, cyp + ch * .82);
      if (x.past) {
        if (checkMode) {
          const bx = cxp + cw - 20, by = cyp + 20;
          g.fillStyle = '#FFB547'; g.beginPath(); g.arc(bx, by, 13, 0, 7); g.fill();
          g.strokeStyle = '#1C1206'; g.lineWidth = 3.6; g.lineJoin = 'round';
          g.beginPath(); g.moveTo(bx - 6, by + .5); g.lineTo(bx - 1.5, by + 5); g.lineTo(bx + 6.5, by - 4.5); g.stroke();
        } else {
          g.strokeStyle = '#FF6B4A'; g.lineWidth = 4;
          g.beginPath(); g.moveTo(cxp + cw * .26, cyp + ch * .18); g.lineTo(cxp + cw * .74, cyp + ch * .84);
          g.moveTo(cxp + cw * .74, cyp + ch * .18); g.lineTo(cxp + cw * .26, cyp + ch * .84); g.stroke();
        }
      }
      if (x.final && !x.today) { g.fillStyle = '#FFB547'; g.beginPath(); g.arc(cxp + cw - 14, cyp + 14, 6, 0, 7); g.fill(); }
    });

    g.fillStyle = '#FFB547'; g.font = "600 40px 'Noto Sans Malayalam', sans-serif";
    g.fillText('ശരണം അയ്യപ്പ', W / 2, 1745);
    g.textAlign = 'left';

    return new Promise((res) => c.toBlob(res, 'image/png'));
  }

  async function openStory() {
    const sheet = $('storySheet');
    $('storyShare').disabled = true; $('storySave').disabled = true;
    sheet.showModal();
    if (story.dirty || !story.blob) {
      $('storyImg').removeAttribute('src'); $('storyMsg').textContent = 'Creating your story image…';
      try {
        story.blob = await makeStory();
        if (!story.blob) throw new Error('no image');
        if (story.url) URL.revokeObjectURL(story.url);
        story.url = URL.createObjectURL(story.blob);
        const m = model();
        story.file = new File([story.blob], 'deeksha-day-' + m.dayNum + '.png', { type: 'image/png' });
        story.dirty = false;
      } catch (e) {
        $('storyMsg').textContent = 'Could not create the image. Switch to another wallpaper and try again.';
        return;
      }
    }
    $('storyImg').src = story.url;
    $('storySave').disabled = false;
    $('storyShare').disabled = !(navigator.canShare && navigator.canShare({ files: [story.file] }));
  }
  // Share is called straight from the tap (the image is already made), which iPhone Safari requires.
  $('storyShare').addEventListener('click', () => {
    navigator.share({ files: [story.file] }).catch(() => {});
  });
  $('storySave').addEventListener('click', () => {
    const a = document.createElement('a');
    a.href = story.url; a.download = story.file ? story.file.name : 'deeksha.png';
    document.body.appendChild(a); a.click(); a.remove();
  });
  $('storyBtn').addEventListener('click', openStory);
  $('storyBtnD').addEventListener('click', openStory);

  // ---------- audio (stays hidden until tracks are listed in config.js) ----------
  const tracks = (BASE.audio && [].concat(BASE.audio.sharanaghosha || [], BASE.audio.pooja || [])) || [];
  $('audioBtn').hidden = tracks.length === 0;

  // ---------- go ----------
  buildThumbs();
  showWallpaper(S.wallpaperIndex || 0, true);
  renderCalendar(true);
  tick(); setInterval(tick, 1000);
  setEmbers(S.embers);
  applyDiya();
  restartRotate();
})();
