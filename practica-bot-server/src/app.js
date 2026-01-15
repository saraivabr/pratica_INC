const express = require('express');
const config = require('./config/evolution');
const webhookRoutes = require('./routes/webhook');
const dbService = require('./services/database'); // Initialize DB

const app = express();

app.use(express.json({ limit: '50mb' }));
app.use(express.urlencoded({ extended: true }));

// Routes
app.use('/webhook', webhookRoutes);

// Health Check
app.get('/health', (req, res) => {
    res.send({ status: 'online', uptime: process.uptime() });
});

if (require.main === module) {
    const PORT = process.env.PORT || config.port || 8080;
    app.listen(PORT, () => {
        console.log(`🚀 Prática Bot Server running on port ${PORT}`);
        console.log(`🔗 Webhook endpoint: /webhook`);
    });
}

module.exports = app;
