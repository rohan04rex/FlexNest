const express = require('express');
const router = express.Router();
const db = require('../config/db');
const { verifyToken, isAdmin } = require('../middleware/auth');

// Get user orders
router.get('/', verifyToken, async (req, res) => {
    try {
        const [orders] = await db.query('SELECT * FROM orders WHERE user_id = ?', [req.user.id]);
        res.json(orders);
    } catch (err) {
        res.status(500).json({ message: 'Error fetching orders', error: err });
    }
});

// Admin fetching all orders with Customer Name
router.get('/admin/all', async (req, res) => {
    try {
        const [orders] = await db.query(`
            SELECT o.id, o.date, u.name as customer, o.total, o.status 
            FROM orders o 
            JOIN users u ON o.user_id = u.id 
            ORDER BY o.date DESC
        `);
        res.json(orders);
    } catch (err) {
        res.status(500).json({ message: 'Error fetching admin orders', error: err });
    }
});

// Place order
router.post('/', verifyToken, async (req, res) => {
    let connection;
    try {
        connection = await db.getConnection();
        await connection.beginTransaction();

        const { total, address } = req.body;

        // 1. Create order
        const [orderResult] = await connection.query(
            'INSERT INTO orders (user_id, total, address) VALUES (?, ?, ?)',
            [req.user.id, total, address]
        );
        const orderId = orderResult.insertId;

        // 2. Get cart items to move to order_items
        const [cartItems] = await connection.query(
            'SELECT c.product_id, c.quantity, p.price FROM cart c JOIN products p ON c.product_id = p.id WHERE c.user_id = ?',
            [req.user.id]
        );

        if (cartItems.length === 0) {
            throw new Error('Cart is empty');
        }

        // 3. Insert into order_items
        for (const item of cartItems) {
            await connection.query(
                'INSERT INTO order_items (order_id, product_id, quantity, price) VALUES (?, ?, ?, ?)',
                [orderId, item.product_id, item.quantity, item.price]
            );
            
            // 4. Update stock
            await connection.query(
                'UPDATE products SET stock = stock - ? WHERE id = ?',
                [item.quantity, item.product_id]
            );
        }

        // 5. Clear cart
        await connection.query('DELETE FROM cart WHERE user_id = ?', [req.user.id]);

        await connection.commit();
        res.status(201).json({ message: 'Order placed successfully', orderId });
    } catch (err) {
        if (connection) {
            await connection.rollback();
        }
        res.status(500).json({ message: 'Error placing order', error: err.message });
    } finally {
        if (connection) {
            connection.release();
        }
    }
});

// Update order status (Admin only - Temporarily removed auth for testing)
router.put('/:id/status', async (req, res) => {
    try {
        const { status } = req.body;
        await db.query('UPDATE orders SET status = ? WHERE id = ?', [status, req.params.id]);
        res.json({ message: 'Order status updated' });
    } catch (err) {
        res.status(500).json({ message: 'Error updating order status', error: err });
    }
});

module.exports = router;
