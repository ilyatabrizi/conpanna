import { esc, icon, money, fmtDay, fmtTime, L, loc, num, digits } from "../ui.js";
import { get, branch } from "../store.js";
import { STEPS, stageOf, stepTitle } from "../orders.js";

export default function orders(el) {
  const list = get().orders;
  el.innerHTML = `
  <div class="wrap narrow page-top">
    <div class="page-head"><div><h1 class="lt">${L("Orders", "سفارش‌ها")}</h1><p class="small">${L("Everything you've ordered from this phone.", "همه‌ی سفارش‌هایی که از این گوشی ثبت کرده‌اید.")}</p></div></div>
    ${list.length ? `<div class="group">${list.map((o) => { const i = stageOf(o), s = STEPS[o.mode]; const live = i < s.length - 1; return `
      <a class="row order-row" href="#/order/${o.id}">
        <span class="row-ic">${icon(o.mode === "delivery" ? "scooter" : "takeaway")}</span>
        <span class="row-main"><span class="row-t">#${digits(o.code)} · ${esc(loc(branch(o.branch)))}</span><span class="row-s">${fmtDay(new Date(o.at))} ${fmtTime(new Date(o.at))} · ${L(`${o.count} items`, `${num(o.count)} قلم`)} · ${live ? `<b class="live-txt">${esc(stepTitle(s[i]))}</b>` : esc(stepTitle(s[i]))}</span></span>
        <span class="row-v">${money(o.total)}${icon("chev", "chev")}</span>
      </a>`; }).join("")}</div>`
    : `<div class="empty">${icon("receipt")}<h3>${L("No orders yet", "هنوز سفارشی ندارید")}</h3><p class="small">${L("Your first one earns a stamp for every drink.", "اولین سفارش، برای هر نوشیدنی یک مهر می‌گیرد.")}</p><a class="btn" href="#/menu" style="margin-top:18px">${L("Open the menu", "دیدن منو")}</a></div>`}
  </div>`;
}
orders.meta = { title: ["Orders", "سفارش‌ها"], back: true, parent: "#/profile" };
