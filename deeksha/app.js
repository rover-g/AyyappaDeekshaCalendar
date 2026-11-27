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
                   embers: next.embers, diya: next.diya, mark: next.mark, wallpaperIndex: next.wallpaperIndex, auto: next.auto,
                   wallpaperId: next.wallpaperId, hidden: next.hidden || [], shuffle: !!next.shuffle };
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
  const PJ = '<span class="pj" aria-hidden="true"><svg viewBox="0 0 20 22"><path d="M10 1.5c2.2 3.6 3.2 5.3 3.2 7a3.2 3.2 0 0 1-6.4 0c0-1.7 1-3.4 3.2-7z" fill="#FFB547"/><path d="M10 5.5c1 1.7 1.5 2.5 1.5 3.4a1.5 1.5 0 0 1-3 0c0-.9.5-1.7 1.5-3.4z" fill="#FFF1D2"/><path d="M1.5 13c.5 4.6 4.3 7 8.5 7s8-2.4 8.5-7z" fill="#C0602E"/><ellipse cx="10" cy="13" rx="8.5" ry="1.8" fill="#E09452"/></svg></span>';
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

    let poojaLog = {};
    try { poojaLog = JSON.parse(localStorage.getItem('deeksha.pooja.log.v1') || '{}'); } catch (e) {}
    const dk = (d) => d.getFullYear() + '-' + String(d.getMonth() + 1).padStart(2, '0') + '-' + String(d.getDate()).padStart(2, '0');
    document.body.classList.toggle('has-pooja', Object.keys(poojaLog).length > 0);
    $('days').innerHTML = days.map((x) => {
      const pj = !!poojaLog[dk(x.d)];
      const cls = ['cell', 'row-' + x.row, x.row === M.focusRow && 'in-week', x.past && 'past', x.past && (checkMode ? 'check' : 'cross'),
                   x.today && 'today', x.we && 'we', x.final && 'final'].filter(Boolean).join(' ');
      const label = x.d.toDateString() + (x.past ? ', completed' : x.today ? ', today' : '') + (x.final ? ', final day' : '') + (pj ? ', pooja done' : '');
      return '<div class="' + cls + '" title="' + label + '" aria-label="' + label + '">' +
               '<span class="num display">' + x.d.getDate() + '</span>' +
               '<span class="mon">' + MON[x.d.getMonth()] + '</span>' +
               (x.past ? (checkMode ? CHECK : CROSS) : '') +
               (pj ? PJ : '') +
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

  // ---------- wallpaper library ----------
  // Built-in wallpapers come from config.js. Photos you add are stored in this browser (IndexedDB),
  // shrunk to 2560 px, and never uploaded anywhere.
  const DBN = 'deeksha-wallpapers';
  function idb() {
    return new Promise((res, rej) => {
      const r = indexedDB.open(DBN, 1);
      r.onupgradeneeded = () => r.result.createObjectStore('w', { keyPath: 'id' });
      r.onsuccess = () => res(r.result); r.onerror = () => rej(r.error);
    });
  }
  async function dbDo(mode, fn) {
    const db = await idb();
    return new Promise((res, rej) => {
      const tx = db.transaction('w', mode), req = fn(tx.objectStore('w'));
      tx.oncomplete = () => res(req && req.result); tx.onerror = () => rej(tx.error);
    });
  }
  let custom = [];
  async function loadCustom() {
    let rows = [];
    try { rows = (await dbDo('readonly', (st) => st.getAll())) || []; } catch (e) {}
    custom.forEach((c) => URL.revokeObjectURL(c.src));
    custom = rows.sort((x, y) => x.added - y.added).map((r) => ({
      id: 'c:' + r.id, dbId: r.id, name: r.name, src: URL.createObjectURL(r.blob),
      focus: '50% 40%', focusMobile: '50% 35%', custom: true }));
  }
  function library() {
    const hidden = S.hidden || [];
    return (BASE.wallpapers || []).map((w, i) => Object.assign({ id: 'b:' + i }, w))
      .filter((w) => !hidden.includes(w.id)).concat(custom);
  }
  async function shrink(file) {
    const url = URL.createObjectURL(file);
    const img = await loadImg(url);
    URL.revokeObjectURL(url);
    if (!img) throw new Error('not an image');
    const k = Math.min(1, 2560 / Math.max(img.width, img.height));
    const c = document.createElement('canvas');
    c.width = Math.round(img.width * k); c.height = Math.round(img.height * k);
    c.getContext('2d').drawImage(img, 0, 0, c.width, c.height);
    return new Promise((res) => c.toBlob(res, 'image/jpeg', .86));
  }
  async function addPhotos(files) {
    const status = $('wpStatus');
    let added = 0, lastId = null;
    const list = [...files].filter((f) => f.type.startsWith('image/') || /\.(jpe?g|png|webp|heic)$/i.test(f.name));
    for (const f of list) {
      status.textContent = 'Adding ' + (added + 1) + ' of ' + list.length + '…';
      try {
        const blob = await shrink(f);
        const id = Date.now().toString(36) + Math.random().toString(36).slice(2, 6);
        await dbDo('readwrite', (st) => st.put({ id, name: (f.name || 'Photo').replace(/\.[^.]+$/, '').slice(0, 24), blob, added: Date.now() }));
        added++; lastId = 'c:' + id;
      } catch (e) { console.error('add photo', e); }
    }
    status.textContent = added ? added + (added === 1 ? ' photo added.' : ' photos added.') : 'Could not add that photo. Try a JPG or PNG.';
    setTimeout(() => { status.textContent = ''; }, 4000);
    if (navigator.storage && navigator.storage.persist) navigator.storage.persist().catch(() => {});
    await loadCustom(); buildThumbs();
    if (lastId) showWallpaper(lastId);
  }
  async function removeWallpaper(id) {
    const w = library().find((x) => x.id === id); if (!w) return;
    if (!confirm('Remove "' + w.name + '" from your wallpapers?' + (w.custom ? '' : ' (Reset in Settings brings the built-in ones back.)'))) return;
    if (w.custom) { try { await dbDo('readwrite', (st) => st.delete(w.dbId)); } catch (e) {} await loadCustom(); }
    else save({ hidden: (S.hidden || []).concat(id) });
    buildThumbs();
    if (S.wallpaperId === id) showWallpaper(pickNext(id));
  }

  // ---------- showing wallpapers ----------
  const layers = [$('bgA'), $('bgB')];
  let front = 0, rotateTimer = null, currentUrl = '', currentWp = null;
  function pickNext(fromId, random) {
    const lib = library(); if (!lib.length) return null;
    if (random || S.shuffle) {
      const others = lib.filter((w) => w.id !== fromId);
      return (others.length ? others : lib)[Math.floor(Math.random() * (others.length || lib.length))].id;
    }
    const i = lib.findIndex((w) => w.id === fromId);
    return lib[(i + 1) % lib.length].id;
  }
  function showWallpaper(id, instant) {
    return new Promise((done) => {
      const lib = library();
      const wp = lib.find((w) => w.id === id) || lib[0];
      if (!wp) { layers.forEach((l) => l.classList.remove('on')); currentUrl = ''; currentWp = null; story.dirty = true; return done(); }
      const next = layers[1 - front];
      const img = new Image();
      let url = wp.src;
      img.onerror = () => { if (wp.remote && url !== wp.remote) { url = wp.remote; img.src = url; } else done(); };
      img.onload = () => {
        next.style.backgroundImage = 'url("' + url + '")';
        next.style.setProperty('--pos', wp.focus || '70% 50%');
        next.style.setProperty('--pos-m', wp.focusMobile || wp.focus || '75% 40%');
        if (instant) next.style.transition = 'none';
        next.classList.add('on'); layers[front].classList.remove('on');
        if (instant) requestAnimationFrame(() => { next.style.transition = ''; });
        front = 1 - front;
        currentUrl = url; currentWp = wp; story.dirty = true;
        done();
      };
      img.src = wp.src;
      save({ wallpaperId: wp.id });
      document.querySelectorAll('.thumb').forEach((t) => t.setAttribute('aria-pressed', t.dataset.id === wp.id ? 'true' : 'false'));
    });
  }
  function thumbHtml(w, withDelete) {
    const bg = 'background-image:url(&quot;' + w.src + '&quot;)' + (w.remote ? ',url(&quot;' + w.remote + '&quot;)' : '');
    const t = '<button type="button" class="thumb" data-id="' + w.id + '" aria-label="Wallpaper: ' + w.name + '" aria-pressed="' +
              (w.id === S.wallpaperId) + '" style="' + bg + '"><span>' + w.name + '</span></button>';
    return withDelete ? '<div class="tile">' + t + '<button type="button" class="del" data-del="' + w.id + '" aria-label="Remove ' + w.name + '">' +
      '<svg viewBox="0 0 24 24" aria-hidden="true"><path d="M6 6l12 12M18 6L6 18"/></svg></button></div>' : t;
  }
  function buildThumbs() {
    const lib = library();
    $('thumbs').innerHTML = lib.slice(0, 4).map((w) => thumbHtml(w, false)).join('');
    $('mThumbs').innerHTML = lib.map((w) => thumbHtml(w, true)).join('') +
      '<label class="tile add-tile"><input type="file" id="wpFile" accept="image/*" multiple>' +
      '<svg viewBox="0 0 24 24" aria-hidden="true"><path d="M12 5v14M5 12h14"/></svg><span>Add photos</span></label>';
    $('wpCount').textContent = lib.length + (lib.length === 1 ? ' wallpaper' : ' wallpapers');
  }
  ['thumbs', 'mThumbs'].forEach((id) => {
    $(id).addEventListener('click', (e) => {
      const d = e.target.closest('[data-del]'); if (d) { removeWallpaper(d.dataset.del); return; }
      const b = e.target.closest('.thumb'); if (!b) return;
      showWallpaper(b.dataset.id); restartRotate();
    });
    $(id).addEventListener('change', (e) => {
      if (e.target.id === 'wpFile' && e.target.files.length) addPhotos(e.target.files);
    });
  });
  function restartRotate() {
    clearInterval(rotateTimer);
    $('autoBtn').setAttribute('aria-pressed', S.auto ? 'true' : 'false');
    $('mAuto').checked = !!S.auto;
    $('mShuffle').checked = !!S.shuffle;
    if (S.auto && S.rotateSeconds > 0) rotateTimer = setInterval(() => showWallpaper(pickNext(S.wallpaperId)), S.rotateSeconds * 1000);
  }
  $('autoBtn').addEventListener('click', () => { save({ auto: !S.auto }); restartRotate(); });
  $('mAuto').addEventListener('change', () => {
    const on = $('mAuto').checked;
    save({ auto: on, rotateSeconds: on && !S.rotateSeconds ? 300 : S.rotateSeconds }); restartRotate();
  });
  $('mShuffle').addEventListener('change', () => { save({ shuffle: $('mShuffle').checked }); });

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
  document.addEventListener('visibilitychange', () => { if (document.hidden) cancelAnimationFrame(raf); else { setEmbers(S.embers); renderCalendar(true); } });
  addEventListener('pageshow', (e) => { if (e.persisted) renderCalendar(true); });

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
  $('wpBtnD').addEventListener('click', () => $('wpSheet').showModal());

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
    if (!confirm('Reset your title, dates and appearance to the defaults? Photos you added are kept.')) return;
    try { localStorage.removeItem(KEY); } catch (e) {}
    S = load(); dlg.close('cancel');
    renderCalendar(true); tick(); setEmbers(S.embers); restartRotate(); buildThumbs(); showWallpaper(library()[0] && library()[0].id); applyDiya(); setDiyaLit(true);
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
  const story = { dirty: true, blob: null, file: null, url: '', usedWallpaper: null };

  // Images from another website (e.g. the Higgsfield fallback links) can be shown but not copied into
  // a new image unless that site allows it, so they are requested in "CORS" mode and dropped if refused.
  function loadImg(src) {
    return new Promise((res) => {
      if (!src) return res(null);
      const remote = new URL(src, location.href).origin !== location.origin;
      const im = new Image();
      if (remote) im.crossOrigin = 'anonymous';
      im.onload = () => res(im); im.onerror = () => res(null);
      im.src = remote ? src + (src.includes('?') ? '&' : '?') + 'story=1' : src;
    });
  }
  function canExport(cv) { try { cv.getContext('2d').getImageData(0, 0, 1, 1); return true; } catch (e) { return false; } }
  function plainBackground(g, W, H) {
    g.fillStyle = '#0A0806'; g.fillRect(0, 0, W, H);
    const r = g.createRadialGradient(W * .7, H * .32, 20, W * .7, H * .32, W * .9);
    r.addColorStop(0, 'rgba(255,170,70,.35)'); r.addColorStop(.5, 'rgba(140,70,20,.18)'); r.addColorStop(1, 'rgba(10,8,6,0)');
    g.fillStyle = r; g.fillRect(0, 0, W, H);
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
    plainBackground(g, W, H);
    const img = await loadImg(currentUrl);
    story.usedWallpaper = false;
    if (img) {
      const s = Math.max(W / img.width, H / img.height), iw = img.width * s, ih = img.height * s;
      const pos = ((currentWp && (currentWp.focusMobile || currentWp.focus)) || '75% 40%').split(' ').map(parseFloat);
      g.drawImage(img, (W - iw) * (pos[0] / 100), (H - ih) * ((pos[1] || 50) / 100), iw, ih);
      if (canExport(c)) story.usedWallpaper = true;
      else plainBackground(g, W, H); // wallpaper can't be exported: paint over it so the image can still be saved
    }
    // Shade only where text sits: top band for the title, bottom third for the numbers. The middle stays clear for the deity.
    let sh = g.createLinearGradient(0, 0, 0, H);
    sh.addColorStop(0, 'rgba(8,6,4,.85)'); sh.addColorStop(.2, 'rgba(8,6,4,.45)'); sh.addColorStop(.34, 'rgba(8,6,4,.06)');
    sh.addColorStop(.5, 'rgba(8,6,4,.06)'); sh.addColorStop(.62, 'rgba(8,6,4,.62)'); sh.addColorStop(.74, 'rgba(8,6,4,.88)'); sh.addColorStop(1, 'rgba(8,6,4,.95)');
    g.fillStyle = sh; g.fillRect(0, 0, W, H);

    const L = 84; // left margin; top 220 px and bottom 230 px kept clear of Instagram's own bars and reply box
    g.textBaseline = 'alphabetic';
    g.fillStyle = '#FFB547'; g.font = '700 28px ' + I;
    spaced(g, 'SWAMIYE SARANAM AYYAPPA', L, 250, 6);
    drawDiya(g, W - 150, 262, .7);

    g.font = '800 84px ' + D;
    const tl = wrap(g, S.title || 'Mandala Deeksha', W - L - 230);
    const tg = g.createLinearGradient(0, 290, 0, 290 + tl.length * 92); tg.addColorStop(0, '#FFF6E3'); tg.addColorStop(1, '#FFD58A');
    g.fillStyle = tg;
    tl.slice(0, 2).forEach((ln, n) => g.fillText(ln, L, 348 + n * 90));
    let y = 348 + (Math.min(2, tl.length) - 1) * 90 + 52;
    g.fillStyle = 'rgba(242,235,223,.75)'; g.font = '500 30px ' + I; g.fillText(longDate(m.today), L, y);

    // ring, smaller and low, so the deity's face stays clear
    const rcx = W / 2, rcy = 1215, R = 128;
    g.fillStyle = 'rgba(10,8,6,.6)'; g.beginPath(); g.arc(rcx, rcy, R + 26, 0, 7); g.fill();
    g.lineCap = 'round'; g.lineWidth = 17;
    g.strokeStyle = 'rgba(255,220,170,.16)'; g.beginPath(); g.arc(rcx, rcy, R, 0, 7); g.stroke();
    const frac = Math.min(1, m.done / m.total);
    if (frac > 0) {
      g.save(); g.shadowColor = 'rgba(255,181,71,.7)'; g.shadowBlur = 20; g.strokeStyle = '#FFB547';
      g.beginPath(); g.arc(rcx, rcy, R, -Math.PI / 2, -Math.PI / 2 + frac * Math.PI * 2); g.stroke(); g.restore();
    }
    g.textAlign = 'center';
    g.fillStyle = '#E6DCCB'; g.font = '700 24px ' + I; g.fillText('DAY', rcx, rcy - 58);
    g.fillStyle = '#FFB547'; g.font = '800 112px ' + D; g.fillText(String(m.dayNum), rcx, rcy + 38);
    g.fillStyle = '#E6DCCB'; g.font = '500 30px ' + I;
    g.fillText(m.state === 'before' ? 'starts ' + shortDate(m.start) : m.state === 'after' ? 'complete' : 'of ' + m.total, rcx, rcy + 84);

    y = rcy + R + 80;
    g.fillStyle = '#F7F1E6'; g.font = '500 34px ' + I;
    g.fillText(m.state === 'during' ? m.done + ' completed  ·  ' + m.left + ' left' : m.state === 'before' ? 'Begins ' + shortDate(m.start) : 'All ' + m.total + ' days completed', rcx, y);

    // one dot per day: gold = done, glowing = today, ring = still to come, larger ring = final day
    const perRow = m.total > 54 ? Math.ceil(m.total / 2) : m.total;
    const span = W - L * 2, step = Math.min(30, span / Math.max(1, perRow - 1)), r = Math.max(4, Math.min(8, step * .32));
    m.days.forEach((x) => {
      const row = Math.floor(x.i / perRow), col = x.i % perRow, cnt = Math.min(perRow, m.total - row * perRow);
      const cx = W / 2 - (cnt - 1) * step / 2 + col * step, cy = y + 56 + row * (step + 6);
      g.beginPath(); g.arc(cx, cy, x.today ? r * 1.55 : r, 0, 7);
      if (x.today) { g.save(); g.shadowColor = 'rgba(255,170,60,.95)'; g.shadowBlur = 18; g.fillStyle = '#FFD58A'; g.fill(); g.restore(); }
      else if (x.past) { g.fillStyle = '#FFB547'; g.fill(); }
      else { g.lineWidth = 2; g.strokeStyle = x.final ? 'rgba(255,181,71,.95)' : 'rgba(255,220,170,.4)'; if (x.final) { g.beginPath(); g.arc(cx, cy, r * 1.4, 0, 7); g.lineWidth = 2.5; } g.stroke(); }
    });

    g.fillStyle = '#FFB547'; g.font = '800 40px ' + D;
    const word = 'TATVAMASI', sp = 12;
    let ww = -sp; for (const ch of word) ww += g.measureText(ch).width + sp;
    const ty = Math.max(1560, y + 150);
    g.textAlign = 'left'; spaced(g, word, (W - ww) / 2, ty, sp); g.textAlign = 'center';
    g.fillStyle = '#D9CFBF'; g.font = 'italic 500 26px ' + I;
    g.fillText('“You are That” · the divine you seek is within you', W / 2, ty + 44);
    g.textAlign = 'left';

    return new Promise((res) => c.toBlob(res, 'image/png'));
  }

  async function openStory() {
    const sheet = $('storySheet');
    $('storyShare').disabled = true; $('storySave').disabled = true;
    if (!sheet.open) sheet.showModal();
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
        console.error('story', e);
        $('storyMsg').textContent = 'Could not create the image (' + (e && e.message || 'unknown error') + '). Close this and try again.';
        return;
      }
    }
    $('storyImg').src = story.url;
    $('storyHint').hidden = story.usedWallpaper !== false || !currentUrl;
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
  $('storyNew').addEventListener('click', async () => {
    if (library().length < 2) { $('wpSheet').showModal(); return; }
    $('storyNew').disabled = true;
    // prefer your own photos: they always work in the story image
    const own = custom.filter((w) => w.id !== S.wallpaperId);
    await showWallpaper(own.length ? own[Math.floor(Math.random() * own.length)].id : pickNext(S.wallpaperId, true));
    await openStory();
    $('storyNew').disabled = false;
  });
  $('storyBtn').addEventListener('click', openStory);
  $('storyBtnD').addEventListener('click', openStory);

  // ---------- audio (stays hidden until tracks are listed in config.js) ----------
  const tracks = (BASE.audio && [].concat(BASE.audio.sharanaghosha || [], BASE.audio.pooja || [])) || [];
  $('audioBtn').hidden = tracks.length === 0;

  // ---------- go ----------
  if (!S.wallpaperId) S.wallpaperId = 'b:' + (S.wallpaperIndex || 0); // settings saved by the older version
  loadCustom().then(() => {
    buildThumbs();
    const lib = library();
    const keep = lib.find((w) => w.id === S.wallpaperId);
    showWallpaper(S.shuffle || !keep ? pickNext(S.wallpaperId, S.shuffle) : keep.id, true);
  });
  renderCalendar(true);
  tick(); setInterval(tick, 1000);
  setEmbers(S.embers);
  applyDiya();
  restartRotate();
})();
