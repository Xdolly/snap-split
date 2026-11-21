// หน้าแบ่งจอ — สถานะทั้งหมดอยู่ใน #hash (โหลดหน้าใหม่/เปิดจากประวัติ ได้ชุดเดิม)
// ผังเป็นต้นไม้: ใบ = เลขช่อง (number) · กิ่ง = { d: 'h' แบ่งซ้าย-ขวา | 'v' แบ่งบน-ล่าง, k: สัดส่วนฝั่งแรก 0–1, a, b }
// state = { tree, u: { เลขช่อง: ที่อยู่ }, a: ช่องที่ใช้งานอยู่, next: เลขช่องถัดไป, sp: [ช่องที่พักไว้ตอนเปลี่ยนรูปแบบ], l?: รูปแบบสำเร็จรูป }
// ช่องวางแบบ absolute ในกล่องเดียว ไม่ย้ายใน DOM — ย้าย iframe = หน้าเว็บโหลดใหม่
const grid = document.getElementById('grid');
const urlIn = document.getElementById('url');
const MAX = 8;          // ช่องสูงสุด (แต่ละช่องคือหน้าเว็บเต็ม ๆ)
const G = 6;            // ความกว้างร่องลาก px
const panes = new Map();         // เลขช่อง → ช่อง
const gutters = new Map();       // กิ่ง → ร่องลาก
const rects = new WeakMap();     // กิ่ง → ตำแหน่ง (สัดส่วนของกล่อง)
let state = readHash();
let myTabId = null;

// ── สถานะ ──
function fromPreset(l, ids) {
  const map = (n) => (typeof n === 'number' ? ids[n] : { d: n.d, k: n.k, a: map(n.a), b: map(n.b) });
  return map(l.tree);
}
function readHash() {
  let s = null;
  try { s = JSON.parse(decodeURIComponent(location.hash.slice(1))); } catch (e) { /* hash เสีย = เริ่มใหม่ */ }
  const noBlob = (u) => (/^blob:/.test(u || '') ? '' : u || '');
  if (s && s.tree !== undefined && s.u && typeof s.u === 'object' && !Array.isArray(s.u)) {
    for (const k of Object.keys(s.u)) s.u[k] = noBlob(s.u[k]);
    s.sp = Array.isArray(s.sp) ? s.sp : [];
    return s;
  }
  // แบบเดิม/จากเมนูไอคอน: { l, u: [...] }
  const l = layoutById(s && s.l);
  const n = zoneCount(l);
  const ids = [...Array(n).keys()];
  const u = {};
  ids.forEach((i) => { u[i] = noBlob(s && Array.isArray(s.u) ? s.u[i] : ''); });
  return { tree: fromPreset(l, ids), u, a: Math.min((s && s.a) || 0, n - 1), next: n, sp: [], l: l.id };
}
const save = () => history.replaceState(null, '', '#' + encodeURIComponent(JSON.stringify(state)));
const host = (u) => { try { return new URL(u).hostname.replace(/^www\./, ''); } catch (e) { return ''; } };
const leaves = (n) => (typeof n === 'number' ? [n] : [...leaves(n.a), ...leaves(n.b)]);
function findParent(n, target) {
  if (typeof n === 'number') return null;
  for (const key of ['a', 'b']) {
    if (n[key] === target) return { parent: n, key };
    const r = findParent(n[key], target);
    if (r) return r;
  }
  return null;
}
function replaceNode(target, node) {
  if (state.tree === target) { state.tree = node; return; }
  const f = findParent(state.tree, target);
  if (f) f.parent[f.key] = node;
}

let toastT = null;
function toast(msg) {
  const t = document.getElementById('toast');
  t.textContent = msg;
  t.hidden = false;
  clearTimeout(toastT);
  toastT = setTimeout(() => { t.hidden = true; }, 2500);
}

// ── แถบรูปแบบสำเร็จรูป ──
const bar = document.getElementById('layouts');
LAYOUTS.forEach((l) => {
  const b = document.createElement('button');
  b.className = 'mini';
  b.title = l.name;
  b.dataset.id = l.id;
  b.style.gridTemplateColumns = l.cols.map((c) => c + 'fr').join(' ');
  b.style.gridTemplateRows = l.rows.map((r) => r + 'fr').join(' ');
  b.style.gridTemplateAreas = simpleAreas(l);
  for (let z = 0; z < zoneCount(l); z++) { const s = document.createElement('span'); s.style.gridArea = 'z' + z; b.appendChild(s); }
  b.addEventListener('click', () => applyPreset(l.id));
  bar.appendChild(b);
});

