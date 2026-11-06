// Pieces more than one screen uses: the item sheet, the branch picker, the
// payment stand-in, the footer, small celebrations.
import { $, $$, esc, icon, money, sheet, closeSheet, toast, haptic, art, tile, burst, openState, busy, busyLabel, replay, L, loc, num, digits } from "../ui.js";
import { get, set, item, optionsFor, defaultSel, unitPrice, addToBag, replaceLine, toggleFav, branch } from "../store.js";
import { isSoldOut, isPaused } from "../hub.js";
import { BRANCHES, BRAND } from "../data.js";
import { LOCKUP } from "../brand.js";

const STEAM = `<svg class="steam" viewBox="0 0 80 70" aria-hidden="true"><path d="M24 64c-8-10 8-16 0-28s6-18 0-30"/><path d="M40 64c-8-10 8-16 0-28s6-18 0-30"/><path d="M56 64c-8-10 8-16 0-28s6-18 0-30"/></svg>`;

/* -------------------------------------------------------------- item sheet */
export function itemSheet(id, { line } = {}) {
  const it = item(id);
  if (!it) return;
  const groups = optionsFor(it);
  let sel = line ? JSON.parse(JSON.stringify(line.sel)) : defaultSel(it);
  let qty = line ? line.qty : 1;
  const hot = ["cup", "pot"].includes(it.art.k) && it.id !== "affogato";
  const fav = get().favorites.includes(id);
  const out = isSoldOut(id);
  const pair = it.pair && item(it.pair);
  sheet(`
    <div class="sheet-hero" style="--tile:${it.art.bg}">${hot ? STEAM : ""}${art(it)}${out ? `<span class="soldout-flag">${L("Sold out today", "امروز تمام شد")}</span>` : ""}</div>
    <div class="item-head">
      <div><h2>${esc(loc(it))}</h2></div>
      <button class="icon-btn ${fav ? "on" : ""}" id="fav" type="button" aria-pressed="${fav}" aria-label="${L("Favourite", "علاقه‌مندی")}">${icon(fav ? "heartF" : "heart")}</button>
    </div>
    <p class="body lead">${esc(loc(it, "desc"))}</p>
    ${groups.map((g) => `<fieldset class="opt-group"><legend>${esc(loc(g))}${g.one ? "" : ` <span class="tiny opt-optional">– ${L("optional", "اختیاری")}</span>`}</legend><div class="opts">
      ${g.choices.map((ch, i) => `<label class="opt"><input type="${g.one ? "radio" : "checkbox"}" name="${g.id}" value="${i}" ${g.one ? (sel[g.id] === i ? "checked" : "") : ((sel[g.id] || []).includes(i) ? "checked" : "")}><span>${esc(L(ch[0], ch[1]))}${ch[2] ? `<small>+${num(ch[2] / 1000)}${L("k", " هزار")}</small>` : ""}</span></label>`).join("")}
    </div></fieldset>`).join("")}
    ${pair && !out ? `<div class="pair"><span class="tile sm" style="--tile:${pair.art.bg}">${art(pair)}</span><span class="row-main"><span class="eyebrow">${L("Goes well with", "کنارش بچسبد")}</span><span class="row-t">${esc(loc(pair))}</span><span class="row-s">${money(unitPrice(pair, defaultSel(pair)))}</span></span><button class="pair-add" type="button" id="pair" aria-pressed="false">${icon("plus")}<span>${L("Add", "افزودن")}</span></button></div>` : ""}
    <div class="sheet-cta">
      <div class="stepper" role="group" aria-label="${L("Quantity", "تعداد")}"><button type="button" data-d="-1" aria-label="−">${icon("minus")}</button><output id="q">${num(qty)}</output><button type="button" data-d="1" aria-label="+">${icon("plus")}</button></div>
      <button class="btn" id="add" type="button" ${out ? "disabled" : ""}></button>
    </div>`, {
    label: loc(it),
    onMount(b) {
      const addBtn = $("#add", b);
      let withPair = false;
      const paint = () => {
        if (out) { addBtn.innerHTML = L("Sold out today", "امروز تمام شد"); return; }
        const total = unitPrice(it, sel) * qty + (withPair ? unitPrice(pair, defaultSel(pair)) : 0);
        addBtn.innerHTML = `${line ? L("Update", "به‌روزرسانی") : L("Add", "افزودن")} – ${money(total)}`;
        $("#q", b).textContent = num(qty);
      };
      paint();
      $$(".opt input", b).forEach((inp) => inp.addEventListener("change", () => {
        const g = groups.find((x) => x.id === inp.name);
        if (g.one) sel[g.id] = +inp.value; else sel[g.id] = $$(`input[name="${g.id}"]:checked`, b).map((x) => +x.value);
        haptic(4); paint();
      }));
      $$(".stepper button", b).forEach((x) => x.addEventListener("click", () => { qty = Math.max(1, Math.min(20, qty + +x.dataset.d)); haptic(4); paint(); }));
      $("#pair", b)?.addEventListener("click", (e) => { withPair = !withPair; e.currentTarget.setAttribute("aria-pressed", withPair); e.currentTarget.innerHTML = `${icon(withPair ? "check" : "plus")}<span>${withPair ? L("Added", "اضافه شد") : L("Add", "افزودن")}</span>`; haptic(6); paint(); });
      $("#fav", b).addEventListener("click", (e) => {
        const on = toggleFav(id);
        e.currentTarget.innerHTML = icon(on ? "heartF" : "heart");
        e.currentTarget.classList.toggle("on", on);
        e.currentTarget.setAttribute("aria-pressed", on);
        replay(e.currentTarget, "gulp");
        if (on) toast(L("Saved to favourites", "به علاقه‌مندی‌ها اضافه شد"), "heart");
      });
      addBtn.addEventListener("click", () => {
        if (out) return;
        if (line) replaceLine(line.key, id, sel, qty); else addToBag(id, sel, qty);
        if (withPair) addToBag(pair.id);
        haptic(12);
        const r = $("#bag-btn").getBoundingClientRect();
        burst(r.left + r.width / 2, r.top + r.height / 2);
        closeSheet();
        toast(line ? L("Bag updated", "سبد به‌روز شد") : L(`${qty > 1 ? qty + " × " : ""}${it.name} added`, `${qty > 1 ? num(qty) + " × " : ""}${it.name_fa} اضافه شد`), "bag");
      });
    },
  });
}

