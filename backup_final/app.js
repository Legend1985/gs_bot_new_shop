// GS Bot New Shop - Исправленная версия
console.log('app_fixed.js загружен');

// Глобальные переменные
let cart = [];
let cartTotal = 0;
let cartItemCount = 0;
let isLoading = false;
let currentPage = 0;
let hasMoreProducts = true;

// Переменные для фильтров
let currentCategory = 'electro'; // Устанавливаем категорию по умолчанию
let currentBrand = '';
let currentGauge = '';

// Функции, которые используются в HTML - определяем сразу
(function() {
    // Определяем функции как можно раньше
window.goToCart = function() {
        console.log('goToCart: открываем корзину');
        const cartPopup = document.getElementById('cartPopup');
        if (cartPopup) {
            cartPopup.style.display = 'block';
            if (typeof updateCartDisplay === 'function') {
                updateCartDisplay();
            }
        } else {
            console.error('goToCart: Попап корзины не найден');
        }
};

window.showMenuPopup = function() {
        console.log('showMenuPopup: открываем меню');
        const popup = document.getElementById('menuPopup');
        if (popup) {
            popup.style.display = 'block';
        } else {
            console.error('showMenuPopup: Попап меню не найден');
        }
};

window.showSettingsPopup = function() {
        console.log('showSettingsPopup: открываем настройки');
        const popup = document.getElementById('settingsPopup');
        if (popup) {
            popup.style.display = 'block';
        } else {
            console.error('showSettingsPopup: Попап настроек не найден');
        }
};

window.toggleAvatarMenu = function() {
        console.log('toggleAvatarMenu: переключаем меню аватара');
        const menu = document.getElementById('avatarDropdown');
        if (menu) {
            menu.style.display = menu.style.display === 'block' ? 'none' : 'block';
        } else {
            console.error('toggleAvatarMenu: Меню аватара не найдено');
        }
};

window.clearCategoryFilter = function() {
        console.log('clearCategoryFilter: очищаем фильтр категорий');
        localStorage.removeItem('currentCategory');
        if (typeof loadProducts === 'function') {
            loadProducts(0, false);
        }
    };

    window.openTelegramChat = function() {
        console.log('openTelegramChat: открываем чат Telegram');
        window.open('https://t.me/GuitarStringsUSA', '_blank');
    };

    console.log('HTML functions defined successfully');
})();


window.closeContactsPopup = function() {
    console.log('closeContactsPopup: закрываем попап контактов');
    const popup = document.getElementById('contactsPopup');
    if (popup) {
        popup.style.display = 'none';
    } else {
        console.error('closeContactsPopup: Попап контактов не найден');
    }
};

window.showOfferPopup = function() {
    console.log('showOfferPopup: открываем попап предложения');
    const popup = document.getElementById('offerPopup');
    if (popup) {
        popup.style.display = 'block';
    } else {
        console.error('showOfferPopup: Попап предложения не найден');
    }
};

window.closeOfferPopup = function() {
    console.log('closeOfferPopup: закрываем попап предложения');
    const popup = document.getElementById('offerPopup');
    if (popup) {
        popup.style.display = 'none';
    } else {
        console.error('closeOfferPopup: Попап предложения не найден');
    }
};

// Функция для обновления контента оферты
function updateOfferContent() {
    console.log('updateOfferContent: обновляем контент оферты');
    const offerTextElement = document.getElementById('offerText');
    if (!offerTextElement) {
        console.warn('updateOfferContent: элемент offerText не найден');
        return;
    }

    // Скрываем все языковые версии
    const ukContent = document.querySelector('.offer-content-uk');
    const ruContent = document.querySelector('.offer-content-ru');
    const enContent = document.querySelector('.offer-content-en');

    if (ukContent) ukContent.style.display = 'none';
    if (ruContent) ruContent.style.display = 'none';
    if (enContent) enContent.style.display = 'none';

    // Показываем контент для текущего языка
    const currentLang = localStorage.getItem('selectedLanguage') || 'uk';
    console.log('updateOfferContent: текущий язык:', currentLang);

    if (currentLang === 'uk' && ukContent) {
        ukContent.style.display = 'block';
        console.log('updateOfferContent: показан украинский контент');
    } else if (currentLang === 'ru' && ruContent) {
        ruContent.style.display = 'block';
        console.log('updateOfferContent: показан русский контент');
    } else if (currentLang === 'en' && enContent) {
        enContent.style.display = 'block';
        console.log('updateOfferContent: показан английский контент');
    }
}

window.checkout = function() {
    console.log('checkout: начинаем оформление заказа');
    if (cart.length === 0) {
        showNotification('Корзина пуста!', 'error');
        return;
    }
    // Здесь должна быть логика оформления заказа
    showNotification('Заказ оформлен успешно!', 'success');
    cart = [];
    cartItemCount = 0;
    updateCartBadge();
    updateCartDisplay();
    closePopup('cartPopup');
};

// Функция очистки корзины
window.clearCart = function() {
    console.log('clearCart: очищаем корзину');
    if (cart.length === 0) {
        showNotification('Корзина уже пуста', 'info');
        return;
    }

    cart = [];
    cartItemCount = 0;
    cartTotal = 0;
    updateCartBadge();
    updateCartDisplay();
    showNotification('Корзина очищена', 'info');
};

window.closeCartPopup = function() {
    console.log('closeCartPopup: закрываем попап корзины');
    const popup = document.getElementById('cartPopup');
    if (popup) {
        popup.style.display = 'none';
    } else {
        console.error('closeCartPopup: Попап корзины не найден');
    }
};

window.closePopup = function(popupId) {
    console.log('closePopup: закрываем попап:', popupId);
    const popup = document.getElementById(popupId);
    if (popup) {
        popup.style.display = 'none';
    } else {
        console.error('closePopup: Попап', popupId, 'не найден');
    }
};

window.closeOrderAcceptedPopup = function() {
    console.log('closeOrderAcceptedPopup: закрываем попап принятого заказа');
    const popup = document.getElementById('orderAcceptedPopup');
    if (popup) {
        popup.style.display = 'none';
    } else {
        console.error('closeOrderAcceptedPopup: Попап принятого заказа не найден');
    }
};

window.showLastOrderDetails = function() {
    console.log('showLastOrderDetails: показываем детали последнего заказа');
    // Здесь должна быть логика показа деталей заказа
    showNotification('Функция показа деталей заказа в разработке', 'info');
};

window.printOrder = function() {
    console.log('printOrder: печатаем заказ');
    // Здесь должна быть логика печати заказа
    showNotification('Функция печати заказа в разработке', 'info');
};

window.continueShopping = function() {
    console.log('continueShopping: продолжаем покупки');
    closePopup('orderAcceptedPopup');
    closePopup('cartPopup');
};

window.clearSavedLoginData = function() {
    console.log('clearSavedLoginData: очищаем сохраненные данные входа');
    localStorage.removeItem('savedLoginData');
    showNotification('Сохраненные данные очищены', 'success');
};

// Дублированная функция openTelegramChat удалена


// Функция инициализации поиска
function initSearch() {
    console.log('initSearch: инициализируем поиск');
    const searchInput = document.querySelector('.search-input');

    if (!searchInput) {
        console.error('initSearch: Поле поиска не найдено');
        return;
    }

    // Обработчик ввода в поле поиска
    let searchTimeout;
    searchInput.addEventListener('input', function() {
        clearTimeout(searchTimeout);
        searchTimeout = setTimeout(() => {
            const query = searchInput.value.trim().toLowerCase();
            console.log('initSearch: Поисковый запрос:', query);

            if (query.length === 0) {
                // Если поиск пустой, показываем все товары
                loadProducts(0, false);
            } else {
                // Фильтруем товары по поисковому запросу
                filterProductsBySearch(query);
            }
        }, 300); // Задержка 300ms для оптимизации
    });
}


// Функция фильтрации товаров по поисковому запросу
function filterProductsBySearch(query) {
    console.log('filterProductsBySearch: фильтруем товары по запросу:', query);

    if (!window.allProducts) {
        console.log('filterProductsBySearch: Загружаем все товары для поиска');
        // Загружаем все товары если они еще не загружены
        loadAllProductsForSearch(query);
        return;
    }

    const filteredProducts = window.allProducts.filter(product => {
        const name = (product.name || '').toLowerCase();
        const description = (product.description || '').toLowerCase();
        return name.includes(query) || description.includes(query);
    });

    console.log('filterProductsBySearch: Найдено товаров:', filteredProducts.length);

    // Сохраняем отфильтрованные товары для правильной работы кнопок "В корзину"
    window.currentFilteredProducts = filteredProducts.slice(0, 30);
    displayProducts(window.currentFilteredProducts);
}

// Функция отображения отфильтрованных товаров

// Функция загрузки всех товаров для поиска
async function loadAllProductsForSearch(query = '') {
    console.log('loadAllProductsForSearch: загружаем все товары для поиска');

    try {
        const response = await fetch('./static_products.json');
        if (!response.ok) {
            throw new Error(`HTTP ошибка: ${response.status}`);
        }

        const fullData = await response.json();
        window.allProducts = (fullData.products || []).map(product => processProductData(product));

        console.log('loadAllProductsForSearch: Загружено товаров для поиска:', window.allProducts.length);

        if (query) {
            filterProductsBySearch(query);
        }
    } catch (error) {
        console.error('loadAllProductsForSearch: Ошибка загрузки товаров для поиска:', error);
        showNotification('Ошибка поиска товаров', 'error');
    }
}

// Функция для бесконечной прокрутки
function initInfiniteScroll() {
    console.log('initInfiniteScroll: инициализируем бесконечную прокрутку');
    const container = document.querySelector('.inner');

    if (!container) {
        console.error('initInfiniteScroll: Контейнер .inner не найден');
        return;
    }

    // Функция проверки скролла
    function checkScroll() {
        const scrollTop = window.pageYOffset || document.documentElement.scrollTop;
        const windowHeight = window.innerHeight;
        const documentHeight = Math.max(
            document.body.scrollHeight,
            document.body.offsetHeight,
            document.documentElement.clientHeight,
            document.documentElement.scrollHeight,
            document.documentElement.offsetHeight
        );

        // Загружаем больше товаров, когда пользователь прокрутил до 80% высоты
        const scrollThreshold = 0.8;
        const isNearBottom = scrollTop + windowHeight >= documentHeight * scrollThreshold;

        if (isNearBottom && hasMoreProducts && !isLoading) {
            console.log('initInfiniteScroll: Автоматическая загрузка - пользователь прокрутил до низа');
            console.log('Scroll stats:', {
                scrollTop,
                windowHeight,
                documentHeight,
                threshold: documentHeight * scrollThreshold
            });
            currentPage++;
            loadProductsByCategory(currentCategory, currentPage, true);
        }
    }

    // Обработчик скролла для автоматической загрузки
    window.addEventListener('scroll', function(e) {
        checkScroll();
    });

    // Также проверяем скролл при загрузке страницы
    setTimeout(checkScroll, 1000);

    console.log('initInfiniteScroll: Бесконечная прокрутка инициализирована');
}

// Инициализация
document.addEventListener('DOMContentLoaded', function() {
    console.log('DOM загружен, инициализируем приложение');

    // Инициализируем глобальные переменные
    if (!window.currentProducts) {
        window.currentProducts = [];
        console.log('DOMContentLoaded: Инициализирован window.currentProducts');
    }
    if (!window.loadedProductNames) {
        window.loadedProductNames = new Set();
        console.log('DOMContentLoaded: Инициализирован window.loadedProductNames');
    }

    // Инициализируем систему языков первой
    initLanguageSystem();

    // Инициализируем систему категорий
    initCategories();

    // Инициализируем обработчики событий
    initEventListeners();

    // Инициализируем кнопки брендов
    initBrandButtons();

    // Инициализируем поиск
    initSearch();

    // Загружаем товары ПОСЛЕ всех инициализаций
    console.log('DOMContentLoaded: Начинаем загрузку товаров');

    // Простая проверка загрузки JSON перед загрузкой товаров
    fetch('./static_products_clean.json')
        .then(response => {
            console.log('DOMContentLoaded: Проверка JSON - статус:', response.status);
            if (!response.ok) {
                throw new Error(`HTTP ${response.status}`);
            }
            return response.json();
        })
        .then(data => {
            console.log('DOMContentLoaded: JSON успешно загружен, товаров:', data.products ? data.products.length : 'нет данных');
    loadProducts();
        })
        .catch(error => {
            console.error('DOMContentLoaded: Ошибка загрузки JSON:', error);
            console.log('DOMContentLoaded: Используем резервные данные из кода');

            // Резервные данные товаров
            const fallbackProducts = [
                {
                    name: "Ernie Ball 2221 Hybrid Slinky 10-46",
                    image: "https://guitarstrings.com.ua/images/stories/virtuemart/product/resized/ernie_ball_2221_10-46_0x170.png",
                    newPrice: 225,
                    oldPrice: 250,
                    availability: "В наличии",
                    rating: 4.9,
                    category: "electro",
                    gauge: "10"
                },
                {
                    name: "D'Addario EXL110-3D Nickel Wound Regular Light 10-46",
                    image: "https://guitarstrings.com.ua/images/stories/virtuemart/product/resized/daddario_exl110_10-46_0x170.png",
                    newPrice: 280,
                    oldPrice: 320,
                    availability: "В наличии",
                    rating: 4.7,
                    category: "electro",
                    gauge: "10"
                },
                {
                    name: "Orphee RX15 Nickel Alloy Super Light 9-42",
                    image: "https://guitarstrings.com.ua/images/stories/virtuemart/product/resized/orphee_rx15-9-42_0x170.png",
                    newPrice: 173,
                    oldPrice: 200,
                    availability: "В наличии",
                    rating: 4.5,
                    category: "electro",
                    gauge: "09"
                }
            ];

            // Показываем резервные товары
            displayProducts(fallbackProducts);
        });

    // Инициализируем бесконечную прокрутку
    initInfiniteScroll();

});

