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

btn1.addEventListener("click", function(){
	if (tg.MainButton.isVisible) {
		tg.MainButton.hide();
	}
	else {
		tg.MainButton.setText("Вы выбрали товар 1!");
		item = "1";
		tg.MainButton.show();
	}
});

btn2.addEventListener("click", function(){
	if (tg.MainButton.isVisible) {
		tg.MainButton.hide();
	}
	else {
		tg.MainButton.setText("Вы выбрали товар 2!");
		item = "2";
		tg.MainButton.show();
	}
});

btn3.addEventListener("click", function(){
	if (tg.MainButton.isVisible) {
		tg.MainButton.hide();
	}
	else {
		tg.MainButton.setText("Вы выбрали товар 3!");
		item = "3";
		tg.MainButton.show();
	}
});

btn4.addEventListener("click", function(){
	if (tg.MainButton.isVisible) {
		tg.MainButton.hide();
	}
	else {
		tg.MainButton.setText("Вы выбрали товар 4!");
		item = "4";
		tg.MainButton.show();
	}
});

btn5.addEventListener("click", function(){
	if (tg.MainButton.isVisible) {
		tg.MainButton.hide();
	}
	else {
		tg.MainButton.setText("Вы выбрали товар 5!");
		item = "5";
		tg.MainButton.show();
	}
});

btn6.addEventListener("click", function(){
	if (tg.MainButton.isVisible) {
		tg.MainButton.hide();
	}
	else {
		tg.MainButton.setText("Вы выбрали товар 6!");
		item = "6";
		tg.MainButton.show();
	}
});


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
        
        // 1. Получение данных с сайта
        const siteData = await fetchProductData();
        console.log('Данные с сайта получены:', siteData);
        
        // 2. Парсинг текущего HTML
        const currentData = parseCurrentHTML();
        console.log('Текущие данные:', currentData);
        
        // 3. Сравнение и обновление
        const updatedData = compareAndUpdate(siteData, currentData);
        
        // 4. Применение изменений к DOM
        applyUpdatesToDOM(updatedData);
        
        console.log('Цены успешно обновлены!');
        
    } catch (error) {
        console.error('Ошибка обновления цен:', error);
    }
}

// Получение данных с сайта guitarstrings.com.ua
async function fetchProductData() {
    try {
        // Используем прокси для обхода CORS
        const proxyUrl = 'https://api.allorigins.win/raw?url=';
        const targetUrl = 'https://guitarstrings.com.ua/electro';
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
    
    // Находим все карточки товаров
    const productCards = doc.querySelectorAll('.product.vm-col');
    
    productCards.forEach((card, index) => {
        try {
            // Извлечение названия товара
            const titleElement = card.querySelector('h2 a');
            const title = titleElement ? titleElement.textContent.trim() : '';
            
            // Извлечение изображения
            const imgElement = card.querySelector('.browseProductImage');
            const imageSrc = imgElement ? imgElement.src : '';
            const fullImageUrl = imageSrc.startsWith('http') ? imageSrc : `https://guitarstrings.com.ua${imageSrc}`;
            
            // Извлечение статуса наличия
            const availabilityElement = card.querySelector('.availability span');
            const availability = availabilityElement ? availabilityElement.textContent.trim() : 'В наличии';
            
            // Извлечение цен
            const oldPriceElement = card.querySelector('.PricebasePrice');
            const newPriceElement = card.querySelector('.PricesalesPrice');
            
            const oldPrice = oldPriceElement ? oldPriceElement.textContent.trim() : '';
            const newPrice = newPriceElement ? newPriceElement.textContent.trim() : '';
            
            if (title) {
                products.push({
                    index: index,
                    title: title,
                    imageSrc: fullImageUrl,
                    availability: availability,
                    oldPrice: oldPrice,
                    newPrice: newPrice
                });
            }
            
        } catch (error) {
            console.error(`Ошибка парсинга товара ${index}:`, error);
        }
    });
    
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

// Инициализация при загрузке страницы
document.addEventListener('DOMContentLoaded', function() {
    console.log('Система обновления цен инициализирована');
    
    // Автоматическое обновление при загрузке страницы
    updateProductPrices();
});

// Экспорт функций для использования в консоли
window.updateProductPrices = updateProductPrices;
window.manualUpdate = manualUpdate;
window.startAutoUpdate = startAutoUpdate;








