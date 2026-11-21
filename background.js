// เว็บส่วนใหญ่ห้ามเปิดซ้อนในหน้าอื่น (X-Frame-Options / CSP frame-ancestors)
// ถอดเฉพาะเฟรมที่อยู่ "ชั้นแรกในหน้าแบ่งจอของเราเอง" เท่านั้น — เว็บปกติและเฟรมซ้อนชั้นในไม่ถูกแตะ
const BASE = browser.runtime.getURL('');

function stripFrameBlock(details) {
  if (details.parentFrameId !== 0 || !(details.documentUrl || '').startsWith(BASE)) return {};
  const out = [];
  for (const h of details.responseHeaders) {
    const n = h.name.toLowerCase();
    if (n === 'x-frame-options') continue;
    if (n === 'content-security-policy' && h.value) {
      // ตัดแค่ frame-ancestors ส่วนกฎความปลอดภัยอื่นของเว็บคงไว้
      const v = h.value.split(';').filter((d) => !/^\s*frame-ancestors\b/i.test(d)).join(';');
      if (v.trim()) out.push({ name: h.name, value: v });
      continue;
    }
    out.push(h);
  }
  return { responseHeaders: out };
}

browser.webRequest.onHeadersReceived.addListener(
  stripFrameBlock, { urls: ['<all_urls>'], types: ['sub_frame'] }, ['blocking', 'responseHeaders']);

// ── เมนูคลิกขวา ──
// ในหน้าเว็บของช่อง: Snap Split ▸ แบ่งซ้าย/ขวา/บน/ล่าง · ปิดช่องนี้ (โชว์เฉพาะในหน้าแบ่งจอ)
// ที่แท็บปกติด้านบน: ส่งเข้า Snap Split ▸ ซ้าย/ขวา/บน/ล่าง (เข้าหน้าแบ่งจอที่ใช้ล่าสุดในหน้าต่างนั้น ไม่มี = สร้างใหม่)
const SPLIT = browser.runtime.getURL('split.html');
const DIRS = [['left', 'ซ้าย'], ['right', 'ขวา'], ['top', 'บน'], ['bottom', 'ล่าง']];
const isWeb = (u) => /^https?:\/\//i.test(u || '');

browser.menus.removeAll().then(() => {
  browser.menus.create({ id: 'ss', title: 'Snap Split', contexts: ['all'], visible: false });
  for (const [d, t] of DIRS) browser.menus.create({ id: 'ss-' + d, parentId: 'ss', title: 'แบ่ง' + t, contexts: ['all'] });
  browser.menus.create({ id: 'ss-sep', parentId: 'ss', type: 'separator', contexts: ['all'] });
  browser.menus.create({ id: 'ss-close', parentId: 'ss', title: 'ปิดช่องนี้', contexts: ['all'] });
  browser.menus.create({ id: 'st', title: 'ส่งเข้า Snap Split', contexts: ['tab'] });
  for (const [d, t] of DIRS) browser.menus.create({ id: 'st-' + d, parentId: 'st', title: 'วางด้าน' + t, contexts: ['tab'] });
});

browser.menus.onShown.addListener(async (info, tab) => {
  const inSplit = !!(tab && tab.url && tab.url.startsWith(SPLIT));
  if (info.contexts.includes('tab')) await browser.menus.update('st', { visible: isWeb(tab && tab.url) });
  else await browser.menus.update('ss', { visible: inSplit });
  browser.menus.refresh();
});

// คลิกในเฟรมซ้อนชั้นใน (เช่นโฆษณาในเว็บ) → ไล่ขึ้นไปหาเฟรมที่เป็นช่องของเรา
async function paneFrame(tabId, frameId) {
  let f = frameId || 0;
  for (let i = 0; f > 0 && i < 20; i++) {
    const fr = await browser.webNavigation.getFrame({ tabId, frameId: f }).catch(() => null);
    if (!fr || fr.parentFrameId <= 0) break;
    f = fr.parentFrameId;
  }
  return f;
}

