// GS Bot New Shop - Основной JavaScript файл
console.log('app.js загружен');

// Экспортируем функции в глобальную область сразу при загрузке скрипта

// Инициализация корзины
let cart = [];
let cartItemCount = 0;

// Переменные для поиска
let searchTerm = '';
let isSearchActive = false;
let isCategoryFilterActive = false;
let searchTimeout = null;

// Переменные для бесконечной прокрутки
let currentPage = 0;
let hasMoreProducts = true;
let isLoading = false;
let loadedProductNames = new Set();

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
        // В случае ошибки очищаем localStorage
        localStorage.removeItem('cart');
        localStorage.removeItem('cartItemCount');
    }
    return false;
}

// Функция инициализации корзины
function initializeCart() {
    console.log('Корзина инициализирована');
    
    // Пытаемся загрузить корзину из localStorage
    if (!loadCartFromStorage()) {
        cart = [];
        cartItemCount = 0;
    }
}

// Функция добавления в корзину
function addToCart(product) {
    console.log('Добавление в корзину:', product);
    
    // Проверяем, есть ли уже такой товар в корзине
    const existingItemIndex = cart.findIndex(item => 
        item.name === product.name && 
        (item.newPrice || item.price) === (product.newPrice || product.price) &&
        (item.oldPrice || 0) === (product.oldPrice || 0)
    );
    
    if (existingItemIndex !== -1) {
        // Если товар уже есть в корзине, увеличиваем количество
        console.log('Товар уже есть в корзине, увеличиваем количество');
        if (!cart[existingItemIndex].quantity) {
            cart[existingItemIndex].quantity = 1;
        }
        cart[existingItemIndex].quantity++;
        cartItemCount++;
        console.log('Количество товара увеличено до:', cart[existingItemIndex].quantity);
    } else {
        // Если товара нет в корзине, добавляем новый
        console.log('Добавляем новый товар в корзину');
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
                                                 ${oldPrice && oldPrice > 0 && oldPrice !== newPrice ? `<div class="cart-item-old-price">${(oldPrice * (item.quantity || 1)).toFixed(0)} ${getCurrencyWithDot()}</div>` : ''}
                         <div class="cart-item-price">${(newPrice * (item.quantity || 1)).toFixed(0)} ${getCurrencyWithDot()}</div>
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
    console.log('removeFromCart: Удаляем товар из корзины, индекс:', index);
    
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
    console.log('changeQuantity: Изменяем количество товара, индекс:', index, 'изменение:', change);
    
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
    console.log('updateCartCalculations: Обновляем расчеты корзины');
    
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
    
    // Получаем скидку по купону и использованные бонусы
    const couponDiscount = getCouponDiscount();
    const usedBonuses = getUsedBonuses();
    
    // Рассчитываем скидку по купону
    let couponAmount = 0;
    if (couponDiscount > 0) {
        if (couponDiscount <= 1) {
            // Процентная скидка (например, 0.10 = 10%)
            couponAmount = Math.round(newPricesTotal * couponDiscount);
        } else {
            // Фиксированная скидка в грн
            couponAmount = couponDiscount;
        }
    }
    
    // Рассчитываем общую сумму с учетом всех скидок
    const totalAfterDiscounts = newPricesTotal - couponAmount - usedBonuses;
    const finalTotal = Math.max(0, totalAfterDiscounts); // Не может быть меньше 0
    
    // Обновляем отображение итогов
    const subtotalElement = document.querySelector('#cartSubtotal');
    const discountElement = document.querySelector('#cartDiscount');
    const totalElement = document.querySelector('#cartTotalPrice');
    const payAmountElement = document.querySelector('#cartPayAmount');
    const couponElement = document.querySelector('#cartCouponUsed');
    const bonusElement = document.querySelector('#cartBonusUsed');
    
    // Обновляем способы доставки в зависимости от суммы корзины
    updateDeliveryMethods();
    
         if (subtotalElement) {
         subtotalElement.textContent = `${oldPricesTotal.toFixed(0)} ${getCurrencyWithDot()}`;
     }
     
     if (discountElement) {
         if (discount > 0) {
             discountElement.textContent = `-${discount.toFixed(0)} ${getCurrencyWithDot()}`;
             discountElement.style.display = 'block';
         } else {
             discountElement.style.display = 'none';
         }
     }
     
     // Обновляем отображение купона (только если купон валидный)
     if (couponElement) {
         if (isCouponValid() && couponAmount > 0) {
             couponElement.textContent = `-${couponAmount.toFixed(0)} ${getCurrencyWithDot()}`;
             couponElement.parentElement.style.display = 'flex';
         } else {
             couponElement.parentElement.style.display = 'none';
         }
     }
     
     // Обновляем отображение бонусов (только если используются)
     if (bonusElement) {
         if (usedBonuses > 0) {
             bonusElement.textContent = `-${usedBonuses.toFixed(0)} ${getCurrencyWithDot()}`;
             bonusElement.parentElement.style.display = 'flex';
         } else {
             bonusElement.parentElement.style.display = 'none';
         }
     }
    
         // Обновляем стоимость доставки и общую сумму
     updateDeliveryCost();
     
     if (totalElement) {
         const deliveryCost = getDeliveryCost();
         // Комиссия WayForPay отключена - не добавляем процент к итоговой сумме
         const totalWithDelivery = finalTotal + deliveryCost;
         
         // Убеждаемся, что итоговая сумма не меньше 0
         const finalAmount = Math.max(0, totalWithDelivery);
         
         totalElement.textContent = `${finalAmount.toFixed(0)} ${getCurrency()}.`;
         
         if (payAmountElement) {
             payAmountElement.textContent = `${finalAmount.toFixed(0)} ${getCurrency()}`;
         }
         
         console.log('updateCartCalculations: Расчеты завершены:', {
             newPricesTotal,
             oldPricesTotal,
             discount,
             couponAmount,
             usedBonuses,
             finalTotal,
             deliveryCost,
             totalWithDelivery,
             finalAmount
         });
     }
}

// Функция получения стоимости доставки
function getDeliveryCost() {
    const deliverySelect = document.getElementById('deliveryMethodSelect');
    if (!deliverySelect) return 0;
    
    const selectedMethod = deliverySelect.value;
    
    // Если выбрана Укрпочта, добавляем 80 грн
    if (selectedMethod === 'ukrposhta') {
        return 80;
    }
    
    // Бесплатные способы доставки - 0 грн
    if (selectedMethod === 'free1001' || selectedMethod === 'free2000') {
        return 0;
    }
    
    // Для всех остальных способов доставки - 0 грн
    return 0;
}

// Функция получения комиссии за оплату
function getPaymentCommission() {
    const paymentSelect = document.getElementById('paymentMethodSelect');
    if (!paymentSelect) return 0;
    
    const selectedMethod = paymentSelect.value;
    
    // WayForPay - 2% комиссия
    if (selectedMethod === 'wayforpay') {
        return 0.02; // 2% в виде десятичной дроби
    }
    
    // Для всех остальных способов оплаты - 0% комиссия
    return 0;
}

// Функция получения скидки по купону
function getCouponDiscount() {
    const couponInput = document.getElementById('cartCouponInput');
    if (!couponInput || !couponInput.value.trim()) return 0;
    
    const couponCode = couponInput.value.trim().toLowerCase();
    
    // Здесь можно добавить логику проверки купонов
    // Пока используем простую логику для тестирования
    if (couponCode === 'test10') {
        return 0.10; // 10% скидка
    } else if (couponCode === 'test20') {
        return 0.20; // 20% скидка
    } else if (couponCode === 'test50') {
        return 50; // 50 грн скидка
    }
    
    return 0; // Неверный купон
}

// Функция получения количества используемых бонусов
function getUsedBonuses() {
    const bonusesInput = document.getElementById('cartBonusesInput');
    if (!bonusesInput || !bonusesInput.value) return 0;
    
    const usedBonuses = parseInt(bonusesInput.value) || 0;
    const availableBonuses = 100; // В тестовом аккаунте 100 бонусов
    
    // Проверяем, что не превышает доступное количество
    if (usedBonuses > availableBonuses) {
        bonusesInput.value = availableBonuses;
        return availableBonuses;
    }
    
    return usedBonuses;
}

// Функция получения валюты в зависимости от языка
function getCurrency() {
    const currentLanguage = localStorage.getItem('selectedLanguage') || 'uk';
    return currentLanguage === 'en' ? 'UAH' : 'грн';
}

// Функция получения валюты с точкой для украинского/русского
function getCurrencyWithDot() {
    const currentLanguage = localStorage.getItem('selectedLanguage') || 'uk';
    return currentLanguage === 'en' ? 'UAH' : 'грн.';
}

// Функция проверки валидности купона
function isCouponValid() {
    const couponInput = document.getElementById('cartCouponInput');
    if (!couponInput || !couponInput.value.trim()) return false;
    
    const couponCode = couponInput.value.trim().toLowerCase();
    
    // Список валидных купонов
    const validCoupons = ['test10', 'test20', 'test50'];
    
    return validCoupons.includes(couponCode);
}

    // Функция обновления стоимости доставки и комиссии
  function updateDeliveryCost() {
      console.log('updateDeliveryCost: Обновляем стоимость доставки и комиссии');
      
      const deliveryCostElement = document.querySelector('#cartDelivery');
      const commissionElement = document.querySelector('#cartCommission');
      const deliveryCost = getDeliveryCost();
      
      // Показываем строку доставки только если выбрана платная доставка
      if (deliveryCostElement) {
          if (deliveryCost > 0) {
              deliveryCostElement.textContent = `${deliveryCost} ${getCurrency()}`;
              deliveryCostElement.parentElement.style.display = 'flex';
          } else {
              deliveryCostElement.parentElement.style.display = 'none';
          }
      }
      
      // Обновляем комиссию за оплату (временно отключено)
      // if (commissionElement) {
      //     const paymentMethod = document.getElementById('paymentMethodSelect');
      //     const commissionRate = getPaymentCommission();
      //     
      //     if (commissionRate > 0 && paymentMethod && paymentMethod.value === 'wayforpay') {
      //         // Рассчитываем комиссию от суммы товаров (без учета скидок)
      //         let subtotal = 0;
      //         cart.forEach(item => {
      //             const newPrice = parseInt(item.newPrice || item.price || 0);
      //             const quantity = item.quantity || 1;
      //             subtotal += newPrice * quantity;
      //         });
      //         
      //         const commissionAmount = Math.round(subtotal * commissionRate);
      //         commissionElement.textContent = `${commissionAmount} ${getCurrency()}`;
      //         commissionElement.parentElement.style.display = 'flex';
      //     } else {
      //         commissionElement.textContent = `0 ${getCurrency()}`;
      //         commissionElement.parentElement.style.display = 'none';
      //     }
      // }
      
      // НЕ вызываем updateCartCalculations() здесь, чтобы избежать бесконечной рекурсии
  }

// Функция управления способами доставки в зависимости от способа оплаты и суммы корзины
function updateDeliveryMethods() {
    console.log('updateDeliveryMethods: Обновляем способы доставки');
    
    const paymentSelect = document.getElementById('paymentMethodSelect');
    const deliverySelect = document.getElementById('deliveryMethodSelect');
    
    if (!paymentSelect || !deliverySelect) {
        console.error('updateDeliveryMethods: Элементы выбора не найдены');
        return;
    }
    
    const selectedPayment = paymentSelect.value;
    
    // Рассчитываем сумму корзины
    let cartTotal = 0;
    cart.forEach(item => {
        const newPrice = parseInt(item.newPrice || item.price || 0);
        const quantity = item.quantity || 1;
        cartTotal += newPrice * quantity;
    });
    
    console.log('updateDeliveryMethods: Сумма корзины:', cartTotal);
    
    // Получаем все опции доставки
    const deliveryOptions = deliverySelect.querySelectorAll('option');
    
    if (selectedPayment === 'meeting') {
        // Если выбрана оплата "при встрече в Одессе", показываем только самовывоз
        console.log('updateDeliveryMethods: Показываем только самовывоз');
        
        deliveryOptions.forEach(option => {
            if (option.value === 'pickup') {
                option.style.display = 'block';
                option.disabled = false;
            } else {
                option.style.display = 'none';
                option.disabled = true;
            }
        });
        
        // Устанавливаем самовывоз как выбранный
        deliverySelect.value = 'pickup';
        
    } else {
        // Для других способов оплаты показываем способы доставки в зависимости от суммы корзины
        console.log('updateDeliveryMethods: Показываем способы доставки в зависимости от суммы корзины');
        
        deliveryOptions.forEach(option => {
            if (option.value === 'free1001') {
                // Показываем бесплатную доставку от 1001 грн
                if (cartTotal >= 1001) {
                    option.style.display = 'block';
                    option.disabled = false;
                    console.log('updateDeliveryMethods: Показываем бесплатную доставку от 1001 грн');
                } else {
                    option.style.display = 'none';
                    option.disabled = true;
                }
            } else if (option.value === 'free2000') {
                // Показываем бесплатную доставку от 2000 грн
                if (cartTotal >= 2000) {
                    option.style.display = 'block';
                    option.disabled = false;
                    console.log('updateDeliveryMethods: Показываем бесплатную доставку от 2000 грн');
                } else {
                    option.style.display = 'none';
                    option.disabled = true;
                }
            } else {
                // Обычные способы доставки всегда доступны
                option.style.display = 'block';
                option.disabled = false;
            }
        });
        
        // НЕ сбрасываем выбранный покупателем способ доставки
        // Если он выбрал самовывоз, оставляем самовывоз
        console.log('updateDeliveryMethods: Сохраняем выбранный покупателем способ доставки:', deliverySelect.value);
    }
    
    // Обновляем стоимость доставки
    updateDeliveryCost();
}

// Функция показа/скрытия меню (toggle)
function showMenuPopup() {
    console.log('showMenuPopup: Переключаем меню');
    const popup = document.getElementById('menuPopup');
    if (popup) {
        if (popup.style.display === 'flex') {
            // Если меню открыто - закрываем
            popup.style.display = 'none';
            console.log('showMenuPopup: Меню закрыто');
        } else {
            // Если меню закрыто - открываем
            popup.style.display = 'flex';
            console.log('showMenuPopup: Меню открыто');
        }
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
        renderCartItems();
        updateCartCalculations();
        updateDeliveryMethods(); // Инициализируем способы доставки
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
        console.log('showContactsPopup: Элемент найден, добавляем класс show');
        popup.classList.add('show');
        popup.style.zIndex = '99999';
        popup.style.display = 'flex';
        popup.style.alignItems = 'center';
        popup.style.justifyContent = 'center';
        console.log('showContactsPopup: Класс show добавлен, z-index установлен');
        console.log('showContactsPopup: Текущие классы:', popup.className);
        console.log('showContactsPopup: Текущий z-index:', popup.style.zIndex);
    } else {
        console.error('showContactsPopup: Элемент contactsPopup не найден!');
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
        console.log('closeContactsPopup: Окно контактов закрыто');
    } else {
        console.error('closeContactsPopup: Элемент contactsPopup не найден!');
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
    const avatarMenu = document.querySelector('.avatar-dropdown');
    if (avatarMenu) {
        avatarMenu.classList.toggle('show');
        console.log('toggleAvatarMenu: Меню аватара переключено');
    } else {
        console.error('toggleAvatarMenu: Выпадающее меню аватара не найдено');
    }
}

// Функция показа/скрытия настроек (toggle)
function showSettingsPopup() {
    console.log('showSettingsPopup: Переключаем настройки');
    const popup = document.getElementById('settingsPopup');
    if (popup) {
        if (popup.style.display === 'flex') {
            // Если настройки открыты - закрываем
            popup.style.display = 'none';
            console.log('showSettingsPopup: Настройки закрыты');
        } else {
            // Если настройки закрыты - открываем
            popup.style.display = 'flex';
            console.log('showSettingsPopup: Настройки открыты');
        }
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

// Функция показа попапа с предложением
function showOfferPopup() {
    console.log('showOfferPopup: Показываем предложение');
    const popup = document.getElementById('offerPopup');
    if (popup) {
        console.log('showOfferPopup: Элемент найден, добавляем класс show');
        
        // Получаем текущий язык
        const currentLanguage = localStorage.getItem('selectedLanguage') || 'uk';
        
        // Скрываем все языковые версии
        const ukContent = document.querySelector('.offer-content-uk');
        const ruContent = document.querySelector('.offer-content-ru');
        const enContent = document.querySelector('.offer-content-en');
        
        if (ukContent) ukContent.classList.remove('active');
        if (ruContent) ruContent.classList.remove('active');
        if (enContent) enContent.classList.remove('active');
        
        // Показываем нужную языковую версию
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
        console.log('showOfferPopup: Класс show добавлен, z-index установлен');
        console.log('showOfferPopup: Текущие классы:', popup.className);
        console.log('showOfferPopup: Текущий z-index:', popup.style.zIndex);
    } else {
        console.error('showOfferPopup: Элемент offerPopup не найден!');
    }
}

// Функция закрытия попапа с предложением
function closeOfferPopup() {
    console.log('closeOfferPopup: Закрываем предложение');
    const popup = document.getElementById('offerPopup');
    if (popup) {
        popup.classList.remove('show');
        popup.style.display = 'none';
        popup.style.zIndex = '';
        console.log('closeOfferPopup: Окно оферты закрыто');
    }
}

// Функция показа попапа для товаров снятых с производства
function showDiscontinuedPopup() {
    console.log('showDiscontinuedPopup: Показываем popup для товара снятого с производства');
    const popup = document.getElementById('discontinuedPopup');
    if (popup) {
        popup.style.display = 'flex';
        popup.style.zIndex = '20000';
    }
}

// Функция показа попапа для товаров которых нет в наличии
function showOutOfStockPopup() {
    console.log('showOutOfStockPopup: Показываем popup для товара которого нет в наличии');
    const popup = document.getElementById('outOfStockPopup');
    if (popup) {
        popup.style.display = 'flex';
        popup.style.zIndex = '20000';
    }
}

// Функция показа попапа для товаров которые ожидаются
function showExpectedPopup() {
    console.log('showExpectedPopup: Показываем popup для товара который ожидается');
    const popup = document.getElementById('expectedPopup');
    if (popup) {
        popup.style.display = 'flex';
        popup.style.zIndex = '20000';
    }
}

// Функция показа попапа для товаров под заказ
function showOnOrderPopup() {
    console.log('showOnOrderPopup: Показываем popup для товара под заказ');
    const popup = document.getElementById('onOrderPopup');
    if (popup) {
        popup.style.display = 'flex';
        popup.style.zIndex = '20000';
    }
}

// Функция показа попапа с категориями
function showCategoryPopup() {
    console.log('showCategoryPopup: Показываем категории');
    const popup = document.getElementById('categoryPopup');
    if (popup) {
        popup.style.display = 'flex';
    }
}

// Функция закрытия попапа с категориями
function closeCategoryPopup() {
    console.log('closeCategoryPopup: Закрываем категории');
    const popup = document.getElementById('categoryPopup');
    if (popup) {
        popup.style.display = 'none';
    }
}

// Функция показа попапа с поиском
function showSearchPopup() {
    console.log('showSearchPopup: Показываем поиск');
    const popup = document.getElementById('searchPopup');
    if (popup) {
        popup.style.display = 'flex';
    }
}

// Функция закрытия попапа с поиском
function closeSearchPopup() {
    console.log('closeSearchPopup: Закрываем поиск');
    const popup = document.getElementById('searchPopup');
    if (popup) {
        popup.style.display = 'none';
    }
}

// Функция поиска товаров
async function searchProducts(query) {
    console.log('searchProducts: Поиск товаров по запросу:', query);
    
    let currentSearchTerm = query.toLowerCase().trim();
    isSearchActive = currentSearchTerm.length > 0;
    
    if (!isSearchActive) {
        console.log('searchProducts: Поиск отменен, загружаем все товары');
        await loadProducts();
        return;
    }
    
         // Нормализуем поисковые запросы для лучшего поиска
     if (currentSearchTerm.includes('d\'addario') || currentSearchTerm.includes('d\'addario') || currentSearchTerm.includes('daddario')) {
         currentSearchTerm = 'addario';
         console.log('searchProducts: Нормализован запрос D\'Addario в:', currentSearchTerm);
     }
     
     // Нормализуем поисковые запросы для DR
     if (currentSearchTerm === 'dr' || currentSearchTerm === 'DR') {
         currentSearchTerm = 'DR';
         console.log('searchProducts: Нормализован запрос DR в:', currentSearchTerm);
     }
     
     // Нормализуем поисковые запросы для La Bella
     if (currentSearchTerm === 'la bella' || currentSearchTerm === 'la bella' || currentSearchTerm === 'labella' || 
         currentSearchTerm === 'La Bella' || currentSearchTerm === 'La bella' || currentSearchTerm === 'LABELLA') {
         currentSearchTerm = 'La Bella';
         console.log('searchProducts: Нормализован запрос La Bella в:', currentSearchTerm);
     }
     
     // Специальная обработка для DR - ищем по нескольким вариантам
     if (currentSearchTerm === 'DR') {
         console.log('searchProducts: Специальный поиск для DR - используем несколько вариантов');
         // Попробуем найти товары DR разными способами
         await searchDRProducts();
         return;
     }
     
     // Специальная обработка для La Bella - ищем по нескольким вариантам
     if (currentSearchTerm === 'La Bella') {
         console.log('searchProducts: Специальный поиск для La Bella - используем несколько вариантов');
         // Попробуем найти товары La Bella разными способами
         await searchLaBellaProducts();
         return;
     }
    
    try {
        // Загружаем ВСЕ найденные товары без ограничений
        const response = await fetch(`http://localhost:8000/api/products?search=${encodeURIComponent(currentSearchTerm)}&start=0&limit=1000`);
        const data = await response.json();
        
        if (data && data.products && data.products.length > 0) {
            console.log(`searchProducts: Найдено ${data.products.length} товаров`);
            displayProducts(data.products);
        } else {
            console.log('searchProducts: Товары не найдены');
            showNoSearchResults(currentSearchTerm);
        }
    } catch (error) {
        console.error('searchProducts: Ошибка поиска:', error);
        showNoSearchResults(currentSearchTerm);
    }
}

// Функция показа результатов поиска
function showNoSearchResults(searchTerm) {
    console.log('showNoSearchResults: Показываем сообщение об отсутствии результатов');
    
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
    console.log('clearSearch: Очищаем поиск');
    
    const searchInput = document.querySelector('.search-input');
    if (searchInput) {
        searchInput.value = '';
    }
    
    searchTerm = '';
    isSearchActive = false;
    isCategoryFilterActive = false;
    
    // Сбрасываем состояние бесконечной прокрутки
    currentPage = 0;
    hasMoreProducts = true;
    loadedProductNames.clear();
    
    // Загружаем все товары
    await loadProducts(0, false);
}

// Функция загрузки следующей страницы
async function loadNextPage() {
    if (isLoading || !hasMoreProducts || isSearchActive || isCategoryFilterActive) {
        console.log('loadNextPage: Загрузка невозможна - isLoading:', isLoading, 'hasMoreProducts:', hasMoreProducts, 'isSearchActive:', isSearchActive, 'isCategoryFilterActive:', isCategoryFilterActive);
        return;
    }
    
    console.log('loadNextPage: Загружаем следующую страницу, текущая:', currentPage);
    const nextPage = currentPage + 1; // Вычисляем следующую страницу
    console.log('loadNextPage: Следующая страница будет:', nextPage);
    await loadProducts(nextPage, true);
}

// Функция открытия чата в Telegram
function openTelegramChat() {
    console.log('openTelegramChat: Открываем чат в Telegram');
    const telegramUrl = 'https://t.me/GuitarStringsUSA';
    window.open(telegramUrl, '_blank');
}

// Функция обновления онлайн статуса по времени
function updateOnlineStatus() {
    console.log('updateOnlineStatus: Обновляем статус по времени');
    
    const now = new Date();
    const currentHour = now.getHours();
    const onlineStatus = document.querySelector('.online-status');
    const statusDot = document.querySelector('.status-dot');
    const statusText = document.querySelector('.online-status span');
    
    if (!onlineStatus || !statusDot || !statusText) {
        console.error('updateOnlineStatus: Элементы статуса не найдены');
        return;
    }
    
    // Получаем текущий язык
    const currentLanguage = localStorage.getItem('selectedLanguage') || 'uk';
    const currentTranslations = translations[currentLanguage] || translations.uk;
    
    // Рабочие часы: с 9:00 до 19:00 (9-19)
    const isWorkingHours = currentHour >= 9 && currentHour < 19;
    
    if (isWorkingHours) {
        // Онлайн (зеленый)
        onlineStatus.classList.remove('offline');
        onlineStatus.classList.add('online');
        statusDot.style.background = '#4CAF50'; // Зеленый
        statusText.textContent = currentTranslations.onlineStatus;
        console.log('updateOnlineStatus: Статус установлен - ОНЛАЙН (зеленый)');
    } else {
        // Офлайн (синий)
        onlineStatus.classList.remove('online');
        onlineStatus.classList.add('offline');
        statusDot.style.background = '#2196F3'; // Синий
        statusText.textContent = currentTranslations.onlineStatusOffline;
        console.log('updateOnlineStatus: Статус установлен - ОФЛАЙН (синий)');
    }
}

// Функция показа попапа с поддержкой
function showSupportPopup() {
    console.log('showSupportPopup: Показываем поддержку');
    const popup = document.getElementById('supportPopup');
    if (popup) {
        popup.style.display = 'flex';
    }
}

// Функция закрытия попапа с поддержкой
function closeSupportPopup() {
    console.log('closeSupportPopup: Закрываем поддержку');
    const popup = document.getElementById('supportPopup');
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
async function loadProducts(page = 0, append = false) {
    if (isLoading || isSearchActive) {
        console.log('loadProducts: Загрузка уже идет или активен поиск, пропускаем');
        return;
    }
    
    // console.log('loadProducts: Загружаем товары, страница:', page, 'добавляем:', append);
    
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
        // Вычисляем start на основе номера страницы (30 товаров на страницу для быстрой загрузки)
        const start = page * 30;
        const response = await fetch(`http://localhost:8000/api/products?start=${start}&limit=30`);
        const data = await response.json();
        
        if (data && data.products && data.products.length > 0) {
            // console.log('loadProducts: Загружено', data.products.length, 'товаров');
            
            if (append) {
                // Добавляем товары к существующим
                appendProducts(data.products);
            } else {
                // Отображаем новые товары
                displayProducts(data.products);
            }
            
            // Обновляем состояние
            currentPage = page;
            hasMoreProducts = data.hasMore || false;
            
            // Дополнительная проверка для корректности hasMoreProducts
            if (window.currentProducts && window.currentProducts.length >= 377) {
                hasMoreProducts = false;
            }
            
            // console.log('loadProducts: Обновлен currentPage на:', currentPage);
            
            // console.log('loadProducts: hasMoreProducts:', hasMoreProducts);
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

// Функция добавления товаров к существующим
function appendProducts(products) {
    console.log('appendProducts: Добавляем', products.length, 'товаров');
    
    const container = document.querySelector('.inner');
    if (!container) {
        console.error('appendProducts: Контейнер .inner не найден');
        return;
    }
    
    // Фильтруем дубликаты перед добавлением
    const uniqueProducts = [];
    products.forEach(product => {
        if (!loadedProductNames.has(product.name)) {
            uniqueProducts.push(product);
            loadedProductNames.add(product.name);
        } else {
            console.log('appendProducts: Пропускаем дубликат:', product.name);
        }
    });
    
    console.log('appendProducts: Уникальных товаров для добавления:', uniqueProducts.length);
    
    // Добавляем только уникальные товары
    uniqueProducts.forEach((product, index) => {
        const productCard = createProductCard(product, window.currentProducts.length + index);
        container.appendChild(productCard);
    });
    
    // Обновляем глобальный массив товаров
    if (!window.currentProducts) {
        window.currentProducts = [];
    }
    window.currentProducts.push(...uniqueProducts);
    
    console.log('appendProducts: Всего товаров после добавления:', window.currentProducts.length);
}

// Функция отображения товаров
function displayProducts(products) {
    console.log('displayProducts: Отображаем товары');
    console.log('displayProducts: Количество товаров:', products.length);
    
    const container = document.querySelector('.inner');
    if (!container) {
        console.error('displayProducts: Контейнер .inner не найден');
        return;
    }
    
    console.log('displayProducts: Контейнер найден, очищаем содержимое');
    container.innerHTML = '';
    
    // Очищаем список загруженных товаров
    loadedProductNames.clear();
    
    // Удаляем дубликаты товаров перед отображением
    const uniqueProducts = [];
    const seenNames = new Set();
    
    products.forEach(product => {
        if (!seenNames.has(product.name)) {
            seenNames.add(product.name);
            uniqueProducts.push(product);
        } else {
            console.log('displayProducts: Удален дубликат товара:', product.name);
        }
    });
    
    console.log('displayProducts: После удаления дубликатов осталось товаров:', uniqueProducts.length, 'из', products.length);
    
    // Сохраняем товары в глобальный массив для доступа из обработчиков
    window.currentProducts = uniqueProducts;
    
    // Добавляем имена товаров в Set для отслеживания дубликатов
    uniqueProducts.forEach(product => {
        loadedProductNames.add(product.name);
    });
    
    console.log('displayProducts: Создаем карточки для', uniqueProducts.length, 'товаров');
    uniqueProducts.forEach((product, index) => {
        const productCard = createProductCard(product, index);
        container.appendChild(productCard);
    });
    
    console.log('displayProducts: Все карточки добавлены. Количество элементов в контейнере:', container.children.length);
}

// Функция показа уведомления о добавлении в корзину
function showAddToCartNotification(productName) {
    console.log('showAddToCartNotification: Показываем уведомление для', productName);
    
    // Создаем уведомление
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
    
    // Добавляем стили для анимации
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
    
    // Добавляем уведомление на страницу
    document.body.appendChild(notification);
    
    // Удаляем уведомление через 3 секунды
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
    // console.log('createProductCard: Создаем карточку для товара:', product.name, 'индекс:', index);
    // console.log('createProductCard: Данные товара:', product);
    
    const card = document.createElement('div');
    card.className = 'product-card';
    
    // Получаем текущий язык
    const currentLanguage = localStorage.getItem('selectedLanguage') || 'uk';
    const currentTranslations = translations[currentLanguage] || translations.uk;
    
    // Определяем статус товара с переводами и создаем кнопку
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
        // Для товаров в наличии - обычная кнопка покупки
        statusButton = `<button class="btn add-to-cart-btn" data-index="${index}">${currentTranslations.buyButton}</button>`;
    }
    
    // Получаем цены из правильных полей API
    const newPrice = product.newPrice || product.price || 0;
    const oldPrice = product.oldPrice || 0;
    
    // Формируем HTML для старой цены (красная зачеркнутая цена)
    const oldPriceHtml = oldPrice && oldPrice > 0 && oldPrice !== newPrice ? 
        '<div class="old-price">' + oldPrice + ' ' + getCurrency() + '</div>' : '';
    
    // Формируем HTML для рейтинга
    const ratingHtml = createRatingHtml(product.rating, currentTranslations);
    
    // Определяем производителя для товаров DR и La Bella, а также информацию о 7-струнных товарах
    let manufacturerHtml = '';
    let sevenStringHtml = '';
    
    // Проверяем, является ли товар одним из товаров DR (гибкий поиск)
    const isDRProduct = (() => {
        const productName = product.name.toLowerCase();
        return productName.startsWith('dr ') || productName.includes(' dr ');
    })();
    
    // Проверяем, является ли товар одним из товаров La Bella (гибкий поиск)
    const isLaBellaProduct = (() => {
        const productName = product.name.toLowerCase();
        return productName.includes('la bella');
    })();
    
    // Проверяем, является ли товар 7-струнным (гибкий поиск)
    const is7StringProduct = (() => {
        const productName = product.name.toLowerCase();
        return productName.includes('7-string') || 
               productName.includes('7 string') || 
               productName.includes('7-струн') || 
               productName.includes('7 струн') ||
               productName.includes('7-string electric') ||
               productName.includes('7 string electric') ||
               productName.includes('7-струн для электрогитары') ||
               productName.includes('7 струн для электрогитары');
    })();
    
    if (isDRProduct) {
        manufacturerHtml = `<span class="product-manufacturer">${currentTranslations.manufacturer}: DR</span>`;
    } else if (isLaBellaProduct) {
        manufacturerHtml = `<span class="product-manufacturer">${currentTranslations.manufacturer}: La Bella</span>`;
    }
    
    // Добавляем информацию о 7-струнных товарах
    if (is7StringProduct) {
        sevenStringHtml = `<span class="product-seven-string">${currentTranslations.sevenStringInfo}</span>`;
    }
    
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
                manufacturerHtml +
                sevenStringHtml +
            '</div>' +
            '<div class="product-prices">' +
                oldPriceHtml +
                '<div class="new-price">' + newPrice + ' ' + getCurrency() + '</div>' +
            '</div>' +
            '<div class="product-rating">' + ratingHtml + '</div>' +
        '</div>' +
        statusButton;
    
    // console.log('createProductCard: HTML карточки создан:', cardHtml);
    card.innerHTML = cardHtml;
    
    // console.log('createProductCard: Карточка создана и возвращена');
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
    
    // Добавляем полные звезды
    for (let i = 0; i < fullStars; i++) {
        html += '<span class="star-filled">★</span>';
    }
    
    // Добавляем половинную звезду
    if (hasHalfStar) {
        html += '<span class="star-half">★</span>';
    }
    
    // Добавляем пустые звезды
    for (let i = 0; i < emptyStars; i++) {
        html += '<span class="star-empty">★</span>';
    }
    
    return html;
}

// Функция переключения языка
function switchLanguage(lang) {
    console.log('switchLanguage: Переключаем на язык:', lang);
    
    // Проверяем, что translations загружен
    if (typeof translations === 'undefined') {
        console.error('switchLanguage: translations не загружен, пропускаем переключение языка');
        return;
    }
    
    // Сохраняем выбранный язык в localStorage
    localStorage.setItem('selectedLanguage', lang);
    
    // Обновляем все элементы с data-translate
    const elements = document.querySelectorAll('[data-translate]');
    console.log(`switchLanguage: Найдено ${elements.length} элементов для перевода`);
    
    elements.forEach(element => {
        const key = element.getAttribute('data-translate');
        if (translations[lang] && translations[lang][key]) {
            if (key === 'offerText') {
                element.innerHTML = translations[lang][key];
                console.log(`switchLanguage: Обновлен ${key} (innerHTML):`, translations[lang][key]);
            } else if (key === 'searchPlaceholder') {
                // Специальная обработка для placeholder поиска
                element.placeholder = translations[lang][key];
                console.log(`switchLanguage: Обновлен ${key} (placeholder):`, translations[lang][key]);
            } else {
                const oldText = element.textContent;
                element.textContent = translations[lang][key];
                console.log(`switchLanguage: Обновлен ${key}: "${oldText}" → "${translations[lang][key]}"`);
            }
        } else {
            console.warn(`switchLanguage: Перевод не найден для ключа "${key}" на языке "${lang}"`);
        }
    });
    
    // Обновляем все элементы с data-translate-placeholder
    const placeholderElements = document.querySelectorAll('[data-translate-placeholder]');
    placeholderElements.forEach(element => {
        const key = element.getAttribute('data-translate-placeholder');
        if (translations[lang] && translations[lang][key]) {
            element.placeholder = translations[lang][key];
        }
    });
    
    // Обновляем атрибут lang у html
    document.documentElement.lang = lang;
    
    // Пересоздаем карточки товаров с новым языком
    if (window.currentProducts && window.currentProducts.length > 0) {
        console.log('switchLanguage: Пересоздаем карточки товаров с новым языком');
        displayProducts(window.currentProducts);
    }
    
    // Обновляем онлайн статус
    updateOnlineStatus();
    
    console.log('switchLanguage: Язык переключен на:', lang);
}

// Функция инициализации языка
function initializeLanguage() {
    console.log('initializeLanguage: Инициализируем язык');
    
    // Получаем сохраненный язык или используем украинский по умолчанию
    const savedLanguage = localStorage.getItem('selectedLanguage') || 'uk';
    console.log('initializeLanguage: Сохраненный язык:', savedLanguage);
    
    // Переключаем на сохраненный язык
    switchLanguage(savedLanguage);
    
    // Дополнительно обновляем активное состояние кнопок языка
    // Это нужно для случая, когда DOM еще не полностью загружен
    setTimeout(() => {
        console.log('initializeLanguage: Дополнительно обновляем активное состояние кнопок языка');
        updateLanguageButtons(savedLanguage);
    }, 100);
    
    // Принудительно обновляем переводы еще раз через небольшую задержку
    // Это помогает в случаях, когда DOM еще не полностью готов
    setTimeout(() => {
        console.log('initializeLanguage: Принудительно обновляем переводы');
        switchLanguage(savedLanguage);
    }, 500);
    
    // Дополнительная проверка и принудительное обновление через 1 секунду
    // Это гарантирует, что переводы применятся даже при проблемах с кэшем
    setTimeout(() => {
        console.log('initializeLanguage: Финальная проверка переводов');
        const bannerTitle = document.querySelector('[data-translate="bannerTitle"]');
        if (bannerTitle) {
            console.log('initializeLanguage: Текущий текст заголовка баннера:', bannerTitle.textContent);
            console.log('initializeLanguage: Ожидаемый текст для языка', savedLanguage, ':', translations[savedLanguage]?.bannerTitle);
            if (bannerTitle.textContent !== translations[savedLanguage]?.bannerTitle) {
                console.log('initializeLanguage: Принудительно обновляем заголовок баннера');
                switchLanguage(savedLanguage);
            }
        }
    }, 1000);
    
    console.log('initializeLanguage: Язык инициализирован:', savedLanguage);
}

// Функция настройки переключателей языка
function setupLanguageSwitchers() {
    console.log('setupLanguageSwitchers: Настраиваем переключатели языка');
    
    // Находим кнопки переключения языка
    const ukButton = document.querySelector('[data-lang="uk"]');
    const ruButton = document.querySelector('[data-lang="ru"]');
    const enButton = document.querySelector('[data-lang="en"]');
    
    console.log('setupLanguageSwitchers: Найдены кнопки языка:', { ukButton, ruButton, enButton });
    
    if (ukButton) {
        ukButton.addEventListener('click', function() {
            console.log('setupLanguageSwitchers: Переключаем на украинский');
            switchLanguage('uk');
            updateLanguageButtons('uk');
        });
    }
    
    if (ruButton) {
        ruButton.addEventListener('click', function() {
            console.log('setupLanguageSwitchers: Переключаем на русский');
            switchLanguage('ru');
            updateLanguageButtons('ru');
        });
    }
    
    if (enButton) {
        enButton.addEventListener('click', function() {
            console.log('setupLanguageSwitchers: Переключаем на английский');
            switchLanguage('en');
            updateLanguageButtons('en');
        });
    }
    
    // Устанавливаем активное состояние для текущего языка
    const currentLanguage = localStorage.getItem('selectedLanguage') || 'uk';
    console.log('setupLanguageSwitchers: Текущий язык:', currentLanguage);
    updateLanguageButtons(currentLanguage);
    
    console.log('setupLanguageSwitchers: Переключатели языка настроены');
}

// Функция обновления активного состояния кнопок языка
function updateLanguageButtons(activeLang) {
    console.log('updateLanguageButtons: Обновляем активное состояние для языка:', activeLang);
    
    const ukButton = document.querySelector('[data-lang="uk"]');
    const ruButton = document.querySelector('[data-lang="ru"]');
    const enButton = document.querySelector('[data-lang="en"]');
    
    console.log('updateLanguageButtons: Найдены кнопки языка:', { ukButton, ruButton, enButton });
    
    // Убираем активное состояние со всех кнопок
    if (ukButton) {
        ukButton.classList.remove('active');
        console.log('updateLanguageButtons: Убран класс active с украинской кнопки');
    }
    if (ruButton) {
        ruButton.classList.remove('active');
        console.log('updateLanguageButtons: Убран класс active с русской кнопки');
    }
    if (enButton) {
        enButton.classList.remove('active');
        console.log('updateLanguageButtons: Убран класс active с английской кнопки');
    }
    
    // Добавляем активное состояние к выбранной кнопке
    switch (activeLang) {
        case 'uk':
            if (ukButton) {
                ukButton.classList.add('active');
                console.log('updateLanguageButtons: Добавлен класс active к украинской кнопке');
            }
            break;
        case 'ru':
            if (ruButton) {
                ruButton.classList.add('active');
                console.log('updateLanguageButtons: Добавлен класс active к русской кнопке');
            }
            break;
        case 'en':
            if (enButton) {
                enButton.classList.add('active');
                console.log('updateLanguageButtons: Добавлен класс active к английской кнопке');
            }
            break;
    }
    
    console.log('updateLanguageButtons: Активное состояние обновлено для языка:', activeLang);
}

// Инициализация при загрузке страницы
document.addEventListener('DOMContentLoaded', function() {
    console.log('DOM загружен, инициализируем приложение');
    
    // Инициализируем язык
    initializeLanguage();
    
    // Инициализируем корзину
    initializeCart();
    
    // Сбрасываем состояние бесконечной прокрутки
    currentPage = 0;
    hasMoreProducts = true;
    loadedProductNames.clear();
    
    // Автоматически загружаем товары
    loadProducts(0, false).then(() => {
        // Настраиваем обработчики событий после загрузки товаров
        setupEventHandlers();
    });
    
    // Обновляем онлайн статус
    updateOnlineStatus();
    
    // Обновляем статус каждую минуту
    setInterval(updateOnlineStatus, 60000);
});

// Функция настройки обработчиков событий
function setupEventHandlers() {
    console.log('setupEventHandlers: Настраиваем обработчики событий');
    
    // Обработчик клавиши ESC для закрытия попапов
    document.addEventListener('keydown', function(event) {
        if (event.key === 'Escape') {
            // Закрываем корзину
            const cartPopup = document.getElementById('cartPopup');
            if (cartPopup && cartPopup.style.display === 'flex') {
                closeCartPopup();
                return;
            }
            
            // Закрываем меню
            const menuPopup = document.getElementById('menuPopup');
            if (menuPopup && menuPopup.style.display === 'flex') {
                menuPopup.style.display = 'none';
                return;
            }
            
            // Закрываем настройки
            const settingsPopup = document.getElementById('settingsPopup');
            if (settingsPopup && settingsPopup.style.display === 'flex') {
                settingsPopup.style.display = 'none';
                return;
            }
            
                         // Закрываем контакты
             const contactsPopup = document.getElementById('contactsPopup');
             if (contactsPopup && (contactsPopup.classList.contains('show') || contactsPopup.style.display === 'flex')) {
                 closeContactsPopup();
                 return;
             }
            
                         // Закрываем оферту
             const offerPopup = document.getElementById('offerPopup');
             if (offerPopup && (offerPopup.classList.contains('show') || offerPopup.style.display === 'flex')) {
                 closeOfferPopup();
                 return;
             }
        }
    });
    
    // Обработчик переключения языков
    setupLanguageSwitchers();
    
    // Дополнительно обновляем активное состояние кнопок языка после настройки обработчиков
    const currentLanguage = localStorage.getItem('selectedLanguage') || 'uk';
    setTimeout(() => {
        console.log('setupEventHandlers: Дополнительно обновляем активное состояние кнопок языка:', currentLanguage);
        updateLanguageButtons(currentLanguage);
    }, 200);
    
    // Обработчик клика вне попапов
    document.addEventListener('click', function(event) {
        // Убираем лишний лог - он срабатывает при каждом клике
        // console.log('setupEventHandlers: Обработчик клика вне попапов сработал');
        
        // Проверяем, открыты ли контакты или оферта
        const contactsPopup = document.getElementById('contactsPopup');
        const offerPopup = document.getElementById('offerPopup');
        const isContactsOpen = contactsPopup && (contactsPopup.classList.contains('show') || contactsPopup.style.display === 'flex');
        const isOfferOpen = offerPopup && (offerPopup.classList.contains('show') || offerPopup.style.display === 'flex');
        
        // Если открыты контакты или оферта, НЕ закрываем меню по клику вне
        if (isContactsOpen || isOfferOpen) {
            console.log('setupEventHandlers: Контакты или оферта открыты, меню остается открытым');
            return;
        }
        
        // Дополнительная проверка: если оферта только что закрылась, не закрываем меню
        if (offerPopup && offerPopup.style.display === 'none' && offerPopup.classList.contains('show') === false) {
            console.log('setupEventHandlers: Оферта только что закрылась, меню остается открытым');
            return;
        }
        
        // Закрытие меню аватара
        const avatarMenu = document.querySelector('.avatar-dropdown');
        const profilePic = document.querySelector('.profile-pic');
        
        if (avatarMenu && avatarMenu.classList.contains('show')) {
            if (!profilePic.contains(event.target) && !avatarMenu.contains(event.target)) {
                avatarMenu.classList.remove('show');
                console.log('toggleAvatarMenu: Меню аватара закрыто (клик вне)');
            }
        }
        
        // Закрытие меню (только если не открыты контакты/оферта)
        const menuPopup = document.getElementById('menuPopup');
        const menuBtn = document.querySelector('.menu-btn');
        
        if (menuPopup && menuPopup.style.display === 'flex') {
            if (!menuBtn.contains(event.target) && !menuPopup.contains(event.target)) {
                menuPopup.style.display = 'none';
                console.log('showMenuPopup: Меню закрыто (клик вне)');
            }
        }
        
        // Закрытие настроек
        const settingsPopup = document.getElementById('settingsPopup');
        const settingsBtn = document.querySelector('.settings-btn');
        
        if (settingsPopup && settingsPopup.style.display === 'flex') {
            if (!settingsBtn.contains(event.target) && !settingsPopup.contains(event.target)) {
                settingsPopup.style.display = 'none';
                console.log('showSettingsPopup: Настройки закрыты (клик вне)');
            }
        }
        
        // Закрытие корзины
        const cartPopup = document.getElementById('cartPopup');
        const cartBtn = document.querySelector('.cart-btn');
        
        if (cartPopup && cartPopup.style.display === 'flex') {
            if (cartBtn && !cartBtn.contains(event.target) && !cartPopup.contains(event.target)) {
                closeCartPopup();
                console.log('showCartPopup: Корзина закрыта (клик вне)');
            }
        }
    });
    
    // Обработчик кликов по кнопкам добавления в корзину
    document.addEventListener('click', function(event) {
        if (event.target.classList.contains('add-to-cart-btn')) {
            const index = parseInt(event.target.getAttribute('data-index'));
            console.log('Клик по кнопке добавления в корзину, индекс:', index);
            
            // Получаем данные товара из глобального массива
            if (window.currentProducts && window.currentProducts[index]) {
                const product = window.currentProducts[index];
                addToCart(product);
                
                // Показываем уведомление
                showAddToCartNotification(product.name);
            }
        }
        
        // Обработчик кнопки избранного
        if (event.target.closest('.favorite-btn')) {
            const btn = event.target.closest('.favorite-btn');
            const index = parseInt(btn.getAttribute('data-index'));
            console.log('Клик по кнопке избранного, индекс:', index);
            
            // Переключаем состояние
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
            const index = parseInt(btn.getAttribute('data-index'));
            console.log('Клик по кнопке сравнения, индекс:', index);
            
            // Находим соответствующую карточку товара
            const productCard = btn.closest('.product-card');
            const checkbox = productCard.querySelector('.compare-checkbox');
            
            // Переключаем состояние кнопки весов
            btn.classList.toggle('active');
            const icon = btn.querySelector('i');
            if (btn.classList.contains('active')) {
                // Активное состояние - желтые весы
                icon.className = 'fas fa-balance-scale';
                icon.style.color = '#FFD700';
                // Активируем галочку
                checkbox.checked = true;
            } else {
                // Неактивное состояние - серые весы
                icon.className = 'fas fa-balance-scale';
                icon.style.color = '#666';
                // Деактивируем галочку
                checkbox.checked = false;
            }
            
            // Обрабатываем логику сравнения
            if (window.currentProducts && window.currentProducts[index]) {
                const product = window.currentProducts[index];
                if (checkbox.checked) {
                    console.log('Товар добавлен в список сравнения:', product.name);
                    // Здесь можно добавить логику для сохранения в localStorage
                } else {
                    console.log('Товар удален из списка сравнения:', product.name);
                    // Здесь можно добавить логику для удаления из localStorage
                }
            }
        }
        
        // Обработчик чекбокса сравнения
        if (event.target.classList.contains('compare-checkbox')) {
            const checkbox = event.target;
            const index = parseInt(checkbox.getAttribute('data-index'));
            console.log('Клик по чекбоксу сравнения, индекс:', index);
            
            // Находим соответствующую кнопку весов
            const productCard = checkbox.closest('.product-card');
            const compareBtn = productCard.querySelector('.compare-btn');
            const icon = compareBtn.querySelector('i');
            
            // Синхронизируем состояние кнопки весов с галочкой
            if (checkbox.checked) {
                // Активируем кнопку весов
                compareBtn.classList.add('active');
                icon.className = 'fas fa-balance-scale';
                icon.style.color = '#FFD700';
            } else {
                // Деактивируем кнопку весов
                compareBtn.classList.remove('active');
                icon.className = 'fas fa-balance-scale';
                icon.style.color = '#666';
            }
            
            // Обрабатываем логику сравнения
            if (window.currentProducts && window.currentProducts[index]) {
                const product = window.currentProducts[index];
                if (checkbox.checked) {
                    console.log('Товар добавлен в список сравнения:', product.name);
                    // Здесь можно добавить логику для сохранения в localStorage
                } else {
                    console.log('Товар удален из списка сравнения:', product.name);
                    // Здесь можно добавить логику для удаления из localStorage
                }
            }
        }
    });
    
    // Обработчик поиска
    const searchInput = document.querySelector('.search-input');
    if (searchInput) {
        console.log('setupEventHandlers: Найден поисковый input, настраиваем обработчик');
        
        // Удаляем предыдущий обработчик, если он есть
        if (searchInput._inputHandler) {
            searchInput.removeEventListener('input', searchInput._inputHandler);
        }
        
        // Создаем новый обработчик
        searchInput._inputHandler = function(e) {
            const query = e.target.value;
            console.log('setupEventHandlers: Поисковый запрос:', query);
            
            // Очищаем предыдущий таймаут
            if (searchTimeout) {
                clearTimeout(searchTimeout);
            }
            
            // Если поиск пустой, загружаем все товары
            if (!query.trim()) {
                searchTerm = '';
                isSearchActive = false;
                // Сбрасываем состояние бесконечной прокрутки
                currentPage = 0;
                hasMoreProducts = true;
                loadedProductNames.clear();
                loadProducts(0, false);
                return;
            }
            
            // Устанавливаем задержку для поиска (debouncing)
            searchTimeout = setTimeout(function() {
                searchProducts(query);
            }, 300);
        };
        
        // Добавляем обработчик
        searchInput.addEventListener('input', searchInput._inputHandler);
    }
    
         // Обработчик прокрутки для бесконечной загрузки
     window.addEventListener('scroll', function() {
         if (isLoading || !hasMoreProducts || isSearchActive || isCategoryFilterActive) {
             console.log('setupEventHandlers: Прокрутка заблокирована - isLoading:', isLoading, 'hasMoreProducts:', hasMoreProducts, 'isSearchActive:', isSearchActive, 'isCategoryFilterActive:', isCategoryFilterActive);
             return;
         }
         
         const scrollTop = window.pageYOffset || document.documentElement.scrollTop;
         const windowHeight = window.innerHeight;
         const documentHeight = document.documentElement.scrollHeight;
         
         // Загружаем следующую страницу когда пользователь приближается к концу страницы
         if (scrollTop + windowHeight >= documentHeight - 100) {
             console.log('setupEventHandlers: Достигнут конец страницы, загружаем следующую страницу');
             loadNextPage();
         }
     });
     
                  // Обработчик изменения способа доставки
       const deliveryMethodSelect = document.getElementById('deliveryMethodSelect');
       if (deliveryMethodSelect) {
           deliveryMethodSelect.addEventListener('change', function() {
               console.log('setupEventHandlers: Изменен способ доставки на:', this.value);
               updateDeliveryCost();
               updateCartCalculations(); // Дополнительно обновляем расчеты корзины
           });
       }
      
             // Обработчик изменения способа оплаты
       const paymentMethodSelect = document.getElementById('paymentMethodSelect');
       if (paymentMethodSelect) {
           paymentMethodSelect.addEventListener('change', function() {
               console.log('setupEventHandlers: Изменен способ оплаты на:', this.value);
               updateDeliveryMethods();
               updateCartCalculations(); // Обновляем расчеты при изменении способа оплаты
           });
       }
     
           // Обработчик поля телефона
      const phoneInput = document.getElementById('cartCustomerPhone');
      if (phoneInput) {
          phoneInput.addEventListener('focus', function() {
              // Устанавливаем курсор после "+380"
              if (this.value === '+380') {
                  this.setSelectionRange(4, 4);
              }
          });
          
          phoneInput.addEventListener('input', function() {
              // Убеждаемся, что номер начинается с "+380"
              if (!this.value.startsWith('+380')) {
                  this.value = '+380' + this.value.replace(/^\+380/, '');
              }
          });
          
          phoneInput.addEventListener('keydown', function(e) {
              // Предотвращаем удаление "+380" при нажатии Backspace в начале
              if (e.key === 'Backspace' && this.selectionStart <= 4) {
                  e.preventDefault();
              }
          });
      }
      
             // Обработчик поля купона
       const couponInput = document.getElementById('cartCouponInput');
       if (couponInput) {
           couponInput.addEventListener('input', function() {
               console.log('setupEventHandlers: Изменен купон:', this.value);
               updateCartCalculations();
           });
           
           // Также обновляем при потере фокуса
           couponInput.addEventListener('blur', function() {
               console.log('setupEventHandlers: Купон потерял фокус:', this.value);
               updateCartCalculations();
           });
       }
       
       // Обработчик поля бонусов
       const bonusesInput = document.getElementById('cartBonusesInput');
       if (bonusesInput) {
           bonusesInput.addEventListener('input', function() {
               console.log('setupEventHandlers: Изменены бонусы:', this.value);
               updateCartCalculations();
           });
           
           // Также обновляем при потере фокуса
           bonusesInput.addEventListener('blur', function() {
               console.log('setupEventHandlers: Бонусы потеряли фокус:', this.value);
               updateCartCalculations();
           });
       }
       
       // Обработчик кнопки корзины
       const cartBtn = document.querySelector('.cart-btn');
       if (cartBtn) {
           cartBtn.addEventListener('click', function() {
               console.log('setupEventHandlers: Клик по кнопке корзины');
               showCartPopup();
           });
       }
       
                       // Обработчик кликов по кнопкам нижней панели меню
         const navItems = document.querySelectorAll('.nav-item');
         console.log('setupEventHandlers: Найдены nav-items:', navItems.length);
         
         // Обработчик кликов по категориям
         const categoryItems = document.querySelectorAll('.brand-logo');
         console.log('setupEventHandlers: Найдены brand-logo:', categoryItems.length);
         
         if (categoryItems.length > 0) {
             categoryItems.forEach(categoryItem => {
                 // Удаляем предыдущий обработчик, если он есть
                 if (categoryItem._clickHandler) {
                     categoryItem.removeEventListener('click', categoryItem._clickHandler);
                 }
                 
                 // Создаем новый обработчик
                 categoryItem._clickHandler = function() {
                     const category = this.getAttribute('data-category');
                     console.log('setupEventHandlers: Клик по категории:', category);
                     filterProductsByCategory(category);
                 };
                 
                 // Добавляем обработчик
                 categoryItem.addEventListener('click', categoryItem._clickHandler);
             });
             console.log('setupEventHandlers: Обработчики для категорий настроены');
         } else {
             console.warn('setupEventHandlers: Элементы .brand-logo не найдены');
         }
        
        if (navItems.length > 0) {
            // Устанавливаем первую кнопку как активную по умолчанию
            navItems[0].classList.add('active');
            console.log('setupEventHandlers: Первая кнопка установлена как активная');
            
            navItems.forEach((navItem, index) => {
                // Удаляем предыдущий обработчик, если он есть
                if (navItem._clickHandler) {
                    navItem.removeEventListener('click', navItem._clickHandler);
                }
                
                                 // Создаем новый обработчик
                 navItem._clickHandler = (e) => {
                     console.log(`setupEventHandlers: Клик по nav-item ${index + 1}`);
                     
                     // Предотвращаем всплытие события
                     e.stopPropagation();
                     e.preventDefault();
                     e.stopImmediatePropagation();
                     
                     // Убираем активный класс со всех кнопок
                     navItems.forEach(item => {
                         item.classList.remove('active');
                     });
                     
                     // Добавляем активный класс к нажатой кнопке
                     navItem.classList.add('active');
                     console.log(`setupEventHandlers: Добавлен активный класс к кнопке ${navItem.querySelector('span')?.textContent}`);
                     
                     // Выполняем соответствующее действие
                     const navText = navItem.querySelector('span').textContent;
                     console.log(`setupEventHandlers: Выполняем действие для: ${navText}`);
                     
                     // Выполняем действие в зависимости от кнопки
                     if (navText.includes('Товары') || navText.includes('Products')) {
                         // Показываем все товары (категория Струны для электрогитары)
                         console.log('setupEventHandlers: Открываем категорию Товары (Струны для электрогитары)');
                         clearCategoryFilter();
                     } else if (navText.includes('Корзина') || navText.includes('Cart')) {
                         showCartPopup();
                     } else if (navText.includes('Контакты') || navText.includes('Contacts')) {
                         showContactsPopup();
                     } else if (navText.includes('Оферта') || navText.includes('Offer')) {
                         showOfferPopup();
                     }
                     
                     // Возвращаем false для предотвращения дальнейшего распространения события
                     return false;
                 };
                
                // Добавляем обработчик
                navItem.addEventListener('click', navItem._clickHandler);
                console.log(`setupEventHandlers: Обработчик для nav-item ${index + 1} настроен`);
            });
        }
        
        // Обработчик кликов по элементам меню
        const menuItems = document.querySelectorAll('.menu-item');
        console.log('setupEventHandlers: Найдены menu-items:', menuItems.length);
        
        if (menuItems.length > 0) {
            menuItems.forEach(menuItem => {
                menuItem.addEventListener('click', function() {
                    const category = this.getAttribute('data-category');
                    console.log('setupEventHandlers: Клик по элементу меню:', category);
                    
                    // Закрываем меню
                    const menuPopup = document.getElementById('menuPopup');
                    if (menuPopup) {
                        menuPopup.style.display = 'none';
                    }
                    
                    // Обрабатываем категорию
                    if (category === 'electricGuitarStrings') {
                        // Для "Струны для электрогитары" просто показываем все товары
                        console.log('setupEventHandlers: Открываем категорию Струны для электрогитары');
                        clearCategoryFilter();
                    } else if (category) {
                        // Для других категорий используем фильтрацию
                        filterProductsByCategory(category);
                    }
                });
            });
            console.log('setupEventHandlers: Обработчики для меню настроены');
        } else {
            console.warn('setupEventHandlers: Элементы .menu-item не найдены');
        }
}

// Делаем функции доступными глобально
window.showContactsPopup = showContactsPopup;
window.closeContactsPopup = closeContactsPopup;
window.showOfferPopup = showOfferPopup;
window.closeOfferPopup = closeOfferPopup;
window.showDiscontinuedPopup = showDiscontinuedPopup;
window.showOutOfStockPopup = showOutOfStockPopup;
window.showExpectedPopup = showExpectedPopup;
window.showOnOrderPopup = showOnOrderPopup;

// Функция фильтрации товаров по категории
function filterProductsByCategory(category) {
    console.log('filterProductsByCategory: Фильтруем товары по категории:', category);
    
    // Устанавливаем флаг активной фильтрации по категориям
    isCategoryFilterActive = true;
    console.log('filterProductsByCategory: Установлен флаг isCategoryFilterActive = true');
    
    // Убираем активный класс со всех категорий
    const allCategoryItems = document.querySelectorAll('.brand-logo');
    allCategoryItems.forEach(item => item.classList.remove('active'));
    
    // Добавляем активный класс к выбранной категории
    const selectedCategory = document.querySelector(`[data-category="${category}"]`);
    if (selectedCategory) {
        selectedCategory.classList.add('active');
    }
    
    // Определяем, является ли категория производителем
    const manufacturerCategories = [
        'cleartone', 'curt-mangan', 'daddario', 'dean-markley', 'dr', 'dunlop', 
        'elixir', 'ernie-ball', 'fender', 'ghs', 'gibson', 'la-bella', 
        'musicians-gear', 'pyramid', 'rotosound', 'optima', 'orphee'
    ];
    
    // Специальная обработка для 7-струнных товаров
    if (category === '7-string') {
        console.log('filterProductsByCategory: 7-string - специальная категория, вызываем search7StringProducts()');
        search7StringProducts();
        return;
    }
    
    // Если это производитель, используем поиск
    if (manufacturerCategories.includes(category)) {
        console.log(`filterProductsByCategory: ${category} - производитель, используем поиск`);
        
                 // Получаем название производителя для поиска
         let searchTerm = '';
         switch (category) {
             case 'cleartone':
                 searchTerm = 'Cleartone';
                 break;
             case 'curt-mangan':
                 searchTerm = 'Curt Mangan';
                 break;
             case 'daddario':
                 searchTerm = 'addario'; // Ищем по "addario" без апострофа для лучшего поиска
                 break;
             case 'dean-markley':
                 searchTerm = 'Dean Markley';
                 break;
             case 'dr':
                 // Для DR используем несколько вариантов поиска для лучшего покрытия
                 searchTerm = 'DR';
                 console.log('filterProductsByCategory: DR - используем поиск по DR');
                 break;
             case 'dunlop':
                 searchTerm = 'Dunlop';
                 break;
             case 'elixir':
                 searchTerm = 'Elixir';
                 break;
             case 'ernie-ball':
                 searchTerm = 'Ernie Ball';
                 break;
             case 'fender':
                 searchTerm = 'Fender';
                 break;
             case 'ghs':
                 searchTerm = 'GHS';
                 break;
             case 'gibson':
                 searchTerm = 'Gibson';
                 break;
             case 'la-bella':
                 searchTerm = 'La Bella';
                 break;
             case 'musicians-gear':
                 searchTerm = 'Musician\'s Gear';
                 break;
             case 'pyramid':
                 searchTerm = 'Pyramid';
                 break;
             case 'rotosound':
                 searchTerm = 'Rotosound';
                 break;
             case 'optima':
                 searchTerm = 'Optima';
                 break;
             case 'orphee':
                 searchTerm = 'Orphee';
                 break;
         }
        
        // Выполняем поиск по производителю
        if (searchTerm) {
            console.log(`filterProductsByCategory: Выполняем поиск по запросу: "${searchTerm}"`);
            searchProducts(searchTerm);
        }
        return;
    }
    
    // Для характеристик используем старую логику фильтрации
    console.log(`filterProductsByCategory: ${category} - характеристика, используем фильтрацию`);
    
    // Проверяем, загружены ли товары
    if (!window.currentProducts || window.currentProducts.length === 0) {
        console.warn('filterProductsByCategory: Товары не загружены, загружаем...');
        loadProducts(0, false).then(() => {
            // Повторно вызываем фильтрацию после загрузки
            filterProductsByCategory(category);
        });
        return;
    }
    
    // Фильтруем товары в зависимости от категории
    if (window.currentProducts && window.currentProducts.length > 0) {
        console.log('filterProductsByCategory: Всего товаров для фильтрации:', window.currentProducts.length);
        console.log('filterProductsByCategory: Примеры названий товаров:');
        window.currentProducts.slice(0, 5).forEach((product, index) => {
            console.log(`  ${index + 1}. "${product.name}"`);
        });
        
        let filteredProducts = [];
        
        switch (category) {
            // Характеристики - улучшенная логика поиска
            case '7-string':
                console.log('filterProductsByCategory: 7-string - используем специальный поиск');
                console.log('filterProductsByCategory: Вызываем search7StringProducts()');
                // Используем специальную функцию для 7-струнных товаров
                search7StringProducts();
                return;
            case '8-string':
                filteredProducts = window.currentProducts.filter(product => 
                    product.name.toLowerCase().includes('8-string') || 
                    product.name.toLowerCase().includes('8 струн') ||
                    product.name.toLowerCase().includes('8-струн') ||
                    product.name.toLowerCase().includes('8 string'));
                break;
            case '9-string':
                filteredProducts = window.currentProducts.filter(product => 
                    product.name.toLowerCase().includes('9-string') || 
                    product.name.toLowerCase().includes('9 струн') ||
                    product.name.toLowerCase().includes('9-струн') ||
                    product.name.toLowerCase().includes('9 string'));
                break;
            case 'flatwound':
                filteredProducts = window.currentProducts.filter(product => 
                    product.name.toLowerCase().includes('flatwound') || 
                    product.name.toLowerCase().includes('плоская обмотка') ||
                    product.name.toLowerCase().includes('плоска обмотка') ||
                    product.name.toLowerCase().includes('flat wound'));
                break;
            case '09-gauge':
                filteredProducts = window.currentProducts.filter(product => 
                    product.name.toLowerCase().includes('09') || 
                    product.name.toLowerCase().includes('9-') ||
                    product.name.toLowerCase().includes('9 gauge') ||
                    product.name.toLowerCase().includes('9 калибр'));
                break;
            case '10-gauge':
                filteredProducts = window.currentProducts.filter(product => 
                    product.name.toLowerCase().includes('10') || 
                    product.name.toLowerCase().includes('10 gauge') ||
                    product.name.toLowerCase().includes('10 калибр'));
                break;
            case '11-gauge':
                filteredProducts = window.currentProducts.filter(product => 
                    product.name.toLowerCase().includes('11') || 
                    product.name.toLowerCase().includes('11 gauge') ||
                    product.name.toLowerCase().includes('11 калибр'));
                break;
            case 'nickel-plated':
                filteredProducts = window.currentProducts.filter(product => 
                    product.name.toLowerCase().includes('nickel plated') || 
                    product.name.toLowerCase().includes('нікель') ||
                    product.name.toLowerCase().includes('никель') ||
                    product.name.toLowerCase().includes('nickel-plated'));
                break;
            case 'pure-nickel':
                filteredProducts = window.currentProducts.filter(product => 
                    product.name.toLowerCase().includes('pure nickel') || 
                    product.name.toLowerCase().includes('чистый никель') ||
                    product.name.toLowerCase().includes('чистий нікель'));
                break;
            case 'stainless-steel':
                filteredProducts = window.currentProducts.filter(product => 
                    product.name.toLowerCase().includes('stainless steel') || 
                    product.name.toLowerCase().includes('нержавеющая сталь') ||
                    product.name.toLowerCase().includes('нержавіюча сталь') ||
                    product.name.toLowerCase().includes('stainless-steel'));
                break;
            case 'cobalt':
                filteredProducts = window.currentProducts.filter(product => 
                    product.name.toLowerCase().includes('cobalt') || 
                    product.name.toLowerCase().includes('кобальт'));
                break;
            case 'colored':
                filteredProducts = window.currentProducts.filter(product => 
                    product.name.toLowerCase().includes('colored') || 
                    product.name.toLowerCase().includes('цветные') ||
                    product.name.toLowerCase().includes('кольорові') ||
                    product.name.toLowerCase().includes('color strings'));
                break;
            
            default:
                // Если категория не распознана, показываем все товары
                filteredProducts = window.currentProducts;
                break;
        }
        
        // Отображаем отфильтрованные товары
        if (filteredProducts.length > 0) {
            displayProducts(filteredProducts);
            console.log(`filterProductsByCategory: Найдено ${filteredProducts.length} товаров для категории "${category}"`);
            console.log('filterProductsByCategory: Примеры найденных товаров:');
            filteredProducts.slice(0, 3).forEach((product, index) => {
                console.log(`  ${index + 1}. "${product.name}"`);
            });
        } else {
            // Показываем сообщение об отсутствии товаров
            const container = document.querySelector('.inner');
            if (container) {
                // Получаем текущий язык
                const currentLanguage = localStorage.getItem('selectedLanguage') || 'uk';
                const currentTranslations = translations[currentLanguage] || translations.uk;
                
                // Получаем название категории для отображения
                let categoryDisplayName = category;
                const categoryElement = document.querySelector(`[data-category="${category}"]`);
                if (categoryElement) {
                    categoryDisplayName = categoryElement.textContent;
                }
                
                container.innerHTML = `
                    <div style="padding: 40px; text-align: center; grid-column: 1 / -1;">
                        <i class="fas fa-search" style="font-size: 48px; margin-bottom: 20px; opacity: 0.5; color: var(--text-light);"></i>
                        <h3 style="color: var(--text-primary); margin-bottom: 10px;">${currentTranslations.noProductsFound || 'Товары не найдены'}</h3>
                        <p style="color: var(--text-light); margin-bottom: 20px;">${currentTranslations.noProductsInCategory || 'В категории'} "${categoryDisplayName}" ${currentTranslations.noProductsInCategoryEnd || 'пока нет товаров'}</p>
                        <button class="btn" onclick="clearCategoryFilter()" style="background: var(--accent-color); color: white; border: none; padding: 12px 24px; border-radius: var(--border-radius); cursor: pointer;">
                            <i class="fas fa-times"></i> ${currentTranslations.showAllProducts || 'Показать все товары'}
                        </button>
                    </div>
                `;
            }
            console.log(`filterProductsByCategory: В категории "${category}" товары не найдены`);
        }
    }
}

// Функция очистки фильтра категорий
function clearCategoryFilter() {
    console.log('clearCategoryFilter: Очищаем фильтр категорий');
    
    // Убираем активный класс со всех категорий
    const allCategoryItems = document.querySelectorAll('.brand-logo');
    allCategoryItems.forEach(item => item.classList.remove('active'));
    
    // Очищаем поиск
    const searchInput = document.querySelector('.search-input');
    if (searchInput) {
        searchInput.value = '';
    }
    
    // Сбрасываем состояние поиска
    searchTerm = '';
    isSearchActive = false;
    isCategoryFilterActive = false;
    
    // Сбрасываем состояние бесконечной прокрутки
    currentPage = 0;
    hasMoreProducts = true;
    loadedProductNames.clear();
    
    // Всегда загружаем все товары заново
    console.log('clearCategoryFilter: Загружаем все товары заново');
    loadProducts(0, false);
}

// Функция специального поиска для товаров DR
async function searchDRProducts() {
    console.log('searchDRProducts: Поиск товаров DR по пометкам в карточках');
    
    try {
        // Сначала загружаем все товары в DOM для поиска по пометкам
        const response = await fetch('http://localhost:8000/api/products?start=0&limit=1000');
        if (!response.ok) {
            throw new Error(`HTTP error! status: ${response.status}`);
        }
        
        const data = await response.json();
        console.log(`searchDRProducts: Загружено ${data.products.length} товаров для поиска по пометкам`);
        
        if (data && data.products && data.products.length > 0) {
            // Отображаем все товары в DOM
            displayProducts(data.products);
            
            // Теперь ищем по пометкам в карточках
            const drCards = document.querySelectorAll('.product-manufacturer');
            console.log(`searchDRProducts: Найдено ${drCards.length} карточек с пометкой производителя`);
            
            if (drCards.length > 0) {
                // Фильтруем только карточки с пометкой DR
                const drProductCards = [];
                drCards.forEach(card => {
                    if (card.textContent.includes('DR')) {
                        const productCard = card.closest('.product-card');
                        if (productCard) {
                            drProductCards.push(productCard);
                        }
                    }
                });
                
                console.log(`searchDRProducts: Найдено ${drProductCards.length} карточек DR`);
                
                if (drProductCards.length > 0) {
                    // Скрываем все карточки, кроме DR
                    const allProductCards = document.querySelectorAll('.product-card');
                    allProductCards.forEach(card => {
                        card.style.display = 'none';
                    });
                    
                    // Показываем только карточки DR
                    drProductCards.forEach(card => {
                        card.style.display = 'block';
                    });
                    
                    isCategoryFilterActive = true;
                    console.log('searchDRProducts: Отображены только товары DR по пометкам');
                } else {
                    console.log('searchDRProducts: Карточки DR не найдены');
                    showNoSearchResults('DR');
                }
            } else {
                console.log('searchDRProducts: Карточки с пометкой производителя не найдены');
                showNoSearchResults('DR');
            }
        } else {
            console.log('searchDRProducts: Нет товаров для поиска');
            showNoSearchResults('DR');
        }
        
    } catch (error) {
        console.error('searchDRProducts: Ошибка специального поиска DR:', error);
        showNoSearchResults('DR');
    }
}

// Функция специального поиска для товаров La Bella
async function searchLaBellaProducts() {
    console.log('searchLaBellaProducts: Поиск товаров La Bella по пометкам в карточках');
    
    try {
        // Сначала загружаем все товары в DOM для поиска по пометкам
        const response = await fetch('http://localhost:8000/api/products?start=0&limit=1000');
        if (!response.ok) {
            throw new Error(`HTTP error! status: ${response.status}`);
        }
        
        const data = await response.json();
        console.log(`searchLaBellaProducts: Загружено ${data.products.length} товаров для поиска по пометкам`);
        
        if (data && data.products && data.products.length > 0) {
            // Отображаем все товары в DOM
            displayProducts(data.products);
            
            // Теперь ищем по пометкам в карточках
            const laBellaCards = document.querySelectorAll('.product-manufacturer');
            console.log(`searchLaBellaProducts: Найдено ${laBellaCards.length} карточек с пометкой производителя`);
            
            if (laBellaCards.length > 0) {
                // Фильтруем только карточки с пометкой La Bella
                const laBellaProductCards = [];
                laBellaCards.forEach(card => {
                    if (card.textContent.includes('La Bella')) {
                        const productCard = card.closest('.product-card');
                        if (productCard) {
                            laBellaProductCards.push(productCard);
                        }
                    }
                });
                
                console.log(`searchLaBellaProducts: Найдено ${laBellaProductCards.length} карточек La Bella`);
                
                if (laBellaProductCards.length > 0) {
                    // Скрываем все карточки, кроме La Bella
                    const allProductCards = document.querySelectorAll('.product-card');
                    allProductCards.forEach(card => {
                        card.style.display = 'none';
                    });
                    
                    // Показываем только карточки La Bella
                    laBellaProductCards.forEach(card => {
                        card.style.display = 'block';
                    });
                    
                    isCategoryFilterActive = true;
                    console.log('searchLaBellaProducts: Отображены только товары La Bella по пометкам');
                } else {
                    console.log('searchLaBellaProducts: Карточки La Bella не найдены');
                    showNoSearchResults('La Bella');
                }
            } else {
                console.log('searchLaBellaProducts: Карточки с пометкой производителя не найдены');
                showNoSearchResults('La Bella');
            }
        } else {
            console.log('searchLaBellaProducts: Нет товаров для поиска');
            showNoSearchResults('La Bella');
        }
        
    } catch (error) {
        console.error('searchLaBellaProducts: Ошибка специального поиска La Bella:', error);
        showNoSearchResults('La Bella');
    }
}

// Функция специального поиска для 7-струнных товаров
async function search7StringProducts() {
    console.log('search7StringProducts: Поиск 7-струнных товаров по пометкам в карточках');
    
    try {
        // Сначала загружаем все товары в DOM для поиска по пометкам
        const response = await fetch('http://localhost:8000/api/products?start=0&limit=1000');
        if (!response.ok) {
            throw new Error(`HTTP error! status: ${response.status}`);
        }
        
        const data = await response.json();
        console.log(`search7StringProducts: Загружено ${data.products.length} товаров для поиска по пометкам`);
        
        if (data && data.products && data.products.length > 0) {
            // Отображаем все товары в DOM
            displayProducts(data.products);
            
            // Теперь ищем по пометкам в карточках
            const sevenStringCards = document.querySelectorAll('.product-seven-string');
            console.log(`search7StringProducts: Найдено ${sevenStringCards.length} карточек с пометкой 7-струнных`);
            
            if (sevenStringCards.length > 0) {
                // Скрываем все карточки, кроме 7-струнных
                const allProductCards = document.querySelectorAll('.product-card');
                allProductCards.forEach(card => {
                    card.style.display = 'none';
                });
                
                // Показываем только карточки с пометкой 7-струнных
                sevenStringCards.forEach(sevenStringCard => {
                    const productCard = sevenStringCard.closest('.product-card');
                    if (productCard) {
                        productCard.style.display = 'block';
                    }
                });
                
                isCategoryFilterActive = true;
                console.log('search7StringProducts: Отображены только 7-струнные товары по пометкам');
                
                // Показываем примеры найденных товаров
                const productNames = Array.from(sevenStringCards).slice(0, 5).map(card => {
                    const productCard = card.closest('.product-card');
                    const nameElement = productCard?.querySelector('.product-name');
                    return nameElement?.textContent || 'Неизвестный товар';
                });
                console.log('search7StringProducts: Примеры найденных товаров:', productNames);
            } else {
                console.log('search7StringProducts: Карточки с пометкой 7-струнных не найдены');
                showNoSearchResults('7-струнные');
            }
        } else {
            console.log('search7StringProducts: Нет товаров для поиска');
            showNoSearchResults('7-струнные');
        }
        
    } catch (error) {
        console.error('search7StringProducts: Ошибка поиска 7-струнных товаров:', error);
        showNoSearchResults('7-струнные');
    }
}

// Делаем функции доступными глобально
window.filterProductsByCategory = filterProductsByCategory;
window.clearCategoryFilter = clearCategoryFilter;

// Функция для принудительной очистки кэша и перезагрузки переводов
function forceClearCache() {
    console.log('forceClearCache: Принудительная очистка кэша');
    
    // Очищаем localStorage
    localStorage.clear();
    console.log('forceClearCache: localStorage очищен');
    
    // Принудительно перезагружаем страницу
    window.location.reload(true);
}

// Делаем функцию доступной глобально
window.forceClearCache = forceClearCache;

console.log('app.js инициализирован (версия 13.14 - исправлена фильтрация DR и La Bella по пометкам в карточках)');
console.log('Для принудительной очистки кэша выполните: forceClearCache()');
