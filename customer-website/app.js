var app = angular.module('flexnestApp', []);

app.controller('MainController', function($scope, $http, $timeout) {
    $scope.searchQuery = '';

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

    // --- Auth Logic ---
    $scope.currentUser = JSON.parse(sessionStorage.getItem('flexnest_user')) || null;
    $scope.authMode = 'login';
    $scope.loginForm = {};
    $scope.registerForm = {};
    $scope.authLoading = false;
    $scope.authError = '';

    // Load cart for the restored session (if any)
    loadUserCart();
    
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
                    // Load this user's cart & wishlist
                    loadUserCart();
                    document.getElementById('closeAuthModal').click();
                    $scope.loginForm = {};
                    $scope.registerForm = {};
                    
                    if ($scope.pendingCheckout) {
                        $scope.goToCheckout();
                        $scope.pendingCheckout = false;
                    }
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
        // Clear in-memory cart & wishlist (data stays in localStorage for next login)
        $scope.cart = [];
        $scope.wishlist = [];
        if ($scope.isCheckoutView) {
            $scope.backToShop();
        }
    };
    // ------------------
    
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

    // --- Contact Us Logic ---
    $scope.contactForm = {
        name: '',
        email: '',
        message: ''
    };
    $scope.contactLoading = false;
    $scope.contactSuccessMsg = '';
    $scope.contactErrorMsg = '';

    $scope.submitContact = function() {
        $scope.contactSuccessMsg = '';
        $scope.contactErrorMsg = '';

        if (!$scope.currentUser) {
            $scope.contactErrorMsg = 'Please log in to send a message.';
            return;
        }

        $scope.contactLoading = true;

        $http.post('https://flexnest-production.up.railway.app/api/contact', $scope.contactForm)
            .then(function(res) {
                if (res.data.success) {
                    $scope.contactSuccessMsg = res.data.message;
                    $scope.contactForm = { name: '', email: '', message: '' }; // reset form
                } else {
                    $scope.contactErrorMsg = res.data.message || 'Failed to submit message.';
                }
            })
            .catch(function(err) {
                console.error("Contact submit error:", err);
                $scope.contactErrorMsg = 'Server error during submission. Please try again later.';
            })
            .finally(function() {
                $scope.contactLoading = false;
            });
    };

    // Mock products with dateAdded for "recently added" sorting
    var mockProducts = [
        { id: 1, name: 'BLACK COTTON T-SHIRT', brand: 'FLEXNEST', price: 49.00, image: 'https://images.unsplash.com/photo-1521572163474-6864f9cf17ab?q=80&w=2000&auto=format&fit=crop', gender: 'Men', subcategory: 'Tshirt', dateAdded: '2026-03-23' },
        { id: 2, name: 'UNICORN CREST', brand: 'FLEXNEST', price: 59.00, image: 'https://images.unsplash.com/photo-1503341455253-b2e723bb3dbb?q=80&w=2000&auto=format&fit=crop', gender: 'Men', subcategory: 'Tshirt', dateAdded: '2026-03-22' },
        { id: 3, name: 'SYRACUSE WOOL VARSITY', brand: 'FLEXNEST', price: 149.00, image: 'https://images.unsplash.com/photo-1591047139829-d91aecb6caea?q=80&w=2000&auto=format&fit=crop', gender: 'Men', subcategory: 'Outerwear', dateAdded: '2026-03-21' },
        { id: 4, name: 'SILK BLOUSE IVORY', brand: 'FLEXNEST', price: 89.00, image: 'https://images.unsplash.com/photo-1564257631407-4deb1f99d992?q=80&w=800&auto=format&fit=crop', gender: 'Women', subcategory: 'Tops', dateAdded: '2026-03-23' },
        { id: 5, name: 'FLORAL MIDI DRESS', brand: 'FLEXNEST', price: 119.00, image: 'https://images.unsplash.com/photo-1572804013309-59a88b7e92f1?q=80&w=800&auto=format&fit=crop', gender: 'Women', subcategory: 'Dresses', dateAdded: '2026-03-22' },
        { id: 6, name: 'CAMEL TRENCH COAT', brand: 'FLEXNEST', price: 179.00, image: 'https://images.unsplash.com/photo-1548624313-0396c75e4b1a?q=80&w=800&auto=format&fit=crop', gender: 'Women', subcategory: 'Outerwear', dateAdded: '2026-03-20' },
        { id: 7, name: 'DARK DENIM JEANS', brand: 'FLEXNEST', price: 89.00, image: 'https://images.unsplash.com/photo-1542272604-787c3835535d?q=80&w=800&auto=format&fit=crop', gender: 'Men', subcategory: 'Pants', dateAdded: '2026-03-21' },
        { id: 8, name: 'EMBROIDERED KURTA', brand: 'FLEXNEST', price: 99.00, image: 'https://images.unsplash.com/photo-1583391733956-6c78276477e2?q=80&w=800&auto=format&fit=crop', gender: 'Women', subcategory: 'Traditional', dateAdded: '2026-03-23' },
    ];

    $scope.products = [];
    $scope.recentProducts = [];

    // Fetch from API or use mock data, then pick 8 most recent
    $http.get('https://flexnest-production.up.railway.app/api/products')
        .then(function(response) {
            $scope.products = response.data;
        })
        .catch(function() {
            $scope.products = mockProducts;
        })
        .finally(function() {
            // Sort by dateAdded descending and take 8
            var sorted = $scope.products.slice().sort(function(a, b) {
                return (b.dateAdded || '').localeCompare(a.dateAdded || '');
            });
            $scope.recentProducts = sorted.slice(0, 8);
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
            var payload = {
                user_id: $scope.currentUser.id,
                cart: $scope.cart,
                address: $scope.checkoutData.address,
                payment_method: $scope.checkoutData.paymentMethod,
                total: $scope.getCartTotal()
            };
            
            $http.post('../php-api/process_payment.php', payload)
                .then(function(res) {
                    if (res.data.success) {
                        $scope.orderSummary = angular.copy($scope.cart);
                        $scope.orderId = res.data.order_id;
                        $scope.cart = [];
                        saveCart();
                        $scope.orderPlaced = true;
                        window.scrollTo(0, 0);
                    } else {
                        alert(res.data.message || "Failed to process order.");
                    }
                })
                .catch(function(err) {
                    console.error("Payment error:", err);
                    alert("Server error during payment processing. Is XAMPP Apache running?");
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

    // ============================================================
    // AI FEATURE 1: Product Recommendations
    // ============================================================
    $scope.recommendations = [];
    $scope.recommendationsLoading = false;
    $scope.recommendationsLoaded = false;

    $scope.loadRecommendations = function() {
        $scope.recommendationsLoading = true;
        var payload = {
            user_id: $scope.currentUser ? $scope.currentUser.id : null,
            cart_items: $scope.cart || []
        };

        $http.post('../php-api/recommendations.php', payload)
            .then(function(res) {
                if (res.data.success && res.data.recommendations) {
                    $scope.recommendations = res.data.recommendations;
                    $scope.recommendationsLoaded = true;
                }
            })
            .catch(function(err) {
                console.error('Recommendations error:', err);
            })
            .finally(function() {
                $scope.recommendationsLoading = false;
            });
    };

    // Load recommendations after products load
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

    // Welcome message
    $scope.chatMessages.push({
        sender: 'bot',
        text: "Hey there! 👋 I'm FlexBot, your personal shopping assistant. How can I help you today?"
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

        // Add user message
        $scope.chatMessages.push({ sender: 'user', text: msg });
        $scope.chatInput = '';
        $scope.chatSending = true;
        $scope.scrollChatToBottom();

        // Build conversation history (last 10 messages for context)
        var history = [];
        var recentMessages = $scope.chatMessages.slice(-11, -1); // exclude the just-added message
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
