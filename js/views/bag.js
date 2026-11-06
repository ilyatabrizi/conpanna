import { $, $$, esc, icon, money, tile, seg, segmented, sheet, closeSheet, toast, haptic, openState, fmtTime, burst, L, loc, num, digits, relDay } from "../ui.js";
import { get, set, item, selLabel, lineTotal, setQty, totals, branch, uid, activeVouchers, voucherMeta, tierOf, addToBag, grantVoucher, referralCode, unitPrice, defaultSel, isDrink } from "../store.js";
import { DELIVERY, PROMOS, MENU } from "../data.js";
import { isSoldOut, isPaused, getHub } from "../hub.js";
import { itemSheet, branchSheet, payGateway, celebrate } from "./shared.js";
import { placeOrder } from "../orders.js";
import { currentVisit } from "./checkin.js";

function slots() {
  const out = [{ v: "asap", t: L("ASAP", "فوری"), s: L("~12 min", "~۱۲ دقیقه") }];
  const d = new Date(Date.now() + 25 * 60e3);
  d.setMinutes(Math.ceil(d.getMinutes() / 15) * 15, 0, 0);
  for (let i = 0; i < 6; i++) {
    const x = new Date(d.getTime() + i * 15 * 60e3);
    const mins = Math.round((x - Date.now()) / 60e3);
    out.push({ v: fmtTime(x), t: fmtTime(x), s: L(`in ${mins} min`, `${num(mins)} دقیقه دیگر`) });
  }
  return out;
}

