let tg = window.Telegram.WebApp;

tg.expand();

tg.MainButton.textColor = '#FFFFFF';
tg.MainButton.color = '#2cab37';

let item = "";

let btn1 = document.getElementById("btn1");
let btn2 = document.getElementById("btn2");
let btn3 = document.getElementById("btn3");
let btn4 = document.getElementById("btn4");
let btn5 = document.getElementById("btn5");
let btn6 = document.getElementById("btn6");

// Переменные для фильтрации и сортировки
let currentSort = 'availability';
let currentSortDir = 'DESC';
let allProducts = []; // Массив всех загруженных товаров
let filteredProducts = []; // Массив отфильтрованных товаров

// Переменные для бесконечной прокрутки
let currentPage = 0;
let isLoading = false;
let hasMoreProducts = true;
const productsPerPage = 60;
let maxProducts = 377; // Будет обновляться из API
let loadedProductNames = new Set(); // Для отслеживания уже загруженных товаров
let savedScrollPosition = 0; // Сохраненная позиция прокрутки

// Функция инициализации фильтра
function initFilter() {
    const filterButtons = document.querySelectorAll('.filter-btn');
    console.log(`Найдено ${filterButtons.length} кнопок фильтра`);
    
    filterButtons.forEach(btn => {
        // Добавляем обработчики для разных типов событий
        const handleClick = function(e) {
            e.preventDefault();
            e.stopPropagation();
            
            const sortType = this.getAttribute('data-sort');
            let sortDir = this.getAttribute('data-dir');
            
            // Если нажимаем на ту же кнопку, меняем направление сортировки
            if (currentSort === sortType) {
                sortDir = currentSortDir === 'ASC' ? 'DESC' : 'ASC';
                this.setAttribute('data-dir', sortDir);
                
                // Обновляем текст стрелки для кнопки "Наличие товара"
                const arrow = this.querySelector('.sort-arrow');
                if (arrow) {
                    arrow.textContent = sortDir === 'ASC' ? '+/-' : '+/-';
                }
            }
            
            // Убираем активный класс со всех кнопок
            filterButtons.forEach(b => b.classList.remove('active'));
            
            // Добавляем активный класс к нажатой кнопке
            this.classList.add('active');
            
            // Обновляем текущие параметры сортировки
            currentSort = sortType;
            currentSortDir = sortDir;
            
            // Сортируем и перерисовываем товары
            sortAndRenderProducts();
            
            console.log(`Фильтр применен: ${sortType} (${sortDir})`);
        };
        
        // Добавляем несколько типов обработчиков для совместимости
        btn.addEventListener('click', handleClick);
        btn.addEventListener('touchstart', handleClick);
        btn.addEventListener('touchend', handleClick);
        
        // Для мобильных устройств добавляем обработчик touch
        if ('ontouchstart' in window) {
            btn.addEventListener('touchstart', handleClick, { passive: false });
        }
        
        console.log(`Обработчики добавлены для кнопки: ${btn.getAttribute('data-sort')}`);
    });
    
    // Восстанавливаем активную кнопку из сохраненного состояния
    const activeBtn = document.querySelector(`[data-sort="${currentSort}"]`);
    if (activeBtn) {
        activeBtn.classList.add('active');
        activeBtn.setAttribute('data-dir', currentSortDir);
    } else {
        // Устанавливаем активную кнопку по умолчанию
        const defaultBtn = document.querySelector('[data-sort="availability"]');
        if (defaultBtn) {
            defaultBtn.classList.add('active');
        }
    }
}

// Функция сортировки товаров
function sortProducts(products, sortType, sortDir) {
    return products.sort((a, b) => {
        let aValue, bValue;
        
        switch (sortType) {
            case 'availability':
                // Сортируем по наличию: в наличии сначала, затем остальные
                const aInStock = a.inStock || a.availability?.includes('наличии') || a.availability?.includes('В наличии');
                const bInStock = b.inStock || b.availability?.includes('наличии') || b.availability?.includes('В наличии');
                aValue = aInStock ? 1 : 0;
                bValue = bInStock ? 1 : 0;
                break;
                
            case 'price':
                // Сортируем по цене (убираем "грн" и конвертируем в число)
                aValue = parseInt((a.newPrice || '0').replace(/\D/g, ''));
                bValue = parseInt((b.newPrice || '0').replace(/\D/g, ''));
                break;
                
            case 'name':
                // Сортируем по названию
                aValue = (a.name || a.title || '').toLowerCase();
                bValue = (b.name || b.title || '').toLowerCase();
                break;
                
            case 'rating':
                // Сортируем по рейтингу
                aValue = a.rating || 0;
                bValue = b.rating || 0;
                break;
                
            default:
                return 0;
        }
        
        // Применяем направление сортировки
        if (sortDir === 'DESC') {
            return bValue > aValue ? 1 : bValue < aValue ? -1 : 0;
        } else {
            return aValue > bValue ? 1 : aValue < bValue ? -1 : 0;
        }
    });
}