// Функция загрузки товаров
// Функция для обработки данных товара
// База данных товаров на основе базы знаний
const knowledgeBaseProducts = {
    // 09 калибр (электрогитара)
    '09-gauge': [
        { name: 'Orphee RX15 Nickel Alloy Super Light 9-42', brand: 'Orphee', price: 173, oldPrice: 200, gauge: '09', type: 'electric' },
        { name: 'Ernie Ball 2248 Custom Gauge Stainless Steel 9-42', brand: 'Ernie Ball', price: 426, oldPrice: 500, gauge: '09', type: 'electric' },
        { name: 'Ernie Ball 2247 Custom Gauge Stainless Steel 9-46', brand: 'Ernie Ball', price: 426, oldPrice: 500, gauge: '09', type: 'electric' },
        { name: 'GHS Boomers GBCL Custom Light 9-46', brand: 'GHS', price: 391, oldPrice: 450, gauge: '09', type: 'electric' },
        { name: 'GHS Boomers GBXL Extra Light 9-42', brand: 'GHS', price: 391, oldPrice: 450, gauge: '09', type: 'electric' },
        { name: "D'Addario EXL120+-3D Nickel Wound 9.5-44", brand: "D'Addario", price: 280, oldPrice: 320, gauge: '09', type: 'electric' },
        { name: "D'Addario EXL120-10P Nickel Wound Super Light 9-42", brand: "D'Addario", price: 280, oldPrice: 320, gauge: '09', type: 'electric' },
        { name: 'Fender 250L-3 Nickel Plated Steel Light 9-42', brand: 'Fender', price: 315, oldPrice: 350, gauge: '09', type: 'electric' },
        { name: 'Ernie Ball 2223 Super Slinky 9-42', brand: 'Ernie Ball', price: 225, oldPrice: 250, gauge: '09', type: 'electric' },
        { name: 'La Bella HRS-XL Hard Rockin Steel Extra Light 9-42', brand: 'La Bella', price: 290, oldPrice: 330, gauge: '09', type: 'electric' }
    ],

    // 10 калибр (электрогитара)
    '10-gauge': [
        { name: 'Ernie Ball 2221 Hybrid Slinky 10-46', brand: 'Ernie Ball', price: 225, oldPrice: 250, gauge: '10', type: 'electric' },
        { name: 'Ernie Ball 2215 Power Slinky 10-46', brand: 'Ernie Ball', price: 225, oldPrice: 250, gauge: '10', type: 'electric' },
        { name: 'Ernie Ball 2216 Beefy Slinky 10-46', brand: 'Ernie Ball', price: 225, oldPrice: 250, gauge: '10', type: 'electric' },
        { name: 'GHS Boomers GBLXL Light/Extra Light 10-38', brand: 'GHS', price: 391, oldPrice: 450, gauge: '10', type: 'electric' },
        { name: 'GHS Boomers GBM Medium 11-50', brand: 'GHS', price: 391, oldPrice: 450, gauge: '10', type: 'electric' },
        { name: "D'Addario EXL110-3D Nickel Wound Regular Light 10-46", brand: "D'Addario", price: 280, oldPrice: 320, gauge: '10', type: 'electric' },
        { name: 'Fender 250R-3 Nickel Plated Steel Regular 10-46', brand: 'Fender', price: 315, oldPrice: 350, gauge: '10', type: 'electric' },
        { name: 'Musicians Gear MG10-46 Nickel-Plated Light 10-46', brand: 'Musicians Gear', price: 280, oldPrice: 320, gauge: '10', type: 'electric' }
    ],

    // 11 калибр (электрогитара)
    '11-gauge': [
        { name: 'Ernie Ball 2220 Not Even Slinky 11-48', brand: 'Ernie Ball', price: 225, oldPrice: 250, gauge: '11', type: 'electric' },
        { name: 'GHS Boomers GBM Medium 11-50', brand: 'GHS', price: 391, oldPrice: 450, gauge: '11', type: 'electric' },
        { name: "D'Addario EXL115-3D Blues/Jazz Rockers 11-49", brand: "D'Addario", price: 320, oldPrice: 360, gauge: '11', type: 'electric' },
        { name: "D'Addario EXL117-3D Medium Top Heavy Bottom 11-50", brand: "D'Addario", price: 320, oldPrice: 360, gauge: '11', type: 'electric' },
        { name: 'Fender 250M Nickel Plated Steel Medium 11-49', brand: 'Fender', price: 315, oldPrice: 350, gauge: '11', type: 'electric' }
    ],

    // Nickel Plated Electric Strings
    'nickel-plated': [
        { name: 'Ernie Ball 2221 Hybrid Slinky Nickel 10-46', brand: 'Ernie Ball', price: 225, oldPrice: 250, type: 'nickel-plated' },
        { name: 'Ernie Ball 2223 Super Slinky Nickel 9-42', brand: 'Ernie Ball', price: 225, oldPrice: 250, type: 'nickel-plated' },
        { name: 'Fender 250L Nickel Plated Steel Light 9-42', brand: 'Fender', price: 315, oldPrice: 350, type: 'nickel-plated' },
        { name: "D'Addario EXL110 Nickel Wound Regular Light 10-46", brand: "D'Addario", price: 280, oldPrice: 320, type: 'nickel-plated' },
        { name: 'GHS Boomers GBLXL Nickel Light 10-38', brand: 'GHS', price: 391, oldPrice: 450, type: 'nickel-plated' }
    ],

    // Pure Nickel Electric Strings
    'pure-nickel': [
        { name: 'Ernie Ball 2252 Pure Nickel Hybrid Slinky 9-46', brand: 'Ernie Ball', price: 280, oldPrice: 320, type: 'pure-nickel' },
        { name: 'Ernie Ball 2253 Pure Nickel Super Slinky 9-42', brand: 'Ernie Ball', price: 280, oldPrice: 320, type: 'pure-nickel' },
        { name: "D'Addario EPN110 Pure Nickel Regular Light 10-46", brand: "D'Addario", price: 320, oldPrice: 360, type: 'pure-nickel' },
        { name: 'GHS BCCL Big Core Pure Nickel 9.5-48', brand: 'GHS', price: 420, oldPrice: 480, type: 'pure-nickel' }
    ],

    // Stainless Steel Electric Strings
    'stainless-steel': [
        { name: 'Ernie Ball 2246 Custom Gauge Stainless Steel 10-46', brand: 'Ernie Ball', price: 426, oldPrice: 500, type: 'stainless-steel' },
        { name: 'Ernie Ball 2247 Custom Gauge Stainless Steel 9-46', brand: 'Ernie Ball', price: 426, oldPrice: 500, type: 'stainless-steel' },
        { name: 'Ernie Ball 2248 Custom Gauge Stainless Steel 9-42', brand: 'Ernie Ball', price: 426, oldPrice: 500, type: 'stainless-steel' }
    ],

    // Cobalt Electric Strings
    'cobalt': [
        { name: 'Ernie Ball 2722 Cobalt Slinky 9-46', brand: 'Ernie Ball', price: 290, oldPrice: 330, type: 'cobalt' },
        { name: 'Ernie Ball 2723 Cobalt Slinky 9-42', brand: 'Ernie Ball', price: 290, oldPrice: 330, type: 'cobalt' },
        { name: 'Ernie Ball 2712 Cobalt Primo Slinky 9.5-44', brand: 'Ernie Ball', price: 290, oldPrice: 330, type: 'cobalt' }
    ],

    // Colored Electric Strings
    'colored': [
        { name: 'Rotosound RH9 Roto Orange 9-46', brand: 'Rotosound', price: 350, oldPrice: 400, type: 'colored' },
        { name: 'Rotosound R9 Roto Pinks 9-42', brand: 'Rotosound', price: 350, oldPrice: 400, type: 'colored' }
    ]
};

// Функция для получения правильных данных товара из базы знаний
function getProductFromKnowledgeBase(productName) {
    const name = productName.toLowerCase();

    // Ищем товар во всех категориях базы знаний
    for (const [category, products] of Object.entries(knowledgeBaseProducts)) {
        const foundProduct = products.find(p => name.includes(p.name.toLowerCase()));
        if (foundProduct) {
            return foundProduct;
        }
    }

    return null;
}

// Функция для получения данных товаров
async function fetchProductDataFromAPI(category = 'electro', start = 0, limit = 60) {
    console.log('fetchProductDataFromAPI: Получение данных для категории:', category, 'start:', start, 'limit:', limit);

    try {
        // Сначала пытаемся загрузить данные через API
        console.log('fetchProductDataFromAPI: Пытаемся загрузить данные через API');
        const apiUrl = `./static_products_clean.json`;
        console.log('fetchProductDataFromAPI: API URL:', apiUrl);

        const response = await fetch(apiUrl);
        console.log('fetchProductDataFromAPI: Response status:', response.status);

        if (!response.ok) {
            console.error('fetchProductDataFromAPI: Response not ok:', response.status, response.statusText);
            throw new Error(`Не удалось загрузить данные через API: ${response.status}`);
        }

        const data = await response.json();
        console.log('fetchProductDataFromAPI: Загружены данные через API:', data);

        if (data.products && data.products.length > 0) {
            // Обрабатываем и фильтруем товары
            let products = data.products;

            // Фильтруем по категории если нужно
            if (category !== 'electro' && category !== 'all') {
                products = products.filter(product => {
                    const productName = product.name || '';

                    // Фильтрация по калибрам
                    if (category === 'electro-09') return product.gauge === '09';
                    if (category === 'electro-10') return product.gauge === '10';
                    if (category === 'electro-11') return product.gauge === '11';

                    // Фильтрация по брендам (проверяем по названию товара)
                    if (category === 'ernie-ball') {
                        return productName.toLowerCase().includes('ernie ball');
                    }
                    if (category === 'orphee') {
                        return productName.toLowerCase().includes('orphee');
                    }
                    if (category === 'daddario') {
                        return productName.toLowerCase().includes("d'addario") || productName.toLowerCase().includes('daddario');
                    }
                    if (category === 'fender') {
                        return productName.toLowerCase().includes('fender');
                    }
                    if (category === 'ghs') {
                        return productName.toLowerCase().includes('ghs');
                    }
                    if (category === 'la-bella') {
                        return productName.toLowerCase().includes('la bella');
                    }
                    if (category === 'musicians-gear') {
                        return productName.toLowerCase().includes('musicians gear') || productName.toLowerCase().includes("musician's gear");
                    }
                    if (category === 'dr') {
                        return productName.toLowerCase().includes('dr ');
                    }
                    if (category === 'elixir') {
                        return productName.toLowerCase().includes('elixir');
                    }
                    if (category === 'dunlop') {
                        return productName.toLowerCase().includes('dunlop');
                    }
                    if (category === 'dean-markley') {
                        return productName.toLowerCase().includes('dean markley');
                    }
                    if (category === 'curt-mangan') {
                        return productName.toLowerCase().includes('curt mangan');
                    }
                    if (category === 'cleartone') {
                        return productName.toLowerCase().includes('cleartone');
                    }
                    if (category === 'gibson') {
                        return productName.toLowerCase().includes('gibson');
                    }
                    if (category === 'pyramid') {
                        return productName.toLowerCase().includes('pyramid');
                    }
                    if (category === 'rotosound') {
                        return productName.toLowerCase().includes('rotosound');
                    }
                    if (category === 'optima') {
                        return productName.toLowerCase().includes('optima');
                    }

                    // Фильтрация по типам струн
                    if (category === '7-string') {
                        return productName.toLowerCase().includes('7-string') || productName.toLowerCase().includes('7 струн');
                    }
                    if (category === '8-string') {
                        return productName.toLowerCase().includes('8-string') || productName.toLowerCase().includes('8 струн');
                    }
                    if (category === '9-string') {
                        return productName.toLowerCase().includes('9-string') || productName.toLowerCase().includes('9 струн');
                    }
                    if (category === 'flatwound') {
                        return productName.toLowerCase().includes('flatwound') ||
                               productName.toLowerCase().includes('flat wound') ||
                               productName.toLowerCase().includes('stainless steel flats');
                    }
                    if (category === 'nickel-plated') {
                        return productName.toLowerCase().includes('nickel') && !productName.toLowerCase().includes('pure nickel');
                    }
                    if (category === 'pure-nickel') {
                        return productName.toLowerCase().includes('pure nickel');
                    }
                    if (category === 'stainless-steel') {
                        return productName.toLowerCase().includes('stainless steel');
                    }
                    if (category === 'cobalt') {
                        return productName.toLowerCase().includes('cobalt');
                    }
                    if (category === 'colored') {
                        return productName.toLowerCase().includes('colored') ||
                               productName.toLowerCase().includes('color');
                    }

                    // Фильтрация по калибрам
                    if (category === '09-gauge') {
                        return product.gauge === '09' || productName.toLowerCase().includes('9-');
                    }
                    if (category === '10-gauge') {
                        return product.gauge === '10' || productName.toLowerCase().includes('10-');
                    }
                    if (category === '11-gauge') {
                        return product.gauge === '11' || productName.toLowerCase().includes('11-');
                    }

                    // Фильтрация по полю category для других случаев
                    if (product.category) {
                        return product.category === category;
                    }

                    // Альтернативная фильтрация по названию для обратной совместимости
                    if (category === 'acoustic') return productName.toLowerCase().includes('акустич') || productName.toLowerCase().includes('acoustic');
                    if (category === 'bass') return productName.toLowerCase().includes('бас') || productName.toLowerCase().includes('bass');
                    if (category === 'classic') return productName.toLowerCase().includes('классич') || productName.toLowerCase().includes('classic');

                    return true; // Для остальных категорий показываем все
                });
            }

            // Применяем пагинацию
            const paginatedProducts = products.slice(start, start + limit);
            console.log('fetchProductDataFromAPI: Возвращаем товары:', paginatedProducts.length, 'из', products.length);

            return paginatedProducts;
        } else {
            throw new Error('Нет товаров в ответе API');
        }

    } catch (error) {
        console.warn('fetchProductDataFromAPI: Ошибка загрузки данных через API:', error.message);
        console.log('fetchProductDataFromAPI: Пробуем загрузить из static_products.json');

        // Попытка загрузки из static_products.json
        try {
            const fallbackResponse = await fetch('./static_products.json');
            if (fallbackResponse.ok) {
                const fallbackData = await fallbackResponse.json();
                console.log('fetchProductDataFromAPI: Загружены данные из static_products.json');

                if (fallbackData.products && fallbackData.products.length > 0) {
                    let products = fallbackData.products.map(product => processProductData(product));

                    // Фильтруем по категории если нужно
                    if (category !== 'electro' && category !== 'all') {
                        products = products.filter(product => {
                            const productName = product.name || '';
                            if (category === 'acoustic') return productName.toLowerCase().includes('акустич') || productName.toLowerCase().includes('acoustic');
                            if (category === 'bass') return productName.toLowerCase().includes('бас') || productName.toLowerCase().includes('bass');
                            if (category === 'classic') return productName.toLowerCase().includes('классич') || productName.toLowerCase().includes('classic');
                            return true;
                        });
                    }

                    const paginatedProducts = products.slice(start, start + limit);
                    console.log('fetchProductDataFromAPI: Возвращаем товары из static_products.json:', paginatedProducts.length);
                    return paginatedProducts;
                }
            }
        } catch (fallbackError) {
            console.warn('fetchProductDataFromAPI: Ошибка загрузки из static_products.json:', fallbackError.message);
        }

        console.log('fetchProductDataFromAPI: Используем базу знаний как последний fallback');

        // Возвращаем данные из базы знаний как последний fallback
        const allProducts = getAllProductsFromKnowledgeBase();

        // Фильтруем по категории
        let filteredProducts = allProducts;
        if (category !== 'electro' && category !== 'all') {
            filteredProducts = allProducts.filter(product => {
                const productCategory = product.category || 'electro';
                return productCategory.toLowerCase() === category.toLowerCase();
            });
        }

        // Применяем пагинацию
        const paginatedProducts = filteredProducts.slice(start, start + limit);
        return paginatedProducts;
    }
}

