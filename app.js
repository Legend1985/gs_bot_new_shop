let tg = window.Telegram.WebApp;

tg.expand();

tg.MainButton.textColor = '#FFFFFF';
tg.MainButton.color = '#2cab37';

// Функции для отладки
function updateDebugInfo(status, productsCount = 0, error = null) {
    const loadStatus = document.getElementById('load-status');
    const productsCountEl = document.getElementById('products-count');
    const errorInfo = document.getElementById('error-info');
    
    if (loadStatus) loadStatus.textContent = status;
    if (productsCountEl) productsCountEl.textContent = productsCount;
    if (errorInfo) errorInfo.textContent = error || 'Нет';
}

// Переменные для загрузки товаров
let currentPage = 0;
let isLoading = false;
let hasMoreProducts = true;
const productsPerPage = 60;

// Функция загрузки товаров
async function loadProducts(page = 0) {
    if (isLoading || !hasMoreProducts) return;
    
    isLoading = true;
    updateDebugInfo('Загрузка...');
    const start = page * productsPerPage;
    
    try {
        console.log(`Загружаем страницу ${page + 1}, start: ${start}`);
        updateDebugInfo(`Загружаем страницу ${page + 1}...`);
        
        const response = await fetch(`api.php?start=${start}&limit=${productsPerPage}`);
        console.log('Ответ API получен:', response.status);
        
        if (!response.ok) {
            throw new Error(`HTTP error! status: ${response.status}`);
        }
        
        const data = await response.json();
        console.log('Данные API:', data);
        
        if (data.success) {
            if (data.products && data.products.length > 0) {
                console.log(`Рендерим ${data.products.length} товаров`);
                updateDebugInfo(`Рендерим ${data.products.length} товаров`);
                renderProducts(data.products);
                currentPage = page;
                
                if (!data.hasMore) {
                    hasMoreProducts = false;
                    console.log('Больше товаров нет');
                }
            } else {
                hasMoreProducts = false;
                console.log('Товары не найдены');
                updateDebugInfo('Товары не найдены');
            }
        } else {
            console.error('Ошибка API:', data.error);
            updateDebugInfo('Ошибка API', 0, data.error);
        }
    } catch (error) {
        console.error('Ошибка загрузки:', error);
        updateDebugInfo('Ошибка загрузки', 0, error.message);
    } finally {
        isLoading = false;
    }
}

// Функция отображения товаров
function renderProducts(products) {
    const container = document.querySelector('.inner');
    console.log('Контейнер для товаров:', container);
    
    if (!container) {
        console.error('Контейнер .inner не найден!');
        updateDebugInfo('Ошибка: контейнер не найден', 0, 'Контейнер .inner не найден');
        return;
    }
    
    products.forEach((product, index) => {
        console.log('Создаем карточку для товара:', product.name);
        const productCard = createProductCard(product, `btn${currentPage * productsPerPage + index + 1}`);
        container.appendChild(productCard);
    });
    
    console.log(`Всего товаров в контейнере: ${container.children.length}`);
    updateDebugInfo('Готово', container.children.length);
}

// Функция создания карточки товара
function createProductCard(product, btnId) {
    const card = document.createElement('div');
    card.className = 'item';
    card.innerHTML = `
        <img src="${product.image}" alt="${product.name}">
        <h3>${product.name}</h3>
        <p class="price">
            <span class="old-price">${product.oldPrice}</span>
            <span class="new-price">${product.newPrice} грн</span>
        </p>
        <p class="availability">${product.availability}</p>
        <button id="${btnId}" class="buy-btn">Купить</button>
    `;
    
    // Добавляем обработчик для кнопки
    const button = card.querySelector(`#${btnId}`);
    button.addEventListener('click', () => {
        tg.MainButton.text = `Выбрано: ${product.name}`;
        tg.MainButton.show();
    });
    
    return card;
}

// Функция загрузки дополнительных товаров при прокрутке
function handleScroll() {
    if (isLoading || !hasMoreProducts) return;
    
    const scrollTop = window.pageYOffset || document.documentElement.scrollTop;
    const windowHeight = window.innerHeight;
    const documentHeight = document.documentElement.scrollHeight;
    
    if (scrollTop + windowHeight >= documentHeight - 100) {
        loadProducts(currentPage + 1);
    }
}

// Добавляем обработчик прокрутки
window.addEventListener('scroll', handleScroll);

// Загружаем первую страницу при загрузке
document.addEventListener('DOMContentLoaded', () => {
    console.log('Страница загружена, начинаем загрузку товаров...');
    updateDebugInfo('Страница загружена, загружаем товары...');
    loadProducts(0);
});