// Функция сортировки и перерисовки товаров
function sortAndRenderProducts() {
    if (allProducts.length === 0) {
        console.log('Нет товаров для сортировки');
        return;
    }
    
    console.log(`Начинаем сортировку ${allProducts.length} товаров по ${currentSort} (${currentSortDir})`);
    
    // Сортируем товары
    filteredProducts = sortProducts([...allProducts], currentSort, currentSortDir);
    
    // Очищаем контейнер
    const container = document.querySelector('.inner');
    if (!container) {
        console.error('Контейнер .inner не найден');
        return;
    }
    container.innerHTML = '';
    
    // Перерисовываем товары
    filteredProducts.forEach((product, index) => {
        const productCard = createProductCard(product, index + 1);
        container.appendChild(productCard);
    });
    
    console.log(`Товары отсортированы по ${currentSort} (${currentSortDir}). Показано ${filteredProducts.length} товаров`);
}

// Функция загрузки товаров с сайта
async function loadProducts(page = 0) {
    if (isLoading || !hasMoreProducts) return;
    
    isLoading = true;
    const start = page * productsPerPage;
    
    try {
        // API запрос к серверу для получения товаров
        const response = await fetch(`api.php?start=${start}&limit=${productsPerPage}`);
        const data = await response.json();
        
        if (data.success) {
            // Обновляем общее количество товаров из API
            if (data.totalProducts) {
                maxProducts = data.totalProducts;
            }
            
            // Фильтруем дубликаты
            const uniqueProducts = data.products.filter(product => {
                if (loadedProductNames.has(product.name)) {
                    console.log(`Пропускаем дубликат: ${product.name}`);
                    return false; // Пропускаем дубликат
                }
                loadedProductNames.add(product.name);
                return true;
            });
            
            if (uniqueProducts.length === 0 || !data.hasMore) {
                hasMoreProducts = false;
                console.log('Больше товаров нет или все дубликаты');
            }
            
            renderProducts(uniqueProducts);
            currentPage = page;
            
            console.log(`Загружено ${uniqueProducts.length} товаров. Всего загружено: ${loadedProductNames.size} из ${maxProducts}`);
            console.log(`Страница: ${page + 1}, start: ${start}`);
        } else {
            console.error('Ошибка API:', data.error);
            // Если API недоступен, используем моковые данные
            const products = generateMockProducts(start, productsPerPage);
            renderProducts(products);
            currentPage = page;
        }
        
    } catch (error) {
        console.error('Ошибка загрузки товаров:', error);
        // При ошибке используем моковые данные
        const products = generateMockProducts(start, productsPerPage);
        renderProducts(products);
        currentPage = page;
    } finally {
        isLoading = false;
    }
}

// Генерация моковых товаров для демонстрации
function generateMockProducts(start, limit) {
    const products = [];
    const productNames = [
        'Ernie Ball 2221 Regular Slinky 10-46',
        'Rotosound R13 Roto Greys 13-54',
        'Dunlop DEN1046 Nickel Wound Light 10-46',
        'GHS Boomers GBTM 11-50 Medium',
        'Fender 250M Nickel-Plated Steel 11-49 Medium'
    ];
    
    for (let i = 0; i < limit && (start + i) < maxProducts; i++) {
        const productIndex = (start + i) % productNames.length;
        products.push({
            id: start + i + 1,
            name: productNames[productIndex],
            oldPrice: 400 + Math.floor(Math.random() * 100),
            newPrice: 350 + Math.floor(Math.random() * 50),
            image: 'Goods/Electric_guitar_strings/2221/Ernie_Ball_2221_10-46_150.jpg',
            inStock: true
        });
    }
    
    return products;
}

// Функция рендеринга товаров
function renderProducts(products) {
    // Добавляем новые товары в общий массив
    allProducts = [...allProducts, ...products];
    
    // Сортируем и отображаем все товары
    sortAndRenderProducts();
}

