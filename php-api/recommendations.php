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
$cartItems = $input['cart_items'] ?? [];

// ============================================================
// 1. Gather User Preference Signals
// ============================================================

$purchasedProductIds = [];
$purchasedCategories = [];
$cartCategories = [];

// --- Signal A: Previous Purchases ---
if ($userId) {
    try {
        $stmt = $pdo->prepare("
            SELECT DISTINCT p.id, p.subcategory, p.gender, p.brand
            FROM order_items oi
            JOIN orders o ON oi.order_id = o.id
            JOIN products p ON oi.product_id = p.id
            WHERE o.user_id = ?
            ORDER BY o.date DESC
            LIMIT 50
        ");
        $stmt->execute([$userId]);
        $purchasedProducts = $stmt->fetchAll();

        foreach ($purchasedProducts as $pp) {
            $purchasedProductIds[] = $pp['id'];
            if ($pp['subcategory']) {
                $purchasedCategories[] = $pp['subcategory'];
            }
        }
    } catch (Exception $e) {
        // Silently continue — purchases not critical
    }
}

// --- Signal B: Cart Items ---
if (!empty($cartItems)) {
    foreach ($cartItems as $item) {
        $product = $item['product'] ?? $item;
        if (isset($product['subcategory'])) {
            $cartCategories[] = $product['subcategory'];
        }
        if (isset($product['id'])) {
            $purchasedProductIds[] = $product['id'];
        }
    }
}

// --- Signal C: Category Interest (combined) ---
$allInterests = array_unique(array_merge($purchasedCategories, $cartCategories));

// ============================================================
// 2. Fetch Candidate Products from DB
// ============================================================

try {
    // Get all available products
    $stmt = $pdo->prepare("SELECT id, name, brand, price, gender, subcategory, image, description FROM products WHERE status = 'Available' OR status IS NULL ORDER BY date_added DESC LIMIT 50");
    $stmt->execute();
    $allProducts = $stmt->fetchAll();
} catch (Exception $e) {
    echo json_encode(['success' => false, 'message' => 'Error fetching products: ' . $e->getMessage()]);
    exit;
}

// Filter out products the user already purchased or has in cart
$candidateProducts = [];
foreach ($allProducts as $product) {
    if (!in_array($product['id'], $purchasedProductIds)) {
        $candidateProducts[] = $product;
    }
}

// If we have very few candidates, include all products
if (count($candidateProducts) < 3) {
    $candidateProducts = $allProducts;
}

// ============================================================
// 3. Score Products Using Gemini AI
// ============================================================

$GEMINI_API_KEY = 'AIzaSyB8nt_CUfQJDSB0yWtaRO-9xWda83TKRc8';

// Build product list for Gemini
$productListText = "";
foreach ($candidateProducts as $idx => $p) {
    $productListText .= ($idx + 1) . ". ID:{$p['id']} | {$p['name']} | {$p['brand']} | \${$p['price']} | {$p['gender']} | {$p['subcategory']}\n";
}

$interestText = !empty($allInterests) ? implode(', ', $allInterests) : 'No specific interests yet (new user)';
$purchaseText = !empty($purchasedCategories) ? implode(', ', $purchasedCategories) : 'No previous purchases';
$cartText = !empty($cartCategories) ? implode(', ', $cartCategories) : 'Cart is empty';

$prompt = "You are a product recommendation engine for FlexNest, a fashion e-commerce store.

USER PROFILE:
- Previously purchased categories: {$purchaseText}
- Current cart categories: {$cartText}
- Overall interest categories: {$interestText}

AVAILABLE PRODUCTS:
{$productListText}

TASK: Select the top 6 best product recommendations for this user. Consider:
1. Products similar to their purchase history (cross-selling)
2. Products complementary to cart items (upselling)
3. Popular categories they haven't explored yet (discovery)
4. Price range diversity

RESPOND WITH ONLY a valid JSON array of objects, each with:
- \"id\": the product ID (number)
- \"reason\": a short 8-12 word reason why this is recommended

Example: [{\"id\": 5, \"reason\": \"Complements your recent outerwear purchase perfectly\"}]

Return ONLY the JSON array, no markdown, no code blocks, no extra text.";

// Call Gemini API
$geminiUrl = "https://generativelanguage.googleapis.com/v1beta/models/gemini-2.0-flash:generateContent?key={$GEMINI_API_KEY}";

$payload = json_encode([
    'contents' => [
        ['parts' => [['text' => $prompt]]]
    ],
    'generationConfig' => [
        'temperature' => 0.7,
        'maxOutputTokens' => 500
    ]
]);

$context = stream_context_create([
    'http' => [
        'method' => 'POST',
        'header' => "Content-Type: application/json\r\n",
        'content' => $payload,
        'timeout' => 15
    ]
]);

$geminiResponse = @file_get_contents($geminiUrl, false, $context);

$recommendedProducts = [];

if ($geminiResponse) {
    $geminiData = json_decode($geminiResponse, true);
    $responseText = $geminiData['candidates'][0]['content']['parts'][0]['text'] ?? '';

    // Clean response — strip markdown code blocks if present
    $responseText = trim($responseText);
    $responseText = preg_replace('/^```json\s*/i', '', $responseText);
    $responseText = preg_replace('/^```\s*/i', '', $responseText);
    $responseText = preg_replace('/\s*```$/', '', $responseText);
    $responseText = trim($responseText);

    $aiRankings = json_decode($responseText, true);

    if (is_array($aiRankings)) {
        // Build a lookup map of candidate products by ID
        $productMap = [];
        foreach ($candidateProducts as $p) {
            $productMap[$p['id']] = $p;
        }

        foreach ($aiRankings as $ranking) {
            $pid = $ranking['id'] ?? null;
            $reason = $ranking['reason'] ?? 'Recommended for you';

            if ($pid && isset($productMap[$pid])) {
                $product = $productMap[$pid];
                $product['ai_reason'] = $reason;
                $recommendedProducts[] = $product;
            }
        }
    }
}

// ============================================================
// 4. Fallback: If Gemini fails, do category-based matching
// ============================================================

if (empty($recommendedProducts)) {
    // Score products manually based on category overlap
    $scored = [];
    foreach ($candidateProducts as $product) {
        $score = 0;
        if (in_array($product['subcategory'], $allInterests)) {
            $score += 3;
        }
        if (in_array($product['subcategory'], $cartCategories)) {
            $score += 2;
        }
        $scored[] = ['product' => $product, 'score' => $score];
    }

    // Sort by score descending
    usort($scored, function ($a, $b) {
        return $b['score'] - $a['score'];
    });

    // Take top 6
    $topScored = array_slice($scored, 0, 6);
    foreach ($topScored as $s) {
        $product = $s['product'];
        $product['ai_reason'] = $s['score'] > 0 ? 'Based on your browsing interests' : 'Trending on FlexNest';
        $recommendedProducts[] = $product;
    }
}

echo json_encode([
    'success' => true,
    'recommendations' => array_slice($recommendedProducts, 0, 6),
    'signals' => [
        'purchase_categories' => array_values(array_unique($purchasedCategories)),
        'cart_categories' => array_values(array_unique($cartCategories)),
        'combined_interests' => array_values($allInterests)
    ]
]);
?>
