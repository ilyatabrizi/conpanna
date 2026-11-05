// Business facts and the preview's placeholder content, in both languages.
// Coffee Conpanna's: the name, the logo, "Bu Tat Senin", @coffeeconpanna and the
// four branches. Ours until Conpanna confirms: menu, prices, hours, events.

export const BRAND = {
  name: "Coffee Conpanna", name_fa: "کافه کن‌پانا",
  tagline: "Bu Tat Senin", tagline_fa: "Bu Tat Senin",
  taglineEn: "This taste is yours", taglineEn_fa: "این طعم، مال توست",
  instagram: "coffeeconpanna",
  followers: "12K", followers_fa: "۱۲ هزار",
  wifi: { ssid: "Conpanna-Guest", pass: "butatsenin" },
};

export const BRANCHES = [
  { id: "valiasr", name: "Valiasr", name_fa: "ولیعصر", city: "Tabriz", city_fa: "تبریز", open: "08:00", close: "24:00", hue: 28, seats: 64,
    note: "The first Conpanna. Window bar, long tables, the slow-bar.", note_fa: "اولین کن‌پانا. بار کنار پنجره، میزهای بلند و اسلوبار.", query: "Coffee Conpanna Valiasr Tabriz" },
  { id: "elahiparast", name: "ElahiParast", name_fa: "الهی‌پرست", city: "Tabriz", city_fa: "تبریز", open: "08:30", close: "24:00", hue: 18, seats: 40,
    note: "Street-corner café with the outdoor benches.", note_fa: "کافه‌ی سرِ نبش با نیمکت‌های بیرون.", query: "Coffee Conpanna ElahiParast Tabriz" },
  { id: "aseman", name: "Aseman", name_fa: "آسمان", city: "Tabriz", city_fa: "تبریز", open: "10:00", close: "23:30", hue: 36, seats: 90,
    note: "Under the big lamp. Room for groups and laptops.", note_fa: "زیر چراغ بزرگ. جا برای جمع‌ها و لپ‌تاپ‌ها.", query: "Coffee Conpanna Aseman Tabriz" },
  { id: "esfahan", name: "Esfahan", name_fa: "اصفهان", city: "Esfahan", city_fa: "اصفهان", open: "09:00", close: "23:30", hue: 24, seats: 56,
    note: "Our first branch outside Tabriz.", note_fa: "اولین شعبه‌ی ما بیرون از تبریز.", query: "Coffee Conpanna Esfahan" },
];

export const CATEGORIES = [
  { id: "conpanna", name: "Con Panna", name_fa: "کن‌پانا" },
  { id: "hot", name: "Hot coffee", name_fa: "قهوه‌ی گرم" },
  { id: "cold", name: "Iced", name_fa: "سرد" },
  { id: "tea", name: "Tea & more", name_fa: "چای و بیشتر" },
  { id: "cake", name: "Cakes", name_fa: "کیک" },
  { id: "breakfast", name: "Breakfast", name_fa: "صبحانه" },
];

