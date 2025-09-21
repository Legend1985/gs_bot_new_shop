@echo off
chcp 65001 >nul
cls

:menu
echo ===========================================
echo       МЕНЕДЖЕР ЛОКАЛЬНОГО СЕРВИСА
echo ===========================================
echo.
echo Проект: GS Bot New Shop
echo.
echo [1] Запустить Python сервисы (server.py + api_server.py)
echo [2] Запустить Node.js сервис (server.js)
echo [3] Остановить все сервисы
echo [4] Проверить статус сервисов
echo [5] Открыть сайт в браузере
echo [6] Управление Python API сервером
echo [7] Управление Python веб сервером
echo [8] Управление Node.js сервером
echo [9] Выход
echo.

set /p choice="Выберите действие (1-9): "

if "%choice%"=="1" goto start_python_all
if "%choice%"=="2" goto start_nodejs
if "%choice%"=="3" goto stop_all
if "%choice%"=="4" goto check_status
if "%choice%"=="5" goto open_browser
if "%choice%"=="6" goto api_menu
if "%choice%"=="7" goto web_menu
if "%choice%"=="8" goto nodejs_menu
if "%choice%"=="9" goto exit

echo ❌ Неверный выбор. Попробуйте еще раз.
timeout /t 2 >nul
goto menu

:start_python_all
echo.
echo 🚀 ЗАПУСК PYTHON СЕРВИСОВ...
echo.

REM Переход в директорию проекта
cd /d "%~dp0"
echo 📁 Текущая директория: %CD%

REM Останавливаем возможные старые процессы
echo 🛑 Останавливаем старые процессы...
taskkill /f /im python.exe >nul 2>&1
taskkill /f /im node.exe >nul 2>&1
timeout /t 2 >nul

REM Запускаем API сервер (порт 5000)
echo ⚡ Запускаем Python API сервер...
start "GS Bot API Server" cmd /k "cd /d %CD% && python api_server.py"

REM Небольшая пауза между запусками
timeout /t 1 >nul

REM Запускаем веб сервер (порт 8000)
echo ⚡ Запускаем Python веб сервер...
start "GS Bot Web Server" cmd /k "cd /d %CD% && python server.py"

echo.
echo ✅ Python сервисы запущены!
echo 🌐 API сервер: http://localhost:5000
echo 🌐 Веб сервер: http://localhost:8000
echo 📄 Откройте сайт: http://localhost:8000/index.html
echo.
echo 💡 Нажмите любую клавишу для возврата в меню...
pause >nul
goto menu

:start_nodejs
echo.
echo 🚀 ЗАПУСК NODE.JS СЕРВЕРА...
echo.

REM Переход в директорию проекта
cd /d "%~dp0"
echo 📁 Текущая директория: %CD%

REM Останавливаем возможные старые процессы
echo 🛑 Останавливаем старые процессы...
taskkill /f /im python.exe >nul 2>&1
taskkill /f /im node.exe >nul 2>&1
timeout /t 2 >nul

REM Проверяем наличие Node.js
node --version >nul 2>&1
if %errorlevel% neq 0 (
    echo ❌ Node.js не установлен!
    echo 📥 Скачайте и установите Node.js с https://nodejs.org
    echo.
    echo 💡 Нажмите любую клавишу для возврата в меню...
    pause >nul
    goto menu
)

REM Запускаем Node.js сервер (порт 8000 с автоматическим скрапингом)
echo ⚡ Запускаем Node.js сервер с автоматическим скрапингом...
start "GS Bot Node.js Server" cmd /k "cd /d %CD% && node server.js"

echo.
echo ✅ Node.js сервер запущен!
echo 🌐 Сервер: http://localhost:8000
echo 📄 Откройте сайт: http://localhost:8000/index.html
echo 🔄 Автоматический скрапинг товаров запущен...
echo.
echo 💡 Нажмите любую клавишу для возврата в меню...
pause >nul
goto menu

:stop_all
echo.
echo 🛑 ОСТАНОВКА ВСЕХ СЕРВИСОВ...
echo.

REM Останавливаем все python процессы
echo 🔍 Останавливаем Python процессы...
taskkill /f /im python.exe >nul 2>&1

REM Останавливаем Node.js процессы
echo 🔍 Останавливаем Node.js процессы...
taskkill /f /im node.exe >nul 2>&1

echo ✅ Все сервисы остановлены!
timeout /t 2 >nul
echo.
echo 💡 Нажмите любую клавишу для возврата в меню...
pause >nul
goto menu


:check_status
echo.
echo 📊 ПРОВЕРКА СТАТУСА СЕРВИСОВ...
echo.

