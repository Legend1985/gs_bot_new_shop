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
let lastLoadTime = 0; // Время последней загрузки для предотвращения частых запросов
const minLoadInterval = 1000; // Минимальный интервал между загрузками (1 секунда)

// Дополнительные переменные для Chrome
let isChrome = /Chrome/.test(navigator.userAgent) && /Google Inc/.test(navigator.vendor);
let chromeRetryCount = 0;
const maxChromeRetries = 10; // Увеличиваем количество попыток для Chrome
let chromeCacheBuster = Date.now(); // Для обхода кеша Chrome
let currentProxyIndex = 0; // Индекс текущего прокси
let proxyUrls = [
    'https://api.allorigins.win/raw?url=',
    'https://cors-anywhere.herokuapp.com/',
    'https://thingproxy.freeboard.io/fetch/'
]; // Массив прокси для fallback

// Счетчик успешно загруженных страниц для Chrome
let chromeSuccessfulPages = 0;
const maxChromePages = Math.ceil(377 / productsPerPage); // Максимальное количество страниц для 377 товаров

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
            
            // Для Chrome добавляем дополнительную логику
            if (isChrome && chromeRetryCount < maxChromeRetries) {
                console.log('Chrome: ошибка API, пробуем повторить...');
                chromeRetryCount++;
                
                // Небольшая задержка перед повторной попыткой
                await new Promise(resolve => setTimeout(resolve, 2000));
                
                // Пробуем загрузить снова
                isLoading = false;
                return await loadProducts(page);
            }
            
            // Если API недоступен, используем моковые данные
            const products = generateMockProducts(start, productsPerPage);
            renderProducts(products);
            currentPage = page;
        }
        
    } catch (error) {
        console.error('Ошибка загрузки товаров:', error);
        
        // Для Chrome добавляем дополнительную логику
        if (isChrome && chromeRetryCount < maxChromeRetries) {
            console.log('Chrome: ошибка загрузки товаров, пробуем повторить...');
            chromeRetryCount++;
            
            // Небольшая задержка перед повторной попыткой
            await new Promise(resolve => setTimeout(resolve, 2000));
            
            // Пробуем загрузить снова
            isLoading = false;
            return await loadProducts(page);
        }
        
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
    
    // Скрываем заставку загрузки при первом рендеринге
    hideLoadingScreen();
    
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
    // Проверяем, нужно ли загружать больше товаров
    if ((window.innerHeight + window.scrollY) >= document.body.offsetHeight - 1000) {
        const currentTime = Date.now();
        
        console.log(`Прокрутка: isLoading=${isLoading}, hasMoreProducts=${hasMoreProducts}, currentPage=${currentPage}, timeSinceLastLoad=${currentTime - lastLoadTime}ms`);
        
        // Проверяем, прошло ли достаточно времени с последней загрузки
        if (currentTime - lastLoadTime < minLoadInterval) {
            console.log('Слишком мало времени прошло с последней загрузки, пропускаем...');
            return;
        }
        
        // Улучшенная проверка для Chrome: если загрузка зависла, сбрасываем
        if (isChrome && isLoading && (currentTime - lastLoadTime > 35000)) {
            console.log('Chrome: загрузка зависла более 35 секунд, сбрасываем состояние...');
            resetLoadingState();
            return;
        }
        
        // Проверяем, достигли ли мы максимального количества страниц для Chrome
        if (isChrome && currentPage >= maxChromePages) {
            console.log(`Chrome: достигнут лимит страниц (${maxChromePages}), больше товаров нет`);
            hasMoreProducts = false;
            return;
        }
        
        if (!isLoading && hasMoreProducts) {
            console.log('Запускаем загрузку дополнительных товаров...');
            loadMoreProducts();
        } else if (isLoading) {
            console.log('Загрузка уже идет, пропускаем...');
        } else if (!hasMoreProducts) {
            console.log('Больше товаров нет, пропускаем...');
        }
    }
    
    // Улучшенная проверка: если загрузка зависла более 40 секунд, сбрасываем состояние
    if (isLoading && (Date.now() - lastLoadTime > 40000)) {
        console.log('Загрузка зависла более 40 секунд, сбрасываем состояние...');
        resetLoadingState();
    }
}

