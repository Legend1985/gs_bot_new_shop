// GS Bot New Shop - Версия для GitHub Pages
console.log('app_github_pages.js загружен');

// Экспортируем функции в глобальную область сразу при загрузке скрипта

// Инициализация корзины
let cart = [];
let cartItemCount = 0;

// Переменные для поиска
let searchTerm = '';
let isSearchActive = false;
let searchTimeout = null;

// Переменные для бесконечной прокрутки
let currentPage = 0;
let hasMoreProducts = true;
let isLoading = false;
let loadedProductNames = new Set();

// Статические данные товаров
let staticProducts = [];

// Функция загрузки статических данных товаров
async function loadStaticProducts() {
    try {
        const response = await fetch('./static_products.json');
        const data = await response.json();
        
        if (data && data.products) {
            staticProducts = data.products;
            console.log(`Загружено ${staticProducts.length} товаров из статического файла`);
            return true;
        }
    } catch (error) {
        console.error('Ошибка загрузки статических данных:', error);
    }
    return false;
}

// Функция поиска товаров в статических данных
async function searchProducts(query) {
    console.log('searchProducts: Поиск товаров по запросу:', query);
    
    const currentSearchTerm = query.toLowerCase().trim();
    isSearchActive = currentSearchTerm.length > 0;
    
    if (!isSearchActive) {
        console.log('searchProducts: Поиск отменен, загружаем все товары');
        await loadProducts();
        return;
    }
    
    try {
        // Фильтруем товары из статических данных
        const filteredProducts = staticProducts.filter(product => 
            product.name.toLowerCase().includes(currentSearchTerm)
        );
        
        if (filteredProducts.length > 0) {
            console.log(`searchProducts: Найдено ${filteredProducts.length} товаров`);
            displayProducts(filteredProducts);
        } else {
            console.log('searchProducts: Товары не найдены');
            showNoSearchResults(currentSearchTerm);
        }
    } catch (error) {
        console.error('searchProducts: Ошибка поиска:', error);
        showNoSearchResults(currentSearchTerm);
    }
}

// Функция загрузки товаров из статических данных
async function loadProducts(page = 0, append = false) {
    if (isLoading || isSearchActive) {
        console.log('loadProducts: Загрузка уже идет или активен поиск, пропускаем');
        return;
    }
    
    console.log('loadProducts: Загружаем товары, страница:', page, 'добавляем:', append);
    
    isLoading = true;
    
    // Показываем индикатор загрузки
    if (!append) {
        const container = document.querySelector('.inner');
        if (container) {
            // Получаем текущий язык
            const currentLanguage = localStorage.getItem('selectedLanguage') || 'uk';
            let loadingText = 'Загружаем товары...';
            
            if (currentLanguage === 'uk') {
                loadingText = 'Завантажуємо товари...';
            } else if (currentLanguage === 'en') {
                loadingText = 'Loading goods...';
            }
            
            container.innerHTML = `
                <div style="
                    position: fixed;
                    top: 50%;
                    left: 50%;
                    transform: translate(-50%, -50%);
                    text-align: center;
                    z-index: 1000;
                    background: rgba(255, 255, 255, 0.95);
                    padding: 30px;
                    border-radius: 10px;
                    box-shadow: 0 4px 20px rgba(0, 0, 0, 0.1);
                ">
                    <i class="fas fa-spinner fa-spin" style="font-size: 32px; color: #4CAF50; margin-bottom: 15px; display: block;"></i>
                    <p style="margin: 0; font-size: 16px; color: #333; font-weight: 500;">${loadingText}</p>
                </div>
            `;
        }
    }
    
    try {
        // Загружаем статические данные, если еще не загружены
        if (staticProducts.length === 0) {
            await loadStaticProducts();
        }
        
        // Пагинация для статических данных
        const itemsPerPage = 30;
        const start = page * itemsPerPage;
        const end = start + itemsPerPage;
        const pageProducts = staticProducts.slice(start, end);
        
        if (pageProducts.length > 0) {
            console.log('loadProducts: Загружено', pageProducts.length, 'товаров');
            
            if (append) {
                // Добавляем товары к существующим
                appendProducts(pageProducts);
            } else {
                // Отображаем новые товары
                displayProducts(pageProducts);
            }
            
            // Обновляем состояние
            currentPage = page;
            hasMoreProducts = end < staticProducts.length;
            
            console.log('loadProducts: Обновлен currentPage на:', currentPage);
            console.log('loadProducts: hasMoreProducts:', hasMoreProducts);
        } else {
            console.log('loadProducts: Нет товаров для отображения');
            hasMoreProducts = false;
        }
    } catch (error) {
        console.error('loadProducts: Ошибка загрузки товаров:', error);
        hasMoreProducts = false;
    } finally {
        isLoading = false;
    }
}

