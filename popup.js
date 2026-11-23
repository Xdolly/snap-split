// เมนูเลือกรูปแบบ — คลิกช่องไหน แท็บที่เปิดอยู่ไปลงช่องนั้น แท็บที่เลือกไว้ (Ctrl+คลิก) ลงช่องที่เหลือตามลำดับ
// คีย์บอร์ด: กดเลขรูปแบบ (1–6) แล้วกดเลขช่อง เหมือน Win+Z
const grid = document.getElementById('grid');
const hint = document.getElementById('hint');
const move = document.getElementById('move');
const SPLIT_URL = browser.runtime.getURL(SPLIT_PAGE);

applyI18n();
let picked = null; // รูปแบบที่กดเลขไว้แล้ว รอเลขช่อง

LAYOUTS.forEach((l, li) => {
  const tile = document.createElement('div');
  tile.className = 'tile';
  tile.dataset.i = li;
  tile.title = T(l.name);
  const th = document.createElement('div');
  th.className = 'thumb';
  th.style.gridTemplateColumns = l.cols.map((c) => c + 'fr').join(' ');
  th.style.gridTemplateRows = l.rows.map((r) => r + 'fr').join(' ');
  th.style.gridTemplateAreas = simpleAreas(l);
  for (let z = 0; z < zoneCount(l); z++) {
    const b = document.createElement('button');
    b.className = 'zone';
    b.style.gridArea = 'z' + z;
    b.textContent = z + 1;
    b.setAttribute('aria-label', T('zoneAria', T(l.name), z + 1));
    b.addEventListener('click', () => snap(l, z));
    th.appendChild(b);
  }
  const n = document.createElement('span');
  n.className = 'num';
  n.textContent = li + 1;
  tile.append(th, n);
  grid.appendChild(tile);
});

document.addEventListener('keydown', (e) => {
  const d = parseInt(e.key, 10);
  if (!d) return;
  if (picked === null) {
    if (d <= LAYOUTS.length) {
      picked = d - 1;
      document.querySelectorAll('.tile').forEach((t) => t.classList.toggle('sel', +t.dataset.i === picked));
      hint.textContent = T('hintPicked', d, zoneCount(LAYOUTS[picked]));
    }
  } else if (d <= zoneCount(LAYOUTS[picked])) {
    snap(LAYOUTS[picked], d - 1);
  }
});

(async () => {
  const { moveTabs = false } = await browser.storage.local.get('moveTabs');
  move.checked = moveTabs;
  move.addEventListener('change', () => browser.storage.local.set({ moveTabs: move.checked }));
  const [active] = await browser.tabs.query({ active: true, currentWindow: true });
  if (active && active.url.startsWith(SPLIT_URL)) {
    hint.textContent = T('hintAlready');
    move.parentElement.hidden = true;
    return;
  }
  const sel = (await browser.tabs.query({ highlighted: true, currentWindow: true })).filter((t) => isWebUrl(t.url));
  hint.textContent = sel.length > 1
    ? T('hintMulti', sel.length)
    : T('hintSingle');
})();

async function snap(layout, zone) {
  const [active] = await browser.tabs.query({ active: true, currentWindow: true });

  // อยู่ในหน้าแบ่งจออยู่แล้ว = เปลี่ยนรูปแบบของหน้านั้น
  if (active && active.url.startsWith(SPLIT_URL)) {
    await browser.runtime.sendMessage({ type: 'relayout', tabId: active.id, layout: layout.id, zone });
    window.close();
    return;
  }

  const sel = (await browser.tabs.query({ highlighted: true, currentWindow: true }))
    .filter((t) => isWebUrl(t.url))
    .sort((a, b) => (b.active - a.active) || (a.index - b.index));   // แท็บที่เปิดอยู่มาก่อน
  const n = zoneCount(layout);
  const urls = Array(n).fill('');
  const order = [zone, ...[...Array(n).keys()].filter((z) => z !== zone)];
  const used = sel.slice(0, n);
  used.forEach((t, i) => { urls[order[i]] = t.url; });

  const state = { l: layout.id, u: urls };
  const tab = await browser.tabs.create({ url: SPLIT_URL + '#' + encodeURIComponent(JSON.stringify(state)), index: active ? active.index + 1 : undefined });
  if (move.checked && used.length) await browser.tabs.remove(used.map((t) => t.id));
  await groupTabs(tab, move.checked ? [] : used);
  window.close();
}

// รวมหน้าแบ่งจอ + แท็บต้นทาง เป็น Tab Group เดียว (Firefox 139+ · รุ่นเก่าข้ามเงียบ ๆ)
async function groupTabs(splitTab, sources) {
  if (!browser.tabs.group) return;
  try {
    const groupId = await browser.tabs.group({ tabIds: [splitTab.id, ...sources.map((t) => t.id)] });
    const name = [...new Set(sources.map((t) => { try { return new URL(t.url).hostname.replace(/^www\./, ''); } catch (e) { return ''; } }).filter(Boolean))];
    if (browser.tabGroups && browser.tabGroups.update) {
      await browser.tabGroups.update(groupId, { title: '▦ ' + (name.slice(0, 2).join(' + ') || 'Split'), color: 'blue' });
    }
  } catch (e) { /* จัดกลุ่มไม่ได้ ไม่เป็นไร หน้าแบ่งจอยังใช้ได้ */ }
}
