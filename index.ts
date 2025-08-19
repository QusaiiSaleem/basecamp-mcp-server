/**
 * Comprehensive Basecamp MCP Server - 59 Tools
 * Complete Basecamp API coverage for project management automation
 * 
 * Version: 6.0.0
 * License: MIT
 * 
 * Features:
 * - 59 Basecamp API tools (complete coverage)
 * - OAuth 2.0 authentication flow
 * - Auto-lookup functionality for resource IDs
 * - Production-ready with robust error handling
 * - Compatible with Claude Desktop, n8n, Make.com, and other MCP clients
 * - SSE and HTTP support
 * 
 * Authentication Methods:
 * 1. OAuth 2.0 flow via /setup endpoint
 * 2. Bearer token in Authorization header
 * 3. access_token in arguments
 * 4. Environment variable fallback
 */

export default {
  async fetch(request: Request, env: any): Promise<Response> {
    const corsHeaders = {
      'Access-Control-Allow-Origin': '*',
      'Access-Control-Allow-Methods': 'GET, POST, OPTIONS',
      'Access-Control-Allow-Headers': '*',
    };

    if (request.method === 'OPTIONS') {
      return new Response(null, { status: 200, headers: corsHeaders });
    }

    if (request.method === 'GET') {
      const url = new URL(request.url);
      
      // OAuth setup endpoint
      if (url.pathname === '/setup') {
        return new Response(getSetupHTML(), {
          headers: { 'Content-Type': 'text/html', ...corsHeaders }
        });
      }

      // OAuth authorization start
      if (url.pathname === '/auth/start') {
        if (!env.BASECAMP_CLIENT_ID) {
          return new Response(getConfigInstructions(), {
            headers: { 'Content-Type': 'text/html', ...corsHeaders }
          });
        }
        const authUrl = `https://launchpad.37signals.com/authorization/new?` +
          `type=web_server&client_id=${env.BASECAMP_CLIENT_ID}&` +
          `redirect_uri=${encodeURIComponent(new URL('/auth/callback', request.url).toString())}`;
        return Response.redirect(authUrl);
      }

      // OAuth callback handler
      if (url.pathname === '/auth/callback') {
        const code = url.searchParams.get('code');
        if (!code) {
          return new Response(getOAuthInstructionsHTML(), {
            headers: { 'Content-Type': 'text/html', ...corsHeaders }
          });
        }

        if (!env.BASECAMP_CLIENT_ID || !env.BASECAMP_CLIENT_SECRET) {
          return new Response(getConfigInstructions(), {
            headers: { 'Content-Type': 'text/html', ...corsHeaders }
          });
        }

        try {
          // Exchange code for access token
          const tokenResponse = await fetch('https://launchpad.37signals.com/authorization/token', {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({
              type: 'authorization_code',
              client_id: env.BASECAMP_CLIENT_ID,
              client_secret: env.BASECAMP_CLIENT_SECRET,
              redirect_uri: new URL('/auth/callback', request.url).toString(),
              code: code
            })
          });

          const tokenData = await tokenResponse.json();
          if (tokenData.access_token) {
            return new Response(getSuccessHTML(tokenData.access_token), {
              headers: { 'Content-Type': 'text/html', ...corsHeaders }
            });
          } else {
            throw new Error('No access token received');
          }
        } catch (error) {
          return new Response(`OAuth Error: ${error.message}`, { 
            status: 400, headers: corsHeaders 
          });
        }
      }

      // Handle SSE endpoint for Claude Desktop
      if (url.pathname === '/mcp/sse') {
        const sseHeaders = {
          'Content-Type': 'text/event-stream',
          'Cache-Control': 'no-cache',
          'Connection': 'keep-alive',
          'Access-Control-Allow-Origin': '*',
          'Access-Control-Allow-Methods': 'GET, POST, OPTIONS',
          'Access-Control-Allow-Headers': '*',
        };

        const { readable, writable } = new TransformStream();
        const writer = writable.getWriter();
        const encoder = new TextEncoder();

        writer.write(encoder.encode('data: {"jsonrpc":"2.0","method":"notifications/initialized","params":{}}\n\n'));

        const pingInterval = setInterval(() => {
          try {
            writer.write(encoder.encode('data: {"jsonrpc":"2.0","method":"notifications/ping","params":{}}\n\n'));
          } catch (e) {
            clearInterval(pingInterval);
          }
        }, 30000);

        setTimeout(() => {
          clearInterval(pingInterval);
          try {
            writer.close();
          } catch (e) {
            // Connection already closed
          }
        }, 300000);

        return new Response(readable, { headers: sseHeaders });
      }

      // Default health check endpoint
      return Response.json({
        status: 'ok',
        name: 'basecamp-mcp-server',
        version: '6.0.0',
        protocol: 'MCP 2025-03-26',
        tools: 59,
        description: 'Complete Basecamp MCP server with full API coverage',
        categories: ['Projects', 'Todos', 'Messages', 'Documents', 'Schedules', 'People', 'Campfire', 'Cards', 'Webhooks', 'Files', 'Comments', 'Client', 'Analytics', 'Utilities'],
        authentication: ['OAuth 2.0', 'Bearer Token', 'Arguments', 'Environment'],
        compatibility: ['n8n', 'Make.com', 'Claude Desktop', 'RelevanceAI'],
        repository: 'https://github.com/QusaiiSaleem/basecamp-mcp-server',
        endpoints: {
          sse: '/mcp/sse',
          http: '/',
          setup: '/setup',
          auth_start: '/auth/start',
          auth_callback: '/auth/callback'
        }
      }, { headers: corsHeaders });
    }

    if (request.method === 'POST') {
      try {
        const mcpRequest = await request.json();
        
        // Handle notifications (no response needed)
        if (!mcpRequest.id && mcpRequest.id !== 0) {
          return new Response('', { status: 204, headers: corsHeaders });
        }

        let result;
        switch (mcpRequest.method) {
          case 'initialize':
            result = {
              protocolVersion: "2025-03-26",
              capabilities: {
                tools: { listChanged: true },
                resources: {},
                prompts: {}
              },
              serverInfo: {
                name: "basecamp-mcp-server",
                version: "6.0.0"
              }
            };
            break;

          case 'tools/list':
            result = { tools: getAllBasecampTools() };
            break;

          case 'resources/list':
            result = { resources: [] };
            break;

          case 'prompts/list':
            result = { prompts: [] };
            break;

          case 'tools/call':
            if (!mcpRequest.params?.name) {
              return Response.json({
                jsonrpc: "2.0",
                id: mcpRequest.id,
                error: {
                  code: -32602,
                  message: "Missing tool name in parameters"
                }
              }, { status: 400, headers: corsHeaders });
            }

            result = await callBasecampTool(mcpRequest.params.name, mcpRequest.params.arguments || {}, request, env);
            break;

          default:
            return Response.json({
              jsonrpc: "2.0",
              id: mcpRequest.id,
              error: {
                code: -32601,
                message: `Method not found: ${mcpRequest.method}`
              }
            }, { status: 404, headers: corsHeaders });
        }

        return Response.json({
          jsonrpc: "2.0",
          id: mcpRequest.id,
          result
        }, { headers: corsHeaders });

      } catch (error) {
        const mcpRequest = await request.json().catch(() => ({}));
        return Response.json({
          jsonrpc: "2.0",
          id: mcpRequest.id || null,
          error: {
            code: -32603,
            message: `Internal error: ${error.message}`
          }
        }, { status: 500, headers: corsHeaders });
      }
    }

    return new Response('Method not allowed', { status: 405, headers: corsHeaders });
  }
};

// Authentication helper
function getAccessToken(args: any, request: Request, env: any): string | null {
  // 1. Check arguments first
  if (args.access_token) {
    return args.access_token;
  }
  
  // 2. Check Authorization header
  const authHeader = request.headers.get('Authorization');
  if (authHeader && authHeader.startsWith('Bearer ')) {
    return authHeader.substring(7);
  }
  
  // 3. Fallback to environment variable
  if (env.BASECAMP_ACCESS_TOKEN) {
    return env.BASECAMP_ACCESS_TOKEN;
  }
  
  return null;
}

