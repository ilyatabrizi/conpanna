import { $, $$, esc, icon, money, tile, seg, segmented, haptic, openState, L, loc, num } from "../ui.js";
import { get, set, branch, unitPrice } from "../store.js";
import { MENU, CATEGORIES } from "../data.js";
import { isSoldOut, isPaused, onHub } from "../hub.js";
import { itemSheet, quickAdd, branchSheet, footer } from "./shared.js";

const row = (m) => {
  const out = isSoldOut(m.id);
  return `<div class="mi ${out ? "out" : ""}" role="button" tabindex="0" data-item="${m.id}">
    ${tile(m)}
    <div class="mi-main">
      <div class="mi-t">${esc(loc(m))}${out ? `<span class="tag out">${L("Sold out", "تموم شد")}</span>` : m.isNew ? `<span class="tag new">${L("New", "جدید")}</span>` : m.sig ? `<span class="tag">${L("Signature", "امضای ما")}</span>` : ""}</div>
      <div class="mi-d">${esc(loc(m, "desc"))}</div>
      <div class="mi-p">${money(unitPrice(m, {}))}<button class="add" type="button" data-add="${m.id}" aria-label="${L("Add", "افزودن")} ${esc(loc(m))}" ${out ? "disabled" : ""}>${icon("plus")}</button></div>
    </div>
  </div>`;
};

