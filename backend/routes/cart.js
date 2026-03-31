const express = require('express');
const router = express.Router();
const db = require('../config/db');
const { verifyToken } = require('../middleware/auth');

// Get cart items
router.get('/', verifyToken, async (req, res) => {
    try {
        const [cartItems] = await db.query(
            'SELECT c.id, c.product_id, c.quantity, p.name, p.price, p.image FROM cart c JOIN products p ON c.product_id = p.id WHERE c.user_id = ?',
            [req.user.id]
        );
        res.json(cartItems);
    } catch (err) {
        res.status(500).json({ message: 'Error fetching cart', error: err });
    }
});

// Add to cart
router.post('/', verifyToken, async (req, res) => {
    try {
        const { product_id, quantity } = req.body;
        
        // Check if product already in cart
        const [existing] = await db.query('SELECT * FROM cart WHERE user_id = ? AND product_id = ?', [req.user.id, product_id]);
        
        if (existing.length > 0) {
            await db.query('UPDATE cart SET quantity = quantity + ? WHERE id = ?', [quantity, existing[0].id]);
        } else {
            await db.query('INSERT INTO cart (user_id, product_id, quantity) VALUES (?, ?, ?)', [req.user.id, product_id, quantity]);
        }
        
        res.status(201).json({ message: 'Product added to cart' });
    } catch (err) {
        res.status(500).json({ message: 'Error adding to cart', error: err });
    }
});

// Update quantity
router.put('/:id', verifyToken, async (req, res) => {
    try {
        const { quantity } = req.body;
        await db.query('UPDATE cart SET quantity = ? WHERE id = ? AND user_id = ?', [quantity, req.params.id, req.user.id]);
        res.json({ message: 'Cart updated' });
    } catch (err) {
        res.status(500).json({ message: 'Error updating cart', error: err });
    }
});

// Remove item
router.delete('/:id', verifyToken, async (req, res) => {
    try {
        await db.query('DELETE FROM cart WHERE id = ? AND user_id = ?', [req.params.id, req.user.id]);
        res.json({ message: 'Item removed from cart' });
    } catch (err) {
        res.status(500).json({ message: 'Error removing from cart', error: err });
    }
});

module.exports = router;
