@echo off
chcp 65001 >nul
setlocal enabledelayedexpansion

:: ===================================================================
:: SERVICE MANAGER для api_server.py
:: Версия: 1.1
:: Использование: service_manager.bat [start|stop|restart|status]
:: ===================================================================

set "SCRIPT_NAME=api_server.py"
set "SERVICE_NAME=GS_API_Server"
set "PYTHON_CMD=python"
set "LOG_FILE=api_server.log"
set "PID_FILE=api_server.pid"

:: Цвета для вывода
set "COLOR_GREEN=0A"
set "COLOR_RED=0C"
set "COLOR_YELLOW=0E"
set "COLOR_WHITE=0F"

:: Проверка наличия Python
where python >nul 2>&1
if !errorlevel! neq 0 (
    echo [ERROR] Python не найден в PATH
    echo Убедитесь что Python установлен и добавлен в PATH
    pause
    exit /b 1
)

:: Проверка наличия файла сервера
if not exist "%SCRIPT_NAME%" (
    echo [ERROR] Файл %SCRIPT_NAME% не найден в текущей директории
    echo Текущая директория: %CD%
    pause
    exit /b 1
)

:: Определение команды
set "COMMAND=%~1"
if "%COMMAND%"=="" set "COMMAND=help"

:: Переход к обработке команды
if /i "%COMMAND%"=="start" goto :start_service
if /i "%COMMAND%"=="stop" goto :stop_service
if /i "%COMMAND%"=="restart" goto :restart_service
if /i "%COMMAND%"=="status" goto :status_service
if /i "%COMMAND%"=="help" goto :show_help
goto :show_help

:: ===================================================================
:: ФУНКЦИЯ: Запуск сервиса
:: ===================================================================
:start_service
echo.
color %COLOR_YELLOW%
echo ╔══════════════════════════════════════════════════════════════════╗
echo ║                    ЗАПУСК API СЕРВЕРА                           ║
echo ╚══════════════════════════════════════════════════════════════════╝
color %COLOR_WHITE%

:: Проверка что сервис не запущен
call :check_service_running
if !service_running! equ 1 (
    color %COLOR_YELLOW%
    echo [WARNING] Сервис уже запущен на PID: !service_pid!
    echo Используйте 'service_manager.bat restart' для перезапуска
    color %COLOR_WHITE%
    pause
    exit /b 0
)

echo [INFO] Проверка зависимостей...
:: Проверка requirements.txt и установка зависимостей если нужно
if exist "requirements.txt" (
    echo [INFO] Найден requirements.txt, проверяем зависимости...
    python -c "import flask, requests, bs4" >nul 2>&1
    if !errorlevel! neq 0 (
        echo [INFO] Устанавливаем зависимости...
        pip install -r requirements.txt
        if !errorlevel! neq 0 (
            color %COLOR_RED%
            echo [ERROR] Ошибка установки зависимостей
            color %COLOR_WHITE%
            pause
            exit /b 1
        )
    )
)

echo [INFO] Запускаем %SERVICE_NAME%...
echo [INFO] Файл: %SCRIPT_NAME%
echo [INFO] Логи: %LOG_FILE%
echo [INFO] PID файл: %PID_FILE%
echo [INFO] Время запуска: %DATE% %TIME%
echo.

:: Создание лог файла с заголовком
echo ===================================================================== > "%LOG_FILE%"
echo %SERVICE_NAME% - Лог запуска >> "%LOG_FILE%"
echo Время запуска: %DATE% %TIME% >> "%LOG_FILE%"
echo ===================================================================== >> "%LOG_FILE%"
echo. >> "%LOG_FILE%"

color %COLOR_GREEN%
echo [SUCCESS] Сервис запускается в foreground режиме...
echo [INFO] Для остановки используйте Ctrl+C или service_manager.bat stop
echo [INFO] Логи сохраняются в %LOG_FILE%
echo.
color %COLOR_WHITE%

:: Запуск в foreground с логированием
title %SERVICE_NAME% - Running

:: Запуск Python сервера
echo [INFO] Запуск Python сервера...
echo [INFO] Логи будут дублироваться в %LOG_FILE%
echo.

:: Запускаем сервер в foreground режиме
python "%SCRIPT_NAME%"

:: Если мы дошли сюда, значит сервис завершился
echo.
echo [INFO] Сервис завершен: %DATE% %TIME%
if exist "%PID_FILE%" del "%PID_FILE%" >nul 2>&1
pause
exit /b 0

:: ===================================================================
:: ФУНКЦИЯ: Остановка сервиса
:: ===================================================================
:stop_service
echo.
color %COLOR_YELLOW%
echo ╔══════════════════════════════════════════════════════════════════╗
echo ║                   ОСТАНОВКА API СЕРВЕРА                          ║
echo ╚══════════════════════════════════════════════════════════════════╝
color %COLOR_WHITE%

call :check_service_running
if !service_running! equ 0 (
    echo [INFO] Сервис не запущен
    pause
    exit /b 0
)

echo [INFO] Найден запущенный сервис с PID: !service_pid!
echo [INFO] Останавливаем сервис...

:: Попытка мягкой остановки через taskkill
taskkill /PID !service_pid! >nul 2>&1
timeout /t 3 >nul