// art: how the item is drawn from above. pair: what it goes well with (upsell).
export const MENU = [
  { id: "espresso-conpanna", cat: "conpanna", name: "Espresso Con Panna", name_fa: "اسپرسو کن‌پانا", price: 120000, sig: 1, pop: 98, pair: "tiramisu",
    desc: "A double shot under a cloud of hand-whipped cream. The one we're named after.", desc_fa: "دبل‌شات زیر ابری از خامه‌ی دست‌زده. همانی که اسممان را از آن گرفته‌ایم.", art: { k: "cup", c: "#3A2116", t: "cream", bg: "#EADBC8" }, opts: "espresso" },
  { id: "caramel-conpanna", cat: "conpanna", name: "Caramel Con Panna", name_fa: "کارامل کن‌پانا", price: 165000, sig: 1, pop: 95, pair: "cheesecake",
    desc: "Espresso, milk, house caramel, whipped cream and a caramel drizzle.", desc_fa: "اسپرسو، شیر، کارامل خانگی، خامه و رگه‌ی کارامل.", art: { k: "cup", c: "#A86A34", t: "cream-drizzle", d: "#C27C38", bg: "#F1DFC6" }, opts: "milk" },
  { id: "mocha-conpanna", cat: "conpanna", name: "Mocha Con Panna", name_fa: "موکا کن‌پانا", price: 170000, sig: 1, pop: 90, pair: "chocolate-cake",
    desc: "Dark chocolate and espresso, topped with cream and cocoa dust.", desc_fa: "شکلات تلخ و اسپرسو، با خامه و پودر کاکائو.", art: { k: "cup", c: "#4A2A1C", t: "cream-cocoa", bg: "#E4D2C2" }, opts: "milk" },
  { id: "pistachio-conpanna", cat: "conpanna", name: "Pistachio Con Panna", name_fa: "پسته کن‌پانا", price: 185000, sig: 1, isNew: 1, pop: 93, pair: "croissant",
    desc: "Pistachio cream latte with crushed Ahmad Aghaei pistachios on the cream.", desc_fa: "لاته‌ی کرم پسته با پسته‌ی احمدآقایی خردشده روی خامه.", art: { k: "cup", c: "#B7B26A", t: "cream-pistachio", bg: "#E6E5CB" }, opts: "milk" },
  { id: "iced-conpanna", cat: "conpanna", name: "Iced Con Panna", name_fa: "آیس کن‌پانا", price: 175000, sig: 1, pop: 84, pair: "carrot-cake",
    desc: "Cold brew over ice, sweet cream cap, vanilla.", desc_fa: "کلدبرو روی یخ، کلاهک خامه‌ی شیرین و وانیل.", art: { k: "glass", c: "#5A3524", t: "cream", bg: "#E3D6C9" }, opts: "cold" },

  { id: "espresso", cat: "hot", name: "Espresso", name_fa: "اسپرسو", price: 95000, pop: 80, pair: "croissant",
    desc: "Our house blend, 18 g in, 36 g out. Chocolate, hazelnut, a little cherry.", desc_fa: "میکس خانگی ما؛ ۱۸ گرم قهوه، ۳۶ گرم عصاره. شکلات، فندق و کمی آلبالو.", art: { k: "cup", c: "#3B2015", t: "crema", bg: "#E7D8C7", small: 1 }, opts: "espresso" },
  { id: "americano", cat: "hot", name: "Americano", name_fa: "آمریکانو", price: 110000, pop: 82,
    desc: "Double espresso, hot water, nothing to hide.", desc_fa: "دبل اسپرسو و آب داغ. ساده و بی‌پرده.", art: { k: "cup", c: "#2E180F", t: "crema", bg: "#E9DDD0" }, opts: "black" },
  { id: "cappuccino", cat: "hot", name: "Cappuccino", name_fa: "کاپوچینو", price: 145000, pop: 88, pair: "croissant",
    desc: "Equal parts espresso and silky foam, a pinch of cocoa if you like.", desc_fa: "اسپرسو و فوم مخملی به یک اندازه، با کمی کاکائو اگر بخواهید.", art: { k: "cup", c: "#B98A5E", t: "heart", bg: "#EEE0CF" }, opts: "milk" },
  { id: "latte", cat: "hot", name: "Latte", name_fa: "لاته", price: 150000, pop: 91, pair: "cheesecake",
    desc: "Espresso and steamed milk, poured into a rosetta.", desc_fa: "اسپرسو و شیر بخارخورده، با طرح روزتا.", art: { k: "cup", c: "#C79A6D", t: "rosetta", bg: "#F0E3D3" }, opts: "milk" },
  { id: "flat-white", cat: "hot", name: "Flat White", name_fa: "فلت وایت", price: 150000, pop: 74,
    desc: "Ristretto doubles, thin microfoam, a stronger cup than a latte.", desc_fa: "دو شات ریسترتو و میکروفوم نازک؛ قوی‌تر از لاته.", art: { k: "cup", c: "#A97749", t: "heart", bg: "#ECDDCB" }, opts: "milk" },
  { id: "spanish-latte", cat: "hot", name: "Spanish Latte", name_fa: "اسپنیش لاته", price: 165000, pop: 86, pair: "carrot-cake",
    desc: "Condensed milk, espresso, steamed milk. Sweet and round.", desc_fa: "شیر عسلی، اسپرسو و شیر داغ. شیرین و گرد.", art: { k: "cup", c: "#C9A27A", t: "rosetta", bg: "#F2E6D6" }, opts: "milk" },
  { id: "v60", cat: "hot", name: "V60 · Single origin", name_fa: "وی‌۶۰ · تک‌خاستگاه", price: 190000, pop: 62,
    desc: "Hand-poured filter. Ask the bar what's on this week.", desc_fa: "دم‌آوری دستی. قهوه‌ی این هفته را از باریستا بپرسید.", art: { k: "pot", c: "#6B3A1F", bg: "#EFE2D2" }, opts: "black" },

  { id: "iced-latte", cat: "cold", name: "Iced Latte", name_fa: "آیس لاته", price: 160000, pop: 85,
    desc: "Espresso over cold milk and ice.", desc_fa: "اسپرسو روی شیر سرد و یخ.", art: { k: "glass", c: "#B68A60", t: "plain", bg: "#E5DCD0" }, opts: "cold" },
  { id: "iced-americano", cat: "cold", name: "Iced Americano", name_fa: "آیس آمریکانو", price: 120000, pop: 78,
    desc: "Double shot, cold water, plenty of ice.", desc_fa: "دبل‌شات، آب سرد و یخ فراوان.", art: { k: "glass", c: "#2F1A10", t: "plain", bg: "#E2D9CF" }, opts: "cold" },
  { id: "affogato", cat: "cold", name: "Affogato", name_fa: "آفوگاتو", price: 175000, pop: 70,
    desc: "A scoop of vanilla ice cream drowned in a hot espresso.", desc_fa: "یک اسکوپ بستنی وانیلی غرق در اسپرسوی داغ.", art: { k: "cup", c: "#5A3524", t: "scoop", bg: "#EFE3D4" }, opts: "none" },
  { id: "cold-brew", cat: "cold", name: "Cold Brew", name_fa: "کلدبرو", price: 155000, pop: 72,
    desc: "Steeped 18 hours, served black. Smooth, low acid.", desc_fa: "۱۸ ساعت دم‌کشیده، بدون شیر. نرم و کم‌اسید.", art: { k: "glass", c: "#3E2214", t: "plain", bg: "#E6DCD1" }, opts: "cold" },

  { id: "hot-chocolate", cat: "tea", name: "Hot Chocolate", name_fa: "هات چاکلت", price: 150000, pop: 81, pair: "chocolate-cake",
    desc: "Real melted chocolate and milk. With cream, naturally.", desc_fa: "شکلات واقعیِ ذوب‌شده و شیر. البته با خامه.", art: { k: "cup", c: "#5B3322", t: "cream-cocoa", bg: "#E9D6C6" }, opts: "milk" },
  { id: "matcha", cat: "tea", name: "Matcha Latte", name_fa: "ماچا لاته", price: 175000, pop: 76,
    desc: "Ceremonial-grade matcha whisked with milk.", desc_fa: "ماچای درجه‌یک، هم‌زده با شیر.", art: { k: "cup", c: "#8FA35A", t: "heart", bg: "#E1E6CF" }, opts: "milk" },
  { id: "chai", cat: "tea", name: "Masala Chai", name_fa: "ماسالا چای", price: 140000, pop: 73,
    desc: "Black tea brewed with cardamom, cinnamon, ginger and milk.", desc_fa: "چای سیاه دم‌شده با هل، دارچین، زنجبیل و شیر.", art: { k: "cup", c: "#B07A4A", t: "spice", bg: "#EFDFCB" }, opts: "milk" },
  { id: "black-tea", cat: "tea", name: "Persian Black Tea", name_fa: "چای سیاه", price: 80000, pop: 77,
    desc: "Lahijan tea in a glass, with nabat on the side.", desc_fa: "چای لاهیجان در استکان، با نبات کنارش.", art: { k: "cup", c: "#8E2F12", t: "clear", bg: "#F0DCCF", small: 1 }, opts: "none" },

  { id: "cheesecake", cat: "cake", name: "Basque Cheesecake", name_fa: "چیزکیک باسک", price: 210000, sig: 1, pop: 94, pair: "americano",
    desc: "Burnt top, soft middle. Our most-asked-for slice.", desc_fa: "رویه‌ی برشته، مغز نرم. پرطرفدارترین برش ما.", art: { k: "slice", c: "#E9C88D", top: "#6B3A1E", bg: "#F2E7D6" }, opts: "cake" },
  { id: "tiramisu", cat: "cake", name: "Tiramisu", name_fa: "تیرامیسو", price: 195000, pop: 87, pair: "espresso",
    desc: "Mascarpone, savoiardi soaked in our espresso, cocoa.", desc_fa: "ماسکارپونه، بیسکویت خیس‌خورده در اسپرسوی خودمان و کاکائو.", art: { k: "slice", c: "#EFE0C7", top: "#5A3524", dust: 1, bg: "#EDE2D3" }, opts: "cake" },
  { id: "chocolate-cake", cat: "cake", name: "Dark Chocolate Cake", name_fa: "کیک شکلات تلخ", price: 185000, pop: 83, pair: "latte",
    desc: "Three layers, ganache, a pinch of salt.", desc_fa: "سه لایه، گاناش و کمی نمک.", art: { k: "slice", c: "#4A2A1C", top: "#2E180F", bg: "#E6D7CA" }, opts: "cake" },
  { id: "carrot-cake", cat: "cake", name: "Carrot Cake", name_fa: "کیک هویج", price: 175000, pop: 71, pair: "cappuccino",
    desc: "Walnuts, warm spice, cream cheese frosting.", desc_fa: "گردو، ادویه‌ی گرم و رویه‌ی کرم‌چیز.", art: { k: "slice", c: "#D08A45", top: "#F5EBDD", bg: "#F3E3CF" }, opts: "cake" },

  { id: "croissant", cat: "breakfast", name: "Butter Croissant", name_fa: "کروسان کره‌ای", price: 120000, pop: 89, pair: "cappuccino",
    desc: "Laminated in-house every morning. Gone by noon.", desc_fa: "هر صبح در خودِ کافه لایه‌لایه می‌شود. تا ظهر تمام است.", art: { k: "plate", f: "croissant", bg: "#F1E3CD" }, opts: "warm" },
  { id: "eggs", cat: "breakfast", name: "Eggs & Sourdough", name_fa: "تخم‌مرغ و نان ساوردو", price: 260000, pop: 75, pair: "americano",
    desc: "Two eggs your way, sourdough, butter, tomatoes, herbs.", desc_fa: "دو تخم‌مرغ به سلیقه‌ی شما، نان ساوردو، کره، گوجه و سبزی.", art: { k: "plate", f: "eggs", bg: "#EEE5CF" }, opts: "none" },
  { id: "pancakes", cat: "breakfast", name: "Pancakes", name_fa: "پنکیک", price: 240000, pop: 79, pair: "latte",
    desc: "A stack of three, maple, berries and whipped cream.", desc_fa: "سه طبقه، شیره‌ی افرا، توت‌ها و خامه.", art: { k: "plate", f: "pancakes", bg: "#F1E2CB" }, opts: "none" },
];

