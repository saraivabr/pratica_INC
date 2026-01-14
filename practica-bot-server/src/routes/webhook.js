const express = require('express');
const router = express.Router();
const messageService = require('../services/message');

router.post('/', async (req, res) => {
    try {
        // console.log('Webhook Header:', req.headers);
        // console.log('Webhook Body:', JSON.stringify(req.body, null, 2));

        // Await processing to ensure Lambda doesn't freeze/exit before completion
        console.log('⏳ Start Webhook Processing...');
        const start = Date.now();
        await messageService.processMessage(req.body);
        console.log(`✅ Finished Webhook Processing in ${Date.now() - start}ms`);

        res.status(200).send({ status: 'received' });
    } catch (error) {
        console.error('Webhook Error:', error);
        res.status(500).send({ error: 'Internal Server Error' });
    }
});

module.exports = router;
