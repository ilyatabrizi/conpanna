// Rewards: where the CRM shows its face to the customer — tier and perks,
// vouchers, the invite programme, the monthly challenge, gifting a coffee.
import { $, $$, esc, icon, toast, haptic, sheet, closeSheet, relDay, burst, L, loc, num, money, digits, tile, art } from "../ui.js";
import { get, set, subscribe, tierOf, nextTier, activeVouchers, voucherMeta, referralCode, grantVoucher, uid, item } from "../store.js";
import { TIERS, CHALLENGE, MENU, POINTS } from "../data.js";
import { clubCard } from "./home.js";
import { footer, payGateway, celebrate } from "./shared.js";
import { signInSheet } from "./bag.js";

export default function rewards(el, r) {
  const paint = () => {
    const s = get();
    const t = tierOf(), nx = nextTier();
    const vs = activeVouchers();
    const code = s.user ? referralCode() : null;
    const tried = (s.tried || []).length;
    const cps = MENU.filter((m) => m.cat === "conpanna");
    el.innerHTML = `
    <div class="wrap narrow page-top">
      <div class="page-head"><div><h1 class="lt">${L("Rewards", "جوایز")}</h1><p class="small">${L("Points from every order and visit, three tiers, and vouchers that find you.", "امتیاز از هر سفارش و هر بار آمدن، سه سطح عضویت و کوپن‌هایی که به شما می‌رسند.")}</p></div></div>
      ${s.user ? "" : `<button class="join-card" id="join" type="button"><span class="bell-big">${icon("gift")}</span><span class="row-main"><b>${L("Join Conpanna Club — 20% off your first order", "عضو باشگاه کن‌پانا شوید — ٪۲۰ تخفیف اولین سفارش")}</b><span>${L("Takes 20 seconds with your mobile number", "با شماره‌ی موبایل، ۲۰ ثانیه")}</span></span>${icon("chev", "chev")}</button>`}

      ${clubCard(s, { link: false })}

      <p class="group-label">${L("Tiers", "سطح‌ها")}</p>
      <div class="tiers">${TIERS.map((x) => `<div class="tier ${x.id === t.id ? "cur" : ""}" style="--tier:${x.color}"><div class="tier-top"><span class="tier-dot"></span><b>${esc(loc(x))}</b><span class="tiny">${x.min ? L(`${num(x.min)}+ pts`, `از ${num(x.min)} امتیاز`) : L("Start", "شروع")}</span>${x.id === t.id ? `<span class="tier-you">${L("You", "شما")}</span>` : ""}</div><ul>${(L(x.perks, x.perks_fa)).map((p) => `<li>${icon("check")}${esc(p)}</li>`).join("")}</ul></div>`).join("")}</div>
      <p class="group-foot">${L(`1 point for every ${num(1 / POINTS.perToman)} Toman, ${POINTS.perCheckin} for a check-in, ${POINTS.perReferral} for each friend who joins.`, `هر ${num(1 / POINTS.perToman)} تومان ۱ امتیاز، هر بار ورود به کافه ${num(POINTS.perCheckin)} امتیاز، هر دوست دعوت‌شده ${num(POINTS.perReferral)} امتیاز.`)}</p>

      <p class="group-label">${L("Your vouchers", "کوپن‌های شما")}</p>
      ${vs.length ? `<div class="vlist">${vs.map((v) => { const m = voucherMeta(v); return `<div class="voucher static"><span class="v-ic">${icon(m.kind === "pct" ? "tag" : m.kind === "cake" ? "cake" : "coffee")}</span><span class="row-main"><span class="row-t">${esc(loc(m, "title"))}</span><span class="row-s">${esc(loc(m, "sub"))} – ${L("until", "تا")} ${relDay(new Date(v.exp))}</span></span><span class="v-code lat">${esc(v.code)}</span></div>`; }).join("")}</div><a class="btn btn--soft btn--block" href="#/menu" style="margin-top:12px">${L("Use at checkout", "استفاده هنگام پرداخت")}</a>`
        : `<div class="empty sm">${icon("tag")}<p class="small">${L("No vouchers right now. Invite a friend or finish the challenge below.", "فعلاً کوپنی ندارید. یک دوست دعوت کنید یا چالش زیر را انجام دهید.")}</p></div>`}

      <section id="invite" class="invite">
        <div class="inv-art">${icon("users")}</div>
        <h2>${L("Give a Con Panna, get a Con Panna", "یک کن‌پانا بدهید، یک کن‌پانا بگیرید")}</h2>
        <p class="small">${L("Share your code. When a friend joins and orders, you both get a free drink — and you earn 100 points.", "کدتان را بفرستید. وقتی دوستتان عضو شد و سفارش داد، هر دو یک نوشیدنی رایگان می‌گیرید و ۱۰۰ امتیاز هم برای شماست.")}</p>
        ${code ? `<div class="inv-code"><span class="lat">${code}</span><button class="btn btn--sm" id="copy" type="button">${icon("copy")}${L("Copy", "کپی")}</button></div>
          <button class="btn btn--block" id="share" type="button">${icon("share")}${L("Share invite", "ارسال دعوت")}</button>
          <p class="tiny">${L(`${s.referral?.invited || 0} friends joined so far`, `تا حالا ${num(s.referral?.invited || 0)} دوست عضو شده‌اند`)}</p>`
        : `<button class="btn btn--block" id="join2" type="button">${L("Join to get your code", "برای دریافت کد عضو شوید")}</button>`}
      </section>

      <section class="challenge-big">
        <div class="sec"><h2>${L("This month's challenge", "چالش این ماه")}</h2><span class="tiny">${num(Math.min(tried, CHALLENGE.goal))}/${num(CHALLENGE.goal)}</span></div>
        <p class="small">${esc(loc(CHALLENGE, "sub"))} — ${L("reward: any cake, free.", "جایزه: یک کیک رایگان.")}</p>
        <div class="cp-row">${cps.map((m) => `<a class="cp ${s.tried?.includes(m.id) ? "on" : ""}" href="#/menu?item=${m.id}"><span class="tile sm" style="--tile:${m.art.bg}">${s.tried?.includes(m.id) ? icon("check") : art(m)}</span><span>${esc(loc(m)).replace(/ ?Con Panna| ?کن‌پانا/, "") || esc(loc(m))}</span></a>`).join("")}</div>
      </section>

      <section class="gift">
        <div class="sec"><h2>${L("Send a coffee", "یک قهوه هدیه بدهید")}</h2></div>
        <p class="small">${L("Buy a friend any drink. They get a link and pick it up at any branch.", "برای دوستتان یک نوشیدنی بخرید. لینکی دریافت می‌کند و از هر شعبه تحویل می‌گیرد.")}</p>
        <div class="gift-opts">${[["espresso-conpanna", 120000], ["caramel-conpanna", 165000], ["latte", 150000]].map(([id, p], i) => `<button class="gift-o" type="button" data-g="${id}" data-p="${p}" aria-pressed="${i === 0}">${tile(item(id), "sm")}<b>${esc(loc(item(id)))}</b>${money(p)}</button>`).join("")}</div>
        <button class="btn btn--block" id="gift" type="button" style="margin-top:12px">${icon("gift")}${L("Send it", "ارسال هدیه")}</button>
        ${(s.gifts || []).length ? `<p class="tiny" style="margin-top:10px">${L(`You've sent ${s.gifts.length} coffees`, `تا حالا ${num(s.gifts.length)} قهوه هدیه داده‌اید`)}</p>` : ""}
      </section>
      ${footer()}
    </div>`;
    wire();
  };
  function wire() {
    $("#join", el)?.addEventListener("click", () => signInSheet());
    $("#join2", el)?.addEventListener("click", () => signInSheet());
    $("#copy", el)?.addEventListener("click", async () => { try { await navigator.clipboard.writeText(get().referral.code); } catch (e) {} toast(L("Code copied", "کد کپی شد"), "copy"); haptic(6); });
    $("#share", el)?.addEventListener("click", async () => {
      const c = get().referral.code, url = location.href.split("#")[0] + `?ref=${c}`;
      const text = L(`Join me at Coffee Conpanna — use my code ${c} and we both get a free Con Panna.`, `بیا کن‌پانا! با کد ${c} عضو شو تا هر دو یک کن‌پانای رایگان بگیریم.`);
      try { if (navigator.share) await navigator.share({ title: "Coffee Conpanna", text, url }); else { await navigator.clipboard.writeText(`${text} ${url}`); toast(L("Invite copied", "دعوت کپی شد"), "copy"); } } catch (e) {}
    });
    let gid = "espresso-conpanna", gp = 120000;
    $$(".gift-o", el).forEach((x) => x.addEventListener("click", () => { gid = x.dataset.g; gp = +x.dataset.p; $$(".gift-o", el).forEach((y) => y.setAttribute("aria-pressed", y === x ? "true" : "false")); haptic(5); }));
    $("#gift", el).addEventListener("click", async () => {
      const ok = await payGateway(gp, L(`A ${item(gid).name} for a friend`, `یک ${item(gid).name_fa} برای دوستتان`));
      if (!ok) return;
      const code = "GIFT-" + uid().slice(0, 5);
      set((s) => ({ gifts: [...(s.gifts || []), { id: code, item: gid, at: Date.now() }] }));
      const url = location.href.split("#")[0] + `?gift=${code}`;
      sheet(`<div class="celebrate"><div class="cel-badge">${icon("gift")}</div><h2>${L("Your gift is ready", "هدیه‌تان آماده است")}</h2><p class="body lead">${L("Send this link to your friend. They show the code at any Conpanna.", "این لینک را برای دوستتان بفرستید. کد را در هر کن‌پانا نشان می‌دهد.")}</p><div class="inv-code" style="margin-top:16px"><span class="lat">${code}</span></div><button class="btn btn--block" id="gshare" type="button" style="margin-top:14px">${icon("share")}${L("Send the link", "ارسال لینک")}</button></div>`, { label: L("Gift", "هدیه"), onMount(b) {
        $("#gshare", b).addEventListener("click", async () => { try { if (navigator.share) await navigator.share({ title: L("A coffee for you", "یک قهوه برای تو"), url }); else { await navigator.clipboard.writeText(url); toast(L("Link copied", "لینک کپی شد"), "copy"); } } catch (e) {} });
      } });
      paint();
    });
  }
  paint();
  const off = subscribe(paint);
  if (r.q.s === "invite") setTimeout(() => $("#invite", el)?.scrollIntoView({ behavior: "smooth", block: "center" }), 300);
  return off;
}
rewards.meta = { title: ["Rewards", "جوایز"], back: true, parent: "#/profile" };