REM Проверяем процессы Python
echo 🔍 Python процессы:
tasklist /fi "imagename eq python.exe" /fo table 2>nul | findstr python.exe >nul
if %errorlevel%==0 (
    tasklist /fi "imagename eq python.exe" /fo table 2>nul
) else (
    echo ⚠️  Активные Python процессы не найдены
)

echo.
REM Проверяем процессы Node.js
echo 🔍 Node.js процессы:
tasklist /fi "imagename eq node.exe" /fo table 2>nul | findstr node.exe >nul
if %errorlevel%==0 (
    tasklist /fi "imagename eq node.exe" /fo table 2>nul
) else (
    echo ⚠️  Активные Node.js процессы не найдены
)

echo.
echo 🌐 Проверка доступности API сервера (порт 5000)...
curl -s -o nul -w "API Server - HTTP Status: %%{http_code}\n" http://localhost:5000 >nul 2>&1
if %errorlevel%==0 (
    echo ✅ API сервер отвечает на http://localhost:5000
) else (
    echo ❌ API сервер не доступен на http://localhost:5000
)

echo.
echo 🌐 Проверка доступности веб сервера (порт 8000)...
curl -s -o nul -w "Web Server - HTTP Status: %%{http_code}\n" http://localhost:8000 >nul 2>&1
if %errorlevel%==0 (
    echo ✅ Веб сервер отвечает на http://localhost:8000
) else (
    echo ❌ Веб сервер не доступен на http://localhost:8000
)

echo.
echo 💡 Нажмите любую клавишу для возврата в меню...
pause >nul
goto menu

:open_browser
echo.
echo 🌐 ОТКРЫТИЕ В БРАУЗЕРЕ...
echo.

start http://localhost:8000/index.html
echo ✅ Браузер открыт: http://localhost:8000/index.html

echo.
echo 💡 Нажмите любую клавишу для возврата в меню...
pause >nul
goto menu

:api_menu
echo.
echo ===========================================
echo        УПРАВЛЕНИЕ API СЕРВЕРОМ
echo ===========================================
echo.
echo API Сервер: http://localhost:5000
echo.
echo [1] Запустить API сервер
echo [2] Остановить API сервер
echo [3] Перезапустить API сервер
echo [4] Проверить статус API сервера
echo [5] Назад в главное меню
echo.

set /p api_choice="Выберите действие (1-5): "

if "%api_choice%"=="1" goto start_api
if "%api_choice%"=="2" goto stop_api
if "%api_choice%"=="3" goto restart_api
if "%api_choice%"=="4" goto check_api_status
if "%api_choice%"=="5" goto menu

echo ❌ Неверный выбор. Попробуйте еще раз.
timeout /t 2 >nul
goto api_menu

:start_api
echo.
echo 🚀 ЗАПУСК API СЕРВЕРА...
echo.

cd /d "%~dp0"

REM Проверяем, не запущен ли уже
tasklist /fi "imagename eq python.exe" /fi "windowtitle eq GS Bot API Server*" 2>nul | find /i "python.exe" >nul
if %errorlevel%==0 (
    echo ⚠️  API сервер уже запущен!
    goto api_menu
)

echo ⚡ Запускаем API сервер...
start "GS Bot API Server" cmd /k "cd /d %CD% && python api_server.py"

echo.
echo ✅ API сервер запущен!
echo 🌐 Доступен по адресу: http://localhost:5000
echo.
echo 💡 Нажмите любую клавишу для возврата в меню...
pause >nul
goto api_menu

:stop_api
echo.
echo 🛑 ОСТАНОВКА API СЕРВЕРА...
echo.

REM Останавливаем только API сервер
taskkill /f /fi "windowtitle eq GS Bot API Server*" >nul 2>&1

if %errorlevel%==0 (
    echo ✅ API сервер успешно остановлен!
) else (
    echo ⚠️  API сервер не найден или уже остановлен.
)

timeout /t 2 >nul
echo.
echo 💡 Нажмите любую клавишу для возврата в меню...
pause >nul
goto api_menu

:restart_api
echo.
echo 🔄 ПЕРЕЗАПУСК API СЕРВЕРА...
echo.

REM Останавливаем API сервер
echo 🛑 Шаг 1: Останавливаем API сервер...
taskkill /f /fi "windowtitle eq GS Bot API Server*" >nul 2>&1
timeout /t 2 >nul

REM Запускаем API сервер
echo 🚀 Шаг 2: Запускаем API сервер заново...
cd /d "%~dp0"
start "GS Bot API Server" cmd /k "cd /d %CD% && python api_server.py"

echo.
echo ✅ API сервер успешно перезапущен!
echo 🌐 Доступен по адресу: http://localhost:5000
echo.
echo 💡 Нажмите любую клавишу для возврата в меню...
pause >nul
goto api_menu

:check_api_status
echo.
echo 📊 СТАТУС API СЕРВЕРА...
echo.