const c = (en, fa, p = 0) => [en, fa, p];
export const OPTION_SETS = {
  espresso: [
    { id: "shot", name: "Shots", name_fa: "شات", one: true, choices: [c("Double", "دبل"), c("Triple", "تریپل", 35000)] },
    { id: "beans", name: "Beans", name_fa: "دانه", one: true, choices: [c("House blend", "میکس خانگی"), c("Single origin", "تک‌خاستگاه", 30000)] },
    { id: "cream", name: "Cream", name_fa: "خامه", one: true, choices: [c("Classic cream", "خامه‌ی معمول"), c("Extra cream", "خامه‌ی بیشتر", 15000), c("No cream", "بدون خامه")] },
  ],
  milk: [
    { id: "size", name: "Size", name_fa: "اندازه", one: true, choices: [c("Regular", "معمولی"), c("Large", "بزرگ", 30000)] },
    { id: "milk", name: "Milk", name_fa: "شیر", one: true, choices: [c("Whole", "پرچرب"), c("Oat", "جو دوسر", 35000), c("Almond", "بادام", 35000), c("Lactose-free", "بدون لاکتوز", 20000)] },
    { id: "shot", name: "Espresso", name_fa: "اسپرسو", one: true, choices: [c("Double", "دبل"), c("Extra shot", "شات اضافه", 30000), c("Decaf", "بدون کافئین")] },
    { id: "sweet", name: "Sweetness", name_fa: "شیرینی", one: true, choices: [c("Normal", "معمول"), c("Less sweet", "کم‌شیرین"), c("No sugar", "بدون شکر")] },
  ],
  black: [
    { id: "size", name: "Size", name_fa: "اندازه", one: true, choices: [c("Regular", "معمولی"), c("Large", "بزرگ", 25000)] },
    { id: "beans", name: "Beans", name_fa: "دانه", one: true, choices: [c("House blend", "میکس خانگی"), c("Single origin", "تک‌خاستگاه", 30000)] },
  ],
  cold: [
    { id: "size", name: "Size", name_fa: "اندازه", one: true, choices: [c("Regular", "معمولی"), c("Large", "بزرگ", 30000)] },
    { id: "milk", name: "Milk", name_fa: "شیر", one: true, choices: [c("Whole", "پرچرب"), c("Oat", "جو دوسر", 35000), c("Almond", "بادام", 35000)] },
    { id: "ice", name: "Ice", name_fa: "یخ", one: true, choices: [c("Normal ice", "یخ معمول"), c("Light ice", "یخ کم")] },
    { id: "sweet", name: "Sweetness", name_fa: "شیرینی", one: true, choices: [c("Normal", "معمول"), c("Less sweet", "کم‌شیرین"), c("No sugar", "بدون شکر")] },
  ],
  cake: [
    { id: "warm", name: "Serve", name_fa: "سرو", one: true, choices: [c("As it is", "همین‌طور"), c("Warmed", "گرم‌شده")] },
    { id: "side", name: "On the side", name_fa: "همراه", one: false, choices: [c("Vanilla ice cream", "بستنی وانیلی", 55000), c("Whipped cream", "خامه", 20000)] },
  ],
  warm: [
    { id: "warm", name: "Serve", name_fa: "سرو", one: true, choices: [c("Warmed", "گرم‌شده"), c("As it is", "همین‌طور")] },
    { id: "side", name: "On the side", name_fa: "همراه", one: false, choices: [c("Butter & jam", "کره و مربا", 30000), c("Nutella", "نوتلا", 45000)] },
  ],
  none: [],
};

