@echo off
chcp 65001 >nul
cls
echo ===========================================
echo    ПРОСТОЕ ВОССТАНОВЛЕНИЕ САЙТА
echo ===========================================
echo.

echo Текущая папка: %CD%
cd /d E:\Python_Projects\gs_bot_new_shop
echo Перешли в: %CD%
echo.

echo [1] Проверить файлы в проекте
echo [2] Запустить сервер
echo [3] Открыть сайт в браузере
echo [4] Восстановить из backup_current
echo [5] Показать последние коммиты
echo.

set /p choice="Выберите вариант (1-5): "

if "%choice%"=="1" goto check_files
if "%choice%"=="2" goto start_server
if "%choice%"=="3" goto open_browser
if "%choice%"=="4" goto restore_backup
if "%choice%"=="5" goto show_commits

echo Неверный выбор. Попробуйте еще раз.
pause
exit /b

:check_files
echo.
echo === ПРОВЕРКА ФАЙЛОВ ===
dir *.html *.js *.json *.css /b
echo.
pause
goto menu

:start_server
echo.
echo === ЗАПУСК СЕРВЕРА ===
echo Останавливаем старые процессы...
taskkill /f /im python.exe >nul 2>&1
timeout /t 2 >nul

echo Запускаем сервер...
start "Server" cmd /k "cd /d %CD% && python server.py"
echo.
echo Сервер запущен! Откройте: http://localhost:8000
echo.
pause
goto menu

:open_browser
echo.
echo === ОТКРЫТИЕ В БРАУЗЕРЕ ===
start http://localhost:8000/index.html
echo Открыто в браузере
echo.
pause
goto menu

:restore_backup
echo.
echo === ВОССТАНОВЛЕНИЕ ИЗ BACKUP ===
if exist backup_current (
    echo Найден backup_current. Восстанавливаем...
    copy backup_current\*.* .\
    echo Восстановлено!
) else (
    echo Backup_current не найден
)
echo.
pause
goto menu

:show_commits
echo.
echo === ПОСЛЕДНИЕ КОММИТЫ ===
git log --oneline -10
echo.
echo Для восстановления из коммита используйте:
echo git checkout COMMIT_HASH
echo.
pause
goto menu

:menu
cls
echo ===========================================
echo    ПРОСТОЕ ВОССТАНОВЛЕНИЕ САЙТА
echo ===========================================
echo.
echo [1] Проверить файлы в проекте
echo [2] Запустить сервер
echo [3] Открыть сайт в браузере
echo [4] Восстановить из backup_current
echo [5] Показать последние коммиты
echo [6] Выход
echo.

set /p choice="Выберите вариант (1-6): "

if "%choice%"=="1" goto check_files
if "%choice%"=="2" goto start_server
if "%choice%"=="3" goto open_browser
if "%choice%"=="4" goto restore_backup
if "%choice%"=="5" goto show_commits
if "%choice%"=="6" goto exit

echo Неверный выбор.
pause
goto menu

:exit
echo До свидания!
pause
exit /b
