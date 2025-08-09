let tg = window.Telegram.WebApp;

tg.expand();

tg.MainButton.textColor = '#FFFFFF';
tg.MainButton.color = '#2cab37';

let item = "";

let btn1 = document.getElementById("btn1");
let btn2 = document.getElementById("btn2");
let btn3 = document.getElementById("btn3");
let btn4 = document.getElementById("btn4");
let btn5 = document.getElementById("btn5");
let btn6 = document.getElementById("btn6");

// Переменные для бесконечной прокрутки
let currentPage = 0;
let isLoading = false;
let hasMoreProducts = true;
const productsPerPage = 60;
let maxProducts = 377; // Будет обновляться из API
let loadedProductNames = new Set(); // Для отслеживания уже загруженных товаров
let savedScrollPosition = 0; // Сохраненная позиция прокрутки

// Функция загрузки товаров с сайта
async function loadProducts(page = 0) {
    if (isLoading || !hasMoreProducts) return;
    
    isLoading = true;
    const start = page * productsPerPage;
    
    try {
        // API запрос к серверу для получения товаров
        const response = await fetch(`api.php?start=${start}&limit=${productsPerPage}`);
        const data = await response.json();
        
        if (data.success) {
            // Обновляем общее количество товаров из API
            if (data.totalProducts) {
                maxProducts = data.totalProducts;
            }
            
            // Фильтруем дубликаты
            const uniqueProducts = data.products.filter(product => {
                if (loadedProductNames.has(product.name)) {
                    console.log(`Пропускаем дубликат: ${product.name}`);
                    return false; // Пропускаем дубликат
                }
                loadedProductNames.add(product.name);
                return true;
            });
            
            if (uniqueProducts.length === 0 || !data.hasMore) {
                hasMoreProducts = false;
                console.log('Больше товаров нет или все дубликаты');
            }
            
            renderProducts(uniqueProducts);
            currentPage = page;
            
            console.log(`Загружено ${uniqueProducts.length} товаров. Всего загружено: ${loadedProductNames.size} из ${maxProducts}`);
            console.log(`Страница: ${page + 1}, start: ${start}`);
        } else {
            console.error('Ошибка API:', data.error);
            // Если API недоступен, используем моковые данные
            const products = generateMockProducts(start, productsPerPage);
            renderProducts(products);
            currentPage = page;
        }
        
    } catch (error) {
        console.error('Ошибка загрузки товаров:', error);
        // При ошибке используем моковые данные
        const products = generateMockProducts(start, productsPerPage);
        renderProducts(products);
        currentPage = page;
    } finally {
        isLoading = false;
    }
}

// Генерация моковых товаров для демонстрации
function generateMockProducts(start, limit) {
    const products = [];
    const productNames = [
        'Ernie Ball 2221 Regular Slinky 10-46',
        'Rotosound R13 Roto Greys 13-54',
        'Dunlop DEN1046 Nickel Wound Light 10-46',
        'GHS Boomers GBTM 11-50 Medium',
        'Fender 250M Nickel-Plated Steel 11-49 Medium'
    ];
    
    for (let i = 0; i < limit && (start + i) < maxProducts; i++) {
        const productIndex = (start + i) % productNames.length;
        products.push({
            id: start + i + 1,
            name: productNames[productIndex],
            oldPrice: 400 + Math.floor(Math.random() * 100),
            newPrice: 350 + Math.floor(Math.random() * 50),
            image: 'Goods/Electric_guitar_strings/2221/Ernie_Ball_2221_10-46_150.jpg',
            inStock: true
        });
    }
    
    return products;
}

// Функция рендеринга товаров
function renderProducts(products) {
    const container = document.querySelector('.inner');
    
    products.forEach((product, index) => {
        const productCard = createProductCard(product, currentPage * productsPerPage + index + 1);
        container.appendChild(productCard);
    });
    
    // Настраиваем обработчики для новых изображений
    setupImageHandlers();
}

