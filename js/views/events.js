import { $, $$, esc, icon, money, moneyText, sheet, toast, haptic, burst, dayFromToday, relDay, fmtLong, fmtOther, fmtDay, qrSvg, pad, L, loc, num, digits, hhmm } from "../ui.js";
import { fmtMonthShort, fmtDayNum, fmtWeekday } from "../i18n.js";
import { get, set, branch, uid, tierOf } from "../store.js";
import { EVENTS, BRANCHES } from "../data.js";
import { notify } from "../notify.js";
import { ping } from "../hub.js";
import { footer, payGateway } from "./shared.js";

const withDate = (e) => { const date = dayFromToday(e.day, e.time); return { ...e, date, end: new Date(date.getTime() + e.dur * 60e3) }; };
export const allEvents = () => EVENTS.map(withDate).sort((a, b) => a.date - b.date);
const mine = (id) => get().tickets.find((t) => t.event === id);
const taken = (e) => e.taken + (mine(e.id)?.seats || 0);
const endTime = (e) => `${pad(e.end.getHours())}:${pad(e.end.getMinutes())}`;

export function remindTick() {
  const s = get();
  const due = s.tickets.filter((t) => t.remind && !t.reminded).map((t) => ({ t, e: allEvents().find((x) => x.id === t.event) })).filter(({ e }) => e && Date.now() >= e.date - 3600e3 && Date.now() < e.end);
  if (!due.length) return;
  due.forEach(({ e }) => notify({ title: L(`${e.title} starts soon`, `${e.title_fa} به‌زودی شروع می‌شود`), body: L(`${e.time} at Conpanna ${branch(e.branch).name}. Your ticket is in the app.`, `ساعت ${digits(e.time)} در کن‌پانا ${branch(e.branch).name_fa}. بلیتتان در اپ است.`), cat: "events", url: `#/events?e=${e.id}` }));
  set((st) => ({ tickets: st.tickets.map((t) => (due.some((d) => d.t.id === t.id) ? { ...t, reminded: true } : t)) }));
}

function ics(e) {
  const f = (d) => `${d.getUTCFullYear()}${pad(d.getUTCMonth() + 1)}${pad(d.getUTCDate())}T${pad(d.getUTCHours())}${pad(d.getUTCMinutes())}00Z`;
  const body = ["BEGIN:VCALENDAR", "VERSION:2.0", "PRODID:-//Coffee Conpanna//Events//EN", "BEGIN:VEVENT", `UID:${e.id}@conpanna`, `DTSTAMP:${f(new Date())}`, `DTSTART:${f(e.date)}`, `DTEND:${f(e.end)}`,
    `SUMMARY:${loc(e, "title")} — Coffee Conpanna`, `LOCATION:Coffee Conpanna ${branch(e.branch).name}\\, ${branch(e.branch).city}`, `DESCRIPTION:${loc(e, "desc").replace(/,/g, "\\,")}`, "BEGIN:VALARM", "TRIGGER:-PT1H", "ACTION:DISPLAY", "DESCRIPTION:Reminder", "END:VALARM", "END:VEVENT", "END:VCALENDAR"].join("\r\n");
  const a = document.createElement("a");
  a.href = URL.createObjectURL(new Blob([body], { type: "text/calendar" }));
  a.download = `conpanna-${e.id}.ics`;
  document.body.appendChild(a); a.click(); a.remove();
  toast(L("Added to your calendar", "به تقویم اضافه شد"), "calPlus");
}

const ticketHtml = (e, t) => `
  <div class="ticket">
    <div class="ticket-top" style="--h:${e.hue}"><span class="ev-bg"></span><span class="ev-kind">${esc(loc(e, "kind"))}</span><h3 class="d3" style="margin-top:14px">${esc(loc(e, "title"))}</h3>
      <div class="ev-meta"><span>${icon("events")}${fmtDay(e.date)} – ${hhmm(e.time)}</span><span>${icon("pin")}${esc(loc(branch(e.branch)))}</span></div></div>
    <div class="ticket-cut"></div>
    <div class="ticket-bot">${qrSvg(`CONPANNA|${t.code}|${e.id}|${t.seats}`)}
      <div><p class="eyebrow">${L("Ticket", "بلیت")}</p><p class="ticket-code lat">${t.code}</p><p class="small" style="margin-top:6px">${L(`${t.seats} ${t.seats === 1 ? "seat" : "seats"}`, `${num(t.seats)} نفر`)}${t.paid ? ` – ${L("paid", "پرداخت‌شده")} ${moneyText(t.paid)}` : ` – ${L("free entry", "ورود رایگان")}`}</p><p class="tiny">${L("Show this at the counter.", "این را در صندوق نشان دهید.")}</p></div>
    </div>
  </div>`;

