import { $, esc, icon, toast, haptic, sheet, closeSheet, L, loc, num, digits } from "../ui.js";
import { get, set, subscribe, branch, tierOf, activeVouchers } from "../store.js";
import { BRAND } from "../data.js";
import { footer } from "./shared.js";
import { signInSheet, addressSheet } from "./bag.js";
import { active, STEPS, stageOf, stepTitle } from "../orders.js";
import { install, installed } from "../install.js";

export function notifLabel() {
  if (!("Notification" in window)) return L("Not supported", "پشتیبانی نمی‌شود");
  return Notification.permission === "granted" ? L("On", "روشن") : Notification.permission === "denied" ? L("Blocked", "مسدود") : L("Off", "خاموش");
}

export default function profile(el) {
  const paint = () => {
    const s = get(), u = s.user, a = active()[0], t = tierOf();
    const vs = activeVouchers().length;
    el.innerHTML = `
    <div class="wrap narrow page-top">
      <section class="me">
        <span class="avatar" style="--tier:${t.color}">${u ? esc(u.name[0].toUpperCase()) : icon("profile")}</span>
        <div class="me-main">
          ${u ? `<h1>${esc(u.name)}</h1><p class="small"><span dir="ltr">${digits(u.phone.replace(/(\d{4})(\d{3})(\d{4})/, "$1 $2 $3"))}</span> · <span class="tier-pill" style="--tier:${t.color}">${esc(loc(t))}</span></p>`
              : `<h1>${L("Hello there", "سلام!")}</h1><p class="small">${L("Sign in to keep your stamps, points, orders and tickets.", "وارد شوید تا مهرها، امتیازها، سفارش‌ها و بلیت‌هایتان بماند.")}</p>`}
        </div>
        ${u ? `<button class="icon-btn" id="edit" type="button" aria-label="${L("Edit profile", "ویرایش پروفایل")}">${icon("edit")}</button>` : ""}
      </section>
      ${u ? "" : `<button class="btn btn--block" id="signin" type="button" style="margin-top:16px">${icon("phone")}${L("Join with your number · 20% off", "عضویت با شماره · ٪۲۰ تخفیف")}</button>`}

      <div class="stats">
        <a href="#/rewards"><b>${num(s.points)}</b><span>${L("Points", "امتیاز")}</span></a>
        <a href="#/checkin"><b>${num(s.stamps)}</b><span>${L("Stamps", "مهر")}</span></a>
        <a href="#/rewards"><b>${num(vs)}</b><span>${L("Vouchers", "کوپن")}</span></a>
      </div>

      ${a ? `<a class="live-order" href="#/order/${a.id}" style="margin-top:14px"><span class="lo-code">#${digits(a.code)}</span><span class="row-main"><span class="eyebrow">${L("In progress", "در جریان")} · ${esc(loc(branch(a.branch)))}</span><span class="t3">${esc(stepTitle(STEPS[a.mode][stageOf(a)]))}</span></span>${icon("chev", "chev")}</a>` : ""}

      <p class="group-label">${L("Your Conpanna", "کن‌پانای شما")}</p>
      <div class="group">
        <a class="row" href="#/rewards"><span class="row-ic" style="--c:#B4682F">${icon("gift")}</span><span class="row-main"><span class="row-t">${L("Rewards & tier", "جوایز و سطح عضویت")}</span><span class="row-s">${esc(loc(t))} · ${L(`${num(s.points)} points`, `${num(s.points)} امتیاز`)}</span></span>${icon("chev", "chev")}</a>
        <a class="row" href="#/rewards?s=invite"><span class="row-ic" style="--c:#6A5ACD">${icon("users")}</span><span class="row-main"><span class="row-t">${L("Invite friends", "دعوت از دوستان")}</span><span class="row-s">${L("You both get a free drink", "هر دو یک نوشیدنی رایگان")}</span></span>${icon("chev", "chev")}</a>
        <a class="row" href="#/orders"><span class="row-ic" style="--c:#45281A">${icon("receipt")}</span><span class="row-main"><span class="row-t">${L("Orders", "سفارش‌ها")}</span></span><span class="row-v">${s.orders.length ? num(s.orders.length) : ""}${icon("chev", "chev")}</span></a>
        <a class="row" href="#/events"><span class="row-ic" style="--c:#8A5A2E">${icon("ticket")}</span><span class="row-main"><span class="row-t">${L("Tickets", "بلیت‌ها")}</span></span><span class="row-v">${s.tickets.length ? num(s.tickets.length) : ""}${icon("chev", "chev")}</span></a>
        <a class="row" href="#/menu?cat=fav"><span class="row-ic" style="--c:#C2553E">${icon("heartF")}</span><span class="row-main"><span class="row-t">${L("Favourites", "علاقه‌مندی‌ها")}</span></span><span class="row-v">${s.favorites.length ? num(s.favorites.length) : ""}${icon("chev", "chev")}</span></a>
        <button class="row" type="button" id="addr"><span class="row-ic" style="--c:#3C7E9A">${icon("home")}</span><span class="row-main"><span class="row-t">${L("Addresses", "آدرس‌ها")}</span></span><span class="row-v">${s.addresses.length ? num(s.addresses.length) : ""}${icon("chev", "chev")}</span></button>
      </div>

      <p class="group-label">${L("App", "اپ")}</p>
      <div class="group">
        <a class="row" href="#/settings"><span class="row-ic" style="--c:#75604F">${icon("gear")}</span><span class="row-main"><span class="row-t">${L("Settings", "تنظیمات")}</span><span class="row-s">${L("Notifications, language, theme, ordering", "اعلان‌ها، زبان، ظاهر، سفارش")}</span></span>${icon("chev", "chev")}</a>
        <a class="row" href="#/settings?s=notif"><span class="row-ic" style="--c:#E0663F">${icon("bell")}</span><span class="row-main"><span class="row-t">${L("Push notifications", "اعلان‌ها")}</span></span><span class="row-v">${notifLabel()}${icon("chev", "chev")}</span></a>
        ${installed() ? "" : `<button class="row" type="button" id="inst"><span class="row-ic" style="--c:#2F7BF6">${icon("dl")}</span><span class="row-main"><span class="row-t">${L("Add to Home Screen", "افزودن به صفحه‌ی اصلی")}</span><span class="row-s">${L("Opens full-screen, like an app", "مثل یک اپ، تمام‌صفحه باز می‌شود")}</span></span>${icon("chev", "chev")}</button>`}
        <button class="row" type="button" id="share"><span class="row-ic" style="--c:#94653A">${icon("share")}</span><span class="row-main"><span class="row-t">${L("Share Conpanna", "اشتراک‌گذاری کن‌پانا")}</span></span>${icon("chev", "chev")}</button>
        <a class="row" href="https://instagram.com/${BRAND.instagram}" target="_blank" rel="noopener"><span class="row-ic" style="--c:#C13584">${icon("ig")}</span><span class="row-main"><span class="row-t" dir="ltr">@${BRAND.instagram}</span></span>${icon("chev", "chev")}</a>
        <a class="row" href="admin.html"><span class="row-ic" style="--c:#24160F">${icon("grid")}</span><span class="row-main"><span class="row-t">${L("Owner panel", "پنل مدیریت")}</span><span class="row-s">${L("For Conpanna staff · demo PIN 1234", "برای کارکنان کن‌پانا · رمز نمونه ۱۲۳۴")}</span></span>${icon("chev", "chev")}</a>
      </div>
      ${u ? `<div class="group" style="margin-top:22px"><button class="row danger np" type="button" id="out"><span class="row-main"><span class="row-t">${L("Sign out", "خروج از حساب")}</span><span class="row-s">${L("Member since", "عضو از")} ${new Date(u.since).toLocaleDateString(L("en-GB", "fa-IR"), { month: "long", year: "numeric" })}</span></span>${icon("out")}</button></div>` : ""}
      ${footer()}
    </div>`;
    $("#signin", el)?.addEventListener("click", () => signInSheet());
    $("#edit", el)?.addEventListener("click", editProfile);
    $("#addr", el).addEventListener("click", () => addressSheet());
    $("#inst", el)?.addEventListener("click", install);
    $("#share", el).addEventListener("click", async () => {
      const data = { title: "Coffee Conpanna", text: L("Order ahead at Coffee Conpanna — Bu tat senin.", "از کن‌پانا از قبل سفارش بده — Bu tat senin."), url: location.href.split("#")[0] };
      try { if (navigator.share) await navigator.share(data); else { await navigator.clipboard.writeText(data.url); toast(L("Link copied", "لینک کپی شد"), "copy"); } } catch (e) {}
    });
    $("#out", el)?.addEventListener("click", () => {
      sheet(`<h2>${L("Sign out?", "از حساب خارج می‌شوید؟")}</h2><p class="small lead">${L("Your stamps and orders stay on this phone and come back when you sign in again.", "مهرها و سفارش‌ها روی همین گوشی می‌مانند و با ورود دوباره برمی‌گردند.")}</p><div class="two-btn"><button class="btn btn--soft" id="no" type="button">${L("Stay", "ماندن")}</button><button class="btn btn--danger" id="yes" type="button">${L("Sign out", "خروج")}</button></div>`,
        { label: L("Sign out", "خروج"), onMount(b) { $("#no", b).addEventListener("click", () => closeSheet()); $("#yes", b).addEventListener("click", () => { set({ user: null }); closeSheet(); haptic(10); toast(L("Signed out", "خارج شدید"), "out"); }); } });
    });
  };
  function editProfile() {
    const u = get().user;
    sheet(`<h2>${L("Your profile", "پروفایل شما")}</h2>
      <label class="field"><span>${L("Name", "نام")}</span><input id="pn" value="${esc(u.name)}"></label>
      <label class="field"><span>${L("Birthday", "تاریخ تولد")}</span><input id="pb" type="date" value="${esc(u.birthday || "")}" dir="ltr"></label>
      <p class="group-foot">${L("On your birthday week a drink is on us (Gold Panna: a cake).", "در هفته‌ی تولدتان یک نوشیدنی مهمان ما هستید (پانا طلایی: یک کیک).")}</p>
      <button class="btn btn--block" id="psave" type="button" style="margin-top:18px">${L("Save", "ذخیره")}</button>`, { label: L("Profile", "پروفایل"), onMount(b) {
      $("#psave", b).addEventListener("click", () => { set((s) => ({ user: { ...s.user, name: $("#pn", b).value.trim() || s.user.name, birthday: $("#pb", b).value } })); closeSheet(); toast(L("Saved", "ذخیره شد"), "check"); });
    } });
  }
  paint();
  return subscribe(paint);
}
profile.meta = { title: ["Profile", "پروفایل"] };