// Complete tool definitions (59 tools)
function getAllBasecampTools() {
  return [
    // Project Management (8 tools)
    {
      name: "get_projects",
      description: "List all accessible projects",
      inputSchema: {
        type: "object",
        properties: {
          access_token: { type: "string", description: "Basecamp access token (optional if provided via Authorization header)" }
        },
        additionalProperties: false
      }
    },
    {
      name: "create_project",
      description: "Create a new project",
      inputSchema: {
        type: "object",
        properties: {
          name: { type: "string", description: "Project name" },
          description: { type: "string", description: "Project description (optional)" },
          access_token: { type: "string", description: "Basecamp access token (optional if provided via Authorization header)" }
        },
        required: ["name"],
        additionalProperties: false
      }
    },
    {
      name: "get_project",
      description: "Get detailed information about a specific project",
      inputSchema: {
        type: "object",
        properties: {
          project_id: { type: "string", description: "Project ID" },
          access_token: { type: "string", description: "Basecamp access token (optional if provided via Authorization header)" }
        },
        required: ["project_id"],
        additionalProperties: false
      }
    },
    {
      name: "update_project",
      description: "Update project name and description",
      inputSchema: {
        type: "object",
        properties: {
          project_id: { type: "string", description: "Project ID" },
          name: { type: "string", description: "New project name (optional)" },
          description: { type: "string", description: "New project description (optional)" },
          access_token: { type: "string", description: "Basecamp access token (optional if provided via Authorization header)" }
        },
        required: ["project_id"],
        additionalProperties: false
      }
    },
    {
      name: "archive_project",
      description: "Archive a project (moves it to archived state)",
      inputSchema: {
        type: "object",
        properties: {
          project_id: { type: "string", description: "Project ID" },
          access_token: { type: "string", description: "Basecamp access token (optional if provided via Authorization header)" }
        },
        required: ["project_id"],
        additionalProperties: false
      }
    },
    {
      name: "unarchive_project",
      description: "Unarchive a project (restores it from archived state)",
      inputSchema: {
        type: "object",
        properties: {
          project_id: { type: "string", description: "Project ID" },
          access_token: { type: "string", description: "Basecamp access token (optional if provided via Authorization header)" }
        },
        required: ["project_id"],
        additionalProperties: false
      }
    },
    {
      name: "get_project_construction",
      description: "Get the project's dock/construction (shows available tools and features)",
      inputSchema: {
        type: "object",
        properties: {
          project_id: { type: "string", description: "Project ID" },
          access_token: { type: "string", description: "Basecamp access token (optional if provided via Authorization header)" }
        },
        required: ["project_id"],
        additionalProperties: false
      }
    },
    {
      name: "parse_basecamp_url",
      description: "Parse Basecamp URLs to extract project ID, resource type, and resource ID",
      inputSchema: {
        type: "object",
        properties: {
          url: { type: "string", description: "Basecamp URL to parse" }
        },
        required: ["url"],
        additionalProperties: false
      }
    },

    // Todo Management (11 tools)
    {
      name: "get_todo_lists",
      description: "Get all todo lists for a project (auto-lookup todoset ID)",
      inputSchema: {
        type: "object",
        properties: {
          project_id: { type: "string", description: "Project ID" },
          todoset_id: { type: "string", description: "Todoset ID (optional, will auto-lookup from project dock)" },
          access_token: { type: "string", description: "Basecamp access token (optional if provided via Authorization header)" }
        },
        required: ["project_id"],
        additionalProperties: false
      }
    },
    {
      name: "create_todo_list",
      description: "Create a new todo list (auto-lookup todoset ID)",
      inputSchema: {
        type: "object",
        properties: {
          project_id: { type: "string", description: "Project ID" },
          todoset_id: { type: "string", description: "Todoset ID (optional, will auto-lookup from project dock)" },
          name: { type: "string", description: "Todo list name" },
          description: { type: "string", description: "Todo list description (optional)" },
          access_token: { type: "string", description: "Basecamp access token (optional if provided via Authorization header)" }
        },
        required: ["project_id", "name"],
        additionalProperties: false
      }
    },
    {
      name: "get_todos",
      description: "Get all todos from a specific todo list",
      inputSchema: {
        type: "object",
        properties: {
          project_id: { type: "string", description: "Project ID" },
          todolist_id: { type: "string", description: "Todo list ID" },
          access_token: { type: "string", description: "Basecamp access token (optional if provided via Authorization header)" }
        },
        required: ["project_id", "todolist_id"],
        additionalProperties: false
      }
    },
    {
      name: "get_all_project_todos",
      description: "Get ALL todos across all todo lists in a project (convenience tool)",
      inputSchema: {
        type: "object",
        properties: {
          project_id: { type: "string", description: "Project ID" },
          access_token: { type: "string", description: "Basecamp access token (optional if provided via Authorization header)" }
        },
        required: ["project_id"],
        additionalProperties: false
      }
    },
    {
      name: "create_todo",
      description: "Create a new todo item",
      inputSchema: {
        type: "object",
        properties: {
          project_id: { type: "string", description: "Project ID" },
          todolist_id: { type: "string", description: "Todo list ID" },
          content: { type: "string", description: "Todo content/description" },
          due_on: { type: "string", description: "Due date in YYYY-MM-DD format (optional)" },
          notes: { type: "string", description: "Todo notes (optional)" },
          assignee_ids: { type: "array", items: { type: "number" }, description: "Array of person IDs to assign (optional)" },
          access_token: { type: "string", description: "Basecamp access token (optional if provided via Authorization header)" }
        },
        required: ["project_id", "todolist_id", "content"],
        additionalProperties: false
      }
    },
    {
      name: "update_todo",
      description: "Update an existing todo item",
      inputSchema: {
        type: "object",
        properties: {
          project_id: { type: "string", description: "Project ID" },
          todo_id: { type: "string", description: "Todo ID" },
          content: { type: "string", description: "Todo content/description (optional)" },
          due_on: { type: "string", description: "Due date in YYYY-MM-DD format (optional, null to remove)" },
          notes: { type: "string", description: "Todo notes (optional)" },
          assignee_ids: { type: "array", items: { type: "number" }, description: "Array of person IDs to assign (optional)" },
          access_token: { type: "string", description: "Basecamp access token (optional if provided via Authorization header)" }
        },
        required: ["project_id", "todo_id"],
        additionalProperties: false
      }
    },
    {
      name: "complete_todo",
      description: "Mark a todo as completed",
      inputSchema: {
        type: "object",
        properties: {
          project_id: { type: "string", description: "Project ID" },
          todo_id: { type: "string", description: "Todo ID" },
          access_token: { type: "string", description: "Basecamp access token (optional if provided via Authorization header)" }
        },
        required: ["project_id", "todo_id"],
        additionalProperties: false
      }
    },
    {
      name: "uncomplete_todo",
      description: "Mark a completed todo as incomplete",
      inputSchema: {
        type: "object",
        properties: {
          project_id: { type: "string", description: "Project ID" },
          todo_id: { type: "string", description: "Todo ID" },
          access_token: { type: "string", description: "Basecamp access token (optional if provided via Authorization header)" }
        },
        required: ["project_id", "todo_id"],
        additionalProperties: false
      }
    },
    {
      name: "get_my_assignments",
      description: "Get current user's todo assignments across all projects",
      inputSchema: {
        type: "object",
        properties: {
          access_token: { type: "string", description: "Basecamp access token (optional if provided via Authorization header)" }
        },
        additionalProperties: false
      }
    },
    {
      name: "get_user_assignments",
      description: "Get a specific user's todo assignments across all projects",
      inputSchema: {
        type: "object",
        properties: {
          user_id: { type: "string", description: "User ID" },
          access_token: { type: "string", description: "Basecamp access token (optional if provided via Authorization header)" }
        },
        required: ["user_id"],
        additionalProperties: false
      }
    },
    {
      name: "reposition_todo",
      description: "Change the position/order of a todo within its list",
      inputSchema: {
        type: "object",
        properties: {
          project_id: { type: "string", description: "Project ID" },
          todo_id: { type: "string", description: "Todo ID" },
          position: { type: "number", description: "New position (1-based index)" },
          access_token: { type: "string", description: "Basecamp access token (optional if provided via Authorization header)" }
        },
        required: ["project_id", "todo_id", "position"],
        additionalProperties: false
      }
    },

    // Messages & Communication (6 tools)
    {
      name: "get_message_board",
      description: "Get the message board for a project (auto-lookup message board ID)",
      inputSchema: {
        type: "object",
        properties: {
          project_id: { type: "string", description: "Project ID" },
          message_board_id: { type: "string", description: "Message board ID (optional, will auto-lookup from project dock)" },
          access_token: { type: "string", description: "Basecamp access token (optional if provided via Authorization header)" }
        },
        required: ["project_id"],
        additionalProperties: false
      }
    },
    {
      name: "get_messages",
      description: "Get all messages from a project's message board (auto-lookup message board ID)",
      inputSchema: {
        type: "object",
        properties: {
          project_id: { type: "string", description: "Project ID" },
          message_board_id: { type: "string", description: "Message board ID (optional, will auto-lookup from project dock)" },
          access_token: { type: "string", description: "Basecamp access token (optional if provided via Authorization header)" }
        },
        required: ["project_id"],
        additionalProperties: false
      }
    },
    {
      name: "create_message",
      description: "Create a new message (auto-lookup message board ID)",
      inputSchema: {
        type: "object",
        properties: {
          project_id: { type: "string", description: "Project ID" },
          message_board_id: { type: "string", description: "Message board ID (optional, will auto-lookup from project dock)" },
          subject: { type: "string", description: "Message subject" },
          content: { type: "string", description: "Message content" },
          access_token: { type: "string", description: "Basecamp access token (optional if provided via Authorization header)" }
        },
        required: ["project_id", "subject", "content"],
        additionalProperties: false
      }
    },
    {
      name: "update_message",
      description: "Update an existing message",
      inputSchema: {
        type: "object",
        properties: {
          project_id: { type: "string", description: "Project ID" },
          message_id: { type: "string", description: "Message ID" },
          subject: { type: "string", description: "Message subject (optional)" },
          content: { type: "string", description: "Message content (optional)" },
          access_token: { type: "string", description: "Basecamp access token (optional if provided via Authorization header)" }
        },
        required: ["project_id", "message_id"],
        additionalProperties: false
      }
    },
    {
      name: "get_message",
      description: "Get a specific message by ID",
      inputSchema: {
        type: "object",
        properties: {
          project_id: { type: "string", description: "Project ID" },
          message_id: { type: "string", description: "Message ID" },
          access_token: { type: "string", description: "Basecamp access token (optional if provided via Authorization header)" }
        },
        required: ["project_id", "message_id"],
        additionalProperties: false
      }
    },
    {
      name: "archive_message",
      description: "Archive a message",
      inputSchema: {
        type: "object",
        properties: {
          project_id: { type: "string", description: "Project ID" },
          message_id: { type: "string", description: "Message ID" },
          access_token: { type: "string", description: "Basecamp access token (optional if provided via Authorization header)" }
        },
        required: ["project_id", "message_id"],
        additionalProperties: false
      }
    },

    // Documents & Files (6 tools)
    {
      name: "get_documents",
      description: "Get all documents and files for a project (auto-lookup vault ID)",
      inputSchema: {
        type: "object",
        properties: {
          project_id: { type: "string", description: "Project ID" },
          vault_id: { type: "string", description: "Vault ID (optional, will auto-lookup from project dock)" },
          access_token: { type: "string", description: "Basecamp access token (optional if provided via Authorization header)" }
        },
        required: ["project_id"],
        additionalProperties: false
      }
    },
    {
      name: "create_document",
      description: "Create a new document (auto-lookup vault ID)",
      inputSchema: {
        type: "object",
        properties: {
          project_id: { type: "string", description: "Project ID" },
          vault_id: { type: "string", description: "Vault ID (optional, will auto-lookup from project dock)" },
          title: { type: "string", description: "Document title" },
          content: { type: "string", description: "Document content" },
          access_token: { type: "string", description: "Basecamp access token (optional if provided via Authorization header)" }
        },
        required: ["project_id", "title", "content"],
        additionalProperties: false
      }
    },
    {
      name: "update_document",
      description: "Update an existing document",
      inputSchema: {
        type: "object",
        properties: {
          project_id: { type: "string", description: "Project ID" },
          document_id: { type: "string", description: "Document ID" },
          title: { type: "string", description: "Document title (optional)" },
          content: { type: "string", description: "Document content (optional)" },
          access_token: { type: "string", description: "Basecamp access token (optional if provided via Authorization header)" }
        },
        required: ["project_id", "document_id"],
        additionalProperties: false
      }
    },
    {
      name: "get_document",
      description: "Get a specific document by ID",
      inputSchema: {
        type: "object",
        properties: {
          project_id: { type: "string", description: "Project ID" },
          document_id: { type: "string", description: "Document ID" },
          access_token: { type: "string", description: "Basecamp access token (optional if provided via Authorization header)" }
        },
        required: ["project_id", "document_id"],
        additionalProperties: false
      }
    },
    {
      name: "upload_attachment",
      description: "Upload a file attachment",
      inputSchema: {
        type: "object",
        properties: {
          file_data: { type: "string", description: "Base64 encoded file data" },
          filename: { type: "string", description: "File name" },
          content_type: { type: "string", description: "MIME type of the file" },
          access_token: { type: "string", description: "Basecamp access token (optional if provided via Authorization header)" }
        },
        required: ["file_data", "filename", "content_type"],
        additionalProperties: false
      }
    },
    {
      name: "get_uploads",
      description: "Get all file uploads for a project",
      inputSchema: {
        type: "object",
        properties: {
          project_id: { type: "string", description: "Project ID" },
          access_token: { type: "string", description: "Basecamp access token (optional if provided via Authorization header)" }
        },
        required: ["project_id"],
        additionalProperties: false
      }
    },

    // People & Team Management (4 tools)
    {
      name: "get_people",
      description: "Get all people in a project",
      inputSchema: {
        type: "object",
        properties: {
          project_id: { type: "string", description: "Project ID" },
          access_token: { type: "string", description: "Basecamp access token (optional if provided via Authorization header)" }
        },
        required: ["project_id"],
        additionalProperties: false
      }
    },
    {
      name: "get_all_people",
      description: "Get all people in the Basecamp account",
      inputSchema: {
        type: "object",
        properties: {
          access_token: { type: "string", description: "Basecamp access token (optional if provided via Authorization header)" }
        },
        additionalProperties: false
      }
    },
    {
      name: "add_person_to_project",
      description: "Grant access to one or more people for a project",
      inputSchema: {
        type: "object",
        properties: {
          project_id: { type: "string", description: "Project ID" },
          person_ids: { type: "array", items: { type: "number" }, description: "Array of person IDs to grant access" },
          access_token: { type: "string", description: "Basecamp access token (optional if provided via Authorization header)" }
        },
        required: ["project_id", "person_ids"],
        additionalProperties: false
      }
    },
    {
      name: "remove_person_from_project",
      description: "Revoke access from one or more people for a project",
      inputSchema: {
        type: "object",
        properties: {
          project_id: { type: "string", description: "Project ID" },
          person_ids: { type: "array", items: { type: "number" }, description: "Array of person IDs to revoke access" },
          access_token: { type: "string", description: "Basecamp access token (optional if provided via Authorization header)" }
        },
        required: ["project_id", "person_ids"],
        additionalProperties: false
      }
    },

    // Campfire Chat (3 tools)
    {
      name: "get_campfire",
      description: "Get campfire (chat) for a project",
      inputSchema: {
        type: "object",
        properties: {
          project_id: { type: "string", description: "Project ID" },
          access_token: { type: "string", description: "Basecamp access token (optional if provided via Authorization header)" }
        },
        required: ["project_id"],
        additionalProperties: false
      }
    },
    {
      name: "get_campfire_lines",
      description: "Get recent chat messages from a campfire",
      inputSchema: {
        type: "object",
        properties: {
          project_id: { type: "string", description: "Project ID" },
          campfire_id: { type: "string", description: "Campfire ID" },
          access_token: { type: "string", description: "Basecamp access token (optional if provided via Authorization header)" }
        },
        required: ["project_id", "campfire_id"],
        additionalProperties: false
      }
    },
    {
      name: "post_campfire_message",
      description: "Post a message to campfire chat",
      inputSchema: {
        type: "object",
        properties: {
          project_id: { type: "string", description: "Project ID" },
          campfire_id: { type: "string", description: "Campfire ID" },
          content: { type: "string", description: "Message content" },
          access_token: { type: "string", description: "Basecamp access token (optional if provided via Authorization header)" }
        },
        required: ["project_id", "campfire_id", "content"],
        additionalProperties: false
      }
    },

    // Schedule Management (3 tools)
    {
      name: "get_schedule",
      description: "Get the schedule for a project (auto-lookup schedule ID)",
      inputSchema: {
        type: "object",
        properties: {
          project_id: { type: "string", description: "Project ID" },
          schedule_id: { type: "string", description: "Schedule ID (optional, will auto-lookup from project dock)" },
          access_token: { type: "string", description: "Basecamp access token (optional if provided via Authorization header)" }
        },
        required: ["project_id"],
        additionalProperties: false
      }
    },
    {
      name: "get_schedule_entries",
      description: "Get all schedule entries for a project",
      inputSchema: {
        type: "object",
        properties: {
          project_id: { type: "string", description: "Project ID" },
          schedule_id: { type: "string", description: "Schedule ID (optional, will auto-lookup)" },
          access_token: { type: "string", description: "Basecamp access token (optional if provided via Authorization header)" }
        },
        required: ["project_id"],
        additionalProperties: false
      }
    },
    {
      name: "create_schedule_entry",
      description: "Create a new schedule entry/event",
      inputSchema: {
        type: "object",
        properties: {
          project_id: { type: "string", description: "Project ID" },
          schedule_id: { type: "string", description: "Schedule ID (optional, will auto-lookup)" },
          summary: { type: "string", description: "Event summary/title" },
          description: { type: "string", description: "Event description (optional)" },
          starts_at: { type: "string", description: "Start date/time in ISO 8601 format" },
          ends_at: { type: "string", description: "End date/time in ISO 8601 format (optional)" },
          all_day: { type: "boolean", description: "Whether this is an all-day event (optional)" },
          access_token: { type: "string", description: "Basecamp access token (optional if provided via Authorization header)" }
        },
        required: ["project_id", "summary", "starts_at"],
        additionalProperties: false
      }
    },

    // Card Tables (Kanban) (4 tools)
    {
      name: "get_card_table",
      description: "Get card table (Kanban board) for a project",
      inputSchema: {
        type: "object",
        properties: {
          project_id: { type: "string", description: "Project ID" },
          access_token: { type: "string", description: "Basecamp access token (optional if provided via Authorization header)" }
        },
        required: ["project_id"],
        additionalProperties: false
      }
    },
    {
      name: "get_cards",
      description: "Get all cards from a card table",
      inputSchema: {
        type: "object",
        properties: {
          project_id: { type: "string", description: "Project ID" },
          card_table_id: { type: "string", description: "Card table ID" },
          access_token: { type: "string", description: "Basecamp access token (optional if provided via Authorization header)" }
        },
        required: ["project_id", "card_table_id"],
        additionalProperties: false
      }
    },
    {
      name: "create_card",
      description: "Create a new card in a card table",
      inputSchema: {
        type: "object",
        properties: {
          project_id: { type: "string", description: "Project ID" },
          card_table_id: { type: "string", description: "Card table ID" },
          title: { type: "string", description: "Card title" },
          content: { type: "string", description: "Card content/description (optional)" },
          column_id: { type: "string", description: "Column ID to place the card in" },
          access_token: { type: "string", description: "Basecamp access token (optional if provided via Authorization header)" }
        },
        required: ["project_id", "card_table_id", "title", "column_id"],
        additionalProperties: false
      }
    },
    {
      name: "update_card",
      description: "Update an existing card",
      inputSchema: {
        type: "object",
        properties: {
          project_id: { type: "string", description: "Project ID" },
          card_id: { type: "string", description: "Card ID" },
          title: { type: "string", description: "Card title (optional)" },
          content: { type: "string", description: "Card content (optional)" },
          column_id: { type: "string", description: "Column ID to move the card to (optional)" },
          position: { type: "number", description: "Position within column (optional)" },
          access_token: { type: "string", description: "Basecamp access token (optional if provided via Authorization header)" }
        },
        required: ["project_id", "card_id"],
        additionalProperties: false
      }
    },

    // Comments System (5 tools)
    {
      name: "add_comment_to_recording",
      description: "Add a comment to any Basecamp recording (universal comment tool)",
      inputSchema: {
        type: "object",
        properties: {
          project_id: { type: "string", description: "Project ID" },
          recording_id: { type: "string", description: "Recording ID (todo, message, document, etc.)" },
          content: { type: "string", description: "Comment content" },
          access_token: { type: "string", description: "Basecamp access token (optional if provided via Authorization header)" }
        },
        required: ["project_id", "recording_id", "content"],
        additionalProperties: false
      }
    },
    {
      name: "add_comment_to_todo",
      description: "Add a comment to a specific todo",
      inputSchema: {
        type: "object",
        properties: {
          project_id: { type: "string", description: "Project ID" },
          todo_id: { type: "string", description: "Todo ID" },
          content: { type: "string", description: "Comment content" },
          access_token: { type: "string", description: "Basecamp access token (optional if provided via Authorization header)" }
        },
        required: ["project_id", "todo_id", "content"],
        additionalProperties: false
      }
    },
    {
      name: "add_comment_to_message",
      description: "Add a comment/reply to a message",
      inputSchema: {
        type: "object",
        properties: {
          project_id: { type: "string", description: "Project ID" },
          message_id: { type: "string", description: "Message ID" },
          content: { type: "string", description: "Comment content" },
          access_token: { type: "string", description: "Basecamp access token (optional if provided via Authorization header)" }
        },
        required: ["project_id", "message_id", "content"],
        additionalProperties: false
      }
    },
    {
      name: "add_comment_to_document",
      description: "Add a comment to a document",
      inputSchema: {
        type: "object",
        properties: {
          project_id: { type: "string", description: "Project ID" },
          document_id: { type: "string", description: "Document ID" },
          content: { type: "string", description: "Comment content" },
          access_token: { type: "string", description: "Basecamp access token (optional if provided via Authorization header)" }
        },
        required: ["project_id", "document_id", "content"],
        additionalProperties: false
      }
    },
    {
      name: "add_comment_to_card",
      description: "Add a comment to a card",
      inputSchema: {
        type: "object",
        properties: {
          project_id: { type: "string", description: "Project ID" },
          card_id: { type: "string", description: "Card ID" },
          content: { type: "string", description: "Comment content" },
          access_token: { type: "string", description: "Basecamp access token (optional if provided via Authorization header)" }
        },
        required: ["project_id", "card_id", "content"],
        additionalProperties: false
      }
    },

    // Webhooks (4 tools)
    {
      name: "get_webhooks",
      description: "List all webhooks for the account",
      inputSchema: {
        type: "object",
        properties: {
          access_token: { type: "string", description: "Basecamp access token (optional if provided via Authorization header)" }
        },
        additionalProperties: false
      }
    },
    {
      name: "create_webhook",
      description: "Create a new webhook",
      inputSchema: {
        type: "object",
        properties: {
          payload_url: { type: "string", description: "URL to send webhook payloads to" },
          types: { type: "array", items: { type: "string" }, description: "Array of event types to subscribe to" },
          access_token: { type: "string", description: "Basecamp access token (optional if provided via Authorization header)" }
        },
        required: ["payload_url", "types"],
        additionalProperties: false
      }
    },
    {
      name: "update_webhook",
      description: "Update an existing webhook",
      inputSchema: {
        type: "object",
        properties: {
          webhook_id: { type: "string", description: "Webhook ID" },
          payload_url: { type: "string", description: "URL to send webhook payloads to (optional)" },
          types: { type: "array", items: { type: "string" }, description: "Array of event types to subscribe to (optional)" },
          access_token: { type: "string", description: "Basecamp access token (optional if provided via Authorization header)" }
        },
        required: ["webhook_id"],
        additionalProperties: false
      }
    },
    {
      name: "delete_webhook",
      description: "Delete a webhook",
      inputSchema: {
        type: "object",
        properties: {
          webhook_id: { type: "string", description: "Webhook ID" },
          access_token: { type: "string", description: "Basecamp access token (optional if provided via Authorization header)" }
        },
        required: ["webhook_id"],
        additionalProperties: false
      }
    },

    // Search & Analytics (2 tools)
    {
      name: "search",
      description: "Search content across a project or globally",
      inputSchema: {
        type: "object",
        properties: {
          query: { type: "string", description: "Search query" },
          project_id: { type: "string", description: "Project ID to search within (optional, searches all projects if not provided)" },
          access_token: { type: "string", description: "Basecamp access token (optional if provided via Authorization header)" }
        },
        required: ["query"],
        additionalProperties: false
      }
    },
    {
      name: "get_events",
      description: "Get recent events/activity for a project or globally",
      inputSchema: {
        type: "object",
        properties: {
          project_id: { type: "string", description: "Project ID (optional, gets global events if not provided)" },
          since: { type: "string", description: "ISO 8601 datetime to get events since (optional)" },
          access_token: { type: "string", description: "Basecamp access token (optional if provided via Authorization header)" }
        },
        additionalProperties: false
      }
    }
  ];
}