// Создание карточки товара
function createProductCard(product, btnId) {
    const card = document.createElement('div');
    card.className = 'product-card';
    
    // Отладочная информация
    console.log(`Создаем карточку товара: ${product.name || product.title || 'Без названия'}`);
    
    // Проверяем наличие изображения
    let imageSrc = product.image;
    if (!imageSrc || imageSrc === '') {
        imageSrc = 'Goods/Electric_guitar_strings/2221/Ernie_Ball_2221_10-46_150.jpg';
    }
    
    // Проверяем наличие цен
    const oldPrice = product.oldPrice || 400;
    let newPrice = product.newPrice || 350;
    
    // Убираем "грн" из красной цены, так как оно добавляется через CSS
    newPrice = newPrice.replace(/\s*грн\s*/g, '').trim();
    
    // Статус товара
    const status = product.inStock ? 'В наличии' : 'Нет в наличии';
    const statusClass = product.inStock ? 'product-status' : 'product-status out-of-stock';
    
    // Определяем класс кнопки и текст
    let buttonClass = 'btn';
    let buttonText = 'Купить';
    let newPriceClass = 'new-price';
    
    if (status.includes('производства')) {
        buttonClass = 'btn discontinued';
        buttonText = 'Снят';
        newPriceClass = 'new-price discontinued';
    }
    
    // Обработка названия товара
    const productName = product.name || product.title || 'Название товара не указано';
    
    card.innerHTML = `
        <div class="product-card-top">
            <img src="${imageSrc}" alt="${productName}" class="img" onerror="this.src='Goods/Electric_guitar_strings/2221/Ernie_Ball_2221_10-46_150.jpg'">
            <div class="product-title" style="text-align:center;">${productName}</div>
        </div>
        <div class="product-card-bottom">
            <div class="${statusClass}">${status}</div>
            <div class="product-bottom-row">
                <div class="product-prices">
                    <div class="old-price">${oldPrice} грн</div>
                    <div class="${newPriceClass}">${newPrice}</div>
                </div>
                <button class="${buttonClass}" id="btn${btnId}">${buttonText}</button>
            </div>
        </div>
    `;
    
    // Добавляем обработчик для кнопки
    const btn = card.querySelector(`#btn${btnId}`);
    btn.addEventListener("click", function(){
        if (tg.MainButton.isVisible) {
            tg.MainButton.hide();
        }
        else {
            tg.MainButton.setText(`Вы выбрали товар ${btnId}!`);
            item = btnId.toString();
            tg.MainButton.show();
        }
    });
    
    return card;
}

// Обработчик прокрутки для бесконечной загрузки
function handleScroll() {
    if ((window.innerHeight + window.scrollY) >= document.body.offsetHeight - 1000) {
        console.log(`Прокрутка: isLoading=${isLoading}, hasMoreProducts=${hasMoreProducts}, currentPage=${currentPage}`);
        if (!isLoading && hasMoreProducts) {
            console.log('Запускаем загрузку дополнительных товаров...');
            loadMoreProducts();
        } else if (isLoading) {
            console.log('Загрузка уже идет, пропускаем...');
        } else if (!hasMoreProducts) {
            console.log('Больше товаров нет, пропускаем...');
        }
    }
}

// Функция загрузки дополнительных страниц товаров
async function loadMoreProducts() {
    if (isLoading || !hasMoreProducts) return;
    
    isLoading = true;
    const nextPage = currentPage + 1;
    
    // Показываем индикатор загрузки
    showLoadingIndicator();
    
    try {
        console.log(`Загружаем страницу ${nextPage + 1} товаров с сайта...`);
        
        // Получаем данные следующей страницы с сайта
        const siteData = await fetchProductData(nextPage);
        
        if (siteData && siteData.length > 0) {
            // Фильтруем дубликаты
            const uniqueProducts = siteData.filter(product => {
                if (loadedProductNames.has(product.title)) {
                    console.log(`Пропускаем дубликат: ${product.title}`);
                    return false;
                }
                loadedProductNames.add(product.title);
                return true;
            });
            
            if (uniqueProducts.length > 0) {
                // Убираем индикатор загрузки
                hideLoadingIndicator();
                
                // Добавляем новые товары в общий массив
                allProducts = [...allProducts, ...uniqueProducts];
                
                // Сортируем и перерисовываем все товары
                sortAndRenderProducts();
                
                console.log(`Загружено ${uniqueProducts.length} новых товаров со страницы ${nextPage + 1}`);
            }
            
            // Проверяем, есть ли еще товары
            hasMoreProducts = siteData.length >= productsPerPage;
            currentPage = nextPage;
            
            console.log(`Всего загружено товаров: ${loadedProductNames.size}`);
            console.log(`Обновлено hasMoreProducts: ${hasMoreProducts} (siteData.length: ${siteData.length}, productsPerPage: ${productsPerPage})`);
            
            // Сохраняем состояние после загрузки новой страницы
            saveState();
            
        } else {
            // Если товаров нет, значит достигли конца
            hasMoreProducts = false;
            hideLoadingIndicator();
            showEndMessage();
            console.log('Достигнут конец списка товаров');
        }
        
    } catch (error) {
        console.error('Ошибка загрузки дополнительных товаров:', error);
        hasMoreProducts = false;
        hideLoadingIndicator();
    } finally {
        isLoading = false;
    }
}

// Показать индикатор загрузки
function showLoadingIndicator() {
    const container = document.querySelector('.inner');
    const loadingDiv = document.createElement('div');
    loadingDiv.id = 'loading-indicator';
    loadingDiv.innerHTML = `
        <div style="
            display: flex;
            flex-direction: column;
            align-items: center;
            justify-content: center;
            padding: 20px;
            text-align: center;
        ">
            <div style="
                width: 30px;
                height: 30px;
                border: 3px solid #f3f3f3;
                border-top: 3px solid #007bff;
                border-radius: 50%;
                animation: spin 1s linear infinite;
                margin-bottom: 10px;
            "></div>
            <p style="color: #666; font-size: 14px; margin: 0;">Загружаем еще товары...</p>
        </div>
    `;
    container.appendChild(loadingDiv);
}

