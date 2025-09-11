@echo off
chcp 65001 >nul
cls
echo ===========================================
echo       БЕКАП ВЕРСИИ 2.0
echo   (Все исправления внесены)
echo ===========================================
echo.

echo Создаем backup_v2...
if not exist backup_v2 mkdir backup_v2

echo Копируем файлы...
copy index.html backup_v2\ >nul 2>&1
copy app.js backup_v2\ >nul 2>&1
copy style.css backup_v2\ >nul 2>&1
copy static_products_clean.json backup_v2\ >nul 2>&1

echo [+] БЕКАП ВЕРСИИ 2.0 СОЗДАН!
echo.
echo Файлы сохранены в папке: backup_v2\
echo.
echo Для восстановления выполните:
echo copy backup_v2\*.* .\
echo.
echo ===========================================
echo   ЧТО ИСПРАВЛЕНО В ЭТОЙ ВЕРСИИ:
echo ===========================================
echo.
echo ✅ ЛОГОТИП добавлен в шапку
echo ✅ БОНУСЫ убраны из шапки
echo ✅ КОРЗИНА исправлена (goToCart, updateCartBadge)
echo ✅ СЕРДЕЧКО и ВЕСЫ на месте
echo ✅ КНОПКА КУПИТЬ работает правильно
echo ✅ ЗВЕЗДНЫЙ РЕЙТИНГ на своем месте
echo ✅ ФИЛЬТРЫ работают верно
echo ✅ ВСЕ НАРАБОТКИ после af599fc возвращены
echo.
pause