export function eventSheet(id, after) {
  const e = allEvents().find((x) => x.id === id);
  if (!e) return;
  const b = branch(e.branch);
  const t = mine(id);
  let seats = 1;
  const left = e.seats - taken(e);
  sheet(`
    <div class="sheet-hero ev-hero" style="--h:${e.hue}"><span class="ev-bg"></span>
      <div><span class="ev-kind">${esc(loc(e, "kind"))}</span><h2>${esc(loc(e, "title"))}</h2></div></div>
    <div class="group" style="margin-top:18px">
      <div class="row"><span class="row-ic soft">${icon("events")}</span><span class="row-main"><span class="row-t">${esc(relDay(e.date))} – ${hhmm(e.time)}–${hhmm(endTime(e))}</span><span class="row-s">${fmtLong(e.date)} – ${fmtOther(e.date)}</span></span></div>
      <a class="row" href="https://www.google.com/maps/search/?api=1&query=${encodeURIComponent(b.query)}" target="_blank" rel="noopener"><span class="row-ic soft">${icon("pin")}</span><span class="row-main"><span class="row-t">${L("Conpanna", "کن‌پانا")} ${esc(loc(b))}</span><span class="row-s">${esc(loc(b, "city"))} – ${L("directions", "مسیریابی")}</span></span>${icon("chev", "chev")}</a>
      <div class="row"><span class="row-ic soft">${icon("users")}</span><span class="row-main"><span class="row-t">${esc(loc(e, "host"))}</span><span class="row-s">${left > 0 ? L(`${left} of ${e.seats} seats left`, `${num(left)} جا از ${num(e.seats)} باقی مانده`) : L("Full", "تکمیل")}</span><span class="seats"><i style="--w:${(taken(e) / e.seats) * 100}%"></i></span></span></div>
    </div>
    <p class="body" style="margin-top:18px">${esc(loc(e, "desc"))}</p>
    <div id="tk">${t ? ticketHtml(e, t) : ""}</div>
    <div class="sheet-cta" id="cta"></div>`,
  { label: loc(e, "title"), onMount(body) {
    const cta = $("#cta", body);
    const paintCta = () => {
      const tk = mine(id);
      if (tk) {
        cta.innerHTML = `<button class="btn btn--soft" id="cal" type="button" style="flex:1">${icon("calPlus")}${L("Calendar", "تقویم")}</button><button class="btn ${tk.remind ? "" : "btn--soft"}" id="rem" type="button" style="flex:1">${icon("bell")}${tk.remind ? L("Reminder on", "یادآور روشن") : L("Remind me", "یادآوری کن")}</button><button class="icon-btn lg" id="cancel" type="button" aria-label="${L("Cancel booking", "لغو رزرو")}">${icon("trash")}</button>`;
        $("#cal", cta).addEventListener("click", () => ics(e));
        $("#rem", cta).addEventListener("click", () => { const on = !mine(id).remind; set((s) => ({ tickets: s.tickets.map((x) => (x.event === id ? { ...x, remind: on, reminded: false } : x)) })); toast(on ? L("We'll remind you an hour before", "یک ساعت قبل یادآوری می‌کنیم") : L("Reminder off", "یادآور خاموش"), "bell"); haptic(8); paintCta(); });
        $("#cancel", cta).addEventListener("click", () => { set((s) => ({ tickets: s.tickets.filter((x) => x.event !== id) })); $("#tk", body).innerHTML = ""; toast(L("Booking cancelled", "رزرو لغو شد"), "trash"); ping({ type: "app" }); paintCta(); after?.(); });
        return;
      }
      if (left <= 0) {
        const wl = (get().waitlist || []).includes(id);
        cta.innerHTML = `<button class="btn btn--block ${wl ? "btn--soft" : ""}" id="wl" type="button">${icon("bell")}${wl ? L("You're on the waitlist", "در لیست انتظار هستید") : L("Join the waitlist", "پیوستن به لیست انتظار")}</button>`;
        $("#wl", cta).addEventListener("click", () => { set((s) => ({ waitlist: wl ? (s.waitlist || []).filter((x) => x !== id) : [...(s.waitlist || []), id] })); toast(wl ? L("Left the waitlist", "از لیست انتظار خارج شدید") : L("We'll tell you if a seat opens", "اگر جایی خالی شد خبرتان می‌کنیم"), "bell"); paintCta(); });
        return;
      }
      const max = Math.min(4, left);
      cta.innerHTML = `<div class="stepper" role="group" aria-label="${L("Seats", "تعداد نفرات")}"><button type="button" data-d="-1" aria-label="−">${icon("minus")}</button><output>${num(seats)}</output><button type="button" data-d="1" aria-label="+">${icon("plus")}</button></div><button class="btn" id="book" type="button">${e.price ? `${L("Book", "رزرو")} – ${money(e.price * seats)}` : L(`Reserve ${seats > 1 ? seats + " seats" : "a seat"}`, `رزرو ${num(seats)} جا`)}</button>`;
      $$(".stepper button", cta).forEach((x) => x.addEventListener("click", () => { seats = Math.max(1, Math.min(max, seats + +x.dataset.d)); haptic(4); paintCta(); }));
      $("#book", cta).addEventListener("click", async () => {
        if (e.price) { const ok = await payGateway(e.price * seats, `${loc(e, "title")} – ${L(`${seats} seats`, `${num(seats)} نفر`)}`); if (!ok) { eventSheet(id, after); return; } }
        const tk = { id: uid("T"), event: id, seats, code: "CP-" + Math.floor(1000 + Math.random() * 9000), at: Date.now(), paid: e.price * seats, remind: get().notif.events, name: get().user?.name || "" };
        set((s) => ({ tickets: [tk, ...s.tickets.filter((x) => x.event !== id)] }));
        ping({ type: "app" });
        notify({ title: L("You're booked ✓", "رزرو شد ✓"), body: L(`${e.title} – ${relDay(e.date)} ${e.time} at Conpanna ${b.name}. Ticket ${tk.code}.`, `${e.title_fa} – ${relDay(e.date)} ساعت ${digits(e.time)} در کن‌پانا ${b.name_fa}. بلیت ${tk.code}.`), cat: "events", url: `#/events?e=${id}` });
        after?.();
        if (e.price) eventSheet(id, after); else { $("#tk", body).innerHTML = ticketHtml(e, tk); paintCta(); }
        setTimeout(() => { const r = document.querySelector(".ticket")?.getBoundingClientRect(); if (r) burst(r.left + r.width / 2, r.top + 60); document.querySelector(".ticket")?.scrollIntoView({ behavior: "smooth", block: "center" }); }, 250);
        haptic(20);
      });
    };
    paintCta();
  } });
}

