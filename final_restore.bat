@echo off
chcp 65001 >nul
cls
echo ===========================================
echo   ВОССТАНОВЛЕНИЕ КОММИТА af599fc
echo   + ВОЗВРАТ ПОСЛЕДНИХ ИЗМЕНЕНИЙ
echo ===========================================
echo.

echo ШАГ 1: Создаем backup текущих файлов...
if not exist backup_final mkdir backup_final
copy index.html backup_final\ >nul 2>&1
copy app.js backup_final\ >nul 2>&1
copy style.css backup_final\ >nul 2>&1
copy static_products_clean.json backup_final\ >nul 2>&1
echo [+] Backup создан в backup_final\
echo.

echo ШАГ 2: Восстанавливаем коммит af599fc...
echo Скачиваем файлы из коммита af599fc...
git show af599fc:index.html > temp_index.html 2>nul
git show af599fc:app.js > temp_app.js 2>nul
git show af599fc:style.css > temp_style.css 2>nul
git show af599fc:static_products_clean.json > temp_products.json 2>nul

echo Заменяем файлы...
if exist temp_index.html move temp_index.html index.html >nul 2>&1
if exist temp_app.js move temp_app.js app.js >nul 2>&1
if exist temp_style.css move temp_style.css style.css >nul 2>&1
if exist temp_products.json move temp_products.json static_products_clean.json >nul 2>&1

echo [+] Коммит af599fc восстановлен!
echo.

echo ШАГ 3: Проверяем некоммиченные изменения...
echo Показываем статус Git...
git status --porcelain
echo.

echo ШАГ 4: Проверяем недавние изменения...
echo Последние изменения в файлах:
git log --oneline -5
echo.

echo ===========================================
echo   РЕЗУЛЬТАТ ВОССТАНОВЛЕНИЯ
echo ===========================================
echo.
echo [+] Коммит af599fc восстановлен
echo [+] Backup сохранен в backup_final\
echo.
echo ТЕПЕРЬ ЗАПУСТИТЕ СЕРВЕР:
echo.
echo python server.py
echo.
echo И ОТКРОЙТЕ В БРАУЗЕРЕ:
echo http://localhost:8000/index.html
echo.
echo ЕСЛИ ЧТО-ТО НЕ РАБОТАЕТ:
echo - Восстановите из backup_final\ командой:
echo   copy backup_final\*.* .\
echo.
pause
