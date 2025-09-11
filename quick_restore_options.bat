@echo off
echo === БЫСТРЫЕ ВАРИАНТЫ ВОССТАНОВЛЕНИЯ ===
echo.
echo Текущая директория: %CD%
echo.
echo Переходим в директорию проекта...
cd /d E:\Python_Projects\gs_bot_new_shop
echo Новая директория: %CD%
echo.

echo === ВАРИАНТ 1: ВОССТАНОВЛЕНИЕ ИЗ BACKUP ===
echo.
if exist backup_current (
    echo Найден backup от предыдущего восстановления
    echo Содержимое backup_current:
    dir backup_current\ /b
    echo.
    echo Восстановить из backup_current? (y/n)
    set /p choice=
    if "%choice%"=="y" (
        echo Восстанавливаем из backup...
        copy backup_current\*.* .\
        echo ✅ Восстановлено из backup_current
        goto :server_start
    )
)

echo === ВАРИАНТ 2: ПРОСТАЯ ОЧИСТКА И ПЕРЕЗАПУСК ===
echo.
echo Очистить кэш браузера и перезапустить сервер? (y/n)
set /p clean_choice=
if "%clean_choice%"=="y" (
    echo Останавливаем возможные процессы сервера...
    taskkill /f /im python.exe >nul 2>&1
    timeout /t 2 >nul

    echo Запускаем сервер...
    start cmd /k "cd /d E:\Python_Projects\gs_bot_new_shop && python server.py"

    echo.
    echo ✅ Сервер запущен!
    echo Откройте в браузере: http://localhost:8000/index.html
    echo.
    echo 💡 Советы:
    echo - Очистите кэш браузера (Ctrl+F5)
    echo - Попробуйте в режиме инкогнито
    echo - Проверьте консоль браузера (F12)
    goto :end
)

echo === ВАРИАНТ 3: РУЧНОЙ ВВОД КОММИТА ===
echo.
echo Введите хэш коммита для восстановления:
echo (например: af599fc или полный хэш)
echo.
set /p manual_commit="Хэш коммита: "

if "%manual_commit%"=="" (
    echo Хэш не введен.
    goto :git_options
)

echo Восстанавливаем из коммита: %manual_commit%
echo.

echo Создаем backup...
if not exist backup_manual mkdir backup_manual
copy index.html backup_manual\ >nul 2>&1
copy app.js backup_manual\ >nul 2>&1
copy style.css backup_manual\ >nul 2>&1
copy static_products_clean.json backup_manual\ >nul 2>&1

echo Скачиваем файлы из коммита...
git show %manual_commit%:index.html > index_restored.html 2>nul
git show %manual_commit%:app.js > app_restored.js 2>nul
git show %manual_commit%:style.css > style_restored.css 2>nul
git show %manual_commit%:static_products_clean.json > static_products_clean_restored.json 2>nul

echo Заменяем файлы...
if exist index_restored.html move index_restored.html index.html >nul 2>&1
if exist app_restored.js move app_restored.js app.js >nul 2>&1
if exist style_restored.css move style_restored.css style.css >nul 2>&1
if exist static_products_clean_restored.json move static_products_clean_restored.json static_products_clean.json >nul 2>&1

echo ✅ ВОССТАНОВЛЕНИЕ ЗАВЕРШЕНО!
goto :server_start

:git_options
echo.
echo === ВАРИАНТ 4: ПРОСМОТР ИСТОРИИ GIT ===
echo.
echo Показать историю коммитов? (y/n)
set /p git_choice=
if "%git_choice%"=="y" (
    echo.
    echo ПОСЛЕДНИЕ КОММИТЫ:
    echo ------------------
    git log --oneline -10
    echo.
    echo Введите хэш коммита из списка выше:
    set /p git_commit="Хэш: "
    if not "%git_commit%"=="" (
        goto :manual_commit
    )
)

echo.
echo === НИЧЕГО НЕ ВЫБРАНО ===
echo Попробуйте один из вариантов выше или обратитесь за помощью.
goto :end

:manual_commit
set manual_commit=%git_commit%
goto :restore_from_git

:restore_from_git
echo Восстанавливаем из коммита: %manual_commit%
echo.

echo Создаем backup...
if not exist backup_git mkdir backup_git
copy index.html backup_git\ >nul 2>&1
copy app.js backup_git\ >nul 2>&1
copy style.css backup_git\ >nul 2>&1
copy static_products_clean.json backup_git\ >nul 2>&1

echo Скачиваем файлы из коммита...
git show %manual_commit%:index.html > index_restored.html 2>nul
git show %manual_commit%:app.js > app_restored.js 2>nul
git show %manual_commit%:style.css > style_restored.css 2>nul
git show %manual_commit%:static_products_clean.json > static_products_clean_restored.json 2>nul

echo Заменяем файлы...
if exist index_restored.html move index_restored.html index.html >nul 2>&1
if exist app_restored.js move app_restored.js app.js >nul 2>&1
if exist style_restored.css move style_restored.css style.css >nul 2>&1
if exist static_products_clean_restored.json move static_products_clean_restored.json static_products_clean.json >nul 2>&1

echo ✅ ВОССТАНОВЛЕНИЕ ИЗ GIT ЗАВЕРШЕНО!
goto :server_start

:server_start
echo.
echo === ЗАПУСК СЕРВЕРА ===
echo.
echo Запускаем сервер...
start cmd /k "cd /d E:\Python_Projects\gs_bot_new_shop && python server.py"
echo.
echo ✅ Сервер запущен!
echo.
echo 🌐 Откройте в браузере:
echo http://localhost:8000/index.html
echo.
echo 💡 Если сайт не работает:
echo 1. Очистите кэш браузера (Ctrl+F5)
echo 2. Попробуйте режим инкогнито
echo 3. Проверьте консоль (F12) на ошибки

:end
echo.
pause
