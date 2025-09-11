@echo off
chcp 65001 >nul
cls
echo ===========================================
echo       БЕКАП ВЕРСИИ 1.0
echo   (После восстановления af599fc)
echo ===========================================
echo.

echo Создаем backup_v1...
if not exist backup_v1 mkdir backup_v1

echo Копируем файлы...
copy index.html backup_v1\ >nul 2>&1
copy app.js backup_v1\ >nul 2>&1
copy style.css backup_v1\ >nul 2>&1
copy static_products_clean.json backup_v1\ >nul 2>&1

echo [+] БЕКАП ВЕРСИИ 1.0 СОЗДАН!
echo.
echo Файлы сохранены в папке: backup_v1\
echo.
echo Для восстановления выполните:
echo copy backup_v1\*.* .\
echo.
pause