REM Проверяем процесс API сервера
echo 🔍 Поиск процесса API сервера...
tasklist /fi "imagename eq python.exe" /fi "windowtitle eq GS Bot API Server*" 2>nul

echo.
echo 🌐 Проверка доступности API сервера...
curl -s -o nul -w "HTTP Status: %%{http_code}\n" http://localhost:5000 >nul 2>&1
if %errorlevel%==0 (
    echo ✅ API сервер отвечает на http://localhost:5000
) else (
    echo ❌ API сервер не доступен на http://localhost:5000
)

echo.
echo 💡 Нажмите любую клавишу для возврата в меню...
pause >nul
goto api_menu

:web_menu
echo.
echo ===========================================
echo        УПРАВЛЕНИЕ ВЕБ СЕРВЕРОМ
echo ===========================================
echo.
echo Веб Сервер: http://localhost:8000
echo.
echo [1] Запустить веб сервер
echo [2] Остановить веб сервер
echo [3] Перезапустить веб сервер
echo [4] Проверить статус веб сервера
echo [5] Назад в главное меню
echo.

set /p web_choice="Выберите действие (1-5): "

if "%web_choice%"=="1" goto start_web
if "%web_choice%"=="2" goto stop_web
if "%web_choice%"=="3" goto restart_web
if "%web_choice%"=="4" goto check_web_status
if "%web_choice%"=="5" goto menu

echo ❌ Неверный выбор. Попробуйте еще раз.
timeout /t 2 >nul
goto web_menu

:start_web
echo.
echo 🚀 ЗАПУСК ВЕБ СЕРВЕРА...
echo.

cd /d "%~dp0"

REM Проверяем, не запущен ли уже
tasklist /fi "imagename eq python.exe" /fi "windowtitle eq GS Bot Web Server*" 2>nul | find /i "python.exe" >nul
if %errorlevel%==0 (
    echo ⚠️  Веб сервер уже запущен!
    goto web_menu
)

echo ⚡ Запускаем веб сервер...
start "GS Bot Web Server" cmd /k "cd /d %CD% && python server.py"

echo.
echo ✅ Веб сервер запущен!
echo 🌐 Доступен по адресу: http://localhost:8000
echo 📄 Откройте: http://localhost:8000/index.html
echo.
echo 💡 Нажмите любую клавишу для возврата в меню...
pause >nul
goto web_menu

:stop_web
echo.
echo 🛑 ОСТАНОВКА ВЕБ СЕРВЕРА...
echo.

REM Останавливаем только веб сервер
taskkill /f /fi "windowtitle eq GS Bot Web Server*" >nul 2>&1

if %errorlevel%==0 (
    echo ✅ Веб сервер успешно остановлен!
) else (
    echo ⚠️  Веб сервер не найден или уже остановлен.
)

timeout /t 2 >nul
echo.
echo 💡 Нажмите любую клавишу для возврата в меню...
pause >nul
goto web_menu

:restart_web
echo.
echo 🔄 ПЕРЕЗАПУСК ВЕБ СЕРВЕРА...
echo.

REM Останавливаем веб сервер
echo 🛑 Шаг 1: Останавливаем веб сервер...
taskkill /f /fi "windowtitle eq GS Bot Web Server*" >nul 2>&1
timeout /t 2 >nul

REM Запускаем веб сервер
echo 🚀 Шаг 2: Запускаем веб сервер заново...
cd /d "%~dp0"
start "GS Bot Web Server" cmd /k "cd /d %CD% && python server.py"

echo.
echo ✅ Веб сервер успешно перезапущен!
echo 🌐 Доступен по адресу: http://localhost:8000
echo 📄 Откройте: http://localhost:8000/index.html
echo.
echo 💡 Нажмите любую клавишу для возврата в меню...
pause >nul
goto web_menu

:check_web_status
echo.
echo 📊 СТАТУС ВЕБ СЕРВЕРА...
echo.

REM Проверяем процесс веб сервера
echo 🔍 Поиск процесса веб сервера...
tasklist /fi "imagename eq python.exe" /fi "windowtitle eq GS Bot Web Server*" 2>nul

echo.
echo 🌐 Проверка доступности веб сервера...
curl -s -o nul -w "HTTP Status: %%{http_code}\n" http://localhost:8000 >nul 2>&1
if %errorlevel%==0 (
    echo ✅ Веб сервер отвечает на http://localhost:8000
) else (
    echo ❌ Веб сервер не доступен на http://localhost:8000
)

echo.
echo 💡 Нажмите любую клавишу для возврата в меню...
pause >nul
goto web_menu

