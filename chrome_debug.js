// Файл для диагностики проблем Chrome с загрузкой товаров
console.log('Chrome Debug Module загружен');

// Функция для проверки состояния Chrome
function checkChromeStatus() {
    console.log('=== ДИАГНОСТИКА CHROME ===');
    console.log(`User Agent: ${navigator.userAgent}`);
    console.log(`Vendor: ${navigator.vendor}`);
    console.log(`Chrome: ${/Chrome/.test(navigator.userAgent)}`);
    console.log(`Chrome Inc: ${/Google Inc/.test(navigator.vendor)}`);
    
    // Проверяем доступные API
    console.log(`Fetch API: ${typeof fetch !== 'undefined'}`);
    console.log(`Cache API: ${'caches' in window}`);
    console.log(`Service Worker: ${'serviceWorker' in navigator}`);
    
    // Проверяем кеш
    if ('caches' in window) {
        caches.keys().then(names => {
            console.log('Доступные кеши:', names);
        });
    }
    
    console.log('========================');
}

// Функция для принудительной очистки всех кешей
function forceClearAllCaches() {
    if ('caches' in window) {
        caches.keys().then(names => {
            names.forEach(name => {
                caches.delete(name);
                console.log('Очищен кеш:', name);
            });
        });
    }
    
    // Очищаем localStorage
    localStorage.clear();
    console.log('localStorage очищен');
    
    // Очищаем sessionStorage
    sessionStorage.clear();
    console.log('sessionStorage очищен');
    
    // Принудительно перезагружаем страницу
    setTimeout(() => {
        window.location.reload(true);
    }, 1000);
}

// Функция для тестирования загрузки товаров
function testProductLoading() {
    console.log('Тестируем загрузку товаров...');
    
    // Проверяем, есть ли функция fetchProductData
    if (typeof window.fetchProductData === 'function') {
        console.log('fetchProductData доступна');
        
        // Тестируем загрузку первой страницы
        window.fetchProductData(0).then(data => {
            console.log('Тест загрузки страницы 0:', data);
        }).catch(error => {
            console.error('Ошибка теста загрузки:', error);
        });
    } else {
        console.log('fetchProductData недоступна');
    }
}

// Функция для мониторинга сетевых запросов
function monitorNetworkRequests() {
    console.log('Мониторинг сетевых запросов включен');
    
    // Перехватываем fetch запросы
    const originalFetch = window.fetch;
    window.fetch = function(...args) {
        console.log('Fetch запрос:', args[0]);
        console.log('Fetch опции:', args[1]);
        
        return originalFetch.apply(this, args).then(response => {
            console.log('Fetch ответ:', response.status, response.url);
            return response;
        }).catch(error => {
            console.error('Fetch ошибка:', error);
            throw error;
        });
    };
}

// Функция для проверки производительности
function checkPerformance() {
    console.log('=== ПРОВЕРКА ПРОИЗВОДИТЕЛЬНОСТИ ===');
    
    if ('performance' in window) {
        const perf = performance.getEntriesByType('navigation')[0];
        console.log('Время загрузки страницы:', perf.loadEventEnd - perf.loadEventStart, 'мс');
        console.log('Время до DOMContentLoaded:', perf.domContentLoadedEventEnd - perf.domContentLoadedEventStart, 'мс');
    }
    
    // Проверяем память
    if ('memory' in performance) {
        console.log('Использование памяти:', {
            used: Math.round(performance.memory.usedJSHeapSize / 1024 / 1024) + ' MB',
            total: Math.round(performance.memory.totalJSHeapSize / 1024 / 1024) + ' MB',
            limit: Math.round(performance.memory.jsHeapSizeLimit / 1024 / 1024) + ' MB'
        });
    }
    
    console.log('================================');
}

// Автоматический запуск диагностики
document.addEventListener('DOMContentLoaded', () => {
    console.log('DOM загружен, запускаем диагностику Chrome...');
    
    // Ждем немного для загрузки основного скрипта
    setTimeout(() => {
        checkChromeStatus();
        checkPerformance();
        
        // Включаем мониторинг сетевых запросов
        monitorNetworkRequests();
        
        // Тестируем загрузку товаров через 2 секунды
        setTimeout(() => {
            testProductLoading();
        }, 2000);
        
    }, 1000);
});

// Экспортируем функции для использования в консоли
window.checkChromeStatus = checkChromeStatus;
window.forceClearAllCaches = forceClearAllCaches;
window.testProductLoading = testProductLoading;
window.monitorNetworkRequests = monitorNetworkRequests;
window.checkPerformance = checkPerformance;

console.log('Chrome Debug Module готов к использованию');
console.log('Доступные команды:');
console.log('- checkChromeStatus() - проверить состояние Chrome');
console.log('- forceClearAllCaches() - принудительно очистить все кеши');
console.log('- testProductLoading() - протестировать загрузку товаров');
console.log('- monitorNetworkRequests() - включить мониторинг сетевых запросов');
console.log('- checkPerformance() - проверить производительность'); 