browser.menus.onClicked.addListener(async (info, tab) => {
  const id = String(info.menuItemId);
  if (id.startsWith('ss-')) {
    const frameId = await paneFrame(tab.id, info.frameId);
    browser.runtime.sendMessage({ type: 'ctx', tabId: tab.id, frameId, action: id.slice(3) }).catch(() => {});
    return;
  }
  if (!id.startsWith('st-') || !isWeb(tab.url)) return;
  const dir = id.slice(3);
  const splits = (await browser.tabs.query({ windowId: tab.windowId })).filter((t) => t.url.startsWith(SPLIT));
  const { moveTabs = false } = await browser.storage.local.get('moveTabs');
  let target = splits.sort((a, b) => (b.lastAccessed || 0) - (a.lastAccessed || 0))[0];
  if (!target) {
    // ยังไม่มีหน้าแบ่งจอ: สร้าง 2 ช่องตามทิศ แท็บนี้อยู่ฝั่งที่เลือก อีกฝั่งว่างให้เลือก
    const first = dir === 'left' || dir === 'top';
    const state = { tree: { d: dir === 'left' || dir === 'right' ? 'h' : 'v', k: 0.5, a: 0, b: 1 },
      u: { 0: first ? tab.url : '', 1: first ? '' : tab.url }, a: first ? 1 : 0, next: 2, sp: [] };
    target = await browser.tabs.create({ url: SPLIT + '#' + encodeURIComponent(JSON.stringify(state)), index: tab.index + 1, windowId: tab.windowId });
  } else {
    const ok = await browser.runtime.sendMessage({ type: 'addTab', tabId: target.id, url: tab.url, dir }).catch(() => false);
    if (!ok) return;   // เต็ม 8 ช่องแล้ว — หน้าแบ่งจอแจ้งเอง
    await browser.tabs.update(target.id, { active: true });
  }
  if (moveTabs) { await browser.tabs.remove(tab.id); return; }
  // เข้ากลุ่มเดียวกับหน้าแบ่งจอ (Firefox 139+)
  if (browser.tabs.group) {
    try {
      const t = await browser.tabs.get(target.id);
      if (t.groupId !== undefined && t.groupId !== -1) await browser.tabs.group({ groupId: t.groupId, tabIds: [tab.id] });
      else await browser.tabs.group({ tabIds: [target.id, tab.id] });
    } catch (e) { /* จัดกลุ่มไม่ได้ ไม่เป็นไร */ }
  }
});

// ── ซ่อนแถบที่อยู่ของ Firefox ตอนอยู่หน้าแบ่งจอ (ต้องมี userChrome.css ที่ให้ไปด้วย) ──
// ส่วนขยายแตะแถบของ Firefox ตรง ๆ ไม่ได้ → ติดเครื่องหมายมองไม่เห็นไว้ที่ชื่อหน้าต่าง (titlePreface)
// userChrome.css เห็นเครื่องหมายแล้วซ่อน #nav-bar · คลิกไปแท็บปกติ = ล้างเครื่องหมาย แถบกลับมา
const MARK = '⁣';   // INVISIBLE SEPARATOR
async function syncChrome(windowId) {
  try {
    const [t] = await browser.tabs.query({ active: true, windowId });
    const on = !!(t && t.url && t.url.startsWith(SPLIT));
    await browser.windows.update(windowId, { titlePreface: on ? MARK : '' });
  } catch (e) { /* หน้าต่างปิดไปแล้ว */ }
}
browser.tabs.onActivated.addListener((info) => syncChrome(info.windowId));
browser.tabs.onUpdated.addListener((tabId, change, tab) => { if (tab.active && change.url) syncChrome(tab.windowId); });
browser.windows.getAll().then((ws) => ws.forEach((w) => syncChrome(w.id)));
