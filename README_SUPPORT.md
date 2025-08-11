# Настройка кнопки поддержки для Telegram

## Описание функциональности

Кнопка поддержки теперь интегрирована с Telegram и имеет следующие возможности:

### Визуальные индикаторы
- **Зеленый кружок** - пользователь @GuitarStringsUSA онлайн
  - Текст: "Напишите нам, мы онлайн!"
  - Фон: светло-зеленый с зеленой рамкой
  
- **Синий кружок** - пользователь @GuitarStringsUSA оффлайн
  - Текст: "Напишите нам, мы позже ответим"
  - Фон: светло-синий с синей рамкой

### Функциональность
- При клике на кнопку открывается чат в Telegram с @GuitarStringsUSA
- Статус автоматически обновляется каждые 5 минут
- Анимация пульсации кружка статуса
- Эффекты при наведении (подъем кнопки, увеличение тени)

## Файлы, которые были изменены

### 1. app.js
Добавлены новые функции:
- `checkTelegramUserStatus(username)` - проверка статуса пользователя
- `openTelegramChat(username)` - открытие чата в Telegram
- `updateSupportButtonStatus()` - обновление визуального статуса

### 2. style.css
Добавлены стили:
- `.online-status.online` - стили для онлайн статуса
- `.online-status.offline` - стили для оффлайн статуса
- `.online-status:hover` - эффекты при наведении
- `--shadow-large` - переменная для увеличенной тени

### 3. test_support.html
Создан тестовый файл для проверки функциональности

## Настройка для продакшена

### Вариант 1: Использование Telegram Bot API (рекомендуется)

1. Создайте бота через @BotFather в Telegram
2. Получите токен бота
3. Замените функцию `checkTelegramUserStatus` в `app.js`:

```javascript
async function checkTelegramUserStatus(username) {
    try {
        const botToken = 'YOUR_BOT_TOKEN_HERE';
        const response = await fetch(`https://api.telegram.org/bot${botToken}/getChat?chat_id=@${username}`);
        
        if (response.ok) {
            const data = await response.json();
            if (data.ok && data.result) {
                // Проверяем последнюю активность пользователя
                const lastActivity = data.result.last_activity_date;
                const now = Math.floor(Date.now() / 1000);
                const isOnline = (now - lastActivity) < 300; // 5 минут
                
                return {
                    isOnline: isOnline,
                    username: username
                };
            }
        }
        return { isOnline: false, username: username };
    } catch (error) {
        console.error('Ошибка проверки статуса:', error);
        return { isOnline: false, username: username };
    }
}
```

### Вариант 2: Использование веб-хуков

1. Настройте веб-хук для получения обновлений о статусе пользователя
2. Создайте эндпоинт на вашем сервере для получения статуса
3. Замените функцию проверки на запрос к вашему API

### Вариант 3: Ручное управление статусом

Создайте админ-панель для ручного переключения статуса:

```javascript
// Функция для админа
function setSupportStatus(isOnline) {
    const supportButton = document.querySelector('.online-status');
    const statusDot = supportButton.querySelector('.status-dot');
    const statusText = supportButton.querySelector('span');
    
    if (isOnline) {
        statusDot.style.background = '#4CAF50';
        statusText.textContent = 'Напишите нам, мы онлайн!';
        supportButton.classList.add('online');
        supportButton.classList.remove('offline');
    } else {
        statusDot.style.background = '#2196F3';
        statusText.textContent = 'Напишите нам, мы позже ответим';
        supportButton.classList.add('offline');
        supportButton.classList.remove('online');
    }
    
    // Сохраняем статус в localStorage
    localStorage.setItem('support_status', isOnline);
}
```

## Тестирование

1. Откройте `test_support.html` в браузере
2. Проверьте работу кнопки поддержки
3. Используйте тестовые кнопки для проверки разных статусов
4. Убедитесь, что клик по кнопке работает корректно

## Безопасность

- Не храните токены ботов в открытом коде
- Используйте переменные окружения или защищенные конфигурационные файлы
- Ограничьте доступ к API только необходимыми методами

## Совместимость

- Работает в Telegram Web App
- Работает в обычном браузере
- Поддерживает мобильные устройства
- Адаптивный дизайн

## Дополнительные возможности

Можно добавить:
- Уведомления о смене статуса
- Статистику обращений к поддержке
- Автоматические ответы в нерабочее время
- Интеграцию с CRM системой 