:nodejs_menu
echo.
echo ===========================================
echo      УПРАВЛЕНИЕ NODE.JS СЕРВЕРОМ
echo ===========================================
echo.
echo Node.js Сервер: http://localhost:8000
echo (с автоматическим скрапингом)
echo.
echo [1] Запустить Node.js сервер
echo [2] Остановить Node.js сервер
echo [3] Перезапустить Node.js сервер
echo [4] Проверить статус Node.js сервера
echo [5] Назад в главное меню
echo.

set /p nodejs_choice="Выберите действие (1-5): "

if "%nodejs_choice%"=="1" goto start_nodejs_server
if "%nodejs_choice%"=="2" goto stop_nodejs_server
if "%nodejs_choice%"=="3" goto restart_nodejs_server
if "%nodejs_choice%"=="4" goto check_nodejs_status
if "%nodejs_choice%"=="5" goto menu

echo ❌ Неверный выбор. Попробуйте еще раз.
timeout /t 2 >nul
goto nodejs_menu

:start_nodejs_server
echo.
echo 🚀 ЗАПУСК NODE.JS СЕРВЕРА...
echo.

cd /d "%~dp0"

REM Проверяем наличие Node.js
node --version >nul 2>&1
if %errorlevel% neq 0 (
    echo ❌ Node.js не установлен!
    echo 📥 Скачайте и установите Node.js с https://nodejs.org
    echo.
    echo 💡 Нажмите любую клавишу для возврата в меню...
    pause >nul
    goto nodejs_menu
)

REM Проверяем, не запущен ли уже
tasklist /fi "imagename eq node.exe" /fi "windowtitle eq GS Bot Node.js Server*" 2>nul | find /i "node.exe" >nul
if %errorlevel%==0 (
    echo ⚠️  Node.js сервер уже запущен!
    goto nodejs_menu
)

echo ⚡ Запускаем Node.js сервер с автоматическим скрапингом...
start "GS Bot Node.js Server" cmd /k "cd /d %CD% && node server.js"

echo.
echo ✅ Node.js сервер запущен!
echo 🌐 Сервер: http://localhost:8000
echo 🔄 Автоматический скрапинг запущен...
echo.
echo 💡 Нажмите любую клавишу для возврата в меню...
pause >nul
goto nodejs_menu

:stop_nodejs_server
echo.
echo 🛑 ОСТАНОВКА NODE.JS СЕРВЕРА...
echo.

REM Останавливаем только Node.js сервер
taskkill /f /fi "windowtitle eq GS Bot Node.js Server*" >nul 2>&1

if %errorlevel%==0 (
    echo ✅ Node.js сервер успешно остановлен!
) else (
    echo ⚠️  Node.js сервер не найден или уже остановлен.
)

timeout /t 2 >nul
echo.
echo 💡 Нажмите любую клавишу для возврата в меню...
pause >nul
goto nodejs_menu

:restart_nodejs_server
echo.
echo 🔄 ПЕРЕЗАПУСК NODE.JS СЕРВЕРА...
echo.

REM Останавливаем Node.js сервер
echo 🛑 Шаг 1: Останавливаем Node.js сервер...
taskkill /f /fi "windowtitle eq GS Bot Node.js Server*" >nul 2>&1
timeout /t 2 >nul

REM Запускаем Node.js сервер
echo 🚀 Шаг 2: Запускаем Node.js сервер заново...
cd /d "%~dp0"

REM Проверяем наличие Node.js
node --version >nul 2>&1
if %errorlevel% neq 0 (
    echo ❌ Node.js не установлен!
    goto nodejs_menu
)

start "GS Bot Node.js Server" cmd /k "cd /d %CD% && node server.js"

echo.
echo ✅ Node.js сервер успешно перезапущен!
echo 🌐 Сервер: http://localhost:8000
echo 🔄 Автоматический скрапинг запущен...
echo.
echo 💡 Нажмите любую клавишу для возврата в меню...
pause >nul
goto nodejs_menu

:check_nodejs_status
echo.
echo 📊 СТАТУС NODE.JS СЕРВЕРА...
echo.

REM Проверяем процесс Node.js сервера
echo 🔍 Поиск процесса Node.js сервера...
tasklist /fi "imagename eq node.exe" /fi "windowtitle eq GS Bot Node.js Server*" 2>nul

echo.
echo 🌐 Проверка доступности Node.js сервера...
curl -s -o nul -w "HTTP Status: %%{http_code}\n" http://localhost:8000 >nul 2>&1
if %errorlevel%==0 (
    echo ✅ Node.js сервер отвечает на http://localhost:8000
) else (
    echo ❌ Node.js сервер не доступен на http://localhost:8000
)

echo.
echo 💡 Нажмите любую клавишу для возврата в меню...
pause >nul
goto nodejs_menu

:exit
echo.
echo 👋 До свидания!
echo.
exit /b 0
