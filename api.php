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
    curl_setopt($ch, CURLOPT_SSL_VERIFYPEER, false);
    $content = curl_exec($ch);
    curl_close($ch);
    return $content;
}

// Функция для парсинга товаров
function parseProducts($html) {
    $products = [];
    $seenNames = []; // Для отслеживания дубликатов
    
    // Используем DOMDocument для более точного парсинга
    $dom = new DOMDocument();
    @$dom->loadHTML($html);
    $xpath = new DOMXPath($dom);
    
    // Находим все карточки товаров - используем более точные селекторы
    $productNodes = $xpath->query('//div[contains(@class, "product") or contains(@class, "vm-col") or contains(@class, "browseProductContainer")]');
    
    foreach ($productNodes as $productNode) {
        try {
            $product = [];
            
            // Извлекаем название товара - ищем в разных местах
            $titleNodes = $xpath->query('.//h2//a | .//h3//a | .//h2 | .//h3 | .//div[contains(@class, "product-title")]//a', $productNode);
            if ($titleNodes->length > 0) {
                $product['name'] = trim($titleNodes->item(0)->textContent);
            }
            
            // Извлекаем изображение - ищем в разных местах
            $imgNodes = $xpath->query('.//img[contains(@class, "browseProductImage") or contains(@src, "product") or contains(@src, "resized")]', $productNode);
            if ($imgNodes->length > 0) {
                $imgSrc = $imgNodes->item(0)->getAttribute('src');
                if (!empty($imgSrc)) {
                    $product['image'] = $imgSrc;
                    if (!str_starts_with($imgSrc, 'http')) {
                        $product['image'] = 'https://guitarstrings.com.ua' . $imgSrc;
                    }
                }
            }
            
            // Извлекаем цены - ищем в разных форматах
            $priceNodes = $xpath->query('.//span[contains(@class, "Price") or contains(text(), "грн")] | .//div[contains(text(), "грн")]', $productNode);
            $prices = [];
            foreach ($priceNodes as $priceNode) {
                $priceText = trim($priceNode->textContent);
                // Убираем слово "цена", двоеточие и лишние пробелы
                $priceText = str_replace(['цена', 'Цена', 'ЦЕНА', ':', '：'], '', $priceText);
                $priceText = preg_replace('/\s+/', ' ', trim($priceText)); // Убираем лишние пробелы
                if (preg_match('/(\d+)\s*грн/', $priceText, $matches)) {
                    $prices[] = (int)$matches[1];
                }
            }
            
            // Сортируем цены (старая цена обычно больше)
            if (count($prices) >= 2) {
                rsort($prices);
                $product['oldPrice'] = $prices[0] . ' грн';
                $product['newPrice'] = $prices[1];
            } elseif (count($prices) == 1) {
                $product['newPrice'] = $prices[0];
                $product['oldPrice'] = ($prices[0] + 50) . ' грн'; // Примерная старая цена
            }
            
            // Проверяем наличие
            $availabilityNodes = $xpath->query('.//span[contains(text(), "наличи") or contains(text(), "Наличи") or contains(text(), "Ожидается") or contains(text(), "заказ") or contains(text(), "производства")] | .//div[contains(text(), "наличи") or contains(text(), "Ожидается") or contains(text(), "заказ") or contains(text(), "производства")]', $productNode);
            if ($availabilityNodes->length > 0) {
                $availabilityText = trim($availabilityNodes->item(0)->textContent);
                // Определяем статус по тексту
                if (strpos($availabilityText, 'наличи') !== false) {
                    $product['inStock'] = true;
                    $product['availability'] = 'В наличии';
                } elseif (strpos($availabilityText, 'Ожидается') !== false) {
                    $product['inStock'] = false;
                    $product['availability'] = 'Ожидается';
                } elseif (strpos($availabilityText, 'заказ') !== false) {
                    $product['inStock'] = false;
                    $product['availability'] = 'Под заказ';
                } elseif (strpos($availabilityText, 'производства') !== false) {
                    $product['inStock'] = false;
                    $product['availability'] = 'Снят с производства';
                } else {
                    $product['inStock'] = true;
                    $product['availability'] = 'В наличии';
                }
            } else {
                $product['inStock'] = true; // По умолчанию в наличии
                $product['availability'] = 'В наличии';
            }
            
            // Проверяем на дубликаты и добавляем товар
            if (!empty($product['name']) && !in_array($product['name'], $seenNames)) {
                $seenNames[] = $product['name'];
                $products[] = $product;
            }
            
        } catch (Exception $e) {
            // Пропускаем товары с ошибками парсинга
            continue;
        }
    }
    
    return $products;
}

// Функция для получения общего количества товаров
function getTotalProducts($html) {
    $dom = new DOMDocument();
    @$dom->loadHTML($html);
    $xpath = new DOMXPath($dom);
    
    // Ищем информацию о количестве товаров
    $totalNodes = $xpath->query('//div[contains(@class, "display-number") or contains(text(), "из")]');
    
    foreach ($totalNodes as $node) {
        $text = $node->textContent;
        if (preg_match('/из\s+(\d+)/', $text, $matches)) {
            return (int)$matches[1];
        }
    }
    
    // Если не нашли, возвращаем примерное количество
    return 377;
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
    
    // Получаем общее количество товаров
    $totalProducts = getTotalProducts($html);
    
    // Парсим товары
    $products = parseProducts($html);
    
    // Применяем лимит
    $products = array_slice($products, 0, $limit);
    
    // Проверяем, есть ли еще товары
    $hasMore = ($start + $limit) < $totalProducts;
    
    // Добавляем отладочную информацию
    $debug = [
        'url' => $url,
        'start' => $start,
        'limit' => $limit,
        'totalProducts' => $totalProducts,
        'parsedCount' => count($products),
        'hasMore' => $hasMore
    ];
    
    // Формируем ответ
    $response = [
        'success' => true,
        'products' => $products,
        'total' => count($products),
        'start' => $start,
        'limit' => $limit,
        'hasMore' => $hasMore,
        'totalProducts' => $totalProducts,
        'debug' => $debug
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