// Создание карточки товара
function createProductCard(product, btnId) {
    // Определяем класс кнопки и текст
    let buttonClass = 'btn';
    let buttonText = 'Купить';
    
    // Статус товара
    const status = product.inStock ? 'В наличии' : 'Нет в наличии';
    
    if (status.includes('производства')) {
        buttonClass = 'btn discontinued';
        buttonText = 'Снят';
    }
    
    return createProductCardWithPopup(product, btnId, buttonClass);
}

// Обработчик прокрутки для бесконечной загрузки
function handleScroll() {
    if ((window.innerHeight + window.scrollY) >= document.body.offsetHeight - 1000) {
        console.log(`Прокрутка: isLoading=${isLoading}, hasMoreProducts=${hasMoreProducts}, currentPage=${currentPage}`);
        if (!isLoading && hasMoreProducts) {
            console.log('Запускаем загрузку дополнительных товаров...');
            loadMoreProducts();
        } else if (isLoading) {
            console.log('Загрузка уже идет, пропускаем...');
        } else if (!hasMoreProducts) {
            console.log('Больше товаров нет, пропускаем...');
        }
    }
}

// Функция загрузки дополнительных страниц товаров
async function loadMoreProducts() {
    if (isLoading || !hasMoreProducts) return;
    
    isLoading = true;
    const nextPage = currentPage + 1;
    
    // Показываем индикатор загрузки
    showLoadingIndicator();
    
    try {
        console.log(`Загружаем страницу ${nextPage + 1} товаров с сайта...`);
        
        // Получаем данные следующей страницы с сайта
        const siteData = await fetchProductData(nextPage);
        
        if (siteData && siteData.length > 0) {
            // Фильтруем дубликаты
            const uniqueProducts = siteData.filter(product => {
                if (loadedProductNames.has(product.title)) {
                    console.log(`Пропускаем дубликат: ${product.title}`);
                    return false;
                }
                loadedProductNames.add(product.title);
                return true;
            });
            
            if (uniqueProducts.length > 0) {
                // Убираем индикатор загрузки
                hideLoadingIndicator();
                
                // Рендерим новые товары
                const container = document.querySelector('.inner');
                const startIndex = loadedProductNames.size - uniqueProducts.length;
                
                uniqueProducts.forEach((product, index) => {
                    const productCard = createProductCardFromSiteData(product, startIndex + index + 1);
                    container.appendChild(productCard);
                });
                
                // Настраиваем обработчики для новых изображений
                setupImageHandlers();
                
                console.log(`Загружено ${uniqueProducts.length} новых товаров со страницы ${nextPage + 1}`);
            }
            
            // Проверяем, есть ли еще товары
            hasMoreProducts = siteData.length >= productsPerPage;
            currentPage = nextPage;
            
            console.log(`Всего загружено товаров: ${loadedProductNames.size}`);
            console.log(`Обновлено hasMoreProducts: ${hasMoreProducts} (siteData.length: ${siteData.length}, productsPerPage: ${productsPerPage})`);
            
            // Сохраняем состояние после загрузки новой страницы
            saveState();
            
        } else {
            // Если товаров нет, значит достигли конца
            hasMoreProducts = false;
            hideLoadingIndicator();
            showEndMessage();
            console.log('Достигнут конец списка товаров');
        }
        
    } catch (error) {
        console.error('Ошибка загрузки дополнительных товаров:', error);
        hasMoreProducts = false;
        hideLoadingIndicator();
    } finally {
        isLoading = false;
    }
}

// Показать индикатор загрузки
function showLoadingIndicator() {
    const container = document.querySelector('.inner');
    const loadingDiv = document.createElement('div');
    loadingDiv.id = 'loading-indicator';
    loadingDiv.innerHTML = `
        <div style="
            display: flex;
            flex-direction: column;
            align-items: center;
            justify-content: center;
            padding: 20px;
            text-align: center;
        ">
            <div style="
                width: 30px;
                height: 30px;
                border: 3px solid #f3f3f3;
                border-top: 3px solid #007bff;
                border-radius: 50%;
                animation: spin 1s linear infinite;
                margin-bottom: 10px;
            "></div>
            <p style="color: #666; font-size: 14px; margin: 0;">Загружаем еще товары...</p>
        </div>
    `;
    container.appendChild(loadingDiv);
}