/** เปลี่ยนเป็นรูปแบบสำเร็จรูป — ช่องเดิมเรียงลงตามลำดับ ช่องเกินพักไว้ (ไม่ทิ้ง เปลี่ยนกลับได้) */
function applyPreset(id) {
  const l = layoutById(id);
  const n = zoneCount(l);
  const order = [...leaves(state.tree), ...state.sp];
  const ids = order.slice(0, n);
  while (ids.length < n) { const nid = state.next++; state.u[nid] = ''; ids.push(nid); }
  state.sp = order.slice(n);
  state.tree = fromPreset(l, ids);
  state.l = l.id;
  render();
}

// ── แบ่ง / ปิดช่อง ──
function splitPane(id, dir, url = '') {
  if (leaves(state.tree).length >= MAX) { toast(`แบ่งได้สูงสุด ${MAX} ช่อง`); return false; }
  if (!leaves(state.tree).includes(id)) id = state.a;
  const nid = state.next++;
  const first = dir === 'left' || dir === 'top';
  replaceNode(id, { d: dir === 'left' || dir === 'right' ? 'h' : 'v', k: 0.5, a: first ? nid : id, b: first ? id : nid });
  state.u[nid] = url;
  state.a = nid;
  delete state.l;
  render();
  return true;
}

function closePane(id) {
  if (leaves(state.tree).length === 1) { setUrl(id, ''); return; }
  const f = findParent(state.tree, id);
  const sib = f.parent[f.key === 'a' ? 'b' : 'a'];
  replaceNode(f.parent, sib);
  const p = panes.get(id);
  if (p) { p.el.remove(); panes.delete(id); }
  delete state.u[id];
  if (state.a === id) state.a = leaves(sib)[0];
  delete state.l;
  render();
}

// ── ช่องที่ใช้งานอยู่ ──
const active = () => panes.get(state.a) || panes.get(leaves(state.tree)[0]);
function setActive(id) {
  if (!leaves(state.tree).includes(id)) id = leaves(state.tree)[0];
  state.a = id;
  panes.forEach((p) => p.el.classList.toggle('active', p.id === id));
  refreshChrome();
  save();
  peek(panes.get(id));
}

/** แถบบน + ชื่อแท็บ + ไอคอนแท็บ = ของช่องที่ใช้งานอยู่ */
function refreshChrome() {
  const p = active();
  if (!p) return;
  const url = state.u[p.id] || '';
  const local = /^blob:/.test(url);
  if (document.activeElement !== urlIn) urlIn.value = local ? '📄 ' + (p.file || 'ไฟล์ในเครื่อง') : url;
  document.getElementById('back').disabled = !p.back.length;
  document.getElementById('fwd').disabled = !p.fwd.length;
  const ids = leaves(state.tree);
  document.getElementById('pno').textContent = ids.length > 1 ? String(ids.indexOf(p.id) + 1) : '';
  const icon = url && !local ? (p.icon || `https://${host(url)}/favicon.ico`) : 'icon.svg';
  document.getElementById('fav').href = icon;
  const pf = document.getElementById('pfav');
  pf.src = icon; pf.hidden = !url;
  document.title = url ? `▦ ${p.title || p.file || host(url)}` : 'Snap Split';
}

// คลิกเข้าไปในหน้าเว็บ = iframe ได้โฟกัส · หน้าแม่ไม่ได้รับคลิก จึงดูว่าโฟกัสอยู่ที่ iframe ไหน
setInterval(() => {
  const el = document.activeElement;
  if (el && el.tagName === 'IFRAME') {
    for (const p of panes.values()) if (p.frame === el && p.id !== state.a) { setActive(p.id); break; }
  }
}, 250);

