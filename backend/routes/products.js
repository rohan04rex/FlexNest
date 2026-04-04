const express = require('express');
const router = express.Router();
const db = require('../config/db');
const { verifyToken, isAdmin } = require('../middleware/auth');

// Get all products
router.get('/', async (req, res) => {
    try {
        const { gender, subcategory } = req.query;
        let query = 'SELECT * FROM products';
        let params = [];

        if (gender || subcategory) {
            query += ' WHERE';
            if (gender) {
                query += ' gender = ?';
                params.push(gender);
            }
            if (subcategory) {
                if (gender) query += ' AND';
                query += ' subcategory = ?';
                params.push(subcategory);
            }
        }

        const [products] = await db.query(query, params);
        res.json(products);
    } catch (err) {
        res.status(500).json({ message: 'Error fetching products', error: err });
    }
});

// Get single product
router.get('/:id', async (req, res) => {
    try {
        const [products] = await db.query('SELECT * FROM products WHERE id = ?', [req.params.id]);
        if (products.length === 0) {
            return res.status(404).json({ message: 'Product not found' });
        }
        res.json(products[0]);
    } catch (err) {
        res.status(500).json({ message: 'Error fetching product', error: err });
    }
});

// Add product (Admin only - Temporarily removed auth for testing)
router.post('/', async (req, res) => {
    try {
        const { name, brand, price, stock, gender, subcategory, image, description } = req.body;
        const [result] = await db.query(
            'INSERT INTO products (name, brand, price, stock, gender, subcategory, image, description) VALUES (?, ?, ?, ?, ?, ?, ?, ?)',
            [name, brand, price, stock, gender, subcategory, image, description]
        );
        res.status(201).json({ message: 'Product added successfully', productId: result.insertId });
    } catch (err) {
        res.status(500).json({ message: 'Error adding product', error: err });
    }
});

// Update product (Admin only - Temporarily removed auth for testing)
router.put('/:id', async (req, res) => {
    try {
        const { name, brand, price, stock, status, gender, subcategory, image, description } = req.body;
        await db.query(
            'UPDATE products SET name=?, brand=?, price=?, stock=?, status=?, gender=?, subcategory=?, image=?, description=? WHERE id=?',
            [name, brand, price, stock, status, gender, subcategory, image, description, req.params.id]
        );
        res.json({ message: 'Product updated successfully' });
    } catch (err) {
        res.status(500).json({ message: 'Error updating product', error: err });
    }
});

// Delete product
router.delete('/:id', async (req, res) => {
    try {
        const [result] = await db.query('DELETE FROM products WHERE id = ?', [req.params.id]);
        if (result.affectedRows === 0) {
            return res.status(404).json({ message: 'Product not found' });
        }
        res.json({ message: 'Product deleted successfully' });
    } catch (err) {
        res.status(500).json({ message: 'Error deleting product', error: err });
    }
});

module.exports = router;
