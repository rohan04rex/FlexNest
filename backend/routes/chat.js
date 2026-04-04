const express = require('express');
const router = express.Router();
const axios = require('axios');
const { verifyToken } = require('../middleware/auth');

// Proxy Chat request to Python AI Service
router.post('/', async (req, res) => {
    try {
        const headers = {};
        if (req.headers['authorization']) {
            headers['Authorization'] = req.headers['authorization'];
        }
        
        const response = await axios.post('http://127.0.0.1:8000/chat', req.body, { headers });
        res.json(response.data);
    } catch (err) {
        console.error('Python AI Service Error (Chat):', err.message);
        res.status(500).json({ message: 'Chatbot service error', error: err.message });
    }
});

module.exports = router;