export function quickAdd(btn, id) {
  if (isSoldOut(id)) { toast(L("Sold out today", "امروز تمام شد"), "info"); return; }
  addToBag(id);
  haptic(10);
  btn.classList.remove("done"); void btn.offsetWidth; btn.classList.add("done");
  const r = $("#bag-btn").getBoundingClientRect();
  burst(r.left + r.width / 2, r.top + r.height / 2);
  toast(L(`${item(id).name} added`, `${item(id).name_fa} اضافه شد`), "bag");
}

/* ------------------------------------------------------------ branch sheet */
export function branchSheet({ onPick, title, pick = true } = {}) {
  const cur = get().branch;
  const ttl = title || L("Choose a branch", "انتخاب شعبه");
  sheet(`<h2>${esc(ttl)}</h2><p class="small lead">${L("Four Conpannas — three in Tabriz, one in Esfahan.", "چهار کن‌پانا؛ سه‌تا در تبریز، یکی در اصفهان.")}</p>
    <div class="group" style="margin-top:16px">${BRANCHES.map((b) => {
      const o = openState(b), v = busy(b), paused = isPaused(b.id);
      return `<div class="row branch-row" ${pick ? `aria-checked="${b.id === cur}"` : ""}>
        <span class="row-ic">${icon("pin")}</span>
        <button class="row-main" type="button" data-b="${b.id}">
          <span class="row-t">${esc(loc(b))} <span class="tiny">– ${esc(loc(b, "city"))}</span></span>
          <span class="row-s flexline"><span class="dot ${o.isOpen && !paused ? "" : "off"}"></span>${paused ? L("Online orders paused", "سفارش آنلاین موقتاً متوقف") : o.label}${o.isOpen && !paused ? ` – ${busyLabel(v)}` : ""}</span>
        </button>
        ${pick ? `<span class="radio" aria-hidden="true"></span>` : ""}
        <a class="icon-btn" href="https://www.google.com/maps/search/?api=1&query=${encodeURIComponent(b.query)}" target="_blank" rel="noopener" aria-label="${L("Directions", "مسیریابی")}">${icon("map")}</a>
      </div>`;
    }).join("")}</div>
    <p class="group-foot">${L("Hours shown are a preview placeholder until Conpanna confirms them.", "ساعت‌ها تا تأیید کن‌پانا نمونه هستند.")}</p>`,
  { label: ttl, onMount(b) {
    $$("[data-b]", b).forEach((x) => x.addEventListener("click", () => {
      if (pick) set({ branch: x.dataset.b });
      haptic(6); closeSheet(); onPick?.(x.dataset.b);
      if (pick) toast(L(`${branch(x.dataset.b).name} selected`, `شعبه‌ی ${branch(x.dataset.b).name_fa} انتخاب شد`), "pin");
    }));
  } });
}

