const express = require('express');
const path = require('path');
const axios = require('axios');
const crypto = require('crypto');
const fs = require('fs');

const app = express();
const PORT = 8000;

// Middleware с обработкой ошибок JSON
app.use(express.json({
    limit: '10mb',
    verify: (req, res, buf, encoding) => {
        try {
            JSON.parse(buf);
        } catch (error) {
            console.error('❌ Ошибка JSON middleware:', error);
            console.error('❌ Проблемные данные:', buf.toString());
            throw new Error('Invalid JSON format');
        }
    }
}));

app.use(express.static(path.join(__dirname)));

// Обработчик ошибок JSON
app.use((error, req, res, next) => {
    if (error instanceof SyntaxError && error.status === 400 && 'body' in error) {
        console.error('❌ JSON Syntax Error:', error);
        return res.status(400).json({
            success: false,
            error: 'Неверный формат JSON данных'
        });
    }
    next();
});

// Session management (простая реализация в памяти)
const sessions = new Map();
const captchaStore = new Map();
const smsCodeStore = new Map();
const registeredUsers = new Map();
const ordersDB = [];

// Загружаем пользователей из файла при запуске
try {
    if (fs.existsSync('users.db.json')) {
        const usersData = JSON.parse(fs.readFileSync('users.db.json', 'utf8'));
        Object.entries(usersData).forEach(([username, userData]) => {
            registeredUsers.set(username, userData);
        });
        console.log(`📚 Загружено ${registeredUsers.size} пользователей из базы данных`);
    }
} catch (error) {
    console.error('❌ Ошибка загрузки пользователей:', error);
}

// Загружаем заказы из файла при запуске
try {
    if (fs.existsSync('orders.db.json')) {
        const ordersData = JSON.parse(fs.readFileSync('orders.db.json', 'utf8'));
        ordersDB.push(...ordersData);
        console.log(`📦 Загружено ${ordersDB.length} заказов из базы данных`);
    }
} catch (error) {
    console.error('❌ Ошибка загрузки заказов:', error);
}

// Вспомогательные функции
function hashPassword(password) {
    return crypto.createHash('sha256').update(password).digest('hex');
}

function generateCaptcha() {
    const a = Math.floor(Math.random() * 10) + 3;
    const b = Math.floor(Math.random() * 10) + 2;
    const question = `${a} + ${b}`;
    const answer = String(a + b);
    const captchaId = crypto.randomBytes(8).toString('hex');
    
    captchaStore.set(captchaId, {
        answer: answer,
        expires: Date.now() + 300000 // 5 минут
    });
    
    return { captchaId, question };
}

function verifyCaptcha(captchaId, userAnswer) {
    const captcha = captchaStore.get(captchaId);
    if (!captcha) return false;
    if (Date.now() > captcha.expires) {
        captchaStore.delete(captchaId);
        return false;
    }
    const isValid = captcha.answer === String(userAnswer).trim();
    captchaStore.delete(captchaId);
    return isValid;
}

function saveUsersToFile() {
    try {
        const usersData = {};
        registeredUsers.forEach((userData, username) => {
            usersData[username] = userData;
        });
        fs.writeFileSync('users.db.json', JSON.stringify(usersData, null, 2));
    } catch (error) {
        console.error('❌ Ошибка сохранения пользователей:', error);
    }
}

function saveOrdersToFile() {
    try {
        fs.writeFileSync('orders.db.json', JSON.stringify(ordersDB, null, 2));
    } catch (error) {
        console.error('❌ Ошибка сохранения заказов:', error);
    }
}

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

// ===== API ENDPOINTS =====

// Капча
app.get('/api/captcha', (req, res) => {
    try {
        const { captchaId, question } = generateCaptcha();
        res.json({
            success: true,
            captchaId: captchaId,
            question: question
        });
    } catch (error) {
        res.status(500).json({
            success: false,
            error: error.message
        });
    }
});

