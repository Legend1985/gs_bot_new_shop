<?php
// Устанавливаем заголовки для JSON ответа
header('Content-Type: application/json; charset=utf-8');
header('Access-Control-Allow-Origin: *');
header('Access-Control-Allow-Methods: GET, POST, OPTIONS');
header('Access-Control-Allow-Headers: Content-Type, Authorization, X-Requested-With');
header('Cache-Control: no-cache, no-store, must-revalidate');
header('Pragma: no-cache');
header('Expires: 0');

// Отключаем вывод ошибок в ответ
ini_set('display_errors', 0);
error_reporting(0);

// Обработка preflight запросов
if ($_SERVER['REQUEST_METHOD'] == 'OPTIONS') {
    http_response_code(200);
    exit();
}

// Параметры запроса
$start = isset($_GET['start']) ? (int)$_GET['start'] : 0;
$limit = isset($_GET['limit']) ? (int)$_GET['limit'] : 60;
$category = isset($_GET['category']) ? $_GET['category'] : 'electro';

// База данных товаров из базы знаний
$productsDatabase = [
    // 09 калибр (электрогитара)
    [
        'name' => 'Orphee RX15 Nickel Alloy Super Light 9-42',
        'image' => 'https://guitarstrings.com.ua/images/stories/virtuemart/product/resized/orphee_rx15-9-42_0x170.png',
        'newPrice' => 173,
        'oldPrice' => 200,
        'availability' => 'В наличии',
        'rating' => 4.5,
        'category' => 'electro',
        'gauge' => '09'
    ],
    [
        'name' => 'Ernie Ball 2248 Custom Gauge Stainless Steel 9-42',
        'image' => 'https://guitarstrings.com.ua/images/stories/virtuemart/product/resized/ernie_ball_2248_9-42_0x170.png',
        'newPrice' => 426,
        'oldPrice' => 500,
        'availability' => 'В наличии',
        'rating' => 4.8,
        'category' => 'electro',
        'gauge' => '09'
    ],
    [
        'name' => 'Ernie Ball 2247 Custom Gauge Stainless Steel 9-46',
        'image' => 'https://guitarstrings.com.ua/images/stories/virtuemart/product/resized/ernie_ball_2247_9-46_0x170.png',
        'newPrice' => 426,
        'oldPrice' => 500,
        'availability' => 'В наличии',
        'rating' => 4.6,
        'category' => 'electro',
        'gauge' => '09'
    ],
    [
        'name' => 'GHS Boomers GBCL Custom Light 9-46',
        'image' => 'https://guitarstrings.com.ua/images/stories/virtuemart/product/resized/ghs_boomers_gbcl_9-46_0x170.png',
        'newPrice' => 391,
        'oldPrice' => 450,
        'availability' => 'В наличии',
        'rating' => 4.4,
        'category' => 'electro',
        'gauge' => '09'
    ],
    [
        'name' => 'GHS Boomers GBXL Extra Light 9-42',
        'image' => 'https://guitarstrings.com.ua/images/stories/virtuemart/product/resized/ghs_boomers_gbxl_9-42_0x170.png',
        'newPrice' => 391,
        'oldPrice' => 450,
        'availability' => 'В наличии',
        'rating' => 4.3,
        'category' => 'electro',
        'gauge' => '09'
    ],
    [
        'name' => "D'Addario EXL120+-3D Nickel Wound 9.5-44",
        'image' => 'https://guitarstrings.com.ua/images/stories/virtuemart/product/resized/daddario_exl120_9-5-44_0x170.png',
        'newPrice' => 280,
        'oldPrice' => 320,
        'availability' => 'В наличии',
        'rating' => 4.2,
        'category' => 'electro',
        'gauge' => '09'
    ],
    [
        'name' => "D'Addario EXL120-10P Nickel Wound Super Light 9-42",
        'image' => 'https://guitarstrings.com.ua/images/stories/virtuemart/product/resized/daddario_exl120_9-42_0x170.png',
        'newPrice' => 280,
        'oldPrice' => 320,
        'availability' => 'В наличии',
        'rating' => 4.5,
        'category' => 'electro',
        'gauge' => '09'
    ],
    [
        'name' => 'Fender 250L-3 Nickel Plated Steel Light 9-42',
        'image' => 'https://guitarstrings.com.ua/images/stories/virtuemart/product/resized/fender_250l_9-42_0x170.png',
        'newPrice' => 315,
        'oldPrice' => 350,
        'availability' => 'В наличии',
        'rating' => 4.1,
        'category' => 'electro',
        'gauge' => '09'
    ],
    [
        'name' => 'Ernie Ball 2223 Super Slinky 9-42',
        'image' => 'https://guitarstrings.com.ua/images/stories/virtuemart/product/resized/ernie_ball_2223_9-42_0x170.png',
        'newPrice' => 225,
        'oldPrice' => 250,
        'availability' => 'В наличии',
        'rating' => 4.7,
        'category' => 'electro',
        'gauge' => '09'
    ],
    [
        'name' => 'La Bella HRS-XL Hard Rockin Steel Extra Light 9-42',
        'image' => 'https://guitarstrings.com.ua/images/stories/virtuemart/product/resized/la_bella_hrs_xl_9-42_0x170.png',
        'newPrice' => 290,
        'oldPrice' => 330,
        'availability' => 'В наличии',
        'rating' => 4.3,
        'category' => 'electro',
        'gauge' => '09'
    ],

    // 10 калибр (электрогитара)
    [
        'name' => 'Ernie Ball 2221 Hybrid Slinky 10-46',
        'image' => 'https://guitarstrings.com.ua/images/stories/virtuemart/product/resized/ernie_ball_2221_10-46_0x170.png',
        'newPrice' => 225,
        'oldPrice' => 250,
        'availability' => 'В наличии',
        'rating' => 4.9,
        'category' => 'electro',
        'gauge' => '10'
    ],
    [
        'name' => 'Ernie Ball 2215 Power Slinky 10-46',
        'image' => 'https://guitarstrings.com.ua/images/stories/virtuemart/product/resized/ernie_ball_2215_10-46_0x170.png',
        'newPrice' => 225,
        'oldPrice' => 250,
        'availability' => 'В наличии',
        'rating' => 4.6,
        'category' => 'electro',
        'gauge' => '10'
    ],
    [
        'name' => 'Ernie Ball 2216 Beefy Slinky 10-46',
        'image' => 'https://guitarstrings.com.ua/images/stories/virtuemart/product/resized/ernie_ball_2216_10-46_0x170.png',
        'newPrice' => 225,
        'oldPrice' => 250,
        'availability' => 'В наличии',
        'rating' => 4.4,
        'category' => 'electro',
        'gauge' => '10'
    ],
    [
        'name' => 'GHS Boomers GBLXL Light/Extra Light 10-38',
        'image' => 'https://guitarstrings.com.ua/images/stories/virtuemart/product/resized/ghs_boomers_gblxl_10-38_0x170.png',
        'newPrice' => 391,
        'oldPrice' => 450,
        'availability' => 'В наличии',
        'rating' => 4.2,
        'category' => 'electro',
        'gauge' => '10'
    ],
    [
        'name' => 'GHS Boomers GBM Medium 11-50',
        'image' => 'https://guitarstrings.com.ua/images/stories/virtuemart/product/resized/ghs_boomers_gbm_11-50_0x170.png',
        'newPrice' => 391,
        'oldPrice' => 450,
        'availability' => 'В наличии',
        'rating' => 4.5,
        'category' => 'electro',
        'gauge' => '10'
    ],
    [
        'name' => "D'Addario EXL110-3D Nickel Wound Regular Light 10-46",
        'image' => 'https://guitarstrings.com.ua/images/stories/virtuemart/product/resized/daddario_exl110_10-46_0x170.png',
        'newPrice' => 280,
        'oldPrice' => 320,
        'availability' => 'В наличии',
        'rating' => 4.7,
        'category' => 'electro',
        'gauge' => '10'
    ],
    [
        'name' => 'Fender 250R-3 Nickel Plated Steel Regular 10-46',
        'image' => 'https://guitarstrings.com.ua/images/stories/virtuemart/product/resized/fender_250r_10-46_0x170.png',
        'newPrice' => 315,
        'oldPrice' => 350,
        'availability' => 'В наличии',
        'rating' => 4.3,
        'category' => 'electro',
        'gauge' => '10'
    ],
    [
        'name' => 'Musicians Gear MG10-46 Nickel-Plated Light 10-46',
        'image' => 'https://guitarstrings.com.ua/images/stories/virtuemart/product/resized/musicians_gear_mg10_10-46_0x170.png',
        'newPrice' => 280,
        'oldPrice' => 320,
        'availability' => 'В наличии',
        'rating' => 4.1,
        'category' => 'electro',
        'gauge' => '10'
    ]
];

// Фильтруем товары по категории
$filteredProducts = array_filter($productsDatabase, function($product) use ($category) {
    if ($category === 'electro') {
        return $product['category'] === 'electro';
    } elseif ($category === 'electro-09') {
        return $product['category'] === 'electro' && $product['gauge'] === '09';
    } elseif ($category === 'electro-10') {
        return $product['category'] === 'electro' && $product['gauge'] === '10';
    } elseif ($category === 'electro-11') {
        return $product['category'] === 'electro' && $product['gauge'] === '11';
    }
    return $product['category'] === $category;
});

// Применяем пагинацию
$paginatedProducts = array_slice(array_values($filteredProducts), $start, $limit);

// Сортируем по цене согласно политике базы знаний
usort($paginatedProducts, function($a, $b) {
    $priceA = $a['newPrice'];
    $priceB = $b['newPrice'];
    return $priceA <=> $priceB;
});

$response = [
    'success' => true,
    'products' => $paginatedProducts,
    'total' => count($paginatedProducts),
    'start' => $start,
    'limit' => $limit,
    'hasMore' => count($filteredProducts) > ($start + $limit)
];

echo json_encode($response, JSON_UNESCAPED_UNICODE | JSON_PRETTY_PRINT);
?>
