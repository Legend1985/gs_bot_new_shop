@echo off
chcp 65001 >nul
title 🚨 Очистка Git от токенов

echo.
echo 🔒 Начинаем очистку Git от токенов...
echo.

REM Проверяем, что мы в Git репозитории
if not exist ".git" (
    echo ❌ Ошибка: Это не Git репозиторий!
    echo Запустите скрипт в папке с проектом Git
    pause
    exit /b 1
)

echo 📊 Текущий статус Git:
git status
echo.

echo 🗑️ Удаляем файлы с токенами из Git...
echo.

echo 🔴 Удаляем debug_support.html из Git...
git rm --cached debug_support.html

echo 🔴 Удаляем test_support.html из Git...
git rm --cached test_support.html

echo 🔴 Удаляем debug.html из Git...
git rm --cached debug.html

echo 🔴 Удаляем test_api.html из Git...
git rm --cached test_api.html

echo 🔴 Удаляем test.html из Git...
git rm --cached test.html

echo 🔴 Удаляем test_final.html из Git...
git rm --cached test_final.html

echo 🔴 Удаляем env_local.txt из Git...
git rm --cached env_local.txt

echo 🔴 Удаляем env_example.txt из Git...
git rm --cached env_example.txt

echo 🔴 Удаляем .env из Git (если существует)...
git rm --cached .env 2>nul

echo.
echo 📝 Создаем коммит удаления...
git commit -m "🚨 SECURITY: Remove files with exposed tokens

- debug_support.html (содержал токен бота)
- env_local.txt (содержал токены)
- .env (переменные окружения)

Эти файлы НЕ должны попадать в Git!"

echo.
echo 📤 Отправляем изменения в удаленный репозиторий...
echo ⚠️ ВНИМАНИЕ: Используется --force-with-lease для безопасности
git push --force-with-lease

echo.
echo ✅ Очистка Git завершена!
echo.
echo 🔍 Проверьте результат:
echo   git status
echo   git log --oneline -5
echo.

echo 📊 Финальный статус Git:
git status

echo.
echo 🎯 Файлы с токенами успешно удалены из Git!
echo Теперь они остались только локально и не попадут в репозиторий
echo.

pause 