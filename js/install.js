// Add to Home Screen: Chrome/Android hands us a prompt; iOS needs the Share sheet.
import { sheet, icon, toast, L } from "./ui.js";
let deferred = null;
addEventListener("beforeinstallprompt", (e) => { e.preventDefault(); deferred = e; });
addEventListener("appinstalled", () => { deferred = null; toast(L("Conpanna is on your home screen", "کن‌پانا به صفحه‌ی اصلی اضافه شد"), "check"); });
export const installed = () => matchMedia("(display-mode: standalone)").matches || navigator.standalone === true;
export async function install() {
  if (installed()) { toast(L("Already on your home screen", "قبلاً اضافه شده"), "check"); return; }
  if (deferred) { deferred.prompt(); try { await deferred.userChoice; } catch (e) {} deferred = null; return; }
  const ios = /iphone|ipad|ipod/i.test(navigator.userAgent) || (navigator.platform === "MacIntel" && navigator.maxTouchPoints > 1);
  sheet(`<h2>${L("Add Conpanna to your home screen", "کن‌پانا رو بذار رو صفحه‌ی اصلی")}</h2><p class="small lead">${L("It opens full-screen like an app, works offline for the menu, and can send you order updates.", "مثل یه اپ تمام‌صفحه باز می‌شه، منو آفلاین هم کار می‌کنه و وضعیت سفارشت رو خبر می‌ده.")}</p>
    <div class="group" style="margin-top:16px">
      ${ios ? `<div class="row"><span class="row-ic" style="--c:#2F7BF6">${icon("share")}</span><span class="row-main"><span class="row-t">${L("1. Tap Share", "۱. دکمه‌ی اشتراک‌گذاری")}</span><span class="row-s">${L("The square with the arrow, in Safari's toolbar", "مربع با فلش، تو نوار سافاری")}</span></span></div>
      <div class="row"><span class="row-ic" style="--c:#45281A">${icon("plus")}</span><span class="row-main"><span class="row-t">${L("2. Add to Home Screen", "۲. Add to Home Screen")}</span><span class="row-s">${L("Scroll the list if you don't see it", "اگه ندیدیش، لیست رو بکش پایین")}</span></span></div>
      <div class="row"><span class="row-ic" style="--c:#3C9560">${icon("check")}</span><span class="row-main"><span class="row-t">${L("3. Tap Add", "۳. دکمه‌ی Add")}</span><span class="row-s">${L("Notifications work from the home-screen app (iOS 16.4+)", "اعلان‌ها از اپِ روی صفحه‌ی اصلی کار می‌کنن (iOS 16.4+)")}</span></span></div>`
      : `<div class="row"><span class="row-ic" style="--c:#45281A">${icon("dl")}</span><span class="row-main"><span class="row-t">${L("Open the browser menu", "منوی مرورگر رو باز کن")}</span><span class="row-s">${L("⋮ in Chrome, then “Install app” or “Add to Home screen”", "⋮ تو کروم، بعد «Install app» یا «Add to Home screen»")}</span></span></div>`}
    </div>`, { label: L("Install", "نصب") });
}
