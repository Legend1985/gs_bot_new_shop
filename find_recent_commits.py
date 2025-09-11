#!/usr/bin/env python3
# -*- coding: utf-8 -*-

import subprocess
import re
from datetime import datetime, timedelta

def get_recent_commits():
    """Получить последние коммиты из Git"""

    try:
        # Получить последние 20 коммитов с датами
        result = subprocess.run(
            ['git', 'log', '--oneline', '--since="2 days ago"', '-20'],
            capture_output=True,
            text=True,
            encoding='utf-8'
        )

        if result.returncode == 0:
            print("=== ПОСЛЕДНИЕ КОММИТЫ ЗА 2 ДНЯ ===")
            print(result.stdout)
        else:
            print("Ошибка при получении коммитов:", result.stderr)

        # Также попробуем получить коммиты за последний день
        result_today = subprocess.run(
            ['git', 'log', '--oneline', '--since="1 day ago"'],
            capture_output=True,
            text=True,
            encoding='utf-8'
        )

        if result_today.returncode == 0 and result_today.stdout.strip():
            print("\n=== КОММИТЫ ЗА ПОСЛЕДНИЙ ДЕНЬ ===")
            print(result_today.stdout)
        else:
            print("\nЗа последний день коммитов не найдено")

        # Попробуем получить коммиты за последние 12 часов
        result_12h = subprocess.run(
            ['git', 'log', '--oneline', '--since="12 hours ago"'],
            capture_output=True,
            text=True,
            encoding='utf-8'
        )

        if result_12h.returncode == 0 and result_12h.stdout.strip():
            print("\n=== КОММИТЫ ЗА ПОСЛЕДНИЕ 12 ЧАСОВ ===")
            print(result_12h.stdout)
        else:
            print("\nЗа последние 12 часов коммитов не найдено")

    except Exception as e:
        print(f"Ошибка: {e}")
        print("Возможно, Git не установлен или репозиторий не инициализирован")

def get_commit_details(commit_hash):
    """Получить детали коммита"""

    try:
        result = subprocess.run(
            ['git', 'show', '--stat', commit_hash],
            capture_output=True,
            text=True,
            encoding='utf-8'
        )

        if result.returncode == 0:
            print(f"\n=== ДЕТАЛИ КОММИТА {commit_hash} ===")
            print(result.stdout)
        else:
            print(f"Ошибка при получении деталей коммита: {result.stderr}")

    except Exception as e:
        print(f"Ошибка: {e}")

if __name__ == '__main__':
    get_recent_commits()

    # Предложим пользователю ввести хэш коммита для просмотра деталей
    commit_hash = input("\nВведите хэш коммита для просмотра деталей (или нажмите Enter для пропуска): ").strip()
    if commit_hash:
        get_commit_details(commit_hash)
