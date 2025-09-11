@echo off
chcp 65001 >nul
cls
echo ===========================================
echo    ТЕСТИРОВАНИЕ ИСПРАВЛЕНИЯ СРАВНЕНИЯ
echo ===========================================
echo.
echo Проверяем исправление ошибки:
echo "TypeError: Cannot set properties of null (setting 'checked')"
echo.
echo Запускаем сервер...
start "" http://localhost:8000
python -m http.server 8000
echo.
echo Сервер запущен на http://localhost:8000
echo.
echo Для тестирования:
echo 1. Откройте http://localhost:8000 в браузере
echo 2. Нажмите на кнопку сравнения (весы) у любого товара
echo 3. Проверьте, что нет ошибок в консоли браузера
echo 4. Кнопка должна менять цвет и состояние
echo.
echo Если ошибок нет - исправление успешно!
echo.
pause
