@echo off
echo === ВОССТАНОВЛЕНИЕ РАБОЧЕЙ ВЕРСИИ ИЗ GIT ===
echo.

echo Шаг 1: Создаем backup текущих файлов...
if not exist backup_current mkdir backup_current
copy index.html backup_current\ >nul 2>&1
copy app.js backup_current\ >nul 2>&1
copy style.css backup_current\ >nul 2>&1
copy static_products_clean.json backup_current\ >nul 2>&1
echo ✓ Backup создан в папке backup_current
echo.

echo Шаг 2: Восстанавливаем файлы из коммита af599fc...
git show af599fc:index.html > index_restored.html
git show af599fc:app.js > app_restored.js
git show af599fc:style.css > style_restored.css
git show af599fc:static_products_clean.json > static_products_clean_restored.json
echo ✓ Файлы восстановлены из коммита af599fc
echo.

echo Шаг 3: Заменяем текущие файлы...
move index_restored.html index.html >nul 2>&1
move app_restored.js app.js >nul 2>&1
move style_restored.css style.css >nul 2>&1
move static_products_clean_restored.json static_products_clean.json >nul 2>&1
echo ✓ Файлы заменены
echo.

echo ✅ ВОССТАНОВЛЕНИЕ ЗАВЕРШЕНО!
echo.
echo Теперь запустите сервер:
echo python server.py
echo.
echo И откройте в браузере:
echo http://localhost:8000/index.html
echo.
pause