// Остальные функции остаются без изменений...
// (копируем из основного app.js)

// Функция сохранения корзины в localStorage
function saveCartToStorage() {
    try {
        localStorage.setItem('cart', JSON.stringify(cart));
        localStorage.setItem('cartItemCount', cartItemCount.toString());
        console.log('Корзина сохранена в localStorage');
    } catch (error) {
        console.error('Ошибка сохранения корзины:', error);
    }
}

// Функция загрузки корзины из localStorage
function loadCartFromStorage() {
    try {
        const savedCart = localStorage.getItem('cart');
        const savedCount = localStorage.getItem('cartItemCount');
        
        if (savedCart) {
            cart = JSON.parse(savedCart);
            cartItemCount = parseInt(savedCount) || 0;
            console.log('Корзина загружена из localStorage:', cart.length, 'товаров');
            updateCartBadge();
            return true;
        }
    } catch (error) {
        console.error('Ошибка загрузки корзины:', error);
        localStorage.removeItem('cart');
        localStorage.removeItem('cartItemCount');
    }
    return false;
}

// Функция инициализации корзины
function initializeCart() {
    console.log('Корзина инициализирована');
    
    if (!loadCartFromStorage()) {
        cart = [];
        cartItemCount = 0;
    }
}

// Функция добавления в корзину
function addToCart(product) {
    console.log('Добавление в корзину:', product);
    
    const existingItemIndex = cart.findIndex(item => 
        item.name === product.name && 
        (item.newPrice || item.price) === (product.newPrice || product.price) &&
        (item.oldPrice || 0) === (product.oldPrice || 0)
    );
    
    if (existingItemIndex !== -1) {
        if (!cart[existingItemIndex].quantity) {
            cart[existingItemIndex].quantity = 1;
        }
        cart[existingItemIndex].quantity++;
        cartItemCount++;
    } else {
        cart.push(product);
        cartItemCount++;
    }
    
    updateCartBadge();
    saveCartToStorage();
}

// Функция обновления бейджа корзины
function updateCartBadge() {
    const badge = document.querySelector('.cart-badge');
    if (badge) {
        badge.textContent = cartItemCount;
        badge.style.display = cartItemCount > 0 ? 'block' : 'none';
    }
}