/* ------------------------------------------------------- payment (preview) */
export function payGateway(amount, what) {
  return new Promise((resolve) => {
    let paid = false;
    sheet(`<div class="gateway">
      <p class="eyebrow">${L("Secure payment – preview", "پرداخت امن – نمونه")}</p>
      <h2 style="margin-top:8px">${money(amount)}</h2>
      <p class="small lead">${esc(what)}</p>
      <div class="card-art" dir="ltr"><div class="ca-top"><b>CONPANNA PAY</b>${icon("shield")}</div><div class="chip-i"></div><div class="pan">6037 •••• •••• 4821</div><div class="holder"><span>${L("Your bank card", "کارت بانکی شما")}</span><span>08/07</span></div></div>
      <button class="btn btn--block" id="pay" type="button">${icon("shield")}${L("Pay", "پرداخت")} ${money(amount)}</button>
      <p class="tiny" style="margin-top:12px">${L("In the live app this opens your bank's Shaparak page. Nothing is charged in the preview.", "در نسخه‌ی اصلی، درگاه شاپرک بانک شما باز می‌شود. در این نمونه مبلغی کسر نمی‌شود.")}</p>
    </div>`, { label: L("Payment", "پرداخت"), onMount(b) {
      $("#pay", b).addEventListener("click", (e) => {
        const btn = e.currentTarget;
        btn.classList.add("busy"); btn.innerHTML = L("Confirming…", "در حال تأیید…");
        setTimeout(() => { paid = true; haptic(20); closeSheet(); resolve(true); }, 1300);
      });
    }, onClose: () => { if (!paid) setTimeout(() => resolve(false), 0); } });
  });
}

/* ------------------------------------------------------------- celebrate */
export function celebrate({ icon: ic = "gift", title, body, cta, href }) {
  sheet(`<div class="celebrate"><div class="cel-badge">${icon(ic)}</div><h2>${title}</h2><p class="body lead">${body}</p>${cta ? `<a class="btn btn--block" href="${href}" id="cel-go" style="margin-top:20px">${cta}</a>` : ""}</div>`,
    { label: title, onMount(b) { const r = $(".cel-badge", b).getBoundingClientRect(); setTimeout(() => burst(r.left + r.width / 2, r.top + r.height / 2), 350); $("#cel-go", b)?.addEventListener("click", () => closeSheet()); } });
}

/* ------------------------------------------------------------------ footer */
export const footer = () => `
  <footer class="foot">
    <div style="--lg-cup:var(--caramel)">${LOCKUP}</div>
    <p class="it"><span class="tr" lang="tr" dir="ltr">${BRAND.tagline}</span> — ${L("this taste is yours.", "این طعم، مال توست.")}</p>
    <div class="foot-links"><a href="#/menu">${L("Menu", "منو")}</a><a href="#/events">${L("Events", "رویدادها")}</a><a href="#/rewards">${L("Rewards", "جوایز")}</a><a href="admin.html">${L("Owner panel", "پنل مدیریت")}</a><a href="https://instagram.com/${BRAND.instagram}" target="_blank" rel="noopener">${L("Instagram", "اینستاگرام")}</a></div>
    <a class="alpha-sig" href="https://alphaa.agency" target="_blank" rel="noopener" aria-label="Powered by Alpha Agency" dir="ltr" lang="en">
      <span>Powered by Alpha Agency</span>
      <img class="sig-light" src="assets/brand/alpha-black.png" alt="Alpha Agency" width="56" height="43" loading="lazy">
      <img class="sig-dark" src="assets/brand/alpha-white.png" alt="Alpha Agency" width="56" height="43" loading="lazy">
    </a>
    <p class="tiny">© ${digits(String(new Date().getFullYear()))} ${L("Coffee Conpanna – Tabriz – Esfahan", "کافه کن‌پانا – تبریز – اصفهان")}</p>
  </footer>`;

export { tile };