:: Проверяем что процесс завершился
tasklist /FI "PID eq !service_pid!" | find "!service_pid!" >nul 2>&1
if !errorlevel! equ 0 (
    echo [WARNING] Мягкая остановка не удалась, принудительное завершение...
    taskkill /F /PID !service_pid! >nul 2>&1
    timeout /t 2 >nul
)

:: Очистка PID файла
if exist "%PID_FILE%" del "%PID_FILE%" >nul 2>&1

:: Финальная проверка
call :check_service_running
if !service_running! equ 0 (
    color %COLOR_GREEN%
    echo [SUCCESS] Сервис успешно остановлен
    color %COLOR_WHITE%
) else (
    color %COLOR_RED%
    echo [ERROR] Не удалось остановить сервис
    color %COLOR_WHITE%
)

pause
exit /b 0

:: ===================================================================
:: ФУНКЦИЯ: Перезапуск сервиса
:: ===================================================================
:restart_service
echo.
color %COLOR_YELLOW%
echo ╔══════════════════════════════════════════════════════════════════╗
echo ║                  ПЕРЕЗАПУСК API СЕРВЕРА                         ║
echo ╚══════════════════════════════════════════════════════════════════╝
color %COLOR_WHITE%

echo [INFO] Выполняем перезапуск сервиса...
call :stop_service
timeout /t 2 >nul
call :start_service
exit /b 0

:: ===================================================================
:: ФУНКЦИЯ: Статус сервиса
:: ===================================================================
:status_service
echo.
color %COLOR_YELLOW%
echo ╔══════════════════════════════════════════════════════════════════╗
echo ║                    СТАТУС API СЕРВЕРА                           ║
echo ╚══════════════════════════════════════════════════════════════════╝
color %COLOR_WHITE%

call :check_service_running

echo [INFO] Сервис: %SERVICE_NAME%
echo [INFO] Файл: %SCRIPT_NAME%
echo [INFO] Директория: %CD%

if !service_running! equ 1 (
    color %COLOR_GREEN%
    echo [STATUS] ЗАПУЩЕН
    color %COLOR_WHITE%
    echo [INFO] PID: !service_pid!
    echo [INFO] Порт: 8000 (по умолчанию)
    
    :: Проверка доступности порта
    netstat -an | find ":8000" | find "LISTENING" >nul 2>&1
    if !errorlevel! equ 0 (
        echo [INFO] Порт 8000: СЛУШАЕТ
        echo [INFO] URL: http://localhost:8000
    ) else (
        echo [WARNING] Порт 8000: НЕ СЛУШАЕТ
    )
    
    :: Информация о логах
    if exist "%LOG_FILE%" (
        echo [INFO] Лог файл: %LOG_FILE% ^(размер: !log_size! байт^)
    )
) else (
    color %COLOR_RED%
    echo [STATUS] ОСТАНОВЛЕН
    color %COLOR_WHITE%
)

echo [INFO] Время проверки: %DATE% %TIME%
pause
exit /b 0

:: ===================================================================
:: ФУНКЦИЯ: Проверка запущен ли сервис
:: ===================================================================
:check_service_running
set "service_running=0"
set "service_pid="

:: Поиск процесса Python с нашим скриптом
for /f "tokens=2" %%i in ('tasklist /FI "IMAGENAME eq python.exe" /FO CSV ^| find "python.exe"') do (
    set "pid=%%~i"
    wmic process where "ProcessId=!pid!" get CommandLine /format:value 2>nul | find "%SCRIPT_NAME%" >nul 2>&1
    if !errorlevel! equ 0 (
        set "service_running=1"
        set "service_pid=!pid!"
        goto :check_done
    )
)

:check_done
:: Получение размера лог файла
set "log_size=0"
if exist "%LOG_FILE%" (
    for %%i in ("%LOG_FILE%") do set "log_size=%%~zi"
)
exit /b 0

:: ===================================================================
:: ФУНКЦИЯ: Помощь
:: ===================================================================
:show_help
color %COLOR_YELLOW%
echo.
echo ╔══════════════════════════════════════════════════════════════════╗
echo ║                SERVICE MANAGER для API_SERVER.PY                ║
echo ╚══════════════════════════════════════════════════════════════════╝
color %COLOR_WHITE%
echo.
echo ИСПОЛЬЗОВАНИЕ:
echo   service_manager.bat [команда]
echo.
echo КОМАНДЫ:
echo   start    - Запустить сервис в foreground режиме
echo   stop     - Остановить сервис
echo   restart  - Перезапустить сервис (stop + start)
echo   status   - Показать статус сервиса
echo   help     - Показать эту справку
echo.
echo ПРИМЕРЫ:
echo   service_manager.bat start     ^# Запуск сервера
echo   service_manager.bat stop      ^# Остановка сервера
echo   service_manager.bat restart   ^# Перезапуск сервера
echo   service_manager.bat status    ^# Проверка статуса
echo.
echo ФАЙЛЫ:
echo   %SCRIPT_NAME%     - Основной файл сервера
echo   %LOG_FILE%        - Файл логов
echo   %PID_FILE%        - Файл с PID процесса
echo.
echo ПОРТ: 8000 (по умолчанию)
echo URL:  http://localhost:8000
echo.
if "%~1"=="" pause
exit /b 0

:: ===================================================================
:: КОНЕЦ СКРИПТА
:: ===================================================================
