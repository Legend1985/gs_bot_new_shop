#!/usr/bin/env python3
# -*- coding: utf-8 -*-

import requests
import json

def test_user_orders_api():
    """Тестирование API эндпоинта /api/user_orders"""
    try:
        print('Проверка работы сервера и API...')

        # Проверяем основной сервер
        try:
            response = requests.get('http://localhost:8000/', timeout=5)
            print(f'Основной сервер: {response.status_code}')
        except Exception as e:
            print(f'Ошибка подключения к серверу: {e}')
            return

        # Проверяем API заказов
        try:
            response = requests.get('http://localhost:8000/api/user_orders', timeout=5)
            print(f'API /api/user_orders: {response.status_code}')

            if response.status_code == 200:
                data = response.json()
                print('Ответ API:')
                print(json.dumps(data, ensure_ascii=False, indent=2))

                # Проверяем структуру ответа
                if 'success' in data and data['success']:
                    orders = data.get('orders', [])
                    summary = data.get('summary', {})

                    print(f'\nНайдено заказов: {len(orders)}')
                    print(f'Всего сумма: {summary.get("totalAmount", 0)}')
                    print(f'Бонусы: {summary.get("bonuses", 0)}')

                    if orders:
                        print('\nПервый заказ:')
                        print(json.dumps(orders[0], ensure_ascii=False, indent=2))
                else:
                    print('API вернул ошибку:', data.get('error', 'Неизвестная ошибка'))
            else:
                print(f'Ошибка API: {response.status_code}')
                print('Текст ответа:', response.text)

        except requests.exceptions.RequestException as e:
            print(f'Ошибка запроса к API: {e}')

    except Exception as e:
        print(f'Ошибка тестирования: {e}')

if __name__ == '__main__':
    test_user_orders_api()