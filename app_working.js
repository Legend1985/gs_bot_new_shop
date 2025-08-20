// Инициализация системы переводов
if (typeof window.translations !== 'undefined') {
    // ИСПРАВЛЕНИЕ БАГА: Принудительно устанавливаем украинский язык по умолчанию при первом заходе
    const savedLanguage = localStorage.getItem('selectedLanguage');
    if (!savedLanguage) {
        console.log('Первый заход на сайт, устанавливаем украинский язык по умолчанию');
        localStorage.setItem('selectedLanguage', 'uk');
    }
    
    // Откладываем инициализацию переводов до полной загрузки DOM
    setTimeout(() => {
        window.translations.initTranslations();
        console.log('Система переводов инициализирована');
    }, 100);
} else {
    console.log('Система переводов загружается...');
}

// Проверяем, находимся ли мы в Telegram Web App
let tg;
console.log('=== ИНИЦИАЛИЗАЦИЯ TELEGRAM WEBAPP ===');
console.log('window.Telegram:', !!window.Telegram);
console.log('window.Telegram.WebApp:', !!window.Telegram?.WebApp);

if (window.Telegram && window.Telegram.WebApp) {
    tg = window.Telegram.WebApp;
    console.log('Telegram WebApp найден, инициализируем...');
    console.log('tg.initDataUnsafe:', !!tg.initDataUnsafe);
    console.log('tg.initDataUnsafe.user:', !!tg.initDataUnsafe?.user);
    
    if (tg.initDataUnsafe?.user) {
        console.log('Данные пользователя доступны:', tg.initDataUnsafe.user);
    }
    
    tg.expand();
    tg.MainButton.textColor = '#FFFFFF';
    tg.MainButton.color = '#2cab37';
    console.log('Telegram WebApp успешно инициализирован');
} else {
    // Fallback для обычного браузера
    tg = {
        WebApp: {
            expand: () => console.log('Telegram WebApp не доступен'),
            MainButton: {
                textColor: '#FFFFFF',
                color: '#2cab37',
                text: '',
                show: () => console.log('Telegram MainButton не доступен'),
                onClick: (callback) => console.log('Telegram MainButton onClick не доступен')
            },
            ready: () => console.log('Telegram WebApp ready не доступен'),
            sendData: (data) => console.log('Telegram sendData не доступен:', data)
        }
    };
    console.log('Запущено в обычном браузере, Telegram функции недоступны');
    
    // В обычном браузере показываем серого человечка по умолчанию
    console.log('Запущено в обычном браузере - показываем иконку пользователя по умолчанию');
    
    // Проверяем, есть ли данные пользователя Telegram (например, из localStorage)
    const telegramUserData = localStorage.getItem('telegramUserData');
    if (telegramUserData) {
        try {
            const userData = JSON.parse(telegramUserData);
            if (userData.photo_url) {
                console.log('Найдены данные пользователя Telegram, загружаем аватар...');
                const profileImage = document.getElementById('profile-image');
                const profileIcon = document.getElementById('profile-icon');
                
                if (profileImage && profileIcon) {
                    profileImage.src = userData.photo_url;
                    profileImage.style.display = 'block';
                    profileIcon.style.display = 'none';
                    console.log('Аватар пользователя Telegram загружен');
                }
            }
        } catch (error) {
            console.warn('Ошибка при загрузке данных пользователя Telegram:', error);
        }
    }
}

// Переменные для загрузки товаров
let currentPage = 0;
let isLoading = false;
let hasMoreProducts = true;
const productsPerPage = 60;
let maxProducts = 0;
let loadedProductNames = new Set();
let savedScrollPosition = 0;

// Делаем переменные доступными глобально для других скриптов
window.loadedProductNames = loadedProductNames;
window.currentPage = currentPage;
window.isLoading = isLoading;
window.hasMoreProducts = hasMoreProducts;
window.maxProducts = maxProducts;

// Переменные для поиска
let allProducts = []; // Массив всех загруженных товаров

// Переменные для корзины
let cart = []; // Массив товаров в корзине
let cartTotal = 0; // Общая сумма корзины
let cartItemCount = 0; // Общее количество товаров в корзине

// Инициализация корзины из localStorage
function initializeCart() {
    loadCart();
}

// Сохранение корзины в localStorage
function saveCart() {
    const cartData = {
        items: cart,
        total: cartTotal,
        itemCount: cartItemCount
    };
    localStorage.setItem('gs_cart', JSON.stringify(cartData));
    console.log('saveCart: Корзина сохранена:', cartData);
}

// Загрузка корзины из localStorage
function loadCart() {
    const savedCart = localStorage.getItem('gs_cart');
    if (savedCart) {
        try {
            const cartData = JSON.parse(savedCart);
            cart = cartData.items || [];
            cartTotal = cartData.total || 0;
            cartItemCount = cartData.itemCount || 0;
            console.log('loadCart: Корзина загружена:', cartData);
        } catch (error) {
            console.error('loadCart: Ошибка при загрузке корзины:', error);
            cart = [];
            cartTotal = 0;
            cartItemCount = 0;
        }
    } else {
        console.log('loadCart: Корзина не найдена в localStorage, создаем пустую');
        cart = [];
        cartTotal = 0;
        cartItemCount = 0;
    }
    
    // Обновляем счетчик корзины
    updateCartBadge();
}

// Обновление счетчика корзины
function updateCartBadge() {
    const cartBadge = document.getElementById('cartBadge');
    if (cartBadge) {
        if (cartItemCount > 0) {
            cartBadge.textContent = cartItemCount;
            cartBadge.style.display = 'flex';
        } else {
            cartBadge.style.display = 'none';
        }
    }
}
let searchTerm = ''; // Текущий поисковый запрос
let isSearchActive = false; // Флаг активного поиска
let searchTimeout = null; // Для debouncing поиска

// Счетчик обновлений страницы (F5)
let refreshCounter = 0;
const MAX_REFRESHES_BEFORE_CLEAR = 5; // После 5-го F5 (т.е. при 6-м F5) очищаем кеш

// Функция для получения правильного текста кнопки в зависимости от языка
function getButtonText(availability, language) {
    // Определяем язык
    const currentLanguage = language || localStorage.getItem('selectedLanguage') || 'uk';
    console.log(`getButtonText: availability="${availability}", language="${language}", currentLanguage="${currentLanguage}"`);
    
    // Для товаров в наличии
    if (availability === 'В наличии' || availability === 'В наявності' || availability === 'In stock' || 
        availability === 'В наличии в Одессе' || availability === 'В наявності в Одесі') {
        // Используем переводы из translations.js
        if (window.translations && window.translations.getTranslation) {
            return window.translations.getTranslation('buyButton', currentLanguage);
        }
        
        // Fallback если translations.js не загружен
        switch (currentLanguage) {
            case 'uk':
                return 'КУПИТИ';
            case 'ru':
                return 'КУПИТЬ';
            case 'en':
                return 'BUY';
            default:
                return 'КУПИТИ';
        }
    }
    
    // Для товаров не в наличии
    if (availability === 'Нет в наличии' || availability === 'Немає в наявності' || availability === 'Out of stock') {
        switch (currentLanguage) {
            case 'uk':
                return 'Немає в наявності';
            case 'ru':
                return 'Нет в наличии';
            case 'en':
                return 'Out of stock';
            default:
                return 'Немає в наявності';
        }
    }
    
    // Для ожидаемых товаров
    if (availability === 'Ожидается' || availability === 'Очікується' || availability === 'Expected' || 
        availability === 'Ожидается поставка' || availability === 'Очікується поставка') {
        switch (currentLanguage) {
            case 'uk':
                return 'Очікується';
            case 'ru':
                return 'Ожидается';
            case 'en':
                return 'Expected';
            default:
                return 'Очікується';
        }
    }
    
    // Для товаров под заказ
    if (availability === 'Под заказ' || availability === 'Під замовлення' || availability === 'On order') {
        switch (currentLanguage) {
            case 'uk':
                return 'Під замовлення';
            case 'ru':
                return 'Под заказ';
            case 'en':
                return 'On order';
            default:
                return 'Під замовлення';
        }
    }
    
    // Для снятых с производства
    if (availability === 'Снят с производства' || availability === 'Знято з виробництва' || availability === 'Discontinued') {
        switch (currentLanguage) {
            case 'uk':
                return 'Знято з виробництва';
            case 'ru':
                return 'Снят с производства';
            case 'en':
                return 'Discontinued';
            default:
                return 'Знято з виробництва';
        }
    }
    
    // По умолчанию - кнопка покупки
    // Используем переводы из translations.js
    if (window.translations && window.translations.getTranslation) {
        return window.translations.getTranslation('buyButton', currentLanguage);
    }
    
    // Fallback если translations.js не загружен
    switch (currentLanguage) {
        case 'uk':
            return 'КУПИТИ';
        case 'ru':
            return 'КУПИТЬ';
        case 'en':
            return 'BUY';
        default:
            return 'КУПИТИ';
    }
}

// Функция для получения текста статуса товара
function getStatusText(availability) {
    // Используем функцию из translations.js
    if (window.translations && window.translations.getStatusText) {
        return window.translations.getStatusText(availability);
    }
    
    // Fallback если translations.js не загружен
    const currentLanguage = localStorage.getItem('selectedLanguage') || 'uk';
    
    // ИСПРАВЛЕНИЕ: Переводим статусы на выбранный язык
    if (availability === 'В наличии в Одессе' || availability === 'В наличии' || availability === 'В наявності' || availability === 'In stock') {
        return window.translations ? window.translations.getTranslation('inStock', currentLanguage) : 'В наличии';
    } else if (availability === 'Нет в наличии' || availability === 'Немає в наявності' || availability === 'Out of stock') {
        return window.translations ? window.translations.getTranslation('outOfStock', currentLanguage) : 'Нет в наличии';
    } else if (availability === 'Снят с производства' || availability === 'Знято з виробництва' || availability === 'Discontinued') {
        return window.translations ? window.translations.getTranslation('discontinued', currentLanguage) : 'Снят с производства';
    } else if (availability === 'Ожидается' || availability === 'Ожидается поставка' || availability === 'Очікується' || availability === 'Expected') {
        return window.translations ? window.translations.getTranslation('expected', currentLanguage) : 'Ожидается';
    } else if (availability === 'Под заказ' || availability === 'Під замовлення' || availability === 'On order') {
        return window.translations ? window.translations.getTranslation('onOrder', currentLanguage) : 'Под заказ';
    } else {
        return window.translations ? window.translations.getTranslation('inStock', currentLanguage) : 'В наличии';
    }
}

// Функция для переключения меню (удалена, так как используется toggleAvatarMenu)
function toggleMenu() {
    // Эта функция больше не используется, так как меню аватара обрабатывается toggleAvatarMenu
    console.log('toggleMenu: Функция устарела, используйте toggleAvatarMenu');
}

// Функция для переключения меню аватара
function toggleAvatarMenu() {
    const dropdown = document.getElementById('avatarDropdown');
    if (dropdown) {
        dropdown.classList.toggle('show');
        console.log('toggleAvatarMenu: Меню аватара переключено');
    } else {
        console.error('toggleAvatarMenu: Выпадающее меню аватара не найдено');
    }
}

// Закрытие меню аватара при клике вне его
document.addEventListener('click', function(event) {
    const dropdown = document.getElementById('avatarDropdown');
    const profilePic = document.querySelector('.profile-pic');
    
    if (dropdown && profilePic) {
        // Проверяем, что клик не по аватару или его элементам
        const isClickOnAvatar = profilePic.contains(event.target);
        const isClickOnDropdown = dropdown.contains(event.target);
        
        if (!isClickOnAvatar && !isClickOnDropdown) {
            dropdown.classList.remove('show');
            console.log('toggleAvatarMenu: Меню аватара закрыто (клик вне)');
        }
    }
});

// Функция для очистки localStorage и перезагрузки данных
function clearLocalStorage() {
    console.log('=== clearLocalStorage: Функция вызвана ===');
    
    try {
        console.log('clearLocalStorage: Очищаем localStorage...');
        localStorage.removeItem('gs_bot_state');
        localStorage.removeItem('telegramUserData'); // Очищаем данные пользователя Telegram
        console.log('clearLocalStorage: localStorage очищен');
        
        // Сбрасываем счетчик обновлений
        refreshCounter = 0;
        console.log('clearLocalStorage: Счетчик обновлений сброшен');
        
        // Сбрасываем глобальные переменные
        currentPage = 0;
        isLoading = false;
        hasMoreProducts = true;
        maxProducts = 0;
        loadedProductNames.clear();
        savedScrollPosition = 0;
        
        // Сбрасываем переменные поиска
        allProducts = [];
        searchTerm = '';
        isSearchActive = false;
        
        console.log('clearLocalStorage: Глобальные переменные сброшены');
        
        // Очищаем кеш браузера
        if ('caches' in window) {
            caches.keys().then(names => {
                names.forEach(name => {
                    caches.delete(name);
                });
                console.log('clearLocalStorage: Кеш браузера очищен');
            });
        }
        
        // Принудительная перезагрузка страницы
        console.log('clearLocalStorage: Выполняем принудительную перезагрузку...');
        window.location.reload(true);
        
    } catch (error) {
        console.error('clearLocalStorage: Ошибка при очистке:', error);
        // Даже при ошибке пытаемся перезагрузить
        window.location.reload(true);
    }
}

// Функция для поиска товаров
async function searchProducts(query) {
    console.log(`=== ПОИСК ТОВАРОВ: "${query}" ===`);
    
    const currentSearchTerm = query.toLowerCase().trim();
    isSearchActive = currentSearchTerm.length > 0;
    
    // Устанавливаем глобальный поисковый запрос для проверки в других функциях
    window.currentSearchTerm = currentSearchTerm;
    
    console.log(`Поисковый запрос: "${currentSearchTerm}"`);
    console.log(`Активный поиск: ${isSearchActive}`);
    console.log(`Всего товаров для поиска: ${allProducts.length}`);
    
    if (!isSearchActive) {
        // Если поиск отменен, показываем все загруженные товары
        console.log('Поиск отменен, показываем все загруженные товары');
        
        // Очищаем поисковый запрос
        searchTerm = '';
        window.currentSearchTerm = '';
        
        // Проверяем состояние allProducts
        console.log('Поиск: allProducts.length =', allProducts ? allProducts.length : 'undefined');
        console.log('Поиск: hasMoreProducts =', hasMoreProducts);
        console.log('Поиск: currentPage =', currentPage);
        
        // Если allProducts пустой, восстанавливаем состояние
        if (!allProducts || allProducts.length === 0) {
            console.log('Поиск: allProducts пустой, восстанавливаем состояние...');
            await restoreAllProducts();
        } else {
            // Показываем все загруженные товары
            console.log('Поиск: Показываем', allProducts.length, 'товаров');
            await displayProducts(allProducts);
        }
        
        // Восстанавливаем индикатор загрузки для бесконечной прокрутки
        if (hasMoreProducts) {
            showLoadingIndicator();
        }
        
        // Скрываем сообщение "Товары не найдены" если оно есть
        const noResultsElement = document.querySelector('.no-results');
        if (noResultsElement) {
            noResultsElement.remove();
            console.log('Поиск: Убрано сообщение "Товары не найдены"');
        }
        
        return;
    }
    
    // ИСПРАВЛЕНИЕ БАГА: Показываем индикатор загрузки сразу при начале поиска
    showLoadingIndicator();
    
    try {
        // Сначала фильтруем уже загруженные товары
        const filteredProducts = allProducts.filter(product => {
            const name = product.name.toLowerCase();
            const description = (product.description || '').toLowerCase();
            const category = (product.category || '').toLowerCase();
            
            return name.includes(currentSearchTerm) || 
                   description.includes(currentSearchTerm) || 
                   category.includes(currentSearchTerm);
        });
        
        console.log(`Найдено товаров в загруженных: ${filteredProducts.length}`);
        
        // Обновляем searchTerm сразу после фильтрации
        searchTerm = currentSearchTerm;
        
        // Если найдены товары в загруженных, показываем их
        if (filteredProducts.length > 0) {
            await displayProducts(filteredProducts);
        } else {
            // Если товары не найдены в загруженных, делаем поиск на сервере
            console.log('Товары не найдены в загруженных, ищем на сервере...');
            await searchProductsFromServer(currentSearchTerm);
        }
        
        // ДОПОЛНИТЕЛЬНО: Если поисковый запрос короткий (менее 3 символов), 
        // но мы нашли товары в загруженных, все равно проверяем сервер
        // для получения полных результатов
        if (filteredProducts.length > 0 && currentSearchTerm.length >= 3) {
            console.log('Найдены товары в загруженных, но проверяем сервер для полных результатов...');
            await searchProductsFromServer(currentSearchTerm);
        }
    } catch (error) {
        console.error('Ошибка при поиске товаров:', error);
        await displayProducts([]);
    } finally {
        // Скрываем индикатор загрузки
        hideLoadingIndicator();
    }
    
    // searchTerm уже обновлен в начале функции
}



// Функция для поиска товаров на сервере
async function searchProductsFromServer(searchTerm) {
    try {
        console.log(`searchProductsFromServer: Ищем "${searchTerm}" на сервере...`);
        
        // Проверяем, не изменился ли поисковый запрос
        if (window.currentSearchTerm && searchTerm !== window.currentSearchTerm) {
            console.log('searchProductsFromServer: Поисковый запрос изменился, прерываем поиск');
            return;
        }
        
        // Сначала пробуем поиск с большим лимитом
        let response = await fetch(`http://localhost:8000/api/products?search=${encodeURIComponent(searchTerm)}&start=0&limit=2000`);
        
        if (!response.ok) {
            throw new Error(`HTTP error! status: ${response.status}`);
        }
        
        let data = await response.json();
        console.log(`searchProductsFromServer: Первый запрос, товаров: ${data.products ? data.products.length : 0}`);
        
        // Проверяем, не изменился ли поисковый запрос после первого запроса
        if (window.currentSearchTerm && searchTerm !== window.currentSearchTerm) {
            console.log('searchProductsFromServer: Поисковый запрос изменился после первого запроса, прерываем поиск');
            return;
        }
        
        // Если получили 2000 товаров, возможно есть еще больше
        if (data.success && data.products && data.products.length === 2000) {
            console.log('searchProductsFromServer: Получено 2000 товаров, загружаем еще...');
            
            // Загружаем еще товары без поиска, чтобы расширить базу
            const additionalResponse = await fetch(`http://localhost:8000/api/products?start=2000&limit=2000`);
            if (additionalResponse.ok) {
                const additionalData = await additionalResponse.json();
                if (additionalData.success && additionalData.products) {
                    // Фильтруем дополнительные товары локально
                    const additionalFiltered = additionalData.products.filter(product => {
                        const name = product.name.toLowerCase();
                        const description = (product.description || '').toLowerCase();
                        const category = (product.category || '').toLowerCase();
                        
                        return name.includes(searchTerm.toLowerCase()) || 
                               description.includes(searchTerm.toLowerCase()) || 
                               category.includes(searchTerm.toLowerCase());
                    });
                    
                    // Объединяем результаты
                    data.products = [...data.products, ...additionalFiltered];
                    console.log(`searchProductsFromServer: После добавления дополнительных товаров: ${data.products.length}`);
                }
            }
        }
        
        // Финальная проверка поискового запроса перед отображением
        if (window.currentSearchTerm && searchTerm !== window.currentSearchTerm) {
            console.log('searchProductsFromServer: Поисковый запрос изменился перед отображением, прерываем поиск');
            return;
        }
        
        if (data.success && data.products && data.products.length > 0) {
            console.log(`searchProductsFromServer: Найдено ${data.products.length} товаров на сервере`);
            
            // Показываем найденные товары (НЕ добавляем в allProducts)
            await displayProducts(data.products);
        } else {
            // Товары не найдены на сервере
            console.log('searchProductsFromServer: Товары не найдены на сервере');
            await displayProducts([]);
        }
    } catch (error) {
        console.error('searchProductsFromServer: Ошибка поиска на сервере:', error);
        // Показываем пустой результат
        await displayProducts([]);
    }
}

// Функция для отображения товаров (с поддержкой поиска)
async function displayProducts(products) {
    const container = document.querySelector('.inner');
    if (!container) {
        console.error('displayProducts: Контейнер .inner не найден');
        return;
    }
    
    // Сохраняем loading indicator перед очисткой
    const loadingIndicator = container.querySelector('#loading-indicator');
    
    // Очищаем контейнер
    container.innerHTML = '';
    
    // Восстанавливаем loading indicator если он был
    if (loadingIndicator) {
        container.appendChild(loadingIndicator);
    }
    
    if (products.length === 0) {
        // Показываем сообщение о том, что товары не найдены
        const currentLanguage = localStorage.getItem('selectedLanguage') || 'uk';
        const noProductsFoundText = window.translations ? window.translations.getTranslation('noProductsFound', currentLanguage) : 'Товары не найдены';
        const noProductsForQueryText = window.translations ? window.translations.getTranslationWithParams('noProductsForQuery', { query: searchTerm }, currentLanguage) : `По запросу "${searchTerm}" ничего не найдено`;
        const clearSearchText = window.translations ? window.translations.getTranslation('clearSearch', currentLanguage) : 'Очистить поиск';
        
        container.innerHTML = `
            <div class="no-results" style="text-align: center; padding: 40px; color: var(--text-light);">
                <i class="fas fa-search" style="font-size: 48px; margin-bottom: 20px; opacity: 0.5;"></i>
                <h3>${noProductsFoundText}</h3>
                <p>${noProductsForQueryText}</p>
                <button class="btn" onclick="clearSearch()" style="margin-top: 20px;">
                    <i class="fas fa-times"></i> ${clearSearchText}
                </button>
            </div>
        `;
        
        // Восстанавливаем loading indicator если он был
        if (loadingIndicator) {
            container.appendChild(loadingIndicator);
        }
        return;
    }

    // ИСПРАВЛЕНИЕ БАГА: Показываем все товары сразу без порций для устранения "мельтешения"
    const fragment = document.createDocumentFragment();
    
    for (let i = 0; i < products.length; i++) {
        const productCard = createProductCardFromSiteData(products[i], `btn${i + 1}`);
        fragment.appendChild(productCard);
    }
    
    container.appendChild(fragment);
    
    // Настраиваем обработчики для всех товаров сразу
    setupImageHandlers();
    
    // ИСПРАВЛЕНИЕ БАГА: Обновляем переводы для отображенных карточек товаров
    const currentLanguage = localStorage.getItem('selectedLanguage') || 'uk';
    if (typeof window.translations !== 'undefined') {
        window.translations.applyTranslations(currentLanguage);
    }
    
    console.log(`displayProducts: Все ${products.length} товаров отображены`);
}

// Функция для очистки поиска
async function clearSearch() {
    console.log('=== ОЧИСТКА ПОИСКА ===');
    
    const searchInput = document.querySelector('.search-input');
    if (searchInput) {
        searchInput.value = '';
    }
    
    searchTerm = '';
    isSearchActive = false;
    
    console.log('Поиск очищен, показываем все загруженные товары');
    console.log(`Всего загружено товаров: ${allProducts.length}`);
    
    // Показываем все загруженные товары (не только первые 60)
    await displayProducts(allProducts);
    
    // Восстанавливаем индикатор загрузки для бесконечной прокрутки
    if (hasMoreProducts) {
        showLoadingIndicator();
        console.log('clearSearch: Восстановлен индикатор загрузки для бесконечной прокрутки');
    }
    
    // Восстанавливаем обычный режим загрузки товаров
    console.log('clearSearch: Восстановлен обычный режим загрузки товаров');
}

// Функция показа индикатора загрузки для бесконечной прокрутки
function showLoadingIndicator() {
    let indicator = document.getElementById('loading-indicator');
    if (!indicator) {
        // Создаем индикатор загрузки, если его нет
        indicator = document.createElement('div');
        indicator.id = 'loading-indicator';
        indicator.innerHTML = `
            <div class="loading-spinner">
                <div class="spinner"></div>
                <p>Загрузка товаров...</p>
            </div>
        `;
        indicator.style.cssText = `
            display: flex;
            justify-content: center;
            align-items: center;
            padding: 20px;
            margin: 20px 0;
        `;
        
        // Добавляем в контейнер товаров
        const container = document.querySelector('.inner');
        if (container) {
            container.appendChild(indicator);
            console.log('Индикатор загрузки создан и добавлен');
        } else {
            console.warn('Контейнер товаров не найден для добавления индикатора');
            return;
        }
    }
    
    indicator.style.display = 'block';
    
    // Автоматически скрываем индикатор через 2 секунды, если загрузка происходит быстро
    setTimeout(() => {
        if (indicator && !isLoading) {
            indicator.style.display = 'none';
            console.log('Индикатор загрузки автоматически скрыт (быстрая загрузка)');
        }
    }, 2000);
    
    console.log('Показан индикатор загрузки для бесконечной прокрутки');
}

// Функция скрытия индикатора загрузки для бесконечной прокрутки
function hideLoadingIndicator() {
    const indicator = document.getElementById('loading-indicator');
    if (indicator) {
        indicator.style.display = 'none';
        console.log('Скрыт индикатор загрузки для бесконечной прокрутки');
    }
}

