# 🔧 Cloudflare Workers Git Integration Setup

Follow these steps to connect your private `fouq-basecamp` repository to Cloudflare Workers for automatic builds and deployments.

## 📋 Prerequisites

1. ✅ Private repository created: `https://github.com/QusaiiSaleem/fouq-basecamp`
2. ✅ Cloudflare Workers account with the MCP server deployed
3. ✅ GitHub Actions workflow file in `.github/workflows/deploy.yml`

## 🚀 Step 1: Set Up GitHub Repository Secrets

Go to your private repository settings: `https://github.com/QusaiiSaleem/fouq-basecamp/settings/secrets/actions`

Add these repository secrets:

### Required Secrets:
```bash
# Cloudflare Configuration
CLOUDFLARE_API_TOKEN=your_cloudflare_api_token
CLOUDFLARE_ACCOUNT_ID=your_cloudflare_account_id

# Basecamp Production OAuth Token
BASECAMP_ACCESS_TOKEN=your_production_basecamp_token
```

### Getting Your Cloudflare Credentials:

1. **API Token**: 
   - Go to https://dash.cloudflare.com/profile/api-tokens
   - Click "Create Token"
   - Use "Custom token" with these permissions:
     - `Account:Cloudflare Workers:Edit`
     - `Zone:Zone Settings:Read`
     - `Zone:Zone:Read`

2. **Account ID**:
   - Go to https://dash.cloudflare.com/
   - Copy your Account ID from the right sidebar

## 🔗 Step 2: Configure Cloudflare Workers Build Settings

### Option A: Via Cloudflare Dashboard
1. Go to https://dash.cloudflare.com/
2. Navigate to Workers & Pages
3. Click on your `basecamp-mcp-worker`
4. Go to Settings → Builds
5. Click "Connect to Git"
6. Select GitHub and authorize
7. Choose repository: `QusaiiSaleem/fouq-basecamp`
8. Set build configuration:
   - **Build command**: `echo "Build via GitHub Actions"`
   - **Build output directory**: `/`
   - **Root directory**: `/`

### Option B: Via Wrangler CLI
```bash
# Connect the worker to Git repository
wrangler publish --config wrangler-production.toml --compatibility-date 2024-01-01

# Set up automatic Git builds
wrangler builds create --config wrangler-production.toml --repo https://github.com/QusaiiSaleem/fouq-basecamp
```

## 🔐 Step 3: Configure Production Secrets

Set production secrets via Wrangler CLI:

```bash
# Set Basecamp OAuth token
echo "YOUR_PRODUCTION_BASECAMP_TOKEN" | wrangler secret put BASECAMP_ACCESS_TOKEN --config wrangler-production.toml

# Verify secrets are set
wrangler secret list --config wrangler-production.toml
```

## ✅ Step 4: Test the Integration

### Test Manual Deployment:
```bash
# Deploy manually to test
wrangler deploy --config wrangler-production.toml

# Check deployment
curl https://basecamp-mcp-worker.hi-8e8.workers.dev
```

### Test Automatic Deployment:
1. Make a small change to any file
2. Commit and push to main branch:
```bash
git add .
git commit -m "Test automatic deployment"
git push private main
```
3. Check GitHub Actions tab for deployment status
4. Verify deployment at: https://basecamp-mcp-worker.hi-8e8.workers.dev

## 📊 Step 5: Monitor & Verify

### GitHub Actions Status:
- Check: https://github.com/QusaiiSaleem/fouq-basecamp/actions

### Cloudflare Workers Logs:
```bash
wrangler tail --config wrangler-production.toml
```

### Health Check:
```bash
curl https://basecamp-mcp-worker.hi-8e8.workers.dev
```

Expected response:
```json
{
  "status": "ok",
  "name": "basecamp-mcp-server-expanded",
  "version": "4.2.0",
  "protocol": "MCP 2025-03-26",
  "tools": 28
}
```

## 🔄 Deployment Workflow

Once set up, your deployment process will be:

1. **Development**: Make changes locally
2. **Test**: Test with `wrangler dev`
3. **Commit**: Push to `main` branch
4. **Automatic**: GitHub Actions will:
   - Build and validate code
   - Deploy to Cloudflare Workers
   - Inject production secrets
   - Run health checks
5. **Verify**: Check production URL

## 🚨 Troubleshooting

### Common Issues:

**GitHub Actions Failing**:
- Verify all secrets are set correctly
- Check Cloudflare API token permissions
- Ensure repository is private (for security)

**Deployment Not Updating**:
- Check Cloudflare Workers build settings
- Verify Git integration is connected
- Check wrangler configuration file

**Secrets Not Working**:
- Verify secrets are set via `wrangler secret list`
- Check environment variable names match exactly
- Ensure production wrangler config is used

### Debug Commands:
```bash
# Check worker status
wrangler status --config wrangler-production.toml

# View live logs
wrangler tail --config wrangler-production.toml

# Test local deployment
wrangler dev --config wrangler-production.toml

# List all secrets
wrangler secret list --config wrangler-production.toml
```

---

**🎯 Result**: Fully automated CI/CD pipeline for your Basecamp MCP server with GitHub → Cloudflare Workers integration!