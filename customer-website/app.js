var app = angular.module('flexnestApp', []);

app.controller('MainController', function($scope, $http, $timeout) {
    $scope.searchQuery = '';
    $scope.apiBase = 'http://localhost:3000/api';

    // --- Helper: user-specific localStorage keys ---
    function cartKey() {
        return $scope.currentUser ? 'flexnest_cart_' + $scope.currentUser.id : 'flexnest_cart_guest';
    }
    function wishlistKey() {
        return $scope.currentUser ? 'flexnest_wishlist_' + $scope.currentUser.id : 'flexnest_wishlist_guest';
    }

    // --- Load cart & wishlist ---
    function loadUserCart() {
        try {
            var savedCart = localStorage.getItem(cartKey());
            $scope.cart = (savedCart && savedCart !== "undefined") ? JSON.parse(savedCart) : [];
            
            var savedWish = localStorage.getItem(wishlistKey());
            $scope.wishlist = (savedWish && savedWish !== "undefined") ? JSON.parse(savedWish) : [];
        } catch (e) {
            console.error("Error loading cart:", e);
            $scope.cart = [];
            $scope.wishlist = [];
        }
    }

    // Temporary fix: Clear potentially corrupted storage once
    if (!sessionStorage.getItem('flexnest_reset_v1')) {
        localStorage.clear();
        sessionStorage.setItem('flexnest_reset_v1', 'true');
    }

    function saveCart() {
        localStorage.setItem(cartKey(), JSON.stringify($scope.cart));
    }

    function saveWishlist() {
        localStorage.setItem(wishlistKey(), JSON.stringify($scope.wishlist));
    }

    // --- Auth Logic ---
    $scope.currentUser = JSON.parse(sessionStorage.getItem('flexnest_user')) || null;
    $scope.authToken = sessionStorage.getItem('flexnest_token') || null;
    $scope.authMode = 'login';
    $scope.loginForm = {};
    $scope.registerForm = {};
    $scope.authLoading = false;
    $scope.authError = '';

    loadUserCart();
    
    $scope.authSubmit = function() {
        $scope.authLoading = true;
        $scope.authError = '';
        var endpoint = $scope.authMode === 'login' ? '/auth/login' : '/auth/register';
        var payload = $scope.authMode === 'login' ? angular.copy($scope.loginForm) : angular.copy($scope.registerForm);
        
        $http.post($scope.apiBase + endpoint, payload)
            .then(function(res) {
                // Node.js API returns { message, token, user } on login
                if (res.data.token || $scope.authMode === 'register') {
                    if ($scope.authMode === 'login') {
                        $scope.currentUser = res.data.user;
                        $scope.authToken = res.data.token;
                        sessionStorage.setItem('flexnest_user', JSON.stringify($scope.currentUser));
                        sessionStorage.setItem('flexnest_token', $scope.authToken);
                        loadUserCart();
                        $scope.getRecommendations();
                        document.getElementById('closeAuthModal').click();
                    } else {
                        // For register, switch to login
                        $scope.authMode = 'login';
                        $scope.authError = 'Registration successful! Please login.';
                        $scope.registerForm = {};
                    }
                } else {
                    $scope.authError = res.data.message || 'Authentication failed';
                }
            })
            .catch(function(err) {
                console.error("Auth error:", err);
                $scope.authError = err.data?.message || 'Server error. Is the Node.js backend running?';
            })
            .finally(function() {
                $scope.authLoading = false;
            });
    };
    
    $scope.logout = function() {
        $scope.currentUser = null;
        $scope.authToken = null;
        sessionStorage.removeItem('flexnest_user');
        sessionStorage.removeItem('flexnest_token');
        $scope.cart = [];
        $scope.wishlist = [];
        $scope.recommendations = [];
        if ($scope.isCheckoutView) {
            $scope.backToShop();
        }
    };

    // --- AI Recommendations ---
    $scope.recommendations = [];
    $scope.getRecommendations = function() {
        var config = {};
        if ($scope.authToken) {
            config.headers = { 'Authorization': 'Bearer ' + $scope.authToken };
        }

        $http.get($scope.apiBase + '/recommendations', config)
        .then(function(res) {
            $scope.recommendations = res.data;
        })
        .catch(function(err) {
            console.error("Recommendation error:", err);
        });
    };

    // Refresh recommendations when cart changes
    $scope.$watch('cart.length', function(newVal, oldVal) {
        if (newVal !== oldVal) {
            $scope.getRecommendations();
        }
    });

    // Load recommendations only if logged in
    if ($scope.authToken) {
        $scope.getRecommendations();
    }

    // --- AI Chatbot ---
    $scope.chatOpen = false;
    $scope.chatLoading = false;
    $scope.userMessage = '';
    $scope.chatHistory = [
        { type: 'bot', text: 'Hi! I am your FlexNest Assistant. How can I help you today? Try asking about shipping, returns, or tracking your latest order.' }
    ];

    $scope.sendMessage = function() {
        if (!$scope.userMessage.trim()) return;

        var msg = $scope.userMessage;
        $scope.chatHistory.push({ type: 'user', text: msg });
        $scope.userMessage = '';
        $scope.chatLoading = true;

        var config = {};
        if ($scope.authToken) {
            config.headers = { 'Authorization': 'Bearer ' + $scope.authToken };
        }

        $http.post($scope.apiBase + '/chat', { message: msg }, config)
            .then(function(res) {
                $scope.chatHistory.push({ type: 'bot', text: res.data.reply });
            })
            .catch(function() {
                $scope.chatHistory.push({ type: 'bot', text: 'Sorry, I am having trouble connecting right now.' });
            })
            .finally(function() {
                $scope.chatLoading = false;
                $scope.scrollToBottom();
            });
    };

    $scope.scrollToBottom = function() {
        $timeout(function() {
            var el = document.getElementById('chatMessages');
            if (el) el.scrollTop = el.scrollHeight;
        }, 100);
    };

    // --- Search Logic ---
    $scope.searchOpen = false;
    $scope.toggleSearch = function() {
        $scope.searchOpen = !$scope.searchOpen;
        if(!$scope.searchOpen) {
            $scope.searchQuery = '';
        } else {
            $timeout(function() {
                var el = document.getElementById('searchInput');
                if (el) el.focus();
            }, 100);
        }
    };

    // --- Product Fetching ---
    $scope.products = [];
    $scope.recentProducts = [];

    $http.get($scope.apiBase + '/products')
        .then(function(response) {
            $scope.products = response.data;
            // Sort by id descending as proxy for dateAdded
            var sorted = $scope.products.slice().sort(function(a, b) {
                return b.id - a.id;
            });
            $scope.recentProducts = sorted.slice(0, 8);
        })
        .catch(function(err) {
            console.error("Error fetching products:", err);
        });

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
            if(item.product.id === product.id) {
                item.quantity++;
                found = true;
            }
        });
        if(!found) {
            $scope.cart.push({ product: product, quantity: 1 });
        }
        saveCart();
    };

    $scope.removeFromCart = function(index) {
        $scope.cart.splice(index, 1);
        saveCart();
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
    
    $scope.isCheckoutView = false;
    $scope.orderSummary = null;
    $scope.orderPlaced = false;

    $scope.checkoutData = { paymentMethod: 'Online' };
    $scope.pendingCheckout = false;

    $scope.goToCheckout = function() {
        if($scope.cart.length > 0) {
            if (!$scope.currentUser) {
                $scope.pendingCheckout = true;
                $scope.authMode = 'login';
                var authModal = new bootstrap.Modal(document.getElementById('authModal'));
                authModal.show();
                return;
            }
            
            $scope.checkoutData.name = $scope.currentUser.name;
            $scope.checkoutData.email = $scope.currentUser.email;
            
            $scope.isCheckoutView = true;
            $scope.orderPlaced = false;
            window.scrollTo(0,0);
        }
    };

    $scope.backToShop = function() {
        $scope.isCheckoutView = false;
        $scope.orderPlaced = false;
        window.scrollTo(0,0);
    };

    $scope.processingOrder = false;

    $scope.placeOrder = function() {
        if($scope.cart.length > 0 && $scope.currentUser) {
            $scope.processingOrder = true;
            
            // Note: Updated to use Node.js Order API
            var payload = {
                total: $scope.getCartTotal(),
                address: $scope.checkoutData.address,
                paymentMethod: $scope.checkoutData.paymentMethod
            };
            
            $http.post($scope.apiBase + '/orders', payload, {
                headers: { 'Authorization': 'Bearer ' + $scope.authToken }
            })
            .then(function(res) {
                $scope.orderSummary = angular.copy($scope.cart);
                $scope.orderId = res.data.orderId;
                $scope.cart = [];
                saveCart();
                $scope.orderPlaced = true;
                window.scrollTo(0, 0);
                $scope.getRecommendations(); // Refresh after purchase
            })
            .catch(function(err) {
                console.error("Order error:", err);
                alert(err.data?.message || "Failed to place order.");
            })
            .finally(function() {
                $scope.processingOrder = false;
            });
        }
    };

    if (window.location.search.includes('checkout=true')) {
        $timeout(function() {
            $scope.goToCheckout();
        }, 100);
    }
});
