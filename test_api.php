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
        echo "<p><strong>Всего товаров на сайте:</strong> {$data['totalProducts']}</p>";
        echo "<p><strong>Загружено товаров:</strong> {$data['total']}</p>";
        echo "<p><strong>Есть еще товары:</strong> " . ($data['hasMore'] ? 'Да' : 'Нет') . "</p>";
        
        echo "<h3>Товары:</h3>";
        echo "<ul>";
        foreach ($data['products'] as $product) {
            echo "<li>";
            echo "<strong>{$product['name']}</strong><br>";
            echo "Изображение: {$product['image']}<br>";
            echo "Старая цена: {$product['oldPrice']} грн<br>";
            echo "Новая цена: {$product['newPrice']} грн<br>";
            echo "В наличии: " . ($product['inStock'] ? 'Да' : 'Нет');
            echo "</li>";
        }
        echo "</ul>";
    } else {
        echo "<p style='color: red;'>Ошибка: {$data['error']}</p>";
    }
    
    echo "<hr>";
}
?> 