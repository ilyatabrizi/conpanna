# Coffee Conpanna — web app preview

An installable preview of a Coffee Conpanna app, built by Alpha Agency from Conpanna's logo and Instagram.

- Live app: https://ilyatabrizi.github.io/conpanna/
- Owner panel: https://ilyatabrizi.github.io/conpanna/admin.html (demo PIN 1234)
- Languages: Persian (RTL, IRANYekanX, Persian digits, Jalali dates) and English, switchable anywhere
- Pages: Home · Menu · Check-in · Events · Profile, plus Bag, Order tracking, Orders, Rewards and Settings
- Ordering: Delivery or Takeaway from the four branches (Tabriz Valiasr, ElahiParast, Aseman, Esfahan), options, "goes well with" pairings, vouchers, promo codes, stamp rewards, preview payment, live tracking
- Club (CRM): Crema / Panna / Gold Panna tiers, points, stamp card, vouchers (welcome, birthday, referral, campaign), invite codes, monthly challenge, gift a coffee, "your usual"
- Owner panel: dashboard, live order board, menu availability and prices, customer segments and profiles, campaigns, automations, loyalty rules, events, reviews, branch pause
- App ↔ panel sync: on one device the two talk instantly (`js/hub.js`); a real server replaces that file for production
- Build: `python3 build.py` before every deploy (stamps versions, inlines the opening logo, writes index.html, admin.html and sw.js)

Placeholders until Conpanna confirms: menu names and prices, hours, events, Wi-Fi details; panel history is demo data.

Powered by Alpha Agency.
