const express = require('express');
const path = require('path');
const axios = require('axios');

const app = express();
const PORT = 8000;

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
            const response = await axios.get(`http://localhost:${PORT}/api.php?category=${category}&limit=100`);

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
    console.log(`🌐 Сервер запущен на http://localhost:${PORT}`);

    // Автоматический скрапинг при запуске
    await autoScrapeOnStartup();

    console.log(`🎯 Откройте браузер и перейдите на http://localhost:${PORT}/index.html`);
});

// Graceful shutdown
process.on('SIGINT', () => {
    console.log('\n👋 Сервер остановлен');
    process.exit(0);
});
