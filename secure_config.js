/**
 * Безопасная конфигурация для Telegram Bot
 * 
 * ВАЖНО: НЕ коммитьте этот файл с реальными токенами!
 * Используйте переменные окружения или внешние конфигурации.
 */

// Конфигурация магазина
const STORE_CONFIG = {
    workingHours: {
        start: 9,
        end: 19,
        days: 7 // 7 дней в неделю
    },
    support: {
        username: 'GuitarStringsUSA',
        telegramUrl: 'https://t.me/GuitarStringsUSA'
    }
};

// Функция для получения токена бота (должна быть реализована безопасно)
function getBotToken() {
    // ❌ НЕ ДЕЛАЙТЕ ТАК - токен в коде
    // return '123456:ABC...';
    
    // ✅ ХОРОШО - токен из переменной окружения
    if (typeof process !== 'undefined' && process.env) {
        return process.env.TELEGRAM_BOT_TOKEN;
    }
    
    // ✅ ХОРОШО - токен из конфигурации
    if (typeof window !== 'undefined' && window.APP_CONFIG) {
        return window.APP_CONFIG.TELEGRAM_BOT_TOKEN;
    }
    
    // ✅ ХОРОШО - токен из внешнего источника
    if (typeof window !== 'undefined' && window.TELEGRAM_BOT_TOKEN) {
        return window.TELEGRAM_BOT_TOKEN;
    }
    
    // Fallback - возвращаем ошибку
    throw new Error('Telegram Bot Token не найден. Настройте безопасное хранение токена.');
}

// Функция проверки рабочих часов
function isWorkingHours() {
    const now = new Date();
    const currentHour = now.getHours();
    const currentDay = now.getDay(); // 0 = воскресенье, 1 = понедельник
    
    // Проверяем, что сейчас рабочие дни (1-7, где 1 = понедельник)
    const isWorkingDay = currentDay >= 1 && currentDay <= 7;
    
    // Проверяем рабочие часы (9:00 - 19:00)
    const isWorkingTime = currentHour >= STORE_CONFIG.workingHours.start && 
                         currentHour < STORE_CONFIG.workingHours.end;
    
    return isWorkingDay && isWorkingTime;
}

// Функция получения статуса поддержки
function getSupportStatus() {
    const isOnline = isWorkingHours();
    
    return {
        isOnline: isOnline,
        status: isOnline ? 'online' : 'offline',
        message: isOnline ? 
            'Напишите нам, мы онлайн!' : 
            'Напишите нам, мы позже ответим.',
        workingHours: `${STORE_CONFIG.workingHours.start}:00 - ${STORE_CONFIG.workingHours.end}:00`,
        days: '7 дней в неделю'
    };
}

// Экспорт для использования в других файлах
if (typeof module !== 'undefined' && module.exports) {
    // Node.js
    module.exports = {
        STORE_CONFIG,
        getBotToken,
        isWorkingHours,
        getSupportStatus
    };
} else if (typeof window !== 'undefined') {
    // Браузер
    window.STORE_CONFIG = STORE_CONFIG;
    window.getBotToken = getBotToken;
    window.isWorkingHours = isWorkingHours;
    window.getSupportStatus = getSupportStatus;
} 