#!/usr/bin/env python3
# -*- coding: utf-8 -*-

from http.server import HTTPServer, SimpleHTTPRequestHandler
import os
import sys
import threading
import time
import json

class CustomHTTPRequestHandler(SimpleHTTPRequestHandler):
    def end_headers(self):
        # Добавляем CORS заголовки
        self.send_header('Access-Control-Allow-Origin', '*')
        self.send_header('Access-Control-Allow-Methods', 'GET, POST, OPTIONS')
        self.send_header('Access-Control-Allow-Headers', 'Content-Type')
        super().end_headers()

    def do_OPTIONS(self):
        self.send_response(200)
        self.end_headers()

    def log_message(self, format, *args):
        # Отключаем логи сервера для чистоты вывода
        pass

def run_server(port=8000):
    """Запуск сервера на указанном порту"""
    os.chdir('.')  # Устанавливаем текущую директорию как корневую для сервера

    server_address = ('', port)
    httpd = HTTPServer(server_address, CustomHTTPRequestHandler)

    print("🚀 Запуск сервера...")
    server_url = f"http://localhost:{port}"
    print(f"🌐 Сервер запущен: {server_url}")
    print(f"📁 Корневая директория: {os.getcwd()}")
    print(f"🎯 Откройте браузер: {server_url}/index.html")
    print("💡 Для смены окружения отредактируйте config.js")
    print("❌ Для остановки нажмите Ctrl+C")

    try:
        httpd.serve_forever()
    except KeyboardInterrupt:
        print("\n👋 Сервер остановлен")
        httpd.shutdown()

if __name__ == '__main__':
    port = 8000

    # Если указан порт в аргументах командной строки
    if len(sys.argv) > 1:
        try:
            port = int(sys.argv[1])
        except ValueError:
            print("❌ Ошибка: порт должен быть числом")
            sys.exit(1)

    run_server(port)