// Скрыть индикатор загрузки
function hideLoadingIndicator() {
    const loadingDiv = document.getElementById('loading-indicator');
    if (loadingDiv) {
        loadingDiv.remove();
    }
}

// Показать сообщение о конце списка
function showEndMessage() {
    const container = document.querySelector('.inner');
    const endDiv = document.createElement('div');
    endDiv.innerHTML = `
        <div style="
            text-align: center;
            padding: 20px;
            color: #666;
            font-size: 14px;
        ">
            <p>Все товары загружены</p>
        </div>
    `;
    container.appendChild(endDiv);
}

// Создание заставки загрузки
function createLoadingScreen() {
    const container = document.querySelector('.inner');
    container.innerHTML = `
        <div class="loading-screen" style="
            display: flex;
            flex-direction: column;
            align-items: center;
            justify-content: center;
            height: 300px;
            width: 100%;
            text-align: center;
        ">
            <div class="loading-spinner" style="
                width: 50px;
                height: 50px;
                border: 4px solid #f3f3f3;
                border-top: 4px solid #007bff;
                border-radius: 50%;
                animation: spin 1s linear infinite;
                margin-bottom: 20px;
            "></div>
            <h3 style="color: #333; margin-bottom: 10px;">Загружаем товары...</h3>
            <p style="color: #666; font-size: 14px;">Получаем актуальные цены с сайта</p>
        </div>
    `;
    
    // Добавляем CSS анимацию
    const style = document.createElement('style');
    style.textContent = `
        @keyframes spin {
            0% { transform: rotate(0deg); }
            100% { transform: rotate(360deg); }
        }
    `;
    document.head.appendChild(style);
}

// Инициализация
document.addEventListener('DOMContentLoaded', function() {
    // Инициализируем обработчики всплывающего окна
    initPopupHandlers();
    
    // Показываем заставку загрузки
    createLoadingScreen();
    
    // Загружаем реальные товары с сайта
    loadRealProducts();
    
    // Добавляем обработчик прокрутки
    window.addEventListener('scroll', handleScroll);
    
    // Настраиваем автосохранение состояния
    startAutoSave();
    setupBeforeUnload();
    
    console.log('Приложение инициализировано с автосохранением состояния и всплывающими окнами');
});

// Функция загрузки реальных товаров с сайта
async function loadRealProducts() {
    try {
        // Пытаемся восстановить состояние
        const stateRestored = loadState();
        
        if (stateRestored && loadedProductNames.size > 0) {
            console.log('Восстанавливаем сохраненное состояние...');
            await restoreAllProducts();
        } else {
            console.log('Загружаем первую страницу товаров с сайта...');
            await loadFirstPage();
        }
        
    } catch (error) {
        console.error('Ошибка загрузки реальных товаров:', error);
        // При ошибке используем моковые данные
        loadProducts(0);
    }
}

// Загрузка первой страницы
async function loadFirstPage() {
    const siteData = await fetchProductData(0);
    
    if (siteData && siteData.length > 0) {
        // Очищаем контейнер
        const container = document.querySelector('.inner');
        container.innerHTML = '';
        
        // Рендерим товары первой страницы
        siteData.forEach((product, index) => {
            const productCard = createProductCardFromSiteData(product, index + 1);
            container.appendChild(productCard);
        });
        
        // Настраиваем обработчики для новых изображений
        setupImageHandlers();
        
        console.log(`Загружено ${siteData.length} товаров с первой страницы сайта`);
        
        // Обновляем переменные для пагинации
        maxProducts = Math.max(377, siteData.length);
        hasMoreProducts = siteData.length >= productsPerPage;
        
        // Добавляем загруженные товары в отслеживание
        siteData.forEach(product => {
            loadedProductNames.add(product.title);
        });
        
        // Сохраняем состояние
        saveState();
        
    } else {
        // Если не удалось загрузить, используем моковые данные
        console.log('Не удалось загрузить товары с сайта, используем моковые данные');
        loadProducts(0);
    }
}