// Функция отображения товаров в корзине
function renderCartItems() {
    console.log('renderCartItems: Отображаем товары в корзине');
    
    const cartItemsContainer = document.querySelector('#cartItems');
    if (!cartItemsContainer) {
        console.error('renderCartItems: Контейнер #cartItems не найден');
        return;
    }
    
    if (cart.length === 0) {
        cartItemsContainer.innerHTML = '<div class="empty-cart">Корзина пуста</div>';
        return;
    }
    
    let html = '';
    cart.forEach((item, index) => {
        const oldPrice = item.oldPrice || 0;
        const newPrice = item.newPrice || item.price || 0;
        
        html += `
            <div class="cart-item" data-index="${index}">
                <div class="cart-col-name">
                    <div class="cart-item-image">
                        <img src="${item.image}" alt="${item.name}" onerror="this.src='./images/Discontinued.jpg'">
                    </div>
                    <div class="cart-item-details">
                        <div class="cart-item-name">${item.name}</div>
                    </div>
                </div>
                <div class="cart-col-quantity">
                    <div class="quantity-controls">
                        <button class="quantity-btn minus" onclick="changeQuantity(${index}, -1)" style="width: 20px; height: 20px; font-size: 12px; padding: 0;">-</button>
                        <span class="quantity-value" style="margin: 0 8px; font-size: 14px;">${item.quantity || 1}</span>
                        <button class="quantity-btn plus" onclick="changeQuantity(${index}, 1)" style="width: 20px; height: 20px; font-size: 12px; padding: 0;">+</button>
                    </div>
                </div>
                <div class="cart-col-total">
                    <div class="cart-item-prices">
                        ${oldPrice && oldPrice > 0 && oldPrice !== newPrice ? `<div class="cart-item-old-price">${(oldPrice * (item.quantity || 1)).toFixed(0)} грн.</div>` : ''}
                        <div class="cart-item-price">${(newPrice * (item.quantity || 1)).toFixed(0)} грн.</div>
                    </div>
                    <button class="remove-item-btn" onclick="removeFromCart(${index})">
                        <i class="fas fa-trash"></i>
                    </button>
                </div>
            </div>
        `;
    });
    
    cartItemsContainer.innerHTML = html;
}

// Функция удаления товара из корзины
function removeFromCart(index) {
    if (index >= 0 && index < cart.length) {
        cart.splice(index, 1);
        cartItemCount = cart.length;
        updateCartBadge();
        renderCartItems();
        updateCartCalculations();
        saveCartToStorage();
    }
}

// Функция изменения количества товара
function changeQuantity(index, change) {
    if (index >= 0 && index < cart.length) {
        const item = cart[index];
        if (!item.quantity) {
            item.quantity = 1;
        }
        
        item.quantity += change;
        
        if (item.quantity <= 0) {
            removeFromCart(index);
        } else {
            cartItemCount = cart.reduce((total, item) => total + (item.quantity || 1), 0);
            updateCartBadge();
            renderCartItems();
            updateCartCalculations();
            saveCartToStorage();
        }
    }
}

// Функция обновления расчетов корзины
function updateCartCalculations() {
    let newPricesTotal = 0;
    let oldPricesTotal = 0;
    
    cart.forEach(item => {
        const newPrice = parseInt(item.newPrice || item.price || 0);
        const oldPrice = parseInt(item.oldPrice || 0);
        const quantity = item.quantity || 1;
        
        newPricesTotal += newPrice * quantity;
        if (oldPrice > 0 && oldPrice !== newPrice) {
            oldPricesTotal += oldPrice * quantity;
        } else {
            oldPricesTotal += newPrice * quantity;
        }
    });
    
    const discount = oldPricesTotal - newPricesTotal;
    
    // Обновляем отображение итогов
    const subtotalElement = document.querySelector('#cartSubtotal');
    const discountElement = document.querySelector('#cartDiscount');
    const totalElement = document.querySelector('#cartTotalPrice');
    const payAmountElement = document.querySelector('#cartPayAmount');
    
    if (subtotalElement) {
        subtotalElement.textContent = `${oldPricesTotal.toFixed(0)} грн.`;
    }
    
    if (discountElement) {
        if (discount > 0) {
            discountElement.textContent = `-${discount.toFixed(0)} грн.`;
            discountElement.style.display = 'block';
        } else {
            discountElement.style.display = 'none';
        }
    }
    
    if (totalElement) {
        totalElement.textContent = `${newPricesTotal.toFixed(0)} грн.`;
        
        if (payAmountElement) {
            payAmountElement.textContent = `${newPricesTotal.toFixed(0)} грн`;
        }
    }
}

