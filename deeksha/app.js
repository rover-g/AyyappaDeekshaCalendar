(function () {
  'use strict';

  const BASE = window.DEEKSHA_CONFIG || {};
  const KEY = 'deeksha.settings.v1';
  const MON = ['JAN','FEB','MAR','APR','MAY','JUN','JUL','AUG','SEP','OCT','NOV','DEC'];
  const MON_S = ['Jan','Feb','Mar','Apr','May','Jun','Jul','Aug','Sep','Oct','Nov','Dec'];
  const DOW = ['Sun','Mon','Tue','Wed','Thu','Fri','Sat'];
  const $ = (id) => document.getElementById(id);

  // ---------- settings (config.js defaults + saved overrides) ----------
  function load() {
    let saved = {};
    try { saved = JSON.parse(localStorage.getItem(KEY) || '{}'); } catch (e) {}
    return Object.assign({ wallpaperIndex: 0 }, BASE, saved, { wallpapers: BASE.wallpapers || [] });
  }
  function save(patch) {
    const cur = load();
    const next = Object.assign({}, cur, patch);
    const keep = { title: next.title, start: next.start, end: next.end, rotateSeconds: next.rotateSeconds,
                   embers: next.embers, diya: next.diya, wallpaperIndex: next.wallpaperIndex, auto: next.auto };
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
      save(patch);
      history.replaceState(null, '', location.pathname); // tidy the address bar
    }
  })();
  if (S.auto === undefined) S.auto = S.rotateSeconds > 0;

  const ymd = (s) => { const p = String(s).split('-').map(Number); return new Date(p[0], p[1] - 1, p[2]); };
  const midnight = (d) => new Date(d.getFullYear(), d.getMonth(), d.getDate());

  // ---------- calendar ----------
  const X = '<svg aria-hidden="true" viewBox="0 0 100 100" preserveAspectRatio="none">' +
            '<line x1="8" y1="8" x2="92" y2="92"/><line x1="92" y1="8" x2="8" y2="92"/></svg>';

  let lastDayKey = '';
  function renderCalendar(force) {
    const now = new Date();
    const key = now.toDateString();
    if (!force && key === lastDayKey) return;
    lastDayKey = key;

    const start = ymd(S.start), end = ymd(S.end), today = midnight(now);
    const total = Math.round((end - start) / 86400000) + 1;

    $('title').textContent = S.title || 'Mandala Deeksha';
    $('rangeLabel').textContent = MON_S[start.getMonth()] + ' ' + start.getDate() + ' → ' + MON_S[end.getMonth()] + ' ' + end.getDate() + ' · ' + total + ' days';

    // weekday header follows the start date's weekday
    let dow = '';
    for (let i = 0; i < 7; i++) {
      const w = (start.getDay() + i) % 7;
      dow += '<div class="dow' + (w === 0 || w === 6 ? ' we' : '') + '">' + DOW[w] + '</div>';
    }
    $('dow').innerHTML = dow;

    let html = '', done = 0, dayIndex = 0;
    for (let i = 0; i < total; i++) {
      const d = new Date(start.getFullYear(), start.getMonth(), start.getDate() + i);
      const past = d < today, isToday = d.getTime() === today.getTime();
      const we = d.getDay() === 0 || d.getDay() === 6;
      if (past) done++;
      if (isToday) dayIndex = i + 1;
      const cls = ['cell', past && 'past', isToday && 'today', we && 'we', i === total - 1 && 'final'].filter(Boolean).join(' ');
      const label = d.toDateString() + (past ? ', completed' : isToday ? ', today' : '');
      html += '<div class="' + cls + '" title="' + label + '" style="animation-delay:' + (i * 12) + 'ms">' +
                '<span class="num display">' + d.getDate() + '</span>' +
                '<span class="mon">' + MON[d.getMonth()] + '</span>' + (past ? X : '') +
              '</div>';
    }
    $('days').innerHTML = html;
    // stagger the X draw-in
    document.querySelectorAll('.cell.past svg line').forEach((l, n) => { l.style.animationDelay = (n * 18) + 'ms'; });

    const left = Math.max(0, total - done);
    $('done').textContent = done;
    $('left').textContent = left;

    if (today < start) { $('dayNum').textContent = '0'; $('dayOf').textContent = 'starts ' + MON_S[start.getMonth()] + ' ' + start.getDate(); }
    else if (today > end) { $('dayNum').textContent = total; $('dayOf').textContent = 'complete'; }
    else { $('dayNum').textContent = dayIndex; $('dayOf').textContent = 'of ' + total; }

    const C = 2 * Math.PI * 52, ring = $('ringFill');
    ring.style.strokeDasharray = C;
    ring.style.strokeDashoffset = C;
    requestAnimationFrame(() => { ring.style.strokeDashoffset = C * (1 - Math.min(1, done / total)); });
  }

  // ---------- clock + live countdown ----------
  function tick() {
    const now = new Date();
    $('clockTime').textContent = now.toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' });
    $('clockDate').textContent = now.toLocaleDateString(undefined, { weekday: 'long', day: 'numeric', month: 'long' });

    const endOfFinal = ymd(S.end); endOfFinal.setDate(endOfFinal.getDate() + 1); // midnight after final day
    let ms = Math.max(0, endOfFinal - now);
    const d = Math.floor(ms / 86400000); ms -= d * 86400000;
    const h = Math.floor(ms / 3600000); ms -= h * 3600000;
    const m = Math.floor(ms / 60000); ms -= m * 60000;
    const s = Math.floor(ms / 1000);
    const p = (n) => String(n).padStart(2, '0');
    $('countdown').innerHTML = d + '<small>DAYS</small>' + p(h) + '<small>HRS</small>' + p(m) + '<small>MIN</small>' + p(s) + '<small>SEC</small>';

    renderCalendar(false); // rolls over at midnight automatically
  }

  // ---------- wallpapers ----------
  const layers = [$('bgA'), $('bgB')];
  let front = 0, rotateTimer = null;
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
    };
    img.src = wp.src;
    save({ wallpaperIndex: i });
    document.querySelectorAll('.thumb').forEach((t, n) => t.setAttribute('aria-pressed', n === i ? 'true' : 'false'));
  }
  function buildThumbs() {
    $('thumbs').innerHTML = S.wallpapers.map((w, i) =>
      '<button type="button" class="thumb" data-i="' + i + '" aria-label="Wallpaper: ' + w.name + '" aria-pressed="false" style="background-image:url(&quot;' + w.src + '&quot;)' + (w.remote ? ',url(&quot;' + w.remote + '&quot;)' : '') + '"></button>'
    ).join('');
    $('thumbs').addEventListener('click', (e) => {
      const b = e.target.closest('.thumb'); if (!b) return;
      showWallpaper(+b.dataset.i); restartRotate();
    });
  }
  function restartRotate() {
    clearInterval(rotateTimer);
    $('autoBtn').setAttribute('aria-pressed', S.auto ? 'true' : 'false');
    if (S.auto && S.rotateSeconds > 0) rotateTimer = setInterval(() => showWallpaper(S.wallpaperIndex + 1), S.rotateSeconds * 1000);
  }

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

  // ---------- settings dialog ----------
  const dlg = $('settings');
  $('settingsBtn').addEventListener('click', () => {
    $('sTitle').value = S.title; $('sStart').value = S.start; $('sEnd').value = S.end;
    $('sEmbers').checked = !!S.embers; $('sDiya').checked = S.diya !== false; $('sRotate').value = String(S.rotateSeconds);
    dlg.showModal();
  });
  dlg.addEventListener('close', () => {
    if (dlg.returnValue !== 'save') return;
    let start = $('sStart').value, end = $('sEnd').value;
    if (!start || !end) return;
    if (ymd(end) < ymd(start)) { const t = start; start = end; end = t; }
    const rotate = +$('sRotate').value;
    save({ title: $('sTitle').value.trim() || 'Mandala Deeksha', start, end, embers: $('sEmbers').checked, diya: $('sDiya').checked,
           rotateSeconds: rotate, auto: rotate > 0 });
    renderCalendar(true); tick(); setEmbers(S.embers); restartRotate(); applyDiya();
  });
  $('sReset').addEventListener('click', () => {
    try { localStorage.removeItem(KEY); } catch (e) {}
    S = load(); S.auto = S.rotateSeconds > 0; dlg.close();
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
    } catch (e) { prompt('Copy this link:', link); }
    setTimeout(() => { btn.textContent = 'Share link with these dates'; }, 2000);
  });
  $('autoBtn').addEventListener('click', () => { save({ auto: !S.auto }); restartRotate(); });

  // ---------- go ----------
  buildThumbs();
  showWallpaper(S.wallpaperIndex || 0, true);
  renderCalendar(true);
  tick(); setInterval(tick, 1000);
  setEmbers(S.embers);
  applyDiya();
  restartRotate();
})();
