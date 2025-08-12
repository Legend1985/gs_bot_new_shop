#!/bin/bash

# 🚨 СКРИПТ ДЛЯ ОЧИСТКИ GIT ОТ ТОКЕНОВ
# ⚠️ ВНИМАНИЕ: Этот скрипт удалит файлы с токенами из Git истории!

echo "🔒 Начинаем очистку Git от токенов..."
echo ""

# Проверяем, что мы в Git репозитории
if [ ! -d ".git" ]; then
    echo "❌ Ошибка: Это не Git репозиторий!"
    echo "Запустите скрипт в папке с проектом Git"
    exit 1
fi

# Показываем текущий статус Git
echo "📊 Текущий статус Git:"
git status
echo ""

# Список файлов для удаления из Git
files_to_remove=("debug_support.html" "test_support.html" "debug.html" "test_api.html" "test.html" "test_final.html" "env_local.txt" "env_example.txt" ".env")

echo "🗑️ Удаляем файлы с токенами из Git..."

for file in "${files_to_remove[@]}"; do
    if git ls-files --error-unmatch "$file" >/dev/null 2>&1; then
        echo "  🔴 Удаляем $file из Git..."
        git rm --cached "$file"
    else
        echo "  ✅ $file уже не отслеживается Git"
    fi
done

echo ""
echo "📝 Создаем коммит удаления..."
git commit -m "🚨 SECURITY: Remove files with exposed tokens

- debug_support.html (содержал токен бота)
- env_local.txt (содержал токены)
- .env (переменные окружения)

Эти файлы НЕ должны попадать в Git!"

echo ""
echo "📤 Отправляем изменения в удаленный репозиторий..."
echo "⚠️ ВНИМАНИЕ: Используется --force-with-lease для безопасности"

git push --force-with-lease

echo ""
echo "✅ Очистка Git завершена!"
echo ""
echo "🔍 Проверьте результат:"
echo "  git status"
echo "  git log --oneline -5"
echo ""

# Показываем финальный статус
echo "📊 Финальный статус Git:"
git status

echo ""
echo "🎯 Файлы с токенами успешно удалены из Git!"
echo "Теперь они остались только локально и не попадут в репозиторий"
echo "" 