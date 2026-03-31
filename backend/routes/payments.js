const express = require('express');
const router = express.Router();
const db = require('../config/db');
const { verifyToken } = require('../middleware/auth');

// Simulate payment
router.post('/', verifyToken, async (req, res) => {
    try {
        const { order_id, amount, method } = req.body;
        
        const [result] = await db.query(
            'INSERT INTO payments (order_id, user_id, amount, method, status) VALUES (?, ?, ?, ?, ?)',
            [order_id, req.user.id, amount, method, 'Completed']
        );
        
        // Update order status to Shipped after payment (simulated)
        await db.query('UPDATE orders SET status = ? WHERE id = ?', ['Shipped', order_id]);

        res.status(201).json({ message: 'Payment simulated successfully', paymentId: result.insertId });
    } catch (err) {
        res.status(500).json({ message: 'Error processing payment', error: err });
    }
});

module.exports = router;
