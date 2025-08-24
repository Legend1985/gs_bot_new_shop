import requests

def check_duplicates():
    try:
        response = requests.get('http://localhost:8000/api/products?start=0&limit=1000')
        data = response.json()
        
        print(f'Всего товаров: {data["total"]}')
        print(f'Товаров в ответе: {len(data["products"])}')
        print('\nПроверяем на дубликаты...')
        
        names = [p['name'] for p in data['products']]
        duplicates = [name for name in set(names) if names.count(name) > 1]
        
        print(f'Дубликатов найдено: {len(duplicates)}')
        if duplicates:
            print('Список дубликатов:')
            for name in duplicates[:10]:  # Показываем первые 10
                print(f'  - {name}')
        else:
            print('Дубликатов не найдено!')
            
        # Проверяем 7-струнные товары
        seven_string_products = [p for p in data['products'] if '7-string' in p['name'].lower() or '7-струн' in p['name'].lower()]
        print(f'\n7-струнных товаров: {len(seven_string_products)}')
        
        # Проверяем товары с номером 2730
        products_2730 = [p for p in data['products'] if '2730' in p['name']]
        print(f'Товаров с номером 2730: {len(products_2730)}')
        for p in products_2730:
            print(f'  - {p["name"]} (цена: {p["newPrice"]} грн)')
            
    except Exception as e:
        print(f'Ошибка: {e}')

if __name__ == '__main__':
    check_duplicates()
