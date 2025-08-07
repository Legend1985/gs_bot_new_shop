<?php
header('Content-Type: application/json');
header('Access-Control-Allow-Origin: *');
header('Access-Control-Allow-Methods: GET');
header('Access-Control-Allow-Headers: Content-Type');

// Параметры запроса
$start = isset($_GET['start']) ? (int)$_GET['start'] : 0;
$limit = isset($_GET['limit']) ? (int)$_GET['limit'] : 60;

// URL сайта для парсинга
$baseUrl = 'https://guitarstrings.com.ua/electro';

// Функция для получения HTML страницы
function getPageContent($url) {
    $ch = curl_init();
    curl_setopt($ch, CURLOPT_URL, $url);
    curl_setopt($ch, CURLOPT_RETURNTRANSFER, true);
    curl_setopt($ch, CURLOPT_FOLLOWLOCATION, true);
    curl_setopt($ch, CURLOPT_USERAGENT, 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36');
    curl_setopt($ch, CURLOPT_TIMEOUT, 30);
    $content = curl_exec($ch);
    curl_close($ch);
    return $content;
}

// Функция для парсинга товаров
function parseProducts($html) {
    $products = [];
    
    // Используем регулярные выражения для извлечения данных
    preg_match_all('/<div class="product-container">(.*?)<\/div>/s', $html, $matches);
    
    foreach ($matches[1] as $productHtml) {
        $product = [];
        
        // Извлекаем название товара
        if (preg_match('/<h3[^>]*>(.*?)<\/h3>/s', $productHtml, $nameMatch)) {
            $product['name'] = trim(strip_tags($nameMatch[1]));
        }
        
        // Извлекаем изображение
        if (preg_match('/<img[^>]*src="([^"]*)"[^>]*>/', $productHtml, $imgMatch)) {
            $product['image'] = 'https://guitarstrings.com.ua' . $imgMatch[1];
        }
        
        // Извлекаем цены
        if (preg_match('/Цена: (\d+) грн/', $productHtml, $priceMatch)) {
            $product['newPrice'] = (int)$priceMatch[1];
        }
        
        if (preg_match('/Цена: (\d+) грн.*?Цена: (\d+) грн/', $productHtml, $oldPriceMatch)) {
            $product['oldPrice'] = (int)$oldPriceMatch[1];
        }
        
        // Проверяем наличие
        if (strpos($productHtml, 'В наличии') !== false) {
            $product['inStock'] = true;
        } else {
            $product['inStock'] = false;
        }
        
        if (!empty($product['name'])) {
            $products[] = $product;
        }
    }
    
    return $products;
}

try {
    // Формируем URL с параметрами пагинации
    $url = $baseUrl;
    if ($start > 0) {
        $url .= '?start=' . $start;
    }
    
    // Получаем HTML страницы
    $html = getPageContent($url);
    
    if ($html === false) {
        throw new Exception('Не удалось загрузить страницу');
    }
    
    // Парсим товары
    $products = parseProducts($html);
    
    // Применяем лимит
    $products = array_slice($products, 0, $limit);
    
    // Формируем ответ
    $response = [
        'success' => true,
        'products' => $products,
        'total' => count($products),
        'start' => $start,
        'limit' => $limit,
        'hasMore' => count($products) === $limit
    ];
    
    echo json_encode($response, JSON_UNESCAPED_UNICODE);
    
} catch (Exception $e) {
    http_response_code(500);
    echo json_encode([
        'success' => false,
        'error' => $e->getMessage()
    ], JSON_UNESCAPED_UNICODE);
}
?> 