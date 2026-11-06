import { $, $$, esc, icon, money, toast, haptic, fmtTime, fmtDay, qrSvg, L, loc, num, digits } from "../ui.js";
import { get, subscribe, branch, addToBag, item } from "../store.js";
import { STEPS, stageOf, collect, rate, stepSub, stepTitle } from "../orders.js";
import { permission, ask } from "../notify.js";
import { onHub } from "../hub.js";

const WAVE = `<svg viewBox="0 0 400 16" preserveAspectRatio="none"><path d="M0 8 Q25 0 50 8 T100 8 T150 8 T200 8 T250 8 T300 8 T350 8 T400 8 V16 H0Z"/></svg>`;
const TAGS = [["Perfect", "عالی بود"], ["Fast", "سریع"], ["Too sweet", "زیادی شیرین"], ["Too cold", "سرد بود"], ["Slow", "دیر رسید"], ["Friendly staff", "برخورد خوب"]];

export default function order(el, r) {
  let last = "";
  const paint = () => {
    const o = get().orders.find((x) => x.id === r.arg);
    if (!o) { el.innerHTML = `<div class="wrap narrow page-top"><div class="empty"><h3>${L("Order not found", "سفارش پیدا نشد")}</h3><a class="btn" href="#/" style="margin-top:16px">${L("Home", "خانه")}</a></div></div>`; return; }
    const steps = STEPS[o.mode];
    const i = stageOf(o);
    const key = i + "|" + o.rating + "|" + (o.tags || []).join();
    if (key === last) return;
    last = key;
    const b = branch(o.branch);
    const done = i === steps.length - 1;
    const fill = [22, 48, 78, 100][i];
    el.innerHTML = `
    <div class="wrap narrow page-top">
      <section class="track">
        <div class="track-cup"><div class="glass-c"><div class="liq" style="--fill:${fill}%">${WAVE}</div></div><div class="num"><span><b>#${digits(o.code)}</b><small>${L("Pickup code", "کد تحویل")}</small></span></div></div>
        <h1>${esc(stepTitle(steps[i]))}</h1>
        <p class="small eta">${done ? `${fmtDay(new Date(o.at))} – ${fmtTime(new Date(o.at))}` : `${o.pickup === "asap" ? L("Ready in about 12 minutes", "حدود ۱۲ دقیقه دیگه آماده‌ست") : L(`Pick up at ${o.pickup}`, `تحویل ساعت ${digits(o.pickup)}`)} – ${L("Conpanna", "کن‌پانا")} ${esc(loc(b))}`}</p>
        ${done ? `<div class="rate" id="rate" aria-label="${L("Rate your order", "به سفارشت امتیاز بده")}">${[1, 2, 3, 4, 5].map((n) => `<button type="button" data-n="${n}" class="${n <= o.rating ? "on" : ""}" aria-label="${n}">${icon(n <= o.rating ? "starF" : "star")}</button>`).join("")}</div>
          ${o.rating ? `<div class="fb-tags">${TAGS.map((t) => `<button type="button" class="chip sm" data-t="${t[0]}" aria-pressed="${(o.tags || []).includes(t[0])}">${L(t[0], t[1])}</button>`).join("")}</div><p class="tiny">${L("Thanks — the team reads every one.", "مرسی؛ بچه‌ها همه‌ش رو می‌خونن.")}</p>` : `<p class="tiny">${L("How was it?", "چطور بود؟")}</p>`}` : ""}
      </section>

      ${!done && permission() === "default" ? `<button class="perm" id="perm" type="button"><span class="bell-big">${icon("bell")}</span><span class="row-main"><b>${L("Get a ping when it's ready", "آماده شد خبرت کنیم؟")}</b><span>${L("Turn on notifications for order updates", "اعلان وضعیت سفارش رو روشن کن")}</span></span>${icon("chev", "chev")}</button>` : ""}

      <div class="group steps-card"><div class="steps">${steps.map((s, k) => `
        <div class="step ${k < i || (done && k === i) ? "done" : k === i ? "now" : ""}"><span class="step-dot">${k < i || done ? icon("check") : ""}</span><span><b>${esc(stepTitle(s))}</b><span>${esc(stepSub(o, s.k))}</span></span></div>`).join("")}</div></div>

      ${o.mode === "takeaway" && steps[i].k === "ready" ? `<div class="ticket" style="margin-top:14px"><div class="ticket-bot" style="justify-content:center">${qrSvg(`CONPANNA-ORDER|${o.id}|${o.code}`)}<div><p class="eyebrow">${L("At the counter", "تو صندوق")}</p><p class="ticket-code">#${digits(o.code)}</p><button class="btn btn--sm" id="got" type="button" style="margin-top:12px">${L("I've got it", "تحویل گرفتم")}</button></div></div></div>` : ""}

      <p class="group-label">${L(`${o.count} items`, `${num(o.count)} قلم`)}</p>
      <div class="group">${o.lines.map((l) => `<div class="row plain"><span class="row-main"><span class="row-t">${num(l.qty)} × ${esc(loc(l))}</span>${l.opts ? `<span class="row-s">${esc(l.opts)}</span>` : ""}</span><span class="row-v">${money(l.unit * l.qty)}</span></div>`).join("")}
        <div class="sum" style="padding-top:2px">${o.reward ? `<div class="neg"><span>${L("Free drink", "نوشیدنی رایگان")}</span><span>−${money(o.reward)}</span></div>` : ""}${o.voucher ? `<div class="neg"><span>${L("Voucher", "کوپن")}</span><span>−${money(o.voucher)}</span></div>` : ""}${o.discount ? `<div class="neg"><span dir="ltr">${esc(o.promo)}</span><span>−${money(o.discount)}</span></div>` : ""}${o.tierOff ? `<div class="neg"><span>${L("Gold Panna 10%", "٪۱۰ پانا طلایی")}</span><span>−${money(o.tierOff)}</span></div>` : ""}<div class="total"><span>${o.pay === "online" ? L("Paid online", "پرداخت شده") : L("Pay at the counter", "پرداخت تو صندوق")}</span>${money(o.total)}</div></div>
      </div>
      <div class="two-btn">
        <a class="btn btn--soft" href="https://ig.me/m/coffeeconpanna" target="_blank" rel="noopener">${icon("ig")}${L("Message us", "بهمون پیام بده")}</a>
        <button class="btn btn--soft" id="again" type="button">${icon("bag")}${L("Order again", "سفارش دوباره")}</button>
      </div>
      <p class="tiny" style="text-align:center;margin-top:18px">${L("Preview: the branch moves this order in the owner panel, or automatically if the panel is closed.", "نسخه‌ی نمایشی: شعبه این سفارش رو از پنل مدیرعامل جلو می‌بره؛ اگه پنل بسته باشه خودش جلو می‌ره.")}</p>
    </div>`;

    $$("#rate button", el).forEach((x) => x.addEventListener("click", () => { rate(o.id, +x.dataset.n, o.tags || []); haptic(10); }));
    $$(".fb-tags .chip", el).forEach((x) => x.addEventListener("click", () => { const cur = get().orders.find((y) => y.id === o.id); const tags = new Set(cur.tags || []); tags.has(x.dataset.t) ? tags.delete(x.dataset.t) : tags.add(x.dataset.t); rate(o.id, cur.rating, [...tags]); haptic(5); }));
    $("#got", el)?.addEventListener("click", () => { collect(o.id); haptic(15); toast(L("Enjoy! Bu tat senin.", "نوش جان! \u2068Bu tat senin.\u2069"), "coffee"); });
    $("#perm", el)?.addEventListener("click", async () => { const p = await ask(); toast(p === "granted" ? L("Notifications on", "اعلان‌ها روشن شد") : L("Notifications stay off", "اعلان‌ها خاموش موند"), "bell"); last = ""; paint(); });
    $("#again", el).addEventListener("click", () => { o.lines.forEach((l) => item(l.id) && addToBag(l.id, l.sel, l.qty)); toast(L("Added to your bag", "به سبد اضافه شد"), "bag"); location.hash = "#/bag"; });
  };
  paint();
  const off = subscribe(paint), offHub = onHub(paint);
  return () => { off(); offHub(); };
}
order.meta = { title: ["Your order", "سفارشت"], back: true, parent: "#/profile" };