// Функция скрытия экрана загрузки
function hideLoadingScreen() {
    const loadingScreen = document.querySelector('.loading-screen');
    if (loadingScreen) {
        loadingScreen.style.display = 'none';
        console.log('Экран загрузки скрыт');
    }
    
    // Скрываем индикатор загрузки
    const loadingIndicator = document.getElementById('loading-indicator');
    if (loadingIndicator) {
        loadingIndicator.style.display = 'none';
        console.log('Индикатор загрузки скрыт');
    }
}

// ОПТИМИЗАЦИЯ: Функция предварительной загрузки следующей страницы товаров
async function preloadNextPage() {
    if (isLoading || !hasMoreProducts || isSearchActive) return;
    
    try {
        const nextPage = currentPage + 1;
        const start = nextPage * productsPerPage;
        
        // Загружаем данные в фоне без блокировки интерфейса
        const response = await fetch(`http://localhost:8000/api/products?start=${start}&limit=${productsPerPage}`);
        
        if (response.ok) {
            const data = await response.json();
            if (data.success && data.products && data.products.length > 0) {
                // Сохраняем предзагруженные товары
                window.preloadedProducts = data.products;
                console.log(`preloadNextPage: Предзагружено ${data.products.length} товаров для страницы ${nextPage}`);
            }
        }
    } catch (error) {
        console.log('preloadNextPage: Ошибка предзагрузки (не критично):', error);
    }
}

// Функция показа экрана загрузки
function showLoadingScreen() {
    const loadingScreen = document.querySelector('.loading-screen');
    if (loadingScreen) {
        loadingScreen.style.display = 'flex';
        console.log('Экран загрузки показан');
    }
}

// Функция показа сообщения о конце списка
function showEndMessage() {
    let endMessage = document.querySelector('.end-message');
    if (!endMessage) {
        endMessage = document.createElement('div');
        endMessage.className = 'end-message';
        endMessage.innerHTML = `
            <p>Все товары загружены</p>
        `;
        document.querySelector('.inner').appendChild(endMessage);
    }
    endMessage.style.display = 'block';
    
    // Скрываем индикатор загрузки
    const loadingIndicator = document.getElementById('loading-indicator');
    if (loadingIndicator) {
        loadingIndicator.style.display = 'none';
    }
    
    console.log('Показано сообщение о конце списка товаров');
}

// Функция загрузки реальных товаров с сайта
async function loadRealProducts() {
    try {
        console.log('Начинаем загрузку товаров...');
        
        const data = await fetchProductData(0);
        
        if (data && data.products && data.products.length > 0) {
            console.log(`Загружено ${data.products.length} товаров`);
            console.log(`Сервер вернул total=${data.total}, hasMore=${data.hasMore}`);
            
            // Ограничиваем отображение первыми 60 товарами
            const firstPageProducts = data.products.slice(0, 60);
            
            // Обновляем глобальные переменные
            maxProducts = data.total || data.products.length;
            // ИСПРАВЛЕНИЕ: Полагаемся на hasMore с сервера, а не на клиентскую логику
            hasMoreProducts = data.hasMore !== undefined ? data.hasMore : true;
            
            console.log(`Максимум товаров: ${maxProducts}, есть еще: ${hasMoreProducts}`);
            console.log(`Сервер вернул hasMore: ${data.hasMore}`);
            
            // Сохраняем названия загруженных товаров
            firstPageProducts.forEach(product => {
                loadedProductNames.add(product.name);
            });
            
            // Очищаем контейнер и отображаем товары
            const container = document.querySelector('.inner');
            container.innerHTML = '';
            
            firstPageProducts.forEach((product, index) => {
                const productCard = createProductCardFromSiteData(product, `btn${index + 1}`);
                container.appendChild(productCard);
            });
            
            // Скрываем экран загрузки
            hideLoadingScreen();
            
            // Сохраняем состояние
            saveState();
            
            // Настраиваем обработчики для изображений
            setupImageHandlers();
            
            console.log('Товары успешно загружены и отображены');
        } else {
            console.error('Не удалось загрузить товары - нет данных');
            hideLoadingScreen();
            // Показываем сообщение об ошибке
            const container = document.querySelector('.inner');
            container.innerHTML = `
                <div class="error-message">
                    <p>Не удалось загрузить товары. Попробуйте обновить страницу.</p>
                    <button onclick="location.reload()" class="btn">Обновить страницу</button>
                </div>
            `;
        }
    } catch (error) {
        console.error('Ошибка загрузки товаров:', error);
        hideLoadingScreen();
        // Показываем сообщение об ошибке
        const container = document.querySelector('.inner');
        container.innerHTML = `
            <div class="error-message">
                <p>Ошибка загрузки товаров: ${error.message}</p>
                <button onclick="location.reload()" class="btn">Обновить страницу</button>
            </div>
        `;
    }
}

// Функция загрузки товаров
async function loadProducts(page = 0) {
    if (isLoading || !hasMoreProducts) return;
    
    isLoading = true;
    const start = page * productsPerPage;
    
    try {
        const response = await fetch(`http://localhost:8000/api/products?start=${start}&limit=${productsPerPage}`);
        
        if (!response.ok) {
            throw new Error(`HTTP error! status: ${response.status}`);
        }
        
        const data = await response.json();
        
        if (data.success) {
            if (data.products && data.products.length > 0) {
                renderProducts(data.products);
                currentPage = page;
                
                // Устанавливаем максимальное количество товаров
                if (data.total) {
                    maxProducts = data.total;
                }
                
                if (!data.hasMore) {
                    hasMoreProducts = false;
                }
            } else {
                hasMoreProducts = false;
            }
        } else {
            console.error('Ошибка API:', data.error);
        }
    } catch (error) {
        console.error('Ошибка загрузки:', error);
    } finally {
        isLoading = false;
    }
}

// Функция отображения товаров
function renderProducts(products) {
    console.log('renderProducts: Начинаем отображение товаров:', products);
    
    const container = document.querySelector('.inner');
    console.log('renderProducts: Контейнер найден:', container);
    
    if (!container) {
        console.error('renderProducts: Контейнер .inner не найден!');
        return;
    }
    
    // ОПТИМИЗАЦИЯ: Показываем товары порциями для ускорения отображения
    const batchSize = 12; // Уменьшено с 15 до 12 для более быстрого отображения
    let currentIndex = 0;
    
    const showNextBatch = () => {
        const fragment = document.createDocumentFragment();
        const endIndex = Math.min(currentIndex + batchSize, products.length);
        
        for (let i = currentIndex; i < endIndex; i++) {
            const product = products[i];
            console.log(`renderProducts: Обрабатываем товар ${i + 1}:`, product);
            const productCard = createProductCardFromSiteData(product, `btn${loadedProductNames.size + i + 1}`);
            console.log(`renderProducts: Карточка создана для товара ${i + 1}:`, productCard);
            fragment.appendChild(productCard);
            
            // Добавляем название в множество загруженных
            loadedProductNames.add(product.name);
        }
        
        container.appendChild(fragment);
        currentIndex = endIndex;
        
        console.log(`renderProducts: Показана порция товаров ${endIndex - batchSize + 1}-${endIndex} из ${products.length}`);
        
        // Если есть еще товары, показываем следующую порцию через небольшую задержку
        if (currentIndex < products.length) {
            setTimeout(showNextBatch, 2); // Уменьшена задержка с 5мс до 2мс для ускорения
        } else {
            // Все товары показаны
            console.log(`renderProducts: Всего товаров в контейнере после добавления:`, container.children.length);
            
            // Настраиваем обработчики для новых изображений
            setupImageHandlers();
            
            console.log(`Отображено ${products.length} товаров. Всего загружено: ${loadedProductNames.size}`);
            
            // Сохраняем состояние после добавления новых товаров (только если это не восстановление)
            if (!window.isRestoring) {
                saveState();
            }
            
            // Проверяем, нужно ли показать сообщение о конце списка
            if (!hasMoreProducts) {
                showEndMessage();
            }
        }
    };
    
    // Начинаем показывать товары
    showNextBatch();
}

// Функция создания карточки товара
function createProductCard(product, btnId) {
    const card = document.createElement('div');
    card.className = 'item';
    card.innerHTML = `
        <img src="${product.image}" alt="${product.name}">
        <h3>${product.name}</h3>
        <p class="price">
            <span class="old-price">${product.oldPrice}</span>
            <span class="new-price">${product.newPrice} грн</span>
        </p>
        <p class="availability">${product.availability}</p>
        <button id="${btnId}" class="buy-btn">${getButtonText(product.availability, localStorage.getItem('selectedLanguage') || 'uk')}</button>
    `;
    
    // Добавляем обработчик для кнопки
    const button = card.querySelector(`#${btnId}`);
    button.addEventListener('click', () => {
        tg.MainButton.text = `Выбрано: ${product.name}`;
        tg.MainButton.show();
    });
    
    return card;
}

// Функция создания карточки товара из сохраненных данных
function createProductCardFromSavedData(productData, btnId) {
    const card = document.createElement('div');
    card.className = 'product-card';
    card.setAttribute('data-product-name', productData.name);
    
    // Определяем CSS класс для статуса
    let statusClass = '';
    let buttonText = '';
    
    // Отладка для конкретного товара
    if (productData.name && productData.name.includes('Dean Markley 2558A')) {
        console.log(`=== FRONTEND DEBUG: Creating card from saved data for Dean Markley 2558A ===`);
        console.log(`ProductData availability: ${productData.availability}`);
        console.log(`Full productData:`, productData);
    }
    
    // НОВАЯ ЛОГИКА: Используем индивидуальные кнопки для каждого языка
    const currentLanguage = localStorage.getItem('selectedLanguage') || 'uk';
    
    if (productData.availability === 'Нет в наличии' || productData.availability === 'Немає в наявності' || productData.availability === 'Out of stock') {
        statusClass = 'out-of-stock';
        buttonText = getButtonText(productData.availability, currentLanguage);
    } else if (productData.availability === 'Ожидается' || productData.availability === 'Очікується' || productData.availability === 'Expected') {
        statusClass = 'expected';
        buttonText = getButtonText(productData.availability, currentLanguage);
    } else if (productData.availability === 'Под заказ' || productData.availability === 'Під замовлення' || productData.availability === 'On order') {
        statusClass = 'on-order';
        buttonText = getButtonText(productData.availability, currentLanguage);
    } else if (productData.availability === 'Снят с производства' || productData.availability === 'Знято з виробництва' || productData.availability === 'Discontinued') {
        statusClass = 'discontinued';
        buttonText = getButtonText(productData.availability, currentLanguage);
    } else {
        // По умолчанию "В наличии"
        statusClass = 'in-stock';
        buttonText = getButtonText(productData.availability, currentLanguage);
    }
    
    // Определяем CSS класс для цены
    let priceClass = '';
    if (productData.availability === 'Нет в наличии' || productData.availability === 'Ожидается') {
        priceClass = 'out-of-stock';
    } else if (productData.availability === 'Под заказ') {
        priceClass = 'on-order';
    } else if (productData.availability === 'Снят с производства') {
        priceClass = 'discontinued';
    }
    
    // Создаем HTML для карточки товара
    card.innerHTML = `
        <div class="product-actions">
            <button class="favorite-btn" title="Добавить в избранное">
                <i class="far fa-heart"></i>
            </button>
            <button class="compare-btn" title="Добавить к сравнению">
                <i class="fas fa-balance-scale"></i>
            </button>
        </div>
        
        <div class="img-container">
            <img src="${productData.image}" alt="${productData.name}" class="img">
        </div>
        
        <h3 class="product-title">${productData.name}</h3>
        
        <div class="product-status ${statusClass}">
            ${getStatusText(productData.availability)}
        </div>
        
        <div class="compare-checkbox">
            <input type="checkbox" id="compare-${btnId}">
            <label for="compare-${btnId}" data-translate="compare">Сравнить</label>
        </div>
        
        <div class="product-prices">
            ${productData.oldPrice && productData.oldPrice !== '0' && !productData.oldPrice.includes('грн') ? `<span class="old-price">${productData.oldPrice} грн</span>` : 
              productData.oldPrice && productData.oldPrice !== '0' ? `<span class="old-price">${productData.oldPrice}</span>` : ''}
            <span class="new-price">${productData.newPrice.includes('грн') ? productData.newPrice : productData.newPrice + ' грн'}</span>
        </div>
        
        <div class="product-rating" data-numeric-rating="${productData.rating}">
            ${generateRatingStars(productData.rating)}
        </div>
        
        <button id="${btnId}" class="btn ${statusClass}">
            ${buttonText}
        </button>
    `;
    
    // Добавляем обработчик для кнопки
    const button = card.querySelector(`#${btnId}`);
    button.addEventListener('click', () => {
        if (productData.availability === 'Снят с производства') {
            showDiscontinuedPopup();
        } else if (productData.availability === 'Нет в наличии') {
            showOutOfStockPopup();
        } else if (productData.availability === 'Ожидается') {
            showExpectedPopup();
        } else if (productData.availability === 'Под заказ') {
            showOnOrderPopup();
        } else {
            // Обычная покупка
            tg.MainButton.text = `Выбрано: ${productData.name}`;
            tg.MainButton.show();
        }
    });
    
    // Добавляем обработчики для кнопок действий
    const favoriteBtn = card.querySelector('.favorite-btn');
    favoriteBtn.addEventListener('click', (e) => {
        e.preventDefault();
        favoriteBtn.classList.toggle('favorited');
        if (favoriteBtn.classList.contains('favorited')) {
            favoriteBtn.innerHTML = '<i class="fas fa-heart"></i>';
        } else {
            favoriteBtn.innerHTML = '<i class="far fa-heart"></i>';
        }
    });
    
    const compareBtn = card.querySelector('.compare-btn');
    compareBtn.addEventListener('click', (e) => {
        e.preventDefault();
        compareBtn.classList.toggle('active');
        if (compareBtn.classList.contains('active')) {
            compareBtn.style.color = 'var(--primary-color)';
        } else {
            compareBtn.style.color = 'var(--text-light)';
        }
    });
    
    return card;
}

// Функция создания карточки товара из данных сайта
function createProductCardFromSiteData(product, btnId) {
    // console.log('createProductCardFromSiteData: Создаем карточку для товара:', product);
    // console.log('createProductCardFromSiteData: btnId:', btnId);
    
    const card = document.createElement('div');
    card.className = 'product-card';
    card.setAttribute('data-product-name', product.name);
    // Сохраняем исходные данные в data-атрибутах для корректного восстановления
    card.setAttribute('data-original-availability', product.availability);
    card.setAttribute('data-original-rating', product.rating);
    
    // Определяем CSS класс для статуса
    let statusClass = '';
    let buttonText = '';
    
    // Получаем текущий язык
    const currentLanguage = localStorage.getItem('selectedLanguage') || 'uk';
    

    
    // НОВАЯ ЛОГИКА: Используем индивидуальные кнопки для каждого языка
    if (product.availability === 'Нет в наличии' || product.availability === 'Немає в наявності' || product.availability === 'Out of stock') {
        statusClass = 'out-of-stock';
        buttonText = getButtonText(product.availability, currentLanguage);
    } else if (product.availability === 'Ожидается' || product.availability === 'Очікується' || product.availability === 'Expected') {
        statusClass = 'expected';
        buttonText = getButtonText(product.availability, currentLanguage);
    } else if (product.availability === 'Под заказ' || product.availability === 'Під замовлення' || product.availability === 'On order') {
        statusClass = 'on-order';
        buttonText = getButtonText(product.availability, currentLanguage);
    } else if (product.availability === 'Снят с производства' || product.availability === 'Знято з виробництва' || product.availability === 'Discontinued') {
        statusClass = 'discontinued';
        buttonText = getButtonText(product.availability, currentLanguage);
    } else {
        // По умолчанию "В наличии"
        statusClass = 'in-stock';
        buttonText = getButtonText(product.availability, currentLanguage);
    }
    
    // Определяем CSS класс для цены
    let priceClass = '';
    if (product.availability === 'Нет в наличии' || product.availability === 'Ожидается') {
        priceClass = 'out-of-stock';
    } else if (product.availability === 'Под заказ') {
        priceClass = 'on-order';
    } else if (product.availability === 'Снят с производства') {
        priceClass = 'discontinued';
    }
    
    // Создаем HTML для карточки товара в новом стиле
    card.innerHTML = `
        <div class="product-actions">
            <button class="favorite-btn" title="Добавить в избранное" data-product-id="${btnId}">
                <i class="far fa-heart"></i>
            </button>
            <button class="compare-btn" title="Добавить к сравнению" data-product-id="${btnId}">
                <i class="fas fa-balance-scale"></i>
            </button>
        </div>
        
        <div class="img-container">
            <img src="${product.image}" alt="${product.name}" class="img">
        </div>
        
        <h3 class="product-title">${product.name}</h3>
        
        <div class="product-status ${statusClass}">
            ${getStatusText(product.availability)}
        </div>
        
        <div class="compare-checkbox">
            <input type="checkbox" id="compare-${btnId}">
            <label for="compare-${btnId}" data-translate="compare">Сравнить</label>
        </div>
        
        <div class="product-prices">
            ${product.oldPrice && product.oldPrice !== '0' && product.oldPrice !== 'null' ? `<span class="old-price">${product.oldPrice} грн</span>` : ''}
            <span class="new-price">${product.newPrice} грн</span>
        </div>
        
        <div class="product-rating" data-numeric-rating="${product.rating}">
            ${generateRatingStars(product.rating)}
        </div>
        
        <button id="${btnId}" class="btn ${statusClass}" data-product-availability="${product.availability}" data-product-name="${product.name}">
            ${buttonText}
        </button>
    `;
    
    // Добавляем обработчик для кнопки покупки
    const button = card.querySelector(`#${btnId}`);
    if (button) {
        button.addEventListener('click', () => {
            if (product.availability === 'Снят с производства' || product.availability === 'Знято з виробництва' || product.availability === 'Discontinued') {
                showDiscontinuedPopup();
            } else if (product.availability === 'Нет в наличии' || product.availability === 'Немає в наявності' || product.availability === 'Out of stock') {
                showOutOfStockPopup();
            } else if (product.availability === 'Ожидается' || product.availability === 'Очікується' || product.availability === 'Expected') {
                showExpectedPopup();
            } else if (product.availability === 'Под заказ' || product.availability === 'Під замовлення' || product.availability === 'On order') {
                showOnOrderPopup();
            } else {
                // Товар в наличии - добавляем в корзину
                addToCart(product);
            }
        });
    }
    
    return card;
}

// Функция генерации звездочек рейтинга (оптимизированная)
function generateRatingStars(rating) {
    // Если рейтинг "Нет рейтинга", показываем пустые звезды
    if (rating === 'Нет рейтинга' || rating === 'null' || rating === null || rating === undefined) {
        return '<span class="no-rating">Нет рейтинга</span>';
    }
    
    let numericRating = 0;
    
    // Если рейтинг пришел как строка с голосами (например "4.6 - 10 голосов")
    if (typeof rating === 'string') {
        if (rating.includes('-')) {
            const ratingMatch = rating.match(/(\d+\.?\d*)/);
            if (ratingMatch) {
                numericRating = parseFloat(ratingMatch[1]);
            }
        } else {
            // Пытаемся извлечь число из строки
            const ratingMatch = rating.match(/(\d+\.?\d*)/);
            if (ratingMatch) {
                numericRating = parseFloat(ratingMatch[1]);
            }
        }
    } else if (typeof rating === 'number') {
        numericRating = rating;
    }
    
    // Проверяем валидность рейтинга
    if (isNaN(numericRating) || numericRating < 0 || numericRating > 5) {
        return '<span class="no-rating">Нет рейтинга</span>';
    }
    
    // Округляем рейтинг до ближайшей половины
    const roundedRating = Math.round(numericRating * 2) / 2;
    
    const fullStars = Math.floor(roundedRating);
    const hasHalfStar = roundedRating % 1 >= 0.5;
    const emptyStars = 5 - fullStars - (hasHalfStar ? 1 : 0);
    
    let stars = '';
    
    // Полные звезды (слева направо)
    for (let i = 0; i < fullStars; i++) {
        stars += '<span class="star-filled">★</span>';
    }
    
    // Половина звезды
    if (hasHalfStar) {
        stars += '<span class="star-half">★</span>';
    }
    
    // Пустые звезды (справа)
    for (let i = 0; i < emptyStars; i++) {
        stars += '<span class="star-empty">☆</span>';
    }
    
    return stars;
}

// Функция загрузки дополнительных товаров при прокрутке
async function loadMoreProducts() {
    // Проверяем инициализацию переменных
    if (typeof window.loadedProductNames === 'undefined') {
        console.warn('loadMoreProducts: loadedProductNames не инициализирована, инициализируем...');
        window.loadedProductNames = new Set();
        loadedProductNames = window.loadedProductNames;
    }
    
    // ИСПРАВЛЕНИЕ: Убираем преждевременную проверку loadedProductNames.size >= 377
    // Полагаемся только на hasMoreProducts, который устанавливается сервером
    
    // Не загружаем дополнительные товары во время поиска
    if (isSearchActive) {
        return;
    }
    
    if (isLoading || !hasMoreProducts) {
        return;
    }
    
    isLoading = true;
    
    // Показываем индикатор загрузки
    showLoadingIndicator();
    
    try {
        const nextPage = currentPage + 1;
        const start = nextPage * productsPerPage;
        
        // ИСПРАВЛЕНИЕ: Добавляем timestamp и заголовки для принудительного обновления кеша
        const timestamp = Date.now();
        const cacheBuster = `&_t=${timestamp}&_v=${Math.random()}`;
        
        console.log(`loadMoreProducts: Загружаем страницу ${nextPage}, start=${start}, timestamp=${timestamp}`);
        
        // Загружаем товары с сервера с принудительным обновлением кеша
        const response = await fetch(`http://localhost:8000/api/products?start=${start}&limit=${productsPerPage}${cacheBuster}`, {
            method: 'GET',
            headers: {
                'Cache-Control': 'no-cache, no-store, must-revalidate',
                'Pragma': 'no-cache',
                'X-Requested-With': 'XMLHttpRequest'
            }
        });
        
        console.log(`loadMoreProducts: Ответ сервера - status=${response.status}, ok=${response.ok}`);
        
        if (!response.ok) {
            throw new Error(`HTTP error! status: ${response.status}`);
        }
        
        const data = await response.json();
        
        console.log(`loadMoreProducts: Данные получены - success=${data.success}, products.length=${data.products?.length}, total=${data.total}, hasMore=${data.hasMore}`);
        
        if (data.success) {
            newProducts = data.products;
        } else {
            throw new Error('API вернул ошибку');
        }
        
        if (data.success) {
            if (newProducts && newProducts.length > 0) {
                console.log(`loadMoreProducts: Получено ${newProducts.length} товаров`);
                
                // ОПТИМИЗАЦИЯ: Отображаем новые товары порциями для ускорения
                const container = document.querySelector('.inner');
                const batchSize = 15; // Показываем по 15 товаров за раз
                let currentIndex = 0;
                
                const showNextBatch = () => {
                    const fragment = document.createDocumentFragment();
                    const endIndex = Math.min(currentIndex + batchSize, newProducts.length);
                    
                    for (let i = currentIndex; i < endIndex; i++) {
                        const product = newProducts[i];
                        const productCard = createProductCardFromSiteData(product, `btn${loadedProductNames.size + i + 1}`);
                        fragment.appendChild(productCard);
                        loadedProductNames.add(product.name);
                    }
                    
                    container.appendChild(fragment);
                    currentIndex = endIndex;
                    
                    // Если есть еще товары, показываем следующую порцию через небольшую задержку
                    if (currentIndex < newProducts.length) {
                        setTimeout(showNextBatch, 5); // 5мс задержка между порциями
                    } else {
                        // Все товары показаны
                        console.log('loadMoreProducts: Все новые товары отображены');
                        
                        // Обновляем текущую страницу
                        currentPage = nextPage;
                        
                        // Настраиваем обработчики для новых изображений
                        setupImageHandlers();
                        
                        // ИСПРАВЛЕНИЕ: Обновляем переводы для новых карточек товаров
                        const currentLanguage = localStorage.getItem('selectedLanguage') || 'uk';
                        if (typeof window.translations !== 'undefined') {
                            window.translations.applyTranslations(currentLanguage);
                        }
                        
                        // ИСПРАВЛЕНИЕ: Полагаемся только на hasMore с сервера
                        hasMoreProducts = data.hasMore;
                        
                        console.log(`loadMoreProducts: Обновлено - currentPage=${currentPage}, hasMoreProducts=${hasMoreProducts}, newProducts.length=${newProducts.length}, productsPerPage=${productsPerPage}`);
                        
                        if (!hasMoreProducts) {
                            console.log('loadMoreProducts: Больше товаров нет');
                            showEndMessage();
                        }
                        
                        // Сохраняем состояние
                        saveState();
                        console.log('loadMoreProducts: Состояние сохранено');
                        
                        console.log('loadMoreProducts: Товары добавлены успешно');
                    }
                };
                
                // Начинаем показывать товары порциями
                showNextBatch();
            } else {
                // Пустой список товаров означает конец пагинации
                console.log('loadMoreProducts: Получен пустой список товаров - конец пагинации');
                hasMoreProducts = false;
                showEndMessage();
            }
        } else {
            console.log('loadMoreProducts: Ошибка API');
            hasMoreProducts = false;
            showEndMessage();
        }
    } catch (error) {
        console.error('loadMoreProducts: Ошибка загрузки дополнительных товаров:', error);
        hasMoreProducts = false;
        showEndMessage();
    } finally {
        isLoading = false;
        hideLoadingIndicator();
        console.log('loadMoreProducts: Загрузка завершена');
    }
}