// Функция показа корзины
function showCartPopup() {
    console.log('showCartPopup: Показываем корзину');
    const popup = document.getElementById('cartPopup');
    if (popup) {
        renderCartItems();
        updateCartCalculations();
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
        popup.classList.add('show');
        popup.style.zIndex = '99999';
        popup.style.display = 'flex';
        popup.style.alignItems = 'center';
        popup.style.justifyContent = 'center';
    }
}

// Функция закрытия контактов
function closeContactsPopup() {
    console.log('closeContactsPopup: Закрываем контакты');
    const popup = document.getElementById('contactsPopup');
    if (popup) {
        popup.classList.remove('show');
        popup.style.display = 'none';
        popup.style.zIndex = '';
    }
}

// Функция показа оферты
function showOfferPopup() {
    console.log('showOfferPopup: Показываем предложение');
    const popup = document.getElementById('offerPopup');
    if (popup) {
        const currentLanguage = localStorage.getItem('selectedLanguage') || 'uk';
        
        const ukContent = document.querySelector('.offer-content-uk');
        const ruContent = document.querySelector('.offer-content-ru');
        const enContent = document.querySelector('.offer-content-en');
        
        if (ukContent) ukContent.classList.remove('active');
        if (ruContent) ruContent.classList.remove('active');
        if (enContent) enContent.classList.remove('active');
        
        switch (currentLanguage) {
            case 'uk':
                if (ukContent) ukContent.classList.add('active');
                break;
            case 'ru':
                if (ruContent) ruContent.classList.add('active');
                break;
            case 'en':
                if (enContent) enContent.classList.add('active');
                break;
        }
        
        popup.classList.add('show');
        popup.style.zIndex = '99999';
        popup.style.display = 'flex';
        popup.style.alignItems = 'center';
        popup.style.justifyContent = 'center';
    }
}

// Функция закрытия оферты
function closeOfferPopup() {
    console.log('closeOfferPopup: Закрываем предложение');
    const popup = document.getElementById('offerPopup');
    if (popup) {
        popup.classList.remove('show');
        popup.style.display = 'none';
        popup.style.zIndex = '';
    }
}

// Функция показа попапа для товаров снятых с производства
function showDiscontinuedPopup() {
    const popup = document.getElementById('discontinuedPopup');
    if (popup) {
        popup.style.display = 'flex';
        popup.style.zIndex = '20000';
    }
}

// Функция показа попапа для товаров которых нет в наличии
function showOutOfStockPopup() {
    const popup = document.getElementById('outOfStockPopup');
    if (popup) {
        popup.style.display = 'flex';
        popup.style.zIndex = '20000';
    }
}

// Функция показа попапа для товаров которые ожидаются
function showExpectedPopup() {
    const popup = document.getElementById('expectedPopup');
    if (popup) {
        popup.style.display = 'flex';
        popup.style.zIndex = '20000';
    }
}

// Функция показа попапа для товаров под заказ
function showOnOrderPopup() {
    const popup = document.getElementById('onOrderPopup');
    if (popup) {
        popup.style.display = 'flex';
        popup.style.zIndex = '20000';
    }
}

// Функция показа уведомления о добавлении в корзину
function showAddToCartNotification(productName) {
    const notification = document.createElement('div');
    notification.className = 'add-to-cart-notification';
    notification.style.cssText = `
        position: fixed;
        top: 20px;
        right: 20px;
        background: #4CAF50;
        color: white;
        padding: 15px 20px;
        border-radius: 5px;
        z-index: 10000;
        box-shadow: 0 4px 8px rgba(0,0,0,0.2);
        animation: slideIn 0.3s ease-out;
    `;
    notification.textContent = 'Товар "' + productName + '" добавлен в корзину!';
    
    const style = document.createElement('style');
    style.textContent = `
        @keyframes slideIn {
            from { transform: translateX(100%); opacity: 0; }
            to { transform: translateX(0); opacity: 1; }
        }
        @keyframes slideOut {
            from { transform: translateX(0); opacity: 1; }
            to { transform: translateX(100%); opacity: 0; }
        }
    `;
    document.head.appendChild(style);
    
    document.body.appendChild(notification);
    
    setTimeout(function() {
        notification.style.animation = 'slideOut 0.3s ease-in';
        setTimeout(function() {
            if (notification.parentNode) {
                notification.parentNode.removeChild(notification);
            }
        }, 300);
    }, 3000);
}

