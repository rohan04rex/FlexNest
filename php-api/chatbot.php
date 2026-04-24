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
$userMessage = $input['message'] ?? '';
$conversationHistory = $input['conversation_history'] ?? [];

if (empty($userMessage)) {
    echo json_encode(['success' => false, 'message' => 'No message provided']);
    exit;
}

$GEMINI_API_KEY = 'AIzaSyB8nt_CUfQJDSB0yWtaRO-9xWda83TKRc8';

// ============================================================
// 1. Build Context: FAQs + Orders + Products
// ============================================================

$faqContext = "
FLEXNEST STORE FAQ:
• Shipping: Free shipping on orders over \$100. Standard delivery takes 5-7 business days. Express delivery (2-3 days) costs \$15.
• Returns: 30-day free return policy. Items must be unworn with tags attached. Refund processed within 5-7 business days after receiving the return.
• Sizing: We follow standard US sizing. Check our size guide: S (34-36), M (38-40), L (42-44), XL (46-48). When in between sizes, we recommend sizing up.
• Payment: We accept Online payment (UPI/Card via QR code) and Cash on Delivery (COD). All transactions are secure.
• Order Tracking: Customers can check their order status. Orders go through: Pending → Processing → Shipped → Delivered.
• Materials: We use premium cotton, silk, linen, and wool. All fabrics are ethically sourced.
• Care: Most items are machine washable on gentle cycle. Silk items should be dry cleaned. Check garment labels for specific care instructions.
• Contact: Email support@flexnest.com or use this chat for instant help.
• Store Hours: Online store is 24/7. Customer support available 9 AM - 9 PM IST.
• Discounts: Subscribe to our newsletter for exclusive deals. Seasonal sales happen quarterly.
";

