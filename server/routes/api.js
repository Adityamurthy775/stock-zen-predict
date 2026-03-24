const express = require('express');
const router = express.Router();
const axios = require('axios');

const PYTHON_API_URL = process.env.PYTHON_API_URL || 'http://localhost:8000';

router.get('/predict', async (req, res) => {
  try {
    const { symbol, period } = req.query;
    if (!symbol) return res.status(400).json({ error: 'Symbol is required' });

    const response = await axios.get(`${PYTHON_API_URL}/predict`, {
      params: { symbol, period: period || '1mo' },
      timeout: 10000 // ML script might take time
    });
    
    res.json(response.data);
  } catch (error) {
    console.error('Error proxying to Python AI service:', error.message);
    res.status(500).json({ error: 'Failed to fetch prediction from AI service' });
  }
});

// Using a fast lightweight quote API via a public URL if python is too slow,
// but for now let's just use Yahoo Finance via Python, or just keep it simple.
// We can use the existing mock structure but enhanced.

module.exports = router;
