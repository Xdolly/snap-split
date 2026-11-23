// รูปแบบแบ่งหน้า (เลียนแบบ Win+Z ของ Windows 11)
// cells = ตารางช่อง แต่ละเลขคือช่องที่ (เลขเดียวกันหลายเซลล์ = ช่องใหญ่ที่คร่อม)
// cols/rows = ใช้วาดรูปย่อ · tree = ผังจริงในหน้าแบ่งจอ (ใบ = เลขช่อง, กิ่ง = แบ่ง h ซ้าย-ขวา / v บน-ล่าง ที่สัดส่วน k)
const LAYOUTS = [
  { id: 'h2',   name: 'layout_h2',        cols: [1, 1],    rows: [1],    cells: [[0, 1]],
    tree: { d: 'h', k: 0.5, a: 0, b: 1 } },
  { id: 'h2w',  name: 'layout_h2w',        cols: [2, 1],    rows: [1],    cells: [[0, 1]],
    tree: { d: 'h', k: 0.6667, a: 0, b: 1 } },
  { id: 'h3',   name: 'layout_h3',            cols: [1, 1, 1], rows: [1],    cells: [[0, 1, 2]],
    tree: { d: 'h', k: 0.3333, a: 0, b: { d: 'h', k: 0.5, a: 1, b: 2 } } },
  { id: 'h3c',  name: 'layout_h3c',         cols: [1, 2, 1], rows: [1],    cells: [[0, 1, 2]],
    tree: { d: 'h', k: 0.25, a: 0, b: { d: 'h', k: 0.6667, a: 1, b: 2 } } },
  { id: 'l1r2', name: 'layout_l1r2',      cols: [1, 1],    rows: [1, 1], cells: [[0, 1], [0, 2]],
    tree: { d: 'h', k: 0.5, a: 0, b: { d: 'v', k: 0.5, a: 1, b: 2 } } },
  { id: 'q4',   name: 'layout_q4',             cols: [1, 1],    rows: [1, 1], cells: [[0, 1], [2, 3]],
    tree: { d: 'v', k: 0.5, a: { d: 'h', k: 0.5, a: 0, b: 1 }, b: { d: 'h', k: 0.5, a: 2, b: 3 } } },
];

// name = รหัสข้อความใน _locales (แสดงผลผ่าน T(l.name))
const layoutById = (id) => LAYOUTS.find((l) => l.id === id) || LAYOUTS[0];
const zoneCount = (l) => Math.max(...l.cells.flat()) + 1;

/** พื้นที่ grid แบบไม่มีร่องลาก — ใช้วาดรูปย่อ */
function simpleAreas(l) {
  return l.cells.map((r) => '"' + r.map((z) => 'z' + z).join(' ') + '"').join(' ');
}

const SPLIT_PAGE = 'split.html';
const isWebUrl = (u) => /^https?:\/\//i.test(u || '');
