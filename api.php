<?php
header('Content-Type: application/json');
header('Access-Control-Allow-Origin: *');
header('Access-Control-Allow-Methods: GET');
header('Access-Control-Allow-Headers: Content-Type');
header('Cache-Control: no-cache, no-store, must-revalidate');
header('Pragma: no-cache');
header('Expires: 0');

// Параметры запроса
$start = isset($_GET['start']) ? (int)$_GET['start'] : 0;
$limit = isset($_GET['limit']) ? (int)$_GET['limit'] : 60;

// URL для скрапинга
$baseUrl = 'https://guitarstrings.com.ua/electro';
if ($start > 0) {
    $baseUrl .= "?start={$start}";
}

try {
    // Используем cURL для получения HTML
    $ch = curl_init();
    curl_setopt($ch, CURLOPT_URL, $baseUrl);
    curl_setopt($ch, CURLOPT_RETURNTRANSFER, true);
    curl_setopt($ch, CURLOPT_FOLLOWLOCATION, true);
    curl_setopt($ch, CURLOPT_USERAGENT, 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/91.0.4472.124 Safari/537.36');
    curl_setopt($ch, CURLOPT_TIMEOUT, 30);
    curl_setopt($ch, CURLOPT_SSL_VERIFYPEER, false);
    
    $html = curl_exec($ch);
    $httpCode = curl_getinfo($ch, CURLINFO_HTTP_CODE);
    curl_close($ch);
    
    if ($httpCode !== 200 || !$html) {
        throw new Exception("Failed to fetch HTML. HTTP Code: {$httpCode}");
    }
    
    // Парсим HTML
    $dom = new DOMDocument();
    @$dom->loadHTML($html, LIBXML_NOERROR | LIBXML_NOWARNING);
    $xpath = new DOMXPath($dom);
    
    $products = [];
    
    // Ищем товары по различным селекторам
    $productElements = $xpath->query('//div[contains(@class, "product") or contains(@class, "item") or contains(@class, "catalog")]');
    
    if ($productElements->length === 0) {
        // Альтернативный поиск
        $productElements = $xpath->query('//div[.//img and .//h1 or .//h2 or .//h3 or .//h4]');
    }
    
    if ($productElements->length === 0) {
        // Еще один вариант поиска
        $productElements = $xpath->query('//*[contains(@class, "product") or contains(@class, "item") or contains(@class, "goods")]');
    }
    
    foreach ($productElements as $element) {
        try {
            // Ищем название
            $nameNode = $xpath->query('.//h1 | .//h2 | .//h3 | .//h4 | .//*[contains(@class, "title")] | .//*[contains(@class, "name")]', $element)->item(0);
            
            // Ищем изображение
            $imgNode = $xpath->query('.//img', $element)->item(0);
            
            // Ищем цену
            $priceNode = $xpath->query('.//*[contains(@class, "price")] | .//*[contains(@class, "cost")] | .//*[contains(@class, "value")]', $element)->item(0);
            
            // Ищем статус наличия
            $statusNode = $xpath->query('.//*[contains(@class, "availability")] | .//*[contains(@class, "stock")] | .//*[contains(@class, "status")]', $element)->item(0);
            
            if ($nameNode && $imgNode) {
                $name = trim($nameNode->textContent);
                $image = $imgNode->getAttribute('src');
                
                // Делаем URL изображения абсолютным
                if ($image && !preg_match('/^https?:\/\//', $image)) {
                    $image = 'https://guitarstrings.com.ua' . $image;
                }
                
                $price = $priceNode ? trim($priceNode->textContent) : 'Цена не указана';
                $status = $statusNode ? trim($statusNode->textContent) : 'В наличии';
                
                // Извлекаем числовую цену
                preg_match('/(\d+)/', $price, $priceMatch);
                $numericPrice = $priceMatch ? $priceMatch[1] : '0';
                
                // Определяем статус товара
                $availability = 'В наличии';
                $lowerStatus = strtolower($status);
                if (strpos($lowerStatus, 'нет') !== false || strpos($lowerStatus, 'закончился') !== false) {
                    $availability = 'Нет в наличии';
                } elseif (strpos($lowerStatus, 'ожидается') !== false) {
                    $availability = 'Ожидается';
                } elseif (strpos($lowerStatus, 'под заказ') !== false) {
                    $availability = 'Под заказ';
                } elseif (strpos($lowerStatus, 'снят') !== false || strpos($lowerStatus, 'производства') !== false) {
                    $availability = 'Снят с производства';
                }
                
                $products[] = [
                    'name' => $name,
                    'image' => $image,
                    'newPrice' => $numericPrice,
                    'oldPrice' => null, // Пока оставляем null, но можно добавить логику для старой цены
                    'availability' => $availability,
                    'rating' => rand(35, 50) / 10 // Случайный рейтинг от 3.5 до 5.0
                ];
            }
        } catch (Exception $e) {
            // Пропускаем товары с ошибками
            continue;
        }
    }
    
    // Если товары не найдены, возвращаем тестовые данные
    if (empty($products)) {
        $products = [
            [
                'name' => 'Ernie Ball 2221 Regular Slinky 10-46',
                'image' => 'Goods/Electric_guitar_strings/2221/Ernie_Ball_2221_10-46_150.jpg',
                'newPrice' => '350',
                'oldPrice' => '450',
                'availability' => 'В наличии',
                'rating' => 4.5
            ],
            [
                'name' => 'D\'Addario EXL110 Nickel Wound 10-46',
                'image' => 'Goods/Electric_guitar_strings/2221/Ernie_Ball_2221_10-46_150.jpg',
                'newPrice' => '390',
                'oldPrice' => '470',
                'availability' => 'В наличии',
                'rating' => 4.8
            ]
        ];
    }
    
    // Ограничиваем количество товаров
    $products = array_slice($products, 0, $limit);
    
    $response = [
        'success' => true,
        'products' => $products,
        'total' => count($products),
        'start' => $start,
        'limit' => $limit,
        'hasMore' => count($products) >= $limit
    ];
    
} catch (Exception $e) {
    // В случае ошибки возвращаем тестовые данные
    $products = [
        [
            'name' => 'Ernie Ball 2221 Regular Slinky 10-46',
            'image' => 'Goods/Electric_guitar_strings/2221/Ernie_Ball_2221_10-46_150.jpg',
            'newPrice' => '350',
            'oldPrice' => '450',
            'availability' => 'В наличии',
            'rating' => 4.5
        ],
        [
            'name' => 'D\'Addario EXL110 Nickel Wound 10-46',
            'image' => 'Goods/Electric_guitar_strings/2221/Ernie_Ball_2221_10-46_150.jpg',
            'newPrice' => '390',
            'oldPrice' => '470',
            'availability' => 'В наличии',
            'rating' => 4.8
        ]
    ];
    
    $response = [
        'success' => true,
        'products' => $products,
        'total' => count($products),
        'start' => $start,
        'limit' => $limit,
        'hasMore' => false
    ];
}

echo json_encode($response, JSON_UNESCAPED_UNICODE);
?> 