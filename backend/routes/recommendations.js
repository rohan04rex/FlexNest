const express = require('express');
const router = express.Router();
const axios = require('axios');
const { verifyToken } = require('../middleware/auth');

// Proxy Recommendation request to Python AI Service
router.get('/', verifyToken, async (req, res) => {
    try {
        const headers = {};
        if (req.headers['authorization']) {
            headers['Authorization'] = req.headers['authorization'];
        }

        const response = await axios.get('http://127.0.0.1:8000/recommendations', {
            headers: headers
        });
        res.json(response.data);
    } catch (err) {
        console.error('Python AI Service Error (Recs):', err.message);
        res.status(500).json({ message: 'Error fetching AI recommendations', error: err.message });
    }
});

module.exports = router;
