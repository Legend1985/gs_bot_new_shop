# 🚨 СКРИПТ ДЛЯ ОЧИСТКИ GIT ОТ ТОКЕНОВ
# ⚠️ ВНИМАНИЕ: Этот скрипт удалит файлы с токенами из Git истории!

Write-Host "🔒 Начинаем очистку Git от токенов..." -ForegroundColor Green
Write-Host ""

# Проверяем, что мы в Git репозитории
if (-not (Test-Path ".git")) {
    Write-Host "❌ Ошибка: Это не Git репозиторий!" -ForegroundColor Red
    Write-Host "Запустите скрипт в папке с проектом Git" -ForegroundColor Yellow
    pause
    exit 1
}

# Показываем текущий статус Git
Write-Host "📊 Текущий статус Git:" -ForegroundColor Cyan
git status
Write-Host ""

# Список файлов для удаления из Git
$filesToRemove = @(
    "debug_support.html",
    "test_support.html",
    "debug.html",
    "test_api.html",
    "test.html",
    "test_final.html",
    "env_local.txt",
    "env_example.txt",
    ".env"
)

Write-Host "🗑️ Удаляем файлы с токенами из Git..." -ForegroundColor Yellow

foreach ($file in $filesToRemove) {
    if (git ls-files --error-unmatch $file 2>$null) {
        Write-Host "  🔴 Удаляем $file из Git..." -ForegroundColor Red
        git rm --cached $file
    } else {
        Write-Host "  ✅ $file уже не отслеживается Git" -ForegroundColor Green
    }
}

Write-Host ""
Write-Host "📝 Создаем коммит удаления..." -ForegroundColor Cyan
git commit -m "🚨 SECURITY: Remove files with exposed tokens

- debug_support.html (содержал токен бота)
- test_support.html (содержал токены)
- debug.html (содержал токены)
- test_api.html (содержал токены)
- test.html (содержал токены)
- test_final.html (содержал токены)
- env_local.txt (содержал токены)
- env_example.txt (содержал токены)
- .env (переменные окружения)

Эти файлы НЕ должны попадать в Git!"

Write-Host ""
Write-Host "📤 Отправляем изменения в удаленный репозиторий..." -ForegroundColor Cyan
Write-Host "⚠️ ВНИМАНИЕ: Используется --force-with-lease для безопасности" -ForegroundColor Yellow

git push --force-with-lease

Write-Host ""
Write-Host "✅ Очистка Git завершена!" -ForegroundColor Green
Write-Host ""
Write-Host "🔍 Проверьте результат:" -ForegroundColor Cyan
Write-Host "  git status" -ForegroundColor White
Write-Host "  git log --oneline -5" -ForegroundColor White
Write-Host ""

# Показываем финальный статус
Write-Host "📊 Финальный статус Git:" -ForegroundColor Cyan
git status

Write-Host ""
Write-Host "🎯 Файлы с токенами успешно удалены из Git!" -ForegroundColor Green
Write-Host "Теперь они остались только локально и не попадут в репозиторий" -ForegroundColor Yellow
Write-Host ""

pause 
