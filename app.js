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
    console.warn('Система переводов не найдена');
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
    
    // Для тестирования в обычном браузере - показываем тестовый аватар
    setTimeout(() => {
        console.log('Тестируем аватар в обычном браузере...');
        const profileImage = document.getElementById('profile-image');
        const profileIcon = document.getElementById('profile-icon');
        const profileSvg = document.getElementById('profile-svg');
        
        if (profileImage && profileIcon && profileSvg) {
            // Сначала пробуем загрузить локальное изображение
            profileImage.src = 'images/Contacts_image/Telegram_32x32.png';
            profileImage.style.display = 'block';
            profileIcon.style.display = 'none';
            profileSvg.style.display = 'none';
            console.log('Тестовый аватар установлен из локального файла');
            
            // Добавляем обработчик ошибок для тестового изображения
            profileImage.onerror = () => {
                console.warn('Не удалось загрузить тестовый аватар, показываем SVG аватар');
                profileImage.style.display = 'none';
                profileIcon.style.display = 'none';
                profileSvg.style.display = 'block';
            };
            
            profileImage.onload = () => {
                console.log('Тестовый аватар успешно загружен');
            };
        }
    }, 2000);
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
        displayProducts(allProducts);
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
            
            // Ограничиваем отображение первыми 60 товарами
            const firstPageProducts = data.products.slice(0, 60);
            
            // Обновляем глобальные переменные
            maxProducts = data.total || data.products.length;
            hasMoreProducts = data.products.length === 60 && maxProducts > 60;
            
            console.log(`Максимум товаров: ${maxProducts}, есть еще: ${hasMoreProducts}`);
            
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
    
    // Отладка для конкретного товара
    if (product.name && product.name.includes('Dean Markley 2558A')) {
        console.log(`=== FRONTEND DEBUG: Creating card for Dean Markley 2558A ===`);
        console.log(`Product availability: ${product.availability}`);
        console.log(`Product status: ${product.status}`);
        console.log(`Full product data:`, product);
    }
    
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
    
    return card;
}