// Скрыть индикатор загрузки
function hideLoadingIndicator() {
    const loadingDiv = document.getElementById('loading-indicator');
    if (loadingDiv) {
        loadingDiv.remove();
    }
}

// Показать сообщение о конце списка
function showEndMessage() {
    const container = document.querySelector('.inner');
    const endDiv = document.createElement('div');
    endDiv.innerHTML = `
        <div style="
            text-align: center;
            padding: 20px;
            color: #666;
            font-size: 14px;
        ">
            <p>Все товары загружены</p>
        </div>
    `;
    container.appendChild(endDiv);
}

// Создание заставки загрузки
function createLoadingScreen() {
    const container = document.querySelector('.inner');
    container.innerHTML = `
        <div class="loading-screen" style="
            display: flex;
            flex-direction: column;
            align-items: center;
            justify-content: center;
            height: 300px;
            width: 100%;
            text-align: center;
        ">
            <div class="loading-spinner" style="
                width: 50px;
                height: 50px;
                border: 4px solid #f3f3f3;
                border-top: 4px solid #007bff;
                border-radius: 50%;
                animation: spin 1s linear infinite;
                margin-bottom: 20px;
            "></div>
            <h3 style="color: #333; margin-bottom: 10px;">Загружаем товары...</h3>
            <p style="color: #666; font-size: 14px;">Получаем актуальные цены с сайта</p>
        </div>
    `;
    
    // Добавляем CSS анимацию
    const style = document.createElement('style');
    style.textContent = `
        @keyframes spin {
            0% { transform: rotate(0deg); }
            100% { transform: rotate(360deg); }
        }
    `;
    document.head.appendChild(style);
}

// Инициализация
document.addEventListener('DOMContentLoaded', function() {
    // Показываем заставку загрузки
    createLoadingScreen();
    
    // Загружаем реальные товары с сайта
    loadRealProducts();
    
    // Добавляем обработчик прокрутки
    window.addEventListener('scroll', handleScroll);
    
    // Настраиваем автосохранение состояния
    startAutoSave();
    setupBeforeUnload();
    
    // Инициализируем фильтр после небольшой задержки
    setTimeout(() => {
        initFilter();
        console.log('Фильтр инициализирован');
    }, 100);
    
    console.log('Приложение инициализировано с автосохранением состояния');
});

// Функция загрузки реальных товаров с сайта
async function loadRealProducts() {
    try {
        // Пытаемся восстановить состояние
        const stateRestored = loadState();
        
        if (stateRestored && loadedProductNames.size > 0) {
            console.log('Восстанавливаем сохраненное состояние...');
            await restoreAllProducts();
        } else {
            console.log('Загружаем первую страницу товаров с сайта...');
            await loadFirstPage();
        }
        
    } catch (error) {
        console.error('Ошибка загрузки реальных товаров:', error);
        // При ошибке используем моковые данные
        loadProducts(0);
    }
}

// Загрузка первой страницы
async function loadFirstPage() {
    const siteData = await fetchProductData(0);
    
    if (siteData && siteData.length > 0) {
        // Очищаем общий массив товаров
        allProducts = [];
        
        // Добавляем товары в общий массив
        allProducts = siteData;
        
        // Сортируем и отображаем товары
        sortAndRenderProducts();
        
        console.log(`Загружено ${siteData.length} товаров с первой страницы сайта`);
        
        // Обновляем переменные для пагинации
        maxProducts = Math.max(377, siteData.length);
        hasMoreProducts = siteData.length >= productsPerPage;
        
        // Добавляем загруженные товары в отслеживание
        siteData.forEach(product => {
            loadedProductNames.add(product.title);
        });
        
        // Сохраняем состояние
        saveState();
        
    } else {
        // Если не удалось загрузить, используем моковые данные
        console.log('Не удалось загрузить товары с сайта, используем моковые данные');
        loadProducts(0);
    }
}