// Восстановление всех загруженных товаров
async function restoreAllProducts() {
    console.log(`Восстанавливаем ${loadedProductNames.size} товаров с ${currentPage + 1} страниц...`);
    
    // Очищаем контейнер
    const container = document.querySelector('.inner');
    container.innerHTML = '';
    
    // Загружаем все страницы по порядку
    for (let page = 0; page <= currentPage; page++) {
        try {
            console.log(`Восстанавливаем страницу ${page + 1}...`);
            const siteData = await fetchProductData(page);
            
            if (siteData && siteData.length > 0) {
                // Фильтруем только те товары, которые были загружены ранее
                const restoredProducts = siteData.filter(product => 
                    loadedProductNames.has(product.title)
                );
                
                // Рендерим товары
                restoredProducts.forEach((product, index) => {
                    const globalIndex = page * productsPerPage + index;
                    const productCard = createProductCardFromSiteData(product, globalIndex + 1);
                    container.appendChild(productCard);
                });
                
                // Настраиваем обработчики для новых изображений
                setupImageHandlers();
                
                console.log(`Восстановлено ${restoredProducts.length} товаров со страницы ${page + 1}`);
            }
            
            // Небольшая задержка между запросами
            if (page < currentPage) {
                await new Promise(resolve => setTimeout(resolve, 100));
            }
            
        } catch (error) {
            console.error(`Ошибка восстановления страницы ${page + 1}:`, error);
        }
    }
    
    console.log(`Восстановление завершено. Всего товаров: ${loadedProductNames.size}`);
    
    // Обновляем hasMoreProducts на основе реального количества загруженных товаров
    // Проверяем, есть ли еще товары для загрузки
    const totalLoadedProducts = loadedProductNames.size;
    const expectedProductsOnCurrentPages = (currentPage + 1) * productsPerPage;
    
    // Если загружено меньше товаров, чем ожидается на текущих страницах,
    // значит на последней странице было меньше товаров, чем productsPerPage,
    // и больше товаров нет
    hasMoreProducts = totalLoadedProducts >= expectedProductsOnCurrentPages;
    
    // Дополнительная проверка: если мы на первой странице и товаров меньше 60,
    // значит больше товаров нет
    if (currentPage === 0 && totalLoadedProducts < productsPerPage) {
        hasMoreProducts = false;
    }
    
    console.log(`Обновлено hasMoreProducts: ${hasMoreProducts} (загружено: ${totalLoadedProducts}, ожидается: ${expectedProductsOnCurrentPages})`);
    
    // Убеждаемся, что isLoading сброшен
    isLoading = false;
    console.log('Восстановление завершено, isLoading сброшен');
    
    // Восстанавливаем позицию прокрутки
    setTimeout(() => {
        if (savedScrollPosition > 0) {
            window.scrollTo(0, savedScrollPosition);
            console.log(`Позиция прокрутки восстановлена: ${savedScrollPosition}px`);
        }
    }, 100);
}

// Создание звездочек рейтинга
function createRatingStars(rating) {
    const fullStars = Math.floor(rating);
    const hasHalfStar = rating % 1 >= 0.5;
    const emptyStars = 5 - fullStars - (hasHalfStar ? 1 : 0);
    
    let starsHTML = '';
    
    // Полные звезды
    for (let i = 0; i < fullStars; i++) {
        starsHTML += '<span style="color: #FFD700; font-size: 16px;">★</span>';
    }
    
    // Половина звезды
    if (hasHalfStar) {
        starsHTML += '<span style="color: #FFD700; font-size: 16px;">☆</span>';
    }
    
    // Пустые звезды
    for (let i = 0; i < emptyStars; i++) {
        starsHTML += '<span style="color: #ddd; font-size: 16px;">☆</span>';
    }
    
    return starsHTML;
}