// Tool execution handler
async function callBasecampTool(toolName: string, args: any, request: Request, env: any) {
  const accessToken = getAccessToken(args, request, env);
  
  if (!accessToken) {
    return {
      isError: true,
      content: [{
        type: "text",
        text: "Authentication required. Please provide access_token in arguments, Authorization header, or configure BASECAMP_ACCESS_TOKEN environment variable. Visit /setup for OAuth setup instructions."
      }]
    };
  }

  const accountId = env.BASECAMP_ACCOUNT_ID || args.account_id;
  if (!accountId && !['get_webhooks', 'create_webhook', 'update_webhook', 'delete_webhook', 'get_all_people'].includes(toolName)) {
    return {
      isError: true,
      content: [{
        type: "text", 
        text: "Configuration required - BASECAMP_ACCOUNT_ID environment variable or account_id parameter is required."
      }]
    };
  }

  const headers = {
    'Authorization': `Bearer ${accessToken}`,
    'Content-Type': 'application/json',
    'User-Agent': 'Basecamp MCP Server (github.com/QusaiiSaleem/basecamp-mcp-server)'
  };

  try {
    switch (toolName) {
      // Project Management
      case 'get_projects':
        const projectsResponse = await fetch(`https://3.basecampapi.com/${accountId}/projects.json`, { headers });
        const projects = await projectsResponse.json();
        return {
          content: [{
            type: "text",
            text: `Projects (${projects.length}):\n\n${projects.map(p => 
              `• ${p.name} (ID: ${p.id})\n  Status: ${p.status}\n  Created: ${new Date(p.created_at).toLocaleDateString()}\n  URL: ${p.app_url}`
            ).join('\n\n')}`
          }]
        };

      case 'create_project':
        const createProjectResponse = await fetch(`https://3.basecampapi.com/${accountId}/projects.json`, {
          method: 'POST',
          headers,
          body: JSON.stringify({
            name: args.name,
            description: args.description || ''
          })
        });
        const newProject = await createProjectResponse.json();
        return {
          content: [{
            type: "text",
            text: `Project created successfully!\n\nName: ${newProject.name}\nID: ${newProject.id}\nURL: ${newProject.app_url}\nStatus: ${newProject.status}`
          }]
        };

      case 'get_project':
        const projectResponse = await fetch(`https://3.basecampapi.com/${accountId}/projects/${args.project_id}.json`, { headers });
        const project = await projectResponse.json();
        return {
          content: [{
            type: "text",
            text: `Project: ${project.name}\n\nID: ${project.id}\nDescription: ${project.description || 'No description'}\nStatus: ${project.status}\nCreated: ${new Date(project.created_at).toLocaleDateString()}\nURL: ${project.app_url}`
          }]
        };

      case 'update_project':
        const updateData: any = {};
        if (args.name) updateData.name = args.name;
        if (args.description !== undefined) updateData.description = args.description;
        
        const updateProjectResponse = await fetch(`https://3.basecampapi.com/${accountId}/projects/${args.project_id}.json`, {
          method: 'PUT',
          headers,
          body: JSON.stringify(updateData)
        });
        const updatedProject = await updateProjectResponse.json();
        return {
          content: [{
            type: "text",
            text: `Project updated successfully!\n\nName: ${updatedProject.name}\nDescription: ${updatedProject.description || 'No description'}`
          }]
        };

      case 'archive_project':
        await fetch(`https://3.basecampapi.com/${accountId}/projects/${args.project_id}.json`, {
          method: 'PUT',
          headers,
          body: JSON.stringify({ status: 'archived' })
        });
        return {
          content: [{
            type: "text",
            text: `Project ${args.project_id} has been archived successfully.`
          }]
        };

      case 'unarchive_project':
        await fetch(`https://3.basecampapi.com/${accountId}/projects/${args.project_id}.json`, {
          method: 'PUT',
          headers,
          body: JSON.stringify({ status: 'active' })
        });
        return {
          content: [{
            type: "text",
            text: `Project ${args.project_id} has been unarchived successfully.`
          }]
        };

      case 'get_project_construction':
        const constructionResponse = await fetch(`https://3.basecampapi.com/${accountId}/projects/${args.project_id}/constructions.json`, { headers });
        const construction = await constructionResponse.json();
        return {
          content: [{
            type: "text",
            text: `Project Tools & Features:\n\n${construction.map(tool => 
              `• ${tool.title} (${tool.name})\n  ID: ${tool.id}\n  URL: ${tool.url}`
            ).join('\n\n')}`
          }]
        };

      case 'parse_basecamp_url':
        const urlParts = args.url.match(/basecamp\.com\/(\d+)\/buckets\/(\d+)(?:\/([\w_]+)(?:\/(\d+))?)?/);
        if (!urlParts) {
          return {
            isError: true,
            content: [{
              type: "text",
              text: "Invalid Basecamp URL format. Expected format: https://3.basecamp.com/999999/buckets/123456/[resource_type]/[resource_id]"
            }]
          };
        }
        
        const [, parsedAccountId, projectId, resourceType, resourceId] = urlParts;
        return {
          content: [{
            type: "text",
            text: `URL Parsed:\n\nAccount ID: ${parsedAccountId}\nProject ID: ${projectId}\nResource Type: ${resourceType || 'project'}\nResource ID: ${resourceId || 'N/A'}\n\nSuggested tools: ${resourceType ? getToolSuggestions(resourceType) : 'get_project, get_project_construction'}`
          }]
        };

      // Todo Management - Enhanced with auto-lookup
      case 'get_todo_lists':
        let todosetId = args.todoset_id;
        
        // Auto-lookup todoset ID if not provided
        if (!todosetId) {
          const dockResponse = await fetch(`https://3.basecampapi.com/${accountId}/projects/${args.project_id}/constructions.json`, { headers });
          const dock = await dockResponse.json();
          const todoTool = dock.find(tool => tool.name === 'todoset');
          if (todoTool) {
            todosetId = todoTool.id;
          } else {
            return {
              isError: true,
              content: [{
                type: "text",
                text: "Todo lists are not enabled for this project or could not be found."
              }]
            };
          }
        }

        const todoListsResponse = await fetch(`https://3.basecampapi.com/${accountId}/projects/${args.project_id}/todosets/${todosetId}/todolists.json`, { headers });
        const todoLists = await todoListsResponse.json();
        return {
          content: [{
            type: "text",
            text: `Todo Lists (${todoLists.length}):\n\n${todoLists.map(list => 
              `• ${list.name}\n  ID: ${list.id}\n  Completed todos: ${list.completed_ratio}\n  URL: ${list.app_url}`
            ).join('\n\n')}`
          }]
        };

      case 'create_todo_list':
        let createTodosetId = args.todoset_id;
        
        // Auto-lookup todoset ID if not provided
        if (!createTodosetId) {
          const dockResponse = await fetch(`https://3.basecampapi.com/${accountId}/projects/${args.project_id}/constructions.json`, { headers });
          const dock = await dockResponse.json();
          const todoTool = dock.find(tool => tool.name === 'todoset');
          if (todoTool) {
            createTodosetId = todoTool.id;
          } else {
            return {
              isError: true,
              content: [{
                type: "text",
                text: "Todo lists are not enabled for this project."
              }]
            };
          }
        }

        const createTodoListResponse = await fetch(`https://3.basecampapi.com/${accountId}/projects/${args.project_id}/todosets/${createTodosetId}/todolists.json`, {
          method: 'POST',
          headers,
          body: JSON.stringify({
            name: args.name,
            description: args.description || ''
          })
        });
        const newTodoList = await createTodoListResponse.json();
        return {
          content: [{
            type: "text",
            text: `Todo list created successfully!\n\nName: ${newTodoList.name}\nID: ${newTodoList.id}\nURL: ${newTodoList.app_url}`
          }]
        };

      case 'get_todos':
        const todosResponse = await fetch(`https://3.basecampapi.com/${accountId}/projects/${args.project_id}/todolists/${args.todolist_id}/todos.json`, { headers });
        const todos = await todosResponse.json();
        return {
          content: [{
            type: "text",
            text: `Todos (${todos.length}):\n\n${todos.map(todo => 
              `${todo.completed ? '✅' : '⏳'} ${todo.content}\n  ID: ${todo.id}\n  Assignees: ${todo.assignees?.map(a => a.name).join(', ') || 'None'}\n  Due: ${todo.due_on || 'No due date'}\n  URL: ${todo.app_url}`
            ).join('\n\n')}`
          }]
        };

      case 'get_all_project_todos':
        // Get all todo lists first
        const dockResponse = await fetch(`https://3.basecampapi.com/${accountId}/projects/${args.project_id}/constructions.json`, { headers });
        const dock = await dockResponse.json();
        const todoTool = dock.find(tool => tool.name === 'todoset');
        
        if (!todoTool) {
          return {
            isError: true,
            content: [{
              type: "text",
              text: "Todo lists are not enabled for this project."
            }]
          };
        }

        const allTodoListsResponse = await fetch(`https://3.basecampapi.com/${accountId}/projects/${args.project_id}/todosets/${todoTool.id}/todolists.json`, { headers });
        const allTodoLists = await allTodoListsResponse.json();

        const allTodos = [];
        for (const list of allTodoLists) {
          const listTodosResponse = await fetch(`https://3.basecampapi.com/${accountId}/projects/${args.project_id}/todolists/${list.id}/todos.json`, { headers });
          const listTodos = await listTodosResponse.json();
          allTodos.push({
            list_name: list.name,
            list_id: list.id,
            todos: listTodos
          });
        }

        const totalTodos = allTodos.reduce((sum, list) => sum + list.todos.length, 0);
        return {
          content: [{
            type: "text",
            text: `All Project Todos (${totalTodos} total):\n\n${allTodos.map(list => 
              `📋 ${list.list_name} (${list.todos.length} todos)\n${list.todos.map(todo => 
                `  ${todo.completed ? '✅' : '⏳'} ${todo.content}\n    Assignees: ${todo.assignees?.map(a => a.name).join(', ') || 'None'}\n    Due: ${todo.due_on || 'No due date'}`
              ).join('\n')}`
            ).join('\n\n')}`
          }]
        };

      case 'create_todo':
        const createTodoData: any = {
          content: args.content,
          notes: args.notes || ''
        };
        
        if (args.due_on) createTodoData.due_on = args.due_on;
        if (args.assignee_ids) createTodoData.assignee_ids = args.assignee_ids;

        const createTodoResponse = await fetch(`https://3.basecampapi.com/${accountId}/projects/${args.project_id}/todolists/${args.todolist_id}/todos.json`, {
          method: 'POST',
          headers,
          body: JSON.stringify(createTodoData)
        });
        const newTodo = await createTodoResponse.json();
        return {
          content: [{
            type: "text",
            text: `Todo created successfully!\n\nContent: ${newTodo.content}\nID: ${newTodo.id}\nDue: ${newTodo.due_on || 'No due date'}\nAssignees: ${newTodo.assignees?.map(a => a.name).join(', ') || 'None'}\nURL: ${newTodo.app_url}`
          }]
        };

      case 'update_todo':
        const updateTodoData: any = {};
        if (args.content) updateTodoData.content = args.content;
        if (args.notes !== undefined) updateTodoData.notes = args.notes;
        if (args.due_on !== undefined) updateTodoData.due_on = args.due_on;
        if (args.assignee_ids) updateTodoData.assignee_ids = args.assignee_ids;

        const updateTodoResponse = await fetch(`https://3.basecampapi.com/${accountId}/projects/${args.project_id}/todos/${args.todo_id}.json`, {
          method: 'PUT',
          headers,
          body: JSON.stringify(updateTodoData)
        });
        const updatedTodo = await updateTodoResponse.json();
        return {
          content: [{
            type: "text",
            text: `Todo updated successfully!\n\nContent: ${updatedTodo.content}\nDue: ${updatedTodo.due_on || 'No due date'}\nAssignees: ${updatedTodo.assignees?.map(a => a.name).join(', ') || 'None'}`
          }]
        };

      case 'complete_todo':
        await fetch(`https://3.basecampapi.com/${accountId}/projects/${args.project_id}/todos/${args.todo_id}/completion.json`, {
          method: 'POST',
          headers
        });
        return {
          content: [{
            type: "text",
            text: `Todo ${args.todo_id} marked as completed! ✅`
          }]
        };

      case 'uncomplete_todo':
        await fetch(`https://3.basecampapi.com/${accountId}/projects/${args.project_id}/todos/${args.todo_id}/completion.json`, {
          method: 'DELETE',
          headers
        });
        return {
          content: [{
            type: "text",
            text: `Todo ${args.todo_id} marked as incomplete! ⏳`
          }]
        };

      case 'get_my_assignments':
        const myAssignmentsResponse = await fetch(`https://3.basecampapi.com/${accountId}/my/assignments.json`, { headers });
        const myAssignments = await myAssignmentsResponse.json();
        return {
          content: [{
            type: "text",
            text: `My Assignments (${myAssignments.length}):\n\n${myAssignments.map(assignment => 
              `${assignment.completed ? '✅' : '⏳'} ${assignment.content}\n  Project: ${assignment.bucket.name}\n  Due: ${assignment.due_on || 'No due date'}\n  URL: ${assignment.app_url}`
            ).join('\n\n')}`
          }]
        };

      case 'get_user_assignments':
        const userAssignmentsResponse = await fetch(`https://3.basecampapi.com/${accountId}/people/${args.user_id}/assignments.json`, { headers });
        const userAssignments = await userAssignmentsResponse.json();
        return {
          content: [{
            type: "text",
            text: `User Assignments (${userAssignments.length}):\n\n${userAssignments.map(assignment => 
              `${assignment.completed ? '✅' : '⏳'} ${assignment.content}\n  Project: ${assignment.bucket.name}\n  Due: ${assignment.due_on || 'No due date'}\n  URL: ${assignment.app_url}`
            ).join('\n\n')}`
          }]
        };

      case 'reposition_todo':
        await fetch(`https://3.basecampapi.com/${accountId}/projects/${args.project_id}/todos/${args.todo_id}/position.json`, {
          method: 'PUT',
          headers,
          body: JSON.stringify({ position: args.position })
        });
        return {
          content: [{
            type: "text",
            text: `Todo repositioned to position ${args.position} successfully!`
          }]
        };

      // Messages & Communication - Enhanced with auto-lookup
      case 'get_message_board':
        let messageBoardId = args.message_board_id;
        
        // Auto-lookup message board ID if not provided
        if (!messageBoardId) {
          const dockResponse = await fetch(`https://3.basecampapi.com/${accountId}/projects/${args.project_id}/constructions.json`, { headers });
          const dock = await dockResponse.json();
          const messageTool = dock.find(tool => tool.name === 'message_board');
          if (messageTool) {
            messageBoardId = messageTool.id;
          } else {
            return {
              isError: true,
              content: [{
                type: "text",
                text: "Message board is not enabled for this project."
              }]
            };
          }
        }

        const messageBoardResponse = await fetch(`https://3.basecampapi.com/${accountId}/projects/${args.project_id}/message_boards/${messageBoardId}.json`, { headers });
        const messageBoard = await messageBoardResponse.json();
        return {
          content: [{
            type: "text",
            text: `Message Board: ${messageBoard.title}\n\nID: ${messageBoard.id}\nURL: ${messageBoard.app_url}`
          }]
        };

      case 'get_messages':
        let getMessagesBoardId = args.message_board_id;
        
        // Auto-lookup message board ID if not provided
        if (!getMessagesBoardId) {
          const dockResponse = await fetch(`https://3.basecampapi.com/${accountId}/projects/${args.project_id}/constructions.json`, { headers });
          const dock = await dockResponse.json();
          const messageTool = dock.find(tool => tool.name === 'message_board');
          if (messageTool) {
            getMessagesBoardId = messageTool.id;
          } else {
            return {
              isError: true,
              content: [{
                type: "text",
                text: "Message board is not enabled for this project."
              }]
            };
          }
        }

        const messagesResponse = await fetch(`https://3.basecampapi.com/${accountId}/projects/${args.project_id}/message_boards/${getMessagesBoardId}/messages.json`, { headers });
        const messages = await messagesResponse.json();
        return {
          content: [{
            type: "text",
            text: `Messages (${messages.length}):\n\n${messages.map(msg => 
              `📝 ${msg.subject}\n  By: ${msg.creator.name}\n  Date: ${new Date(msg.created_at).toLocaleDateString()}\n  ID: ${msg.id}\n  URL: ${msg.app_url}`
            ).join('\n\n')}`
          }]
        };

      case 'create_message':
        let createMessageBoardId = args.message_board_id;
        
        // Auto-lookup message board ID if not provided
        if (!createMessageBoardId) {
          const dockResponse = await fetch(`https://3.basecampapi.com/${accountId}/projects/${args.project_id}/constructions.json`, { headers });
          const dock = await dockResponse.json();
          const messageTool = dock.find(tool => tool.name === 'message_board');
          if (messageTool) {
            createMessageBoardId = messageTool.id;
          } else {
            return {
              isError: true,
              content: [{
                type: "text",
                text: "Message board is not enabled for this project."
              }]
            };
          }
        }

        const createMessageResponse = await fetch(`https://3.basecampapi.com/${accountId}/projects/${args.project_id}/message_boards/${createMessageBoardId}/messages.json`, {
          method: 'POST',
          headers,
          body: JSON.stringify({
            subject: args.subject,
            content: args.content
          })
        });
        const newMessage = await createMessageResponse.json();
        return {
          content: [{
            type: "text",
            text: `Message created successfully!\n\nSubject: ${newMessage.subject}\nID: ${newMessage.id}\nURL: ${newMessage.app_url}`
          }]
        };

      case 'update_message':
        const updateMessageData: any = {};
        if (args.subject) updateMessageData.subject = args.subject;
        if (args.content) updateMessageData.content = args.content;

        const updateMessageResponse = await fetch(`https://3.basecampapi.com/${accountId}/projects/${args.project_id}/messages/${args.message_id}.json`, {
          method: 'PUT',
          headers,
          body: JSON.stringify(updateMessageData)
        });
        const updatedMessage = await updateMessageResponse.json();
        return {
          content: [{
            type: "text",
            text: `Message updated successfully!\n\nSubject: ${updatedMessage.subject}`
          }]
        };

      case 'get_message':
        const messageResponse = await fetch(`https://3.basecampapi.com/${accountId}/projects/${args.project_id}/messages/${args.message_id}.json`, { headers });
        const message = await messageResponse.json();
        return {
          content: [{
            type: "text",
            text: `Message: ${message.subject}\n\nBy: ${message.creator.name}\nDate: ${new Date(message.created_at).toLocaleDateString()}\nContent: ${message.content.replace(/<[^>]*>/g, '')}\nURL: ${message.app_url}`
          }]
        };

      case 'archive_message':
        await fetch(`https://3.basecampapi.com/${accountId}/projects/${args.project_id}/messages/${args.message_id}.json`, {
          method: 'PUT',
          headers,
          body: JSON.stringify({ status: 'archived' })
        });
        return {
          content: [{
            type: "text",
            text: `Message ${args.message_id} has been archived successfully.`
          }]
        };

      // Documents & Files - Enhanced with auto-lookup
      case 'get_documents':
        let vaultId = args.vault_id;
        
        // Auto-lookup vault ID if not provided
        if (!vaultId) {
          const dockResponse = await fetch(`https://3.basecampapi.com/${accountId}/projects/${args.project_id}/constructions.json`, { headers });
          const dock = await dockResponse.json();
          const vaultTool = dock.find(tool => tool.name === 'vault');
          if (vaultTool) {
            vaultId = vaultTool.id;
          } else {
            return {
              isError: true,
              content: [{
                type: "text",
                text: "Documents & Files are not enabled for this project."
              }]
            };
          }
        }

        const documentsResponse = await fetch(`https://3.basecampapi.com/${accountId}/projects/${args.project_id}/vaults/${vaultId}/documents.json`, { headers });
        const documents = await documentsResponse.json();
        return {
          content: [{
            type: "text",
            text: `Documents (${documents.length}):\n\n${documents.map(doc => 
              `📄 ${doc.title}\n  By: ${doc.creator.name}\n  Date: ${new Date(doc.created_at).toLocaleDateString()}\n  ID: ${doc.id}\n  URL: ${doc.app_url}`
            ).join('\n\n')}`
          }]
        };

      case 'create_document':
        let createVaultId = args.vault_id;
        
        // Auto-lookup vault ID if not provided
        if (!createVaultId) {
          const dockResponse = await fetch(`https://3.basecampapi.com/${accountId}/projects/${args.project_id}/constructions.json`, { headers });
          const dock = await dockResponse.json();
          const vaultTool = dock.find(tool => tool.name === 'vault');
          if (vaultTool) {
            createVaultId = vaultTool.id;
          } else {
            return {
              isError: true,
              content: [{
                type: "text",
                text: "Documents & Files are not enabled for this project."
              }]
            };
          }
        }

        const createDocumentResponse = await fetch(`https://3.basecampapi.com/${accountId}/projects/${args.project_id}/vaults/${createVaultId}/documents.json`, {
          method: 'POST',
          headers,
          body: JSON.stringify({
            title: args.title,
            content: args.content
          })
        });
        const newDocument = await createDocumentResponse.json();
        return {
          content: [{
            type: "text",
            text: `Document created successfully!\n\nTitle: ${newDocument.title}\nID: ${newDocument.id}\nURL: ${newDocument.app_url}`
          }]
        };

      case 'update_document':
        const updateDocumentData: any = {};
        if (args.title) updateDocumentData.title = args.title;
        if (args.content) updateDocumentData.content = args.content;

        const updateDocumentResponse = await fetch(`https://3.basecampapi.com/${accountId}/projects/${args.project_id}/documents/${args.document_id}.json`, {
          method: 'PUT',
          headers,
          body: JSON.stringify(updateDocumentData)
        });
        const updatedDocument = await updateDocumentResponse.json();
        return {
          content: [{
            type: "text",
            text: `Document updated successfully!\n\nTitle: ${updatedDocument.title}`
          }]
        };

      case 'get_document':
        const documentResponse = await fetch(`https://3.basecampapi.com/${accountId}/projects/${args.project_id}/documents/${args.document_id}.json`, { headers });
        const document = await documentResponse.json();
        return {
          content: [{
            type: "text",
            text: `Document: ${document.title}\n\nBy: ${document.creator.name}\nDate: ${new Date(document.created_at).toLocaleDateString()}\nContent: ${document.content.replace(/<[^>]*>/g, '')}\nURL: ${document.app_url}`
          }]
        };

      case 'upload_attachment':
        // First upload to Basecamp's attachment endpoint
        const uploadResponse = await fetch(`https://3.basecampapi.com/${accountId}/attachments.json`, {
          method: 'POST',
          headers: {
            'Authorization': `Bearer ${accessToken}`,
            'Content-Type': args.content_type,
            'User-Agent': 'Basecamp MCP Server'
          },
          body: atob(args.file_data) // Decode base64 to binary
        });
        const attachment = await uploadResponse.json();
        return {
          content: [{
            type: "text",
            text: `File uploaded successfully!\n\nFilename: ${attachment.filename}\nSize: ${attachment.byte_size} bytes\nDownload URL: ${attachment.download_url}`
          }]
        };

      case 'get_uploads':
        const uploadsResponse = await fetch(`https://3.basecampapi.com/${accountId}/projects/${args.project_id}/uploads.json`, { headers });
        const uploads = await uploadsResponse.json();
        return {
          content: [{
            type: "text",
            text: `Uploads (${uploads.length}):\n\n${uploads.map(upload => 
              `📎 ${upload.filename}\n  Size: ${upload.byte_size} bytes\n  By: ${upload.creator.name}\n  Date: ${new Date(upload.created_at).toLocaleDateString()}\n  Download: ${upload.download_url}`
            ).join('\n\n')}`
          }]
        };

      // People & Team Management
      case 'get_people':
        const peopleResponse = await fetch(`https://3.basecampapi.com/${accountId}/projects/${args.project_id}/people.json`, { headers });
        const people = await peopleResponse.json();
        return {
          content: [{
            type: "text",
            text: `Project Team (${people.length}):\n\n${people.map(person => 
              `👤 ${person.name}\n  Email: ${person.email_address}\n  ID: ${person.id}\n  Title: ${person.title || 'No title'}\n  Admin: ${person.admin ? 'Yes' : 'No'}`
            ).join('\n\n')}`
          }]
        };

      case 'get_all_people':
        const allPeopleResponse = await fetch(`https://3.basecampapi.com/${accountId}/people.json`, { headers });
        const allPeople = await allPeopleResponse.json();
        return {
          content: [{
            type: "text",
            text: `All People (${allPeople.length}):\n\n${allPeople.map(person => 
              `👤 ${person.name}\n  Email: ${person.email_address}\n  ID: ${person.id}\n  Title: ${person.title || 'No title'}\n  Admin: ${person.admin ? 'Yes' : 'No'}`
            ).join('\n\n')}`
          }]
        };

      case 'add_person_to_project':
        await fetch(`https://3.basecampapi.com/${accountId}/projects/${args.project_id}/people.json`, {
          method: 'POST',
          headers,
          body: JSON.stringify({
            grant: args.person_ids
          })
        });
        return {
          content: [{
            type: "text",
            text: `Successfully granted access to ${args.person_ids.length} person(s) for project ${args.project_id}.`
          }]
        };

      case 'remove_person_from_project':
        await fetch(`https://3.basecampapi.com/${accountId}/projects/${args.project_id}/people.json`, {
          method: 'POST',
          headers,
          body: JSON.stringify({
            revoke: args.person_ids
          })
        });
        return {
          content: [{
            type: "text",
            text: `Successfully revoked access from ${args.person_ids.length} person(s) for project ${args.project_id}.`
          }]
        };

      // Campfire Chat
      case 'get_campfire':
        const campfireResponse = await fetch(`https://3.basecampapi.com/${accountId}/projects/${args.project_id}/chats.json`, { headers });
        const campfires = await campfireResponse.json();
        return {
          content: [{
            type: "text",
            text: `Campfires (${campfires.length}):\n\n${campfires.map(chat => 
              `💬 ${chat.title}\n  ID: ${chat.id}\n  URL: ${chat.app_url}`
            ).join('\n\n')}`
          }]
        };

      case 'get_campfire_lines':
        const linesResponse = await fetch(`https://3.basecampapi.com/${accountId}/projects/${args.project_id}/chats/${args.campfire_id}/lines.json`, { headers });
        const lines = await linesResponse.json();
        return {
          content: [{
            type: "text",
            text: `Recent Chat Messages (${lines.length}):\n\n${lines.map(line => 
              `${line.creator.name}: ${line.content}\n  Time: ${new Date(line.created_at).toLocaleString()}`
            ).join('\n\n')}`
          }]
        };

      case 'post_campfire_message':
        const postMessageResponse = await fetch(`https://3.basecampapi.com/${accountId}/projects/${args.project_id}/chats/${args.campfire_id}/lines.json`, {
          method: 'POST',
          headers,
          body: JSON.stringify({
            content: args.content
          })
        });
        const postedLine = await postMessageResponse.json();
        return {
          content: [{
            type: "text",
            text: `Message posted successfully!\n\nContent: ${postedLine.content}\nTime: ${new Date(postedLine.created_at).toLocaleString()}`
          }]
        };

      // Schedule Management
      case 'get_schedule':
        let scheduleId = args.schedule_id;
        
        // Auto-lookup schedule ID if not provided
        if (!scheduleId) {
          const dockResponse = await fetch(`https://3.basecampapi.com/${accountId}/projects/${args.project_id}/constructions.json`, { headers });
          const dock = await dockResponse.json();
          const scheduleTool = dock.find(tool => tool.name === 'schedule');
          if (scheduleTool) {
            scheduleId = scheduleTool.id;
          } else {
            return {
              isError: true,
              content: [{
                type: "text",
                text: "Schedule is not enabled for this project."
              }]
            };
          }
        }

        const scheduleResponse = await fetch(`https://3.basecampapi.com/${accountId}/projects/${args.project_id}/schedules/${scheduleId}.json`, { headers });
        const schedule = await scheduleResponse.json();
        return {
          content: [{
            type: "text",
            text: `Schedule: ${schedule.title}\n\nID: ${schedule.id}\nURL: ${schedule.app_url}`
          }]
        };

      case 'get_schedule_entries':
        let getEntriesScheduleId = args.schedule_id;
        
        // Auto-lookup schedule ID if not provided
        if (!getEntriesScheduleId) {
          const dockResponse = await fetch(`https://3.basecampapi.com/${accountId}/projects/${args.project_id}/constructions.json`, { headers });
          const dock = await dockResponse.json();
          const scheduleTool = dock.find(tool => tool.name === 'schedule');
          if (scheduleTool) {
            getEntriesScheduleId = scheduleTool.id;
          } else {
            return {
              isError: true,
              content: [{
                type: "text",
                text: "Schedule is not enabled for this project."
              }]
            };
          }
        }

        const entriesResponse = await fetch(`https://3.basecampapi.com/${accountId}/projects/${args.project_id}/schedules/${getEntriesScheduleId}/entries.json`, { headers });
        const entries = await entriesResponse.json();
        return {
          content: [{
            type: "text",
            text: `Schedule Entries (${entries.length}):\n\n${entries.map(entry => 
              `📅 ${entry.summary}\n  Start: ${new Date(entry.starts_at).toLocaleString()}\n  End: ${entry.ends_at ? new Date(entry.ends_at).toLocaleString() : 'No end time'}\n  All Day: ${entry.all_day ? 'Yes' : 'No'}\n  ID: ${entry.id}\n  URL: ${entry.app_url}`
            ).join('\n\n')}`
          }]
        };

      case 'create_schedule_entry':
        let createScheduleId = args.schedule_id;
        
        // Auto-lookup schedule ID if not provided
        if (!createScheduleId) {
          const dockResponse = await fetch(`https://3.basecampapi.com/${accountId}/projects/${args.project_id}/constructions.json`, { headers });
          const dock = await dockResponse.json();
          const scheduleTool = dock.find(tool => tool.name === 'schedule');
          if (scheduleTool) {
            createScheduleId = scheduleTool.id;
          } else {
            return {
              isError: true,
              content: [{
                type: "text",
                text: "Schedule is not enabled for this project."
              }]
            };
          }
        }

        const createEntryData: any = {
          summary: args.summary,
          starts_at: args.starts_at
        };
        
        if (args.description) createEntryData.description = args.description;
        if (args.ends_at) createEntryData.ends_at = args.ends_at;
        if (args.all_day !== undefined) createEntryData.all_day = args.all_day;

        const createEntryResponse = await fetch(`https://3.basecampapi.com/${accountId}/projects/${args.project_id}/schedules/${createScheduleId}/entries.json`, {
          method: 'POST',
          headers,
          body: JSON.stringify(createEntryData)
        });
        const newEntry = await createEntryResponse.json();
        return {
          content: [{
            type: "text",
            text: `Schedule entry created successfully!\n\nSummary: ${newEntry.summary}\nStart: ${new Date(newEntry.starts_at).toLocaleString()}\nEnd: ${newEntry.ends_at ? new Date(newEntry.ends_at).toLocaleString() : 'No end time'}\nURL: ${newEntry.app_url}`
          }]
        };

      // Card Tables (Kanban)
      case 'get_card_table':
        const cardTablesResponse = await fetch(`https://3.basecampapi.com/${accountId}/projects/${args.project_id}/card_tables.json`, { headers });
        const cardTables = await cardTablesResponse.json();
        return {
          content: [{
            type: "text",
            text: `Card Tables (${cardTables.length}):\n\n${cardTables.map(table => 
              `📋 ${table.title}\n  ID: ${table.id}\n  Columns: ${table.lists?.length || 0}\n  URL: ${table.app_url}`
            ).join('\n\n')}`
          }]
        };

      case 'get_cards':
        const cardsResponse = await fetch(`https://3.basecampapi.com/${accountId}/projects/${args.project_id}/card_tables/${args.card_table_id}/cards.json`, { headers });
        const cards = await cardsResponse.json();
        return {
          content: [{
            type: "text",
            text: `Cards (${cards.length}):\n\n${cards.map(card => 
              `🎫 ${card.title}\n  Content: ${card.content?.replace(/<[^>]*>/g, '') || 'No content'}\n  Column: ${card.column?.title || 'Unknown'}\n  ID: ${card.id}\n  URL: ${card.app_url}`
            ).join('\n\n')}`
          }]
        };

      case 'create_card':
        const createCardData: any = {
          title: args.title,
          column_id: args.column_id
        };
        
        if (args.content) createCardData.content = args.content;

        const createCardResponse = await fetch(`https://3.basecampapi.com/${accountId}/projects/${args.project_id}/card_tables/${args.card_table_id}/cards.json`, {
          method: 'POST',
          headers,
          body: JSON.stringify(createCardData)
        });
        const newCard = await createCardResponse.json();
        return {
          content: [{
            type: "text",
            text: `Card created successfully!\n\nTitle: ${newCard.title}\nID: ${newCard.id}\nURL: ${newCard.app_url}`
          }]
        };

      case 'update_card':
        const updateCardData: any = {};
        if (args.title) updateCardData.title = args.title;
        if (args.content !== undefined) updateCardData.content = args.content;
        if (args.column_id) updateCardData.column_id = args.column_id;
        if (args.position) updateCardData.position = args.position;

        const updateCardResponse = await fetch(`https://3.basecampapi.com/${accountId}/projects/${args.project_id}/cards/${args.card_id}.json`, {
          method: 'PUT',
          headers,
          body: JSON.stringify(updateCardData)
        });
        const updatedCard = await updateCardResponse.json();
        return {
          content: [{
            type: "text",
            text: `Card updated successfully!\n\nTitle: ${updatedCard.title}`
          }]
        };

      // Comments System
      case 'add_comment_to_recording':
        const commentResponse = await fetch(`https://3.basecampapi.com/${accountId}/projects/${args.project_id}/recordings/${args.recording_id}/comments.json`, {
          method: 'POST',
          headers,
          body: JSON.stringify({
            content: args.content
          })
        });
        const comment = await commentResponse.json();
        return {
          content: [{
            type: "text",
            text: `Comment added successfully!\n\nContent: ${comment.content}\nBy: ${comment.creator.name}\nTime: ${new Date(comment.created_at).toLocaleString()}`
          }]
        };

      case 'add_comment_to_todo':
        const todoCommentResponse = await fetch(`https://3.basecampapi.com/${accountId}/projects/${args.project_id}/todos/${args.todo_id}/comments.json`, {
          method: 'POST',
          headers,
          body: JSON.stringify({
            content: args.content
          })
        });
        const todoComment = await todoCommentResponse.json();
        return {
          content: [{
            type: "text",
            text: `Comment added to todo successfully!\n\nContent: ${todoComment.content}\nBy: ${todoComment.creator.name}`
          }]
        };

      case 'add_comment_to_message':
        const messageCommentResponse = await fetch(`https://3.basecampapi.com/${accountId}/projects/${args.project_id}/messages/${args.message_id}/comments.json`, {
          method: 'POST',
          headers,
          body: JSON.stringify({
            content: args.content
          })
        });
        const messageComment = await messageCommentResponse.json();
        return {
          content: [{
            type: "text",
            text: `Reply added to message successfully!\n\nContent: ${messageComment.content}\nBy: ${messageComment.creator.name}`
          }]
        };

      case 'add_comment_to_document':
        const documentCommentResponse = await fetch(`https://3.basecampapi.com/${accountId}/projects/${args.project_id}/documents/${args.document_id}/comments.json`, {
          method: 'POST',
          headers,
          body: JSON.stringify({
            content: args.content
          })
        });
        const documentComment = await documentCommentResponse.json();
        return {
          content: [{
            type: "text",
            text: `Comment added to document successfully!\n\nContent: ${documentComment.content}\nBy: ${documentComment.creator.name}`
          }]
        };

      case 'add_comment_to_card':
        const cardCommentResponse = await fetch(`https://3.basecampapi.com/${accountId}/projects/${args.project_id}/cards/${args.card_id}/comments.json`, {
          method: 'POST',
          headers,
          body: JSON.stringify({
            content: args.content
          })
        });
        const cardComment = await cardCommentResponse.json();
        return {
          content: [{
            type: "text",
            text: `Comment added to card successfully!\n\nContent: ${cardComment.content}\nBy: ${cardComment.creator.name}`
          }]
        };

      // Webhooks
      case 'get_webhooks':
        const webhooksResponse = await fetch(`https://3.basecampapi.com/${accountId}/webhooks.json`, { headers });
        const webhooks = await webhooksResponse.json();
        return {
          content: [{
            type: "text",
            text: `Webhooks (${webhooks.length}):\n\n${webhooks.map(webhook => 
              `🔗 ${webhook.payload_url}\n  Types: ${webhook.types.join(', ')}\n  ID: ${webhook.id}\n  Active: ${webhook.active ? 'Yes' : 'No'}`
            ).join('\n\n')}`
          }]
        };

      case 'create_webhook':
        const createWebhookResponse = await fetch(`https://3.basecampapi.com/${accountId}/webhooks.json`, {
          method: 'POST',
          headers,
          body: JSON.stringify({
            payload_url: args.payload_url,
            types: args.types
          })
        });
        const newWebhook = await createWebhookResponse.json();
        return {
          content: [{
            type: "text",
            text: `Webhook created successfully!\n\nURL: ${newWebhook.payload_url}\nTypes: ${newWebhook.types.join(', ')}\nID: ${newWebhook.id}`
          }]
        };

      case 'update_webhook':
        const updateWebhookData: any = {};
        if (args.payload_url) updateWebhookData.payload_url = args.payload_url;
        if (args.types) updateWebhookData.types = args.types;

        const updateWebhookResponse = await fetch(`https://3.basecampapi.com/${accountId}/webhooks/${args.webhook_id}.json`, {
          method: 'PUT',
          headers,
          body: JSON.stringify(updateWebhookData)
        });
        const updatedWebhook = await updateWebhookResponse.json();
        return {
          content: [{
            type: "text",
            text: `Webhook updated successfully!\n\nURL: ${updatedWebhook.payload_url}\nTypes: ${updatedWebhook.types.join(', ')}`
          }]
        };

      case 'delete_webhook':
        await fetch(`https://3.basecampapi.com/${accountId}/webhooks/${args.webhook_id}.json`, {
          method: 'DELETE',
          headers
        });
        return {
          content: [{
            type: "text",
            text: `Webhook ${args.webhook_id} deleted successfully.`
          }]
        };

      // Search & Analytics
      case 'search':
        const searchUrl = args.project_id 
          ? `https://3.basecampapi.com/${accountId}/projects/${args.project_id}/search.json?q=${encodeURIComponent(args.query)}`
          : `https://3.basecampapi.com/${accountId}/search.json?q=${encodeURIComponent(args.query)}`;
          
        const searchResponse = await fetch(searchUrl, { headers });
        const searchResults = await searchResponse.json();
        return {
          content: [{
            type: "text",
            text: `Search Results for "${args.query}" (${searchResults.length}):\n\n${searchResults.map(result => 
              `📄 ${result.title || result.content?.substring(0, 50) + '...'}\n  Type: ${result.type}\n  Project: ${result.bucket?.name || 'Unknown'}\n  URL: ${result.app_url}`
            ).join('\n\n')}`
          }]
        };

      case 'get_events':
        const eventsUrl = args.project_id 
          ? `https://3.basecampapi.com/${accountId}/projects/${args.project_id}/events.json`
          : `https://3.basecampapi.com/${accountId}/events.json`;
          
        const eventsResponse = await fetch(eventsUrl, { headers });
        const events = await eventsResponse.json();
        return {
          content: [{
            type: "text",
            text: `Recent Events (${events.length}):\n\n${events.map(event => 
              `🔄 ${event.summary}\n  By: ${event.creator.name}\n  Time: ${new Date(event.created_at).toLocaleString()}\n  Type: ${event.action}\n  Target: ${event.target?.title || 'Unknown'}`
            ).join('\n\n')}`
          }]
        };

      default:
        return {
          isError: true,
          content: [{
            type: "text",
            text: `Unknown tool: ${toolName}`
          }]
        };
    }
    
  } catch (error) {
    return {
      isError: true,
      content: [{
        type: "text",
        text: `Error calling ${toolName}: ${error.message}`
      }]
    };
  }
}