// Функция загрузки дополнительных страниц товаров
async function loadMoreProducts() {
    if (isLoading || !hasMoreProducts) {
        console.log(`loadMoreProducts: пропускаем - isLoading=${isLoading}, hasMoreProducts=${hasMoreProducts}`);
        return;
    }
    
    isLoading = true;
    const nextPage = currentPage + 1;
    
    console.log(`Начинаем загрузку страницы ${nextPage + 1}...`);
    
    // Показываем индикатор загрузки
    showLoadingIndicator();
    
    try {
        console.log(`Загружаем страницу ${nextPage + 1} товаров с сайта...`);
        
        // Получаем данные следующей страницы с сайта
        const siteData = await fetchProductData(nextPage);
        
        if (siteData && siteData.length > 0) {
            console.log(`Получено ${siteData.length} товаров со страницы ${nextPage + 1}`);
            
            // Фильтруем дубликаты
            const uniqueProducts = siteData.filter(product => {
                if (loadedProductNames.has(product.title)) {
                    console.log(`Пропускаем дубликат: ${product.title}`);
                    return false;
                }
                loadedProductNames.add(product.title);
                return true;
            });
            
            console.log(`После фильтрации дубликатов: ${uniqueProducts.length} уникальных товаров`);
            
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
                
                // Обновляем время последней загрузки
                lastLoadTime = Date.now();
            }
            
            // Проверяем, есть ли еще товары
            // Улучшенная логика для Chrome
            if (isChrome) {
                // Для Chrome используем более точную проверку
                chromeSuccessfulPages++;
                hasMoreProducts = loadedProductNames.size < 377 && currentPage < maxChromePages;
                
                console.log(`Chrome: успешно загружено страниц: ${chromeSuccessfulPages}/${maxChromePages}`);
                console.log(`Chrome: товаров загружено: ${loadedProductNames.size}/377`);
                console.log(`Chrome: текущая страница: ${currentPage + 1}/${maxChromePages}`);
            } else {
                // Для других браузеров оставляем старую логику
                hasMoreProducts = siteData.length >= productsPerPage;
            }
            
            currentPage = nextPage;
            
            console.log(`Всего загружено товаров: ${loadedProductNames.size}`);
            console.log(`Обновлено hasMoreProducts: ${hasMoreProducts} (siteData.length: ${siteData.length}, productsPerPage: ${productsPerPage})`);
            
            // Сохраняем состояние после загрузки новой страницы
            saveState();
            
        } else {
            console.log(`Страница ${nextPage + 1} пуста или содержит ошибки`);
            
            // Для Chrome добавляем дополнительную логику обработки пустых страниц
            if (isChrome && chromeRetryCount < maxChromeRetries) {
                console.log('Chrome: пустая страница, пробуем повторить загрузку...');
                chromeRetryCount++;
                
                // Убираем индикатор загрузки
                hideLoadingIndicator();
                
                // Небольшая задержка перед повторной попыткой
                await new Promise(resolve => setTimeout(resolve, 3000));
                
                // Сбрасываем состояние загрузки и пробуем снова
                isLoading = false;
                return;
            }
            
            // Если это не Chrome или превышен лимит попыток, считаем что товары закончились
            hasMoreProducts = false;
            currentPage = nextPage;
            
            // Убираем индикатор загрузки
            hideLoadingIndicator();
            
            // Показываем сообщение о конце списка
            showEndMessage();
        }
        
    } catch (error) {
        console.error(`Ошибка загрузки страницы ${nextPage + 1}:`, error);
        
        // Убираем индикатор загрузки
        hideLoadingIndicator();
        
        // Для Chrome добавляем дополнительную логику обработки ошибок
        if (isChrome && chromeRetryCount < maxChromeRetries) {
            console.log('Chrome: ошибка загрузки, пробуем повторить...');
            
            // Небольшая задержка перед повторной попыткой
            await new Promise(resolve => setTimeout(resolve, 3000));
            
            // Сбрасываем состояние загрузки и пробуем снова
            isLoading = false;
            return;
        }
        
        // Если это не Chrome или превышен лимит попыток, показываем ошибку
        showErrorMessage(`Ошибка загрузки товаров: ${error.message}`);
        
        // Сбрасываем состояние загрузки
        isLoading = false;
    }
}

// Показать индикатор загрузки
function showLoadingIndicator() {
    // Убираем существующий индикатор, если он есть
    hideLoadingIndicator();
    
    const container = document.querySelector('.inner');
    const loadingDiv = document.createElement('div');
    loadingDiv.id = 'loading-indicator';
    loadingDiv.className = 'loading-indicator';
    loadingDiv.innerHTML = `
        <div class="loading-spinner-small"></div>
        <p style="text-align: center; margin: 10px 0; color: #666; font-size: 14px;">Загружаем еще товары...</p>
    `;
    
    // Добавляем стили для лучшей видимости
    loadingDiv.style.cssText = `
        display: flex;
        flex-direction: column;
        align-items: center;
        justify-content: center;
        padding: 20px;
        margin: 20px 0;
        background: #f9f9f9;
        border-radius: 8px;
        border: 1px solid #e0e0e0;
        box-shadow: 0 2px 4px rgba(0,0,0,0.1);
    `;
    
    container.appendChild(loadingDiv);
    
    console.log('Индикатор загрузки показан');
}