// Создание карточки товара из данных сайта
function createProductCardFromSiteData(product, btnId) {
    // Статус товара
    const status = product.availability || 'В наличии';
    
    // Определяем класс кнопки и текст
    let buttonClass = 'btn';
    let buttonText = 'Купить';
    
    if (status.includes('производства')) {
        buttonClass = 'btn discontinued';
        buttonText = 'Снят';
    }
    
    return createProductCardFromSiteDataWithPopup(product, btnId, buttonClass);
}

Telegram.WebApp.onEvent("mainButtonClicked", function(){
	tg.sendData(item);
});

let usercard = document.getElementById("usercard");

let p = document.createElement("p");

p.innerText = `${tg.initDataUnsafe.user.first_name}
${tg.initDataUnsafe.user.last_name}`;

usercard.appendChild(p);

// Получение данных с сайта guitarstrings.com.ua
async function fetchProductData(page = 0) {
    try {
        // Используем прокси для обхода CORS
        const proxyUrl = 'https://api.allorigins.win/raw?url=';
        let targetUrl = 'https://guitarstrings.com.ua/electro';
        
        // Добавляем параметр start для пагинации
        if (page > 0) {
            const start = page * productsPerPage;
            targetUrl += `?start=${start}`;
        }
        
        console.log(`Загружаем страницу ${page + 1}: ${targetUrl}`);
        
        const response = await fetch(proxyUrl + encodeURIComponent(targetUrl));
        
        if (!response.ok) {
            throw new Error(`HTTP error! status: ${response.status}`);
        }
        
        const html = await response.text();
        return parseSiteHTML(html);
        
    } catch (error) {
        console.error('Ошибка получения данных с сайта:', error);
        throw error;
    }
}

// Парсинг HTML с сайта
function parseSiteHTML(html) {
    const parser = new DOMParser();
    const doc = parser.parseFromString(html, 'text/html');
    
    const products = [];
    
    // Находим все карточки товаров - используем более широкий селектор
    const productCards = doc.querySelectorAll('.product.vm-col, .browseProductContainer, .product-item');
    
    console.log(`Найдено ${productCards.length} карточек товаров на странице`);
    
    productCards.forEach((card, index) => {
        try {
            // Извлечение названия товара - ищем в разных местах
            const titleElement = card.querySelector('h2 a, h3 a, .product-title a, .product-name a');
            const title = titleElement ? titleElement.textContent.trim() : '';
            
            // Извлечение изображения - ищем в разных местах
            const imgElement = card.querySelector('.browseProductImage, .product-image img, .product-thumb img');
            const imageSrc = imgElement ? imgElement.src : '';
            const fullImageUrl = imageSrc.startsWith('http') ? imageSrc : `https://guitarstrings.com.ua${imageSrc}`;
            
            // Извлечение статуса наличия - ищем в разных местах
            const availabilityElement = card.querySelector('.availability span, .stock-status, .product-status');
            const availability = availabilityElement ? availabilityElement.textContent.trim() : 'В наличии';
            
            // Извлечение цен - ищем в разных местах
            const oldPriceElement = card.querySelector('.PricebasePrice, .old-price, .price-old');
            const newPriceElement = card.querySelector('.PricesalesPrice, .new-price, .price-current');
            
            let oldPrice = oldPriceElement ? oldPriceElement.textContent.trim() : '';
            let newPrice = newPriceElement ? newPriceElement.textContent.trim() : '';
            
            // Убираем слово "цена" из цен
            oldPrice = oldPrice.replace(/цена/gi, '').trim();
            newPrice = newPrice.replace(/цена/gi, '').trim();
            
            // Убираем двоеточие и лишние пробелы
            oldPrice = oldPrice.replace(/[:：]/g, '').replace(/\s+/g, ' ').trim();
            newPrice = newPrice.replace(/[:：]/g, '').replace(/\s+/g, ' ').trim();
            
            // Убираем дублирующееся "грн" из красной цены
            newPrice = newPrice.replace(/\s*грн\s*грн\s*/g, ' грн ').trim();
            
            // Извлечение рейтинга
            const ratingElement = card.querySelector('.current-rating');
            let rating = 0;
            let ratingText = '';
            
            if (ratingElement) {
                // Получаем ширину элемента рейтинга (например, 92.00%)
                const ratingWidth = ratingElement.style.width;
                if (ratingWidth) {
                    const percentage = parseFloat(ratingWidth.replace('%', ''));
                    rating = Math.round((percentage / 100) * 5 * 10) / 10; // Конвертируем в 5-балльную шкалу
                }
            }
            
            // Извлечение текста рейтинга (например, "(4.6 - 10 голосов)")
            // Убрано, так как эта информация больше не отображается
            const ratingTextElement = card.querySelector('.vrvote-count small');
            if (ratingTextElement) {
                ratingText = ratingTextElement.textContent.trim();
            }
            
            if (title) {
                products.push({
                    index: index,
                    title: title,
                    imageSrc: fullImageUrl,
                    availability: availability,
                    oldPrice: oldPrice,
                    newPrice: newPrice,
                    rating: rating,
                    ratingText: ratingText
                });
            }
            
        } catch (error) {
            console.error(`Ошибка парсинга товара ${index}:`, error);
        }
    });
    
    console.log(`Успешно распарсено ${products.length} товаров`);
    return products;
}