// Функция загрузки всех товаров
async function loadAllProducts() {
    console.log('=== loadAllProducts: Загружаем все товары ===');
    
    if (isLoading) {
        console.log('loadAllProducts: Загрузка уже идет, пропускаем...');
        return;
    }
    
    try {
        isLoading = true;
        showLoadingIndicator();
        
        // Скрываем кнопку "Загрузить все" во время загрузки
        const loadAllBtn = document.getElementById('load-all-btn');
        if (loadAllBtn) {
            loadAllBtn.disabled = true;
            loadAllBtn.innerHTML = '<i class="fas fa-spinner fa-spin"></i> Загружаем все товары...';
        }
        
        console.log('loadAllProducts: Отправляем запрос на загрузку всех товаров...');
        
        // Загружаем все товары через API
        const response = await fetch('http://localhost:8000/api/products?start=0&limit=1000');
        
        if (!response.ok) {
            throw new Error(`HTTP error! status: ${response.status}`);
        }
        
        const data = await response.json();
        console.log('loadAllProducts: Получены данные:', data);
        
        if (data.success && data.products && data.products.length > 0) {
            console.log(`loadAllProducts: Загружено ${data.products.length} товаров`);
            
            // Очищаем контейнер
            const container = document.querySelector('.inner');
            container.innerHTML = '';
            loadedProductNames.clear();
            
            // Отображаем все товары
            data.products.forEach((product, index) => {
                const productCard = createProductCardFromSiteData(product, `btn${index + 1}`);
                container.appendChild(productCard);
                loadedProductNames.add(product.name);
            });
            
            // Обновляем состояние
            currentPage = 0;
            hasMoreProducts = data.hasMore !== undefined ? data.hasMore : false;
            maxProducts = data.total || data.products.length;
            
            // Настраиваем обработчики для всех изображений
            setupImageHandlers();
            
            // ИСПРАВЛЕНИЕ БАГА: Обновляем переводы для всех карточек товаров
            const currentLanguage = localStorage.getItem('selectedLanguage') || 'uk';
            if (typeof window.translations !== 'undefined') {
                window.translations.applyTranslations(currentLanguage);
            }
            
            // Показываем сообщение о завершении
            showEndMessage();
            
            // Сохраняем состояние
            saveState();
            
            console.log('loadAllProducts: Все товары загружены успешно');
        } else {
            console.log('loadAllProducts: Получен пустой список товаров');
            showEndMessage();
        }
        
    } catch (error) {
        console.error('loadAllProducts: Ошибка загрузки всех товаров:', error);
        showEndMessage();
    } finally {
        isLoading = false;
        hideLoadingIndicator();
        
        // Восстанавливаем кнопку "Загрузить все"
        if (loadAllBtn) {
            loadAllBtn.disabled = false;
            loadAllBtn.innerHTML = '<i class="fas fa-download"></i> Загрузить все товары категории Струны для электрогитары';
        }
        
        console.log('loadAllProducts: Загрузка завершена');
    }
}

// Функция обработки прокрутки для бесконечной загрузки
function handleScroll() {
    // Проверяем инициализацию переменных
    if (typeof window.loadedProductNames === 'undefined') {
        console.warn('handleScroll: loadedProductNames не инициализирована, инициализируем...');
        window.loadedProductNames = new Set();
        loadedProductNames = window.loadedProductNames;
    }
    
    // ОПТИМИЗАЦИЯ: Используем requestAnimationFrame для плавного скролла
    if (window.scrollAnimationFrame) {
        return; // Пропускаем если анимация уже запланирована
    }
    
    window.scrollAnimationFrame = requestAnimationFrame(() => {
        console.log(`handleScroll: Проверка - isLoading=${isLoading}, hasMoreProducts=${hasMoreProducts}, currentPage=${currentPage}, loadedProducts=${loadedProductNames.size}`);
        
        // ИСПРАВЛЕНИЕ: Убираем преждевременную проверку loadedProductNames.size >= 377
        // Полагаемся только на hasMoreProducts, который устанавливается сервером
        
        if (isLoading || !hasMoreProducts) {
            if (isLoading) {
                console.log('handleScroll: Загрузка уже идет, пропускаем...');
            } else if (!hasMoreProducts) {
                console.log('handleScroll: Больше товаров нет, пропускаем...');
            }
            window.scrollAnimationFrame = null;
            return;
        }
        
        const scrollTop = window.pageYOffset || document.documentElement.scrollTop;
        const windowHeight = window.innerHeight;
        const documentHeight = document.documentElement.scrollHeight;
        
        console.log(`handleScroll: scrollTop=${scrollTop}, windowHeight=${windowHeight}, documentHeight=${documentHeight}`);
        console.log(`handleScroll: Порог для загрузки: ${documentHeight - 300}`);
        
        // Загружаем новые товары когда пользователь приближается к концу страницы
        if (scrollTop + windowHeight >= documentHeight - 300) {
            console.log('handleScroll: Достигнут порог для загрузки новых товаров!');
            console.log(`handleScroll: currentPage=${currentPage}, hasMoreProducts=${hasMoreProducts}, loadedProducts=${loadedProductNames.size}`);
            loadMoreProducts();
        }
        
        window.scrollAnimationFrame = null;
    });
}

// Функция загрузки ВСЕХ товаров с сервера
async function fetchAllProducts(totalProducts) {
    try {
        // ИСПРАВЛЕНИЕ: Загружаем все товары одним запросом
        const timestamp = Date.now();
        const response = await fetch(`http://localhost:8000/api/products?start=0&limit=${totalProducts}&_t=${timestamp}`, {
            method: 'GET',
            headers: {
                'Cache-Control': 'no-cache',
                'Pragma': 'no-cache'
            }
        });
        
        if (!response.ok) {
            throw new Error(`HTTP error! status: ${response.status}`);
        }
        
        const data = await response.json();
        
        // Проверяем, есть ли товары в ответе
        if (data.products && data.products.length > 0) {
            // Добавляем флаг success, если его нет
            if (data.success === undefined) {
                data.success = true;
            }
            // Добавляем общее количество товаров
            if (data.total === undefined) {
                data.total = data.products.length;
            }
        } else {
            data.success = false;
            data.products = [];
            data.total = 0;
        }
        
        return data;
    } catch (error) {
        console.error('fetchAllProducts: Ошибка получения данных:', error);
        return {
            success: false,
            error: error.message,
            products: [],
            total: 0,
            start: 0,
            limit: totalProducts
        };
    }
}

// Функция получения данных с сайта
async function fetchProductData(page = 0) {
    const start = page * 60;
    
    try {
        // ИСПРАВЛЕНИЕ: Добавляем timestamp для принудительного обновления кеша
        const timestamp = Date.now();
        const response = await fetch(`http://localhost:8000/api/products?start=${start}&limit=60&_t=${timestamp}`, {
            method: 'GET',
            headers: {
                'Cache-Control': 'no-cache',
                'Pragma': 'no-cache'
            }
        });
        
        if (!response.ok) {
            throw new Error(`HTTP error! status: ${response.status}`);
        }
        
        const data = await response.json();
        
        // Проверяем, есть ли товары в ответе
        if (data.products && data.products.length > 0) {
            // Добавляем флаг success, если его нет
            if (data.success === undefined) {
                data.success = true;
            }
            // Добавляем общее количество товаров
            if (data.total === undefined) {
                data.total = data.products.length;
            }
        } else {
            data.success = false;
            data.products = [];
            data.total = 0;
        }
        
        return data;
    } catch (error) {
        console.error('fetchProductData: Ошибка получения данных:', error);
        return {
            success: false,
            error: error.message,
            products: [],
            total: 0,
            start: start,
            limit: 60
        };
    }
}

// Функция обновления цен товаров
async function updateProductPrices() {
    try {
        const data = await fetchProductData(0);
        
        if (data && data.products && data.products.length > 0) {
            // Обновляем цены существующих товаров
            const existingProducts = document.querySelectorAll('.product-card');
            
            existingProducts.forEach((card, index) => {
                if (data.products[index]) {
                    const priceElement = card.querySelector('.new-price');
                    if (priceElement) {
                        priceElement.textContent = data.products[index].newPrice;
                    }
                }
            });
            
            console.log('Цены товаров обновлены');
        }
    } catch (error) {
        console.error('Ошибка обновления цен:', error);
    }
}

// Функция сохранения состояния
function saveState() {
    // Защита от рекурсивных вызовов
    if (window.isSavingState) {
        console.log('saveState: Сохранение уже идет, пропускаем...');
        return;
    }
    
    // Проверяем инициализацию переменных
    if (typeof window.loadedProductNames === 'undefined') {
        console.warn('saveState: loadedProductNames не инициализирована, инициализируем...');
        window.loadedProductNames = new Set();
        loadedProductNames = window.loadedProductNames;
    }
    
    window.isSavingState = true;
    console.log('saveState: Начинаем сохранение состояния...');
    
    // Сохраняем только имена товаров и позицию скролла
    const currentScrollPosition = window.pageYOffset || document.documentElement.scrollTop;
    
    // ДОПОЛНИТЕЛЬНАЯ ПРОВЕРКА: Убеждаемся, что hasMoreProducts корректно установлен
    let correctHasMoreProducts = hasMoreProducts;
    // ИСПРАВЛЕНИЕ: Убираем жестко заданное значение 377, полагаемся на сервер
    // Если hasMoreProducts уже установлен сервером, используем его
    if (hasMoreProducts === undefined) {
        // Только если hasMoreProducts не определен, делаем fallback
        correctHasMoreProducts = true; // По умолчанию предполагаем, что есть еще товары
        console.log(`saveState: hasMoreProducts не определен, устанавливаем по умолчанию: ${correctHasMoreProducts}`);
    } else {
        correctHasMoreProducts = hasMoreProducts;
        console.log(`saveState: Используем hasMoreProducts с сервера: ${correctHasMoreProducts}`);
    }
    
    const state = {
        currentPage: currentPage,
        loadedProductNames: Array.from(loadedProductNames),
        maxProducts: maxProducts,
        hasMoreProducts: correctHasMoreProducts,
        scrollPosition: currentScrollPosition,
        selectedLanguage: localStorage.getItem('selectedLanguage') || 'uk', // ИСПРАВЛЕНИЕ: Сохраняем текущий язык
        timestamp: Date.now(),
        refreshCounter: refreshCounter
    };
    
    localStorage.setItem('gs_bot_state', JSON.stringify(state));
    console.log('Состояние сохранено:', state);
    console.log('Позиция скролла сохранена:', currentScrollPosition);
    
    // Дополнительная отладка позиции скролла
    console.log('saveState: Текущая позиция скролла:', currentScrollPosition);
    console.log('saveState: window.pageYOffset:', window.pageYOffset);
    console.log('saveState: document.documentElement.scrollTop:', document.documentElement.scrollTop);
    console.log('saveState: document.body.scrollTop:', document.body.scrollTop);
    
    // Сбрасываем флаг сохранения
    window.isSavingState = false;
}

// Функция загрузки состояния
function loadState() {
    try {
        // Проверяем инициализацию переменных
        if (typeof window.loadedProductNames === 'undefined') {
            console.warn('loadState: loadedProductNames не инициализирована, инициализируем...');
            window.loadedProductNames = new Set();
            loadedProductNames = window.loadedProductNames;
        }
        
        const savedState = localStorage.getItem('gs_bot_state');
        console.log('loadState: Сырые данные из localStorage:', savedState);
        
        if (savedState) {
            const state = JSON.parse(savedState);
            console.log('loadState: Распарсенные данные:', state);
            
            // Проверяем, не устарело ли состояние (24 часа)
            if (Date.now() - state.timestamp < 24 * 60 * 60 * 1000) {
                console.log('loadState: Состояние актуально, возвращаем');
                
                // Проверяем счетчик обновлений
                if (state.refreshCounter !== undefined) {
                    refreshCounter = state.refreshCounter;
                    console.log(`loadState: Счетчик обновлений загружен из localStorage: ${refreshCounter}`);
                    console.log(`loadState: MAX_REFRESHES_BEFORE_CLEAR: ${MAX_REFRESHES_BEFORE_CLEAR}`);
                    
                    // Если это третье F5 или больше, автоматически очищаем кеш
                    if (refreshCounter >= MAX_REFRESHES_BEFORE_CLEAR) {
                        console.log('loadState: Достигнут лимит обновлений, автоматически очищаем кеш');
                        setTimeout(() => {
                            clearLocalStorage();
                        }, 100);
                        return null;
                    }
                } else {
                    console.log('loadState: Счетчик обновлений не найден в состоянии, устанавливаем 0');
                    refreshCounter = 0;
                }
                
                return state;
            } else {
                console.log('loadState: Состояние устарело');
            }
        } else {
            console.log('loadState: Нет сохраненного состояния');
        }
    } catch (error) {
        console.error('Ошибка загрузки состояния:', error);
    }
    return null;
}

// Функция восстановления всех товаров
async function restoreAllProducts() {
    // Защита от повторных вызовов
    if (window.isRestoringProducts) {
        console.log('restoreAllProducts: Восстановление уже выполняется, пропускаем...');
        return false;
    }
    
    window.isRestoringProducts = true;
    
    try {
        // Проверяем инициализацию переменных
        if (typeof window.loadedProductNames === 'undefined') {
            console.warn('restoreAllProducts: loadedProductNames не инициализирована, инициализируем...');
            window.loadedProductNames = new Set();
            loadedProductNames = window.loadedProductNames;
        }
        
        console.log('restoreAllProducts: Начинаем восстановление...');
        const state = loadState();
        if (!state) {
            console.log('restoreAllProducts: Состояние не найдено в localStorage');
            return false;
        }
        
        console.log('restoreAllProducts: Состояние найдено:', state);
        
        // Проверяем, есть ли товары для восстановления
        if (!state.loadedProductNames || state.loadedProductNames.length === 0) {
            console.log('restoreAllProducts: Нет товаров в сохраненном состоянии, очищаем localStorage');
            localStorage.removeItem('gs_bot_state');
            return false;
        }
        // Восстанавливаем переменные
        loadedProductNames = new Set(state.loadedProductNames || []);
        maxProducts = state.maxProducts || 0;
        
        // Проверяем, есть ли еще товары для загрузки
        const totalLoaded = state.loadedProductNames ? state.loadedProductNames.length : 0;
        // ИСПРАВЛЕНИЕ: Убираем жестко заданное значение 377, полагаемся на сервер
        // Получаем актуальное количество товаров с сервера
        const serverData = await fetchProductData(0);
        const totalProducts = serverData.total || 0;
        
        console.log(`restoreAllProducts: Сервер вернул total=${serverData.total}, hasMore=${serverData.hasMore}`);
        
        // ИСПРАВЛЕНИЕ БАГА: При восстановлении состояния на другом языке сбрасываем "конец списка"
        const currentLanguage = localStorage.getItem('selectedLanguage') || 'uk';
        const savedLanguage = state.selectedLanguage || 'uk';
        
        if (currentLanguage !== savedLanguage && totalLoaded >= totalProducts) {
            console.log(`restoreAllProducts: Восстановление на другом языке (${currentLanguage} вместо ${savedLanguage}), сбрасываем состояние конца списка`);
            hasMoreProducts = true;
            currentPage = 0;
            loadedProductNames.clear();
            maxProducts = 0;
            
            // Очищаем localStorage для нового языка
            localStorage.removeItem('gs_bot_state');
            
            console.log('restoreAllProducts: Состояние сброшено для нового языка');
            return false;
        } else {
            // ИСПРАВЛЕНИЕ: Полагаемся на hasMore с сервера
            hasMoreProducts = serverData.hasMore !== undefined ? serverData.hasMore : (totalLoaded < totalProducts);
            console.log(`restoreAllProducts: hasMoreProducts установлен в ${hasMoreProducts} (с сервера: ${serverData.hasMore}, fallback: ${totalLoaded < totalProducts})`);
        }
        
        // ИСПРАВЛЕНИЕ: Устанавливаем maxProducts из серверных данных
        maxProducts = totalProducts;
        console.log(`restoreAllProducts: maxProducts установлен в ${maxProducts}`);
        
        // ИСПРАВЛЕНИЕ БАГА: Правильно рассчитываем currentPage на основе количества загруженных товаров
        currentPage = Math.floor(totalLoaded / productsPerPage);
        console.log(`restoreAllProducts: Рассчитан currentPage=${currentPage} на основе ${totalLoaded} товаров (${productsPerPage} товаров на страницу)`);
        
        console.log(`restoreAllProducts: Загружено товаров: ${totalLoaded}, всего товаров: ${totalProducts}, hasMoreProducts: ${hasMoreProducts}`);
        
        // Загружаем ВСЕ товары с сервера (не только первые 60)
        console.log('restoreAllProducts: Загружаем ВСЕ товары с сервера...');
        const data = await fetchAllProducts(totalProducts); // Загружаем все товары
        
        if (data && data.products && data.products.length > 0) {
            console.log(`restoreAllProducts: Загружено ${data.products.length} товаров с сервера`);
            
            // Фильтруем товары, которые были загружены ранее
            // ОПТИМИЗАЦИЯ: Преобразуем массив в Set для быстрого поиска
            const loadedNamesSet = new Set(state.loadedProductNames);
            const previouslyLoadedProducts = data.products.filter(product => 
                loadedNamesSet.has(product.name)
            );
            
            console.log(`restoreAllProducts: Найдено ${previouslyLoadedProducts.length} ранее загруженных товаров`);
            
            // Восстанавливаем товары из свежих данных
            const container = document.querySelector('.inner');
            if (!container) {
                console.error('restoreAllProducts: Контейнер .inner не найден');
                return false;
            }
            container.innerHTML = '';
            
            if (previouslyLoadedProducts.length > 0) {
                console.log('restoreAllProducts: Начинаем восстановление товаров из свежих данных...');
                
                // Создаем все карточки сразу для оптимизации
                const fragment = document.createDocumentFragment();
                previouslyLoadedProducts.forEach((productData, index) => {
                    const productCard = createProductCardFromSiteData(productData, `btn${index + 1}`);
                    fragment.appendChild(productCard);
                });
                
                // Добавляем все карточки одним разом
                container.appendChild(fragment);
                console.log(`restoreAllProducts: Добавлено ${previouslyLoadedProducts.length} карточек товаров`);
                
                // ИСПРАВЛЕНИЕ БАГА: Обновляем переводы для восстановленных карточек товаров
                const currentLanguage = localStorage.getItem('selectedLanguage') || 'uk';
                if (typeof window.translations !== 'undefined') {
                    window.translations.applyTranslations(currentLanguage);
                }
                
                // ИСПРАВЛЕНИЕ БАГА: Принудительно обновляем переводы кнопок для восстановленных товаров
                if (typeof updateProductButtonTranslations === 'function') {
                    updateProductButtonTranslations(currentLanguage);
                }
                
                console.log(`Восстановлено ${previouslyLoadedProducts.length} товаров из свежих данных`);
            } else {
                console.log('restoreAllProducts: Нет товаров для восстановления');
                return false;
            }
            
            // Восстанавливаем позицию скролла
            if (state.scrollPosition > 0) {
                console.log('restoreAllProducts: Восстанавливаем позицию скролла:', state.scrollPosition);
                
                // Функция для надежного восстановления позиции скролла
                const restoreScrollPosition = (position) => {
                    try {
                        console.log('=== ВОССТАНОВЛЕНИЕ СКРОЛЛА ===');
                        console.log('Пытаемся восстановить позицию:', position);
                        console.log('Текущая позиция до восстановления:', window.pageYOffset || document.documentElement.scrollTop);
                        console.log('Высота документа:', document.documentElement.scrollHeight);
                        console.log('Высота окна:', window.innerHeight);
                        
                        // Проверяем, что позиция не превышает максимальную высоту страницы
                        const maxScroll = document.documentElement.scrollHeight - window.innerHeight;
                        const safePosition = Math.min(position, maxScroll);
                        
                        if (safePosition !== position) {
                            console.log(`Позиция скорректирована с ${position} на ${safePosition} (максимум: ${maxScroll})`);
                        }
                        
                        // Проверяем, что страница достаточно загружена
                        if (document.documentElement.scrollHeight < window.innerHeight + 100) {
                            console.log('Страница еще не полностью загружена, откладываем восстановление');
                            return false;
                        }
                        
                        window.scrollTo(0, safePosition);
                        console.log('Позиция скролла восстановлена:', safePosition);
                        
                        // Проверяем, что скролл действительно восстановился
                        setTimeout(() => {
                            const currentScroll = window.pageYOffset || document.documentElement.scrollTop;
                            console.log('Проверка после восстановления. Текущая позиция:', currentScroll);
                            if (Math.abs(currentScroll - safePosition) > 10) {
                                console.log('Позиция скролла не восстановилась корректно, повторяем...');
                                window.scrollTo(0, safePosition);
                                return false;
                            } else {
                                console.log('Позиция скролла восстановлена успешно!');
                                return true;
                            }
                        }, 50);
                        
                        return true;
                    } catch (error) {
                        console.error('Ошибка при восстановлении позиции скролла:', error);
                        return false;
                    }
                };
                
                // Функция для попыток восстановления с проверкой успеха
                const attemptRestoreScroll = (position, attempts = 0) => {
                    if (attempts >= 10) {
                        console.log('Достигнуто максимальное количество попыток восстановления скролла');
                        return;
                    }
                    
                    const success = restoreScrollPosition(position);
                    if (!success) {
                        console.log(`Попытка ${attempts + 1} не удалась, повторяем через 500мс...`);
                        setTimeout(() => attemptRestoreScroll(position, attempts + 1), 500);
                    }
                };
                
                // Используем улучшенную логику восстановления
                attemptRestoreScroll(state.scrollPosition);
            }
            
            // Скрываем экран загрузки
            hideLoadingScreen();
            
            // Сбрасываем флаг загрузки
            isLoading = false;
            
            // Правильно обрабатываем индикатор загрузки и сообщение о конце
            if (hasMoreProducts) {
                // Если есть еще товары, показываем индикатор загрузки
                showLoadingIndicator();
                console.log('restoreAllProducts: Показан индикатор загрузки для следующих страниц');
            } else {
                // Если товаров больше нет, скрываем индикатор и показываем сообщение о конце
                hideLoadingIndicator();
                showEndMessage();
                console.log('restoreAllProducts: Показано сообщение о конце списка');
            }
            
            // Дополнительная проверка: если все товары загружены, убеждаемся что индикатор скрыт
            if (!hasMoreProducts) {
                const loadingIndicator = document.getElementById('loading-indicator');
                if (loadingIndicator && loadingIndicator.style.display !== 'none') {
                    loadingIndicator.style.display = 'none';
                    console.log('restoreAllProducts: Принудительно скрыт индикатор загрузки');
                }
            }
            
            console.log(`Восстановлено ${state.loadedProductNames.length} товаров. Есть еще: ${hasMoreProducts}`);
            
            // ДОПОЛНИТЕЛЬНАЯ ПРОВЕРКА: Убеждаемся, что hasMoreProducts корректно установлен
            const finalTotalLoaded = loadedProductNames.size;
            // ИСПРАВЛЕНИЕ: Убираем жестко заданное значение 377, полагаемся на сервер
            // Полагаемся только на серверные данные, а не на клиентские вычисления
            console.log(`restoreAllProducts: Финальная проверка - загружено: ${finalTotalLoaded}, hasMoreProducts: ${hasMoreProducts} (с сервера)`);
            
            // Отладка статусов товаров
            state.loadedProductNames.forEach((product, index) => {
                if (product.name && product.name.includes('Dean Markley 2558A')) {
                    console.log(`=== FRONTEND DEBUG: Dean Markley 2558A found in restored data ===`);
                    console.log(`Product: ${product.name}`);
                    console.log(`Status: ${product.status}`);
                    console.log(`Availability: ${product.availability}`);
                    console.log(`Full product data:`, product);
                    console.log(`=== END FRONTEND DEBUG ===`);
                }
            });
            
            return true;
        } else {
            console.log('restoreAllProducts: Нет данных с сервера');
            return false;
        }
    } catch (error) {
        console.error('Ошибка восстановления товаров:', error);
        return false;
    } finally {
        // Сбрасываем флаг восстановления
        window.isRestoringProducts = false;
    }
}

