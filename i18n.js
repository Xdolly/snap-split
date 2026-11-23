// ข้อความหน้าจอจาก _locales (ค่าเริ่มต้น en · Firefox ภาษาไทย = th)
// T('key', a, b) แทน $1 $2 · HTML ใส่ data-i18n / data-i18n-title / data-i18n-ph / data-i18n-aria
const T = (key, ...subs) => {
  try { return browser.i18n.getMessage(key, subs.map(String)) || key; } catch (e) { return key; }
};
function applyI18n(root = document) {
  root.querySelectorAll('[data-i18n]').forEach((el) => { el.textContent = T(el.dataset.i18n); });
  root.querySelectorAll('[data-i18n-title]').forEach((el) => { el.title = T(el.dataset.i18nTitle); });
  root.querySelectorAll('[data-i18n-ph]').forEach((el) => { el.placeholder = T(el.dataset.i18nPh); });
  root.querySelectorAll('[data-i18n-aria]').forEach((el) => { el.setAttribute('aria-label', T(el.dataset.i18nAria)); });
  document.documentElement.lang = (browser.i18n.getUILanguage && browser.i18n.getUILanguage()) || 'en';
}