// Функции для сохранения и восстановления состояния
function saveState() {
    const state = {
        currentPage: currentPage,
        loadedProductNames: Array.from(loadedProductNames),
        maxProducts: maxProducts,
        hasMoreProducts: hasMoreProducts,
        scrollPosition: window.scrollY,
        timestamp: Date.now()
    };
    
    try {
        localStorage.setItem('shopState', JSON.stringify(state));
        console.log('Состояние сохранено:', state);
    } catch (error) {
        console.error('Ошибка сохранения состояния:', error);
    }
}

function loadState() {
    try {
        const savedState = localStorage.getItem('shopState');
        if (savedState) {
            const state = JSON.parse(savedState);
            
            // Проверяем, не устарели ли данные (больше 1 часа)
            const isExpired = Date.now() - state.timestamp > 60 * 60 * 1000;
            
            if (!isExpired) {
                currentPage = state.currentPage || 0;
                loadedProductNames = new Set(state.loadedProductNames || []);
                maxProducts = state.maxProducts || 377;
                hasMoreProducts = state.hasMoreProducts !== false;
                savedScrollPosition = state.scrollPosition || 0;
                
                console.log('Состояние восстановлено:', state);
                return true;
            } else {
                console.log('Сохраненное состояние устарело, начинаем заново');
                clearState();
            }
        }
    } catch (error) {
        console.error('Ошибка загрузки состояния:', error);
        clearState();
    }
    return false;
}

function clearState() {
    try {
        localStorage.removeItem('shopState');
        console.log('Состояние очищено');
    } catch (error) {
        console.error('Ошибка очистки состояния:', error);
    }
}

// Автоматическое сохранение состояния каждые 30 секунд
function startAutoSave() {
    setInterval(() => {
        if (loadedProductNames.size > 0) {
            saveState();
        }
    }, 30000); // 30 секунд
}

// Сохранение состояния перед уходом со страницы
function setupBeforeUnload() {
    window.addEventListener('beforeunload', () => {
        saveState();
    });
    
    // Также сохраняем при скрытии страницы (для мобильных устройств)
    document.addEventListener('visibilitychange', () => {
        if (document.hidden) {
            saveState();
        }
    });
}

// Функция для принудительного сброса состояния
function resetState() {
    clearState();
    currentPage = 0;
    isLoading = false;
    hasMoreProducts = true;
    loadedProductNames.clear();
    savedScrollPosition = 0;
    
    // Перезагружаем страницу
    window.location.reload();
}

