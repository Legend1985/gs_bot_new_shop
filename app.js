// GS Bot New Shop - Основной JavaScript файл
console.log('app.js загружен');

// Глобальная обработка ошибок JavaScript
window.addEventListener('error', function(e) {
    // Игнорируем ошибки из telegram-web-app.js
    if (e.filename && e.filename.includes('telegram-web-app.js')) {
        console.warn('Игнорируем ошибку Telegram Web App:', e.message);
        e.preventDefault(); // Предотвращаем дальнейшую обработку
        return false;
    }

    console.error('Глобальная ошибка JavaScript:', e.error);
    console.error('Файл:', e.filename);
    console.error('Строка:', e.lineno);
    console.error('Столбец:', e.colno);
    console.error('Сообщение:', e.message);
});

// Глобальная обработка необработанных промисов
window.addEventListener('unhandledrejection', function(e) {
    // Игнорируем ошибки, связанные с Telegram Web App
    if (e.reason && e.reason.toString().includes('telegram')) {
        console.warn('Игнорируем необработанный промис Telegram:', e.reason);
        e.preventDefault();
        return;
    }

    console.error('Необработанный промис:', e.reason);
    e.preventDefault(); // Предотвращаем вывод в консоль браузера
});

// Экспортируем функции в глобальную область сразу при загрузке скрипта

// === ОСНОВНЫЕ ФУНКЦИИ (определяем в начале файла) ===

// Функция открытия чата в Telegram
function openTelegramChat() {
    // Всегда открываем в новой вкладке для сохранения страницы магазина
    const telegramUrl = 'https://t.me/GuitarStringsUSA';

    safeTelegramCall(
        // Callback для случая, когда Telegram доступен
        function(tg) {
            if (typeof tg.openTelegramLink === 'function') {
                // Используем window.open для гарантированного открытия в новой вкладке
                window.open(telegramUrl, '_blank', 'noopener,noreferrer');
                console.log('openTelegramChat: Открываем чат в новой вкладке через Telegram Web App');
            } else {
                window.open(telegramUrl, '_blank', 'noopener,noreferrer');
                console.log('openTelegramChat: openTelegramLink недоступен, используем fallback в новой вкладке');
            }
        },
        // Fallback для случая, когда Telegram недоступен
        function() {
            window.open(telegramUrl, '_blank', 'noopener,noreferrer');
            console.log('openTelegramChat: Telegram недоступен, открываем в новой вкладке');
        }
    );
}

// Функция переключения меню
function showMenuPopup() {
    console.log('showMenuPopup: Переключаем меню');
    const menu = document.getElementById('menuPopup');
    if (!menu) {
        console.error('showMenuPopup: Элемент menuPopup не найден');
        return;
    }

    if (menu.style.display === 'block') {
        menu.style.display = 'none';
        console.log('showMenuPopup: Меню закрыто');
    } else {
        menu.style.display = 'block';
        console.log('showMenuPopup: Меню открыто');
    }
}

// Функция переключения настроек
function showSettingsPopup() {
    console.log('showSettingsPopup: Переключаем настройки');
    const settings = document.getElementById('settingsPopup');
    if (!settings) {
        console.error('showSettingsPopup: Элемент settingsPopup не найден');
        return;
    }

    if (settings.style.display === 'block') {
        settings.style.display = 'none';
        console.log('showSettingsPopup: Настройки закрыты');
    } else {
        settings.style.display = 'block';
        console.log('showSettingsPopup: Настройки открыты');
    }
}

// Функция переключения аватара меню
function toggleAvatarMenu() {
    console.log('toggleAvatarMenu: Переключаем меню аватара');
    const menu = document.getElementById('avatarDropdown');
    if (!menu) {
        console.error('toggleAvatarMenu: Элемент avatarDropdown не найден');
        return;
    }

    if (menu.style.display === 'block') {
        menu.style.display = 'none';
        console.log('toggleAvatarMenu: Меню аватара закрыто');
    } else {
        menu.style.display = 'block';
        console.log('toggleAvatarMenu: Меню аватара открыто');
    }
}

// Функция перехода в корзину
function goToCart() {
    console.log('goToCart: Открываем корзину, товаров:', cart ? cart.length : 0);

    const cartPopup = document.getElementById('cartPopup');
    if (!cartPopup) {
        console.error('goToCart: Элемент cartPopup не найден');
        return;
    }

    // Всегда открываем корзину, даже если она пустая
    cartPopup.style.display = 'block';
    console.log('goToCart: Корзина открыта');

    // Обновляем содержимое корзины
    if (typeof renderCartItems === 'function') {
        renderCartItems();
    }
    if (typeof updateCartCalculations === 'function') {
        updateCartCalculations();
    }
}

// Безопасная функция для работы с Telegram Web App
function safeTelegramCall(callback, fallback) {
    try {
        if (window.Telegram && window.Telegram.WebApp) {
            return callback(window.Telegram.WebApp);
        } else {
            if (fallback) fallback();
        }
    } catch (error) {
        console.warn('safeTelegramCall: Ошибка работы с Telegram Web App:', error);
        if (fallback) fallback();
    }
}

// === КОНЕЦ ОСНОВНЫХ ФУНКЦИЙ ===

// Инициализация корзины
let cart = [];
let cartItemCount = 0;
// Глобальный кэш состояния авторизации (устранение гонок показа формы/логаута)
window.__authState = window.__authState || { isAuthenticated: false, profile: null };
// Определение авторизованности из различных форматов ответа API
function isAuthenticatedData(data) {
    try {
        if (!data) return false;
        let obj = data;
        if (typeof data === 'object' && 'success' in data && 'profile' in data) {
            obj = data.profile || {};
        }
        if (obj && obj.authenticated === true) return true;
        const name = (obj.displayName || obj.username || '').toString().trim();
        const email = (obj.email || '').toString().trim();
        const phone = (obj.phone || '').toString().trim();
        if (name && name.toLowerCase() !== 'guest') return true;
        if (email) return true;
        if (phone) return true;
        return false;
    } catch (_) {
        return false;
    }
}

// Возвращает строку Telegram-параметров для запроса профиля (если доступно)
function getTelegramQueryString() {
    try {
        // Проверяем доступность Telegram Web App
        if (!window.Telegram || !window.Telegram.WebApp) {
            console.log('getTelegramQueryString: Telegram Web App недоступен');
            return '';
        }

        const tg = window.Telegram.WebApp.initDataUnsafe;
        const params = new URLSearchParams();

        if (tg && tg.user) {
            if (tg.user.id) params.set('tg_id', tg.user.id);
            if (tg.user.username) params.set('tg_username', tg.user.username);
            if (tg.user.first_name) params.set('tg_first_name', tg.user.first_name);
            if (tg.user.last_name) params.set('tg_last_name', tg.user.last_name);
            if (tg.user.photo_url) params.set('tg_photo_url', tg.user.photo_url);
        }

        const qs = params.toString();
        return qs ? ('?' + qs) : '';
    } catch (e) {
        console.warn('getTelegramQueryString: Ошибка получения Telegram данных', e);
        return '';
    }
}

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
    'dunlop dhcn1060 heavy core drop c# 10-60',
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
    'Dunlop DHCN1060 Heavy Core Drop C# 10-60',
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

        // Принудительно обновляем стили кнопки оплаты после изменения корзины
        forcePayButtonStyles();
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

    // Обновляем бейдж после инициализации корзины
    updateCartBadge();
    
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

    // Обновляем способы доставки после добавления товара
    updateDeliveryMethods();
}

