@echo off
chcp 65001 >nul
echo.
echo 🔧 GS Bot New Shop - Запуск с конфигурацией
echo ================================================
echo.

REM Проверяем наличие config.js
if not exist "config.js" (
    echo ❌ Файл config.js не найден!
    echo    Убедитесь, что вы находитесь в правильной папке
    pause
    exit /b 1
)

REM Показываем текущую конфигурацию
echo 📋 Текущая конфигурация:
findstr /C:"const ENVIRONMENT" config.js
echo.

REM Проверяем наличие Node.js
where node >nul 2>nul
if %errorlevel% neq 0 (
    echo ❌ Node.js не найден! Устанавливаем зависимости через Python...
    echo.
    goto :python_server
)

REM Проверяем наличие зависимостей
if not exist "node_modules" (
    echo 📦 Устанавливаем зависимости...
    npm install
    if %errorlevel% neq 0 (
        echo ❌ Ошибка установки зависимостей
        goto :python_server
    )
)

REM Запускаем Node.js сервер
echo 🚀 Запускаем Node.js сервер...
echo.
node server.js
goto :end

:python_server
echo 🐍 Запускаем Python сервер...
echo.
python server.py

:end
echo.
echo 👋 Сервер остановлен
pause