// Функция для обработки загрузки изображений
function setupImageHandlers() {
    const images = document.querySelectorAll('.img');
    images.forEach(img => {
        img.addEventListener('load', function() {
            this.classList.add('loaded');
        });
        
        img.addEventListener('error', function() {
            this.classList.add('loaded');
        });
    });
}

// Экспорт функций для использования в консоли
window.saveState = saveState;
window.loadState = loadState;
window.clearState = clearState;
window.resetState = resetState;

// Функции для работы с всплывающим окном
function showDiscontinuedPopup() {
    const popup = document.getElementById('discontinuedPopup');
    if (popup) {
        popup.classList.add('show');
        document.body.classList.add('popup-open');
    }
}

function hideDiscontinuedPopup() {
    const popup = document.getElementById('discontinuedPopup');
    if (popup) {
        popup.classList.remove('show');
        document.body.classList.remove('popup-open');
    }
}

// Инициализация обработчиков всплывающего окна
function initPopupHandlers() {
    const popup = document.getElementById('discontinuedPopup');
    const closeBtn = document.getElementById('popupClose');
    
    if (closeBtn) {
        closeBtn.addEventListener('click', hideDiscontinuedPopup);
    }
    
    if (popup) {
        // Закрытие по клику вне окна
        popup.addEventListener('click', function(e) {
            if (e.target === popup) {
                hideDiscontinuedPopup();
            }
        });
        
        // Закрытие по нажатию Escape
        document.addEventListener('keydown', function(e) {
            if (e.key === 'Escape' && popup.classList.contains('show')) {
                hideDiscontinuedPopup();
            }
        });
    }
}

// Обновленная функция создания карточки товара с проверкой на discontinued
function createProductCardWithPopup(product, btnId, buttonClass) {
    const card = document.createElement('div');
    card.className = 'product-card';
    
    // Проверяем наличие изображения
    let imageSrc = product.image;
    if (!imageSrc || imageSrc === '') {
        imageSrc = 'Goods/Electric_guitar_strings/2221/Ernie_Ball_2221_10-46_150.jpg';
    }
    
    // Проверяем наличие цен
    const oldPrice = product.oldPrice || 400;
    let newPrice = product.newPrice || 350;
    
    // Убираем "грн" из красной цены, так как оно добавляется через CSS
    newPrice = newPrice.replace(/\s*грн\s*/g, '').trim();
    
    // Статус товара
    const status = product.inStock ? 'В наличии' : 'Нет в наличии';
    const statusClass = product.inStock ? 'product-status' : 'product-status out-of-stock';
    
    // Определяем класс кнопки и текст
    let buttonText = 'Купить';
    let newPriceClass = 'new-price';
    
    if (status.includes('производства')) {
        buttonText = 'Снят';
        newPriceClass = 'new-price discontinued';
    }
    
    // Обработка названия товара
    const productName = product.name || 'Название товара не указано';
    
    card.innerHTML = `
        <div class="product-card-top">
            <img src="${imageSrc}" alt="${productName}" class="img" onerror="this.src='Goods/Electric_guitar_strings/2221/Ernie_Ball_2221_10-46_150.jpg'">
            <div class="product-title" style="text-align:center;">${productName}</div>
        </div>
        <div class="product-card-bottom">
            <div class="${statusClass}">${status}</div>
            <div class="product-bottom-row">
                <div class="product-prices">
                    <div class="old-price">${oldPrice} грн</div>
                    <div class="${newPriceClass}">${newPrice}</div>
                </div>
                <button class="${buttonClass}" id="btn${btnId}">${buttonText}</button>
            </div>
        </div>
    `;
    
    // Добавляем обработчик для кнопки
    const btn = card.querySelector(`#btn${btnId}`);
    btn.addEventListener("click", function(){
        // Проверяем, является ли товар снятым с производства
        if (buttonClass.includes('discontinued')) {
            showDiscontinuedPopup();
        } else {
            if (tg.MainButton.isVisible) {
                tg.MainButton.hide();
            }
            else {
                tg.MainButton.setText(`Вы выбрали товар ${btnId}!`);
                item = btnId.toString();
                tg.MainButton.show();
            }
        }
    });
    
    return card;
}