export default function bag(el, r, { dock }) {
  const paint = () => {
    const s = get();
    const t = totals(s);
    const b = branch(s.branch);
    const addr = s.addresses.find((a) => a.id === s.addrId);
    const paused = isPaused(b.id);
    dock.innerHTML = "";
    if (!s.bag.length) {
      el.innerHTML = `<div class="wrap narrow page-top"><div class="page-head"><h1 class="lt">${L("Your bag", "سبد شما")}</h1></div>
        <div class="empty" style="padding-top:30px">${icon("coffee")}
        <h3>${L("Your bag is empty", "سبدتان خالی است")}</h3><p class="small">${L("Start with a Con Panna — it's what we're named after.", "با یک کن‌پانا شروع کنید؛ اسممان را از آن گرفته‌ایم.")}</p>
        <a class="btn" href="#/menu" style="margin-top:20px">${L("Open the menu", "دیدن منو")}</a></div></div>`;
      return;
    }
    const here = currentVisit();
    const vs = activeVouchers();
    const v = t.voucherObj;
    const tier = tierOf(s.points);
    // upsell: something that pairs with what's in the bag, not already in it
    const inBag = new Set(s.bag.map((l) => l.id));
    const pairId = s.bag.map((l) => item(l.id).pair).find((p) => p && !inBag.has(p) && !isSoldOut(p));
    const up = pairId && item(pairId);
    el.innerHTML = `
    <div class="wrap narrow page-top">
      <div class="page-head"><div><h1 class="lt">${L("Your bag", "سبد شما")}</h1><p class="small">${s.user ? L(`+${t.points} points – +${t.drinks} stamps with this order`, `+${num(t.points)} امتیاز – +${num(t.drinks)} مهر با این سفارش`) : L("Sign in at checkout to collect points and stamps", "هنگام پرداخت وارد شوید تا امتیاز و مهر بگیرید")}</p></div></div>

      <div class="mode-card">${seg([["delivery", L("Delivery", "ارسال"), "scooter"], ["takeaway", L("Takeaway", "بیرون‌بر"), "takeaway"]], s.mode, "big")}</div>
      ${paused ? `<div class="notice">${icon("pause")}<span>${L(`${b.name} has paused online orders for a few minutes. Choose another branch or try again soon.`, `شعبه‌ی ${b.name_fa} سفارش آنلاین را چند دقیقه متوقف کرده است. شعبه‌ی دیگری انتخاب کنید یا کمی بعد امتحان کنید.`)}</span></div>` : ""}

      <p class="group-label">${s.mode === "delivery" ? L("Deliver from", "ارسال از") : L("Pick up at", "تحویل در")}</p>
      <div class="group">
        <button class="row" type="button" id="b-branch"><span class="row-ic soft">${icon("pin")}</span><span class="row-main"><span class="row-t">${L("Conpanna", "کن‌پانا")} ${esc(loc(b))}</span><span class="row-s">${esc(loc(b, "city"))} – ${openState(b).label}</span></span>${icon("chev", "chev")}</button>
        ${s.mode === "delivery" ? `
        <button class="row" type="button" id="b-addr"><span class="row-ic soft">${icon("home")}</span><span class="row-main"><span class="row-t">${addr ? esc(addr.label) : L("Add a delivery address", "افزودن آدرس تحویل")}</span><span class="row-s">${addr ? esc(addr.line) : L("Where should the courier go?", "پیک کجا بیاید؟")}</span></span>${icon("chev", "chev")}</button>
        <div class="row"><span class="row-ic soft">${icon("clock")}</span><span class="row-main"><span class="row-t">${L(`Arrives in ${DELIVERY.eta} min`, `رسیدن در ${digits(DELIVERY.eta)} دقیقه`)}</span><span class="row-s">${tier.id === "gold" ? L("Free delivery — Gold Panna", "ارسال رایگان — پانا طلایی") : t.fee ? L(`Free delivery over ${num(DELIVERY.freeOver)} T`, `ارسال رایگان برای خرید بالای ${num(DELIVERY.freeOver)} تومان`) : L("Delivery is on us", "ارسال مهمان ما")}</span></span></div>` : `
        <div class="row col"><span class="row-main flexline"><span class="row-ic soft">${icon("clock")}</span><span><span class="row-t">${L("Pickup time", "زمان تحویل")}</span><span class="row-s">${here ? L(`You're checked in at ${branch(here.branch).name}${here.table ? ` – we'll bring it to table ${here.table}` : ""}`, `در ${branch(here.branch).name_fa} حضور دارید${here.table ? ` – سفارش را سر میز ${digits(here.table)} می‌آوریم` : ""}`) : L("We'll have it ready on the counter", "روی پیشخوان آماده‌اش می‌کنیم")}</span></span></span>
          <div class="slots" id="slots">${slots().map((x) => `<button class="slot" type="button" data-v="${x.v}" aria-pressed="${s.pickup === x.v}"><b>${x.t}</b><span>${x.s}</span></button>`).join("")}</div></div>`}
      </div>

      <p class="group-label">${L("Order", "سفارش")}</p>
      <div class="group">${s.bag.map((l) => { const it = item(l.id); return `
        <div class="bag-line">${tile(it)}
          <div class="row-main" data-edit="${esc(l.key)}" role="button" tabindex="0"><div class="row-t">${esc(loc(it))}</div><div class="row-s">${esc(selLabel(it, l.sel) || L("As it comes", "پیش‌فرض"))} – <span class="link">${L("Edit", "ویرایش")}</span></div><div class="mi-p">${money(lineTotal(l))}</div></div>
          <div class="stepper sm" role="group"><button type="button" data-k="${esc(l.key)}" data-d="-1" aria-label="−">${icon(l.qty === 1 ? "trash" : "minus")}</button><output>${num(l.qty)}</output><button type="button" data-k="${esc(l.key)}" data-d="1" aria-label="+">${icon("plus")}</button></div>
        </div>`; }).join("")}
        <a class="row" href="#/menu"><span class="row-ic" style="--c:var(--tint);color:var(--ink-2)">${icon("plus")}</span><span class="row-main"><span class="row-t link">${L("Add more", "افزودن موارد بیشتر")}</span></span></a>
      </div>

      ${up ? `<div class="upsell">${tile(up, "sm")}<span class="row-main"><span class="eyebrow">${L("Goes well with your order", "کنار سفارشتان می‌چسبد")}</span><span class="row-t">${esc(loc(up))}</span><span class="row-s">${money(unitPrice(up, defaultSel(up)))}</span></span><button class="add" type="button" id="up-add" aria-label="${L("Add", "افزودن")}">${icon("plus")}</button></div>` : ""}

      <p class="group-label">${L("Rewards", "جوایز")}</p>
      <div class="group">
        ${s.rewards > 0 ? `<label class="row reward-row"><span class="row-ic" style="--c:var(--primary)">${icon("gift")}</span><span class="row-main"><span class="row-t">${L("Use a free drink", "استفاده از نوشیدنی رایگان")}</span><span class="row-s">${L(`${s.rewards} on your stamp card`, `${num(s.rewards)} عدد روی کارت مهر`)}${t.drinks ? "" : L(" – add a drink to use it", " – برای استفاده یک نوشیدنی اضافه کنید")}</span></span><span class="switch"><input type="checkbox" id="redeem" ${s.redeem ? "checked" : ""} ${t.drinks ? "" : "disabled"}><span class="sw-track"><span class="sw-knob"></span></span></span></label>` : ""}
        <button class="row" type="button" id="b-voucher"><span class="row-ic" style="--c:#B4682F">${icon("tag")}</span><span class="row-main"><span class="row-t">${v ? esc(loc(voucherMeta(v), "title")) : L("Vouchers", "کوپن‌ها")}</span><span class="row-s">${v ? L(`Applied – −${num(t.voucher)} T`, `اعمال شد – −${num(t.voucher)} تومان`) : vs.length ? L(`${vs.length} available`, `${num(vs.length)} کوپن قابل استفاده`) : L("None yet — sign in for 20% off your first order", "هنوز ندارید؛ با ورود، ٪۲۰ تخفیف اولین سفارش")}</span></span>${icon("chev", "chev")}</button>
        <div class="promo"><input id="promo" class="lat" dir="ltr" placeholder="${L("Promo code", "کد تخفیف")}" value="${esc(s.promo || "")}" autocomplete="off" aria-label="${L("Promo code", "کد تخفیف")}" dir="ltr"><button class="btn btn--sm ${s.promo ? "btn--soft" : ""}" type="button" id="apply">${s.promo ? L("Remove", "حذف") : L("Apply", "اعمال")}</button></div>
      </div>
      <p class="group-foot">${L("Try <b>CONPANNA10</b> for 10% off.", "کد <b class=\"lat\">CONPANNA10</b> را برای ٪۱۰ تخفیف امتحان کنید.")}</p>

      <p class="group-label">${L("Payment", "پرداخت")}</p>
      <div class="group" role="radiogroup" aria-label="${L("Payment", "پرداخت")}">
        ${[["online", "card", L("Pay online", "پرداخت آنلاین"), L("Bank card through Shaparak", "کارت بانکی از درگاه شاپرک")], ["cash", "cash", s.mode === "delivery" ? L("Pay the courier", "پرداخت به پیک") : L("Pay at the counter", "پرداخت در صندوق"), L("Card reader or cash", "کارت‌خوان یا نقد")]].map(([val, ic, l, sub]) => `
        <button class="row pay-opt" type="button" role="radio" aria-checked="${s.pay === val}" data-pay="${val}"><span class="row-ic" style="--c:var(--tint);color:var(--ink-2)">${icon(ic)}</span><span class="row-main"><span class="row-t">${l}</span><span class="row-s">${sub}</span></span><span class="radio"></span></button>`).join("")}
      </div>

      <p class="group-label">${L("Note for the barista", "یادداشت برای باریستا")}</p>
      <div class="group"><div style="padding:12px 14px"><textarea class="note-in" id="note" rows="2" placeholder="${L("Less ice, extra hot…", "یخ کمتر، داغ‌تر…")}">${esc(s.note || "")}</textarea></div></div>

      <div class="group" style="margin-top:22px"><div class="sum">
        <div><span>${L("Subtotal", "جمع")}</span>${money(t.subtotal)}</div>
        ${t.reward ? `<div class="neg"><span>${L("Free drink", "نوشیدنی رایگان")}</span><span>−${money(t.reward)}</span></div>` : ""}
        ${t.voucher ? `<div class="neg"><span>${L("Voucher", "کوپن")}</span><span>−${money(t.voucher)}</span></div>` : ""}
        ${t.discount ? `<div class="neg"><span><span class="lat">${esc(s.promo)}</span></span><span>−${money(t.discount)}</span></div>` : ""}
        ${t.tierOff ? `<div class="neg"><span>${L("Gold Panna 10%", "٪۱۰ پانا طلایی")}</span><span>−${money(t.tierOff)}</span></div>` : ""}
        ${s.mode === "delivery" ? `<div><span>${L("Delivery", "هزینه‌ی ارسال")}</span>${t.fee ? money(t.fee) : `<span class="neg">${L("Free", "رایگان")}</span>`}</div>` : ""}
        <div class="total"><span>${L("Total", "مبلغ نهایی")}</span>${money(t.total)}</div>
      </div></div>
    </div>`;

    dock.innerHTML = `<div class="checkout"><div class="co-sum"><b>${money(t.total)}</b><span>${L(`${s.bag.reduce((n, l) => n + l.qty, 0)} items`, `${num(s.bag.reduce((n, l) => n + l.qty, 0))} قلم`)} – ${s.mode === "delivery" ? L("Delivery", "ارسال") : L("Takeaway", "بیرون‌بر")}</span></div><button class="btn" id="place" type="button" ${paused ? "disabled" : ""}>${s.pay === "online" ? L("Pay & order", "پرداخت و ثبت") : L("Place order", "ثبت سفارش")}</button></div>`;
    wire();
  };

  function wire() {
    segmented($(".seg", el), (v) => { set({ mode: v }); setTimeout(paint, 280); });
    $("#b-branch", el).addEventListener("click", () => branchSheet({ onPick: paint, title: get().mode === "delivery" ? L("Deliver from", "ارسال از") : L("Pick up at", "تحویل در") }));
    $("#b-addr", el)?.addEventListener("click", () => addressSheet(paint));
    $$("#slots .slot", el).forEach((x) => x.addEventListener("click", () => { set({ pickup: x.dataset.v }); $$("#slots .slot", el).forEach((y) => y.setAttribute("aria-pressed", y === x ? "true" : "false")); haptic(5); }));
    $$(".stepper button", el).forEach((x) => x.addEventListener("click", () => { const l = get().bag.find((y) => y.key === x.dataset.k); setQty(l.key, Math.min(20, l.qty + +x.dataset.d)); haptic(5); paint(); }));
    $$("[data-edit]", el).forEach((x) => {
      const open = () => { const l = get().bag.find((y) => y.key === x.dataset.edit); itemSheet(l.id, { line: l }); };
      x.addEventListener("click", open);
      x.addEventListener("keydown", (e) => { if (e.key === "Enter") open(); });
    });
    $("#up-add", el)?.addEventListener("click", (e) => { addToBag(e.currentTarget.closest(".upsell") && get().bag.map((l) => item(l.id).pair).find((p) => p && !get().bag.some((l) => l.id === p))); haptic(10); toast(L("Added", "اضافه شد"), "bag"); paint(); });
    $("#redeem", el)?.addEventListener("change", (e) => { set({ redeem: e.target.checked }); haptic(8); paint(); });
    $("#b-voucher", el).addEventListener("click", () => voucherSheet(paint));
    $$("[data-pay]", el).forEach((x) => x.addEventListener("click", () => { set({ pay: x.dataset.pay }); haptic(5); paint(); }));
    $("#note", el).addEventListener("input", (e) => set({ note: e.target.value }));
    $("#apply", el).addEventListener("click", () => {
      if (get().promo) { set({ promo: null }); paint(); return; }
      const c = $("#promo", el).value.trim().toUpperCase();
      if (PROMOS[c]) { set({ promo: c }); toast(L(`${c} applied`, `${c} اعمال شد`), "gift"); haptic(15); paint(); }
      else { toast(L("That code isn't valid", "این کد معتبر نیست"), "info"); $("#promo", el).animate([{ transform: "translateX(-6px)" }, { transform: "translateX(6px)" }, { transform: "none" }], { duration: 260 }); }
    });
    $("#place", dock)?.addEventListener("click", place);
  }

  async function place() {
    const s = get();
    if (s.mode === "delivery" && !s.addresses.find((a) => a.id === s.addrId)) { addressSheet(paint); toast(L("Add where we should deliver", "آدرس تحویل را وارد کنید"), "home"); return; }
    if (!s.user) { const ok = await signInSheet(); if (!ok) return; paint(); return; }
    const sold = s.bag.find((l) => isSoldOut(l.id));
    if (sold) { toast(L(`${item(sold.id).name} just sold out`, `${item(sold.id).name_fa} همین الان تمام شد`), "info"); return; }
    if (s.pay === "online") { const ok = await payGateway(totals().total, L(`Order from Conpanna ${branch(s.branch).name}`, `سفارش از کن‌پانا ${branch(s.branch).name_fa}`)); if (!ok) return; }
    const btn = $("#place", dock);
    btn?.classList.add("busy");
    const { order, fresh, tierUp, challenge } = placeOrder();
    const rr = btn?.getBoundingClientRect();
    if (rr) burst(rr.left + rr.width / 2, rr.top + rr.height / 2);
    setTimeout(() => location.replace(`#/order/${order.id}`), 200);
    setTimeout(() => {
      if (challenge) { grantVoucher("challenge"); celebrate({ icon: "cake", title: L("Challenge complete!", "چالش انجام شد!"), body: L("Three Con Pannas tried. A free cake is waiting in your rewards.", "سه کن‌پانا را چشیدید. یک کیک رایگان در جوایزتان منتظر است."), cta: L("See rewards", "دیدن جوایز"), href: "#/rewards" }); }
      else if (tierUp) celebrate({ icon: "crown", title: L(`Welcome to ${tierUp.name}`, `به سطح ${tierUp.name_fa} خوش آمدید`), body: L(tierUp.perks.join(" – "), tierUp.perks_fa.join(" – ")), cta: L("See your perks", "دیدن مزایا"), href: "#/rewards" });
      else if (fresh) toast(L("Stamp card full — a free drink is yours", "کارت مهر پر شد؛ یک نوشیدنی رایگان مال شماست"), "gift");
    }, 900);
  }

  paint();
  return () => { dock.innerHTML = ""; };
}
bag.meta = { title: ["Your bag", "سبد شما"], back: true, parent: "#/menu" };

/* --------------------------------------------------------------- vouchers */
export function voucherSheet(done) {
  const s = get(), vs = activeVouchers();
  sheet(`<h2>${L("Vouchers", "کوپن‌ها")}</h2><p class="small lead">${L("One voucher per order. Stamp-card drinks and promo codes still stack.", "در هر سفارش یک کوپن. نوشیدنی کارت مهر و کد تخفیف همچنان قابل استفاده‌اند.")}</p>
    ${vs.length ? `<div class="vlist" role="radiogroup">${vs.map((v) => { const m = voucherMeta(v); return `<button class="voucher" type="button" role="radio" aria-checked="${s.voucherId === v.id}" data-v="${v.id}"><span class="v-ic">${icon(m.kind === "pct" ? "tag" : m.kind === "cake" ? "cake" : "coffee")}</span><span class="row-main"><span class="row-t">${esc(loc(m, "title"))}</span><span class="row-s">${esc(loc(m, "sub"))} – ${L("until", "تا")} ${relDay(new Date(v.exp))}</span></span><span class="radio"></span></button>`; }).join("")}</div>
      ${s.voucherId ? `<button class="btn btn--soft btn--block" id="v-none" type="button" style="margin-top:12px">${L("Don't use a voucher", "بدون کوپن")}</button>` : ""}`
    : `<div class="empty">${icon("tag")}<h3>${L("No vouchers yet", "هنوز کوپنی ندارید")}</h3><p class="small">${L("Sign in for 20% off your first order, invite a friend, or finish a challenge.", "با ورود ٪۲۰ تخفیف اولین سفارش، با دعوت دوستان یا انجام چالش کوپن بگیرید.")}</p></div>`}`,
  { label: L("Vouchers", "کوپن‌ها"), onMount(b) {
    $$("[data-v]", b).forEach((x) => x.addEventListener("click", () => { set({ voucherId: x.dataset.v }); haptic(8); closeSheet(); done?.(); toast(L("Voucher applied", "کوپن اعمال شد"), "tag"); }));
    $("#v-none", b)?.addEventListener("click", () => { set({ voucherId: null }); closeSheet(); done?.(); });
  } });
}

/* --------------------------------------------------------------- address */
export function addressSheet(done) {
  const s = get();
  sheet(`<h2>${L("Delivery address", "آدرس تحویل")}</h2>
    ${s.addresses.length ? `<div class="group" style="margin-top:16px" role="radiogroup">${s.addresses.map((a) => `<button class="row pay-opt" type="button" role="radio" aria-checked="${a.id === s.addrId}" data-a="${a.id}"><span class="row-ic" style="--c:var(--tint);color:var(--ink-2)">${icon("home")}</span><span class="row-main"><span class="row-t">${esc(a.label)}</span><span class="row-s">${esc(a.line)}${a.unit ? "، " + esc(a.unit) : ""}</span></span><span class="radio"></span></button>`).join("")}</div><p class="group-label">${L("Add another", "افزودن آدرس دیگر")}</p>` : `<p class="small lead">${L("Add where the courier should go. It's saved for next time.", "آدرس را وارد کنید؛ برای دفعه‌های بعد ذخیره می‌شود.")}</p>`}
    <label class="field"><span>${L("Label", "عنوان")}</span><input id="a-l" placeholder="${L("Home, Office…", "خانه، محل کار…")}" value="${s.addresses.length ? "" : L("Home", "خانه")}"></label>
    <label class="field"><span>${L("Address", "آدرس")}</span><textarea id="a-a" rows="2" placeholder="${L("Street, alley, building — e.g. Valiasr, Ferdowsi St., No. 14", "خیابان، کوچه، پلاک — مثلاً ولیعصر، خیابان فردوسی، پلاک ۱۴")}"></textarea></label>
    <label class="field"><span>${L("Unit / floor", "واحد / طبقه")}</span><input id="a-u" placeholder="${L("Unit 3, 2nd floor", "واحد ۳، طبقه‌ی دوم")}"></label>
    <button class="btn btn--block" id="a-save" type="button" style="margin-top:18px">${L("Save address", "ذخیره‌ی آدرس")}</button>`,
  { label: L("Delivery address", "آدرس تحویل"), onMount(b) {
    $$("[data-a]", b).forEach((x) => x.addEventListener("click", () => { set({ addrId: x.dataset.a }); haptic(5); closeSheet(); done?.(); }));
    $("#a-save", b).addEventListener("click", () => {
      const line = $("#a-a", b).value.trim();
      if (line.length < 6) { $("#a-a", b).focus(); toast(L("Add the street and number", "خیابان و پلاک را وارد کنید"), "info"); return; }
      const a = { id: uid("A"), label: $("#a-l", b).value.trim() || L("Address", "آدرس"), line, unit: $("#a-u", b).value.trim() };
      set((st) => ({ addresses: [...st.addresses, a], addrId: a.id }));
      closeSheet(); toast(L("Address saved", "آدرس ذخیره شد"), "home"); done?.();
    });
  } });
}

/* --------------------------------------------------------------- sign in */
// phone + one-time code (in the preview the code arrives as a notification),
// then a welcome voucher and an invite code — the start of the CRM record
export function signInSheet() {
  return new Promise((resolve) => {
    let ok = false, code = "";
    const toEn = (x) => x.replace(/[۰-۹]/g, (d) => "۰۱۲۳۴۵۶۷۸۹".indexOf(d)).replace(/[٠-٩]/g, (d) => "٠١٢٣٤٥٦٧٨٩".indexOf(d));
    sheet(`<div id="si"><h2>${L("Join Conpanna Club", "عضویت در باشگاه کن‌پانا")}</h2><p class="small lead">${L("Your number keeps your orders, stamps and points with you — and your first order is 20% off.", "با شماره‌تان سفارش‌ها، مهرها و امتیازها همراهتان می‌ماند؛ و اولین سفارش ٪۲۰ تخفیف دارد.")}</p>
      <label class="field"><span>${L("Mobile number", "شماره‌ی موبایل")}</span><input id="ph" type="tel" inputmode="tel" placeholder="0912 345 6789" autocomplete="tel" maxlength="13" dir="ltr"></label>
      <label class="field"><span>${L("Your name", "نام شما")}</span><input id="nm" placeholder="${L("What should the barista call you?", "باریستا شما را چه صدا کند؟")}" autocomplete="given-name"></label>
      <label class="field"><span>${L("Birthday (optional) — for a drink on us", "تاریخ تولد (اختیاری) — برای نوشیدنی مهمان ما")}</span><input id="bd" type="date" dir="ltr"></label>
      <label class="field"><span>${L("Invite code (optional)", "کد دعوت (اختیاری)")}</span><input id="rf" class="lat" placeholder="SARA42" dir="ltr" autocapitalize="characters"></label>
      <button class="btn btn--block" id="send" type="button" style="margin-top:18px">${L("Send code", "ارسال کد")}</button></div>`,
    { label: L("Sign in", "ورود"), onMount(b) {
      setTimeout(() => $("#ph", b)?.focus(), 350);
      $("#send", b).addEventListener("click", () => {
        const ph = toEn($("#ph", b).value).replace(/\D/g, "");
        const nm = $("#nm", b).value.trim(), bd = $("#bd", b).value, rf = $("#rf", b).value.trim().toUpperCase();
        if (!/^09\d{9}$/.test(ph)) { toast(L("Enter an 11-digit number starting 09", "شماره‌ی ۱۱ رقمی که با ۰۹ شروع می‌شود"), "phone"); $("#ph", b).focus(); return; }
        if (!nm) { toast(L("Add your name", "نام خود را وارد کنید"), "profile"); $("#nm", b).focus(); return; }
        code = String(Math.floor(1000 + Math.random() * 9000));
        import("../notify.js").then(({ notify }) => notify({ title: L("Coffee Conpanna", "کافه کن‌پانا"), body: L(`Your code is ${code}. It expires in 2 minutes.`, `کد شما ${digits(code)} است. تا ۲ دقیقه معتبر است.`), cat: "system" }));
        toast(L(`Code sent – ${code}`, `کد ارسال شد – ${digits(code)}`), "phone");
        $("#si", b).innerHTML = `<h2>${L("Enter the code", "کد را وارد کنید")}</h2><p class="small lead">${L("Sent to", "ارسال شد به")} <span dir="ltr">${digits(ph.replace(/(\d{4})(\d{3})(\d{4})/, "$1 $2 $3"))}</span>. <span class="tiny">${L("(Preview: it's in the message above.)", "(در این نمونه، کد در پیام بالا است.)")}</span></p>
          <div class="otp" id="otp" dir="ltr">${[0, 1, 2, 3].map(() => `<input inputmode="numeric" maxlength="1" autocomplete="one-time-code" aria-label="digit">`).join("")}</div>`;
        const ins = $$("#otp input", b);
        setTimeout(() => ins[0].focus(), 50);
        ins.forEach((inp, i) => {
          inp.addEventListener("input", () => {
            inp.value = toEn(inp.value).replace(/\D/g, "").slice(-1);
            if (inp.value && i < 3) ins[i + 1].focus();
            const v = ins.map((x) => x.value).join("");
            if (v.length === 4) {
              if (v === code) {
                ok = true;
                set({ user: { name: nm, phone: ph, since: Date.now(), birthday: bd || "", invitedBy: rf || "" } });
                if (getHub().journeys.welcome) grantVoucher("welcome");
                if (rf) grantVoucher("referral", { title: "Welcome gift from a friend", title_fa: "هدیه‌ی خوش‌آمد از طرف دوستتان" });
                referralCode();
                haptic(20); closeSheet();
                setTimeout(() => celebrate({ icon: "gift", title: L(`Welcome, ${nm}`, `${nm}، خوش آمدید`), body: L("20% off your first order is in your vouchers. Your stamps and points start now.", "٪۲۰ تخفیف اولین سفارش در کوپن‌هایتان است. مهرها و امتیازهایتان از همین حالا جمع می‌شوند."), cta: L("Continue", "ادامه"), href: location.hash || "#/" }), 380);
                resolve(true);
              } else { const o = $("#otp", b); o.classList.remove("bad"); void o.offsetWidth; o.classList.add("bad"); ins.forEach((x) => (x.value = "")); ins[0].focus(); haptic(30); }
            }
          });
          inp.addEventListener("keydown", (e) => { if (e.key === "Backspace" && !inp.value && i) ins[i - 1].focus(); });
          inp.addEventListener("paste", (e) => { const t = toEn(e.clipboardData.getData("text") || "").replace(/\D/g, "").slice(0, 4); if (t.length === 4) { e.preventDefault(); t.split("").forEach((c, k) => (ins[k].value = c)); ins[3].dispatchEvent(new Event("input")); } });
        });
      });
    }, onClose: () => { if (!ok) setTimeout(() => resolve(false), 0); } });
  });
}
