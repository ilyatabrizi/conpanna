# Coffee Conpanna — web app preview

An installable preview of a Coffee Conpanna app, built by Alpha Agency from Conpanna's logo and Instagram.

- Live app: https://ilyatabrizi.github.io/conpanna/
- Owner panel: https://ilyatabrizi.github.io/conpanna/admin.html (demo PIN 1234)
- Language: Persian (RTL, IRANYekanX, Persian digits, Jalali dates); the tab bar and Alpha signature stay English
- Pages: Home · Menu · Check-in · Events · Profile, plus Bag, Order tracking, Orders, Rewards and Settings
- Ordering: takeaway only, from the five branches (Tabriz: Valiasr, ElahiParast, Aseman, Laleh Park; Esfahan)
- Club (CRM): Crema / Panna / Gold Panna tiers, points, stamp card, vouchers (welcome, birthday, referral, campaign), invite codes, monthly challenge, gift a coffee, "your usual"
- CEO panel (پنل مدیرعامل): dashboard and alerts, live order board, sales (heat map, payment and channel mix, discounts), P&L with VAT, payroll, rent and expense entry, monthly goals with projection, 7-day forecast and a price what-if, menu engineering, customer insight (RFM groups, cohorts, churn, LTV), branch comparison and pause, inventory with purchase orders, suppliers and waste, staff performance, shift grid and payroll, service quality, checklists and maintenance, scheduled reports, Excel exports and a print pack, roles and permissions with an audit log, plus menu, customers, campaigns, automations, loyalty, events and reviews
- Customer file (پرونده‌ی مشتری): every member with search, segments, filters and bulk actions, and a profile per person: contact and consent, how they found us, habits (when they come, what they drink, branches, oat milk, app use), value and churn risk, next best action, notes, tags, follow-ups, messages, loyalty ledger, full timeline and order history
- Panel tools: ⌘K search, till and day close, marketing and acquisition ROI, settings (VAT, card fee, SLA, low stock, float), announcements with read receipts, branch vs branch, sortable tables, chart tooltips, compact mode, collapsible sidebar, keyboard shortcuts
- Panel history: four months of seeded demo data (js/admin/seed.js) across the five branches
- App ↔ panel sync: on one device the two talk instantly (`js/hub.js`); a real server replaces that file for production
- Build: `python3 build.py` before every deploy (stamps versions, inlines the opening logo, writes index.html, admin.html and sw.js)

Placeholders until Conpanna confirms: menu names and prices, hours, events, Wi-Fi details; panel history is demo data.

Powered by Alpha Agency.
