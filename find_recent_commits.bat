@echo off
echo === ПОИСК СВЕЖИХ КОММИТОВ ===
echo.

echo Коммиты за последние 2 дня:
echo -----------------------------------
git log --oneline --since="2 days ago" -20
echo.

echo Коммиты за последний день:
echo ---------------------------
git log --oneline --since="1 day ago"
echo.

echo Коммиты за последние 12 часов:
echo -------------------------------
git log --oneline --since="12 hours ago"
echo.

echo Коммиты за последние 6 часов:
echo -------------------------------
git log --oneline --since="6 hours ago"
echo.

echo === ВВЕДИТЕ ХЭШ КОММИТА ДЛЯ ВОССТАНОВЛЕНИЯ ===
echo.
echo Пример: af599fc или полный хэш
echo.
set /p commit_hash="Хэш коммита: "

if "%commit_hash%"=="" (
    echo Хэш не введен. Выход.
    pause
    exit /b
)

echo.
echo Восстанавливаем из коммита: %commit_hash%
echo.

echo Создаем backup...
if not exist backup_recent mkdir backup_recent
copy index.html backup_recent\ >nul 2>&1
copy app.js backup_recent\ >nul 2>&1
copy style.css backup_recent\ >nul 2>&1
copy static_products_clean.json backup_recent\ >nul 2>&1

echo Скачиваем файлы из коммита...
git show %commit_hash%:index.html > index_restored.html 2>nul
git show %commit_hash%:app.js > app_restored.js 2>nul
git show %commit_hash%:style.css > style_restored.css 2>nul
git show %commit_hash%:static_products_clean.json > static_products_clean_restored.json 2>nul

echo Заменяем файлы...
if exist index_restored.html move index_restored.html index.html >nul 2>&1
if exist app_restored.js move app_restored.js app.js >nul 2>&1
if exist style_restored.css move style_restored.css style.css >nul 2>&1
if exist static_products_clean_restored.json move static_products_clean_restored.json static_products_clean.json >nul 2>&1

echo.
echo ✅ ГОТОВО! Файлы восстановлены из коммита %commit_hash%
echo.
echo Backup сохранен в: backup_recent\
echo.
echo Запустите сервер: python server.py
echo Откройте: http://localhost:8000/index.html
echo.
pause