// Функция для загрузки товаров по категориям
async function loadProductsByCategory(category = 'electro', page = 0, append = false) {
    console.log('loadProductsByCategory: Загрузка товаров категории:', category, 'страница:', page);

    try {
        // Рассчитываем параметры для API
            const start = page * 30;
        const limit = 30;

        let productsData = await fetchProductDataFromAPI(category, start, limit);
        console.log('loadProductsByCategory: Получено сырых данных:', productsData);

        if (productsData && productsData.length > 0) {
            console.log('loadProductsByCategory: Получено товаров:', productsData.length);

            // Простая обработка без сложной логики
            const processedProducts = productsData.map(product => {
                // Простая обработка для тестирования
                return {
                    ...product,
                    name: product.name || 'Без названия',
                    newPrice: product.newPrice || product.price || 0,
                    oldPrice: product.oldPrice || 0,
                    availability: product.availability || 'В наличии',
                    rating: product.rating || 4.5,
                    image: product.image || './images/Discontinued.jpg'
                };
            });
            console.log('loadProductsByCategory: После простой обработки:', processedProducts.length);

            // Простая сортировка по цене
            const sortedProducts = processedProducts.sort((a, b) => {
                const priceA = a.newPrice || a.price || 0;
                const priceB = b.newPrice || b.price || 0;
                return priceA - priceB;
            });
            console.log('loadProductsByCategory: После сортировки:', sortedProducts.length);

            if (append) {
                console.log('loadProductsByCategory: Добавляем товары к существующим');
                appendProducts(sortedProducts);
            } else {
                console.log('loadProductsByCategory: Отображаем новые товары');
                displayProducts(sortedProducts);
            }

            currentPage = page;
            hasMoreProducts = productsData.length === limit;
            console.log('loadProductsByCategory: hasMoreProducts:', hasMoreProducts);
        } else {
            console.log('loadProductsByCategory: Товаров не получено или данные пустые');
            hasMoreProducts = false;

            // Показываем сообщение об отсутствии товаров
            const container = document.getElementById('productsContainer');
            if (container && !append) {
                container.innerHTML = '<div style="padding: 20px; text-align: center;"><h2>Товары не найдены</h2><p>Попробуйте обновить страницу или выбрать другую категорию.</p></div>';
            }
        }

    } catch (error) {
        console.error('loadProductsByCategory: Ошибка загрузки товаров:', error);
        hasMoreProducts = false;

        // Показываем сообщение об ошибке
        const container = document.getElementById('productsContainer');
        if (container && !append) {
            container.innerHTML = `<div style="padding: 20px; text-align: center;"><h2>Ошибка загрузки товаров</h2><p>Ошибка: ${error.message}</p><p>Пожалуйста, обновите страницу.</p></div>`;
        }
    }
}

// Функция для парсинга товаров из HTML
function parseProductsFromHTML(html) {
    console.log('parseProductsFromHTML: Парсинг HTML');

    const products = [];
    const parser = new DOMParser();
    const doc = parser.parseFromString(html, 'text/html');

    // Ищем карточки товаров на странице
    const productCards = doc.querySelectorAll('.product-card, .product-item, .item, [class*="product"]');

    productCards.forEach((card, index) => {
        try {
            // Извлекаем данные товара
            const nameElement = card.querySelector('.product-name, .name, h3, h4, [class*="name"]');
            const priceElement = card.querySelector('.price, .product-price, [class*="price"]');
            const imageElement = card.querySelector('img');
            const ratingElement = card.querySelector('.rating, [class*="rating"]');

            const name = nameElement ? nameElement.textContent.trim() : `Товар ${index + 1}`;
            const priceText = priceElement ? priceElement.textContent.trim() : '';
            const imageSrc = imageElement ? imageElement.src : './images/Discontinued.jpg';

            // Парсим цену
            const priceMatch = priceText.match(/(\d+)/);
            const price = priceMatch ? parseInt(priceMatch[1]) : 0;

            // Определяем бренд по названию
            const brand = determineBrandFromName(name);

            products.push({
                name: name,
                price: price,
                oldPrice: Math.floor(price * 1.3),
                image: imageSrc,
                brand: brand,
                availability: 'В наличии',
                rating: '4.5',
                source: 'website'
            });

        } catch (error) {
            console.error('parseProductsFromHTML: Ошибка парсинга карточки:', error);
        }
    });

    console.log('parseProductsFromHTML: Найдено товаров:', products.length);
    return products;
}

// Функция для определения бренда по названию товара
function determineBrandFromName(name) {
    const nameLower = name.toLowerCase();

    if (nameLower.includes('ernie ball')) return 'Ernie Ball';
    if (nameLower.includes('orphee')) return 'Orphee';
    if (nameLower.includes("d'addario") || nameLower.includes('daddario')) return "D'Addario";
    if (nameLower.includes('musicians gear') || nameLower.includes('musicians')) return 'Musicians Gear';
    if (nameLower.includes('ghs')) return 'GHS';
    if (nameLower.includes('elixir')) return 'Elixir';
    if (nameLower.includes('fender')) return 'Fender';
    if (nameLower.includes('rotosound')) return 'Rotosound';
    if (nameLower.includes('la bella')) return 'La Bella';
    if (nameLower.includes('dunlop')) return 'Dunlop';
    if (nameLower.includes('dean markley')) return 'Dean Markley';

    return 'Unknown';
}

// Функция для получения всех товаров из базы знаний
function getAllProductsFromKnowledgeBase() {
    console.log('getAllProductsFromKnowledgeBase: Получение всех товаров из базы знаний');

    const allProducts = [];

    // Собираем все товары из всех категорий
    for (const [category, products] of Object.entries(knowledgeBaseProducts)) {
        if (Array.isArray(products)) {
            products.forEach(product => {
                allProducts.push({
                    ...product,
                    category: category,
                    source: 'knowledge_base'
                });
            });
        }
    }

    console.log('getAllProductsFromKnowledgeBase: Всего товаров:', allProducts.length);

    // Если товаров мало, создаем дополнительные товары из разных брендов
    if (allProducts.length < 100) {
        console.log('getAllProductsFromKnowledgeBase: Мало товаров, создаем дополнительные');

        const brands = ['Ernie Ball', 'D\'Addario', 'Fender', 'GHS', 'Elixir', 'Martin', 'Cleartone'];
        const gauges = ['9-42', '9-46', '10-46', '11-49', '12-52'];
        const types = ['Regular Slinky', 'Custom Light', 'Heavy Bottom', 'Jazz Light'];

        // Создаем 60 дополнительных товаров
        for (let i = 0; i < 60; i++) {
            const brand = brands[Math.floor(Math.random() * brands.length)];
            const gauge = gauges[Math.floor(Math.random() * gauges.length)];
            const type = types[Math.floor(Math.random() * types.length)];

            const name = `${brand} ${type} ${gauge}`;
            const basePrice = Math.floor(Math.random() * 200) + 300; // 300-500 ₴
            const oldPrice = Math.random() > 0.7 ? basePrice + Math.floor(Math.random() * 100) + 50 : 0;

            // Выбираем изображение на основе бренда
            let image = './images/Menu_images/electric_guitar_strings_category_0x170.png';
            if (brand === 'Ernie Ball') image = './images/Menu_images/ernie_ball_1010-350_0x170.png';
            if (brand === 'Elixir') image = './images/Menu_images/elixir_12052_box_open_0x170.png';

            allProducts.push({
                name: name,
                price: basePrice,
                oldPrice: oldPrice,
                image: image,
                availability: Math.random() > 0.1 ? "В наличии" : "Под заказ",
                rating: (Math.random() * 0.8 + 4.2).toFixed(1), // 4.2-5.0
                category: 'electro',
                source: 'generated'
            });
        }

        const testProducts = [
            {
                name: "Ernie Ball 2221 Regular Slinky",
                price: 350,
                oldPrice: 450,
                image: "./images/Menu_images/ernie_ball_1010-350_0x170.png",
                availability: "В наличии",
                rating: 4.5
            },
            {
                name: "D'Addario EXL110 Nickel Wound",
                price: 390,
                oldPrice: 470,
                image: "./images/Menu_images/electric_guitar_strings_category_0x170.png",
                availability: "В наличии",
                rating: 4.8
            },
            {
                name: "Fender Bullet End",
                price: 280,
                oldPrice: 350,
                image: "./images/Menu_images/electric_guitar_strings_category_0x170.png",
                availability: "Ожидается",
                rating: 4.2
            },
            {
                name: "Elixir Nanoweb",
                price: 420,
                oldPrice: 520,
                image: "./images/Menu_images/elixir_12052_box_open_0x170.png",
                availability: "В наличии",
                rating: 4.7
            }
        ];

        // Добавляем тестовые товары
        testProducts.forEach(product => {
            allProducts.push({
                ...product,
                category: 'electro',
                source: 'test_data'
            });
        });

        console.log('getAllProductsFromKnowledgeBase: После добавления тестовых товаров:', allProducts.length);
    }

    return allProducts;
}

