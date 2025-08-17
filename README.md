# Basecamp MCP Server

A comprehensive Model Context Protocol (MCP) server that provides complete Basecamp 3 API integration for AI automation platforms like n8n, Make.com, and Claude Desktop.

## ✨ Features

- **28 Basecamp Tools**: Complete project management automation
- **OAuth 2.0 Authentication**: Secure Basecamp API access
- **MCP Protocol Compliance**: Compatible with n8n, Make.com, and Claude Desktop
- **Intelligent Error Handling**: Smart detection of disabled Basecamp features
- **Dynamic ID Resolution**: Auto-discovers project dock configurations
- **Real-time Webhooks**: Live notifications for project changes

## 🛠️ Tool Categories

### Projects (3 tools)
- `get_projects` - List all Basecamp projects
- `create_project` - Create new projects
- `get_project` - Get project details

### Todos (5 tools)
- `get_todo_lists` - Get todo lists from project
- `create_todo_list` - Create new todo lists
- `get_todos` - Get todos from lists
- `create_todo` - Create new todo items
- `complete_todo` - Mark todos as done

### Messages (3 tools)
- `get_message_board` - Access message boards
- `get_messages` - Read messages
- `create_message` - Post new messages

### Documents (2 tools)
- `get_documents` - List project documents
- `create_document` - Create new documents

### People (2 tools)
- `get_people` - Get project team members
- `get_all_people` - Get all account users

### Campfire Chat (2 tools)
- `get_campfire` - Access chat rooms
- `post_campfire_message` - Send chat messages

### Schedules (2 tools)
- `get_schedule` - Access project calendars
- `create_schedule_entry` - Create calendar events

### Cards/Kanban (3 tools)
- `get_card_table` - Access Kanban boards
- `create_card` - Create new cards
- `move_card` - Move cards between columns

### Search & Utilities (2 tools)
- `search` - Search across all Basecamp content
- `get_project_features` - Check enabled/disabled project features

### Webhooks (4 tools)
- `create_webhook` - Set up real-time notifications
- `get_webhooks` - List existing webhooks
- `update_webhook` - Modify webhook settings
- `delete_webhook` - Remove webhooks

## 🚀 Quick Setup

### Prerequisites