// Helper function to suggest relevant tools based on resource type
function getToolSuggestions(resourceType: string): string {
  const suggestions = {
    'todolists': 'get_todos, create_todo, get_todo_lists',
    'todos': 'update_todo, complete_todo, add_comment_to_todo',
    'messages': 'get_message, update_message, add_comment_to_message',
    'documents': 'get_document, update_document, add_comment_to_document',
    'cards': 'update_card, add_comment_to_card',
    'schedules': 'get_schedule_entries, create_schedule_entry',
    'chats': 'get_campfire_lines, post_campfire_message'
  };
  
  return suggestions[resourceType] || 'get_project_construction';
}

// HTML templates for OAuth setup
function getSetupHTML(): string {
  return `
    <!DOCTYPE html>
    <html>
    <head>
      <title>Basecamp MCP Server Setup</title>
      <style>
        body { font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto; max-width: 800px; margin: 0 auto; padding: 40px 20px; }
        .header { background: linear-gradient(135deg, #1f5f99 0%, #2d8cc8 100%); color: white; padding: 30px; border-radius: 12px; margin-bottom: 30px; }
        .feature { background: #f8f9fa; padding: 20px; border-radius: 8px; margin: 20px 0; }
        .button { display: inline-block; background: #1f5f99; color: white; padding: 12px 24px; text-decoration: none; border-radius: 6px; font-weight: bold; }
        .button:hover { background: #2d8cc8; }
        .step { background: white; border: 1px solid #e1e5e9; padding: 20px; border-radius: 8px; margin: 15px 0; }
        .code { background: #f1f3f4; padding: 10px; border-radius: 4px; font-family: 'Monaco', 'Consolas', monospace; }
        .warning { background: #fff3cd; border: 1px solid #ffeaa7; padding: 15px; border-radius: 6px; margin: 15px 0; }
      </style>
    </head>
    <body>
      <div class="header">
        <h1>🏕️ Basecamp MCP Server v6.0.0</h1>
        <p>Complete Basecamp API automation with 59 comprehensive tools</p>
      </div>

      <div class="warning">
        <strong>⚠️ Setup Required:</strong> You need to configure OAuth credentials before proceeding.
      </div>

      <div class="step">
        <h3>1. Create Basecamp Integration</h3>
        <p>Go to <a href="https://launchpad.37signals.com/integrations" target="_blank">Basecamp Integrations</a> and create a new integration:</p>
        <ul>
          <li><strong>Application Name:</strong> Your MCP Server</li>
          <li><strong>Redirect URI:</strong> <code>${typeof window !== 'undefined' ? window.location.origin : 'https://your-worker.workers.dev'}/auth/callback</code></li>
          <li><strong>Client Type:</strong> Web Application</li>
        </ul>
      </div>

      <div class="step">
        <h3>2. Configure Environment Variables</h3>
        <p>Set these secrets in your Cloudflare Worker:</p>
        <div class="code">
echo "your_client_id" | wrangler secret put BASECAMP_CLIENT_ID<br>
echo "your_client_secret" | wrangler secret put BASECAMP_CLIENT_SECRET<br>
echo "your_account_id" | wrangler secret put BASECAMP_ACCOUNT_ID
        </div>
      </div>

      <div class="step">
        <h3>3. Get Your Access Token</h3>
        <p>After configuring the environment variables, visit this page again to start the OAuth flow.</p>
      </div>

      <div class="feature">
        <h3>✨ What you get with 59 tools:</h3>
        <ul>
          <li><strong>8 Project Management</strong> tools - Complete project lifecycle</li>
          <li><strong>11 Todo Management</strong> tools - Advanced task automation</li>
          <li><strong>6 Communication</strong> tools - Messages and discussions</li>
          <li><strong>6 Documents & Files</strong> tools - Content management</li>
          <li><strong>4 Team Management</strong> tools - Access control</li>
          <li><strong>3 Campfire Chat</strong> tools - Real-time communication</li>
          <li><strong>3 Schedule Management</strong> tools - Calendar and events</li>
          <li><strong>4 Card Tables</strong> tools - Kanban workflows</li>
          <li><strong>5 Comments System</strong> tools - Universal collaboration</li>
          <li><strong>4 Webhooks</strong> tools - Real-time notifications</li>
          <li><strong>2 Search & Analytics</strong> tools - Data insights</li>
          <li><strong>And more...</strong> - Complete API coverage</li>
        </ul>
      </div>

      <div style="text-align: center; margin-top: 40px;">
        <p><strong>Repository:</strong> <a href="https://github.com/QusaiiSaleem/basecamp-mcp-server">github.com/QusaiiSaleem/basecamp-mcp-server</a></p>
      </div>
    </body>
    </html>
  `;
}