// Восстановление всех загруженных товаров
async function restoreAllProducts() {
    console.log(`Восстанавливаем ${loadedProductNames.size} товаров с ${currentPage + 1} страниц...`);
    
    // Очищаем общий массив товаров
    allProducts = [];
    
    // Загружаем все страницы по порядку
    for (let page = 0; page <= currentPage; page++) {
        try {
            console.log(`Восстанавливаем страницу ${page + 1}...`);
            const siteData = await fetchProductData(page);
            
            if (siteData && siteData.length > 0) {
                // Фильтруем только те товары, которые были загружены ранее
                const restoredProducts = siteData.filter(product => 
                    loadedProductNames.has(product.title)
                );
                
                // Добавляем товары в общий массив
                allProducts = [...allProducts, ...restoredProducts];
                
                console.log(`Восстановлено ${restoredProducts.length} товаров со страницы ${page + 1}`);
            }
            
            // Небольшая задержка между запросами
            if (page < currentPage) {
                await new Promise(resolve => setTimeout(resolve, 100));
            }
            
        } catch (error) {
            console.error(`Ошибка восстановления страницы ${page + 1}:`, error);
        }
    }
    
    // Сортируем и отображаем все восстановленные товары
    sortAndRenderProducts();
    
    console.log(`Восстановление завершено. Всего товаров: ${allProducts.length}`);
    
    // Обновляем hasMoreProducts на основе реального количества загруженных товаров
    // Проверяем, есть ли еще товары для загрузки
    const totalLoadedProducts = loadedProductNames.size;
    const expectedProductsOnCurrentPages = (currentPage + 1) * productsPerPage;
    
    // Если загружено меньше товаров, чем ожидается на текущих страницах,
    // значит на последней странице было меньше товаров, чем productsPerPage,
    // и больше товаров нет
    hasMoreProducts = totalLoadedProducts >= expectedProductsOnCurrentPages;
    
    // Дополнительная проверка: если мы на первой странице и товаров меньше 60,
    // значит больше товаров нет
    if (currentPage === 0 && totalLoadedProducts < productsPerPage) {
        hasMoreProducts = false;
    }
    
    console.log(`Обновлено hasMoreProducts: ${hasMoreProducts} (загружено: ${totalLoadedProducts}, ожидается: ${expectedProductsOnCurrentPages})`);
    
    // Убеждаемся, что isLoading сброшен
    isLoading = false;
    console.log('Восстановление завершено, isLoading сброшен');
    
    // Восстанавливаем позицию прокрутки
    setTimeout(() => {
        if (savedScrollPosition > 0) {
            window.scrollTo(0, savedScrollPosition);
            console.log(`Позиция прокрутки восстановлена: ${savedScrollPosition}px`);
        }
    }, 100);
}

// Создание звездочек рейтинга
function createRatingStars(rating) {
    const fullStars = Math.floor(rating);
    const hasHalfStar = rating % 1 >= 0.5;
    const emptyStars = 5 - fullStars - (hasHalfStar ? 1 : 0);
    
    let starsHTML = '';
    
    // Полные звезды
    for (let i = 0; i < fullStars; i++) {
        starsHTML += '<span style="color: #FFD700; font-size: 16px;">★</span>';
    }
    
    // Половина звезды
    if (hasHalfStar) {
        starsHTML += '<span style="color: #FFD700; font-size: 16px;">☆</span>';
    }
    
    // Пустые звезды
    for (let i = 0; i < emptyStars; i++) {
        starsHTML += '<span style="color: #ddd; font-size: 16px;">☆</span>';
    }
    
    return starsHTML;
}

// Создание карточки товара из данных сайта
function createProductCardFromSiteData(product, btnId) {
    const card = document.createElement('div');
    card.className = 'product-card';
    
    // Проверяем наличие изображения
    let imageSrc = product.imageSrc;
    if (!imageSrc || imageSrc === '') {
        imageSrc = 'Goods/Electric_guitar_strings/2221/Ernie_Ball_2221_10-46_150.jpg';
    }
    
    // Проверяем наличие цен
    const oldPrice = product.oldPrice || '400 грн';
    let newPrice = product.newPrice || '350 грн';
    
    // Убираем "грн" из красной цены, так как оно добавляется через CSS
    newPrice = newPrice.replace(/\s*грн\s*/g, '').trim();
    
    // Статус товара
    const status = product.availability || 'В наличии';
    let statusClass = 'product-status';
    
    // Определяем класс статуса в зависимости от текста
    if (status.includes('наличии')) {
        statusClass = 'product-status';
    } else if (status.includes('Ожидается')) {
        statusClass = 'product-status expected';
    } else if (status.includes('заказ')) {
        statusClass = 'product-status on-order';
    } else if (status.includes('производства')) {
        statusClass = 'product-status discontinued';
    } else {
        statusClass = 'product-status out-of-stock';
    }
    
    // Определяем класс кнопки и текст
    let buttonClass = 'btn';
    let buttonText = 'Купить';
    
    if (status.includes('производства')) {
        buttonClass = 'btn discontinued';
        buttonText = 'Снят';
    }
    
    // Обработка названия товара
    const productName = product.title || 'Название товара не указано';
    
    // Создание звездочек рейтинга
    const rating = product.rating || 0;
    const ratingText = product.ratingText || '';
    const starsHTML = createRatingStars(rating);
    
         card.innerHTML = `
         <div class="product-card-top">
             <img src="${imageSrc}" alt="${productName}" class="img" style="width: 150px; height: 150px; object-fit: cover;" onerror="this.src='Goods/Electric_guitar_strings/2221/Ernie_Ball_2221_10-46_150.jpg'">
             <div class="product-title" style="text-align:center;">${productName}</div>
         </div>
         <div class="product-card-bottom">
             <div class="${statusClass}">${status}</div>
             <div class="product-rating" style="margin: 5px 0; text-align: left;">
                 ${starsHTML}
             </div>
             <div class="product-bottom-row">
                 <div class="product-prices">
                     <div class="old-price">${oldPrice}</div>
                     <div class="new-price" data-price="${newPrice}">${newPrice}</div>
                 </div>
                 <button class="${buttonClass}" id="btn${btnId}">${buttonText}</button>
             </div>
         </div>
     `;
    
    // Добавляем обработчик для кнопки
    const btn = card.querySelector(`#btn${btnId}`);
    btn.addEventListener("click", function(){
        if (tg.MainButton.isVisible) {
            tg.MainButton.hide();
        }
        else {
            tg.MainButton.setText(`Вы выбрали товар ${btnId}!`);
            item = btnId.toString();
            tg.MainButton.show();
        }
    });
    
    return card;
}

