const express = require('express');
const router = express.Router();
const db = require('../config/db');

// @route   POST /api/contact
// @desc    Submit a new contact message
// @access  Public
router.post('/', async (req, res) => {
    try {
        const { name, email, message } = req.body;

        if (!name || !email || !message) {
            return res.status(400).json({ success: false, message: 'All fields are required.' });
        }

        const [result] = await db.query(
            'INSERT INTO contact_messages (name, email, message) VALUES (?, ?, ?)',
            [name, email, message]
        );

        res.json({ success: true, message: 'Your message has been sent successfully!' });
    } catch (error) {
        console.error('Submit contact message error:', error);
        res.status(500).json({ success: false, message: 'Server error while submitting message.' });
    }
});

// @route   GET /api/contact/admin/all
// @desc    Get all contact messages (Admin only)
// @access  Admin (assuming similar to existing routes)
router.get('/admin/all', async (req, res) => {
    try {
        const [messages] = await db.query('SELECT * FROM contact_messages ORDER BY created_at DESC');
        res.json(messages);
    } catch (error) {
        console.error('Fetch contact messages error:', error);
        res.status(500).json({ success: false, message: 'Server error fetching messages.' });
    }
});

module.exports = router;
