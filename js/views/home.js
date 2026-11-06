import { $, $$, esc, icon, money, tile, greeting, openState, busy, busyLabel, dayFromToday, relDay, haptic, toast, L, loc, num, digits, hhmm } from "../ui.js";
import { get, set, branch, item, subscribe, usual, addToBag, tierOf, nextTier, activeVouchers, unitPrice } from "../store.js";
import { BRAND, BRANCHES, MENU, EVENTS, CHALLENGE } from "../data.js";
import { stampsGoal, isSoldOut, isPaused, onHub } from "../hub.js";
import { LOCKUP } from "../brand.js";
import { itemSheet, quickAdd, branchSheet, footer } from "./shared.js";
import { active, STEPS, stageOf, stepTitle } from "../orders.js";
import { mountLatte } from "../hero.js";

const CUP_SVG = `<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><path d="M5 9h11v5.5A5.5 5.5 0 0 1 10.5 20A5.5 5.5 0 0 1 5 14.5z"/><path d="M16 11h1.5a2.5 2.5 0 0 1 0 5H16"/></svg>`;
const WAVES = `<svg viewBox="0 0 1200 22" preserveAspectRatio="none"><path fill="#C9A57C" d="M0 11 Q75 0 150 11 T300 11 T450 11 T600 11 T750 11 T900 11 T1050 11 T1200 11 V22 H0Z"/></svg><svg viewBox="0 0 1200 22" preserveAspectRatio="none"><path fill="#D8B990" d="M0 11 Q75 22 150 11 T300 11 T450 11 T600 11 T750 11 T900 11 T1050 11 T1200 11 V22 H0Z"/></svg>`;

export function clubCard(s, { link = true } = {}) {
  const goal = stampsGoal();
  const t = tierOf(s.points), nx = nextTier(s.points);
  const prog = nx ? Math.min(1, (s.points - t.min) / (nx.min - t.min)) : 1;
  return `<${link ? `a href="#/rewards"` : "div"} class="club" style="--fill:${8 + (s.stamps / goal) * 62}%;--tier:${t.color}">
    <div class="wave">${WAVES}</div>
    <div class="club-top">
      <div><p class="club-k">${L("Conpanna Club", "باشگاه کن‌پانا")} – <b>${esc(loc(t))}</b></p>
      <h3>${s.rewards ? L(`${s.rewards} free ${s.rewards === 1 ? "drink" : "drinks"} waiting`, `${num(s.rewards)} نوشیدنی رایگان منتظر شماست`) : L(`${goal - s.stamps} more to a free drink`, `${num(goal - s.stamps)} مهر تا نوشیدنی رایگان`)}</h3></div>
      <span class="club-pts"><b>${num(s.points)}</b><small>${L("points", "امتیاز")}</small></span>
    </div>
    <div class="cups" style="--n:${goal}">${Array.from({ length: goal }, (_, i) => `<i class="${i < s.stamps ? "on" : ""}">${i < s.stamps ? CUP_SVG : ""}</i>`).join("")}</div>
    <div class="tier-bar"><span style="--p:${prog}"></span></div>
    <div class="club-foot"><span>${nx ? L(`${num(nx.min - s.points)} points to ${nx.name}`, `${num(nx.min - s.points)} امتیاز تا ${nx.name_fa}`) : L("Top tier — thank you", "بالاترین سطح؛ ممنونیم")}</span>${link ? `<span class="club-go">${L("Rewards", "جوایز")}${icon("chev", "chev")}</span>` : ""}</div>
  </${link ? "a" : "div"}>`;
}