Telegram.WebApp.onEvent("mainButtonClicked", function(){
	tg.sendData(item);
});

let usercard = document.getElementById("usercard");

let p = document.createElement("p");

p.innerText = `${tg.initDataUnsafe.user.first_name}
${tg.initDataUnsafe.user.last_name}`;

usercard.appendChild(p);


// Функция для автоматического обновления цен товаров
async function updateProductPrices() {
    try {
        console.log('Начинаем обновление цен...');
        
        // 1. Получение данных с сайта (только первая страница для обновления)
        const siteData = await fetchProductData(0);
        console.log('Данные с сайта получены:', siteData);
        
        // 2. Парсинг текущего HTML
        const currentData = parseCurrentHTML();
        console.log('Текущие данные:', currentData);
        
        // 3. Сравнение и обновление (только для отображаемых товаров)
        const updatedData = compareAndUpdate(siteData, currentData);
        
        // 4. Применение изменений к DOM
        applyUpdatesToDOM(updatedData);
        
        console.log('Цены успешно обновлены!');
        
    } catch (error) {
        console.error('Ошибка обновления цен:', error);
    }
}

// Получение данных с сайта guitarstrings.com.ua
async function fetchProductData(page = 0) {
    try {
        // Используем прокси для обхода CORS
        const proxyUrl = 'https://api.allorigins.win/raw?url=';
        let targetUrl = 'https://guitarstrings.com.ua/electro';
        
        // Добавляем параметр start для пагинации
        if (page > 0) {
            const start = page * productsPerPage;
            targetUrl += `?start=${start}`;
        }
        
        console.log(`Загружаем страницу ${page + 1}: ${targetUrl}`);
        
        const response = await fetch(proxyUrl + encodeURIComponent(targetUrl));
        
        if (!response.ok) {
            throw new Error(`HTTP error! status: ${response.status}`);
        }
        
        const html = await response.text();
        return parseSiteHTML(html);
        
    } catch (error) {
        console.error('Ошибка получения данных с сайта:', error);
        throw error;
    }
}