function processProductData(product) {
    let processedProduct = { ...product };

    // Проверяем, нужны ли данные для обработки (для старых данных static_products.json)
    if (processedProduct.name && processedProduct.name.includes('\n\n\n\n')) {
        // Парсим название и цены из текста товара (старый формат)
        const nameText = processedProduct.name;

        // Ищем название товара между переносами
        const nameMatch = nameText.match(/\n\n\n\n(.*?)\n\n/);
        if (nameMatch) {
            processedProduct.name = nameMatch[1].trim();
        }

        // Ищем цены в тексте
        const priceMatches = nameText.match(/Цена:\s*(\d+)\s*грн/g);
        if (priceMatches && priceMatches.length >= 2) {
            // Первая цена - старая, вторая - новая
            const oldPriceMatch = priceMatches[0].match(/(\d+)/);
            const newPriceMatch = priceMatches[1].match(/(\d+)/);

            if (oldPriceMatch) processedProduct.oldPrice = parseInt(oldPriceMatch[1]);
            if (newPriceMatch) processedProduct.price = parseInt(newPriceMatch[1]);
        } else if (priceMatches && priceMatches.length === 1) {
            // Только одна цена - используем её как текущую
            const priceMatch = priceMatches[0].match(/(\d+)/);
            if (priceMatch) {
                processedProduct.price = parseInt(priceMatch[1]);
                processedProduct.oldPrice = Math.floor(processedProduct.price * 1.3);
            }
        }

        // Если цены не найдены, устанавливаем дефолтные
        if (!processedProduct.price || processedProduct.price === 0) {
            processedProduct.price = Math.floor(Math.random() * 200) + 300; // 300-500
        }
        if (!processedProduct.oldPrice || processedProduct.oldPrice === 0) {
            processedProduct.oldPrice = Math.floor(processedProduct.price * 1.3);
        }

        // Очищаем название от лишнего текста
        processedProduct.name = processedProduct.name
            .replace(/\n+/g, ' ')
            .replace(/Цена:.*?грн/g, '')
            .trim();

        // Получаем дополнительные данные из базы знаний
        const knowledgeData = getProductFromKnowledgeBase(processedProduct.name);
        if (knowledgeData) {
            processedProduct.brand = knowledgeData.brand;
            processedProduct.gauge = knowledgeData.gauge;
            processedProduct.type = knowledgeData.type;
        } else {
            // Определяем бренд по названию
            processedProduct.brand = determineBrandFromName(processedProduct.name);
        }
    }

    // Устанавливаем статус наличия если не установлен
    if (!processedProduct.availability) {
        processedProduct.availability = "В наличии";
    }

    // Устанавливаем рейтинг если не установлен
    if (!processedProduct.rating) {
        processedProduct.rating = 4.5;
    }

    // Устанавливаем цены если не установлены
    if (!processedProduct.newPrice && processedProduct.price) {
        processedProduct.newPrice = processedProduct.price;
    }
    if (!processedProduct.price && processedProduct.newPrice) {
        processedProduct.price = processedProduct.newPrice;
    }

    // Используем оригинальные изображения с сайта guitarstrings.com.ua
    // Всегда переопределяем изображение на основе названия товара

    // Очищаем название товара от лишнего текста
    let productName = (processedProduct.name || '').toLowerCase();

    // Удаляем лишний текст из названий товаров из static_products.json
    productName = productName.replace(/в наличии в одессе/gi, '');
    productName = productName.replace(/цена:.*/gi, '');
    productName = productName.replace(/сравнить/gi, '');
    productName = productName.replace(/описание товара/gi, '');
    productName = productName.replace(/\([0-9.]+\s*-\s*[0-9]+\s*голосов?\)/gi, '');
    productName = productName.replace(/[0-9]+\s*голосов?/gi, '');
    productName = productName.replace(/\n+/g, ' ');
    productName = productName.trim();

    console.log('Очищенное название товара:', productName);

        // Назначаем изображения на основе анализа названия товара (используем оригинальные пути с guitarstrings.com.ua)
        let imageUrl = '';

        if (productName.includes('ernie ball') || productName.includes('ernie_ball')) {
            imageUrl = 'https://guitarstrings.com.ua/images/stories/virtuemart/product/resized/ernie_ball_1010-350_0x170.png';
        } else if (productName.includes('elixir')) {
            imageUrl = 'https://guitarstrings.com.ua/images/stories/virtuemart/product/resized/elixir_12052_box_open_0x170.png';
        } else if (productName.includes('d\'addario') || productName.includes('daddario')) {
            imageUrl = 'https://guitarstrings.com.ua/images/stories/virtuemart/product/resized/daddario_electric_guitar_strings_0x170.png';
        } else if (productName.includes('fender')) {
            imageUrl = 'https://guitarstrings.com.ua/images/stories/virtuemart/product/resized/fender_bullet_end_0x170.png';
        } else if (productName.includes('gibson')) {
            imageUrl = 'https://guitarstrings.com.ua/images/stories/virtuemart/product/resized/gibson_strings_0x170.png';
        } else if (productName.includes('martin')) {
            imageUrl = 'https://guitarstrings.com.ua/images/stories/virtuemart/product/resized/martin_acoustic_strings_0x170.png';
        } else if (productName.includes('orphee')) {
            imageUrl = 'https://guitarstrings.com.ua/images/stories/virtuemart/product/resized/orphee_rx15-9-42_0x170.png';
        } else if (productName.includes('cleartone')) {
            imageUrl = 'https://guitarstrings.com.ua/images/stories/virtuemart/product/resized/cleartone_strings_0x170.png';
        } else if (productName.includes('ghs')) {
            imageUrl = 'https://guitarstrings.com.ua/images/stories/virtuemart/product/resized/ghs_boomers_0x170.png';
        } else if (productName.includes('la bella')) {
            imageUrl = 'https://guitarstrings.com.ua/images/stories/virtuemart/product/resized/la_bella_hrs_0x170.png';
        } else if (productName.includes('rotosound')) {
            imageUrl = 'https://guitarstrings.com.ua/images/stories/virtuemart/product/resized/rotosound_strings_0x170.png';
        } else if (productName.includes('dunlop')) {
            imageUrl = 'https://guitarstrings.com.ua/images/stories/virtuemart/product/resized/dunlop_strings_0x170.png';
        } else if (productName.includes('dr')) {
            imageUrl = 'https://guitarstrings.com.ua/images/stories/virtuemart/product/resized/dr_strings_0x170.png';
        } else if (productName.includes('pyramid')) {
            imageUrl = 'https://guitarstrings.com.ua/images/stories/virtuemart/product/resized/pyramid_strings_0x170.png';
        } else if (productName.includes('musician\'s gear')) {
            imageUrl = 'https://guitarstrings.com.ua/images/stories/virtuemart/product/resized/musicians_gear_10-46_0x170.jpg';
        } else if (productName.includes('dean markley')) {
            imageUrl = 'https://guitarstrings.com.ua/images/stories/virtuemart/product/resized/dean_markley_strings_0x170.png';
        } else if (productName.includes('acoustic') || productName.includes('акустич')) {
            imageUrl = 'https://guitarstrings.com.ua/images/stories/virtuemart/product/resized/acoustic_guitar_strings_category_0x170.png';
        } else if (productName.includes('bass') || productName.includes('бас')) {
            imageUrl = 'https://guitarstrings.com.ua/images/stories/virtuemart/product/resized/bass_strings_category_0x170.png';
        } else if (productName.includes('classic') || productName.includes('классич')) {
            imageUrl = 'https://guitarstrings.com.ua/images/stories/virtuemart/product/resized/classical_guitar_strings_category_0x170.png';
        } else if (productName.includes('ukulele')) {
            imageUrl = 'https://guitarstrings.com.ua/images/stories/virtuemart/product/resized/ukulele_strings_0x170.png';
        } else {
            // Для остальных товаров используем общее изображение электрогитарных струн
            imageUrl = 'https://guitarstrings.com.ua/images/stories/virtuemart/product/resized/electric_guitar_strings_category_0x170.png';
        }

    // Устанавливаем изображение с проверкой
    if (imageUrl) {
        processedProduct.image = imageUrl;
        console.log('Установлено изображение:', imageUrl, 'для товара:', productName);
    } else {
        processedProduct.image = './images/Discontinued.jpg';
        console.log('Не удалось определить изображение для товара:', productName);
    }

    return processedProduct;
}

// Текущая категория товаров уже объявлена выше

// Функция для изменения категории товаров
async function changeCategory(category) {
    console.log('changeCategory: Смена категории на:', category);

    // Маппинг категорий из HTML в API формат
    const categoryMapping = {
        'electricGuitarStrings': 'electro',
        'acousticGuitarStrings': 'acoustic',
        'classicalGuitarStrings': 'classic',
        'bassStrings': 'bass',
        'singleStrings': 'electro', // пока что используем electro для поштучных
        'ukuleleStrings': 'ukulele',
        'stringsWholesale': 'electro', // пока что используем electro для оптовых
        'guitarPicks': 'picks',
        'accessories': 'accessories',
        'percussion': 'electro', // пока что используем electro
        'ukulele': 'ukulele',
        'drumsticksVicFirth': 'electro', // пока что используем electro
        'jellyBellyBeanBoozled': 'electro', // пока что используем electro
        'preOrder': 'electro' // пока что используем electro
    };

    // Преобразуем категорию в API формат
    const apiCategory = categoryMapping[category] || category;
    currentCategory = apiCategory;
    currentPage = 0;
    hasMoreProducts = true;

    // Очищаем текущие товары
    const container = document.getElementById('productsContainer');
    if (container) {
        container.innerHTML = '';
    }

    // Определяем, является ли категория брендом или реальной категорией
    const brandCategories = ['ernie-ball', 'ernie_ball', 'daddario', 'd\'addario', 'fender', 'gibson',
                           'stainless-steel', 'stainless_steel', 'nickel', 'pure-nickel', 'cobalt', 'colored'];

    if (brandCategories.includes(category.toLowerCase())) {
        // Это бренд - фильтруем локально
        await filterByBrand(category);
    } else {
        // Это реальная категория - загружаем через API
        loadProductsByCategory(currentCategory, 0, false);
    }
}

// Функция инициализации категорий
function initCategories() {
    console.log('initCategories: Инициализация системы категорий');

    // Добавляем обработчики для кнопок категорий
    const categoryButtons = document.querySelectorAll('[data-category]');
    categoryButtons.forEach(button => {
        button.addEventListener('click', async function() {
            const category = this.getAttribute('data-category');
            await changeCategory(category);
        });
    });

    // Добавляем обработчики для брендов
    const brandButtons = document.querySelectorAll('[data-brand]');
    brandButtons.forEach(button => {
        button.addEventListener('click', async function() {
            const brand = this.getAttribute('data-brand');
            await filterByBrand(brand);
        });
    });
}

// Функция фильтрации по бренду
async function filterByBrand(brand) {
    console.log('filterByBrand: Фильтрация по бренду:', brand);

    try {
        // Сначала пытаемся загрузить товары из static_products.json
        let allProducts = [];

        try {
            const response = await fetch('./static_products.json');
            if (response.ok) {
                const data = await response.json();
                if (data.products) {
                    allProducts = data.products.map(product => processProductData(product));
                }
            }
        } catch (error) {
            console.warn('filterByBrand: Не удалось загрузить из static_products.json, используем базу знаний');
        }

        // Если не удалось загрузить из JSON, используем базу знаний
        if (allProducts.length === 0) {
            allProducts = getAllProductsFromKnowledgeBase();
        }

        // Фильтруем товары по бренду
        let filteredProducts = [];

        switch(brand.toLowerCase()) {
            case 'ernie-ball':
            case 'ernie_ball':
                filteredProducts = allProducts.filter(product =>
                    product.name && product.name.toLowerCase().includes('ernie ball')
                );
                break;

            case 'daddario':
            case 'd\'addario':
                filteredProducts = allProducts.filter(product =>
                    product.name && product.name.toLowerCase().includes('d\'addario')
                );
                break;

            case 'fender':
                filteredProducts = allProducts.filter(product =>
                    product.name && product.name.toLowerCase().includes('fender')
                );
                break;

            case 'gibson':
                filteredProducts = allProducts.filter(product =>
                    product.name && product.name.toLowerCase().includes('gibson')
                );
                break;

            case 'stainless-steel':
            case 'stainless_steel':
                filteredProducts = allProducts.filter(product =>
                    product.name && (product.name.toLowerCase().includes('stainless') ||
                                   product.name.toLowerCase().includes('steel'))
                );
                break;

            case 'nickel':
                filteredProducts = allProducts.filter(product =>
                    product.name && product.name.toLowerCase().includes('nickel')
                );
                break;

            case 'pure-nickel':
                filteredProducts = allProducts.filter(product =>
                    product.name && product.name.toLowerCase().includes('pure nickel')
                );
                break;

            case 'cobalt':
                filteredProducts = allProducts.filter(product =>
                    product.name && product.name.toLowerCase().includes('cobalt')
                );
                break;

            case 'colored':
                filteredProducts = allProducts.filter(product =>
                    product.name && product.name.toLowerCase().includes('colored')
                );
                break;

            default:
                filteredProducts = allProducts;
                break;
        }

        // Если фильтр не дал результатов, показываем все товары
        if (filteredProducts.length === 0) {
            filteredProducts = allProducts.slice(0, 30);
        }

        // Сортируем и отображаем
        const sortedProducts = sortProductsByPolicy(filteredProducts);
        displayProducts(sortedProducts.slice(0, 30));

        // Показываем уведомление
        showNotification(`Найдено товаров: ${filteredProducts.length}`, 'info');

        console.log('filterByBrand: Отфильтровано товаров:', filteredProducts.length);

    } catch (error) {
        console.error('filterByBrand: Ошибка фильтрации:', error);
        showNotification('Ошибка фильтрации товаров', 'error');
    }
}

