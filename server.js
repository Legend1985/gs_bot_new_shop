const express = require('express');
const path = require('path');
const axios = require('axios');

// Подключаем конфигурацию сервера
const serverConfig = require('./config.js');

const app = express();
const PORT = process.env.PORT || 8000;

// Получаем информацию о текущем окружении
const envInfo = serverConfig.getEnvironmentInfo();
console.log('🔧 Сервер запускается с конфигурацией:', envInfo);

// Middleware
app.use(express.json());
app.use(express.static(path.join(__dirname)));

// Функция для автоматического скрапинга при запуске сервера
async function autoScrapeOnStartup() {
    console.log('🚀 Начинаем автоматический скрапинг данных при запуске сервера...');

    const categories = [
        'electro',
        'electro-09',
        'electro-10',
        'electro-11',
        'acoustic',
        'classic',
        'bass'
    ];

    for (const category of categories) {
        try {
            console.log(`📊 Скрапинг категории: ${category}`);

            // Вызываем PHP API для скрапинга
            const apiUrl = `http://localhost:${PORT}/api.php?category=${category}&limit=100`;
            const response = await axios.get(apiUrl);

            if (response.data && response.data.products) {
                console.log(`✅ Загружено ${response.data.products.length} товаров для категории ${category}`);
            }

        } catch (error) {
            console.error(`❌ Ошибка скрапинга категории ${category}:`, error.message);
        }
    }

    console.log('🎉 Автоматический скрапинг завершен!');
}

// API endpoint для тестирования
app.get('/test', (req, res) => {
    res.json({
        status: 'ok',
        message: 'Сервер работает на порте 8000',
        timestamp: new Date().toISOString()
    });
});

// Запуск сервера
app.listen(PORT, async () => {
    const serverUrl = `http://localhost:${PORT}`;
    console.log(`🌐 Сервер запущен на ${serverUrl}`);
    console.log(`🔧 Окружение: ${envInfo.environment} (${envInfo.name})`);
    console.log(`📡 API Base URL: ${envInfo.apiUrl}`);

    // Автоматический скрапинг при запуске
    await autoScrapeOnStartup();

    console.log(`🎯 Откройте браузер и перейдите на ${serverUrl}/index.html`);
});

// Graceful shutdown
process.on('SIGINT', () => {
    console.log('\n👋 Сервер остановлен');
    process.exit(0);
});