// Парсинг HTML с сайта
function parseSiteHTML(html) {
    const parser = new DOMParser();
    const doc = parser.parseFromString(html, 'text/html');
    
    const products = [];
    
    // Находим все карточки товаров - используем более широкий селектор
    const productCards = doc.querySelectorAll('.product.vm-col, .browseProductContainer, .product-item');
    
    console.log(`Найдено ${productCards.length} карточек товаров на странице`);
    
    productCards.forEach((card, index) => {
        try {
            // Извлечение названия товара - ищем в разных местах
            const titleElement = card.querySelector('h2 a, h3 a, .product-title a, .product-name a');
            const title = titleElement ? titleElement.textContent.trim() : '';
            
            // Извлечение изображения - ищем в разных местах
            const imgElement = card.querySelector('.browseProductImage, .product-image img, .product-thumb img');
            const imageSrc = imgElement ? imgElement.src : '';
            const fullImageUrl = imageSrc.startsWith('http') ? imageSrc : `https://guitarstrings.com.ua${imageSrc}`;
            
            // Извлечение статуса наличия - ищем в разных местах
            const availabilityElement = card.querySelector('.availability span, .stock-status, .product-status');
            const availability = availabilityElement ? availabilityElement.textContent.trim() : 'В наличии';
            
            // Извлечение цен - ищем в разных местах
            const oldPriceElement = card.querySelector('.PricebasePrice, .old-price, .price-old');
            const newPriceElement = card.querySelector('.PricesalesPrice, .new-price, .price-current');
            
            let oldPrice = oldPriceElement ? oldPriceElement.textContent.trim() : '';
            let newPrice = newPriceElement ? newPriceElement.textContent.trim() : '';
            
            // Убираем слово "цена" из цен
            oldPrice = oldPrice.replace(/цена/gi, '').trim();
            newPrice = newPrice.replace(/цена/gi, '').trim();
            
            // Убираем двоеточие и лишние пробелы
            oldPrice = oldPrice.replace(/[:：]/g, '').replace(/\s+/g, ' ').trim();
            newPrice = newPrice.replace(/[:：]/g, '').replace(/\s+/g, ' ').trim();
            
            // Убираем дублирующееся "грн" из красной цены
            newPrice = newPrice.replace(/\s*грн\s*грн\s*/g, ' грн ').trim();
            
            // Извлечение рейтинга
            const ratingElement = card.querySelector('.current-rating');
            let rating = 0;
            let ratingText = '';
            
            if (ratingElement) {
                // Получаем ширину элемента рейтинга (например, 92.00%)
                const ratingWidth = ratingElement.style.width;
                if (ratingWidth) {
                    const percentage = parseFloat(ratingWidth.replace('%', ''));
                    rating = Math.round((percentage / 100) * 5 * 10) / 10; // Конвертируем в 5-балльную шкалу
                }
            }
            
            // Извлечение текста рейтинга (например, "(4.6 - 10 голосов)")
            // Убрано, так как эта информация больше не отображается
            const ratingTextElement = card.querySelector('.vrvote-count small');
            if (ratingTextElement) {
                ratingText = ratingTextElement.textContent.trim();
            }
            
            if (title) {
                products.push({
                    index: index,
                    title: title,
                    imageSrc: fullImageUrl,
                    availability: availability,
                    oldPrice: oldPrice,
                    newPrice: newPrice,
                    rating: rating,
                    ratingText: ratingText
                });
            }
            
        } catch (error) {
            console.error(`Ошибка парсинга товара ${index}:`, error);
        }
    });
    
    console.log(`Успешно распарсено ${products.length} товаров`);
    return products;
}

// Парсинг текущего HTML
function parseCurrentHTML() {
    const products = [];
    
    // Находим все карточки товаров в текущем DOM
    const productCards = document.querySelectorAll('.product-card');
    
    productCards.forEach((card, index) => {
        const titleElement = card.querySelector('.product-title');
        const imgElement = card.querySelector('.img');
        const statusElement = card.querySelector('.product-status');
        const oldPriceElement = card.querySelector('.old-price');
        const newPriceElement = card.querySelector('.new-price');
        
        products.push({
            index: index,
            title: titleElement ? titleElement.textContent.trim() : '',
            imageSrc: imgElement ? imgElement.src : '',
            availability: statusElement ? statusElement.textContent.trim() : '',
            oldPrice: oldPriceElement ? oldPriceElement.textContent.trim() : '',
            newPrice: newPriceElement ? newPriceElement.textContent.trim() : ''
        });
    });
    
    return products;
}

// Сравнение и обновление данных
function compareAndUpdate(siteData, currentData) {
    const updates = [];
    
    siteData.forEach((siteProduct, index) => {
        if (index < currentData.length) {
            const currentProduct = currentData[index];
            
            // Проверяем, нужно ли обновлять товар
            const needsUpdate = 
                siteProduct.title !== currentProduct.title ||
                siteProduct.oldPrice !== currentProduct.oldPrice ||
                siteProduct.newPrice !== currentProduct.newPrice ||
                siteProduct.availability !== currentProduct.availability ||
                siteProduct.imageSrc !== currentProduct.imageSrc;
            
            if (needsUpdate) {
                updates.push({
                    index: index,
                    siteData: siteProduct,
                    currentData: currentProduct
                });
            }
        }
    });
    
    return updates;
}

// Применение обновлений к DOM
function applyUpdatesToDOM(updates) {
    updates.forEach(update => {
        const cardIndex = update.index;
        const productCard = document.querySelectorAll('.product-card')[cardIndex];
        
        if (productCard) {
            const siteData = update.siteData;
            
            // Обновление изображения
            const imgElement = productCard.querySelector('.img');
            if (imgElement && siteData.imageSrc) {
                imgElement.src = siteData.imageSrc;
                imgElement.alt = siteData.title;
            }
            
            // Обновление названия
            const titleElement = productCard.querySelector('.product-title');
            if (titleElement && siteData.title) {
                titleElement.textContent = siteData.title;
            }
            
            // Обновление статуса
            const statusElement = productCard.querySelector('.product-status');
            if (statusElement && siteData.availability) {
                statusElement.textContent = siteData.availability;
            }
            
            // Обновление цен
            const oldPriceElement = productCard.querySelector('.old-price');
            const newPriceElement = productCard.querySelector('.new-price');
            
            if (oldPriceElement && siteData.oldPrice) {
                oldPriceElement.textContent = siteData.oldPrice;
            }
            
            if (newPriceElement && siteData.newPrice) {
                newPriceElement.textContent = siteData.newPrice;
            }
            
            // Обновление рейтинга
            const ratingContainer = productCard.querySelector('.product-rating');
            if (ratingContainer && siteData.rating !== undefined) {
                const starsHTML = createRatingStars(siteData.rating);
                
                // Обновляем звездочки
                ratingContainer.innerHTML = starsHTML;
            }
            
            console.log(`Обновлена карточка товара ${cardIndex + 1}: ${siteData.title}`);
        }
    });
}