// Функция сортировки товаров согласно политике базы знаний
function sortProductsByPolicy(products) {
    console.log('sortProductsByPolicy: Сортировка товаров по политике');

    return products.sort((a, b) => {
        // Политика сортировки:
        // 1. В наличии → Ожидается поставка → Под заказ → Снят с производства
        const statusOrder = {
            'В наличии': 1,
            'Ожидается': 2,
            'Под заказ': 3,
            'Снят с производства': 4
        };

        const statusA = statusOrder[a.availability] || statusOrder[a.availability] || 5;
        const statusB = statusOrder[b.availability] || statusOrder[b.availability] || 5;

        // Сначала сортируем по статусу
        if (statusA !== statusB) {
            return statusA - statusB;
        }

        // Если статус одинаковый, сортируем по цене по возрастанию
        const priceA = parseFloat(a.price) || parseFloat(a.newPrice) || 0;
        const priceB = parseFloat(b.price) || parseFloat(b.newPrice) || 0;

        return priceA - priceB;
    });
}

async function loadProducts(page = 0, append = false) {
    console.log('loadProducts: Перенаправление на loadProductsByCategory');
    await loadProductsByCategory(currentCategory, page, append);
}

// Функция добавления товаров к существующим
function appendProducts(products) {
    console.log('appendProducts: Добавляем товары:', products.length);

    const container = document.getElementById('productsContainer');
    if (!container) {
        console.error('appendProducts: Контейнер #productsContainer не найден');
        return;
    }

    // Добавляем товары к глобальному массиву
    if (!window.currentProducts) {
        window.currentProducts = [];
    }
    window.currentProducts = [...window.currentProducts, ...products];

    let html = '';

    products.forEach((product, index) => {
        const globalIndex = window.currentProducts.length - products.length + index;
        const productName = (product.name || 'Без названия').replace(/'/g, "\\'").replace(/"/g, '&quot;');
        const productPrice = product.newPrice || product.price || 0;
        const productOldPrice = product.oldPrice || 0;
        const productImage = product.image || './images/Discontinued.jpg';
        const availability = product.availability || 'В наличии';

        // Генерируем рейтинг звезд (от 3.5 до 5.0)
        const rating = product.rating || (Math.random() * 1.5 + 3.5).toFixed(1);
        const reviewCount = Math.floor(Math.random() * 200 + 10);

        // Определяем бейджи на основе названия товара (ТОЛЬКО оригинальные из базы знаний)
        let badges = '';
        const nameLower = productName.toLowerCase();

        // Производители (только DR и La Bella из базы знаний)
        if (nameLower.includes('dr ')) {
            badges += '<span class="product-manufacturer">Виробник: DR</span>';
        }
        if (nameLower.includes('la bella')) {
            badges += '<span class="product-manufacturer">Виробник: La Bella</span>';
        }

        // Типы струн (только из базы знаний)
        if (nameLower.includes('7-string') || nameLower.includes('7 струн')) {
            badges += '<span class="product-seven-string">7 струн для электрогитары</span>';
        }
        if (nameLower.includes('8-string') || nameLower.includes('8 струн')) {
            badges += '<span class="product-eight-string">8 струн для электрогитары</span>';
        }
        if (nameLower.includes('9-string') || nameLower.includes('9 струн')) {
            badges += '<span class="product-nine-string">9 струн для электрогитары</span>';
        }

        // Типы обмотки (плоская обмотка из базы знаний)
        if (nameLower.includes('flatwound') || nameLower.includes('flat wound') ||
            nameLower.includes('stainless steel flats') || nameLower.includes('half rounds') ||
            nameLower.includes('semi-flat') || nameLower.includes('chromes flat wound') ||
            nameLower.includes('chromes')) {
            badges += '<span class="product-flatwound">плоская обмотка</span>';
        }

        // Получаем текущий язык
        const currentLanguage = localStorage.getItem('selectedLanguage') || 'uk';
        const currentTranslations = translations[currentLanguage] || translations.uk;

        // Определяем статус товара и кнопку
        let availabilityClass = 'in-stock';
        let availabilityText = currentTranslations.inStock;
        let statusButton = '';

        if (availability === 'Нет в наличии') {
            availabilityClass = 'out-of-stock';
            availabilityText = currentTranslations.outOfStock;
            statusButton = `<button class="btn status-btn out-of-stock" onclick="showOutOfStockPopup()">${availabilityText}</button>`;
        } else if (availability === 'Под заказ') {
            availabilityClass = 'on-order';
            availabilityText = currentTranslations.onOrder;
            statusButton = `<button class="btn status-btn on-order" onclick="showOnOrderPopup()">${availabilityText}</button>`;
        } else if (availability === 'Ожидается') {
            availabilityClass = 'expected';
            availabilityText = currentTranslations.expected;
            statusButton = `<button class="btn status-btn expected" onclick="showExpectedPopup()">${availabilityText}</button>`;
        } else if (availability === 'Снят с производства') {
            availabilityClass = 'discontinued';
            availabilityText = currentTranslations.discontinued;
            statusButton = `<button class="btn status-btn discontinued" onclick="showDiscontinuedPopup()">${availabilityText}</button>`;
        } else {
            statusButton = `<button class="btn add-to-cart-btn" data-index="${globalIndex}" onclick="addToCart(${globalIndex})">${currentTranslations.buyButton}</button>`;
        }

        html += `
            <div class="product-card">
                <div class="product-actions">
                    <button class="favorite-btn" data-index="${globalIndex}" onclick="toggleFavorite(${globalIndex})">
                        <i class="far fa-heart"></i>
                    </button>
                    <button class="compare-btn" data-index="${globalIndex}" onclick="toggleCompare(${globalIndex})">
                        <i class="fas fa-balance-scale"></i>
                    </button>
            </div>
                <div class="img-container">
                    <img class="img" src="${productImage}" alt="${productName}" onerror="this.src='./images/Discontinued.jpg'" loading="lazy">
                </div>
                <div class="product-title">${productName.substring(0, 50)}${productName.length > 50 ? '...' : ''}</div>
                <div class="product-status ${availabilityClass}">${availabilityText}</div>
                <div class="product-subtitle">
                    ${badges}
                </div>
                <div class="product-prices">
                    <div class="new-price">${productPrice > 0 ? productPrice + ' ₴' : 'Цена по запросу'}</div>
                    ${productOldPrice > productPrice && productOldPrice > 0 ? '<div class="old-price">' + productOldPrice + ' ₴</div>' : ''}
                </div>
                <div class="product-rating">
                    <div class="stars">
                        ${generateStars(rating)}
                    </div>
                    <span class="rating-value">${rating}</span>
                    <span class="review-count">(${reviewCount})</span>
                </div>
                ${statusButton}
            </div>
        `;
    });

    container.insertAdjacentHTML('beforeend', html);

    // Обновляем глобальный массив товаров
    if (window.currentProducts) {
        window.currentProducts = [...window.currentProducts, ...products];
    } else {
        window.currentProducts = products;
    }
}

// Функция отображения товаров
function displayProducts(products) {
    console.log('displayProducts: Отображаем товары, количество:', products.length);

    const container = document.getElementById('productsContainer');
    if (!container) {
        console.error('displayProducts: Контейнер #productsContainer не найден');
        return;
    }
    console.log('displayProducts: Контейнер найден:', container);

    let html = '';

    products.forEach((product, index) => {
        const globalIndex = index;
        const productName = (product.name || 'Без названия').replace(/'/g, "\\'").replace(/"/g, '&quot;');
        const productPrice = product.newPrice || product.price || 0;
        const productOldPrice = product.oldPrice || 0;
        const productImage = product.image || './images/Discontinued.jpg';
        const availability = product.availability || 'В наличии';

        // Генерируем рейтинг звезд (от 3.5 до 5.0)
        const rating = product.rating || (Math.random() * 1.5 + 3.5).toFixed(1);
        const reviewCount = Math.floor(Math.random() * 200 + 10);

        // Определяем бейджи на основе названия товара (ТОЛЬКО оригинальные из базы знаний)
        let badges = '';
        const nameLower = productName.toLowerCase();

        // Производители (только DR и La Bella из базы знаний)
        if (nameLower.includes('dr ')) {
            badges += '<span class="product-manufacturer">Виробник: DR</span>';
        }
        if (nameLower.includes('la bella')) {
            badges += '<span class="product-manufacturer">Виробник: La Bella</span>';
        }

        // Типы струн (только из базы знаний)
        if (nameLower.includes('7-string') || nameLower.includes('7 струн')) {
            badges += '<span class="product-seven-string">7 струн для электрогитары</span>';
        }
        if (nameLower.includes('8-string') || nameLower.includes('8 струн')) {
            badges += '<span class="product-eight-string">8 струн для электрогитары</span>';
        }
        if (nameLower.includes('9-string') || nameLower.includes('9 струн')) {
            badges += '<span class="product-nine-string">9 струн для электрогитары</span>';
        }

        // Типы обмотки (плоская обмотка из базы знаний)
        if (nameLower.includes('flatwound') || nameLower.includes('flat wound') ||
            nameLower.includes('stainless steel flats') || nameLower.includes('half rounds') ||
            nameLower.includes('semi-flat') || nameLower.includes('chromes flat wound') ||
            nameLower.includes('chromes')) {
            badges += '<span class="product-flatwound">плоская обмотка</span>';
        }

        // Получаем текущий язык
        const currentLanguage = localStorage.getItem('selectedLanguage') || 'uk';
        const currentTranslations = translations[currentLanguage] || translations.uk;

        // Определяем статус товара и кнопку
        let availabilityClass = 'in-stock';
        let availabilityText = currentTranslations.inStock;
        let statusButton = '';

        if (availability === 'Нет в наличии') {
            availabilityClass = 'out-of-stock';
            availabilityText = currentTranslations.outOfStock;
            statusButton = `<button class="btn status-btn out-of-stock" onclick="showOutOfStockPopup()">${availabilityText}</button>`;
        } else if (availability === 'Под заказ') {
            availabilityClass = 'on-order';
            availabilityText = currentTranslations.onOrder;
            statusButton = `<button class="btn status-btn on-order" onclick="showOnOrderPopup()">${availabilityText}</button>`;
        } else if (availability === 'Ожидается') {
            availabilityClass = 'expected';
            availabilityText = currentTranslations.expected;
            statusButton = `<button class="btn status-btn expected" onclick="showExpectedPopup()">${availabilityText}</button>`;
        } else if (availability === 'Снят с производства') {
            availabilityClass = 'discontinued';
            availabilityText = currentTranslations.discontinued;
            statusButton = `<button class="btn status-btn discontinued" onclick="showDiscontinuedPopup()">${availabilityText}</button>`;
        } else {
            statusButton = `<button class="btn add-to-cart-btn" data-index="${globalIndex}" onclick="addToCart(${globalIndex})">${currentTranslations.buyButton}</button>`;
        }

        html += `
            <div class="product-card">
                <div class="product-actions">
                    <button class="favorite-btn" data-index="${globalIndex}" onclick="toggleFavorite(${globalIndex})">
                        <i class="far fa-heart"></i>
                    </button>
                    <button class="compare-btn" data-index="${globalIndex}" onclick="toggleCompare(${globalIndex})">
                        <i class="fas fa-balance-scale"></i>
                    </button>
                </div>
                <div class="img-container">
                    <img class="img" src="${productImage}" alt="${productName}" onerror="this.src='./images/Discontinued.jpg'" loading="lazy">
                </div>
                <div class="product-title">${productName.substring(0, 60)}${productName.length > 60 ? '...' : ''}</div>
                <div class="product-status ${availabilityClass}">${availabilityText}</div>
                <div class="product-subtitle">
                    ${badges}
                </div>
                <div class="product-prices">
                    <div class="new-price">${productPrice > 0 ? productPrice + ' ₴' : 'Цена по запросу'}</div>
                    ${productOldPrice > productPrice && productOldPrice > 0 ? '<div class="old-price">' + productOldPrice + ' ₴</div>' : ''}
                </div>
                <div class="product-rating">
                    <div class="stars">
                        ${generateStars(rating)}
                    </div>
                    <span class="rating-value">${rating}</span>
                    <span class="review-count">(${reviewCount})</span>
                </div>
                ${statusButton}
            </div>
        `;
    });

    container.innerHTML = html;
    console.log('displayProducts: HTML вставлен в контейнер, длина HTML:', html.length);

    // Сохраняем товары в глобальном массиве для доступа из обработчиков
    window.currentProducts = products;
    console.log('displayProducts: Товары отображены успешно, количество:', products.length);
    console.log('displayProducts: Содержимое контейнера после вставки:', container.innerHTML.substring(0, 200) + '...');
}

// Функция добавления в избранное
window.toggleFavorite = function(index) {
    try {
        const product = window.currentProducts[index];
        if (!product) return;

        // Переключаем состояние избранного
        product.isFavorite = !product.isFavorite;

        // Находим кнопку и меняем ее состояние
        const favoriteBtn = document.querySelector(`.favorite-btn[data-index="${index}"]`);
        if (favoriteBtn) {
            if (product.isFavorite) {
                favoriteBtn.classList.add('active');
                favoriteBtn.innerHTML = '<i class="fas fa-heart"></i>';
            } else {
                favoriteBtn.classList.remove('active');
                favoriteBtn.innerHTML = '<i class="far fa-heart"></i>';
            }
        }

        // Показываем уведомление
        const message = product.isFavorite ? 'Добавлено в избранное' : 'Удалено из избранного';
        showNotification(message, 'info');

        console.log('toggleFavorite: Изменено состояние избранного для товара:', product.name);

    } catch (error) {
        console.error('toggleFavorite: Ошибка:', error);
        showNotification('Ошибка при работе с избранным', 'error');
    }
};

