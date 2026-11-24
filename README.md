# Snap Split

Split Firefox into several panes inside **one tab**. You pick a layout the same way as Windows 11 Snap (Win+Z).

[ภาษาไทยด้านล่าง ↓](#ภาษาไทย)

## Features

- **6 ready-made layouts:** two columns, wide + narrow, three columns, wide centre, large left + two stacked, and 2×2. Open them from the toolbar button or with **Alt+Shift+Z**.
- **Free splitting, up to 8 panes:** right-click inside a pane → *Snap Split* → split left, right, top or bottom. Drag the gutters to resize.
- **Send a tab in:** right-click a normal tab → *Send to Snap Split* → choose a side. The tab joins the same Tab Group as the split page (Firefox 139+).
- **One address bar:** the bar at the top always belongs to the active pane. It has Back, Forward and Reload for that pane, and keeps up with single-page web apps.
- **Bookmarks Toolbar menu:** the ⭐ button lists your Bookmarks Toolbar, including folders. Picking a bookmark opens it in the active pane.
- **Swap panes:** drag the grip at the top of one pane onto another pane.
- **Local files:** use *Open local file…* or drag a file into a pane.
- **Restricted sites:** Firefox does not let extensions show addons.mozilla.org or accounts.firefox.com. For those sites the pane explains why and offers to open the site as a normal tab.
- **Languages:** English (default) and Thai.

## How framing works

Most sites refuse to load inside another page. They send `X-Frame-Options` or CSP `frame-ancestors` to block it.

Snap Split removes those two headers **only** for frames that sit directly inside its own split page. Nothing else is touched:
- normal browsing;
- nested frames inside a site;
- all other CSP rules of the site.

## Install

- **Try it:** open `about:debugging` → *This Firefox* → *Load Temporary Add-on…* → choose `manifest.json`. This copy is removed when Firefox closes.
- **Permanent install:** Firefox only installs extensions signed by Mozilla. To sign your own copy, zip the files and upload them as an *unlisted* add-on on addons.mozilla.org. Change the `gecko.id` in `manifest.json` to your own ID first.

### Optional: hide Firefox's own address bar on split tabs

`userChrome/userChrome.css` hides Firefox's navigation bar while a Snap Split tab is active. Snap Split's own bar then takes its place. Setup steps are in the comments at the top of that file.

## Permissions

| Permission | Why |
|---|---|
| `webRequest`, `webRequestBlocking`, `<all_urls>` | Remove frame-blocking headers for panes inside the split page only |
| `tabs`, `tabGroups`, `webNavigation` | Send tabs into a split, group them, and keep the address bar in sync |
| `menus` | Right-click menus for splitting |
| `bookmarks` | Read the Bookmarks Toolbar for the ⭐ menu (read only) |
| `storage`, `theme` | Remember settings and match the Firefox theme colours |

Snap Split collects no data and sends nothing anywhere.

## Known limits

- Firefox's own address bar cannot be changed by an extension. That is why Snap Split shows its own bar.
- Some sites, such as Gmail, still refuse to work inside a frame.
- `file:///` addresses cannot be typed into the bar. Use the button or drag the file in instead.
- Toolbar buttons of other add-ons cannot be placed inside the split page. Firefox does not allow one extension to trigger another.

## License

[MPL-2.0](LICENSE). The toolbar icon paths in `icons/` (and inlined in `split.html`) come from Firefox and are also MPL-2.0.

---

## ภาษาไทย

แบ่งหน้า Firefox เป็นหลายช่องใน **แท็บเดียว** เลือกรูปแบบได้เหมือน Win+Z ของ Windows 11

- **รูปแบบสำเร็จรูป 6 แบบ:** เปิดจากปุ่มบนแถบเครื่องมือ หรือกด **Alt+Shift+Z**
- **แบ่งเองได้สูงสุด 8 ช่อง:** คลิกขวาในช่อง → *Snap Split* → แบ่งซ้าย/ขวา/บน/ล่าง แล้วลากเส้นแบ่งเพื่อปรับขนาด
- **ส่งแท็บเข้ามา:** คลิกขวาที่แท็บ → *Send to Snap Split* → เลือกฝั่ง
- **แถบที่อยู่แถบเดียว:** เป็นของช่องที่ใช้งานอยู่เสมอ มีปุ่มย้อน/ไปต่อ/โหลดใหม่ของช่องนั้น
- **ปุ่ม ⭐:** โชว์แถบบุ๊กมาร์กของ Firefox รวมโฟลเดอร์ เลือกแล้วเปิดในช่องที่ใช้งานอยู่
- **สลับช่อง:** ลากที่จับด้านบนของช่องไปวางบนอีกช่อง
- **ไฟล์ในเครื่อง:** เปิดด้วยปุ่ม *Open local file…* หรือลากไฟล์มาวาง
- **เว็บที่ Firefox ห้ามส่วนขยายแตะ** (addons.mozilla.org, accounts.firefox.com): ช่องจะบอกเหตุผลและมีปุ่มเปิดเป็นแท็บ

**ติดตั้ง**
- **ลองใช้:** `about:debugging` → *This Firefox* → *Load Temporary Add-on…* → เลือก `manifest.json` (หายเมื่อปิด Firefox)
- **ติดตั้งถาวร:** ต้องให้ Mozilla เซ็นก่อน โดยอัปโหลดแบบ *unlisted* บน addons.mozilla.org และเปลี่ยน `gecko.id` เป็นของตัวเอง
- **ซ่อนแถบที่อยู่ของ Firefox ตอนอยู่แท็บแบ่งจอ:** ใช้ `userChrome/userChrome.css` วิธีติดตั้งเขียนไว้ในไฟล์

Snap Split ไม่เก็บข้อมูลและไม่ส่งข้อมูลไปที่ไหน · สัญญาอนุญาต [MPL-2.0](LICENSE)