- [Cloudflare Workers account](https://workers.cloudflare.com/)
- [Wrangler CLI](https://developers.cloudflare.com/workers/wrangler/install-and-update/)
- Basecamp 3 account with admin access

### 1. Create Basecamp Integration

1. Go to [Basecamp Launchpad](https://launchpad.37signals.com/integrations)
2. Create a new integration with these settings:
   - **Name**: Your MCP Server Name
   - **Organization**: Your company name
   - **Website URL**: Your website or GitHub repo
   - **Redirect URI**: `https://YOUR-WORKER-NAME.YOUR-SUBDOMAIN.workers.dev/oauth/callback`

3. Save the **Client ID** and **Client Secret**

### 2. Deploy to Cloudflare Workers

1. Clone this repository:
```bash
git clone https://github.com/QusaiiSaleem/basecamp-mcp-server.git
cd basecamp-mcp-server
```

2. Update `wrangler.toml` with your account details:
```toml
name = "your-basecamp-mcp-worker"
compatibility_date = "2024-01-01"
compatibility_flags = ["nodejs_compat"]

[vars]
BASECAMP_ACCOUNT_ID = "YOUR_ACCOUNT_ID"  # Get this after OAuth
```

3. Deploy the worker:
```bash
wrangler deploy
```

4. Set your OAuth credentials as secrets:
```bash
echo "YOUR_CLIENT_ID" | wrangler secret put BASECAMP_CLIENT_ID
echo "YOUR_CLIENT_SECRET" | wrangler secret put BASECAMP_CLIENT_SECRET
```

### 3. Authenticate with Basecamp

1. Visit your deployed worker URL: `https://your-worker.workers.dev`
2. Note down the OAuth authorization URL from the response
3. Visit the authorization URL to authenticate with Basecamp
4. Copy the access token from the success page
5. Set the access token as a secret:
```bash
echo "YOUR_ACCESS_TOKEN" | wrangler secret put BASECAMP_ACCESS_TOKEN
```

### 4. Get Your Account ID

During the OAuth process, you'll receive your Basecamp account ID. Update your `wrangler.toml`:

```toml
[vars]
BASECAMP_ACCOUNT_ID = "1234567"  # Replace with your actual account ID
```

Redeploy with the account ID:
```bash
wrangler deploy
```

## 🔧 Platform Integration

### n8n Integration

1. Add MCP Client node to your workflow
2. Configure:
   - **Server URL**: `https://your-worker.workers.dev`
   - **Protocol**: `http`
   - **Timeout**: `30000`

3. Use the `tools/list` method to see all available tools
4. Call tools using `tools/call` method with tool name and arguments

### Make.com Integration

1. Add HTTP module
2. Set URL to your worker endpoint
3. Use POST method with JSON-RPC 2.0 format:
```json
{
  "jsonrpc": "2.0",
  "id": 1,
  "method": "tools/call",
  "params": {
    "name": "get_projects",
    "arguments": {}
  }
}
```

### Claude Desktop Integration

Add to your `.mcp.json` configuration:
```json
{
  "mcpServers": {
    "basecamp": {
      "command": "curl",
      "args": [
        "-X", "POST",
        "https://your-worker.workers.dev",
        "-H", "Content-Type: application/json",
        "-d", "{\"jsonrpc\":\"2.0\",\"id\":1,\"method\":\"tools/list\"}"
      ]
    }
  }
}
```

## 📚 Usage Examples

### Create a Project
```json
{
  "jsonrpc": "2.0",
  "id": 1,
  "method": "tools/call",
  "params": {
    "name": "create_project",
    "arguments": {
      "name": "Website Redesign",
      "description": "Complete redesign of company website"
    }
  }
}
```

### Create a Todo List
```json
{
  "jsonrpc": "2.0",
  "id": 2,
  "method": "tools/call",
  "params": {
    "name": "create_todo_list",
    "arguments": {
      "project_id": 12345,
      "todoset_id": 67890,
      "name": "Design Tasks",
      "description": "All design-related tasks"
    }
  }
}
```

### Search for Content
```json
{
  "jsonrpc": "2.0",
  "id": 3,
  "method": "tools/call",
  "params": {
    "name": "search",
    "arguments": {
      "query": "website",
      "type": "Todo",
      "project_id": 12345
    }
  }
}
```

### Set Up Webhooks
```json
{
  "jsonrpc": "2.0",
  "id": 4,
  "method": "tools/call",
  "params": {
    "name": "create_webhook",
    "arguments": {
      "project_id": 12345,
      "payload_url": "https://your-app.com/webhook",
      "types": ["Todo", "Todolist", "Message"]
    }
  }
}
```

## 🔍 Troubleshooting

### Common Issues

**404 Errors on API calls**
- Verify your account ID is correct in `wrangler.toml`
- Ensure your access token is properly set as a secret
- Check that the feature is enabled in your Basecamp project

**Authentication Errors**
- Verify your Client ID and Client Secret are correct
- Ensure the redirect URI matches exactly in your Basecamp integration settings
- Check that your access token hasn't expired

**Feature Not Available Errors**
- Some Basecamp features (like Card Tables) may be disabled by default
- Enable the feature in your Basecamp project settings
- The MCP server will provide clear error messages for disabled features

### Debug Mode

Check your worker's health status:
```bash
curl https://your-worker.workers.dev
```

Expected response:
```json
{
  "status": "ok",
  "name": "basecamp-mcp-server-expanded",
  "version": "4.2.0",
  "protocol": "MCP 2025-03-26",
  "tools": 28,
  "categories": ["Projects", "Todos", "Messages", "Documents", "Schedules", "People", "Campfire", "Cards", "Webhooks"],
  "compatibility": ["n8n", "Make.com", "Claude Desktop"]
}
```

### Logs

View worker logs:
```bash
wrangler tail
```

## 🔐 Security

- **OAuth 2.0**: Secure authentication flow
- **Environment Variables**: Sensitive data stored as Cloudflare secrets
- **CORS**: Configured for cross-origin compatibility
- **Timeout Protection**: 10-second request limits
- **Error Handling**: No sensitive information exposed in errors

## 📝 API Documentation

### Authentication

All requests require a valid Basecamp access token. The server handles authentication automatically once configured.

### Request Format

All requests follow JSON-RPC 2.0 specification:
```json
{
  "jsonrpc": "2.0",
  "id": 1,
  "method": "tools/call",
  "params": {
    "name": "tool_name",
    "arguments": {
      "param1": "value1",
      "param2": "value2"
    }
  }
}
```

### Response Format

```json
{
  "jsonrpc": "2.0",
  "id": 1,
  "result": {
    "content": [
      {
        "type": "text",
        "text": "JSON response data"
      }
    ]
  }
}
```

### Error Handling

Errors return detailed information:
```json
{
  "jsonrpc": "2.0",
  "id": 1,
  "error": {
    "code": -32603,
    "message": "Internal error",
    "data": "Detailed error description"
  }
}
```

## 🤝 Contributing

1. Fork the repository
2. Create a feature branch: `git checkout -b feature/new-tool`
3. Make your changes
4. Add tests if applicable
5. Submit a pull request

## 📄 License

MIT License - see [LICENSE](LICENSE) file for details

## 🆘 Support

- **Issues**: [GitHub Issues](https://github.com/QusaiiSaleem/basecamp-mcp-server/issues)
- **Documentation**: [Basecamp API Docs](https://github.com/basecamp/bc3-api)
- **MCP Protocol**: [Model Context Protocol](https://modelcontextprotocol.io/)

## 🏗️ Architecture

The MCP server is built on Cloudflare Workers for:
- ⚡ **High Performance**: Edge computing with global distribution
- 🔒 **Security**: Built-in DDoS protection and SSL
- 💰 **Cost Effective**: Generous free tier, pay-per-use pricing
- 🚀 **Scalability**: Automatic scaling with zero configuration

## 🔄 Version History

- **v4.2.0**: Enhanced error handling with 28 tools including project feature detection
- **v4.0.0**: Complete MCP protocol compliance with dynamic ID resolution
- **v3.0.0**: OAuth authentication and production deployment
- **v2.0.0**: n8n and Make.com compatibility
- **v1.0.0**: Initial Basecamp API integration

---

**Transform your project management with AI-powered Basecamp automation!** 🚀