// Скрыть индикатор загрузки
function hideLoadingIndicator() {
    const loadingDiv = document.getElementById('loading-indicator');
    if (loadingDiv) {
        loadingDiv.remove();
        console.log('Индикатор загрузки скрыт');
    }
}

// Принудительный сброс состояния загрузки
function resetLoadingState() {
    console.log('Принудительный сброс состояния загрузки');
    isLoading = false;
    hideLoadingIndicator();
    
    // Убираем сообщения об ошибках
    const errorMessages = document.querySelectorAll('.error-message');
    errorMessages.forEach(msg => msg.remove());
    
    // Для Chrome добавляем дополнительную очистку
    if (isChrome) {
        console.log('Chrome: дополнительная очистка состояния...');
        
        // Сбрасываем счетчики попыток
        chromeRetryCount = 0;
        chromeCacheBuster = Date.now();
        
        // Переключаем прокси
        currentProxyIndex = (currentProxyIndex + 1) % proxyUrls.length;
        
        // Очищаем кеш браузера (если возможно)
        if ('caches' in window) {
            caches.keys().then(names => {
                names.forEach(name => {
                    if (name.includes('guitarstrings') || name.includes('allorigins')) {
                        caches.delete(name);
                        console.log('Chrome: очищен кеш для', name);
                    }
                });
            });
        }
    }
    
    // Улучшенная проверка для Chrome: проверяем, есть ли еще товары для загрузки
    if (isChrome) {
        // Для Chrome используем более точную логику
        if (hasMoreProducts && currentPage < maxChromePages && loadedProductNames.size < 377) {
            console.log(`Chrome: состояние сброшено, можно попробовать загрузить еще раз. Страница: ${currentPage + 1}/${maxChromePages}, товаров: ${loadedProductNames.size}/377`);
            
            // Добавляем небольшую задержку перед повторной попыткой
            setTimeout(() => {
                console.log('Chrome: пробуем загрузить товары после сброса...');
                if (!isLoading && hasMoreProducts) {
                    loadMoreProducts();
                }
            }, 3000);
        } else if (loadedProductNames.size >= 377) {
            console.log('Chrome: все 377 товаров загружены, завершаем загрузку');
            hasMoreProducts = false;
        } else if (currentPage >= maxChromePages) {
            console.log(`Chrome: достигнут лимит страниц (${maxChromePages}), больше товаров нет`);
            hasMoreProducts = false;
        }
    } else {
        // Для других браузеров оставляем старую логику
        if (hasMoreProducts && currentPage < 5) {
            console.log('Состояние сброшено, можно попробовать загрузить еще раз');
        } else {
            console.log('Достигнут лимит страниц или больше товаров нет');
            hasMoreProducts = false;
        }
    }
}

// Функция для мониторинга состояния загрузки
function logLoadingStatus() {
    const currentTime = Date.now();
    const timeSinceLastLoad = currentTime - lastLoadTime;
    
    console.log(`=== СТАТУС ЗАГРУЗКИ ===`);
    console.log(`Время: ${new Date().toLocaleTimeString()}`);
    console.log(`isLoading: ${isLoading}`);
    console.log(`hasMoreProducts: ${hasMoreProducts}`);
    console.log(`currentPage: ${currentPage}`);
    console.log(`Загружено товаров: ${loadedProductNames.size}`);
    console.log(`Время с последней загрузки: ${timeSinceLastLoad}ms`);
    console.log(`Позиция прокрутки: ${window.scrollY}/${document.body.offsetHeight}`);
    console.log(`Высота окна: ${window.innerHeight}`);
    
    // Дополнительная информация для Chrome
    if (isChrome) {
        console.log(`Chrome: успешно загружено страниц: ${chromeSuccessfulPages}/${maxChromePages}`);
        console.log(`Chrome: попыток: ${chromeRetryCount}/${maxChromeRetries}`);
        console.log(`Chrome: кеш-бастер: ${chromeCacheBuster}`);
        console.log(`Chrome: прокси: ${proxyUrls[currentProxyIndex]}`);
    }
    
    console.log(`========================`);
}