export const EVENTS = [
  { id: "latte-art", title: "Latte Art Workshop", title_fa: "کارگاه لاته‌آرت", branch: "valiasr", day: 2, time: "17:00", dur: 120, seats: 12, taken: 9, price: 450000, kind: "Workshop", kind_fa: "کارگاه", hue: 26,
    host: "Head barista team", host_fa: "تیم سرباریستا", desc: "Steam, pour, repeat. Two hours on the machine learning the heart, the tulip and the rosetta. Milk, beans and your own cups included; you leave with a certificate and a bag of house blend.", desc_fa: "بخار، ریختن، تکرار. دو ساعت پشت دستگاه برای یادگرفتن قلب، لاله و روزتا. شیر، قهوه و فنجان‌ها با ما؛ با گواهی و یک بسته میکس خانگی برمی‌گردید." },
  { id: "acoustic", title: "Acoustic Night", title_fa: "شب آکوستیک", branch: "aseman", day: 1, time: "20:30", dur: 150, seats: 70, taken: 41, price: 0, kind: "Music", kind_fa: "موسیقی", hue: 34,
    host: "Live set · local artists", host_fa: "اجرای زنده · هنرمندان تبریز", desc: "Unplugged covers and a few originals under the big lamp. Free entry with any order; tables are held for the first ninety minutes.", desc_fa: "اجرای بی‌پلاگ و چند قطعه‌ی تازه زیر چراغ بزرگ. ورود با هر سفارش رایگان است؛ میزها تا نود دقیقه‌ی اول نگه داشته می‌شوند." },
  { id: "cupping", title: "Cupping: Single Origins", title_fa: "کاپینگ قهوه‌های تک‌خاستگاه", branch: "elahiparast", day: 4, time: "18:00", dur: 90, seats: 10, taken: 4, price: 290000, kind: "Tasting", kind_fa: "مزه‌کردن", hue: 20,
    host: "Roastery team", host_fa: "تیم رُستری", desc: "Six coffees from Ethiopia, Colombia and Brazil, side by side. Learn to slurp, score and say what you taste.", desc_fa: "شش قهوه از اتیوپی، کلمبیا و برزیل کنار هم. یاد بگیرید بچشید، امتیاز بدهید و طعم را توصیف کنید." },
  { id: "board-games", title: "Board Game Night", title_fa: "شب بازی‌های رومیزی", branch: "esfahan", day: 3, time: "19:00", dur: 180, seats: 32, taken: 18, price: 0, kind: "Community", kind_fa: "دورهمی", hue: 30,
    host: "Conpanna Esfahan", host_fa: "کن‌پانا اصفهان", desc: "Catan, Codenames, Dixit and a stack more. Come alone and we'll find you a table.", desc_fa: "کاتان، کدنیمز، دیکسیت و کلی بازی دیگر. تنها هم بیایید، برایتان میز پیدا می‌کنیم." },
  { id: "book-club", title: "Coffee & Pages", title_fa: "قهوه و کتاب", branch: "valiasr", day: 7, time: "11:00", dur: 90, seats: 16, taken: 11, price: 0, kind: "Book club", kind_fa: "باشگاه کتاب", hue: 22,
    host: "Monthly book club", host_fa: "باشگاه کتاب ماهانه", desc: "This month: short stories. Read one, bring one, talk about both. First drink is on us.", desc_fa: "این ماه: داستان کوتاه. یکی بخوانید، یکی بیاورید، درباره‌ی هر دو حرف بزنیم. نوشیدنی اول مهمان ما." },
  { id: "home-barista", title: "Barista Basics at Home", title_fa: "باریستای خانگی", branch: "elahiparast", day: 9, time: "16:00", dur: 120, seats: 8, taken: 2, price: 390000, kind: "Workshop", kind_fa: "کارگاه", hue: 24,
    host: "Head barista team", host_fa: "تیم سرباریستا", desc: "Moka pot, French press, V60 and AeroPress — what each does best and how to get it right with what you have at home.", desc_fa: "موکاپات، فرنچ‌پرس، وی‌۶۰ و ایروپرس؛ هرکدام در چه چیزی بهترند و چطور با وسایل خانه بهترین فنجان را بسازید." },
  { id: "autumn-menu", title: "Autumn Menu Tasting", title_fa: "مزه‌کردن منوی پاییزی", branch: "aseman", day: 12, time: "18:30", dur: 120, seats: 40, taken: 12, price: 0, kind: "Tasting", kind_fa: "مزه‌کردن", hue: 32,
    host: "Conpanna kitchen", host_fa: "آشپزخانه‌ی کن‌پانا", desc: "Pistachio, chestnut, persimmon. Taste the new season's drinks and cakes before they reach the menu, and vote for the ones that stay.", desc_fa: "پسته، شاه‌بلوط، خرمالو. نوشیدنی‌ها و کیک‌های فصل تازه را پیش از رسیدن به منو بچشید و به ماندنی‌ها رأی بدهید." },
];