// Функция генерации звездочек рейтинга
function generateRatingStars(rating) {
    console.log('generateRatingStars: Входной рейтинг:', rating);
    
    // Если рейтинг "Нет рейтинга", показываем пустые звезды
    if (rating === 'Нет рейтинга' || rating === 'null' || rating === null || rating === undefined) {
        console.log('generateRatingStars: Нет рейтинга, показываем пустые звезды');
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
        console.log('generateRatingStars: Невалидный рейтинг, показываем "Нет рейтинга"');
        return '<span class="no-rating">Нет рейтинга</span>';
    }
    
    console.log('generateRatingStars: Числовой рейтинг:', numericRating);
    
    // Округляем рейтинг до ближайшей половины
    const roundedRating = Math.round(numericRating * 2) / 2;
    
    const fullStars = Math.floor(roundedRating);
    const hasHalfStar = roundedRating % 1 >= 0.5;
    const emptyStars = 5 - fullStars - (hasHalfStar ? 1 : 0);
    
    console.log(`generateRatingStars: fullStars=${fullStars}, hasHalfStar=${hasHalfStar}, emptyStars=${emptyStars}`);
    
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
    
    console.log('generateRatingStars: Сгенерированные звезды:', stars);
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
    
    console.log(`loadMoreProducts: Проверка условий - isLoading=${isLoading}, hasMoreProducts=${hasMoreProducts}, currentPage=${currentPage}, isSearchActive=${isSearchActive}, loadedProducts=${loadedProductNames.size}`);
    
    // ИСПРАВЛЕНИЕ БАГА: Дополнительная проверка корректности состояния
    if (loadedProductNames.size >= 377) {
        console.log('loadMoreProducts: Все товары загружены (377), исправляем hasMoreProducts и выходим');
        hasMoreProducts = false;
        return;
    }
    
    // Не загружаем дополнительные товары во время поиска
    if (isSearchActive) {
        console.log('loadMoreProducts: Поиск активен, пропускаем загрузку дополнительных товаров...');
        return;
    }
    
    if (isLoading || !hasMoreProducts) {
        if (isLoading) {
            console.log('loadMoreProducts: Загрузка уже идет, пропускаем...');
        } else if (!hasMoreProducts) {
            console.log('loadMoreProducts: Больше товаров нет, пропускаем...');
        }
        return;
    }
    
    console.log('loadMoreProducts: Начинаем загрузку дополнительных товаров...');
    console.log(`loadMoreProducts: Текущая страница: ${currentPage}, загружено товаров: ${loadedProductNames.size}`);
    isLoading = true;
    
    // Показываем индикатор загрузки
    showLoadingIndicator();
    
    try {
        const nextPage = currentPage + 1;
        const start = nextPage * productsPerPage;
        
        console.log(`loadMoreProducts: Загружаем страницу ${nextPage}, начиная с ${start}`);
        
        // ОПТИМИЗАЦИЯ: Проверяем, есть ли предзагруженные товары
        let data;
        let newProducts;
        
        if (window.preloadedProducts && window.preloadedProducts.length > 0) {
            console.log(`loadMoreProducts: Используем предзагруженные товары (${window.preloadedProducts.length} шт.)`);
            data = { success: true, products: window.preloadedProducts, hasMore: true };
            newProducts = window.preloadedProducts;
            // Очищаем предзагруженные товары
            window.preloadedProducts = null;
        } else {
            console.log(`loadMoreProducts: Загружаем товары с сервера...`);
            console.log(`loadMoreProducts: URL: http://localhost:8000/api/products?start=${start}&limit=${productsPerPage}`);
            
            const response = await fetch(`http://localhost:8000/api/products?start=${start}&limit=${productsPerPage}`);
            
            if (!response.ok) {
                throw new Error(`HTTP error! status: ${response.status}`);
            }
            
            data = await response.json();
            console.log(`loadMoreProducts: Получен ответ, товаров: ${data.products ? data.products.length : 0}`);
            console.log(`loadMoreProducts: Данные API:`, data);
            
            if (data.success) {
                newProducts = data.products;
            } else {
                throw new Error('API вернул ошибку');
            }
        }
        
        if (data.success) {
            if (newProducts && newProducts.length > 0) {
                console.log(`loadMoreProducts: Получено ${newProducts.length} товаров`);
                
                // Отладка для конкретного товара
                data.products.forEach(product => {
                    if (product.name && product.name.includes('Dean Markley 2558A')) {
                        console.log(`=== FRONTEND DEBUG: Dean Markley 2558A found in loadMoreProducts API response ===`);
                        console.log(`Product: ${product.name}`);
                        console.log(`Availability: ${product.availability}`);
                        console.log(`Status: ${product.status}`);
                        console.log(`Full product data:`, product);
                        console.log(`=== END FRONTEND DEBUG ===`);
                    }
                });
                
                console.log(`loadMoreProducts: Добавляем ${newProducts.length} новых товаров`);
                
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
                        
                        // ИСПРАВЛЕНИЕ БАГА: Обновляем переводы для новых карточек товаров
                        const currentLanguage = localStorage.getItem('selectedLanguage') || 'uk';
                        if (typeof window.translations !== 'undefined') {
                            window.translations.applyTranslations(currentLanguage);
                        }
                        
                        // Обновляем флаг наличия товаров
                        hasMoreProducts = data.hasMore;
                        
                        console.log(`loadMoreProducts: Обновлено - currentPage=${currentPage}, hasMoreProducts=${hasMoreProducts}`);
                        
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
        const response = await fetch('http://localhost:8000/api/products?start=0&limit=377');
        
        if (!response.ok) {
            throw new Error(`HTTP error! status: ${response.status}`);
        }
        
        const data = await response.json();
        console.log('loadAllProducts: Получены данные:', data);
        
        if (data.products && data.products.length > 0) {
            console.log(`loadAllProducts: Получено ${data.products.length} товаров`);
            
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
            hasMoreProducts = false;
            maxProducts = data.products.length;
            
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
            loadAllBtn.innerHTML = '<i class="fas fa-download"></i> Загрузить все 377 товаров категории Струны для электрогитары';
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
    
    console.log(`handleScroll: Проверка - isLoading=${isLoading}, hasMoreProducts=${hasMoreProducts}, currentPage=${currentPage}, loadedProducts=${loadedProductNames.size}`);
    
    // ИСПРАВЛЕНИЕ БАГА: Дополнительная проверка корректности состояния
    if (loadedProductNames.size >= 377) {
        console.log('handleScroll: Все товары загружены (377), исправляем hasMoreProducts');
        hasMoreProducts = false;
    }
    
    if (isLoading || !hasMoreProducts) {
        if (isLoading) {
            console.log('handleScroll: Загрузка уже идет, пропускаем...');
        } else if (!hasMoreProducts) {
            console.log('handleScroll: Больше товаров нет, пропускаем...');
        }
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
    
    // Убираем автоматическое сохранение при прокрутке, чтобы не блокировать ползунок
    // if (loadedProductNames.size > 0) {
    //     clearTimeout(window.scrollSaveTimeout);
    //     window.scrollSaveTimeout = setTimeout(() => {
    //         const now = Date.now();
    //         if (!window.lastSaveTime || (now - window.lastSaveTime) > 5000) {
    //             window.lastSaveTime = now;
    //             console.log('handleScroll: Сохраняем состояние после прокрутки');
    //             saveState();
    //         } else {
    //             console.log('handleScroll: Пропускаем сохранение, слишком часто');
    //         }
    //     }, 500);
    // }
}

// Функция получения данных с сайта
async function fetchProductData(page = 0) {
    const start = page * 60;
    
    try {
        // Используем прокси через наш сервер для обхода CORS
        const response = await fetch(`http://localhost:8000/api/products?start=${start}&limit=60`);
        
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
    if (loadedProductNames.size > 0) {
        const totalProducts = 377; // Общее количество товаров
        correctHasMoreProducts = loadedProductNames.size < totalProducts;
        console.log(`saveState: Проверка hasMoreProducts: загружено ${loadedProductNames.size}, всего ${totalProducts}, корректное значение: ${correctHasMoreProducts}`);
        
        // ИСПРАВЛЕНИЕ БАГА: Принудительно исправляем hasMoreProducts если значение некорректно
        if (hasMoreProducts !== correctHasMoreProducts) {
            console.log(`saveState: Исправляем hasMoreProducts с ${hasMoreProducts} на ${correctHasMoreProducts}`);
            hasMoreProducts = correctHasMoreProducts;
        }
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
    
    try {
        // Восстанавливаем переменные
        loadedProductNames = new Set(state.loadedProductNames || []);
        maxProducts = state.maxProducts || 0;
        
            // Проверяем, есть ли еще товары для загрузки
    const totalLoaded = state.loadedProductNames ? state.loadedProductNames.length : 0;
    const totalProducts = 377; // Общее количество товаров
    
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
        hasMoreProducts = totalLoaded < totalProducts;
    }
        
        // ИСПРАВЛЕНИЕ БАГА: Правильно рассчитываем currentPage на основе количества загруженных товаров
        currentPage = Math.floor(totalLoaded / productsPerPage);
        console.log(`restoreAllProducts: Рассчитан currentPage=${currentPage} на основе ${totalLoaded} товаров (${productsPerPage} товаров на страницу)`);
        
        console.log(`restoreAllProducts: Загружено товаров: ${totalLoaded}, всего товаров: ${totalProducts}, hasMoreProducts: ${hasMoreProducts}`);
        
        // Загружаем свежие данные с сервера
        console.log('restoreAllProducts: Загружаем свежие данные с сервера...');
        const data = await fetchProductData(0);
        
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
                
                previouslyLoadedProducts.forEach((productData, index) => {
                    console.log(`restoreAllProducts: Создаем карточку для товара ${index + 1}:`, productData.name);
                    const productCard = createProductCardFromSiteData(productData, `btn${index + 1}`);
                    container.appendChild(productCard);
                    console.log(`restoreAllProducts: Карточка ${index + 1} добавлена в контейнер`);
                });
                
                // ИСПРАВЛЕНИЕ БАГА: Обновляем переводы для восстановленных карточек товаров
                const currentLanguage = localStorage.getItem('selectedLanguage') || 'uk';
                if (typeof window.translations !== 'undefined') {
                    window.translations.applyTranslations(currentLanguage);
                }
                
                // ИСПРАВЛЕНИЕ БАГА: Принудительно обновляем переводы кнопок для восстановленных товаров
                if (typeof updateProductButtonTranslations === 'function') {
                    console.log('Обновляем переводы кнопок для восстановленных товаров');
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
            const finalTotalProducts = 377;
            const finalHasMoreProducts = finalTotalLoaded < finalTotalProducts;
            
            if (hasMoreProducts !== finalHasMoreProducts) {
                console.log(`restoreAllProducts: Исправляем hasMoreProducts: было ${hasMoreProducts}, должно быть ${finalHasMoreProducts}`);
                hasMoreProducts = finalHasMoreProducts;
            }
            
            console.log(`restoreAllProducts: Финальная проверка - загружено: ${finalTotalLoaded}, всего: ${finalTotalProducts}, hasMoreProducts: ${hasMoreProducts}`);
            
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
    
    // НАСТРОЙКА ПОИСКА - перенесена в начало для быстрого доступа
    console.log('=== НАСТРОЙКА ПОИСКА ===');
    const searchInput = document.querySelector('.search-input');
    if (searchInput) {
        console.log('searchInput найден:', searchInput);
        
                    // Обработчик ввода в поисковую строку с debouncing
            searchInput.addEventListener('input', async (e) => {
                const query = e.target.value;
                console.log(`Поисковый запрос: "${query}"`);
                
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

// Функция для получения и отображения фото профиля из Telegram
function loadTelegramProfilePhoto() {
    console.log('=== loadTelegramProfilePhoto: Начинаем загрузку аватара ===');
    console.log('window.Telegram:', !!window.Telegram);
    console.log('window.Telegram.WebApp:', !!window.Telegram?.WebApp);
    console.log('tg:', !!tg);
    console.log('tg.initDataUnsafe:', !!tg?.initDataUnsafe);
    console.log('tg.initDataUnsafe.user:', !!tg?.initDataUnsafe?.user);
    
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
                profileImage.src = user.photo_url;
                profileImage.style.display = 'block';
                profileIcon.style.display = 'none';
                profileSvg.style.display = 'none';
                
                console.log('Устанавливаем src для аватара:', user.photo_url);
                
                // Добавляем обработчик ошибок для изображения
                profileImage.onerror = () => {
                    console.warn('Не удалось загрузить фото профиля из Telegram, показываем SVG аватар');
                    profileImage.style.display = 'none';
                    profileIcon.style.display = 'none';
                    profileSvg.style.display = 'block';
                };
                
                profileImage.onload = () => {
                    console.log('Фото профиля из Telegram успешно загружено');
                };
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
    }
}

// Обработчики событий Telegram
if (window.Telegram && window.Telegram.WebApp) {
    tg.ready();
    
    // Загружаем фото профиля после готовности Telegram WebApp
    loadTelegramProfilePhoto();
    
    tg.MainButton.onClick(() => {
        tg.sendData("test");
    });
} else {
    console.log('Telegram WebApp не доступен, пропускаем инициализацию');
}

// Настройка обработчиков изображений
function setupImageHandlers() {
    const images = document.querySelectorAll('.product-card .img');
    images.forEach(img => {
        // Проверяем, есть ли src у изображения
        if (!img.src || img.src === '' || img.src.includes('undefined')) {
            console.warn('Изображение без src:', img);
            img.style.display = 'none';
            return;
        }
        
        img.addEventListener('load', () => {
            img.classList.add('loaded');
            console.log('Изображение загружено:', img.src);
        });
        
        img.addEventListener('error', () => {
            console.error('Ошибка загрузки изображения:', img.src);
            img.style.display = 'none';
            // Показываем placeholder
            const container = img.closest('.img-container');
            if (container) {
                container.style.display = 'flex';
                container.style.alignItems = 'center';
                container.style.justifyContent = 'center';
                container.style.backgroundColor = '#f5f5f5';
                container.style.borderRadius = '8px';
                container.style.minHeight = '150px';
            }
        });
        
        // Добавляем timeout для изображений, которые долго загружаются
        setTimeout(() => {
            if (!img.complete) {
                console.warn('Изображение не загрузилось за 5 секунд:', img.src);
                img.style.display = 'none';
            }
        }, 5000);
    });
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
        
        // Проверяем инициализацию переменных
        if (typeof window.loadedProductNames === 'undefined') {
            console.warn('showContactsPopup: loadedProductNames не инициализирована, инициализируем...');
            window.loadedProductNames = new Set();
            loadedProductNames = window.loadedProductNames;
        }
        
        console.log('showContactsPopup: Шаг 1 - поиск элемента...');
        const popup = document.getElementById('contactsPopup');
        console.log('showContactsPopup: Элемент popup найден:', popup);
        
        if (popup) {
            console.log('showContactsPopup: Шаг 2 - проверка текущих классов...');
            console.log('showContactsPopup: Текущие классы до добавления:', popup.className);
            
            console.log('showContactsPopup: Шаг 3 - добавление класса show...');
            popup.classList.add('show');
            console.log('showContactsPopup: Классы после добавления:', popup.className);
            
            // Принудительно применяем стили
            popup.style.display = 'flex';
            popup.style.opacity = '1';
            popup.style.visibility = 'visible';
            popup.style.zIndex = '9999';
            
            console.log('showContactsPopup: Шаг 4 - проверка стилей...');
            // Проверяем стили
            const styles = window.getComputedStyle(popup);
            console.log('showContactsPopup: Стили после добавления класса:');
            console.log('- display:', styles.display);
            console.log('- visibility:', styles.visibility);
            console.log('- opacity:', styles.opacity);
            console.log('- z-index:', styles.zIndex);
            
            console.log('showContactsPopup: Шаг 5 - пропускаем обновление переводов для предотвращения рекурсии');
            // Убираем вызов applyTranslations, чтобы избежать рекурсии
            console.log('showContactsPopup: Переводы будут обновлены автоматически');
            
            console.log('showContactsPopup: Шаг 6 - функция завершена успешно');
            console.log('showContactsPopup: Popup контактов успешно открыт');
            
            // Добавляем небольшую задержку перед активацией обработчика клика вне popup
            setTimeout(() => {
                console.log('showContactsPopup: Активируем обработчик клика вне popup');
            }, 300); // Увеличиваем задержку
        } else {
            console.error('showContactsPopup: Popup контактов не найден в DOM');
            alert('Popup контактов не найден в DOM!'); // Временная отладка
        }
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
    
    const popup = document.getElementById('contactsPopup');
    if (popup) {
        popup.classList.remove('show');
        
        // Принудительно убираем стили
        popup.style.display = 'none';
        popup.style.opacity = '0';
        popup.style.visibility = 'hidden';
        
        console.log('closeContactsPopup: Popup контактов закрыт');
    } else {
        console.error('closeContactsPopup: Popup контактов не найден');
    }
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
        
        // Закрываем меню если клик не по кнопке меню и не по содержимому меню
        if (menuPopup && menuPopup.classList.contains('show')) {
            const menuBtn = document.querySelector('.menu-btn');
            if (!menuBtn.contains(e.target) && !menuPopup.contains(e.target)) {
                closePopup('menuPopup');
            }
        }
        
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
            console.log('setupPopupClickOutside: Цель клика:', e.target);
            console.log('setupPopupClickOutside: Цель клика tagName:', e.target.tagName);
            console.log('setupPopupClickOutside: Цель клика className:', e.target.className);
            
            // Проверяем, что клик действительно вне popup
            const isClickInsidePopup = contactsPopup.contains(e.target);
            console.log('setupPopupClickOutside: Клик внутри popup:', isClickInsidePopup);
            
            // Проверяем, что это не клик по кнопке меню
            const menuBtn = document.querySelector('.menu-btn');
            const isClickOnMenuBtn = menuBtn && menuBtn.contains(e.target);
            console.log('setupPopupClickOutside: Клик по кнопке меню:', isClickOnMenuBtn);
            
            // Проверяем, что это не клик по кнопке "Контакты"
            const contactsMenuItem = document.querySelector('.contacts-item');
            const isClickOnContactsMenuItem = contactsMenuItem && contactsMenuItem.contains(e.target);
            console.log('setupPopupClickOutside: Клик по кнопке контактов:', isClickOnContactsMenuItem);
            
            // Проверяем, что это не клик по крестику
            const isClickOnCloseBtn = e.target.closest('.close-btn');
            console.log('setupPopupClickOutside: Клик по крестику:', !!isClickOnCloseBtn);
            
            if (!isClickInsidePopup && !isClickOnMenuBtn && !isClickOnContactsMenuItem && !isClickOnCloseBtn) {
                console.log('setupPopupClickOutside: Клик вне popup контактов, закрываем...');
                closeContactsPopup();
            } else {
                console.log('setupPopupClickOutside: Клик внутри popup или по кнопкам, не закрываем');
            }
        }
    });
    
    // Обработчик клавиши ESC для закрытия popup
    document.addEventListener('keydown', (e) => {
        if (e.key === 'Escape') {
            const menuPopup = document.getElementById('menuPopup');
            const settingsPopup = document.getElementById('settingsPopup');
            const contactsPopup = document.getElementById('contactsPopup');
            
            // Закрываем popup контактов при нажатии ESC
            if (contactsPopup && contactsPopup.classList.contains('show')) {
                console.log('setupPopupClickOutside: Нажата клавиша ESC, закрываем popup контактов');
                closeContactsPopup();
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
        // Проверяем статус пользователя @GuitarStringsUSA
        const userInfo = await checkTelegramUserStatus('GuitarStringsUSA');
        
        const currentLanguage = localStorage.getItem('selectedLanguage') || 'uk';
        
        if (userInfo && userInfo.isOnline) {
            // Если пользователь онлайн, показываем зеленый статус
            statusDot.style.background = '#4CAF50'; // Зеленый цвет для онлайн
            statusText.textContent = window.translations ? window.translations.getTranslation('onlineStatus', currentLanguage) : 'Напишите нам, мы онлайн!';
            supportButton.classList.add('online');
            supportButton.classList.remove('offline');
        } else {
            // Если пользователь оффлайн, показываем синий статус
            statusDot.style.background = '#2196F3'; // Синий цвет для оффлайн
            statusText.textContent = window.translations ? window.translations.getTranslation('onlineStatusOffline', currentLanguage) : 'Напишите нам, мы позже ответим';
            supportButton.classList.add('offline');
            supportButton.classList.remove('online');
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
    
    // Сначала закрываем все другие popup'ы
    const allPopups = ['menuPopup', 'settingsPopup'];
    allPopups.forEach(id => {
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
                    if (!hasMoreProducts && loadedProductNames.size >= 377) {
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
                console.error('setupLanguageSwitchers: Система переводов не найдена');
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
        const totalProducts = 377; // Общее количество товаров
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








