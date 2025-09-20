# Ava - Fetii AI Chatbot (Next.js)

A modern React-based chatbot interface for Snowflake Cortex Agent integration.

🚀 **Ready for Vercel deployment with hardcoded configuration!**

## 🚀 Quick Deploy to Vercel

### 1. Push to GitHub
```bash
git add .
git commit -m "Add Next.js chatbot app"
git push origin main
```

### 2. Deploy to Vercel
1. Go to [vercel.com](https://vercel.com)
2. Import your GitHub repository
3. Vercel will auto-detect Next.js
4. Click **Deploy**

### 3. Configure Environment Variables
In Vercel dashboard → Settings → Environment Variables, add:

```
SNOWFLAKE_PAT_TOKEN=<your-pat-token>
SNOWFLAKE_ACCOUNT=NBHIMLC-WB58290
AGENT_NAME=AVA
DATABASE=SNOWFLAKE_INTELLIGENCE
SCHEMA=AGENTS
```

## 💻 Local Development

### Install Dependencies
```bash
npm install
```

### Configure Environment
Copy `.env.local` and add your credentials:
```bash
cp .env.local .env.local.real
# Edit .env.local.real with your actual values
```

### Run Development Server
```bash
npm run dev
```

Open [http://localhost:3000](http://localhost:3000) in your browser.

## 🎨 Features

- **Modern UI**: Clean, responsive design matching Snowflake Intelligence
- **Real-time Chat**: Streaming responses from Snowflake Cortex Agent
- **Mode Selection**: Analytics and Research modes
- **Suggested Questions**: Pre-built analytics queries
- **Error Handling**: Comprehensive error messages and loading states
- **Mobile Friendly**: Responsive design for all devices

## 🛠️ Troubleshooting

### Network Policy Issues
If you get 401 "Network policy required" errors, update your Snowflake network policy to allow Vercel's IP ranges.

### Agent Not Found
Verify your agent exists in Snowflake.

### Token Issues
Ensure your PAT token has the correct permissions and hasn't expired.