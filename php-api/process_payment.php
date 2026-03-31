<?php
header("Access-Control-Allow-Origin: *");
header("Access-Control-Allow-Methods: POST, OPTIONS");
header("Access-Control-Allow-Headers: Content-Type");
header('Content-Type: application/json');

if ($_SERVER['REQUEST_METHOD'] === 'OPTIONS') {
    exit(0);
}

require 'db.php';

$input = json_decode(file_get_contents('php://input'), true);

$userId = $input['user_id'] ?? null;
$cart = $input['cart'] ?? [];
$address = $input['address'] ?? '';
$paymentMethod = $input['payment_method'] ?? 'COD'; // "Online" or "COD"
$total = $input['total'] ?? 0;

if (!$userId || empty($cart)) {
    echo json_encode(['success' => false, 'message' => 'Invalid order data. Please log in first.']);
    exit;
}

try {
    $pdo->beginTransaction();

    // 1. Create Order
    $orderStatus = ($paymentMethod === 'Online') ? 'Processing' : 'Pending';
    $stmt = $pdo->prepare("INSERT INTO orders (user_id, total, status, address) VALUES (?, ?, ?, ?)");
    $stmt->execute([$userId, $total, $orderStatus, $address]);
    $orderId = $pdo->lastInsertId();

    // 2. Insert Order Items and Update Stock
    $stmtItem = $pdo->prepare("INSERT INTO order_items (order_id, product_id, quantity, price) VALUES (?, ?, ?, ?)");
    $stmtStock = $pdo->prepare("UPDATE products SET stock = stock - ? WHERE id = ?");
    
    foreach ($cart as $item) {
        $stmtItem->execute([
            $orderId, 
            $item['product']['id'], 
            $item['quantity'], 
            $item['product']['price']
        ]);
        
        $stmtStock->execute([$item['quantity'], $item['product']['id']]);
    }

    // 3. Create Payment Record
    $paymentStatus = ($paymentMethod === 'Online') ? 'Completed' : 'Pending';
    $stmtPay = $pdo->prepare("INSERT INTO payments (order_id, user_id, amount, method, status) VALUES (?, ?, ?, ?, ?)");
    $stmtPay->execute([$orderId, $userId, $total, $paymentMethod, $paymentStatus]);

    $pdo->commit();
    echo json_encode(['success' => true, 'order_id' => $orderId, 'message' => 'Payment & Order processed!']);
    
} catch (Exception $e) {
    $pdo->rollBack();
    echo json_encode(['success' => false, 'message' => 'Transaction failed: ' . $e->getMessage()]);
}
?>
