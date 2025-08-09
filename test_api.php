<?php
header('Content-Type: application/json');
header('Access-Control-Allow-Origin: *');

// Простой тест для проверки работы PHP
$testData = [
    'success' => true,
    'message' => 'PHP работает!',
    'timestamp' => date('Y-m-d H:i:s'),
    'products' => [
        [
            'id' => 1,
            'name' => 'Test Product 1',
            'image' => 'Goods/Electric_guitar_strings/2221/Ernie_Ball_2221_10-46_150.jpg',
            'oldPrice' => '450 грн',
            'newPrice' => '380',
            'inStock' => true,
            'availability' => 'В наличии',
            'rating' => 4.5
        ],
        [
            'id' => 2,
            'name' => 'Test Product 2',
            'image' => 'Goods/Electric_guitar_strings/2221/Ernie_Ball_2221_10-46.jpg',
            'oldPrice' => '500 грн',
            'newPrice' => '420',
            'inStock' => false,
            'availability' => 'Нет в наличии',
            'rating' => 4.2
        ],
        [
            'id' => 3,
            'name' => 'Test Product 3',
            'image' => 'Goods/Electric_guitar_strings/2221/Ernie_Ball_2221_10-46_150.jpg',
            'oldPrice' => '480 грн',
            'newPrice' => '400',
            'inStock' => false,
            'availability' => 'Ожидается',
            'rating' => 4.8
        ]
    ],
    'totalProducts' => 3,
    'hasMore' => false
];

echo json_encode($testData, JSON_UNESCAPED_UNICODE);
?> 