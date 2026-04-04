-- Expanded Sample Data for FlexNest Database
USE flexnest_db;

-- Clear existing data to avoid duplicates for this refresh
SET FOREIGN_KEY_CHECKS = 0;
TRUNCATE TABLE payments;
TRUNCATE TABLE order_items;
TRUNCATE TABLE orders;
TRUNCATE TABLE cart;
TRUNCATE TABLE products;
TRUNCATE TABLE users;
SET FOREIGN_KEY_CHECKS = 1;

-- 1. Insert Users (Password: password123, Admin: admin123)
INSERT INTO users (name, email, password, phone, address, role) VALUES
('John Doe', 'john@example.com', '$2a$10$EixZaYVK1fsbw1ZfbX3OXePaWxn96p36WQoeG6L60znBKXzR.R9ty', '1234567890', '123 Street, City, Country', 'user'),
('Jane Smith', 'jane@example.com', '$2a$10$EixZaYVK1fsbw1ZfbX3OXePaWxn96p36WQoeG6L60znBKXzR.R9ty', '0987654321', '456 Avenue, Town, Country', 'user'),
('Mike Ross', 'mike@example.com', '$2a$10$EixZaYVK1fsbw1ZfbX3OXePaWxn96p36WQoeG6L60znBKXzR.R9ty', '5556667777', '789 Blvd, Metro, Country', 'user'),
('Admin User', 'admin@flexnest.com', '$2b$10$SCG5juSoJ1zTN69SkGC50egEKG.cULnsB1G2fDE/3gWsLkyAaW1Ey', '1122334455', 'Admin HQ', 'admin');

-- 2. Insert Products (Diverse range for better recommendations)
INSERT INTO products (name, brand, price, stock, status, gender, subcategory, image, description) VALUES
-- Footwear (Nike)
('Nike Air Max 270', 'Nike', 150.00, 40, 'Available', 'Unisex', 'Footwear', 'https://images.unsplash.com/photo-1542291026-7eec264c27ff?q=80&w=800&auto=format&fit=crop', 'The Nike Air Max 270 delivers visible cushioning under every step.'),
('Nike Zoom Pegasus 40', 'Nike', 130.00, 35, 'Available', 'Men', 'Footwear', 'https://images.unsplash.com/photo-1543508282-6319a3e46bc1?q=80&w=800&auto=format&fit=crop', 'A springy ride for every run, the Pegasus’ familiar, just-for-you feel returns.'),
('Nike Air Force 1', 'Nike', 110.00, 50, 'Available', 'Unisex', 'Footwear', 'https://images.unsplash.com/photo-1595950653106-6c9ebd614d3a?q=80&w=800&auto=format&fit=crop', 'The radiance lives on in the Nike Air Force 1, the b-ball icon.'),
-- Footwear (Adidas)
('Adidas Ultraboost Light', 'Adidas', 190.00, 25, 'Available', 'Men', 'Footwear', 'https://images.unsplash.com/photo-1587563871167-1ee9c731aefb?q=80&w=800&auto=format&fit=crop', 'Experience epic energy with the new Ultraboost Light, our lightest Ultraboost ever.'),
('Adidas Stan Smith', 'Adidas', 100.00, 45, 'Available', 'Women', 'Footwear', 'https://images.unsplash.com/photo-1588117223087-5158a80443ea?q=80&w=800&auto=format&fit=crop', 'Timeless look, effortless style, and everyday versatility.'),
-- Apparel (T-Shirts)
('Essential Cotton Tee', 'FLEXNEST', 30.00, 100, 'Available', 'Men', 'Tshirt', 'https://images.unsplash.com/photo-1521572163474-6864f9cf17ab?q=80&w=800&auto=format&fit=crop', 'Premium heavyweight cotton tee with a relaxed fit.'),
('Vintage Graphic T-Shirt', 'Adidas', 35.00, 80, 'Available', 'Unisex', 'Tshirt', 'https://images.unsplash.com/photo-1503341455253-b2e723bb3dbb?q=80&w=800&auto=format&fit=crop', 'Soft cotton blend with a retro-inspired graphic print.'),
('Performance Tech Tee', 'Nike', 45.00, 60, 'Available', 'Men', 'Tshirt', 'https://images.unsplash.com/photo-1581655353564-df123a1eb820?q=80&w=800&auto=format&fit=crop', 'Dri-FIT technology helps keep you dry and comfortable.'),
-- Apparel (Outerwear)
('Wool Varsity Jacket', 'FLEXNEST', 150.00, 20, 'Available', 'Men', 'Outerwear', 'https://images.unsplash.com/photo-1591047139829-d91aecb6caea?q=80&w=800&auto=format&fit=crop', 'Classic varsity styling with premium wool body and leather sleeves.'),
('Camel Trench Coat', 'Zara', 180.00, 15, 'Available', 'Women', 'Outerwear', 'https://images.unsplash.com/photo-1548624313-0396c75e4b1a?q=80&w=800&auto=format&fit=crop', 'Double-breasted trench coat in a warm camel shade.'),
('Water-Repellent Puffer', 'North Face', 220.00, 25, 'Available', 'Unisex', 'Outerwear', 'https://images.unsplash.com/photo-1544923246-77307dd654ca?q=80&w=800&auto=format&fit=crop', 'Stay warm and dry in any weather with this high-loft puffer.'),
-- Apparel (Pants)
('Slim Fit Denim', 'Levis', 70.00, 40, 'Available', 'Men', 'Pants', 'https://images.unsplash.com/photo-1542272604-787c3835535d?q=80&w=800&auto=format&fit=crop', 'The definitive slim-fit jean, made with a hint of stretch.'),
('High-Rise Leggings', 'Lululemon', 95.00, 50, 'Available', 'Women', 'Pants', 'https://images.unsplash.com/photo-1506629082955-511b1aa562c8?q=80&w=800&auto=format&fit=crop', 'Butter-soft feel with four-way stretch for maximum comfort.'),
('Cargo Joggers', 'Nike', 85.00, 30, 'Available', 'Men', 'Pants', 'https://images.unsplash.com/photo-1517438476312-10d79c67750d?q=80&w=800&auto=format&fit=crop', 'Street-ready style with functional cargo pockets.'),
-- Accessories
('Leather Messenger Bag', 'Fossil', 120.00, 15, 'Available', 'Unisex', 'Accessories', 'https://images.unsplash.com/photo-1548036328-c9fa89d128fa?q=80&w=800&auto=format&fit=crop', 'Premium leather bag with dedicated laptop sleeve.'),
('Aviator Sunglasses', 'Ray-Ban', 160.00, 20, 'Available', 'Unisex', 'Accessories', 'https://images.unsplash.com/photo-1572635196237-14b3f281503f?q=80&w=800&auto=format&fit=crop', 'Iconic aviator design with polarized lenses.'),
('Sports Water Bottle (1L)', 'Hydro Flask', 40.00, 100, 'Available', 'Unisex', 'Accessories', 'https://images.unsplash.com/photo-1602143352538-46bd00f890e1?q=80&w=800&auto=format&fit=crop', 'Double-wall vacuum insulation keeps drinks cold for 24 hours.'),
-- Equipment
('Yoga Mat (6mm)', 'Lululemon', 60.00, 40, 'Available', 'Women', 'Equipment', 'https://images.unsplash.com/photo-1601925260368-ae2f83cf8b7f?q=80&w=800&auto=format&fit=crop', 'Superior grip and cushioning for your practice.');