// Функция загрузки первой страницы
async function loadFirstPage() {
    try {
        // Проверяем инициализацию переменных
        if (typeof window.loadedProductNames === 'undefined') {
            console.warn('loadFirstPage: loadedProductNames не инициализирована, инициализируем...');
            window.loadedProductNames = new Set();
            loadedProductNames = window.loadedProductNames;
        }
        
        const container = document.querySelector('.inner');
        if (!container) {
            console.error('loadFirstPage: КРИТИЧЕСКАЯ ОШИБКА - контейнер .inner не найден!');
            return;
        }
        
        // ОПТИМИЗАЦИЯ: Показываем первые товары быстрее, не блокируя интерфейс
        console.log('loadFirstPage: Начинаем загрузку товаров...');
        
        // Скрываем экран загрузки сразу для быстрого отображения интерфейса
        hideLoadingScreen();
        
        // Загружаем данные в фоне
        const dataPromise = fetchProductData(0);
        
        // Показываем первые товары сразу, если они есть в кеше
        if (allProducts && allProducts.length > 0) {
            console.log('loadFirstPage: Показываем кешированные товары...');
            displayProducts(allProducts);
        }
        
        // Ждем загрузки свежих данных
        const data = await dataPromise;
        
        if (data && data.products && data.products.length > 0) {
            console.log(`loadFirstPage: Загружено ${data.products.length} товаров`);
            
            // ОПТИМИЗАЦИЯ: Немедленно показываем первые 20 товаров для быстрого отображения
            const firstBatch = data.products.slice(0, 20);
            console.log(`loadFirstPage: Немедленно показываем первые ${firstBatch.length} товаров`);
            
            // Очищаем контейнер и показываем первые товары
            container.innerHTML = '';
            firstBatch.forEach((product, index) => {
                const productCard = createProductCardFromSiteData(product, `btn${index + 1}`);
                container.appendChild(productCard);
            });
            
            // Скрываем экран загрузки после показа первых товаров
            hideLoadingScreen();
            
            // Обновляем глобальные переменные
            maxProducts = data.total || data.products.length;
            hasMoreProducts = data.hasMore;
            currentPage = 0; // Сбрасываем страницу на первую
            
            // Сохраняем товары в массив для поиска
            allProducts = [...data.products];
            
            // Сохраняем названия загруженных товаров
            data.products.forEach(product => {
                loadedProductNames.add(product.name);
            });
            
            // ОПТИМИЗАЦИЯ: Показываем остальные товары порциями для плавности
            if (data.products.length > 20) {
                const remainingProducts = data.products.slice(20);
                console.log(`loadFirstPage: Показываем оставшиеся ${remainingProducts.length} товаров порциями`);
                
                const batchSize = 15; // Показываем по 15 товаров за раз
                let currentIndex = 0;
                
                const showNextBatch = () => {
                    const fragment = document.createDocumentFragment();
                    const endIndex = Math.min(currentIndex + batchSize, remainingProducts.length);
                    
                    for (let i = currentIndex; i < endIndex; i++) {
                        const productCard = createProductCardFromSiteData(remainingProducts[i], `btn${20 + i + 1}`);
                        fragment.appendChild(productCard);
                    }
                    
                    container.appendChild(fragment);
                    currentIndex = endIndex;
                    
                    // Если есть еще товары, показываем следующую порцию
                    if (currentIndex < remainingProducts.length) {
                        setTimeout(showNextBatch, 5); // Уменьшена задержка до 5мс
                    } else {
                        // Все товары показаны, настраиваем обработчики
                        setupImageHandlers();
                        console.log(`loadFirstPage: Все ${data.products.length} товаров отображены`);
                        
                        // ИСПРАВЛЕНИЕ БАГА: Принудительно обновляем переводы кнопок после отображения всех товаров
                        const currentLanguage = localStorage.getItem('selectedLanguage') || 'uk';
                        if (typeof updateProductButtonTranslations === 'function') {
                            console.log('loadFirstPage: Обновляем переводы кнопок после отображения всех товаров');
                            updateProductButtonTranslations(currentLanguage);
                        }
                    }
                };
                
                // Запускаем показ оставшихся товаров
                setTimeout(showNextBatch, 50); // Небольшая задержка для плавности
            }
            
            // Сохраняем состояние
            saveState();
            
            // ИСПРАВЛЕНИЕ БАГА: Принудительно обновляем переводы кнопок после сохранения состояния
            const currentLanguage = localStorage.getItem('selectedLanguage') || 'uk';
            if (typeof updateProductButtonTranslations === 'function') {
                console.log('loadFirstPage: Обновляем переводы кнопок после сохранения состояния');
                updateProductButtonTranslations(currentLanguage);
            }
            
            // Скрываем индикатор загрузки после загрузки первых товаров
            hideLoadingIndicator();
            
            // Если товаров больше нет, показываем сообщение о конце
            if (!hasMoreProducts) {
                showEndMessage();
            } else {
                // ОПТИМИЗАЦИЯ: Запускаем предзагрузку следующей страницы
                setTimeout(() => {
                    preloadNextPage();
                }, 1000); // Запускаем через 1 секунду после загрузки первой страницы
            }
        } else {
            console.error('loadFirstPage: Не удалось загрузить товары - нет данных');
            
            // Скрываем индикаторы загрузки
            hideLoadingScreen();
            hideLoadingIndicator();
            
            // Показываем сообщение об ошибке
            const container = document.querySelector('.inner');
            
            // Сохраняем loading indicator перед очисткой
            const loadingIndicator = container.querySelector('#loading-indicator');
            
            container.innerHTML = `
                <div class="error-message">
                    <p>Не удалось загрузить товары. API не вернул данные.</p>
                    <button class="btn" onclick="location.reload()">Перезагрузить страницу</button>
                </div>
            `;
            
            // Восстанавливаем loading indicator если он был
            if (loadingIndicator) {
                container.appendChild(loadingIndicator);
            }
        }
    } catch (error) {
        console.error('loadFirstPage: Ошибка загрузки товаров:', error);
        
        // Скрываем индикаторы загрузки
        hideLoadingScreen();
        hideLoadingIndicator();
        
        // Показываем сообщение об ошибке
        const container = document.querySelector('.inner');
        
        // Сохраняем loading indicator перед очисткой
        const loadingIndicator = container.querySelector('#loading-indicator');
        
        container.innerHTML = `
            <div class="error-message">
                <p>Произошла ошибка при загрузке товаров: ${error.message}</p>
                <button class="btn" onclick="location.reload()">Перезагрузить страницу</button>
            </div>
        `;
        
        // Восстанавливаем loading indicator если он был
        if (loadingIndicator) {
            container.appendChild(loadingIndicator);
        }
    }

// Функция очистки состояния
function clearState() {
    localStorage.removeItem('gs_bot_state');
    console.log('Состояние очищено');
}

// Функция автоматического сохранения
function startAutoSave() {
    let lastSaveTime = 0;
    const MIN_SAVE_INTERVAL = 60000; // Увеличиваем до 1 минуты
    
    setInterval(() => {
        const now = Date.now();
        if (loadedProductNames.size > 0 && (now - lastSaveTime) > MIN_SAVE_INTERVAL) {
            lastSaveTime = now;
            console.log('startAutoSave: Автоматическое сохранение состояния');
            
            // Добавляем дополнительную защиту от рекурсии
            if (!window.isSavingState && !window.isLoading) {
                saveState();
            } else {
                console.log('startAutoSave: Пропускаем сохранение, идет загрузка или сохранение');
            }
        }
    }, 300000); // Увеличиваем до 5 минут
}

// Функция настройки сохранения перед закрытием
function setupBeforeUnload() {
    // Сохраняем состояние при закрытии страницы
    window.addEventListener('beforeunload', () => {
        if (loadedProductNames.size > 0) {
            saveState();
        }
    });
    
    // Сохраняем состояние при изменении видимости страницы (включая F5)
    document.addEventListener('visibilitychange', () => {
        if (document.visibilityState === 'hidden' && loadedProductNames.size > 0) {
            saveState();
        }
    });
    
    // Сохраняем состояние при потере фокуса окна
    window.addEventListener('blur', () => {
        if (loadedProductNames.size > 0) {
            saveState();
        }
    });
}

// Функция сброса состояния
function resetState() {
    clearState();
    location.reload();
}

// Основная функция инициализации
document.addEventListener('DOMContentLoaded', async () => {
    console.log('=== Инициализация приложения v11.03 ===');
    console.log('DOM загружен, начинаем инициализацию...');
    
    // ИНИЦИАЛИЗАЦИЯ КОРЗИНЫ
    console.log('=== ИНИЦИАЛИЗАЦИЯ КОРЗИНЫ ===');
    initializeCart();
    console.log('Корзина инициализирована');
    
    // НЕМЕДЛЕННОЕ ОБНОВЛЕНИЕ ПЕРЕВОДОВ И СТАТУСА
    console.log('=== НЕМЕДЛЕННОЕ ОБНОВЛЕНИЕ ПЕРЕВОДОВ И СТАТУСА ===');
    const currentLanguage = localStorage.getItem('selectedLanguage') || 'uk';
    console.log(`Немедленно применяем переводы для языка: ${currentLanguage}`);
    
    // Применяем переводы немедленно
    if (typeof window.translations !== 'undefined' && window.translations.applyTranslations) {
        window.translations.applyTranslations(currentLanguage);
        console.log('Переводы применены немедленно');
    } else {
        console.warn('translations.js не загружен, применяем базовые переводы');
        // Базовые переводы для критически важных элементов
        applyBasicTranslations(currentLanguage);
    }
    
    // Обновляем статус менеджера немедленно
    if (typeof updateSupportButtonStatus === 'function') {
        updateSupportButtonStatus();
        console.log('Статус менеджера обновлен немедленно');
    } else {
        console.warn('Функция updateSupportButtonStatus не найдена');
    }
    console.log('=== КОНЕЦ НЕМЕДЛЕННОГО ОБНОВЛЕНИЯ ===');
    
    // НАСТРОЙКА ПОИСКА - перенесена в начало для быстрого доступа
    console.log('=== НАСТРОЙКА ПОИСКА ===');
    const searchInput = document.querySelector('.search-input');
    if (searchInput) {
        console.log('searchInput найден:', searchInput);
        
                    // Обработчик ввода в поисковую строку с debouncing
            searchInput.addEventListener('input', async (e) => {
                const query = e.target.value;
                console.log(`Поисковый запрос: "${query}"`);
                
                // Если поиск очищен, немедленно показываем все товары
                if (!query.trim()) {
                    console.log('Поиск очищен, немедленно показываем все товары');
                    
                    // Очищаем предыдущий таймаут
                    if (searchTimeout) {
                        clearTimeout(searchTimeout);
                    }
                    
                    // Очищаем поисковый запрос
                    searchTerm = '';
                    window.currentSearchTerm = '';
                    
                    // Проверяем состояние allProducts
                    console.log('Поиск: allProducts.length =', allProducts ? allProducts.length : 'undefined');
                    console.log('Поиск: hasMoreProducts =', hasMoreProducts);
                    console.log('Поиск: currentPage =', currentPage);
                    
                    // Если allProducts пустой, восстанавливаем состояние
                    if (!allProducts || allProducts.length === 0) {
                        console.log('Поиск: allProducts пустой, восстанавливаем состояние...');
                        await restoreAllProducts();
                    } else {
                        // Показываем все загруженные товары
                        console.log('Поиск: Показываем', allProducts.length, 'товаров');
                        await displayProducts(allProducts);
                    }
                    
                    // Скрываем сообщение "Товары не найдены" если оно есть
                    const noResultsElement = document.querySelector('.no-results');
                    if (noResultsElement) {
                        noResultsElement.remove();
                        console.log('Поиск: Немедленно убрано сообщение "Товары не найдены"');
                    }
                    
                    // Восстанавливаем индикатор загрузки для бесконечной прокрутки
                    if (hasMoreProducts) {
                        showLoadingIndicator();
                    }
                    return;
                }
                
                // Очищаем предыдущий таймаут
                if (searchTimeout) {
                    clearTimeout(searchTimeout);
                }
                
                // Устанавливаем новый таймаут (500ms задержка)
                searchTimeout = setTimeout(async () => {
                    await searchProducts(query);
                }, 500);
            });
        
        // Обработчик нажатия Enter
        searchInput.addEventListener('keypress', async (e) => {
            if (e.key === 'Enter') {
                e.preventDefault();
                const query = e.target.value;
                console.log(`Поиск по Enter: "${query}"`);
                await searchProducts(query);
            }
        });
        
        // Обработчик клика по иконке поиска
        const searchIcon = document.querySelector('.search-icon');
        if (searchIcon) {
            searchIcon.addEventListener('click', async () => {
                const query = searchInput.value;
                console.log(`Поиск по клику на иконку: "${query}"`);
                await searchProducts(query);
            });
        }
        
        console.log('Обработчики поиска настроены');
    } else {
        console.error('ОШИБКА: Поле поиска не найдено!');
    }
    console.log('=== КОНЕЦ НАСТРОЙКИ ПОИСКА ===');
    
    try {
        // Проверяем, есть ли сохранённое состояние
        const savedState = loadState();
        
        if (savedState) {
            console.log('Найдено сохранённое состояние, пытаемся восстановить...');
            
            // ОПТИМИЗАЦИЯ: Проверяем корректность сохраненного состояния
            if (!savedState.loadedProductNames || !Array.isArray(savedState.loadedProductNames)) {
                console.log('Состояние повреждено, очищаем localStorage и загружаем заново');
                clearLocalStorage();
                await loadFirstPage();
                return;
            }
            
            // Проверяем, не устарело ли состояние (24 часа)
            if (Date.now() - savedState.timestamp < 24 * 60 * 60 * 1000) {
                console.log('Состояние актуально, восстанавливаем...');
                
                // Увеличиваем счетчик обновлений после загрузки состояния
                refreshCounter++;
                console.log(`Инициализация: Счетчик обновлений увеличен до ${refreshCounter}`);
                
                // Проверяем, не нужно ли автоматически очистить кеш
                if (refreshCounter >= MAX_REFRESHES_BEFORE_CLEAR) {
                    console.log('Достигнут лимит обновлений, автоматически очищаем кеш и загружаем заново');
                    clearLocalStorage();
                    await loadFirstPage();
                    return;
                }
                
                // Восстанавливаем состояние
                window.isRestoring = true;
                const restored = await restoreAllProducts();
                window.isRestoring = false;
                
                if (restored) {
                    // Затем загружаем свежие данные для обновления статусов и рейтингов
                    console.log('Загружаем свежие данные для обновления статусов и рейтингов...');
                    await refreshProductData();
                    
                    // Восстанавливаем позицию скролла после обновления данных
                    if (savedState.scrollPosition > 0) {
                        console.log('Восстанавливаем позицию скролла после обновления данных:', savedState.scrollPosition);
                        
                        // Функция для надежного восстановления позиции скролла
                        const restoreScrollPosition = (position) => {
                            try {
                                console.log('=== ВОССТАНОВЛЕНИЕ СКРОЛЛА ===');
                                console.log('Пытаемся восстановить позицию:', position);
                                console.log('Текущая позиция до восстановления:', window.pageYOffset || document.documentElement.scrollTop);
                                console.log('Высота документа:', document.documentElement.scrollHeight);
                                console.log('Высота окна:', window.innerHeight);
                                
                                // Проверяем, что позиция не превышает максимальную высоту страницы
                                const maxScroll = document.documentElement.scrollHeight - window.innerHeight;
                                const safePosition = Math.min(position, maxScroll);
                                
                                if (safePosition !== position) {
                                    console.log(`Позиция скорректирована с ${position} на ${safePosition} (максимум: ${maxScroll})`);
                                }
                                
                                // Проверяем, что страница достаточно загружена
                                if (document.documentElement.scrollHeight < window.innerHeight + 100) {
                                    console.log('Страница еще не полностью загружена, откладываем восстановление');
                                    return false;
                                }
                                
                                window.scrollTo(0, safePosition);
                                console.log('Позиция скролла восстановлена:', safePosition);
                                
                                // Проверяем, что скролл действительно восстановился
                                setTimeout(() => {
                                    const currentScroll = window.pageYOffset || document.documentElement.scrollTop;
                                    console.log('Проверка после восстановления. Текущая позиция:', currentScroll);
                                    if (Math.abs(currentScroll - safePosition) > 10) {
                                        console.log('Позиция скролла не восстановилась корректно, повторяем...');
                                        window.scrollTo(0, safePosition);
                                        return false;
                                    } else {
                                        console.log('Позиция скролла восстановлена успешно!');
                                        return true;
                                    }
                                }, 50);
                                
                                return true;
                            } catch (error) {
                                console.error('Ошибка при восстановлении позиции скролла:', error);
                                return false;
                            }
                        };
                        
                        // Функция для попыток восстановления с проверкой успеха
                        const attemptRestoreScroll = (position, attempts = 0) => {
                            if (attempts >= 10) {
                                console.log('Достигнуто максимальное количество попыток восстановления скролла');
                                return;
                            }
                            
                            const success = restoreScrollPosition(position);
                            if (!success) {
                                console.log(`Попытка ${attempts + 1} не удалась, повторяем через 500мс...`);
                                setTimeout(() => attemptRestoreScroll(position, attempts + 1), 500);
                            }
                        };
                        
                        // Используем улучшенную логику восстановления
                        attemptRestoreScroll(savedState.scrollPosition);
                    }
                } else {
                    // Если восстановление не удалось, загружаем с нуля
                    console.log('Восстановление не удалось, загружаем с нуля...');
                    await loadFirstPage();
                }
            } else {
                console.log('Состояние устарело или неполное, загружаем с нуля...');
                await loadFirstPage();
            }
        } else {
            // Если нет сохранённого состояния, загружаем с нуля
            console.log('Нет сохранённого состояния, загружаем с нуля...');
            
            // Увеличиваем счетчик обновлений для первого посещения
            refreshCounter++;
            console.log(`Инициализация: Счетчик обновлений увеличен до ${refreshCounter} (первое посещение)`);
            
            await loadFirstPage();
        }
        
        // Настраиваем обработчики для изображений
        setupImageHandlers();
        console.log('Обработчики изображений настроены');
        
        // Настраиваем обработчики для корзины
        setupCartEventHandlers();
        console.log('Обработчики корзины настроены');
        
        // Запускаем автосохранение состояния
        startAutoSave();
        console.log('Автосохранение запущено');
        
        // Настраиваем обработчик перед выгрузкой страницы
        setupBeforeUnload();
        console.log('Обработчик beforeunload настроен');
        
        // Настраиваем обработчик прокрутки для бесконечной загрузки
        window.addEventListener('scroll', handleScroll);
        console.log('Обработчик прокрутки настроен');
        
        // Настраиваем обработчики для кнопок меню и настроек
        console.log('=== НАСТРОЙКА КНОПОК МЕНЮ И НАСТРОЕК ===');
        const menuBtn = document.querySelector('.menu-btn');
        console.log('menuBtn найден:', menuBtn);
        if (menuBtn) {
            console.log('Кнопка меню найдена, обработчики уже настроены через onclick в HTML');
        } else {
            console.error('ОШИБКА: Кнопка меню не найдена!');
        }
        
        const settingsBtn = document.querySelector('.settings-btn');
        console.log('settingsBtn найден:', settingsBtn);
        if (settingsBtn) {
            console.log('Кнопка настроек найдена, обработчики уже настроены через onclick в HTML');
        } else {
            console.error('ОШИБКА: Кнопка настроек не найдена!');
        }
        console.log('=== КОНЕЦ НАСТРОЙКИ КНОПОК ===');
        
        // Настраиваем обработчики для переключения языков
        console.log('=== НАСТРОЙКА ПЕРЕКЛЮЧЕНИЯ ЯЗЫКОВ ===');
        setupLanguageSwitchers();
        console.log('Обработчики переключения языков настроены');
        
        // Загружаем фото профиля из Telegram (если доступно)
        console.log('=== ЗАГРУЗКА ФОТО ПРОФИЛЯ ИЗ TELEGRAM ===');
        loadTelegramProfilePhoto();
        console.log('Фото профиля загружено (если доступно)');
        
        // Настраиваем закрытие всплывающих окон при клике вне их
        setupPopupClickOutside();
        console.log('Обработчики закрытия всплывающих окон настроены');
        
        // Настраиваем обработчики для меню категорий
        setupCategoryMenuHandlers();
        console.log('Обработчики меню категорий настроены');
        
        // Проверяем наличие popup контактов
        const contactsPopup = document.getElementById('contactsPopup');
        console.log('Проверка popup контактов:', contactsPopup);
        if (!contactsPopup) {
            console.error('ОШИБКА: Popup контактов не найден в DOM!');
        } else {
            console.log('Popup контактов найден и готов к работе');
        }
        
        // Кнопка "Загрузить все товары" удалена по запросу пользователя
        
        // Настраиваем кнопку поддержки
        const supportButton = document.querySelector('.online-status');
        if (supportButton) {
            supportButton.addEventListener('click', () => {
                openTelegramChat('GuitarStringsUSA');
            });
            
            // Обновляем статус кнопки поддержки
            updateSupportButtonStatus();
            
            // Обновляем статус каждые 10 минут (увеличиваем интервал)
            setInterval(updateSupportButtonStatus, 10 * 60 * 1000);
        }
        
        // Настраиваем обработчики для нижней навигации
        console.log('=== НАСТРОЙКА НИЖНЕЙ НАВИГАЦИИ ===');
        const navItems = document.querySelectorAll('.nav-item');
        console.log('navItems найдены:', navItems.length);
        
        // Устанавливаем начальную активность для кнопки "Товары"
        if (navItems.length > 0) {
            navItems[0].classList.add('active');
            console.log('Установлена начальная активность для кнопки "Товары"');
        }
        
        navItems.forEach((navItem, index) => {
            // Удаляем старые обработчики если они есть
            navItem.removeEventListener('click', navItem._clickHandler);
            
            // Создаем новый обработчик
            navItem._clickHandler = (e) => {
                console.log(`Кнопка нижней навигации ${index + 1} нажата`);
                e.preventDefault();
                e.stopPropagation();
                
                // Убираем активный класс со всех кнопок
                navItems.forEach(item => {
                    item.classList.remove('active');
                    console.log(`Убран активный класс с кнопки ${item.querySelector('span')?.textContent}`);
                });
                
                // Добавляем активный класс к нажатой кнопке
                navItem.classList.add('active');
                console.log(`Добавлен активный класс к кнопке ${navItem.querySelector('span')?.textContent}`);
                
                // Здесь можно добавить логику для переключения разделов
                const navText = navItem.querySelector('span').textContent;
                console.log(`Переключение на раздел: ${navText}`);
                
                // Пока что просто переключаем активный класс без уведомлений
                // Убираем логику возврата к "Товары" - позволяем кнопкам оставаться активными
            };
            
            // Добавляем обработчик
            navItem.addEventListener('click', navItem._clickHandler);
            
            console.log(`Обработчик для nav-item ${index + 1} настроен`);
        });
        console.log('=== КОНЕЦ НАСТРОЙКИ НИЖНЕЙ НАВИГАЦИИ ===');
        
        // Настраиваем event delegation для карточек товаров (оптимизация производительности)
        console.log('=== НАСТРОЙКА EVENT DELEGATION ДЛЯ КАРТОЧЕК ТОВАРОВ ===');
        const innerContainer = document.querySelector('.inner');
        if (innerContainer) {
            innerContainer.addEventListener('click', (e) => {
                // Обработка кнопок покупки
                if (e.target.classList.contains('btn') && e.target.id) {
                    const availability = e.target.getAttribute('data-product-availability');
                    const productName = e.target.getAttribute('data-product-name');
                    
                    console.log(`Кнопка покупки нажата: ${productName}, статус: ${availability}`);
                    
                    if (availability === 'Снят с производства') {
                        showDiscontinuedPopup();
                    } else if (availability === 'Нет в наличии') {
                        showOutOfStockPopup();
                    } else if (availability === 'Ожидается') {
                        showExpectedPopup();
                    } else if (availability === 'Под заказ') {
                        showOnOrderPopup();
                    } else {
                        // Обычная покупка
                        if (window.tg && window.tg.MainButton) {
                            window.tg.MainButton.text = `Выбрано: ${productName}`;
                            window.tg.MainButton.show();
                        }
                    }
                }
                
                // Обработка кнопок избранного
                if (e.target.closest('.favorite-btn')) {
                    e.preventDefault();
                    const favoriteBtn = e.target.closest('.favorite-btn');
                    favoriteBtn.classList.toggle('favorited');
                    const icon = favoriteBtn.querySelector('i');
                    if (favoriteBtn.classList.contains('favorited')) {
                        icon.className = 'fas fa-heart';
                    } else {
                        icon.className = 'far fa-heart';
                    }
                }
                
                // Обработка кнопок сравнения
                if (e.target.closest('.compare-btn')) {
                    e.preventDefault();
                    const compareBtn = e.target.closest('.compare-btn');
                    compareBtn.style.color = compareBtn.style.color === 'var(--primary-color)' ? 'var(--text-light)' : 'var(--primary-color)';
                }
            });
            console.log('Event delegation для карточек товаров настроен');
        }
        console.log('=== КОНЕЦ НАСТРОЙКИ EVENT DELEGATION ===');
        
        // Настройка поиска перенесена в начало инициализации
        
        // ИСПРАВЛЕНИЕ БАГА: Принудительно обновляем переводы кнопок после полной инициализации
        console.log('=== ПРИНУДИТЕЛЬНОЕ ОБНОВЛЕНИЕ ПЕРЕВОДОВ КНОПОК ===');
        const currentLanguage = localStorage.getItem('selectedLanguage') || 'uk';
        if (typeof updateProductButtonTranslations === 'function') {
            console.log(`Принудительно обновляем переводы кнопок для языка: ${currentLanguage}`);
            updateProductButtonTranslations(currentLanguage);
        } else {
            console.warn('Функция updateProductButtonTranslations не найдена');
        }
        console.log('=== КОНЕЦ ОБНОВЛЕНИЯ ПЕРЕВОДОВ ===');
        
        console.log('Инициализация завершена успешно');
    } catch (error) {
        console.error('Ошибка во время инициализации:', error);
        
        // Показываем сообщение об ошибке
        const container = document.querySelector('.inner');
        if (container) {
            container.innerHTML = `
                <div class="error-message">
                    <p>Произошла ошибка при загрузке товаров: ${error.message}</p>
                    <button class="btn" onclick="location.reload()">Перезагрузить страницу</button>
                </div>
            `;
        }
    }
});

// Функция для отображения аватара пользователя
function displayUserAvatar(photoUrl) {
    console.log('displayUserAvatar: Загружаем аватар:', photoUrl);
    
    const profileImage = document.getElementById('profile-image');
    const profileIcon = document.getElementById('profile-icon');
    const profileSvg = document.getElementById('profile-svg');
    
    if (profileImage && profileIcon && profileSvg) {
        profileImage.src = photoUrl;
        profileImage.style.display = 'block';
        profileIcon.style.display = 'none';
        profileSvg.style.display = 'none';
        
        // Добавляем обработчик ошибок для изображения
        profileImage.onerror = () => {
            console.warn('Не удалось загрузить аватар пользователя, показываем иконку по умолчанию');
            showDefaultProfileIcon();
        };
        
        profileImage.onload = () => {
            console.log('Аватар пользователя успешно загружен');
        };
    }
}

// Функция для показа иконки профиля по умолчанию
function showDefaultProfileIcon() {
    console.log('showDefaultProfileIcon: Показываем иконку профиля по умолчанию');
    
    const profileImage = document.getElementById('profile-image');
    const profileIcon = document.getElementById('profile-icon');
    const profileSvg = document.getElementById('profile-svg');
    
    if (profileImage && profileIcon && profileSvg) {
        profileImage.style.display = 'none';
        profileIcon.style.display = 'block';
        profileSvg.style.display = 'none';
    }
}

// Функция для получения и отображения фото профиля из Telegram
function loadTelegramProfilePhoto() {
    console.log('=== loadTelegramProfilePhoto: Начинаем загрузку аватара ===');
    console.log('window.Telegram:', !!window.Telegram);
    console.log('window.Telegram.WebApp:', !!window.Telegram?.WebApp);
    console.log('tg:', !!tg);
    console.log('tg.initDataUnsafe:', !!tg?.initDataUnsafe);
    console.log('tg.initDataUnsafe.user:', !!tg?.initDataUnsafe?.user);
    
    // Дополнительная проверка - ждем немного, если данные еще не загрузились
    if (!tg?.initDataUnsafe?.user) {
        console.log('Данные пользователя еще не загружены, пробуем альтернативные способы...');
        
        // Пробуем получить данные через initData
        if (tg.initData) {
            try {
                const initData = new URLSearchParams(tg.initData);
                const userData = initData.get('user');
                if (userData) {
                    console.log('Найдены данные пользователя в initData:', userData);
                    const user = JSON.parse(decodeURIComponent(userData));
                    console.log('Парсированные данные пользователя:', user);
                    
                    // Если есть фото, загружаем его
                    if (user.photo_url) {
                        displayUserAvatar(user.photo_url);
                        return;
                    }
                }
            } catch (error) {
                console.warn('Ошибка при парсинге initData:', error);
            }
        }
        
        // Если все способы не сработали, показываем иконку по умолчанию
        console.log('Не удалось получить данные пользователя, показываем иконку по умолчанию');
        showDefaultProfileIcon();
        return;
    }
    
    if (window.Telegram && window.Telegram.WebApp && tg.initDataUnsafe && tg.initDataUnsafe.user) {
        const user = tg.initDataUnsafe.user;
        console.log('Telegram user data:', user);
        console.log('User photo_url:', user.photo_url);
        
        if (user.photo_url) {
            const profileImage = document.getElementById('profile-image');
            const profileIcon = document.getElementById('profile-icon');
            const profileSvg = document.getElementById('profile-svg');
            
            console.log('Profile image element:', !!profileImage);
            console.log('Profile icon element:', !!profileIcon);
            console.log('Profile SVG element:', !!profileSvg);
            
            if (profileImage && profileIcon && profileSvg) {
                console.log('Устанавливаем src для аватара:', user.photo_url);
                
                // Сохраняем данные пользователя в localStorage для использования в веб-версии
                try {
                    const userDataToSave = {
                        id: user.id,
                        first_name: user.first_name,
                        last_name: user.last_name,
                        username: user.username,
                        photo_url: user.photo_url,
                        timestamp: Date.now()
                    };
                    localStorage.setItem('telegramUserData', JSON.stringify(userDataToSave));
                    console.log('Данные пользователя Telegram сохранены в localStorage');
                } catch (error) {
                    console.warn('Не удалось сохранить данные пользователя в localStorage:', error);
                }
                
                // Отображаем аватар пользователя
                displayUserAvatar(user.photo_url);
            } else {
                console.error('Не найдены элементы аватара в DOM');
            }
        } else {
            console.log('Фото профиля не найдено в данных Telegram пользователя');
            console.log('Доступные поля пользователя:', Object.keys(user));
        }
    } else {
        console.log('Telegram WebApp недоступен или данные пользователя отсутствуют');
        console.log('Проверяем tg.initDataUnsafe:', tg?.initDataUnsafe);
        if (tg?.initDataUnsafe) {
            console.log('initDataUnsafe keys:', Object.keys(tg.initDataUnsafe));
        }
        
        // Проверяем, есть ли сохраненные данные пользователя в localStorage
        checkSavedTelegramUser();
    }
}

// Функция для проверки сохраненных данных пользователя Telegram
function checkSavedTelegramUser() {
    const telegramUserData = localStorage.getItem('telegramUserData');
    if (telegramUserData) {
        try {
            const userData = JSON.parse(telegramUserData);
            
            // Проверяем, не устарели ли данные (старше 24 часов)
            const dataAge = Date.now() - userData.timestamp;
            const maxAge = 24 * 60 * 60 * 1000; // 24 часа
            
            if (dataAge < maxAge && userData.photo_url) {
                console.log('Найдены актуальные данные пользователя Telegram, загружаем аватар...');
                displayUserAvatar(userData.photo_url);
                console.log('Аватар пользователя Telegram загружен из localStorage');
            } else {
                console.log('Данные пользователя Telegram устарели, очищаем localStorage');
                localStorage.removeItem('telegramUserData');
            }
        } catch (error) {
            console.warn('Ошибка при загрузке данных пользователя Telegram из localStorage:', error);
            localStorage.removeItem('telegramUserData');
        }
    }
}

// Обработчики событий Telegram
if (window.Telegram && window.Telegram.WebApp) {
    console.log('=== ИНИЦИАЛИЗАЦИЯ TELEGRAM WEBAPP ===');
    
    // Ждем готовности Telegram WebApp
    tg.ready();
    console.log('Telegram WebApp готов');
    
    // Проверяем данные пользователя
    console.log('tg.initDataUnsafe:', tg.initDataUnsafe);
    console.log('tg.initDataUnsafe.user:', tg.initDataUnsafe?.user);
    console.log('tg.initData:', tg.initData);
    
    // Пробуем получить данные пользователя разными способами
    if (tg.initData) {
        try {
            const initData = new URLSearchParams(tg.initData);
            const userData = initData.get('user');
            if (userData) {
                console.log('Данные пользователя из initData:', userData);
                const user = JSON.parse(decodeURIComponent(userData));
                console.log('Парсированные данные пользователя:', user);
                
                // Если есть фото, сразу загружаем его
                if (user.photo_url) {
                    console.log('Найдено фото в initData, загружаем аватар...');
                    displayUserAvatar(user.photo_url);
                    
                    // Сохраняем данные пользователя
                    try {
                        const userDataToSave = {
                            id: user.id,
                            first_name: user.first_name,
                            last_name: user.last_name,
                            username: user.username,
                            photo_url: user.photo_url,
                            timestamp: Date.now()
                        };
                        localStorage.setItem('telegramUserData', JSON.stringify(userDataToSave));
                        console.log('Данные пользователя из initData сохранены в localStorage');
                    } catch (error) {
                        console.warn('Не удалось сохранить данные пользователя в localStorage:', error);
                    }
                }
            }
        } catch (error) {
            console.warn('Ошибка при парсинге initData:', error);
        }
    }
    
    // Пробуем получить данные через tg.MainButton или другие свойства
    console.log('tg.MainButton:', !!tg.MainButton);
    console.log('tg.BackButton:', !!tg.BackButton);
    console.log('tg.HapticFeedback:', !!tg.HapticFeedback);
    
    // Проверяем, есть ли данные в других местах
    if (tg.MainButton) {
        console.log('MainButton доступен, проверяем данные...');
    }
    
    // Добавляем обработчик событий Telegram WebApp
    if (tg.onEvent) {
        tg.onEvent('viewportChanged', () => {
            console.log('Viewport изменился, проверяем данные пользователя...');
            if (tg.initDataUnsafe?.user) {
                console.log('Данные пользователя доступны, загружаем аватар...');
                loadTelegramProfilePhoto();
            }
        });
    }
    
    // Загружаем фото профиля после готовности Telegram WebApp
    // Добавляем небольшую задержку для гарантии готовности
    setTimeout(() => {
        console.log('Вызываем loadTelegramProfilePhoto...');
        loadTelegramProfilePhoto();
    }, 100);
    

    
    console.log('Telegram WebApp успешно инициализирован');
    

} else {
    console.log('Telegram WebApp не доступен, пропускаем инициализацию');
}

// Настройка обработчиков изображений
function setupImageHandlers() {
    // Обработчик ошибок для изображений товаров
    const productImages = document.querySelectorAll('.product-image img');
    
    productImages.forEach(img => {
        // Предотвращаем 404 ошибки
        img.addEventListener('error', function() {
            console.log(`Изображение не загружено: ${this.src}`);
            
            // Скрываем сломанное изображение
            this.style.display = 'none';
            
            // Показываем fallback
            const productImage = this.closest('.product-image');
            if (productImage) {
                productImage.classList.add('image-error');
            }
        });
        
        // Обработчик успешной загрузки
        img.addEventListener('load', function() {
            console.log(`Изображение загружено: ${this.src}`);
            this.style.display = 'block';
            
            const productImage = this.closest('.product-image');
            if (productImage) {
                productImage.classList.remove('image-error');
            }
        });
    });
    
    console.log('Обработчики изображений настроены');
}

// Удалено - дублирующий обработчик DOMContentLoaded

// Функция показа сообщения о снятии с производства
function showDiscontinuedPopup() {
    console.log('showDiscontinuedPopup: Показываем popup для товара снятого с производства');
    openPopup('discontinuedPopup');
}

function showOutOfStockPopup() {
    console.log('showOutOfStockPopup: Показываем popup для товара которого нет в наличии');
    openPopup('outOfStockPopup');
}

function showExpectedPopup() {
    console.log('showExpectedPopup: Показываем popup для товара который ожидается');
    openPopup('expectedPopup');
}

function showOnOrderPopup() {
    console.log('showOnOrderPopup: Показываем popup для товара под заказ');
    openPopup('onOrderPopup');
}

// Функции для показа всплывающих окон меню и настроек
function showMenuPopup() {
    console.log('=== showMenuPopup: Проверяем состояние popup меню ===');
    const popup = document.getElementById('menuPopup');
    console.log('menuPopup найден:', popup);
    
    // Проверяем, открыто ли уже окно меню
    if (popup && popup.classList.contains('show')) {
        console.log('showMenuPopup: Окно меню уже открыто, закрываем его');
        closePopup('menuPopup');
    } else {
        console.log('showMenuPopup: Открываем popup меню');
        openPopup('menuPopup');
    }
}

function showSettingsPopup() {
    console.log('=== showSettingsPopup: Проверяем состояние popup настроек ===');
    const popup = document.getElementById('settingsPopup');
    console.log('settingsPopup найден:', popup);
    
    // Проверяем, открыто ли уже окно настроек
    if (popup && popup.classList.contains('show')) {
        console.log('showSettingsPopup: Окно настроек уже открыто, закрываем его');
        closePopup('settingsPopup');
    } else {
        console.log('showSettingsPopup: Открываем popup настроек');
        openPopup('settingsPopup');
    }
}

// Функция для настройки обработчиков меню категорий
function setupCategoryMenuHandlers() {
    console.log('setupCategoryMenuHandlers: Настраиваем обработчики для меню категорий');
    
    // Настраиваем обработку ошибок загрузки изображений категорий
    setupCategoryImageErrorHandling();
    
    // Используем event delegation для обработки кликов по категориям
    document.addEventListener('click', (e) => {
        const categoryItem = e.target.closest('.category-item');
        const contactsItem = e.target.closest('.contacts-item');
        
        // Игнорируем клики по пункту контактов
        if (contactsItem) {
            return;
        }
        
        if (categoryItem) {
            e.preventDefault();
            e.stopPropagation();
            
            const category = categoryItem.getAttribute('data-category');
            const categoryName = categoryItem.querySelector('span').textContent;
            
            console.log(`setupCategoryMenuHandlers: Выбрана категория: ${category} - ${categoryName}`);
            
            // Закрываем меню
            closePopup('menuPopup');
            
            // Показываем уведомление о выборе категории
            showCategorySelectedNotification(categoryName);
            
            // Здесь можно добавить логику для фильтрации товаров по категории
            // Например, отправка запроса к API с параметром категории
            handleCategorySelection(category);
        }
    });
    
    console.log('setupCategoryMenuHandlers: Обработчики настроены');
}

// Функция для обработки ошибок загрузки изображений категорий
function setupCategoryImageErrorHandling() {
    console.log('setupCategoryImageErrorHandling: Настраиваем обработку ошибок изображений');
    
    // Находим все изображения категорий
    const categoryImages = document.querySelectorAll('.category-image');
    
    categoryImages.forEach((img, index) => {
        // Добавляем обработчик ошибки загрузки
        img.addEventListener('error', function() {
            console.warn(`setupCategoryImageErrorHandling: Ошибка загрузки изображения категории ${index + 1}: ${this.src}`);
            
            // Заменяем изображение на иконку по умолчанию
            this.style.display = 'none';
            
            // Создаем иконку по умолчанию
            const fallbackIcon = document.createElement('i');
            fallbackIcon.className = 'fas fa-guitar category-fallback-icon';
            fallbackIcon.style.cssText = `
                color: var(--accent-color);
                font-size: 18px;
                width: 40px;
                height: 40px;
                display: flex;
                align-items: center;
                justify-content: center;
                background: var(--bg-secondary);
                border: 1px solid var(--border-color);
                border-radius: 8px;
                flex-shrink: 0;
            `;
            
            // Вставляем иконку перед текстом
            this.parentNode.insertBefore(fallbackIcon, this.nextSibling);
        });
        
        // Добавляем обработчик успешной загрузки
        img.addEventListener('load', function() {
            console.log(`setupCategoryImageErrorHandling: Изображение категории ${index + 1} успешно загружено: ${this.src}`);
        });
    });
    
    console.log(`setupCategoryImageErrorHandling: Обработчики настроены для ${categoryImages.length} изображений`);
}

// Делаем функции глобально доступными
window.showContactsPopup = showContactsPopup;
window.closeContactsPopup = closeContactsPopup;

// Тестовая функция для отладки
window.testContactsPopup = function() {
    console.log('=== ТЕСТ POPUP КОНТАКТОВ ===');
    console.log('1. Проверяем наличие элемента...');
    const popup = document.getElementById('contactsPopup');
    console.log('Popup элемент:', popup);
    
    if (popup) {
        console.log('2. Проверяем текущие классы...');
        console.log('Классы:', popup.className);
        
        console.log('3. Добавляем класс show...');
        popup.classList.add('show');
        
        console.log('4. Проверяем классы после добавления...');
        console.log('Классы:', popup.className);
        
        console.log('5. Проверяем стили...');
        const styles = window.getComputedStyle(popup);
        console.log('display:', styles.display);
        console.log('visibility:', styles.visibility);
        console.log('opacity:', styles.opacity);
        console.log('z-index:', styles.zIndex);
        
        alert('Тест завершен! Проверьте консоль.');
    } else {
        alert('Popup элемент не найден!');
    }
};

// Функция для обработки выбора категории
function handleCategorySelection(category) {
    console.log(`handleCategorySelection: Обработка выбора категории: ${category}`);
    
    // Получаем текущий язык
    const currentLanguage = localStorage.getItem('selectedLanguage') || 'uk';
    
    // Формируем URL для категории на соответствующем языке
    let categoryUrl = '';
    switch (currentLanguage) {
        case 'ru':
            categoryUrl = `https://guitarstrings.com.ua/shop`;
            break;
        case 'uk':
            categoryUrl = `https://guitarstrings.com.ua/ua/shop`;
            break;
        case 'en':
            categoryUrl = `https://guitarstrings.com.ua/en/shop`;
            break;
        default:
            categoryUrl = `https://guitarstrings.com.ua/ua/shop`;
    }
    
    console.log(`handleCategorySelection: URL категории: ${categoryUrl}`);
    
    // Здесь можно добавить логику для:
    // 1. Фильтрации товаров по категории
    // 2. Отправки запроса к API с параметром категории
    // 3. Обновления списка товаров
    // 4. Сохранения выбранной категории в localStorage
    
    // Пока что просто сохраняем выбранную категорию
    localStorage.setItem('selectedCategory', category);
    console.log(`handleCategorySelection: Категория ${category} сохранена в localStorage`);
}

// Функции для работы с popup контактов
function showContactsPopup() {
    // Защита от рекурсивных вызовов
    if (window.isShowingContactsPopup) {
        console.log('showContactsPopup: Popup уже открывается, пропускаем...');
        return;
    }
    
    try {
        window.isShowingContactsPopup = true;
        console.log('=== showContactsPopup: НАЧАЛО ФУНКЦИИ ===');
        
        // ИСПРАВЛЕНИЕ: Используем openPopup для корректного открытия
        // Это гарантирует, что меню останется открытым
        openPopup('contactsPopup');
        
        console.log('showContactsPopup: Popup контактов успешно открыт через openPopup');
        
    } catch (error) {
        console.error('showContactsPopup: ОШИБКА В ФУНКЦИИ:', error);
        alert('ОШИБКА в showContactsPopup: ' + error.message);
    } finally {
        // Сбрасываем флаг в любом случае
        window.isShowingContactsPopup = false;
    }
}

function closeContactsPopup() {
    console.log('closeContactsPopup: Закрываем popup контактов');
    
    // ИСПРАВЛЕНИЕ: Используем closePopup для корректного закрытия
    // Это гарантирует, что меню останется открытым
    closePopup('contactsPopup');
    
    console.log('closeContactsPopup: Popup контактов закрыт через closePopup');
}

// Функция для показа popup оферты
window.showOfferPopup = function() {
    const popup = document.getElementById('offerPopup');
    const offerText = document.getElementById('offerText');
    
    if (popup && offerText) {
        const currentLanguage = localStorage.getItem('selectedLanguage') || 'uk';
        
        // Загружаем текст оферты в зависимости от языка
        const offerContent = getOfferContent(currentLanguage);
        offerText.innerHTML = offerContent;
        
        // ИСПРАВЛЕНИЕ: Используем openPopup для корректного открытия
        // Это гарантирует, что меню останется открытым
        openPopup('offerPopup');
        
        // Добавляем обработчики событий для закрытия
        addOfferPopupEventListeners();
        
        console.log('showOfferPopup: Popup оферты успешно открыт через openPopup');
    } else {
        console.error('showOfferPopup: Popup оферты или элемент текста не найден');
    }
}

// Функция для добавления обработчиков событий для окна оферты
function addOfferPopupEventListeners() {
    const popup = document.getElementById('offerPopup');
    
    if (!popup) return;
    
    // Обработчик клавиши ESC
    const handleEscKey = (e) => {
        if (e.key === 'Escape') {
            closeOfferPopup();
        }
    };
    
    // Обработчик клика вне окна
    const handleOutsideClick = (e) => {
        if (e.target === popup) {
            closeOfferPopup();
        }
    };
    
    // Добавляем обработчики
    document.addEventListener('keydown', handleEscKey);
    popup.addEventListener('click', handleOutsideClick);
    
    // Сохраняем ссылки на обработчики для последующего удаления
    popup._escHandler = handleEscKey;
    popup._outsideClickHandler = handleOutsideClick;
}

// Функция для закрытия окна оферты
window.closeOfferPopup = function() {
    const popup = document.getElementById('offerPopup');
    
    if (popup) {
        // Удаляем обработчики событий
        if (popup._escHandler) {
            document.removeEventListener('keydown', popup._escHandler);
            delete popup._escHandler;
        }
        
        if (popup._outsideClickHandler) {
            popup.removeEventListener('click', popup._outsideClickHandler);
            delete popup._outsideClickHandler;
        }
        
        // ИСПРАВЛЕНИЕ: Используем closePopup для корректного закрытия
        // Это гарантирует, что меню останется открытым
        closePopup('offerPopup');
        
        console.log('closeOfferPopup: Popup оферты закрыт через closePopup');
    }
}

// Функция для получения текста оферты на разных языках
function getOfferContent(language) {
    const offers = {
        uk: `
            <h4>Загальні положення</h4>
            <p><strong>1.1.</strong> Справжня оферта є офіційною пропозицією «Guitar Strings», далі за текстом — «Продавець», укласти Договір купівлі-продажу товарів дистанційним способом, тобто через Інтернет-магазин, далі за текстом — «Договір», та розміщує Публічну оферту (пропозиція) на офіційному інтернет-сайті Продавця https://guitarstrings.com.ua (далі - Інтернет-сайт).</p>
            
            <p><strong>1.2.</strong> Моментом повного та безумовного прийняття Покупцем пропозиції Продавця (акцептом) укласти електронний договір купівлі-продажу товарів, вважається факт оплати Покупцем замовлення на умовах цього Договору, у строки та за цінами, вказаними на Інтернет-сайті Продавця.</p>
            
            <h4>Поняття та визначення</h4>
            <p><strong>2.1.</strong> У цій оферті, якщо контекст не вимагає іншого, наведені нижче терміни мають такі значення:</p>
            <ul>
                <li><strong>«товар»</strong> - моделі, аксесуари, комплектуючі та супровідні предмети;</li>
                <li><strong>«Інтернет-магазин»</strong> - відповідно до Закону України «про електронну комерцію», засіб для подання або реалізації товару, роботи чи послуги шляхом вчинення електронної угоди.</li>
                <li><strong>«Продавець»</strong> - компанія, що реалізує товари, які представлені на Інтернет-сайті.</li>
                <li><strong>«Покупець»</strong> - фізична особа, яка уклала з Продавцем Договір на умовах, викладених нижче.</li>
                <li><strong>«Замовлення»</strong> - вибір окремих позицій із переліку товарів, зазначених Покупцем під час розміщення замовлення та проведення оплати.</li>
            </ul>
            
            <h4>Предмет Договору</h4>
            <p><strong>3.1.</strong> Продавець зобов'язується передати у власність Покупця Товар, а Покупець зобов'язується сплатити та прийняти Товар на умовах цього Договору.</p>
            
            <p>Цей Договір регулює купівлю-продаж товарів в Інтернет-магазині, зокрема:</p>
            <ul>
                <li>Добровільний вибір Покупцем товарів в Інтернет-магазині;</li>
                <li>Самостійне оформлення Покупцем замовлення в Інтернет-магазині;</li>
                <li>оплата Покупцем замовлення, оформленого в Інтернет-магазині;</li>
                <li>обробка та доставка замовлення Покупцю у власність на умовах цього Договору.</li>
            </ul>
            
            <h4>Порядок оформлення замовлення</h4>
            <p><strong>4.1.</strong> Покупець має право оформити замовлення на будь-який товар, представлений на Сайті Інтернет-магазину та наявний.</p>
            <p><strong>4.2.</strong> Кожна позиція може бути представлена ​​в замовлення у будь-якій кількості.</p>
            <p><strong>4.3.</strong> За відсутності товару на складі, Менеджер компанії зобов'язаний повідомити Покупця (по телефону або через електронну пошту).</p>
            <p><strong>4.4.</strong> За відсутності товару Покупець має право замінити його товаром аналогічної моделі, відмовитися від цього товару, анулювати замовлення.</p>
            
            <h4>Порядок оплати замовлення</h4>
            <p><strong>Післяплатою</strong></p>
            <p><strong>5.1.</strong> Оплата здійснюється за фактом отримання товару у відділенні транспортної компанії за готівку в гривнях.</p>
            <p><strong>5.2.</strong> При ненадходженні коштів Інтернет-магазин залишає за собою право анулювати замовлення.</p>
            
            <h4>Умови доставки замовлення</h4>
            <p><strong>6.1.</strong> Доставка товарів, придбаних в Інтернет-магазині, здійснюється до складів транспортних компаній, де й провадиться видача замовлень.</p>
            <p><strong>6.2.</strong> Разом із замовленням Покупцю надаються документи згідно із законодавством України.</p>
            
            <h4>Права та обов'язки сторін:</h4>
            <p><strong>7.1.</strong> Продавець має право:</p>
            <ul>
                <li>в односторонньому порядку призупинити надання послуг за цим договором у разі порушення Покупцем умов цього договору.</li>
            </ul>
            
            <p><strong>7.2.</strong> Покупець зобов'язаний:</p>
            <ul>
                <li>своєчасно сплатити та отримати замовлення на умовах цього договору.</li>
            </ul>
            
            <p><strong>7.3.</strong> Покупець має право:</p>
            <ul>
                <li>Оформити замовлення в Інтернет-магазині;</li>
                <li>оформити електронний договір;</li>
                <li>вимагати від Продавця виконання умов цього Договору.</li>
            </ul>
            
            <h4>Відповідальність сторін</h4>
            <p><strong>8.1.</strong> Сторони несуть відповідальність за невиконання або неналежне виконання умов цього договору у порядку, передбаченому цим договором та чинним законодавством України.</p>
            
            <p><strong>8.2.</strong> Продавець не несе відповідальності за:</p>
            <ul>
                <li>Змінений виробником зовнішній вигляд Товару;</li>
                <li>за незначну невідповідність кольорової гами товару, що може відрізнятися від оригіналу товару виключно через різну колірну передачу моніторів персональних комп'ютерів окремих моделей;</li>
                <li>за зміст та правдивість інформації, що надається Покупцем під час оформлення замовлення;</li>
                <li>за затримку та перебої у наданні Послуг (обробки замовлення та доставки товару), що відбуваються з причин, що знаходяться поза сферою його контролю;</li>
                <li>за протиправні незаконні дії, здійснені Покупцем за допомогою цього доступу до мережі Інтернет;</li>
                <li>за передачу Покупцем своїх мережевих ідентифікаторів - IP, MAC-адреси, логіну та паролю третім особам;</li>
            </ul>
            
            <p><strong>8.3.</strong> Покупець, використовуючи наданий йому доступ до мережі Інтернет, самостійно несе відповідальність за шкоду, заподіяну його діями (особисто, навіть якщо під її логіном перебувала інша особа) особам або їхньому майну, юридичним особам, державі чи моральним принципам моральності.</p>
            
            <p><strong>8.4.</strong> У разі настання обставин непереборної сили сторони звільняються від виконання умов цього договору. Під обставинами непереборної сили для цілей цього договору розуміються події, що мають надзвичайний, непередбачуваний характер, які виключають або об'єктивно заважають виконанню цього договору, настання яких Сторони не могли передбачити та запобігти розумним способам.</p>
            
            <p><strong>8.5.</strong> Сторони докладають максимум зусиль для вирішення будь-яких суперечностей виключно шляхом переговорів.</p>
            
            <h4>Інші умови</h4>
            <p><strong>9.1.</strong> Інтернет-магазин залишає за собою право в односторонньому порядку вносити зміни до цього договору за умови його попередньої публікації на сайті https://guitarstrings.com.ua</p>
            
            <p><strong>9.2.</strong> Інтернет-магазин створінь для організації дистанційного способу продажу товарів через Інтернет.</p>
            
            <p><strong>9.3.</strong> Покупець несе відповідальність за достовірність зазначеної під час оформлення замовлення інформації. При цьому, при здійсненні акцепту (оформлення замовлення та подальшої оплати товару) Покупець надає Продавцю свою беззастережну згоду на збирання, обробку, зберігання, використання своїх персональних даних у розумінні ЗУ «Про захист персональних даних».</p>
            
            <p><strong>9.4.</strong> Оплата Покупцем оформленого в Інтернет магазині замовлення означає повну згоду Покупця з умовами договору купівлі-продажу (публічної оферти)</p>
            
            <p><strong>9.5.</strong> Фактичною датою електронної угоди між сторонами є дата прийняття умов відповідно до ст. 11 Закону України "Про електронну комерцію"</p>
            
            <p><strong>9.6.</strong> Використання ресурсу Інтернет-магазину для попереднього перегляду товару, а також оформлення замовлення для Покупця є безкоштовним.</p>
            
            <p><strong>9.7.</strong> Інформація, що надається Покупцем, є конфіденційною. Інтернет-магазин використовує інформацію про Покупця виключно з метою обробки замовлення, відправлення повідомлень Покупцю, доставки товару, здійснення взаєморозрахунків та ін.</p>
            
            <h4>Порядок повернення товару належної якості</h4>
            <p><strong>10.1.</strong> Повернення товару до Інтернет-магазину здійснюється відповідно до чинного законодавства України.</p>
            <p><strong>10.2.</strong> Повернення товару до Інтернет-магазину здійснюється за рахунок Покупця.</p>
            <p><strong>10.3.</strong> При поверненні Покупцем товару належної якості Інтернет-магазин повертає йому сплачену за товар грошову суму за фактом повернення товару за вирахуванням компенсації витрат Інтернет-магазину, пов'язаних з доставкою товару Покупцю.</p>
            
            <h4>Строк дії договору</h4>
            <p><strong>11.1.</strong> Електронний договір вважається укладеним з моменту отримання особою, яка направила пропозицію укласти такий договір, відповіді про прийняття цього пропозиції в порядку, визначеному частиною шостою статті 11 Закону України "Про електронну комерцію".</p>
            
            <p><strong>11.2.</strong> До закінчення строку дії цей Договір може бути розірваний за взаємною згодою сторін до моменту фактичної доставки товару шляхом повернення коштів</p>
            
            <p><strong>11.3.</strong> Сторони мають право розірвати цей договір в односторонньому порядку, в разі невиконання однієї із сторін умов цього Договору та у випадках, передбачених чинним законодавством України.</p>
            
            <p>Звертаємо ваше увагу, що інтернет-магазин «GuitarStrings.com.ua» на офіційному інтернет-сайті https://guitarstrings.com.ua має право, відповідно до законодавства України, надавати право користування інтернет платформою ФОП та юридичним особам для реалізації товару.</p>
        `,
        ru: `
            <h4>Общие положения</h4>
            <p><strong>1.1.</strong> Настоящая оферта является официальным предложением «Guitar Strings», далее по тексту — «Продавець», заключить Договор купли-продажи товаров дистанционным способом, то есть через Интернет-магазин, далее по тексту — «Договор» и размещает Публичную оферту (предложение) на официальном интернет-сайте Продавца https://guitarstrings.com.ua (далее - Интернет-сайт).</p>
            
            <p><strong>1.2.</strong> Моментом полного и безусловного принятия Покупателем предложения Продавца (акцептом) заключить электронный договор купли-продажи товаров считается факт оплаты Покупателем заказа на условиях настоящего Договора, в сроки и по ценам, указанным на Интернет-сайте Продавца.</p>
            
            <h4>Понятие и определение</h4>
            <p><strong>2.1.</strong> В этой оферте, если контекст не требует другого, следующие термины имеют следующие значения:</p>
            <ul>
                <li><strong>«товар»</strong> – модели, аксессуары, комплектующие и сопроводительные предметы;</li>
                <li><strong>«Интернет-магазин»</strong> - в соответствии с Законом Украины «об электронной коммерции», средством предоставления или реализации товара, работы или услугами путем совершения электронного соглашения.</li>
                <li><strong>«Продавець»</strong> – компания, реализующая товары, представленные на Интернет-сайте.</li>
                <li><strong>«Покупатель»</strong> - физическое лицо, заключившее с Продавцом Договор на условиях, изложенных ниже.</li>
                <li><strong>«Заказ»</strong> - выбор отдельных позиций по перечню товаров, указанных Покупателем при размещении заказа и оплате.</li>
            </ul>
            
            <h4>Предмет Договора</h4>
            <p><strong>3.1.</strong> Продавец обязуется передать в собственность Покупателя Товар, а Покупатель обязуется уплатить и принять Товар на условиях настоящего Договора.</p>
            
            <p>Настоящий Договор регулирует куплю-продажу товаров в Интернет-магазине, в частности:</p>
            <ul>
                <li>добровольный выбор Покупателем товаров в Интернет-магазине;</li>
                <li>самостоятельное оформление Покупателем заказа в Интернет-магазине;</li>
                <li>оплата Покупателем заказа, оформленного в Интернет-магазине;</li>
                <li>обработка и доставка заказа Покупателю в собственность на условиях настоящего Договора.</li>
            </ul>
            
            <h4>Порядок оформления заказа</h4>
            <p><strong>4.1.</strong> Покупатель имеет право оформить заказ на любой товар, представленный на Сайте Интернет-магазина и имеющийся.</p>
            <p><strong>4.2.</strong> Каждая позиция может быть представлена в заказ в любом количестве.</p>
            <p><strong>4.3.</strong> При отсутствии товара на складе, Менеджер компании обязан сообщить Покупателю (по телефону или по электронной почте).</p>
            <p><strong>4.4.</strong> При отсутствии товара Покупатель имеет право заменить товар аналогичной модели, отказаться от этого товара, аннулировать заказ.</p>
            
            <h4>Порядок оплаты заказа</h4>
            <p><strong>Наложенным платежом</strong></p>
            <p><strong>5.1.</strong> Оплата производится по факту получения товара в отделении транспортной компании за наличные в гривнах.</p>
            <p><strong>5.2.</strong> При неприходе средств Интернет-магазин оставляет за собой право аннулировать заказ.</p>
            
            <h4>Условия доставки заказа</h4>
            <p><strong>6.1.</strong> Доставка товаров, приобретенных в Интернет-магазине, осуществляется в склады транспортных компаний, где и производится выдача заказов.</p>
            <p><strong>6.2.</strong> Вместе с заказом Покупателю предоставляются документы согласно законодательству Украины.</p>
            
            <h4>Права и обязанности сторон:</h4>
            <p><strong>7.1.</strong> Продавец имеет право:</p>
            <ul>
                <li>в одностороннем порядке приостановить предоставление услуг по настоящему договору в случае нарушения Покупателем условий настоящего договора.</li>
            </ul>
            
            <p><strong>7.2.</strong> Покупатель обязан:</p>
            <ul>
                <li>своевременно оплатить и получить заказы на условиях настоящего договора.</li>
            </ul>
            
            <p><strong>7.3.</strong> Покупатель имеет право:</p>
            <ul>
                <li>оформить заказ в Интернет-магазине;</li>
                <li>оформить электронный договор;</li>
                <li>требовать от Продавца выполнения условий настоящего Договора.</li>
            </ul>
            
            <h4>Ответственность сторон</h4>
            <p><strong>8.1.</strong> Стороны несут ответственность за неисполнение или ненадлежащее исполнение условий настоящего договора в порядке, предусмотренном настоящим договором и действующим законодательством Украины.</p>
            
            <p><strong>8.2.</strong> Продавец не несет ответственности за:</p>
            <ul>
                <li>измененный производителем внешний вид Товара;</li>
                <li>за незначительное несоответствие цветовой гаммы товара, что может отличаться от оригинала товара исключительно из-за разной цветовой передачи мониторов персональных компьютеров отдельных моделей;</li>
                <li>за содержание и правдивость информации, предоставляемой Покупателем при оформлении заказа;</li>
                <li>за задержку и перебои в предоставлении Услуг (обработки заказа и доставки товара), происходящие по причинам, находящимся вне его контроля;</li>
                <li>за противоправные незаконные действия, совершенные Покупателем посредством этого доступа в Интернет;</li>
                <li>за передачу Покупателем своих сетевых идентификаторов - IP, MAC-адреса, логина и пароля третьим лицам;</li>
            </ul>
            
            <p><strong>8.3.</strong> Покупатель, используя предоставленный ему доступ к сети Интернет, самостоятельно несет ответственность за ущерб, причиненный его действиями (лично, даже если под его логином находилось другое лицо) лицам или их имуществу, юридическим лицам, государству или моральным принципам нравственности.</p>
            
            <p><strong>8.4.</strong> При наступлении обстоятельств непреодолимой силы стороны освобождаются от выполнения условий настоящего договора. Под обстоятельствами непреодолимой силы для целей настоящего договора понимаются события, имеющие чрезвычайный, непредсказуемый характер, исключающие или объективно мешающие выполнению настоящего договора, наступление которых Стороны не могли предусмотреть и предотвратить разумным способам.</p>
            
            <p><strong>8.5.</strong> Стороны прилагают максимум усилий для разрешения любых противоречий исключительно путем переговоров.</p>
            
            <h4>Другие условия</h4>
            <p><strong>9.1.</strong> Интернет-магазин оставляет за собой права в одностороннем порядке вносить изменения в этот договор при условии его предварительной публикации на сайте https://guitarstrings.com.ua</p>
            
            <p><strong>9.2.</strong> Интернет-магазин созданий для организации дистанционного способа продаж товаров через Интернет.</p>
            
            <p><strong>9.3.</strong> Покупатель несет ответственность за достоверность указанной при оформлении заказа информации. При этом при осуществлении акцепта (оформления заказа и последующей оплаты товара) Покупатель предоставляет Продавцу свое безоговорочное согласие на сбор, обработку, хранение, использование своих персональных данных в понимании ЗУ «О защите персональных данных».</p>
            
            <p><strong>9.4.</strong> Оплата Покупателем оформленного в Интернет магазине заказа означает полное согласие Покупателя с условиями договора купли-продажи (публичной оферты)</p>
            
            <p><strong>9.5.</strong> Фактической датой электронного соглашения между сторонами дата принятия условий в соответствии со ст. 11 Закона Украины "Об электронной коммерции"</p>
            
            <p><strong>9.6.</strong> Использование ресурса Интернет-магазина для предварительного просмотра товара, а также оформление заказа для Покупателя бесплатно.</p>
            
            <p><strong>9.7.</strong> Информация, предоставляемая Покупателем, является конфиденциальной. Интернет-магазин использует информацию о Покупателе исключительно для обработки заказа, отправки сообщений Покупателю, доставки товара, осуществления взаиморасчетов и т.д.</p>
            
            <h4>Порядок возврата товара надлежащего качества</h4>
            <p><strong>10.1.</strong> Возврат товара в Интернет-магазин осуществляется в соответствии с действующим законодательством Украины.</p>
            <p><strong>10.2.</strong> Возврат товара в Интернет-магазин осуществляется за счет Покупателя.</p>
            <p><strong>10.3.</strong> При возврате Покупателем товара надлежащего качества Интернет-магазин возвращает ему уплаченную за товар денежную сумму по факту возврата товара за вычетом компенсации расходов Интернет-магазина, связанных с доставкой товара Покупателю.</p>
            
            <h4>Срок действия договора</h4>
            <p><strong>11.1.</strong> Электронный договор считается заключенным с момента получения лицом, направившим предложение заключить такой договор, ответы о принятии этого предложения в порядке, определенном частью шестой статьи 11 Закона Украины "Об электронной коммерции".</p>
            
            <p><strong>11.2.</strong> До истечения срока действия настоящий Договор может быть расторгнут по взаимному согласию сторон к моменту фактической доставки товара путем возврата средств</p>
            
            <p><strong>11.3.</strong> Стороны имеют право расторгнуть настоящий договор в одностороннем порядке, в случае невыполнения одной из сторон условий настоящего Договора и случаях, предусмотренных действующим законодательством Украины.</p>
            
            <p>Обращаем ваше внимание, что интернет-магазин «GuitarStrings.com.ua» на официальном интернет-сайте https://guitarstrings.com.ua имеет право в соответствии с законодательством Украины предоставлять право пользования интернет платформой ФЛП и юридическим лицам для реализации товара.</p>
        `,
        en: `
            <h4>General provisions</h4>
            <p><strong>1.1.</strong> This offer is an official offer of "Guitar Strings", hereinafter referred to as the "Seller", to conclude a Contract for the sale and purchase of goods remotely, i.e. through the Online Store, hereinafter referred to as the "Agreement", and places a Public Offer (Offer) on the Seller's official website https://guitarstrings.com.ua (hereinafter referred to as the Website).</p>
            
            <p><strong>1.2.</strong> The moment of full and unconditional acceptance by the Buyer of the Seller's offer (acceptance) to conclude an electronic contract for the sale and purchase of goods is considered the fact of payment by the Buyer for the order under the terms of this Agreement, within the terms and at the prices specified on the Seller's Website.</p>
            
            <h4>Concepts and definitions</h4>
            <p><strong>2.1.</strong> In this offer, unless the context requires otherwise, the terms below have the following meanings:</p>
            <ul>
                <li><strong>"goods"</strong> - models, accessories, components and accompanying items;</li>
                <li><strong>"Online store"</strong> - in accordance with the Law of Ukraine "On Electronic Commerce", a means for presenting or selling goods, work or services by concluding an electronic transaction.</li>
                <li><strong>"Seller"</strong> - a company that sells goods presented on the Internet site.</li>
                <li><strong>"Buyer"</strong> - an individual who has concluded an Agreement with the Seller on the terms set out below.</li>
                <li><strong>"Order"</strong> - a selection of individual items from the list of goods specified by the Buyer when placing an order and making payment.</li>
            </ul>
            
            <h4>Subject of the Agreement</h4>
            <p><strong>3.1.</strong> The Seller undertakes to transfer the ownership of the Goods to the Buyer, and the Buyer undertakes to pay for and accept the Goods under the terms of this Agreement.</p>
            
            <p>This Agreement regulates the purchase and sale of goods in the Online Store, in particular:</p>
            <ul>
                <li>Voluntary selection by the Buyer of goods in the Online Store;</li>
                <li>Independent registration by the Buyer of an order in the Online Store;</li>
                <li>payment by the Buyer of an order placed in the Online Store;</li>
                <li>processing and delivery of the order to the Buyer in the ownership under the terms of this Agreement.</li>
            </ul>
            
            <h4>Order processing procedure</h4>
            <p><strong>4.1.</strong> The Buyer has the right to place an order for any product presented on the Online Store Website and available.</p>
            <p><strong>4.2.</strong> Each item can be presented in the order in any quantity.</p>
            <p><strong>4.3.</strong> In the absence of the product in stock, the Company Manager is obliged to notify the Buyer (by phone or e-mail).</p>
            <p><strong>4.4.</strong> In the absence of the product, the Buyer has the right to replace it with a product of a similar model, refuse this product, cancel the order.</p>
            
            <h4>Order payment procedure</h4>
            <p><strong>Postpaid</strong></p>
            <p><strong>5.1.</strong> Payment is made upon receipt of the product at the transport company's branch for cash in hryvnias.</p>
            <p><strong>5.2.</strong> In the event of non-receipt of funds, the Online Store reserves the right to cancel the order.</p>
            
            <h4>Order delivery terms</h4>
            <p><strong>6.1.</strong> Delivery of goods purchased in the Online Store is carried out to the warehouses of transport companies, where orders are issued.</p>
            <p><strong>6.2.</strong> Together with the order, the Buyer is provided with documents in accordance with the legislation of Ukraine.</p>
            
            <h4>Rights and obligations of the parties:</h4>
            <p><strong>7.1.</strong> The Seller has the right:</p>
            <ul>
                <li>unilaterally suspend the provision of services under this Agreement in the event of the Buyer's violation of the terms of this Agreement.</li>
            </ul>
            
            <p><strong>7.2.</strong> The Buyer is obliged to:</p>
            <ul>
                <li>timely pay and receive the order under the terms of this Agreement.</li>
            </ul>
            
            <p><strong>7.3.</strong> The Buyer has the right:</p>
            <ul>
                <li>Place an order in the Online Store;</li>
                <li>draw up an electronic agreement;</li>
                <li>demand that the Seller fulfill the terms of this Agreement.</li>
            </ul>
            
            <h4>Liability of the Parties</h4>
            <p><strong>8.1.</strong> The Parties are liable for failure to fulfill or improper fulfillment of the terms of this Agreement in the manner prescribed by this Agreement and the current legislation of Ukraine.</p>
            
            <p><strong>8.2.</strong> The Seller is not responsible for:</p>
            <ul>
                <li>The appearance of the Goods changed by the manufacturer;</li>
                <li>for a minor discrepancy in the color scheme of the Goods, which may differ from the original Goods solely due to different color rendering of personal computer monitors of individual models;</li>
                <li>for the content and veracity of the information provided by the Buyer when placing an order;</li>
                <li>for delays and interruptions in the provision of Services (order processing and delivery of goods) occurring for reasons beyond its control;</li>
                <li>for unlawful illegal actions committed by the Buyer using this access to the Internet;</li>
                <li>for the transfer by the Buyer of his network identifiers - IP, MAC address, login and password to third parties;</li>
            </ul>
            
            <p><strong>8.3.</strong> The Buyer, using the access to the Internet provided to him, is independently responsible for the damage caused by his actions (personally, even if another person was under his login) to persons or their property, legal entities, the state or moral principles of morality.</p>
            
            <p><strong>8.4.</strong> In the event of force majeure circumstances, the parties are released from the fulfillment of the terms of this agreement. For the purposes of this agreement, force majeure circumstances are understood to mean events of an extraordinary, unforeseeable nature that exclude or objectively impede the fulfillment of this agreement, the occurrence of which the Parties could not foresee and prevent by reasonable means.</p>
            
            <p><strong>8.5.</strong> The Parties shall make every effort to resolve any disputes exclusively through negotiations.</p>
            
            <h4>Other conditions</h4>
            <p><strong>9.1.</strong> The online store reserves the right to unilaterally make changes to this agreement subject to its prior publication on the website https://guitarstrings.com.ua</p>
            
            <p><strong>9.2.</strong> Online store of creations for organizing a remote method of selling goods via the Internet.</p>
            
            <p><strong>9.3.</strong> The Buyer is responsible for the accuracy of the information specified when placing an order. At the same time, when accepting (placing an order and subsequent payment for the goods), the Buyer gives the Seller his unconditional consent to the collection, processing, storage, and use of his personal data within the meaning of the Law of Ukraine "On the Protection of Personal Data".</p>
            
            <p><strong>9.4.</strong> Payment by the Buyer of an order placed in the Online Store means the Buyer's full consent to the terms of the purchase and sale agreement (public offer)</p>
            
            <p><strong>9.5.</strong> The actual date of the electronic agreement between the parties is the date of acceptance of the terms in accordance with Art. 11 of the Law of Ukraine "On Electronic Commerce"</p>
            
            <p><strong>9.6.</strong> The use of the Online Store resource for previewing the product, as well as placing an order for the Buyer is free of charge.</p>
            
            <p><strong>9.7.</strong> The information provided by the Buyer is confidential. The Online Store uses information about the Buyer solely for the purpose of processing the order, sending messages to the Buyer, delivering the product, making mutual settlements, etc.</p>
            
            <h4>Procedure for returning goods of proper quality</h4>
            <p><strong>10.1.</strong> The return of goods to the Online Store is carried out in accordance with the current legislation of Ukraine.</p>
            <p><strong>10.2.</strong> The return of goods to the Online Store is carried out at the expense of the Buyer.</p>
            <p><strong>10.3.</strong> When the Buyer returns goods of proper quality, the Online Store returns the amount paid for the goods upon the fact of returning the goods, minus compensation for the expenses of the Online Store associated with delivering the goods to the Buyer.</p>
            
            <h4>Term of the Agreement</h4>
            <p><strong>11.1.</strong> An electronic agreement is considered concluded from the moment the person who sent the offer to conclude such an agreement receives a response on acceptance of this offer in the manner specified in Part Six of Article 11 of the Law of Ukraine "On Electronic Commerce".</p>
            
            <p><strong>11.2.</strong> Before the expiration of the term of validity, this Agreement may be terminated by mutual consent of the parties until the actual delivery of the goods by refunding the funds</p>
            
            <p><strong>11.3.</strong> The parties have the right to terminate this agreement unilaterally, in the event of non-fulfillment of the terms of this Agreement by one of the parties and in cases provided for by the current legislation of Ukraine.</p>
            
            <p>Please note that the online store "GuitarStrings.com.ua" on the official website https://guitarstrings.com.ua has the right, in accordance with the legislation of Ukraine, to grant the right to use the Internet platform to individual entrepreneurs and legal entities for the sale of goods.</p>
        `,
        en: `
            <h4>General provisions</h4>
            <p><strong>1.1.</strong> This offer is an official offer of "Guitar Strings", hereinafter referred to as the "Seller", to conclude a Contract for the sale and purchase of goods remotely, i.e. through the Online Store, hereinafter referred to as the "Agreement", and places a Public Offer (Offer) on the Seller's official website https://guitarstrings.com.ua (hereinafter referred to as the Website).</p>
            
            <p><strong>1.2.</strong> The moment of full and unconditional acceptance by the Buyer of the Seller's offer (acceptance) to conclude an electronic contract for the sale and purchase of goods is considered the fact of payment by the Buyer for the order under the terms of this Agreement, within the terms and at the prices specified on the Seller's Website.</p>
            
            <h4>Concepts and definitions</h4>
            <p><strong>2.1.</strong> In this offer, unless the context requires otherwise, the terms below have the following meanings:</p>
            <ul>
                <li><strong>"goods"</strong> - models, accessories, components and accompanying items;</li>
                <li><strong>"Online store"</strong> - in accordance with the Law of Ukraine "On Electronic Commerce", a means for presenting or selling goods, work or services by concluding an electronic transaction.</li>
                <li><strong>"Seller"</strong> - a company that sells goods presented on the Internet site.</li>
                <li><strong>"Buyer"</strong> - an individual who has concluded an Agreement with the Seller on the terms set out below.</li>
                <li><strong>"Order"</strong> - a selection of individual items from the list of goods specified by the Buyer when placing an order and making payment.</li>
            </ul>
            
            <h4>Subject of the Agreement</h4>
            <p><strong>3.1.</strong> The Seller undertakes to transfer the ownership of the Goods to the Buyer, and the Buyer undertakes to pay for and accept the Goods under the terms of this Agreement.</p>
            
            <p>This Agreement regulates the purchase and sale of goods in the Online Store, in particular:</p>
            <ul>
                <li>Voluntary selection by the Buyer of goods in the Online Store;</li>
                <li>Independent registration by the Buyer of an order in the Online Store;</li>
                <li>payment by the Buyer of an order placed in the Online Store;</li>
                <li>processing and delivery of the order to the Buyer in the ownership under the terms of this Agreement.</li>
            </ul>
            
            <h4>Order processing procedure</h4>
            <p><strong>4.1.</strong> The Buyer has the right to place an order for any product presented on the Online Store Website and available.</p>
            <p><strong>4.2.</strong> Each item can be presented in the order in any quantity.</p>
            <p><strong>4.3.</strong> In the absence of the product in stock, the Company Manager is obliged to notify the Buyer (by phone or e-mail).</p>
            <p><strong>4.4.</strong> In the absence of the product, the Buyer has the right to replace it with a product of a similar model, refuse this product, cancel the order.</p>
            
            <h4>Order payment procedure</h4>
            <p><strong>Postpaid</strong></p>
            <p><strong>5.1.</strong> Payment is made upon receipt of the product at the transport company's branch for cash in hryvnias.</p>
            <p><strong>5.2.</strong> In the event of non-receipt of funds, the Online Store reserves the right to cancel the order.</p>
            
            <h4>Order delivery terms</h4>
            <p><strong>6.1.</strong> Delivery of goods purchased in the Online Store is carried out to the warehouses of transport companies, where orders are issued.</p>
            <p><strong>6.2.</strong> Together with the order, the Buyer is provided with documents in accordance with the legislation of Ukraine.</p>
            
            <h4>Rights and obligations of the parties:</h4>
            <p><strong>7.1.</strong> The Seller has the right:</p>
            <ul>
                <li>unilaterally suspend the provision of services under this Agreement in the event of the Buyer's violation of the terms of this Agreement.</li>
            </ul>
            
            <p><strong>7.2.</strong> The Buyer is obliged to:</p>
            <ul>
                <li>timely pay and receive the order under the terms of this Agreement.</li>
            </ul>
            
            <p><strong>7.3.</strong> The Buyer has the right:</p>
            <ul>
                <li>Place an order in the Online Store;</li>
                <li>draw up an electronic agreement;</li>
                <li>demand that the Seller fulfill the terms of this Agreement.</li>
            </ul>
            
            <h4>Liability of the Parties</h4>
            <p><strong>8.1.</strong> The Parties are liable for failure to fulfill or improper fulfillment of the terms of this Agreement in the manner prescribed by this Agreement and the current legislation of Ukraine.</p>
            
            <p><strong>8.2.</strong> The Seller is not responsible for:</p>
            <ul>
                <li>The appearance of the Goods changed by the manufacturer;</li>
                <li>for a minor discrepancy in the color scheme of the Goods, which may differ from the original Goods solely due to different color rendering of personal computer monitors of individual models;</li>
                <li>for the content and veracity of the information provided by the Buyer when placing an order;</li>
                <li>for delays and interruptions in the provision of Services (order processing and delivery of goods) occurring for reasons beyond its control;</li>
                <li>for unlawful illegal actions committed by the Buyer using this access to the Internet;</li>
                <li>for the transfer by the Buyer of his network identifiers - IP, MAC address, login and password to third parties;</li>
            </ul>
            
            <p><strong>8.3.</strong> The Buyer, using the access to the Internet provided to him, is independently responsible for the damage caused by his actions (personally, even if another person was under his login) to persons or their property, legal entities, the state or moral principles of morality.</p>
            
            <p><strong>8.4.</strong> In the event of force majeure circumstances, the parties are released from the fulfillment of the terms of this agreement. For the purposes of this agreement, force majeure circumstances are understood to mean events of an extraordinary, unforeseeable nature that exclude or objectively impede the fulfillment of this agreement, the occurrence of which the Parties could not foresee and prevent by reasonable means.</p>
            
            <p><strong>8.5.</strong> The Parties shall make every effort to resolve any disputes exclusively through negotiations.</p>
            
            <h4>Other conditions</h4>
            <p><strong>9.1.</strong> The online store reserves the right to unilaterally make changes to this agreement subject to its prior publication on the website https://guitarstrings.com.ua</p>
            
            <p><strong>9.2.</strong> Online store of creations for organizing a remote method of selling goods via the Internet.</p>
            
            <p><strong>9.3.</strong> The Buyer is responsible for the accuracy of the information specified when placing an order. At the same time, when accepting (placing an order and subsequent payment for the goods), the Buyer gives the Seller his unconditional consent to the collection, processing, storage, and use of his personal data within the meaning of the Law of Ukraine "On the Protection of Personal Data".</p>
            
            <p><strong>9.4.</strong> Payment by the Buyer of an order placed in the Online Store means the Buyer's full consent to the terms of the purchase and sale agreement (public offer)</p>
            
            <p><strong>9.5.</strong> The actual date of the electronic agreement between the parties is the date of acceptance of the terms in accordance with Art. 11 of the Law of Ukraine "On Electronic Commerce"</p>
            
            <p><strong>9.6.</strong> The use of the Online Store resource for previewing the product, as well as placing an order for the Buyer is free of charge.</p>
            
            <p><strong>9.7.</strong> The information provided by the Buyer is confidential. The Online Store uses information about the Buyer solely for the purpose of processing the order, sending messages to the Buyer, delivering the product, making mutual settlements, etc.</p>
            
            <h4>Procedure for returning goods of proper quality</h4>
            <p><strong>10.1.</strong> The return of goods to the Online Store is carried out in accordance with the current legislation of Ukraine.</p>
            <p><strong>10.2.</strong> The return of goods to the Online Store is carried out at the expense of the Buyer.</p>
            <p><strong>10.3.</strong> When the Buyer returns goods of proper quality, the Online Store returns the amount paid for the goods upon the fact of returning the goods, minus compensation for the expenses of the Online Store associated with delivering the goods to the Buyer.</p>
            
            <h4>Term of the Agreement</h4>
            <p><strong>11.1.</strong> An electronic agreement is considered concluded from the moment the person who sent the offer to conclude such an agreement receives a response on acceptance of this offer in the manner specified in Part Six of Article 11 of the Law of Ukraine "On Electronic Commerce".</p>
            
            <p><strong>11.2.</strong> Before the expiration of the term of validity, this Agreement may be terminated by mutual consent of the parties until the actual delivery of the goods by refunding the funds</p>
            
            <p><strong>11.3.</strong> The parties have the right to terminate this agreement unilaterally, in the event of non-fulfillment of the terms of this Agreement by one of the parties and in cases provided for by the current legislation of Ukraine.</p>
            
            <p>Please note that the online store "GuitarStrings.com.ua" on the official website https://guitarstrings.com.ua has the right, in accordance with the legislation of Ukraine, to grant the right to use the Internet platform to individual entrepreneurs and legal entities for the sale of goods.</p>
        `
    };
    
    return offers[language] || offers.uk;
}

// Функция для показа уведомления о выборе категории
function showCategorySelectedNotification(categoryName) {
    console.log(`showCategorySelectedNotification: Показываем уведомление для категории: ${categoryName}`);
    
    // Проверяем инициализацию переменных
    if (typeof window.loadedProductNames === 'undefined') {
        console.warn('showCategorySelectedNotification: loadedProductNames не инициализирована, инициализируем...');
        window.loadedProductNames = new Set();
        loadedProductNames = window.loadedProductNames;
    }
    
    // Создаем временное уведомление
    const notification = document.createElement('div');
    notification.className = 'category-notification';
    notification.innerHTML = `
        <div class="notification-content">
            <i class="fas fa-check-circle"></i>
            <span>Выбрана категория: ${categoryName}</span>
        </div>
    `;
    
    // Добавляем стили
    notification.style.cssText = `
        position: fixed;
        top: 20px;
        left: 50%;
        transform: translateX(-50%);
        background: var(--accent-color);
        color: white;
        padding: 12px 20px;
        border-radius: 8px;
        box-shadow: 0 4px 12px rgba(0,0,0,0.15);
        z-index: 3000;
        font-size: 14px;
        font-weight: 500;
        display: flex;
        align-items: center;
        gap: 8px;
        animation: slideInDown 0.3s ease-out;
    `;
    
    // Добавляем в DOM
    document.body.appendChild(notification);
    
    // Удаляем через 3 секунды
    setTimeout(() => {
        if (notification.parentNode) {
            notification.style.animation = 'slideOutUp 0.3s ease-out';
            setTimeout(() => {
                if (notification.parentNode) {
                    notification.parentNode.removeChild(notification);
                }
            }, 300);
        }
    }, 3000);
}

// Функция для закрытия всех всплывающих окон при клике вне их
function setupPopupClickOutside() {
    // Обработчик клика вне popup
    document.addEventListener('click', (e) => {
        const menuPopup = document.getElementById('menuPopup');
        const settingsPopup = document.getElementById('settingsPopup');
        const contactsPopup = document.getElementById('contactsPopup');
        const offerPopup = document.getElementById('offerPopup');
        
        // Закрываем настройки если клик не по кнопке настроек и не по содержимому настроек
        if (settingsPopup && settingsPopup.classList.contains('show')) {
            const settingsBtn = document.querySelector('.settings-btn');
            if (!settingsBtn.contains(e.target) && !settingsPopup.contains(e.target)) {
                closePopup('settingsPopup');
            }
        }
        
        // Закрываем popup контактов если клик не по содержимому popup
        if (contactsPopup && contactsPopup.classList.contains('show')) {
            console.log('setupPopupClickOutside: Popup контактов открыт, проверяем клик...');
            
            // Проверяем, что клик действительно вне popup
            const isClickInsidePopup = contactsPopup.contains(e.target);
            
            // Проверяем, что это не клик по кнопке "Контакты" в меню
            const contactsMenuItem = document.querySelector('.contacts-item');
            const isClickOnContactsMenuItem = contactsMenuItem && contactsMenuItem.contains(e.target);
            
            // Проверяем, что это не клик по крестику
            const isClickOnCloseBtn = e.target.closest('.close-btn');
            
            // Закрываем окно контактов при клике вне его
            if (!isClickInsidePopup && !isClickOnContactsMenuItem && !isClickOnCloseBtn) {
                console.log('setupPopupClickOutside: Клик вне popup контактов, закрываем...');
                closeContactsPopup();
            } else {
                console.log('setupPopupClickOutside: Клик внутри popup или по кнопкам, не закрываем');
            }
        }
        
        // Закрываем popup оферты если клик не по содержимому popup
        if (offerPopup && offerPopup.classList.contains('show')) {
            console.log('setupPopupClickOutside: Popup оферты открыт, проверяем клик...');
            
            // Проверяем, что клик действительно вне popup
            const isClickInsidePopup = offerPopup.contains(e.target);
            
            // Проверяем, что это не клик по кнопке "Оферта" в меню
            const offerMenuItem = document.querySelector('.offer-item');
            const isClickOnOfferMenuItem = offerMenuItem && offerMenuItem.contains(e.target);
            
            // Проверяем, что это не клик по крестику
            const isClickOnCloseBtn = e.target.closest('.close-btn');
            
            // Закрываем окно оферты при клике вне его
            if (!isClickInsidePopup && !isClickOnOfferMenuItem && !isClickOnCloseBtn) {
                console.log('setupPopupClickOutside: Клик вне popup оферты, закрываем...');
                closeOfferPopup();
            } else {
                console.log('setupPopupClickOutside: Клик внутри popup оферты или по кнопкам, не закрываем');
            }
        }
        
        // МЕНЮ ЗАКРЫВАЕТСЯ ТОЛЬКО ПРИ ЯВНОМ КЛИКЕ ВНЕ МЕНЮ (не зависит от других окон)
        if (menuPopup && menuPopup.classList.contains('show')) {
            const menuBtn = document.querySelector('.menu-btn');
            const isClickOnMenuBtn = menuBtn && menuBtn.contains(e.target);
            const isClickInsideMenu = menuPopup.contains(e.target);
            
            // Меню закрывается только если клик не по кнопке меню и не по содержимому меню
            // И НЕ по кнопкам других окон
            const isClickOnOtherButtons = 
                (contactsPopup && contactsPopup.classList.contains('show') && contactsPopup.contains(e.target)) ||
                (offerPopup && offerPopup.classList.contains('show') && offerPopup.contains(e.target)) ||
                (settingsPopup && settingsPopup.classList.contains('show') && settingsPopup.contains(e.target));
            
            if (!isClickOnMenuBtn && !isClickInsideMenu && !isClickOnOtherButtons) {
                console.log('setupPopupClickOutside: Клик вне меню, закрываем меню...');
                closePopup('menuPopup');
            }
        }
    });
    
    // Обработчик клавиши ESC для закрытия popup
    document.addEventListener('keydown', (e) => {
        if (e.key === 'Escape') {
            const menuPopup = document.getElementById('menuPopup');
            const settingsPopup = document.getElementById('settingsPopup');
            const contactsPopup = document.getElementById('contactsPopup');
            const offerPopup = document.getElementById('offerPopup');
            
            // Закрываем popup контактов при нажатии ESC
            if (contactsPopup && contactsPopup.classList.contains('show')) {
                console.log('setupPopupClickOutside: Нажата клавиша ESC, закрываем popup контактов');
                closeContactsPopup();
            }
            
            // Закрываем popup оферты при нажатии ESC
            if (offerPopup && offerPopup.classList.contains('show')) {
                console.log('setupPopupClickOutside: Нажата клавиша ESC, закрываем popup оферты');
                closeOfferPopup();
            }
            
            // Закрываем другие popup при нажатии ESC
            if (menuPopup && menuPopup.classList.contains('show')) {
                closePopup('menuPopup');
            }
            
            if (settingsPopup && settingsPopup.classList.contains('show')) {
                closePopup('settingsPopup');
            }
        }
    });
}

// Функция проверки онлайн статуса пользователя в Telegram
async function checkTelegramUserStatus(username) {
    // ОПТИМИЗАЦИЯ: Используем Киевское время (UTC+3) для правильного отображения статуса
    const now = new Date();
    
    // Получаем время в Киевском часовом поясе (UTC+3)
    const kievTime = new Date(now.getTime() + (3 * 60 * 60 * 1000)); // UTC+3 для Киева
    const currentHour = kievTime.getUTCHours();
    const currentMinute = kievTime.getUTCMinutes();
    
    // Рабочие часы 9:00-19:00 по Киевскому времени
    const isWorkingHours = currentHour >= 9 && currentHour <= 19;
    
    console.log(`Статус поддержки по Киевскому времени:`, {
        localTime: `${now.getHours()}:${now.getMinutes().toString().padStart(2, '0')}`,
        kievTime: `${currentHour}:${currentMinute.toString().padStart(2, '0')}`,
        isWorkingHours,
        isOnline: isWorkingHours
    });
    
    return { 
        isOnline: isWorkingHours, 
        username: username,
        debug: {
            localTime: `${now.getHours()}:${now.getMinutes().toString().padStart(2, '0')}`,
            kievTime: `${currentHour}:${currentMinute.toString().padStart(2, '0')}`,
            isWorkingHours
        }
    };
}

// Функция открытия чата в Telegram
function openTelegramChat(username) {
    try {
        // Открываем чат с пользователем в Telegram
        const telegramUrl = `https://t.me/${username}`;
        
        // Если мы в Telegram Web App, используем встроенные методы
        if (window.Telegram && window.Telegram.WebApp) {
            // Открываем внешнюю ссылку
            tg.openTelegramLink(telegramUrl);
        } else {
            // Для обычного браузера открываем в новой вкладке
            window.open(telegramUrl, '_blank');
        }
        
        console.log(`Открыт чат с @${username}`);
    } catch (error) {
        console.error('Ошибка открытия чата в Telegram:', error);
        // Fallback - открываем в новой вкладке
        window.open(`https://t.me/${username}`, '_blank');
    }
}



// Функция обновления статуса кнопки поддержки
async function updateSupportButtonStatus() {
    const supportButton = document.querySelector('.online-status');
    if (!supportButton) {
        console.log('Кнопка поддержки не найдена');
        return;
    }
    
    const statusDot = supportButton.querySelector('.status-dot');
    const statusText = supportButton.querySelector('span');
    
    if (!statusDot || !statusText) {
        console.log('Элементы статуса не найдены');
        return;
    }
    
    try {
        // Определяем статус по времени (9:00 - 19:00 = онлайн, 19:00 - 9:00 = оффлайн)
        const now = new Date();
        const hour = now.getHours();
        const isOnline = hour >= 9 && hour < 19;
        
        const currentLanguage = localStorage.getItem('selectedLanguage') || 'uk';
        
        if (isOnline) {
            // Если время рабочее (9:00-19:00), показываем зеленый статус
            statusDot.style.background = '#4CAF50'; // Зеленый цвет для онлайн
            statusText.textContent = window.translations ? window.translations.getTranslation('onlineStatus', currentLanguage) : 'Напишите нам, мы онлайн!';
            supportButton.classList.add('online');
            supportButton.classList.remove('offline');
            console.log('updateSupportButtonStatus: Время рабочее, статус: ОНЛАЙН');
        } else {
            // Если время нерабочее (19:00-9:00), показываем синий статус
            statusDot.style.background = '#2196F3'; // Синий цвет для оффлайн
            statusText.textContent = window.translations ? window.translations.getTranslation('onlineStatusOffline', currentLanguage) : 'Напишите нам, мы позже ответим';
            supportButton.classList.add('offline');
            supportButton.classList.remove('online');
            console.log('updateSupportButtonStatus: Время нерабочее, статус: ОФФЛАЙН');
        }
    } catch (error) {
        console.error('Ошибка обновления статуса поддержки:', error);
        // По умолчанию показываем оффлайн статус
        statusDot.style.background = '#2196F3';
        statusText.textContent = 'Напишите нам, мы позже ответим';
        supportButton.classList.add('offline');
        supportButton.classList.remove('online');
    }
}

// Функция обновления данных товаров (статусы, рейтинги) без перезагрузки списка
async function refreshProductData() {
    try {
        console.log('Начинаем обновление данных товаров...');
        
        // Получаем текущие загруженные товары
        const currentProducts = Array.from(loadedProductNames);
        if (currentProducts.length === 0) {
            console.log('Нет товаров для обновления');
            return;
        }
        
        // Загружаем свежие данные с API для обновления
        const response = await fetch('http://localhost:8000/api/products');
        if (!response.ok) {
            throw new Error(`HTTP error! status: ${response.status}`);
        }
        
        const freshData = await response.json();
        console.log('Получены свежие данные для обновления:', freshData.products ? freshData.products.length : 'undefined', 'товаров');
        
        // Проверяем, что данные получены корректно
        if (!freshData.products || !Array.isArray(freshData.products)) {
            console.error('Некорректные данные от API:', freshData);
            return;
        }
        
        // Обновляем статусы и рейтинги для существующих товаров
        let updatedCount = 0;
        for (const productName of currentProducts) {
            const freshProduct = freshData.products.find(p => p.name === productName);
            if (freshProduct) {
                // Находим DOM элемент товара
                const productCard = document.querySelector(`[data-product-name="${productName}"]`);
                if (productCard) {
                    // Обновляем статус
                    const statusElement = productCard.querySelector('.product-status');
                    if (statusElement) {
                        const newStatus = getStatusText(freshProduct.availability);
                        statusElement.textContent = newStatus;
                        
                        // Определяем правильный CSS класс для статуса
                        let statusClass = '';
                        if (freshProduct.availability === 'Нет в наличии') {
                            statusClass = 'out-of-stock';
                        } else if (freshProduct.availability === 'Ожидается') {
                            statusClass = 'expected';
                        } else if (freshProduct.availability === 'Под заказ') {
                            statusClass = 'on-order';
                        } else if (freshProduct.availability === 'Снят с производства') {
                            statusClass = 'discontinued';
                        } else {
                            statusClass = 'in-stock';
                        }
                        statusElement.className = `product-status ${statusClass}`;
                    }
                    
                    // Обновляем рейтинг
                    const ratingElement = productCard.querySelector('.product-rating');
                    if (ratingElement && freshProduct.rating) {
                        ratingElement.innerHTML = generateRatingStars(freshProduct.rating);
                    }
                    
                    // Обновляем кнопку в зависимости от статуса
                    const buttonElement = productCard.querySelector('.btn');
                    if (buttonElement) {
                        const newStatus = getStatusText(freshProduct.availability);
                        let buttonText = getButtonText(freshProduct.availability, localStorage.getItem('selectedLanguage') || 'uk');
                        let buttonClass = 'btn in-stock';
                        
                        if (freshProduct.availability === 'Снят с производства') {
                            buttonText = 'Снят с производства';
                            buttonClass = 'btn discontinued';
                        } else if (freshProduct.availability === 'Нет в наличии') {
                            buttonText = 'Нет в наличии';
                            buttonClass = 'btn out-of-stock';
                        } else if (freshProduct.availability === 'Ожидается') {
                            buttonText = 'Ожидается';
                            buttonClass = 'btn expected';
                        } else if (freshProduct.availability === 'Под заказ') {
                            buttonText = 'Под заказ';
                            buttonClass = 'btn on-order';
                        }
                        
                        buttonElement.textContent = buttonText;
                        buttonElement.className = buttonClass;
                    }
                    
                    updatedCount++;
                }
            }
        }
        
        console.log(`Обновлено ${updatedCount} товаров`);
        
        // Не вызываем saveState() здесь, чтобы избежать конфликтов с восстановлением
        // saveState() будет вызван автоматически через startAutoSave()
        
    } catch (error) {
        console.error('Ошибка при обновлении данных товаров:', error);
    }
}

// Функция автоматического сохранения

// Функция loadAllProducts удалена по запросу пользователя

// Функция обработки прокрутки для бесконечной загрузки

// Функция для закрытия всплывающих окон
function closePopup(popupId) {
    console.log(`closePopup: Закрываем popup с ID: ${popupId}`);
    const popup = document.getElementById(popupId);
    if (popup) {
        popup.classList.remove('show');
        console.log(`closePopup: Popup ${popupId} закрыт`);
    } else {
        console.error(`closePopup: Popup с ID ${popupId} не найден`);
    }
}

// Функция для открытия всплывающих окон
function openPopup(popupId) {
    console.log(`openPopup: Открываем popup с ID: ${popupId}`);
    
    // Закрываем только настройки, но НЕ закрываем меню
    const popupsToClose = ['settingsPopup'];
    popupsToClose.forEach(id => {
        if (id !== popupId) {
            const popup = document.getElementById(id);
            if (popup && popup.classList.contains('show')) {
                popup.classList.remove('show');
                console.log(`openPopup: Закрыт popup ${id} перед открытием ${popupId}`);
            }
        }
    });
    
    // Теперь открываем нужный popup
    const popup = document.getElementById(popupId);
    if (popup) {
        popup.classList.add('show');
        console.log(`openPopup: Popup ${popupId} открыт`);
    } else {
        console.error(`openPopup: Popup с ID ${popupId} не найден`);
    }
}

// Функция для обновления переводов кнопок товаров при смене языка
function updateProductButtonTranslations(language) {
    console.log(`updateProductButtonTranslations: Обновляем кнопки для языка ${language}`);
    
    // Проверяем инициализацию переменных
    if (typeof window.loadedProductNames === 'undefined') {
        console.warn('updateProductButtonTranslations: loadedProductNames не инициализирована, инициализируем...');
        window.loadedProductNames = new Set();
        loadedProductNames = window.loadedProductNames;
    }
    
    const buttons = document.querySelectorAll('.product-card .btn');
    console.log(`updateProductButtonTranslations: Найдено ${buttons.length} кнопок для обновления`);
    
    let updatedCount = 0;
    buttons.forEach(button => {
        const availability = button.getAttribute('data-product-availability');
        const oldText = button.textContent;
        let newText = '';
        
        // НОВАЯ ЛОГИКА: Используем индивидуальные кнопки для каждого языка
        newText = getButtonText(availability, language);
        
        if (oldText !== newText) {
            button.textContent = newText;
            updatedCount++;
            console.log(`updateProductButtonTranslations: Обновлена кнопка "${oldText}" → "${newText}" (${availability})`);
        }
    });
    
    console.log(`updateProductButtonTranslations: Обновлено ${updatedCount} кнопок из ${buttons.length}`);
    
    // УБИРАЕМ ВЫЗОВ applyTranslations для предотвращения рекурсии
    // if (typeof window.translations !== 'undefined') {
    //     window.translations.applyTranslations(language);
    // }
}

// Функция для настройки переключателей языков
function setupLanguageSwitchers() {
    console.log('setupLanguageSwitchers: Настраиваем переключатели языков');
    
    const languageButtons = document.querySelectorAll('.language-btn');
    console.log(`setupLanguageSwitchers: Найдено ${languageButtons.length} кнопок языков`);
    
    // Получаем текущий язык
    const currentLanguage = localStorage.getItem('selectedLanguage') || 'uk';
    console.log(`setupLanguageSwitchers: Текущий язык: ${currentLanguage}`);
    
    // Устанавливаем активный класс для текущего языка
    languageButtons.forEach(button => {
        const lang = button.getAttribute('data-lang');
        if (lang === currentLanguage) {
            button.classList.add('active');
            console.log(`setupLanguageSwitchers: Установлен активный класс для языка ${lang}`);
        } else {
            button.classList.remove('active');
        }
        
        // ИСПРАВЛЕНИЕ БАГА: Принудительно обновляем переводы при инициализации
        if (lang === currentLanguage && typeof window.translations !== 'undefined') {
            window.translations.applyTranslations(currentLanguage);
        }
        
        // Добавляем обработчик клика
        button.addEventListener('click', (e) => {
            e.stopPropagation();
            const selectedLang = button.getAttribute('data-lang');
            console.log(`setupLanguageSwitchers: Выбран язык: ${selectedLang}`);
            
            // Убираем активный класс со всех кнопок
            languageButtons.forEach(btn => btn.classList.remove('active'));
            
            // Добавляем активный класс к нажатой кнопке
            button.classList.add('active');
            
            // Переключаем язык
            if (typeof window.translations !== 'undefined') {
                window.translations.setLanguage(selectedLang);
                console.log(`setupLanguageSwitchers: Язык переключен на ${selectedLang}`);
                
                // ИСПРАВЛЕНИЕ БАГА: При переключении языка сбрасываем состояние "конца списка"
                const previousLanguage = localStorage.getItem('selectedLanguage');
                if (previousLanguage && previousLanguage !== selectedLang) {
                    console.log(`setupLanguageSwitchers: Переключение с ${previousLanguage} на ${selectedLang}, сбрасываем состояние конца списка`);
                    
                    // Если достигнут конец списка, сбрасываем состояние для нового языка
                    if (!hasMoreProducts && loadedProductNames.size >= (maxProducts || 0)) {
                        console.log('setupLanguageSwitchers: Достигнут конец списка, сбрасываем состояние для нового языка');
                        hasMoreProducts = true;
                        currentPage = 0;
                        loadedProductNames.clear();
                        maxProducts = 0;
                        
                        // Очищаем контейнер товаров
                        const container = document.querySelector('.inner');
                        if (container) {
                            container.innerHTML = '';
                        }
                        
                        // Убираем сообщение "Все товары загружены"
                        const endMessage = document.querySelector('.end-message');
                        if (endMessage) {
                            endMessage.style.display = 'none';
                        }
                        
                        // Показываем индикатор загрузки
                        showLoadingIndicator();
                        
                        // Сохраняем новое состояние (с защитой от частого сохранения)
                        const now = Date.now();
                        if (!window.lastSaveTime || (now - window.lastSaveTime) > 3000) { // Увеличиваем до 3 секунд
                            window.lastSaveTime = now;
                            console.log('setupLanguageSwitchers: Сохраняем состояние после сброса');
                            saveState();
                        } else {
                            console.log('setupLanguageSwitchers: Пропускаем сохранение, слишком часто');
                        }
                        
                        console.log('setupLanguageSwitchers: Состояние сброшено для нового языка');
                    }
                }
                
                // Обновляем переводы кнопок товаров
                if (typeof updateProductButtonTranslations === 'function') {
                    updateProductButtonTranslations(selectedLang);
                }
                
                console.log('setupLanguageSwitchers: Переводы обновлены, состояние восстановлено');
            } else {
                console.log('setupLanguageSwitchers: Система переводов еще не готова, пропускаем...');
            }
        });
        
        console.log(`setupLanguageSwitchers: Обработчик для языка ${lang} настроен`);
    });
}

// Функция восстановления состояния бесконечной загрузки при переключении языка
function restoreInfiniteScrollState() {
    console.log('restoreInfiniteScrollState: Восстанавливаем состояние бесконечной загрузки');
    
    // Проверяем, есть ли загруженные товары
    if (loadedProductNames.size > 0) {
        console.log(`restoreInfiniteScrollState: Загружено товаров: ${loadedProductNames.size}`);
        
        // Проверяем, есть ли еще товары для загрузки
        const totalProducts = maxProducts || 0; // Общее количество товаров
        const shouldHaveMore = loadedProductNames.size < totalProducts;
        
        console.log(`restoreInfiniteScrollState: Всего товаров: ${totalProducts}, должно быть больше: ${shouldHaveMore}`);
        
        // Если должно быть больше товаров, но hasMoreProducts = false, исправляем это
        if (shouldHaveMore && !hasMoreProducts) {
            console.log('restoreInfiniteScrollState: Исправляем hasMoreProducts с false на true');
            hasMoreProducts = true;
        }
        
        // Убираем сообщение "Все товары загружены" если оно есть
        const endMessage = document.querySelector('.end-message');
        if (endMessage) {
            console.log('restoreInfiniteScrollState: Убираем сообщение о конце списка');
            endMessage.style.display = 'none';
        }
        
        // Убираем вызов showLoadingIndicator, чтобы избежать проблем с индикатором
        console.log('restoreInfiniteScrollState: Состояние восстановлено без показа индикатора');
        
        console.log(`restoreInfiniteScrollState: Состояние восстановлено, hasMoreProducts: ${hasMoreProducts}`);
    } else {
        console.log('restoreInfiniteScrollState: Нет загруженных товаров, пропускаем восстановление');
    }
}

// ===== ФУНКЦИИ КОРЗИНЫ =====

// Добавление товара в корзину
function addToCart(product) {
    console.log('addToCart: Добавляем товар в корзину:', product);
    console.log('addToCart: Детальная информация о товаре:', {
        name: product.name,
        newPrice: product.newPrice,
        oldPrice: product.oldPrice,
        price: product.price,
        hasOldPrice: !!product.oldPrice,
        oldPriceType: typeof product.oldPrice
    });
    
    // Проверяем, есть ли уже такой товар в корзине
    const existingItemIndex = cart.findIndex(item => item.name === product.name);
    
    if (existingItemIndex !== -1) {
        // Если товар уже есть, увеличиваем количество и обновляем старую цену
        cart[existingItemIndex].quantity += 1;
        cart[existingItemIndex].total = cart[existingItemIndex].quantity * cart[existingItemIndex].price;
        // Обновляем старую цену, если её нет или она отличается
        if (!cart[existingItemIndex].oldPrice && product.oldPrice) {
            cart[existingItemIndex].oldPrice = parseInt(product.oldPrice);
        }
        console.log('addToCart: Количество товара увеличено:', cart[existingItemIndex]);
    } else {
        // Если товара нет, добавляем новый
        const cartItem = {
            name: product.name,
            image: product.image,
            price: parseInt(product.newPrice || product.price),
            oldPrice: product.oldPrice ? parseInt(product.oldPrice) : null, // Сохраняем старую цену только если она есть
            quantity: 1,
            total: parseInt(product.newPrice || product.price),
            article: product.name.split(' ')[0] || 'N/A' // Простое извлечение артикула
        };
        cart.push(cartItem);
        console.log('addToCart: Новый товар добавлен в корзину:', cartItem);
        console.log('addToCart: Отладочная информация о ценах:', {
            productName: product.name,
            newPrice: product.newPrice,
            oldPrice: product.oldPrice,
            parsedOldPrice: cartItem.oldPrice,
            parsedPrice: cartItem.price
        });
    }
    
    // Обновляем общие показатели корзины
    updateCartTotals();
    
    // Сохраняем корзину
    saveCart();
    
    // Обновляем счетчик
    updateCartBadge();
    
    // Показываем popup подтверждения
    showAddToCartPopup(product);
    
    console.log('addToCart: Товар успешно добавлен в корзину');
}

// Обновление общих показателей корзины
function updateCartTotals() {
    cartTotal = cart.reduce((sum, item) => sum + item.total, 0);
    cartItemCount = cart.reduce((sum, item) => sum + item.quantity, 0);
    console.log('updateCartTotals: Обновлены показатели корзины:', { cartTotal, cartItemCount });
}

// Показ popup подтверждения добавления в корзину
function showAddToCartPopup(product) {
    console.log('showAddToCartPopup: Показываем popup для товара:', product);
    
    // Заполняем данные в popup
    const cartProductImage = document.getElementById('cartProductImage');
    const cartProductName = document.getElementById('cartProductName');
    const cartProductArticle = document.getElementById('cartProductArticle');
    const cartProductPrice = document.getElementById('cartProductPrice');
    const cartProductQuantity = document.getElementById('cartProductQuantity');
    const cartProductTotal = document.getElementById('cartProductTotal');
    const cartTotalQuantity = document.getElementById('cartTotalQuantity');
    const cartTotalAmount = document.getElementById('cartTotalAmount');
    
    if (cartProductImage) cartProductImage.src = product.image;
    if (cartProductName) cartProductName.textContent = product.name;
    if (cartProductArticle) cartProductArticle.textContent = product.name.split(' ')[0] || 'N/A';
    if (cartProductPrice) cartProductPrice.textContent = product.newPrice;
    if (cartProductQuantity) cartProductQuantity.textContent = '1';
    if (cartProductTotal) cartProductTotal.textContent = product.newPrice;
    if (cartTotalQuantity) cartTotalQuantity.textContent = cartItemCount;
    if (cartTotalAmount) cartTotalAmount.textContent = cartTotal;
    
    // Показываем popup
    const popup = document.getElementById('addToCartPopup');
    if (popup) {
        popup.classList.add('show');
        console.log('showAddToCartPopup: Popup показан');
    }
}

// Переход в корзину
function goToCart() {
    console.log('goToCart: Переходим в корзину');
    
    // Проверяем, что функция вызвана
    console.log('goToCart: Функция вызвана из:', new Error().stack);
    
    // Закрываем popup добавления в корзину если он открыт
    const addToCartPopup = document.getElementById('addToCartPopup');
    if (addToCartPopup && addToCartPopup.classList.contains('show')) {
        closePopup('addToCartPopup');
    }
    
    // Показываем корзину
    showCartPopup();
}

// Функция для показа полноценной корзины
function showCartPopup() {
    console.log('showCartPopup: Показываем полноценную корзину');
    
    // Используем общую функцию openPopup
    openPopup('cartPopup');
    
    // Рендерим товары и обновляем расчеты
    setTimeout(() => {
        renderCartItems();
        updateCartCalculations();
        // Применяем переводы для текущего языка
        const currentLang = localStorage.getItem('selectedLanguage') || 'uk';
        applyTranslations(currentLang);
    }, 100);
}

// Функция для применения базовых переводов критически важных элементов
function applyBasicTranslations(language) {
    console.log('applyBasicTranslations: Применяем базовые переводы для языка:', language);
    
    // Базовые переводы для заголовков и статуса
    const translations = {
        uk: {
            appTitle: 'GuitarStrings.com.ua',
            bonusInfo: 'Кол-во бонусов: 100',
            onlineStatus: 'Напишите нам, мы онлайн!',
            onlineStatusOffline: 'Напишите нам, мы позже ответим'
        },
        ru: {
            appTitle: 'GuitarStrings.com.ua',
            bonusInfo: 'Кол-во бонусов: 100',
            onlineStatus: 'Напишите нам, мы онлайн!',
            onlineStatusOffline: 'Напишите нам, мы позже ответим'
        },
        en: {
            appTitle: 'GuitarStrings.com.ua',
            bonusInfo: 'Bonus count: 100',
            onlineStatus: 'Write to us, we are online!',
            onlineStatusOffline: 'Write to us, we will answer later'
        }
    };
    
    const lang = translations[language] || translations.uk;
    
    // Применяем базовые переводы
    const appTitle = document.querySelector('.app-title');
    if (appTitle) appTitle.textContent = lang.appTitle;
    
    const bonusInfo = document.querySelector('.bonus-info');
    if (bonusInfo) bonusInfo.textContent = lang.bonusInfo;
    
    // Обновляем статус менеджера
    const onlineStatus = document.querySelector('.online-status');
    if (onlineStatus) {
        // Проверяем время для определения статуса
        const now = new Date();
        const hour = now.getHours();
        const isOnline = hour >= 9 && hour < 19;
        
        if (isOnline) {
            onlineStatus.textContent = lang.onlineStatus;
            onlineStatus.classList.remove('offline');
            onlineStatus.classList.add('online');
        } else {
            onlineStatus.textContent = lang.onlineStatusOffline;
            onlineStatus.classList.remove('online');
            onlineStatus.classList.add('offline');
        }
    }
    
    console.log('applyBasicTranslations: Базовые переводы применены');
}

// Функция для закрытия корзины
function closeCartPopup() {
    console.log('closeCartPopup: Закрываем корзину');
    closePopup('cartPopup');
}

// Функция для рендеринга товаров в корзине
function renderCartItems() {
    console.log('renderCartItems: Рендерим товары в корзине');
    const cartItemsContainer = document.getElementById('cartItems');
    
    if (!cartItemsContainer) {
        console.error('renderCartItems: Контейнер cartItems не найден');
        return;
    }
    
    if (!cart || cart.length === 0) {
        cartItemsContainer.innerHTML = '<div class="cart-empty">Корзина пуста</div>';
        return;
    }
    
    let cartHTML = '';
    
    cart.forEach((item, index) => {
        // Отладочная информация для проверки цен
        console.log(`Cart item ${index}:`, {
            name: item.name,
            price: item.price,
            oldPrice: item.oldPrice,
            hasOldPrice: !!item.oldPrice,
            pricesDifferent: item.oldPrice !== item.price,
            shouldShowOldPrice: item.oldPrice && item.oldPrice > 0 && item.oldPrice !== item.price
        });
        
        cartHTML += `
            <div class="cart-item" data-index="${index}">
                <div class="cart-item-image">
                    <img src="${item.image || './images/placeholder.jpg'}" alt="${item.name}" onerror="this.src='./images/placeholder.jpg'">
                </div>
                <div class="cart-item-details">
                    <div class="cart-item-name">${item.name}</div>
                    <div class="cart-item-name-secondary">Строка названия 2</div>
                    ${item.oldPrice && item.oldPrice > 0 && item.oldPrice !== item.price ? `<div class="cart-item-old-price">Цена: ${item.oldPrice} грн.</div>` : ''}
                    <div class="cart-item-price">Цена: ${item.price} грн.</div>
                </div>
                <div class="cart-item-article">${item.article || 'N/A'}</div>
                <div class="cart-item-quantity">
                    <button class="quantity-btn minus" onclick="changeQuantity(${index}, -1)">-</button>
                    <span class="quantity-display">${item.quantity}x</span>
                    <button class="quantity-btn plus" onclick="changeQuantity(${index}, 1)">+</button>
                </div>
                <div class="cart-item-total">${(item.price * item.quantity).toFixed(0)} грн.</div>
            </div>
        `;
    });
    
    cartItemsContainer.innerHTML = cartHTML;
}

// Функция для изменения количества товара
function changeQuantity(index, delta) {
    console.log('changeQuantity: Изменяем количество товара', index, delta);
    
    if (index >= 0 && index < cart.length) {
        const newQuantity = cart[index].quantity + delta;
        
        if (newQuantity <= 0) {
            // Удаляем товар из корзины
            cart.splice(index, 1);
            updateCartBadge();
        } else {
            cart[index].quantity = newQuantity;
        }
        
        // Сохраняем корзину
        saveCart();
        
        // Обновляем отображение
        renderCartItems();
        updateCartCalculations();
    }
}

// Функция для обновления расчетов корзины
function updateCartCalculations() {
    console.log('updateCartCalculations: Обновляем расчеты корзины');
    
    if (!cart || cart.length === 0) {
        // Сбрасываем все значения
        document.getElementById('cartSubtotal').textContent = '0 грн';
        document.getElementById('cartDiscount').textContent = '-0 грн';
        document.getElementById('cartDelivery').textContent = '80 грн';
        document.getElementById('cartCommission').textContent = '0 грн';
        document.getElementById('cartBonusUsed').textContent = '-0 грн';
        document.getElementById('cartCouponUsed').textContent = '-0 грн';
        document.getElementById('cartTotalPrice').textContent = '0 грн.';
        document.getElementById('cartPayAmount').textContent = '0 грн';
        return;
    }
    
    // Рассчитываем промежуточный итог и скидки
    let newPricesTotal = 0;
    let oldPricesTotal = 0;
    
    cart.forEach(item => {
        // Считаем сумму новых цен
        newPricesTotal += item.price * item.quantity;
        
        // Считаем сумму старых цен для расчета скидки
        if (item.oldPrice && item.oldPrice > 0 && item.oldPrice !== item.price) {
            oldPricesTotal += item.oldPrice * item.quantity;
        }
    });
    
    // Получаем значения из полей ввода
    const bonusInput = document.querySelector('.cart-bonuses');
    const couponInput = document.querySelector('.cart-coupon');
    
    const bonusValue = bonusInput ? parseInt(bonusInput.value) || 0 : 0;
    const couponValue = couponInput ? parseInt(couponInput.value) || 0 : 0;
    
    // Рассчитываем скидку как разность между старыми и новыми ценами
    const discount = oldPricesTotal > 0 ? oldPricesTotal - newPricesTotal : 0;
    
    // Отладочная информация для расчета скидки
    console.log('updateCartCalculations: Расчет скидки:', {
        newPricesTotal: newPricesTotal,
        oldPricesTotal: oldPricesTotal,
        discount: discount,
        cartItems: cart.map(item => ({
            name: item.name,
            price: item.price,
            oldPrice: item.oldPrice,
            quantity: item.quantity,
            hasOldPrice: item.oldPrice && item.oldPrice > 0 && item.oldPrice !== item.price
        }))
    });
    
    // Получаем стоимость доставки из выбранного способа
    const deliverySelect = document.getElementById('deliveryMethodSelect');
    let delivery = 0;
    
    if (deliverySelect) {
        switch (deliverySelect.value) {
            case 'ukrposhta':
                delivery = 80;
                break;
            case 'free1001':
            case 'free2000':
                delivery = 0; // Бесплатная доставка
                break;
            default:
                delivery = 0; // Nova пошта, Meest пошта, Самовывоз
                break;
        }
    } else {
        delivery = 0; // По умолчанию
    }
    
    // Ограничиваем бонусы и купон (используем сумму новых цен)
    const maxBonus = Math.min(bonusValue, newPricesTotal);
    const maxCoupon = Math.min(couponValue, newPricesTotal);
    
    // Итоговая сумма (с учетом скидки)
    const total = newPricesTotal + delivery - maxBonus - maxCoupon;
    // Обновляем отображение
    document.getElementById('cartSubtotal').textContent = `${oldPricesTotal > 0 ? oldPricesTotal.toFixed(0) : newPricesTotal.toFixed(0)} грн`;
    document.getElementById('cartDiscount').textContent = `-${discount.toFixed(0)} грн`;
    document.getElementById('cartDelivery').textContent = `${delivery} грн`;
    document.getElementById('cartCommission').textContent = '0 грн';
    document.getElementById('cartBonusUsed').textContent = `-${maxBonus.toFixed(0)} грн`;
    document.getElementById('cartCouponUsed').textContent = `-${maxCoupon.toFixed(0)} грн`;
    document.getElementById('cartTotalPrice').textContent = `${total.toFixed(0)} грн.`;
    document.getElementById('cartPayAmount').textContent = `${total.toFixed(0)} грн`;
    
    // Обновляем опции бесплатной доставки
    updateFreeDeliveryOptions();
}

// Функция для обновления стоимости доставки при смене способа доставки
function updateDeliveryCost() {
    console.log('updateDeliveryCost: Обновляем стоимость доставки');
    
    const deliverySelect = document.getElementById('deliveryMethodSelect');
    const selectedMethod = deliverySelect.value;
    
    let deliveryCost = 0;
    
    switch (selectedMethod) {
        case 'ukrposhta':
            deliveryCost = 80;
            break;
        case 'free1001':
        case 'free2000':
            deliveryCost = 0; // Бесплатная доставка
            break;
        default:
            deliveryCost = 0; // Nova пошта, Meest пошта, Самовывоз
            break;
    }
    
    // Обновляем отображение стоимости доставки
    document.getElementById('cartDelivery').textContent = `${deliveryCost} грн`;
    
    console.log(`updateDeliveryCost: Способ доставки: ${selectedMethod}, стоимость: ${deliveryCost} грн`);
}

// Функция для проверки и показа/скрытия опций бесплатной доставки
function updateFreeDeliveryOptions() {
    console.log('updateFreeDeliveryOptions: Проверяем опции бесплатной доставки');
    
    const subtotal = cart.reduce((sum, item) => sum + (item.price * item.quantity), 0);
    const free1001Option = document.querySelector('option[value="free1001"]');
    const free2000Option = document.querySelector('option[value="free2000"]');
    
    // Показываем/скрываем опцию бесплатной доставки от 1001 грн
    if (free1001Option) {
        if (subtotal >= 1001) {
            free1001Option.style.display = 'block';
            console.log('updateFreeDeliveryOptions: Показана опция бесплатной доставки от 1001 грн');
        } else {
            free1001Option.style.display = 'none';
            // Если эта опция была выбрана, переключаемся на Nova пошта
            if (document.getElementById('deliveryMethodSelect').value === 'free1001') {
                document.getElementById('deliveryMethodSelect').value = 'nova';
                updateDeliveryCost();
            }
        }
    }
    
    // Показываем/скрываем опцию бесплатной доставки от 2000 грн
    if (free2000Option) {
        if (subtotal >= 2000) {
            free2000Option.style.display = 'block';
            console.log('updateFreeDeliveryOptions: Показана опция бесплатной доставки от 2000 грн');
        } else {
            free2000Option.style.display = 'none';
            // Если эта опция была выбрана, переключаемся на Nova пошта
            if (document.getElementById('deliveryMethodSelect').value === 'free2000') {
                document.getElementById('deliveryMethodSelect').value = 'nova';
                updateDeliveryCost();
            }
        }
    }
}

// Функция для оформления заказа
function checkout() {
    console.log('checkout: Оформляем заказ');
    
    if (!cart || cart.length === 0) {
        alert('Корзина пуста');
        return;
    }
    
    // TODO: Реализовать оформление заказа
    alert('Оформление заказа в разработке');
}

// Настройка обработчиков событий для корзины
function setupCartEventHandlers() {
    console.log('setupCartEventHandlers: Настраиваем обработчики событий для корзины');
    
    // Обработчики для полей ввода
    const bonusInput = document.querySelector('.cart-bonuses');
    const couponInput = document.querySelector('.cart-coupon');
    const commentInput = document.querySelector('.cart-comment');
    
    if (bonusInput) {
        bonusInput.addEventListener('input', () => {
            updateCartCalculations();
        });
    }
    
    if (couponInput) {
        couponInput.addEventListener('input', () => {
            updateCartCalculations();
        });
    }
    
    if (commentInput) {
        commentInput.addEventListener('input', () => {
            // Сохраняем комментарий в localStorage
            localStorage.setItem('cartComment', commentInput.value);
        });
    }
    
    // Загружаем сохраненный комментарий
    const savedComment = localStorage.getItem('cartComment');
    if (commentInput && savedComment) {
        commentInput.value = savedComment;
    }
    
    // Обработчик клавиши ESC для закрытия корзины
    document.addEventListener('keydown', (event) => {
        if (event.key === 'Escape') {
            const cartPopup = document.getElementById('cartPopup');
            if (cartPopup && cartPopup.style.display === 'flex') {
                closeCartPopup();
            }
        }
    });
}

// Предварительная загрузка фоновых изображений
function preloadBackgroundImages() {
    const backgroundImages = [
        './images/Contacts_image/background.jpg'
    ];
    
    backgroundImages.forEach(src => {
        const img = new Image();
        img.src = src;
        console.log(`Предварительная загрузка изображения: ${src}`);
    });
}

// Вызываем предварительную загрузку при загрузке страницы
document.addEventListener('DOMContentLoaded', preloadBackgroundImages);


