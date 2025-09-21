#!/usr/bin/env python3
# -*- coding: utf-8 -*-

from http.server import HTTPServer, SimpleHTTPRequestHandler
import os
import sys
import threading
import time
import json
import requests

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

    def handle_one_request(self):
        """Переопределяем для обработки разрывов соединений"""
        try:
            super().handle_one_request()
        except (ConnectionAbortedError, BrokenPipeError, ConnectionResetError):
            # Игнорируем ошибки разрыва соединений - это нормально
            # Клиент может закрыть браузер или прервать загрузку
            pass

    def proxy_api_request(self, method='GET'):
        """Проксирование API запросов на api_server (порт 5000)"""
        try:
            # Получаем путь и параметры запроса
            path = self.path
            api_url = f'http://localhost:5000{path}'

            # Получаем тело запроса для POST
            content_length = int(self.headers.get('Content-Length', 0))
            post_data = None
            if content_length > 0:
                post_data = self.rfile.read(content_length)

            # Подготавливаем заголовки для проксирования
            headers = {}
            for header_name, header_value in self.headers.items():
                # Пропускаем некоторые заголовки, которые могут вызвать проблемы
                if header_name.lower() not in ['host', 'content-length']:
                    headers[header_name] = header_value

            # Делаем запрос к API серверу
            if method == 'POST' and post_data:
                # Проверяем Content-Type для правильной отправки данных
                content_type = headers.get('Content-Type', '').lower()
                if 'application/json' in content_type:
                    # Отправляем как JSON
                    json_data = post_data.decode('utf-8') if isinstance(post_data, bytes) else post_data
                    response = requests.post(api_url, data=json_data, headers=headers, timeout=30)
                else:
                    # Отправляем как form data
                    response = requests.post(api_url, data=post_data, headers=headers, timeout=30)
            else:
                response = requests.get(api_url, headers=headers, timeout=30)

            # Отправляем ответ клиенту
            self.send_response(response.status_code)
            for header_name, header_value in response.headers.items():
                # Пропускаем некоторые заголовки
                if header_name.lower() not in ['content-encoding', 'content-length', 'transfer-encoding']:
                    self.send_header(header_name, header_value)
            self.end_headers()

            # Отправляем тело ответа
            try:
                self.wfile.write(response.content)
            except (ConnectionAbortedError, BrokenPipeError, ConnectionResetError):
                # Клиент разорвал соединение - это нормально, игнорируем
                pass

        except requests.exceptions.RequestException as e:
            try:
                self.send_error(502, f"API Server Error")
            except (ConnectionAbortedError, BrokenPipeError, ConnectionResetError, UnicodeEncodeError):
                # Игнорируем ошибки отправки, если клиент уже отключился
                pass
        except (ConnectionAbortedError, BrokenPipeError, ConnectionResetError):
            # Клиент разорвал соединение - это нормально, игнорируем
            pass
        except Exception as e:
            try:
                self.send_error(500, f"Proxy Error")
            except (ConnectionAbortedError, BrokenPipeError, ConnectionResetError, UnicodeEncodeError):
                # Игнорируем ошибки отправки, если клиент уже отключился
                pass

    def do_GET(self):
        """Обрабатываем GET запросы с проксированием API"""
        if self.path.startswith('/api/'):
            # Проксируем API запросы
            self.proxy_api_request('GET')
        else:
            # Обрабатываем как обычные файлы
            super().do_GET()

    def do_POST(self):
        """Обрабатываем POST запросы с проксированием API"""
        if self.path.startswith('/api/'):
            # Проксируем API запросы
            self.proxy_api_request('POST')
        else:
            # Для не-API запросов возвращаем 404
            self.send_error(404, "POST method not supported for this path")

def run_server(port=8000):
    """Запуск сервера на указанном порту"""
    os.chdir('.')  # Устанавливаем текущую директорию как корневую для сервера

    server_address = ('', port)
    httpd = HTTPServer(server_address, CustomHTTPRequestHandler)

    print("🚀 Запуск сервера...")
    print(f"🌐 Сервер запущен: http://localhost:{port}")
    print(f"📁 Корневая директория: {os.getcwd()}")
    print(f"🎯 Откройте браузер: http://localhost:{port}/index.html")
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
