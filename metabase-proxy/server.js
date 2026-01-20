const express = require('express');
const cors = require('cors');
const fetch = require('node-fetch');
require('dotenv').config();

const app = express();
const PORT = process.env.PORT || 3000;

// Metabase configuration from environment variables
const METABASE_URL = process.env.METABASE_URL; // e.g., https://yourcompany.metabaseapp.com
const METABASE_USERNAME = process.env.METABASE_USERNAME;
const METABASE_PASSWORD = process.env.METABASE_PASSWORD;

// Question IDs for each data source (to be configured)
const QUESTION_IDS = {
    inventory: process.env.QUESTION_ID_INVENTORY,
    consumption: process.env.QUESTION_ID_CONSUMPTION,
    inwarded: process.env.QUESTION_ID_INWARDED
};

// Store session token (cached)
let sessionToken = null;
let tokenExpiry = null;

// CORS configuration - allow your GitHub Pages domain
const allowedOrigins = [
    'https://arojitdas2025.github.io',
    'http://localhost:3000',
    'http://localhost:5500',
    'http://127.0.0.1:5500'
];

app.use(cors({
    origin: function(origin, callback) {
        // Allow requests with no origin (like mobile apps or curl requests)
        if (!origin) return callback(null, true);
        if (allowedOrigins.indexOf(origin) !== -1 || origin.endsWith('.github.io')) {
            callback(null, true);
        } else {
            callback(new Error('Not allowed by CORS'));
        }
    },
    credentials: true
}));

app.use(express.json());

// Health check endpoint
app.get('/', (req, res) => {
    res.json({
        status: 'ok',
        message: 'Metabase Proxy Server is running',
        endpoints: ['/api/inventory', '/api/consumption', '/api/inwarded', '/api/all']
    });
});

app.get('/health', (req, res) => {
    res.json({ status: 'healthy', timestamp: new Date().toISOString() });
});

// Authenticate with Metabase and get session token
async function getSessionToken() {
    // Check if we have a valid cached token (tokens last 14 days, we refresh after 12)
    if (sessionToken && tokenExpiry && Date.now() < tokenExpiry) {
        return sessionToken;
    }

    console.log('Authenticating with Metabase...');

    try {
        const response = await fetch(`${METABASE_URL}/api/session`, {
            method: 'POST',
            headers: {
                'Content-Type': 'application/json'
            },
            body: JSON.stringify({
                username: METABASE_USERNAME,
                password: METABASE_PASSWORD
            })
        });

        if (!response.ok) {
            const error = await response.text();
            throw new Error(`Authentication failed: ${response.status} - ${error}`);
        }

        const data = await response.json();
        sessionToken = data.id;
        // Set expiry to 12 days from now (tokens last 14 days)
        tokenExpiry = Date.now() + (12 * 24 * 60 * 60 * 1000);

        console.log('Successfully authenticated with Metabase');
        return sessionToken;
    } catch (error) {
        console.error('Metabase authentication error:', error.message);
        throw error;
    }
}

// Fetch data from a Metabase question
async function fetchQuestionData(questionId) {
    if (!questionId) {
        throw new Error('Question ID not configured');
    }

    const token = await getSessionToken();

    console.log(`Fetching question ${questionId}...`);

    const response = await fetch(`${METABASE_URL}/api/card/${questionId}/query/json`, {
        method: 'POST',
        headers: {
            'Content-Type': 'application/json',
            'X-Metabase-Session': token
        }
    });

    if (!response.ok) {
        // If unauthorized, clear token and retry once
        if (response.status === 401) {
            console.log('Token expired, re-authenticating...');
            sessionToken = null;
            tokenExpiry = null;
            const newToken = await getSessionToken();

            const retryResponse = await fetch(`${METABASE_URL}/api/card/${questionId}/query/json`, {
                method: 'POST',
                headers: {
                    'Content-Type': 'application/json',
                    'X-Metabase-Session': newToken
                }
            });

            if (!retryResponse.ok) {
                throw new Error(`Failed to fetch question ${questionId}: ${retryResponse.status}`);
            }

            return await retryResponse.json();
        }

        throw new Error(`Failed to fetch question ${questionId}: ${response.status}`);
    }

    return await response.json();
}