export default function home(el) {
  const s = get();
  const b = branch(s.branch);
  const o = openState(b);
  const sigs = MENU.filter((m) => m.sig);
  const next = EVENTS.map((e) => ({ ...e, date: dayFromToday(e.day, e.time) })).sort((a, z) => a.date - z.date)[0];
  const name = s.user?.name?.split(" ")[0];

  el.innerHTML = `
  <section class="hero">
    <div class="hero-bg" aria-hidden="true"><i></i><i></i><i></i></div>
    <div class="hero-grain"></div>
    <div class="hero-brand">${LOCKUP}</div>
    <div class="hero-stage">
      <div class="cup-wrap">
        <div class="saucer"></div>
        <div class="cup-handle"></div>
        <div class="cup"><canvas class="latte" aria-label="${L("A cup of coffee — drag to stir it", "یک فنجان قهوه؛ برای هم زدن بکشید")}" role="img"></canvas><span class="cup-gloss"></span></div>
        <span class="stir-hint" id="stir-hint">${icon("stir")}<span>${L("Stir it", "همش بزن")}</span></span>
      </div>
    </div>
    <div class="wrap hero-in">
      <div class="hero-copy">
        <p class="eyebrow">${greeting()}${name ? `, ${esc(name)}` : ""} – ${esc(loc(b, "city"))}</p>
        <h1><span class="tr" lang="tr" dir="ltr">Bu tat <em>senin.</em></span></h1>
        <p class="sub">${L("This taste is yours. Order ahead for delivery or takeaway, check in for stamps, and see what's on this week.", "این طعم، مال توست. برای ارسال یا بیرون‌بر از قبل سفارش بدهید، با ورود به کافه مهر بگیرید و برنامه‌های این هفته را ببینید.")}</p>
        <button class="hero-pill" id="h-branch" type="button"></button>
      </div>
      <div class="hero-cta">
        <button class="btn btn--cream" data-mode="delivery" type="button">${icon("scooter")}${L("Delivery", "ارسال")}</button>
        <button class="btn btn--glass" data-mode="takeaway" type="button">${icon("takeaway")}${L("Takeaway", "بیرون‌بر")}</button>
      </div>
    </div>
  </section>

  <div class="wrap stack home-body">
    <div id="live"></div>
    <div id="usual"></div>

    <nav class="quick rv" aria-label="${L("Shortcuts", "میانبرها")}" id="quick"></nav>

    <section class="rv">
      <div class="sec"><h2>${L("The Con Panna series", "مجموعه‌ی کن‌پانا")}</h2><a href="#/menu?cat=conpanna">${L("All", "همه")}${icon("chev", "chev")}</a></div>
      <div class="rail" id="sigs"></div>
    </section>

    <div class="home-cols">
      <section class="rv" id="club-sec"></section>
      <section class="rv">
        <div class="sec"><h2>${L("Next up", "رویداد بعدی")}</h2><a href="#/events">${L("All events", "همه‌ی رویدادها")}${icon("chev", "chev")}</a></div>
        <a class="event-feature" href="#/events?e=${next.id}" style="--h:${next.hue}">
          <span class="ev-bg"></span>
          <span class="ev-kind">${esc(loc(next, "kind"))}</span>
          <h3>${esc(loc(next, "title"))}</h3>
          <div class="ev-meta"><span>${icon("events")}${esc(relDay(next.date))} – ${hhmm(next.time)}</span><span>${icon("pin")}${esc(loc(branch(next.branch)))}</span><span>${icon("users")}${L(`${next.seats - next.taken} seats left`, `${num(next.seats - next.taken)} جای خالی`)}</span></div>
        </a>
      </section>
    </div>

    <a class="challenge rv" href="#/rewards" id="challenge"></a>

    <section class="rv">
      <div class="sec"><h2>${L("Our branches", "شعبه‌های ما")}</h2><button type="button" id="all-br">${L("Map", "نقشه")}${icon("chev", "chev")}</button></div>
      <div class="group">${BRANCHES.map((x) => { const st = openState(x), v = busy(x); return `
        <a class="row branch-row" href="https://www.google.com/maps/search/?api=1&query=${encodeURIComponent(x.query)}" target="_blank" rel="noopener">
          <span class="row-ic">${icon("pin")}</span>
          <span class="row-main"><span class="row-t">${esc(loc(x))} <span class="tiny">– ${esc(loc(x, "city"))}</span></span><span class="row-s flexline"><span class="dot ${st.isOpen ? "" : "off"}"></span>${st.label}${st.isOpen ? ` – ${busyLabel(v)}` : ""}</span></span>
          ${icon("chev", "chev")}
        </a>`; }).join("")}
      </div>
    </section>

    <a class="ig-card rv" href="https://instagram.com/${BRAND.instagram}" target="_blank" rel="noopener">
      <span class="ig-ring"><span>${LOCKUP.replace('class="logo"', 'class="logo" style="width:84%"')}</span></span>
      <span class="row-main"><span class="row-t lat" style="font-weight:600">@${BRAND.instagram}</span><span class="row-s">${L(`${BRAND.followers} followers – reels, new drinks, the autumn café-hop`, `${BRAND.followers_fa} دنبال‌کننده – ریلز، نوشیدنی‌های تازه، کافه‌گردی پاییزی`)}</span></span>
      ${icon("ig")}
    </a>
    ${footer()}
  </div>`;

  // hero
  const stopLatte = mountLatte($(".latte", el));
  el.addEventListener("stirred", () => { $("#stir-hint", el)?.classList.add("gone"); haptic(6); });
  const paintPill = () => {
    const nb = branch(get().branch), st = openState(nb), v = busy(nb), paused = isPaused(nb.id);
    $("#h-branch", el).innerHTML = `<span class="dot ${st.isOpen && !paused ? "pulse" : "off"}"></span>${esc(loc(nb))} – ${paused ? L("Orders paused", "سفارش متوقف") : st.isOpen ? busyLabel(v) : st.label}${icon("chevD")}`;
  };
  paintPill();
  $("#h-branch", el).addEventListener("click", () => branchSheet({ onPick: paintPill }));
  $("#all-br", el).addEventListener("click", () => branchSheet({ title: L("Find a Conpanna", "پیدا کردن کن‌پانا"), pick: false }));
  $$("[data-mode]", el).forEach((x) => x.addEventListener("click", () => { set({ mode: x.dataset.mode }); haptic(8); location.hash = "#/menu"; }));

  el.addEventListener("click", (e) => {
    const add = e.target.closest("[data-add]");
    if (add) { e.preventDefault(); e.stopPropagation(); quickAdd(add, add.dataset.add); return; }
    const card = e.target.closest("[data-item]");
    if (card) itemSheet(card.dataset.item);
  });
  el.addEventListener("keydown", (e) => { const c = e.target.closest?.("[data-item]"); if (c && (e.key === "Enter" || e.key === " ")) { e.preventDefault(); itemSheet(c.dataset.item); } });

  const paintRail = () => {
    $("#sigs", el).innerHTML = sigs.map((m) => { const out = isSoldOut(m.id); return `
      <div class="sig-card ${out ? "out" : ""}" role="button" tabindex="0" data-item="${m.id}">
        ${m.isNew ? `<span class="badge-new">${L("New", "جدید")}</span>` : ""}${out ? `<span class="badge-out">${L("Sold out", "تمام شد")}</span>` : ""}
        ${tile(m)}
        <h3>${esc(loc(m))}</h3>
        <div class="row2">${money(unitPrice(m, {}))}<button class="add" type="button" data-add="${m.id}" aria-label="${L("Add", "افزودن")} ${esc(loc(m))}" ${out ? "disabled" : ""}>${icon("plus")}</button></div>
      </div>`; }).join("");
  };
  const paint = () => {
    const st = get();
    // club + quick tiles
    $("#club-sec", el).innerHTML = `<div class="sec"><h2>${L("Your club card", "کارت باشگاه شما")}</h2></div>${clubCard(st)}`;
    const vc = activeVouchers().length;
    $("#quick", el).innerHTML = `
      <a href="#/checkin"><span class="q-ic">${icon("checkin")}</span><span><b>${L("Check in", "ورود به کافه")}</b><span>${L("+1 stamp", "+۱ مهر")}</span></span></a>
      <a href="#/rewards"><span class="q-ic">${icon("gift")}${vc ? `<i class="q-badge">${num(vc)}</i>` : ""}</span><span><b>${L("Rewards", "جوایز")}</b><span>${vc ? L(`${vc} vouchers`, `${num(vc)} کوپن`) : L("Points & perks", "امتیاز و مزایا")}</span></span></a>
      <a href="#/rewards?s=invite"><span class="q-ic">${icon("users")}</span><span><b>${L("Invite", "دعوت")}</b><span>${L("Both get a drink", "هر دو نوشیدنی")}</span></span></a>`;
    // challenge
    const tried = (st.tried || []).length;
    $("#challenge", el).innerHTML = `<span class="ch-ring" style="--p:${Math.min(1, tried / CHALLENGE.goal)}"><b>${num(Math.min(tried, CHALLENGE.goal))}/${num(CHALLENGE.goal)}</b></span><span class="row-main"><span class="eyebrow">${L("Challenge", "چالش")} – ${esc(loc(CHALLENGE, "title"))}</span><span class="row-t">${esc(loc(CHALLENGE, "sub"))}</span><span class="row-s">${st.challengeDone ? L("Done — a free cake is in your rewards", "انجام شد؛ یک کیک رایگان در جوایز شماست") : L("Reward: any cake, free", "جایزه: یک کیک رایگان")}</span></span>${icon("chev", "chev")}`;
    // live order
    const a = active()[0];
    $("#live", el).innerHTML = a ? (() => { const steps = STEPS[a.mode], i = stageOf(a); return `<a class="live-order" href="#/order/${a.id}">
        <span class="lo-code">#${digits(a.code)}</span>
        <span class="row-main"><span class="eyebrow">${a.mode === "delivery" ? L("Delivery", "ارسال") : L("Takeaway", "بیرون‌بر")} – ${esc(loc(branch(a.branch)))}</span><span class="t3">${esc(stepTitle(steps[i]))}</span><span class="lo-steps">${steps.map((_, k) => `<i class="${k <= i ? "on" : ""}"></i>`).join("")}</span></span>${icon("chev", "chev")}</a>`; })() : "";
    // your usual
    const u = usual();
    const ui = u && item(u.id);
    $("#usual", el).innerHTML = ui ? `<div class="usual rv in">${tile(ui, "sm")}<span class="row-main"><span class="eyebrow">${L("Your usual", "همیشگیِ شما")}</span><span class="row-t">${esc(loc(ui))}</span><span class="row-s">${L(`Ordered ${u.times}×`, `${num(u.times)} بار سفارش داده‌اید`)}</span></span><button class="btn btn--sm" id="again" type="button">${icon("plus")}${L("Again", "دوباره")}</button></div>` : "";
    $("#again", el)?.addEventListener("click", () => { if (isSoldOut(u.id)) { toast(L("Sold out today", "امروز تمام شد"), "info"); return; } addToBag(u.id, u.sel); haptic(10); toast(L("Your usual is in the bag", "همیشگی‌تان در سبد است"), "bag"); });
  };
  paintRail();
  paint();
  const off = subscribe(paint), offHub = onHub(() => { paintRail(); paint(); paintPill(); });
  return () => { off(); offHub(); stopLatte(); };
}
home.meta = { title: ["Home", "خانه"] };