export const PROMOS = { CONPANNA10: 0.1, BUTATSENIN: 0.15 };
export const DELIVERY = { fee: 45000, freeOver: 900000, eta: "35–45" };

// loyalty: points from spend and visits lift you through three tiers
export const TIERS = [
  { id: "crema", name: "Crema", name_fa: "کرما", min: 0, color: "#C9A57C",
    perks: ["Stamp card: 8 drinks, the 9th is free", "Birthday drink"], perks_fa: ["کارت مهر: ۸ نوشیدنی، نهمی رایگان", "نوشیدنی تولد"] },
  { id: "panna", name: "Panna", name_fa: "پانا", min: 600, color: "#E9D8BF",
    perks: ["Everything in Crema", "Free extra cream, always", "Early booking for events", "1 bonus stamp every week"], perks_fa: ["همه‌ی مزایای کرما", "خامه‌ی اضافه همیشه رایگان", "رزرو زودتر رویدادها", "هر هفته یک مهر هدیه"] },
  { id: "gold", name: "Gold Panna", name_fa: "پانا طلایی", min: 1800, color: "#E3B85C",
    perks: ["Everything in Panna", "10% off every order", "Free delivery", "A birthday cake, not just a drink"], perks_fa: ["همه‌ی مزایای پانا", "٪۱۰ تخفیف روی همه‌ی سفارش‌ها", "ارسال رایگان", "کیک تولد، نه فقط نوشیدنی"] },
];
export const POINTS = { perToman: 1 / 10000, perCheckin: 15, perReferral: 100 };