export default function menu(el, r) {
  const s = get();
  const favs = MENU.filter((m) => s.favorites.includes(m.id));
  const popular = [...MENU].sort((a, b) => b.pop - a.pop).slice(0, 6);
  const cats = [{ id: "pop", name: "Popular", name_fa: "پرطرفدار" }, ...(favs.length ? [{ id: "fav", name: "Favourites", name_fa: "علاقه‌مندی‌ها" }] : []), ...CATEGORIES];
  const itemsOf = (c) => (c.id === "pop" ? popular : c.id === "fav" ? favs : MENU.filter((m) => m.cat === c.id));

  el.innerHTML = `
  <div class="wrap page-top">
    <div class="page-head"><div><h1 class="lt">${L("Menu", "منو")}</h1><p class="small">${L("Freshly made at each branch. Prices in Toman.", "تو هر شعبه تازه درست می‌شه. قیمت‌ها به تومانه.")}</p></div></div>
    <div class="mode-card">
      <button class="row np" id="m-branch" type="button"></button>
    </div>
    <div class="search" style="margin-top:14px"><span>${icon("search")}</span><input id="q" type="search" placeholder="${L("Search the menu", "تو منو بگرد")}" autocomplete="off" enterkeyhint="search" aria-label="${L("Search the menu", "تو منو بگرد")}"><button class="clear" type="button" id="qx" hidden aria-label="${L("Clear", "پاک کردن")}">${icon("close")}</button></div>
    <div class="chips-bar" id="chipsbar" style="margin-top:6px">
      <div class="chips" id="chips">${cats.map((c, i) => `<button class="chip" type="button" data-cat="${c.id}" aria-pressed="${i === 0}">${c.id === "fav" ? icon("heartF") : c.id === "pop" ? icon("flame") : ""}${esc(loc(c))}</button>`).join("")}</div>
    </div>
    <div id="list"></div>
    <div id="results" hidden></div>
    <p class="tiny menu-note">${L("Preview menu — names and prices are placeholders until Conpanna sends the real one.", "منو نمونه‌ست؛ اسم‌ها و قیمت‌ها تا وقتی منوی اصلی کن‌پانا برسه موقتی‌ان.")}</p>
    ${footer()}
  </div>`;

  const paintList = () => { $("#list", el).innerHTML = cats.map((c) => `<section class="cat" id="cat-${c.id}" data-cat="${c.id}"><h2>${esc(loc(c))}</h2><div class="items">${itemsOf(c).map(row).join("")}</div></section>`).join(""); };
  const paintBranch = () => {
    const nb = branch(get().branch), paused = isPaused(nb.id);
    $("#m-branch", el).innerHTML = `<span class="row-main"><span class="row-s">${L("Takeaway from", "بیرون‌بر از")}</span><span class="row-t" style="font-weight:600">${esc(loc(nb))}${L(", ", "، ")}${esc(loc(nb, "city"))} <span class="tiny">– ${paused ? L("orders paused", "سفارش بسته‌ست") : openState(nb).label}</span></span></span><span class="row-v">${L("Change", "تغییر")}${icon("chev", "chev")}</span>`;
  };
  paintList(); paintBranch();
  $("#m-branch", el).addEventListener("click", () => branchSheet({ onPick: paintBranch }));

  el.addEventListener("click", (e) => {
    const add = e.target.closest("[data-add]");
    if (add) { e.stopPropagation(); quickAdd(add, add.dataset.add); return; }
    const it = e.target.closest("[data-item]");
    if (it) itemSheet(it.dataset.item);
  });
  el.addEventListener("keydown", (e) => { const c = e.target.closest?.("[data-item]"); if (c && (e.key === "Enter" || e.key === " ")) { e.preventDefault(); itemSheet(c.dataset.item); } });

  const chips = $$(".chip", el);
  const light = (id) => {
    chips.forEach((c) => c.setAttribute("aria-pressed", c.dataset.cat === id ? "true" : "false"));
    const c = chips.find((x) => x.dataset.cat === id);
    if (c) c.scrollIntoView({ inline: "center", block: "nearest", behavior: "smooth" });
  };
  let jumping = 0;
  chips.forEach((c) => c.addEventListener("click", () => {
    haptic(5); light(c.dataset.cat);
    const sec = $(`#cat-${c.dataset.cat}`, el);
    jumping = Date.now();
    scrollTo({ top: sec.getBoundingClientRect().top + scrollY - ($(".chips-bar", el).offsetHeight + $("#bar").offsetHeight) + 6, behavior: "smooth" });
  }));
  const onScroll = () => {
    if (Date.now() - jumping < 800) return;
    const line = $("#bar").offsetHeight + $(".chips-bar", el).offsetHeight + 20;
    let cur = cats[0].id;
    $$(".cat", el).forEach((sec) => { if (sec.getBoundingClientRect().top <= line) cur = sec.dataset.cat; });
    const on = chips.find((c) => c.getAttribute("aria-pressed") === "true");
    if (!on || on.dataset.cat !== cur) light(cur);
  };
  addEventListener("scroll", onScroll, { passive: true });

  const q = $("#q", el), list = $("#list", el), res = $("#results", el);
  q.addEventListener("input", () => {
    const t = q.value.trim().toLowerCase();
    $("#qx", el).hidden = !t; list.hidden = !!t; res.hidden = !t;
    $("#chipsbar", el).style.display = t ? "none" : "";
    if (!t) return;
    const hits = MENU.filter((m) => [m.name, m.name_fa, m.desc, m.desc_fa].join(" ").toLowerCase().includes(t));
    res.innerHTML = hits.length ? `<section class="cat"><h2>${L(`${hits.length} results`, `${num(hits.length)} نتیجه`)}</h2><div class="items">${hits.map(row).join("")}</div></section>` : `<div class="empty">${icon("search")}<h3>${L(`Nothing called “${esc(q.value)}”`, `چیزی به اسم «${esc(q.value)}» نداریم`)}</h3><p class="small">${L("Try “latte”, “cake” or “iced”.", "«لاته»، «کیک» یا «آیس» رو امتحان کن.")}</p></div>`;
  });
  $("#qx", el).addEventListener("click", () => { q.value = ""; q.dispatchEvent(new Event("input")); q.focus(); });

  const offHub = onHub(() => { paintList(); paintBranch(); });
  if (r.q.cat) setTimeout(() => chips.find((c) => c.dataset.cat === r.q.cat)?.click(), 250);
  if (r.q.item) setTimeout(() => itemSheet(r.q.item), 300);
  return () => { removeEventListener("scroll", onScroll); offHub(); };
}
menu.meta = { title: ["Menu", "منو"] };
