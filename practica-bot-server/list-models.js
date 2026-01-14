const { GoogleGenerativeAI } = require('@google/generative-ai');
const path = require('path');
require('dotenv').config({ path: path.join(__dirname, '.env') });

async function listModels() {
    console.log('🔍 Listing available models...');
    const genAI = new GoogleGenerativeAI(process.env.GOOGLE_API_KEY);
    // Note: listModels is not directly exposed on the client instance in some versions, 
    // but let's try via the model manager if available or just try a standard name.

    // Actually, the easiest way to debug this without complex listing code (which differs by SDK version) 
    // is to try a known stable model name like 'gemini-pro' or 'gemini-1.5-flash-latest'.

    // Let's try to update the code to use 'gemini-1.5-flash-latest' directly as a fix attempt.
    console.log('Trying to use "gemini-1.5-flash-latest"...');
}

listModels();
