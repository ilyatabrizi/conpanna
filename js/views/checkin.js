import { $, $$, esc, icon, toast, haptic, burst, openState, busy, busyLabel, fmtTime, ago, sheet, closeSheet, reduced, replay, L, loc, num, digits } from "../ui.js";
import { get, set, branch, addStamps, addPoints } from "../store.js";
import { BRANCHES, BRAND, POINTS } from "../data.js";
import { notify } from "../notify.js";
import { footer, celebrate } from "./shared.js";
import { clubCard } from "./home.js";

const HOLD_MS = 1100;
const STAY_H = 4;
const WAVE = `<svg viewBox="0 0 400 16" preserveAspectRatio="none"><path fill="#A06A40" d="M0 8 Q25 0 50 8 T100 8 T150 8 T200 8 T250 8 T300 8 T350 8 T400 8 V16 H0Z"/></svg>`;

export const currentVisit = () => {
  const c = get().current;
  return c && Date.now() - c.at < STAY_H * 3600e3 ? c : null;
};

export default function checkin(el) {
  let pick = get().current?.branch || get().branch;
  const meter = (v) => `<div class="meter" aria-hidden="true">${Array.from({ length: 10 }, (_, i) => `<i style="--h:${30 + i * 7}%" class="${i < Math.round(v * 10) ? "on" : ""}"></i>`).join("")}</div>`;

  function paint() {
    const s = get();
    const cur = currentVisit();
    const b = branch(cur ? cur.branch : pick);
    const visits = s.checkins.slice(0, 6);
    el.innerHTML = `
    <div class="wrap narrow page-top">
      <div class="page-head"><div><h1 class="lt">${L("Check in", "ورود به کافه")}</h1><p class="small">${L("Tell us you're here: a stamp and points for your card, the Wi-Fi, and your order brought to your table.", "بگویید رسیدید: مهر و امتیاز برای کارتتان، رمز وای‌فای و سفارشی که سر میز می‌آید.")}</p></div></div>
      ${cur ? `
      <section class="here">
        <div class="here-top"><div><p class="eyebrow">${L("You're checked in · since", "حضور ثبت شد · از ساعت")} ${fmtTime(new Date(cur.at))}</p><h2>${L("Conpanna", "کن‌پانا")} ${esc(loc(b))}</h2></div><span class="dot pulse" style="margin-top:8px"></span></div>
        <p class="small" style="margin-top:6px">${esc(loc(b, "note"))}</p>
        <div class="here-grid">
          <button type="button" id="wifi">${icon("wifi")}<b>${L("Wi-Fi", "وای‌فای")}</b><span dir="ltr">${BRAND.wifi.ssid}</span><span>${L("tap to copy password", "برای کپی رمز بزنید")}</span></button>
          <button type="button" id="table">${icon("table")}<b>${cur.table ? L(`Table ${cur.table}`, `میز ${digits(cur.table)}`) : L("Your table", "میز شما")}</b><span>${cur.table ? L("Tap to change", "برای تغییر بزنید") : L("Add it and we'll bring your order", "شماره‌ی میز را بزنید تا سفارش را بیاوریم")}</span></button>
          <a href="#/menu" id="order-seat">${icon("menu")}<b>${L("Order from your seat", "سفارش از سر میز")}</b><span>${L("Skip the queue at the counter", "بدون صف صندوق")}</span></a>
          <button type="button" id="out">${icon("door")}<b>${L("Check out", "خروج")}</b><span>${L("Leaving? See you soon", "دارید می‌روید؟ به امید دیدار")}</span></button>
        </div>
      </section>` : `
      <section>
        <p class="group-label" style="margin-top:0">${L("Where are you?", "کجا هستید؟")}</p>
        <div class="branch-pick" id="picks">${BRANCHES.map((x) => { const o = openState(x), v = busy(x); return `
          <button class="bp" type="button" data-b="${x.id}" aria-pressed="${x.id === pick}">
            <b>${esc(loc(x))}</b><span class="city">${esc(loc(x, "city"))}</span>
            ${meter(v)}
            <span class="st"><span class="dot ${o.isOpen ? "" : "off"}"></span>${o.isOpen ? busyLabel(v) : o.label}</span>
          </button>`; }).join("")}</div>
        <div class="hold-wrap">
          <button class="hold" id="hold" type="button" aria-label="${L("Hold to check in", "برای ورود نگه دارید")}">
            <span class="liq">${WAVE}</span>
            <span class="hold-in">${icon("checkin")}<b>${L("Hold to check in", "نگه دارید تا وارد شوید")}</b><span id="hold-at">${L("at", "در")} ${esc(loc(b))}</span></span>
          </button>
          <p class="tiny" style="margin-top:16px;text-align:center">${L(`Press and hold until the cup fills · +1 stamp · +${POINTS.perCheckin} points`, `نگه دارید تا فنجان پر شود · +۱ مهر · +${num(POINTS.perCheckin)} امتیاز`)}</p>
        </div>
      </section>`}

      <section style="margin-top:30px">
        <div class="sec"><h2>${L("Your card", "کارت شما")}</h2></div>
        ${clubCard(s)}
      </section>

      ${visits.length ? `<section style="margin-top:30px"><p class="group-label">${L("Recent visits", "بازدیدهای اخیر")}</p><div class="group">${visits.map((v) => `
        <div class="row"><span class="row-ic soft">${icon("pin")}</span><span class="row-main"><span class="row-t">${esc(loc(branch(v.branch)))}</span><span class="row-s">${ago(v.at)}${v.stamp ? L(" · +1 stamp", " · +۱ مهر") : ""}</span></span></div>`).join("")}</div></section>` : ""}
      ${footer()}
    </div>`;
    wire();
  }

  function doCheckin() {
    const s = get();
    const b = branch(pick);
    const recent = s.checkins.find((c) => c.branch === pick && Date.now() - c.at < 3 * 3600e3);
    const stamp = !recent;
    set((st) => ({ current: { branch: pick, at: Date.now(), table: "" }, branch: pick, checkins: [{ branch: pick, at: Date.now(), stamp }, ...st.checkins].slice(0, 30) }));
    let earned = 0, tierUp = null;
    if (stamp) { earned = addStamps(1); tierUp = addPoints(POINTS.perCheckin); }
    haptic(25);
    const hb = $("#hold", el)?.getBoundingClientRect();
    if (hb) burst(hb.left + hb.width / 2, hb.top + hb.height / 2);
    notify({ title: L(`Welcome to Conpanna ${b.name}`, `به کن‌پانا ${b.name_fa} خوش آمدید`), body: L(`${stamp ? "+1 stamp. " : ""}Wi-Fi: ${BRAND.wifi.ssid} · ${BRAND.wifi.pass}`, `${stamp ? "+۱ مهر. " : ""}وای‌فای: ${BRAND.wifi.ssid} · ${BRAND.wifi.pass}`), cat: "checkin", url: "#/checkin" });
    paint();
    if (tierUp) celebrate({ icon: "crown", title: L(`Welcome to ${tierUp.name}`, `به سطح ${tierUp.name_fa} خوش آمدید`), body: L(tierUp.perks.join(" · "), tierUp.perks_fa.join(" · ")), cta: L("See your perks", "دیدن مزایا"), href: "#/rewards" });
    else toast(earned ? L("Card full — a free drink is yours", "کارت پر شد؛ یک نوشیدنی رایگان مال شماست") : stamp ? L("Checked in · +1 stamp", "ورود ثبت شد · +۱ مهر") : L("Checked in · stamp already collected today", "ورود ثبت شد · مهر امروز قبلاً گرفته شده"), earned ? "gift" : "check");
  }

  function wire() {
    $$(".bp", el).forEach((x) => x.addEventListener("click", () => {
      pick = x.dataset.b;
      $$(".bp", el).forEach((y) => y.setAttribute("aria-pressed", y === x ? "true" : "false"));
      $("#hold-at", el).textContent = `${L("at", "در")} ${loc(branch(pick))}`;
      haptic(5);
    }));
    const hold = $("#hold", el);
    if (hold) {
      let raf = 0, t0 = 0, fill = 0, pressing = false;
      const draw = () => { hold.style.setProperty("--fill", `${fill * 112}%`); hold.classList.toggle("deep", fill > .55); };
      const step = (now) => {
        if (pressing) {
          fill = Math.min(1, (now - t0) / HOLD_MS);
          if (fill >= 1) { pressing = false; hold.classList.remove("pressing"); hold.classList.add("filled"); draw(); doCheckin(); return; }
        } else { fill = Math.max(0, fill - 0.045); if (fill <= 0) { draw(); hold.classList.remove("deep"); return; } }
        draw(); raf = requestAnimationFrame(step);
      };
      hold.addEventListener("pointerdown", (e) => { if (e.button > 0) return; e.preventDefault(); pressing = true; t0 = performance.now() - fill * HOLD_MS; hold.classList.add("pressing"); haptic(6); try { hold.setPointerCapture(e.pointerId); } catch (err) {} cancelAnimationFrame(raf); raf = requestAnimationFrame(step); });
      const stop = () => { if (!pressing) return; pressing = false; hold.classList.remove("pressing"); if (fill < 1) toast(L("Keep holding until the cup is full", "نگه دارید تا فنجان پر شود"), "info"); cancelAnimationFrame(raf); raf = requestAnimationFrame(step); };
      hold.addEventListener("pointerup", stop);
      hold.addEventListener("pointercancel", stop);
      hold.addEventListener("contextmenu", (e) => e.preventDefault());
      hold.addEventListener("keydown", (e) => { if (e.key !== "Enter" && e.key !== " ") return; e.preventDefault(); if (reduced()) { doCheckin(); return; } pressing = true; t0 = performance.now() - HOLD_MS * .6; cancelAnimationFrame(raf); raf = requestAnimationFrame(step); });
    }
    $("#wifi", el)?.addEventListener("click", async (e) => {
      try { await navigator.clipboard.writeText(BRAND.wifi.pass); toast(L(`Password copied · ${BRAND.wifi.pass}`, `رمز کپی شد · ${BRAND.wifi.pass}`), "wifi"); }
      catch (err) { toast(`${L("Wi-Fi password", "رمز وای‌فای")}: ${BRAND.wifi.pass}`, "wifi"); }
      replay(e.currentTarget, "gulp");
    });
    $("#table", el)?.addEventListener("click", () => {
      const cur = get().current;
      sheet(`<h2>${L("Your table", "میز شما")}</h2><p class="small lead">${L("The number is on the little stand on your table. We'll bring your order there.", "شماره روی پایه‌ی کوچک روی میز است. سفارش را همان‌جا می‌آوریم.")}</p>
        <label class="field"><span>${L("Table number", "شماره‌ی میز")}</span><input id="tn" inputmode="numeric" maxlength="3" value="${esc(cur?.table || "")}" placeholder="12" dir="ltr"></label>
        <button class="btn btn--block" id="tsave" type="button" style="margin-top:18px">${L("Save", "ذخیره")}</button>`, { label: L("Your table", "میز شما"), onMount(b) {
        const i = $("#tn", b); setTimeout(() => i.focus(), 350);
        const save = () => { const v = i.value.replace(/[۰-۹]/g, (d) => "۰۱۲۳۴۵۶۷۸۹".indexOf(d)).replace(/\D/g, ""); set((st) => ({ current: { ...st.current, table: v } })); closeSheet(); paint(); toast(v ? L(`Table ${v} — got it`, `میز ${digits(v)} — ثبت شد`) : L("Table cleared", "میز پاک شد"), "table"); };
        $("#tsave", b).addEventListener("click", save);
        i.addEventListener("keydown", (e) => { if (e.key === "Enter") save(); });
      } });
    });
    $("#order-seat", el)?.addEventListener("click", () => set({ mode: "takeaway", branch: get().current.branch }));
    $("#out", el)?.addEventListener("click", () => { set({ current: null }); haptic(8); paint(); toast(L("Checked out. See you soon", "خروج ثبت شد. به امید دیدار"), "door"); });
  }
  paint();
}
checkin.meta = { title: ["Check in", "ورود به کافه"] };