// --- Fetch user's recent orders (if logged in) ---
$orderContext = "";
if ($userId) {
    try {
        $stmt = $pdo->prepare("
            SELECT o.id, o.total, o.status, o.date, o.address
            FROM orders o
            WHERE o.user_id = ?
            ORDER BY o.date DESC
            LIMIT 5
        ");
        $stmt->execute([$userId]);
        $orders = $stmt->fetchAll();

        if (!empty($orders)) {
            $orderContext = "\n\nUSER'S RECENT ORDERS (LIVE FROM DATABASE — these statuses are set by the admin from the dashboard):\n";
            $orderContext .= "Status flow: Pending → Processing → Shipped → Delivered\n\n";
            
            foreach ($orders as $order) {
                $orderDate = date('M d, Y h:i A', strtotime($order['date']));
                $orderContext .= "• Order #{$order['id']}: \${$order['total']} — Current Status: **{$order['status']}** — Placed: {$orderDate}\n";
                $orderContext .= "  Shipping Address: {$order['address']}\n";

                // Get payment info
                $stmtPay = $pdo->prepare("SELECT method, status FROM payments WHERE order_id = ? LIMIT 1");
                $stmtPay->execute([$order['id']]);
                $payment = $stmtPay->fetch();
                if ($payment) {
                    $orderContext .= "  Payment: {$payment['method']} — Payment Status: {$payment['status']}\n";
                }

                // Get order items
                $stmtItems = $pdo->prepare("
                    SELECT p.name, oi.quantity, oi.price
                    FROM order_items oi
                    JOIN products p ON oi.product_id = p.id
                    WHERE oi.order_id = ?
                ");
                $stmtItems->execute([$order['id']]);
                $items = $stmtItems->fetchAll();
                foreach ($items as $item) {
                    $orderContext .= "  - {$item['name']} (x{$item['quantity']}) — \${$item['price']}\n";
                }

                // Estimated delivery
                $orderTimestamp = strtotime($order['date']);
                switch ($order['status']) {
                    case 'Pending':
                        $est = date('M d, Y', $orderTimestamp + (7 * 86400));
                        $orderContext .= "  Estimated Delivery: {$est} (awaiting processing)\n";
                        break;
                    case 'Processing':
                        $est = date('M d, Y', $orderTimestamp + (5 * 86400));
                        $orderContext .= "  Estimated Delivery: {$est} (being prepared)\n";
                        break;
                    case 'Shipped':
                        $est = date('M d, Y', $orderTimestamp + (3 * 86400));
                        $orderContext .= "  Estimated Delivery: {$est} (in transit)\n";
                        break;
                    case 'Delivered':
                        $orderContext .= "  Status: Successfully delivered ✓\n";
                        break;
                    case 'Cancelled':
                        $orderContext .= "  Status: This order was cancelled\n";
                        break;
                }
                $orderContext .= "\n";
            }
        } else {
            $orderContext = "\n\nUSER HAS NO PREVIOUS ORDERS.\n";
        }
    } catch (Exception $e) {
        // Continue without order context
    }
}

// --- Fetch available products for suggestions ---
$productContext = "";
try {
    $stmt = $pdo->prepare("SELECT id, name, brand, price, gender, subcategory FROM products WHERE (status = 'Available' OR status IS NULL) ORDER BY date_added DESC LIMIT 20");
    $stmt->execute();
    $products = $stmt->fetchAll();

    if (!empty($products)) {
        $productContext = "\n\nAVAILABLE PRODUCTS IN STORE:\n";
        foreach ($products as $p) {
            $productContext .= "• {$p['name']} ({$p['brand']}) — \${$p['price']} — {$p['gender']} — {$p['subcategory']}\n";
        }
    }
} catch (Exception $e) {
    // Continue without product context
}

// ============================================================
// 2. Build the System Prompt
// ============================================================

$systemPrompt = "You are FlexBot, the AI shopping assistant for FlexNest — a premium fashion e-commerce store. You are friendly, helpful, and knowledgeable about fashion.

YOUR PERSONALITY:
- Warm, professional, and fashion-savvy
- Use emojis sparingly (1-2 per response max)
- Keep responses concise (2-4 sentences usually, unless the user needs detailed info)
- Be proactive — suggest related products when appropriate
- If you don't know something, say so honestly

YOUR CAPABILITIES:
1. Answer FAQ questions about shipping, returns, sizing, payments, etc.
2. Help track orders — provide REAL order status, items, payment method, and estimated delivery dates from the database
3. Suggest products based on user preferences
4. Provide styling advice and outfit recommendations
5. General customer service queries

ORDER TRACKING GUIDELINES:
- The order data below is LIVE from the backend database. The admin updates order statuses from the dashboard.
- Status pipeline: Pending → Processing → Shipped → Delivered
- When a user asks to track an order, provide: Order ID, current status, items ordered, payment method, and estimated delivery.
- Present the status clearly, for example: 'Your Order #5 is currently **Processing** — it's being prepared for shipment!'
- If the order is 'Pending', reassure the customer it will be processed soon.
- If 'Processing', tell them it's being packed and will ship soon.
- If 'Shipped', tell them it's on its way with the estimated delivery date.
- If 'Delivered', congratulate them and ask if everything arrived okay.
- If the user is NOT logged in (no order data available), politely ask them to log in first to track orders.
- Always use the EXACT status from the data — never guess or make up order info.

RULES:
- Never make up order information. Only reference orders from the context provided.
- If a user asks about an order and they're not logged in (no order data), politely ask them to log in first.
- When suggesting products, mention specific product names and prices from the catalog.
- Don't discuss competitor brands or stores.
- All prices are in USD (\$).

{$faqContext}
{$orderContext}
{$productContext}";

// ============================================================
// 3. Build the Conversation for Gemini
// ============================================================

$geminiContents = [];

// Add system instruction as the first user-model exchange
$geminiContents[] = [
    'role' => 'user',
    'parts' => [['text' => $systemPrompt . "\n\nAcknowledge that you understand your role. Say nothing else."]]
];
$geminiContents[] = [
    'role' => 'model',
    'parts' => [['text' => "Understood. I'm FlexBot, ready to help with shopping, orders, and fashion advice at FlexNest."]]
];

// Add conversation history
foreach ($conversationHistory as $msg) {
    $role = ($msg['sender'] === 'user') ? 'user' : 'model';
    $geminiContents[] = [
        'role' => $role,
        'parts' => [['text' => $msg['text']]]
    ];
}

// Add the current user message
$geminiContents[] = [
    'role' => 'user',
    'parts' => [['text' => $userMessage]]
];

// ============================================================
// 4. Call Gemini API
// ============================================================

$geminiUrl = "https://generativelanguage.googleapis.com/v1beta/models/gemini-2.0-flash:generateContent?key={$GEMINI_API_KEY}";

$payload = json_encode([
    'contents' => $geminiContents,
    'generationConfig' => [
        'temperature' => 0.8,
        'maxOutputTokens' => 400,
        'topP' => 0.95
    ],
    'safetySettings' => [
        ['category' => 'HARM_CATEGORY_HARASSMENT', 'threshold' => 'BLOCK_ONLY_HIGH'],
        ['category' => 'HARM_CATEGORY_HATE_SPEECH', 'threshold' => 'BLOCK_ONLY_HIGH'],
        ['category' => 'HARM_CATEGORY_SEXUALLY_EXPLICIT', 'threshold' => 'BLOCK_ONLY_HIGH'],
        ['category' => 'HARM_CATEGORY_DANGEROUS_CONTENT', 'threshold' => 'BLOCK_ONLY_HIGH']
    ]
]);

$context = stream_context_create([
    'http' => [
        'method' => 'POST',
        'header' => "Content-Type: application/json\r\n",
        'content' => $payload,
        'timeout' => 20
    ]
]);

$geminiResponse = @file_get_contents($geminiUrl, false, $context);

if ($geminiResponse) {
    $geminiData = json_decode($geminiResponse, true);
    $botReply = $geminiData['candidates'][0]['content']['parts'][0]['text'] ?? null;

    if ($botReply) {
        echo json_encode([
            'success' => true,
            'reply' => trim($botReply)
        ]);
    } else {
        echo json_encode([
            'success' => true,
            'reply' => "I'm sorry, I couldn't process that. Could you try rephrasing your question? 😊"
        ]);
    }
} else {
    // Fallback responses if Gemini API is unavailable
    $lowerMsg = strtolower($userMessage);
    $fallbackReply = "I'm having trouble connecting right now. Please try again in a moment, or email us at support@flexnest.com for help!";

    if (strpos($lowerMsg, 'shipping') !== false || strpos($lowerMsg, 'delivery') !== false) {
        $fallbackReply = "🚚 We offer free shipping on orders over \$100! Standard delivery takes 5-7 business days, and express delivery (2-3 days) costs \$15.";
    } elseif (strpos($lowerMsg, 'return') !== false || strpos($lowerMsg, 'refund') !== false) {
        $fallbackReply = "↩️ We have a 30-day free return policy! Items must be unworn with original tags. Refunds are processed within 5-7 business days after we receive the return.";
    } elseif (strpos($lowerMsg, 'size') !== false || strpos($lowerMsg, 'sizing') !== false) {
        $fallbackReply = "📏 We follow standard US sizing: S (34-36), M (38-40), L (42-44), XL (46-48). When in between sizes, we recommend sizing up for comfort!";
    } elseif (strpos($lowerMsg, 'payment') !== false || strpos($lowerMsg, 'pay') !== false) {
        $fallbackReply = "💳 We accept Online payment (UPI/Card via QR code) and Cash on Delivery (COD). All transactions are fully secure!";
    } elseif (strpos($lowerMsg, 'order') !== false || strpos($lowerMsg, 'track') !== false) {
        // Fallback: actually query the database for order info
        if ($userId) {
            try {
                $stmtFb = $pdo->prepare("SELECT o.id, o.total, o.status, o.date FROM orders o WHERE o.user_id = ? ORDER BY o.date DESC LIMIT 3");
                $stmtFb->execute([$userId]);
                $fbOrders = $stmtFb->fetchAll();
                
                if (!empty($fbOrders)) {
                    $fallbackReply = "📦 Here are your recent orders:\n\n";
                    foreach ($fbOrders as $fbo) {
                        $fboDate = date('M d, Y', strtotime($fbo['date']));
                        $statusEmoji = '';
                        switch ($fbo['status']) {
                            case 'Pending': $statusEmoji = '⏳'; break;
                            case 'Processing': $statusEmoji = '📋'; break;
                            case 'Shipped': $statusEmoji = '🚚'; break;
                            case 'Delivered': $statusEmoji = '✅'; break;
                            default: $statusEmoji = '📦';
                        }
                        $fallbackReply .= "{$statusEmoji} Order #{$fbo['id']}: \${$fbo['total']} — {$fbo['status']} (placed {$fboDate})\n";
                    }
                } else {
                    $fallbackReply = "📦 You don't have any orders yet. Start shopping and place your first order!";
                }
            } catch (Exception $e) {
                $fallbackReply = "📦 To check your order status, please make sure you're logged in. Your orders go through stages: Pending → Processing → Shipped → Delivered.";
            }
        } else {
            $fallbackReply = "📦 Please log in first so I can look up your order status! Your orders go through stages: Pending → Processing → Shipped → Delivered.";
        }
    } elseif (strpos($lowerMsg, 'hello') !== false || strpos($lowerMsg, 'hi') !== false || strpos($lowerMsg, 'hey') !== false) {
        $fallbackReply = "Hey there! 👋 Welcome to FlexNest! I'm FlexBot, your personal shopping assistant. How can I help you today?";
    }

    echo json_encode([
        'success' => true,
        'reply' => $fallbackReply
    ]);
}
?>