// อ่านชื่อหน้า + ไอคอนจากเว็บในช่อง (อ่านอย่างเดียว เฉพาะเฟรมในหน้าแบ่งจอของเรา)
async function peek(p) {
  if (!p || !p.frame || myTabId === null) return;
  let frameId;
  try { frameId = browser.runtime.getFrameId(p.frame); } catch (e) { return; }
  try {
    const [r] = await browser.tabs.executeScript(myTabId, {
      frameId,
      code: `({ t: document.title, i: (document.querySelector('link[rel~="icon"]') || {}).href || '' })`,
    });
    if (r) { p.title = r.t || ''; p.icon = /^(https?|data):/.test(r.i) ? r.i : ''; }
  } catch (e) { /* หน้ายังโหลดไม่เสร็จ / ห้ามรันสคริปต์ — ใช้ชื่อโดเมนแทน */ }
  if (p === active()) refreshChrome();
}
setInterval(() => peek(active()), 3000);

// ── แถบบน ──
function normalize(v) {
  v = v.trim();
  if (!v) return '';
  if (/^file:/i.test(v) || /^[a-z]:\\/i.test(v)) { toast('Firefox ไม่ให้เปิด file:/// — ใช้ปุ่ม "เปิดไฟล์ในเครื่อง…" หรือลากไฟล์มาวางในช่อง'); return ''; }
  if (/^[a-z]+:\/\//i.test(v)) return v;
  return /\s/.test(v) || !/\./.test(v) ? 'https://www.google.com/search?q=' + encodeURIComponent(v) : 'https://' + v;
}
document.getElementById('addr').addEventListener('submit', (e) => {
  e.preventDefault();
  const v = normalize(urlIn.value);
  if (v) { setUrl(active().id, v); urlIn.blur(); }
});
urlIn.addEventListener('blur', refreshChrome);
const on = (id, fn) => document.getElementById(id).addEventListener('click', fn);
on('back', () => goBack());
on('fwd', () => goFwd());
on('reload', () => { const p = active(); if (p.frame) p.frame.src = state.u[p.id]; });
on('pop', () => { const u = state.u[active().id]; if (u && !/^blob:/.test(u)) browser.tabs.create({ url: u }); });
on('close', () => closePane(active().id));
on('splitR', () => splitPane(active().id, 'right'));
on('splitB', () => splitPane(active().id, 'bottom'));
document.addEventListener('keydown', (e) => {
  if (!e.altKey || document.activeElement === urlIn) return;
  if (e.key === 'ArrowLeft') { e.preventDefault(); goBack(); }
  if (e.key === 'ArrowRight') { e.preventDefault(); goFwd(); }
});

// ── ย้อนกลับ/ไปข้างหน้า ต่อช่อง (ไฟล์ในเครื่องไม่คืนหน่วยความจำ จะได้ย้อนกลับมาเปิดได้ — หายเมื่อปิดแท็บ) ──
function setUrl(id, url, file = '') {
  const p = panes.get(id);
  if (state.u[id] !== url) { p.back.push({ u: state.u[id] || '', f: p.file }); p.fwd = []; }
  load(p, url, file);
}
function load(p, url, file) {
  state.u[p.id] = url;
  p.file = file || '';
  p.title = ''; p.icon = '';
  fill(p);
  save();
  if (p === active()) refreshChrome();
}
function goBack() {
  const p = active();
  if (!p || !p.back.length) return;
  p.fwd.push({ u: state.u[p.id] || '', f: p.file });
  const e = p.back.pop();
  load(p, e.u, e.f);
}
function goFwd() {
  const p = active();
  if (!p || !p.fwd.length) return;
  p.back.push({ u: state.u[p.id] || '', f: p.file });
  const e = p.fwd.pop();
  load(p, e.u, e.f);
}

// ── ไฟล์ในเครื่อง: blob ของหน้านี้เอง (ไฟล์ไม่ออกจากเครื่อง) ──
function openFile(id, file) {
  if (!file) return;
  setUrl(id, URL.createObjectURL(file), file.name);
  setActive(id);
}
let dragT = null;
const endFileDrag = () => { document.body.classList.remove('filedrag'); };
// ลากที่รับ: ไฟล์ · ลิงก์/แท็บของ Firefox · ที่จับช่อง (สลับช่อง)
const PANE_MIME = 'application/x-snap-pane';
const droppable = (dt) => ['Files', 'text/uri-list', 'text/x-moz-url', PANE_MIME].some((t) => dt.types.includes(t));
document.addEventListener('dragenter', (e) => { if (droppable(e.dataTransfer)) document.body.classList.add('filedrag'); });
document.addEventListener('dragover', (e) => { if (droppable(e.dataTransfer)) { e.preventDefault(); clearTimeout(dragT); dragT = setTimeout(endFileDrag, 400); } });
document.addEventListener('dragend', endFileDrag);

// สลับตำแหน่ง 2 ช่องในผัง — ช่องไม่ย้ายใน DOM แค่สลับเลขในต้นไม้ หน้าเว็บจึงไม่โหลดใหม่
function swapPanes(a, b) {
  if (a === b) return;
  const walk = (n) => {
    for (const key of ['a', 'b']) {
      if (n[key] === a) n[key] = b;
      else if (n[key] === b) n[key] = a;
      else if (typeof n[key] === 'object') walk(n[key]);
    }
  };
  if (typeof state.tree !== 'object') return;
  walk(state.tree);
  state.a = a;
  delete state.l;
  render();
}

function dropInto(id, dt) {
  const src = dt.getData(PANE_MIME);
  if (src !== '') { swapPanes(Number(src), id); return; }
  if (dt.files && dt.files.length) { openFile(id, dt.files[0]); return; }
  const url = (dt.getData('text/uri-list') || dt.getData('text/x-moz-url') || '').split('\n').map((l) => l.trim()).find((l) => l && !l.startsWith('#'));
  if (isWebUrl(url)) { setUrl(id, url); setActive(id); }
}
document.addEventListener('drop', (e) => { e.preventDefault(); endFileDrag(); });

// ── ช่อง ──
function makePane(id) {
  const el = document.createElement('section');
  el.className = 'pane';
  const body = document.createElement('div');
  body.className = 'pane-body';
  el.appendChild(body);
  el.addEventListener('pointerdown', () => setActive(id));
  // ที่จับ ⠿ ขอบบน: ลากไปวางบนช่องอื่น = สลับที่กัน
  const grip = document.createElement('div');
  grip.className = 'grip';
  grip.draggable = true;
  grip.textContent = '⠿';
  grip.title = 'ลากไปวางบนช่องอื่นเพื่อสลับที่';
  grip.addEventListener('dragstart', (e) => {
    e.dataTransfer.setData(PANE_MIME, String(id));
    e.dataTransfer.effectAllowed = 'move';
    el.classList.add('dragsrc');
  });
  grip.addEventListener('dragend', () => { el.classList.remove('dragsrc'); endFileDrag(); });
  el.appendChild(grip);
  el.addEventListener('dragover', (e) => { if (droppable(e.dataTransfer)) { e.preventDefault(); el.classList.add('drop'); } });
  el.addEventListener('dragleave', () => el.classList.remove('drop'));
  el.addEventListener('drop', (e) => { e.preventDefault(); e.stopPropagation(); el.classList.remove('drop'); endFileDrag(); dropInto(id, e.dataTransfer); });
  grid.appendChild(el);
  return { id, el, body, frame: null, title: '', icon: '', file: '', back: [], fwd: [], expect: '' };
}

function fill(p) {
  const url = state.u[p.id] || '';
  if (url) {
    p.body.querySelector('.chooser')?.remove();
    if (!p.frame) {
      p.frame = document.createElement('iframe');
      p.frame.setAttribute('allow', 'clipboard-read; clipboard-write; fullscreen; camera; microphone; geolocation');
      p.frame.addEventListener('load', () => peek(p));
      p.body.appendChild(p.frame);
    }
    if (p.frame.dataset.src !== url) { p.frame.dataset.src = url; p.expect = url; p.frame.src = url; }
  } else {
    p.frame?.remove();
    p.frame = null;
    if (!p.body.querySelector('.chooser')) showChooser(p);
  }
}

// ช่องว่าง: พิมพ์ที่อยู่ / เปิดไฟล์ / เลือกแท็บที่เปิดอยู่ (แบบ Snap Assist)
async function showChooser(p) {
  const box = document.createElement('div');
  box.className = 'chooser';
  const f = document.createElement('form');
  f.className = 'ch-form';
  const inp = document.createElement('input');
  inp.className = 'url';
  inp.placeholder = 'พิมพ์ที่อยู่เว็บ แล้วกด Enter';
  inp.spellcheck = false;
  const fb = document.createElement('button');
  fb.type = 'button';
  fb.className = 'filebtn';
  fb.textContent = '📂 เปิดไฟล์ในเครื่อง…';
  const fi = document.createElement('input');
  fi.type = 'file';
  fi.hidden = true;
  fi.addEventListener('change', () => openFile(p.id, fi.files[0]));
  fb.addEventListener('click', () => fi.click());
  f.append(inp, fb, fi);
  f.addEventListener('submit', (e) => { e.preventDefault(); const v = normalize(inp.value); if (v) setUrl(p.id, v); });
  const h = document.createElement('h2');
  h.textContent = 'หรือเลือกแท็บที่จะวางในช่องนี้ · ลากไฟล์มาวางก็ได้';
  const list = document.createElement('div');
  list.className = 'tabs';
  box.append(f, h, list);
  p.body.appendChild(box);
  const tabs = (await browser.tabs.query({ currentWindow: true })).filter((t) => isWebUrl(t.url));
  if (!tabs.length) { const e = document.createElement('p'); e.className = 'empty'; e.textContent = 'ไม่มีแท็บเว็บอื่นในหน้าต่างนี้'; list.appendChild(e); }
  for (const t of tabs) {
    const b = document.createElement('button');
    b.className = 'tab';
    b.title = t.url;
    if (t.favIconUrl && /^(https?|data):/.test(t.favIconUrl)) { const img = document.createElement('img'); img.src = t.favIconUrl; img.alt = ''; b.appendChild(img); }
    const s = document.createElement('span');
    s.textContent = t.title || t.url;
    b.appendChild(s);
    b.addEventListener('click', () => setUrl(p.id, t.url));
    list.appendChild(b);
  }
}

// ── วางตำแหน่ง ──
function render() {
  const ids = leaves(state.tree);
  for (const id of ids) {
    if (!panes.has(id)) { const p = makePane(id); panes.set(id, p); fill(p); }
    else fill(panes.get(id));
  }
  for (const [id, p] of panes) p.el.hidden = !ids.includes(id);
  placeAll();
  bar.querySelectorAll('.mini').forEach((b) => b.classList.toggle('on', b.dataset.id === state.l));
  document.getElementById('splitR').disabled = document.getElementById('splitB').disabled = ids.length >= MAX;
  setActive(state.a);
}

function placeAll() {
  const used = new Set();
  place(state.tree, 0, 0, 1, 1, used);
  for (const [n, el] of gutters) if (!used.has(n)) { el.remove(); gutters.delete(n); }
}

const pct = (v) => +(v * 100).toFixed(4) + '%';
function place(n, x, y, w, h, used) {
  if (typeof n === 'number') {
    const el = panes.get(n).el;
    const L = x > 1e-6 ? G / 2 : 0, T = y > 1e-6 ? G / 2 : 0;
    const R = x + w < 1 - 1e-6 ? G / 2 : 0, B = y + h < 1 - 1e-6 ? G / 2 : 0;
    el.style.left = `calc(${pct(x)} + ${L}px)`;
    el.style.top = `calc(${pct(y)} + ${T}px)`;
    el.style.width = `calc(${pct(w)} - ${L + R}px)`;
    el.style.height = `calc(${pct(h)} - ${T + B}px)`;
    return;
  }
  rects.set(n, { x, y, w, h });
  used.add(n);
  const g = gutters.get(n) || makeGutter(n);
  g.classList.toggle('col', n.d === 'h');
  g.classList.toggle('row', n.d !== 'h');
  if (n.d === 'h') {
    const wa = w * n.k;
    place(n.a, x, y, wa, h, used);
    place(n.b, x + wa, y, w - wa, h, used);
    Object.assign(g.style, { left: `calc(${pct(x + wa)} - ${G / 2}px)`, top: pct(y), width: G + 'px', height: pct(h) });
  } else {
    const ha = h * n.k;
    place(n.a, x, y, w, ha, used);
    place(n.b, x, y + ha, w, h - ha, used);
    Object.assign(g.style, { top: `calc(${pct(y + ha)} - ${G / 2}px)`, left: pct(x), height: G + 'px', width: pct(w) });
  }
}

function makeGutter(n) {
  const el = document.createElement('div');
  el.className = 'gutter';
  gutters.set(n, el);
  el.addEventListener('pointerdown', (e) => {
    e.preventDefault();
    el.setPointerCapture(e.pointerId);
    const box = grid.getBoundingClientRect();
    const r = rects.get(n);
    document.body.classList.add('dragging');
    el.classList.add('drag');
    const onMove = (ev) => {
      const k = n.d === 'h'
        ? ((ev.clientX - box.left) / box.width - r.x) / r.w
        : ((ev.clientY - box.top) / box.height - r.y) / r.h;
      n.k = +Math.min(Math.max(k, 0.1), 0.9).toFixed(4);
      placeAll();
    };
    const onUp = () => {
      el.removeEventListener('pointermove', onMove);
      el.removeEventListener('pointerup', onUp);
      el.removeEventListener('pointercancel', onUp);
      document.body.classList.remove('dragging');
      el.classList.remove('drag');
      save();
    };
    el.addEventListener('pointermove', onMove);
    el.addEventListener('pointerup', onUp);
    el.addEventListener('pointercancel', onUp);
  });
  el.addEventListener('dblclick', () => { n.k = 0.5; placeAll(); save(); });   // ดับเบิลคลิก = แบ่งครึ่ง
  grid.appendChild(el);
  return el;
}

// ── เว็บในช่องเปลี่ยนหน้าเอง → จำที่อยู่ใหม่ (นับเป็นก้าวย้อนกลับได้) ──
function paneByFrame(frameId) {
  if (!frameId) return panes.get(state.a);
  for (const p of panes.values()) {
    if (!p.frame) continue;
    try { if (browser.runtime.getFrameId(p.frame) === frameId) return p; } catch (e) { /* ข้าม */ }
  }
  return null;
}
browser.webNavigation.onCommitted.addListener((d) => {
  if (d.tabId !== myTabId || d.parentFrameId !== 0) return;
  const p = paneByFrame(d.frameId);
  if (!p) return;
  const redirect = (d.transitionQualifiers || []).some((q) => /redirect/.test(q));
  if (p.expect) p.expect = '';     // หน้าที่เราสั่งโหลดเอง (รวมที่เว็บพาเด้งต่อ) ไม่นับเป็นก้าวใหม่
  else if (!redirect && d.url !== state.u[p.id]) { p.back.push({ u: state.u[p.id] || '', f: p.file }); p.fwd = []; p.file = ''; }
  state.u[p.id] = d.url;
  p.frame.dataset.src = d.url;
  p.icon = '';
  save();
  if (p === active()) refreshChrome();
});

// ── คำสั่งจากเมนูไอคอน / เมนูคลิกขวา ──
browser.runtime.onMessage.addListener((m) => {
  if (!m || m.tabId !== myTabId) return undefined;
  if (m.type === 'relayout') applyPreset(m.layout);
  if (m.type === 'ctx') {
    const p = paneByFrame(m.frameId) || active();
    if (m.action === 'close') closePane(p.id); else splitPane(p.id, m.action);
  }
  if (m.type === 'addTab') return Promise.resolve(splitPane(state.a, m.dir, m.url));
  return undefined;
});
window.addEventListener('hashchange', () => { state = readHash(); render(); });

// ── สีตามธีมของ Firefox (ธีมที่ลงไว้ / ธีมในตัวที่มีสี) · ไม่มีสี = ใช้ค่าเริ่มต้นแบบ Firefox Nova ใน CSS ──
const THEME_VARS = {
  '--bar': ['toolbar', 'frame'], '--fg': ['toolbar_text', 'tab_background_text'],
  '--field': ['toolbar_field'], '--field-fg': ['toolbar_field_text'], '--field-focus': ['toolbar_field_focus'],
  '--hi': ['toolbar_field_border_focus', 'tab_line'], '--icon': ['icons', 'toolbar_text', 'tab_background_text'],
  '--line': ['toolbar_bottom_separator'],
};
const colorStr = (v) => (Array.isArray(v) ? (v.length === 4 ? `rgba(${v.join(',')})` : `rgb(${v.join(',')})`) : v);
async function applyTheme(windowId) {
  let th = null;
  try { th = await browser.theme.getCurrent(windowId); } catch (e) { /* ไม่มีสิทธิ์/รุ่นเก่า */ }
  const c = (th && th.colors) || {};
  const root = document.documentElement.style;
  for (const [v, keys] of Object.entries(THEME_VARS)) {
    const k = keys.find((x) => c[x]);
    if (k) root.setProperty(v, colorStr(c[k])); else root.removeProperty(v);
  }
}
browser.theme.onUpdated.addListener(() => applyTheme());

browser.tabs.getCurrent().then((t) => { myTabId = t ? t.id : null; applyTheme(t && t.windowId); panes.forEach(peek); });
render();
