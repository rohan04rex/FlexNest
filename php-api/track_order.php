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
$orderId = $input['order_id'] ?? null; // Optional: track specific order

if (!$userId) {
    echo json_encode(['success' => false, 'message' => 'Please log in to track your orders.']);
    exit;
}

try {
    // If a specific order ID is requested
    if ($orderId) {
        $stmt = $pdo->prepare("
            SELECT o.id, o.total, o.status, o.date, o.address,
                   p.name as payment_method, p.status as payment_status
            FROM orders o
            LEFT JOIN payments p ON p.order_id = o.id
            WHERE o.id = ? AND o.user_id = ?
        ");
        $stmt->execute([$orderId, $userId]);
        $order = $stmt->fetch();

        if (!$order) {
            echo json_encode(['success' => false, 'message' => 'Order not found.']);
            exit;
        }

        // Get order items
        $stmtItems = $pdo->prepare("
            SELECT oi.quantity, oi.price, p.name, p.image, p.brand
            FROM order_items oi
            JOIN products p ON oi.product_id = p.id
            WHERE oi.order_id = ?
        ");
        $stmtItems->execute([$orderId]);
        $items = $stmtItems->fetchAll();

        // Build timeline based on status
        $timeline = [];
        $statusOrder = ['Pending', 'Processing', 'Shipped', 'Delivered'];
        $currentIndex = array_search($order['status'], $statusOrder);
        if ($currentIndex === false) $currentIndex = -1;

        foreach ($statusOrder as $idx => $s) {
            $timeline[] = [
                'status' => $s,
                'completed' => $idx <= $currentIndex,
                'current' => $idx === $currentIndex
            ];
        }

        // Estimated delivery based on status
        $orderDate = strtotime($order['date']);
        $estimatedDelivery = '';
        switch ($order['status']) {
            case 'Pending':
                $estimatedDelivery = date('M d, Y', $orderDate + (7 * 86400));
                break;
            case 'Processing':
                $estimatedDelivery = date('M d, Y', $orderDate + (5 * 86400));
                break;
            case 'Shipped':
                $estimatedDelivery = date('M d, Y', $orderDate + (3 * 86400));
                break;
            case 'Delivered':
                $estimatedDelivery = 'Delivered';
                break;
            default:
                $estimatedDelivery = 'N/A';
        }

        echo json_encode([
            'success' => true,
            'order' => [
                'id' => $order['id'],
                'total' => $order['total'],
                'status' => $order['status'],
                'date' => date('M d, Y h:i A', strtotime($order['date'])),
                'address' => $order['address'],
                'payment_method' => $order['payment_method'] ?? 'N/A',
                'payment_status' => $order['payment_status'] ?? 'N/A',
                'estimated_delivery' => $estimatedDelivery,
                'items' => $items,
                'timeline' => $timeline
            ]
        ]);

    } else {
        // Get all recent orders for this user
        $stmt = $pdo->prepare("
            SELECT o.id, o.total, o.status, o.date, o.address
            FROM orders o
            WHERE o.user_id = ?
            ORDER BY o.date DESC
            LIMIT 10
        ");
        $stmt->execute([$userId]);
        $orders = $stmt->fetchAll();

        $orderList = [];
        foreach ($orders as $order) {
            // Get item count for each order
            $stmtCount = $pdo->prepare("SELECT COUNT(*) as item_count, SUM(quantity) as total_items FROM order_items WHERE order_id = ?");
            $stmtCount->execute([$order['id']]);
            $counts = $stmtCount->fetch();

            // Get item names
            $stmtNames = $pdo->prepare("
                SELECT p.name FROM order_items oi 
                JOIN products p ON oi.product_id = p.id 
                WHERE oi.order_id = ? LIMIT 3
            ");
            $stmtNames->execute([$order['id']]);
            $itemNames = $stmtNames->fetchAll(PDO::FETCH_COLUMN);

            $orderList[] = [
                'id' => $order['id'],
                'total' => $order['total'],
                'status' => $order['status'],
                'date' => date('M d, Y', strtotime($order['date'])),
                'item_count' => $counts['total_items'] ?? 0,
                'item_preview' => implode(', ', $itemNames)
            ];
        }

        echo json_encode([
            'success' => true,
            'orders' => $orderList
        ]);
    }

} catch (Exception $e) {
    echo json_encode(['success' => false, 'message' => 'Error tracking order: ' . $e->getMessage()]);
}
?>
