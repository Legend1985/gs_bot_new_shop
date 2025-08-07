<?php
// Тестовый файл для проверки API
header('Content-Type: text/html; charset=utf-8');

echo "<h1>Тест API для парсинга товаров</h1>";

// Тестируем разные страницы
$pages = [0, 60, 120, 180, 240, 300, 360];

foreach ($pages as $start) {
    echo "<h2>Страница с start={$start}</h2>";
    
    $url = "api.php?start={$start}&limit=10";
    $response = file_get_contents($url);
    $data = json_decode($response, true);
    
    if ($data['success']) {
        echo "<p><strong>URL:</strong> {$data['debug']['url']}</p>";
        echo "<p><strong>Всего товаров на сайте:</strong> {$data['totalProducts']}</p>";
        echo "<p><strong>Загружено товаров:</strong> {$data['total']}</p>";
        echo "<p><strong>Есть еще товары:</strong> " . ($data['hasMore'] ? 'Да' : 'Нет') . "</p>";
        
        echo "<h3>Товары:</h3>";
        echo "<ul>";
        foreach ($data['products'] as $index => $product) {
            echo "<li>";
            echo "<strong>{$product['name']}</strong><br>";
            echo "Изображение: {$product['image']}<br>";
            echo "Старая цена: {$product['oldPrice']} грн<br>";
            echo "Новая цена: {$product['newPrice']} грн<br>";
            echo "В наличии: " . ($product['inStock'] ? 'Да' : 'Нет');
            echo "</li>";
        }
        echo "</ul>";
        
        if (empty($data['products'])) {
            echo "<p style='color: orange;'>⚠️ На этой странице товары не найдены</p>";
        }
    } else {
        echo "<p style='color: red;'>Ошибка: {$data['error']}</p>";
    }
    
    echo "<hr>";
}

// Тест прямого парсинга
echo "<h2>Прямой тест парсинга</h2>";
$testUrl = "https://guitarstrings.com.ua/electro?start=60";
echo "<p>Тестируем URL: {$testUrl}</p>";

$ch = curl_init();
curl_setopt($ch, CURLOPT_URL, $testUrl);
curl_setopt($ch, CURLOPT_RETURNTRANSFER, true);
curl_setopt($ch, CURLOPT_FOLLOWLOCATION, true);
curl_setopt($ch, CURLOPT_USERAGENT, 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36');
curl_setopt($ch, CURLOPT_TIMEOUT, 30);
curl_setopt($ch, CURLOPT_SSL_VERIFYPEER, false);
$html = curl_exec($ch);
curl_close($ch);

if ($html) {
    echo "<p style='color: green;'>✅ HTML получен успешно</p>";
    echo "<p>Размер HTML: " . strlen($html) . " байт</p>";
    
    // Ищем товары в HTML
    if (preg_match_all('/<div[^>]*class="[^"]*product[^"]*"[^>]*>/i', $html, $matches)) {
        echo "<p>Найдено товарных блоков: " . count($matches[0]) . "</p>";
    }
    
    if (preg_match_all('/<img[^>]*src="[^"]*product[^"]*"[^>]*>/i', $html, $matches)) {
        echo "<p>Найдено изображений товаров: " . count($matches[0]) . "</p>";
    }
    
    if (preg_match_all('/Цена:\s*(\d+)\s*грн/i', $html, $matches)) {
        echo "<p>Найдено цен: " . count($matches[1]) . "</p>";
    }
} else {
    echo "<p style='color: red;'>❌ Ошибка получения HTML</p>";
}
?> 