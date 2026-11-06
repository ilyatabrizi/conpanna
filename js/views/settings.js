import { $, esc, icon, toast, haptic, seg, segmented, sw, sheet, closeSheet, L, loc } from "../ui.js";
import { get, set, reset } from "../store.js";
import { BRANCHES } from "../data.js";
import { ask, permission, notify } from "../notify.js";
import { addressSheet } from "./bag.js";
import { install, installed } from "../install.js";
import { footer } from "./shared.js";
import { applyTheme, applyCalm } from "../theme.js";
import { getLang, digits } from "../i18n.js";

const CATS = () => [
  ["order", L("Order updates", "وضعیت سفارش"), L("Brewing, ready to collect, on the way", "آماده‌سازی، آماده‌ی تحویل، در راه"), "receipt", "#45281A"],
  ["events", L("Event reminders", "یادآور رویدادها"), L("An hour before anything you've booked", "یک ساعت قبل از هر رویداد رزروشده"), "events", "#8A5A2E"],
  ["checkin", L("Check-in welcome", "خوش‌آمد ورود"), L("Wi-Fi and your stamp when you arrive", "وای‌فای و مهر هنگام رسیدن"), "checkin", "#3C9560"],
  ["offers", L("Offers & new drinks", "پیشنهادها و نوشیدنی‌های تازه"), L("Seasonal menu, members' prices, vouchers", "منوی فصلی، قیمت اعضا، کوپن‌ها"), "gift", "#B4682F"],
  ["digest", L("Weekly digest", "خلاصه‌ی هفتگی"), L("What's on at your branch, every Saturday", "برنامه‌های شعبه‌ی شما، هر شنبه"), "spark", "#94653A"],
];