// Запускаем периодический мониторинг состояния
let statusMonitorInterval;
function startStatusMonitoring() {
    if (statusMonitorInterval) {
        clearInterval(statusMonitorInterval);
    }
    
    statusMonitorInterval = setInterval(() => {
        if (isLoading || hasMoreProducts) {
            logLoadingStatus();
        }
    }, 10000); // Логируем каждые 10 секунд, если идет загрузка
    
    console.log('Мониторинг состояния загрузки запущен');
}

function stopStatusMonitoring() {
    if (statusMonitorInterval) {
        clearInterval(statusMonitorInterval);
        statusMonitorInterval = null;
        console.log('Мониторинг состояния загрузки остановлен');
    }
}

// Функция для управления кнопкой сброса состояния загрузки
function updateResetButton() {
    const resetBtn = document.getElementById('resetLoadingBtn');
    const clearCacheBtn = document.getElementById('clearChromeCacheBtn');
    const forceLoadAllBtn = document.getElementById('forceLoadAllBtn');
    
    if (resetBtn) {
        // Показываем кнопку только если есть проблемы с загрузкой
        if (isLoading || (hasMoreProducts && loadedProductNames.size === 0)) {
            resetBtn.style.display = 'inline-block';
        } else {
            resetBtn.style.display = 'none';
        }
    }
    
    if (clearCacheBtn && isChrome) {
        // Показываем кнопку очистки кеша Chrome всегда, если это Chrome
        clearCacheBtn.style.display = 'inline-block';
    }
    
    if (forceLoadAllBtn && isChrome) {
        // Показываем кнопку принудительной загрузки всегда, если это Chrome
        forceLoadAllBtn.style.display = 'inline-block';
    }
}

// Показываем сообщение о конце списка
function showEndMessage() {
    const container = document.querySelector('.inner');
    const endDiv = document.createElement('div');
    endDiv.className = 'end-message';
    endDiv.innerHTML = '<p>Все товары загружены</p>';
    container.appendChild(endDiv);
}

// Показываем сообщение об ошибке
function showErrorMessage(message) {
    const container = document.querySelector('.inner');
    
    // Убираем существующие сообщения об ошибках
    const existingErrors = container.querySelectorAll('.error-message');
    existingErrors.forEach(error => error.remove());
    
    const errorDiv = document.createElement('div');
    errorDiv.className = 'error-message';
    errorDiv.innerHTML = `<p>${message}</p>`;
    container.appendChild(errorDiv);
    
    // Убираем сообщение об ошибке через 8 секунд
    setTimeout(() => {
        if (errorDiv.parentNode) {
            errorDiv.remove();
        }
    }, 8000);
    
    console.log('Показано сообщение об ошибке:', message);
}

// Показываем сообщение об успехе
function showSuccessMessage(message) {
    const container = document.querySelector('.inner');
    
    // Убираем существующие сообщения об успехе
    const existingSuccess = container.querySelectorAll('.success-message');
    existingSuccess.forEach(success => success.remove());
    
    const successDiv = document.createElement('div');
    successDiv.className = 'success-message';
    successDiv.innerHTML = `<p>✅ ${message}</p>`;
    container.appendChild(successDiv);
    
    // Убираем сообщение об успехе через 5 секунд
    setTimeout(() => {
        if (successDiv.parentNode) {
            successDiv.remove();
        }
    }, 5000);
    
    console.log('Показано сообщение об успехе:', message);
}

// Создание заставки загрузки
function createLoadingScreen() {
    const container = document.querySelector('.inner');
    container.innerHTML = `
        <div class="loading-screen">
            <div class="loading-spinner"></div>
            <h3>Загружаем товары...</h3>
            <p>Получаем актуальные цены с сайта</p>
        </div>
    `;
}

// Скрытие заставки загрузки
function hideLoadingScreen() {
    const loadingScreen = document.querySelector('.loading-screen');
    if (loadingScreen) {
        loadingScreen.style.opacity = '0';
        setTimeout(() => {
            if (loadingScreen.parentNode) {
                loadingScreen.parentNode.removeChild(loadingScreen);
            }
        }, 300);
    }
}

