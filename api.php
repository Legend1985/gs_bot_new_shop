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
        'image' => 'Goods/Electric_guitar_strings/2221/Ernie_Ball_2221_10-46_150.jpg',
        'oldPrice' => '450 грн',
        'newPrice' => 380,
        'inStock' => true,
        'availability' => 'В наличии'
    ],
    [
        'id' => 2,
        'name' => 'Rotosound R13 Roto Greys 13-54',
        'image' => 'Goods/Electric_guitar_strings/2221/Rotosound_R13_13-54_150.jpg',
        'oldPrice' => '520 грн',
        'newPrice' => 420,
        'inStock' => false,
        'availability' => 'Нет в наличии'
    ],
    [
        'id' => 3,
        'name' => 'Dunlop DEN1046 Nickel Wound Light 10-46',
        'image' => 'Goods/Electric_guitar_strings/2221/Dunlop_DEN1046_10-46_150.jpg',
        'oldPrice' => '480 грн',
        'newPrice' => 400,
        'inStock' => false,
        'availability' => 'Ожидается'
    ],
    [
        'id' => 4,
        'name' => 'GHS Boomers GBTM 11-50 Medium',
        'image' => 'Goods/Electric_guitar_strings/2221/GHS_Boomers_GBTM_11-50_150.jpg',
        'oldPrice' => '550 грн',
        'newPrice' => 450,
        'inStock' => true,
        'availability' => 'В наличии'
    ],
    [
        'id' => 5,
        'name' => 'Fender 250M Nickel-Plated Steel 11-49 Medium',
        'image' => 'Goods/Electric_guitar_strings/2221/Fender_250M_11-49_150.jpg',
        'oldPrice' => '500 грн',
        'newPrice' => 420,
        'inStock' => false,
        'availability' => 'Нет в наличии'
    ],
    [
        'id' => 6,
        'name' => 'D\'Addario EXL110 Nickel Wound 10-46',
        'image' => 'Goods/Electric_guitar_strings/2221/DAddario_EXL110_10-46_150.jpg',
        'oldPrice' => '470 грн',
        'newPrice' => 390,
        'inStock' => true,
        'availability' => 'В наличии'
    ]
];

// Вычисляем, какие товары вернуть
$totalProducts = count($mockProducts);
$hasMore = ($start + $limit) < $totalProducts;

// Возвращаем ответ
$response = [
    'success' => true,
    'products' => array_slice($mockProducts, $start, $limit),
    'total' => $totalProducts,
    'start' => $start,
    'limit' => $limit,
    'hasMore' => $hasMore
];

echo json_encode($response, JSON_UNESCAPED_UNICODE);
?> 