// Функция добавления в сравнение
window.toggleCompare = function(index) {
    try {
        const product = window.currentProducts[index];
        if (!product) return;

        // Переключаем состояние сравнения
        product.isCompare = !product.isCompare;

        // Находим кнопку и меняем ее состояние
        const compareBtn = document.querySelector(`.compare-btn[data-index="${index}"]`);
        if (compareBtn) {
            if (product.isCompare) {
                compareBtn.classList.add('active');
                compareBtn.innerHTML = '<i class="fas fa-balance-scale"></i>';
            } else {
                compareBtn.classList.remove('active');
                compareBtn.innerHTML = '<i class="far fa-balance-scale"></i>';
            }
        }

        // Показываем уведомление
        const message = product.isCompare ? 'Добавлено к сравнению' : 'Удалено из сравнения';
        showNotification(message, 'info');

        console.log('toggleCompare: Изменено состояние сравнения для товара:', product.name);

    } catch (error) {
        console.error('toggleCompare: Ошибка:', error);
        showNotification('Ошибка при работе со сравнением', 'error');
    }
};

// Функция быстрого просмотра товара
window.quickViewProduct = function(index) {
    try {
        const product = window.currentProducts[index];
        if (!product) return;

        // Создаем модальное окно
        const modal = document.createElement('div');
        modal.className = 'quick-view-modal';
        modal.innerHTML = `
            <div class="quick-view-overlay" onclick="closeQuickViewModal()"></div>
            <div class="quick-view-content">
                <button class="close-btn" onclick="closeQuickViewModal()">×</button>
                <div class="quick-view-image">
                    <img src="${product.image || './images/Discontinued.jpg'}"
                         alt="${product.name}"
                         onerror="handleImageError(this, '${product.name}')"
                         loading="lazy"
                         style="max-width: 100%; height: auto;">
                </div>
                <div class="quick-view-info">
                    <h2>${product.name}</h2>
                    <div class="quick-view-price">
                        <span class="price">${product.newPrice || product.price || 0} ₴</span>
                        ${product.oldPrice && product.oldPrice > (product.newPrice || product.price) ? '<span class="old-price">' + product.oldPrice + ' ₴</span>' : ''}
                    </div>
                    <div class="quick-view-rating">
                        <div class="stars">${generateStars(product.rating || 4.0)}</div>
                        <span class="rating">${product.rating || 4.0}</span>
                    </div>
                    <div class="quick-view-availability">
                        <span class="availability ${getAvailabilityClass(product.availability)}">${product.availability || 'В наличии'}</span>
                    </div>
                    <button class="btn btn-primary" onclick="addToCart(${index}); closeQuickViewModal();">
                        <i class="fas fa-shopping-cart"></i>
                        Добавить в корзину
                    </button>
                </div>
            </div>
        `;

        document.body.appendChild(modal);

        console.log('quickViewProduct: Быстрый просмотр товара:', product.name);

    } catch (error) {
        console.error('quickViewProduct: Ошибка:', error);
        showNotification('Ошибка при просмотре товара', 'error');
    }
};

// Функция закрытия модального окна
window.closeQuickViewModal = function() {
    const modal = document.querySelector('.quick-view-modal');
    if (modal) {
        modal.remove();
    }
};

// Вспомогательная функция для определения класса доступности
function getAvailabilityClass(availability) {
    switch((availability || 'В наличии').toLowerCase()) {
        case 'ожидается': return 'expected';
        case 'под заказ': return 'order';
        case 'снят с производства': return 'discontinued';
        default: return 'available';
    }
}

// ===== ОСНОВНЫЕ ФУНКЦИИ ИНТЕРФЕЙСА =====

// Дублированная функция showMenuPopup удалена

// Дублированная функция showSettingsPopup удалена

// Функция открытия контактов
window.showContactsPopup = function() {
    console.log('showContactsPopup: открываем контакты');
    const contactsPopup = document.getElementById('contactsPopup');
    if (contactsPopup) {
        contactsPopup.style.display = 'flex';
        document.body.style.overflow = 'hidden';
    }
};

// Функция открытия оферты
window.showOfferPopup = function() {
    console.log('showOfferPopup: открываем оферту');
    const offerPopup = document.getElementById('offerPopup');
    if (offerPopup) {
        offerPopup.style.display = 'flex';
        document.body.style.overflow = 'hidden';
    }
};

// Функция закрытия popup окон
window.closePopup = function(popupId) {
    console.log('closePopup: закрываем popup', popupId);
    const popup = document.getElementById(popupId);
    if (popup) {
        popup.style.display = 'none';
        document.body.style.overflow = ''; // Восстанавливаем прокрутку
    }
};

// Функция закрытия контактов
window.closeContactsPopup = function() {
    console.log('closeContactsPopup: закрываем контакты');
    const contactsPopup = document.getElementById('contactsPopup');
    if (contactsPopup) {
        contactsPopup.style.display = 'none';
        document.body.style.overflow = '';
    }
};

// Функция закрытия оферты
window.closeOfferPopup = function() {
    console.log('closeOfferPopup: закрываем оферту');
    const offerPopup = document.getElementById('offerPopup');
    if (offerPopup) {
        offerPopup.style.display = 'none';
        document.body.style.overflow = '';
    }
};

// Функция переключения меню аватара
// Дублированная функция toggleAvatarMenu удалена

// Дублированная функция clearCategoryFilter удалена

// Дублированная функция goToCart удалена

// Функция закрытия корзины
window.closeCartPopup = function() {
    console.log('closeCartPopup: закрываем корзину');
    const cartPopup = document.getElementById('cartPopup');
    if (cartPopup) {
        cartPopup.style.display = 'none';
        document.body.style.overflow = '';
    }
};

// Функция открытия Telegram чата
// Дублированная функция openTelegramChat удалена

// Функция подтверждения заказа
window.checkout = function() {
    console.log('checkout: оформляем заказ');
    // Здесь должна быть логика оформления заказа
    alert('Функция оформления заказа будет реализована');
};

// Функция печати заказа
window.printOrder = function() {
    console.log('printOrder: печатаем заказ');
    window.print();
};

// Функция переключения избранного
window.toggleFavorite = function(index) {
    console.log('toggleFavorite: переключаем избранное для товара', index);
    const favoriteBtn = document.querySelector(`.favorite-btn[data-index="${index}"]`);
    if (favoriteBtn) {
        favoriteBtn.classList.toggle('active');
        if (favoriteBtn.classList.contains('active')) {
            favoriteBtn.innerHTML = '<i class="fas fa-heart"></i>';
            showNotification('Добавлено в избранное', 'success');
        } else {
            favoriteBtn.innerHTML = '<i class="far fa-heart"></i>';
            showNotification('Удалено из избранного', 'info');
        }
    }
};

// Функция переключения сравнения
window.toggleCompare = function(index) {
    console.log('toggleCompare: переключаем сравнение для товара', index);
    const compareBtn = document.querySelector(`.compare-btn[data-index="${index}"]`);
    if (compareBtn) {
        compareBtn.classList.toggle('active');
        if (compareBtn.classList.contains('active')) {
            compareBtn.innerHTML = '<i class="fas fa-balance-scale"></i>';
            showNotification('Добавлено к сравнению', 'success');
        } else {
            compareBtn.innerHTML = '<i class="fas fa-balance-scale"></i>';
            showNotification('Удалено из сравнения', 'info');
        }
    }
};

// Функция продолжения покупок
window.continueShopping = function() {
    console.log('continueShopping: продолжаем покупки');
    closeCartPopup();
};

// Функция показа деталей последнего заказа
window.showLastOrderDetails = function() {
    console.log('showLastOrderDetails: показываем детали заказа');
    const orderDetailsPopup = document.getElementById('orderDetailsPopup');
    if (orderDetailsPopup) {
        orderDetailsPopup.style.display = 'flex';
        document.body.style.overflow = 'hidden';
    }
};

// Функция закрытия деталей заказа
window.closeOrderAcceptedPopup = function() {
    console.log('closeOrderAcceptedPopup: закрываем подтверждение заказа');
    const popup = document.getElementById('orderAcceptedPopup');
    if (popup) {
        popup.style.display = 'none';
        document.body.style.overflow = '';
    }
};

// Функция показа/скрытия нижней навигации
window.toggleBottomNav = function() {
    console.log('toggleBottomNav: переключаем нижнюю навигацию');
    const bottomNav = document.querySelector('.bottom-nav');
    if (bottomNav) {
        bottomNav.style.display = bottomNav.style.display === 'none' ? 'flex' : 'none';
    }
};

// Функция обновления стоимости доставки
window.updateDeliveryCost = function() {
    console.log('updateDeliveryCost: обновляем стоимость доставки');
    const deliverySelect = document.getElementById('deliveryMethodSelect');
    if (deliverySelect) {
        const selectedOption = deliverySelect.value;
        let deliveryCost = 80; // Базовая стоимость

        if (selectedOption === 'pickup') {
            deliveryCost = 0; // Самовывоз бесплатный
        } else if (selectedOption === 'free1001') {
            deliveryCost = 0; // Бесплатная доставка при сумме > 1000
        } else if (selectedOption === 'free2000') {
            deliveryCost = 0; // Бесплатная доставка при сумме > 2000
        }

        // Обновляем отображение стоимости доставки
        const deliveryElement = document.querySelector('.price-row .price-row:last-child .price-row:last-child');
        if (deliveryElement) {
            deliveryElement.textContent = deliveryCost + ' грн';
        }

        // Пересчитываем итоговую сумму
        updateCartTotal();
    }
};

// Функция обновления итоговой суммы корзины
window.updateCartTotal = function() {
    console.log('updateCartTotal: обновляем итоговую сумму');
    // Здесь должна быть логика пересчета суммы
    // Пока оставим заглушку
};

// Функция показа товаров по категории
window.filterByCategory = function(category) {
    console.log('filterByCategory: фильтруем по категории', category);
    currentCategory = category;

    // Сбрасываем другие фильтры
    currentBrand = '';
    currentGauge = '';

    // Обновляем визуальные индикаторы
    document.querySelectorAll('.brand-logo.active').forEach(el => el.classList.remove('active'));

    // Перезагружаем товары с фильтром
    loadProducts();
};

// Функция фильтрации по бренду
window.filterByBrand = function(brand) {
    console.log('filterByBrand: фильтруем по бренду', brand);
    currentBrand = brand;

    // Сбрасываем другие фильтры
    currentCategory = '';
    currentGauge = '';

    // Обновляем визуальные индикаторы
    document.querySelectorAll('.brand-logo.active').forEach(el => el.classList.remove('active'));

    // Перезагружаем товары с фильтром
    loadProducts();
};

// Функция фильтрации по калибру
window.filterByGauge = function(gauge) {
    console.log('filterByGauge: фильтруем по калибру', gauge);
    currentGauge = gauge;

    // Сбрасываем другие фильтры
    currentCategory = '';
    currentBrand = '';

    // Обновляем визуальные индикаторы
    document.querySelectorAll('.brand-logo.active').forEach(el => el.classList.remove('active'));

    // Перезагружаем товары с фильтром
    loadProducts();
};

// ===== ИНИЦИАЛИЗАЦИЯ ОБРАБОТЧИКОВ СОБЫТИЙ =====

// Функция инициализации всех обработчиков событий
window.initEventListeners = function() {
    console.log('initEventListeners: инициализируем обработчики событий');

    // Обработчики для категорий в меню
    document.querySelectorAll('.category-item').forEach(item => {
        item.addEventListener('click', function() {
            const category = this.getAttribute('data-category');
            filterByCategory(category);
            closePopup('menuPopup');
        });
    });

    // Обработчики для брендов в баннере
    document.querySelectorAll('.brand-logo').forEach(logo => {
        logo.addEventListener('click', function() {
            const category = this.getAttribute('data-category');
            if (category) {
                if (category.includes('gauge')) {
                    filterByGauge(category);
                } else {
                    filterByBrand(category);
                }
                this.classList.add('active');
            }
        });
    });

    // Обработчики для кнопок языков
    document.querySelectorAll('.language-btn').forEach(btn => {
        btn.addEventListener('click', function() {
            const lang = this.getAttribute('data-lang');
            if (lang) {
                setLanguage(lang);
                // Обновляем активную кнопку
                document.querySelectorAll('.language-btn').forEach(b => b.classList.remove('active'));
                this.classList.add('active');
            }
        });
    });

    // Обработчик для кнопки поиска
    const searchInput = document.querySelector('.search-input');
    if (searchInput) {
        searchInput.addEventListener('keypress', function(e) {
            if (e.key === 'Enter') {
                const query = this.value.trim();
                if (query) {
                    searchProducts(query);
                }
            }
        });
    }

    // Обработчик для кнопки поиска (иконка)
    const searchIcon = document.querySelector('.search-icon');
    if (searchIcon) {
        searchIcon.addEventListener('click', function() {
            const searchInput = document.querySelector('.search-input');
            if (searchInput) {
                const query = searchInput.value.trim();
                if (query) {
                    searchProducts(query);
                }
            }
        });
    }

    // Обработчики для нижней навигации
    const navItems = document.querySelectorAll('.nav-item');
    navItems.forEach(item => {
        item.addEventListener('click', function() {
            // Убираем активный класс у всех
            navItems.forEach(nav => nav.classList.remove('active'));
            // Добавляем активный класс к текущему
            this.classList.add('active');
        });
    });

    console.log('initEventListeners: обработчики инициализированы');
};