// Функция создания карточки товара
function createProductCard(product, index) {
    const card = document.createElement('div');
    card.className = 'product-card';
    
    const currentLanguage = localStorage.getItem('selectedLanguage') || 'uk';
    const currentTranslations = translations[currentLanguage] || translations.uk;
    
    let statusClass = 'in-stock';
    let statusText = currentTranslations.inStock;
    let statusButton = '';
    
    if (product.availability === 'Нет в наличии') {
        statusClass = 'out-of-stock';
        statusText = currentTranslations.outOfStock;
        statusButton = `<button class="btn status-btn out-of-stock" onclick="showOutOfStockPopup()">${statusText}</button>`;
    } else if (product.availability === 'Под заказ') {
        statusClass = 'on-order';
        statusText = currentTranslations.onOrder;
        statusButton = `<button class="btn status-btn on-order" onclick="showOnOrderPopup()">${statusText}</button>`;
    } else if (product.availability === 'Ожидается') {
        statusClass = 'expected';
        statusText = currentTranslations.expected;
        statusButton = `<button class="btn status-btn expected" onclick="showExpectedPopup()">${statusText}</button>`;
    } else if (product.availability === 'Снят с производства') {
        statusClass = 'discontinued';
        statusText = currentTranslations.discontinued;
        statusButton = `<button class="btn status-btn discontinued" onclick="showDiscontinuedPopup()">${statusText}</button>`;
    } else {
        statusButton = `<button class="btn add-to-cart-btn" data-index="${index}">${currentTranslations.buyButton}</button>`;
    }
    
    const newPrice = product.newPrice || product.price || 0;
    const oldPrice = product.oldPrice || 0;
    
    const oldPriceHtml = oldPrice && oldPrice > 0 && oldPrice !== newPrice ? 
        '<div class="old-price">' + oldPrice + ' грн</div>' : '';
    
    const ratingHtml = createRatingHtml(product.rating, currentTranslations);
    
    const cardHtml = 
        '<div class="product-card-top">' +
            '<div class="product-actions">' +
                '<button class="favorite-btn" data-index="' + index + '"><i class="far fa-heart"></i></button>' +
                '<button class="compare-btn" data-index="' + index + '"><i class="fas fa-balance-scale"></i></button>' +
            '</div>' +
            '<div class="img-container">' +
                '<img class="img" src="' + product.image + '" alt="' + product.name + '" onerror="this.src=\'./images/Discontinued.jpg\'">' +
            '</div>' +
            '<div class="product-title">' + product.name + '</div>' +
            '<div class="product-status ' + statusClass + '">' + statusText + '</div>' +
            '<div class="product-subtitle">' +
                '<input type="checkbox" class="compare-checkbox" data-index="' + index + '">' +
                '<span>' + currentTranslations.compare + '</span>' +
            '</div>' +
            '<div class="product-prices">' +
                oldPriceHtml +
                '<div class="new-price">' + newPrice + ' грн</div>' +
            '</div>' +
            '<div class="product-rating">' + ratingHtml + '</div>' +
        '</div>' +
        statusButton;
    
    card.innerHTML = cardHtml;
    return card;
}