// Регистрация
app.post('/api/register', (req, res) => {
    try {
        const { email, username, password, captchaId, captchaAnswer } = req.body;
        
        if (!email || !username || !password) {
            return res.status(400).json({
                success: false,
                error: 'Заполните все поля'
            });
        }
        
        if (!email.includes('@')) {
            return res.status(400).json({
                success: false,
                error: 'Некорректный email'
            });
        }
        
        if (username.length < 3) {
            return res.status(400).json({
                success: false,
                error: 'Логин слишком короткий'
            });
        }
        
        if (password.length < 6) {
            return res.status(400).json({
                success: false,
                error: 'Пароль слишком короткий'
            });
        }
        
        if (!verifyCaptcha(captchaId, captchaAnswer)) {
            return res.status(400).json({
                success: false,
                error: 'Неверная капча'
            });
        }
        
        if (registeredUsers.has(username)) {
            return res.status(409).json({
                success: false,
                error: 'Логин уже занят'
            });
        }
        
        // Проверяем уникальность email
        for (const [existingUsername, userData] of registeredUsers) {
            if (userData.email && userData.email.toLowerCase() === email.toLowerCase()) {
                return res.status(409).json({
                    success: false,
                    error: 'E-mail уже используется'
                });
            }
        }
        
        // Создаем пользователя
        const userData = {
            email: email,
            passwordHash: hashPassword(password),
            displayName: username,
            createdAt: Date.now(),
            photoUrl: null
        };
        
        registeredUsers.set(username, userData);
        saveUsersToFile();
        
        // Создаем сессию
        const sessionId = crypto.randomBytes(32).toString('hex');
        const user = {
            userId: username,
            displayName: username,
            username: username,
            photoUrl: null,
            language: 'uk'
        };
        
        sessions.set(sessionId, user);
        
        res.json({
            success: true,
            profile: user,
            sessionId: sessionId
        });
        
    } catch (error) {
        res.status(500).json({
            success: false,
            error: error.message
        });
    }
});

// Логин
app.post('/api/login', (req, res) => {
    try {
        const { displayName, username, password, remember, captchaId, captchaAnswer } = req.body;
        
        const loginName = username || displayName;
        if (!loginName || !password) {
            return res.status(400).json({
                success: false,
                error: 'Введите логин и пароль'
            });
        }
        
        if (!verifyCaptcha(captchaId, captchaAnswer)) {
            return res.status(400).json({
                success: false,
                error: 'Неверная капча'
            });
        }
        
        // Поиск пользователя по логину или email
        let userRecord = registeredUsers.get(loginName);
        let foundUsername = loginName;
        
        if (!userRecord) {
            // Поиск по email
            for (const [uname, record] of registeredUsers) {
                if (record.email && record.email.toLowerCase() === loginName.toLowerCase()) {
                    userRecord = record;
                    foundUsername = uname;
                    break;
                }
            }
        }
        
        if (!userRecord) {
            return res.status(404).json({
                success: false,
                error: 'Пользователь не зарегистрирован'
            });
        }
        
        if (userRecord.passwordHash !== hashPassword(password)) {
            return res.status(401).json({
                success: false,
                error: 'Неверный пароль'
            });
        }
        
        // Создаем сессию
        const sessionId = crypto.randomBytes(32).toString('hex');
        const user = {
            userId: foundUsername,
            displayName: userRecord.displayName || foundUsername,
            username: foundUsername,
            photoUrl: userRecord.photoUrl,
            language: 'uk'
        };
        
        sessions.set(sessionId, user);
        
        res.json({
            success: true,
            profile: user,
            sessionId: sessionId
        });
        
    } catch (error) {
        res.status(500).json({
            success: false,
            error: error.message
        });
    }
});

// Выход
app.post('/api/logout', (req, res) => {
    try {
        const sessionId = req.headers.authorization || req.body.sessionId;
        if (sessionId) {
            sessions.delete(sessionId);
        }
        res.json({ success: true });
    } catch (error) {
        res.status(500).json({
            success: false,
            error: error.message
        });
    }
});

// Профиль пользователя
app.get('/api/user_profile', (req, res) => {
    try {
        const sessionId = req.headers.authorization;
        const user = sessionId ? sessions.get(sessionId) : null;
        
        if (user) {
            return res.json({
                success: true,
                userId: user.userId,
                displayName: user.displayName,
                username: user.username,
                bonuses: 100,
                photoUrl: user.photoUrl,
                language: user.language
            });
        }
        
        // Telegram данные из query параметров
        const { tg_id, tg_username, tg_first_name, tg_last_name, tg_photo_url } = req.query;
        const displayName = `${tg_first_name || ''} ${tg_last_name || ''}`.trim() || tg_username || 'Guest';
        
        res.json({
            success: true,
            userId: tg_id || 'local-guest',
            displayName: displayName,
            username: tg_username,
            bonuses: 100,
            photoUrl: tg_photo_url,
            language: 'uk'
        });
        
    } catch (error) {
        res.status(500).json({
            success: false,
            error: error.message
        });
    }
});

