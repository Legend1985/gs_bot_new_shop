/**
 * Конфигурация серверов для GS Bot New Shop
 * 
 * Позволяет быстро переключаться между локальным и удаленным сервером
 * 
 * ИНСТРУКЦИЯ ПО ИСПОЛЬЗОВАНИЮ:
 * 1. Для локального тестирования: установите ENVIRONMENT = 'local'
 * 2. Для продакшена: установите ENVIRONMENT = 'production' и укажите ваш домен
 * 3. Для кастомного сервера: установите ENVIRONMENT = 'custom' и настройте custom секцию
 */

// 🔧 ГЛАВНАЯ НАСТРОЙКА - ИЗМЕНИТЕ ЗДЕСЬ ДЛЯ ПЕРЕКЛЮЧЕНИЯ ОКРУЖЕНИЯ
const ENVIRONMENT = 'local'; // 'local' | 'production' | 'custom'

// 📋 Конфигурации серверов
const SERVER_CONFIGS = {
    // 🏠 Локальная разработка
    local: {
        protocol: 'http',
        host: 'localhost',
        port: 8000,
        name: 'Локальный сервер'
    },
    
    // 🌐 Продакшен сервер
    production: {
        protocol: 'https',
        host: 'legendofmusic.com.ua', // 👈 ЗАМЕНИТЕ НА ВАШ ДОМЕН
        port: null, // null = стандартный порт (80 для http, 443 для https)
        name: 'Продакшен сервер'
    },
    
    // ⚙️ Кастомный сервер
    custom: {
        protocol: 'http',
        host: '192.168.1.100', // 👈 ЗАМЕНИТЕ НА IP ИЛИ ДОМЕН ВАШЕГО СЕРВЕРА
        port: 8000,
        name: 'Кастомный сервер'
    }
};

// 🔗 Функция получения базового URL
function getBaseUrl() {
    const config = SERVER_CONFIGS[ENVIRONMENT];
    
    if (!config) {
        throw new Error(`Неизвестное окружение: ${ENVIRONMENT}. Доступные: ${Object.keys(SERVER_CONFIGS).join(', ')}`);
    }
    
    let url = `${config.protocol}://${config.host}`;
    
    // Добавляем порт только если он указан
    if (config.port) {
        url += `:${config.port}`;
    }
    
    return url;
}

// 🔗 Функция получения API URL
function getApiUrl(endpoint = '') {
    const baseUrl = getBaseUrl();
    const cleanEndpoint = endpoint.startsWith('/') ? endpoint : `/${endpoint}`;
    return `${baseUrl}/api${cleanEndpoint}`;
}

// 🔗 Функция получения URL для проксирования
function getProxyUrl(targetUrl) {
    const baseUrl = getBaseUrl();
    return `${baseUrl}/proxy_fetch?url=${encodeURIComponent(targetUrl)}`;
}

// 📊 Функция получения информации о текущем окружении
function getEnvironmentInfo() {
    const config = SERVER_CONFIGS[ENVIRONMENT];
    return {
        environment: ENVIRONMENT,
        name: config.name,
        baseUrl: getBaseUrl(),
        apiUrl: getApiUrl(),
        config: config
    };
}

// 🔍 Функция для отладки - показывает текущую конфигурацию
function debugConfig() {
    console.log('🔧 Текущая конфигурация сервера:');
    console.log('Environment:', ENVIRONMENT);
    console.log('Base URL:', getBaseUrl());
    console.log('API URL:', getApiUrl());
    console.log('Config:', SERVER_CONFIGS[ENVIRONMENT]);
}

// 🚀 Автоматический вывод конфигурации при загрузке (только в режиме разработки)
if (ENVIRONMENT === 'local') {
    console.log('🏠 Режим локальной разработки активен');
    debugConfig();
} else if (ENVIRONMENT === 'production') {
    console.log('🌐 Продакшен режим активен');
    console.log('Base URL:', getBaseUrl());
} else {
    console.log('⚙️ Кастомный режим активен');
    console.log('Base URL:', getBaseUrl());
}

// 📤 Экспорт для использования в других файлах
if (typeof module !== 'undefined' && module.exports) {
    // Node.js окружение
    module.exports = {
        ENVIRONMENT,
        SERVER_CONFIGS,
        getBaseUrl,
        getApiUrl,
        getProxyUrl,
        getEnvironmentInfo,
        debugConfig
    };
} else if (typeof window !== 'undefined') {
    // Браузерное окружение
    window.SERVER_CONFIG = {
        ENVIRONMENT,
        SERVER_CONFIGS,
        getBaseUrl,
        getApiUrl,
        getProxyUrl,
        getEnvironmentInfo,
        debugConfig
    };
    
    // Также добавляем в глобальную область для удобства
    window.getBaseUrl = getBaseUrl;
    window.getApiUrl = getApiUrl;
    window.getProxyUrl = getProxyUrl;
}
