# 🖥️ Claude Desktop Integration Setup

Configure your Basecamp MCP server with Claude Desktop for direct AI-powered Basecamp automation.

## 🚀 Quick Setup

### Step 1: Locate Your Claude Desktop Config

Find your Claude Desktop configuration file:

**macOS:**
```bash
~/Library/Application Support/Claude/claude_desktop_config.json
```

**Windows:**
```bash
%APPDATA%\Claude\claude_desktop_config.json
```

**Linux:**
```bash
~/.config/Claude/claude_desktop_config.json
```

### Step 2: Add Basecamp MCP Server

Add this configuration to your `claude_desktop_config.json`:

```json
{
  "mcpServers": {
    "basecamp": {
      "command": "curl",
      "args": [
        "-X", "POST",
        "https://basecamp-mcp-worker.hi-8e8.workers.dev",
        "-H", "Content-Type: application/json",
        "-d", "@-"
      ]
    }
  }
}
```

### Step 3: Restart Claude Desktop

1. Completely quit Claude Desktop
2. Restart the application
3. Look for the 🔌 MCP icon in the interface

## 🔄 Alternative SSE Configuration

For Server-Sent Events support (if preferred):

```json
{
  "mcpServers": {
    "basecamp-sse": {
      "command": "npx",
      "args": [
        "@modelcontextprotocol/client-sse",
        "https://basecamp-mcp-worker.hi-8e8.workers.dev/mcp/sse"
      ]
    }
  }
}
```

## ✅ Verify Connection

After restart, check if Claude Desktop can access Basecamp:

1. Open a new chat in Claude Desktop
2. Look for the 🔌 MCP icon
3. Try asking: *"List all my Basecamp projects"*
4. Claude should respond with your projects

## 🛠️ Available Commands

Once connected, you can ask Claude to:

### Project Management
- *"Create a new Basecamp project called 'Website Redesign'"*
- *"Show me all my Basecamp projects"*
- *"Get details for project ID 12345"*

### Todo Management
- *"Create a todo list called 'Design Tasks' in project 12345"*
- *"Add a todo item 'Design homepage mockup' assigned to user 67890"*
- *"Mark todo 98765 as completed"*

### Communication
- *"Post a message to the message board in project 12345"*
- *"Send a chat message to project 12345"*
- *"Create a document in project 12345"*

### Team & Scheduling
- *"Show me all people in project 12345"*
- *"Create a schedule entry for tomorrow at 2 PM"*
- *"List all todo lists in project 12345"*

### Advanced Features
- *"Search for todos containing 'website' in project 12345"*
- *"Check which features are enabled in project 12345"*
- *"Set up a webhook for project 12345"*

## 🐛 Troubleshooting

### Connection Issues

**MCP Server Not Found:**
- Verify the configuration file path is correct
- Ensure JSON syntax is valid (use a JSON validator)
- Restart Claude Desktop completely

**Authentication Errors:**
- The MCP server uses pre-configured OAuth tokens
- No additional authentication needed from Claude Desktop
- Verify the server URL is accessible: `curl https://basecamp-mcp-worker.hi-8e8.workers.dev`

**Command Not Working:**
- Ensure `curl` is installed on your system
- Test the server directly: `curl -X POST https://basecamp-mcp-worker.hi-8e8.workers.dev -H "Content-Type: application/json" -d '{"jsonrpc":"2.0","id":1,"method":"tools/list"}'`

### Debug Steps

1. **Test Server Health:**
```bash
curl https://basecamp-mcp-worker.hi-8e8.workers.dev
```

2. **Test MCP Protocol:**
```bash
curl -X POST https://basecamp-mcp-worker.hi-8e8.workers.dev \
  -H "Content-Type: application/json" \
  -d '{"jsonrpc":"2.0","id":1,"method":"tools/list"}'
```

3. **Check Claude Desktop Logs:**
   - Look for MCP-related errors in Claude Desktop's console
   - On macOS: Open Console.app and filter for "Claude"

## 📋 Configuration Files

This repository includes sample configurations:

- `claude-desktop-http.json` - HTTP-based MCP (recommended)
- `claude-desktop-simple.json` - SSE-based MCP (alternative)
- `claude-desktop-config.json` - Advanced custom client

## 🔐 Security Notes

- The MCP server uses pre-configured OAuth tokens
- No sensitive data passes through Claude Desktop
- All communication is HTTPS encrypted
- Server runs on Cloudflare Workers (secure edge computing)

## 🎯 Expected Behavior

When properly configured, Claude Desktop will:

✅ **Connect automatically** to your Basecamp MCP server  
✅ **Show MCP indicator** (🔌 icon) in the interface  
✅ **Execute Basecamp commands** through natural language  
✅ **Return real data** from your Basecamp account  
✅ **Handle errors gracefully** with helpful messages  

## 📞 Support

If you encounter issues:

1. **Check server status**: https://basecamp-mcp-worker.hi-8e8.workers.dev
2. **Verify configuration**: Use a JSON validator for your config file
3. **Test manually**: Use curl commands to verify the server works
4. **Restart Claude**: Completely quit and restart Claude Desktop

---

**🚀 Enjoy AI-powered Basecamp automation directly in Claude Desktop!**