// Функция создания HTML для рейтинга
function createRatingHtml(rating, currentTranslations) {
    if (!rating || rating === 'Нет рейтинга') {
        return '<span class="no-rating">' + (currentTranslations.noRating || 'Нет рейтинга') + '</span>';
    }
    
    const ratingValue = parseFloat(rating);
    if (isNaN(ratingValue)) {
        return '<span class="no-rating">' + (currentTranslations.noRating || 'Нет рейтинга') + '</span>';
    }
    
    let html = '';
    const fullStars = Math.floor(ratingValue);
    const hasHalfStar = ratingValue % 1 >= 0.5;
    const emptyStars = 5 - fullStars - (hasHalfStar ? 1 : 0);
    
    for (let i = 0; i < fullStars; i++) {
        html += '<span class="star-filled">★</span>';
    }
    
    if (hasHalfStar) {
        html += '<span class="star-half">★</span>';
    }
    
    for (let i = 0; i < emptyStars; i++) {
        html += '<span class="star-empty">★</span>';
    }
    
    return html;
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
    loadedProductNames.clear();
    window.currentProducts = products;
    
    products.forEach(product => {
        loadedProductNames.add(product.name);
    });
    
    products.forEach((product, index) => {
        const productCard = createProductCard(product, index);
        container.appendChild(productCard);
    });
}

// Функция добавления товаров к существующим
function appendProducts(products) {
    const container = document.querySelector('.inner');
    if (!container) return;
    
    const uniqueProducts = [];
    products.forEach(product => {
        if (!loadedProductNames.has(product.name)) {
            uniqueProducts.push(product);
            loadedProductNames.add(product.name);
        }
    });
    
    uniqueProducts.forEach((product, index) => {
        const productCard = createProductCard(product, window.currentProducts.length + index);
        container.appendChild(productCard);
    });
    
    if (!window.currentProducts) {
        window.currentProducts = [];
    }
    window.currentProducts.push(...uniqueProducts);
}

// Функция показа результатов поиска
function showNoSearchResults(searchTerm) {
    const container = document.querySelector('.inner');
    if (!container) return;
    
    container.innerHTML = `
        <div style="padding: 40px; text-align: center;">
            <i class="fas fa-search" style="font-size: 48px; margin-bottom: 20px; opacity: 0.5;"></i>
            <h3>По запросу "${searchTerm}" ничего не найдено</h3>
            <p>Попробуйте изменить поисковый запрос</p>
            <button class="btn" onclick="clearSearch()" style="margin-top: 20px;">
                <i class="fas fa-times"></i> Очистить поиск
            </button>
        </div>
    `;
}

// Функция очистки поиска
async function clearSearch() {
    const searchInput = document.querySelector('.search-input');
    if (searchInput) {
        searchInput.value = '';
    }
    
    searchTerm = '';
    isSearchActive = false;
    currentPage = 0;
    hasMoreProducts = true;
    loadedProductNames.clear();
    
    await loadProducts(0, false);
}

// Функция загрузки следующей страницы
async function loadNextPage() {
    if (isLoading || !hasMoreProducts || isSearchActive) {
        return;
    }
    
    const nextPage = currentPage + 1;
    await loadProducts(nextPage, true);
}

// Функция переключения языка
function switchLanguage(lang) {
    localStorage.setItem('selectedLanguage', lang);
    
    const elements = document.querySelectorAll('[data-translate]');
    elements.forEach(element => {
        const key = element.getAttribute('data-translate');
        if (translations[lang] && translations[lang][key]) {
            if (key === 'offerText') {
                element.innerHTML = translations[lang][key];
            } else if (key === 'searchPlaceholder') {
                element.placeholder = translations[lang][key];
            } else {
                element.textContent = translations[lang][key];
            }
        }
    });
    
    const placeholderElements = document.querySelectorAll('[data-translate-placeholder]');
    placeholderElements.forEach(element => {
        const key = element.getAttribute('data-translate-placeholder');
        if (translations[lang] && translations[lang][key]) {
            element.placeholder = translations[lang][key];
        }
    });
    
    document.documentElement.lang = lang;
    
    if (window.currentProducts && window.currentProducts.length > 0) {
        displayProducts(window.currentProducts);
    }
}

