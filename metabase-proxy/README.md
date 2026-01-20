# Metabase Proxy Server

A secure backend proxy that fetches data from Metabase questions and serves it to your inventory dashboard. This keeps your Metabase credentials secure and never exposes them to the client-side.

## Architecture

```
GitHub Pages Dashboard  →  Render Proxy Server  →  Metabase API
   (Public)                 (Your credentials      (Private)
                             stored securely)
```

## Prerequisites

1. **Metabase Account** with access to your questions
2. **Metabase Question IDs** for:
   - Inventory data
   - Consumption data
   - RM Inwarded data

### Finding Question IDs

1. Open each question in Metabase
2. Look at the URL: `https://yourcompany.metabaseapp.com/question/123`
3. The number at the end (123) is your Question ID

## Deployment to Render (Free)

### Step 1: Create a GitHub Repository for the Proxy

```bash
cd metabase-proxy
git init
git add .
git commit -m "Initial commit: Metabase proxy server"
git remote add origin https://github.com/YOUR_USERNAME/metabase-proxy.git
git push -u origin main
```

### Step 2: Deploy on Render

1. Go to [render.com](https://render.com) and sign up/login
2. Click **"New +"** → **"Web Service"**
3. Connect your GitHub account and select the `metabase-proxy` repository
4. Configure the service:
   - **Name:** `metabase-proxy` (or your choice)
   - **Environment:** `Node`
   - **Build Command:** `npm install`
   - **Start Command:** `npm start`
   - **Plan:** `Free`

### Step 3: Configure Environment Variables

In Render dashboard, go to your service → **Environment** and add:

| Key | Value |
|-----|-------|
| `METABASE_URL` | `https://yourcompany.metabaseapp.com` |
| `METABASE_USERNAME` | `your-email@company.com` |
| `METABASE_PASSWORD` | `your-metabase-password` |
| `QUESTION_ID_INVENTORY` | `123` (your inventory question ID) |
| `QUESTION_ID_CONSUMPTION` | `456` (your consumption question ID) |
| `QUESTION_ID_INWARDED` | `789` (your RM inwarded question ID) |

### Step 4: Get Your Proxy URL

After deployment, Render will give you a URL like:
```
https://metabase-proxy-xxxx.onrender.com
```

This is your `PROXY_URL` to use in the dashboard.

## API Endpoints

| Endpoint | Description |
|----------|-------------|
| `GET /` | Health check and endpoint list |
| `GET /health` | Service health status |
| `GET /api/inventory` | Fetch inventory data |
| `GET /api/consumption` | Fetch consumption data |
| `GET /api/inwarded` | Fetch RM inwarded data |
| `GET /api/all` | Fetch all data in one request |
| `GET /api/config` | Check configuration status (no secrets exposed) |

## Testing Locally

1. Copy `.env.example` to `.env` and fill in your values:
   ```bash
   cp .env.example .env
   ```

2. Install dependencies:
   ```bash
   npm install
   ```

3. Start the server:
   ```bash
   npm start
   ```

4. Test the endpoints:
   ```bash
   curl http://localhost:3000/health
   curl http://localhost:3000/api/inventory
   ```

## Security Features

- ✅ Credentials stored as environment variables (never in code)
- ✅ CORS restricted to your GitHub Pages domain
- ✅ Session token caching (reduces API calls)
- ✅ Automatic token refresh on expiry
- ✅ No sensitive data in logs or responses

## Troubleshooting

### "Authentication failed"
- Verify your Metabase username and password
- Check if your Metabase account has API access

### "Question not found"
- Verify the Question IDs are correct
- Ensure your Metabase user has permission to view those questions

### CORS errors
- The proxy allows requests from `*.github.io` domains
- For custom domains, add them to `allowedOrigins` in `server.js`

### Render service sleeping
- Free tier services sleep after 15 minutes of inactivity
- First request after sleep takes ~30 seconds to wake up
- Consider upgrading to paid tier for always-on service

## Updating the Dashboard

After deploying the proxy, update your dashboard's `index.html` to use the proxy:

```javascript
const PROXY_URL = 'https://your-proxy.onrender.com';

async function loadData() {
    const response = await fetch(`${PROXY_URL}/api/all`);
    const result = await response.json();

    if (result.success) {
        inventoryData = result.data.inventory;
        consumptionData = result.data.consumption;
        inwardedData = result.data.inwarded;
    }
}
```

## License

MIT