// Инициализация
document.addEventListener('DOMContentLoaded', function() {
    // Инициализируем обработчики всплывающего окна
    initPopupHandlers();
    
    // Показываем заставку загрузки
    createLoadingScreen();
    
    // Добавляем обработчик прокрутки
    window.addEventListener('scroll', handleScroll);
    
    // Настраиваем автосохранение состояния
    startAutoSave();
    setupBeforeUnload();
    
    // Запускаем мониторинг состояния загрузки
    startStatusMonitoring();
    
    // Настраиваем обработчик для кнопки сброса состояния загрузки
    const resetBtn = document.getElementById('resetLoadingBtn');
    if (resetBtn) {
        resetBtn.addEventListener('click', function() {
            console.log('Пользователь нажал кнопку сброса состояния загрузки');
            resetLoadingState();
            updateResetButton();
        });
    }
    
    // Настраиваем обработчик для кнопки очистки кеша Chrome
    const clearCacheBtn = document.getElementById('clearChromeCacheBtn');
    if (clearCacheBtn) {
        clearCacheBtn.addEventListener('click', function() {
            console.log('Пользователь нажал кнопку очистки кеша Chrome');
            clearChromeCache();
            
            // Показываем сообщение об успешной очистке
            showSuccessMessage('Кеш Chrome очищен! Попробуйте загрузить товары снова.');
            
            // Скрываем кнопку на некоторое время
            clearCacheBtn.style.display = 'none';
            setTimeout(() => {
                if (clearCacheBtn) {
                    clearCacheBtn.style.display = 'inline-block';
                }
            }, 5000);
        });
    }
    
    // Настраиваем обработчик для кнопки принудительной загрузки всех товаров
    const forceLoadAllBtn = document.getElementById('forceLoadAllBtn');
    if (forceLoadAllBtn) {
        forceLoadAllBtn.addEventListener('click', function() {
            console.log('Пользователь нажал кнопку принудительной загрузки всех товаров');
            
            if (isChrome) {
                // Показываем сообщение о начале загрузки
                showSuccessMessage('Начинаем принудительную загрузку всех товаров...');
                
                // Запускаем принудительную загрузку
                window.forceLoadAllProducts();
                
                // Скрываем кнопку на некоторое время
                forceLoadAllBtn.style.display = 'none';
                setTimeout(() => {
                    if (forceLoadAllBtn) {
                        forceLoadAllBtn.style.display = 'inline-block';
                    }
                }, 10000);
            } else {
                showErrorMessage('Эта функция доступна только в Chrome');
            }
        });
    }
    
    // Для Chrome добавляем дополнительную инициализацию
    if (isChrome) {
        console.log('Chrome: дополнительная инициализация...');
        
        // Принудительно очищаем кеш при загрузке
        clearChromeCache();
        
        // Добавляем обработчик для принудительной очистки кеша
        window.addEventListener('focus', clearChromeCache);
        
        // Добавляем обработчик для очистки кеша при видимости страницы
        document.addEventListener('visibilitychange', () => {
            if (!document.hidden) {
                clearChromeCache();
            }
        });
        
        // Добавляем обработчик для принудительной загрузки при прокрутке вниз
        let scrollTimeout;
        window.addEventListener('scroll', () => {
            clearTimeout(scrollTimeout);
            scrollTimeout = setTimeout(() => {
                if (window.scrollY > 1000 && loadedProductNames.size < 377 && !isLoading) {
                    console.log('Chrome: пользователь прокрутил далеко вниз, проверяем загрузку...');
                    if (hasMoreProducts) {
                        loadMoreProducts();
                    }
                }
            }, 500);
        });
    }
    
    // Загружаем реальные товары с сайта с небольшой задержкой
    setTimeout(() => {
        loadRealProducts();
    }, 100);
    
    console.log('Приложение инициализировано с автосохранением состояния, всплывающими окнами и мониторингом загрузки');
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
        
        // Для Chrome добавляем дополнительную логику
        if (isChrome && chromeRetryCount < maxChromeRetries) {
            console.log('Chrome: ошибка загрузки реальных товаров, пробуем повторить...');
            chromeRetryCount++;
            
            // Очищаем кеш Chrome
            clearChromeCache();
            
            // Небольшая задержка перед повторной попыткой
            await new Promise(resolve => setTimeout(resolve, 3000));
            
            // Пробуем загрузить снова
            try {
                await loadRealProducts();
                return;
            } catch (retryError) {
                console.error('Chrome: повторная попытка загрузки реальных товаров не удалась:', retryError);
            }
        }
        
        // Скрываем заставку загрузки
        hideLoadingScreen();
        // При ошибке используем моковые данные
        loadProducts(0);
    }
}