export default function settings(el, r) {
  const paint = () => {
    const s = get(), p = permission();
    const st = p === "granted" ? [L("On", "روشن"), "ok"] : p === "denied" ? [L("Blocked", "مسدود"), "bad"] : p === "unsupported" ? [L("Not supported", "پشتیبانی نمی‌شود"), ""] : [L("Off", "خاموش"), ""];
    el.innerHTML = `
    <div class="wrap narrow page-top">
      <div class="page-head"><div><h1 class="lt">${L("Settings", "تنظیمات")}</h1></div></div>
      <div class="settings-cols">
      <section id="notif">
        <p class="group-label" style="margin-top:0">${L("Push notifications", "اعلان‌ها")}</p>
        <div class="perm">
          <span class="bell-big">${icon("bell")}</span>
          <span class="row-main"><b>${L("Notifications on this phone", "اعلان روی این گوشی")}</b><span>${p === "granted" ? L("Conpanna can reach your lock screen.", "کن‌پانا می‌تواند روی صفحه‌ی قفل پیام بدهد.") : p === "denied" ? L("Blocked in your browser — allow notifications for this site to turn them on.", "در مرورگر مسدود است؛ اجازه‌ی اعلان را برای این سایت روشن کنید.") : p === "unsupported" ? (/iphone|ipad/i.test(navigator.userAgent) ? L("On iPhone, add Conpanna to your Home Screen first (iOS 16.4+).", "در آیفون، اول کن‌پانا را به صفحه‌ی اصلی اضافه کنید (iOS 16.4+).") : L("This browser can't show notifications.", "این مرورگر اعلان پشتیبانی نمی‌کند.")) : L("Allow them to hear when your order is ready.", "اجازه دهید تا وقتی سفارش آماده شد خبرتان کنیم.")}</span></span>
          ${p === "default" ? `<button class="btn btn--sm" id="allow" type="button">${L("Allow", "اجازه")}</button>` : `<span class="state-pill ${st[1]}">${st[0]}</span>`}
        </div>
        <div class="group" style="margin-top:12px">
          ${CATS().map(([k, t, sub, ic, c]) => `<label class="row" style="cursor:pointer"><span class="row-ic" style="--c:${c}">${icon(ic)}</span><span class="row-main"><span class="row-t">${t}</span><span class="row-s">${sub}</span></span>${sw(k, s.notif[k], t)}</label>`).join("")}
        </div>
        <div class="group" style="margin-top:12px">
          <label class="row" style="cursor:pointer"><span class="row-ic" style="--c:#4B4F7A">${icon("moon")}</span><span class="row-main"><span class="row-t">${L("Quiet hours", "ساعت‌های سکوت")}</span><span class="row-s">${L("Hold notifications overnight; they wait in the app", "اعلان‌ها شب‌ها در اپ منتظر می‌مانند")}</span></span>${sw("quiet", s.notif.quiet, L("Quiet hours", "ساعت سکوت"))}</label>
          ${s.notif.quiet ? `<div class="row"><span class="row-ic" style="--c:transparent"></span><span class="row-main"><span class="row-t">${L("From", "از")}</span></span><input class="time-in" type="time" id="qf" value="${s.notif.qFrom}" dir="ltr"></div><div class="row"><span class="row-ic" style="--c:transparent"></span><span class="row-main"><span class="row-t">${L("Until", "تا")}</span></span><input class="time-in" type="time" id="qt" value="${s.notif.qTo}" dir="ltr"></div>` : ""}
        </div>
        <div class="group" style="margin-top:12px"><button class="row" type="button" id="test"><span class="row-ic" style="--c:#E0663F">${icon("bolt")}</span><span class="row-main"><span class="row-t">${L("Send a test notification", "ارسال اعلان آزمایشی")}</span><span class="row-s">${L("See how Conpanna looks on your lock screen", "ببینید کن‌پانا روی صفحه‌ی قفل چطور است")}</span></span>${icon("chev", "chev")}</button></div>
        <p class="group-foot">${L("Preview: notifications are sent by this phone. In the live app they come from Conpanna's server, even when the app is closed.", "نمونه: اعلان‌ها از همین گوشی فرستاده می‌شوند. در نسخه‌ی اصلی از سرور کن‌پانا می‌آیند، حتی وقتی اپ بسته است.")}</p>
      </section>

      <section>
        <p class="group-label">${L("Ordering", "سفارش")}</p>
        <div class="group">
          <div class="row"><span class="row-ic" style="--c:#45281A">${icon("takeaway")}</span><span class="row-main"><span class="row-t">${L("Order type", "نوع سفارش")}</span></span>
            <select class="row-select" id="dmode"><option value="takeaway" ${s.mode === "takeaway" ? "selected" : ""}>${L("Takeaway", "بیرون‌بر")}</option><option value="delivery" ${s.mode === "delivery" ? "selected" : ""}>${L("Delivery", "ارسال")}</option></select>${icon("chevD", "chev")}</div>
          <div class="row"><span class="row-ic" style="--c:#94653A">${icon("pin")}</span><span class="row-main"><span class="row-t">${L("My branch", "شعبه‌ی من")}</span></span>
            <select class="row-select" id="dbranch">${BRANCHES.map((b) => `<option value="${b.id}" ${s.branch === b.id ? "selected" : ""}>${esc(loc(b))}</option>`).join("")}</select>${icon("chevD", "chev")}</div>
          <button class="row" type="button" id="addr"><span class="row-ic" style="--c:#3C7E9A">${icon("home")}</span><span class="row-main"><span class="row-t">${L("Delivery addresses", "آدرس‌ها")}</span></span><span class="row-v">${s.addresses.length ? digits(s.addresses.length) : L("Add", "افزودن")}${icon("chev", "chev")}</span></button>
          <div class="row"><span class="row-ic" style="--c:#5E7A3C">${icon("card")}</span><span class="row-main"><span class="row-t">${L("Pay with", "روش پرداخت")}</span></span>
            <select class="row-select" id="dpay"><option value="online" ${s.pay === "online" ? "selected" : ""}>${L("Online", "آنلاین")}</option><option value="cash" ${s.pay === "cash" ? "selected" : ""}>${L("At pickup", "هنگام تحویل")}</option></select>${icon("chevD", "chev")}</div>
        </div>

        <p class="group-label">${L("Appearance", "ظاهر")}</p>
        <div class="group" style="padding:12px">${seg([["system", L("Auto", "خودکار"), "spark"], ["light", L("Light", "روشن"), "sun"], ["dark", L("Dark", "تیره"), "moon"]], s.theme, "theme-seg")}</div>
        <div class="group" style="margin-top:12px">
          <label class="row" style="cursor:pointer"><span class="row-ic" style="--c:#6A5ACD">${icon("spark")}</span><span class="row-main"><span class="row-t">${L("Reduce motion", "کاهش حرکت")}</span><span class="row-s">${L("Calmer transitions, no liquid", "انیمیشن آرام‌تر، بدون حرکت مایع")}</span></span>${sw("reduceMotion", s.prefs.reduceMotion, "")}</label>
          <label class="row" style="cursor:pointer"><span class="row-ic" style="--c:#3C9560">${icon("bolt")}</span><span class="row-main"><span class="row-t">${L("Haptics", "لرزش")}</span><span class="row-s">${L("A small tap on supported phones", "لرزش کوتاه در گوشی‌های پشتیبان")}</span></span>${sw("haptics", s.prefs.haptics, "")}</label>
        </div>

        <p class="group-label">${L("App", "اپ")}</p>
        <div class="group">
          ${installed() ? "" : `<button class="row" type="button" id="inst"><span class="row-ic" style="--c:#2F7BF6">${icon("dl")}</span><span class="row-main"><span class="row-t">${L("Add to Home Screen", "افزودن به صفحه‌ی اصلی")}</span></span>${icon("chev", "chev")}</button>`}
          <button class="row" type="button" id="about"><span class="row-ic" style="--c:#75604F">${icon("info")}</span><span class="row-main"><span class="row-t">${L("About this preview", "درباره‌ی این نمونه")}</span></span>${icon("chev", "chev")}</button>
          <button class="row danger" type="button" id="wipe"><span class="row-ic" style="--c:var(--danger)">${icon("trash")}</span><span class="row-main"><span class="row-t">${L("Clear data on this phone", "پاک کردن داده‌های این گوشی")}</span></span></button>
        </div>
      </section>
      </div>
      ${footer()}
    </div>`;
    wire();
  };
  function wire() {
    $("#allow", el)?.addEventListener("click", async () => {
      const p = await ask();
      if (p === "granted") { toast(L("Notifications on", "اعلان‌ها روشن شد"), "bell"); notify({ title: L("You're all set ☕", "همه‌چیز آماده است ☕"), body: L("We'll let you know the moment your order is ready.", "همین که سفارشتان آماده شد خبرتان می‌کنیم."), cat: "system", url: "#/settings" }); }
      else toast(L("Notifications stay off", "اعلان‌ها خاموش ماند"), "bell");
      paint();
    });
    CATS().forEach(([k]) => $(`input[name="${k}"]`, el).addEventListener("change", (e) => { set((s) => ({ notif: { ...s.notif, [k]: e.target.checked } })); haptic(6); if (e.target.checked && permission() === "default") ask().then(paint); }));
    $('input[name="quiet"]', el).addEventListener("change", (e) => { set((s) => ({ notif: { ...s.notif, quiet: e.target.checked } })); haptic(6); paint(); });
    $("#qf", el)?.addEventListener("change", (e) => set((s) => ({ notif: { ...s.notif, qFrom: e.target.value } })));
    $("#qt", el)?.addEventListener("change", (e) => set((s) => ({ notif: { ...s.notif, qTo: e.target.value } })));
    $("#test", el).addEventListener("click", async () => {
      if (permission() === "default") await ask();
      await notify({ title: L("Your Caramel Con Panna is ready ☕", "کارامل کن‌پانای شما آماده است ☕"), body: L("Order #128 is waiting at Conpanna Valiasr. Show code 128 at the counter.", "سفارش #۱۲۸ در کن‌پانا ولیعصر منتظر شماست. کد ۱۲۸ را نشان دهید."), cat: "system", url: "#/profile" });
      toast(permission() === "granted" ? L("Sent — check your notifications", "ارسال شد؛ اعلان‌ها را ببینید") : L("Sent to your in-app inbox (bell, top)", "به صندوق اعلان داخل اپ رفت (زنگوله‌ی بالا)"), "bell");
    });
    $("#dmode", el).addEventListener("change", (e) => { set({ mode: e.target.value }); toast(L("Saved", "ذخیره شد"), "check"); });
    $("#dbranch", el).addEventListener("change", (e) => { set({ branch: e.target.value }); toast(L("Saved", "ذخیره شد"), "check"); });
    $("#dpay", el).addEventListener("change", (e) => { set({ pay: e.target.value }); toast(L("Saved", "ذخیره شد"), "check"); });
    $("#addr", el).addEventListener("click", () => addressSheet(paint));
    segmented($(".theme-seg", el), (v) => { set({ theme: v }); applyTheme(v, true); });
    $('input[name="reduceMotion"]', el).addEventListener("change", (e) => { set((s) => ({ prefs: { ...s.prefs, reduceMotion: e.target.checked } })); applyCalm(); });
    $('input[name="haptics"]', el).addEventListener("change", (e) => { set((s) => ({ prefs: { ...s.prefs, haptics: e.target.checked } })); haptic(10); });
    $("#inst", el)?.addEventListener("click", install);
    $("#about", el).addEventListener("click", () => sheet(`<h2>${L("About this preview", "درباره‌ی این نمونه")}</h2>
      <p class="body lead">${L("A working preview of a Coffee Conpanna app and owner panel, made by Alpha Agency from Conpanna's logo and Instagram. Ordering, check-in, loyalty, vouchers, events and notifications all work and are kept on this phone.", "یک نمونه‌ی کارا از اپ کافه کن‌پانا و پنل مدیریتش، ساخته‌ی آژانس آلفا بر اساس لوگو و اینستاگرام کن‌پانا. سفارش، ورود به کافه، باشگاه مشتریان، کوپن‌ها، رویدادها و اعلان‌ها همه کار می‌کنند و روی همین گوشی ذخیره می‌شوند.")}</p>
      <p class="body" style="margin-top:12px">${L("Placeholders until Conpanna confirms them: menu and prices, hours, events, Wi-Fi details. Payment stands in for the bank gateway.", "موارد نمونه تا تأیید کن‌پانا: منو و قیمت‌ها، ساعت کاری، رویدادها و وای‌فای. پرداخت هم جایگزین درگاه بانکی است.")}</p>
      <a class="btn btn--block" href="https://alphaa.agency" target="_blank" rel="noopener" style="margin-top:20px" dir="ltr" lang="en"><span class="lat">Powered by Alpha Agency</span></a>`, { label: L("About", "درباره") }));
    $("#wipe", el).addEventListener("click", () => sheet(`<h2>${L("Clear everything?", "همه چیز پاک شود؟")}</h2><p class="small lead">${L("Your bag, orders, stamps, points, vouchers, tickets and settings on this phone will be removed.", "سبد، سفارش‌ها، مهرها، امتیازها، کوپن‌ها، بلیت‌ها و تنظیمات روی این گوشی پاک می‌شوند.")}</p><div class="two-btn"><button class="btn btn--soft" id="no" type="button">${L("Keep", "نگه دار")}</button><button class="btn btn--danger" id="yes" type="button">${L("Clear", "پاک کن")}</button></div>`,
      { label: L("Clear data", "پاک کردن"), onMount(b) { $("#no", b).addEventListener("click", () => closeSheet()); $("#yes", b).addEventListener("click", () => { reset(); closeSheet(); applyTheme("system", true); applyCalm(); toast(L("Cleared", "پاک شد"), "trash"); paint(); }); } }));
  }
  paint();
  if (r.q.s === "notif") setTimeout(() => $("#notif", el)?.scrollIntoView({ behavior: "smooth", block: "start" }), 200);
}
settings.meta = { title: ["Settings", "تنظیمات"], back: true, parent: "#/profile" };
