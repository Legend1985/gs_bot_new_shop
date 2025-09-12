from flask import Flask, jsonify, send_from_directory, request
from flask_cors import CORS
import json
import os

app = Flask(__name__)
CORS(app)

# Загружаем статические товары
STATIC_PRODUCTS = []
try:
    with open('static_products.json', 'r', encoding='utf-8') as f:
        data = json.load(f)
        STATIC_PRODUCTS = data.get('products', [])
        print(f"Загружено {len(STATIC_PRODUCTS)} товаров из static_products.json")
except Exception as e:
    print(f"Ошибка загрузки товаров: {e}")
    STATIC_PRODUCTS = []

@app.route('/')
def index():
    return send_from_directory('.', 'index.html')

@app.route('/<path:path>')
def static_files(path):
    return send_from_directory('.', path)

@app.route('/api/products')
def get_products():
    try:
        start = int(request.args.get('start', 0))
        limit = int(request.args.get('limit', 30))

        # Возвращаем товары с пагинацией
        products = STATIC_PRODUCTS[start:start+limit] if STATIC_PRODUCTS else []

        return jsonify({
            'success': True,
            'products': products,
            'total': len(STATIC_PRODUCTS),
            'start': start,
            'limit': limit
        })
    except Exception as e:
        print(f"Ошибка в API products: {e}")
        return jsonify({
            'success': False,
            'error': str(e),
            'products': [],
            'total': 0
        }), 500

@app.route('/api/user_orders')
def get_user_orders():
    # Заглушка для заказов пользователя
    return jsonify({
        'success': False,
        'error': 'Пользователь не авторизован',
        'orders': [],
        'summary': {
            'bonuses': 0,
            'totalAmount': 0,
            'totalOrders': 0
        }
    }), 401

@app.route('/api/captcha')
def get_captcha():
    # Заглушка для капчи
    return jsonify({
        'success': True,
        'question': 'Скільки буде 2 + 2?',
        'answer': '4'
    })

@app.route('/api/user_profile')
def get_user_profile():
    # Заглушка для профиля пользователя
    return jsonify({
        'success': False,
        'error': 'Пользователь не авторизован'
    }), 404

if __name__ == '__main__':
    print("🚀 Запуск сервера на http://localhost:8000")
    print(f"📦 Загружено {len(STATIC_PRODUCTS)} товаров")
    app.run(host='0.0.0.0', port=8000, debug=False)