// Загрузка первой страницы
async function loadFirstPage() {
    try {
        console.log('Загружаем первую страницу товаров с сайта...');
        
        // Для Chrome добавляем дополнительную очистку кеша
        if (isChrome) {
            clearChromeCache();
        }
        
        const siteData = await fetchProductData(0);
        
        if (siteData && siteData.length > 0) {
            // Очищаем контейнер
            const container = document.querySelector('.inner');
            container.innerHTML = '';
            
            // Скрываем заставку загрузки
            hideLoadingScreen();
            
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
            
            // Обновляем состояние кнопки сброса
            updateResetButton();
            
        } else {
            // Если не удалось загрузить, используем моковые данные
            console.log('Не удалось загрузить товары с сайта, используем моковые данные');
            
            // Для Chrome добавляем дополнительную логику
            if (isChrome && chromeRetryCount < maxChromeRetries) {
                console.log('Chrome: первая страница пуста, пробуем повторить...');
                chromeRetryCount++;
                
                // Небольшая задержка перед повторной попыткой
                await new Promise(resolve => setTimeout(resolve, 3000));
                
                // Пробуем загрузить снова
                return await loadFirstPage();
            }
            
            hideLoadingScreen();
            loadProducts(0);
        }
        
    } catch (error) {
        console.error('Ошибка загрузки первой страницы:', error);
        
        // Для Chrome добавляем дополнительную логику
        if (isChrome && chromeRetryCount < maxChromeRetries) {
            console.log('Chrome: ошибка загрузки первой страницы, пробуем повторить...');
            chromeRetryCount++;
            
            // Небольшая задержка перед повторной попыткой
            await new Promise(resolve => setTimeout(resolve, 3000));
            
            // Пробуем загрузить снова
            return await loadFirstPage();
        }
        
        // Скрываем заставку загрузки
        hideLoadingScreen();
        // При ошибке используем моковые данные
        loadProducts(0);
    }
}