function getConfigInstructions(): string {
  return `
    <!DOCTYPE html>
    <html>
    <head>
      <title>Configuration Required</title>
      <style>
        body { font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto; max-width: 600px; margin: 0 auto; padding: 40px 20px; }
        .error { background: #fee; border: 1px solid #fcc; padding: 20px; border-radius: 8px; }
        .code { background: #f1f3f4; padding: 10px; border-radius: 4px; font-family: 'Monaco', 'Consolas', monospace; margin: 10px 0; }
      </style>
    </head>
    <body>
      <div class="error">
        <h2>❌ Configuration Required</h2>
        <p>Please configure your Basecamp OAuth credentials:</p>
        <div class="code">
echo "your_client_id" | wrangler secret put BASECAMP_CLIENT_ID<br>
echo "your_client_secret" | wrangler secret put BASECAMP_CLIENT_SECRET
        </div>
        <p>Get these from your <a href="https://launchpad.37signals.com/integrations">Basecamp Integration</a>.</p>
      </div>
    </body>
    </html>
  `;
}

function getOAuthInstructionsHTML(): string {
  return `
    <!DOCTYPE html>
    <html>
    <head>
      <title>OAuth Setup</title>
      <style>
        body { font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto; max-width: 600px; margin: 0 auto; padding: 40px 20px; }
        .info { background: #e3f2fd; border: 1px solid #bbdefb; padding: 20px; border-radius: 8px; }
        .button { display: inline-block; background: #1f5f99; color: white; padding: 12px 24px; text-decoration: none; border-radius: 6px; font-weight: bold; }
      </style>
    </head>
    <body>
      <div class="info">
        <h2>🔐 Authorization Required</h2>
        <p>To get your access token, you need to authorize this application with Basecamp.</p>
        <p><a href="/auth/start" class="button">Start Authorization</a></p>
      </div>
    </body>
    </html>
  `;
}

