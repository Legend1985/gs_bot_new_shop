// Простая версия app.js
console.log('Простая версия app.js загружена');

// Инициализация корзины
let cart = [];
let cartItemCount = 0;

// Функция инициализации корзины
function initializeCart() {
    console.log('Корзина инициализирована');
    cart = [];
    cartItemCount = 0;
}

// Функция добавления в корзину
function addToCart(product) {
    console.log('Добавление в корзину:', product);
    cart.push(product);
    cartItemCount++;
    updateCartBadge();
}

// Функция обновления бейджа корзины
function updateCartBadge() {
    const badge = document.querySelector('.cart-badge');
    if (badge) {
        badge.textContent = cartItemCount;
        badge.style.display = cartItemCount > 0 ? 'block' : 'none';
    }
}

// Функция показа меню
function showMenuPopup() {
    console.log('showMenuPopup: Показываем меню');
    const popup = document.getElementById('menuPopup');
    if (popup) {
        popup.style.display = 'flex';
    }
}

// Функция закрытия попапов
function closePopup(popupId) {
    console.log('closePopup: Закрываем', popupId);
    const popup = document.getElementById(popupId);
    if (popup) {
        popup.style.display = 'none';
    }
}

// Функция показа корзины
function showCartPopup() {
    console.log('showCartPopup: Показываем корзину');
    const popup = document.getElementById('cartPopup');
    if (popup) {
        popup.style.display = 'flex';
    }
}

// Функция закрытия корзины
function closeCartPopup() {
    console.log('closeCartPopup: Закрываем корзину');
    const popup = document.getElementById('cartPopup');
    if (popup) {
        popup.style.display = 'none';
    }
}

// Функция показа контактов
function showContactsPopup() {
    console.log('showContactsPopup: Показываем контакты');
    const popup = document.getElementById('contactsPopup');
    if (popup) {
        popup.style.display = 'flex';
    }
}

// Функция закрытия контактов
function closeContactsPopup() {
    console.log('closeContactsPopup: Закрываем контакты');
    const popup = document.getElementById('contactsPopup');
    if (popup) {
        popup.style.display = 'none';
    }
}

// Функция переключения меню
function toggleMenu() {
    console.log('toggleMenu: Переключаем меню');
    const menu = document.querySelector('.menu');
    if (menu) {
        menu.classList.toggle('active');
    }
}

// Функция переключения аватара
function toggleAvatarMenu() {
    console.log('toggleAvatarMenu: Переключаем меню аватара');
    const avatarMenu = document.querySelector('.avatar-menu');
    if (avatarMenu) {
        avatarMenu.classList.toggle('active');
    }
}

// Функция показа настроек
function showSettingsPopup() {
    console.log('showSettingsPopup: Показываем настройки');
    const popup = document.getElementById('settingsPopup');
    if (popup) {
        popup.style.display = 'flex';
    }
}

// Функция закрытия настроек
function closeSettingsPopup() {
    console.log('closeSettingsPopup: Закрываем настройки');
    const popup = document.getElementById('settingsPopup');
    if (popup) {
        popup.style.display = 'none';
    }
}

// Функция перехода в корзину
function goToCart() {
    console.log('goToCart: Переходим в корзину');
    showCartPopup();
}

// Функция загрузки товаров
async function loadProducts() {
    console.log('loadProducts: Загружаем товары');
    
    try {
        const response = await fetch('/api/products?page=0');
        const data = await response.json();
        
        if (data && data.products && data.products.length > 0) {
            console.log('loadProducts: Загружено', data.products.length, 'товаров');
            displayProducts(data.products);
        } else {
            console.log('loadProducts: Нет товаров для отображения');
        }
    } catch (error) {
        console.error('loadProducts: Ошибка загрузки товаров:', error);
    }
}

// Функция отображения товаров
function displayProducts(products) {
    console.log('displayProducts: Отображаем товары');
    
    const container = document.querySelector('.inner');
    if (!container) {
        console.error('displayProducts: Контейнер .inner не найден');
        return;
    }
    
    container.innerHTML = '';
    
    products.forEach((product, index) => {
        const productCard = createProductCard(product, index);
        container.appendChild(productCard);
    });
}

// Функция создания карточки товара
function createProductCard(product, index) {
    const card = document.createElement('div');
    card.className = 'product-card';
    
    const oldPriceHtml = product.oldPrice && product.oldPrice > 0 && product.oldPrice !== product.price ? 
        '<span class="old-price">' + product.oldPrice + ' грн</span>' : '';
    
    card.innerHTML = 
        '<div class="product-image">' +
            '<img src="' + product.image + '" alt="' + product.name + '" onerror="this.src=\'./images/Discontinued.jpg\'">' +
        '</div>' +
        '<div class="product-info">' +
            '<h3>' + product.name + '</h3>' +
            '<p class="product-article">Артикул: ' + product.article + '</p>' +
            '<div class="product-price">' +
                oldPriceHtml +
                '<span class="current-price">' + product.price + ' грн</span>' +
            '</div>' +
            '<button class="btn add-to-cart-btn" data-index="' + index + '">Добавить в корзину</button>' +
        '</div>';
    
    return card;
}

// Инициализация при загрузке страницы
document.addEventListener('DOMContentLoaded', function() {
    console.log('DOM загружен, инициализируем приложение');
    initializeCart();
    
    // Показываем тестовое сообщение
    const container = document.querySelector('.inner');
    if (container) {
        container.innerHTML = '<div style="padding: 20px; text-align: center;"><h2>Простая версия загружена!</h2><p>JavaScript работает корректно.</p><button onclick="loadProducts()" class="btn">Загрузить товары</button></div>';
    }
    
    // Настраиваем обработчики событий
    setupEventHandlers();
});

// Функция настройки обработчиков событий
function setupEventHandlers() {
    console.log('setupEventHandlers: Настраиваем обработчики событий');
    
    // Обработчик клавиши ESC для закрытия попапов
    document.addEventListener('keydown', function(event) {
        if (event.key === 'Escape') {
            const cartPopup = document.getElementById('cartPopup');
            if (cartPopup && cartPopup.style.display === 'flex') {
                closeCartPopup();
            }
        }
    });
    
    // Обработчик кликов по кнопкам добавления в корзину
    document.addEventListener('click', function(event) {
        if (event.target.classList.contains('add-to-cart-btn')) {
            const index = parseInt(event.target.getAttribute('data-index'));
            console.log('Клик по кнопке добавления в корзину, индекс:', index);
            // Здесь можно добавить логику добавления в корзину
        }
    });
}

console.log('Простая версия app.js завершена');
