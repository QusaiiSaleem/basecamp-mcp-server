# 🚀 Fouq Agency - Basecamp MCP Production Setup

This is the **private production repository** for Fouq Agency's Basecamp MCP server with all secrets, configuration, and CI/CD automation.

## 🔐 Production Credentials

### Basecamp OAuth Integration
- **Integration URL**: https://launchpad.37signals.com/integrations/17782
- **Client ID**: `2d6f508f858abd5101af6f07737df924506218c3`
- **Client Secret**: `f6d55354e2ba1d438596dd587c65cff4e38a47a1`
- **Account ID**: `6022466` (Fouq Agency Basecamp)
- **Redirect URI**: `https://basecamp-mcp-worker.hi-8e8.workers.dev/oauth/callback`

### Cloudflare Workers
- **Worker Name**: `basecamp-mcp-worker`
- **Production URL**: `https://basecamp-mcp-worker.hi-8e8.workers.dev`
- **Account ID**: See GitHub Secrets

## 🏗️ CI/CD Pipeline

### GitHub Actions Secrets Required:
```bash
# Cloudflare Configuration
CLOUDFLARE_API_TOKEN=your_cloudflare_api_token
CLOUDFLARE_ACCOUNT_ID=your_cloudflare_account_id

# Basecamp OAuth Token
BASECAMP_ACCESS_TOKEN=your_basecamp_oauth_token
```

### Automatic Deployment
- ✅ **Trigger**: Push to `main` branch
- ✅ **Build**: TypeScript compilation via Wrangler
- ✅ **Deploy**: Cloudflare Workers deployment
- ✅ **Secrets**: Automatic secret injection
- ✅ **Health Check**: Post-deployment verification

## 🔧 Local Development Setup

1. **Clone Repository**:
```bash
git clone https://github.com/QusaiiSaleem/fouq-basecamp.git
cd fouq-basecamp
```

2. **Install Dependencies**:
```bash
npm install
```

3. **Set Production Secrets**:
```bash
# Set Basecamp OAuth token
echo "YOUR_PRODUCTION_TOKEN" | wrangler secret put BASECAMP_ACCESS_TOKEN --config wrangler-production.toml

# Set OAuth credentials (if needed)
echo "2d6f508f858abd5101af6f07737df924506218c3" | wrangler secret put BASECAMP_CLIENT_ID --config wrangler-production.toml
echo "f6d55354e2ba1d438596dd587c65cff4e38a47a1" | wrangler secret put BASECAMP_CLIENT_SECRET --config wrangler-production.toml
```

4. **Deploy Manually** (if needed):
```bash
wrangler deploy --config wrangler-production.toml
```

## 🔍 Production Monitoring

### Health Check Endpoint
```bash
curl https://basecamp-mcp-worker.hi-8e8.workers.dev
```

Expected Response:
```json
{
  "status": "ok",
  "name": "basecamp-mcp-server-expanded",
  "version": "4.2.0",
  "protocol": "MCP 2025-03-26",
  "tools": 28,
  "categories": ["Projects", "Todos", "Messages", "Documents", "Schedules", "People", "Campfire", "Cards", "Webhooks", "Utilities"],
  "compatibility": ["n8n", "Make.com", "Claude Desktop"]
}
```

### Logs & Debugging
```bash
wrangler tail --config wrangler-production.toml
```

## 🚨 Security Notes

- ❌ **NEVER** commit secrets to this repository
- ✅ All secrets managed via GitHub Secrets and Wrangler CLI
- ✅ Repository is private and access-controlled
- ✅ OAuth tokens have limited scope (Basecamp API only)
- ✅ CI/CD pipeline validates deployments before going live

## 🔄 Deployment Process

1. **Development**: Make changes locally and test
2. **Commit**: Push to `main` branch
3. **CI/CD**: GitHub Actions automatically:
   - Validates TypeScript code
   - Deploys to Cloudflare Workers
   - Injects production secrets
   - Runs health checks
4. **Verification**: Confirm deployment at production URL

## 📞 Support & Maintenance

- **Repository**: Private GitHub repository
- **CI/CD**: GitHub Actions
- **Hosting**: Cloudflare Workers
- **Monitoring**: Cloudflare Analytics + Worker logs
- **Updates**: Automatic deployment on push to main

---

**🔒 CONFIDENTIAL - Fouq Agency Internal Use Only**