// Заказы пользователя
app.get('/api/user_orders', (req, res) => {
    try {
        const sessionId = req.headers.authorization;
        const user = sessionId ? sessions.get(sessionId) : null;
        const tg_id = req.query.tg_id;
        
        if (!user && !tg_id) {
            return res.status(401).json({
                success: false,
                error: 'Пользователь не авторизован',
                orders: [],
                summary: { totalOrders: 0, bonuses: 0, totalAmount: 0 }
            });
        }
        
        const userIdentifier = user ? (user.username || user.displayName) : tg_id;
        const userOrders = ordersDB.filter(order => {
            if (userIdentifier === 'just_a_legend') return true; // Демо режим
            return order.userId === userIdentifier ||
                   order.customer?.name === userIdentifier ||
                   order.customer?.phone?.includes(userIdentifier) ||
                   order.username === userIdentifier;
        });
        
        // Форматируем заказы
        const formattedOrders = userOrders.map(order => {
            const orderTotal = order.total || 0;
            const deliveryCost = calculateDeliveryCost(order.deliveryMethod, orderTotal);
            const bonusesUsed = order.bonusesUsed || 0;
            const couponDiscount = order.couponDiscount || 0;
            const finalAmount = Math.max(0, orderTotal + deliveryCost - bonusesUsed - couponDiscount);
            
            const customer = order.customer || {};
            const address = `${customer.settlement || ''}, ${customer.branch || ''}`.replace(/^, |, $/, '') || 'Адрес не указан';
            
            return {
                orderId: order.id || '',
                date: (order.date || '').split('T')[0] || order.date || '',
                address: address,
                amount: finalAmount,
                status: getOrderStatusText(order.status || 'accepted')
            };
        }).sort((a, b) => new Date(b.date) - new Date(a.date));
        
        let totalAmount = 0;
        let bonuses = 10; // Начальный бонус
        
        formattedOrders.forEach(order => {
            totalAmount += order.amount;
            bonuses += Math.floor(order.amount * 0.01); // 1% от суммы заказа
        });
        
        res.json({
            success: true,
            summary: {
                totalOrders: formattedOrders.length,
                bonuses: bonuses,
                totalAmount: totalAmount
            },
            orders: formattedOrders
        });
        
    } catch (error) {
        res.status(500).json({
            success: false,
            error: error.message,
            orders: [],
            summary: { totalOrders: 0, bonuses: 0, totalAmount: 0 }
        });
    }
});

// Сохранение заказа
app.post('/api/save_order', (req, res) => {
    try {
        console.log('📦 Получен запрос на сохранение заказа');
        console.log('📦 Headers:', req.headers);
        console.log('📦 Body type:', typeof req.body);
        console.log('📦 Body content:', req.body);
        
        let orderData;
        
        // Попытка парсинга данных
        if (typeof req.body === 'string') {
            try {
                orderData = JSON.parse(req.body);
            } catch (parseError) {
                console.error('❌ Ошибка парсинга JSON:', parseError);
                console.error('❌ Проблемная строка:', req.body);
                return res.status(400).json({
                    success: false,
                    error: `Ошибка парсинга JSON: ${parseError.message}`
                });
            }
        } else if (typeof req.body === 'object' && req.body !== null) {
            orderData = req.body;
        } else {
            return res.status(400).json({
                success: false,
                error: 'Неверный формат данных заказа'
            });
        }
        
        if (!orderData || !orderData.id) {
            console.error('❌ Отсутствуют обязательные поля:', orderData);
            return res.status(400).json({
                success: false,
                error: 'Неверные данные заказа - отсутствует ID'
            });
        }
        
        // Очистка данных от потенциально проблемных символов
        const cleanOrderData = cleanOrderDataForJSON(orderData);
        
        // Проверяем, существует ли заказ
        const existingOrderIndex = ordersDB.findIndex(order => order.id === cleanOrderData.id);
        
        if (existingOrderIndex !== -1) {
            // Обновляем существующий заказ
            ordersDB[existingOrderIndex] = { ...ordersDB[existingOrderIndex], ...cleanOrderData };
            console.log(`📦 Обновлен заказ: ${cleanOrderData.id}`);
        } else {
            // Добавляем новый заказ
            ordersDB.push(cleanOrderData);
            console.log(`📦 Создан новый заказ: ${cleanOrderData.id}`);
        }
        
        saveOrdersToFile();
        
        res.json({
            success: true,
            message: `Заказ ${cleanOrderData.id} сохранен успешно`,
            order_id: cleanOrderData.id
        });
        
    } catch (error) {
        console.error('❌ Ошибка в save_order:', error);
        console.error('❌ Stack:', error.stack);
        res.status(500).json({
            success: false,
            error: error.message
        });
    }
});