// Функция обновления бейджа корзины
function updateCartBadge() {
    console.log('updateCartBadge: Обновляем бейдж, товаров:', cartItemCount);

    // Обновляем бейдж в нижней навигации
    const badge = document.querySelector('.cart-badge');
    if (badge) {
        badge.textContent = cartItemCount;
        badge.style.display = cartItemCount > 0 ? 'block' : 'none';
        console.log('updateCartBadge: Бейдж в навигации обновлен');
    }

    // Обновляем бейдж с ID cartBadge
    const badge2 = document.getElementById('cartBadge');
    if (badge2) {
        badge2.textContent = cartItemCount;
        badge2.style.display = cartItemCount > 0 ? 'block' : 'none';
        console.log('updateCartBadge: Бейдж cartBadge обновлен');
    }

    // Если товаров нет, скрываем все бейджи
    if (cartItemCount === 0) {
        const allBadges = document.querySelectorAll('.cart-badge');
        allBadges.forEach(badge => {
            badge.style.display = 'none';
        });
        console.log('updateCartBadge: Все бейджи скрыты (товаров нет)');
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
        const lang = getCurrentLanguage ? getCurrentLanguage() : (localStorage.getItem('selectedLanguage') || 'uk');
        const emptyCartText = lang === 'uk' ? 'Кошик порожній' : lang === 'en' ? 'Cart is empty' : 'Корзина пуста';
        cartItemsContainer.innerHTML = `<div class="empty-cart">${emptyCartText}</div>`;
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
    console.log('removeFromCart: Корзина до удаления:', cart.length, 'товаров');
    
    if (index >= 0 && index < cart.length) {
        cart.splice(index, 1);
        cartItemCount = cart.length;
        console.log('removeFromCart: Корзина после удаления:', cart.length, 'товаров');

        updateCartBadge();
        renderCartItems();
        updateCartCalculations();

        // Сохраняем корзину сразу после удаления
        saveCartToStorage();
        console.log('removeFromCart: Корзина сохранена в localStorage');
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
    
    // Рассчитываем скидку по бонусам (10 бонусов = 1грн)
    const bonusDiscount = Math.round(usedBonuses / 10); // Конвертируем бонусы в гривны с округлением

    // Сохраняем значения в localStorage для использования при оформлении заказа
    localStorage.setItem('cartBonusesUsed', usedBonuses.toString()); // Количество использованных бонусов
    localStorage.setItem('cartBonusDiscount', bonusDiscount.toString()); // Сумма скидки по бонусам в гривнах
    localStorage.setItem('cartCouponDiscount', couponAmount.toString()); // Сохраняем рассчитанную сумму скидки

    // Рассчитываем сумму товаров с учетом скидок (купон и бонусы применяются только к товарам)
    const itemsTotalAfterDiscounts = newPricesTotal - couponAmount - bonusDiscount;
    const itemsFinalTotal = Math.max(0, itemsTotalAfterDiscounts); // Стоимость товаров после всех скидок
    
    // Обновляем отображение итогов
    const subtotalElement = document.querySelector('#cartSubtotal');
    const discountElement = document.querySelector('#cartDiscount');
    const totalElement = document.querySelector('#cartTotalPrice');
    const payAmountElement = document.querySelector('#cartPayAmount');
    const couponElement = document.querySelector('#cartCouponUsed');
    const bonusElement = document.querySelector('#cartBonusUsed');

    console.log('updateCartCalculations: Элементы найдены:', {
        subtotalElement: !!subtotalElement,
        discountElement: !!discountElement,
        totalElement: !!totalElement,
        payAmountElement: !!payAmountElement,
        couponElement: !!couponElement,
        bonusElement: !!bonusElement
    });
    
    // Обновляем способы доставки в зависимости от суммы корзины
    updateDeliveryMethods();

    // Дополнительный вызов после всех расчетов для гарантии обновления
    setTimeout(() => {
        updateDeliveryMethods();
    }, 100);
    
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
             bonusElement.textContent = `-${bonusDiscount.toFixed(0)} ${getCurrencyWithDot()}`;
             bonusElement.parentElement.style.display = 'flex';
         } else {
             bonusElement.parentElement.style.display = 'none';
         }
     }
    
         // Обновляем стоимость доставки и общую сумму
     updateDeliveryCost();
     
     if (totalElement) {
         const deliveryCost = getDeliveryCost();
        // Купон и бонусы не применяются к доставке - добавляем доставку к товарам со скидками
        const totalWithDelivery = itemsFinalTotal + deliveryCost;
         
         // Убеждаемся, что итоговая сумма не меньше 0
         const finalAmount = Math.max(0, totalWithDelivery);
         
         console.log('updateCartCalculations: Обновляем итоговую сумму - itemsFinalTotal:', itemsFinalTotal, 'deliveryCost:', deliveryCost, 'finalAmount:', finalAmount);

         if (totalElement) {
         totalElement.textContent = `${finalAmount.toFixed(0)} ${getCurrency()}.`;
             console.log('updateCartCalculations: totalElement обновлен:', totalElement.textContent);
         } else {
             console.log('updateCartCalculations: totalElement не найден!');
         }
         
         if (payAmountElement) {
             payAmountElement.textContent = `${finalAmount.toFixed(0)} ${getCurrency()}`;
             console.log('updateCartCalculations: payAmountElement обновлен:', payAmountElement.textContent);
         } else {
             console.log('updateCartCalculations: payAmountElement не найден!');
         }
         
         // Обновляем доступные способы доставки в зависимости от суммы корзины
         updateDeliveryMethods();

         // Принудительно обновляем стили кнопки оплаты после расчетов
         setTimeout(() => {
             forcePayButtonStyles();
         }, 100); // Небольшая задержка для применения стилей
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
    console.log('getCouponDiscount: couponInput exists:', !!couponInput);
    console.log('getCouponDiscount: couponInput value:', couponInput ? couponInput.value : 'null');

    if (!couponInput || !couponInput.value.trim()) {
        console.log('getCouponDiscount: Купон не введен или поле пустое');
        return 0;
    }
    
    const couponCode = couponInput.value.trim().toLowerCase();
    console.log('getCouponDiscount: Введен код купона:', couponCode);
    
    // Здесь можно добавить логику проверки купонов
    // Пока используем простую логику для тестирования
    if (couponCode === 'test10') {
        console.log('getCouponDiscount: Применен купон test10 (10% скидка)');
        return 0.10; // 10% скидка
    } else if (couponCode === 'test20') {
        console.log('getCouponDiscount: Применен купон test20 (20% скидка)');
        return 0.20; // 20% скидка
    } else if (couponCode === 'test50') {
        console.log('getCouponDiscount: Применен купон test50 (50 грн скидка)');
        return 50; // 50 грн скидка
    }

    console.log('getCouponDiscount: Неизвестный код купона:', couponCode);
    
    return 0; // Неверный купон
}

// Функция получения количества используемых бонусов
function getUsedBonuses() {
    const bonusesInput = document.getElementById('cartBonusesInput');

    // Проверяем авторизацию пользователя
    if (!window.__authState || !window.__authState.isAuthenticated) {
        console.log('getUsedBonuses: Пользователь не авторизован, бонусы недоступны');

        // Показываем подсказку для гостей
        if (bonusesInput && bonusesInput.value) {
            alert('Щоб використовувати бонуси, необхідно зареєструватися та відправляти замовлення з залогіненого аккаунта.\n\nTo use bonuses, you need to register and place orders from a logged-in account.');
            bonusesInput.value = '';
        }

        return 0;
    }

    if (!bonusesInput || !bonusesInput.value) return 0;
    
    const usedBonuses = parseInt(bonusesInput.value) || 0;
    const availableBonuses = getUserBonusBalance(); // Используем актуальный баланс
    
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
      console.log('updateDeliveryCost: Вызываем обновление стоимости доставки');
      const deliveryCostElement = document.querySelector('#cartDelivery');
      const commissionElement = document.querySelector('#cartCommission');

      // Проверяем, пуста ли корзина
      const isCartEmpty = !cart || cart.length === 0;
      console.log('updateDeliveryCost: Корзина пуста?', isCartEmpty, 'cart:', cart, 'cart.length:', cart ? cart.length : 'undefined');

      if (isCartEmpty) {
          // В пустой корзине не показываем стоимость доставки
          if (deliveryCostElement && deliveryCostElement.parentElement) {
              deliveryCostElement.parentElement.style.display = 'none';
              console.log('updateDeliveryCost: Скрыли стоимость доставки для пустой корзины');
          }
          return;
      }

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

    // Если идет процесс оформления заказа, не трогаем способы доставки
    if (isCheckoutInProgress) {
        console.log('updateDeliveryMethods: Пропускаем обновление способов доставки во время оформления заказа');
        return;
    }
    
    const paymentSelect = document.getElementById('paymentMethodSelect');
    const deliverySelect = document.getElementById('deliveryMethodSelect');
    
    if (!paymentSelect || !deliverySelect) {
        console.error('updateDeliveryMethods: Элементы выбора не найдены');
        return;
    }
    
    const selectedPayment = paymentSelect.value;
    
    // Рассчитываем сумму корзины
    let cartTotal = 0;
    console.log('updateDeliveryMethods: Рассчитываем сумму корзины, cart.length:', cart.length);
    cart.forEach((item, index) => {
        const newPrice = parseInt(item.newPrice || item.price || 0);
        const quantity = item.quantity || 1;
        const itemTotal = newPrice * quantity;
        cartTotal += itemTotal;
        console.log('updateDeliveryMethods: Товар', index, '- цена:', newPrice, 'кол-во:', quantity, 'итого:', itemTotal, 'накоплено:', cartTotal);
    });
    console.log('updateDeliveryMethods: Итоговая сумма корзины:', cartTotal);
    
    // Получаем все опции доставки
    const deliveryOptions = deliverySelect.querySelectorAll('option');
    
    if (selectedPayment === 'meeting') {
        // Если выбрана оплата "при встрече в Одессе", показываем все способы доставки
        console.log('updateDeliveryMethods: Оплата при встрече - показываем все способы доставки');

        deliveryOptions.forEach(option => {
            // Показываем все способы доставки, но самовывоз будет рекомендуемым
                option.style.display = 'block';
                option.disabled = false;
        });

        // Не устанавливаем самовывоз принудительно, позволяем пользователю выбирать
        
    } else {
        // Для других способов оплаты показываем способы доставки в зависимости от суммы корзины
        console.log('updateDeliveryMethods: Показываем способы доставки в зависимости от суммы корзины');
        
        // Проверяем, используется ли купон в корзине
        const couponDiscount = parseInt(localStorage.getItem('cartCouponDiscount') || '0');
        const hasCoupon = couponDiscount > 0;
        
        deliveryOptions.forEach(option => {
            console.log('updateDeliveryMethods: Обрабатываем опцию:', option.value, 'cartTotal:', cartTotal, 'hasCoupon:', hasCoupon);
            if (option.value === 'free1001') {
                // Если используется купон, скрываем бесплатную доставку от 1001 грн
                if (hasCoupon) {
                    option.style.display = 'none';
                    option.disabled = true;
                    console.log('updateDeliveryMethods: Скрываем бесплатную доставку от 1001 грн (используется купон)');
                } else if (cartTotal >= 1001) {
                    option.style.display = 'block';
                    option.disabled = false;
                    console.log('updateDeliveryMethods: Показываем бесплатную доставку от 1001 грн');
                } else {
                    option.style.display = 'none';
                    option.disabled = true;
                    console.log('updateDeliveryMethods: Скрываем бесплатную доставку от 1001 грн (cartTotal < 1001)');
                }
            } else if (option.value === 'free2000') {
                // Если используется купон, скрываем бесплатную доставку от 2000 грн
                if (hasCoupon) {
                    option.style.display = 'none';
                    option.disabled = true;
                    console.log('updateDeliveryMethods: Скрываем бесплатную доставку от 2000 грн (используется купон)');
                } else if (cartTotal >= 2000) {
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
    
    // Дополнительная настройка UI для самовывоза
    try { if (typeof updatePickupUi === 'function') updatePickupUi(deliverySelect.value); } catch (e) {}

    // Инициализация видимости полей при первой загрузке корзины
    const currentMethod = deliverySelect.value;
    if (currentMethod !== 'ukrposhta') {
        // Скрываем поле индекса для всех методов кроме укрпочты
        const indexInput = document.getElementById('cartCustomerIndex');
        const indexRow = indexInput ? indexInput.closest('.info-row') : null;
        if (indexRow) {
            indexRow.style.display = 'none';
        }
    }
    // Обновляем стоимость доставки
    updateDeliveryCost();
}

// Настройка UI для самовывоза: адрес, время, обязательность полей
function updatePickupUi(selectedMethod) {
    try {
        // Если идет процесс оформления заказа, не трогаем данные пользователя
        if (isCheckoutInProgress) {
            console.log('updatePickupUi: Пропускаем обновление UI во время оформления заказа');
            return;
        }

        const lang = getCurrentLanguage ? getCurrentLanguage() : (localStorage.getItem('selectedLanguage') || 'uk');
        const cityEl = document.getElementById('cartCustomerSettlement');
        const branchEl = document.getElementById('cartCustomerBranch');
        const nameEl = document.getElementById('cartCustomerName');

        // Объявляем переменные для элементов самовывоза в начале функции
        const cartPickupAddressRow = document.getElementById('cartPickupAddressRow');
        const cartPickupTimeRow = document.getElementById('cartPickupTimeRow');

        if (!cityEl || !branchEl) return;

        // Проверяем комбинацию оплаты "при встрече" + самовывоз
        const paymentMethodSelect = document.getElementById('paymentMethodSelect');
        const isMeetingPickup = selectedMethod === 'pickup' && paymentMethodSelect && paymentMethodSelect.value === 'meeting';

        console.log('updatePickupUi: selectedMethod:', selectedMethod);
        console.log('updatePickupUi: isMeetingPickup:', isMeetingPickup);

        if (selectedMethod === 'pickup') {
            console.log('updatePickupUi: Настройка для самовывоза');
            // Город = Одесса только для самовывоза, но только если поле пустое или содержит автозаполненное значение
            const currentValue = cityEl.value.trim();
            const od = window.translations ? window.translations.getTranslation('pickupOdessa', lang) : 'Одесса';

            // Устанавливаем Одессу только если поле пустое или содержит автозаполненное значение Одессы
            // Не трогаем, если пользователь ввел свой город
            if (!currentValue || currentValue === od || currentValue === 'Одесса') {
                cityEl.value = od;
            }
            // Если пользователь ввел другой город, оставляем его без изменений

            // ФИО всегда обязательно
            if (nameEl) nameEl.required = true;

            // Для самовывоза всегда скрываем поле номера отделения и показываем элементы самовывоза
                const regionRow = document.getElementById('regionRow');
                if (regionRow) {
                    regionRow.style.display = 'none';
                }

                // Для самовывоза скрываем поле номера отделения, так как оно не нужно
                // Время и адрес показываются в зеленых блоках ниже
                if (branchEl) {
                branchEl.style.display = 'none';
                    branchEl.style.visibility = 'hidden';
                    branchEl.style.opacity = '0';
                const branchRow = branchEl.closest('.info-row');
                if (branchRow) {
                    branchRow.style.display = 'none';
                        branchRow.style.visibility = 'hidden';
                        branchRow.style.opacity = '0';
                    }
                }

            // Для самовывоза показываем элементы самовывоза
            if (cartPickupAddressRow) cartPickupAddressRow.style.display = 'flex';
            if (cartPickupTimeRow) cartPickupTimeRow.style.display = 'flex';

            // Для оплаты "при встрече" + самовывоз дополнительная обработка времени
            if (isMeetingPickup) {

                // Получаем доступные временные слоты
                const times = getPickupTimes();
                console.log('updatePickupUi: Получены временные слоты:', times);

                // Показываем элементы самовывоза в корзине
                // cartPickupAddressRow уже объявлен в начале функции
                console.log('updatePickupUi: cartPickupAddressRow found:', !!cartPickupAddressRow);
                if (cartPickupAddressRow) {
                    cartPickupAddressRow.style.display = 'flex';
                    console.log('updatePickupUi: cartPickupAddressRow displayed');
                }

                // cartPickupTimeRow уже объявлен в начале функции
                console.log('updatePickupUi: cartPickupTimeRow found:', !!cartPickupTimeRow);
                if (cartPickupTimeRow) {
                    cartPickupTimeRow.style.display = 'flex';
                    console.log('updatePickupUi: cartPickupTimeRow displayed');

                    // Заполняем выпадающий список времени в корзине
                    const timeSelect = document.getElementById('cartPickupTimeSelect');
                    console.log('updatePickupUi: timeSelect found:', !!timeSelect);
                    if (timeSelect) {
                        // Очищаем существующие опции кроме первой
                        while (timeSelect.options.length > 1) {
                            timeSelect.remove(1);
                        }

                        // Добавляем новые опции времени
                        times.forEach(t => {
                            const opt = document.createElement('option');
                            opt.value = t;
                            opt.textContent = t;
                            timeSelect.appendChild(opt);
                        });
                        console.log('updatePickupUi: Временные слоты добавлены в селект');
                    }
                }

                // Показываем время самовывоза в контактах
                const pickupTimeEl = document.querySelector('.pickup-time');
                if (pickupTimeEl) {
                    pickupTimeEl.style.display = 'block';
                }

            } else {
                // Показываем поля для обычного самовывоза
                const regionRow = document.getElementById('regionRow');
                if (regionRow) {
                    regionRow.style.display = 'none'; // Для самовывоза область не нужна
                }

                // Для самовывоза скрываем номер отделения и индекс
                const indexInput = document.getElementById('cartCustomerIndex');
                const indexRow = indexInput ? indexInput.closest('.info-row') : null;
                if (indexRow) {
                    indexRow.style.display = 'none';
                }
                if (branchEl) {
                branchEl.style.display = 'none';
                const branchRow = branchEl.closest('.info-row');
                if (branchRow) {
                        branchRow.style.display = 'none'; // Скрываем номер отделения для самовывоза
                    }
                }

                // Получаем доступные временные слоты
                const times = getPickupTimes();
                console.log('updatePickupUi: Получены временные слоты:', times);

                // Показываем элементы самовывоза в корзине
                // cartPickupAddressRow уже объявлен в начале функции
                console.log('updatePickupUi: cartPickupAddressRow found:', !!cartPickupAddressRow);
                if (cartPickupAddressRow) {
                    cartPickupAddressRow.style.display = 'flex';
                    console.log('updatePickupUi: cartPickupAddressRow displayed');
                }

                // cartPickupTimeRow уже объявлен в начале функции
                console.log('updatePickupUi: cartPickupTimeRow found:', !!cartPickupTimeRow);
                if (cartPickupTimeRow) {
                    cartPickupTimeRow.style.display = 'flex';
                    console.log('updatePickupUi: cartPickupTimeRow displayed');

                    // Заполняем выпадающий список времени в корзине
                    const timeSelect = document.getElementById('cartPickupTimeSelect');
                    console.log('updatePickupUi: timeSelect found:', !!timeSelect);
                    if (timeSelect) {
                        // Очищаем существующие опции кроме первой
                        while (timeSelect.options.length > 1) {
                            timeSelect.remove(1);
                        }

                        // Добавляем новые опции времени
                        times.forEach(t => {
                            const opt = document.createElement('option');
                            opt.value = t;
                            opt.textContent = t;
                            timeSelect.appendChild(opt);
                        });
                        console.log('updatePickupUi: Временные слоты добавлены в селект');
                    }
                }
            }
        } else if (selectedMethod === 'free1001') {
            // Город = Одесса для бесплатной доставки от 1001грн
            const currentValue = cityEl.value.trim();
            const od = window.translations ? window.translations.getTranslation('pickupOdessa', lang) : 'Одесса';

            // Устанавливаем Одессу только если поле пустое или содержит автозаполненное значение Одессы
            // Не трогаем, если пользователь ввел свой город
            if (!currentValue || currentValue === od || currentValue === 'Одесса') {
                cityEl.value = od;
            }

            // Для бесплатной доставки от 1001грн скрываем поле области
            const regionRow = document.getElementById('regionRow');
            if (regionRow) {
                regionRow.style.display = 'none';
            }

            // Показываем поле номера отделения с правильным лейблом
            const branchLabelEl = document.querySelector('span[data-translate="branchNumber"]');
            if (branchLabelEl) {
                const branchText = lang === 'uk' ? 'Номер відділення:' : lang === 'en' ? 'Branch number:' : 'Номер отделения:';
                branchLabelEl.textContent = branchText;
            }

            // Убеждаемся, что поле - обычный input (не select) с правильным placeholder
            if (branchEl.tagName && branchEl.tagName.toLowerCase() === 'select') {
                const input = document.createElement('input');
                input.type = 'text';
                input.id = 'cartCustomerBranch';
                input.className = branchEl.className;
                input.placeholder = window.translations ? window.translations.getTranslation('branchNumberPlaceholder', lang) : 'Введите номер отделения';
                branchEl.parentNode.replaceChild(input, branchEl);
            } else {
                // Обновляем placeholder для существующего input
                branchEl.placeholder = window.translations ? window.translations.getTranslation('branchNumberPlaceholder', lang) : 'Введите номер отделения';
            }

            // Показываем поле номера отделения
            branchEl.style.display = 'block';
            const branchRow = branchEl.closest('.info-row');
            if (branchRow) {
                branchRow.style.display = 'flex';
            }

            // Скрываем элементы времени самовывоза и адреса самовывоза для бесплатной доставки от 1001грн
            const pickupTimeEl = document.querySelector('.pickup-time');
            if (pickupTimeEl) {
                pickupTimeEl.style.display = 'none';
            }

            // Скрываем поле индекса для бесплатной доставки от 1001грн
            const indexInput = document.getElementById('cartCustomerIndex');
            const indexRow = indexInput ? indexInput.closest('.info-row') : null;
            if (indexRow) {
                indexRow.style.display = 'none';
            }

        } else if (selectedMethod === 'free2000') {
            // Для бесплатной доставки от 2000грн - аналогично free1001
            const currentValue = cityEl.value.trim();
            const od = window.translations ? window.translations.getTranslation('pickupOdessa', lang) : 'Одесса';

            // Устанавливаем Одессу только если поле пустое или содержит автозаполненное значение Одессы
            if (!currentValue || currentValue === od || currentValue === 'Одесса') {
                cityEl.value = od;
            }

            // Скрываем поле области
            const regionRow = document.getElementById('regionRow');
            if (regionRow) {
                regionRow.style.display = 'none';
            }

            // Показываем поле номера отделения
            if (branchEl) {
                // Устанавливаем все стили одновременно для предотвращения мелькания
                setTimeout(() => {
            branchEl.style.display = 'block';
                    branchEl.style.visibility = 'visible';
                    branchEl.style.opacity = '1';
                    branchEl.style.position = 'relative';
                    branchEl.style.width = '100%';
                    branchEl.style.maxWidth = '200px';

            const branchRow = branchEl.closest('.info-row');
            if (branchRow) {
                branchRow.style.display = 'flex';
                        branchRow.style.visibility = 'visible';
                        branchRow.style.opacity = '1';
                        branchRow.style.alignItems = 'center';
                        branchRow.style.justifyContent = 'space-between';
                        branchRow.style.width = '100%';
                    }
                    console.log('updatePickupUi: Показали поле номера отделения для free2000');
                }, 10);
            }

            // Скрываем элементы времени самовывоза и адреса самовывоза для бесплатной доставки от 2000грн
            const pickupTimeEl2 = document.querySelector('.pickup-time');
            if (pickupTimeEl2) {
                pickupTimeEl2.style.display = 'none';
            }

            // Скрываем поле индекса для бесплатной доставки от 2000грн
            const indexInput2 = document.getElementById('cartCustomerIndex');
            const indexRow2 = indexInput2 ? indexInput2.closest('.info-row') : null;
            if (indexRow2) {
                indexRow2.style.display = 'none';
            }

        } else if (selectedMethod === 'ukrposhta') {
            // Для Укрпошты очищаем город (не должно быть авто-заполнения Одессы)
            cityEl.value = '';

            // Для Укрпошты показываем поле области
            const regionRow = document.getElementById('regionRow');
            if (regionRow) {
                regionRow.style.display = 'flex';
            }

            // Показываем поле индекса, скрываем номер отделения
            const indexInput = document.getElementById('cartCustomerIndex');
            const indexRow = indexInput ? indexInput.closest('.info-row') : null;
            if (indexRow) {
                indexRow.style.display = 'flex';
            }
            if (branchEl) {
                branchEl.style.display = 'none';
                const branchRow = branchEl.closest('.info-row');
                if (branchRow) {
                    branchRow.style.display = 'none';
                }
            }

            // Принудительно применяем стили к полю индекса для укрпочты
            if (indexInput) {
                // Используем setTimeout для гарантированного применения стилей
                setTimeout(() => {
                    indexInput.style.textAlign = 'left';
                    indexInput.style.justifyContent = 'flex-start';
                    indexInput.style.marginLeft = '0';
                    indexInput.style.marginRight = 'auto';
                    indexInput.style.maxWidth = '200px';
                    indexInput.style.width = '200px';
                    indexInput.style.display = 'block';
                    indexInput.style.visibility = 'visible';
                    indexInput.style.opacity = '1';
                    indexInput.style.position = 'relative';

                    const indexRow = indexInput.closest('.info-row');
                    if (indexRow) {
                        indexRow.style.display = 'flex';
                        indexRow.style.visibility = 'visible';
                        indexRow.style.opacity = '1';
                        indexRow.style.alignItems = 'center';
                        indexRow.style.justifyContent = 'space-between';
                        indexRow.style.width = '100%';
                    }
                    console.log('updatePickupUi: Показали поле индекса для укрпочты');
                }, 1);
            }

            // Скрываем поля самовывоза для укрпочты
            if (cartPickupAddressRow) cartPickupAddressRow.style.display = 'none';
            if (cartPickupTimeRow) cartPickupTimeRow.style.display = 'none';
        } else {
            // Очищаем город для других способов доставки
            cityEl.value = '';
            // Возвращаем текст "Номер отделения"
            const branchLabelEl = document.querySelector('span[data-translate="branchNumber"]');
            if (branchLabelEl) {
                branchLabelEl.textContent = window.translations ? window.translations.getTranslation('branchNumber', lang) : 'Номер отделения:';
            }
            // Вернуть обычный input, если был select, и установить правильный placeholder
            if (branchEl.tagName && branchEl.tagName.toLowerCase() === 'select') {
                const input = document.createElement('input');
                input.type = 'text';
                input.id = 'cartCustomerBranch';
                input.className = branchEl.className;
                input.placeholder = window.translations ? window.translations.getTranslation('branchNumberPlaceholder', lang) : 'Введите номер отделения';
                branchEl.parentNode.replaceChild(input, branchEl);
            } else {
                // Обновляем placeholder для существующего input
                branchEl.placeholder = window.translations ? window.translations.getTranslation('branchNumberPlaceholder', lang) : 'Введите номер отделения';
            }

            // Скрываем поле области для других способов доставки
            const regionRow = document.getElementById('regionRow');
            if (regionRow) {
                regionRow.style.display = 'none';
            }

            // Скрываем элементы самовывоза в корзине для других способов доставки
            if (cartPickupAddressRow) {
                cartPickupAddressRow.style.display = 'none';
            }

            if (cartPickupTimeRow) {
                cartPickupTimeRow.style.display = 'none';
            }

            // Показываем поле номера отделения для других способов доставки
            if (branchEl) {
                // Используем минимальный setTimeout для гарантированного применения стилей после DOM обновления
                setTimeout(() => {
                    // Устанавливаем все стили одновременно для предотвращения мелькания
            branchEl.style.display = 'block';
                    branchEl.style.visibility = 'visible';
                    branchEl.style.opacity = '1';
                    branchEl.style.position = 'relative';
                    branchEl.style.width = '100%';
                    branchEl.style.maxWidth = '200px';

            const branchRow = branchEl.closest('.info-row');
            if (branchRow) {
                branchRow.style.display = 'flex';
                        branchRow.style.visibility = 'visible';
                        branchRow.style.opacity = '1';
                        branchRow.style.alignItems = 'center';
                        branchRow.style.justifyContent = 'space-between';
                        branchRow.style.width = '100%';
                    }
                    console.log('updatePickupUi: Показали поле номера отделения для', selectedMethod);
                }, 1); // Минимальная задержка в 1мс
            }


            if (nameEl) nameEl.required = true;
        }
    } catch (e) {}
}

function getPickupTimes() {
    const d = new Date();
    const day = d.getDay(); // 0=Sun, 6=Sat
    const currentHour = d.getHours();
    const currentMinute = d.getMinutes();
    const currentTime = currentHour * 60 + currentMinute; // минуты от начала дня

    if (day === 0) {
        // Sunday - показываем времена для понедельника (следующего дня)
        const mondayPrefix = window.translations ? window.translations.getTranslation('monday', getCurrentLanguage()) : 'Понедельник';
        return [`${mondayPrefix} 13:30`, `${mondayPrefix} 12:00`];
    }
    if (day === 6) {
        // Saturday - после 12:30 показываем времена для понедельника
        const saturdayCutoff = 12 * 60 + 30; // 12:30 в минутах
        if (currentTime >= saturdayCutoff) {
            const mondayPrefix = window.translations ? window.translations.getTranslation('monday', getCurrentLanguage()) : 'Понедельник';
            return [`${mondayPrefix} 13:30`, `${mondayPrefix} 12:00`];
        }
        return ['12:30', '12:00'];
    }
    return ['13:30', '12:00'];
}

// Функция показа/скрытия меню (перемещена в начало файла)

// Функция закрытия попапов
function closePopup(popupId) {
    console.log('closePopup: Закрываем', popupId);
    const popup = document.getElementById(popupId);
    if (popup) {
        popup.style.display = 'none';
    }
}

// Функция показа корзины
async function showCartPopup() {
    console.log('showCartPopup: Показываем корзину');
    const popup = document.getElementById('cartPopup');
    if (popup) {
        // Добавляем CSS правило непосредственно в DOM для максимальной гарантии
        const styleElement = document.createElement('style');
        styleElement.id = 'red-stars-style';
        styleElement.textContent = `
            .required-star {
                color: #ff0000 !important;
                font-weight: bold !important;
                font-size: 16px !important;
                -webkit-text-fill-color: #ff0000 !important;
                -moz-text-fill-color: #ff0000 !important;
                text-shadow: none !important;
                background: transparent !important;
                border: none !important;
                outline: none !important;
            }
            span.required-star, div.required-star {
                color: #ff0000 !important;
                font-weight: bold !important;
                font-size: 16px !important;
            }
            span[data-translate] .required-star,
            span[data-translate="fullName"] .required-star,
            span[data-translate="phone"] .required-star,
            span[data-translate="settlement"] .required-star,
            span[data-translate="regionLabel"] .required-star,
            span[data-translate="indexCode"] .required-star,
            span[data-translate="branchNumber"] .required-star {
                color: #ff0000 !important;
                font-weight: bold !important;
                font-size: 16px !important;
            }
        `;
        document.head.appendChild(styleElement);
        console.log('showCartPopup: Добавлено CSS правило для красных звездочек в DOM');

        // Настраиваем MutationObserver для отслеживания новых звездочек
        const observer = new MutationObserver((mutations) => {
            mutations.forEach((mutation) => {
                mutation.addedNodes.forEach((node) => {
                    if (node.nodeType === 1) { // ELEMENT_NODE
                        // Ищем звездочки в добавленных элементах
                        const newStars = node.querySelectorAll ? node.querySelectorAll('.required-star') : [];
                        if (node.classList && node.classList.contains('required-star')) {
                            applyRedColorToStar(node);
                        }
                        newStars.forEach(star => applyRedColorToStar(star));
                    }
                });
            });
        });

        // Функция применения красного цвета к звездочке
        function applyRedColorToStar(star) {
            star.style.setProperty('color', '#ff0000', 'important');
            star.style.setProperty('font-weight', 'bold', 'important');
            star.style.setProperty('font-size', '16px', 'important');
            star.style.setProperty('-webkit-text-fill-color', '#ff0000', 'important');
            star.style.setProperty('-moz-text-fill-color', '#ff0000', 'important');
            star.style.setProperty('text-shadow', 'none', 'important');
            console.log('MutationObserver: Применен красный цвет к звездочке');
        }

        // Запускаем наблюдение за изменениями в корзине
        observer.observe(popup, {
            childList: true,
            subtree: true
        });

        console.log('showCartPopup: MutationObserver настроен для отслеживания звездочек');

        // Показываем красные звездочки для укрпочты при открытии корзины
        const checkAndShowRedStars = () => {
            const deliveryMethodSelect = document.getElementById('deliveryMethodSelect');
            console.log('showCartPopup: Проверяем красные звездочки, текущий способ доставки:', deliveryMethodSelect ? deliveryMethodSelect.value : 'не найден');

            const ukrposhtaRedStars = document.querySelectorAll('.ukrposhta-red-star');
            console.log('showCartPopup: Найдено красных звездочек укрпочты:', ukrposhtaRedStars.length);

            if (deliveryMethodSelect && deliveryMethodSelect.value === 'ukrposhta') {
                ukrposhtaRedStars.forEach((star, index) => {
                    star.style.display = 'inline';
                    console.log(`showCartPopup: Показана красная звездочка ${index + 1}`);
                });
            } else {
                ukrposhtaRedStars.forEach((star, index) => {
                    star.style.display = 'none';
                    console.log(`showCartPopup: Скрыта красная звездочка ${index + 1}`);
                });
            }
        };

        // Проверяем несколько раз с задержками
        setTimeout(checkAndShowRedStars, 100);
        setTimeout(checkAndShowRedStars, 300);
        setTimeout(checkAndShowRedStars, 600);
        // Загружаем актуальные бонусы пользователя при открытии корзины
        try {
            if (window.__authState && window.__authState.isAuthenticated) {
                const ordersResp = await fetch('/api/user_orders', { credentials: 'include' });
                const orders = await ordersResp.json().catch(() => ({ success:false, orders:[], summary:{ totalOrders:0, bonuses:0, totalAmount:0 } }));
                const bonuses = orders.summary?.bonuses ?? 0;

                // Обновляем профиль пользователя с актуальными бонусами
                if (window.__authState.profile) {
                    window.__authState.profile.bonuses = bonuses;
                }

                console.log('showCartPopup: Загружены актуальные бонусы:', bonuses);

                // Инициализируем баланс бонусов после загрузки
                initializeUserBonus();
            }
        } catch (bonusError) {
            console.warn('showCartPopup: Не удалось загрузить бонусы:', bonusError);
        }

        updateDeliveryMethods(); // Сначала скрываем неподходящие способы доставки
        renderCartItems();
        updateCartCalculations();
        updateDeliveryMethods(); // Инициализируем способы доставки еще раз
        updateDeliveryCost(); // Обновляем стоимость доставки
        updatePaymentButtonText(); // Инициализируем текст кнопки оплаты

        // Инициализируем UI для самовывоза при открытии корзины
        const deliverySelect = document.getElementById('deliveryMethodSelect');
        if (deliverySelect && deliverySelect.value) {
            updatePickupUi(deliverySelect.value);
            updateIndexFieldVisibility(deliverySelect.value);
            console.log('showCartPopup: UI для самовывоза инициализирован, delivery:', deliverySelect.value);

            // Дополнительная инициализация поля номера отделения
            const branchEl = document.getElementById('cartCustomerBranch');
            if (branchEl && deliverySelect.value !== 'pickup' && deliverySelect.value !== 'ukrposhta') {
                branchEl.style.display = 'block';
                const branchRow = branchEl.closest('.info-row');
                if (branchRow) {
                    branchRow.style.display = 'flex';
                    branchRow.style.visibility = 'visible';
                }
                console.log('showCartPopup: Поле номера отделения инициализировано для:', deliverySelect.value);
            }
        }

        // Инициализируем валидацию поля индекса
        const indexInput = document.getElementById('cartCustomerIndex');
        if (indexInput) {
            indexInput.addEventListener('input', function(e) {
                // Удаляем все нецифровые символы
                this.value = this.value.replace(/[^0-9]/g, '');
            });

            indexInput.addEventListener('keydown', function(e) {
                // Разрешаем только цифры, backspace, delete, стрелки и tab
                if (!/[0-9]/.test(e.key) &&
                    e.key !== 'Backspace' &&
                    e.key !== 'Delete' &&
                    e.key !== 'ArrowLeft' &&
                    e.key !== 'ArrowRight' &&
                    e.key !== 'Tab') {
                    e.preventDefault();
                }
            });
        }

        // Проверяем видимость кнопки оплаты
        const cartActions = document.querySelector('.cart-actions');
        const payButton = document.querySelector('.cart-actions .btn-pay');

        // Принудительно применяем стили к кнопке оплаты
        if (payButton) {
            console.log('showCartPopup: Применяем стили к кнопке оплаты');
            forcePayButtonStyles();
            payButton.style.setProperty('opacity', '1', 'important');
            payButton.style.setProperty('background', '#f8a818', 'important');
            payButton.style.setProperty('background-color', '#f8a818', 'important');
            payButton.style.setProperty('color', 'white', 'important');
            payButton.style.setProperty('border', 'none', 'important');
            payButton.style.setProperty('box-shadow', 'none', 'important');
            payButton.style.setProperty('position', 'relative', 'important');
            payButton.style.setProperty('z-index', '9999', 'important');

            // Применяем стили к дочерним элементам
            const spans = payButton.querySelectorAll('span, [data-translate]');
            console.log('showCartPopup: Найдено span элементов:', spans.length);
            spans.forEach(span => {
                span.style.setProperty('color', 'white', 'important');
                span.style.setProperty('background', 'transparent', 'important');
                span.style.setProperty('text-shadow', 'none', 'important');
                span.style.setProperty('-webkit-text-fill-color', 'white', 'important');
                span.style.setProperty('-webkit-text-stroke', '0px transparent', 'important');
                span.style.setProperty('border', 'none', 'important');
            });

            // Повторно применяем стили через setTimeout для гарантии
            setTimeout(() => {
                console.log('showCartPopup: Повторное применение стилей');
                payButton.style.setProperty('background', '#f8a818', 'important');
                payButton.style.setProperty('color', 'white', 'important');

                spans.forEach(span => {
                    span.style.setProperty('color', 'white', 'important');
                });
            }, 50);

            // Проверяем результат применения стилей
            setTimeout(() => {
                console.log('showCartPopup: Проверка стилей после применения');
                const computedStyle = getComputedStyle(payButton);
                console.log('showCartPopup: computed display:', computedStyle.display);
                console.log('showCartPopup: computed background:', computedStyle.background);
                console.log('showCartPopup: computed color:', computedStyle.color);
                console.log('showCartPopup: computed visibility:', computedStyle.visibility);
                console.log('showCartPopup: computed opacity:', computedStyle.opacity);
            }, 100);
        }

        console.log('showCartPopup: Контейнер cart-actions найден:', !!cartActions);
        console.log('showCartPopup: Кнопка оплаты найдена:', !!payButton);

        if (cartActions) {
            console.log('showCartPopup: Стили контейнера cart-actions:', getComputedStyle(cartActions));
            console.log('showCartPopup: Контейнер cart-actions display:', cartActions.style.display);
            console.log('showCartPopup: Контейнер cart-actions visibility:', cartActions.style.visibility);
        }

        if (payButton) {
            console.log('showCartPopup: Стили кнопки оплаты:', getComputedStyle(payButton));
            console.log('showCartPopup: Кнопка оплаты отображается:', payButton.offsetWidth > 0 && payButton.offsetHeight > 0);
            console.log('showCartPopup: Кнопка оплаты display:', payButton.style.display);
            console.log('showCartPopup: Кнопка оплаты visibility:', payButton.style.visibility);
            console.log('showCartPopup: Кнопка оплаты opacity:', payButton.style.opacity);
        }

        // Проверяем корзину
        console.log('showCartPopup: Корзина пуста?', cart.length === 0);
        console.log('showCartPopup: Количество товаров в корзине:', cart.length);

        // Принудительно делаем контейнер и кнопку оплаты видимыми
        if (cartActions) {
            cartActions.style.display = 'block';
            cartActions.style.visibility = 'visible';
            cartActions.style.opacity = '1';
            console.log('showCartPopup: Принудительно сделали контейнер cart-actions видимым');
        }

        if (payButton) {
            payButton.style.display = 'flex';
            payButton.style.visibility = 'visible';
            payButton.style.opacity = '1';
            console.log('showCartPopup: Принудительно сделали кнопку оплаты видимой');
        }

        popup.style.display = 'flex';

        // Финальное обновление способов доставки для гарантии правильного отображения
        setTimeout(() => {
            updateDeliveryMethods();
            console.log('showCartPopup: Финальное обновление способов доставки выполнено');
        }, 200);
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
// Закрывает меню аватара с восстановлением портала
function closeAvatarMenu() {
    const avatarMenu = document.querySelector('.avatar-dropdown');
    if (!avatarMenu) return;
    avatarMenu.style.display = 'none';
    avatarMenu.classList.remove('show');
    if (avatarMenu.dataset.portaled === '1' && avatarMenu._restoreParent) {
        avatarMenu._restoreParent.insertBefore(avatarMenu, avatarMenu._restoreNext);
    }
    avatarMenu.dataset.portaled = '0';
}

// Функция переключения аватара
function toggleAvatarMenu() {
    console.log('toggleAvatarMenu: Переключаем меню аватара');
    const avatarMenu = document.querySelector('.avatar-dropdown');
    const profilePic = document.querySelector('.profile-pic');
    if (!avatarMenu || !profilePic) {
        console.error('toggleAvatarMenu: Элементы не найдены');
        return;
    }
    const isOpen = avatarMenu.style.display === 'block' || avatarMenu.classList.contains('show');
    console.log('toggleAvatarMenu: isOpen check:', isOpen, 'display:', avatarMenu.style.display, 'hasShow:', avatarMenu.classList.contains('show'));

    if (isOpen) {
        console.log('toggleAvatarMenu: Меню уже открыто, закрываем');
        // close and restore
        closeAvatarMenu();
        return;
    }

    // Перед показом — синхронизируем UI сессии (сначала по кэшу, затем подтверждаем по серверу)
    try {
        const loginSection = document.getElementById('dropdownLoginSection');
        const logoutSection = document.getElementById('dropdownLogoutSection');
        // Скрываем обе секции, чтобы избежать мерцания неправильного состояния
        if (loginSection) loginSection.style.display = 'none';
        if (logoutSection) logoutSection.style.display = 'none';

        const applyAuthUi = (state) => {
            if (state && state.isAuthenticated) {
                if (loginSection) loginSection.style.display = 'none';
                if (logoutSection) logoutSection.style.display = 'block';
        } else {
                if (logoutSection) logoutSection.style.display = 'none';
                if (loginSection) loginSection.style.display = 'block';
            }
        };

        // Мгновенно выставляем по локальному кэшу, если уже знаем состояние
        if (window.__authState && (window.__authState.isAuthenticated === true || window.__authState.isAuthenticated === false)) {
            applyAuthUi(window.__authState);
        }

        // Подтверждаем состояние у сервера (относительный путь), добавляем Telegram-параметры если есть
        const tgQs1 = getTelegramQueryString();
        fetch('/api/user_profile' + tgQs1, { credentials: 'include' })
            .then(r => r.ok ? r.json() : { success: false })
            .then(data => {
                const authed = isAuthenticatedData(data);
                window.__authState = { isAuthenticated: authed, profile: authed ? data.profile : null };
                applyAuthUi(window.__authState);
            })
            .catch(() => {});
    } catch (e) {}

    // Open: portal into body and position fixed under avatar
    const rect = profilePic.getBoundingClientRect();
    avatarMenu._restoreParent = avatarMenu.parentNode;
    avatarMenu._restoreNext = avatarMenu.nextSibling;
    document.body.appendChild(avatarMenu);
    avatarMenu.style.position = 'fixed';
    avatarMenu.style.top = Math.round(rect.bottom + 8) + 'px';
    // align right edges
    const width = Math.max(260, avatarMenu.offsetWidth || 260);
    let left = Math.round(rect.right - width);
    const pad = 8;
    left = Math.max(pad, Math.min(left, window.innerWidth - width - pad));
    avatarMenu.style.left = left + 'px';
    avatarMenu.style.width = width + 'px';
    avatarMenu.style.zIndex = '2147483647';
    avatarMenu.style.display = 'block';
    try { avatarMenu.classList.add('show'); } catch (e) {}
    avatarMenu.dataset.portaled = '1';

    // Close on resize
    const _reposition = () => {
        if (avatarMenu.style.display === 'block') {
            const r = profilePic.getBoundingClientRect();
            let l = Math.round(r.right - width);
            l = Math.max(pad, Math.min(l, window.innerWidth - width - pad));
            avatarMenu.style.top = Math.round(r.bottom + 8) + 'px';
            avatarMenu.style.left = l + 'px';
        }
    };
    if (!avatarMenu._rsz) {
        avatarMenu._rsz = true;
        window.addEventListener('resize', _reposition);
        window.addEventListener('scroll', _reposition, true);
    }
}

// Устанавливает активный пункт нижней навигации по текущему виду
function setActiveBottomNav(view) {
    try {
        const navItems = document.querySelectorAll('.nav-item');
        if (!navItems || navItems.length === 0) return;
        navItems.forEach(item => item.classList.remove('active'));
        navItems.forEach(item => {
            const label = (item.querySelector('span')?.textContent || '').trim();
            const isProducts = label.includes('Товары') || label.includes('Products') || label.includes('Товари');
            const isAccount = label.includes('Кабинет') || label.includes('Cabinet') || label.includes('Кабінет');
            if (view === 'products' && isProducts) item.classList.add('active');
            if (view === 'account' && isAccount) item.classList.add('active');
        });
    } catch (e) {}
}
// Функция показа/скрытия настроек (перемещена в начало файла)

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
// Функция поиска по названию товара + бейджам
async function searchByNameAndBadge(searchTerm, badgeClass) {
    console.log('searchByNameAndBadge: Поиск по названию "' + searchTerm + '" + бейджам "' + badgeClass + '"');

    try {
        // Загружаем все товары
        const response = await fetch('/api/products?start=0&limit=1000');
        if (!response.ok) {
            throw new Error(`HTTP error! status: ${response.status}`);
        }

        const data = await response.json();
        console.log(`searchByNameAndBadge: Загружено ${data.products.length} товаров`);

        if (data && data.products && data.products.length > 0) {
            // Отображаем все товары в DOM
            displayProducts(data.products);

            // Ищем товары по названию ИЛИ по бейджам
            const allProductCards = document.querySelectorAll('.product-card');
            let foundProducts = 0;

            allProductCards.forEach(card => {
                const titleEl = card.querySelector('.product-title');
                const name = titleEl ? titleEl.textContent.trim().toLowerCase() : '';

                // Проверяем название товара
                const nameMatches = name.includes(searchTerm.toLowerCase());

                // Проверяем бейджи
                let hasBadge = false;
                if (badgeClass === 'nickel-plated') {
                    hasBadge = !!card.querySelector('.product-nickelplated, .product-nickel');
                } else if (badgeClass === 'pure-nickel') {
                    hasBadge = !!card.querySelector('.product-pure, .product-purenickel');
                } else if (badgeClass === 'stainless-steel') {
                    hasBadge = !!card.querySelector('.product-stainless');
                } else if (badgeClass === 'flatwound') {
                    hasBadge = !!card.querySelector('.product-flatwound');
                }

                // Показываем товар если есть совпадение по названию ИЛИ по бейджу
                if (nameMatches || hasBadge) {
                    card.style.display = 'flex';
                    foundProducts++;
                } else {
                    card.style.display = 'none';
                }
            });

            console.log(`searchByNameAndBadge: Найдено ${foundProducts} товаров по названию "${searchTerm}" или бейджам "${badgeClass}"`);

            if (foundProducts === 0) {
                showNoSearchResults(`${searchTerm} / ${badgeClass}`);
            }

            isCategoryFilterActive = true;
        } else {
            showNoSearchResults(searchTerm);
        }
    } catch (error) {
        console.error('searchByNameAndBadge: Ошибка поиска:', error);
        showNoSearchResults(searchTerm);
    }
}

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

     // Специальная обработка для названий бейджей и кнопок из главного баннера
     if (currentSearchTerm === 'nickel') {
         console.log('searchProducts: Распознан запрос "nickel" - ищем по названию + бейджам');
         await searchByNameAndBadge('nickel', 'nickel-plated');
         return;
     }

     if (currentSearchTerm === 'pure') {
         console.log('searchProducts: Распознан запрос "pure" - ищем по названию + бейджам');
         await searchByNameAndBadge('pure', 'pure-nickel');
         return;
     }

     if (currentSearchTerm === 'stainless') {
         console.log('searchProducts: Распознан запрос "stainless" - ищем по названию + бейджам');
         await searchByNameAndBadge('stainless', 'stainless-steel');
         return;
     }

     if (currentSearchTerm === 'flatwound') {
         console.log('searchProducts: Распознан запрос "flatwound" - ищем по названию + бейджам');
         await searchByNameAndBadge('flatwound', 'flatwound');
         return;
     }

     // Специальная обработка для 12-струнных товаров
     if (currentSearchTerm === '12-string' || currentSearchTerm === '12 string' || currentSearchTerm === '12-струн' || currentSearchTerm === '12 струн') {
         console.log('searchProducts: Распознан запрос "' + currentSearchTerm + '" - ищем 12-струнные товары');
         await search12StringProducts();
         return;
     }

     // Обработка полных названий
     if (currentSearchTerm.includes('nickel plated') || currentSearchTerm.includes('nickel-plated') ||
         currentSearchTerm === 'nickel plated') {
         console.log('searchProducts: Распознан запрос на Nickel Plated - вызываем специальную функцию');
         await searchNickelPlatedElectricProducts();
         return;
     }

     if (currentSearchTerm.includes('pure nickel') || currentSearchTerm === 'pure nickel') {
         console.log('searchProducts: Распознан запрос на Pure Nickel - вызываем специальную функцию');
         await searchPureNickelElectricProducts();
         return;
     }

     if (currentSearchTerm.includes('stainless steel') || currentSearchTerm.includes('stainless-steel') ||
         currentSearchTerm === 'stainless steel') {
         console.log('searchProducts: Распознан запрос на Stainless Steel - вызываем специальную функцию');
         await searchStainlessSteelProducts();
         return;
     }

     if (currentSearchTerm.includes('cobalt') || currentSearchTerm === 'cobalt') {
         console.log('searchProducts: Распознан запрос на Cobalt - вызываем специальную функцию');
         await searchCobaltProducts();
         return;
     }

     if (currentSearchTerm.includes('flatwound') || currentSearchTerm.includes('flat wound') || currentSearchTerm === 'flat wound') {
         console.log('searchProducts: Распознан запрос на Flatwound - вызываем специальную функцию');
         await searchFlatwoundElectricProducts();
         return;
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
        const response = await fetch(`/api/products?search=${encodeURIComponent(currentSearchTerm)}&start=0&limit=1000`);
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
// Функция перехода в корзину (перемещена в начало файла)
// Универсальные функции индикатора загрузки
function showLoadingIndicator() {
    try {
        // Если уже есть – не дублируем
        if (document.getElementById('loading-indicator')) return;
        const inner = document.querySelector('.inner');
        if (!inner) return;
        const wrap = document.createElement('div');
        wrap.id = 'loading-indicator';
        wrap.style.cssText = 'display:flex;align-items:center;justify-content:center;padding:20px;margin:10px auto;';
        wrap.innerHTML = '<i class="fas fa-spinner fa-spin" style="font-size:22px;color:#4CAF50;"></i>';
        inner.appendChild(wrap);
    } catch (e) {}
}
function hideLoadingIndicator() {
    try { const ld = document.getElementById('loading-indicator'); if (ld) ld.remove(); } catch (e) {}
    try { const lo = document.getElementById('loading-overlay'); if (lo) lo.remove(); } catch (e) {}
}
// Функция загрузки товаров
async function loadProducts(page = 0, append = false) {
    console.log('loadProducts: Вызов функции, isLoading:', isLoading, 'isSearchActive:', isSearchActive);
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
        console.log('loadProducts: Отправляем запрос к API:', `/api/products?start=${start}&limit=30`);

        const response = await fetch(`/api/products?start=${start}&limit=30`);
        console.log('loadProducts: Получен ответ от сервера, статус:', response.status);

        if (!response.ok) {
            console.error('loadProducts: Сервер вернул ошибку:', response.status, response.statusText);
            throw new Error(`HTTP ошибка! статус: ${response.status} - ${response.statusText}`);
        }

        const data = await response.json();
        console.log('loadProducts: Получены данные:', data);
        
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
        // Удаляем индикаторы загрузки
        hideLoadingIndicator();
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
    // На всякий случай убираем любые индикаторы загрузки
    hideLoadingIndicator();
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
        // 12 струн для электрогитары
        document.querySelectorAll('.product-twelve-string').forEach(b => {
            b.style.cursor = 'pointer';
            b.addEventListener('click', function() {
                filterProductsByCategory('12-string', true);
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
    // Локализованный текст уведомления
    let lang = 'uk';
    try {
        if (typeof getCurrentLanguage === 'function') {
            lang = getCurrentLanguage();
        } else {
            lang = localStorage.getItem('selectedLanguage') || 'uk';
        }
    } catch (e) {
        lang = 'uk';
    }
    const messages = {
        ru: `Товар "${productName}" добавлен в корзину!`,
        uk: `Товар "${productName}" додано до кошика!`,
        en: `Product "${productName}" added to cart!`
    };
    notification.textContent = messages[lang] || messages.uk;
    
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
    let twelveStringHtml = '';
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

    // Проверяем, является ли товар 12-струнным (по явным пометкам)
    const is12StringProduct = (() => {
        const productName = product.name.toLowerCase();
        return productName.includes('12-string') ||
               productName.includes('12 string') ||
               productName.includes('12-струн для електрогітари') ||
               productName.includes('12-струн для электрогитары') ||
               productName.includes('12 струн для електрогітари') ||
               productName.includes('12 струн для электрогитары') ||
               productName.includes('12-стр') ||
               productName.includes(' twelve-string');
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
        manufacturerHtml = `<span class="product-manufacturer">DR</span>`;
    } else if (isLaBellaProduct) {
        manufacturerHtml = `<span class="product-manufacturer">La Bella</span>`;
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
    // Добавляем информацию о 12-струнных товарах
    if (is12StringProduct) {
        twelveStringHtml = `<span class="product-twelve-string">${currentTranslations.twelveStringInfo}</span>`;
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
            (function(){
                const fullName = product.name || '';
                const patterns = [
                    /nickel[ -]?plated/i,
                    /pure\s*nickel/i,
                    /stainless\s*steel/i,
                    /cobalt/i,
                    /colored/i,
                    /flat\s*wound|flatwound|half\s*rounds|chromes/i,
                    /\b[789]|-string\b/i
                ];
                let idx = -1;
                patterns.forEach(re => { const m = fullName.match(re); if (m && (idx === -1 || m.index < idx)) idx = m.index; });
                if (idx > 0) {
                    const line1 = fullName.slice(0, idx).trim();
                    const line2 = fullName.slice(idx).trim();
                    return '<div class="product-title"><span class="title-line1">' + line1 + '</span><br><span class="title-line2">' + line2 + '</span></div>';
                }
                return '<div class="product-title">' + fullName + '</div>';
            })() +
            '<div class="product-status ' + statusClass + '">' + statusText + '</div>' +
            '<div class="product-subtitle">' +
                manufacturerHtml +
                sevenStringHtml +
                eightStringHtml +
                nineStringHtml +
                twelveStringHtml +
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
                            return `<span class="product-colored" title="${title}">${badge}</span>`;
                        }
                    } catch(e) {}
                    return '';
                })() +
            '</div>' +
            '<div class="product-meta-row">' +
                '<div class="meta-left">' + oldPriceHtml + '</div>' +
                '<div class="meta-right product-rating">' + ratingHtml + '</div>' +
            '</div>' +
            '<div class="product-buy-row">' +
                '<div class="new-price">' + newPrice + ' ' + getCurrency() + '</div>' +
                statusButton +
            '</div>' +
        '</div>' +
        '';
    
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
            } else if (key === 'captchaCheck') {
                // Специальная обработка для поля капчи - убираем прочерк
                const translation = translations[lang][key];
                element.textContent = translation;
                console.log(`switchLanguage: Обновлен ${key} (captcha): "${translation}"`);
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
    console.log('DOMContentLoaded: Инициализируем приложение');

    // Применяем красный цвет к звездочкам при загрузке страницы
    setTimeout(() => {
        const allStars = document.querySelectorAll('.required-star');
        console.log('DOMContentLoaded: Применяем красный цвет к', allStars.length, 'звездочкам при загрузке');

        allStars.forEach((star, index) => {
            star.style.setProperty('color', '#ff0000', 'important');
            star.style.setProperty('font-weight', 'bold', 'important');
            star.style.setProperty('font-size', '16px', 'important');
            star.style.setProperty('-webkit-text-fill-color', '#ff0000', 'important');
            star.style.setProperty('-moz-text-fill-color', '#ff0000', 'important');
            star.style.setProperty('text-shadow', 'none', 'important');
        });

        // Настраиваем глобальный MutationObserver для отслеживания новых звездочек
        const globalObserver = new MutationObserver((mutations) => {
            mutations.forEach((mutation) => {
                mutation.addedNodes.forEach((node) => {
                    if (node.nodeType === 1) { // ELEMENT_NODE
                        const newStars = node.querySelectorAll ? node.querySelectorAll('.required-star') : [];
                        if (node.classList && node.classList.contains('required-star')) {
                            applyRedColorToStarGlobal(node);
                        }
                        newStars.forEach(star => applyRedColorToStarGlobal(star));
                    }
                });
            });
        });

        function applyRedColorToStarGlobal(star) {
            star.style.setProperty('color', '#ff0000', 'important');
            star.style.setProperty('font-weight', 'bold', 'important');
            star.style.setProperty('font-size', '16px', 'important');
            star.style.setProperty('-webkit-text-fill-color', '#ff0000', 'important');
            star.style.setProperty('-moz-text-fill-color', '#ff0000', 'important');
            star.style.setProperty('text-shadow', 'none', 'important');
            console.log('Global MutationObserver: Применен красный цвет к новой звездочке');
        }

        // Запускаем глобальное наблюдение
        globalObserver.observe(document.body, {
            childList: true,
            subtree: true
        });

        console.log('DOMContentLoaded: Глобальный MutationObserver настроен для звездочек');
    }, 100);

    // Сбрасываем переменные состояния
    isLoading = false;
    isSearchActive = false;
    searchTerm = '';
    currentPage = 0;
    hasMoreProducts = true;

    // Очищаем поисковый input при загрузке страницы
    try {
        const searchInput = document.querySelector('.search-input');
        if (searchInput) {
            searchInput.value = '';
        }
    } catch (e) {
        console.warn('DOMContentLoaded: Ошибка очистки поискового input:', e);
    }
    
    // Маркируем окружение Telegram WebApp (только при наличии реальных данных пользователя)
    try {
        const isTelegramEnv = !!(
            window.Telegram &&
            window.Telegram.WebApp &&
            window.Telegram.WebApp.initDataUnsafe &&
            window.Telegram.WebApp.initDataUnsafe.user &&
            window.Telegram.WebApp.initDataUnsafe.user.id
        );
        if (isTelegramEnv) {
            document.body.classList.add('is-telegram');
        } else {
            document.body.classList.remove('is-telegram');
        }
    } catch (e) {}
    
    // Инициализируем язык
    initializeLanguage();

    // Восстанавливаем заголовок приложения
    restoreAppTitle();
    
    // Инициализируем корзину
    initializeCart();

    // Инициализация баланса бонусов будет выполнена после загрузки данных пользователя
    // initializeUserBonus();
    
    // Сбрасываем состояние бесконечной прокрутки
    currentPage = 0;
    hasMoreProducts = true;
    loadedProductNames.clear();
    
    // Синхронизируем состояние авторизации заранее (чтобы дропдаун профиля не мигал формой)
    try {
        const tgQs0 = getTelegramQueryString();
        fetch('/api/user_profile' + tgQs0, { credentials: 'include' })
            .then(r => r.ok ? r.json() : { success: false })
            .then(data => {
                const authed = isAuthenticatedData(data);
                window.__authState = { isAuthenticated: authed, profile: authed ? (data.profile || data) : null };
                // Обновим аватар в хедере, если есть фото
                try {
                    const headerImg = document.getElementById('profile-image');
                    const headerSvg = document.getElementById('profile-svg');
                    const headerIcon = document.getElementById('profile-icon');
                    const p = (data && (data.profile || data)) || {};
                    if (headerImg && authed && p.photoUrl) {
                        headerImg.src = p.photoUrl;
                        headerImg.style.display = 'block';
                        if (headerSvg) headerSvg.style.display = 'none';
                        if (headerIcon) headerIcon.style.display = 'none';
                    }
                } catch (e) {}
            })
            .catch(() => {});
    } catch (e) {}
    
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

    // Инициализируем заказы из localStorage
    initializeUserOrders();

    // Перед перезагрузкой сохраняем фактический видимый раздел
    window.addEventListener('beforeunload', function() {
        try {
            const view = getVisibleView();
            localStorage.setItem('currentView', view);
        } catch (e) {}
    });
});

// Функция инициализации заказов пользователя из localStorage
function initializeUserOrders() {
    try {
        console.log('initializeUserOrders: Инициализация заказов из localStorage');

        // Получаем заказы из localStorage
        const orders = JSON.parse(localStorage.getItem('userOrders') || '[]');

        // Сохраняем в глобальную переменную
        window.userOrders = orders;

        console.log('initializeUserOrders: Загружено заказов:', orders.length);

    } catch (error) {
        console.error('initializeUserOrders: Ошибка инициализации заказов', error);
        window.userOrders = [];
    }
}

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
    // Логика форм логина/регистрации + капча
    try {
        const loginForm = document.getElementById('loginForm');
        const loginMessage = document.getElementById('loginMessage');
        const dropdownLoginSection = document.getElementById('dropdownLoginSection');
        const dropdownLogoutSection = document.getElementById('dropdownLogoutSection');
        const dropdownLogoutBtn = document.getElementById('dropdownLogoutBtn');
        const showRegisterLink = document.getElementById('showRegisterLink');
        const showLoginLink = document.getElementById('showLoginLink');
        const showSmsLoginLink = document.getElementById('showSmsLoginLink');
        const showSmsFromRegisterLink = document.getElementById('showSmsFromRegisterLink');
        const showPasswordLoginLink = document.getElementById('showPasswordLoginLink');
        const showRegisterFromSmsLink = document.getElementById('showRegisterFromSmsLink');
        const smsSection = document.getElementById('dropdownSmsLoginSection');
        const smsLoginForm = document.getElementById('smsLoginForm');
        const smsPhoneInput = document.getElementById('smsPhoneInput');
        const smsSendCodeBtn = document.getElementById('smsSendCodeBtn');
        const smsResendCodeBtn = document.getElementById('smsResendCodeBtn');
        const smsCodeRow = document.getElementById('smsCodeRow');
        const smsCodeInput = document.getElementById('smsCodeInput');
        const smsConfirmCodeBtn = document.getElementById('smsConfirmCodeBtn');
        const smsLoginMessage = document.getElementById('smsLoginMessage');
        const registerForm = document.getElementById('registerForm');
        const registerMessage = document.getElementById('registerMessage');

        // Состояние капчи
        let loginCaptchaId = null;
        let registerCaptchaId = null;

        async function fetchCaptcha(target) {
            try {
                const resp = await fetch('/api/captcha');
                const data = await resp.json();
                if (!data.success) return;
                if (target === 'login') {
                    loginCaptchaId = data.captchaId;
                    const row = document.getElementById('loginCaptchaRow');
                    const label = document.getElementById('loginCaptchaQuestion');
                    const currentLang = localStorage.getItem('selectedLanguage') || 'uk';
                    const prefix = getTranslation('captchaCheck', currentLang);
                    if (row && label) { row.style.display = 'block'; label.textContent = `${prefix}: ${data.question}`; }
                } else if (target === 'register') {
                    registerCaptchaId = data.captchaId;
                    const row = document.getElementById('registerCaptchaRow');
                    const label = document.getElementById('registerCaptchaQuestion');
                    const currentLang = localStorage.getItem('selectedLanguage') || 'uk';
                    const prefix = getTranslation('captchaCheck', currentLang);
                    if (row && label) { row.style.display = 'block'; label.textContent = `${prefix}: ${data.question}`; }
                }
            } catch (e) { /* ignore */ }
        }

        // Переключение UI
        if (showRegisterLink && showLoginLink) {
            showRegisterLink.addEventListener('click', (e) => {
                e.preventDefault();
                console.log('Клик по "Создать аккаунт"');

                // Сначала скрываем все секции
                const allSections = ['dropdownLoginSection', 'dropdownRegisterSection', 'dropdownSmsLoginSection'];
                allSections.forEach(sectionId => {
                    const section = document.getElementById(sectionId);
                    if (section) {
                        section.style.display = 'none';
                        section.classList.remove('show');
                        console.log('Скрыта секция:', sectionId);
                    }
                });

                // Небольшая задержка перед показом секции регистрации
                setTimeout(() => {
                    const regSection = document.getElementById('dropdownRegisterSection');
                    console.log('Показываем секцию регистрации:', regSection);
                    if (regSection) {
                        regSection.style.display = 'block';
                        regSection.classList.add('show');
                        console.log('Секция регистрации показана');

                        // Проверяем, что форма регистрации существует
                        const registerForm = document.getElementById('registerForm');
                        console.log('Форма регистрации:', registerForm);

                        // Загружаем капчу
                        fetchCaptcha('register');
                    } else {
                        console.error('Секция регистрации не найдена!');
                    }
                registerMessage.textContent = '';
                fetchCaptcha('register');
                }, 10);
            });
        }

        if (showLoginLink) {
            showLoginLink.addEventListener('click', (e) => {
                e.preventDefault();
                // Сначала скрываем все секции
                const allSections = ['dropdownLoginSection', 'dropdownRegisterSection', 'dropdownSmsLoginSection'];
                allSections.forEach(sectionId => {
                    const section = document.getElementById(sectionId);
                    if (section) {
                        section.style.display = 'none';
                        section.classList.remove('show');
                    }
                });

                // Небольшая задержка перед показом секции логина
                setTimeout(() => {
                    const loginSection = document.getElementById('dropdownLoginSection');
                    if (loginSection) {
                        loginSection.style.display = 'block';
                        loginSection.classList.add('show');
                    }
                loginMessage.textContent = '';
                fetchCaptcha('login');
                }, 10);
            });
        }

        // Переключения на SMS-вход и обратно
        function showSmsLogin() {
            // Агрессивно скрываем все секции
            const allSections = ['dropdownLoginSection', 'dropdownRegisterSection', 'dropdownSmsLoginSection'];
            allSections.forEach(sectionId => {
                const section = document.getElementById(sectionId);
                if (section) {
                    // Сбрасываем все стили и классы
                    section.style.display = 'none';
                    section.classList.remove('show');
                    section.style.visibility = 'hidden';
                    section.style.opacity = '0';
                }
            });

            // Небольшая задержка перед показом SMS секции
            setTimeout(() => {
                const smsSection = document.getElementById('dropdownSmsLoginSection');
                if (smsSection) {
                    smsSection.style.display = 'block';
                    smsSection.classList.add('show');
                    smsSection.style.visibility = 'visible';
                    smsSection.style.opacity = '1';
                }
            smsLoginMessage.textContent = '';
            if (smsPhoneInput && !smsPhoneInput.value) smsPhoneInput.value = '+380';
            }, 10);
        }
        function showPasswordLogin() {
            // Агрессивно скрываем все секции
            const allSections = ['dropdownLoginSection', 'dropdownRegisterSection', 'dropdownSmsLoginSection'];
            allSections.forEach(sectionId => {
                const section = document.getElementById(sectionId);
                if (section) {
                    // Сбрасываем все стили и классы
                    section.style.display = 'none';
                    section.classList.remove('show');
                    section.style.visibility = 'hidden';
                    section.style.opacity = '0';
                }
            });

            // Небольшая задержка перед показом секции логина
            setTimeout(() => {
                if (dropdownLoginSection) {
                    dropdownLoginSection.style.display = 'block';
                    dropdownLoginSection.classList.add('show');
                    dropdownLoginSection.style.visibility = 'visible';
                    dropdownLoginSection.style.opacity = '1';
                    // Загружаем капчу сразу при открытии формы
                    fetchCaptcha('login');
                }
            loginMessage.textContent = '';
            }, 10);
        }
        function showRegisterFromSms() {
            // Агрессивно скрываем все секции
            const allSections = ['dropdownLoginSection', 'dropdownRegisterSection', 'dropdownSmsLoginSection'];
            allSections.forEach(sectionId => {
                const section = document.getElementById(sectionId);
                if (section) {
                    // Сбрасываем все стили и классы
                    section.style.display = 'none';
                    section.classList.remove('show');
                    section.style.visibility = 'hidden';
                    section.style.opacity = '0';
                }
            });

            // Небольшая задержка перед показом секции регистрации
            setTimeout(() => {
            const reg = document.getElementById('dropdownRegisterSection');
                if (reg) {
                    reg.style.display = 'block';
                    reg.classList.add('show');
                    reg.style.visibility = 'visible';
                    reg.style.opacity = '1';
                    // Загружаем капчу для регистрации
                    fetchCaptcha('register');
                }
            registerMessage.textContent = '';
            }, 10);
        }

        if (showSmsLoginLink) showSmsLoginLink.addEventListener('click', (e) => { e.preventDefault(); showSmsLogin(); });
        if (showSmsFromRegisterLink) showSmsFromRegisterLink.addEventListener('click', (e) => { e.preventDefault(); showSmsLogin(); });
        if (showPasswordLoginLink) showPasswordLoginLink.addEventListener('click', (e) => { e.preventDefault(); showPasswordLogin(); });
        if (showRegisterFromSmsLink) showRegisterFromSmsLink.addEventListener('click', (e) => { e.preventDefault(); showRegisterFromSms(); });

        // Отправка и подтверждение SMS‑кода
        async function requestSmsCode() {
            if (!smsPhoneInput) return;
            const phone = (smsPhoneInput.value || '').trim();
            if (!phone) { smsLoginMessage.textContent = 'Введите номер телефона'; return; }
            smsLoginMessage.textContent = '';
            try {
                const resp = await fetch('/api/sms/request_code', {
                    method: 'POST',
                    headers: { 'Content-Type': 'application/json' },
                    body: JSON.stringify({ phone, lang: getCurrentLanguage() })
                });
                const data = await resp.json();
                if (!data.success) { smsLoginMessage.textContent = data.error || 'Не удалось отправить SMS'; return; }
                smsLoginMessage.textContent = 'Код отправлен';
                if (smsCodeRow) smsCodeRow.style.display = 'block';
                if (smsResendCodeBtn) smsResendCodeBtn.style.display = 'inline-block';
            } catch (e) {
                smsLoginMessage.textContent = 'Сервер недоступен';
            }
        }

        async function confirmSmsCode() {
            if (!smsPhoneInput || !smsCodeInput) return;
            const phone = (smsPhoneInput.value || '').trim();
            const code = (smsCodeInput.value || '').trim();
            if (!phone || !code) { smsLoginMessage.textContent = 'Введите телефон и код'; return; }
            smsLoginMessage.textContent = '';
            try {
                // Telegram номер/аватар (если доступно)
                let tgPhone = null, tgPhotoUrl = null;
                try {
                    if (window.Telegram && window.Telegram.WebApp && window.Telegram.WebApp.initDataUnsafe && window.Telegram.WebApp.initDataUnsafe.user) {
                        tgPhone = window.Telegram.WebApp.initDataUnsafe.user.phone_number || null;
                        tgPhotoUrl = window.Telegram.WebApp.initDataUnsafe.user.photo_url || null;
                    }
                } catch (e) {}

                const resp = await fetch('/api/sms/confirm', {
                    method: 'POST',
                    headers: { 'Content-Type': 'application/json' },
                    credentials: 'include',
                    body: JSON.stringify({ phone, code, lang: getCurrentLanguage(), tg_phone: tgPhone, tg_photo_url: tgPhotoUrl })
                });
                const data = await resp.json();
                if (!data.success) { smsLoginMessage.textContent = data.error || 'Неверный код'; return; }
                // Успех: показать кабинет
                if (smsSection) smsSection.style.display = 'none';
                if (dropdownLogoutSection) dropdownLogoutSection.style.display = 'block';
                if (dropdownLoginSection) dropdownLoginSection.style.display = 'none';
                // Кэш авторизации
                try { window.__authState = { isAuthenticated: true, profile: data.profile || { phone } }; } catch (e) {}
                showAccountView();
            } catch (e) {
                smsLoginMessage.textContent = 'Сервер недоступен';
            }
        }

        if (smsSendCodeBtn) smsSendCodeBtn.addEventListener('click', requestSmsCode);
        if (smsResendCodeBtn) smsResendCodeBtn.addEventListener('click', requestSmsCode);
        if (smsConfirmCodeBtn) smsConfirmCodeBtn.addEventListener('click', confirmSmsCode);

        // Кнопки обновления капчи
        const loginCaptchaRefresh = document.getElementById('loginCaptchaRefresh');
        const registerCaptchaRefresh = document.getElementById('registerCaptchaRefresh');
        if (loginCaptchaRefresh) loginCaptchaRefresh.addEventListener('click', () => fetchCaptcha('login'));
        if (registerCaptchaRefresh) registerCaptchaRefresh.addEventListener('click', () => fetchCaptcha('register'));

        if (loginForm && dropdownLogoutBtn && dropdownLoginSection && dropdownLogoutSection) {
            // Подгружаем капчу при открытии меню (первый показ)
            fetchCaptcha('login').then(() => {
                // Автозаполнение сохраненных данных после загрузки капчи
                try {
                    const rememberedUsername = localStorage.getItem('rememberedUsername');
                    const rememberedPassword = localStorage.getItem('rememberedPassword');

                    if (rememberedUsername) {
                        document.getElementById('loginUsername').value = rememberedUsername;
                        console.log('login: Автозаполнение логина:', rememberedUsername);
                    }
                    if (rememberedPassword) {
                        document.getElementById('loginPassword').value = rememberedPassword;
                        console.log('login: Автозаполнение пароля');
                    }

                    // Отмечаем чекбокс "Запомнить", если есть сохраненные данные
                    if (rememberedUsername && rememberedPassword) {
                        document.getElementById('loginRemember').checked = true;
                    }
                } catch (e) {
                    console.warn('login: Ошибка автозаполнения:', e);
                }
            });
            loginForm.addEventListener('submit', async (e) => {
                e.preventDefault();
                const username = (document.getElementById('loginUsername').value || '').trim();
                const password = (document.getElementById('loginPassword').value || '').trim();
                const remember = document.getElementById('loginRemember').checked;
                const captchaAnswer = (document.getElementById('loginCaptchaAnswer').value || '').trim();
                loginMessage.textContent = '';
                if (!username || !password) {
                    loginMessage.textContent = 'Введите логин и пароль';
                    return;
                }
                try {
                    const resp = await fetch('/api/login', {
                        method: 'POST',
                        headers: { 'Content-Type': 'application/json' },
                        credentials: 'include',
                        body: JSON.stringify({ displayName: username, username, password, remember, captchaId: loginCaptchaId, captchaAnswer })
                    });
                    const data = await resp.json();
                    if (!data.success) {
                        loginMessage.textContent = data.error || 'Ошибка входа';
                        // Обновим капчу при ошибке
                        fetchCaptcha('login');
                        return;
                    }
                    // Сохраняем данные для автозаполнения, если пользователь отметил "Запомнить"
                    if (remember) {
                        try {
                            localStorage.setItem('rememberedUsername', username);
                            localStorage.setItem('rememberedPassword', password);
                            console.log('login: Данные сохранены для автозаполнения');
                        } catch (e) {
                            console.warn('login: Не удалось сохранить данные для автозаполнения:', e);
                        }
                    } else {
                        // Очищаем сохраненные данные, если пользователь не отметил "Запомнить"
                        try {
                            localStorage.removeItem('rememberedUsername');
                            localStorage.removeItem('rememberedPassword');
                            console.log('login: Сохраненные данные очищены');
                        } catch (e) {
                            console.warn('login: Не удалось очистить сохраненные данные:', e);
                        }
                    }

                    // Переключаем на логаут
                    dropdownLoginSection.style.display = 'none';
                    dropdownLogoutSection.style.display = 'block';
                    // Кэш авторизации
                    try {
                        window.__authState = { isAuthenticated: true, profile: data.profile || { username } };
                        // Сохраняем логин пользователя для использования в заказах
                        localStorage.setItem('lastLoginUsername', username);
                        console.log('login: Сохранен lastLoginUsername:', username);
                    } catch (e) {}

                    // Загружаем актуальные бонусы пользователя
                    try {
                        const ordersResp = await fetch('/api/user_orders', { credentials: 'include' });
                        const orders = await ordersResp.json().catch(() => ({ success:false, orders:[], summary:{ totalOrders:0, bonuses:0, totalAmount:0 } }));
                        const bonuses = orders.summary?.bonuses ?? 0;

                        // Обновляем профиль пользователя с актуальными бонусами
                        if (window.__authState && window.__authState.profile) {
                            window.__authState.profile.bonuses = bonuses;
                        }

                        // Обновляем отображение бонусов
                        updateBonusDisplay(bonuses);

                        // Инициализируем баланс бонусов после загрузки
                        initializeUserBonus();

                        console.log('login: Загружены актуальные бонусы:', bonuses);
                    } catch (bonusError) {
                        console.warn('login: Не удалось загрузить бонусы:', bonusError);
                    }
                    // Открываем кабинет
                    showAccountView();
                } catch (err) {
                    loginMessage.textContent = 'Сервер недоступен';
                    console.error(err);
                }
            });

            dropdownLogoutBtn.addEventListener('click', async () => {
                try {
                    await fetch('/api/logout', { method: 'POST', credentials: 'include' });
                } catch (e) {}
                // UI
                dropdownLogoutSection.style.display = 'none';
                dropdownLoginSection.style.display = 'block';
                // Восстанавливаем заголовок приложения
                const appTitleEl = document.querySelector('.app-title');
                if (appTitleEl) {
                    appTitleEl.textContent = 'GuitarStrings.com.ua';
                    appTitleEl.removeAttribute('data-original-title');
                }
                // Сбрасываем кэш авторизации
                try { window.__authState = { isAuthenticated: false, profile: null }; } catch (e) {}
                // Сбрасываем поиск/фильтры как при нажатии «Товары»
                try {
                    isSearchActive = false;
                    searchTerm = '';
                    isCategoryFilterActive = false;
                    currentCategory = '';
                    localStorage.removeItem('currentCategory');
                    const searchInput = document.querySelector('.search-input');
                    if (searchInput) searchInput.value = '';
                } catch (e) {}
                try { clearCategoryFilter(); } catch (e) {}
                // Переключаемся в товары и подсвечиваем нижнюю навигацию
                showProductsView();
                try { setActiveBottomNav('products'); } catch (e) {}
            });
        }
        // Регистрация
        if (registerForm) {
            registerForm.addEventListener('submit', async (e) => {
                e.preventDefault();
                const email = (document.getElementById('registerEmail').value || '').trim();
                const username = (document.getElementById('registerUsername').value || '').trim();
                const password = (document.getElementById('registerPassword').value || '').trim();
                const password2 = (document.getElementById('registerPassword2').value || '').trim();
                const captchaAnswer = (document.getElementById('registerCaptchaAnswer').value || '').trim();
                registerMessage.textContent = '';
                if (!email || !username || !password || !password2) {
                    registerMessage.textContent = 'Заполните все поля';
                    return;
                }
                if (password !== password2) {
                    registerMessage.textContent = 'Пароли не совпадают';
                    return;
                }
                try {
                    const resp = await fetch('/api/register', {
                        method: 'POST',
                        headers: { 'Content-Type': 'application/json' },
                        credentials: 'include',
                        body: JSON.stringify({ email, username, password, captchaId: registerCaptchaId, captchaAnswer })
                    });
                    const data = await resp.json();
                    if (!data.success) {
                        registerMessage.textContent = data.error || 'Ошибка регистрации';
                        fetchCaptcha('register');
                        return;
                    }
                    // Успех: переключаемся на кабинет и закрываем регистрацию
                    document.getElementById('dropdownRegisterSection').style.display = 'none';
                    dropdownLoginSection.style.display = 'none';
                    dropdownLogoutSection.style.display = 'block';

                    // Кэш авторизации
                    try { window.__authState = { isAuthenticated: true, profile: data.profile || { username, email } }; } catch (e) {}

                    // Начисляем 10 бонусов новому пользователю
                    try {
                        await addUserBonus(10);
                        console.log('register: Начислено 10 бонусов новому пользователю');
                    } catch (bonusError) {
                        console.warn('register: Не удалось начислить бонусы:', bonusError);
                    }

                    showAccountView();
                } catch (err) {
                    registerMessage.textContent = 'Сервер недоступен';
                    console.error(err);
                }
            });
        }
    } catch (e) {}
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
        
        // Закрытие меню аватара (только если не открыта форма входа/регистрации)
        const avatarMenu = document.querySelector('.avatar-dropdown');
        const profilePic = document.querySelector('.profile-pic');
        
        if (avatarMenu && (avatarMenu.classList.contains('show') || avatarMenu.style.display === 'block')) {
            // Проверяем, открыта ли форма входа или регистрации
            const loginSection = document.getElementById('dropdownLoginSection');
            const registerSection = document.getElementById('dropdownRegisterSection');
            const smsSection = document.getElementById('dropdownSmsLoginSection');

            const hasOpenForm = (loginSection && loginSection.style.display === 'block') ||
                               (registerSection && registerSection.style.display === 'block') ||
                               (smsSection && smsSection.style.display === 'block');

            // Закрываем меню только если нет открытых форм входа
            if (!hasOpenForm && !profilePic.contains(event.target) && !avatarMenu.contains(event.target)) {
                closeAvatarMenu();
                console.log('toggleAvatarMenu: Меню аватара закрыто (клик вне, формы не открыты)');
            } else if (hasOpenForm) {
                console.log('toggleAvatarMenu: Меню аватара не закрыто (открыта форма входа)');
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

    // Обработчик клавиши ESC для закрытия корзины
    document.addEventListener('keydown', function(event) {
        if (event.key === 'Escape' || event.keyCode === 27) {
            console.log('ESC pressed, checking for open popups...');
            const cartPopup = document.getElementById('cartPopup');
            const contactsPopup = document.getElementById('contactsPopup');
            const offerPopup = document.getElementById('offerPopup');
            const menuPopup = document.getElementById('menuPopup');
            const settingsPopup = document.getElementById('settingsPopup');
            const orderDetailsPopup = document.getElementById('orderDetailsPopup');
            const orderAcceptedPopup = document.getElementById('orderAcceptedPopup');

            // Закрываем детали заказа если они открыты
            if (orderDetailsPopup && orderDetailsPopup.style.display === 'flex') {
                closePopup('orderDetailsPopup');
                console.log('closeOrderDetailsPopup: Детали заказа закрыты (ESC)');
                return;
            }

            // Закрываем подтверждение заказа если оно открыто
            if (orderAcceptedPopup && orderAcceptedPopup.style.display === 'flex') {
                closePopup('orderAcceptedPopup');
                console.log('closeOrderAcceptedPopup: Подтверждение заказа закрыто (ESC)');
                return;
            }

            // Закрываем корзину если она открыта
            if (cartPopup && (cartPopup.style.display === 'flex' || cartPopup.style.display === 'block')) {
                closeCartPopup();
                console.log('closeCartPopup: Корзина закрыта (ESC)');
                return;
            }

            // Закрываем контакты если они открыты
            if (contactsPopup && contactsPopup.style.display === 'flex') {
                closeContactsPopup();
                console.log('closeContactsPopup: Контакты закрыты (ESC)');
                return;
            }

            // Закрываем оферту если она открыта
            if (offerPopup && offerPopup.style.display === 'flex') {
                closeOfferPopup();
                console.log('closeOfferPopup: Оферта закрыта (ESC)');
                return;
            }

            // Закрываем меню если оно открыто
            if (menuPopup && menuPopup.style.display === 'flex') {
                closeMenuPopup();
                console.log('closeMenuPopup: Меню закрыто (ESC)');
                return;
            }

            // Закрываем настройки если они открыты
            if (settingsPopup && settingsPopup.style.display === 'flex') {
                closeSettingsPopup();
                console.log('closeSettingsPopup: Настройки закрыты (ESC)');
                return;
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
            
            // Переключаем состояние кнопки весов
            btn.classList.toggle('active');
            const icon = btn.querySelector('i');
            if (btn.classList.contains('active')) {
                // Активное состояние - желтые весы
                icon.className = 'fas fa-balance-scale';
                icon.style.color = '#FFD700';
            } else {
                // Неактивное состояние - серые весы
                icon.className = 'fas fa-balance-scale';
                icon.style.color = '#666';
            }
            
            // Обрабатываем логику сравнения
            if (window.currentProducts && window.currentProducts[index]) {
                const product = window.currentProducts[index];
                if (btn.classList.contains('active')) {
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

               // Показываем/скрываем красные звездочки для укрпочты
               const ukrposhtaRedStars = document.querySelectorAll('.ukrposhta-red-star');
               console.log('deliveryMethodSelect change: Найдено красных звездочек:', ukrposhtaRedStars.length, 'текущий выбор:', this.value);

               if (this.value === 'ukrposhta') {
                   console.log('deliveryMethodSelect change: Выбран укрпочта, показываем красные звездочки');
                   ukrposhtaRedStars.forEach((star, index) => {
                       star.style.display = 'inline';
                       console.log('deliveryMethodSelect change: Показана звездочка', index);
                   });
               } else {
                   console.log('deliveryMethodSelect change: Другой способ доставки, скрываем красные звездочки');
                   ukrposhtaRedStars.forEach((star, index) => {
                       star.style.display = 'none';
                       console.log('deliveryMethodSelect change: Скрыта звездочка', index);
                   });
               }

               // Логика взаимосвязи оплаты и доставки
               const paymentMethodSelect = document.getElementById('paymentMethodSelect');

               // Если выбран самовывоз, автоматически устанавливаем оплату "при встрече"
               if (this.value === 'pickup' && paymentMethodSelect && paymentMethodSelect.value !== 'meeting') {
                   paymentMethodSelect.value = 'meeting';
                   console.log('setupEventHandlers: Автоматически установлена оплата при встрече для самовывоза');
               }

               // Если выбран способ доставки кроме самовывоза и оплата "при встрече",
               // автоматически меняем на WayForPay
               if (paymentMethodSelect && paymentMethodSelect.value === 'meeting' && this.value !== 'pickup') {
                   paymentMethodSelect.value = 'wayforpay';
                   console.log('setupEventHandlers: Автоматически изменен способ оплаты на WayForPay');

                   // После изменения оплаты, обновляем способы доставки
                   setTimeout(() => {
                       updateDeliveryMethods();
                   }, 10);
               }

               updateDeliveryCost();
               updateDeliveryMethods(); // Обновляем доступные способы доставки
               updateCartCalculations(); // Дополнительно обновляем расчеты корзины
               updatePickupUi(this.value); // Обновляем UI для самовывоза

               // Управляем видимостью поля индекса
               updateIndexFieldVisibility(this.value);

               forcePayButtonStyles(); // Принудительно обновляем стили кнопки оплаты
           });
       }
      
             // Обработчик изменения способа оплаты
       const paymentMethodSelect = document.getElementById('paymentMethodSelect');
       if (paymentMethodSelect) {
           paymentMethodSelect.addEventListener('change', function() {
               console.log('setupEventHandlers: Изменен способ оплаты на:', this.value);

               // Если выбрана оплата "при встрече в Одессе", автоматически устанавливаем самовывоз
               if (this.value === 'meeting') {
                   const deliverySelect = document.getElementById('deliveryMethodSelect');
                   if (deliverySelect && deliverySelect.value !== 'pickup') {
                       deliverySelect.value = 'pickup';
                       console.log('setupEventHandlers: Автоматически установлен способ доставки Самовывоз для оплаты при встрече');
                   }
               }

               updateDeliveryMethods();
               updateCartCalculations(); // Обновляем расчеты при изменении способа оплаты
               updatePaymentButtonText(); // Обновляем текст кнопки оплаты

               // Обновляем поля формы при изменении способа оплаты
               const deliverySelect = document.getElementById('deliveryMethodSelect');
               if (deliverySelect) {
                   updatePickupUi(deliverySelect.value);
               }
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
                         // Используем единую функцию для обработки клика по кабинету
                         handleCabinetClick();
                                 return false;
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
window.showSettingsPopup = showSettingsPopup;
window.restoreAppTitle = restoreAppTitle;
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
    
    // Показываем индикатор загрузки (компактный, не перекрывает контент)
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
        } else if (category === '12-string') {
            console.log(`filterProductsByCategory: 12-string - характеристика, используем фильтрацию`);
            search12StringProducts();
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

    // Восстанавливаем заголовок приложения
    restoreAppTitle();
    
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
        const response = await fetch('/api/products?start=0&limit=1000');
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
        const response = await fetch('/api/products?start=0&limit=1000');
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
        const response = await fetch('/api/products?start=0&limit=1000');
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
        const response = await fetch('/api/products?start=0&limit=1000');
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
        const response = await fetch('/api/products?start=0&limit=1000');
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
        const response = await fetch('/api/products?start=0&limit=1000');
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
        const response = await fetch('/api/products?start=0&limit=1000');
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
        const response = await fetch('/api/products?start=0&limit=1000');
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
        // Загружаем все товары для поиска по пометкам
        const response = await fetch('/api/products?start=0&limit=1000');
        if (!response.ok) {
            throw new Error(`HTTP error! status: ${response.status}`);
        }

        const data = await response.json();
        console.log(`searchNickelPlatedElectricProducts: Загружено ${data.products.length} товаров для поиска по пометкам`);

        if (data && data.products && data.products.length > 0) {
            // Отображаем все товары в DOM
        displayProducts(data.products);

            // Ищем по пометкам в карточках
            const nickelPlatedCards = document.querySelectorAll('.product-nickelplated');
            console.log(`searchNickelPlatedElectricProducts: Найдено ${nickelPlatedCards.length} карточек с пометкой Nickel Plated`);

            if (nickelPlatedCards.length > 0) {
                // Фильтруем только карточки с пометкой Nickel Plated
                const nickelPlatedProductCards = [];
                nickelPlatedCards.forEach(card => {
                    const productCard = card.closest('.product-card');
                    if (productCard) {
                        nickelPlatedProductCards.push(productCard);
                    }
                });

                if (nickelPlatedProductCards.length > 0) {
                    // Скрываем все карточки
            const allProductCards = document.querySelectorAll('.product-card');
            allProductCards.forEach(card => { card.style.display = 'none'; });

                    // Показываем только Nickel Plated
                    nickelPlatedProductCards.forEach(card => { card.style.display = 'flex'; });

            isCategoryFilterActive = true;
                    console.log(`searchNickelPlatedElectricProducts: Отображены только товары Nickel Plated (${nickelPlatedProductCards.length} шт.)`);
        } else {
                    showNoSearchResults('Nickel Plated Electric Strings');
                }
            } else {
                console.log('searchNickelPlatedElectricProducts: Карточки с пометкой Nickel Plated не найдены');
                showNoSearchResults('Nickel Plated Electric Strings');
            }
        } else {
            console.log('searchNickelPlatedElectricProducts: Нет товаров для поиска');
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
        const response = await fetch('/api/products?start=0&limit=1000');
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
        const fetchedHtml = await Promise.all(pages.map(u => fetch(`/proxy_fetch?url=${enc(u)}`, { cache: 'no-store' }).then(r => r.ok ? r.text() : '')));
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
            // Фильтруем только карточки с пометкой Stainless Steel
            const stainlessSteelProductCards = [];
            badges.forEach(badge => {
                const productCard = badge.closest('.product-card');
                if (productCard) {
                    stainlessSteelProductCards.push(productCard);
                }
            });

            if (stainlessSteelProductCards.length > 0) {
                // Скрываем все карточки
            const allProductCards = document.querySelectorAll('.product-card');
            allProductCards.forEach(card => { card.style.display = 'none'; });

                // Показываем только Stainless Steel
                stainlessSteelProductCards.forEach(card => { card.style.display = 'flex'; });

            isCategoryFilterActive = true;
                console.log(`searchStainlessSteelProducts: Отображены только товары Stainless Steel (${stainlessSteelProductCards.length} шт.)`);
        } else {
                showNoSearchResults('Stainless Steel Electric Strings');
            }
        } else {
            console.log('searchStainlessSteelProducts: Карточки с пометкой Stainless Steel не найдены');
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
        const response = await fetch('/api/products?start=0&limit=1000');
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
        const fetchedHtml = await Promise.all(pages.map(u => fetch(`/proxy_fetch?url=${enc(u)}`, { cache: 'no-store' }).then(r => r.ok ? r.text() : '')));
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
        const response = await fetch('/api/products?start=0&limit=1000');
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
        const fetchedHtml = await Promise.all(pages.map(u => fetch(`/proxy_fetch?url=${enc(u)}`, { cache: 'no-store' }).then(r => r.ok ? r.text() : '')));
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
        const response = await fetch('/api/products?start=0&limit=1000');
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
        const fetchedHtml = await Promise.all(pages.map(u => fetch(`/proxy_fetch?url=${enc(u)}`, { cache: 'no-store' }).then(r => r.ok ? r.text() : '')));
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
                if (productCard) productCard.style.display = 'flex'; // сохраняем исходный макет карточки
            });
            isCategoryFilterActive = true;
            console.log('searchPureNickelElectricProducts: Отображены только товары Pure Nickel по бейджам');
            try { hideLoadingIndicator(); } catch (e) {}
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
        const response = await fetch('/api/products?start=0&limit=1000');
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
                    if (productCard) productCard.style.display = 'flex'; // сохраняем исходный макет карточки
                });
                isCategoryFilterActive = true;
                console.log('search9StringProducts: Отображены только 9-струнные товары по пометкам');
                // Убираем любые индикаторы загрузки
                try { hideLoadingIndicator(); } catch (e) {}
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

async function search12StringProducts() {
    console.log('search12StringProducts: Поиск 12-струнных товаров по пометкам в карточках');
    try {
        const response = await fetch('/api/products?start=0&limit=1000');
        if (!response.ok) {
            throw new Error(`HTTP error! status: ${response.status}`);
        }
        const data = await response.json();
        console.log(`search12StringProducts: Загружено ${data.products.length} товаров для поиска по пометкам`);
        if (data && data.products && data.products.length > 0) {
            displayProducts(data.products);
            const twelveStringCards = document.querySelectorAll('.product-twelve-string');
            console.log(`search12StringProducts: Найдено ${twelveStringCards.length} карточек с пометкой 12-струнных`);
            if (twelveStringCards.length > 0) {
                const allProductCards = document.querySelectorAll('.product-card');
                allProductCards.forEach(card => { card.style.display = 'none'; });
                twelveStringCards.forEach(ts => {
                    const productCard = ts.closest('.product-card');
                    if (productCard) productCard.style.display = 'flex'; // сохраняем исходный макет карточки
                });
                isCategoryFilterActive = true;
                console.log('search12StringProducts: Отображены только 12-струнные товары по пометкам');
                // Убираем любые индикаторы загрузки
                try { hideLoadingIndicator(); } catch (e) {}
            } else {
                console.log('search12StringProducts: Карточки с пометкой 12-струнных не найдены');
                showNoSearchResults('12-струнные');
            }
        } else {
            console.log('search12StringProducts: Нет товаров для поиска');
            showNoSearchResults('12-струнные');
        }
    } catch (error) {
        console.error('search12StringProducts: Ошибка поиска 12-струнных товаров:', error);
        showNoSearchResults('12-струнные');
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
    try {
        const overlay = document.getElementById('loading-overlay');
        if (overlay && overlay.parentNode) overlay.parentNode.removeChild(overlay);
    } catch (e) {}
    try {
        const indicator = document.getElementById('loading-indicator');
        if (indicator && indicator.parentNode) indicator.parentNode.removeChild(indicator);
    } catch (e) {}
    try {
        const spinnerBlocks = document.querySelectorAll('.loading-spinner, .loading-spinner-small');
        spinnerBlocks.forEach(el => { if (el && el.parentNode) el.parentNode.removeChild(el); });
    } catch (e) {}
}

// Вспомогательные функции для переключения между товарами и кабинетом
function showProductsView() {
    // Восстанавливаем заголовок приложения
    restoreAppTitle();

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
    // Запоминаем текущий вид и подсветка нижней навигации
    try { localStorage.setItem('currentView', 'products'); } catch (e) {}
    try { setActiveBottomNav('products'); } catch (e) {}

    // Показываем баннер/фильтры на странице товаров
    try {
        const banner = document.querySelector('.main-banner');
        if (banner) banner.style.removeProperty('display');
        const brands = document.querySelector('.brand-logos');
        if (brands) brands.style.removeProperty('display');
        // Показываем строку поиска
        const search = document.querySelector('.search-section');
        if (search) search.style.removeProperty('display');
        // Возвращаем отображение строки бонусов в верхнем хедере
        const headerBonus = document.querySelector('.bonus-info');
        if (headerBonus) headerBonus.style.removeProperty('display');
        // Возвращаем исходный заголовок приложения
        const appTitleEl = document.querySelector('.app-title');
        if (appTitleEl) {
            const original = appTitleEl.getAttribute('data-original-title');
            if (original) {
                appTitleEl.textContent = original;
                appTitleEl.removeAttribute('data-original-title');
            }
        }
    } catch (e) {}
}

async function showAccountView() {
    try { console.log('showAccountView: Открываем кабинет'); } catch (e) {}

    // Восстанавливаем правильные заказы для just_a_legend если необходимо
    try {
        const currentUser = window.__authState && window.__authState.profile ?
            (window.__authState.profile.username || window.__authState.profile.displayName || 'guest') : 'guest';
        if (currentUser === 'just_a_legend') {
            restoreCorrectOrders(currentUser);
        }
    } catch (e) { console.error('showAccountView: Ошибка восстановления заказов:', e); }

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
    // Запоминаем текущий вид и подсветка нижней навигации
    try { localStorage.setItem('currentView', 'account'); } catch (e) {}
    try { setActiveBottomNav('account'); } catch (e) {}

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
        // Раньше скрывали строку бонусов в хедере в кабинете, чтобы избежать дублей.
        // Теперь оставляем её видимой везде (в т.ч. в Telegram WebApp), по запросу пользователя.
    } catch (e) {}

    // Применяем язык к только что добавленным узлам и настраиваем выпадающий список
    const lang = getCurrentLanguage();
    if (typeof switchLanguage === 'function') switchLanguage(lang);
    setupAccountLanguageDropdown();

    try { window.scrollTo({ top: 0, behavior: 'smooth' }); } catch (e) {}
    console.log('showAccountView: вызываем renderAccountPage');
    await renderAccountPage();
    // Заголовок всегда остается GuitarStrings.com.ua
    console.log('showAccountView: renderAccountPage завершён');

    // Исправляем суммы в существующих заказах при открытии кабинета
    if (window.__authState && window.__authState.profile) {
        const currentUser = window.__authState.profile.username || window.__authState.profile.displayName;
        if (currentUser && currentUser !== 'guest') {
            setTimeout(() => {
                fixExistingOrderAmounts(currentUser);
            }, 1000);
        }
    }

    // Рендерим заказы из localStorage
    renderAccountOrders();
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
        const profileResp = await fetch('/api/user_profile' + (params.toString() ? ('?' + params.toString()) : ''), { credentials: 'include' });
        const profile = await profileResp.json().catch(() => ({ success:false }));
        const ordersResp = await fetch('/api/user_orders', { credentials: 'include' });
        const orders = await ordersResp.json().catch(() => ({ success:false, orders:[], summary:{ totalOrders:0, bonuses:0, totalAmount:0 } }));

        // Синхронизируем заказы с сервера в localStorage для текущего пользователя
        console.log('renderAccountPage: Синхронизация заказов - orders.success:', orders.success, 'orders.length:', orders.orders ? orders.orders.length : 0);
        console.log('renderAccountPage: window.__authState:', !!window.__authState, 'profile:', window.__authState?.profile);

        if (window.__authState && window.__authState.profile) {
            const currentUser = window.__authState.profile.username || window.__authState.profile.displayName || 'guest';
            console.log('renderAccountPage: Синхронизация для пользователя:', currentUser);

            if (currentUser !== 'guest') {
                const userOrdersKey = `userOrders_${currentUser}`;
                try {
                    // Получаем существующие заказы из localStorage
                    const existingOrders = JSON.parse(localStorage.getItem(userOrdersKey) || '[]');
                    console.log('renderAccountPage: Существующие заказы в localStorage:', existingOrders.length);

                    // Фильтруем заказы с сервера - только те, у которых есть ID
                    const validServerOrders = orders.success && orders.orders ?
                        orders.orders.filter(o => o.id && o.id !== 'undefined' && o.id !== undefined) : [];

                    // Фильтруем существующие заказы - только те, у которых есть ID
                    const validExistingOrders = existingOrders.filter(o => o.id && o.id !== 'undefined' && o.id !== undefined);

                    console.log('renderAccountPage: Валидных заказов на сервере:', validServerOrders.length);
                    console.log('renderAccountPage: Валидных заказов в localStorage:', validExistingOrders.length);

                    // Сначала синхронизируем заказы с сервера в localStorage
                    if (validServerOrders.length > 0) {
                        // Объединяем заказы с сервера с существующими, избегая дубликатов по ID
                        const existingIds = new Set(validExistingOrders.map(o => o.id));
                        const newOrders = validServerOrders.filter(o => !existingIds.has(o.id));

                        console.log('renderAccountPage: Новые заказы с сервера:', newOrders.length);

                        if (newOrders.length > 0) {
                            const combinedOrders = [...validExistingOrders, ...newOrders];
                            localStorage.setItem(userOrdersKey, JSON.stringify(combinedOrders));
                            console.log('renderAccountPage: Синхронизировано', newOrders.length, 'заказов из сервера. Всего валидных заказов:', combinedOrders.length);
                        } else {
                            console.log('renderAccountPage: Нет новых заказов для синхронизации');
                        }
                    }

                    // Теперь синхронизируем локальные заказы на сервер (если их больше)
                    if (validExistingOrders.length > validServerOrders.length) {
                        console.log('renderAccountPage: Локальных валидных заказов больше, чем на сервере. Синхронизируем на сервер...');
                        syncLocalOrdersToServer(currentUser, validExistingOrders);
                    }

                } catch (e) {
                    console.error('renderAccountPage: Ошибка синхронизации заказов с сервером', e);
                }
            }
        } else {
            console.log('renderAccountPage: Синхронизация пропущена - пользователь не авторизован');
        }
        console.log('renderAccountPage: data loaded', { hasProfile: !!profile, ordersCount: (orders.orders||[]).length });
        // Обновляем шапку аккаунта
        const nameEl = document.getElementById('accountUserName');
        const bonusTopEl = document.getElementById('accountBonuses');
        const avatarEl = document.getElementById('accountAvatar');
        if (nameEl) nameEl.textContent = profile.displayName || 'Guest';
        // Обновим кэш авторизации
        try {
            const authed = isAuthenticatedData(profile);
            window.__authState = { isAuthenticated: authed, profile: authed ? (profile.profile || profile) : null };
        } catch (e) {}
        // Не заполняем bonusTopEl, чтобы не дублировать
        if (avatarEl) {
            if (profile.photoUrl) {
                avatarEl.src = profile.photoUrl;
                avatarEl.style.display = 'block';
            } else {
                avatarEl.style.display = 'none';
            }
        }
        // Дублируем аватар в правый верхний угол хедера, если доступен
        try {
            const headerImg = document.getElementById('profile-image');
            const headerSvg = document.getElementById('profile-svg');
            const headerIcon = document.getElementById('profile-icon');
            if (headerImg && profile.photoUrl) {
                headerImg.src = profile.photoUrl;
                headerImg.style.display = 'block';
                if (headerSvg) headerSvg.style.display = 'none';
                if (headerIcon) headerIcon.style.display = 'none';
            }
        } catch (e) {}
        // Сводка
        const totalOrdersEl = document.getElementById('accTotalOrders');
        const accBonusesEl = document.getElementById('accBonuses');
        const totalAmountEl = document.getElementById('accTotalAmount');

        // Получаем актуальное количество бонусов из профиля или localStorage
        const currentUserBonuses = getUserBonusBalance();
        const serverBonuses = orders.summary?.bonuses ?? 0;

        // Используем актуальные бонусы (из профиля/localStorage), но синхронизируем с сервером
        let bonuses = Math.max(currentUserBonuses, serverBonuses);

        // Дополнительная проверка для пользователя just_a_legend
        if (profile.displayName === 'just_a_legend' || profile.username === 'just_a_legend') {
            console.log('renderAccountPage: Специальная обработка для just_a_legend');
            console.log('renderAccountPage: currentUserBonuses:', currentUserBonuses, 'serverBonuses:', serverBonuses);

            // Для just_a_legend используем заказы из localStorage
            const currentUser = window.__authState && window.__authState.profile ?
                (window.__authState.profile.username || window.__authState.profile.displayName || 'guest') : 'guest';
            const userOrdersKey = `userOrders_${currentUser}`;

            // Получаем заказы из пользовательского ключа и фильтруем только валидные
            let allLocalOrders = JSON.parse(localStorage.getItem(userOrdersKey) || '[]');
            let localOrders = allLocalOrders.filter(order => order.id && order.id !== 'undefined' && order.id !== undefined);

            // Используем только заказы из пользовательского ключа

            console.log('renderAccountPage: Используем валидные заказы из localStorage для just_a_legend');

            console.log('renderAccountPage: currentUser для just_a_legend:', currentUser);
            console.log('renderAccountPage: userOrdersKey:', userOrdersKey);
            console.log('renderAccountPage: Количество локальных заказов:', localOrders.length);

            // Подсчитаем только заказы с ID для корректного отображения
            const ordersWithId = localOrders.filter(order => order.id && order.id !== 'undefined' && order.id !== undefined);
            console.log('renderAccountPage: Заказов с ID для отображения:', ordersWithId.length);

            // Принудительно пересчитываем бонусы на основе заказов из localStorage
            let calculatedBonuses = 0;
            let completedOrdersCount = 0;
            let totalAmount = 0;
            let usedBonusesTotal = 0;

            (localOrders || []).forEach(order => {
                console.log('renderAccountPage: Заказ:', order.id, 'статус:', order.status, 'сумма:', order.amount, 'использованные бонусы:', order.bonusesUsed || order.bonusDiscount || 0);

                // Всегда вычитаем использованные бонусы из баланса, независимо от статуса заказа
                let usedBonusesInOrder = 0;
                if (order.bonusesUsed && !isNaN(order.bonusesUsed) && order.bonusesUsed > 0) {
                    usedBonusesInOrder = parseInt(order.bonusesUsed) || 0;
                } else if (order.bonusDiscount && !isNaN(order.bonusDiscount) && order.bonusDiscount > 0) {
                    // Если сохранена сумма скидки, конвертируем обратно в бонусы (10 бонусов = 1грн)
                    usedBonusesInOrder = parseInt(order.bonusDiscount * 10) || 0;
                }

                // Начисляем бонусы только за завершенные заказы
                if (order.status === 'completed' || order.status === 'завершен' || order.status === 'выполнен' || order.status === 'принято') {
                    // Для завершенных заказов всегда начисляем бонусы, даже если сумма undefined
                    // Используем итоговую сумму заказа или 0 если сумма не указана
                    const orderAmount = (order.finalTotal && !isNaN(order.finalTotal)) ? parseFloat(order.finalTotal) :
                                       (order.amount && !isNaN(order.amount)) ? parseFloat(order.amount) : 0;
                    const bonusFromOrder = Math.floor(orderAmount / 10); // 1 бонус за каждые 10грн
                    calculatedBonuses += bonusFromOrder;
                    completedOrdersCount++;
                    totalAmount += orderAmount;
                    console.log('renderAccountPage: Заказ', order.id, '- бонусы начислено:', bonusFromOrder, 'сумма заказа:', orderAmount);
                } else if (usedBonusesInOrder > 0) {
                    // Для заказов с использованными бонусами, но без статуса 'принято', также начисляем бонусы
                    // но только если заказ имеет сумму (т.е. был оплачен)
                    const orderAmount = (order.finalTotal && !isNaN(order.finalTotal)) ? parseFloat(order.finalTotal) :
                                       (order.amount && !isNaN(order.amount)) ? parseFloat(order.amount) : 0;
                    if (orderAmount > 0) {
                        const bonusFromOrder = Math.floor(orderAmount / 10); // 1 бонус за каждые 10грн
                        calculatedBonuses += bonusFromOrder;
                        console.log('renderAccountPage: Заказ', order.id, '- бонусы начислено (заказ с бонусами):', bonusFromOrder);
                    }
                }

                usedBonusesTotal += usedBonusesInOrder;
                console.log('renderAccountPage: Заказ', order.id, '- использовано бонусов:', usedBonusesInOrder, 'всего использовано:', usedBonusesTotal);
            });

            // Вычитаем использованные бонусы из общего баланса
            calculatedBonuses -= usedBonusesTotal;

            // Если результат отрицательный, устанавливаем 0 (бонусы не могут быть отрицательными)
            if (calculatedBonuses < 0) {
                console.log('renderAccountPage: Пересчитанные бонусы отрицательные, устанавливаем 0');
                calculatedBonuses = 0;
            }

            // Убеждаемся, что результат не NaN
            if (isNaN(calculatedBonuses)) {
                console.warn('renderAccountPage: calculatedBonuses is NaN, setting to 0');
                calculatedBonuses = 0;
            }
            if (isNaN(usedBonusesTotal)) {
                console.warn('renderAccountPage: usedBonusesTotal is NaN, setting to 0');
                usedBonusesTotal = 0;
            }

            console.log('renderAccountPage: Завершенных заказов:', completedOrdersCount, 'Общая сумма:', totalAmount);
            console.log('renderAccountPage: Пересчитанные бонусы на основе заказов:', calculatedBonuses);

            // Убеждаемся, что все значения не NaN перед Math.max
            const safeBonuses = isNaN(bonuses) ? 0 : bonuses;
            const safeCalculatedBonuses = isNaN(calculatedBonuses) ? 0 : calculatedBonuses;
            const safeServerBonuses = isNaN(serverBonuses) ? 0 : serverBonuses;

            // Используем максимальное значение
            bonuses = Math.max(safeBonuses, safeCalculatedBonuses, safeServerBonuses);
            console.log('renderAccountPage: Финальные бонусы для just_a_legend:', bonuses);

            // Принудительно обновляем бонусы в профиле
            if (window.__authState && window.__authState.profile) {
                window.__authState.profile.bonuses = bonuses;
            }

            // Сохраняем в localStorage
            try {
                localStorage.setItem('userBonuses', bonuses.toString());
                console.log('renderAccountPage: Бонусы сохранены в localStorage:', bonuses);
            } catch (e) {
                console.warn('renderAccountPage: Не удалось сохранить бонусы в localStorage:', e);
            }
        }

        // Используем количество заказов из localStorage вместо API
                if (window.__authState && window.__authState.profile) {
                    const currentUser = window.__authState.profile.username || window.__authState.profile.displayName || 'guest';
                    if (currentUser !== 'guest') {
                        const userOrdersKey = `userOrders_${currentUser}`;
                        try {
                            const localOrders = JSON.parse(localStorage.getItem(userOrdersKey) || '[]');
                            // Подсчитываем только заказы с ID (которые будут отображены)
                            const ordersWithId = localOrders.filter(order => order.id && order.id !== 'undefined' && order.id !== undefined);
                            console.log('renderAccountPage: Текущий пользователь:', currentUser);
                            console.log('renderAccountPage: Всего заказов в localStorage:', localOrders.length);
                            console.log('renderAccountPage: Заказов с ID для отображения:', ordersWithId.length);
                            console.log('renderAccountPage: Устанавливаем количество заказов:', ordersWithId.length);
                            if (totalOrdersEl) {
                                totalOrdersEl.textContent = ordersWithId.length;
                                console.log('renderAccountPage: Установлено количество заказов в DOM:', ordersWithId.length);
                            }
                        } catch (e) {
                            console.error('renderAccountPage: Ошибка чтения заказов из localStorage', e);
        if (totalOrdersEl) totalOrdersEl.textContent = orders.summary?.totalOrders ?? 0;
                        }
                    } else {
                        if (totalOrdersEl) totalOrdersEl.textContent = orders.summary?.totalOrders ?? 0;
                    }
                } else {
                    if (totalOrdersEl) totalOrdersEl.textContent = orders.summary?.totalOrders ?? 0;
                }
        if (accBonusesEl) accBonusesEl.textContent = bonuses;
        if (totalAmountEl) totalAmountEl.textContent = `${(orders.summary?.totalAmount ?? 0)} ${getCurrencyWithDot()}`;

        // Обновляем отображение бонусов и сохраняем в профиле
        updateBonusDisplay(bonuses);

        // Сохраняем бонусы в профиле пользователя
        if (window.__authState && window.__authState.profile) {
            window.__authState.profile.bonuses = bonuses;
        }

        // Синхронизируем бонусы с сервером
        if (bonuses !== serverBonuses) {
            console.log('renderAccountPage: Синхронизация бонусов с сервером:', bonuses, 'vs', serverBonuses);
        }

        // Инициализируем баланс бонусов после загрузки данных
        initializeUserBonus();
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

        // Устанавливаем обработчики для кнопок аккаунта
        setupAccountActionButtons();

    } catch (e) {
        console.error('renderAccountPage error', e);
    }
}

// Функция настройки обработчиков для кнопок аккаунта
function setupAccountActionButtons() {
    try {
        console.log('setupAccountActionButtons: Настраиваем обработчики для кнопок аккаунта');

        // Находим все кнопки с data-action
        const actionButtons = document.querySelectorAll('.account-action-btn[data-action]');
        console.log('setupAccountActionButtons: Найдено кнопок аккаунта:', actionButtons.length);

        actionButtons.forEach(button => {
            const action = button.getAttribute('data-action');
            console.log('setupAccountActionButtons: Настраиваем кнопку с действием:', action);

            // Удаляем предыдущий обработчик, если он был
            if (button._actionHandler) {
                button.removeEventListener('click', button._actionHandler);
            }

            // Создаем новый обработчик
            button._actionHandler = function() {
                console.log('setupAccountActionButtons: Клик по кнопке:', action);

                // Снимаем выделение со всех кнопок
                actionButtons.forEach(btn => btn.classList.remove('active'));

                // Выделяем нажатую кнопку
                this.classList.add('active');

                // Выполняем действие
                switch (action) {
                    case 'orders':
                        console.log('setupAccountActionButtons: Показываем список заказов');
                        // Список заказов уже отображается по умолчанию
                        break;
                    case 'addresses':
                        console.log('setupAccountActionButtons: Показываем мои адреса');
                        // Пока просто логируем, можно добавить логику позже
                        alert('Функция "Мои адреса" пока не реализована');
                        break;
                    case 'accountData':
                        console.log('setupAccountActionButtons: Показываем данные аккаунта');
                        // Пока просто логируем, можно добавить логику позже
                        alert('Функция "Данные аккаунта" пока не реализована');
                        break;
                    default:
                        console.log('setupAccountActionButtons: Неизвестное действие:', action);
                }
            };

            // Добавляем обработчик
            button.addEventListener('click', button._actionHandler);
        });

        // По умолчанию выделяем кнопку "Список заказов"
        const ordersButton = document.querySelector('.account-action-btn[data-action="orders"]');
        if (ordersButton) {
            ordersButton.classList.add('active');
        }

    } catch (e) {
        console.error('setupAccountActionButtons: Ошибка настройки обработчиков', e);
    }
}

// Функция рендеринга заказов из localStorage в кабинет пользователя
function renderAccountOrders() {
    try {
        console.log('renderAccountOrders: Рендеринг заказов из localStorage');

        // Получаем заказы из localStorage для текущего пользователя
        const currentUser = window.__authState && window.__authState.profile ?
            (window.__authState.profile.username || window.__authState.profile.displayName || 'guest') : 'guest';
        const userOrdersKey = `userOrders_${currentUser}`;
        let orders = JSON.parse(localStorage.getItem(userOrdersKey) || '[]');

        // Специальная обработка для just_a_legend - проверяем общий ключ и фильтруем только валидные заказы
        if (currentUser === 'just_a_legend') {
            console.log('renderAccountOrders: Специальная обработка заказов для just_a_legend');

            // Фильтруем только валидные заказы из пользовательского ключа
            orders = orders.filter(order => order.id && order.id !== 'undefined' && order.id !== undefined);

            // Для just_a_legend используем только заказы из localStorage
        }

        console.log('renderAccountOrders: Получаем заказы для пользователя:', currentUser, 'ключ:', userOrdersKey, 'заказов:', orders.length);
        console.log('renderAccountOrders: Проверяем localStorage ключи:', Object.keys(localStorage).filter(key => key.includes('userOrders')));
        console.log('renderAccountOrders: Первые 5 ID заказов:', orders.slice(0, 5).map(o => o.id));

        // Используем только заказы из localStorage
        const ordersWithId = orders.filter(order => order.id && order.id !== 'undefined' && order.id !== undefined);

        // Находим контейнер для заказов
        const body = document.getElementById('ordersTableBody');
        if (!body) {
            console.log('renderAccountOrders: Контейнер ordersTableBody не найден');
            return;
        }

        // Очищаем текущие заказы
        body.innerHTML = '';

        // Сортируем заказы по дате (новые выше)
        orders.sort((a, b) => new Date(b.date) - new Date(a.date));

        // Добавляем заказы из localStorage
        orders.forEach(order => {
            // Пропускаем заказы без ID
            if (!order.id || order.id === 'undefined' || order.id === undefined) {
                console.warn('renderAccountOrders: Пропускаем заказ без ID:', order);
                return;
            }

            const row = document.createElement('div');
            row.className = 'orders-table-row';
            row.style.cursor = 'pointer';
            row.onclick = () => {
                console.log('Order row clicked, order ID:', order.id);
                console.log('Current auth state:', window.__authState);
                const currentUserTest = window.__authState && window.__authState.profile ?
                    (window.__authState.profile.username || window.__authState.profile.displayName || 'guest') : 'guest';
                console.log('Current user for search:', currentUserTest);
                showOrderDetails(order.id);
            };

            // Форматируем дату
            const orderDate = new Date(order.date).toLocaleDateString();

            // Получаем статус заказа
            const statusText = getOrderStatusText(order.status);

            // Используем сохраненные суммы из объекта заказа
            const finalAmount = order.finalTotal || order.total || 0;

            row.innerHTML = `
                <div>${order.id || ''}</div>
                <div>${orderDate}</div>
                <div>${(order.customer && order.customer.settlement) || ''}, ${(order.customer && order.customer.branch) || ''}</div>
                <div class="order-amount" data-amount="${finalAmount}">${finalAmount} ${getCurrencyWithDot()}</div>
                <div class="order-status" data-original-status="${order.status || ''}">${statusText}</div>
            `;

            body.appendChild(row);
        });

        // Обновляем сводку заказов
        updateAccountSummary(orders);

        // Подсчитываем сколько заказов фактически отображено (с ID)
        const renderedOrders = orders.filter(order => order.id && order.id !== 'undefined' && order.id !== undefined);
        console.log('renderAccountOrders: Заказы успешно отрендерены', renderedOrders.length, 'из общего количества:', orders.length);

    } catch (error) {
        console.error('renderAccountOrders: Ошибка рендеринга заказов', error);
    }
}

// Функция обновления сводки заказов
function updateAccountSummary(orders) {
    try {
        // Подсчитываем только заказы с ID (которые фактически отображаются)
        const ordersWithId = orders.filter(order => order.id && order.id !== 'undefined' && order.id !== undefined);
        const totalOrders = ordersWithId.length;

        console.log('updateAccountSummary: Всего заказов получено:', orders.length);
        console.log('updateAccountSummary: Заказов с ID для подсчета:', totalOrders);

        // Рассчитываем итоговую сумму с учетом бонусов и купонов
        const totalAmount = orders.reduce((sum, order) => {
            // Используем сохраненную итоговую сумму из объекта заказа
            const finalAmount = order.finalTotal || order.total || 0;
            return sum + Math.max(0, finalAmount); // Не может быть меньше 0
        }, 0);

        const totalOrdersEl = document.getElementById('accTotalOrders');
        const totalAmountEl = document.getElementById('accTotalAmount');

        if (totalOrdersEl) {
            totalOrdersEl.textContent = totalOrders;
        }

        if (totalAmountEl) {
            totalAmountEl.textContent = `${totalAmount} ${getCurrencyWithDot()}`;
        }

        console.log('updateAccountSummary: Сводка обновлена с учетом бонусов и купонов', { totalOrders, totalAmount });

    } catch (error) {
        console.error('updateAccountSummary: Ошибка обновления сводки', error);
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
                    <div class="account-bonuses" id="accountBonuses" data-translate="bonusInfo">Кол-во бонусов: ...</div>
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
	const dropdown = acc.querySelector('.account-lang-dropdown');
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
			// Переставляем подсветку активного пункта
			options.forEach(o => o.classList.remove('active'));
			this.classList.add('active');
			// Закрываем список сразу после выбора
			if (container) {
				container.classList.remove('open');
				container.classList.add('force-closed');
			}
			// Закрываем портальный dropdown
			if (dropdown) {
				dropdown.style.display = 'none';
				if (dropdown._restoreParent && dropdown._restoreNext) {
					dropdown._restoreParent.insertBefore(dropdown, dropdown._restoreNext);
				}
			}
		};
		opt.addEventListener('click', opt._langHandler);
	});
	if (btn && container && dropdown) {
		if (btn._langBtnInit) return;
		btn._langBtnInit = true;
		function openPortaledDropdown() {
			try {
				const rect = btn.getBoundingClientRect();
				// Сохраняем исходное положение
				dropdown._restoreParent = dropdown.parentNode;
				dropdown._restoreNext = dropdown.nextSibling;
				// Переносим в body поверх всех слоёв
				document.body.appendChild(dropdown);
				dropdown.style.position = 'fixed';
				dropdown.style.zIndex = '2147483647';
				// Под кнопкой, выравнивание по левой границе, ширина как у кнопки
				const width = Math.round(rect.width);
				const viewportPadding = 8;
				let left = Math.round(rect.left);
				left = Math.max(viewportPadding, Math.min(left, window.innerWidth - width - viewportPadding));
				dropdown.style.top = Math.round(rect.bottom) + 'px';
				dropdown.style.left = left + 'px';
				dropdown.style.right = '';
				dropdown.style.width = width + 'px';
				dropdown.style.minWidth = width + 'px';
				dropdown.style.display = 'block';
			} catch (e) {}
		}
		function closePortaledDropdown(restore = true) {
			try {
				dropdown.style.display = 'none';
				if (restore && dropdown._restoreParent) {
					dropdown._restoreParent.insertBefore(dropdown, dropdown._restoreNext);
				}
			} catch (e) {}
		}
		btn.addEventListener('click', function(e) {
			e.stopPropagation();
			const willOpen = dropdown.style.display !== 'block';
			if (willOpen) {
				openPortaledDropdown();
				container.classList.add('open');
				container.classList.remove('force-closed');
			} else {
				closePortaledDropdown();
				container.classList.remove('open');
			}
		});

		// Гарантируем, что текст на кнопке всегда соответствует текущему языку
		btn.addEventListener('mouseenter', () => {
			updateAccountLangButton(getCurrentLanguage());
		});

		// Открытие по наведению (только для устройств с поддержкой hover)
		try {
			const canHover = (window.matchMedia && window.matchMedia('(hover: hover)').matches) && !('ontouchstart' in window);
			let closeHoverTimeout = null;
			if (canHover) {
				btn.addEventListener('mouseenter', () => {
					if (closeHoverTimeout) { clearTimeout(closeHoverTimeout); closeHoverTimeout = null; }
					openPortaledDropdown();
					container.classList.add('open');
					container.classList.remove('force-closed');
				});
				btn.addEventListener('mouseleave', () => {
					closeHoverTimeout = setTimeout(() => {
						closePortaledDropdown();
						container.classList.remove('open');
					}, 120);
				});
				dropdown.addEventListener('mouseenter', () => {
					if (closeHoverTimeout) { clearTimeout(closeHoverTimeout); closeHoverTimeout = null; }
				});
				dropdown.addEventListener('mouseleave', () => {
					closeHoverTimeout = setTimeout(() => {
						closePortaledDropdown();
						container.classList.remove('open');
					}, 120);
				});
			}
		} catch (e) {}
		// Закрытие при клике вне
		document.addEventListener('click', function(ev) {
			if (dropdown.style.display === 'block' && ev.target !== btn && !dropdown.contains(ev.target)) {
				closePortaledDropdown();
				container.classList.remove('open');
				if (btn) btn.classList.add('selected');
			}
		});
		// При ресайзе пере-позиционируем
		window.addEventListener('resize', () => {
			if (dropdown.style.display === 'block') {
				openPortaledDropdown();
			}
		});
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
	else if (s.includes('принят') || s.includes('accepted')) code = 'accepted';
	else if (s.includes('отмен') || s.includes('cancel')) code = 'cancelled';
	// Локализация
	if (lang === 'uk') {
		if (code === 'paid') return 'Сплачено';
		if (code === 'processing') return 'Обробляється';
		if (code === 'accepted') return 'Прийнято';
		if (code === 'cancelled') return 'Скасовано';
		return 'Статус';
	} else if (lang === 'ru') {
		if (code === 'paid') return 'Оплачено';
		if (code === 'processing') return 'В обработке';
		if (code === 'accepted') return 'Принят';
		if (code === 'cancelled') return 'Отменён';
		return 'Статус';
	} else {
		if (code === 'paid') return 'Paid';
		if (code === 'processing') return 'Processing';
		if (code === 'accepted') return 'Accepted';
		if (code === 'cancelled') return 'Cancelled';
		return 'Status';
	}
}

function getVisibleView() {
    try {
        const acc = document.getElementById('account-section');
        if (acc) {
            const accDisp = (acc.style && acc.style.display) || '';
            const accCs = window.getComputedStyle ? getComputedStyle(acc) : null;
            const accVisible = (accDisp && accDisp !== 'none') || (accCs && accCs.display !== 'none');
            if (accVisible) return 'account';
        }
        const pc = document.getElementById('productsContainer');
        if (pc) {
            const pcDisp = (pc.style && pc.style.display) || '';
            const pcCs = window.getComputedStyle ? getComputedStyle(pc) : null;
            const pcVisible = (pcDisp ? pcDisp !== 'none' : true) && (!pcCs || pcCs.display !== 'none' ? true : false);
            if (pcVisible) return 'products';
        }
    } catch (e) {}
    return 'products';
}

// Функция генерации номера заказа
function generateOrderId() {
    try {
        // Сначала проверяем сохраненный lastOrderId
        let lastOrderId = parseInt(localStorage.getItem('lastOrderId') || '999');

        // Ищем максимальный ID среди всех существующих заказов
        let maxOrderId = 999;

        // Проверяем все ключи localStorage на наличие заказов
        for (let i = 0; i < localStorage.length; i++) {
            const key = localStorage.key(i);
            if (key && (key.startsWith('userOrders_') || key === 'userOrders')) {
                try {
                    const orders = JSON.parse(localStorage.getItem(key) || '[]');
                    orders.forEach(order => {
                        if (order.id && order.id.startsWith('GS')) {
                            const orderNum = parseInt(order.id.replace('GS', ''));
                            if (!isNaN(orderNum) && orderNum > maxOrderId) {
                                maxOrderId = orderNum;
                            }
                        }
                    });
                } catch (e) {
                    console.warn('generateOrderId: Ошибка обработки заказов в ключе', key, e);
                }
            }
        }

        // Используем максимальное значение между сохраненным lastOrderId и найденным максимумом
        const nextOrderId = Math.max(lastOrderId, maxOrderId) + 1;

        console.log('generateOrderId: lastOrderId из localStorage:', lastOrderId, 'maxOrderId из заказов:', maxOrderId, 'nextOrderId:', nextOrderId);

    localStorage.setItem('lastOrderId', nextOrderId.toString());
    return `GS${nextOrderId}`;
    } catch (error) {
        console.error('generateOrderId: Ошибка генерации ID заказа', error);
        // Fallback на простой инкремент
        const fallbackId = parseInt(localStorage.getItem('lastOrderId') || '999') + 1;
        localStorage.setItem('lastOrderId', fallbackId.toString());
        return `GS${fallbackId}`;
    }
}

// Функция очистки данных заказа для отправки на сервер
function cleanOrderDataForServer(order) {
    try {
        console.log('cleanOrderDataForServer: Очистка данных заказа:', order.id);
        
        // Создаем глубокую копию заказа
        const cleanOrder = JSON.parse(JSON.stringify(order, (key, value) => {
            if (typeof value === 'string') {
                // Удаляем или экранируем проблемные символы
                return value
                    .replace(/[\u0000-\u001F\u007F-\u009F]/g, '') // Удаляем управляющие символы
                    .replace(/[\\"]/g, '') // Удаляем обратные слеши и кавычки
                    .replace(/[\r\n\t]/g, ' ') // Заменяем переносы строк и табы на пробелы
                    .trim();
            }
            return value;
        }));
        
        // Проверяем обязательные поля
        if (!cleanOrder.id) {
            console.error('cleanOrderDataForServer: Отсутствует ID заказа');
            return null;
        }
        
        console.log('cleanOrderDataForServer: Заказ очищен успешно');
        return cleanOrder;
        
    } catch (error) {
        console.error('cleanOrderDataForServer: Ошибка очистки данных заказа:', error);
        return order; // Возвращаем исходный заказ в случае ошибки
    }
}

// Функция сохранения заказа в localStorage
function saveOrderToLocalStorage(order) {
    try {
        // Проверяем, что заказ имеет правильный ID
        if (!order.id || order.id === 'undefined' || order.id === undefined) {
            console.error('saveOrderToLocalStorage: Заказ без ID не может быть сохранен:', order);
            return;
        }

        // Получаем текущего пользователя
        const currentUser = window.__authState && window.__authState.profile ?
            (window.__authState.profile.username || window.__authState.profile.displayName || 'guest') : 'guest';
        const userOrdersKey = `userOrders_${currentUser}`;

        console.log('saveOrderToLocalStorage: Сохраняем заказ для пользователя:', currentUser, 'ключ:', userOrdersKey);
        console.log('saveOrderToLocalStorage: Заказ:', {id: order.id, amount: order.amount, bonusesUsed: order.bonusesUsed, bonusDiscount: order.bonusDiscount, status: order.status});

        const orders = JSON.parse(localStorage.getItem(userOrdersKey) || '[]');
        console.log('saveOrderToLocalStorage: Было заказов в', userOrdersKey + ':', orders.length);

        orders.push(order);
        localStorage.setItem(userOrdersKey, JSON.stringify(orders));

        console.log('saveOrderToLocalStorage: Стало заказов в', userOrdersKey + ':', orders.length);

        // Сохраняем в общий ключ только для авторизованных пользователей
        if (currentUser !== 'guest') {
            const allOrders = JSON.parse(localStorage.getItem('userOrders') || '[]');
            console.log('saveOrderToLocalStorage: Было заказов в общем ключе userOrders:', allOrders.length);

            allOrders.push(order);
            localStorage.setItem('userOrders', JSON.stringify(allOrders));

            console.log('saveOrderToLocalStorage: Стало заказов в общем ключе userOrders:', allOrders.length);
        }

        console.log('saveOrderToLocalStorage: Заказ сохранен в localStorage', order);
    } catch (error) {
        console.error('saveOrderToLocalStorage: Ошибка сохранения заказа', error);
    }
}


function fixExistingOrderAmounts(username) {
    try {
        console.log('fixExistingOrderAmounts: Исправляем суммы заказов для пользователя:', username);

        const userOrdersKey = `userOrders_${username}`;
        const orders = JSON.parse(localStorage.getItem(userOrdersKey) || '[]');
        let fixedCount = 0;

        orders.forEach(order => {
            // Если сумма undefined или 0, но есть finalTotal, используем finalTotal
            if ((order.amount === undefined || order.amount === 0 || isNaN(order.amount)) &&
                order.finalTotal && !isNaN(order.finalTotal) && order.finalTotal > 0) {
                order.amount = order.finalTotal;
                fixedCount++;
                console.log('fixExistingOrderAmounts: Исправлена сумма заказа', order.id, 'с', order.amount, 'на', order.finalTotal);
            }
            // Если есть itemsTotal и он больше, используем его
            else if ((order.amount === undefined || order.amount === 0 || isNaN(order.amount)) &&
                     order.itemsTotal && !isNaN(order.itemsTotal) && order.itemsTotal > 0) {
                order.amount = order.itemsTotal;
                fixedCount++;
                console.log('fixExistingOrderAmounts: Исправлена сумма заказа', order.id, 'на itemsTotal:', order.itemsTotal);
            }
        });

        if (fixedCount > 0) {
            localStorage.setItem(userOrdersKey, JSON.stringify(orders));
            console.log('fixExistingOrderAmounts: Исправлено', fixedCount, 'заказов для пользователя', username);
        } else {
            console.log('fixExistingOrderAmounts: Не найдено заказов для исправления');
        }
    } catch (error) {
        console.error('fixExistingOrderAmounts: Ошибка исправления заказов:', error);
    }
}

// Функция восстановления правильных заказов для just_a_legend
function restoreCorrectOrders(username) {
    try {
        console.log('restoreCorrectOrders: Восстанавливаем правильные заказы для пользователя:', username);

        const userOrdersKey = `userOrders_${username}`;

        // Проверяем текущие заказы
        const currentOrders = JSON.parse(localStorage.getItem(userOrdersKey) || '[]');
        const validOrders = currentOrders.filter(order => order.id && order.id !== 'undefined' && order.id !== undefined);

        console.log('restoreCorrectOrders: Текущих заказов:', currentOrders.length, 'валидных:', validOrders.length);

        // Если валидных заказов меньше 50, восстанавливаем правильные
        if (validOrders.length < 50) {
            console.log('restoreCorrectOrders: Восстанавливаем правильные заказы...');

            // Используем данные из correct_orders.js
            const correctOrders = window.correctOrdersData || [];

            // Сохраняем правильные заказы
            localStorage.setItem(userOrdersKey, JSON.stringify(correctOrders));
            console.log('restoreCorrectOrders: Восстановлено', correctOrders.length, 'правильных заказов для', username);
        } else {
            console.log('restoreCorrectOrders: У пользователя уже достаточно валидных заказов:', validOrders.length);
        }
    } catch (error) {
        console.error('restoreCorrectOrders: Ошибка восстановления заказов:', error);
    }
}

function syncLocalOrdersToServer(username, localOrders) {
    try {
        console.log('syncLocalOrdersToServer: Синхронизируем локальные заказы на сервер для пользователя:', username);

        // Получаем заказы с сервера для сравнения
        fetch('/api/user_orders', { credentials: 'include' })
            .then(response => response.json())
            .then(serverOrders => {
                if (serverOrders.success && serverOrders.orders) {
                    const serverOrderIds = new Set(serverOrders.orders.map(o => o.id));
                    const ordersToSync = localOrders.filter(order => !serverOrderIds.has(order.id));

                    console.log('syncLocalOrdersToServer: Найдено', ordersToSync.length, 'заказов для синхронизации на сервер');

                    if (ordersToSync.length > 0) {
                        // Отправляем заказы на сервер по одному, пропуская заказы без ID
                        let syncCount = 0;
                        ordersToSync.forEach(order => {
                            if (!order.id || order.id === 'undefined' || order.id === undefined) {
                                console.warn('syncLocalOrdersToServer: Пропускаем заказ без ID:', order);
                                return;
                            }

                            // Очищаем данные заказа перед отправкой
                            const cleanOrder = cleanOrderDataForServer(order);
                            
                            fetch('/api/save_order', {
                                method: 'POST',
                                headers: { 'Content-Type': 'application/json' },
                                credentials: 'include',
                                body: JSON.stringify(cleanOrder)
                            })
                            .then(response => response.json())
                            .then(result => {
                                if (result.success) {
                                    syncCount++;
                                    console.log('syncLocalOrdersToServer: Заказ', order.id, 'синхронизирован на сервер', result.updated ? '(обновлен)' : '(создан)');
                                } else {
                                    console.warn('syncLocalOrdersToServer: Ошибка синхронизации заказа', order.id, ':', result.error);
                                }
                            })
                            .catch(error => {
                                console.error('syncLocalOrdersToServer: Ошибка отправки заказа', order.id, 'на сервер:', error);
                            });
                        });

                        console.log('syncLocalOrdersToServer: Запущена синхронизация', ordersToSync.length, 'заказов (без учета заказов без ID)');
                    } else {
                        console.log('syncLocalOrdersToServer: Все локальные заказы уже синхронизированы с сервером');
                    }
                } else {
                    console.warn('syncLocalOrdersToServer: Не удалось получить заказы с сервера');
                }
            })
            .catch(error => {
                console.error('syncLocalOrdersToServer: Ошибка получения заказов с сервера:', error);
            });

    } catch (error) {
        console.error('syncLocalOrdersToServer: Ошибка синхронизации:', error);
    }
}

// Функция начисления бонусов пользователю
function addUserBonus(bonusAmount) {
    try {
        console.log('addUserBonus: Начинаем начисление бонусов, сумма:', bonusAmount);
        console.log('addUserBonus: window.__authState:', window.__authState);
        console.log('addUserBonus: isAuthenticated:', window.__authState?.isAuthenticated);

        if (!window.__authState || !window.__authState.isAuthenticated) {
            console.log('addUserBonus: Пользователь не авторизован, бонусы не начислены');
            return;
        }

        // Получаем текущий баланс бонусов из профиля пользователя или localStorage
        const currentBonus = window.__authState.profile?.bonuses || parseInt(localStorage.getItem('userBonusBalance') || '0');
        const newBonusBalance = currentBonus + bonusAmount;

        console.log('addUserBonus: Текущий баланс:', currentBonus, 'Новый баланс:', newBonusBalance);

        // Сохраняем новый баланс в профиле пользователя
        if (window.__authState.profile) {
            window.__authState.profile.bonuses = newBonusBalance;
            console.log('addUserBonus: Сохранили в профиль пользователя:', newBonusBalance);
        }

        // Также сохраняем в localStorage для совместимости
        localStorage.setItem('userBonusBalance', newBonusBalance.toString());
        console.log('addUserBonus: Сохранили в localStorage:', newBonusBalance);

        // Обновляем отображение баланса в интерфейсе
        updateBonusDisplay(newBonusBalance);

        console.log(`addUserBonus: Начислено ${bonusAmount} бонусов. Новый баланс: ${newBonusBalance}`);
    } catch (error) {
        console.error('addUserBonus: Ошибка начисления бонусов', error);
    }
}

// Функция обновления отображения баланса бонусов
function updateBonusDisplay(bonusBalance) {
    // Обновляем отображение в личном кабинете
    const accountBonusElement = document.getElementById('accBonuses');
    if (accountBonusElement) {
        accountBonusElement.textContent = bonusBalance;
    }

    // Обновляем отображение в шапке кабинета
    const accountBonusesElement = document.getElementById('accountBonuses');
    if (accountBonusesElement) {
        // Получаем текущий текст и заменяем только число
        const currentText = accountBonusesElement.textContent;
        const lang = getCurrentLanguage ? getCurrentLanguage() : (localStorage.getItem('selectedLanguage') || 'uk');

        let newText = 'Кол-во бонусов: ' + bonusBalance;
        if (lang === 'uk') {
            newText = 'Кількість бонусів: ' + bonusBalance;
        } else if (lang === 'en') {
            newText = 'Bonus amount: ' + bonusBalance;
        }

        accountBonusesElement.textContent = newText;
    }

    // Обновляем отображение в корзине
    const cartBonusElement = document.getElementById('cartBonusBalance');
    if (cartBonusElement) {
        cartBonusElement.textContent = bonusBalance;
    }

    // Обновляем отображение в шапке
    const headerBonusElement = document.getElementById('headerBonusBalance');
    if (headerBonusElement) {
        headerBonusElement.textContent = bonusBalance;
    }
}

// Функция списания бонусов из баланса пользователя
function deductUserBonus(bonusAmount) {
    try {
        console.log('deductUserBonus: Попытка списать бонусы, сумма:', bonusAmount);
        console.log('deductUserBonus: window.__authState:', !!window.__authState);
        console.log('deductUserBonus: isAuthenticated:', window.__authState?.isAuthenticated);

        if (!window.__authState || !window.__authState.isAuthenticated) {
            console.log('deductUserBonus: Пользователь не авторизован, бонусы не списаны');
            return false;
        }

        // Получаем текущий баланс бонусов
        const currentBonus = getUserBonusBalance();
        console.log('deductUserBonus: Текущий баланс бонусов:', currentBonus);
        console.log('deductUserBonus: Попытка списать:', bonusAmount);

        if (currentBonus < bonusAmount) {
            console.warn(`deductUserBonus: Недостаточно бонусов. Доступно: ${currentBonus}, требуется: ${bonusAmount}`);
            return false;
        }

        const newBonusBalance = currentBonus - bonusAmount;
        console.log('deductUserBonus: Новый баланс после списания:', newBonusBalance);

        // Сохраняем новый баланс в профиле пользователя
        if (window.__authState.profile) {
            window.__authState.profile.bonuses = newBonusBalance;
            console.log('deductUserBonus: Сохранили в профиль пользователя:', newBonusBalance);
        }

        // Также сохраняем в localStorage для совместимости
        localStorage.setItem('userBonusBalance', newBonusBalance.toString());
        console.log('deductUserBonus: Сохранили в localStorage:', newBonusBalance);

        // Обновляем отображение баланса в интерфейсе
        updateBonusDisplay(newBonusBalance);

        console.log(`deductUserBonus: Списано ${bonusAmount} бонусов. Новый баланс: ${newBonusBalance}`);
        return true;
    } catch (error) {
        console.error('deductUserBonus: Ошибка списания бонусов', error);
        return false;
    }
}

// Функция получения текущего баланса бонусов
function getUserBonusBalance() {
    // Сначала проверяем профиль пользователя
    if (window.__authState && window.__authState.profile && window.__authState.profile.bonuses !== undefined) {
        const profileBonuses = window.__authState.profile.bonuses;
        if (!isNaN(profileBonuses) && profileBonuses >= 0) {
            console.log('getUserBonusBalance: Возвращаем бонусы из профиля:', profileBonuses);
            return profileBonuses;
        } else {
            console.warn('getUserBonusBalance: Бонусы из профиля содержат NaN или отрицательное значение:', profileBonuses, 'сбрасываем на 0');
            window.__authState.profile.bonuses = 0;
            return 0;
        }
    }
    // Если профиль не доступен, используем localStorage
    const localBonusStr = localStorage.getItem('userBonusBalance') || '0';
    const localBonus = parseInt(localBonusStr) || 0;
    console.log('getUserBonusBalance: Возвращаем бонусы из localStorage:', localBonus);
    return localBonus;
}

// Функция инициализации баланса бонусов
function initializeUserBonus() {
    try {
        const bonusBalance = getUserBonusBalance();
        updateBonusDisplay(bonusBalance);
        console.log('initializeUserBonus: Баланс бонусов инициализирован:', bonusBalance);
    } catch (error) {
        console.error('initializeUserBonus: Ошибка инициализации баланса бонусов', error);
    }
}

// Функция восстановления заголовка приложения
function restoreAppTitle() {
    try {
        const appTitleEl = document.querySelector('.app-title');
        if (appTitleEl) {
            appTitleEl.textContent = 'GuitarStrings.com.ua';
            appTitleEl.removeAttribute('data-original-title');
            console.log('restoreAppTitle: Заголовок восстановлен');
        }
    } catch (error) {
        console.error('restoreAppTitle: Ошибка восстановления заголовка', error);
    }
}

// Функция добавления заказа в кабинет пользователя
function addOrderToAccountView(order) {
    try {
        if (!window.__authState || !window.__authState.isAuthenticated) {
            console.log('addOrderToAccountView: Пользователь не авторизован, пропускаем добавление в кабинет');
            return;
        }

        // Добавляем заказ в глобальный массив заказов пользователя
        if (!window.userOrders) window.userOrders = [];
        window.userOrders.push(order);

        // Если кабинет открыт, обновляем отображение заказов
        if (getVisibleView() === 'account') {
            renderAccountOrders();
        }

        console.log('addOrderToAccountView: Заказ добавлен в кабинет пользователя', order);
    } catch (error) {
        console.error('addOrderToAccountView: Ошибка добавления заказа в кабинет', error);
    }
}

// Функция показа всплывающего окна с подтверждением заказа
function showOrderAcceptedPopup(orderId) {
    try {
        const lang = getCurrentLanguage ? getCurrentLanguage() : (localStorage.getItem('selectedLanguage') || 'uk');
        const orderAcceptedText = document.getElementById('orderAcceptedText');

        if (orderAcceptedText) {
            const message = window.translations ? window.translations.getTranslationWithParams('orderAcceptedText', {orderId}, lang) :
                `Ваш заказ принят, номер заказа ${orderId}. Ожидайте сообщение от менеджера с реквизитами для оплаты или уточнением, если вдруг какого-то товара меньше, чем в заказе.`;

            orderAcceptedText.textContent = message;
        }

        const popup = document.getElementById('orderAcceptedPopup');
        if (popup) {
            popup.style.display = 'flex';
        }

        console.log('showOrderAcceptedPopup: Показано всплывающее окно заказа', orderId);
    } catch (error) {
        console.error('showOrderAcceptedPopup: Ошибка показа всплывающего окна', error);
    }
}

// Функция отправки уведомления в Telegram (если есть)
async function sendOrderNotification(order) {
    try {
        console.log('sendOrderNotification: Отправка уведомления о заказе', order);

        // Получаем Telegram данные пользователя
        let tg, hasTelegramData;

        try {
            tg = window.Telegram && window.Telegram.WebApp && window.Telegram.WebApp.initDataUnsafe;
            hasTelegramData = tg && tg.user && tg.user.id;
        } catch (telegramError) {
            console.warn('sendOrderNotification: Ошибка доступа к Telegram Web App', telegramError);
            hasTelegramData = false;
        }

        if (!hasTelegramData) {
            console.log('sendOrderNotification: Telegram данные пользователя недоступны или произошла ошибка');
            return;
        }

        // Формируем сообщение для пользователя
        const userMessage = `🎉 Ваш заказ ${order.id} принят!\n\n` +
                           `📦 Товары: ${order.items.length} позиций\n` +
                           `💰 Сумма: ${order.total} ${getCurrencyWithDot()}\n` +
                           `📱 Телефон: ${order.customer.phone}\n` +
                           `📍 Доставка: ${getDeliveryMethodText(order.deliveryMethod)}\n\n` +
                           `⏰ Ожидайте сообщение от менеджера с реквизитами оплаты!`;

        // Формируем сообщение для менеджера
        const managerMessage = `🆕 Новый заказ ${order.id}!\n\n` +
                              `👤 Клиент: ${order.customer.name || 'Не указан'}\n` +
                              `📱 Телефон: ${order.customer.phone}\n` +
                              `📧 Email: ${tg.user.username ? '@' + tg.user.username : 'Не указан'}\n` +
                              `🏠 Адрес: ${order.customer.settlement}, ${order.customer.branch}\n` +
                              `💰 Сумма: ${order.total} ${getCurrencyWithDot()}\n` +
                              `💳 Оплата: ${getPaymentMethodText(order.paymentMethod)}\n` +
                              `🚚 Доставка: ${getDeliveryMethodText(order.deliveryMethod)}\n` +
                              `📦 Товаров: ${order.items.length}\n\n` +
                              `🔗 Telegram ID: ${tg.user.id}`;

        // Отправляем уведомления через API сервера
        const notifications = [
            { type: 'user', message: userMessage, telegramId: tg.user.id },
            { type: 'manager', message: managerMessage, telegramId: null } // Менеджеру отправляется через бота
        ];

        for (const notification of notifications) {
            try {
                const response = await fetch('/api/send_telegram_notification', {
                    method: 'POST',
                    headers: {
                        'Content-Type': 'application/json',
                    },
                    body: JSON.stringify({
                        message: notification.message,
                        telegramId: notification.telegramId,
                        orderId: order.id,
                        notificationType: notification.type
                    }),
                    credentials: 'include'
                });

                if (response.ok) {
                    console.log(`sendOrderNotification: ${notification.type} уведомление отправлено`);
                } else {
                    console.error(`sendOrderNotification: Ошибка отправки ${notification.type} уведомления`, response.status);
                }
            } catch (error) {
                console.error(`sendOrderNotification: Ошибка отправки ${notification.type} уведомления`, error);
            }
        }

        console.log('sendOrderNotification: Уведомления отправлены');

    } catch (error) {
        console.error('sendOrderNotification: Ошибка отправки уведомления', error);
    }
}

// Флаг для предотвращения сброса данных при отправке заказа
let isCheckoutInProgress = false;

// Функция управления видимостью полей доставки
function updateIndexFieldVisibility(deliveryMethod) {
    try {
        // Найдем поле индекса по его ID
        const indexInput = document.getElementById('cartCustomerIndex');
        const indexRow = indexInput ? indexInput.closest('.info-row') : null;

        // Найдем поле номера отделения
        const branchInput = document.getElementById('cartCustomerBranch');
        const branchRow = branchInput ? branchInput.closest('.info-row') : null;

        if (deliveryMethod === 'ukrposhta') {
            // Для Укрпочты показываем индекс, скрываем номер отделения
            if (indexRow) {
                indexRow.style.display = 'block';
                console.log('updateIndexFieldVisibility: Показали поле индекса для Укрпочты');
            }
            if (branchRow) {
                branchRow.style.display = 'none';
                console.log('updateIndexFieldVisibility: Скрыли номер отделения для Укрпочты');
            }
        } else {
            // Для других способов показываем номер отделения, скрываем индекс
            if (indexRow) {
                indexRow.style.display = 'none';
                console.log('updateIndexFieldVisibility: Скрыли поле индекса для', deliveryMethod);
            }
            if (branchRow) {
                branchRow.style.display = 'block';
                console.log('updateIndexFieldVisibility: Показали номер отделения для', deliveryMethod);
            }
        }
    } catch (error) {
        console.error('updateIndexFieldVisibility: Ошибка:', error);
    }
}

// Функция принудительного применения стилей к кнопке оплаты
function forcePayButtonStyles() {
    try {
        const payButton = document.querySelector('.cart-actions .btn-pay');
        if (payButton) {
            // Удаляем все существующие inline-стили
            payButton.removeAttribute('style');

            // Применяем базовые стили с максимальным приоритетом
            payButton.style.setProperty('display', 'flex', 'important');
            payButton.style.setProperty('visibility', 'visible', 'important');
            payButton.style.setProperty('opacity', '1', 'important');
            payButton.style.setProperty('background', '#f8a818 !important', 'important');
            payButton.style.setProperty('background-color', '#f8a818 !important', 'important');
            payButton.style.setProperty('color', 'white !important', 'important');
            payButton.style.setProperty('border', 'none !important', 'important');
            payButton.style.setProperty('box-shadow', 'none !important', 'important');
            payButton.style.setProperty('position', 'relative', 'important');
            payButton.style.setProperty('z-index', '9999', 'important');
            payButton.style.setProperty('width', '100%', 'important');
            payButton.style.setProperty('height', 'auto', 'important');
            payButton.style.setProperty('padding', '12px 24px', 'important');
            payButton.style.setProperty('font-size', '16px', 'important');
            payButton.style.setProperty('font-weight', '600', 'important');
            payButton.style.setProperty('text-align', 'center', 'important');
            payButton.style.setProperty('cursor', 'pointer', 'important');

            // Применяем стили к дочерним элементам с максимальным приоритетом
            const spans = payButton.querySelectorAll('span, [data-translate]');
            spans.forEach(span => {
                span.style.setProperty('color', 'white !important', 'important');
                span.style.setProperty('background', 'transparent !important', 'important');
                span.style.setProperty('text-shadow', 'none !important', 'important');
                span.style.setProperty('-webkit-text-fill-color', 'white !important', 'important');
                span.style.setProperty('-webkit-text-stroke', '0px transparent !important', 'important');
                span.style.setProperty('border', 'none !important', 'important');
                span.style.setProperty('font-weight', '600', 'important');
                span.style.setProperty('font-size', '16px', 'important');
            });

            console.log('forcePayButtonStyles: Стили применены успешно');
        }
    } catch (error) {
        console.error('forcePayButtonStyles: Ошибка применения стилей:', error);
    }
}

// Функция обработки клика по кнопке "Заказы" в футере
function handleOrdersClick() {
    console.log('handleOrdersClick: Обработка клика по кнопке Заказы');
    console.log('handleOrdersClick: window.__authState:', window.__authState);
    console.log('handleOrdersClick: isAuthenticated:', window.__authState?.isAuthenticated);

    // Проверяем, авторизован ли пользователь
    if (window.__authState && window.__authState.isAuthenticated) {
        console.log('handleOrdersClick: Пользователь авторизован, открываем личный кабинет');
        // Открываем личный кабинет
        showAccountView();
    } else {
        console.log('handleOrdersClick: Пользователь не авторизован, показываем окно логина');
        // Показываем dropdown с формой логина
        showLoginDropdown();
    }
}

// Функция обработки клика по кнопке "Кабинет"
function handleCabinetClick() {
    console.log('handleCabinetClick: Обработка клика по кнопке Кабинет');

    // Проверяем, авторизован ли пользователь
    if (window.__authState && window.__authState.isAuthenticated) {
        console.log('handleCabinetClick: Пользователь авторизован, открываем личный кабинет');
        // Открываем личный кабинет
        showAccountView();
    } else {
        console.log('handleCabinetClick: Пользователь не авторизован, показываем окно логина');
        // Показываем dropdown с формой логина
        showLoginDropdown();
    }
}

// Функция показа dropdown с формой логина
function showLoginDropdown() {
    try {
        console.log('showLoginDropdown: Начинаем показ формы логина');

        // Сначала показываем сам dropdown контейнер
        const dropdown = document.getElementById('avatarDropdown');
        if (dropdown) {
            // Проверяем, не открыт ли уже dropdown
            const isAlreadyOpen = dropdown.style.display === 'block' || dropdown.classList.contains('show');
            if (!isAlreadyOpen) {
                dropdown.style.display = 'block';
                console.log('showLoginDropdown: Показали dropdown контейнер');
            } else {
                console.log('showLoginDropdown: Dropdown уже открыт');
            }
        }

        // Сначала показываем секцию логина
        const loginSection = document.getElementById('dropdownLoginSection');
        if (loginSection) {
            loginSection.style.display = 'block';
            loginSection.style.visibility = 'visible';
            loginSection.style.opacity = '1';
            loginSection.classList.add('show');
            console.log('showLoginDropdown: Показали секцию логина');

            // Загружаем капчу сразу при открытии формы
            setTimeout(() => fetchCaptcha('login'), 100);
        }

        // Агрессивно скрываем остальные секции
        const sectionsToHide = ['dropdownRegisterSection', 'dropdownSmsLoginSection'];
        sectionsToHide.forEach(sectionId => {
            const section = document.getElementById(sectionId);
            if (section) {
                // Сбрасываем все стили и классы
                section.style.display = 'none';
                section.classList.remove('show');
                section.style.visibility = 'hidden';
                section.style.opacity = '0';
                console.log('showLoginDropdown: Скрыли секцию:', sectionId);
            }
        });

        // Убеждаемся, что секция логина правильно показана через небольшую задержку
        setTimeout(() => {
            const loginSection = document.getElementById('dropdownLoginSection');
            if (loginSection) {
                loginSection.style.display = 'block';
                loginSection.style.visibility = 'visible';
                loginSection.style.opacity = '1';
                console.log('showLoginDropdown: Подтвердили показ секции логина');
            }
        }, 10);

    } catch (error) {
        console.error('showLoginDropdown: Ошибка:', error);
    }
}

// Основная функция оформления заказа
function checkout() {
    try {
        console.log('checkout: Начало оформления заказа');

        // Устанавливаем флаг, чтобы предотвратить сброс данных
        isCheckoutInProgress = true;

        // Проверяем наличие необходимых функций
        if (typeof calculateCartTotal !== 'function') {
            throw new Error('Функция calculateCartTotal не найдена');
        }
        if (typeof generateOrderId !== 'function') {
            throw new Error('Функция generateOrderId не найдена');
        }
        if (typeof saveOrderToLocalStorage !== 'function') {
            throw new Error('Функция saveOrderToLocalStorage не найдена');
        }
        if (typeof calculateDeliveryCost !== 'function') {
            throw new Error('Функция calculateDeliveryCost не найдена');
        }
        if (typeof calculatePaymentFee !== 'function') {
            throw new Error('Функция calculatePaymentFee не найдена');
        }

        // Проверяем корзину
        if (!cart || cart.length === 0) {
            const lang = getCurrentLanguage ? getCurrentLanguage() : (localStorage.getItem('selectedLanguage') || 'uk');
            const emptyCartAlert = lang === 'uk' ? 'Кошик порожній!' : lang === 'en' ? 'Cart is empty!' : 'Корзина пуста!';
            alert(emptyCartAlert);
            return;
        }

        // Получаем данные формы
        const customerName = document.getElementById('cartCustomerName').value.trim();
        const customerPhone = document.getElementById('cartCustomerPhone').value.trim();
        const customerSettlement = document.getElementById('cartCustomerSettlement').value.trim();
        let customerRegion = document.getElementById('cartCustomerRegion').value.trim();
        // Убираем слово "область" из значения, чтобы избежать дублирования
        customerRegion = customerRegion.replace(/\s*область\s*$/i, '').replace(/\s*обл\s*\.?\s*$/i, '');
        const customerBranch = document.getElementById('cartCustomerBranch');
        const customerIndex = document.getElementById('cartCustomerIndex').value.trim();
        const paymentMethod = document.getElementById('paymentMethodSelect').value;
        const deliveryMethodSelect = document.getElementById('deliveryMethodSelect');
        const deliveryMethod = deliveryMethodSelect ? deliveryMethodSelect.value : 'nova';

        // Дополнительная проверка правильности deliveryMethod
        console.log('checkout: deliveryMethodSelect found:', !!deliveryMethodSelect);
        console.log('checkout: deliveryMethod value:', deliveryMethod);
        console.log('checkout: deliveryMethod options:');
        if (deliveryMethodSelect) {
            Array.from(deliveryMethodSelect.options).forEach(option => {
                console.log('  ', option.value, ':', option.textContent.substring(0, 30) + '...');
            });
        }

        // Определяем тип поля branch (input или select)
        let branchValue = '';
        if (customerBranch.tagName && customerBranch.tagName.toLowerCase() === 'select') {
            branchValue = customerBranch.value;
        } else {
            branchValue = customerBranch.value.trim();
        }

        // Валидация обязательных полей
        const errors = [];

        // Проверяем телефон
        if (!customerPhone) {
            errors.push('Телефон обязателен для заполнения');
        }

        // Проверяем населённый пункт
        if (!customerSettlement) {
            errors.push('Населённый пункт обязателен для заполнения');
        }

        // Проверяем область для Укрпошты
        if (deliveryMethod === 'ukrposhta' && !customerRegion) {
            errors.push('Область обязательна для заполнения при доставке Укрпоштой');
        }

        // Проверяем номер отделения/индекс (кроме самовывоза)
        if (deliveryMethod === 'ukrposhta') {
            // Для Укрпочты проверяем индекс
            if (!customerIndex) {
                errors.push('Індекс обязателен для заполнения при доставке Укрпоштой');
            }
        } else if (deliveryMethod !== 'pickup') {
            // Для других способов доставки проверяем номер отделения
        if (!branchValue) {
                errors.push('Номер отделения обязателен для заполнения');
            }
        }

        // Проверяем выбор времени для самовывоза
        if (deliveryMethod === 'pickup') {
            const pickupTimeSelect = document.getElementById('cartPickupTimeSelect');
            const pickupTimeValue = pickupTimeSelect ? pickupTimeSelect.value.trim() : '';
            if (!pickupTimeValue) {
                errors.push('Время самовывоза обязательно для заполнения');
            }
        }

        // Проверяем ФИО (всегда обязательно)
        if (!customerName) {
            errors.push('Фамилия и имя обязательны для заполнения');
        }

        if (errors.length > 0) {
            alert('Пожалуйста, заполните все обязательные поля:\n' + errors.join('\n'));
            return;
        }

        // Генерируем номер заказа
        const orderId = generateOrderId();

        // Получаем информацию о купонах и бонусах из корзины
        let bonusesUsed = parseInt(localStorage.getItem('cartBonusesUsed') || '0');
        const bonusDiscount = parseInt(localStorage.getItem('cartBonusDiscount') || '0');
        const couponDiscount = parseInt(localStorage.getItem('cartCouponDiscount') || '0');

        // Проверяем авторизацию для использования бонусов
        if (!window.__authState || !window.__authState.isAuthenticated) {
            console.log('checkout: Пользователь не авторизован, сбрасываем бонусы');
            bonusesUsed = 0;
            localStorage.setItem('cartBonusesUsed', '0');
        }

        console.log('checkout: Извлекли из localStorage - bonuses:', bonusesUsed, 'coupon:', couponDiscount);

        // Получаем название купона
        const couponInput = document.getElementById('cartCouponInput');
        const couponCode = couponInput && couponInput.value.trim() ? couponInput.value.trim() : '';

        // Получаем комментарий к заказу
        const commentTextarea = document.querySelector('.cart-comment');
        const comment = commentTextarea && commentTextarea.value.trim() ? commentTextarea.value.trim() : '';

        // Получаем выбранное время самовывоза
        const pickupTimeSelect = document.getElementById('cartPickupTimeSelect');
        const pickupTime = pickupTimeSelect && pickupTimeSelect.value ? pickupTimeSelect.value : '';

        // Рассчитываем суммы аналогично корзине
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

        const itemsDiscount = oldPricesTotal - newPricesTotal;

        // Рассчитываем скидку по купону аналогично корзине
        let couponAmount = 0;
        if (couponDiscount > 0) {
            if (couponDiscount <= 1) {
                // Процентная скидка
                couponAmount = Math.round(newPricesTotal * couponDiscount);
            } else {
                // Фиксированная скидка в грн
                couponAmount = couponDiscount;
            }
        }

        // Рассчитываем стоимость доставки
        const deliveryCost = calculateDeliveryCost(deliveryMethod, newPricesTotal);

        // Рассчитываем итоговые суммы
        const subtotalAfterItemsDiscount = oldPricesTotal - itemsDiscount; // newPricesTotal
        const subtotalAfterAllDiscounts = subtotalAfterItemsDiscount - couponAmount - bonusDiscount;
        const finalTotal = Math.max(0, subtotalAfterAllDiscounts + deliveryCost);

        // Создаем объект заказа с полными расчетами
        const order = {
            id: orderId,
            date: new Date().toISOString(),
            userId: (window.__authState && window.__authState.profile &&
                     (window.__authState.profile.username || window.__authState.profile.displayName)) ||
                    localStorage.getItem('lastLoginUsername') || 'guest',
            customer: {
                name: customerName,
                phone: customerPhone,
                settlement: customerSettlement,
                region: customerRegion,
                branch: deliveryMethod === 'ukrposhta' ? '' : branchValue, // Для Укрпочты не сохраняем номер отделения
                index: deliveryMethod === 'ukrposhta' ? customerIndex : '' // Для Укрпочты сохраняем индекс
            },
            paymentMethod: paymentMethod,
            deliveryMethod: deliveryMethod,
            items: JSON.parse(JSON.stringify(cart)), // Глубокая копия корзины для предотвращения изменений
            // Сохраняем все промежуточные суммы для корректного отображения
            amount: finalTotal, // Для совместимости с расчетом бонусов
            itemsTotal: newPricesTotal, // Сумма товаров со скидками
            itemsDiscount: itemsDiscount, // Скидка на товары
            subtotal: oldPricesTotal, // Сумма товаров без скидок
            deliveryCost: deliveryCost, // Стоимость доставки
            bonusesUsed: bonusesUsed, // Количество использованных бонусов
            bonusDiscount: bonusDiscount, // Сумма скидки по бонусам в гривнах
            couponDiscount: couponAmount, // Сумма скидки по купону (рассчитанная)
            couponCode: couponCode,
            finalTotal: finalTotal, // Итоговая сумма
            comment: comment,
            pickupTime: pickupTime, // Время самовывоза
            status: 'completed'
        };

        console.log('checkout: Создан объект заказа:', order);
        console.log('checkout: Данные пользователя:', order.customer);
        console.log('checkout: Товары в заказе:', order.items);
        console.log('checkout: Бонусы к списанию:', bonusesUsed, 'Купон (localStorage):', couponDiscount, 'Купон (рассчитанный):', couponAmount);
        console.log('checkout: Итоговая сумма:', order.finalTotal);
        console.log('checkout: order.bonusesUsed:', order.bonusesUsed, 'order.couponDiscount:', order.couponDiscount);

        console.log('checkout: Создан заказ', order);
        console.log('checkout: Данные формы:', {
            customerName,
            customerPhone,
            customerSettlement,
            customerRegion,
            branchValue,
            paymentMethod,
            deliveryMethod,
            bonusesUsed,
            couponDiscount,
            couponCode,
            comment
        });

        // Убеждаемся, что сумма заказа правильно сохранена
        if (!order.amount || isNaN(order.amount)) {
            order.amount = finalTotal;
            console.log('checkout: Исправлена сумма заказа на:', order.amount);
        }

        console.log('checkout: Финальный объект заказа для сохранения:', {
            id: order.id,
            userId: order.userId,
            amount: order.amount,
            finalTotal: order.finalTotal,
            customerName: order.customer.name,
            customerPhone: order.customer.phone
        });

        // Сохраняем заказ в localStorage
        saveOrderToLocalStorage(order);

        // Отправляем заказ на сервер для синхронизации
        console.log('checkout: Проверка авторизации - window.__authState:', !!window.__authState);
        if (window.__authState) {
            console.log('checkout: window.__authState.profile:', window.__authState.profile);
            console.log('checkout: window.__authState.isAuthenticated:', window.__authState.isAuthenticated);
        }

        // Всегда отправляем заказ на сервер для синхронизации, если есть userId
        if (order.userId && order.userId !== 'guest') {
            console.log('checkout: Отправляем заказ на сервер:', order.id, 'для пользователя:', order.userId);
            // Очищаем данные заказа перед отправкой
            const cleanOrder = cleanOrderDataForServer(order);
            
            fetch('/api/save_order', {
                method: 'POST',
                headers: {
                    'Content-Type': 'application/json',
                },
                credentials: 'include',
                body: JSON.stringify(cleanOrder)
            })
            .then(response => response.json())
            .then(saveResult => {
                if (saveResult.success) {
                    console.log('checkout: Заказ успешно сохранен на сервере:', order.id);
                } else {
                    console.warn('checkout: Ошибка сохранения заказа на сервере:', saveResult.error);
                }
            })
            .catch(error => {
                console.error('checkout: Ошибка отправки заказа на сервер:', error);
            });
        } else {
            console.log('checkout: userId отсутствует или пользователь гость, заказ не отправлен на сервер. userId:', order.userId);
        }

        // Если пользователь авторизован, добавляем в кабинет
        addOrderToAccountView(order);

        // Для just_a_legend принудительно обновляем личный кабинет
        if (window.__authState && window.__authState.profile &&
            (window.__authState.profile.displayName === 'just_a_legend' || window.__authState.profile.username === 'just_a_legend')) {
            console.log('checkout: Обновляем личный кабинет для just_a_legend после создания заказа');

            // Также исправляем суммы в существующих заказах для just_a_legend
            setTimeout(() => {
                fixExistingOrderAmounts('just_a_legend');
            }, 500);

            setTimeout(() => {
                if (typeof renderAccountPage === 'function') {
                    renderAccountPage();
                }
            }, 1000);
        }

        // Итоговые суммы уже рассчитаны выше

        // Списываем использованные бонусы из баланса пользователя
        if (bonusesUsed > 0) {
            console.log(`checkout: Начинаем списание ${bonusesUsed} бонусов`);
            const deductSuccess = deductUserBonus(bonusesUsed);
            if (deductSuccess) {
                console.log(`checkout: Списано ${bonusesUsed} бонусов из баланса пользователя`);
                // Принудительно обновляем отображение баланса
                const newBalance = getUserBonusBalance();
                updateBonusDisplay(newBalance);
                console.log(`checkout: Новый баланс бонусов: ${newBalance}`);

                // Для just_a_legend принудительно пересчитываем бонусы на основе всех заказов
                if (window.__authState && window.__authState.profile &&
                    (window.__authState.profile.displayName === 'just_a_legend' ||
                     window.__authState.profile.username === 'just_a_legend')) {
                    console.log('checkout: Пересчитываем бонусы для just_a_legend после списания');

                    // Получаем все заказы пользователя
                    const currentUser = window.__authState && window.__authState.profile ?
                        (window.__authState.profile.username || window.__authState.profile.displayName || 'guest') : 'guest';
                    const userOrdersKey = `userOrders_${currentUser}`;
                    const localOrders = JSON.parse(localStorage.getItem(userOrdersKey) || '[]');

                    console.log('checkout: Найдено заказов для пересчета:', localOrders.length);

                    // Пересчитываем бонусы
                    let calculatedBonuses = 0;
                    let usedBonusesTotal = 0;

                    localOrders.forEach(order => {
                        if (order.status === 'completed' || order.status === 'завершен' || order.status === 'выполнен' || order.status === 'принято') {
                            if (order.amount && !isNaN(order.amount) && order.amount > 0) {
                                const bonusFromOrder = Math.floor(parseFloat(order.amount) / 10);
                                calculatedBonuses += bonusFromOrder;
                            }
                        }

                        // Вычитаем использованные бонусы
                        let usedBonusesInOrder = 0;
                        if (order.bonusesUsed && !isNaN(order.bonusesUsed) && order.bonusesUsed > 0) {
                            usedBonusesInOrder = parseInt(order.bonusesUsed) || 0;
                        } else if (order.bonusDiscount && !isNaN(order.bonusDiscount) && order.bonusDiscount > 0) {
                            usedBonusesInOrder = parseInt(order.bonusDiscount * 10) || 0;
                        }
                        usedBonusesTotal += usedBonusesInOrder;
                    });

                    calculatedBonuses -= usedBonusesTotal;

                    if (isNaN(calculatedBonuses)) {
                        calculatedBonuses = 0;
                    }

                    console.log('checkout: Пересчитанные бонусы:', calculatedBonuses);

                    // Обновляем профиль и отображение
                    if (window.__authState.profile) {
                        window.__authState.profile.bonuses = calculatedBonuses;
                    }
                    localStorage.setItem('userBonuses', calculatedBonuses.toString());
                    updateBonusDisplay(calculatedBonuses);
                }
            } else {
                console.warn(`checkout: Не удалось списать ${bonusesUsed} бонусов из баланса`);
            }
        }

        // Начисляем бонусы за заказ (1 бонус за каждые 10грн от суммы товаров без доставки)
        const bonusEarned = Math.floor(subtotalAfterAllDiscounts / 10); // 1 бонус за каждые 10грн
        if (bonusEarned > 0) {
            console.log(`checkout: Рассчитано ${bonusEarned} бонусов за заказ ${orderId} (сумма: ${subtotalAfterAllDiscounts}грн)`);

            // Для just_a_legend принудительно пересчитываем бонусы после начисления
            if (window.__authState && window.__authState.profile &&
                (window.__authState.profile.displayName === 'just_a_legend' ||
                 window.__authState.profile.username === 'just_a_legend')) {
                console.log('checkout: Начисляем бонусы с пересчетом для just_a_legend');

                // Сначала начисляем бонусы обычным способом
            addUserBonus(bonusEarned);

                // Затем пересчитываем все бонусы заново
                setTimeout(() => {
                    const currentUser = window.__authState && window.__authState.profile ?
                        (window.__authState.profile.username || window.__authState.profile.displayName || 'guest') : 'guest';
                    const userOrdersKey = `userOrders_${currentUser}`;
                    const localOrders = JSON.parse(localStorage.getItem(userOrdersKey) || '[]');

                    console.log('checkout: Пересчет бонусов после начисления, заказов:', localOrders.length);

                    let calculatedBonuses = 0;
                    let usedBonusesTotal = 0;

                    localOrders.forEach(order => {
                        if (order.status === 'completed' || order.status === 'завершен' || order.status === 'выполнен' || order.status === 'принято') {
                            if (order.amount && !isNaN(order.amount) && order.amount > 0) {
                                const bonusFromOrder = Math.floor(parseFloat(order.amount) / 10);
                                calculatedBonuses += bonusFromOrder;
                            }
                        }

                        // Вычитаем использованные бонусы
                        let usedBonusesInOrder = 0;
                        if (order.bonusesUsed && !isNaN(order.bonusesUsed) && order.bonusesUsed > 0) {
                            usedBonusesInOrder = parseInt(order.bonusesUsed) || 0;
                        } else if (order.bonusDiscount && !isNaN(order.bonusDiscount) && order.bonusDiscount > 0) {
                            usedBonusesInOrder = parseInt(order.bonusDiscount * 10) || 0;
                        }
                        usedBonusesTotal += usedBonusesInOrder;
                    });

                    calculatedBonuses -= usedBonusesTotal;

                    if (isNaN(calculatedBonuses)) {
                        calculatedBonuses = 0;
                    }

                    console.log('checkout: Финальный пересчет бонусов:', calculatedBonuses);

                    // Обновляем профиль и отображение
                    if (window.__authState.profile) {
                        window.__authState.profile.bonuses = calculatedBonuses;
                    }
                    localStorage.setItem('userBonuses', calculatedBonuses.toString());
                    updateBonusDisplay(calculatedBonuses);
                }, 500);
            } else {
                // Для обычных пользователей начисляем бонусы обычным способом
                addUserBonus(bonusEarned);
            }

            console.log(`checkout: Начислено ${bonusEarned} бонусов за заказ ${orderId}`);
        } else {
            console.log(`checkout: Бонусы не начислены (сумма после скидок: ${subtotalAfterAllDiscounts}грн)`);
        }

        // Отправляем уведомление в Telegram (если есть) - асинхронно, не блокирует
        try {
            sendOrderNotification(order);
        } catch (notificationError) {
            console.warn('checkout: Ошибка отправки уведомления, но заказ оформлен', notificationError);
        }

        // Закрываем окно корзины
        closePopup('cartPopup');

        // Показываем всплывающее окно подтверждения
        showOrderAcceptedPopup(orderId);

        // Очищаем корзину
        cart = [];
        cartItemCount = 0;
        localStorage.setItem('cart', JSON.stringify(cart));
        localStorage.setItem('cartItemCount', cartItemCount.toString());

        // Обновляем отображение корзины
        updateCartBadge();
        renderCartItems();

        // Сбрасываем флаг после успешного оформления
        isCheckoutInProgress = false;

        console.log('checkout: Заказ успешно оформлен', orderId);

    } catch (error) {
        console.error('checkout: Ошибка оформления заказа', error);
        console.error('checkout: Детали ошибки:', {
            message: error.message,
            stack: error.stack,
            orderData: {
                customerName,
                customerPhone,
                customerSettlement,
                branchValue,
                paymentMethod,
                deliveryMethod
            }
        });

        // Сбрасываем флаг в случае ошибки
        isCheckoutInProgress = false;

        alert('Произошла ошибка при оформлении заказа. Попробуйте еще раз.\n\nДетали: ' + error.message);
    }
}

// Безопасная функция для работы с Telegram Web App
function safeTelegramCall(callback, fallback) {
    try {
        if (window.Telegram && window.Telegram.WebApp) {
            return callback(window.Telegram.WebApp);
        } else {
            console.log('Telegram Web App недоступен, используем fallback');
            if (fallback) return fallback();
        }
    } catch (error) {
        console.warn('Ошибка при работе с Telegram Web App:', error);
        if (fallback) return fallback();
    }
}

// Функция расчета общей суммы корзины
function calculateCartTotal() {
    let total = 0;
    cart.forEach(item => {
        const price = parseInt(item.newPrice || item.price || 0);
        const quantity = item.quantity || 1;
        total += price * quantity;
    });
    return total;
}

// Функция показа деталей последнего заказа
function showLastOrderDetails() {
    try {
        console.log('showLastOrderDetails: Показ деталей последнего заказа');

        // Получаем последний заказ из localStorage
        const orders = JSON.parse(localStorage.getItem('userOrders') || '[]');
        if (orders.length === 0) {
            console.log('showLastOrderDetails: Нет заказов в localStorage');
            return;
        }

        // Берем последний заказ (самый свежий)
        const lastOrder = orders[orders.length - 1];

        // Заполняем детали заказа
        fillOrderDetails(lastOrder);

        // Показываем окно деталей заказа
        const popup = document.getElementById('orderDetailsPopup');
        if (popup) {
            popup.style.display = 'flex';
        }

        // Закрываем окно подтверждения
        closePopup('orderAcceptedPopup');

        console.log('showLastOrderDetails: Показано окно деталей заказа', lastOrder.id);

    } catch (error) {
        console.error('showLastOrderDetails: Ошибка показа деталей заказа', error);
    }
}

// Функция показа деталей конкретного заказа
function showOrderDetails(orderId) {
    try {
        console.log('showOrderDetails: Показ деталей заказа', orderId);

        // Получаем заказы из localStorage - сначала ищем в ключе текущего пользователя
        const currentUser = window.__authState && window.__authState.profile ?
            (window.__authState.profile.username || window.__authState.profile.displayName || 'guest') : 'guest';
        const userOrdersKey = `userOrders_${currentUser}`;
        console.log('showOrderDetails: currentUser:', currentUser, 'userOrdersKey:', userOrdersKey);

        let orders = JSON.parse(localStorage.getItem(userOrdersKey) || '[]');
        console.log('showOrderDetails: orders from user key:', orders.length, 'orders');
        console.log('showOrderDetails: first few orders IDs:', orders.slice(0, 5).map(o => ({id: o.id, type: typeof o.id})));
        console.log('showOrderDetails: searching for orderId:', orderId, 'type:', typeof orderId);
        let order = orders.find(o => o.id === orderId);
        console.log('showOrderDetails: exact match check for first order:', orders[0] ? orders[0].id === orderId : 'no orders');
        console.log('showOrderDetails: order found in user key:', !!order);

        // Если не найден в ключе текущего пользователя, ищем во всех ключах userOrders
        if (!order) {
            console.log('showOrderDetails: Заказ не найден в ключе текущего пользователя, ищу в других ключах');
            const allKeys = Object.keys(localStorage).filter(key => key.startsWith('userOrders'));
            for (const key of allKeys) {
                if (key === userOrdersKey) continue; // Уже проверили
                const userOrders = JSON.parse(localStorage.getItem(key) || '[]');
                order = userOrders.find(o => o.id === orderId);
                if (order) {
                    console.log('showOrderDetails: Заказ найден в ключе', key);
                    break;
                }
            }
        }

        // Также проверяем старый ключ userOrders (для совместимости)
        if (!order) {
            orders = JSON.parse(localStorage.getItem('userOrders') || '[]');
            order = orders.find(o => o.id === orderId);
        }

        if (!order) {
            console.log('showOrderDetails: Заказ не найден', orderId);
            return;
        }

        // Заполняем детали заказа
        fillOrderDetails(order);

        // Показываем окно деталей заказа
        const popup = document.getElementById('orderDetailsPopup');
        if (popup) {
            popup.style.display = 'flex';
        }

        console.log('showOrderDetails: Показано окно деталей заказа', orderId);

    } catch (error) {
        console.error('showOrderDetails: Ошибка показа деталей заказа', error);
    }
}

// Функция заполнения деталей заказа в окне
function fillOrderDetails(order) {
    try {
        console.log('fillOrderDetails: Заполнение деталей заказа', order.id);
        console.log('fillOrderDetails: полный объект заказа:', order);

        // Переводим заголовки в зависимости от языка
        const lang = getCurrentLanguage ? getCurrentLanguage() : (localStorage.getItem('selectedLanguage') || 'uk');

        // Заполняем заголовок с переводом
        const titleEl = document.getElementById('orderDetailsTitle');
        if (titleEl) {
            let orderTitle = 'Заказ';
            if (lang === 'uk') orderTitle = 'Замовлення';
            else if (lang === 'en') orderTitle = 'Order';
            titleEl.textContent = `${orderTitle} ${order.id}`;

            // Заполняем дату и статус в заголовке
            const headerDateEl = document.getElementById('orderHeaderDate');
            const headerStatusEl = document.getElementById('orderHeaderStatus');
            if (headerDateEl) {
                try {
                headerDateEl.textContent = new Date(order.date).toLocaleDateString();
                } catch (e) {
                    headerDateEl.textContent = order.date || '-';
                }
            }
            if (headerStatusEl) {
                headerStatusEl.textContent = getOrderStatusText(order.status);
            }
        }

        // Заголовок "Информация о заказе"
        const infoHeader = document.querySelector('.order-info-section h4');
        if (infoHeader) {
            let infoTitle = 'Информация о заказе';
            if (lang === 'uk') infoTitle = 'Інформація про замовлення';
            else if (lang === 'en') infoTitle = 'Order Information';
            infoHeader.textContent = infoTitle;
        }

        // Заголовок "Заказанные товары"
        const itemsHeader = document.querySelector('.order-items-section h4');
        if (itemsHeader) {
            let itemsTitle = 'Заказанные товары';
            if (lang === 'uk') itemsTitle = 'Замовлені товари';
            else if (lang === 'en') itemsTitle = 'Ordered items';
            itemsHeader.textContent = itemsTitle;
        }

        // Обновляем метки стоимости товаров с использованием переводов
        const itemsCostElement = document.querySelector('#orderItemsTotal');
        if (itemsCostElement) {
            const itemsCostLabel = itemsCostElement.previousElementSibling;
        if (itemsCostLabel) {
                itemsCostLabel.textContent = getTranslation('step1ItemsSubtotal', lang);
            }
        }

        // Метка скидки будет обновлена ниже вместе с установкой значения

        // Метка товаров после скидки будет обновлена ниже вместе с установкой значения

        // Переводим метки полей в блоке информации о заказе
        const paymentElement = document.querySelector('#orderDetailPayment');
        if (paymentElement) {
            const paymentLabel = paymentElement.previousElementSibling;
        if (paymentLabel) {
            let paymentTitle = 'Способ оплаты:';
            if (lang === 'uk') paymentTitle = 'Спосіб оплати:';
            else if (lang === 'en') paymentTitle = 'Payment method:';
            paymentLabel.textContent = paymentTitle;
            }
        }

        const deliveryElement = document.querySelector('#orderDetailDelivery');
        if (deliveryElement) {
            const deliveryLabel = deliveryElement.previousElementSibling;
        if (deliveryLabel) {
            let deliveryTitle = 'Способ доставки:';
            if (lang === 'uk') deliveryTitle = 'Спосіб доставки:';
            else if (lang === 'en') deliveryTitle = 'Delivery method:';
            deliveryLabel.textContent = deliveryTitle;
            }
        }

        // Метка промежуточного итога будет обновлена ниже вместе с установкой значения

        const nameElement = document.querySelector('#orderDetailName');
        if (nameElement) {
            const nameLabel = nameElement.previousElementSibling;
        if (nameLabel) {
            let nameTitle = 'Прізвище та ім\'я:';
            if (lang === 'ru') nameTitle = 'ФИО:';
            else if (lang === 'en') nameTitle = 'Full name:';
            nameLabel.textContent = nameTitle;
            }
        }

        const phoneElement = document.querySelector('#orderDetailPhone');
        if (phoneElement) {
            const phoneLabel = phoneElement.previousElementSibling;
        if (phoneLabel) {
            let phoneTitle = 'Телефон:';
            if (lang === 'uk') phoneTitle = 'Телефон:';
            else if (lang === 'en') phoneTitle = 'Phone:';
            phoneLabel.textContent = phoneTitle;
            }
        }

        const settlementElement = document.querySelector('#orderDetailSettlement');
        if (settlementElement) {
            const settlementLabel = settlementElement.previousElementSibling;
        if (settlementLabel) {
            let settlementTitle = 'Населённый пункт:';
            if (lang === 'uk') settlementTitle = 'Населений пункт:';
            else if (lang === 'en') settlementTitle = 'Settlement:';
            settlementLabel.textContent = settlementTitle;
            }
        }

        const deliveryBranchElement = document.querySelector('#orderDetailBranch');
        if (deliveryBranchElement) {
            const deliveryBranchLabel = deliveryBranchElement.previousElementSibling;
        if (deliveryBranchLabel) {
            let branchTitle = 'Адрес доставки:';
            if (lang === 'uk') branchTitle = 'Адреса доставки:';
            else if (lang === 'en') branchTitle = 'Delivery address:';
            deliveryBranchLabel.textContent = branchTitle;
            }
        }

        // Переводим метку для поля времени самовывоза
        const pickupTimeElement = document.querySelector('#orderDetailPickupTime');
        if (pickupTimeElement) {
            const pickupTimeLabel = pickupTimeElement.previousElementSibling;
            if (pickupTimeLabel) {
                let pickupTimeTitle = 'Время самовывоза:';
                if (lang === 'uk') pickupTimeTitle = 'Точный час самовивозу:';
                else if (lang === 'en') pickupTimeTitle = 'Pickup time:';
                pickupTimeLabel.textContent = pickupTimeTitle;
            }
        }

        const commentElement = document.querySelector('#orderDetailComment');
        if (commentElement) {
            const commentLabel = commentElement.previousElementSibling;
        if (commentLabel) {
            let commentTitle = 'Комментарий:';
            if (lang === 'uk') commentTitle = 'Коментар:';
            else if (lang === 'en') commentTitle = 'Comment:';
            commentLabel.textContent = commentTitle;
            }
        }

        // Заполняем информацию о заказе
        const paymentEl = document.getElementById('orderDetailPayment');
        const deliveryEl = document.getElementById('orderDetailDelivery');
        const commentEl = document.getElementById('orderDetailComment');

        console.log('fillOrderDetails: Заполнение основных полей заказа');
        console.log('fillOrderDetails: paymentEl найден:', !!paymentEl);
        console.log('fillOrderDetails: deliveryEl найден:', !!deliveryEl);
        console.log('fillOrderDetails: commentEl найден:', !!commentEl);
        console.log('fillOrderDetails: order.paymentMethod:', order.paymentMethod);
        console.log('fillOrderDetails: order.deliveryMethod:', order.deliveryMethod);
        console.log('fillOrderDetails: order.comment:', order.comment);

        if (paymentEl) {
            paymentEl.textContent = getPaymentMethodText(order.paymentMethod) || '-';
            console.log('fillOrderDetails: paymentEl.textContent set to:', paymentEl.textContent);
        }
        if (deliveryEl) {
            const deliveryText = getDeliveryMethodText(order.deliveryMethod) || '-';
            deliveryEl.textContent = deliveryText;
            console.log('fillOrderDetails: deliveryEl.textContent set to:', deliveryText);
            console.log('fillOrderDetails: deliveryMethod from order:', order.deliveryMethod);
            console.log('fillOrderDetails: deliveryMethod type:', typeof order.deliveryMethod);
        }

        // Заполняем комментарий
        if (commentEl) commentEl.textContent = order.comment || '-';

        // Управляем отображением поля времени самовывоза
        const pickupTimeRow = document.getElementById('orderDetailPickupTimeRow');

        if (order.deliveryMethod === 'pickup') {
            // Показываем поле времени самовывоза
            if (pickupTimeRow) {
                pickupTimeRow.style.display = 'block';
                const pickupTimeEl = document.getElementById('orderDetailPickupTime');
                if (pickupTimeEl) {
                    pickupTimeEl.textContent = order.pickupTime || '-';
                    console.log('fillOrderDetails: pickupTime set to:', pickupTimeEl.textContent);
                }
            }

            // Показываем только комментарий пользователя в поле комментария
            if (commentEl) commentEl.textContent = order.comment || '-';
        } else {
            // Скрываем поле времени самовывоза для других способов доставки
            if (pickupTimeRow) pickupTimeRow.style.display = 'none';

            // Показываем только комментарий пользователя
            if (commentEl) commentEl.textContent = order.comment || '-';
        }

        // Используем сохраненные суммы из объекта заказа
        const itemsTotal = order.itemsTotal || 0; // Сумма товаров со скидками
        const itemsDiscount = order.itemsDiscount || 0; // Скидка на товары
        const subtotal = order.subtotal || itemsTotal; // Сумма товаров без скидок
        const deliveryCost = order.deliveryCost || 0; // Стоимость доставки из заказа
        let bonusesUsed = order.bonusesUsed || 0; // Количество использованных бонусов
        const bonusDiscount = order.bonusDiscount || 0; // Сумма скидки по бонусам

        // Для гостей бонусы не должны отображаться
        if (!window.__authState || !window.__authState.isAuthenticated) {
            bonusesUsed = 0;
        }

        const couponDiscount = order.couponDiscount || 0; // Сумма скидки по купону
        const finalTotal = order.finalTotal || 0; // Итоговая сумма из заказа

        console.log('fillOrderDetails: Используем сохраненные суммы из заказа');
        console.log('fillOrderDetails: subtotal:', subtotal, 'itemsDiscount:', itemsDiscount, 'itemsTotal:', itemsTotal);
        console.log('fillOrderDetails: deliveryCost:', deliveryCost, 'bonusesUsed:', bonusesUsed, 'couponDiscount:', couponDiscount);
        console.log('fillOrderDetails: finalTotal:', finalTotal);
        console.log('fillOrderDetails: order object:', order);

        // Шаг 1: Сумма товаров без скидок (промежуточный итог товаров)
        const itemsTotalEl = document.getElementById('orderItemsTotal');
        if (itemsTotalEl) itemsTotalEl.textContent = `${subtotal} ${getCurrencyWithDot()}`;

        // Шаг 2: Скидка на товары (если есть)
        const discountRow = document.getElementById('orderDiscountRow');
        const discountEl = document.getElementById('orderDiscount');
        if (itemsDiscount > 0) {
            if (discountRow) discountRow.style.display = 'flex';
            if (discountEl) {
                discountEl.textContent = `-${itemsDiscount} ${getCurrencyWithDot()}`;
                // Обновляем метку перевода
                const discountLabel = discountEl.previousElementSibling;
                if (discountLabel) {
                    discountLabel.textContent = getTranslation('step2ItemsDiscount', lang);
                }
            }
        } else {
            if (discountRow) discountRow.style.display = 'none';
        }

        // Шаг 3: Стоимость товаров со скидками
        const itemsAfterDiscountEl = document.getElementById('orderItemsAfterDiscount');
        const itemsAfterDiscountRow = document.getElementById('orderItemsAfterDiscountRow');
        if (itemsAfterDiscountEl) {
            itemsAfterDiscountEl.textContent = `${itemsTotal} ${getCurrencyWithDot()}`;
            // Обновляем метку перевода
            const itemsAfterDiscountLabel = itemsAfterDiscountEl.previousElementSibling;
            if (itemsAfterDiscountLabel) {
                itemsAfterDiscountLabel.textContent = getTranslation('step3ItemsAfterDiscount', lang);
            }
        }
        if (itemsAfterDiscountRow) itemsAfterDiscountRow.style.display = 'flex';

        // Шаг 4: Купон
        const couponRow = document.getElementById('orderCouponRow');
        const couponTotalEl = document.getElementById('orderCouponTotal');

        console.log('fillOrderDetails: Шаг 4 - Купон');
        console.log('fillOrderDetails: couponDiscount:', couponDiscount, 'type:', typeof couponDiscount);
        console.log('fillOrderDetails: couponRow:', couponRow, 'exists:', !!couponRow);
        console.log('fillOrderDetails: couponTotalEl:', couponTotalEl, 'exists:', !!couponTotalEl);
        console.log('fillOrderDetails: order.couponCode:', order.couponCode);
        console.log('fillOrderDetails: order.couponDiscount:', order.couponDiscount);
        console.log('fillOrderDetails: condition check - couponDiscount > 0:', couponDiscount > 0);
        console.log('fillOrderDetails: condition check - all:', couponDiscount > 0 && couponRow && couponTotalEl);

        if (couponDiscount > 0 && couponRow && couponTotalEl) {
            couponRow.style.display = 'flex';
            couponTotalEl.textContent = `-${couponDiscount} ${getCurrencyWithDot()}`;

            // Перевод метки купона
            const couponLabel = couponRow.querySelector('.order-total-label');
            if (couponLabel) {
                const couponText = order.couponCode ? `4. Купон ${order.couponCode}:` : '4. Купон:';
                couponLabel.textContent = couponText;
            }

            console.log('fillOrderDetails: Показываем строку с купоном');
        } else {
            console.log('fillOrderDetails: НЕ показываем строку с купоном');
            if (couponRow) {
            couponRow.style.display = 'none';
            }
        }

        // Шаг 5: Бонусы
        const bonusesRow = document.getElementById('orderBonusesRow');
        const bonusesTotalEl = document.getElementById('orderBonusesTotal');

        if (bonusDiscount > 0 && bonusesRow && bonusesTotalEl) {
            bonusesRow.style.display = 'flex';
            bonusesTotalEl.textContent = `-${bonusDiscount} ${getCurrencyWithDot()}`;

            // Перевод метки бонусов
            const bonusesLabel = bonusesRow.querySelector('.order-total-label');
            if (bonusesLabel) {
                bonusesLabel.textContent = '5. Бонусы:';
            }

            console.log('fillOrderDetails: Показываем строку с бонусами, скидка:', bonusDiscount);
        } else if (bonusesRow) {
            bonusesRow.style.display = 'none';
        }

        // Шаг 6: Стоимость доставки (только если > 0)
        const deliveryCostElement = document.getElementById('orderDeliveryCost');
        const deliveryCostRow = document.getElementById('orderDeliveryCostRow');
        console.log('fillOrderDetails: deliveryCost check:', deliveryCost, 'deliveryMethod:', order.deliveryMethod);
        if (deliveryCostElement && deliveryCost > 0) {
            deliveryCostElement.textContent = `${deliveryCost} ${getCurrencyWithDot()}`;
            // Обновляем метку доставки
            const deliveryCostLabel = deliveryCostElement.previousElementSibling;
            if (deliveryCostLabel) {
                deliveryCostLabel.textContent = '6. Вартість доставки:';
            }
            if (deliveryCostRow) deliveryCostRow.style.display = 'flex';
            console.log('fillOrderDetails: Показали строку доставки с cost:', deliveryCost);
        } else {
            // Скрываем строку доставки, если стоимость = 0
            if (deliveryCostRow) deliveryCostRow.style.display = 'none';
            console.log('fillOrderDetails: Скрыли строку доставки, cost = 0 или элемент не найден');
        }

        // Определяем номер шага для итоговой суммы в зависимости от того, показывается ли доставка
        const finalStepNumber = deliveryCost > 0 ? 7 : 6;

        // Скрываем промежуточный итог
        const subtotalRow = document.getElementById('orderSubtotalRow');
        if (subtotalRow) {
            subtotalRow.style.display = 'none';
        }

        // Шаг N: Итоговая сумма
        const finalTotalEl = document.getElementById('orderFinalTotal');
        const finalTotalLabel = finalTotalEl ? finalTotalEl.previousElementSibling : null;

        if (finalTotalLabel) {
            finalTotalLabel.textContent = `${finalStepNumber}. Загальна сума:`;
        }

        if (finalTotalEl) finalTotalEl.textContent = `${finalTotal} ${getCurrencyWithDot()}`;

        console.log('fillOrderDetails: Итоговый расчет - itemsTotal:', itemsTotal, 'deliveryCost:', deliveryCost, 'bonusesUsed:', bonusesUsed, 'couponDiscount:', couponDiscount, 'finalTotal:', finalTotal);

        // Добавляем информацию о начисленных бонусах за этот заказ
        const bonusEarned = Math.round(finalTotal * 0.01);
        if (bonusEarned > 0) {
            // Создаем строку для начисленных бонусов, если ее нет
            let bonusEarnedRow = document.getElementById('orderBonusEarnedRow');
            if (!bonusEarnedRow) {
                const totalSection = document.querySelector('.order-total-section');
                const finalRow = document.querySelector('.order-total-final');

                bonusEarnedRow = document.createElement('div');
                bonusEarnedRow.id = 'orderBonusEarnedRow';
                bonusEarnedRow.className = 'order-total-row';
                // Переводим текст "Бонусы за заказ" в зависимости от языка
                let bonusEarnedText = getTranslation('step8EarnedBonuses', lang);

                bonusEarnedRow.innerHTML = `
                    <span class="order-total-label">${bonusEarnedText}</span>
                    <span class="order-total-value" id="orderBonusEarnedTotal">+${bonusEarned}</span>
                `;

                // Вставляем перед итоговой строкой
                totalSection.insertBefore(bonusEarnedRow, finalRow);
            } else {
                document.getElementById('orderBonusEarnedTotal').textContent = `+${bonusEarned}`;
            }
        }

        // Показываем/скрываем поле области для Укрпошты
        const regionRow = document.getElementById('orderDetailRegionRow');
        if (regionRow) {
            regionRow.style.display = order.deliveryMethod === 'ukrposhta' ? 'block' : 'none';
        }

        // Заполняем данные покупателя
        const nameEl = document.getElementById('orderDetailName');
        const phoneEl = document.getElementById('orderDetailPhone');
        const settlementEl = document.getElementById('orderDetailSettlement');
        const regionEl = document.getElementById('orderDetailRegion');

        console.log('fillOrderDetails: customer data:', order.customer);
        console.log('fillOrderDetails: DOM elements found - nameEl:', !!nameEl, 'phoneEl:', !!phoneEl, 'settlementEl:', !!settlementEl, 'regionEl:', !!regionEl);
        console.log('fillOrderDetails: order object keys:', Object.keys(order));
        console.log('fillOrderDetails: order.customer keys:', order.customer ? Object.keys(order.customer) : 'no customer');

        // Принудительно создаем элементы, если они не найдены
        if (!nameEl) {
            console.log('fillOrderDetails: nameEl not found, creating...');
            const nameRow = document.querySelector('.order-info-section .info-row:nth-child(1)');
            if (nameRow) {
                const valueEl = nameRow.querySelector('.info-value') || nameRow.querySelector('span:last-child');
                if (valueEl) {
                    valueEl.textContent = order.customer?.name || '-';
                    console.log('fillOrderDetails: name set via alternative method:', valueEl.textContent);
                }
            }
        } else {
            nameEl.textContent = order.customer?.name || '-';
            console.log('fillOrderDetails: name set to:', nameEl.textContent);
        }

        if (!phoneEl) {
            console.log('fillOrderDetails: phoneEl not found, creating...');
            const phoneRow = document.querySelector('.order-info-section .info-row:nth-child(2)');
            if (phoneRow) {
                const valueEl = phoneRow.querySelector('.info-value') || phoneRow.querySelector('span:last-child');
                if (valueEl) {
                    valueEl.textContent = order.customer?.phone || '-';
                    console.log('fillOrderDetails: phone set via alternative method:', valueEl.textContent);
                }
            }
        } else {
            phoneEl.textContent = order.customer?.phone || '-';
            console.log('fillOrderDetails: phone set to:', phoneEl.textContent);
        }

        if (!settlementEl) {
            console.log('fillOrderDetails: settlementEl not found, creating...');
            const settlementRow = document.querySelector('.order-info-section .info-row:nth-child(3)');
            if (settlementRow) {
                const valueEl = settlementRow.querySelector('.info-value') || settlementRow.querySelector('span:last-child');
                if (valueEl) {
                    valueEl.textContent = order.customer?.settlement || '-';
                    console.log('fillOrderDetails: settlement set via alternative method:', valueEl.textContent);
                }
            }
        } else {
            settlementEl.textContent = order.customer?.settlement || '-';
            console.log('fillOrderDetails: settlement set to:', settlementEl.textContent);
        }

        if (!regionEl) {
            console.log('fillOrderDetails: regionEl not found, creating...');
            const regionRow = document.querySelector('.order-info-section .info-row:nth-child(4)');
            if (regionRow) {
                const valueEl = regionRow.querySelector('.info-value') || regionRow.querySelector('span:last-child');
                if (valueEl) {
                    valueEl.textContent = order.customer?.region || '-';
                    console.log('fillOrderDetails: region set via alternative method:', valueEl.textContent);
                }
            }
        } else {
            regionEl.textContent = order.customer?.region || '-';
            console.log('fillOrderDetails: region set to:', regionEl.textContent);
        }

        // Изменяем метку для branch в зависимости от способа доставки и языка
        const branchLabel = document.querySelector('#orderDetailBranch').previousElementSibling;
        let branchLabelText = 'Номер отделения';

        // Для самовывоза меняем метку на "Адрес самовывоза"
        if (order.deliveryMethod === 'pickup') {
            branchLabelText = 'Адрес самовывоза';
            if (lang === 'uk') branchLabelText = 'Адреса самовивозу';
            else if (lang === 'en') branchLabelText = 'Pickup address';
        } else if (order.deliveryMethod === 'ukrposhta') {
            // Для Укрпошты меняем метку на "Индекс"
            branchLabelText = 'Индекс';
            if (lang === 'uk') branchLabelText = 'Індекс';
            else if (lang === 'en') branchLabelText = 'Index';
        } else {
            if (lang === 'uk') branchLabelText = 'Номер відділення';
            else if (lang === 'en') branchLabelText = 'Branch number';
        }

        if (branchLabel) branchLabel.textContent = branchLabelText + ':';

        const branchEl = document.getElementById('orderDetailBranch');
        if (branchEl) {
            if (order.deliveryMethod === 'pickup') {
                // Для самовывоза показываем адрес
                branchEl.textContent = 'Троїцька кут Канатної, місце зустрічі біля входу в "китайське кафе" по Троїцькій.';
            } else if (order.deliveryMethod === 'ukrposhta') {
                // Для Укрпочты показываем индекс в поле branch (так как поле переименовано)
                branchEl.textContent = order.customer?.index || '-';
            } else {
                // Для других способов доставки показываем номер отделения
                branchEl.textContent = order.customer?.branch || '-';
            }
        }

        // Для Укрпочты индекс показывается в поле branch, поэтому скрываем отдельное поле индекса
        const indexRow = document.getElementById('orderDetailIndexRow');
        if (indexRow) {
            indexRow.style.display = 'none';
            console.log('fillOrderDetails: Скрыли отдельное поле индекса для всех способов доставки');
        }


        // Заполняем список товаров
        console.log('fillOrderDetails: items data:', order.items);
        fillOrderItems(order.items || []);

        console.log('fillOrderDetails: Детали заказа заполнены');

    } catch (error) {
        console.error('fillOrderDetails: Ошибка заполнения деталей заказа', error);
    }
}

// Функция заполнения списка товаров в заказе
function fillOrderItems(items) {
    try {
        console.log('fillOrderItems: Начинаем заполнение товаров, items:', items);
        const container = document.getElementById('orderItemsList');
        console.log('fillOrderItems: container найден:', !!container);

        if (!container) {
            console.log('fillOrderItems: container не найден, выходим');
            return;
        }

        container.innerHTML = '';

        if (items.length === 0) {
            console.log('fillOrderItems: Нет товаров в заказе');
            container.innerHTML = '<div class="empty-order-items">Нет товаров в заказе</div>';
            return;
        }

        console.log('fillOrderItems: Обработка', items.length, 'товаров');

        items.forEach((item, index) => {
            console.log('fillOrderItems: Обработка товара', index + 1, ':', item);

            const itemEl = document.createElement('div');
            itemEl.className = 'order-item';

            const imageUrl = item.image || item.photo || '/static/images/no-image.png';
            const name = item.name || item.title || 'Без названия';
            const quantity = item.quantity || 1;
            const newPrice = parseInt(item.newPrice || item.price || 0);
            const oldPrice = parseInt(item.oldPrice || 0);
            const total = newPrice * quantity;

            console.log('fillOrderItems: Товар', index + 1, 'данные:', { name, quantity, newPrice, oldPrice, total });

            // Проверяем, есть ли скидка (старая цена отличается от новой)
            const hasDiscount = oldPrice && oldPrice > 0 && oldPrice !== newPrice;

            itemEl.innerHTML = `
                <img src="${imageUrl}" alt="${name}" class="order-item-image" onerror="this.src='/static/images/no-image.png'">
                <div class="order-item-details">
                    <div class="order-item-name">${name}</div>
                    <div class="order-item-meta">${quantity} шт. × ${newPrice} ${getCurrencyWithDot()}</div>
                </div>
                <div class="order-item-price">
                    ${hasDiscount ? `<div class="order-item-old-price">${(oldPrice * quantity).toFixed(0)} ${getCurrencyWithDot()}</div>` : ''}
                    <div class="order-item-current-price">${total} ${getCurrencyWithDot()}</div>
                </div>
            `;

            container.appendChild(itemEl);
            console.log('fillOrderItems: Товар', index + 1, 'добавлен в контейнер');
        });

        console.log('fillOrderItems: Список товаров заполнен', items.length);
        console.log('fillOrderItems: Количество элементов в контейнере:', container.children.length);

    } catch (error) {
        console.error('fillOrderItems: Ошибка заполнения списка товаров', error);
    }
}

// Функция получения текста способа оплаты
function getPaymentMethodText(method) {
    const lang = getCurrentLanguage ? getCurrentLanguage() : (localStorage.getItem('selectedLanguage') || 'uk');

    if (lang === 'uk') {
    const translations = {
            'wayforpay': 'WayForPay (Visa, Mastercard) +2%',
            'privat24': 'Приват 24',
            'terminal': 'Термінал Приватбанку',
            'meeting': 'Під час зустрічі в Одесі'
        };
        return translations[method] || method || '-';
    } else if (lang === 'en') {
        const translations = {
            'wayforpay': 'WayForPay (Visa, Mastercard) +2%',
            'privat24': 'Privat 24',
            'terminal': 'PrivatBank Terminal',
            'meeting': 'Upon meeting in Odesa'
        };
        return translations[method] || method || '-';
    } else {
    const translations = {
        'wayforpay': 'WayForPay (Visa, Mastercard) +2%',
        'privat24': 'Приват 24',
        'terminal': 'Терминал Приватбанку',
        'meeting': 'При встрече в Одессе'
    };
    return translations[method] || method || '-';
    }
}

// Функция получения текста способа доставки
function getDeliveryMethodText(method) {
    const lang = getCurrentLanguage ? getCurrentLanguage() : (localStorage.getItem('selectedLanguage') || 'uk');

    if (lang === 'uk') {
    const translations = {
            'nova': 'Nova Пошта',
            'meest': 'Meest Express',
            'ukrposhta': 'УКРПОШТА',
            'pickup': 'Самовивіз',
            'free1001': 'Безкоштовна доставка від 1001грн',
            'free2000': 'Безкоштовна доставка від 2000грн'
        };
        return translations[method] || method || '-';
    } else if (lang === 'en') {
        const translations = {
            'nova': 'Nova Poshta',
            'meest': 'Meest Express',
            'ukrposhta': 'UKRPOST',
            'pickup': 'Pickup',
            'free1001': 'Free delivery from 1001 UAH',
            'free2000': 'Free delivery from 2000 UAH'
        };
        return translations[method] || method || '-';
    } else {
    const translations = {
        'nova': 'Nova Пошта',
        'meest': 'Meest Express',
        'ukrposhta': 'УКРПОЧТА',
        'pickup': 'Самовывоз',
        'free1001': 'Бесплатная доставка от 1001грн',
        'free2000': 'Бесплатная доставка от 2000грн'
    };
    return translations[method] || method || '-';
    }
}

// Функция расчета стоимости доставки
function calculateDeliveryCost(deliveryMethod, orderTotal) {
    // Логика расчета стоимости доставки
    if (deliveryMethod === 'pickup') return 0;
    if (deliveryMethod === 'free1001' && orderTotal >= 1001) return 0;
    if (deliveryMethod === 'free2000' && orderTotal >= 2000) return 0;
    if (deliveryMethod === 'ukrposhta') return 80;
    // Для Nova и Meest доставка бесплатная
    if (deliveryMethod === 'nova') return 0;
    if (deliveryMethod === 'meest') return 0;

    // Для неизвестных методов доставки - возвращаем 0
    console.log('calculateDeliveryCost: Неизвестный метод доставки:', deliveryMethod);
    return 0;
}

// Функция расчета комиссии оплаты
function calculatePaymentFee(paymentMethod, orderTotal) {
    // Логика расчета комиссии оплаты
    if (paymentMethod === 'wayforpay') return Math.round(orderTotal * 0.02); // 2%
    if (paymentMethod === 'privat24') return 0; // Без комиссии
    if (paymentMethod === 'terminal') return 0; // Предоплата
    if (paymentMethod === 'meeting') return 0; // При встрече

    return 0;
}

// Функция закрытия окна подтверждения заказа и перехода на страницу товаров
function closeOrderAcceptedPopup() {
    try {
        console.log('closeOrderAcceptedPopup: Закрытие окна подтверждения и переход на товары');

        // Закрываем окно подтверждения
        closePopup('orderAcceptedPopup');

        // Переходим на страницу товаров
        showProductsView();
        setActiveBottomNav('products');

        console.log('closeOrderAcceptedPopup: Окно закрыто, переход выполнен');

    } catch (error) {
        console.error('closeOrderAcceptedPopup: Ошибка закрытия окна', error);
    }
}

// Функция обновления текста кнопки оплаты
function updatePaymentButtonText() {
    try {
        const paymentMethodSelect = document.getElementById('paymentMethodSelect');
        const deliveryMethodSelect = document.getElementById('deliveryMethodSelect');
        const payButton = document.querySelector('.cart-actions .btn-pay span[data-translate="pay"]');

        console.log('updatePaymentButtonText: paymentMethodSelect найден:', !!paymentMethodSelect);
        console.log('updatePaymentButtonText: payButton найден:', !!payButton);

        // Если не нашли кнопку по селектору, попробуем найти по другому пути
        let payButtonAlt = payButton;
        if (!payButton) {
            payButtonAlt = document.querySelector('.cart-actions .btn-pay');
            console.log('updatePaymentButtonText: Альтернативный поиск кнопки:', !!payButtonAlt);
            if (payButtonAlt) {
                // Создаем span элемент для текста, если его нет
                let textSpan = payButtonAlt.querySelector('span[data-translate="pay"]');
                if (!textSpan) {
                    textSpan = document.createElement('span');
                    textSpan.setAttribute('data-translate', 'pay');
                    payButtonAlt.insertBefore(textSpan, payButtonAlt.firstChild);
                    console.log('updatePaymentButtonText: Создан span элемент для текста');
                }
                payButton = textSpan;
            }
        }

        if (!paymentMethodSelect || !payButton) {
            console.log('updatePaymentButtonText: Возврат из-за отсутствия элементов');
            return;
        }

        const selectedPayment = paymentMethodSelect.value;
        const selectedDelivery = deliveryMethodSelect ? deliveryMethodSelect.value : '';
        const lang = getCurrentLanguage ? getCurrentLanguage() : (localStorage.getItem('selectedLanguage') || 'uk');

        // Логика определения текста кнопки по способу оплаты:
        // 1. Если оплата при встрече - "Отправить заказ"
        // 2. Для всех других способов оплаты - "Оплатить"
        if (selectedPayment === 'meeting') {
            payButton.textContent = window.translations ? window.translations.getTranslation('sendOrder', lang) : 'ОТПРАВИТЬ ЗАКАЗ';
        } else {
            // Иначе показываем "Оплатить"
            payButton.textContent = window.translations ? window.translations.getTranslation('pay', lang) : 'ОПЛАТИТЬ';
        }

        console.log('updatePaymentButtonText: Обновлен текст кнопки оплаты для способа оплаты:', selectedPayment, 'и доставки:', selectedDelivery);

    } catch (error) {
        console.error('updatePaymentButtonText: Ошибка обновления текста кнопки', error);
    }
}

// Функция печати заказа
function printOrder() {
    try {
        console.log('printOrder: Печать заказа');

        // Получаем текущий язык
        const lang = getCurrentLanguage();

        // Получаем текущий заказ из открытого окна
        const orderTitle = document.getElementById('orderDetailsTitle');
        let orderId = 'Unknown';
        if (orderTitle) {
            // Учитываем переводы: "Заказ", "Замовлення", "Order"
            const titleText = orderTitle.textContent;
            if (titleText.includes('Заказ ')) {
                orderId = titleText.replace('Заказ ', '');
            } else if (titleText.includes('Замовлення ')) {
                orderId = titleText.replace('Замовлення ', '');
            } else if (titleText.includes('Order ')) {
                orderId = titleText.replace('Order ', '');
            }
        }

        // Создаем новое окно для печати
        const printWindow = window.open('', '_blank', 'width=800,height=600');

        // Получаем данные заказа
        const orders = JSON.parse(localStorage.getItem('userOrders') || '[]');
        const order = orders.find(o => o.id === orderId);

        if (!order) {
            alert('Заказ не найден');
            return;
        }

        // Переводы для печати
        const translations = {
            title: lang === 'uk' ? `Замовлення ${order.id}` : lang === 'en' ? `Order ${order.id}` : `Заказ ${order.id}`,
            orderInfo: lang === 'uk' ? 'Інформація про замовлення:' : lang === 'en' ? 'Order Information:' : 'Информация о заказе:',
            paymentMethod: lang === 'uk' ? 'Спосіб оплати:' : lang === 'en' ? 'Payment method:' : 'Способ оплаты:',
            deliveryMethod: lang === 'uk' ? 'Спосіб доставки:' : lang === 'en' ? 'Delivery method:' : 'Способ доставки:',
            status: lang === 'uk' ? 'Статус:' : lang === 'en' ? 'Status:' : 'Статус:',
            customerData: lang === 'uk' ? 'Дані покупця:' : lang === 'en' ? 'Customer data:' : 'Данные покупателя:',
            fullName: lang === 'uk' ? 'ПІБ:' : lang === 'en' ? 'Full name:' : 'ФИО:',
            phone: lang === 'uk' ? 'Телефон:' : lang === 'en' ? 'Phone:' : 'Телефон:',
            settlement: lang === 'uk' ? 'Населений пункт:' : lang === 'en' ? 'Settlement:' : 'Населённый пункт:',
            comment: lang === 'uk' ? 'Коментар:' : lang === 'en' ? 'Comment:' : 'Комментарий:',
            date: lang === 'uk' ? 'Дата:' : lang === 'en' ? 'Date:' : 'Дата:',
            items: lang === 'uk' ? 'Замовлені товари:' : lang === 'en' ? 'Ordered items:' : 'Заказанные товары:',
            itemTotal: lang === 'uk' ? 'шт. ×' : lang === 'en' ? 'pcs ×' : 'шт. ×',
            noName: lang === 'uk' ? 'Без назви' : lang === 'en' ? 'No name' : 'Без названия',
            itemsCost: lang === 'uk' ? 'Вартість товарів:' : lang === 'en' ? 'Items cost:' : 'Стоимость товаров:',
            deliveryCost: lang === 'uk' ? 'Вартість доставки:' : lang === 'en' ? 'Delivery cost:' : 'Стоимость доставки:',
            usedBonuses: lang === 'uk' ? 'Використані бонуси:' : lang === 'en' ? 'Used bonuses:' : 'Использованные бонусы:',
            total: lang === 'uk' ? 'Разом:' : lang === 'en' ? 'Total:' : 'Итого:'
        };

        // Определяем метки для полей в зависимости от способа доставки
        let branchLabel = lang === 'uk' ? 'Номер відділення:' : lang === 'en' ? 'Branch number:' : 'Номер отделения:';
        let regionLabel = lang === 'uk' ? 'Область:' : lang === 'en' ? 'Region:' : 'Область:';
        let indexLabel = lang === 'uk' ? 'Індекс:' : lang === 'en' ? 'Index:' : 'Индекс:';

        // Создаем HTML для печати
        const printHTML = `
            <!DOCTYPE html>
            <html>
            <head>
                <title>${translations.title}</title>
                <meta charset="UTF-8">
                <style>
                    body { font-family: Arial, sans-serif; margin: 20px; }
                    .header { text-align: center; margin-bottom: 30px; border-bottom: 2px solid #333; padding-bottom: 20px; }
                    .order-info { margin-bottom: 20px; }
                    .order-info div { margin-bottom: 5px; }
                    .items { margin-top: 20px; }
                    .item { display: flex; justify-content: space-between; padding: 10px 0; border-bottom: 1px solid #ddd; }
                    .total { font-weight: bold; font-size: 1.2em; margin-top: 20px; text-align: right; }
                    @media print { body { margin: 0; } }
                </style>
            </head>
            <body>
                <div class="header">
                    <h1>GuitarStrings.com.ua</h1>
                    <h2>${translations.title}</h2>
                    <p>${translations.date} ${new Date(order.date).toLocaleDateString()}</p>
                </div>

                <div style="display: flex; gap: 40px; margin-bottom: 30px;">
                    <div style="flex: 1;">
                        <div class="order-info">
                            <h3>${translations.orderInfo}</h3>
                            <div>${translations.paymentMethod} ${getPaymentMethodText(order.paymentMethod)}</div>
                            <div>${translations.deliveryMethod} ${getDeliveryMethodText(order.deliveryMethod)}</div>
                            <div>${translations.status} ${getOrderStatusText(order.status)}</div>
                        </div>
                    </div>
                    <div style="flex: 1;">
                        <div class="order-info">
                            <h3>${translations.customerData}</h3>
                            <div>${translations.fullName} ${order.customer.name || '-'}</div>
                            <div>${translations.phone} ${order.customer.phone || '-'}</div>
                            <div>${translations.settlement} ${order.customer.settlement || '-'}</div>
                            ${order.deliveryMethod === 'ukrposhta' ? `
                                <div>${regionLabel} ${order.customer.region || '-'}</div>
                                <div>${indexLabel} ${order.customer.index || '-'}</div>
                            ` : order.deliveryMethod === 'pickup' ? `
                                <div>${lang === 'uk' ? 'Адреса самовивозу:' : lang === 'en' ? 'Pickup address:' : 'Адрес самовывоза:'} Троїцька кут Канатної, місце зустрічі біля входу в "китайське кафе" по Троїцькій.</div>
                                <div>${lang === 'uk' ? 'Точний час самовивозу:' : lang === 'en' ? 'Exact pickup time:' : 'Точное время самовывоза:'} ${order.pickupTime || order.customer.pickupTime || (lang === 'uk' ? 'Не вказано' : lang === 'en' ? 'Not specified' : 'Не указано')}</div>
                            ` : `
                            <div>${branchLabel} ${order.customer.branch || '-'}</div>
                            `}
                            ${order.comment ? `<div>${translations.comment} ${order.comment}</div>` : ''}
                        </div>
                    </div>
                </div>

                <div class="items">
                    <h3>${translations.items}</h3>
                    ${order.items.map(item => {
                        const quantity = item.quantity || 1;
                        const newPrice = parseInt(item.newPrice || item.price || 0);
                        const oldPrice = parseInt(item.oldPrice || 0);
                        const hasDiscount = oldPrice && oldPrice > 0 && oldPrice !== newPrice;
                        const totalPrice = quantity * newPrice;
                        const oldTotalPrice = quantity * oldPrice;

                        return `
                        <div class="item">
                            <div style="display: flex; align-items: center; gap: 10px;">
                                ${item.image || item.photo ? `<img src="${item.image || item.photo}" alt="${item.name || item.title || translations.noName}" style="width: 40px; height: 40px; object-fit: cover; border-radius: 4px;">` : ''}
                                <div>
                                    <div style="font-weight: bold;">${item.name || item.title || translations.noName}</div>
                                    <div style="font-size: 0.9em; color: #666;">${quantity} ${translations.itemTotal} ${newPrice} ${getCurrencyWithDot()}</div>
                                </div>
                            </div>
                            <div style="text-align: right;">
                                ${hasDiscount ? `<div style="color: #666; text-decoration: line-through; font-size: 0.8em;">${oldTotalPrice} ${getCurrencyWithDot()}</div>` : ''}
                                <div style="font-weight: bold; color: #f8a818;">${totalPrice} ${getCurrencyWithDot()}</div>
                        </div>
                        </div>
                        `;
                    }).join('')}
                </div>

                <div style="display: flex; justify-content: flex-end; margin-top: 30px;">
                    <div style="width: 300px; border: 1px solid #ddd; padding: 15px; border-radius: 5px;">
                        ${(() => {
                            let stepNumber = 1;
                            let calculationHTML = '';

                            // Шаг 1: Сумма товаров без скидок
                            calculationHTML += `<div style="display: flex; justify-content: space-between; margin-bottom: 5px;">
                                <span>${stepNumber++}. Вартість товарів:</span>
                                <span>${order.subtotal || order.total || 0} ${getCurrencyWithDot()}</span>
                            </div>`;

                            // Шаг 2: Скидка на товары (если есть)
                            if ((order.itemsDiscount || 0) > 0) {
                                calculationHTML += `<div style="display: flex; justify-content: space-between; margin-bottom: 5px;">
                                    <span>${stepNumber++}. Знижка на товари:</span>
                                    <span>-${order.itemsDiscount} ${getCurrencyWithDot()}</span>
                                </div>`;
                            }

                            // Шаг 3: Стоимость товаров со скидками
                            calculationHTML += `<div style="display: flex; justify-content: space-between; margin-bottom: 5px;">
                                <span>${stepNumber++}. Товари зі знижками:</span>
                                <span>${order.itemsTotal || order.total || 0} ${getCurrencyWithDot()}</span>
                            </div>`;

                            // Шаг 4: Купон
                            if ((order.couponDiscount || 0) > 0) {
                                calculationHTML += `<div style="display: flex; justify-content: space-between; margin-bottom: 5px;">
                                    <span>${stepNumber++}. Купон ${order.couponCode || 'test10'}:</span>
                            <span>-${order.couponDiscount} ${getCurrencyWithDot()}</span>
                                </div>`;
                            }

                            // Шаг 5: Бонусы
                            const bonusDiscount = order.bonusDiscount || order.bonusesUsed || 0;
                            if (bonusDiscount > 0) {
                                calculationHTML += `<div style="display: flex; justify-content: space-between; margin-bottom: 5px;">
                                    <span>${stepNumber++}. Бонусы:</span>
                                    <span>-${bonusDiscount} ${getCurrencyWithDot()}</span>
                                </div>`;
                            }

                            // Шаг 6: Стоимость доставки (только для Укрпочты и если > 0)
                            if (order.deliveryMethod === 'ukrposhta' && (order.deliveryCost || 0) > 0) {
                                calculationHTML += `<div style="display: flex; justify-content: space-between; margin-bottom: 5px;">
                                    <span>${stepNumber++}. Вартість доставки:</span>
                                    <span>${order.deliveryCost || 0} ${getCurrencyWithDot()}</span>
                                </div>`;
                            }

                            // Шаг N: Итоговая сумма
                            calculationHTML += `<div style="display: flex; justify-content: space-between; margin-top: 10px; padding-top: 10px; border-top: 2px solid #f8a818; font-weight: bold; font-size: 1.1em;">
                                <span>${stepNumber}. Загальна сума:</span>
                                <span>${order.finalTotal || order.total || 0} ${getCurrencyWithDot()}</span>
                            </div>`;

                            return calculationHTML;
                        })()}
                    </div>
                </div>
            </body>
            </html>
        `;

        printWindow.document.write(printHTML);
        printWindow.document.close();

        // Ждем загрузки и печатаем
        printWindow.onload = function() {
            printWindow.print();
            printWindow.close();
        };

        console.log('printOrder: Заказ отправлен на печать');

    } catch (error) {
        console.error('printOrder: Ошибка печати заказа', error);
        alert('Ошибка при печати заказа');
    }
}

// Функция продолжения покупок
function continueShopping() {
    try {
        console.log('continueShopping: Продолжение покупок');

        // Закрываем окно деталей заказа
        closePopup('orderDetailsPopup');

        // Переходим на страницу товаров и открываем категорию "Струны для электрогитары"
        // Это то же самое, что делает кнопка "Товары" в футере
        showProductsView();
        setActiveBottomNav('products');

        // Имитируем клик по баннеру "Струны для электрогитары" (главная категория)
        const electricGuitarStrings = document.querySelector('.banner-title');
        if (electricGuitarStrings) {
            // Устанавливаем текущую категорию как "electricGuitarStrings"
            currentCategory = 'electricGuitarStrings';
            lastCategorySearch = 'electricGuitarStrings';

            // Загружаем все товары (главная категория)
            loadProducts();

            console.log('continueShopping: Открыта категория "Струны для электрогитары"');
        }

        console.log('continueShopping: Переход на страницу товаров');

    } catch (error) {
        console.error('continueShopping: Ошибка перехода', error);
    }
}