// Функция для ручного запуска обновления
function manualUpdate() {
    console.log('Запуск ручного обновления цен...');
    updateProductPrices();
}

// Автоматическое обновление каждые 30 минут
function startAutoUpdate() {
    console.log('Запуск автоматического обновления цен...');
    updateProductPrices();
    
    // Обновление каждые 30 минут
    setInterval(updateProductPrices, 30 * 60 * 1000);
}

// Инициализация при загрузке страницы (для обновления существующих карточек)
document.addEventListener('DOMContentLoaded', function() {
    console.log('Система обновления цен инициализирована');
    
    // Автоматическое обновление при загрузке страницы (только для существующих карточек)
    // updateProductPrices(); // Отключено, так как теперь загружаем сразу реальные товары
});

// Функции для сохранения и восстановления состояния
function saveState() {
    const state = {
        currentPage: currentPage,
        loadedProductNames: Array.from(loadedProductNames),
        maxProducts: maxProducts,
        hasMoreProducts: hasMoreProducts,
        scrollPosition: window.scrollY,
        currentSort: currentSort,
        currentSortDir: currentSortDir,
        timestamp: Date.now()
    };
    
    try {
        localStorage.setItem('shopState', JSON.stringify(state));
        console.log('Состояние сохранено:', state);
    } catch (error) {
        console.error('Ошибка сохранения состояния:', error);
    }
}

function loadState() {
    try {
        const savedState = localStorage.getItem('shopState');
        if (savedState) {
            const state = JSON.parse(savedState);
            
            // Проверяем, не устарели ли данные (больше 1 часа)
            const isExpired = Date.now() - state.timestamp > 60 * 60 * 1000;
            
            if (!isExpired) {
                currentPage = state.currentPage || 0;
                loadedProductNames = new Set(state.loadedProductNames || []);
                maxProducts = state.maxProducts || 377;
                hasMoreProducts = state.hasMoreProducts !== false;
                savedScrollPosition = state.scrollPosition || 0;
                currentSort = state.currentSort || 'availability';
                currentSortDir = state.currentSortDir || 'DESC';
                
                console.log('Состояние восстановлено:', state);
                return true;
            } else {
                console.log('Сохраненное состояние устарело, начинаем заново');
                clearState();
            }
        }
    } catch (error) {
        console.error('Ошибка загрузки состояния:', error);
        clearState();
    }
    return false;
}

function clearState() {
    try {
        localStorage.removeItem('shopState');
        console.log('Состояние очищено');
    } catch (error) {
        console.error('Ошибка очистки состояния:', error);
    }
}

// Автоматическое сохранение состояния каждые 30 секунд
function startAutoSave() {
    setInterval(() => {
        if (loadedProductNames.size > 0) {
            saveState();
        }
    }, 30000); // 30 секунд
}

// Сохранение состояния перед уходом со страницы
function setupBeforeUnload() {
    window.addEventListener('beforeunload', () => {
        saveState();
    });
    
    // Также сохраняем при скрытии страницы (для мобильных устройств)
    document.addEventListener('visibilitychange', () => {
        if (document.hidden) {
            saveState();
        }
    });
}

// Функция для принудительного сброса состояния
function resetState() {
    clearState();
    currentPage = 0;
    isLoading = false;
    hasMoreProducts = true;
    loadedProductNames.clear();
    savedScrollPosition = 0;
    
    // Перезагружаем страницу
    window.location.reload();
}

// Экспорт функций для использования в консоли
window.updateProductPrices = updateProductPrices;
window.manualUpdate = manualUpdate;
window.startAutoUpdate = startAutoUpdate;
window.saveState = saveState;
window.loadState = loadState;
window.clearState = clearState;
window.resetState = resetState;

// Инициализация приложения при загрузке DOM
document.addEventListener('DOMContentLoaded', function() {
    console.log('DOM загружен, начинаем инициализацию...');
    
    // Загружаем сохраненное состояние
    const stateLoaded = loadState();
    
    // Запускаем автоматическое сохранение
    startAutoSave();
    
    // Настраиваем сохранение при уходе со страницы
    setupBeforeUnload();
    
    // Загружаем первую страницу товаров
    loadFirstPage();
    
    // Инициализируем фильтр после небольшой задержки
    setTimeout(() => {
        initFilter();
        console.log('Фильтр инициализирован');
    }, 100);
    
    console.log('Приложение инициализировано с автосохранением состояния');
});