export default function events(el, r) {
  let filter = "all", day = null;
  const paint = () => {
    const list = allEvents();
    const shown = list.filter((e) => (filter === "all" || e.branch === filter) && (day == null || e.day === day));
    const tix = get().tickets.map((t) => ({ t, e: list.find((x) => x.id === t.event) })).filter((x) => x.e && x.e.end > Date.now());
    const feat = day == null ? shown[0] : null;
    const days = Array.from({ length: 14 }, (_, i) => ({ i, d: dayFromToday(i), has: list.some((e) => e.day === i && (filter === "all" || e.branch === filter)) }));
    el.innerHTML = `
    <div class="wrap page-top">
      <div class="page-head"><div><h1 class="lt">${L("Events", "رویدادها")}</h1><p class="small">${L("Workshops, tastings and nights out at all four branches.", "کارگاه‌ها، مزه‌کردن‌ها و شب‌های دورهمی در هر چهار شعبه.")}</p></div></div>
      ${tix.length ? `<section style="margin-bottom:22px"><p class="group-label" style="margin-top:0">${L("Your tickets", "بلیت‌های شما")}</p><div class="my-tix">${tix.map(({ t, e }) => `<button class="mt" type="button" data-e="${e.id}">${qrSvg(t.code)}<span><b>${esc(loc(e, "title"))}</b><span>${esc(relDay(e.date))} – ${hhmm(e.time)} – ${esc(loc(branch(e.branch)))}</span></span></button>`).join("")}</div></section>` : ""}
      <div class="days" role="tablist" aria-label="${L("Pick a day", "انتخاب روز")}">${days.map(({ i, d, has }) => `<button type="button" class="day ${has ? "has" : ""}" data-day="${i}" aria-pressed="${day === i}"><small>${i === 0 ? L("Today", "امروز") : fmtWeekday(d)}</small><b>${fmtDayNum(d)}</b><i></i></button>`).join("")}</div>
      <div class="chips-bar"><div class="chips">${[["all", L("All branches", "همه‌ی شعبه‌ها")], ...BRANCHES.map((x) => [x.id, loc(x)])].map(([v, l]) => `<button class="chip" type="button" data-f="${v}" aria-pressed="${v === filter}">${esc(l)}</button>`).join("")}</div></div>
      ${feat ? `<a class="event-feature" href="#/events?e=${feat.id}" data-e="${feat.id}" style="--h:${feat.hue};margin-top:16px">
          <span class="ev-bg"></span><span class="ev-kind">${esc(loc(feat, "kind"))} – ${L("next up", "بعدی")}</span><h3>${esc(loc(feat, "title"))}</h3>
          <div class="ev-meta"><span>${icon("events")}${esc(relDay(feat.date))} – ${hhmm(feat.time)}</span><span>${icon("pin")}${esc(loc(branch(feat.branch)))}</span><span>${feat.price ? money(feat.price) : L("Free", "رایگان")}</span></div></a>` : ""}
      <div class="ev-list" style="margin-top:12px">${shown.slice(feat ? 1 : 0).map((e) => {
        const tk = mine(e.id), tkn = taken(e);
        return `<button class="ev ${tk ? "going" : ""}" type="button" data-e="${e.id}">
          <span class="ev-date" style="--h:${e.hue}"><span class="ev-bg"></span><small>${fmtMonthShort(e.date)}</small><b>${fmtDayNum(e.date)}</b></span>
          <span class="ev-main"><span class="tag">${tk ? L("Going ✓", "می‌روم ✓") : esc(loc(e, "kind"))}</span><h3>${esc(loc(e, "title"))}</h3>
            <span class="row-s ev-sub"><span>${esc(relDay(e.date))} – ${hhmm(e.time)}</span><span>${esc(loc(branch(e.branch)))}</span><span>${e.price ? money(e.price) : L("Free", "رایگان")}</span></span>
            <span class="seats"><i style="--w:${(tkn / e.seats) * 100}%"></i></span><span class="seats-l">${e.seats - tkn > 0 ? L(`${e.seats - tkn} seats left`, `${num(e.seats - tkn)} جای خالی`) : L("Full – waitlist open", "تکمیل – لیست انتظار")}</span></span>
        </button>`;
      }).join("") || `<div class="empty">${icon("events")}<h3>${L("Nothing that day", "آن روز برنامه‌ای نیست")}</h3><p class="small">${L("Pick another day or branch.", "روز یا شعبه‌ی دیگری انتخاب کنید.")}</p></div>`}</div>
      <p class="tiny menu-note">${L("Preview events — dates move with today so the page always looks current.", "رویدادهای نمونه؛ تاریخ‌ها با امروز جابه‌جا می‌شوند.")}</p>
      ${footer()}
    </div>`;
    $$("[data-f]", el).forEach((c) => c.addEventListener("click", () => { filter = c.dataset.f; haptic(5); paint(); }));
    $$("[data-day]", el).forEach((c) => c.addEventListener("click", () => { const v = +c.dataset.day; day = day === v ? null : v; haptic(5); paint(); }));
    $$("[data-e]", el).forEach((c) => c.addEventListener("click", (ev) => { ev.preventDefault(); eventSheet(c.dataset.e, paint); }));
  };
  paint();
  if (r.q.e) setTimeout(() => eventSheet(r.q.e, paint), 250);
}
events.meta = { title: ["Events", "رویدادها"] };
