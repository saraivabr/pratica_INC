const path = require('path');
require('dotenv').config({ path: path.join(__dirname, '../../.env') });

console.log('DEBUG: Config Loading...');
console.log('DEBUG: API URL:', process.env.EVOLUTION_API_URL);
console.log('DEBUG: Instance:', process.env.EVOLUTION_INSTANCE_NAME);

module.exports = {
    apiUrl: process.env.EVOLUTION_API_URL || 'https://projeto1-evolution-api.robuvi.easypanel.host',
    instanceName: process.env.EVOLUTION_INSTANCE_NAME || 'pratica',
    apiKey: process.env.EVOLUTION_API_KEY || '429683C4C977415CAAFCCE10F7D57E11',
    instanceToken: process.env.EVOLUTION_INSTANCE_TOKEN || 'ED6AB0D0AA3D-4F7F-B8C6-55BCA15A5FD1',
    port: process.env.PORT || 3000
};
