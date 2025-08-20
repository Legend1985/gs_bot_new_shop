// Минимальная версия app.js для тестирования
console.log('Минимальная версия app.js загружена');

// Инициализация корзины
let cart = [];
let cartTotal = 0;
let cartItemCount = 0;

// Функция инициализации корзины
function initializeCart() {
    console.log('Корзина инициализирована');
    cart = [];
    cartTotal = 0;
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

// Инициализация при загрузке страницы
document.addEventListener('DOMContentLoaded', () => {
    console.log('DOM загружен, инициализируем приложение');
    initializeCart();
    
    // Показываем тестовое сообщение
    const container = document.querySelector('.inner');
    if (container) {
        container.innerHTML = '<div style="padding: 20px; text-align: center;"><h2>Минимальная версия загружена!</h2><p>JavaScript работает корректно.</p></div>';
    }
});

console.log('Минимальная версия app.js завершена');