// API endpoint for inventory data
app.get('/api/inventory', async (req, res) => {
    try {
        const data = await fetchQuestionData(QUESTION_IDS.inventory);
        res.json({
            success: true,
            data: data,
            count: data.length,
            timestamp: new Date().toISOString()
        });
    } catch (error) {
        console.error('Error fetching inventory:', error.message);
        res.status(500).json({
            success: false,
            error: error.message
        });
    }
});

// API endpoint for consumption data
app.get('/api/consumption', async (req, res) => {
    try {
        const data = await fetchQuestionData(QUESTION_IDS.consumption);
        res.json({
            success: true,
            data: data,
            count: data.length,
            timestamp: new Date().toISOString()
        });
    } catch (error) {
        console.error('Error fetching consumption:', error.message);
        res.status(500).json({
            success: false,
            error: error.message
        });
    }
});

// API endpoint for inwarded/RM data
app.get('/api/inwarded', async (req, res) => {
    try {
        const data = await fetchQuestionData(QUESTION_IDS.inwarded);
        res.json({
            success: true,
            data: data,
            count: data.length,
            timestamp: new Date().toISOString()
        });
    } catch (error) {
        console.error('Error fetching inwarded data:', error.message);
        res.status(500).json({
            success: false,
            error: error.message
        });
    }
});

// API endpoint to fetch all data at once
app.get('/api/all', async (req, res) => {
    try {
        const [inventory, consumption, inwarded] = await Promise.all([
            fetchQuestionData(QUESTION_IDS.inventory).catch(e => ({ error: e.message })),
            fetchQuestionData(QUESTION_IDS.consumption).catch(e => ({ error: e.message })),
            fetchQuestionData(QUESTION_IDS.inwarded).catch(e => ({ error: e.message }))
        ]);

        res.json({
            success: true,
            data: {
                inventory: Array.isArray(inventory) ? inventory : [],
                consumption: Array.isArray(consumption) ? consumption : [],
                inwarded: Array.isArray(inwarded) ? inwarded : []
            },
            errors: {
                inventory: inventory.error || null,
                consumption: consumption.error || null,
                inwarded: inwarded.error || null
            },
            timestamp: new Date().toISOString()
        });
    } catch (error) {
        console.error('Error fetching all data:', error.message);
        res.status(500).json({
            success: false,
            error: error.message
        });
    }
});

// Debug endpoint to check configuration (don't expose sensitive data)
app.get('/api/config', (req, res) => {
    res.json({
        metabaseUrl: METABASE_URL ? 'configured' : 'missing',
        username: METABASE_USERNAME ? 'configured' : 'missing',
        password: METABASE_PASSWORD ? 'configured' : 'missing',
        questions: {
            inventory: QUESTION_IDS.inventory ? 'configured' : 'missing',
            consumption: QUESTION_IDS.consumption ? 'configured' : 'missing',
            inwarded: QUESTION_IDS.inwarded ? 'configured' : 'missing'
        }
    });
});

// Start server
app.listen(PORT, () => {
    console.log(`🚀 Metabase Proxy Server running on port ${PORT}`);
    console.log(`📊 Metabase URL: ${METABASE_URL || 'NOT CONFIGURED'}`);
    console.log(`📋 Configured Questions:`);
    console.log(`   - Inventory: ${QUESTION_IDS.inventory || 'NOT SET'}`);
    console.log(`   - Consumption: ${QUESTION_IDS.consumption || 'NOT SET'}`);
    console.log(`   - Inwarded: ${QUESTION_IDS.inwarded || 'NOT SET'}`);
});