// Функция очистки данных заказа от проблемных символов
function cleanOrderDataForJSON(orderData) {
    try {
        const cleanData = JSON.parse(JSON.stringify(orderData, (key, value) => {
            if (typeof value === 'string') {
                // Удаляем или экранируем проблемные символы
                return value
                    .replace(/[\u0000-\u001F\u007F-\u009F]/g, '') // Удаляем управляющие символы
                    .replace(/\\/g, '\\\\') // Экранируем обратные слеши
                    .replace(/"/g, '\\"') // Экранируем кавычки
                    .trim();
            }
            return value;
        }));
        return cleanData;
    } catch (error) {
        console.error('❌ Ошибка очистки данных заказа:', error);
        return orderData; // Возвращаем исходные данные в случае ошибки
    }
}

// Кеш товаров
let productsCache = null;
let cacheTimestamp = null;
const CACHE_DURATION = 30 * 60 * 1000; // 30 минут

// Товары (прямая реализация без проксирования)
app.get('/api/products', async (req, res) => {
    try {
        const { start = 0, limit = 60, search = '' } = req.query;
        const currentTime = Date.now();
        
        // Проверяем кеш
        if (!productsCache || !cacheTimestamp || (currentTime - cacheTimestamp > CACHE_DURATION)) {
            console.log('🔄 Обновляем кеш товаров...');
            productsCache = await scrapeProducts();
            cacheTimestamp = currentTime;
        }
        
        let products = [...productsCache];
        
        // Применяем поиск если есть
        if (search) {
            const searchLower = search.toLowerCase();
            products = products.filter(product => 
                product.name.toLowerCase().includes(searchLower)
            );
        }
        
        // Пагинация
        const totalProducts = products.length;
        const startIndex = parseInt(start);
        const limitNum = parseInt(limit);
        const endIndex = startIndex + limitNum;
        const paginatedProducts = products.slice(startIndex, endIndex);
        
        res.json({
            success: true,
            products: paginatedProducts,
            total: totalProducts,
            start: startIndex,
            limit: limitNum,
            hasMore: endIndex < totalProducts
        });
        
    } catch (error) {
        console.error('❌ Ошибка API товаров:', error);
        // Возвращаем тестовые данные при ошибке
        res.json({
            success: true,
            products: getTestProducts(),
            total: 5,
            start: 0,
            limit: 60,
            hasMore: false
        });
    }
});

// Функция скрапинга товаров
async function scrapeProducts() {
    const products = [];
    const categories = ['electro', 'acoustic', 'classic', 'bass'];
    
    for (const category of categories) {
        try {
            console.log(`📊 Скрапинг категории: ${category}`);
            
            const response = await axios.get(`https://guitarstrings.com.ua/${category}`, {
                headers: {
                    'User-Agent': 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/120.0.0.0 Safari/537.36'
                },
                timeout: 15000
            });
            
            // Здесь должна быть логика парсинга HTML
            // Для простоты пока используем тестовые данные
            const categoryProducts = getTestProducts(category);
            products.push(...categoryProducts);
            
        } catch (error) {
            console.error(`❌ Ошибка скрапинга ${category}:`, error.message);
        }
    }
    
    return products.length > 0 ? products : getTestProducts();
}

// Тестовые данные товаров
function getTestProducts(category = 'electro') {
    const baseProducts = [
        {
            name: 'Ernie Ball 2221 Regular Slinky 10-46',
            image: 'Goods/Electric_guitar_strings/2221/Ernie_Ball_2221_10-46_150.jpg',
            newPrice: '350',
            oldPrice: '450',
            availability: 'В наличии',
            rating: '4.5',
            category: 'electro'
        },
        {
            name: 'D\'Addario EXL120 Super Light 9-42',
            image: 'Goods/Electric_guitar_strings/EXL120/DAddario_EXL120_9-42.jpg',
            newPrice: '320',
            oldPrice: null,
            availability: 'В наличии',
            rating: '4.8',
            category: 'electro'
        },
        {
            name: 'Elixir 12002 Nanoweb Light 10-46',
            image: 'Goods/Electric_guitar_strings/12002/Elixir_12002_10-46.jpg',
            newPrice: '450',
            oldPrice: '520',
            availability: 'В наличии',
            rating: '4.7',
            category: 'electro'
        },
        {
            name: 'Martin M170 80/20 Bronze Extra Light 10-47',
            image: 'Goods/Acoustic_guitar_strings/M170/Martin_M170_10-47.jpg',
            newPrice: '280',
            oldPrice: null,
            availability: 'В наличии',
            rating: '4.3',
            category: 'acoustic'
        },
        {
            name: 'D\'Addario EJ45 Pro-Arte Normal Tension',
            image: 'Goods/Classical_guitar_strings/EJ45/DAddario_EJ45.jpg',
            newPrice: '420',
            oldPrice: '480',
            availability: 'В наличии',
            rating: '4.6',
            category: 'classic'
        }
    ];
    
    if (category === 'all') return baseProducts;
    return baseProducts.filter(p => p.category === category);
}

// SMS запрос кода (заглушка)
app.post('/api/sms/request_code', (req, res) => {
    try {
        const { phone } = req.body;
        if (!phone) {
            return res.status(400).json({
                success: false,
                error: 'Укажите номер телефона'
            });
        }
        
        // В реальном приложении здесь была бы отправка SMS
        console.log(`📱 SMS код запрошен для: ${phone}`);
        
        res.json({
            success: true,
            message: 'SMS код отправлен'
        });
    } catch (error) {
        res.status(500).json({
            success: false,
            error: error.message
        });
    }
});

// SMS подтверждение кода (заглушка)
app.post('/api/sms/confirm', (req, res) => {
    try {
        const { phone, code } = req.body;
        
        if (!phone || !code) {
            return res.status(400).json({
                success: false,
                error: 'Телефон и код обязательны'
            });
        }
        
        // В реальном приложении здесь была бы проверка кода
        console.log(`📱 SMS код подтвержден для: ${phone}`);
        
        // Создаем сессию для пользователя по телефону
        const sessionId = crypto.randomBytes(32).toString('hex');
        const user = {
            userId: `user_${phone.slice(-4)}`,
            displayName: phone,
            username: `user_${phone.slice(-4)}`,
            photoUrl: null,
            language: 'uk',
            phone: phone
        };
        
        sessions.set(sessionId, user);
        
        res.json({
            success: true,
            profile: user,
            sessionId: sessionId
        });
        
    } catch (error) {
        res.status(500).json({
            success: false,
            error: error.message
        });
    }
});

// Telegram уведомления (заглушка)
app.post('/api/send_telegram_notification', (req, res) => {
    try {
        const { message, chatId } = req.body;
        console.log(`📨 Telegram уведомление: ${message} для чата: ${chatId}`);
        
        res.json({
            success: true,
            message: 'Уведомление отправлено'
        });
    } catch (error) {
        res.status(500).json({
            success: false,
            error: error.message
        });
    }
});

// Прокси для загрузки HTML (для скрапинга в браузере)
app.get('/proxy_fetch', async (req, res) => {
    try {
        const { url } = req.query;
        
        if (!url) {
            return res.status(400).send('Missing url parameter');
        }
        
        if (!url.startsWith('https://guitarstrings.com.ua/')) {
            return res.status(403).send('URL not allowed');
        }
        
        const response = await axios.get(url, {
            headers: {
                'User-Agent': 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/120.0.0.0 Safari/537.36',
                'Accept': 'text/html,application/xhtml+xml,application/xml;q=0.9,image/webp,*/*;q=0.8',
                'Accept-Language': 'ru-RU,ru;q=0.8,en-US;q=0.5,en;q=0.3',
                'Connection': 'keep-alive',
                'Upgrade-Insecure-Requests': '1'
            },
            timeout: 20000
        });
        
        res.set({
            'Content-Type': 'text/html; charset=utf-8',
            'Cache-Control': 'no-cache, no-store, must-revalidate',
            'Pragma': 'no-cache',
            'Expires': '0',
            'Access-Control-Allow-Origin': '*'
        });
        
        res.send(response.data);
        
    } catch (error) {
        console.error('❌ Proxy fetch error:', error);
        res.status(502).send(`Proxy error: ${error.message}`);
    }
});

// Вспомогательные функции
function calculateDeliveryCost(deliveryMethod, orderTotal) {
    if (deliveryMethod === 'pickup') return 0;
    if (deliveryMethod === 'nova') return orderTotal < 1000 ? 50 : 0;
    if (deliveryMethod === 'ukrposhta') return orderTotal < 500 ? 30 : 0;
    if (deliveryMethod === 'meest') return orderTotal < 800 ? 45 : 0;
    return 50;
}

function getOrderStatusText(status) {
    const statusMap = {
        'accepted': 'Принят',
        'processing': 'В обработке',
        'shipped': 'Отправлен',
        'delivered': 'Доставлен',
        'cancelled': 'Отменен',
        'completed': 'Выполнен'
    };
    return statusMap[status] || 'Неизвестный статус';
}

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
