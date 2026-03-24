const express = require('express');
const cors = require('cors');
const apiRoutes = require('./routes/api');

require('dotenv').config();

const app = express();
const PORT = process.env.PORT || 5000;

app.use(cors());
app.use(express.json());

app.use('/api', apiRoutes);

app.get('/health', (req, res) => {
  res.json({ status: 'ok', service: 'Stock Zen Node.js API Gateway' });
});

app.listen(PORT, () => {
  console.log(`Server running on port ${PORT}`);
});