// Функция инициализации языка
function initializeLanguage() {
    const savedLanguage = localStorage.getItem('selectedLanguage') || 'uk';
    switchLanguage(savedLanguage);
}

// Функция настройки переключателей языка
function setupLanguageSwitchers() {
    const ukButton = document.querySelector('[data-lang="uk"]');
    const ruButton = document.querySelector('[data-lang="ru"]');
    const enButton = document.querySelector('[data-lang="en"]');
    
    if (ukButton) {
        ukButton.addEventListener('click', function() {
            switchLanguage('uk');
        });
    }
    
    if (ruButton) {
        ruButton.addEventListener('click', function() {
            switchLanguage('ru');
        });
    }
    
    if (enButton) {
        enButton.addEventListener('click', function() {
            switchLanguage('en');
        });
    }
}

// Функция настройки обработчиков событий
function setupEventHandlers() {
    // Обработчик клавиши ESC
    document.addEventListener('keydown', function(event) {
        if (event.key === 'Escape') {
            const cartPopup = document.getElementById('cartPopup');
            if (cartPopup && cartPopup.style.display === 'flex') {
                closeCartPopup();
                return;
            }
            
            const contactsPopup = document.getElementById('contactsPopup');
            if (contactsPopup && contactsPopup.classList.contains('show')) {
                closeContactsPopup();
                return;
            }
            
            const offerPopup = document.getElementById('offerPopup');
            if (offerPopup && offerPopup.classList.contains('show')) {
                closeOfferPopup();
                return;
            }
        }
    });
    
    // Обработчик клика вне попапов
    document.addEventListener('click', function(event) {
        const contactsPopup = document.getElementById('contactsPopup');
        const offerPopup = document.getElementById('offerPopup');
        const isContactsOpen = contactsPopup && contactsPopup.classList.contains('show');
        const isOfferOpen = offerPopup && offerPopup.classList.contains('show');
        
        if (isContactsOpen || isOfferOpen) {
            return;
        }
        
        const cartPopup = document.getElementById('cartPopup');
        const cartBtn = document.querySelector('.cart-btn');
        
        if (cartPopup && cartPopup.style.display === 'flex') {
            if (cartBtn && !cartBtn.contains(event.target) && !cartPopup.contains(event.target)) {
                closeCartPopup();
            }
        }
    });
    
    // Обработчик кликов по кнопкам добавления в корзину
    document.addEventListener('click', function(event) {
        if (event.target.classList.contains('add-to-cart-btn')) {
            const index = parseInt(event.target.getAttribute('data-index'));
            
            if (window.currentProducts && window.currentProducts[index]) {
                const product = window.currentProducts[index];
                addToCart(product);
                showAddToCartNotification(product.name);
            }
        }
        
        // Обработчик кнопки избранного
        if (event.target.closest('.favorite-btn')) {
            const btn = event.target.closest('.favorite-btn');
            btn.classList.toggle('active');
            const icon = btn.querySelector('i');
            if (btn.classList.contains('active')) {
                icon.className = 'fas fa-heart';
                icon.style.color = '#ff6b6b';
            } else {
                icon.className = 'far fa-heart';
                icon.style.color = '';
            }
        }
        
        // Обработчик кнопки сравнения
        if (event.target.closest('.compare-btn')) {
            const btn = event.target.closest('.compare-btn');
            const productCard = btn.closest('.product-card');
            const checkbox = productCard.querySelector('.compare-checkbox');
            
            btn.classList.toggle('active');
            const icon = btn.querySelector('i');
            if (btn.classList.contains('active')) {
                icon.className = 'fas fa-balance-scale';
                icon.style.color = '#FFD700';
                checkbox.checked = true;
            } else {
                icon.className = 'fas fa-balance-scale';
                icon.style.color = '#666';
                checkbox.checked = false;
            }
        }
        
        // Обработчик чекбокса сравнения
        if (event.target.classList.contains('compare-checkbox')) {
            const checkbox = event.target;
            const productCard = checkbox.closest('.product-card');
            const compareBtn = productCard.querySelector('.compare-btn');
            const icon = compareBtn.querySelector('i');
            
            if (checkbox.checked) {
                compareBtn.classList.add('active');
                icon.className = 'fas fa-balance-scale';
                icon.style.color = '#FFD700';
            } else {
                compareBtn.classList.remove('active');
                icon.className = 'fas fa-balance-scale';
                icon.style.color = '#666';
            }
        }
    });
    
    // Обработчик поиска
    const searchInput = document.querySelector('.search-input');
    if (searchInput) {
        searchInput.addEventListener('input', function(e) {
            const query = e.target.value;
            
            if (searchTimeout) {
                clearTimeout(searchTimeout);
            }
            
            if (!query.trim()) {
                searchTerm = '';
                isSearchActive = false;
                currentPage = 0;
                hasMoreProducts = true;
                loadedProductNames.clear();
                loadProducts(0, false);
                return;
            }
            
            searchTimeout = setTimeout(function() {
                searchProducts(query);
            }, 300);
        });
    }
    
    // Обработчик прокрутки для бесконечной загрузки
    window.addEventListener('scroll', function() {
        if (isLoading || !hasMoreProducts || isSearchActive) {
            return;
        }
        
        const scrollTop = window.pageYOffset || document.documentElement.scrollTop;
        const windowHeight = window.innerHeight;
        const documentHeight = document.documentElement.scrollHeight;
        
        if (scrollTop + windowHeight >= documentHeight - 100) {
            loadNextPage();
        }
    });
    
    // Обработчик кнопки корзины
    const cartBtn = document.querySelector('.cart-btn');
    if (cartBtn) {
        cartBtn.addEventListener('click', function() {
            showCartPopup();
        });
    }
    
    // Обработчик кликов по кнопкам нижней панели меню
    const navItems = document.querySelectorAll('.nav-item');
    
    if (navItems.length > 0) {
        navItems[0].classList.add('active');
        
        navItems.forEach((navItem, index) => {
            if (navItem._clickHandler) {
                navItem.removeEventListener('click', navItem._clickHandler);
            }
            
            navItem._clickHandler = (e) => {
                e.stopPropagation();
                e.preventDefault();
                e.stopImmediatePropagation();
                
                navItems.forEach(item => {
                    item.classList.remove('active');
                });
                
                navItem.classList.add('active');
                
                const navText = navItem.querySelector('span').textContent;
                
                if (navText.includes('Корзина') || navText.includes('Cart')) {
                    showCartPopup();
                } else if (navText.includes('Контакты') || navText.includes('Contacts')) {
                    showContactsPopup();
                } else if (navText.includes('Оферта') || navText.includes('Offer')) {
                    showOfferPopup();
                }
                
                return false;
            };
            
            navItem.addEventListener('click', navItem._clickHandler);
        });
    }
}

// Инициализация при загрузке страницы
document.addEventListener('DOMContentLoaded', function() {
    console.log('DOM загружен, инициализируем приложение');
    
    initializeLanguage();
    initializeCart();
    
    currentPage = 0;
    hasMoreProducts = true;
    loadedProductNames.clear();
    
    // Загружаем товары
    loadProducts(0, false);
    
    setupEventHandlers();
    setupLanguageSwitchers();
});

// Делаем функции доступными глобально
window.showContactsPopup = showContactsPopup;
window.closeContactsPopup = closeContactsPopup;
window.showOfferPopup = showOfferPopup;
window.closeOfferPopup = closeOfferPopup;
window.showDiscontinuedPopup = showDiscontinuedPopup;
window.showOutOfStockPopup = showOutOfStockPopup;
window.showExpectedPopup = showExpectedPopup;
window.showOnOrderPopup = showOnOrderPopup;
window.removeFromCart = removeFromCart;
window.changeQuantity = changeQuantity;

console.log('app_github_pages.js инициализирован');
