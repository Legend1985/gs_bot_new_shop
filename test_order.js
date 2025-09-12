// Тестовый скрипт для проверки заказа GS1035
console.log('=== ТЕСТ ЗАКАЗА GS1035 ===');

// Проверяем localStorage
const userOrders = JSON.parse(localStorage.getItem('userOrders') || '[]');
console.log('Все заказы из userOrders:', userOrders);

// Ищем заказ GS1035
const orderGS1035 = userOrders.find(order => order.id === 'GS1035');
console.log('Заказ GS1035 найден:', orderGS1035);

// Проверяем все ключи localStorage, содержащие userOrders
const allKeys = Object.keys(localStorage);
const orderKeys = allKeys.filter(key => key.includes('userOrders'));
console.log('Все ключи с заказами:', orderKeys);

// Проверяем каждый ключ
orderKeys.forEach(key => {
    const orders = JSON.parse(localStorage.getItem(key) || '[]');
    console.log(`Заказы в ключе ${key}:`, orders.length, 'заказов');

    const foundOrder = orders.find(order => order.id === 'GS1035');
    if (foundOrder) {
        console.log('ЗАКАЗ GS1035 НАЙДЕН в ключе', key, ':', foundOrder);
        console.log('Поля customer:', foundOrder.customer);
        console.log('Способ доставки:', foundOrder.deliveryMethod);
        console.log('Способ оплаты:', foundOrder.paymentMethod);
        console.log('Товары:', foundOrder.items);
    }
});

console.log('=== КОНЕЦ ТЕСТА ===');