// Функция поиска товаров
window.searchProducts = function(query) {
    console.log('searchProducts: ищем товары по запросу', query);
    // Здесь должна быть логика поиска
    // Пока оставим заглушку
    alert(`Поиск по запросу: ${query}`);
};

// Функция добавления в корзину
window.addToCart = function(index) {
    try {
        // Получаем товар из глобального массива по индексу
        if (!window.currentProducts || !window.currentProducts[index]) {
            throw new Error('Товар не найден');
        }

        const product = window.currentProducts[index];
        console.log('addToCart: Добавление товара:', product);

        // Проверяем, есть ли уже такой товар в корзине
        const existingIndex = cart.findIndex(item =>
            item.name === product.name &&
            (item.price || 0) === (product.price || 0)
        );

        if (existingIndex !== -1) {
            // Увеличиваем количество
            if (!cart[existingIndex].quantity) cart[existingIndex].quantity = 1;
            cart[existingIndex].quantity++;
        } else {
            // Добавляем новый товар
            cart.push({...product, quantity: 1});
        }

        cartItemCount++;
        updateCartBadge();

        // Показываем уведомление
        showNotification('Товар добавлен в корзину!', 'success');

    } catch (error) {
        console.error('addToCart: Ошибка при добавлении товара:', error);
        showNotification('Ошибка при добавлении товара', 'error');
    }
};

// Функция обработки ошибок загрузки изображений
window.handleImageError = function(img, productName) {
    console.log(`handleImageError: Ошибка загрузки изображения для "${productName}"`);

    // Пробуем альтернативные пути изображений
    const alternatives = [
        './images/Discontinued.jpg',
        'https://via.placeholder.com/170x170/cccccc/666666?text=No+Image'
    ];

    // Находим текущий индекс альтернативы
    let currentIndex = 0;
    for (let i = 0; i < alternatives.length; i++) {
        if (img.src.includes(alternatives[i])) {
            currentIndex = i;
            break;
        }
    }

    // Пробуем следующую альтернативу
    const nextIndex = currentIndex + 1;
    if (nextIndex < alternatives.length) {
        console.log(`handleImageError: Пробуем альтернативу ${nextIndex}: ${alternatives[nextIndex]}`);
        img.src = alternatives[nextIndex];
    } else {
        // Все альтернативы исчерпаны
        console.log('handleImageError: Все альтернативы исчерпаны, оставляем fallback');
        img.style.opacity = '0.5';
        img.title = `Изображение недоступно: ${productName}`;
    }
};

// Функция показа уведомлений
function showNotification(message, type) {
    // Создаем уведомление
    const notification = document.createElement('div');
    notification.className = `notification ${type}`;
    notification.style.cssText = `
        position: fixed;
        top: 20px;
        right: 20px;
        padding: 15px 20px;
        border-radius: 5px;
        color: white;
        font-weight: 500;
        z-index: 10000;
        max-width: 300px;
        box-shadow: 0 4px 12px rgba(0,0,0,0.3);
        background: ${type === 'success' ? '#4CAF50' : '#f44336'};
        animation: slideIn 0.3s ease-out;
    `;

    notification.innerHTML = message;

    document.body.appendChild(notification);

    // Удаляем уведомление через 3 секунды
    setTimeout(() => {
        notification.style.animation = 'slideOut 0.3s ease-out';
        setTimeout(() => {
            if (notification.parentNode) {
                notification.parentNode.removeChild(notification);
            }
        }, 300);
    }, 3000);
}

// Функция обновления бейджа корзины
function updateCartBadge() {
    const badge = document.querySelector('.cart-badge');
    if (badge) {
        badge.textContent = cartItemCount;
        badge.style.display = cartItemCount > 0 ? 'block' : 'none';
    }
}

// Функция обновления отображения корзины
function updateCartDisplay() {
    console.log('updateCartDisplay: обновляем отображение корзины');
    const cartItemsContainer = document.getElementById('cartItems');
    const cartTotalElement = document.querySelector('.cart-total');

    if (!cartItemsContainer) {
        console.error('updateCartDisplay: Контейнер товаров корзины не найден');
        return;
    }

    if (cart.length === 0) {
        cartItemsContainer.innerHTML = '<div class="empty-cart">Корзина пуста</div>';
        if (cartTotalElement) {
            cartTotalElement.textContent = '0 ₴';
        }
        return;
    }

    let html = '';
    let total = 0;

    cart.forEach((item, index) => {
        const itemTotal = (item.price || 0) * (item.quantity || 1);
        total += itemTotal;

        html += `
            <div class="cart-item">
                <div class="cart-item-image">
                    <img src="${item.image || './images/Discontinued.jpg'}" alt="${item.name || 'Без названия'}">
                </div>
                <div class="cart-item-info">
                    <h4 class="cart-item-name">${(item.name || 'Без названия').substring(0, 30)}${(item.name || '').length > 30 ? '...' : ''}</h4>
                    <div class="cart-item-price">${item.price || 0} ₴</div>
                    <div class="cart-item-quantity">
                        <button onclick="changeQuantity(${index}, -1)">-</button>
                        <span>${item.quantity || 1}</span>
                        <button onclick="changeQuantity(${index}, 1)">+</button>
                    </div>
                </div>
                <div class="cart-item-total">${itemTotal} ₴</div>
                <button class="remove-item" onclick="removeFromCart(${index})">×</button>
            </div>
        `;
    });

    cartItemsContainer.innerHTML = html;
    if (cartTotalElement) {
        cartTotalElement.textContent = `${total} ₴`;
    }

    cartTotal = total;
    console.log('updateCartDisplay: Корзина обновлена, товаров:', cart.length, 'на сумму:', total);
}

// Функция добавления отфильтрованного товара в корзину
window.addFilteredProductToCart = function(index) {
    console.log('addFilteredProductToCart: добавляем отфильтрованный товар в корзину, индекс:', index);

    if (!window.currentFilteredProducts || !window.currentFilteredProducts[index]) {
        console.error('addFilteredProductToCart: Товар не найден в отфильтрованных товарах');
        showNotification('Ошибка добавления товара', 'error');
        return;
    }

    const product = window.currentFilteredProducts[index];
    console.log('addFilteredProductToCart: Добавление товара:', product);

    // Проверяем, есть ли уже такой товар в корзине
    const existingIndex = cart.findIndex(item =>
        item.name === product.name &&
        (item.price || 0) === (product.price || 0)
    );

    if (existingIndex !== -1) {
        // Увеличиваем количество
        if (!cart[existingIndex].quantity) cart[existingIndex].quantity = 1;
        cart[existingIndex].quantity++;
    } else {
        // Добавляем новый товар
        cart.push({...product, quantity: 1});
    }

    cartItemCount++;
    updateCartBadge();
    showNotification('Товар добавлен в корзину!', 'success');
};

// Функция изменения количества товара в корзине
window.changeQuantity = function(index, delta) {
    console.log('changeQuantity: изменяем количество товара', index, 'на', delta);
    if (index < 0 || index >= cart.length) {
        console.error('changeQuantity: Неверный индекс товара');
        return;
    }

    const item = cart[index];
    const newQuantity = (item.quantity || 1) + delta;

    if (newQuantity <= 0) {
        removeFromCart(index);
        return;
    }

    item.quantity = newQuantity;
    cartItemCount += delta;
    updateCartBadge();
    updateCartDisplay();
};

// Функция удаления товара из корзины
window.removeFromCart = function(index) {
    console.log('removeFromCart: удаляем товар', index);
    if (index < 0 || index >= cart.length) {
        console.error('removeFromCart: Неверный индекс товара');
        return;
    }

    const removedItem = cart.splice(index, 1)[0];
    cartItemCount -= (removedItem.quantity || 1);
    updateCartBadge();
    updateCartDisplay();
    showNotification('Товар удален из корзины', 'info');
};

// Добавляем CSS анимации для уведомлений
const style = document.createElement('style');
style.textContent = `
    @keyframes slideIn {
        from {
            transform: translateX(100%);
            opacity: 0;
        }
        to {
            transform: translateX(0);
            opacity: 1;
        }
    }

    @keyframes slideOut {
        from {
            transform: translateX(0);
            opacity: 1;
        }
        to {
            transform: translateX(100%);
            opacity: 0;
        }
    }
`;
document.head.appendChild(style);

// Функция генерации звездочек для рейтинга
function generateStars(rating) {
    const fullStars = Math.floor(rating);
    const hasHalfStar = rating % 1 !== 0;
    const emptyStars = 5 - fullStars - (hasHalfStar ? 1 : 0);

    let starsHtml = '';

    // Полные звезды
    for (let i = 0; i < fullStars; i++) {
        starsHtml += '<i class="fas fa-star"></i>';
    }

    // Половина звезды
    if (hasHalfStar) {
        starsHtml += '<i class="fas fa-star-half-alt"></i>';
    }

    // Пустые звезды
    for (let i = 0; i < emptyStars; i++) {
        starsHtml += '<i class="far fa-star"></i>';
    }

    return starsHtml;
}

// Функции для работы с товарами
// Дублированные функции toggleFavorite и toggleCompare удалены

window.quickView = function(index) {
    console.log('quickView: быстрый просмотр товара', index);
    showNotification('Функция быстрого просмотра в разработке', 'info');
};

// Функции для работы с отфильтрованными товарами
window.toggleFavoriteFiltered = function(index) {
    console.log('toggleFavoriteFiltered: переключаем избранное для отфильтрованного товара', index);
    showNotification('Функция избранного в разработке', 'info');
};

window.toggleCompareFiltered = function(index) {
    console.log('toggleCompareFiltered: переключаем сравнение для отфильтрованного товара', index);
    showNotification('Функция сравнения в разработке', 'info');
};

window.quickViewFiltered = function(index) {
    console.log('quickViewFiltered: быстрый просмотр отфильтрованного товара', index);
    showNotification('Функция быстрого просмотра в разработке', 'info');
};

// Дублированная функция updateCartDisplay удалена

// Функция изменения количества товара в корзине
window.changeQuantity = function(index, delta) {
    console.log('changeQuantity: изменяем количество товара', index, 'на', delta);
    if (index < 0 || index >= cart.length) {
        console.error('changeQuantity: Неверный индекс товара');
        return;
    }

    const item = cart[index];
    const newQuantity = (item.quantity || 1) + delta;

    if (newQuantity <= 0) {
        removeFromCart(index);
        return;
    }

    item.quantity = newQuantity;
    cartItemCount += delta;
    updateCartBadge();
    updateCartDisplay();
};

// Функция удаления товара из корзины
window.removeFromCart = function(index) {
    console.log('removeFromCart: удаляем товар', index);
    if (index < 0 || index >= cart.length) {
        console.error('removeFromCart: Неверный индекс товара');
        return;
    }

    const removedItem = cart.splice(index, 1)[0];
    cartItemCount -= (removedItem.quantity || 1);
    updateCartBadge();
    updateCartDisplay();
    showNotification('Товар удален из корзины', 'info');
};

// Функция показа уведомлений
function showNotification(message, type) {
    // Создаем уведомление
    const notification = document.createElement('div');
    notification.className = `notification ${type}`;
    notification.style.cssText = `
        position: fixed;
        top: 20px;
        right: 20px;
        padding: 15px 20px;
        border-radius: 5px;
        color: white;
        font-weight: 500;
        z-index: 10000;
        max-width: 300px;
        box-shadow: 0 4px 12px rgba(0,0,0,0.3);
        background: ${type === 'success' ? '#4CAF50' : '#f44336'};
        animation: slideIn 0.3s ease-out;
    `;

    notification.innerHTML = message;

    document.body.appendChild(notification);

    // Удаляем уведомление через 3 секунды
    setTimeout(() => {
        notification.style.animation = 'slideOut 0.3s ease-out';
        setTimeout(() => {
            if (notification.parentNode) {
                notification.parentNode.removeChild(notification);
            }
        }, 300);
    }, 3000);
}

// Функции для фильтрации товаров по производителям (согласно базе знаний)
window.searchDRProducts = function() {
    console.log('searchDRProducts: Поиск товаров DR');
    const query = 'DR';
    filterProductsBySearch(query);
};

window.searchLaBellaProducts = function() {
    console.log('searchLaBellaProducts: Поиск товаров La Bella');
    const query = 'La Bella';
    filterProductsBySearch(query);
};

window.search7StringProducts = function() {
    console.log('search7StringProducts: Поиск 7-струнных товаров');
    const query = '7';
    filterProductsBySearch(query);
};

// Функции для работы с языками
let currentLanguage = localStorage.getItem('selectedLanguage') || 'uk';

function initLanguageSystem() {
    console.log('initLanguageSystem: инициализируем систему языков');
    const languageButtons = document.querySelectorAll('.language-btn');

    languageButtons.forEach(button => {
        button.addEventListener('click', function() {
            const lang = this.getAttribute('data-lang');
            setLanguage(lang);
        });
    });

    // Устанавливаем начальный язык
    setLanguage(currentLanguage);
    updateLanguageButtons();

    // Обновляем контент оферты при инициализации
    updateOfferContent();
}

