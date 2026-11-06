// Small pieces the CEO panel is built from: KPI tiles, tables, pills and a
// handful of SVG charts. Everything is RTL-aware and uses Persian digits.
import { esc, num, digits, pct, kmoney } from "../ui.js";
import { getLang } from "../i18n.js";

export const DAY = 864e5;
const rtl = () => getLang() === "fa";
export const T = (n) => `${kmoney(n)}<small> تومان</small>`;
export const kk = (n) => (n >= 1e6 ? kmoney(n) : n >= 1e4 ? digits(Math.round(n / 1000)) + " هزار" : num(n));
export const sum = (a, f = (o) => o.total) => a.reduce((s, o) => s + f(o), 0);
export const avg = (a, f) => (a.length ? sum(a, f) / a.length : 0);
export const fa1 = (x) => digits((Math.round(x * 10) / 10).toLocaleString("en", { maximumFractionDigits: 1 })).replace(".", "٫");
export const mins = (sec) => `${fa1(sec / 60)} دقیقه`;
export function delta(a, b, { inverse = false } = {}) {
  if (!b) return "";
  const d = Math.round(((a - b) / b) * 100);
  const good = inverse ? d <= 0 : d >= 0;
  return `<span class="delta ${good ? "up" : "down"}">${d >= 0 ? "▲" : "▼"} ${pct(Math.abs(d))}</span>`;
}
export const kpi = (label, value, sub = "", d = "") => `<div class="kpi"><span>${label}</span><b>${value}</b>${d}${sub ? `<em>${sub}</em>` : ""}</div>`;
export const card = (title, body, { extra = "", cls = "" } = {}) => `<section class="card ${cls}"><div class="card-h"><h3>${title}</h3>${extra}</div>${body}</section>`;
export const pill = (t, k = "") => `<span class="pill ${k}">${t}</span>`;
export const empty = (t) => `<p class="small muted-empty">${t}</p>`;

// period chips: 7 / 30 / 90 days
export const PERIODS = [[7, "۷ روز"], [30, "۳۰ روز"], [60, "۶۰ روز"]];
export const periodBar = (cur, extra = "") => `<div class="period"><div class="chips-row">${PERIODS.map(([v, t]) => `<button class="chip" data-period="${v}" aria-pressed="${cur === v}">${t}</button>`).join("")}</div>${extra}</div>`;

export function table(head, rows, { cls = "", foot = null } = {}) {
  return `<div class="tbl-wrap"><table class="tbl ${cls}"><thead><tr>${head.map((h) => `<th>${h}</th>`).join("")}</tr></thead><tbody>${rows.map((r) => `<tr>${r.map((c) => `<td>${c ?? ""}</td>`).join("")}</tr>`).join("")}</tbody>${foot ? `<tfoot><tr>${foot.map((c) => `<td>${c ?? ""}</td>`).join("")}</tr></tfoot>` : ""}</table></div>`;
}
export function meter(p, k = "") { const v = Math.max(0, Math.min(1, p)); return `<span class="mtr ${k}"><i style="--p:${v.toFixed(3)}"></i></span>`; }

export function spark(vals, { w = 90, h = 26 } = {}) {
  if (!vals.length) return "";
  const mx = Math.max(...vals), mn = Math.min(...vals), r = mx - mn || 1;
  const pts = vals.map((v, i) => { const x = (i / Math.max(1, vals.length - 1)) * w; return `${(rtl() ? w - x : x).toFixed(1)},${(h - 3 - ((v - mn) / r) * (h - 6)).toFixed(1)}`; });
  return `<svg class="spark" viewBox="0 0 ${w} ${h}" width="${w}" height="${h}"><polyline points="${pts.join(" ")}"/></svg>`;
}