// Восстановление всех загруженных товаров
async function restoreAllProducts() {
    console.log(`Восстанавливаем ${loadedProductNames.size} товаров с ${currentPage + 1} страниц...`);
    
    // Очищаем контейнер
    const container = document.querySelector('.inner');
    container.innerHTML = '';
    
    // Для Chrome добавляем дополнительную очистку кеша
    if (isChrome) {
        clearChromeCache();
    }
    
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
            } else {
                console.warn(`Страница ${page + 1} пуста при восстановлении`);
                
                // Для Chrome добавляем дополнительную логику
                if (isChrome && chromeRetryCount < maxChromeRetries) {
                    console.log('Chrome: пустая страница при восстановлении, пробуем повторить...');
                    chromeRetryCount++;
                    
                    // Небольшая задержка перед повторной попыткой
                    await new Promise(resolve => setTimeout(resolve, 2000));
                    
                    // Пробуем загрузить страницу снова
                    const retryData = await fetchProductData(page);
                    if (retryData && retryData.length > 0) {
                        const retryProducts = retryData.filter(product => 
                            loadedProductNames.has(product.title)
                        );
                        
                        retryProducts.forEach((product, index) => {
                            const globalIndex = page * productsPerPage + index;
                            const productCard = createProductCardFromSiteData(product, globalIndex + 1);
                            container.appendChild(productCard);
                        });
                        
                        setupImageHandlers();
                        console.log(`Chrome: восстановлено ${retryProducts.length} товаров со страницы ${page + 1} после повторной попытки`);
                    }
                }
            }
            
            // Небольшая задержка между запросами
            if (page < currentPage) {
                await new Promise(resolve => setTimeout(resolve, 100));
            }
            
        } catch (error) {
            console.error(`Ошибка восстановления страницы ${page + 1}:`, error);
            
            // Для Chrome добавляем дополнительную логику
            if (isChrome && chromeRetryCount < maxChromeRetries) {
                console.log(`Chrome: ошибка восстановления страницы ${page + 1}, пробуем повторить...`);
                chromeRetryCount++;
                
                // Небольшая задержка перед повторной попыткой
                await new Promise(resolve => setTimeout(resolve, 2000));
                
                // Пробуем восстановить страницу снова
                try {
                    const retryData = await fetchProductData(page);
                    if (retryData && retryData.length > 0) {
                        const retryProducts = retryData.filter(product => 
                            loadedProductNames.has(product.title)
                        );
                        
                        retryProducts.forEach((product, index) => {
                            const globalIndex = page * productsPerPage + index;
                            const productCard = createProductCardFromSiteData(product, globalIndex + 1);
                            container.appendChild(productCard);
                        });
                        
                        setupImageHandlers();
                        console.log(`Chrome: восстановлено ${retryProducts.length} товаров со страницы ${page + 1} после повторной попытки`);
                    }
                } catch (retryError) {
                    console.error(`Chrome: повторная попытка восстановления страницы ${page + 1} не удалась:`, retryError);
                }
            }
        }
    }
    
    console.log(`Восстановление завершено. Всего товаров: ${loadedProductNames.size}`);
    
    // Скрываем заставку загрузки
    hideLoadingScreen();
    
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
    
    // Обновляем состояние кнопки сброса
    updateResetButton();
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
        console.log(`fetchProductData: начинаем загрузку страницы ${page + 1}`);
        console.log(`fetchProductData: браузер Chrome: ${isChrome}, попытка: ${chromeRetryCount + 1}`);
        
        // Выбираем прокси из массива
        const proxyUrl = proxyUrls[currentProxyIndex];
        currentProxyIndex = (currentProxyIndex + 1) % proxyUrls.length; // Переключаем прокси
        
        let targetUrl = 'https://guitarstrings.com.ua/electro';
        
        // Добавляем параметр start для пагинации
        if (page > 0) {
            const start = page * productsPerPage;
            targetUrl += `?start=${start}`;
        }
        
        // Улучшенный кеш-бастер для Chrome
        if (isChrome) {
            const separator = targetUrl.includes('?') ? '&' : '?';
            targetUrl += `${separator}_cb=${chromeCacheBuster + page}&_t=${Date.now()}&_r=${Math.random()}&_p=${page}&_v=${chromeSuccessfulPages}`;
        }
        
        console.log(`fetchProductData: загружаем страницу ${page + 1}: ${targetUrl}`);
        console.log(`fetchProductData: полный URL с прокси: ${proxyUrl + encodeURIComponent(targetUrl)}`);
        
        const startTime = Date.now();
        
        // Улучшенные заголовки для Chrome
        const fetchOptions = {
            method: 'GET',
            headers: {
                'Cache-Control': 'no-cache, no-store, must-revalidate, max-age=0',
                'Pragma': 'no-cache',
                'Expires': '0',
                'User-Agent': 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/91.0.4472.124 Safari/537.36'
            },
            // Добавляем таймаут для Chrome
            signal: isChrome ? AbortSignal.timeout(30000) : undefined // 30 секунд для Chrome
        };
        
        const response = await fetch(proxyUrl + encodeURIComponent(targetUrl), fetchOptions);
        const fetchTime = Date.now() - startTime;
        
        console.log(`fetchProductData: ответ получен за ${fetchTime}ms, статус: ${response.status}`);
        
        if (!response.ok) {
            throw new Error(`HTTP error! status: ${response.status}`);
        }
        
        const html = await response.text();
        const parseTime = Date.now() - startTime;
        console.log(`fetchProductData: HTML получен за ${parseTime}ms, размер: ${html.length} символов`);
        
        // Проверяем, что HTML содержит ожидаемый контент
        if (html.length < 1000 || !html.includes('product')) {
            console.warn(`fetchProductData: подозрительно короткий или пустой HTML для страницы ${page + 1}`);
            if (isChrome && chromeRetryCount < maxChromeRetries) {
                chromeRetryCount++;
                chromeCacheBuster = Date.now(); // Обновляем кеш-бастер
                console.log(`fetchProductData: повторная попытка для Chrome (${chromeRetryCount}/${maxChromeRetries})`);
                
                // Переключаем прокси при повторной попытке
                currentProxyIndex = (currentProxyIndex + 1) % proxyUrls.length;
                
                // Увеличиваем задержку для Chrome
                await new Promise(resolve => setTimeout(resolve, 2000 + Math.random() * 3000));
                return await fetchProductData(page); // Рекурсивный вызов
            }
        }
        
        const products = parseSiteHTML(html);
        const totalTime = Date.now() - startTime;
        console.log(`fetchProductData: страница ${page + 1} полностью обработана за ${totalTime}ms, найдено товаров: ${products.length}`);
        
        // Сбрасываем счетчик попыток при успешной загрузке
        chromeRetryCount = 0;
        
        return products;
        
    } catch (error) {
        console.error(`fetchProductData: ошибка при загрузке страницы ${page + 1}:`, error);
        
        // Для Chrome добавляем повторные попытки с улучшенной логикой
        if (isChrome && chromeRetryCount < maxChromeRetries) {
            chromeRetryCount++;
            chromeCacheBuster = Date.now();
            console.log(`fetchProductData: повторная попытка для Chrome после ошибки (${chromeRetryCount}/${maxChromeRetries})`);
            
            // Переключаем прокси при ошибке
            currentProxyIndex = (currentProxyIndex + 1) % proxyUrls.length;
            
            // Увеличиваем задержку перед повторной попыткой для Chrome
            const delay = 2000 + (chromeRetryCount * 1000) + Math.random() * 2000;
            console.log(`fetchProductData: ожидаем ${Math.round(delay)}ms перед повторной попыткой`);
            await new Promise(resolve => setTimeout(resolve, delay));
            
            return await fetchProductData(page);
        }
        
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
window.clearChromeCache = clearChromeCache; // Добавляем экспорт для Chrome

// Функция для принудительной загрузки всех товаров в Chrome
window.forceLoadAllProducts = function() {
    if (isChrome) {
        console.log('Chrome: принудительная загрузка всех товаров...');
        
        // Сбрасываем состояние
        isLoading = false;
        hasMoreProducts = true;
        chromeRetryCount = 0;
        chromeSuccessfulPages = 0;
        
        // Очищаем кеш
        clearChromeCache();
        
        // Загружаем товары постранично
        const loadNextPage = async (page) => {
            if (page >= maxChromePages || loadedProductNames.size >= 377) {
                console.log(`Chrome: загрузка завершена. Страниц: ${page}, товаров: ${loadedProductNames.size}`);
                return;
            }
            
            try {
                console.log(`Chrome: принудительно загружаем страницу ${page + 1}...`);
                const siteData = await fetchProductData(page);
                
                if (siteData && siteData.length > 0) {
                    // Фильтруем дубликаты
                    const uniqueProducts = siteData.filter(product => {
                        if (loadedProductNames.has(product.title)) {
                            return false;
                        }
                        loadedProductNames.add(product.title);
                        return true;
                    });
                    
                    if (uniqueProducts.length > 0) {
                        // Рендерим новые товары
                        const container = document.querySelector('.inner');
                        const startIndex = loadedProductNames.size - uniqueProducts.length;
                        
                        uniqueProducts.forEach((product, index) => {
                            const productCard = createProductCardFromSiteData(product, startIndex + index + 1);
                            container.appendChild(productCard);
                        });
                        
                        setupImageHandlers();
                        chromeSuccessfulPages++;
                        
                        console.log(`Chrome: страница ${page + 1} загружена, товаров: ${uniqueProducts.length}`);
                    }
                }
                
                // Загружаем следующую страницу с задержкой
                setTimeout(() => loadNextPage(page + 1), 2000);
                
            } catch (error) {
                console.error(`Chrome: ошибка загрузки страницы ${page + 1}:`, error);
                // Пробуем следующую страницу
                setTimeout(() => loadNextPage(page + 1), 3000);
            }
        };
        
        // Начинаем загрузку с первой страницы
        loadNextPage(0);
        
    } else {
        console.log('Эта функция доступна только в Chrome');
    }
};

// Функция для принудительной очистки кеша Chrome
function clearChromeCache() {
    if (isChrome && 'caches' in window) {
        caches.keys().then(names => {
            names.forEach(name => {
                if (name.includes('guitarstrings') || name.includes('allorigins') || name.includes('cors')) {
                    caches.delete(name);
                    console.log('Chrome: очищен кеш для', name);
                }
            });
        });
        
        // Обновляем кеш-бастер
        chromeCacheBuster = Date.now();
        console.log('Chrome: обновлен кеш-бастер');
    }
}

// Функции для работы с всплывающим окном
function showDiscontinuedPopup() {
    const popup = document.getElementById('discontinuedPopup');
    if (popup) {
        // Вычисляем ширину скроллбара
        const scrollbarWidth = window.innerWidth - document.documentElement.clientWidth;
        document.documentElement.style.setProperty('--scrollbar-width', scrollbarWidth + 'px');
        
        popup.classList.add('show');
        document.body.classList.add('popup-open');
    }
}

function hideDiscontinuedPopup() {
    const popup = document.getElementById('discontinuedPopup');
    if (popup) {
        popup.classList.remove('show');
        document.body.classList.remove('popup-open');
        // Удаляем CSS переменную
        document.documentElement.style.removeProperty('--scrollbar-width');
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
            <div class="img-container">
                <img src="${imageSrc}" alt="${productName}" class="img" onerror="this.src='Goods/Electric_guitar_strings/2221/Ernie_Ball_2221_10-46_150.jpg'">
            </div>
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
            <div class="img-container">
                <img src="${imageSrc}" alt="${productName}" class="img" onerror="this.src='Goods/Electric_guitar_strings/2221/Ernie_Ball_2221_10-46_150.jpg'">
            </div>
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








