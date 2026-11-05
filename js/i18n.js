// Two languages, one switch. Strings live next to the code that uses them:
// L("English", "فارسی"). Data carries its own pairs (name / name_fa).
// Persian: right-to-left, IRANYekanX, Persian digits, Toman, Jalali dates.
const KEY = "conpanna.lang";
let lang = "fa";
try {
  const saved = localStorage.getItem(KEY);
  lang = saved || ((navigator.language || "").toLowerCase().startsWith("fa") ? "fa" : "en");
} catch (e) {}

export const getLang = () => lang;
export const isFa = () => lang === "fa";
export const hasChosen = () => { try { return !!localStorage.getItem(KEY); } catch (e) { return true; } };
export const L = (en, fa) => (lang === "fa" && fa != null ? fa : en);
export const loc = (o, k = "name") => (o ? (lang === "fa" && o[k + "_fa"] != null ? o[k + "_fa"] : o[k]) : "");

export function applyLang(next = lang) {
  lang = next;
  try { localStorage.setItem(KEY, lang); } catch (e) {}
  const d = document.documentElement;
  d.lang = lang;
  d.dir = lang === "fa" ? "rtl" : "ltr";
}

/* ---------------------------------------------------------------- numbers */
const nfEn = new Intl.NumberFormat("en-US");
const nfFa = new Intl.NumberFormat("fa-IR");
export const num = (n) => (lang === "fa" ? nfFa : nfEn).format(Math.round(n));
export const digits = (s) => (lang === "fa" ? String(s).replace(/\d/g, (d) => "۰۱۲۳۴۵۶۷۸۹"[d]) : String(s));
export const pct = (n) => (lang === "fa" ? `٪${num(n)}` : `${num(n)}%`);
export const money = (n) => (n === 0 ? `<span class="money">${L("Free", "رایگان")}</span>` : `<span class="money">${num(n)}<small class="cur">${L("T", "تومان")}</small></span>`);
export const moneyText = (n) => `${num(n)} ${L("Toman", "تومان")}`;
export const kmoney = (n) => {
  if (n >= 1e9) return `${digits((n / 1e9).toFixed(1))}${L("B", " میلیارد")}`;
  if (n >= 1e6) return `${digits((n / 1e6).toFixed(n >= 1e8 ? 0 : 1))}${L("M", " میلیون")}`;
  return num(n);
};

/* ------------------------------------------------------------------ dates */
const loc_ = () => (lang === "fa" ? "fa-IR-u-ca-persian" : "en-GB");
const df = (o) => new Intl.DateTimeFormat(loc_(), o);
export const fmtDay = (d) => df({ weekday: "short", day: "numeric", month: "short" }).format(d);
export const fmtLong = (d) => df({ weekday: "long", day: "numeric", month: "long" }).format(d);
export const fmtMonthShort = (d) => df({ month: "short" }).format(d);
export const fmtDayNum = (d) => df({ day: "numeric" }).format(d);
export const fmtWeekday = (d) => df({ weekday: "short" }).format(d);
export const fmtTime = (d) => digits(new Intl.DateTimeFormat("en-GB", { hour: "2-digit", minute: "2-digit", hour12: false }).format(d));
export const hhmm = (s) => digits(s);
export function fmtOther(d) { // the other calendar, as a quiet second line
  try { return lang === "fa" ? new Intl.DateTimeFormat("en-GB", { day: "numeric", month: "short" }).format(d) : new Intl.DateTimeFormat("fa-IR-u-ca-persian", { day: "numeric", month: "long" }).format(d); } catch (e) { return ""; }
}
export function relDay(d) {
  const a = new Date(); a.setHours(0, 0, 0, 0);
  const b = new Date(d); b.setHours(0, 0, 0, 0);
  const n = Math.round((b - a) / 864e5);
  if (n === 0) return L("Today", "امروز");
  if (n === 1) return L("Tomorrow", "فردا");
  if (n > 1 && n < 7) return df({ weekday: "long" }).format(d);
  return fmtDay(d);
}
export function ago(t) {
  const s = Math.round((Date.now() - t) / 1000);
  if (s < 60) return L("just now", "همین الان");
  if (s < 3600) return L(`${Math.floor(s / 60)} min ago`, `${num(Math.floor(s / 60))} دقیقه پیش`);
  if (s < 86400) return L(`${Math.floor(s / 3600)} h ago`, `${num(Math.floor(s / 3600))} ساعت پیش`);
  const dd = Math.floor(s / 86400);
  if (dd < 7) return L(`${dd} d ago`, `${num(dd)} روز پیش`);
  return fmtDay(new Date(t));
}
export function greeting() {
  const h = new Date().getHours();
  return h < 5 ? L("Good night", "شب بخیر") : h < 12 ? L("Good morning", "صبح بخیر") : h < 17 ? L("Good afternoon", "ظهر بخیر") : L("Good evening", "عصر بخیر");
}
export const plural = (n, one, many, fa) => L(`${num(n)} ${n === 1 ? one : many}`, `${num(n)} ${fa}`);