// lines: [{ vals, label, cls }] — the first gets an area under it
export function lines(series, labels, { h = 240, fmt = kmoney } = {}) {
  const w = 1000, pad = 30, all = series.flatMap((s) => s.vals), max = Math.max(...all, 1) * 1.12;
  const n = Math.max(...series.map((s) => s.vals.length));
  const x = (i) => { const v = pad + (i * (w - pad * 2)) / Math.max(1, n - 1); return rtl() ? w - v : v; }, y = (v) => h - 26 - (v / max) * (h - 46);
  const path = (vals) => vals.map((v, i) => (i ? "L" : "M") + x(i).toFixed(1) + " " + y(v).toFixed(1)).join("");
  const s0 = series[0];
  const every = Math.ceil(n / 12);
  return `<svg class="chart" viewBox="0 0 ${w} ${h}" role="img">
    <defs><linearGradient id="lg0" x1="0" x2="0" y1="0" y2="1"><stop offset="0" stop-color="var(--caramel)" stop-opacity=".4"/><stop offset="1" stop-color="var(--caramel)" stop-opacity="0"/></linearGradient></defs>
    ${[0.25, 0.5, 0.75, 1].map((f) => `<line x1="${pad}" x2="${w - pad}" y1="${y((max * f) / 1.12)}" y2="${y((max * f) / 1.12)}" class="grid"/>`).join("")}
    <path d="${path(s0.vals)}L${x(s0.vals.length - 1)} ${h - 26}L${x(0)} ${h - 26}Z" fill="url(#lg0)"/>
    ${series.slice(1).map((s) => `<path d="${path(s.vals)}" class="ln2 ${s.cls || ""}"/>`).join("")}
    <path d="${path(s0.vals)}" class="ln"/>
    ${s0.vals.map((v, i) => `<g class="pt"><circle cx="${x(i)}" cy="${y(v)}" r="${i === s0.vals.length - 1 ? 5 : n > 40 ? 0 : 3}"/><title>${labels[i]}: ${fmt(v)}${series[1] ? ` — قبلی: ${fmt(series[1].vals[i] ?? 0)}` : ""}</title></g>`).join("")}
    ${labels.map((l, i) => ((n - 1 - i) % every === 0 ? `<text x="${x(i)}" y="${h - 6}" text-anchor="middle">${l}</text>` : "")).join("")}
  </svg>${series.length > 1 ? `<div class="legend-row">${series.map((s, i) => `<span class="legend"><i class="${i ? "lg-b " + (s.cls || "") : "lg-t"}"></i>${s.label}</span>`).join("")}</div>` : ""}`;
}

// vertical bars, grouped: groups [{ l, v: [a, b, c] }], keys [{ l, c }]
export function gbars(groups, keys, { fmt = kmoney, h = 200 } = {}) {
  const max = Math.max(...groups.flatMap((g) => g.v), 1);
  return `<div class="gbars" style="--h:${h}px">${groups.map((g) => `<div class="gb"><div class="gb-bars">${g.v.map((v, i) => `<i style="--v:${(Math.max(0, v) / max).toFixed(3)};--c:${keys[i].c}" title="${esc(keys[i].l)}: ${fmt(v)}"></i>`).join("")}</div><small>${g.l}</small></div>`).join("")}</div>
    <div class="legend-row">${keys.map((k) => `<span class="legend"><i style="background:${k.c}"></i>${k.l}</span>`).join("")}</div>`;
}

// heat grid: rows × cols of numbers
export function heat(rowL, colL, m) {
  const mx = Math.max(...m.flat(), 1);
  return `<div class="heat" style="--cols:${colL.length}"><span></span>${colL.map((c) => `<small class="hx-c">${c}</small>`).join("")}
    ${rowL.map((r, i) => `<small class="hx-r">${r}</small>${m[i].map((v, j) => `<i style="--a:${(v / mx).toFixed(3)}" title="${r} – ${colL[j]}: ${num(v)}"></i>`).join("")}`).join("")}</div>`;
}

