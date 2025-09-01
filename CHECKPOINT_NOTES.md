# Checkpoint

Этот чекпойнт зафиксирован для проекта `gs_bot_new_shop` и предназначен для быстрого отката к текущему рабочему состоянию.

Что сохранено:
- Все файлы проекта на момент создания чекпойнта
- Локальный git-коммит с тегом формата `checkpoint-YYYYMMDD-HHMMSS`

Как откатиться к чекпойнту:
1. Посмотреть доступные теги:
   - `git tag --list "checkpoint-*"`
2. Переключиться на нужный тег (пример):
   - `git checkout tags/checkpoint-YYYYMMDD-HHMMSS -f`
3. Вернуться обратно на актуальную ветку (если нужно):
   - `git switch -`

Примечания:
- Тег создается для удобства «точки во времени». Коммит остается в истории даже без тега.
- Если нужно создать новый чекпойнт позже — повторите создание коммита и тега по тому же принципу.



## Запуск/остановка сервера (PowerShell, Windows)

- **Запуск в форграунде**:
```powershell
Set-Location E:\Python_Projects\gs_bot_new_shop
python -u api_server.py
```

- **Альтернативно (через py)**:
```powershell
py -3 -u api_server.py
```

- **Открыть в браузере**: http://127.0.0.1:8000

- **Остановить все запущенные экземпляры api_server.py**:
```powershell
$ErrorActionPreference='SilentlyContinue'; Get-CimInstance Win32_Process |
  Where-Object { $_.Name -like 'python*.exe' -and $_.CommandLine -match 'api_server.py' } |
  ForEach-Object { Stop-Process -Id $_.ProcessId -Force }
```

- **Запуск в фоне с логами**:
```powershell
Start-Process -FilePath python -ArgumentList '-u','api_server.py' -NoNewWindow `
  -RedirectStandardOutput 'server.out.log' -RedirectStandardError 'server.err.log'
```

- **Просмотр логов**:
```powershell
Get-Content -Wait server.out.log
```

- **Отключить автоперезапуск Flask (убрать дубли в логах)**:
```powershell
$env:FLASK_DEBUG="0"; python -u api_server.py
```

## Автозапуск сервера при открытии проекта (VS Code/Cursor)

- **Файлы конфигурации**:
  - `.vscode/tasks.json` — содержит задачу "Run API Server" с `runOn: "folderOpen"` (автозапуск при открытии папки).
  - `.vscode/settings.json` — включает автозадачи: `"task.allowAutomaticTasks": "on"`.

- **Ручной запуск через палитру команд**:
  - Ctrl+Shift+P → `Tasks: Run Task` → выберите "Run API Server".

- **Разрешить автоматические задачи** (если VS Code спросит):
  - Ctrl+Shift+P → `Tasks: Manage Automatic Tasks in Folder` → выберите `Allow`.

- **Остановить сервер**:
  - Ctrl+Shift+P → `Tasks: Terminate Task` (или задача "Stop API Server").

- **Где логи**:
  - `server.out.log` — стандартный вывод
  - `server.err.log` — ошибки


## Устойчивый автозапуск (Windows)

### 1) Планировщик задач (рекомендуется)

- Создать задачу и запускать при входе:
```powershell
$taskName = 'gs_bot_new_shop_server'
$ps = "$env:WINDIR\System32\WindowsPowerShell\v1.0\powershell.exe"
$script = 'E:\Python_Projects\gs_bot_new_shop\scripts\run_server.ps1'
schtasks /Create /TN $taskName /TR "`"$ps`" -NoProfile -ExecutionPolicy Bypass -File `"$script`"" /SC ONLOGON /RL HIGHEST /F
```

- Запустить задачу сейчас:
```powershell
schtasks /Run /TN gs_bot_new_shop_server
```

- Удалить задачу:
```powershell
schtasks /Delete /TN gs_bot_new_shop_server /F
```

### 2) Папка Автозагрузка пользователя (альтернатива)

- Создать CMD‑ярлык, запускающий supervisor скрыто:
```powershell
$startup = Join-Path $env:APPDATA 'Microsoft\Windows\Start Menu\Programs\Startup\gs_bot_server.cmd'
$content = '@echo off`r`nstart "" powershell -NoProfile -ExecutionPolicy Bypass -WindowStyle Hidden -File "E:\\Python_Projects\\gs_bot_new_shop\\scripts\\run_server.ps1"'
Set-Content -Path $startup -Value $content -Encoding ASCII
```

- Удалить ярлык:
```powershell
Remove-Item "$env:APPDATA\Microsoft\Windows\Start Menu\Programs\Startup\gs_bot_server.cmd" -Force
```

### 3) Реестр HKCU\Run (альтернатива)

- Добавить автозапуск:
```powershell
reg add "HKCU\Software\Microsoft\Windows\CurrentVersion\Run" /v GsBotServer /t REG_SZ /d "powershell -NoProfile -ExecutionPolicy Bypass -File \"E:\Python_Projects\gs_bot_new_shop\scripts\run_server.ps1\"" /f
```

- Удалить запись:
```powershell
reg delete "HKCU\Software\Microsoft\Windows\CurrentVersion\Run" /v GsBotServer /f
```

### Проверка доступности API

- Через curl.exe (важно: именно .exe, не PowerShell‑alias):
```powershell
curl.exe -s 'http://127.0.0.1:8000/api/products?start=0&limit=1'
```

### Управление supervisor‑скриптом

- Ручной запуск (из корня проекта):
```powershell
powershell -NoProfile -ExecutionPolicy Bypass -File ".\scripts\run_server.ps1"
```

- Остановить текущие экземпляры `api_server.py`:
```powershell
$ErrorActionPreference='SilentlyContinue'; Get-CimInstance Win32_Process |
  Where-Object { $_.Name -like 'python*.exe' -and $_.CommandLine -match 'api_server.py' } |
  ForEach-Object { Stop-Process -Id $_.ProcessId -Force }
```

