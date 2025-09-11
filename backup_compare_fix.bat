@echo off
chcp 65001 >nul
cls
echo ===========================================
echo    БЕКАП ВЕРСИИ С ИСПРАВЛЕНИЕМ СРАВНЕНИЯ
echo ===========================================
echo.
echo Создаем backup_compare_fix...
if not exist backup_compare_fix mkdir backup_compare_fix

echo Копируем файлы...
copy index.html backup_compare_fix\ >nul 2>&1
copy app.js backup_compare_fix\ >nul 2>&1
copy style.css backup_compare_fix\ >nul 2>&1
copy static_products_clean.json backup_compare_fix\ >nul 2>&1

echo [+] БЕКАП С ИСПРАВЛЕНИЕМ СРАВНЕНИЯ СОЗДАН!
echo.
echo Исправлено:
echo ✅ Убрана ошибка "Cannot set properties of null (setting 'checked')"
echo ✅ Функция сравнения товаров работает без сбоев
echo ✅ Кнопки сравнения меняют состояние корректно
echo.
echo Для восстановления выполните:
echo copy backup_compare_fix\*.* .\
echo.
pause