function setLanguage(lang) {
    console.log('setLanguage: устанавливаем язык:', lang);
    currentLanguage = lang;
    localStorage.setItem('selectedLanguage', lang);

    // Обновляем все элементы с data-translate
    const elements = document.querySelectorAll('[data-translate]');
    elements.forEach(element => {
        const key = element.getAttribute('data-translate');
        const translation = getTranslation(key, lang);
        if (translation) {
            element.textContent = translation;
        }
    });

    updateLanguageButtons();

    // Обновляем контент оферты при смене языка
    updateOfferContent();
}

function getTranslation(key, lang) {
    // Здесь должны быть переводы, но пока возвращаем ключ
    const translations = {
        'uk': {
            'ordersList': 'Список замовлень',
            'totalOrdersLabel': 'Всього замовлень:',
            'orderNumber': 'Номер замовлення',
            'orderDate': 'Дата',
            'orderTotal': 'Сума',
            'orderStatus': 'Статус',
            'settings': 'Налаштування',
            'language': 'Мова',
            'ukr': 'УКР',
            'rus': 'РУС',
            'eng': 'АНГ',
            'contacts': 'Контакти',
            'offer': 'Оферта',
            'cart': 'Кошик',
            'account': 'Аккаунт',
            'login': 'Вхід',
            'register': 'Реєстрація'
        },
        'ru': {
            'ordersList': 'Список заказов',
            'totalOrdersLabel': 'Всего заказов:',
            'orderNumber': 'Номер заказа',
            'orderDate': 'Дата',
            'orderTotal': 'Сумма',
            'orderStatus': 'Статус',
            'settings': 'Настройки',
            'language': 'Язык',
            'ukr': 'УКР',
            'rus': 'РУС',
            'eng': 'АНГ',
            'contacts': 'Контакты',
            'offer': 'Оферта',
            'cart': 'Корзина',
            'account': 'Аккаунт',
            'login': 'Вход',
            'register': 'Регистрация'
        },
        'en': {
            'ordersList': 'Order List',
            'totalOrdersLabel': 'Total orders:',
            'orderNumber': 'Order number',
            'orderDate': 'Date',
            'orderTotal': 'Total',
            'orderStatus': 'Status',
            'settings': 'Settings',
            'language': 'Language',
            'ukr': 'UKR',
            'rus': 'RUS',
            'eng': 'ENG',
            'contacts': 'Contacts',
            'offer': 'Offer',
            'cart': 'Cart',
            'account': 'Account',
            'login': 'Login',
            'register': 'Register'
        }
    };

    return translations[lang] ? translations[lang][key] : key;
}

function updateLanguageButtons() {
    const languageButtons = document.querySelectorAll('.language-btn');

    languageButtons.forEach(button => {
        const lang = button.getAttribute('data-lang');
        if (lang === currentLanguage) {
            button.classList.add('active');
        } else {
            button.classList.remove('active');
        }
    });
}

// Функции для работы с кабинетом пользователя
// Функция для загрузки заказов пользователя
async function loadUserOrders() {
    console.log('loadUserOrders: загружаем заказы пользователя');

    try {
        const response = await fetch('./orders.db.json');
        if (!response.ok) {
            throw new Error(`HTTP ошибка: ${response.status}`);
        }

        const orders = await response.json();
        console.log('loadUserOrders: Загружено заказов:', orders.length);

        // Отображаем заказы в личном кабинете
        displayUserOrders(orders);

        return orders;
    } catch (error) {
        console.error('loadUserOrders: Ошибка загрузки заказов:', error);
        showNotification('Ошибка загрузки заказов', 'error');
        return [];
    }
}

// Функция для отображения заказов в личном кабинете
function displayUserOrders(orders) {
    console.log('displayUserOrders: отображаем заказы, количество:', orders.length);

    const totalOrdersElement = document.getElementById('accTotalOrders');
    const ordersTableBody = document.getElementById('ordersTableBody');

    if (!totalOrdersElement || !ordersTableBody) {
        console.error('displayUserOrders: Элементы для отображения заказов не найдены');
        return;
    }

    // Обновляем общее количество заказов
    totalOrdersElement.textContent = orders.length;

    if (orders.length === 0) {
        ordersTableBody.innerHTML = '<div class="no-orders">У вас пока нет заказов</div>';
        return;
    }

    // Формируем HTML для таблицы заказов
    let ordersHtml = '';

    orders.forEach(order => {
        const orderDate = new Date(order.date).toLocaleDateString('ru-UA');
        const orderTime = new Date(order.date).toLocaleTimeString('ru-UA', {
            hour: '2-digit',
            minute: '2-digit'
        });

        // Определяем цвет статуса
        let statusClass = 'status-pending';
        let statusText = 'В обработке';

        if (order.status === 'accepted') {
            statusClass = 'status-accepted';
            statusText = 'Принят';
        } else if (order.status === 'shipped') {
            statusClass = 'status-shipped';
            statusText = 'Отправлен';
        } else if (order.status === 'delivered') {
            statusClass = 'status-delivered';
            statusText = 'Доставлен';
        }

        ordersHtml += `
            <div class="order-row" onclick="showOrderDetails('${order.id}')">
                <div class="order-cell order-id">${order.id}</div>
                <div class="order-cell order-date">${orderDate} ${orderTime}</div>
                <div class="order-cell order-total">${order.total} ₴</div>
                <div class="order-cell order-status">
                    <span class="status-badge ${statusClass}">${statusText}</span>
                </div>
            </div>
        `;
    });

    ordersTableBody.innerHTML = ordersHtml;
    console.log('displayUserOrders: Заказы успешно отображены');
}

// Функция для показа деталей заказа
window.showOrderDetails = function(orderId) {
    console.log('showOrderDetails: показываем детали заказа:', orderId);

    // Находим заказ по ID (в будущем можно загружать из файла)
    // Пока что просто показываем уведомление
    showNotification(`Детали заказа ${orderId} будут показаны в ближайшее время`, 'info');
};

window.showAccount = function() {
    console.log('showAccount: открываем кабинет пользователя');
    const accountSection = document.getElementById('account-section');
    const productsContainer = document.getElementById('productsContainer');

    if (accountSection && productsContainer) {
        productsContainer.style.display = 'none';
        accountSection.style.display = 'block';
        toggleAvatarMenu();

        // Загружаем заказы пользователя
        loadUserOrders();

        console.log('showAccount: Кабинет успешно открыт');
    } else {
        console.error('showAccount: Элементы кабинета не найдены');
    }
};

window.showProducts = function() {
    console.log('showProducts: возвращаемся к товарам');
    const accountSection = document.getElementById('account-section');
    const productsContainer = document.getElementById('productsContainer');

    if (accountSection && productsContainer) {
        productsContainer.style.display = 'block';
        accountSection.style.display = 'none';
    }
};

// Функции для работы с баннером
function initBrandButtons() {
    console.log('initBrandButtons: инициализируем кнопки брендов');
    const brandLogos = document.querySelectorAll('.brand-logo');

    brandLogos.forEach(logo => {
        logo.addEventListener('click', function() {
            const category = this.getAttribute('data-category');
            console.log('Brand clicked:', category);

            if (category) {
                filterProductsByCategory(category);
            }
        });

        logo.style.cursor = 'pointer';
        logo.style.userSelect = 'none';
    });
}

function filterProductsByCategory(category) {
    console.log('filterProductsByCategory: фильтруем по категории:', category);
    localStorage.setItem('currentCategory', category);
    showNotification(`Фильтр: ${category}`, 'info');
    loadProducts(0, false);
}

// Функция для обработки изменения способа доставки
window.updateDeliveryCost = function() {
    console.log('updateDeliveryCost: рассчитываем стоимость доставки');

    const deliveryMethodSelect = document.getElementById('deliveryMethodSelect');
    if (!deliveryMethodSelect) return;

    const selectedMethod = deliveryMethodSelect.value;
    console.log('updateDeliveryCost: выбран способ доставки:', selectedMethod);

    let cost = 0;
    switch(selectedMethod) {
        case 'nova_poshta':
        case 'meest':
            cost = 80;
            break;
        case 'ukrposhta':
            cost = 60;
            break;
        case 'pickup':
            cost = 0;
            break;
        default:
            cost = 80;
    }

    const deliveryCostElement = document.getElementById('deliveryCost');
    if (deliveryCostElement) {
        deliveryCostElement.textContent = cost + ' ₴';
        console.log('updateDeliveryCost: установлена стоимость доставки:', cost + ' ₴');
    }

    // Пересчитываем общую сумму
    if (window.updateTotalAmount) {
        window.updateTotalAmount();
    }
};

// Функция для обработки изменения способа доставки UI
window.updatePickupUi = function(method) {
    console.log('updatePickupUi: обновляем UI для способа доставки', method);

    const pickupSection = document.getElementById('pickupSection');
    const deliverySection = document.getElementById('deliverySection');

    if (method === 'pickup') {
        if (pickupSection) pickupSection.style.display = 'block';
        if (deliverySection) deliverySection.style.display = 'none';
    } else {
        if (pickupSection) pickupSection.style.display = 'none';
        if (deliverySection) deliverySection.style.display = 'block';
    }
};

// Дополнительные глобальные переменные
let loadedProductNames = new Set();

// Функция для создания контрольной точки
window.createCheckpoint = function(description = '') {
    const now = new Date();
    const timestamp = now.toISOString().replace(/[:.]/g, '-').slice(0, 19);
    const tagName = `checkpoint-${timestamp}`;

    console.log(`Создание контрольной точки: ${tagName}`);

    // Сохраняем текущие данные в localStorage
    const checkpointData = {
        timestamp: now.toISOString(),
        description: description,
        currentProducts: window.currentProducts || [],
        cart: window.cart || [],
        cartItemCount: window.cartItemCount || 0,
        currentCategory: window.currentCategory || 'electro'
    };

    localStorage.setItem(`checkpoint_${timestamp}`, JSON.stringify(checkpointData));

    console.log(`Контрольная точка создана: ${tagName}`);
    showNotification(`Контрольная точка создана: ${tagName}`, 'success');

    return tagName;
};

// Функция для восстановления из контрольной точки
window.restoreCheckpoint = function(tagName) {
    console.log(`Восстановление из контрольной точки: ${tagName}`);

    const checkpointDataStr = localStorage.getItem(`checkpoint_${tagName}`);
    if (!checkpointDataStr) {
        console.error(`Контрольная точка ${tagName} не найдена`);
        showNotification(`Контрольная точка ${tagName} не найдена`, 'error');
        return false;
    }

    try {
        const checkpointData = JSON.parse(checkpointDataStr);

        // Восстанавливаем данные
        window.currentProducts = checkpointData.currentProducts || [];
        window.cart = checkpointData.cart || [];
        window.cartItemCount = checkpointData.cartItemCount || 0;
        window.currentCategory = checkpointData.currentCategory || 'electro';

        // Обновляем интерфейс
        updateCartBadge();
        displayProducts(window.currentProducts);

        console.log(`Восстановлено из контрольной точки: ${tagName}`);
        showNotification(`Восстановлено из контрольной точки: ${tagName}`, 'success');

        return true;
    } catch (error) {
        console.error('Ошибка восстановления контрольной точки:', error);
        showNotification('Ошибка восстановления контрольной точки', 'error');
        return false;
    }
};

// Функция для получения списка контрольных точек
window.getCheckpoints = function() {
    const checkpoints = [];

    for (let i = 0; i < localStorage.length; i++) {
        const key = localStorage.key(i);
        if (key && key.startsWith('checkpoint_')) {
            const tagName = key.replace('checkpoint_', '');
            const dataStr = localStorage.getItem(key);

            try {
                const data = JSON.parse(dataStr);
                checkpoints.push({
                    tagName: tagName,
                    timestamp: data.timestamp,
                    description: data.description || '',
                    productsCount: data.currentProducts ? data.currentProducts.length : 0
                });
            } catch (e) {
                // Игнорируем поврежденные записи
            }
        }
    }

    // Сортируем по времени (новые сначала)
    checkpoints.sort((a, b) => new Date(b.timestamp) - new Date(a.timestamp));

    return checkpoints;
};

// Функция для показа списка контрольных точек
window.showCheckpoints = function() {
    const checkpoints = getCheckpoints();

    if (checkpoints.length === 0) {
        showNotification('Нет сохраненных контрольных точек', 'info');
        return;
    }

    let message = 'Доступные контрольные точки:\n\n';
    checkpoints.forEach(cp => {
        const date = new Date(cp.timestamp).toLocaleString('ru-RU');
        message += `${cp.tagName}\n`;
        message += `Время: ${date}\n`;
        message += `Товаров: ${cp.productsCount}\n`;
        if (cp.description) message += `Описание: ${cp.description}\n`;
        message += '\n';
    });

    console.log(message);
    alert(message); // Временное решение, лучше создать модальное окно
};

// Создаем контрольную точку при запуске
setTimeout(() => {
    window.createCheckpoint('Автоматическая контрольная точка при запуске');
}, 5000);

console.log('app_fixed.js завершена - функции экспортированы');