-- 3. Insert Cart Items (John Doe - Interested in Nike/Footwear)
INSERT INTO cart (user_id, product_id, quantity) VALUES
(1, 1, 1); -- Nike Air Max 270

-- 4. Insert Orders (Building history for recommendations)

-- Jane Smith (Likes Women's Outerwear and Lululemon)
INSERT INTO orders (user_id, total, status, address) VALUES
(2, 275.00, 'Delivered', '456 Avenue, Town, Country');
INSERT INTO order_items (order_id, product_id, quantity, price) VALUES
(1, 10, 1, 180.00), -- Camel Trench Coat
(1, 13, 1, 95.00);  -- High-Rise Leggings
INSERT INTO payments (order_id, user_id, amount, method, status) VALUES
(1, 2, 275.00, 'Credit Card', 'Completed');

-- John Doe (Previous purchase of Apparel)
INSERT INTO orders (user_id, total, status, address) VALUES
(1, 30.00, 'Delivered', '123 Street, City, Country');
INSERT INTO order_items (order_id, product_id, quantity, price) VALUES
(2, 6, 1, 30.00); -- Essential Cotton Tee
INSERT INTO payments (order_id, user_id, amount, method, status) VALUES
(2, 1, 30.00, 'PayPal', 'Completed');

-- Mike Ross (Purchased Adidas shoes)
INSERT INTO orders (user_id, total, status, address) VALUES
(3, 190.00, 'Delivered', '789 Blvd, Metro, Country');
INSERT INTO order_items (order_id, product_id, quantity, price) VALUES
(3, 4, 1, 190.00); -- Adidas Ultraboost
INSERT INTO payments (order_id, user_id, amount, method, status) VALUES
(3, 3, 190.00, 'Credit Card', 'Completed');
