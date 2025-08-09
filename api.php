<?php
header('Content-Type: application/json');
header('Access-Control-Allow-Origin: *');
header('Access-Control-Allow-Methods: GET');
header('Access-Control-Allow-Headers: Content-Type');

// Параметры запроса
$start = isset($_GET['start']) ? (int)$_GET['start'] : 0;
$limit = isset($_GET['limit']) ? (int)$_GET['limit'] : 60;

// Моковые данные для тестирования
$mockProducts = [
    [
        'id' => 1,
        'name' => 'Ernie Ball 2221 Regular Slinky 10-46',
        'image' => 'https://guitarstrings.com.ua/images/product/2221/Ernie_Ball_2221_10-46_150.jpg',
        'oldPrice' => '450 грн',
        'newPrice' => 380,
        'inStock' => true,
        'availability' => 'В наличии',
        'rating' => 4.5
    ],
    [
        'id' => 2,
        'name' => 'Rotosound R13 Roto Greys 13-54',
        'image' => 'https://guitarstrings.com.ua/images/product/2221/Rotosound_R13_13-54_150.jpg',
        'oldPrice' => '520 грн',
        'newPrice' => 420,
        'inStock' => false,
        'availability' => 'Нет в наличии',
        'rating' => 4.2
    ],
    [
        'id' => 3,
        'name' => 'Dunlop DEN1046 Nickel Wound Light 10-46',
        'image' => 'https://guitarstrings.com.ua/images/product/2221/Dunlop_DEN1046_10-46_150.jpg',
        'oldPrice' => '480 грн',
        'newPrice' => 400,
        'inStock' => false,
        'availability' => 'Ожидается',
        'rating' => 4.8
    ],
    [
        'id' => 4,
        'name' => 'GHS Boomers GBTM 11-50 Medium',
        'image' => 'https://guitarstrings.com.ua/images/product/2221/GHS_Boomers_GBTM_11-50_150.jpg',
        'oldPrice' => '550 грн',
        'newPrice' => 450,
        'inStock' => true,
        'availability' => 'В наличии',
        'rating' => 4.6
    ],
    [
        'id' => 5,
        'name' => 'Fender 250M Nickel-Plated Steel 11-49 Medium',
        'image' => 'https://guitarstrings.com.ua/images/product/2221/Fender_250M_11-49_150.jpg',
        'oldPrice' => '500 грн',
        'newPrice' => 420,
        'inStock' => false,
        'availability' => 'Нет в наличии',
        'rating' => 4.3
    ],
    [
        'id' => 6,
        'name' => 'D\'Addario EXL110 Nickel Wound 10-46',
        'image' => 'https://guitarstrings.com.ua/images/product/2221/DAddario_EXL110_10-46_150.jpg',
        'oldPrice' => '470 грн',
        'newPrice' => 390,
        'inStock' => true,
        'availability' => 'В наличии',
        'rating' => 4.7
    ],
    [
        'id' => 7,
        'name' => 'Elixir 12002 Nanoweb Electric 10-46',
        'image' => 'https://guitarstrings.com.ua/images/product/2221/Elixir_12002_10-46_150.jpg',
        'oldPrice' => '600 грн',
        'newPrice' => 480,
        'inStock' => false,
        'availability' => 'Ожидается',
        'rating' => 4.9
    ],
    [
        'id' => 8,
        'name' => 'DR Strings DDT-10 Nickel Plated 10-46',
        'image' => 'https://guitarstrings.com.ua/images/product/2221/DR_Strings_DDT10_10-46_150.jpg',
        'oldPrice' => '530 грн',
        'newPrice' => 440,
        'inStock' => false,
        'availability' => 'Снят с производства',
        'rating' => 4.4
    ],
    [
        'id' => 9,
        'name' => 'Dean Markley Blue Steel 10-46',
        'image' => 'https://guitarstrings.com.ua/images/product/2221/Dean_Markley_Blue_Steel_10-46_150.jpg',
        'oldPrice' => '480 грн',
        'newPrice' => 390,
        'inStock' => false,
        'availability' => 'Снят с производства',
        'rating' => 4.1
    ],
    [
        'id' => 10,
        'name' => 'La Bella Electric Guitar Strings 10-46',
        'image' => 'https://guitarstrings.com.ua/images/product/2221/La_Bella_Electric_10-46_150.jpg',
        'oldPrice' => '520 грн',
        'newPrice' => 420,
        'inStock' => false,
        'availability' => 'Снят с производства',
        'rating' => 4.3
    ]
];

// Генерируем больше товаров для пагинации
$allProducts = [];
for ($i = 0; $i < 377; $i++) {
    $productIndex = $i % count($mockProducts);
    $product = $mockProducts[$productIndex];
    $product['id'] = $i + 1;
    $product['name'] = $product['name'] . ' #' . ($i + 1);
    $allProducts[] = $product;
}

// Применяем пагинацию
$products = array_slice($allProducts, $start, $limit);

// Формируем ответ
$response = [
    'success' => true,
    'products' => $products,
    'total' => count($products),
    'start' => $start,
    'limit' => $limit,
    'hasMore' => ($start + $limit) < 377,
    'totalProducts' => 377,
    'debug' => [
        'url' => 'mock_data',
        'start' => $start,
        'limit' => $limit,
        'totalProducts' => 377,
        'parsedCount' => count($products),
        'hasMore' => ($start + $limit) < 377
    ]
];

echo json_encode($response, JSON_UNESCAPED_UNICODE);
?> 