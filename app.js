// GS Bot New Shop - Основной JavaScript файл
console.log('app.js загружен');

// Экспортируем функции в глобальную область сразу при загрузке скрипта

// Инициализация корзины
let cart = [];
let cartItemCount = 0;

// Переменные для поиска
let searchTerm = '';
let isSearchActive = false;
let isCategoryFilterActive = false;
let currentCategory = localStorage.getItem('currentCategory') || '';
let searchTimeout = null;

// Переменные для бесконечной прокрутки
let currentPage = 0;
let hasMoreProducts = true;
let isLoading = false;
let loadedProductNames = new Set();

// Добавляем переменные для debounce
let categorySearchTimeout = null;
let lastCategorySearch = '';

// Утилита для "loose"-нормализации названий (для устойчивого сопоставления)
function normalizeLooseName(value) {
    let s = (value || '')
        .toLowerCase()
        .normalize('NFKD')
        // сначала убираем апострофы/кавычки без добавления пробела, чтобы d'addario → daddario
        .replace(/[`'’]/g, '')
        // прочую пунктуацию заменяем на пробелы
        .replace(/[\u2000-\u206F\u2E00-\u2E7F"“".,:;!~_*+\-—–·•()\[\]{}<>/\\|@#%^&?=]+/g, ' ')
        .replace(/\s+/g, ' ')
        .trim();
    // правка известных брендов: d addario → daddario
    s = s.replace(/\bd\s+addario\b/g, 'daddario');
    return s;
}

// Набор товаров "09 калибр электро" (именованный список, сравнение по имени в нижнем регистре)
const GAUGE_09_ELECTRIC = new Set([
    'orphee rx15 nickel alloy super light 9-42',
    'ernie ball 2248 custom gauge stainless steel 9-42',
    'ernie ball 2247 custom gauge stainless steel 9-46',
    'ghs boomers gbcl custom light 9-46',
    'ghs boomers gbxl extra light 9-42',
    'daddario exl120+-3d nickel wound 9.5-44 1 set',
    'daddario exl120-10p nickel wound super light 9-42 1 set',
    'daddario exl125-10p nickel wound super lt top reg btm 9-46 1 set',
    'daddario exl125 nickel wound super light top regular bottom 9-46',
    'daddario exl120+ nickel wound super light plus 9.5-44',
    'daddario exl120 nickel wound super light 9-42',
    'dunlop 3pden0942 nickel wound extra light 9-42 1 set',
    'dunlop den0942 nickel wound light 9-42',
    'dunlop den0946 nickel wound light/heavy 9-46',
    'ernie ball 2222 hybrid slinky 9-46',
    'ernie ball 2223 super slinky 9-42',
    'ernie ball 2212 primo slinky 9.5-44',
    'fender 250l-3 nickel plated steel light 9-42 1 set',
    'fender 250l nickel plated steel light 9-42',
    'fender 250lr nickel plated steel 9-46 light/regular',
    'ernie ball 2224 turbo slinky 9.5-46',
    'ernie ball 2239 rps super slinky 9-42',
    'ernie ball 2241 rps hybrid slinky 9-46',
    'la bella hrs-xl hard rockin steel nickel-plated extra light 9-42',
    'rotosound rh9 roto orange 9-46',
    'rotosound r9 roto pinks 9-42',
    'la bella hrs-l hard rockin steel nickel-plated light 9-46',
    'ernie ball 2253 pure nickel super slinky 9-42',
    'dunlop rwn0942 rev. willy mexican lottery billy gibbons 9-42',
    'ernie ball 2252 pure nickel hybrid slinky 9-46',
    'dean markley 2508 nickel steel 9-46 signature',
    'daddario epn120 pure nickel wound super light 9-41',
    'ghs bccl big core nickel rockers pure nickel 9.5-48 custom light',
    'dean markley 2552 blue steel light 9-42',
    'fender 3250l super bullets nickel plated steel 9-42 light',
    'ernie ball 2722 cobalt slinky 9-46',
    'ernie ball 2723 cobalt slinky 9-42',
    'daddario nyxl09544 nickel wound carbon core super light plus 9.5-44',
    'daddario nyxl0946 nickel wound carbon core custom light 9-46',
    'daddario xte0942 xt extended life super light 9-42',
    'daddario nyxl0942 nickel wound carbon core super light 9-42',
    'daddario xte0946 xt extended life super top regular bottom 9-46',
    'rotosound um9 ultramag type 52 alloy 9-42',
    'ernie ball 3122 titanium hybrid slinky 9-46',
    'ernie ball 3123 titanium super slinky 9-42',
    'ernie ball 2712 cobalt primo slinky 9.5-44',
    'elixir 16540 nanoweb super light 9-42 1 set',
    'dr nge-9/46 hi-def neon green k3 coated light top heavy bottom 9-46',
    'dr nge-9 hi-def neon green k3 coated light 9-42',
    'daddario xse0942 xs coated nickel plated super light 9-42',
    'daddario xse0946 xs coated nickel plated super light top reg btm 9-46',
    'daddario xse09544 xs coated nickel plated super light plus 9.5-44',
    'elixir 16550 optiweb nickel plated steel super light 9-42 1 set',
    'elixir 12002 nanoweb super light 9-42',
    'gibson seg-les9 les paul premium silk-wrapped pure nickel 9-42 ultra l',
    'elixir 12027 nanoweb custom light 9-46',
    'ernie ball 2022 paradigm hybrid slinky 9-46',
    'ernie ball 2018 paradigm primo slinky 9.5-44',
    'ernie ball 2023 paradigm super slinky 9-42',
    'elixir 19002 optiweb nickel plated steel super light 9-42',
    'elixir 19027 optiweb nickel plated steel custom light 9-46',
    'ernie ball 2923 m-steel super slinky 9-42',
    'ernie ball 2922 m-steel hybrid slinky 9-46',
    'ernie ball 3826 paradigm tim henson signature electric strings 9.5-46',
    'daddario exl120-3d nickel wound super light 9-42 3 sets',
    'daddario exl125-3d nickel wound 9-46 3 sets',
    'daddario exl120+-3d nickel wound 9.5-44 3 sets',
    'dunlop 3pden0942 nickel wound extra light 9-42 3 sets',
    'fender 250l-3 nickel plated steel light 9-42 3-pack',
    'ernie ball 2593 flatwound cobalt super slinky 9-42',
    'optima 2028 bm 24 karat gold plated brian may electric guitar strings 9-42',
    'elixir 16540 nanoweb super light 9-42 3 sets',
    'elixir 16550 optiweb nickel plated steel super light 9-42 3 sets',
    'ernie ball 2722 cobalt slinky 9-46 6 sets',
    'daddario exl125-10p nickel wound super lt top reg btm 9-46 10 sets',
    'ernie ball 2222 hybrid slinky 9-46 12 sets',
    'ernie ball 2223 super slinky 9-42 12 sets',
    'elixir 12002 nanoweb super light 9-42 12 sets',
    'ghs boomers gbxl 9-42 extra light 1 set',
    'dr lh-9 tite-fit nickel plated electric guitar strings light heavy 9-46',
    'fender 3250lr super bullets nickel plated steel 9-46 light/regular',
    'ghs boomers gbxl-6p 9-42 extra light 6 sets',
    'ernie ball 2723 cobalt slinky 9-42 6 sets',
    'daddario exl120-10p nickel wound super light 9-42 10 sets',
    'elixir 12027 nanoweb custom light 9-46 12 sets',
    'dean markley 2502 nickel steel 9-42 signature',
    'dean markley 2554 blue steel custom light 9-46'
].map(s => s.toLowerCase()));

// Набор товаров "10 калибр электро"
const GAUGE_10_ELECTRIC = new Set([
    'Orphee RX17 Nickel Alloy Normal Light 10-46',
    "Musicians Gear MG10-46 Nickel-Plated Electric Guitar Strings 10-46",
    'GHS Boomers GBLXL Light/Extra Light 10-38',
    'GHS Boomers GB-DGF David Gilmour 10-48',
    'GHS Boomers GBL 10-46 Regular',
    'GHS Boomers GBTNT Thin/Thick 10-52',
    'Ernie Ball 2246 Custom Gauge Stainless Steel 10-46',
    'GHS Boomers GB-DGG David Gilmour 10.5-50',
    'DAddario EXL110-10P Nickel Wound Regular Light 10-46 1 set',
    'DAddario EXL110 Nickel Wound Regular Light 10-46',
    'DAddario EXL110+ Nickel Wound Regular Light Plus 10.5-48',
    'Dunlop 3PDEN1046 Nickel Wound 10-46 Light 1 set',
    'Ernie Ball 2213 Mega Slinky 10.5-48',
    'Ernie Ball 2215 Skinny Top Heavy Bottom 10-52',
    'Ernie Ball 2221 Regular Slinky 10-46',
    'Dunlop DEN1046 Nickel Wound Light 10-46',
    'Dunlop DEN1052 Nickel Wound Light/Heavy 10-52',
    'Ernie Ball 2211 Mondo Slinky 10.5-52',
    'DR MT-10 Tite-Fit Nickel Plated Electric Guitar Strings Meduim 10-46',
    'Dunlop DHCN1048 Heavy Core 10-48',
    'Fender 250R-3 Nickel-Plated Steel 10-46 Regular 1 set',
    'DAddario EXL140-10P Nickel Wound Light Top Heavy Bottom 10-52 1 set',
    'Fender 250RH Nickel Plated Steel 10-52 Regular/Heavy',
    'GHS Boomers GBZW Heavy Bottom Zakk Wylde 10-60',
    'Fender 250R Nickel-Plated Steel 10-46 Regular',
    'Ernie Ball 2227 Ultra Slinky 10-48',
    'DAddario EXL140 Nickel Wound Light Top Heavy Bottom 10-52',
    'Ernie Ball 2240 RPS Regular Slinky 10-46',
    'DAddario EXL110-E Nickel Wound Regular Light 1-st Extra String 10-46',
    'Rotosound R10 Roto Yellows 10-46',
    'Rotosound RH10 Roto Blues 10-52',
    'Dunlop KKN1052 Kerry King Signature Medium 10-52',
    'Ernie Ball 2251 Pure Nickel Regular Slinky 10-46',
    "Dunlop RWN1046 Rev. Willy Mexican Lottery Billy Gibbons 10-46",
    'DAddario EPN110 Pure Nickel Wound Regular Light 10-45',
    'GHS BCL Big Core Nickel Rockers Pure Nickel 10.5-48 Light',
    'Dean Markley 2556 Blue Steel Regular 10-46',
    'Dunlop ZWEN1046 String Lab Zakk Wylde Signature Medium 10-46',
    'Dunlop ZWEN1052 String Lab Zakk Wylde Signature Light/Heavy 10-52',
    'DAddario NYXL1046 Nickel Wound Carbon Core Regular Light 10-46',
    'Ernie Ball 3818 Silver Slinky John Mayer Signature 1-Pack 10.5-47',
    'Ernie Ball 2721 Cobalt Slinky 10-46',
    'DAddario XTE1046 XT Extended Life Regular Light 10-46',
    'DAddario XTE1052 XT Extended Life Light Top Heavy Bottom 10-52',
    'Dunlop TVMN1052 Trivium Heavy Core Custom Set 10-52',
    'Rotosound UM10 Ultramag Type 52 Alloy 10-46',
    'DAddario NYXL1052 Nickel Wound Carbon Core LTHB 10-52',
    'Ernie Ball 2715 Cobalt Slinky 10-52',
    'Ernie Ball 2218 Silver Slinky John Mayer Signature 10.5-47',
    'Fender 3250R Super Bullets Nickel Plated Steel 10-46 Regular',
    'Ernie Ball 3115 Titanium S.T.H.B. Slinky 10-52',
    'Ernie Ball 3121 Titanium Regular Slinky 10-46',
    'Ernie Ball 2717 Cobalt Ultra Slinky 10-48',
    'Elixir 16542 Nanoweb Light 10-46 1 set',
    'DR NGE-10 Hi-Def Neon Green K3 Coated Medium 10-46',
    'DAddario XSE1046 XS Coated Nickel Plated Regular Light 10-46',
    'DAddario XSE1052 XS Coated Nickel Plated Light Top Heavy Bottom 10-52',
    'Elixir 16552 Optiweb Nickel Plated Steel Light 10-46 1 set',
    'Elixir 12052 Nanoweb Light 10-46',
    'Gibson SEG-BWR10 Brite Wire Reinforced Nickel Plated 10-46 Light',
    'Gibson SEG-LES10 Les Paul Premium Silk-Wrapped Pure Nickel 10-46 Light',
    'Elixir 12077 Nanoweb Light-Heavy 10-52',
    'Ernie Ball 2015 Paradigm Skinny Top Heavy Bottom 10-52',
    'Ernie Ball 2017 Paradigm Ultra Slinky 10-48',
    'Ernie Ball 2021 Paradigm Regular Slinky 10-46',
    'Elixir 19052 Optiweb Nickel Plated Steel Light 10-46',
    'Elixir 19077 Optiweb Nickel Plated Steel Light Heavy 10-52',
    'Ernie Ball 2921 M-Steel Regular Slinky 10-46',
    'Ernie Ball 2915 M-Steel STHB Slinky 10-52',
    'DAddario ECG23-3D Chromes Flat Wound 10-48 1 set',
    'DAddario EXL110-3D Nickel Wound Regular Light 10-46 3 sets',
    'Dunlop 3PDEN1046 Nickel Wound 10-46 Light 3 sets',
    'Ernie Ball 3213 Mega Slinky 10.5-48 3 Pack',
    'DAddario EXL140-3D Nickel Wound 10-52 3 sets',
    'Fender 250R-3 Nickel-Plated Steel 10-46 Regular 3-Pack',
    'Ernie Ball Synyster Gates Signature Stainless Steel RPS Strings 10-52',
    'Ernie Ball 2591 Flatwound Cobalt Regular Slinky 10-46',
    'Elixir 16552 Optiweb Nickel Plated Steel Light 10-46 3 sets',
    'Ernie Ball 3818 Silver Slinky John Mayer Signature 3-Pack Tin 10.5-47',
    'DAddario ECG23-3D Chromes Flat Wound 10-48 3 sets',
    'DAddario NYXL1046 Nickel Wound Carbon Core Regular 10-46 5 Pack',
    'Ernie Ball 2721 Cobalt Slinky 10-46 6 sets',
    'Ernie Ball 2715 Cobalt Slinky 10-52 6 sets',
    'GHS Boomers GBL 10-46 Regular 10 sets',
    'Ernie Ball 3818 Silver Slinky John Mayer Signature 6-Pack 10.5-47',
    'DAddario EXL110-10P Nickel Wound Regular Light 10-46 10 sets',
    'DAddario EXL140-10P Nickel Wound Light Top Heavy Bottom 10-52 10 sets',
    'GHS Boomers GB-DGF 10-48 David Gilmour 12 sets',
    'GHS Boomers GB-DGG 10.5-50 David Gilmour 12 sets',
    'Ernie Ball 2215 Skinny Top Heavy Bottom 10-52 12 sets',
    'Ernie Ball 2221 Regular Slinky 10-46 12 sets',
    'Ernie Ball 2251 Pure Nickel Regular Slinky 10-46 12 sets',
    'Elixir 12052 Nanoweb Light 10-46 12 sets',
    'GHS Boomers GBL 10-46 Regular 1 set',
    'Dunlop DHCN1060-6 Heavy Core 10-60',
    'La Bella HRS-R Hard Rockin Steel Nickel-Plated Regular 10-46',
    'Pyramid R451 100 Pure Nickel Classics Round Core 10-46 Regular',
    'Elixir 16542 Nanoweb Light 10-46 3 Sets',
    'GHS Boomers GBL-6P 10-46 Regular 6 sets',
    'Cleartone 9520 10-52 Light Top Heavy Bottom Nickel-Plated Monster',
    'Pyramid R451 100 Pure Nickel Classics Round Core 10-46 15 sets',
    'Dean Markley 2503 Nickel Steel 10-46 Signature',
    'Dean Markley 2504 Nickel Steel 10-52 Signature',
    'Dean Markley 2558 Blue Steel LTHB 10-52'
].map(s => s.toLowerCase()));

// Набор товаров "11 калибр электро"
const GAUGE_11_ELECTRIC = new Set([
    'Orphee RX19 Nickel Alloy Medium 11-50',
    'GHS Boomers GBM Medium 11-50',
    'GHS Boomers GBM 11-50 Medium 1 set',
    'Ernie Ball 2245 Custom Gauge Stainless Steel 11-48',
    'GHS Boomers GB-LOW Medium 11-53',
    'DAddario EXL115-10P Nickel Wound Medium 11-49 1 set',
    'DAddario EXL115 Nickel Wound Medium 11-49',
    'Ernie Ball 2220 Power Slinky 11-48',
    'Fender 250M Nickel-Plated Steel 11-49 Medium',
    'GHS Boomers GBTM 11-50 Medium',
    'GHS Boomers GBZWLO Heavyweight Custom Low-Tune 11-70',
    'Dunlop DEN1156 Nickel Wound Hybrid 11-56',
    'Dunlop DHCN1150 Heavier Core 11-50',
    'DAddario EXL117 Nickel Wound 11-56',
    'DAddario EXL115W Nickel Wound Medium Wound 3-rd 11-49',
    'DAddario EXL116 Nickel Wound 11-52',
    'Ernie Ball 2627 Beefy Slinky 11-54',
    'Ernie Ball 2242 RPS Power Slinky 11-48',
    'DR EH-11 Tite-Fit Nickel Plated Electric Guitar Strings Ext Hvy 11-50',
    'Rotosound R11-54 Roto Whites 11-54',
    'Ernie Ball 2250 Pure Nickel Power Slinky 11-48',
    'DAddario EPN115 Pure Nickel Wound Medium 11-48',
    'Dean Markley 2562 Blue Steel Medium 11-52',
    'DAddario NYXL1149 Nickel Wound Carbon Core Medium 11-49',
    'DAddario EHR370 Half Rounds Semi-Flat Wound Stainless Steel 11-49',
    'Ernie Ball 2720 Cobalt Slinky 11-48',
    'Dunlop JRN1156DB Jim Root Signature Drop B 11-56',
    'DAddario XTE1149 XT Extended Life Medium 11-49',
    'Dunlop BEHN1156 String Lab Behemoth Signature Custom 11-56',
    'DAddario NYXL1156 Nickel Wound Carbon Core Med. Top X-H Btm 11-56',
    'Ernie Ball 2727 Cobalt Slinky 11-54',
    'Ernie Ball 3120 Titanium Power Slinky 11-48',
    'DAddario NYXL1152 Nickel Wound Carbon Core Med. Top H. Btm. 11-52',
    'Cleartone 9456 Drop D 11-56 Nickel-Plated Monster',
    'Ernie Ball 2716 Cobalt Burly Slinky 11-52',
    'DR NGE-11 Hi-Def Neon Green K3 Coated Medium 11-50',
    'Ernie Ball 3127 Titanium Beefy Slinky 11-54',
    'DAddario XSE1156 XS Coated Nickel Plated Med Top X-Hvy Bottom 11-56',
    'DAddario XSE1149 XS Coated Nickel Plated Medium 11-49',
    'Elixir 12102 Nanoweb Medium 11-49',
    'Ernie Ball 2020 Paradigm Power Slinky 11-48',
    'Ernie Ball 2027 Paradigm Beefy Slinky 11-54',
    'Elixir 19102 Optiweb Nickel Plated Steel Medium 11-49',
    'Ernie Ball 2920 M-Steel Power Slinky 11-48',
    'DAddario ECG24-3D Chromes Flat Wound 11-50 1 set',
    'DAddario ECG24 Chromes Flat Wound Jazz Light 11-50',
    'DAddario EXL115-3D Nickel Wound 11-49 3 sets',
    'Ernie Ball 2590 Flatwound Cobalt Power Slinky 11-48',
    'Ernie Ball 2580 Flatwound Stainless Steel Flats Light 11-50',
    'Ernie Ball 3822 Paradigm Papa Hets 72 Seasons 3-Pack Tin 11-50',
    'Ernie Ball 3821 Paradigm Papa Hets Hard Wired 3-Pack Tin 11-50',
    'DAddario ECG24-3D Chromes Flat Wound 11-50 3 sets',
    'DAddario EXL115-10P Nickel Wound Medium 11-49 10 sets',
    'DAddario EXL117 Nickel Wound 11-56 10 Sets',
    'Ernie Ball 2220 Power Slinky 11-48 12 sets',
    'Rotosound R11 Roto Reds 11-48',
    'Dunlop DEN1150 Nickel Wound Medium/Heavy 11-50',
    'GHS Boomers GBM-6P 11-50 Medium 6 sets',
    'Ernie Ball 2720 Cobalt Slinky 11-48 6 sets',
    'Dean Markley 2505 Nickel Steel 11-52 Signature'
].map(s => s.toLowerCase()));

// Список Nickel Plated Electric Strings (эталонные названия)
const NICKEL_PLATED_ELECTRIC = new Set([
    'Orphee RX19 Nickel Alloy Medium 11-50',
    'Orphee RX15 Nickel Alloy Super Light 9-42',
    'Orphee RX17 Nickel Alloy Normal Light 10-46',
    "Musicians Gear MG10-46 Nickel-Plated Electric Guitar Strings 10-46",
    'GHS Boomers GBLXL Light/Extra Light 10-38',
    'GHS Boomers GBM Medium 11-50',
    'GHS Boomers GBM 11-50 Medium 1 set',
    'DAddario EXL125-10P Nickel Wound Super Lt Top Reg Btm 9-46 1 set',
    'GHS Boomers GBXL Extra Light 9-42',
    'DAddario EXL110-10P Nickel Wound Regular Light 10-46 1 set',
    'DAddario EXL115-10P Nickel Wound Medium 11-49 1 set',
    'GHS Boomers GB-DGF David Gilmour 10-48',
    'DAddario EXL120-10P Nickel Wound Super Light 9-42 1 set',
    'DAddario EXL120+-3D Nickel Wound 9.5-44 1 set',
    'GHS Boomers GB-LOW Medium 11-53',
    'GHS Boomers GBL 10-46 Regular',
    'GHS Boomers GB-DGG David Gilmour 10.5-50',
    'GHS Boomers GBCL Custom Light 9-46',
    'GHS Boomers GBTNT Thin/Thick 10-52',
    'DAddario EXL125 Nickel Wound Super Light Top Regular Bottom 9-46',
    'DAddario EXL115 Nickel Wound Medium 11-49',
    'DAddario EXL130+ Nickel Wound Extra Super Light Plus 8.5-39',
    'DAddario EXL120+ Nickel Wound Super Light Plus 9.5-44',
    'DAddario EXL110 Nickel Wound Regular Light 10-46',
    'DAddario EXL110+ Nickel Wound Regular Light Plus 10.5-48',
    'DAddario EXL120 Nickel Wound Super Light 9-42',
    'DAddario EXL130 Nickel Wound Extra Super Light 8-38',
    'Dunlop 3PDEN0942 Nickel Wound Extra Light 9-42 1 set',
    'Dunlop 3PDEN1046 Nickel Wound 10-46 Light 1 set',
    'Ernie Ball 2215 Skinny Top Heavy Bottom 10-52',
    'Rotosound R12 Roto Purples 12-52',
    'Ernie Ball 2213 Mega Slinky 10.5-48',
    'Ernie Ball 2220 Power Slinky 11-48',
    'Ernie Ball 2221 Regular Slinky 10-46',
    'Rotosound R13 Roto Greys 13-54',
    'Dunlop DEN1046 Nickel Wound Light 10-46',
    'Dunlop DEN0942 Nickel Wound Light 9-42',
    'Dunlop DEN1052 Nickel Wound Light/Heavy 10-52',
    'Dunlop DEN0946 Nickel Wound Light/Heavy 9-46',
    'Ernie Ball 2222 Hybrid Slinky 9-46',
    'Ernie Ball 2223 Super Slinky 9-42',
    'GHS Boomers GBZWLO Heavyweight Custom Low-Tune 11-70',
    'GHS Boomers GBTM 11-50 Medium',
    'Fender 250M Nickel-Plated Steel 11-49 Medium',
    'Ernie Ball 2212 Primo Slinky 9.5-44',
    'Dunlop DHCN1048 Heavy Core 10-48',
    'Dunlop DHCN1150 Heavier Core 11-50',
    'Ernie Ball 2211 Mondo Slinky 10.5-52',
    'Dunlop DHCN1254 Heaviest Core 12-54',
    'Ernie Ball 2217 Zippy Slinky 7-36',
    'DR MT-10 Tite-Fit Nickel Plated Electric Guitar Strings Meduim 10-46',
    'Dunlop DEN1156 Nickel Wound Hybrid 11-56',
    'DAddario EXL140-10P Nickel Wound Light Top Heavy Bottom 10-52 1 set',
    'Fender 250R-3 Nickel-Plated Steel 10-46 Regular 1 set',
    'DAddario EXL116-3D Nickel Wound 11-52 1 set',
    'Fender 250L-3 Nickel Plated Steel Light 9-42 1 set',
    'DAddario EXL115W Nickel Wound Medium Wound 3-rd 11-49',
    'Fender 250L Nickel Plated Steel Light 9-42',
    'Fender 250LR Nickel Plated Steel 9-46 Light/Regular',
    'GHS Boomers GBZW Heavy Bottom Zakk Wylde 10-60',
    'DAddario EXL148 Nickel Wound Extra Heavy 12-60',
    'Fender 250R Nickel-Plated Steel 10-46 Regular',
    'DAddario EXL117 Nickel Wound 11-56',
    'Fender 250RH Nickel Plated Steel 10-52 Regular/Heavy',
    'DAddario EXL145 Nickel Wound Heavy 12-54',
    'Ernie Ball 2225 Nickel Extra Slinky 8-38',
    'DAddario EXL140 Nickel Wound Light Top Heavy Bottom 10-52',
    'Ernie Ball 2228 Mighty Slinky 8.5-40',
    'Ernie Ball 2226 Burly Slinky 11-52',
    'Ernie Ball 2224 Turbo Slinky 9.5-46',
    'Ernie Ball 2227 Ultra Slinky 10-48',
    'Ernie Ball 2229 Hyper Slinky 8-42',
    'Ernie Ball 2216 Skinny Top Beefy Bottom 10-54',
    'Ernie Ball 2626 Not Even Slinky Drop Tuning 12-56',
    'Ernie Ball 2627 Beefy Slinky 11-54',
    'Ernie Ball 2214 Mammoth Slinky 12-62',
    'Ernie Ball 2240 RPS Regular Slinky 10-46',
    'Ernie Ball 2242 RPS Power Slinky 11-48',
    'Ernie Ball 2239 RPS Super Slinky 9-42',
    'Ernie Ball 2241 RPS Hybrid Slinky 9-46',
    'DAddario EXL110-E Nickel Wound Regular Light 1-st Extra String 10-46',
    'DAddario EJ21 Nickel Wound Jazz Light Wound Third 12-52',
    'Rotosound RH10 Roto Blues 10-52',
    'Rotosound R12-56 Roto Silvers 12-56',
    'Rotosound R12-60 Roto Blacks 12-60',
    'Rotosound R11-54 Roto Whites 11-54',
    'La Bella HRS-XL Hard Rockin Steel Nickel-Plated Extra Light 9-42',
    'Rotosound R10 Roto Yellows 10-46',
    'DR EH-11 Tite-Fit Nickel Plated Electric Guitar Strings Ext Hvy 11-50',
    'Rotosound R9 Roto Pinks 9-42',
    'Rotosound RH9 Roto Orange 9-46',
    'La Bella HRS-L Hard Rockin Steel Nickel-Plated Light 9-46',
    'Dunlop KKN1052 Kerry King Signature Medium 10-52',
    'Dunlop DEN1056-7 Nickel Wound 7-String 10-56',
    'Dunlop RWN0942 Rev. Willy Mexican Lottery Billy Gibbons 9-42',
    'Dunlop RWN0840 Rev. Willy Mexican Lottery Billy Gibbons 8-40',
    'Dunlop RWN0738 Rev. Willy Mexican Lottery Billy Gibbons 7-38',
    'Dunlop RWN1046 Rev. Willy Mexican Lottery Billy Gibbons 10-46',
    'Ernie Ball 2618 Magnum Slinky Drop Tuning 12-56',
    'GHS Boomers GB7L 7-String Light 9-58',
    'GHS Boomers GB7M 7-String Medium 10-60',
    'GHS Boomers GB7MH 7-String Medium Heavy 11-64',
    'DAddario EXL110-7 7-String Nickel Wound Regular Light 10-59',
    'Dean Markley 2508 Nickel Steel 9-46 Signature',
    'GHS Boomers GB7H 7-String Heavy 13-74',
    'Ernie Ball 2620 7-String Power Slinky 11-58',
    'Ernie Ball 2621 7-String Regular Slinky 10-56',
    'Ernie Ball 2623 7-String Super Slinky 9-52',
    'Ernie Ball 2839 Baritone 6 string Slinky 13-72',
    'Ernie Ball 2615 7-String Skinny Top Heavy Bottom 10-62',
    'DR TF8-11 Tite-Fit 8-String 11-80 Round Core',
    'DAddario EXL158 Nickel Wound Baritone Light 13-62',
    'Fender 3250L Super Bullets Nickel Plated Steel 9-42 Light',
    'Dunlop ZWEN1060 String Lab Zakk Wylde Signature Custom Heavy 10-60',
    'Dunlop ZWEN1046 String Lab Zakk Wylde Signature Medium 10-46',
    'Dunlop ZWEN1052 String Lab Zakk Wylde Signature Light/Heavy 10-52',
    'Dunlop ZWEN1056 String Lab Zakk Wylde Signature Light/Heavy 10-56',
    'DAddario EXL150 Nickel Wound Regular Light 12-String 10-46',
    'DAddario NYXL1149 Nickel Wound Carbon Core Medium 11-49',
    'DAddario EXL157 Nickel Wound Baritone Medium 14-68',
    'DAddario NYXL09544 Nickel Wound Carbon Core Super Light Plus 9.5-44',
    'GHS Boomers GBCL-8 8-String Custom Light 9-74',
    'Dunlop JRN1156DB Jim Root Signature Drop B 11-56',
    'Dunlop JRN1264DA Jim Root Signature Drop A 12-64',
    'Ernie Ball 3818 Silver Slinky John Mayer Signature 1-Pack 10.5-47',
    'DAddario NYXL0946 Nickel Wound Carbon Core Custom Light 9-46',
    'DAddario XTE1149 XT Extended Life Medium 11-49',
    'Dunlop BEHN1156 String Lab Behemoth Signature Custom 11-56',
    'DAddario XTE1046 XT Extended Life Regular Light 10-46',
    'DAddario XTE0946 XT Extended Life Super Top Regular Bottom 9-46',
    'DAddario XTE0942 XT Extended Life Super Light 9-42',
    'Dunlop TVMN1052 Trivium Heavy Core Custom Set 10-52',
    'Dunlop DHCN1060-7 Heavy Core 7-String 10-60',
    'DAddario NYXL0942 Nickel Wound Carbon Core Super Light 9-42',
    'DAddario XTE1052 XT Extended Life Light Top Heavy Bottom 10-52',
    'DAddario NYXL1052 Nickel Wound Carbon Core LTHB 10-52',
    'Ernie Ball 3122 Titanium Hybrid Slinky 9-46',
    'DAddario EXL120-8 Nickel Wound 8-String Super Light 9-65',
    'Ernie Ball 3123 Titanium Super Slinky 9-42',
    'DAddario NYXL1254 Nickel Wound Carbon Core Heavy 12-54',
    'Ernie Ball 2218 Silver Slinky John Mayer Signature 10.5-47',
    'La Bella HRS-72 Hard Rockin Steel Nickel-Plated 7-String 10-64',
    'DAddario NYXL1156 Nickel Wound Carbon Core Med. Top X-H Btm 11-56',
    'Ernie Ball 3120 Titanium Power Slinky 11-48',
    'Fender 3250R Super Bullets Nickel Plated Steel 10-46 Regular',
    'DAddario NYXL1260 Nickel Wound Carbon Core Extra Heavy 12-60',
    'DAddario NYXL1152 Nickel Wound Carbon Core Med. Top H. Btm. 11-52',
    'GHS Boomers GBH-8 8-String 11-85 Heavy',
    'Cleartone 9456 Drop D 11-56 Nickel-Plated Monster',
    'Cleartone 9460 Drop C# 12-60 Nickel-Plated Monster',
    'Cleartone 9470 Drop C Nickel-Plated Heavy Series 13-70',
    'Ernie Ball 2837 Bass Guitar 6 string Slinky 20-90',
    'Ernie Ball 3121 Titanium Regular Slinky 10-46',
    'Ernie Ball 3126 Titanium Not Even Slinky 12-56',
    'Ernie Ball 3115 Titanium S.T.H.B. Slinky 10-52',
    'Elixir 16540 Nanoweb Super Light 9-42 1 set',
    'Elixir 16542 Nanoweb Light 10-46 1 set',
    'Cleartone 9410-7 Light 7-String 10-56 Nickel-Plated Monster',
    'Ernie Ball 2629 8-String Regular Slinky 10-74',
    'Ernie Ball 3127 Titanium Beefy Slinky 11-54',
    'Ernie Ball 2624 9-80 8-String Skinny Top Heavy Bottom Custom Gauge',
    'Dunlop KRHCN1065 Korn Heavy Core Custom Set 7-String 10-65',
    'Dunlop BEHN1162-7 String Lab Behemoth Custom 7-String 11-62',
    'DAddario XSE09544 XS Coated Nickel Plated Super Light Plus 9.5-44',
    'DAddario XSE0942 XS Coated Nickel Plated Super Light 9-42',
    'DAddario XSE0946 XS Coated Nickel Plated Super Light Top Reg Btm 9-46',
    'DAddario XSE1046 XS Coated Nickel Plated Regular Light 10-46',
    'DAddario XSE1052 XS Coated Nickel Plated Light Top Heavy Bottom 10-52',
    'DAddario XSE1149 XS Coated Nickel Plated Medium 11-49',
    'DAddario XSE1156 XS Coated Nickel Plated Med Top X-Hvy Bottom 11-56',
    'DAddario NYXL1059 Nickel Wound Carbon Core Light 7-String 10-59',
    'DAddario NYXL1252W Nickel Wound Carbon Core Light 12-52',
    'DAddario NYXL1164 Nickel Wound Carbon Core Medium 7-String 11-64',
    'Dunlop TVMN1063-7 Trivium Heavy Core Custom Set 7-String 10-63',
    'Elixir 16552 Optiweb Nickel Plated Steel Light 10-46 1 set',
    'Ernie Ball 2625 10-74 8-String Slinky Custom Gauge',
    'Elixir 16550 Optiweb Nickel Plated Steel Super Light 9-42 1 set',
    'Gibson SEG-BWR10 Brite Wire Reinforced Nickel Plated 10-46 Light',
    'Elixir 12027 Nanoweb Custom Light 9-46',
    'Elixir 12052 Nanoweb Light 10-46',
    'Elixir 12077 Nanoweb Light-Heavy 10-52',
    'Elixir 12102 Nanoweb Medium 11-49',
    'Curt Mangan 11074 Nickel Wound 8-String 10-74',
    'Elixir 12152 Nanoweb Heavy 12-52',
    'Dunlop DEN0974-8 Nickel Wound 8-String 9-74',
    'DAddario EXL140-8 8-String Nickel Wound Light Top/Heavy BTM 10-74',
    'Elixir 12302 Nanoweb Baritone 12-68',
    'DAddario XTE1059 XT Extended Life 7-String Regular Light 10-59',
    'Ernie Ball 2018 Paradigm Primo Slinky 9.5-44',
    'Ernie Ball 2023 Paradigm Super Slinky 9-42',
    'Ernie Ball 2015 Paradigm Skinny Top Heavy Bottom 10-52',
    'Ernie Ball 2021 Paradigm Regular Slinky 10-46',
    'Ernie Ball 2022 Paradigm Hybrid Slinky 9-46',
    'Ernie Ball 2020 Paradigm Power Slinky 11-48',
    'Ernie Ball 2016 Paradigm Burly Slinky 11-52',
    'Ernie Ball 2027 Paradigm Beefy Slinky 11-54',
    'Ernie Ball 2017 Paradigm Ultra Slinky 10-48',
    'Ernie Ball 2026 Paradigm Not Even Slinky Drop Tuning 12-56',
    'Elixir 19052 Optiweb Nickel Plated Steel Light 10-46',
    'Elixir 19027 Optiweb Nickel Plated Steel Custom Light 9-46',
    'Elixir 19077 Optiweb Nickel Plated Steel Light Heavy 10-52',
    'Elixir 19102 Optiweb Nickel Plated Steel Medium 11-49',
    'Elixir 19002 Optiweb Nickel Plated Steel Super Light 9-42',
    'Ernie Ball 2028 Paradigm 7-String Regular Slinky 10-56',
    'GHS GC6-1536 Custom Shop Electric Lap Steel Strings C6 Tuning 15-36',
    'La Bella HRS-71 Hard Rockin Steel Nickel-Plated 7-String 9-64',
    'DAddario XSE1252W XS Coated Nickel Plated Jazz Light 12-52',
    'Ernie Ball 2030 Paradigm 7-String STHB 10-62',
    'DAddario XSE1056 XS Coated Nickel Plated 7-String Regular Light 10-56',
    'DAddario NYXL0980 Nickel Wound Carbon Core 8-String 9-80',
    'DAddario NYXL1074 Nickel Wound Carbon Core 8-String 10-74',
    'Elixir 12106 NanoWeb 7-String Medium 11-59',
    'Elixir 12074 Nanoweb 7-String Light/Heavy 10-59',
    'Elixir 12057 Nanoweb 7-String Light 10-56',
    'Elixir 12007 Nanoweb 7-String Super Light 9-52',
    'DAddario EXL156 Nickel Wound Guitar/Bass 24-84',
    'La Bella HRS-81 Hard Rockin Steel Nickel-Plated 8-String 9-74',
    'Elixir 19074 Optiweb Nickel Plated Steel 7-String Light/Heavy 10-59',
    'Elixir 19106 Optiweb Nickel Plated Steel 7-String Medium 11-59',
    'Elixir 19057 Optiweb Nickel Plated Steel 7-String Light 10-56',
    'Elixir 19007 Optiweb Nickel Plated Steel 7-String Super Light 9-52',
    'DAddario EXL120+-3D Nickel Wound 9.5-44 3 sets',
    'DAddario EXL120-3D Nickel Wound Super Light 9-42 3 sets',
    'DAddario EXL125-3D Nickel Wound 9-46 3 sets',
    'DAddario EXL110-3D Nickel Wound Regular Light 10-46 3 sets',
    'DAddario EXL115-3D Nickel Wound 11-49 3 sets',
    'Dunlop 3PDEN0942 Nickel Wound Extra Light 9-42 3 sets',
    'Dunlop 3PDEN1046 Nickel Wound 10-46 Light 3 sets',
    'Ernie Ball 3213 Mega Slinky 10.5-48 3 Pack',
    'Elixir 19062 Optiweb Nickel Plated Steel 8-String Light 10-74',
    'Fender 250R-3 Nickel-Plated Steel 10-46 Regular 3-Pack',
    'DAddario EXL116-3D Nickel Wound 11-52 3 sets',
    'DAddario EXL140-3D Nickel Wound 10-52 3 sets',
    'Fender 250L-3 Nickel Plated Steel Light 9-42 3-Pack',
    'Elixir 12062 Nanoweb 8-String Light 10-74',
    'Elixir 12450 Nanoweb 12-String Light 10-46',
    'Dunlop BG1268 String Lab Bjorn Gelotte In Flames Drop Bb 12-68',
    'La Bella HRS-90 Hard Rockin Steel Nickel-Plated 9-String 9-90',
    'Ernie Ball 2628 9-String Slinky Custom Gauge 9-105',
    'Elixir 16540 Nanoweb Super Light 9-42 3 Sets',
    'Elixir 16550 Optiweb Nickel Plated Steel Super Light 9-42 3 sets',
    'Elixir 16552 Optiweb Nickel Plated Steel Light 10-46 3 sets',
    'Ernie Ball 3818 Silver Slinky John Mayer Signature 3-Pack Tin 10.5-47',
    'Ernie Ball 3821 Paradigm Papa Hets Hard Wired 3-Pack Tin 11-50',
    'Ernie Ball 3822 Paradigm Papa Hets 72 Seasons 3-Pack Tin 11-50',
    'DAddario NYXL1046 Nickel Wound Carbon Core Regular 10-46 5 Pack',
    'Ernie Ball 3818 Silver Slinky John Mayer Signature 6-Pack 10.5-47',
    'GHS Boomers GBL 10-46 Regular 10 sets',
    'DAddario EXL110-10P Nickel Wound Regular Light 10-46 10 sets',
    'DAddario EXL115-10P Nickel Wound Medium 11-49 10 sets',
    'DAddario EXL125-10P Nickel Wound Super Lt Top Reg Btm 9-46 10 sets',
    'DAddario EXL140-10P Nickel Wound Light Top Heavy Bottom 10-52 10 sets',
    'DAddario EXL117 Nickel Wound 11-56 10 Sets',
    'GHS Boomers GB-DGF 10-48 David Gilmour 12 sets',
    'GHS Boomers GB-DGG 10.5-50 David Gilmour 12 sets',
    'Ernie Ball 2223 Super Slinky 9-42 12 sets',
    'Ernie Ball 2215 Skinny Top Heavy Bottom 10-52 12 sets',
    'Ernie Ball 2221 Regular Slinky 10-46 12 sets',
    'Ernie Ball 2220 Power Slinky 11-48 12 sets',
    'Ernie Ball 2222 Hybrid Slinky 9-46 12 sets',
    'Ernie Ball 2226 Burly Slinky 11-52 12 sets',
    'Ernie Ball 2214 Mammoth Slinky 12-62 12 sets',
    'Elixir 12002 Nanoweb Super Light 9-42 12 sets',
    'Elixir 12052 Nanoweb Light 10-46 12 sets',
    'GHS Boomers GBXL 9-42 Extra Light 1 set',
    'GHS Boomers GBL 10-46 Regular 1 set',
    'Rotosound R11 Roto Reds 11-48',
    'Rotosound R8 Roto Greens 8-38',
    'Dunlop DHCN1060-6 Heavy Core 10-60',
    'DR LH-9 Tite-Fit Nickel Plated Electric Guitar Strings Light Heavy 9-46',
    'Dunlop DEN1150 Nickel Wound Medium/Heavy 11-50',
    'La Bella HRS-R Hard Rockin Steel Nickel-Plated Regular 10-46',
    'GHS Boomers GB7CL 7-String Custom Light 9-62',
    'DAddario EXL120-7 Nickel Wound 7-String Super Light 9-54',
    'Fender 3250LR Super Bullets Nickel Plated Steel 9-46 Light/Regular',
    'Cleartone 9480 Drop A 14-80 Nickel-Plated Monster',
    'Elixir 16542 Nanoweb Light 10-46 3 Sets',
    'GHS Boomers GBM-6P 11-50 Medium 6 sets',
    'GHS Boomers GBXL-6P 9-42 Extra Light 6 sets',
    'GHS Boomers GBL-6P 10-46 Regular 6 sets',
    'DAddario EXL120-10P Nickel Wound Super Light 9-42 10 sets',
    'Ernie Ball 2626 Not Even Slinky Drop Tuning 12-56 12 sets',
    'Ernie Ball 2839 Baritone 6 string Slinky 13-72 12 sets',
    'DAddario NYXL0838 Nickel Wound Carbon Core Extra Super Light 8-38',
    'Cleartone 9520 10-52 Light Top Heavy Bottom Nickel-Plated Monster',
    'Ernie Ball 3125 Titanium Extra Slinky 8-38',
    'Dean Markley 2503 Nickel Steel 10-46 Signature',
    'Dean Markley 2504 Nickel Steel 10-52 Signature',
    'Dean Markley 2505 Nickel Steel 11-52 Signature',
    'Dean Markley 2502 Nickel Steel 9-42 Signature'
].map(s => s.toLowerCase()));

// Функция сохранения корзины в localStorage
function saveCartToStorage() {
    try {
        localStorage.setItem('cart', JSON.stringify(cart));
        localStorage.setItem('cartItemCount', cartItemCount.toString());
        console.log('Корзина сохранена в localStorage');
    } catch (error) {
        console.error('Ошибка сохранения корзины:', error);
    }
}

// Функция загрузки корзины из localStorage
function loadCartFromStorage() {
    try {
        const savedCart = localStorage.getItem('cart');
        const savedCount = localStorage.getItem('cartItemCount');
        
        if (savedCart) {
            cart = JSON.parse(savedCart);
            cartItemCount = parseInt(savedCount) || 0;
            console.log('Корзина загружена из localStorage:', cart.length, 'товаров');
            updateCartBadge();
            return true;
        }
    } catch (error) {
        console.error('Ошибка загрузки корзины:', error);
        // В случае ошибки очищаем localStorage
        localStorage.removeItem('cart');
        localStorage.removeItem('cartItemCount');
    }
    return false;
}

// Функция инициализации корзины
function initializeCart() {
    console.log('Корзина инициализирована');
    
    // Пытаемся загрузить корзину из localStorage
    if (!loadCartFromStorage()) {
        cart = [];
        cartItemCount = 0;
    }
}

// Функция добавления в корзину
function addToCart(product) {
    console.log('Добавление в корзину:', product);
    
    // Проверяем, есть ли уже такой товар в корзине
    const existingItemIndex = cart.findIndex(item => 
        item.name === product.name && 
        (item.newPrice || item.price) === (product.newPrice || product.price) &&
        (item.oldPrice || 0) === (product.oldPrice || 0)
    );
    
    if (existingItemIndex !== -1) {
        // Если товар уже есть в корзине, увеличиваем количество
        console.log('Товар уже есть в корзине, увеличиваем количество');
        if (!cart[existingItemIndex].quantity) {
            cart[existingItemIndex].quantity = 1;
        }
        cart[existingItemIndex].quantity++;
        cartItemCount++;
        console.log('Количество товара увеличено до:', cart[existingItemIndex].quantity);
    } else {
        // Если товара нет в корзине, добавляем новый
        console.log('Добавляем новый товар в корзину');
        cart.push(product);
        cartItemCount++;
    }
    
    updateCartBadge();
    saveCartToStorage();
}

// Функция обновления бейджа корзины
function updateCartBadge() {
    const badge = document.querySelector('.cart-badge');
    if (badge) {
        badge.textContent = cartItemCount;
        badge.style.display = cartItemCount > 0 ? 'block' : 'none';
    }
}

// Функция отображения товаров в корзине
function renderCartItems() {
    console.log('renderCartItems: Отображаем товары в корзине');
    
    const cartItemsContainer = document.querySelector('#cartItems');
    if (!cartItemsContainer) {
        console.error('renderCartItems: Контейнер #cartItems не найден');
        return;
    }
    
    if (cart.length === 0) {
        cartItemsContainer.innerHTML = '<div class="empty-cart">Корзина пуста</div>';
        return;
    }
    
    let html = '';
    cart.forEach((item, index) => {
        const oldPrice = item.oldPrice || 0;
        const newPrice = item.newPrice || item.price || 0;
        
        html += `
            <div class="cart-item" data-index="${index}">
                <div class="cart-col-name">
                    <div class="cart-item-image">
                        <img src="${item.image}" alt="${item.name}" onerror="this.src='./images/Discontinued.jpg'">
                    </div>
                                         <div class="cart-item-details">
                         <div class="cart-item-name">${item.name}</div>
                     </div>
                 </div>
                <div class="cart-col-quantity">
                    <div class="quantity-controls">
                        <button class="quantity-btn minus" onclick="changeQuantity(${index}, -1)" style="width: 20px; height: 20px; font-size: 12px; padding: 0;">-</button>
                        <span class="quantity-value" style="margin: 0 8px; font-size: 14px;">${item.quantity || 1}</span>
                        <button class="quantity-btn plus" onclick="changeQuantity(${index}, 1)" style="width: 20px; height: 20px; font-size: 12px; padding: 0;">+</button>
                    </div>
                </div>
                <div class="cart-col-total">
                    <div class="cart-item-prices">
                                                 ${oldPrice && oldPrice > 0 && oldPrice !== newPrice ? `<div class="cart-item-old-price">${(oldPrice * (item.quantity || 1)).toFixed(0)} ${getCurrencyWithDot()}</div>` : ''}
                         <div class="cart-item-price">${(newPrice * (item.quantity || 1)).toFixed(0)} ${getCurrencyWithDot()}</div>
                    </div>
                    <button class="remove-item-btn" onclick="removeFromCart(${index})">
                        <i class="fas fa-trash"></i>
                    </button>
                </div>
            </div>
        `;
    });
    
    cartItemsContainer.innerHTML = html;
}

// Функция удаления товара из корзины
function removeFromCart(index) {
    console.log('removeFromCart: Удаляем товар из корзины, индекс:', index);
    
    if (index >= 0 && index < cart.length) {
        cart.splice(index, 1);
        cartItemCount = cart.length;
        updateCartBadge();
        renderCartItems();
        updateCartCalculations();
        saveCartToStorage();
    }
}

// Функция изменения количества товара
function changeQuantity(index, change) {
    console.log('changeQuantity: Изменяем количество товара, индекс:', index, 'изменение:', change);
    
    if (index >= 0 && index < cart.length) {
        const item = cart[index];
        if (!item.quantity) {
            item.quantity = 1;
        }
        
        item.quantity += change;
        
        if (item.quantity <= 0) {
            removeFromCart(index);
        } else {
            cartItemCount = cart.reduce((total, item) => total + (item.quantity || 1), 0);
            updateCartBadge();
            renderCartItems();
            updateCartCalculations();
            saveCartToStorage();
        }
    }
}

// Функция обновления расчетов корзины
function updateCartCalculations() {
    console.log('updateCartCalculations: Обновляем расчеты корзины');
    
    let newPricesTotal = 0;
    let oldPricesTotal = 0;
    
    cart.forEach(item => {
        const newPrice = parseInt(item.newPrice || item.price || 0);
        const oldPrice = parseInt(item.oldPrice || 0);
        const quantity = item.quantity || 1;
        
        newPricesTotal += newPrice * quantity;
        if (oldPrice > 0 && oldPrice !== newPrice) {
            oldPricesTotal += oldPrice * quantity;
        } else {
            oldPricesTotal += newPrice * quantity;
        }
    });
    
    const discount = oldPricesTotal - newPricesTotal;
    
    // Получаем скидку по купону и использованные бонусы
    const couponDiscount = getCouponDiscount();
    const usedBonuses = getUsedBonuses();
    
    // Рассчитываем скидку по купону
    let couponAmount = 0;
    if (couponDiscount > 0) {
        if (couponDiscount <= 1) {
            // Процентная скидка (например, 0.10 = 10%)
            couponAmount = Math.round(newPricesTotal * couponDiscount);
        } else {
            // Фиксированная скидка в грн
            couponAmount = couponDiscount;
        }
    }
    
    // Рассчитываем общую сумму с учетом всех скидок
    const totalAfterDiscounts = newPricesTotal - couponAmount - usedBonuses;
    const finalTotal = Math.max(0, totalAfterDiscounts); // Не может быть меньше 0
    
    // Обновляем отображение итогов
    const subtotalElement = document.querySelector('#cartSubtotal');
    const discountElement = document.querySelector('#cartDiscount');
    const totalElement = document.querySelector('#cartTotalPrice');
    const payAmountElement = document.querySelector('#cartPayAmount');
    const couponElement = document.querySelector('#cartCouponUsed');
    const bonusElement = document.querySelector('#cartBonusUsed');
    
    // Обновляем способы доставки в зависимости от суммы корзины
    updateDeliveryMethods();
    
         if (subtotalElement) {
         subtotalElement.textContent = `${oldPricesTotal.toFixed(0)} ${getCurrencyWithDot()}`;
     }
     
     if (discountElement) {
         if (discount > 0) {
             discountElement.textContent = `-${discount.toFixed(0)} ${getCurrencyWithDot()}`;
             discountElement.style.display = 'block';
         } else {
             discountElement.style.display = 'none';
         }
     }
     
     // Обновляем отображение купона (только если купон валидный)
     if (couponElement) {
         if (isCouponValid() && couponAmount > 0) {
             couponElement.textContent = `-${couponAmount.toFixed(0)} ${getCurrencyWithDot()}`;
             couponElement.parentElement.style.display = 'flex';
         } else {
             couponElement.parentElement.style.display = 'none';
         }
     }
     
     // Обновляем отображение бонусов (только если используются)
     if (bonusElement) {
         if (usedBonuses > 0) {
             bonusElement.textContent = `-${usedBonuses.toFixed(0)} ${getCurrencyWithDot()}`;
             bonusElement.parentElement.style.display = 'flex';
         } else {
             bonusElement.parentElement.style.display = 'none';
         }
     }
    
         // Обновляем стоимость доставки и общую сумму
     updateDeliveryCost();
     
     if (totalElement) {
         const deliveryCost = getDeliveryCost();
         // Комиссия WayForPay отключена - не добавляем процент к итоговой сумме
         const totalWithDelivery = finalTotal + deliveryCost;
         
         // Убеждаемся, что итоговая сумма не меньше 0
         const finalAmount = Math.max(0, totalWithDelivery);
         
         totalElement.textContent = `${finalAmount.toFixed(0)} ${getCurrency()}.`;
         
         if (payAmountElement) {
             payAmountElement.textContent = `${finalAmount.toFixed(0)} ${getCurrency()}`;
         }
         
         console.log('updateCartCalculations: Расчеты завершены:', {
             newPricesTotal,
             oldPricesTotal,
             discount,
             couponAmount,
             usedBonuses,
             finalTotal,
             deliveryCost,
             totalWithDelivery,
             finalAmount
         });
     }
}

// Функция получения стоимости доставки
function getDeliveryCost() {
    const deliverySelect = document.getElementById('deliveryMethodSelect');
    if (!deliverySelect) return 0;
    
    const selectedMethod = deliverySelect.value;
    
    // Если выбрана Укрпочта, добавляем 80 грн
    if (selectedMethod === 'ukrposhta') {
        return 80;
    }
    
    // Бесплатные способы доставки - 0 грн
    if (selectedMethod === 'free1001' || selectedMethod === 'free2000') {
        return 0;
    }
    
    // Для всех остальных способов доставки - 0 грн
    return 0;
}

// Функция получения комиссии за оплату
function getPaymentCommission() {
    const paymentSelect = document.getElementById('paymentMethodSelect');
    if (!paymentSelect) return 0;
    
    const selectedMethod = paymentSelect.value;
    
    // WayForPay - 2% комиссия
    if (selectedMethod === 'wayforpay') {
        return 0.02; // 2% в виде десятичной дроби
    }
    
    // Для всех остальных способов оплаты - 0% комиссия
    return 0;
}

// Функция получения скидки по купону
function getCouponDiscount() {
    const couponInput = document.getElementById('cartCouponInput');
    if (!couponInput || !couponInput.value.trim()) return 0;
    
    const couponCode = couponInput.value.trim().toLowerCase();
    
    // Здесь можно добавить логику проверки купонов
    // Пока используем простую логику для тестирования
    if (couponCode === 'test10') {
        return 0.10; // 10% скидка
    } else if (couponCode === 'test20') {
        return 0.20; // 20% скидка
    } else if (couponCode === 'test50') {
        return 50; // 50 грн скидка
    }
    
    return 0; // Неверный купон
}

// Функция получения количества используемых бонусов
function getUsedBonuses() {
    const bonusesInput = document.getElementById('cartBonusesInput');
    if (!bonusesInput || !bonusesInput.value) return 0;
    
    const usedBonuses = parseInt(bonusesInput.value) || 0;
    const availableBonuses = 100; // В тестовом аккаунте 100 бонусов
    
    // Проверяем, что не превышает доступное количество
    if (usedBonuses > availableBonuses) {
        bonusesInput.value = availableBonuses;
        return availableBonuses;
    }
    
    return usedBonuses;
}

// Функция получения валюты в зависимости от языка
function getCurrency() {
    const currentLanguage = localStorage.getItem('selectedLanguage') || 'uk';
    return currentLanguage === 'en' ? 'UAH' : 'грн';
}

// Функция получения валюты с точкой для украинского/русского
function getCurrencyWithDot() {
    const currentLanguage = localStorage.getItem('selectedLanguage') || 'uk';
    return currentLanguage === 'en' ? 'UAH' : 'грн.';
}

// Функция проверки валидности купона
function isCouponValid() {
    const couponInput = document.getElementById('cartCouponInput');
    if (!couponInput || !couponInput.value.trim()) return false;
    
    const couponCode = couponInput.value.trim().toLowerCase();
    
    // Список валидных купонов
    const validCoupons = ['test10', 'test20', 'test50'];
    
    return validCoupons.includes(couponCode);
}

    // Функция обновления стоимости доставки и комиссии
  function updateDeliveryCost() {
      console.log('updateDeliveryCost: Обновляем стоимость доставки и комиссии');
      
      const deliveryCostElement = document.querySelector('#cartDelivery');
      const commissionElement = document.querySelector('#cartCommission');
      const deliveryCost = getDeliveryCost();
      
      // Показываем строку доставки только если выбрана платная доставка
      if (deliveryCostElement) {
          if (deliveryCost > 0) {
              deliveryCostElement.textContent = `${deliveryCost} ${getCurrency()}`;
              deliveryCostElement.parentElement.style.display = 'flex';
          } else {
              deliveryCostElement.parentElement.style.display = 'none';
          }
      }
      
      // Обновляем комиссию за оплату (временно отключено)
      // if (commissionElement) {
      //     const paymentMethod = document.getElementById('paymentMethodSelect');
      //     const commissionRate = getPaymentCommission();
      //     
      //     if (commissionRate > 0 && paymentMethod && paymentMethod.value === 'wayforpay') {
      //         // Рассчитываем комиссию от суммы товаров (без учета скидок)
      //         let subtotal = 0;
      //         cart.forEach(item => {
      //             const newPrice = parseInt(item.newPrice || item.price || 0);
      //             const quantity = item.quantity || 1;
      //             subtotal += newPrice * quantity;
      //         });
      //         
      //         const commissionAmount = Math.round(subtotal * commissionRate);
      //         commissionElement.textContent = `${commissionAmount} ${getCurrency()}`;
      //         commissionElement.parentElement.style.display = 'flex';
      //     } else {
      //         commissionElement.textContent = `0 ${getCurrency()}`;
      //         commissionElement.parentElement.style.display = 'none';
      //     }
      // }
      
      // НЕ вызываем updateCartCalculations() здесь, чтобы избежать бесконечной рекурсии
  }

// Функция управления способами доставки в зависимости от способа оплаты и суммы корзины
function updateDeliveryMethods() {
    console.log('updateDeliveryMethods: Обновляем способы доставки');
    
    const paymentSelect = document.getElementById('paymentMethodSelect');
    const deliverySelect = document.getElementById('deliveryMethodSelect');
    
    if (!paymentSelect || !deliverySelect) {
        console.error('updateDeliveryMethods: Элементы выбора не найдены');
        return;
    }
    
    const selectedPayment = paymentSelect.value;
    
    // Рассчитываем сумму корзины
    let cartTotal = 0;
    cart.forEach(item => {
        const newPrice = parseInt(item.newPrice || item.price || 0);
        const quantity = item.quantity || 1;
        cartTotal += newPrice * quantity;
    });
    
    console.log('updateDeliveryMethods: Сумма корзины:', cartTotal);
    
    // Получаем все опции доставки
    const deliveryOptions = deliverySelect.querySelectorAll('option');
    
    if (selectedPayment === 'meeting') {
        // Если выбрана оплата "при встрече в Одессе", показываем только самовывоз
        console.log('updateDeliveryMethods: Показываем только самовывоз');
        
        deliveryOptions.forEach(option => {
            if (option.value === 'pickup') {
                option.style.display = 'block';
                option.disabled = false;
            } else {
                option.style.display = 'none';
                option.disabled = true;
            }
        });
        
        // Устанавливаем самовывоз как выбранный
        deliverySelect.value = 'pickup';
        
    } else {
        // Для других способов оплаты показываем способы доставки в зависимости от суммы корзины
        console.log('updateDeliveryMethods: Показываем способы доставки в зависимости от суммы корзины');
        
        deliveryOptions.forEach(option => {
            if (option.value === 'free1001') {
                // Показываем бесплатную доставку от 1001 грн
                if (cartTotal >= 1001) {
                    option.style.display = 'block';
                    option.disabled = false;
                    console.log('updateDeliveryMethods: Показываем бесплатную доставку от 1001 грн');
                } else {
                    option.style.display = 'none';
                    option.disabled = true;
                }
            } else if (option.value === 'free2000') {
                // Показываем бесплатную доставку от 2000 грн
                if (cartTotal >= 2000) {
                    option.style.display = 'block';
                    option.disabled = false;
                    console.log('updateDeliveryMethods: Показываем бесплатную доставку от 2000 грн');
                } else {
                    option.style.display = 'none';
                    option.disabled = true;
                }
            } else {
                // Обычные способы доставки всегда доступны
                option.style.display = 'block';
                option.disabled = false;
            }
        });
        
        // НЕ сбрасываем выбранный покупателем способ доставки
        // Если он выбрал самовывоз, оставляем самовывоз
        console.log('updateDeliveryMethods: Сохраняем выбранный покупателем способ доставки:', deliverySelect.value);
    }
    
    // Обновляем стоимость доставки
    updateDeliveryCost();
}

// Функция показа/скрытия меню (toggle)
function showMenuPopup() {
    console.log('showMenuPopup: Переключаем меню');
    const popup = document.getElementById('menuPopup');
    if (popup) {
        if (popup.style.display === 'flex') {
            // Если меню открыто - закрываем
            popup.style.display = 'none';
            console.log('showMenuPopup: Меню закрыто');
        } else {
            // Если меню закрыто - открываем
            popup.style.display = 'flex';
            console.log('showMenuPopup: Меню открыто');
        }
    }
}

// Функция закрытия попапов
function closePopup(popupId) {
    console.log('closePopup: Закрываем', popupId);
    const popup = document.getElementById(popupId);
    if (popup) {
        popup.style.display = 'none';
    }
}

// Функция показа корзины
function showCartPopup() {
    console.log('showCartPopup: Показываем корзину');
    const popup = document.getElementById('cartPopup');
    if (popup) {
        renderCartItems();
        updateCartCalculations();
        updateDeliveryMethods(); // Инициализируем способы доставки
        popup.style.display = 'flex';
    }
}

// Функция закрытия корзины
function closeCartPopup() {
    console.log('closeCartPopup: Закрываем корзину');
    const popup = document.getElementById('cartPopup');
    if (popup) {
        popup.style.display = 'none';
    }
}

// Функция показа контактов
function showContactsPopup() {
    console.log('showContactsPopup: Показываем контакты');
    const popup = document.getElementById('contactsPopup');
    if (popup) {
        console.log('showContactsPopup: Элемент найден, добавляем класс show');
        popup.classList.add('show');
        popup.style.zIndex = '99999';
        popup.style.display = 'flex';
        popup.style.alignItems = 'center';
        popup.style.justifyContent = 'center';
        console.log('showContactsPopup: Класс show добавлен, z-index установлен');
        console.log('showContactsPopup: Текущие классы:', popup.className);
        console.log('showContactsPopup: Текущий z-index:', popup.style.zIndex);
    } else {
        console.error('showContactsPopup: Элемент contactsPopup не найден!');
    }
}

// Функция закрытия контактов
function closeContactsPopup() {
    console.log('closeContactsPopup: Закрываем контакты');
    const popup = document.getElementById('contactsPopup');
    if (popup) {
        popup.classList.remove('show');
        popup.style.display = 'none';
        popup.style.zIndex = '';
        console.log('closeContactsPopup: Окно контактов закрыто');
    } else {
        console.error('closeContactsPopup: Элемент contactsPopup не найден!');
    }
}

// Функция переключения меню
function toggleMenu() {
    console.log('toggleMenu: Переключаем меню');
    const menu = document.querySelector('.menu');
    if (menu) {
        menu.classList.toggle('active');
    }
}

// Функция переключения аватара
function toggleAvatarMenu() {
    console.log('toggleAvatarMenu: Переключаем меню аватара');
    const avatarMenu = document.querySelector('.avatar-dropdown');
    if (avatarMenu) {
        avatarMenu.classList.toggle('show');
        console.log('toggleAvatarMenu: Меню аватара переключено');
    } else {
        console.error('toggleAvatarMenu: Выпадающее меню аватара не найдено');
    }
}

// Функция показа/скрытия настроек (toggle)
function showSettingsPopup() {
    console.log('showSettingsPopup: Переключаем настройки');
    const popup = document.getElementById('settingsPopup');
    if (popup) {
        if (popup.style.display === 'flex') {
            // Если настройки открыты - закрываем
            popup.style.display = 'none';
            console.log('showSettingsPopup: Настройки закрыты');
        } else {
            // Если настройки закрыты - открываем
            popup.style.display = 'flex';
            console.log('showSettingsPopup: Настройки открыты');
        }
    }
}

// Функция закрытия настроек
function closeSettingsPopup() {
    console.log('closeSettingsPopup: Закрываем настройки');
    const popup = document.getElementById('settingsPopup');
    if (popup) {
        popup.style.display = 'none';
    }
}

// Функция показа попапа с предложением
function showOfferPopup() {
    console.log('showOfferPopup: Показываем предложение');
    const popup = document.getElementById('offerPopup');
    if (popup) {
        console.log('showOfferPopup: Элемент найден, добавляем класс show');
        
        // Получаем текущий язык
        const currentLanguage = localStorage.getItem('selectedLanguage') || 'uk';
        
        // Скрываем все языковые версии
        const ukContent = document.querySelector('.offer-content-uk');
        const ruContent = document.querySelector('.offer-content-ru');
        const enContent = document.querySelector('.offer-content-en');
        
        if (ukContent) ukContent.classList.remove('active');
        if (ruContent) ruContent.classList.remove('active');
        if (enContent) enContent.classList.remove('active');
        
        // Показываем нужную языковую версию
        switch (currentLanguage) {
            case 'uk':
                if (ukContent) ukContent.classList.add('active');
                break;
            case 'ru':
                if (ruContent) ruContent.classList.add('active');
                break;
            case 'en':
                if (enContent) enContent.classList.add('active');
                break;
        }
        
        popup.classList.add('show');
        popup.style.zIndex = '99999';
        popup.style.display = 'flex';
        popup.style.alignItems = 'center';
        popup.style.justifyContent = 'center';
        console.log('showOfferPopup: Класс show добавлен, z-index установлен');
        console.log('showOfferPopup: Текущие классы:', popup.className);
        console.log('showOfferPopup: Текущий z-index:', popup.style.zIndex);
    } else {
        console.error('showOfferPopup: Элемент offerPopup не найден!');
    }
}

// Функция закрытия попапа с предложением
function closeOfferPopup() {
    console.log('closeOfferPopup: Закрываем предложение');
    const popup = document.getElementById('offerPopup');
    if (popup) {
        popup.classList.remove('show');
        popup.style.display = 'none';
        popup.style.zIndex = '';
        console.log('closeOfferPopup: Окно оферты закрыто');
    }
}

// Функция показа попапа для товаров снятых с производства
function showDiscontinuedPopup() {
    console.log('showDiscontinuedPopup: Показываем popup для товара снятого с производства');
    const popup = document.getElementById('discontinuedPopup');
    if (popup) {
        popup.style.display = 'flex';
        popup.style.zIndex = '20000';
    }
}

// Функция показа попапа для товаров которых нет в наличии
function showOutOfStockPopup() {
    console.log('showOutOfStockPopup: Показываем popup для товара которого нет в наличии');
    const popup = document.getElementById('outOfStockPopup');
    if (popup) {
        popup.style.display = 'flex';
        popup.style.zIndex = '20000';
    }
}

// Функция показа попапа для товаров которые ожидаются
function showExpectedPopup() {
    console.log('showExpectedPopup: Показываем popup для товара который ожидается');
    const popup = document.getElementById('expectedPopup');
    if (popup) {
        popup.style.display = 'flex';
        popup.style.zIndex = '20000';
    }
}

// Функция показа попапа для товаров под заказ
function showOnOrderPopup() {
    console.log('showOnOrderPopup: Показываем popup для товара под заказ');
    const popup = document.getElementById('onOrderPopup');
    if (popup) {
        popup.style.display = 'flex';
        popup.style.zIndex = '20000';
    }
}

// Функция показа попапа с категориями
function showCategoryPopup() {
    console.log('showCategoryPopup: Показываем категории');
    const popup = document.getElementById('categoryPopup');
    if (popup) {
        popup.style.display = 'flex';
    }
}

// Функция закрытия попапа с категориями
function closeCategoryPopup() {
    console.log('closeCategoryPopup: Закрываем категории');
    const popup = document.getElementById('categoryPopup');
    if (popup) {
        popup.style.display = 'none';
    }
}

// Функция показа попапа с поиском
function showSearchPopup() {
    console.log('showSearchPopup: Показываем поиск');
    const popup = document.getElementById('searchPopup');
    if (popup) {
        popup.style.display = 'flex';
    }
}

// Функция закрытия попапа с поиском
function closeSearchPopup() {
    console.log('closeSearchPopup: Закрываем поиск');
    const popup = document.getElementById('searchPopup');
    if (popup) {
        popup.style.display = 'none';
    }
}

// Функция поиска товаров
async function searchProducts(query) {
    console.log('searchProducts: Поиск товаров по запросу:', query);
    
    let currentSearchTerm = query.toLowerCase().trim();
    isSearchActive = currentSearchTerm.length > 0;
    
    if (!isSearchActive) {
        console.log('searchProducts: Поиск отменен, загружаем все товары');
        await loadProducts();
        return;
    }
    
         // Нормализуем поисковые запросы для лучшего поиска
     if (currentSearchTerm.includes('d\'addario') || currentSearchTerm.includes('d\'addario') || currentSearchTerm.includes('daddario')) {
         currentSearchTerm = 'addario';
         console.log('searchProducts: Нормализован запрос D\'Addario в:', currentSearchTerm);
     }
     
     // Нормализуем поисковые запросы для DR
     if (currentSearchTerm === 'dr' || currentSearchTerm === 'DR') {
         currentSearchTerm = 'DR';
         console.log('searchProducts: Нормализован запрос DR в:', currentSearchTerm);
     }
     
     // Нормализуем поисковые запросы для La Bella
     if (currentSearchTerm === 'la bella' || currentSearchTerm === 'la bella' || currentSearchTerm === 'labella' || 
         currentSearchTerm === 'La Bella' || currentSearchTerm === 'La bella' || currentSearchTerm === 'LABELLA') {
         currentSearchTerm = 'La Bella';
         console.log('searchProducts: Нормализован запрос La Bella в:', currentSearchTerm);
     }
     
     // Специальная обработка для DR - ищем по нескольким вариантам
     if (currentSearchTerm === 'DR') {
         console.log('searchProducts: Специальный поиск для DR - используем несколько вариантов');
         // Попробуем найти товары DR разными способами
         await searchDRProducts();
         return;
     }
     
     // Специальная обработка для La Bella - ищем по нескольким вариантам
     if (currentSearchTerm === 'La Bella') {
         console.log('searchProducts: Специальный поиск для La Bella - используем несколько вариантов');
         // Попробуем найти товары La Bella разными способами
         await searchLaBellaProducts();
         return;
     }
    
    try {
        // Загружаем ВСЕ найденные товары без ограничений
        const response = await fetch(`http://localhost:8000/api/products?search=${encodeURIComponent(currentSearchTerm)}&start=0&limit=1000`);
        const data = await response.json();
        
        if (data && data.products && data.products.length > 0) {
            console.log(`searchProducts: Найдено ${data.products.length} товаров`);
            displayProducts(data.products);
        } else {
            console.log('searchProducts: Товары не найдены');
            showNoSearchResults(currentSearchTerm);
        }
    } catch (error) {
        console.error('searchProducts: Ошибка поиска:', error);
        showNoSearchResults(currentSearchTerm);
    }
}

// Функция показа результатов поиска
function showNoSearchResults(searchTerm) {
    console.log('showNoSearchResults: Показываем сообщение об отсутствии результатов');
    
    const container = document.querySelector('.inner');
    if (!container) return;
    
    container.innerHTML = `
        <div style="padding: 40px; text-align: center;">
            <i class="fas fa-search" style="font-size: 48px; margin-bottom: 20px; opacity: 0.5;"></i>
            <h3>По запросу "${searchTerm}" ничего не найдено</h3>
            <p>Попробуйте изменить поисковый запрос</p>
            <button class="btn" onclick="clearSearch()" style="margin-top: 20px;">
                <i class="fas fa-times"></i> Очистить поиск
            </button>
        </div>
    `;
}

// Функция очистки поиска
async function clearSearch() {
    console.log('clearSearch: Очищаем поиск');
    
    const searchInput = document.querySelector('.search-input');
    if (searchInput) {
        searchInput.value = '';
    }
    
    searchTerm = '';
    isSearchActive = false;
    isCategoryFilterActive = false;
    
    // Сбрасываем состояние бесконечной прокрутки
    currentPage = 0;
    hasMoreProducts = true;
    loadedProductNames.clear();
    
    // Загружаем все товары
    await loadProducts(0, false);
}

// Функция загрузки следующей страницы
async function loadNextPage() {
    if (isLoading || !hasMoreProducts || isSearchActive || isCategoryFilterActive) {
        console.log('loadNextPage: Загрузка невозможна - isLoading:', isLoading, 'hasMoreProducts:', hasMoreProducts, 'isSearchActive:', isSearchActive, 'isCategoryFilterActive:', isCategoryFilterActive);
        return;
    }
    
    console.log('loadNextPage: Загружаем следующую страницу, текущая:', currentPage);
    const nextPage = currentPage + 1; // Вычисляем следующую страницу
    console.log('loadNextPage: Следующая страница будет:', nextPage);
    await loadProducts(nextPage, true);
}

// Функция открытия чата в Telegram
function openTelegramChat() {
    console.log('openTelegramChat: Открываем чат в Telegram');
    const telegramUrl = 'https://t.me/GuitarStringsUSA';
    window.open(telegramUrl, '_blank');
}

// Функция обновления онлайн статуса по времени
function updateOnlineStatus() {
    console.log('updateOnlineStatus: Обновляем статус по времени');
    
    const now = new Date();
    const currentHour = now.getHours();
    const onlineStatus = document.querySelector('.online-status');
    const statusDot = document.querySelector('.status-dot');
    const statusText = document.querySelector('.online-status span');
    
    if (!onlineStatus || !statusDot || !statusText) {
        console.error('updateOnlineStatus: Элементы статуса не найдены');
        return;
    }
    
    // Получаем текущий язык
    const currentLanguage = localStorage.getItem('selectedLanguage') || 'uk';
    const currentTranslations = translations[currentLanguage] || translations.uk;
    
    // Рабочие часы: с 9:00 до 19:00 (9-19)
    const isWorkingHours = currentHour >= 9 && currentHour < 19;
    
    if (isWorkingHours) {
        // Онлайн (зеленый)
        onlineStatus.classList.remove('offline');
        onlineStatus.classList.add('online');
        statusDot.style.background = '#4CAF50'; // Зеленый
        statusText.textContent = currentTranslations.onlineStatus;
        console.log('updateOnlineStatus: Статус установлен - ОНЛАЙН (зеленый)');
    } else {
        // Офлайн (синий)
        onlineStatus.classList.remove('online');
        onlineStatus.classList.add('offline');
        statusDot.style.background = '#2196F3'; // Синий
        statusText.textContent = currentTranslations.onlineStatusOffline;
        console.log('updateOnlineStatus: Статус установлен - ОФЛАЙН (синий)');
    }
}

// Функция показа попапа с поддержкой
function showSupportPopup() {
    console.log('showSupportPopup: Показываем поддержку');
    const popup = document.getElementById('supportPopup');
    if (popup) {
        popup.style.display = 'flex';
    }
}

// Функция закрытия попапа с поддержкой
function closeSupportPopup() {
    console.log('closeSupportPopup: Закрываем поддержку');
    const popup = document.getElementById('supportPopup');
    if (popup) {
        popup.style.display = 'none';
    }
}

// Функция перехода в корзину
function goToCart() {
    console.log('goToCart: Переходим в корзину');
    showCartPopup();
}

// Функция загрузки товаров
async function loadProducts(page = 0, append = false) {
    if (isLoading || isSearchActive) {
        console.log('loadProducts: Загрузка уже идет или активен поиск, пропускаем');
        return;
    }
    
    // console.log('loadProducts: Загружаем товары, страница:', page, 'добавляем:', append);
    
    isLoading = true;
    
    // Показываем индикатор загрузки
    if (!append) {
        const container = document.querySelector('.inner');
        if (container) {
            // Получаем текущий язык
            const currentLanguage = localStorage.getItem('selectedLanguage') || 'uk';
            let loadingText = 'Загружаем товары...';
            
            if (currentLanguage === 'uk') {
                loadingText = 'Завантажуємо товари...';
            } else if (currentLanguage === 'en') {
                loadingText = 'Loading goods...';
            }
            
            // Удаляем предыдущий оверлей если остался
            try { const old = document.getElementById('loading-overlay'); if (old) old.remove(); } catch (e) {}
            
            container.innerHTML = `
                <div id="loading-overlay" style="
                    position: fixed;
                    top: 50%;
                    left: 50%;
                    transform: translate(-50%, -50%);
                    text-align: center;
                    z-index: 1000;
                    background: rgba(255, 255, 255, 0.95);
                    padding: 30px;
                    border-radius: 10px;
                    box-shadow: 0 4px 20px rgba(0, 0, 0, 0.1);
                ">
                    <i class="fas fa-spinner fa-spin" style="font-size: 32px; color: #4CAF50; margin-bottom: 15px; display: block;"></i>
                    <p style="margin: 0; font-size: 16px; color: #333; font-weight: 500;">${loadingText}</p>
                </div>
            `;
        }
    }
    
    try {
        // Вычисляем start на основе номера страницы (30 товаров на страницу для быстрой загрузки)
        const start = page * 30;
        const response = await fetch(`http://localhost:8000/api/products?start=${start}&limit=30`);
        const data = await response.json();
        
        if (data && data.products && data.products.length > 0) {
            // console.log('loadProducts: Загружено', data.products.length, 'товаров');
            
            if (append) {
                // Добавляем товары к существующим
                appendProducts(data.products);
            } else {
                // Отображаем новые товары
                displayProducts(data.products);
            }
            
            // Обновляем состояние
            currentPage = page;
            hasMoreProducts = data.hasMore || false;
            
            // Дополнительная проверка для корректности hasMoreProducts
            if (window.currentProducts && window.currentProducts.length >= 377) {
                hasMoreProducts = false;
            }
            
            // console.log('loadProducts: Обновлен currentPage на:', currentPage);
            
            // console.log('loadProducts: hasMoreProducts:', hasMoreProducts);
        } else {
            console.log('loadProducts: Нет товаров для отображения');
            hasMoreProducts = false;
        }
    } catch (error) {
        console.error('loadProducts: Ошибка загрузки товаров:', error);
        hasMoreProducts = false;
    } finally {
        isLoading = false;
        // Удаляем оверлей загрузки
        try { const old = document.getElementById('loading-overlay'); if (old) old.remove(); } catch (e) {}
    }
}

// Функция добавления товаров к существующим
function appendProducts(products) {
    console.log('appendProducts: Добавляем', products.length, 'товаров');
    const container = ensureProductsContainer();
    if (!container) {
        console.error('appendProducts: Контейнер #productsContainer не найден и не удалось создать');
        return;
    }
    
    // Фильтруем дубликаты перед добавлением
    const uniqueProducts = [];
    products.forEach(product => {
        if (!loadedProductNames.has(product.name)) {
            uniqueProducts.push(product);
            loadedProductNames.add(product.name);
        } else {
            console.log('appendProducts: Пропускаем дубликат:', product.name);
        }
    });
    
    console.log('appendProducts: Уникальных товаров для добавления:', uniqueProducts.length);
    
    // Пересобираем общий список с сортировкой через displayProducts
    const combined = (window.currentProducts || []).concat(uniqueProducts);
    displayProducts(combined);
    console.log('appendProducts: Всего товаров после добавления:', (window.currentProducts || []).length);
}

// Функция отображения товаров
function displayProducts(products) {
    console.log('displayProducts: Отображаем товары');
    console.log('displayProducts: Количество товаров:', products.length);
    // На всякий случай убираем оверлей загрузки
    try { const old = document.getElementById('loading-overlay'); if (old) old.remove(); } catch (e) {}
    const container = ensureProductsContainer();
    if (!container) {
        console.error('displayProducts: Контейнер #productsContainer не найден и не удалось создать');
        return;
    }
    console.log('displayProducts: Контейнер найден, очищаем содержимое');
    container.innerHTML = '';
    
    // Очищаем список загруженных товаров
    loadedProductNames.clear();
    
    // Удаляем дубликаты товаров перед отображением
    const uniqueProducts = [];
    const seenNames = new Set();
    
    products.forEach(product => {
        if (!seenNames.has(product.name)) {
            seenNames.add(product.name);
            uniqueProducts.push(product);
        } else {
            console.log('displayProducts: Удален дубликат товара:', product.name);
        }
    });
    
    console.log('displayProducts: После удаления дубликатов осталось товаров:', uniqueProducts.length, 'из', products.length);
    
    // Сортировка по политике: В наличии → Ожидается → Под заказ → Снят с производства; внутри — по цене возрастанию
    const getAvailabilityRank = (availability) => {
        const a = (availability || '').toLowerCase();
        if (a === 'в наличии' || a === 'в наличии в одессе') return 0;
        if (a === 'ожидается' || a === 'ожидается поставка') return 1;
        if (a === 'под заказ') return 2;
        if (a === 'снят с производства') return 3;
        return 4;
    };
    const getNumericPrice = (p) => {
        const val = (p && (p.newPrice || p.price || 0)).toString().replace(',', '.');
        const num = parseFloat(val);
        return isNaN(num) ? Number.POSITIVE_INFINITY : num;
    };
    uniqueProducts.sort((a, b) => {
        const ra = getAvailabilityRank(a.availability);
        const rb = getAvailabilityRank(b.availability);
        if (ra !== rb) return ra - rb;
        const pa = getNumericPrice(a);
        const pb = getNumericPrice(b);
        if (pa !== pb) return pa - pb;
        return 0;
    });
    
    // Сохраняем товары в глобальный массив для доступа из обработчиков
    window.currentProducts = uniqueProducts;
    
    // Добавляем имена товаров в Set для отслеживания дубликатов
    uniqueProducts.forEach(product => {
        loadedProductNames.add(product.name);
    });
    
    console.log('displayProducts: Создаем карточки для', uniqueProducts.length, 'товаров');
    uniqueProducts.forEach((product, index) => {
        const productCard = createProductCard(product, index);
        container.appendChild(productCard);
    });
    
    // Навешиваем клики на пометки "09 калибр электро" для быстрого фильтра
    try {
        const gaugeBadges = document.querySelectorAll('.product-gauge09');
        gaugeBadges.forEach(badge => {
            badge.addEventListener('click', function() {
                filterProductsByCategory('09-gauge', true);
            });
        });
    } catch (e) {}

    // Навешиваем клики на пометки "10 калибр электро"
    try {
        const gaugeBadges10 = document.querySelectorAll('.product-gauge10');
        gaugeBadges10.forEach(badge => {
            badge.addEventListener('click', function() {
                filterProductsByCategory('10-gauge', true);
            });
        });
    } catch (e) {}

    // Навешиваем клики на пометки "Nickel Plated"
    try {
        const npBadges = document.querySelectorAll('.product-nickelplated');
        npBadges.forEach(badge => {
            badge.addEventListener('click', function() {
                filterProductsByCategory('nickel-plated', true);
            });
        });
    } catch (e) {}

    // Навешиваем клики на пометки "Pure Nickel"
    try {
        const pnBadges = document.querySelectorAll('.product-purenickel');
        pnBadges.forEach(badge => {
            badge.addEventListener('click', function() {
                filterProductsByCategory('pure-nickel', true);
            });
        });
    } catch (e) {}

    // Навешиваем клики на пометки "Stainless Steel"
    try {
        const ssBadges = document.querySelectorAll('.product-stainless');
        ssBadges.forEach(badge => {
            badge.addEventListener('click', function() {
                filterProductsByCategory('stainless-steel', true);
            });
        });
    } catch (e) {}

    // Навешиваем клики на пометки "Cobalt"
    try {
        const cbBadges = document.querySelectorAll('.product-cobalt');
        cbBadges.forEach(badge => {
            badge.addEventListener('click', function() {
                filterProductsByCategory('cobalt', true);
            });
        });
    } catch (e) {}

    // Навешиваем клики на пометки "Colored"
    try {
        const coloredBadges = document.querySelectorAll('.product-colored');
        coloredBadges.forEach(badge => {
            badge.addEventListener('click', function() {
                filterProductsByCategory('colored', true);
            });
        });
    } catch (e) {}

    // Навешиваем клики на пометки "11 калибр электро"
    try {
        const gaugeBadges11 = document.querySelectorAll('.product-gauge11');
        gaugeBadges11.forEach(badge => {
            badge.addEventListener('click', function() {
                filterProductsByCategory('11-gauge', true);
            });
        });
    } catch (e) {}

    // Кликабельные пометки характеристик
    try {
        // 7 струн для электрогитары
        document.querySelectorAll('.product-seven-string').forEach(b => {
            b.style.cursor = 'pointer';
            b.addEventListener('click', function() {
                filterProductsByCategory('7-string', true);
            });
        });
        // 8 струн для электрогитары
        document.querySelectorAll('.product-eight-string').forEach(b => {
            b.style.cursor = 'pointer';
            b.addEventListener('click', function() {
                filterProductsByCategory('8-string', true);
            });
        });
        // 9 струн для электрогитары
        document.querySelectorAll('.product-nine-string').forEach(b => {
            b.style.cursor = 'pointer';
            b.addEventListener('click', function() {
                filterProductsByCategory('9-string', true);
            });
        });
        // Струны электро с плоской обмоткой
        document.querySelectorAll('.product-flatwound').forEach(b => {
            b.style.cursor = 'pointer';
            b.addEventListener('click', function() {
                filterProductsByCategory('flatwound', true);
            });
        });

        // Производитель: DR / La Bella (клика по бейджу производителя)
        document.querySelectorAll('.product-manufacturer').forEach(b => {
            b.style.cursor = 'pointer';
            b.addEventListener('click', function() {
                const txt = (this.textContent || '').toLowerCase();
                if (txt.includes('dr')) {
                    filterProductsByCategory('dr', true);
                } else if (txt.includes('la bella')) {
                    filterProductsByCategory('la-bella', true);
                }
            });
        });
    } catch (e) {}
    
    console.log('displayProducts: Все карточки добавлены. Количество элементов в контейнере:', container.children.length);

    // Синхронизируем видимость баннера/поиска по фактическому состоянию кабинета
    try {
        const account = document.getElementById('account-section');
        const isAccountVisible = !!(account && account.offsetParent !== null && window.getComputedStyle(account).display !== 'none' && window.getComputedStyle(account).visibility !== 'hidden');
        const banner = document.querySelector('.main-banner');
        const brands = document.querySelector('.brand-logos');
        const search = document.querySelector('.search-section');
        const inner = document.querySelector('.inner');

        if (isAccountVisible) {
            if (banner) banner.style.setProperty('display', 'none', 'important');
            if (brands) brands.style.setProperty('display', 'none', 'important');
            if (search) search.style.setProperty('display', 'none', 'important');
        } else {
            if (banner) banner.style.removeProperty('display');
            if (brands) brands.style.removeProperty('display');
            if (search) search.style.removeProperty('display');
            if (inner) {
                Array.from(inner.children).forEach(child => {
                    if (child.id !== 'account-section') {
                        child.style.removeProperty('display');
                        child.style.removeProperty('visibility');
                        child.style.removeProperty('opacity');
                    }
                });
            }
        }
    } catch (e) {}
}

// Функция показа уведомления о добавлении в корзину
function showAddToCartNotification(productName) {
    console.log('showAddToCartNotification: Показываем уведомление для', productName);
    
    // Создаем уведомление
    const notification = document.createElement('div');
    notification.className = 'add-to-cart-notification';
    notification.style.cssText = `
        position: fixed;
        top: 20px;
        right: 20px;
        background: #4CAF50;
        color: white;
        padding: 15px 20px;
        border-radius: 5px;
        z-index: 10000;
        box-shadow: 0 4px 8px rgba(0,0,0,0.2);
        animation: slideIn 0.3s ease-out;
    `;
    notification.textContent = 'Товар "' + productName + '" добавлен в корзину!';
    
    // Добавляем стили для анимации
    const style = document.createElement('style');
    style.textContent = `
        @keyframes slideIn {
            from { transform: translateX(100%); opacity: 0; }
            to { transform: translateX(0); opacity: 1; }
        }
        @keyframes slideOut {
            from { transform: translateX(0); opacity: 1; }
            to { transform: translateX(100%); opacity: 0; }
        }
    `;
    document.head.appendChild(style);
    
    // Добавляем уведомление на страницу
    document.body.appendChild(notification);
    
    // Удаляем уведомление через 3 секунды
    setTimeout(function() {
        notification.style.animation = 'slideOut 0.3s ease-in';
        setTimeout(function() {
            if (notification.parentNode) {
                notification.parentNode.removeChild(notification);
            }
        }, 300);
    }, 3000);
}

// Список Pure Nickel Electric Strings (эталонные названия)
const PURE_NICKEL_ELECTRIC = new Set([
    'Ernie Ball 2250 Pure Nickel Power Slinky 11-48',
    'Ernie Ball 2251 Pure Nickel Regular Slinky 10-46',
    'Ernie Ball 2253 Pure Nickel Super Slinky 9-42',
    'Ernie Ball 2252 Pure Nickel Hybrid Slinky 9-46',
    'DAddario EPN120 Pure Nickel Wound Super Light 9-41',
    'DAddario EPN115 Pure Nickel Wound Medium 11-48',
    'DAddario EPN110 Pure Nickel Wound Regular Light 10-45',
    'GHS BCL Big Core Nickel Rockers Pure Nickel 10.5-48 Light',
    'GHS BCCL Big Core Nickel Rockers Pure Nickel 9.5-48 Custom Light',
    'Gibson SEG-LES10 Les Paul Premium Silk-Wrapped Pure Nickel 10-46 Light',
    'Gibson SEG-LES9 Les Paul Premium Silk-Wrapped Pure Nickel 9-42 Ultra L',
    'Pyramid R454 100 Pure Nickel Classics Round Core 12-54 Regular',
    'Pyramid R408 100 Pure Nickel Superior Round Core 8-String 9-64',
    'Ernie Ball 2251 Pure Nickel Regular Slinky 10-46 12 sets',
    'Pyramid R451 100 Pure Nickel Classics Round Core 10-46 Regular',
    'Pyramid R451 100 Pure Nickel Classics Round Core 10-46 15 sets'
].map(s => s.toLowerCase()));

// Нормализованный (loose) набор для устойчивого совпадения (без апострофов/дефисов)
const PURE_NICKEL_ELECTRIC_LOOSE = new Set(Array.from(PURE_NICKEL_ELECTRIC).map(name => normalizeLooseName(name)));

// Список Stainless Steel Electric Strings (эталонные названия)
const STAINLESS_STEEL_ELECTRIC = new Set([
    'Ernie Ball 2245 Custom Gauge Stainless Steel 11-48',
    'Ernie Ball 2247 Custom Gauge Stainless Steel 9-46',
    'Ernie Ball 2248 Custom Gauge Stainless Steel 9-42',
    'Ernie Ball 2246 Custom Gauge Stainless Steel 10-46',
    'Dean Markley 2552 Blue Steel Light 9-42',
    'Dean Markley 2556 Blue Steel Regular 10-46',
    'Dean Markley 2562 Blue Steel Medium 11-52',
    'DAddario EHR370 Half Rounds Semi-Flat Wound Stainless Steel 11-49',
    'DAddario ECG23-3D Chromes Flat Wound 10-48 1 set',
    'DAddario ECG24-3D Chromes Flat Wound 11-50 1 set',
    'DAddario ECG24 Chromes Flat Wound Jazz Light 11-50',
    'Ernie Ball Synyster Gates Signature Stainless Steel RPS Strings 10-52',
    'DAddario ECG24-7 Chromes Flat Wound Jazz Light 7-String 11-65',
    'Ernie Ball 2582 Flatwound Stainless Steel Flats Medium 12-52',
    'Ernie Ball Synyster Gates Signature Stainless Steel RPS 7-String 10-60',
    'Ernie Ball 2580 Flatwound Stainless Steel Flats Light 11-50',
    'DAddario ECG24-3D Chromes Flat Wound 11-50 3 sets',
    'DAddario ECG23-3D Chromes Flat Wound 10-48 3 sets',
    'Dean Markley 2554 Blue Steel Custom Light 9-46',
    'Dean Markley 2558 Blue Steel LTHB 10-52',
    'Dean Markley 2555 Blue Steel Jazz 12-54'
].map(s => s.toLowerCase()));
const STAINLESS_STEEL_ELECTRIC_LOOSE = new Set(Array.from(STAINLESS_STEEL_ELECTRIC).map(name => normalizeLooseName(name)));

// Список Cobalt Electric Strings (эталонные названия)
const COBALT_ELECTRIC = new Set([
    'Ernie Ball 2720 Cobalt Slinky 11-48',
    'Ernie Ball 2721 Cobalt Slinky 10-46',
    'Ernie Ball 2722 Cobalt Slinky 9-46',
    'Ernie Ball 2723 Cobalt Slinky 9-42',
    'Ernie Ball 2715 Cobalt Slinky 10-52',
    'Ernie Ball 2726 Cobalt Slinky 12-56',
    'Ernie Ball 2727 Cobalt Slinky 11-54',
    'Ernie Ball 2716 Cobalt Burly Slinky 11-52',
    'Ernie Ball 2714 Cobalt Mammoth Slinky 12-62',
    'Ernie Ball 2725 Cobalt Slinky 8-38',
    'Ernie Ball 2712 Cobalt Primo Slinky 9.5-44',
    'Ernie Ball 2717 Cobalt Ultra Slinky 10-48',
    'Ernie Ball 2728 7-String Cobalt Slinky 10-56',
    'Ernie Ball 2729 7-String Cobalt Slinky 11-58',
    'Ernie Ball 2730 7-String Cobalt Slinky 10-62',
    'Ernie Ball 3826 Paradigm Tim Henson Signature Electric Strings 9.5-46',
    'Ernie Ball 2591 Flatwound Cobalt Regular Slinky 10-46',
    'Ernie Ball 2593 Flatwound Cobalt Super Slinky 9-42',
    'Ernie Ball 2590 Flatwound Cobalt Power Slinky 11-48',
    'Ernie Ball 2722 Cobalt Slinky 9-46 6 sets',
    'Ernie Ball 2721 Cobalt Slinky 10-46 6 sets',
    'Ernie Ball 2715 Cobalt Slinky 10-52 6 sets',
    'Ernie Ball 2723 Cobalt Slinky 9-42 6 sets',
    'Ernie Ball 2720 Cobalt Slinky 11-48 6 sets'
].map(s => s.toLowerCase()));
const COBALT_ELECTRIC_LOOSE = new Set(Array.from(COBALT_ELECTRIC).map(name => normalizeLooseName(name)));

// Список Colored Electric Strings (эталонные названия)
const COLORED_ELECTRIC = new Set([
    'DR NGE-11 Hi-Def Neon Green K3 Coated Medium 11-50',
    'DR NGE-9 Hi-Def Neon Green K3 Coated Light 9-42',
    'DR NGE-9/46 Hi-Def Neon Green K3 Coated Light Top Heavy Bottom 9-46',
    'DR NGE-10 Hi-Def Neon Green K3 Coated Medium 10-46',
    'DR BKE7-11 Black Beauties K3 Coated 7-String Extra Heavy 11-60'
].map(s => s.toLowerCase()));
const COLORED_ELECTRIC_LOOSE = new Set(Array.from(COLORED_ELECTRIC).map(name => normalizeLooseName(name)));

// Функция создания карточки товара
function createProductCard(product, index) {
    // console.log('createProductCard: Создаем карточку для товара:', product.name, 'индекс:', index);
    // console.log('createProductCard: Данные товара:', product);
    
    const card = document.createElement('div');
    card.className = 'product-card';
    
    // Получаем текущий язык
    const currentLanguage = localStorage.getItem('selectedLanguage') || 'uk';
    const currentTranslations = translations[currentLanguage] || translations.uk;
    
    // Определяем статус товара с переводами и создаем кнопку
    let statusClass = 'in-stock';
    let statusText = currentTranslations.inStock;
    let statusButton = '';
    
    if (product.availability === 'Нет в наличии') {
        statusClass = 'out-of-stock';
        statusText = currentTranslations.outOfStock;
        statusButton = `<button class="btn status-btn out-of-stock" onclick="showOutOfStockPopup()">${statusText}</button>`;
    } else if (product.availability === 'Под заказ') {
        statusClass = 'on-order';
        statusText = currentTranslations.onOrder;
        statusButton = `<button class="btn status-btn on-order" onclick="showOnOrderPopup()">${statusText}</button>`;
    } else if (product.availability === 'Ожидается') {
        statusClass = 'expected';
        statusText = currentTranslations.expected;
        statusButton = `<button class="btn status-btn expected" onclick="showExpectedPopup()">${statusText}</button>`;
    } else if (product.availability === 'Снят с производства') {
        statusClass = 'discontinued';
        statusText = currentTranslations.discontinued;
        statusButton = `<button class="btn status-btn discontinued" onclick="showDiscontinuedPopup()">${statusText}</button>`;
    } else {
        // Для товаров в наличии - обычная кнопка покупки
        statusButton = `<button class="btn add-to-cart-btn" data-index="${index}">${currentTranslations.buyButton}</button>`;
    }
    
    // Получаем цены из правильных полей API
    const newPrice = product.newPrice || product.price || 0;
    const oldPrice = product.oldPrice || 0;
    
    // Формируем HTML для старой цены (красная зачеркнутая цена)
    const oldPriceHtml = oldPrice && oldPrice > 0 && oldPrice !== newPrice ? 
        '<div class="old-price">' + oldPrice + ' ' + getCurrency() + '</div>' : '';
    
    // Формируем HTML для рейтинга
    const ratingHtml = createRatingHtml(product.rating, currentTranslations);
    
    // Определяем производителя для товаров DR и La Bella, а также информацию о 7-струнных и 8-струнных товарах
    let manufacturerHtml = '';
    let sevenStringHtml = '';
    let eightStringHtml = '';
    let nineStringHtml = '';
    let flatwoundHtml = '';
    let gauge10Html = '';
    
    // Проверяем, является ли товар одним из товаров DR (гибкий поиск)
    const isDRProduct = (() => {
        const productName = product.name.toLowerCase();
        return productName.startsWith('dr ') || productName.includes(' dr ');
    })();
    
    // Проверяем, является ли товар одним из товаров La Bella (гибкий поиск)
    const isLaBellaProduct = (() => {
        const productName = product.name.toLowerCase();
        return productName.includes('la bella');
    })();
    
    // Проверяем, является ли товар 7-струнным (по пометке в карточке, а не по названию)
    const is7StringProduct = (() => {
        const productName = product.name.toLowerCase();
        return productName.includes('7-string') || 
               productName.includes('7 string') ||
               productName.includes('7-струн для электрогитары') ||
               productName.includes('7 струн для электрогитары');
    })();
    
    // Проверяем, является ли товар 8-струнным (по пометке в карточке, а не по названию)
    const is8StringProduct = (() => {
        const productName = product.name.toLowerCase();
        
        // Исключения: некоторые товары явно 6-струнные, но могут ошибочно помечаться
        // Dunlop BG1268 String Lab Bjorn Gelotte In Flames Drop Bb 12-68 — 6-струнный набор
        const suppressEightString = (
            productName.includes('bg1268') ||
            productName.includes('bjorn gelotte') ||
            productName.includes('in flames') ||
            productName.includes('drop bb')
        );
        if (suppressEightString) return false;
        
        // Определяем 8-струнные товары только по явным пометкам в названии
        // Это должны быть именно 8-струнные наборы, а не товары с диапазонами струн
        return productName.includes('8-string') || 
               productName.includes('8 string') ||
               productName.includes('8-струн для электрогитары') ||
               productName.includes('8 струн для электрогитары');
    })();

    // Проверяем, является ли товар 9-струнным (по явным пометкам)
    const is9StringProduct = (() => {
        const productName = product.name.toLowerCase();
        return productName.includes('9-string') ||
               productName.includes('9 string') ||
               productName.includes('9-струн для электрогитары') ||
               productName.includes('9 струн для электрогитары') ||
               productName.includes('9-string 9-') ||
               productName.includes('9-стр') ||
               productName.includes(' nine-string');
    })();

    // Проверяем, плоская обмотка электро (flatwound/half rounds/chromes)
    const isFlatwoundElectric = (() => {
        const name = product.name.toLowerCase();
        return (
            name.includes('flatwound') ||
            name.includes('flat wound') ||
            name.includes('stainless steel flats') ||
            name.includes('half rounds') ||
            name.includes('semi-flat') ||
            name.includes('chromes flat wound') ||
            name.includes('chromes')
        );
    })();
    
    if (isDRProduct) {
        manufacturerHtml = `<span class="product-manufacturer">${currentTranslations.manufacturer}: DR</span>`;
    } else if (isLaBellaProduct) {
        manufacturerHtml = `<span class="product-manufacturer">${currentTranslations.manufacturer}: La Bella</span>`;
    }

    // Пометка для 09 калибра (электро) — кликабельная для фильтра
    let gauge09Html = '';
    try {
        const normalizedName = (product.name || '').toLowerCase().trim();

        // Точное соответствие по эталонному списку
        let isGauge09 = GAUGE_09_ELECTRIC.has(normalizedName);

        // Дополнительные алиасы/эвристики для проблемных позиций (Dunlop 3PDEN0942 / DEN0942 9-42)
        // Цель: пометить и 1 set, и 3 sets (3-Pack) варианты.
        if (!isGauge09) {
            const has942 = normalizedName.includes('9-42') || normalizedName.includes('9 42') || normalizedName.includes('9.42');
            const has3p = normalizedName.includes('3p') || normalizedName.includes('3-pack') || normalizedName.includes('3 pack') || normalizedName.includes('3sets') || normalizedName.includes('3 sets');
            const hasDen0942 = normalizedName.includes('den0942') || normalizedName.includes('3pden0942');
            // Правило для 3 sets (3-Pack)
            const isDunlop3Pack = hasDen0942 && has942 && has3p;
            // Правило для 1 set (обычный комплект)
            const isDunlopSingle = hasDen0942 && has942 && (!has3p);
            if (isDunlop3Pack || isDunlopSingle) {
                isGauge09 = true;
            }
        }

        if (isGauge09) {
            const badgeText = (translations[(localStorage.getItem('selectedLanguage')||'uk')]?.gauge09Info) || '09 калибр электро';
            const badgeTitle = (translations[(localStorage.getItem('selectedLanguage')||'uk')]?.gauge09ShowAll) || 'Показать все 09 калибр электро';
            gauge09Html = `<span class="product-gauge09" title="${badgeTitle}">${badgeText}</span>`;
        }
    } catch (e) {}

    // Пометка для 10 калибра (электро)
    try {
        const normalizedName10 = (product.name || '').toLowerCase().trim();
        let isGauge10 = GAUGE_10_ELECTRIC.has(normalizedName10);
        if (!isGauge10) {
            const has1046 = normalizedName10.includes('10-46') || normalizedName10.includes('10 46');
            const has1052 = normalizedName10.includes('10-52') || normalizedName10.includes('10 52');
            const has3p = normalizedName10.includes('3p') || normalizedName10.includes('3-pack') || normalizedName10.includes('3 pack') || normalizedName10.includes('3sets') || normalizedName10.includes('3 sets');
            const hasDen1046 = normalizedName10.includes('den1046') || normalizedName10.includes('3pden1046');
            const denMatch = hasDen1046 && (has1046 || has1052);
            if (denMatch) isGauge10 = true;
        }
        if (isGauge10) {
            const badgeText10 = (translations[(localStorage.getItem('selectedLanguage')||'uk')]?.gauge10Info) || '10 калибр электро';
            const badgeTitle10 = (translations[(localStorage.getItem('selectedLanguage')||'uk')]?.gauge10ShowAll) || 'Показать все 10 калибр электро';
            gauge10Html = `<span class="product-gauge10" title="${badgeTitle10}">${badgeText10}</span>`;
        }
    } catch (e) {}
    
    // Добавляем информацию о 7-струнных товарах
    if (is7StringProduct) {
        sevenStringHtml = `<span class="product-seven-string">${currentTranslations.sevenStringInfo}</span>`;
    }
    
    // Добавляем информацию о 8-струнных товарах
    if (is8StringProduct) {
        eightStringHtml = `<span class="product-eight-string">${currentTranslations.eightStringInfo}</span>`;
    }
    // Добавляем информацию о 9-струнных товарах
    if (is9StringProduct) {
        nineStringHtml = `<span class="product-nine-string">${currentTranslations.nineStringInfo}</span>`;
    }
    if (isFlatwoundElectric) {
        flatwoundHtml = `<span class="product-flatwound">${currentTranslations.flatwoundInfo}</span>`;
    }
    
    const cardHtml = 
        '<div class="product-card-top">' +
            '<div class="product-actions">' +
                '<button class="favorite-btn" data-index="' + index + '"><i class="far fa-heart"></i></button>' +
                '<button class="compare-btn" data-index="' + index + '"><i class="fas fa-balance-scale"></i></button>' +
            '</div>' +
            '<div class="img-container">' +
                '<img class="img" src="' + product.image + '" alt="' + product.name + '" onerror="this.src=\'./images/Discontinued.jpg\'">' +
            '</div>' +
            '<div class="product-title">' + product.name + '</div>' +
            '<div class="product-status ' + statusClass + '">' + statusText + '</div>' +
            '<div class="product-subtitle">' +
                '<input type="checkbox" class="compare-checkbox" data-index="' + index + '">' +
                '<span>' + currentTranslations.compare + '</span>' +
                manufacturerHtml +
                sevenStringHtml +
                eightStringHtml +
                nineStringHtml +
                flatwoundHtml +
                gauge09Html +
                gauge10Html +
                (function(){
                    // Пометка для 11 калибра (электро)
                    try {
                        const normalizedName11 = (product.name || '').toLowerCase().trim();
                        let isGauge11 = GAUGE_11_ELECTRIC.has(normalizedName11);
                        if (!isGauge11) {
                            // Простая эвристика: наличие 11-48/11-49/11-50/11-52/11-54/11-56
                            const has11xx = /(\b|\s)11[-\s]?(48|49|50|52|54|56)(\b|\s)/.test(normalizedName11);
                            isGauge11 = has11xx;
                        }
                        if (isGauge11) {
                            const badgeText11 = (translations[(localStorage.getItem('selectedLanguage')||'uk')]?.gauge11Info) || '11 калибр электро';
                            const badgeTitle11 = (translations[(localStorage.getItem('selectedLanguage')||'uk')]?.gauge11ShowAll) || 'Показать все 11 калибр электро';
                            return `<span class="product-gauge11" title="${badgeTitle11}">${badgeText11}</span>`;
                        }
                    } catch (e) {}
                    return '';
                })() +
                (function(){
                    // Пометка для Nickel Plated
                    try {
                        const normalized = (product.name||'').toLowerCase().trim();
                        const normalizedLoose = normalizeLooseName(product.name);
                        let isNP = NICKEL_PLATED_ELECTRIC.has(normalized) || NICKEL_PLATED_ELECTRIC.has(normalizedLoose);
                        if (!isNP) {
                            // эвристика: nickel plated | nickel-plated | nickel wound
                            if ((/nickel[ -]?plated/.test(normalized) || /nickel[ -]?wound/.test(normalized) || /nickel/.test(normalized))
                                && !/pure nickel|stainless steel|flat ?wound/.test(normalized)) {
                                isNP = true;
                            }
                        }
                        if (isNP) {
                            const t = (translations[(localStorage.getItem('selectedLanguage')||'uk')]||{});
                            const badge = (t.nickelPlatedInfo)||'Nickel Plated';
                            const title = (t.nickelPlatedShowAll)||'Показать все Nickel Plated';
                            return `<span class="product-nickelplated" title="${title}">${badge}</span>`;
                        }
                    } catch(e) {}
                    return '';
                })() +
                (function(){
                    // Пометка для Pure Nickel
                    try {
                        const normalized = (product.name||'').toLowerCase().trim();
                        const normalizedLoose = normalizeLooseName(product.name);
                        let isPN = PURE_NICKEL_ELECTRIC.has(normalized) || PURE_NICKEL_ELECTRIC.has(normalizedLoose) || PURE_NICKEL_ELECTRIC_LOOSE.has(normalizedLoose);
                        if (!isPN) {
                            // эвристика: pure nickel, nickel rockers (серия GHS), исключаем plated/flat/stainless/cobalt/colored
                            if ((/pure\s*nickel/.test(normalized) || /nickel\s*rockers/.test(normalized))
                                && !/plated|flat ?wound|stainless|cobalt|colored/.test(normalized)) {
                                isPN = true;
                            }
                        }
                        if (isPN) {
                            const t = (translations[(localStorage.getItem('selectedLanguage')||'uk')]||{});
                            const badge = (t.pureNickelInfo)||'Pure Nickel';
                            const title = (t.pureNickelShowAll)||'Показать все Pure Nickel';
                            return `<span class="product-purenickel" title="${title}">${badge}</span>`;
                        }
                    } catch(e) {}
                    return '';
                })() +
                (function(){
                    // Пометка для Stainless Steel
                    try {
                        const normalized = (product.name||'').toLowerCase().trim();
                        const normalizedLoose = normalizeLooseName(product.name);
                        let isSS = STAINLESS_STEEL_ELECTRIC.has(normalized) || STAINLESS_STEEL_ELECTRIC.has(normalizedLoose) || STAINLESS_STEEL_ELECTRIC_LOOSE.has(normalizedLoose);
                        if (!isSS) {
                            // эвристика: stainless steel, blue steel, chromes/flat wound RPS synyster
                            if ((/stainless\s*steel/.test(normalized) || /blue\s*steel/.test(normalized) || /chromes\s*flat\s*wound/.test(normalized) || /synyster\s*gates.*stainless/.test(normalized)) && !/nickel/.test(normalized)) {
                                isSS = true;
                            }
                        }
                        if (isSS) {
                            const t = (translations[(localStorage.getItem('selectedLanguage')||'uk')]||{});
                            const badge = (t.stainlessSteelInfo)||'Stainless Steel';
                            const title = (t.stainlessSteelShowAll)||'Показать все Stainless Steel';
                            return `<span class="product-stainless" title="${title}">${badge}</span>`;
                        }
                    } catch(e) {}
                    return '';
                })() +
                (function(){
                    // Пометка для Cobalt
                    try {
                        const normalized = (product.name||'').toLowerCase().trim();
                        const normalizedLoose = normalizeLooseName(product.name);
                        let isCobalt = COBALT_ELECTRIC.has(normalized) || COBALT_ELECTRIC.has(normalizedLoose) || COBALT_ELECTRIC_LOOSE.has(normalizedLoose);
                        if (!isCobalt) {
                            if (/\bcobalt\b/.test(normalized)) {
                                isCobalt = true;
                            }
                        }
                        if (isCobalt) {
                            const t = (translations[(localStorage.getItem('selectedLanguage')||'uk')]||{});
                            const badge = (t.cobaltInfo)||'Cobalt';
                            const title = (t.cobaltShowAll)||'Показать все Cobalt';
                            return `<span class="product-cobalt" title="${title}">${badge}</span>`;
                        }
                    } catch(e) {}
                    return '';
                })() +
                (function(){
                    // Пометка для Colored Strings
                    try {
                        const normalized = (product.name||'').toLowerCase().trim();
                        const normalizedLoose = normalizeLooseName(product.name);
                        let isColored = COLORED_ELECTRIC.has(normalized) || COLORED_ELECTRIC.has(normalizedLoose) || COLORED_ELECTRIC_LOOSE.has(normalizedLoose);
                        if (!isColored) {
                            if (/\b(neon|colored|k3\s*coated|black\s*beauties)\b/.test(normalized)) {
                                isColored = true;
                            }
                        }
                        if (isColored) {
                            const t = (translations[(localStorage.getItem('selectedLanguage')||'uk')]||{});
                            const badge = (t.coloredInfo)||'Colored Strings';
                            const title = (t.coloredShowAll)||'Показать все Colored Strings';
                            return `<span class=\"product-colored\" title=\"${title}\">${badge}</span>`;
                        }
                    } catch(e) {}
                    return '';
                })() +
            '</div>' +
            '<div class="product-prices">' +
                oldPriceHtml +
                '<div class="new-price">' + newPrice + ' ' + getCurrency() + '</div>' +
            '</div>' +
            '<div class="product-rating">' + ratingHtml + '</div>' +
        '</div>' +
        statusButton;
    
    // console.log('createProductCard: HTML карточки создан:', cardHtml);
    card.innerHTML = cardHtml;
    
    // console.log('createProductCard: Карточка создана и возвращена');
    return card;
}

// Функция создания HTML для рейтинга
function createRatingHtml(rating, currentTranslations) {
    if (!rating || rating === 'Нет рейтинга') {
        return '<span class="no-rating">' + (currentTranslations.noRating || 'Нет рейтинга') + '</span>';
    }
    
    const ratingValue = parseFloat(rating);
    if (isNaN(ratingValue)) {
        return '<span class="no-rating">' + (currentTranslations.noRating || 'Нет рейтинга') + '</span>';
    }
    
    let html = '';
    const fullStars = Math.floor(ratingValue);
    const hasHalfStar = ratingValue % 1 >= 0.5;
    const emptyStars = 5 - fullStars - (hasHalfStar ? 1 : 0);
    
    // Добавляем полные звезды
    for (let i = 0; i < fullStars; i++) {
        html += '<span class="star-filled">★</span>';
    }
    
    // Добавляем половинную звезду
    if (hasHalfStar) {
        html += '<span class="star-half">★</span>';
    }
    
    // Добавляем пустые звезды
    for (let i = 0; i < emptyStars; i++) {
        html += '<span class="star-empty">★</span>';
    }
    
    return html;
}

// Функция переключения языка
function switchLanguage(lang) {
    console.log('switchLanguage: Переключаем на язык:', lang);
    
    // Проверяем, что translations загружен
    if (typeof translations === 'undefined') {
        console.error('switchLanguage: translations не загружен, пропускаем переключение языка');
        return;
    }
    
    // Сохраняем выбранный язык в localStorage
    localStorage.setItem('selectedLanguage', lang);
    
    // Обновляем все элементы с data-translate
    const elements = document.querySelectorAll('[data-translate]');
    console.log(`switchLanguage: Найдено ${elements.length} элементов для перевода`);
    
    elements.forEach(element => {
        const key = element.getAttribute('data-translate');
        if (translations[lang] && translations[lang][key]) {
            if (key === 'offerText') {
                element.innerHTML = translations[lang][key];
                console.log(`switchLanguage: Обновлен ${key} (innerHTML):`, translations[lang][key]);
            } else if (key === 'searchPlaceholder') {
                // Специальная обработка для placeholder поиска
                element.placeholder = translations[lang][key];
                console.log(`switchLanguage: Обновлен ${key} (placeholder):`, translations[lang][key]);
            } else {
                const oldText = element.textContent;
                element.textContent = translations[lang][key];
                console.log(`switchLanguage: Обновлен ${key}: "${oldText}" → "${translations[lang][key]}"`);
            }
        } else {
            console.warn(`switchLanguage: Перевод не найден для ключа "${key}" на языке "${lang}"`);
        }
    });
    
    // Обновляем все элементы с data-translate-placeholder
    const placeholderElements = document.querySelectorAll('[data-translate-placeholder]');
    placeholderElements.forEach(element => {
        const key = element.getAttribute('data-translate-placeholder');
        if (translations[lang] && translations[lang][key]) {
            element.placeholder = translations[lang][key];
        }
    });
    
    // Обновляем атрибут lang у html
    document.documentElement.lang = lang;
    
    // Если есть активная категория, не рендерим промежуточно все товары, сразу пере-применяем фильтр
    if (currentCategory) {
        console.log('switchLanguage: Активный фильтр есть, сразу пере-применяем категорию без промежуточного рендера:', currentCategory);
        filterProductsByCategory(currentCategory, true);
    } else if (window.currentProducts && window.currentProducts.length > 0) {
        console.log('switchLanguage: Пересоздаем карточки товаров с новым языком (фильтр не активен)');
        displayProducts(window.currentProducts);
    }
    
    // Обновляем онлайн статус
    updateOnlineStatus();
    
    console.log('switchLanguage: Язык переключен на:', lang);
	// Синхронизуем кнопку языка в кабинете
	try { updateAccountLangButton(lang); } catch (e) {}
    // Обновляем валюту и статусы заказов в кабинете
    try { if (typeof updateAccountOrdersLocale === 'function') updateAccountOrdersLocale(); } catch (e) {}
}

// Функция инициализации языка
function initializeLanguage() {
    console.log('initializeLanguage: Инициализируем язык');
    
    // Получаем сохраненный язык или используем украинский по умолчанию
    const savedLanguage = localStorage.getItem('selectedLanguage') || 'uk';
    console.log('initializeLanguage: Сохраненный язык:', savedLanguage);
    
    // Переключаем на сохраненный язык
    switchLanguage(savedLanguage);
    
    // Дополнительно обновляем активное состояние кнопок языка
    // Это нужно для случая, когда DOM еще не полностью загружен
    setTimeout(() => {
        console.log('initializeLanguage: Дополнительно обновляем активное состояние кнопок языка');
        updateLanguageButtons(savedLanguage);
    }, 100);
    
    // Дополнительная проверка заголовка через 1 секунду (без повторного switchLanguage)
    setTimeout(() => {
        console.log('initializeLanguage: Финальная проверка переводов');
        const bannerTitle = document.querySelector('[data-translate="bannerTitle"]');
        if (bannerTitle) {
            console.log('initializeLanguage: Текущий текст заголовка баннера:', bannerTitle.textContent);
            console.log('initializeLanguage: Ожидаемый текст для языка', savedLanguage, ':', translations[savedLanguage]?.bannerTitle);
            if (bannerTitle.textContent !== translations[savedLanguage]?.bannerTitle) {
                console.log('initializeLanguage: Обновляем только текст заголовка баннера без повторного switchLanguage');
                bannerTitle.textContent = translations[savedLanguage]?.bannerTitle || bannerTitle.textContent;
            }
        }
    }, 1000);
    
    console.log('initializeLanguage: Язык инициализирован:', savedLanguage);
}

// Функция настройки переключателей языка
function setupLanguageSwitchers() {
    console.log('setupLanguageSwitchers: Настраиваем переключатели языка');
    
    // Находим кнопки переключения языка
    const ukButton = document.querySelector('[data-lang="uk"]');
    const ruButton = document.querySelector('[data-lang="ru"]');
    const enButton = document.querySelector('[data-lang="en"]');
    
    console.log('setupLanguageSwitchers: Найдены кнопки языка:', { ukButton, ruButton, enButton });
    
    if (ukButton) {
        ukButton.addEventListener('click', function() {
            console.log('setupLanguageSwitchers: Переключаем на украинский');
            switchLanguage('uk');
            updateLanguageButtons('uk');
        });
    }
    
    if (ruButton) {
        ruButton.addEventListener('click', function() {
            console.log('setupLanguageSwitchers: Переключаем на русский');
            switchLanguage('ru');
            updateLanguageButtons('ru');
        });
    }
    
    if (enButton) {
        enButton.addEventListener('click', function() {
            console.log('setupLanguageSwitchers: Переключаем на английский');
            switchLanguage('en');
            updateLanguageButtons('en');
        });
    }
    
    // Устанавливаем активное состояние для текущего языка
    const currentLanguage = localStorage.getItem('selectedLanguage') || 'uk';
    console.log('setupLanguageSwitchers: Текущий язык:', currentLanguage);
    updateLanguageButtons(currentLanguage);
    
    console.log('setupLanguageSwitchers: Переключатели языка настроены');
}

// Функция обновления активного состояния кнопок языка
function updateLanguageButtons(activeLang) {
    console.log('updateLanguageButtons: Обновляем активное состояние для языка:', activeLang);
    
    const ukButton = document.querySelector('[data-lang="uk"]');
    const ruButton = document.querySelector('[data-lang="ru"]');
    const enButton = document.querySelector('[data-lang="en"]');
    
    console.log('updateLanguageButtons: Найдены кнопки языка:', { ukButton, ruButton, enButton });
    
    // Убираем активное состояние со всех кнопок
    if (ukButton) {
        ukButton.classList.remove('active');
        console.log('updateLanguageButtons: Убран класс active с украинской кнопке');
    }
    if (ruButton) {
        ruButton.classList.remove('active');
        console.log('updateLanguageButtons: Убран класс active с русской кнопке');
    }
    if (enButton) {
        enButton.classList.remove('active');
        console.log('updateLanguageButtons: Убран класс active с английской кнопке');
    }
    
    // Добавляем активное состояние к выбранной кнопке
    switch (activeLang) {
        case 'uk':
            if (ukButton) {
                ukButton.classList.add('active');
                console.log('updateLanguageButtons: Добавлен класс active к украинской кнопке');
            }
            break;
        case 'ru':
            if (ruButton) {
                ruButton.classList.add('active');
                console.log('updateLanguageButtons: Добавлен класс active к русской кнопке');
            }
            break;
        case 'en':
            if (enButton) {
                enButton.classList.add('active');
                console.log('updateLanguageButtons: Добавлен класс active к английской кнопке');
            }
            break;
    }
    
    console.log('updateLanguageButtons: Активное состояние обновлено для языка:', activeLang);
}

// Инициализация при загрузке страницы
document.addEventListener('DOMContentLoaded', function() {
    console.log('DOM загружен, инициализируем приложение');
    
    // Маркируем окружение Telegram WebApp
    try {
        if (window.Telegram && window.Telegram.WebApp) {
            document.body.classList.add('is-telegram');
        } else {
            document.body.classList.remove('is-telegram');
        }
    } catch (e) {}

    // Инициализируем язык
    initializeLanguage();
    
    // Инициализируем корзину
    initializeCart();
    
    // Сбрасываем состояние бесконечной прокрутки
    currentPage = 0;
    hasMoreProducts = true;
    loadedProductNames.clear();
    
    // Определяем сохранённый вид
    let savedView = 'products';
    try { savedView = localStorage.getItem('currentView') || 'products'; } catch (e) {}
    if (savedView === 'account') {
        // Настраиваем обработчики и открываем кабинет без загрузки товаров
        setupEventHandlers();
        setupCabinetNav();
        showAccountView();
    } else {
        // Если сохранён фильтр категории — сразу применяем его вместо первичной загрузки 30 товаров
        let savedCategory = '';
        try { savedCategory = localStorage.getItem('currentCategory') || ''; } catch (e) {}
        if (savedCategory) {
            try { localStorage.setItem('currentView', 'products'); } catch (e) {}
            setupEventHandlers();
            setupCabinetNav();
            try {
                isCategoryFilterActive = true;
                currentCategory = savedCategory;
                lastCategorySearch = '';
            } catch (e) {}
            filterProductsByCategory(savedCategory, true);
        } else {
            // Сразу фиксируем, что стартуем в товарах
            try { localStorage.setItem('currentView', 'products'); } catch (e) {}
            // Автоматически загружаем товары
            loadProducts(0, false).then(() => {
                // Настраиваем обработчики событий после загрузки товаров
                setupEventHandlers();
                setupCabinetNav();
            });
        }
    }
    
    // Обновляем онлайн статус
    updateOnlineStatus();
    
    // Обновляем статус каждую минуту
    setInterval(updateOnlineStatus, 60000);

    // Перед перезагрузкой сохраняем фактический видимый раздел
    window.addEventListener('beforeunload', function() {
        try {
            const view = getVisibleView();
            localStorage.setItem('currentView', view);
        } catch (e) {}
    });
});

// Функция настройки обработчиков событий
function setupEventHandlers() {
    console.log('setupEventHandlers: Настраиваем обработчики событий');
    
    // Обработчик клавиши ESC для закрытия попапов
    document.addEventListener('keydown', function(event) {
        if (event.key === 'Escape') {
            // Закрываем корзину
            const cartPopup = document.getElementById('cartPopup');
            if (cartPopup && cartPopup.style.display === 'flex') {
                closeCartPopup();
                return;
            }
            
            // Закрываем меню
            const menuPopup = document.getElementById('menuPopup');
            if (menuPopup && menuPopup.style.display === 'flex') {
                menuPopup.style.display = 'none';
                return;
            }
            
            // Закрываем настройки
            const settingsPopup = document.getElementById('settingsPopup');
            if (settingsPopup && settingsPopup.style.display === 'flex') {
                settingsPopup.style.display = 'none';
                return;
            }
            
                         // Закрываем контакты
             const contactsPopup = document.getElementById('contactsPopup');
             if (contactsPopup && (contactsPopup.classList.contains('show') || contactsPopup.style.display === 'flex')) {
                 closeContactsPopup();
                 return;
             }
            
                         // Закрываем оферту
             const offerPopup = document.getElementById('offerPopup');
             if (offerPopup && (offerPopup.classList.contains('show') || offerPopup.style.display === 'flex')) {
                 closeOfferPopup();
                 return;
             }
        }
    });
    
    // Обработчик переключения языков
    setupLanguageSwitchers();
    
    // Дополнительно обновляем активное состояние кнопок языка после настройки обработчиков
    const currentLanguage = localStorage.getItem('selectedLanguage') || 'uk';
    setTimeout(() => {
        console.log('setupEventHandlers: Дополнительно обновляем активное состояние кнопок языка:', currentLanguage);
        updateLanguageButtons(currentLanguage);
    }, 200);
    
    // Обработчик клика вне попапов
    document.addEventListener('click', function(event) {
        // Убираем лишний лог - он срабатывает при каждом клике
        // console.log('setupEventHandlers: Обработчик клика вне попапов сработал');
        
        // Проверяем, открыты ли контакты или оферта
        const contactsPopup = document.getElementById('contactsPopup');
        const offerPopup = document.getElementById('offerPopup');
        const isContactsOpen = contactsPopup && (contactsPopup.classList.contains('show') || contactsPopup.style.display === 'flex');
        const isOfferOpen = offerPopup && (offerPopup.classList.contains('show') || offerPopup.style.display === 'flex');
        
        // Если открыты контакты или оферта, НЕ закрываем меню по клику вне
        if (isContactsOpen || isOfferOpen) {
            console.log('setupEventHandlers: Контакты или оферта открыты, меню остается открытым');
            return;
        }
        
        // Дополнительная проверка: если оферта только что закрылась, не закрываем меню
        if (offerPopup && offerPopup.style.display === 'none' && offerPopup.classList.contains('show') === false) {
            console.log('setupEventHandlers: Оферта только что закрылась, меню остается открытым');
            return;
        }
        
        // Закрытие меню аватара
        const avatarMenu = document.querySelector('.avatar-dropdown');
        const profilePic = document.querySelector('.profile-pic');
        
        if (avatarMenu && avatarMenu.classList.contains('show')) {
            if (!profilePic.contains(event.target) && !avatarMenu.contains(event.target)) {
                avatarMenu.classList.remove('show');
                console.log('toggleAvatarMenu: Меню аватара закрыто (клик вне)');
            }
        }
        
        // Закрытие меню (только если не открыты контакты/оферта)
        const menuPopup = document.getElementById('menuPopup');
        const menuBtn = document.querySelector('.menu-btn');
        
        if (menuPopup && menuPopup.style.display === 'flex') {
            if (!menuBtn.contains(event.target) && !menuPopup.contains(event.target)) {
                menuPopup.style.display = 'none';
                console.log('showMenuPopup: Меню закрыто (клик вне)');
            }
        }
        
        // Закрытие настроек
        const settingsPopup = document.getElementById('settingsPopup');
        const settingsBtn = document.querySelector('.settings-btn');
        
        if (settingsPopup && settingsPopup.style.display === 'flex') {
            if (!settingsBtn.contains(event.target) && !settingsPopup.contains(event.target)) {
                settingsPopup.style.display = 'none';
                console.log('showSettingsPopup: Настройки закрыты (клик вне)');
            }
        }
        
        // Закрытие корзины
        const cartPopup = document.getElementById('cartPopup');
        const cartBtn = document.querySelector('.cart-btn');
        
        if (cartPopup && cartPopup.style.display === 'flex') {
            if (cartBtn && !cartBtn.contains(event.target) && !cartPopup.contains(event.target)) {
                closeCartPopup();
                console.log('showCartPopup: Корзина закрыта (клик вне)');
            }
        }
    });

    // Клик по заголовку баннера → поведение как "Струны для электрогитары"
    const bannerTitleEl = document.querySelector('.banner-title');
    if (bannerTitleEl) {
        bannerTitleEl.addEventListener('click', function() {
            console.log('setupEventHandlers: Клик по заголовку баннера → electricGuitarStrings');
            clearCategoryFilter();
        });
        bannerTitleEl.setAttribute('title', 'Струны для электрогитары');
    } else {
        console.warn('setupEventHandlers: Заголовок баннера .banner-title не найден');
    }
    
    // Обработчик кликов по кнопкам добавления в корзину
    document.addEventListener('click', function(event) {
        if (event.target.classList.contains('add-to-cart-btn')) {
            const index = parseInt(event.target.getAttribute('data-index'));
            console.log('Клик по кнопке добавления в корзину, индекс:', index);
            
            // Получаем данные товара из глобального массива
            if (window.currentProducts && window.currentProducts[index]) {
                const product = window.currentProducts[index];
                addToCart(product);
                
                // Показываем уведомление
                showAddToCartNotification(product.name);
            }
        }
        
        // Обработчик кнопки избранного
        if (event.target.closest('.favorite-btn')) {
            const btn = event.target.closest('.favorite-btn');
            const index = parseInt(btn.getAttribute('data-index'));
            console.log('Клик по кнопке избранного, индекс:', index);
            
            // Переключаем состояние
            btn.classList.toggle('active');
            const icon = btn.querySelector('i');
            if (btn.classList.contains('active')) {
                icon.className = 'fas fa-heart';
                icon.style.color = '#ff6b6b';
            } else {
                icon.className = 'far fa-heart';
                icon.style.color = '';
            }
        }
        
                                   // Обработчик кнопки сравнения
        if (event.target.closest('.compare-btn')) {
            const btn = event.target.closest('.compare-btn');
            const index = parseInt(btn.getAttribute('data-index'));
            console.log('Клик по кнопке сравнения, индекс:', index);
            
            // Находим соответствующую карточку товара
            const productCard = btn.closest('.product-card');
            const checkbox = productCard.querySelector('.compare-checkbox');
            
            // Переключаем состояние кнопки весов
            btn.classList.toggle('active');
            const icon = btn.querySelector('i');
            if (btn.classList.contains('active')) {
                // Активное состояние - желтые весы
                icon.className = 'fas fa-balance-scale';
                icon.style.color = '#FFD700';
                // Активируем галочку
                checkbox.checked = true;
            } else {
                // Неактивное состояние - серые весы
                icon.className = 'fas fa-balance-scale';
                icon.style.color = '#666';
                // Деактивируем галочку
                checkbox.checked = false;
            }
            
            // Обрабатываем логику сравнения
            if (window.currentProducts && window.currentProducts[index]) {
                const product = window.currentProducts[index];
                if (checkbox.checked) {
                    console.log('Товар добавлен в список сравнения:', product.name);
                    // Здесь можно добавить логику для сохранения в localStorage
                } else {
                    console.log('Товар удален из списка сравнения:', product.name);
                    // Здесь можно добавить логику для удаления из localStorage
                }
            }
        }
        
        // Обработчик чекбокса сравнения
        if (event.target.classList.contains('compare-checkbox')) {
            const checkbox = event.target;
            const index = parseInt(checkbox.getAttribute('data-index'));
            console.log('Клик по чекбоксу сравнения, индекс:', index);
            
            // Находим соответствующую кнопку весов
            const productCard = checkbox.closest('.product-card');
            const compareBtn = productCard.querySelector('.compare-btn');
            const icon = compareBtn.querySelector('i');
            
            // Синхронизируем состояние кнопки весов с галочкой
            if (checkbox.checked) {
                // Активируем кнопку весов
                compareBtn.classList.add('active');
                icon.className = 'fas fa-balance-scale';
                icon.style.color = '#FFD700';
            } else {
                // Деактивируем кнопку весов
                compareBtn.classList.remove('active');
                icon.className = 'fas fa-balance-scale';
                icon.style.color = '#666';
            }
            
            // Обрабатываем логику сравнения
            if (window.currentProducts && window.currentProducts[index]) {
                const product = window.currentProducts[index];
                if (checkbox.checked) {
                    console.log('Товар добавлен в список сравнения:', product.name);
                    // Здесь можно добавить логику для сохранения в localStorage
                } else {
                    console.log('Товар удален из списка сравнения:', product.name);
                    // Здесь можно добавить логику для удаления из localStorage
                }
            }
        }
    });
    
    // Обработчик поиска
    const searchInput = document.querySelector('.search-input');
    if (searchInput) {
        console.log('setupEventHandlers: Найден поисковый input, настраиваем обработчик');
        
        // Удаляем предыдущий обработчик, если он есть
        if (searchInput._inputHandler) {
            searchInput.removeEventListener('input', searchInput._inputHandler);
        }
        
        // Создаем новый обработчик
        searchInput._inputHandler = function(e) {
            const query = e.target.value;
            console.log('setupEventHandlers: Поисковый запрос:', query);
            
            // Очищаем предыдущий таймаут
            if (searchTimeout) {
                clearTimeout(searchTimeout);
            }
            
            // Если поиск пустой, загружаем все товары
            if (!query.trim()) {
                searchTerm = '';
                isSearchActive = false;
                // Сбрасываем состояние бесконечной прокрутки
                currentPage = 0;
                hasMoreProducts = true;
                loadedProductNames.clear();
                loadProducts(0, false);
                return;
            }
            
            // Устанавливаем задержку для поиска (debouncing)
            searchTimeout = setTimeout(function() {
                searchProducts(query);
            }, 300);
        };
        
        // Добавляем обработчик
        searchInput.addEventListener('input', searchInput._inputHandler);
    }
    
         // Обработчик прокрутки для бесконечной загрузки
     window.addEventListener('scroll', function() {
        // Если открыт кабинет — не подгружаем товары
        const account = document.getElementById('account-section');
        if (account && account.style.display === 'block') {
            console.log('setupEventHandlers: Прокрутка — кабинет открыт, подгрузка отключена');
            return;
        }
        if (isLoading || !hasMoreProducts || isSearchActive || isCategoryFilterActive) {
            console.log('setupEventHandlers: Прокрутка заблокирована - isLoading:', isLoading, 'hasMoreProducts:', hasMoreProducts, 'isSearchActive:', isSearchActive, 'isCategoryFilterActive:', isCategoryFilterActive);
            return;
        }
        
        const scrollTop = window.pageYOffset || document.documentElement.scrollTop;
        const windowHeight = window.innerHeight;
        const documentHeight = document.documentElement.scrollHeight;
        
        // Загружаем следующую страницу когда пользователь приближается к концу страницы
        if (scrollTop + windowHeight >= documentHeight - 100) {
            console.log('setupEventHandlers: Достигнут конец страницы, загружаем следующую страницу');
            loadNextPage();
        }
    }, { passive: true });
     
                  // Обработчик изменения способа доставки
       const deliveryMethodSelect = document.getElementById('deliveryMethodSelect');
       if (deliveryMethodSelect) {
           deliveryMethodSelect.addEventListener('change', function() {
               console.log('setupEventHandlers: Изменен способ доставки на:', this.value);
               updateDeliveryCost();
               updateCartCalculations(); // Дополнительно обновляем расчеты корзины
           });
       }
      
             // Обработчик изменения способа оплаты
       const paymentMethodSelect = document.getElementById('paymentMethodSelect');
       if (paymentMethodSelect) {
           paymentMethodSelect.addEventListener('change', function() {
               console.log('setupEventHandlers: Изменен способ оплаты на:', this.value);
               updateDeliveryMethods();
               updateCartCalculations(); // Обновляем расчеты при изменении способа оплаты
           });
       }
     
           // Обработчик поля телефона
      const phoneInput = document.getElementById('cartCustomerPhone');
      if (phoneInput) {
          phoneInput.addEventListener('focus', function() {
              // Устанавливаем курсор после "+380"
              if (this.value === '+380') {
                  this.setSelectionRange(4, 4);
              }
          });
          
          phoneInput.addEventListener('input', function() {
              // Убеждаемся, что номер начинается с "+380"
              if (!this.value.startsWith('+380')) {
                  this.value = '+380' + this.value.replace(/^\+380/, '');
              }
          });
          
          phoneInput.addEventListener('keydown', function(e) {
              // Предотвращаем удаление "+380" при нажатии Backspace в начале
              if (e.key === 'Backspace' && this.selectionStart <= 4) {
                  e.preventDefault();
              }
          });
      }
      
             // Обработчик поля купона
       const couponInput = document.getElementById('cartCouponInput');
       if (couponInput) {
           couponInput.addEventListener('input', function() {
               console.log('setupEventHandlers: Изменен купон:', this.value);
               updateCartCalculations();
           });
           
           // Также обновляем при потере фокуса
           couponInput.addEventListener('blur', function() {
               console.log('setupEventHandlers: Купон потерял фокус:', this.value);
               updateCartCalculations();
           });
       }
       
       // Обработчик поля бонусов
       const bonusesInput = document.getElementById('cartBonusesInput');
       if (bonusesInput) {
           bonusesInput.addEventListener('input', function() {
               console.log('setupEventHandlers: Изменены бонусы:', this.value);
               updateCartCalculations();
           });
           
           // Также обновляем при потере фокуса
           bonusesInput.addEventListener('blur', function() {
               console.log('setupEventHandlers: Бонусы потеряли фокус:', this.value);
               updateCartCalculations();
           });
       }
       
       // Обработчик кнопки корзины
       const cartBtn = document.querySelector('.cart-btn');
       if (cartBtn) {
           cartBtn.addEventListener('click', function() {
               console.log('setupEventHandlers: Клик по кнопке корзины');
               showCartPopup();
           });
       }
       
                       // Обработчик кликов по кнопкам нижней панели меню
         const navItems = document.querySelectorAll('.nav-item');
         console.log('setupEventHandlers: Найдены nav-items:', navItems.length);
         
         // Обработчик кликов по категориям
         const categoryItems = document.querySelectorAll('.brand-logo');
         console.log('setupEventHandlers: Найдены brand-logo:', categoryItems.length);
         
         if (categoryItems.length > 0) {
             categoryItems.forEach(categoryItem => {
                 // Удаляем предыдущий обработчик, если он есть
                 if (categoryItem._clickHandler) {
                     categoryItem.removeEventListener('click', categoryItem._clickHandler);
                 }
                 
                 // Создаем новый обработчик
                 categoryItem._clickHandler = function() {
                     const category = this.getAttribute('data-category');
                     console.log('setupEventHandlers: Клик по категории:', category);
                     filterProductsByCategory(category);
                     // Подсветка активного пункта
                     try {
                         document.querySelectorAll('.brand-logo').forEach(el => el.classList.remove('active'));
                         this.classList.add('active');
                     } catch (e) {}
                 };
                 
                 // Добавляем обработчик
                 categoryItem.addEventListener('click', categoryItem._clickHandler);
             });
             console.log('setupEventHandlers: Обработчики для категорий настроены');
         } else {
             console.warn('setupEventHandlers: Элементы .brand-logo не найдены');
         }
        
        if (navItems.length > 0) {
            // Устанавливаем активную кнопку в соответствии с сохранённым видом
            try {
                const savedView = localStorage.getItem('currentView') || 'products';
                navItems.forEach(item => item.classList.remove('active'));
                navItems.forEach(item => {
                    const txt = item.querySelector('span')?.textContent || '';
                    if (savedView === 'account' && (txt.includes('Кабинет') || txt.includes('Cabinet') || txt.includes('Кабінет'))) {
                        item.classList.add('active');
                    } else if (savedView !== 'account' && (txt.includes('Товары') || txt.includes('Products'))) {
                        item.classList.add('active');
                    }
                });
            } catch (e) {}
             
             navItems.forEach((navItem, index) => {
                 // Удаляем предыдущий обработчик, если он есть
                 if (navItem._clickHandler) {
                     navItem.removeEventListener('click', navItem._clickHandler);
                 }
                 
                                  // Создаем новый обработчик
                 navItem._clickHandler = (e) => {
                     console.log(`setupEventHandlers: Клик по nav-item ${index + 1}`);
                     
                     // Предотвращаем всплытие события
                     e.stopPropagation();
                     e.preventDefault();
                     e.stopImmediatePropagation();
                     
                     // Убираем активный класс со всех кнопок
                     navItems.forEach(item => {
                         item.classList.remove('active');
                     });
                     
                     // Добавляем активный класс к нажатой кнопке
                     navItem.classList.add('active');
                     console.log(`setupEventHandlers: Добавлен активный класс к кнопке ${navItem.querySelector('span')?.textContent}`);
                     
                     // Выполняем соответствующее действие
                     const navText = navItem.querySelector('span').textContent;
                     console.log(`setupEventHandlers: Выполняем действие для: ${navText}`);
                     
                     // Выполняем действие в зависимости от кнопки
                     if (navText.includes('Товары') || navText.includes('Products')) {
                         // Показываем все товары (категория Струны для электрогитары)
                         console.log('setupEventHandlers: Открываем категорию Товары (Струны для электрогитары)');
                         clearCategoryFilter();
                         if (typeof showProductsView === 'function') showProductsView();
                         try { localStorage.setItem('currentView', 'products'); } catch (e) {}
                     } else if (navText.includes('Кабинет') || navText.includes('Cabinet') || navText.includes('Кабінет')) {
                         if (typeof showAccountView === 'function') showAccountView();
                         try { localStorage.setItem('currentView', 'account'); } catch (e) {}
                     } else if (navText.includes('Корзина') || navText.includes('Cart')) {
                         showCartPopup();
                     } else if (navText.includes('Контакты') || navText.includes('Contacts')) {
                         showContactsPopup();
                     } else if (navText.includes('Оферта') || navText.includes('Offer')) {
                         showOfferPopup();
                     }
                     
                     // Возвращаем false для предотвращения дальнейшего распространения события
                     return false;
                 };
                 
                 // Добавляем обработчик
                 navItem.addEventListener('click', navItem._clickHandler);
                 console.log(`setupEventHandlers: Обработчик для nav-item ${index + 1} настроен`);
             });
        }
        
        // Обработчик кликов по элементам меню
        const menuItems = document.querySelectorAll('.menu-item');
        console.log('setupEventHandlers: Найдены menu-items:', menuItems.length);
        
        if (menuItems.length > 0) {
            menuItems.forEach(menuItem => {
                menuItem.addEventListener('click', function() {
                    const category = this.getAttribute('data-category');
                    console.log('setupEventHandlers: Клик по элементу меню:', category);
                    
                    // Закрываем меню
                    const menuPopup = document.getElementById('menuPopup');
                    if (menuPopup) {
                        menuPopup.style.display = 'none';
                    }
                    
                    // Обрабатываем категорию
                    if (category === 'electricGuitarStrings') {
                        // Для "Струны для электрогитары" просто показываем все товары
                        console.log('setupEventHandlers: Открываем категорию Струны для электрогитары');
                        clearCategoryFilter();
                    } else if (category) {
                        // Для других категорий используем фильтрацию
                        filterProductsByCategory(category);
                    }
                });
            });
            console.log('setupEventHandlers: Обработчики для меню настроены');
        } else {
            console.warn('setupEventHandlers: Элементы .menu-item не найдены');
        }
}

// Делаем функции доступными глобально
window.showContactsPopup = showContactsPopup;
window.closeContactsPopup = closeContactsPopup;
window.showOfferPopup = showOfferPopup;
window.closeOfferPopup = closeOfferPopup;
window.showDiscontinuedPopup = showDiscontinuedPopup;
window.showOutOfStockPopup = showOutOfStockPopup;
window.showExpectedPopup = showExpectedPopup;
window.showOnOrderPopup = showOnOrderPopup;

// Функция фильтрации товаров по категории
function filterProductsByCategory(category, force = false) {
    console.log(`filterProductsByCategory: Фильтруем товары по категории: ${category}`);
    
    // Предотвращаем дублирование поиска
    if (!force && lastCategorySearch === category) {
        console.log(`filterProductsByCategory: Пропускаем дублирующий поиск для: ${category}`);
        return;
    }
    
    // Сохраняем активную категорию для восстановления после F5
    try { localStorage.setItem('currentCategory', category); } catch (e) {}
    try { localStorage.setItem('currentView', 'products'); } catch (e) {}

    // Очищаем предыдущий таймаут
    if (categorySearchTimeout) {
        clearTimeout(categorySearchTimeout);
    }
    
    // Устанавливаем флаг активной фильтрации
    isCategoryFilterActive = true;
    console.log(`filterProductsByCategory: Установлен флаг isCategoryFilterActive = true`);

    // Сохраняем текущую категорию
    currentCategory = category;
    try { localStorage.setItem('currentCategory', currentCategory); } catch (e) {}
    
    // Очищаем поисковое поле
    const searchInput = document.getElementById('searchInput');
    if (searchInput) {
        searchInput.value = '';
    }
    
    // Сбрасываем пагинацию
    currentPage = 0;
    hasMoreProducts = true;
    
    // Очищаем контейнер товаров
    const productsContainer = document.getElementById('productsContainer');
    if (productsContainer) {
        productsContainer.innerHTML = '';
    }
    
    // Показываем индикатор загрузки
    showLoadingIndicator();
    
    // Debounce для поиска категорий - задержка 300ms (или 0 при force)
    categorySearchTimeout = setTimeout(() => {
        console.log(`filterProductsByCategory: Выполняем отложенный поиск для: ${category}`);
        
        if (category === '09-gauge') {
            console.log('filterProductsByCategory: 09-gauge - специальный список, используем поисковую функцию');
            searchGauge09ElectricProducts();
        } else if (category === '7-string') {
            console.log(`filterProductsByCategory: 7-string - характеристика, используем фильтрацию`);
            search7StringProducts();
        } else if (category === '8-string') {
            console.log(`filterProductsByCategory: 8-string - характеристика, используем фильтрацию`);
            search8StringProducts();
        } else if (category === '9-string') {
            console.log(`filterProductsByCategory: 9-string - характеристика, используем фильтрацию`);
            search9StringProducts();
        } else if (category === '10-gauge') {
            console.log('filterProductsByCategory: 10-gauge - специальный список, используем поисковую функцию');
            searchGauge10ElectricProducts();
        } else if (category === '11-gauge') {
            console.log('filterProductsByCategory: 11-gauge - специальный список, используем поисковую функцию');
            searchGauge11ElectricProducts();
        } else if (category === 'nickel-plated') {
            console.log('filterProductsByCategory: nickel-plated - характеристика, используем фильтрацию');
            searchNickelPlatedElectricProducts();
        } else if (category === 'pure-nickel') {
            console.log('filterProductsByCategory: pure-nickel - характеристика, используем фильтрацию');
            searchPureNickelElectricProducts();
        } else if (category === 'stainless-steel') {
            console.log('filterProductsByCategory: stainless-steel - характеристика, используем фильтрацию');
            searchStainlessSteelProducts();
        } else if (category === 'cobalt') {
            console.log('filterProductsByCategory: cobalt - характеристика, используем фильтрацию');
            searchCobaltProducts();
        } else if (category === 'colored') {
            console.log('filterProductsByCategory: colored - характеристика, используем фильтрацию');
            searchColoredElectricProducts();
        } else if (category === 'flatwound') {
            console.log(`filterProductsByCategory: flatwound - характеристика, используем фильтрацию`);
            searchFlatwoundElectricProducts();
        } else if (category === 'dr') {
            console.log(`filterProductsByCategory: DR - используем поиск по DR`);
            searchDRProducts();
        } else if (category === 'la-bella') {
            console.log(`filterProductsByCategory: La Bella - используем поиск по La Bella`);
            searchLaBellaProducts();
        } else {
            console.log(`filterProductsByCategory: ${category} - производитель, используем поиск`);
            
            // Определяем поисковый запрос для производителя
            let searchQuery = '';
            switch (category) {
                case 'daddario':
                    searchQuery = 'addario';
                    break;
                case 'dean-markley':
                    searchQuery = 'Dean Markley';
                    break;
                case 'ernie-ball':
                    searchQuery = 'Ernie Ball';
                    break;
                case 'ghs':
                    searchQuery = 'GHS';
                    break;
                case 'dunlop':
                    searchQuery = 'Dunlop';
                    break;
                case 'elixir':
                    searchQuery = 'Elixir';
                    break;
                case 'fender':
                    searchQuery = 'Fender';
                    break;
                case 'gibson':
                    searchQuery = 'Gibson';
                    break;
                case 'cleartone':
                    searchQuery = 'Cleartone';
                    break;
                case 'curt-mangan':
                    searchQuery = 'Curt Mangan';
                    break;
                case 'pyramid':
                    searchQuery = 'Pyramid';
                    break;
                case 'rotosound':
                    searchQuery = 'Rotosound';
                    break;
                case 'optima':
                    searchQuery = 'Optima';
                    break;
                case 'orphee':
                    searchQuery = 'Orphee';
                    break;
                case 'musicians-gear':
                    searchQuery = 'Musicians Gear';
                    break;
                default:
                    searchQuery = category;
            }
            
            console.log(`filterProductsByCategory: Выполняем поиск по запросу: "${searchQuery}"`);
            searchProducts(searchQuery);
        }
        
        // Запоминаем последний поиск
        lastCategorySearch = category;
        
    }, force ? 0 : 300); // Без задержки при форсированном применении
}

// Функция очистки фильтра категорий
function clearCategoryFilter() {
    console.log('clearCategoryFilter: Очищаем фильтр категорий');
    
    // Убираем активный класс со всех категорий
    const allCategoryItems = document.querySelectorAll('.brand-logo');
    allCategoryItems.forEach(item => item.classList.remove('active'));
    
    // Очищаем поиск
    const searchInput = document.querySelector('.search-input');
    if (searchInput) {
        searchInput.value = '';
    }
    
    // Сбрасываем состояние поиска
    searchTerm = '';
    isSearchActive = false;
    isCategoryFilterActive = false;
    currentCategory = '';
    lastCategorySearch = '';
    try { localStorage.removeItem('currentCategory'); } catch (e) {}
    
    // Сбрасываем состояние бесконечной прокрутки
    currentPage = 0;
    hasMoreProducts = true;
    loadedProductNames.clear();
    
    // Всегда загружаем все товары заново
    console.log('clearCategoryFilter: Загружаем все товары заново');
    loadProducts(0, false);
}

// Функция специального поиска для товаров DR
async function searchDRProducts() {
    console.log('searchDRProducts: Поиск товаров DR по пометкам в карточках');
    
    try {
        // Сначала загружаем все товары в DOM для поиска по пометкам
        const response = await fetch('http://localhost:8000/api/products?start=0&limit=1000');
        if (!response.ok) {
            throw new Error(`HTTP error! status: ${response.status}`);
        }
        
        const data = await response.json();
        console.log(`searchDRProducts: Загружено ${data.products.length} товаров для поиска по пометкам`);
        
        if (data && data.products && data.products.length > 0) {
            // Отображаем все товары в DOM
            displayProducts(data.products);
            
            // Теперь ищем по пометкам в карточках
            const drCards = document.querySelectorAll('.product-manufacturer');
            console.log(`searchDRProducts: Найдено ${drCards.length} карточек с пометкой производителя`);
            
            if (drCards.length > 0) {
                // Фильтруем только карточки с пометкой DR
                const drProductCards = [];
                drCards.forEach(card => {
                    if (card.textContent.includes('DR')) {
                        const productCard = card.closest('.product-card');
                        if (productCard) {
                            drProductCards.push(productCard);
                        }
                    }
                });
                
                console.log(`searchDRProducts: Найдено ${drProductCards.length} карточек DR`);
                
                if (drProductCards.length > 0) {
                    // Скрываем все карточки, кроме DR
                    const allProductCards = document.querySelectorAll('.product-card');
                    allProductCards.forEach(card => {
                        card.style.display = 'none';
                    });
                    
                    // Показываем только карточки DR
                    drProductCards.forEach(card => {
                        card.style.display = 'block';
                    });
                    
                    isCategoryFilterActive = true;
                    console.log('searchDRProducts: Отображены только товары DR по пометкам');
                } else {
                    console.log('searchDRProducts: Карточки DR не найдены');
                    showNoSearchResults('DR');
                }
            } else {
                console.log('searchDRProducts: Карточки с пометкой производителя не найдены');
                showNoSearchResults('DR');
            }
        } else {
            console.log('searchDRProducts: Нет товаров для поиска');
            showNoSearchResults('DR');
        }
        
    } catch (error) {
        console.error('searchDRProducts: Ошибка специального поиска DR:', error);
        showNoSearchResults('DR');
    }
}

// Функция специального поиска для товаров La Bella
async function searchLaBellaProducts() {
    console.log('searchLaBellaProducts: Поиск товаров La Bella по пометкам в карточках');
    
    try {
        // Сначала загружаем все товары в DOM для поиска по пометкам
        const response = await fetch('http://localhost:8000/api/products?start=0&limit=1000');
        if (!response.ok) {
            throw new Error(`HTTP error! status: ${response.status}`);
        }
        
        const data = await response.json();
        console.log(`searchLaBellaProducts: Загружено ${data.products.length} товаров для поиска по пометкам`);
        
        if (data && data.products && data.products.length > 0) {
            // Отображаем все товары в DOM
            displayProducts(data.products);
            
            // Теперь ищем по пометкам в карточках
            const laBellaCards = document.querySelectorAll('.product-manufacturer');
            console.log(`searchLaBellaProducts: Найдено ${laBellaCards.length} карточек с пометкой производителя`);
            
            if (laBellaCards.length > 0) {
                // Фильтруем только карточки с пометкой La Bella
                const laBellaProductCards = [];
                laBellaCards.forEach(card => {
                    if (card.textContent.includes('La Bella')) {
                        const productCard = card.closest('.product-card');
                        if (productCard) {
                            laBellaProductCards.push(productCard);
                        }
                    }
                });
                
                console.log(`searchLaBellaProducts: Найдено ${laBellaProductCards.length} карточек La Bella`);
                
                if (laBellaProductCards.length > 0) {
                    // Скрываем все карточки, кроме La Bella
                    const allProductCards = document.querySelectorAll('.product-card');
                    allProductCards.forEach(card => {
                        card.style.display = 'none';
                    });
                    
                    // Показываем только карточки La Bella
                    laBellaProductCards.forEach(card => {
                        card.style.display = 'block';
                    });
                    
                    isCategoryFilterActive = true;
                    console.log('searchLaBellaProducts: Отображены только товары La Bella по пометкам');
                } else {
                    console.log('searchLaBellaProducts: Карточки La Bella не найдены');
                    showNoSearchResults('La Bella');
                }
            } else {
                console.log('searchLaBellaProducts: Карточки с пометкой производителя не найдены');
                showNoSearchResults('La Bella');
            }
        } else {
            console.log('searchLaBellaProducts: Нет товаров для поиска');
            showNoSearchResults('La Bella');
        }
        
    } catch (error) {
        console.error('searchLaBellaProducts: Ошибка специального поиска La Bella:', error);
        showNoSearchResults('La Bella');
    }
}

// Функция специального поиска для 7-струнных товаров
async function search7StringProducts() {
    console.log('search7StringProducts: Поиск 7-струнных товаров по пометкам в карточках');
    
    try {
        // Сначала загружаем все товары в DOM для поиска по пометкам
        const response = await fetch('http://localhost:8000/api/products?start=0&limit=1000');
        if (!response.ok) {
            throw new Error(`HTTP error! status: ${response.status}`);
        }
        
        const data = await response.json();
        console.log(`search7StringProducts: Загружено ${data.products.length} товаров для поиска по пометкам`);
        
        if (data && data.products && data.products.length > 0) {
            // Отображаем все товары в DOM
            displayProducts(data.products);
            
            // Теперь ищем по пометкам в карточках
            const sevenStringCards = document.querySelectorAll('.product-seven-string');
            console.log(`search7StringProducts: Найдено ${sevenStringCards.length} карточек с пометкой 7-струнных`);
            
            if (sevenStringCards.length > 0) {
                // Скрываем все карточки, кроме 7-струнных
                const allProductCards = document.querySelectorAll('.product-card');
                allProductCards.forEach(card => {
                    card.style.display = 'none';
                });
                
                // Показываем только карточки с пометкой 7-струнных
                sevenStringCards.forEach(sevenStringCard => {
                    const productCard = sevenStringCard.closest('.product-card');
                    if (productCard) {
                        productCard.style.display = 'block';
                    }
                });
                
                isCategoryFilterActive = true;
                console.log('search7StringProducts: Отображены только 7-струнные товары по пометкам');
                
                // Показываем примеры найденных товаров
                const productNames = Array.from(sevenStringCards).slice(0, 5).map(card => {
                    const productCard = card.closest('.product-card');
                    const nameElement = productCard?.querySelector('.product-name');
                    return nameElement?.textContent || 'Неизвестный товар';
                });
                console.log('search7StringProducts: Примеры найденных товаров:', productNames);
            } else {
                console.log('search7StringProducts: Карточки с пометкой 7-струнных не найдены');
                showNoSearchResults('7-струнные');
            }
        } else {
            console.log('search7StringProducts: Нет товаров для поиска');
            showNoSearchResults('7-струнные');
        }
        
    } catch (error) {
        console.error('search7StringProducts: Ошибка поиска 7-струнных товаров:', error);
        showNoSearchResults('7-струнные');
    }
}

// Функция специального поиска для 8-струнных товаров
async function search8StringProducts() {
    console.log('search8StringProducts: Поиск 8-струнных товаров по пометкам в карточках');
    
    try {
        // Сначала загружаем все товары в DOM для поиска по пометкам
        const response = await fetch('http://localhost:8000/api/products?start=0&limit=1000');
        if (!response.ok) {
            throw new Error(`HTTP error! status: ${response.status}`);
        }
        
        const data = await response.json();
        console.log(`search8StringProducts: Загружено ${data.products.length} товаров для поиска по пометкам`);
        
        if (data && data.products && data.products.length > 0) {
            // Отображаем все товары в DOM
            displayProducts(data.products);
            
            // Теперь ищем по пометкам в карточках
            const eightStringCards = document.querySelectorAll('.product-eight-string');
            console.log(`search8StringProducts: Найдено ${eightStringCards.length} карточек с пометкой 8-струнных`);
            
            if (eightStringCards.length > 0) {
                // Скрываем все карточки, кроме 8-струнных
                const allProductCards = document.querySelectorAll('.product-card');
                allProductCards.forEach(card => {
                    card.style.display = 'none';
                });
                
                // Показываем только карточки с пометкой 8-струнных
                eightStringCards.forEach(eightStringCard => {
                    const productCard = eightStringCard.closest('.product-card');
                    if (productCard) {
                        productCard.style.display = 'block';
                    }
                });
                
                isCategoryFilterActive = true;
                console.log('search8StringProducts: Отображены только 8-струнные товары по пометкам');
                
                // Показываем примеры найденных товаров
                const productNames = Array.from(eightStringCards).slice(0, 5).map(card => {
                    const productCard = card.closest('.product-card');
                    const nameElement = productCard?.querySelector('.product-name');
                    return nameElement?.textContent || 'Неизвестный товар';
                });
                console.log('search8StringProducts: Примеры найденных товаров:', productNames);
            } else {
                console.log('search8StringProducts: Карточки с пометкой 8-струнных не найдены');
                showNoSearchResults('8-струнные');
            }
        } else {
            console.log('search8StringProducts: Нет товаров для поиска');
            showNoSearchResults('8-струнные');
        }
        
    } catch (error) {
        console.error('search8StringProducts: Ошибка поиска 8-струнных товаров:', error);
        showNoSearchResults('8-струнные');
    }
}

// Функция специального поиска для струн с плоской обмоткой (электро)
async function searchFlatwoundElectricProducts() {
    console.log('searchFlatwoundElectricProducts: Поиск плоской обмотки по пометкам в карточках');
    try {
        const response = await fetch('http://localhost:8000/api/products?start=0&limit=1000');
        if (!response.ok) {
            throw new Error(`HTTP error! status: ${response.status}`);
        }
        const data = await response.json();
        if (data && data.products && data.products.length > 0) {
            displayProducts(data.products);
            const badges = document.querySelectorAll('.product-flatwound');
            if (badges.length > 0) {
                const allProductCards = document.querySelectorAll('.product-card');
                allProductCards.forEach(card => { card.style.display = 'none'; });
                badges.forEach(b => {
                    const productCard = b.closest('.product-card');
                    if (productCard) productCard.style.display = 'block';
                });
                isCategoryFilterActive = true;
                console.log('searchFlatwoundElectricProducts: Отображены только flatwound товары');
            } else {
                showNoSearchResults('flatwound electric');
            }
        } else {
            showNoSearchResults('flatwound electric');
        }
    } catch (error) {
        console.error('searchFlatwoundElectricProducts: Ошибка поиска:', error);
        showNoSearchResults('flatwound electric');
    }
}
// Функция специального поиска для 10 калибра (электрогитара)
async function searchGauge10ElectricProducts() {
    console.log('searchGauge10ElectricProducts: Поиск товаров с пометкой 10 калибр электро');
    try {
        const response = await fetch('http://localhost:8000/api/products?start=0&limit=1000');
        if (!response.ok) {
            throw new Error(`HTTP error! status: ${response.status}`);
        }
        const data = await response.json();
        if (data && data.products && data.products.length > 0) {
            displayProducts(data.products);
            const badges = document.querySelectorAll('.product-gauge10');
            if (badges.length > 0) {
                const allProductCards = document.querySelectorAll('.product-card');
                allProductCards.forEach(card => { card.style.display = 'none'; });
                badges.forEach(b => {
                    const productCard = b.closest('.product-card');
                    if (productCard) productCard.style.display = 'block';
                });
                isCategoryFilterActive = true;
                console.log('searchGauge10ElectricProducts: Отображены только товары 10 калибр электро');
            } else {
                showNoSearchResults('10 калибр электро');
            }
        } else {
            showNoSearchResults('10 калибр электро');
        }
    } catch (error) {
        console.error('searchGauge10ElectricProducts: Ошибка поиска:', error);
        showNoSearchResults('10 калибр электро');
    }
}
// Функция специального поиска для 09 калибра (электрогитара)
async function searchGauge09ElectricProducts() {
    console.log('searchGauge09ElectricProducts: Поиск товаров с пометкой 09 калибр электро');
    try {
        const response = await fetch('http://localhost:8000/api/products?start=0&limit=1000');
        if (!response.ok) {
            throw new Error(`HTTP error! status: ${response.status}`);
        }
        const data = await response.json();
        if (data && data.products && data.products.length > 0) {
            displayProducts(data.products);
            const badges = document.querySelectorAll('.product-gauge09');
            if (badges.length > 0) {
                const allProductCards = document.querySelectorAll('.product-card');
                allProductCards.forEach(card => { card.style.display = 'none'; });
                badges.forEach(b => {
                    const productCard = b.closest('.product-card');
                    if (productCard) productCard.style.display = 'block';
                });
                isCategoryFilterActive = true;
                console.log('searchGauge09ElectricProducts: Отображены только товары 09 калибр электро');
            } else {
                showNoSearchResults('09 калибр электро');
            }
        } else {
            showNoSearchResults('09 калибр электро');
        }
    } catch (error) {
        console.error('searchGauge09ElectricProducts: Ошибка поиска:', error);
        showNoSearchResults('09 калибр электро');
    }
}
// Функция специального поиска для 11 калибра (электрогитара)
async function searchGauge11ElectricProducts() {
    console.log('searchGauge11ElectricProducts: Поиск товаров с пометкой 11 калибр электро');
    try {
        const response = await fetch('http://localhost:8000/api/products?start=0&limit=1000');
        if (!response.ok) {
            throw new Error(`HTTP error! status: ${response.status}`);
        }
        const data = await response.json();
        if (data && data.products && data.products.length > 0) {
            displayProducts(data.products);
            const badges = document.querySelectorAll('.product-gauge11');
            if (badges.length > 0) {
                const allProductCards = document.querySelectorAll('.product-card');
                allProductCards.forEach(card => { card.style.display = 'none'; });
                badges.forEach(b => {
                    const productCard = b.closest('.product-card');
                    if (productCard) productCard.style.display = 'block';
                });
                isCategoryFilterActive = true;
                console.log('searchGauge11ElectricProducts: Отображены только товары 11 калибр электро');
            } else {
                showNoSearchResults('11 калибр электро');
            }
        } else {
            showNoSearchResults('11 калибр электро');
        }
    } catch (error) {
        console.error('searchGauge11ElectricProducts: Ошибка поиска:', error);
        showNoSearchResults('11 калибр электро');
    }
}

// Функция поиска для Nickel Plated Electric Strings
async function searchNickelPlatedElectricProducts() {
    console.log('searchNickelPlatedElectricProducts: Поиск товаров Nickel Plated Electric Strings');
    try {
        const response = await fetch('http://localhost:8000/api/products?start=0&limit=1000');
        if (!response.ok) {
            throw new Error(`HTTP error! status: ${response.status}`);
        }
        const data = await response.json();
        if (!(data && data.products && data.products.length > 0)) {
            showNoSearchResults('Nickel Plated Electric Strings');
            return;
        }

        // 1) Получаем эталонный список с сайта (через локальный прокси), 5 страниц
        const pages = [
            'https://guitarstrings.com.ua/electro/nickel-plated-electric',
            'https://guitarstrings.com.ua/electro/nickel-plated-electric?start=60',
            'https://guitarstrings.com.ua/electro/nickel-plated-electric?start=120',
            'https://guitarstrings.com.ua/electro/nickel-plated-electric?start=180',
            'https://guitarstrings.com.ua/electro/nickel-plated-electric?start=240'
        ];
        const enc = (u) => encodeURIComponent(u);
        const fetchedHtml = await Promise.all(pages.map(u => fetch(`http://localhost:8000/proxy_fetch?url=${enc(u)}`, { cache: 'no-store' }).then(r => r.ok ? r.text() : '')));
        const docParser = new DOMParser();
        const liveNameSet = new Set();
        fetchedHtml.forEach(html => {
            if (!html) return;
            const doc = docParser.parseFromString(html, 'text/html');
            const items = Array.from(doc.querySelectorAll('div.spacer, div.product-item, div.item'));
            items.forEach(item => {
                const nameEl = item.querySelector('h3.product-title a, h3.title a, h3 a, h2 a, a.title') ||
                                item.querySelector('h3.product-title, h3.title, h3, h2, a.title');
                const name = nameEl ? nameEl.textContent.trim() : '';
                if (name) liveNameSet.add(normalizeLooseName(name));
            });
        });

        // 2) Отрисовываем все товары
        displayProducts(data.products);

        // 3) Добавляем недостающие бейджи Nickel Plated на карточки, если имя в liveNameSet
        const cards = document.querySelectorAll('.product-card');
        cards.forEach(card => {
            const titleEl = card.querySelector('.product-title');
            const subtitleEl = card.querySelector('.product-subtitle');
            const hasBadge = !!card.querySelector('.product-nickelplated');
            const name = titleEl ? titleEl.textContent.trim() : '';
            if (!name) return;
            const inLive = liveNameSet.has(normalizeLooseName(name));
            if (inLive && !hasBadge && subtitleEl) {
                const currentLang = localStorage.getItem('selectedLanguage') || 'uk';
                const t = (translations[currentLang] || {});
                const badge = (t.nickelPlatedInfo) || 'Nickel Plated';
                const title = (t.nickelPlatedShowAll) || 'Показать все Nickel Plated';
                const span = document.createElement('span');
                span.className = 'product-nickelplated';
                span.title = title;
                span.textContent = badge;
                span.style.cursor = 'pointer';
                span.addEventListener('click', function(){ filterProductsByCategory('nickel-plated', true); });
                subtitleEl.appendChild(span);
            }
        });

        // 4) Фильтруем отображение строго по бейджам (как вы просили)
        const badges = document.querySelectorAll('.product-nickelplated');
        if (badges.length > 0) {
            const allProductCards = document.querySelectorAll('.product-card');
            allProductCards.forEach(card => { card.style.display = 'none'; });
            badges.forEach(b => {
                const productCard = b.closest('.product-card');
                if (productCard) productCard.style.display = 'block';
            });
            isCategoryFilterActive = true;
            console.log('searchNickelPlatedElectricProducts: Отображены только товары Nickel Plated по бейджам');
        } else {
            showNoSearchResults('Nickel Plated Electric Strings');
        }
    } catch (error) {
        console.error('searchNickelPlatedElectricProducts: Ошибка поиска:', error);
        showNoSearchResults('Nickel Plated Electric Strings');
    }
}

// Функция поиска для Stainless Steel Electric Strings
async function searchStainlessSteelProducts() {
    console.log('searchStainlessSteelProducts: Поиск товаров Stainless Steel Electric Strings');
    try {
        const response = await fetch('http://localhost:8000/api/products?start=0&limit=1000');
        if (!response.ok) {
            throw new Error(`HTTP error! status: ${response.status}`);
        }
        const data = await response.json();
        if (!(data && data.products && data.products.length > 0)) {
            showNoSearchResults('Stainless Steel Electric Strings');
            return;
        }

        // Загружаем live-страницу Stainless Steel для сверки
        const pages = [
            'https://guitarstrings.com.ua/electro/stainless-steel-electric'
        ];
        const enc = (u) => encodeURIComponent(u);
        const fetchedHtml = await Promise.all(pages.map(u => fetch(`http://localhost:8000/proxy_fetch?url=${enc(u)}`, { cache: 'no-store' }).then(r => r.ok ? r.text() : '')));
        const docParser = new DOMParser();
        const liveNameSet = new Set();
        fetchedHtml.forEach(html => {
            if (!html) return;
            const doc = docParser.parseFromString(html, 'text/html');
            const items = Array.from(doc.querySelectorAll('div.spacer, div.product-item, div.item'));
            items.forEach(item => {
                const nameEl = item.querySelector('h3.product-title a, h3.title a, h3 a, h2 a, a.title') ||
                                item.querySelector('h3.product-title, h3.title, h3, h2, a.title');
                const name = nameEl ? nameEl.textContent.trim() : '';
                if (name) liveNameSet.add(normalizeLooseName(name));
            });
        });

        // Отрисовываем все товары
        displayProducts(data.products);

        // Добавляем недостающие бейджи Stainless Steel на карточки
        const cards = document.querySelectorAll('.product-card');
        cards.forEach(card => {
            const titleEl = card.querySelector('.product-title');
            const subtitleEl = card.querySelector('.product-subtitle');
            const hasBadge = !!card.querySelector('.product-stainless');
            const name = titleEl ? titleEl.textContent.trim() : '';
            if (!name) return;
            const normalized = name.toLowerCase().trim();
            const normalizedLoose = normalizeLooseName(name);
            const inLive = liveNameSet.has(normalizedLoose);
            const inSet = STAINLESS_STEEL_ELECTRIC.has(normalized) || STAINLESS_STEEL_ELECTRIC.has(normalizedLoose) || STAINLESS_STEEL_ELECTRIC_LOOSE.has(normalizedLoose);
            const byHeuristic = ((/stainless\s*steel/.test(normalized) || /blue\s*steel/.test(normalized) || /chromes\s*flat\s*wound/.test(normalized) || /synyster\s*gates.*stainless/.test(normalized)) && !/nickel plated|pure nickel/.test(normalized));
            if ((inLive || inSet || byHeuristic) && !hasBadge && subtitleEl) {
                const currentLang = localStorage.getItem('selectedLanguage') || 'uk';
                const t = (translations[currentLang] || {});
                const badge = (t.stainlessSteelInfo) || 'Stainless Steel';
                const title = (t.stainlessSteelShowAll) || 'Показать все Stainless Steel';
                const span = document.createElement('span');
                span.className = 'product-stainless';
                span.title = title;
                span.textContent = badge;
                span.style.cursor = 'pointer';
                span.addEventListener('click', function(){ filterProductsByCategory('stainless-steel', true); });
                subtitleEl.appendChild(span);
            }
        });

        // Фильтруем отображение по бейджам Stainless
        const badges = document.querySelectorAll('.product-stainless');
        if (badges.length > 0) {
            const allProductCards = document.querySelectorAll('.product-card');
            allProductCards.forEach(card => { card.style.display = 'none'; });
            badges.forEach(b => {
                const productCard = b.closest('.product-card');
                if (productCard) productCard.style.display = 'block';
            });
            isCategoryFilterActive = true;
            console.log('searchStainlessSteelProducts: Отображены только товары Stainless Steel по бейджам');
        } else {
            showNoSearchResults('Stainless Steel Electric Strings');
        }
    } catch (error) {
        console.error('searchStainlessSteelProducts: Ошибка поиска:', error);
        showNoSearchResults('Stainless Steel Electric Strings');
    }
}

// Функция поиска для Cobalt Electric Strings
async function searchCobaltProducts() {
    console.log('searchCobaltProducts: Поиск товаров Cobalt Electric Strings');
    try {
        const response = await fetch('http://localhost:8000/api/products?start=0&limit=1000');
        if (!response.ok) {
            throw new Error(`HTTP error! status: ${response.status}`);
        }
        const data = await response.json();
        if (!(data && data.products && data.products.length > 0)) {
            showNoSearchResults('Cobalt Electric Strings');
            return;
        }

        // Загружаем live-страницу Cobalt для сверки
        const pages = [
            'https://guitarstrings.com.ua/electro/cobalt-electric'
        ];
        const enc = (u) => encodeURIComponent(u);
        const fetchedHtml = await Promise.all(pages.map(u => fetch(`http://localhost:8000/proxy_fetch?url=${enc(u)}`, { cache: 'no-store' }).then(r => r.ok ? r.text() : '')));
        const docParser = new DOMParser();
        const liveNameSet = new Set();
        fetchedHtml.forEach(html => {
            if (!html) return;
            const doc = docParser.parseFromString(html, 'text/html');
            const items = Array.from(doc.querySelectorAll('div.spacer, div.product-item, div.item'));
            items.forEach(item => {
                const nameEl = item.querySelector('h3.product-title a, h3.title a, h3 a, h2 a, a.title') ||
                                item.querySelector('h3.product-title, h3.title, h3, h2, a.title');
                const name = nameEl ? nameEl.textContent.trim() : '';
                if (name) liveNameSet.add(normalizeLooseName(name));
            });
        });

        // Отрисовываем все товары
        displayProducts(data.products);

        // Добавляем недостающие бейджи Cobalt на карточки
        const cards = document.querySelectorAll('.product-card');
        cards.forEach(card => {
            const titleEl = card.querySelector('.product-title');
            const subtitleEl = card.querySelector('.product-subtitle');
            const hasBadge = !!card.querySelector('.product-cobalt');
            const name = titleEl ? titleEl.textContent.trim() : '';
            if (!name) return;
            const normalized = name.toLowerCase().trim();
            const normalizedLoose = normalizeLooseName(name);
            const inLive = liveNameSet.has(normalizedLoose);
            const inSet = COBALT_ELECTRIC.has(normalized) || COBALT_ELECTRIC.has(normalizedLoose) || COBALT_ELECTRIC_LOOSE.has(normalizedLoose);
            const byHeuristic = (/\bcobalt\b/.test(normalized));
            if ((inLive || inSet || byHeuristic) && !hasBadge && subtitleEl) {
                const currentLang = localStorage.getItem('selectedLanguage') || 'uk';
                const t = (translations[currentLang] || {});
                const badge = (t.cobaltInfo) || 'Cobalt';
                const title = (t.cobaltShowAll) || 'Показать все Cobalt';
                const span = document.createElement('span');
                span.className = 'product-cobalt';
                span.title = title;
                span.textContent = badge;
                span.style.cursor = 'pointer';
                span.addEventListener('click', function(){ filterProductsByCategory('cobalt', true); });
                subtitleEl.appendChild(span);
            }
        });

        // Фильтруем отображение по бейджам Cobalt
        const badges = document.querySelectorAll('.product-cobalt');
        if (badges.length > 0) {
            const allProductCards = document.querySelectorAll('.product-card');
            allProductCards.forEach(card => { card.style.display = 'none'; });
            badges.forEach(b => {
                const productCard = b.closest('.product-card');
                if (productCard) productCard.style.display = 'block';
            });
            isCategoryFilterActive = true;
            console.log('searchCobaltProducts: Отображены только товары Cobalt по бейджам');
        } else {
            showNoSearchResults('Cobalt Electric Strings');
        }
    } catch (error) {
        console.error('searchCobaltProducts: Ошибка поиска:', error);
        showNoSearchResults('Cobalt Electric Strings');
    }
}

// Функция поиска для Colored Electric Strings
async function searchColoredElectricProducts() {
    console.log('searchColoredElectricProducts: Поиск товаров Colored Electric Strings');
    try {
        const response = await fetch('http://localhost:8000/api/products?start=0&limit=1000');
        if (!response.ok) {
            throw new Error(`HTTP error! status: ${response.status}`);
        }
        const data = await response.json();
        if (!(data && data.products && data.products.length > 0)) {
            showNoSearchResults('Colored Electric Strings');
            return;
        }

        // Загружаем live-страницу Colored для сверки
        const pages = [
            'https://guitarstrings.com.ua/electro/colored-electric'
        ];
        const enc = (u) => encodeURIComponent(u);
        const fetchedHtml = await Promise.all(pages.map(u => fetch(`http://localhost:8000/proxy_fetch?url=${enc(u)}`, { cache: 'no-store' }).then(r => r.ok ? r.text() : '')));
        const docParser = new DOMParser();
        const liveNameSet = new Set();
        fetchedHtml.forEach(html => {
            if (!html) return;
            const doc = docParser.parseFromString(html, 'text/html');
            const items = Array.from(doc.querySelectorAll('div.spacer, div.product-item, div.item'));
            items.forEach(item => {
                const nameEl = item.querySelector('h3.product-title a, h3.title a, h3 a, h2 a, a.title') ||
                                item.querySelector('h3.product-title, h3.title, h3, h2, a.title');
                const name = nameEl ? nameEl.textContent.trim() : '';
                if (name) liveNameSet.add(normalizeLooseName(name));
            });
        });

        // Отрисовываем все товары
        displayProducts(data.products);

        // Добавляем недостающие бейджи Colored на карточки
        const cards = document.querySelectorAll('.product-card');
        cards.forEach(card => {
            const titleEl = card.querySelector('.product-title');
            const subtitleEl = card.querySelector('.product-subtitle');
            const hasBadge = !!card.querySelector('.product-colored');
            const name = titleEl ? titleEl.textContent.trim() : '';
            if (!name) return;
            const normalized = name.toLowerCase().trim();
            const normalizedLoose = normalizeLooseName(name);
            const inLive = liveNameSet.has(normalizedLoose);
            const inSet = COLORED_ELECTRIC.has(normalized) || COLORED_ELECTRIC.has(normalizedLoose) || COLORED_ELECTRIC_LOOSE.has(normalizedLoose);
            const byHeuristic = (/\b(neon|colored|k3\s*coated|black\s*beauties)\b/.test(normalized));
            if ((inLive || inSet || byHeuristic) && !hasBadge && subtitleEl) {
                const currentLang = localStorage.getItem('selectedLanguage') || 'uk';
                const t = (translations[currentLang] || {});
                const badge = (t.coloredInfo) || 'Colored Strings';
                const title = (t.coloredShowAll) || 'Показать все Colored Strings';
                const span = document.createElement('span');
                span.className = 'product-colored';
                span.title = title;
                span.textContent = badge;
                span.style.cursor = 'pointer';
                span.addEventListener('click', function(){ filterProductsByCategory('colored', true); });
                subtitleEl.appendChild(span);
            }
        });

        // Фильтруем отображение по бейджам Colored
        const badges = document.querySelectorAll('.product-colored');
        if (badges.length > 0) {
            const allProductCards = document.querySelectorAll('.product-card');
            allProductCards.forEach(card => { card.style.display = 'none'; });
            badges.forEach(b => {
                const productCard = b.closest('.product-card');
                if (productCard) productCard.style.display = 'block';
            });
            isCategoryFilterActive = true;
            console.log('searchColoredElectricProducts: Отображены только товары Colored по бейджам');
        } else {
            showNoSearchResults('Colored Electric Strings');
        }
    } catch (error) {
        console.error('searchColoredElectricProducts: Ошибка поиска:', error);
        showNoSearchResults('Colored Electric Strings');
    }
}
// Функция поиска для Pure Nickel Electric Strings
async function searchPureNickelElectricProducts() {
    console.log('searchPureNickelElectricProducts: Поиск товаров Pure Nickel Electric Strings');
    try {
        const response = await fetch('http://localhost:8000/api/products?start=0&limit=1000');
        if (!response.ok) {
            throw new Error(`HTTP error! status: ${response.status}`);
        }
        const data = await response.json();
        if (!(data && data.products && data.products.length > 0)) {
            showNoSearchResults('Pure Nickel Electric Strings');
            return;
        }

        // Загружаем live-страницу Pure Nickel для сверки
        const pages = [
            'https://guitarstrings.com.ua/electro/pure-nickel-electric'
        ];
        const enc = (u) => encodeURIComponent(u);
        const fetchedHtml = await Promise.all(pages.map(u => fetch(`http://localhost:8000/proxy_fetch?url=${enc(u)}`, { cache: 'no-store' }).then(r => r.ok ? r.text() : '')));
        const docParser = new DOMParser();
        const liveNameSet = new Set();
        fetchedHtml.forEach(html => {
            if (!html) return;
            const doc = docParser.parseFromString(html, 'text/html');
            const items = Array.from(doc.querySelectorAll('div.spacer, div.product-item, div.item'));
            items.forEach(item => {
                const nameEl = item.querySelector('h3.product-title a, h3.title a, h3 a, h2 a, a.title') ||
                                item.querySelector('h3.product-title, h3.title, h3, h2, a.title');
                const name = nameEl ? nameEl.textContent.trim() : '';
                if (name) liveNameSet.add(normalizeLooseName(name));
            });
        });

        // Отрисовываем все товары
        displayProducts(data.products);

        // Добаджаем недостающие бейджи Pure Nickel
        const cards = document.querySelectorAll('.product-card');
        cards.forEach(card => {
            const titleEl = card.querySelector('.product-title');
            const subtitleEl = card.querySelector('.product-subtitle');
            const hasBadge = !!card.querySelector('.product-purenickel');
            const name = titleEl ? titleEl.textContent.trim() : '';
            if (!name) return;
            const normalized = name.toLowerCase().trim();
            const normalizedLoose = normalizeLooseName(name);
            const inLive = liveNameSet.has(normalizedLoose);
            const inSet = PURE_NICKEL_ELECTRIC.has(normalized) || PURE_NICKEL_ELECTRIC.has(normalizedLoose) || PURE_NICKEL_ELECTRIC_LOOSE.has(normalizedLoose);
            const byHeuristic = (/pure\s*nickel/.test(normalized) || /nickel\s*rockers/.test(normalized)) && !/plated|flat ?wound|stainless|cobalt|colored/.test(normalized);
            if ((inLive || inSet || byHeuristic) && !hasBadge && subtitleEl) {
                const currentLang = localStorage.getItem('selectedLanguage') || 'uk';
                const t = (translations[currentLang] || {});
                const badge = (t.pureNickelInfo) || 'Pure Nickel';
                const title = (t.pureNickelShowAll) || 'Показать все Pure Nickel';
                const span = document.createElement('span');
                span.className = 'product-purenickel';
                span.title = title;
                span.textContent = badge;
                span.style.cursor = 'pointer';
                span.addEventListener('click', function(){ filterProductsByCategory('pure-nickel', true); });
                subtitleEl.appendChild(span);
            }
        });

        // Фильтруем отображение по бейджам Pure Nickel
        const badges = document.querySelectorAll('.product-purenickel');
        if (badges.length > 0) {
            const allProductCards = document.querySelectorAll('.product-card');
            allProductCards.forEach(card => { card.style.display = 'none'; });
            badges.forEach(b => {
                const productCard = b.closest('.product-card');
                if (productCard) productCard.style.display = 'block';
            });
            isCategoryFilterActive = true;
            console.log('searchPureNickelElectricProducts: Отображены только товары Pure Nickel по бейджам');
        } else {
            showNoSearchResults('Pure Nickel Electric Strings');
        }
    } catch (error) {
        console.error('searchPureNickelElectricProducts: Ошибка поиска:', error);
        showNoSearchResults('Pure Nickel Electric Strings');
    }
}
// Функция специального поиска для 9-струнных товаров
async function search9StringProducts() {
    console.log('search9StringProducts: Поиск 9-струнных товаров по пометкам в карточках');
    try {
        const response = await fetch('http://localhost:8000/api/products?start=0&limit=1000');
        if (!response.ok) {
            throw new Error(`HTTP error! status: ${response.status}`);
        }
        const data = await response.json();
        console.log(`search9StringProducts: Загружено ${data.products.length} товаров для поиска по пометкам`);
        if (data && data.products && data.products.length > 0) {
            displayProducts(data.products);
            const nineStringCards = document.querySelectorAll('.product-nine-string');
            console.log(`search9StringProducts: Найдено ${nineStringCards.length} карточек с пометкой 9-струнных`);
            if (nineStringCards.length > 0) {
                const allProductCards = document.querySelectorAll('.product-card');
                allProductCards.forEach(card => { card.style.display = 'none'; });
                nineStringCards.forEach(ns => {
                    const productCard = ns.closest('.product-card');
                    if (productCard) productCard.style.display = 'block';
                });
                isCategoryFilterActive = true;
                console.log('search9StringProducts: Отображены только 9-струнные товары по пометкам');
            } else {
                console.log('search9StringProducts: Карточки с пометкой 9-струнных не найдены');
                showNoSearchResults('9-струнные');
            }
        } else {
            console.log('search9StringProducts: Нет товаров для поиска');
            showNoSearchResults('9-струнные');
        }
    } catch (error) {
        console.error('search9StringProducts: Ошибка поиска 9-струнных товаров:', error);
        showNoSearchResults('9-струнные');
    }
}

// Делаем функции доступными глобально
window.filterProductsByCategory = filterProductsByCategory;
window.clearCategoryFilter = clearCategoryFilter;

// Функция для принудительной очистки кэша и перезагрузки переводов
function forceClearCache() {
    console.log('forceClearCache: Принудительная очистка кэша');
    
    // Очищаем localStorage
    localStorage.clear();
    console.log('forceClearCache: localStorage очищен');
    
    // Принудительно перезагружаем страницу
    window.location.reload(true);
}

// Делаем функцию доступной глобально
window.forceClearCache = forceClearCache;

console.log('app.js инициализирован (версия 13.21 - добавлена поддержка 8-струнных товаров)');
console.log('Для принудительной очистки кэша выполните: forceClearCache()');

// Функции для индикатора загрузки
function showLoadingIndicator() {
    const container = ensureProductsContainer();
    if (container) {
        container.innerHTML = `
            <div style="display: flex; justify-content: center; align-items: center; padding: 40px; grid-column: 1 / -1;">
                <div class="loading-spinner">
                    <div class="spinner"></div>
                    <p style="margin-top: 20px; color: var(--text-light);">Загружаем товары...</p>
                </div>
            </div>
        `;
    }
}

function hideLoadingIndicator() {
    // Индикатор скрывается автоматически при отображении товаров
}

// Вспомогательные функции для переключения между товарами и кабинетом
function showProductsView() {
    const account = document.getElementById('account-section');
    if (account) {
        account.style.display = 'none';
        account.style.visibility = '';
        account.style.opacity = '';
    }
    const inner = document.querySelector('.inner');
    if (inner) {
        inner.style.display = '';
        // Восстанавливаем видимость всех секций, кроме кабинета
        try {
            Array.from(inner.children).forEach(child => {
                if (child.id === 'account-section') {
                    child.style.display = 'none';
                } else {
                    child.style.display = '';
                    child.style.visibility = '';
                    child.style.opacity = '';
                }
            });
        } catch (e) {}
    }
    const pc = document.getElementById('productsContainer');
    if (pc) {
        pc.style.display = '';
        pc.style.visibility = '';
        pc.style.opacity = '';
    }
    const li = document.getElementById('loading-indicator');
    if (li) li.style.display = '';
    // Запоминаем текущий вид
    try { localStorage.setItem('currentView', 'products'); } catch (e) {}

    // Показываем баннер/фильтры на странице товаров
    try {
        const banner = document.querySelector('.main-banner');
        if (banner) banner.style.removeProperty('display');
        const brands = document.querySelector('.brand-logos');
        if (brands) brands.style.removeProperty('display');
        // Показываем строку поиска
        const search = document.querySelector('.search-section');
        if (search) search.style.removeProperty('display');
    } catch (e) {}
}

async function showAccountView() {
    try { console.log('showAccountView: Открываем кабинет'); } catch (e) {}
    // Сброс активных поисков/фильтров
    try {
        isSearchActive = false;
        isCategoryFilterActive = false;
        searchTerm = '';
        currentCategory = '';
        lastCategorySearch = '';
        if (typeof searchTimeout !== 'undefined' && searchTimeout) {
            clearTimeout(searchTimeout);
            searchTimeout = null;
        }
    } catch (e) {}
    // Запоминаем текущий вид
    try { localStorage.setItem('currentView', 'account'); } catch (e) {}

    // Гарантируем наличие секции
    const acc = ensureAccountSection();

    const inner = document.querySelector('.inner');
    if (inner) {
        Array.from(inner.children).forEach(child => {
            if (child.id === 'account-section') {
                child.style.display = 'block';
                child.style.visibility = 'visible';
                child.style.opacity = '1';
            } else {
                child.style.display = 'none';
            }
        });
    }
    // Дополнительно прячем контейнер товаров и индикатор
    const pc = document.getElementById('productsContainer');
    if (pc) { pc.style.display = 'none'; pc.style.visibility = 'hidden'; pc.style.opacity = '0'; }
    const li = document.getElementById('loading-indicator');
    if (li) li.style.display = 'none';

    // Скрываем главный баннер/фильтры при входе в кабинет
    try {
        const banner = document.querySelector('.main-banner');
        if (banner) banner.style.setProperty('display','none','important');
        const brands = document.querySelector('.brand-logos');
        if (brands) brands.style.setProperty('display','none','important');
        // Скрываем строку поиска
        const search = document.querySelector('.search-section');
        if (search) search.style.setProperty('display','none','important');
    } catch (e) {}

    // Применяем язык к только что добавленным узлам и настраиваем выпадающий список
    const lang = getCurrentLanguage();
    if (typeof switchLanguage === 'function') switchLanguage(lang);
    setupAccountLanguageDropdown();

    try { window.scrollTo({ top: 0, behavior: 'smooth' }); } catch (e) {}
    console.log('showAccountView: вызываем renderAccountPage');
    await renderAccountPage();
    console.log('showAccountView: renderAccountPage завершён');
}

function setupCabinetNav() {
    // резервный обработчик по нижней навигации (если нужен)
}

async function renderAccountPage() {
    try {
        console.log('renderAccountPage: start');
        // Телеграм-данные если доступны
        const tg = window.Telegram && window.Telegram.WebApp && window.Telegram.WebApp.initDataUnsafe;
        const params = new URLSearchParams();
        if (tg && tg.user) {
            if (tg.user.id) params.set('tg_id', tg.user.id);
            if (tg.user.username) params.set('tg_username', tg.user.username);
            if (tg.user.first_name) params.set('tg_first_name', tg.user.first_name);
            if (tg.user.last_name) params.set('tg_last_name', tg.user.last_name);
            if (tg.user.photo_url) params.set('tg_photo_url', tg.user.photo_url);
        }
        const profileResp = await fetch('http://localhost:8000/api/user_profile' + (params.toString() ? ('?' + params.toString()) : ''));
        const profile = await profileResp.json().catch(() => ({ success:false }));
        const ordersResp = await fetch('http://localhost:8000/api/user_orders');
        const orders = await ordersResp.json().catch(() => ({ success:false, orders:[], summary:{ totalOrders:0, bonuses:0, totalAmount:0 } }));
        console.log('renderAccountPage: data loaded', { hasProfile: !!profile, ordersCount: (orders.orders||[]).length });
        // Обновляем шапку аккаунта
        const nameEl = document.getElementById('accountUserName');
        const bonusTopEl = document.getElementById('accountBonuses');
        const avatarEl = document.getElementById('accountAvatar');
        if (nameEl) nameEl.textContent = profile.displayName || 'Guest';
        // Не заполняем bonusTopEl, чтобы не дублировать
        if (avatarEl) {
            if (profile.photoUrl) {
                avatarEl.src = profile.photoUrl;
                avatarEl.style.display = 'block';
            } else {
                avatarEl.style.display = 'none';
            }
        }
        // Сводка
        const totalOrdersEl = document.getElementById('accTotalOrders');
        const accBonusesEl = document.getElementById('accBonuses');
        const totalAmountEl = document.getElementById('accTotalAmount');
        if (totalOrdersEl) totalOrdersEl.textContent = orders.summary?.totalOrders ?? 0;
        if (accBonusesEl) accBonusesEl.textContent = orders.summary?.bonuses ?? 0;
        if (totalAmountEl) totalAmountEl.textContent = `${(orders.summary?.totalAmount ?? 0)} ${getCurrencyWithDot()}`;
        // Таблица заказов
        const body = document.getElementById('ordersTableBody');
        if (body) {
            body.innerHTML = '';
            (orders.orders || []).forEach(o => {
                const row = document.createElement('div');
                row.className = 'orders-table-row';
                const statusText = getOrderStatusText(o.status);
                const amountVal = (o.amount || 0);
                row.innerHTML = `
                    <div>${o.orderId || ''}</div>
                    <div>${o.date || ''}</div>
                    <div>${o.address || ''}</div>
                    <div class="order-amount" data-amount="${amountVal}">${amountVal} ${getCurrencyWithDot()}</div>
                    <div class="order-status" data-original-status="${o.status || ''}">${statusText}</div>
                `;
                body.appendChild(row);
            });
        }
        console.log('renderAccountPage: DOM updated');
        // Гарантируем, что кабинет виден, а товары скрыты
        const acc2 = document.getElementById('account-section');
        if (acc2) { acc2.style.display = 'block'; acc2.style.visibility = 'visible'; acc2.style.opacity = '1'; }
        const pc2 = document.getElementById('productsContainer');
        if (pc2) { pc2.style.display = 'none'; }
        console.log('renderAccountPage: visibility enforced');
        // Дополнительно синхронизируем локализацию сумм и статусов
        try { updateAccountOrdersLocale(); } catch (e) {}
    } catch (e) {
        console.error('renderAccountPage error', e);
    }
}

// Локализует суммы и статусы заказов в кабинете без повторного запроса
function updateAccountOrdersLocale() {
    try {
        const totalAmountEl = document.getElementById('accTotalAmount');
        if (totalAmountEl) {
            const numeric = parseFloat((totalAmountEl.textContent || '').replace(/[^\d.]/g, '')) || 0;
            totalAmountEl.textContent = `${numeric} ${getCurrencyWithDot()}`;
        }
        const container = document.getElementById('ordersTableBody');
        if (!container) return;
        const rows = container.querySelectorAll('.orders-table-row');
        rows.forEach(row => {
            const amountEl = row.querySelector('.order-amount');
            const statusEl = row.querySelector('.order-status');
            if (amountEl) {
                const num = parseFloat(amountEl.getAttribute('data-amount') || '0') || 0;
                amountEl.textContent = `${num} ${getCurrencyWithDot()}`;
            }
            if (statusEl) {
                const original = statusEl.getAttribute('data-original-status') || statusEl.textContent;
                statusEl.textContent = getOrderStatusText(original);
            }
        });
    } catch (e) {
        console.warn('updateAccountOrdersLocale error', e);
    }
}

// Гарантирует наличие контейнера для карточек товаров
function ensureProductsContainer() {
    let container = document.getElementById('productsContainer');
    if (!container) {
        const inner = document.querySelector('.inner');
        if (!inner) return null;
        container = document.createElement('div');
        container.id = 'productsContainer';
        // Вставляем перед индикатором загрузки, если он есть
        const loading = document.getElementById('loading-indicator');
        if (loading && loading.parentNode === inner) {
            inner.insertBefore(container, loading);
        } else {
            inner.insertBefore(container, inner.firstChild);
        }
        console.log('ensureProductsContainer: Создан контейнер #productsContainer');
    }
    return container;
}

// Создаёт секцию кабинета, если она отсутствует
function ensureAccountSection() {
    let acc = document.getElementById('account-section');
    if (acc) return acc;
    const inner = document.querySelector('.inner');
    if (!inner) return null;
    acc = document.createElement('div');
    acc.id = 'account-section';
    acc.style.display = 'none';
    acc.innerHTML = `
        <div class="account-header">
            <div class="account-user">
                <img id="accountAvatar" class="account-avatar" src="" alt="Avatar" style="display:none;">
                <div class="account-title-block">
                    <h2 id="accountUserName">—</h2>
                    <div class="account-bonuses" id="accountBonuses" data-translate="bonusInfo">Кол-во бонусов: 100</div>
                </div>
            </div>
            <div class="account-actions">
                <div class="account-action-btn" data-action="orders" data-translate="ordersList">Список заказов</div>
                <div class="account-action-btn" data-action="addresses" data-translate="myAddresses">Мои адреса</div>
                <div class="account-action-btn" data-action="accountData" data-translate="accountData">Данные аккаунта</div>
                <div class="account-lang">
                    <button class="account-lang-btn">UA</button>
                    <div class="account-lang-dropdown">
                        <div class="lang-option" data-lang="uk">UA</div>
                        <div class="lang-option" data-lang="ru">RU</div>
                        <div class="lang-option" data-lang="en">EN</div>
                    </div>
                </div>
            </div>
        </div>
        <div class="account-summary">
            <div><span data-translate="totalOrdersLabel">Всего заказов:</span> <strong id="accTotalOrders">0</strong></div>
            <div><span data-translate="bonusesLabel">Кол-во бонусов:</span> <strong id="accBonuses">0</strong></div>
            <div><span data-translate="totalAmountLabel">Общая сумма:</span> <strong id="accTotalAmount">0 грн</strong></div>
        </div>
        <div class="account-orders">
            <div class="orders-table-header">
                <div data-translate="orderNumber">Номер заказа</div>
                <div data-translate="orderDate">Дата</div>
                <div data-translate="deliveryAddress">Адрес доставки</div>
                <div data-translate="orderAmount">Сумма</div>
                <div data-translate="orderStatus">Статус заказа</div>
            </div>
            <div id="ordersTableBody" class="orders-table-body"></div>
        </div>
    `;
    // Вставляем после productsContainer, если он есть
    const pc = document.getElementById('productsContainer');
    if (pc && pc.parentNode === inner) {
        inner.insertBefore(acc, pc.nextSibling);
    } else {
        inner.appendChild(acc);
    }
    console.log('ensureAccountSection: Создан блок #account-section');
    return acc;
}

function getCurrentLanguage() {
	try {
		return localStorage.getItem('selectedLanguage') || 'uk';
	} catch (e) {
		return 'uk';
	}
}

function updateAccountLangButton(lang) {
	const btn = document.querySelector('.account-lang-btn');
	if (!btn) return;
	if (lang === 'uk') btn.textContent = 'UA';
	else if (lang === 'ru') btn.textContent = 'RU';
	else if (lang === 'en') btn.textContent = 'EN';
	else btn.textContent = lang.toUpperCase();
	// Подсветка выбранного языка на кнопке по умолчанию
	btn.classList.add('selected');
}

function setupAccountLanguageDropdown() {
	const acc = document.getElementById('account-section');
	if (!acc) return;
	const container = acc.querySelector('.account-lang');
	const options = acc.querySelectorAll('.account-lang-dropdown .lang-option');
	const btn = acc.querySelector('.account-lang-btn');
	// Инициализация кнопки текущим языком
	const currentLang = getCurrentLanguage();
	updateAccountLangButton(currentLang);
	// Убираем фиксированную подсветку пунктов (active не используем)
	options.forEach(opt => opt.classList.remove('active'));
	options.forEach(opt => {
		if (opt._langHandler) opt.removeEventListener('click', opt._langHandler);
		opt._langHandler = function() {
			const lang = this.getAttribute('data-lang');
			try { localStorage.setItem('selectedLanguage', lang); } catch (e) {}
			if (typeof switchLanguage === 'function') switchLanguage(lang);
			if (typeof updateLanguageButtons === 'function') updateLanguageButtons(lang);
			updateAccountLangButton(lang);
			// Возвращаем подсветку кнопки после выбора
			if (btn) btn.classList.add('selected');
			// Закрываем список сразу после выбора
			if (container) {
				container.classList.remove('open');
				container.classList.add('force-closed');
			}
		};
		opt.addEventListener('click', opt._langHandler);
	});
	if (btn && container) {
		if (btn._langBtnInit) return;
		btn._langBtnInit = true;
		btn.addEventListener('click', function(e) {
			e.stopPropagation();
			container.classList.toggle('open');
			container.classList.remove('force-closed');
			// На время открытого дропдауна гасим подсветку кнопки
			if (container.classList.contains('open')) btn.classList.remove('selected');
			else btn.classList.add('selected');
		});
		// Закрытие при клике вне
		document.addEventListener('click', function(ev) {
			if (!container.contains(ev.target)) {
				container.classList.remove('open');
				// Возвращаем подсветку кнопки при закрытии без выбора
				if (btn) btn.classList.add('selected');
			}
		});
		// Удаляем автозакрытие по mouseleave и снятие selected на hover
		// (оставляем только клик-управление и выбор пункта)
	}
}

// Перевод статуса заказа по текущему языку
function getOrderStatusText(originalStatus) {
	const lang = getCurrentLanguage();
	const s = (originalStatus || '').toString().trim().toLowerCase();
	// Базовые маппинги
	let code = 'paid';
	if (s.includes('оплач')) code = 'paid';
	else if (s.includes('paid')) code = 'paid';
	else if (s.includes('processing') || s.includes('обработ')) code = 'processing';
	else if (s.includes('отмен') || s.includes('cancel')) code = 'cancelled';
	// Локализация
	if (lang === 'uk') {
		if (code === 'paid') return 'Сплачено';
		if (code === 'processing') return 'Обробляється';
		if (code === 'cancelled') return 'Скасовано';
		return 'Статус';
	} else if (lang === 'ru') {
		if (code === 'paid') return 'Оплачено';
		if (code === 'processing') return 'В обработке';
		if (code === 'cancelled') return 'Отменён';
		return 'Статус';
	} else {
		if (code === 'paid') return 'Paid';
		if (code === 'processing') return 'Processing';
		if (code === 'cancelled') return 'Cancelled';
		return 'Status';
	}
}

function getVisibleView() {
    try {
        const acc = document.getElementById('account-section');
        if (acc && acc.style.display === 'block') return 'account';
        const pc = document.getElementById('productsContainer');
        if (pc && pc.style.display !== 'none') return 'products';
    } catch (e) {}
    return 'products';
}
