var app = angular.module('flexnestShop', []);

app.controller('ShopController', function($scope, $http, $timeout) {

    // Gender & Subcategory config
    $scope.genderCategories = {
        'Men': ['All', 'Tshirt', 'Shirt', 'Pants', 'Outerwear'],
        'Women': ['All', 'Tops', 'Pants', 'Dresses', 'Outerwear', 'Traditional']
    };

    $scope.currentGender = 'Men';
    $scope.currentSubcategory = 'All';
    $scope.searchQuery = '';
    $scope.searchOpen = false;
    $scope.loading = true;
    $scope.priceRange = 'all';

    // --- Cleanup old shared keys (one-time migration) ---
    localStorage.removeItem('flexnest_cart');
    localStorage.removeItem('flexnest_wishlist');

    // --- Helper: user-specific localStorage keys ---
    function cartKey() {
        return $scope.currentUser ? 'flexnest_cart_' + $scope.currentUser.id : 'flexnest_cart_guest';
    }
    function wishlistKey() {
        return $scope.currentUser ? 'flexnest_wishlist_' + $scope.currentUser.id : 'flexnest_wishlist_guest';
    }

    // --- Auth: restore session ---
    $scope.currentUser = JSON.parse(sessionStorage.getItem('flexnest_user')) || null;
    $scope.authMode = 'login';
    $scope.loginForm = {};
    $scope.registerForm = {};
    $scope.authLoading = false;
    $scope.authError = '';

    $scope.authSubmit = function() {
        $scope.authLoading = true;
        $scope.authError = '';
        var payload = $scope.authMode === 'login' ? angular.copy($scope.loginForm) : angular.copy($scope.registerForm);
        payload.action = $scope.authMode;

        $http.post('../php-api/auth.php', payload)
            .then(function(res) {
                if (res.data.success) {
                    $scope.currentUser = res.data.user;
                    sessionStorage.setItem('flexnest_user', JSON.stringify($scope.currentUser));
                    loadUserCart();
                    document.getElementById('closeAuthModal').click();
                    $scope.loginForm = {};
                    $scope.registerForm = {};
                } else {
                    $scope.authError = res.data.message || 'Authentication failed';
                }
            })
            .catch(function(err) {
                console.error("Auth error:", err);
                $scope.authError = 'Server error during authentication. Is XAMPP Apache running?';
            })
            .finally(function() {
                $scope.authLoading = false;
            });
    };

    $scope.logout = function() {
        $scope.currentUser = null;
        sessionStorage.removeItem('flexnest_user');
        $scope.cart = [];
        $scope.wishlist = [];
    };

    // --- Load cart & wishlist ---
    function loadUserCart() {
        $scope.cart = JSON.parse(localStorage.getItem(cartKey())) || [];
        $scope.wishlist = JSON.parse(localStorage.getItem(wishlistKey())) || [];
    }

    function saveCart() {
        localStorage.setItem(cartKey(), JSON.stringify($scope.cart));
    }

    function saveWishlist() {
        localStorage.setItem(wishlistKey(), JSON.stringify($scope.wishlist));
    }

    // Initial load
    loadUserCart();

    // Listen for session changes from other tabs/pages (e.g. login on index.html)
    window.addEventListener('storage', function(e) {
        if (e.key === 'flexnest_user') {
            $scope.$apply(function() {
                $scope.currentUser = JSON.parse(sessionStorage.getItem('flexnest_user')) || null;
                loadUserCart();
            });
        }
    });

    // Mock products (fallback when API is unavailable)
    var mockProducts = [
        // Men — Tshirt
        { id: 1, name: 'BLACK COTTON T-SHIRT', brand: 'FLEXNEST', price: 49.00, gender: 'Men', subcategory: 'Tshirt', image: 'https://images.unsplash.com/photo-1521572163474-6864f9cf17ab?q=80&w=800&auto=format&fit=crop', description: 'Premium black cotton tee with a relaxed fit.' },
        { id: 2, name: 'UNICORN CREST TEE', brand: 'FLEXNEST', price: 59.00, gender: 'Men', subcategory: 'Tshirt', image: 'https://images.unsplash.com/photo-1503341455253-b2e723bb3dbb?q=80&w=800&auto=format&fit=crop', description: 'Statement tee with signature crest print.' },
        { id: 3, name: 'LEMONADE T-SHIRT', brand: 'FLEXNEST', price: 45.00, gender: 'Men', subcategory: 'Tshirt', image: 'https://images.unsplash.com/photo-1583743814966-8936f5b7be1a?q=80&w=800&auto=format&fit=crop', description: 'Fresh yellow cotton tee for summer days.' },
        // Men — Shirt
        { id: 4, name: 'OXFORD CLASSIC SHIRT', brand: 'FLEXNEST', price: 79.00, gender: 'Men', subcategory: 'Shirt', image: 'https://images.unsplash.com/photo-1596755094514-f87e34085b2c?q=80&w=800&auto=format&fit=crop', description: 'Timeless oxford button-down for every occasion.' },
        { id: 5, name: 'LINEN COASTAL SHIRT', brand: 'FLEXNEST', price: 89.00, gender: 'Men', subcategory: 'Shirt', image: 'https://images.unsplash.com/photo-1603252109303-2751441dd157?q=80&w=800&auto=format&fit=crop', description: 'Breathable linen shirt for coastal vibes.' },
        // Men — Pants
        { id: 6, name: 'SLIM FIT CHINOS', brand: 'FLEXNEST', price: 69.00, gender: 'Men', subcategory: 'Pants', image: 'https://images.unsplash.com/photo-1473966968600-fa801b869a1a?q=80&w=800&auto=format&fit=crop', description: 'Modern slim fit chinos in khaki.' },
        { id: 7, name: 'DARK DENIM JEANS', brand: 'FLEXNEST', price: 89.00, gender: 'Men', subcategory: 'Pants', image: 'https://images.unsplash.com/photo-1542272604-787c3835535d?q=80&w=800&auto=format&fit=crop', description: 'Classic dark wash denim with stretch comfort.' },
        // Men — Outerwear
        { id: 8, name: 'SYRACUSE WOOL VARSITY', brand: 'FLEXNEST', price: 149.00, gender: 'Men', subcategory: 'Outerwear', image: 'https://images.unsplash.com/photo-1591047139829-d91aecb6caea?q=80&w=800&auto=format&fit=crop', description: 'Premium wool varsity jacket with leather sleeves.' },
        { id: 9, name: 'ALBATA BLACK JACKET', brand: 'FLEXNEST', price: 129.00, gender: 'Men', subcategory: 'Outerwear', image: 'https://images.unsplash.com/photo-1551028719-00167b16eac5?q=80&w=800&auto=format&fit=crop', description: 'Sleek black bomber jacket for urban style.' },
        { id: 10, name: 'UNN OFFWHITE COAT', brand: 'FLEXNEST', price: 199.00, gender: 'Men', subcategory: 'Outerwear', image: 'https://images.unsplash.com/photo-1544441893-675973e31985?q=80&w=800&auto=format&fit=crop', description: 'Elegant off-white overcoat for layered looks.' },

        // Women — Tops
        { id: 11, name: 'SILK BLOUSE IVORY', brand: 'FLEXNEST', price: 89.00, gender: 'Women', subcategory: 'Tops', image: 'https://images.unsplash.com/photo-1564257631407-4deb1f99d992?q=80&w=800&auto=format&fit=crop', description: 'Elegant ivory silk blouse with a relaxed drape.' },
        { id: 12, name: 'CROPPED KNIT TOP', brand: 'FLEXNEST', price: 55.00, gender: 'Women', subcategory: 'Tops', image: 'https://images.unsplash.com/photo-1525450824786-227cbef70703?q=80&w=800&auto=format&fit=crop', description: 'Soft knitted crop top in blush pink.' },
        { id: 13, name: 'RIBBED TANK TOP', brand: 'FLEXNEST', price: 35.00, gender: 'Women', subcategory: 'Tops', image: 'https://images.unsplash.com/photo-1597633125184-9fd7e54fcaa3?q=80&w=800&auto=format&fit=crop', description: 'Essential ribbed tank in classic white.' },
        // Women — Pants
        { id: 14, name: 'HIGH WAIST TROUSERS', brand: 'FLEXNEST', price: 79.00, gender: 'Women', subcategory: 'Pants', image: 'https://images.unsplash.com/photo-1594938298603-c8148c4dae35?q=80&w=800&auto=format&fit=crop', description: 'Tailored high waist trousers in beige.' },
        { id: 15, name: 'WIDE LEG PALAZZO', brand: 'FLEXNEST', price: 85.00, gender: 'Women', subcategory: 'Pants', image: 'https://images.unsplash.com/photo-1509631179647-0177331693ae?q=80&w=800&auto=format&fit=crop', description: 'Flowy wide-leg palazzo pants for comfort and style.' },
        // Women — Dresses
        { id: 16, name: 'FLORAL MIDI DRESS', brand: 'FLEXNEST', price: 119.00, gender: 'Women', subcategory: 'Dresses', image: 'https://images.unsplash.com/photo-1572804013309-59a88b7e92f1?q=80&w=800&auto=format&fit=crop', description: 'Beautiful floral print midi dress for sunny days.' },
        { id: 17, name: 'SATIN EVENING GOWN', brand: 'FLEXNEST', price: 199.00, gender: 'Women', subcategory: 'Dresses', image: 'https://images.unsplash.com/photo-1566174053879-31528523f8ae?q=80&w=800&auto=format&fit=crop', description: 'Luxurious satin gown for special occasions.' },
        // Women — Outerwear
        { id: 18, name: 'CAMEL TRENCH COAT', brand: 'FLEXNEST', price: 179.00, gender: 'Women', subcategory: 'Outerwear', image: 'https://images.unsplash.com/photo-1548624313-0396c75e4b1a?q=80&w=800&auto=format&fit=crop', description: 'Classic camel trench coat with belted waist.' },
        { id: 19, name: 'CROPPED PUFFER', brand: 'FLEXNEST', price: 139.00, gender: 'Women', subcategory: 'Outerwear', image: 'https://images.unsplash.com/photo-1544022613-e87ca75a784a?q=80&w=800&auto=format&fit=crop', description: 'Trendy cropped puffer in soft pink.' },
        // Women — Traditional
        { id: 20, name: 'EMBROIDERED KURTA', brand: 'FLEXNEST', price: 99.00, gender: 'Women', subcategory: 'Traditional', image: 'https://images.unsplash.com/photo-1583391733956-6c78276477e2?q=80&w=800&auto=format&fit=crop', description: 'Beautifully embroidered cotton kurta in white.' },
        { id: 21, name: 'SILK SAREE ROSE', brand: 'FLEXNEST', price: 249.00, gender: 'Women', subcategory: 'Traditional', image: 'https://images.unsplash.com/photo-1610030469983-98e550d6193c?q=80&w=800&auto=format&fit=crop', description: 'Elegant rose silk saree with golden border.' }
    ];

    // Fetch products from API or use mock data
    $scope.products = [];

    $scope.loadProducts = function() {
        $scope.loading = true;
        $http.get('https://flexnest-production.up.railway.app/api/products')
            .then(function(response) {
                $scope.products = response.data;
                $scope.loading = false;
            })
            .catch(function() {
                // API unavailable, use mock data
                $scope.products = mockProducts;
                $scope.loading = false;
            });
    };

    $scope.loadProducts();

    // Toggle search
    $scope.toggleSearch = function() {
        $scope.searchOpen = !$scope.searchOpen;
        if (!$scope.searchOpen) {
            $scope.searchQuery = '';
        } else {
            $timeout(function() {
                var el = document.getElementById('shopSearchInput');
                if (el) el.focus();
            }, 100);
        }
    };

    // Gender switching
    $scope.setGender = function(gender) {
        $scope.currentGender = gender;
        $scope.currentSubcategory = 'All';
    };

    // Subcategory switching
    $scope.setSubcategory = function(sub) {
        $scope.currentSubcategory = sub;
    };

    // Price range
    $scope.setPriceRange = function(range) {
        $scope.priceRange = range;
    };

    // Clear all filters
    $scope.clearAllFilters = function() {
        $scope.currentSubcategory = 'All';
        $scope.priceRange = 'all';
        $scope.searchQuery = '';
    };

    // Get current subcategories based on gender
    $scope.getSubcategories = function() {
        return $scope.genderCategories[$scope.currentGender] || [];
    };

    // Get count of products in a subcategory for current gender
    $scope.getCategoryCount = function(sub) {
        var count = 0;
        angular.forEach($scope.products, function(p) {
            if (p.gender === $scope.currentGender && p.subcategory === sub) count++;
        });
        return count;
    };

    // Price range checker
    function matchesPriceRange(price, range) {
        switch(range) {
            case 'under50': return price < 50;
            case '50to100': return price >= 50 && price <= 100;
            case '100to200': return price > 100 && price <= 200;
            case 'over200': return price > 200;
            default: return true;
        }
    }

    // Product filter
    $scope.filterProducts = function(product) {
        var matchGender = product.gender === $scope.currentGender;
        var matchSub = $scope.currentSubcategory === 'All' || product.subcategory === $scope.currentSubcategory;
        var matchPrice = matchesPriceRange(product.price, $scope.priceRange);
        var matchSearch = true;

        if ($scope.searchQuery && $scope.searchQuery.trim() !== '') {
            var q = $scope.searchQuery.toLowerCase();
            matchSearch = product.name.toLowerCase().includes(q) || 
                          product.brand.toLowerCase().includes(q) ||
                          product.subcategory.toLowerCase().includes(q);
        }

        return matchGender && matchSub && matchPrice && matchSearch;
    };

    // Get filtered count
    $scope.getFilteredCount = function() {
        var count = 0;
        angular.forEach($scope.products, function(p) {
            if ($scope.filterProducts(p)) count++;
        });
        return count;
    };

    $scope.toggleWishlist = function(product) {
        var index = $scope.wishlist.findIndex(function(item) {
            return item.id === product.id;
        });
        if (index > -1) {
            $scope.wishlist.splice(index, 1);
        } else {
            $scope.wishlist.push(product);
        }
        saveWishlist();
    };

    $scope.isInWishlist = function(product) {
        return $scope.wishlist.some(function(item) {
            return item.id === product.id;
        });
    };

    $scope.removeFromWishlist = function(index) {
        $scope.wishlist.splice(index, 1);
        saveWishlist();
    };
    
    $scope.getWishlistCount = function() {
        return $scope.wishlist.length;
    };

    $scope.addToCart = function(product) {
        var found = false;
        angular.forEach($scope.cart, function(item) {
            if (item.product.id === product.id) {
                item.quantity++;
                found = true;
            }
        });
        if (!found) {
            $scope.cart.push({ product: product, quantity: 1 });
        }
        saveCart();
    };

    $scope.removeFromCart = function(index) {
        $scope.cart.splice(index, 1);
        saveCart();
    };
    
    $scope.goToCheckout = function() {
        if ($scope.cart.length > 0) {
            window.location.href = 'index.html?checkout=true';
        }
    };

    $scope.getCartCount = function() {
        var count = 0;
        angular.forEach($scope.cart, function(item) {
            count += item.quantity;
        });
        return count;
    };

    $scope.getCartTotal = function() {
        var total = 0;
        angular.forEach($scope.cart, function(item) {
            total += (item.product.price * item.quantity);
        });
        return total;
    };

    // ============================================================
    // AI FEATURE 1: Product Recommendations (Sidebar)
    // ============================================================
    $scope.recommendations = [];
    $scope.recommendationsLoading = false;

    $scope.loadRecommendations = function() {
        $scope.recommendationsLoading = true;
        var payload = {
            user_id: $scope.currentUser ? $scope.currentUser.id : null,
            cart_items: $scope.cart || []
        };

        $http.post('../php-api/recommendations.php', payload)
            .then(function(res) {
                if (res.data.success && res.data.recommendations) {
                    $scope.recommendations = res.data.recommendations.slice(0, 3);
                }
            })
            .catch(function(err) {
                console.error('Recommendations error:', err);
            })
            .finally(function() {
                $scope.recommendationsLoading = false;
            });
    };

    $timeout(function() {
        $scope.loadRecommendations();
    }, 1500);

    // ============================================================
    // AI FEATURE 2: Chatbot
    // ============================================================
    $scope.chatOpen = false;
    $scope.chatMessages = [];
    $scope.chatInput = '';
    $scope.chatSending = false;
    $scope.chatShowLabel = true;

    $scope.chatMessages.push({
        sender: 'bot',
        text: "Hey there! 👋 I'm FlexBot, your personal shopping assistant. Need help finding the perfect outfit?"
    });

    $scope.toggleChat = function() {
        $scope.chatOpen = !$scope.chatOpen;
        $scope.chatShowLabel = false;
        if ($scope.chatOpen) {
            $timeout(function() {
                $scope.scrollChatToBottom();
                var input = document.getElementById('chatbotInput');
                if (input) input.focus();
            }, 100);
        }
    };

    $scope.scrollChatToBottom = function() {
        $timeout(function() {
            var msgContainer = document.getElementById('chatbotMessages');
            if (msgContainer) {
                msgContainer.scrollTop = msgContainer.scrollHeight;
            }
        }, 50);
    };

    $scope.sendChatMessage = function() {
        var msg = ($scope.chatInput || '').trim();
        if (!msg || $scope.chatSending) return;

        $scope.chatMessages.push({ sender: 'user', text: msg });
        $scope.chatInput = '';
        $scope.chatSending = true;
        $scope.scrollChatToBottom();

        var history = [];
        var recentMessages = $scope.chatMessages.slice(-11, -1);
        angular.forEach(recentMessages, function(m) {
            history.push({ sender: m.sender, text: m.text });
        });

        var payload = {
            user_id: $scope.currentUser ? $scope.currentUser.id : null,
            message: msg,
            conversation_history: history
        };

        $http.post('../php-api/chatbot.php', payload)
            .then(function(res) {
                if (res.data.success && res.data.reply) {
                    $scope.chatMessages.push({ sender: 'bot', text: res.data.reply });
                } else {
                    $scope.chatMessages.push({ sender: 'bot', text: "Sorry, I couldn't process that. Please try again!" });
                }
            })
            .catch(function(err) {
                console.error('Chatbot error:', err);
                $scope.chatMessages.push({ sender: 'bot', text: "I'm having trouble connecting right now. Please try again in a moment! 😊" });
            })
            .finally(function() {
                $scope.chatSending = false;
                $scope.scrollChatToBottom();
            });
    };

    $scope.sendQuickAction = function(action) {
        $scope.chatInput = action;
        $scope.sendChatMessage();
    };

    $scope.handleChatKeypress = function(event) {
        if (event.keyCode === 13) {
            $scope.sendChatMessage();
        }
    };

    $scope.addRecommendedToCart = function(product) {
        $scope.addToCart(product);
    };
});

