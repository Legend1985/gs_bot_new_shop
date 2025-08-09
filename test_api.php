<?php
header('Content-Type: application/json');
header('Access-Control-Allow-Origin: *');

// Простой тест
$testData = [
    'success' => true,
    'message' => 'PHP работает!',
    'timestamp' => date('Y-m-d H:i:s'),
    'test_products' => [
        [
            'name' => 'Test Product 1',
            'image' => 'Goods/Electric_guitar_strings/2221/Ernie_Ball_2221_10-46_150.jpg',
            'oldPrice' => '450 грн',
            'newPrice' => '380',
            'inStock' => true,
            'availability' => 'В наличии'
        ],
        [
            'name' => 'Test Product 2',
            'image' => 'Goods/Electric_guitar_strings/2221/Ernie_Ball_2221_10-46.jpg',
            'oldPrice' => '500 грн',
            'newPrice' => '420',
            'inStock' => false,
            'availability' => 'Нет в наличии'
        ]
    ]
];

echo json_encode($testData, JSON_UNESCAPED_UNICODE);
?> 