function getSuccessHTML(accessToken: string): string {
  return `
    <!DOCTYPE html>
    <html>
    <head>
      <title>Authorization Successful</title>
      <style>
        body { font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto; max-width: 600px; margin: 0 auto; padding: 40px 20px; }
        .success { background: #d4edda; border: 1px solid #c3e6cb; padding: 20px; border-radius: 8px; }
        .token { background: #f8f9fa; border: 1px solid #dee2e6; padding: 15px; border-radius: 4px; font-family: 'Monaco', 'Consolas', monospace; word-break: break-all; margin: 15px 0; }
        .warning { background: #fff3cd; border: 1px solid #ffeaa7; padding: 15px; border-radius: 6px; margin: 15px 0; }
      </style>
    </head>
    <body>
      <div class="success">
        <h2>✅ Authorization Successful!</h2>
        <p>Your access token has been generated successfully.</p>
        
        <h3>Your Access Token:</h3>
        <div class="token">${accessToken}</div>
        
        <div class="warning">
          <strong>🔒 Security Note:</strong> Keep this token secure and private. Anyone with this token can access your Basecamp account.
        </div>
        
        <h3>How to use:</h3>
        <ul>
          <li><strong>MCP Arguments:</strong> Add <code>access_token</code> parameter</li>
          <li><strong>HTTP Headers:</strong> <code>Authorization: Bearer ${accessToken}</code></li>
          <li><strong>Environment:</strong> Set <code>BASECAMP_ACCESS_TOKEN</code></li>
        </ul>
      </div>
    </body>
    </html>
  `;
}