// scatter with median cross-hairs and four named corners; labels that would
// collide are nudged below their dot, or left to the tooltip
export function quad(pts, { xl, yl, names }) {
  const w = 1000, h = 600, p = 50;
  const xs = pts.map((q) => q.x), ys = pts.map((q) => q.y);
  const mx = Math.max(...xs) * 1.06, my = Math.max(...ys) * 1.08, nx = Math.min(...xs) * 0.9, ny = Math.min(...ys) * 0.9;
  const X = (v) => { const t = p + 20 + ((v - nx) / (mx - nx)) * (w - p * 2 - 40); return rtl() ? w - t : t; }, Y = (v) => h - p - 10 - ((v - ny) / (my - ny)) * (h - p * 2 - 20);
  const med = (a) => { const s = [...a].sort((u, v) => u - v); return s[Math.floor(s.length / 2)]; };
  const cx = X(med(xs)), cy = Y(med(ys));
  const far = rtl() ? 14 : w - 14, near = rtl() ? w - 14 : 14;
  const boxes = [];
  const hit = (b) => boxes.some((o) => b.x0 < o.x1 && b.x1 > o.x0 && b.y0 < o.y1 && b.y1 > o.y0);
  const sorted = [...pts].sort((a, b) => b.x * b.y - a.x * a.y);
  pts.forEach((q) => boxes.push({ x0: X(q.x) - 10, x1: X(q.x) + 10, y0: Y(q.y) - 10, y1: Y(q.y) + 10 }));
  const lab = new Map();
  sorted.forEach((q) => {
    const x = X(q.x), y = Y(q.y), half = String(q.l).length * 4.4 + 4;
    for (const dy of [-17, 30, -36, 48]) { const b = { x0: x - half, x1: x + half, y0: y + dy - 15, y1: y + dy + 4 }; if (b.x0 > 0 && b.x1 < w && !hit(b)) { boxes.push(b); lab.set(q, y + dy); return; } }
  });
  return `<svg class="chart quad" viewBox="0 0 ${w} ${h}" role="img">
    <line x1="${cx}" x2="${cx}" y1="${p - 10}" y2="${h - p + 6}" class="axis"/><line x1="${p - 30}" x2="${w - p + 30}" y1="${cy}" y2="${cy}" class="axis"/>
    <text x="${far}" y="26" text-anchor="end" class="qn">${names[0]}</text><text x="${near}" y="26" text-anchor="start" class="qn">${names[1]}</text>
    <text x="${far}" y="${h - 10}" text-anchor="end" class="qn">${names[2]}</text><text x="${near}" y="${h - 10}" text-anchor="start" class="qn">${names[3]}</text>
    ${pts.map((q) => `<g class="qp"><circle cx="${X(q.x).toFixed(1)}" cy="${Y(q.y).toFixed(1)}" r="9" style="fill:${q.c}"/>${lab.has(q) ? `<text x="${X(q.x).toFixed(1)}" y="${lab.get(q).toFixed(1)}" text-anchor="middle">${esc(q.l)}</text>` : ""}<title>${esc(q.l)}</title></g>`).join("")}
  </svg><div class="legend-row"><span class="tiny">${rtl() ? "←" : "→"} ${xl}</span><span class="tiny">↑ ${yl}</span><span class="tiny">اسم بعضی آیتم‌ها شلوغ می‌شد؛ نقطه رو نگه دار تا ببینی.</span></div>`;
}

export function ring(p, big, small = "", { c = "var(--caramel-ink)" } = {}) {
  const C = 2 * Math.PI * 44, v = Math.max(0, Math.min(1, p));
  return `<div class="ring"><svg viewBox="0 0 100 100"><circle cx="50" cy="50" r="44" class="r-bg"/><circle cx="50" cy="50" r="44" class="r-fg" style="stroke:${c};stroke-dasharray:${(v * C).toFixed(1)} ${C.toFixed(1)}"/></svg><div><b>${big}</b><small>${small}</small></div></div>`;
}

export function csv(name, rows) {
  const a = document.createElement("a");
  a.href = URL.createObjectURL(new Blob(["﻿" + rows.map((r) => r.map((c) => (/[",\n]/.test(String(c)) ? `"${String(c).replace(/"/g, '""')}"` : c)).join(",")).join("\n")], { type: "text/csv" }));
  a.download = `${name}.csv`; document.body.appendChild(a); a.click(); a.remove();
}

// Jalali calendar bits for "this month"
export function jalali(t = Date.now()) {
  const f = (o) => +new Intl.DateTimeFormat("en-u-ca-persian-nu-latn", o).format(t).replace(/\D/g, "");
  const m = f({ month: "numeric" }), d = f({ day: "numeric" }), y = f({ year: "numeric" });
  const len = m <= 6 ? 31 : m <= 11 ? 30 : ((y + 38) * 31) % 128 < 31 ? 30 : 29;
  const name = new Intl.DateTimeFormat("fa-IR-u-ca-persian", { month: "long" }).format(t);
  return { y, m, d, len, name };
}