// Обновленная функция создания карточки товара из данных сайта с проверкой на discontinued
function createProductCardFromSiteDataWithPopup(product, btnId, buttonClass) {
    const card = document.createElement('div');
    card.className = 'product-card';
    
    // Проверяем наличие изображения
    let imageSrc = product.imageSrc;
    if (!imageSrc || imageSrc === '') {
        imageSrc = 'Goods/Electric_guitar_strings/2221/Ernie_Ball_2221_10-46_150.jpg';
    }
    
    // Исправляем URL изображения, если он относительный
    if (imageSrc && !imageSrc.startsWith('http') && !imageSrc.startsWith('data:')) {
        if (imageSrc.startsWith('/')) {
            imageSrc = 'https://guitarstrings.com.ua' + imageSrc;
        } else if (!imageSrc.startsWith('Goods/')) {
            imageSrc = 'https://guitarstrings.com.ua/' + imageSrc;
        }
    }
    
    // Проверяем наличие цен
    const oldPrice = product.oldPrice || '400 грн';
    let newPrice = product.newPrice || '350 грн';
    
    // Убираем "грн" из красной цены, так как оно добавляется через CSS
    newPrice = newPrice.replace(/\s*грн\s*/g, '').trim();
    
    // Статус товара
    const status = product.availability || 'В наличии';
    let statusClass = 'product-status';
    
    // Определяем класс статуса в зависимости от текста
    if (status.includes('наличии')) {
        statusClass = 'product-status';
    } else if (status.includes('Ожидается')) {
        statusClass = 'product-status expected';
    } else if (status.includes('заказ')) {
        statusClass = 'product-status on-order';
    } else if (status.includes('производства')) {
        statusClass = 'product-status discontinued';
    } else {
        statusClass = 'product-status out-of-stock';
    }
    
    // Определяем класс кнопки и текст
    let buttonText = 'Купить';
    
    if (status.includes('производства')) {
        buttonText = 'Снят';
    }
    
    // Обработка названия товара
    const productName = product.title || 'Название товара не указано';
    
    // Создание звездочек рейтинга
    const rating = product.rating || 0;
    const ratingText = product.ratingText || '';
    const starsHTML = createRatingStars(rating);
    
    card.innerHTML = `
        <div class="product-card-top">
            <img src="${imageSrc}" alt="${productName}" class="img" onerror="this.src='Goods/Electric_guitar_strings/2221/Ernie_Ball_2221_10-46_150.jpg'">
            <div class="product-title" style="text-align:center;">${productName}</div>
        </div>
        <div class="product-card-bottom">
            <div class="${statusClass}">${status}</div>
            <div class="product-rating" style="margin: 5px 0; text-align: left;">
                ${starsHTML}
            </div>
            <div class="product-bottom-row">
                <div class="product-prices">
                    <div class="old-price">${oldPrice}</div>
                    <div class="new-price" data-price="${newPrice}">${newPrice}</div>
                </div>
                <button class="${buttonClass}" id="btn${btnId}">${buttonText}</button>
            </div>
        </div>
    `;
    
    // Добавляем обработчик для кнопки
    const btn = card.querySelector(`#btn${btnId}`);
    btn.addEventListener("click", function(){
        // Проверяем, является ли товар снятым с производства
        if (buttonClass.includes('discontinued')) {
            showDiscontinuedPopup();
        } else {
            if (tg.MainButton.isVisible) {
                tg.MainButton.hide();
            }
            else {
                tg.MainButton.setText(`Вы выбрали товар ${btnId}!`);
                item = btnId.toString();
                tg.MainButton.show();
            }
        }
    });
    
    return card;
}