// vouchers a customer can hold (granted by sign-up, referral, birthday, challenges, campaigns)
export const VOUCHERS = {
  welcome: { title: "Welcome — 20% off", title_fa: "خوش‌آمد — ٪۲۰ تخفیف", sub: "Your first order in the app", sub_fa: "اولین سفارش در اپ", kind: "pct", value: 0.2, days: 30 },
  birthday: { title: "Birthday drink on us", title_fa: "نوشیدنی تولد مهمان ما", sub: "Any drink, your birthday week", sub_fa: "هر نوشیدنی، هفته‌ی تولدتان", kind: "drink", days: 7 },
  referral: { title: "Free Con Panna", title_fa: "کن‌پانای رایگان", sub: "Thanks for bringing a friend", sub_fa: "ممنون که دوستتان را آوردید", kind: "drink", days: 60 },
  challenge: { title: "Autumn challenge reward", title_fa: "جایزه‌ی چالش پاییز", sub: "Any cake, free", sub_fa: "هر کیک، رایگان", kind: "cake", days: 30 },
  gift: { title: "A coffee from a friend", title_fa: "قهوه‌ای از طرف یک دوست", sub: "Any drink", sub_fa: "هر نوشیدنی", kind: "drink", days: 90 },
  campaign: { title: "Offer", title_fa: "پیشنهاد ویژه", sub: "From Conpanna", sub_fa: "از طرف کن‌پانا", kind: "pct", value: 0.15, days: 14 },
};

export const CHALLENGE = { id: "autumn-3", title: "Autumn tasting", title_fa: "چالش پاییز", goal: 3,
  sub: "Try 3 different Con Panna drinks this month", sub_fa: "سه نوشیدنی کن‌پانای مختلف را این ماه امتحان کنید" };

export const STAMPS_FOR_REWARD = 8;
