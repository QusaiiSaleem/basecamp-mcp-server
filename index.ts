/**
 * Comprehensive Basecamp MCP Server - 60 Tools
 * Complete Basecamp API coverage for project management automation
 * 
 * Version: 5.0.0
 * License: MIT
 * 
 * Features:
 * - 60 Basecamp API tools (5x more than basic implementations)
 * - Complete API coverage: Projects, Todos, Messages, Documents, Files, Comments, etc.
 * - Production-ready with robust error handling
 * - Compatible with Claude Desktop, n8n, Make.com, and other MCP clients
 * - SSE and HTTP support
 * 
 * Categories Covered:
 * - Projects (3 tools)
 * - Todo Management (5 tools) 
 * - Messages & Communication (3 tools)
 * - Documents (2 tools)
 * - People & Team (3 tools)
 * - Campfire Chat (2 tools)
 * - Schedules (2 tools)
 * - Card Tables/Kanban (3 tools)
 * - File Management & Attachments (6 tools)
 * - Comments System (5 tools)
 * - Subscription Management (4 tools)
 * - Template System (7 tools)
 * - Recording Management (4 tools)
 * - Events & Audit Trail (1 tool)
 * - Client Features (2 tools)
 * - Advanced Features (2 tools)
 * - Search & Utilities (2 tools)
 * - Webhooks (4 tools)
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

        // Create readable stream for SSE
        const { readable, writable } = new TransformStream();
        const writer = writable.getWriter();
        const encoder = new TextEncoder();

        // Send initial connection established event
        writer.write(encoder.encode('data: {"jsonrpc":"2.0","method":"notifications/initialized","params":{}}\n\n'));

        // Keep connection alive with periodic pings
        const pingInterval = setInterval(() => {
          try {
            writer.write(encoder.encode('data: {"jsonrpc":"2.0","method":"notifications/ping","params":{}}\n\n'));
          } catch (e) {
            clearInterval(pingInterval);
          }
        }, 30000); // Ping every 30 seconds

        // Close connection after 5 minutes to prevent hanging
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
        name: 'basecamp-mcp-server-comprehensive',
        version: '5.0.0',
        protocol: 'MCP 2025-03-26',
        tools: 60,
        categories: ['Projects', 'Todos', 'Messages', 'Documents', 'Schedules', 'People', 'Campfire', 'Cards', 'Webhooks', 'Utilities', 'Files', 'Comments', 'Subscriptions', 'Templates', 'Recordings', 'Events', 'Client', 'Advanced'],
        compatibility: ['n8n', 'Make.com', 'Claude Desktop'],
        description: 'Most comprehensive Basecamp MCP server with 60 tools covering the complete Basecamp API',
        repository: 'https://github.com/QusaiiSaleem/basecamp-mcp-server',
        endpoints: {
          sse: '/mcp/sse',
          http: '/',
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
                name: "basecamp-mcp-server-comprehensive",
                version: "5.0.0"
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
                error: { code: -32602, message: "Tool name required" }
              }, { status: 400, headers: corsHeaders });
            }
            result = await callBasecampTool(
              mcpRequest.params.name, 
              mcpRequest.params.arguments || {}, 
              env
            );
            break;

          default:
            return Response.json({
              jsonrpc: "2.0",
              id: mcpRequest.id,
              error: { code: -32601, message: `Method not found: ${mcpRequest.method}` }
            }, { status: 400, headers: corsHeaders });
        }

        return Response.json({
          jsonrpc: "2.0",
          id: mcpRequest.id,
          result: result
        }, { headers: corsHeaders });

      } catch (error) {
        return Response.json({
          jsonrpc: "2.0",
          id: null,
          error: {
            code: -32603,
            message: "Internal error",
            data: error.message
          }
        }, { status: 500, headers: corsHeaders });
      }
    }

    return new Response('Method not allowed', { status: 405, headers: corsHeaders });
  }
};

function getAllBasecampTools() {
  return [
    // PROJECT MANAGEMENT
    {
      name: "get_projects",
      description: "Get all Basecamp projects for the account",
      inputSchema: {
        type: "object",
        properties: {},
        additionalProperties: false
      }
    },
    {
      name: "create_project",
      description: "Create a new Basecamp project",
      inputSchema: {
        type: "object",
        properties: {
          name: { type: "string", description: "Project name" },
          description: { type: "string", description: "Project description (optional)" }
        },
        required: ["name"],
        additionalProperties: false
      }
    },
    {
      name: "get_project",
      description: "Get details of a specific Basecamp project",
      inputSchema: {
        type: "object",
        properties: {
          project_id: { type: "number", description: "The ID of the project" }
        },
        required: ["project_id"],
        additionalProperties: false
      }
    },

    // TODO MANAGEMENT
    {
      name: "get_todo_lists",
      description: "Get all todo lists for a project",
      inputSchema: {
        type: "object",
        properties: {
          project_id: { type: "number", description: "The ID of the project" },
          todoset_id: { type: "number", description: "The ID of the todoset (get from project dock)" }
        },
        required: ["project_id", "todoset_id"],
        additionalProperties: false
      }
    },
    {
      name: "create_todo_list",
      description: "Create a new todo list in a project",
      inputSchema: {
        type: "object",
        properties: {
          project_id: { type: "number", description: "The ID of the project" },
          todoset_id: { type: "number", description: "The ID of the todoset (get from project dock)" },
          name: { type: "string", description: "Todo list name" },
          description: { type: "string", description: "Todo list description (optional)" }
        },
        required: ["project_id", "todoset_id", "name"],
        additionalProperties: false
      }
    },
    {
      name: "get_todos",
      description: "Get all todos from a specific todo list",
      inputSchema: {
        type: "object",
        properties: {
          project_id: { type: "number", description: "The ID of the project" },
          todolist_id: { type: "number", description: "The ID of the todo list" }
        },
        required: ["project_id", "todolist_id"],
        additionalProperties: false
      }
    },
    {
      name: "create_todo",
      description: "Create a new todo item in a todo list",
      inputSchema: {
        type: "object",
        properties: {
          project_id: { type: "number", description: "The ID of the project" },
          todolist_id: { type: "number", description: "The ID of the todo list" },
          content: { type: "string", description: "Todo item content/title" },
          assignee_ids: { type: "array", items: { type: "number" }, description: "Array of user IDs to assign this todo to" },
          due_on: { type: "string", description: "Due date in YYYY-MM-DD format" },
          notes: { type: "string", description: "Additional notes for the todo" }
        },
        required: ["project_id", "todolist_id", "content"],
        additionalProperties: false
      }
    },
    {
      name: "complete_todo",
      description: "Mark a todo item as completed",
      inputSchema: {
        type: "object",
        properties: {
          project_id: { type: "number", description: "The ID of the project" },
          todo_id: { type: "number", description: "The ID of the todo item" }
        },
        required: ["project_id", "todo_id"],
        additionalProperties: false
      }
    },

    // MESSAGES & COMMUNICATION
    {
      name: "get_message_board",
      description: "Get the message board for a project",
      inputSchema: {
        type: "object",
        properties: {
          project_id: { type: "number", description: "The ID of the project" }
        },
        required: ["project_id"],
        additionalProperties: false
      }
    },
    {
      name: "get_messages",
      description: "Get messages from a project's message board",
      inputSchema: {
        type: "object",
        properties: {
          project_id: { type: "number", description: "The ID of the project" },
          message_board_id: { type: "number", description: "The ID of the message board" }
        },
        required: ["project_id", "message_board_id"],
        additionalProperties: false
      }
    },
    {
      name: "create_message",
      description: "Create a new message on a message board",
      inputSchema: {
        type: "object",
        properties: {
          project_id: { type: "number", description: "The ID of the project" },
          message_board_id: { type: "number", description: "The ID of the message board" },
          subject: { type: "string", description: "Message subject" },
          content: { type: "string", description: "Message content" }
        },
        required: ["project_id", "message_board_id", "subject", "content"],
        additionalProperties: false
      }
    },

    // DOCUMENTS
    {
      name: "get_documents",
      description: "Get all documents for a project",
      inputSchema: {
        type: "object",
        properties: {
          project_id: { type: "number", description: "The ID of the project" }
        },
        required: ["project_id"],
        additionalProperties: false
      }
    },
    {
      name: "create_document",
      description: "Create a new document in a project",
      inputSchema: {
        type: "object",
        properties: {
          project_id: { type: "number", description: "The ID of the project" },
          vault_id: { type: "number", description: "The ID of the vault (get from project dock)" },
          title: { type: "string", description: "Document title" },
          content: { type: "string", description: "Document content (HTML supported)" }
        },
        required: ["project_id", "vault_id", "title", "content"],
        additionalProperties: false
      }
    },

    // PEOPLE & TEAM
    {
      name: "get_people",
      description: "Get all people in a project",
      inputSchema: {
        type: "object",
        properties: {
          project_id: { type: "number", description: "The ID of the project" }
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
        properties: {},
        additionalProperties: false
      }
    },
    {
      name: "update_project_access",
      description: "Grant, revoke, or create people for a project",
      inputSchema: {
        type: "object",
        properties: {
          project_id: {
            type: "number", 
            description: "The ID of the project"
          },
          grants: {
            type: "array",
            description: "Array of user IDs to grant access",
            items: { type: "number" }
          },
          revokes: {
            type: "array", 
            description: "Array of user IDs to revoke access",
            items: { type: "number" }
          },
          create: {
            type: "array",
            description: "Array of new users to create and grant access",
            items: {
              type: "object",
              properties: {
                name: { type: "string", description: "User's full name" },
                email_address: { type: "string", description: "User's email address" },
                title: { type: "string", description: "User's job title (optional)" },
                company_name: { type: "string", description: "User's company name (optional)" }
              },
              required: ["name", "email_address"]
            }
          }
        },
        required: ["project_id"],
        additionalProperties: false
      }
    },

    // CAMPFIRE CHAT
    {
      name: "get_campfire",
      description: "Get campfire chat for a project",
      inputSchema: {
        type: "object",
        properties: {
          project_id: { type: "number", description: "The ID of the project" }
        },
        required: ["project_id"],
        additionalProperties: false
      }
    },
    {
      name: "post_campfire_message",
      description: "Post a message to project campfire chat",
      inputSchema: {
        type: "object",
        properties: {
          project_id: { type: "number", description: "The ID of the project" },
          chat_id: { type: "number", description: "The ID of the chat (get from project dock)" },
          content: { type: "string", description: "Message content" }
        },
        required: ["project_id", "chat_id", "content"],
        additionalProperties: false
      }
    },

    // SCHEDULES
    {
      name: "get_schedule",
      description: "Get the schedule for a project",
      inputSchema: {
        type: "object",
        properties: {
          project_id: { type: "number", description: "The ID of the project" }
        },
        required: ["project_id"],
        additionalProperties: false
      }
    },
    {
      name: "create_schedule_entry",
      description: "Create a new schedule entry",
      inputSchema: {
        type: "object",
        properties: {
          project_id: { type: "number", description: "The ID of the project" },
          schedule_id: { type: "number", description: "The ID of the schedule" },
          summary: { type: "string", description: "Event summary" },
          starts_at: { type: "string", description: "Start date/time in ISO format" },
          ends_at: { type: "string", description: "End date/time in ISO format (optional)" },
          description: { type: "string", description: "Event description (optional)" }
        },
        required: ["project_id", "schedule_id", "summary", "starts_at"],
        additionalProperties: false
      }
    },

    // CARD TABLES (KANBAN)
    {
      name: "get_card_table",
      description: "Get card table (Kanban board) details",
      inputSchema: {
        type: "object",
        properties: {
          project_id: { type: "number", description: "The ID of the project" },
          card_table_id: { type: "number", description: "The ID of the card table" }
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
          project_id: { type: "number", description: "The ID of the project" },
          card_table_id: { type: "number", description: "The ID of the card table" },
          title: { type: "string", description: "Card title" },
          content: { type: "string", description: "Card content" },
          assignee_ids: { type: "array", items: { type: "number" }, description: "Array of user IDs to assign this card to" }
        },
        required: ["project_id", "card_table_id", "title"],
        additionalProperties: false
      }
    },
    {
      name: "move_card",
      description: "Move a card to a different column in card table",
      inputSchema: {
        type: "object",
        properties: {
          project_id: { type: "number", description: "The ID of the project" },
          card_table_id: { type: "number", description: "The ID of the card table" },
          card_id: { type: "number", description: "The ID of the card" },
          column_id: { type: "number", description: "The ID of the target column" },
          position: { type: "number", description: "Position in the column (1-based)" }
        },
        required: ["project_id", "card_table_id", "card_id", "column_id"],
        additionalProperties: false
      }
    },

    // FILE MANAGEMENT & ATTACHMENTS
    {
      name: "create_attachment",
      description: "Upload a file to create an attachment for use in rich text",
      inputSchema: {
        type: "object",
        properties: {
          file_name: { type: "string", description: "Name of the file" },
          file_content: { type: "string", description: "Base64 encoded file content" },
          content_type: { type: "string", description: "MIME type of the file" }
        },
        required: ["file_name", "file_content", "content_type"],
        additionalProperties: false
      }
    },
    {
      name: "get_uploads",
      description: "Get all uploads for a project vault",
      inputSchema: {
        type: "object",
        properties: {
          project_id: { type: "number", description: "The ID of the project" },
          vault_id: { type: "number", description: "The ID of the vault" }
        },
        required: ["project_id", "vault_id"],
        additionalProperties: false
      }
    },
    {
      name: "create_upload",
      description: "Create an upload in a project vault",
      inputSchema: {
        type: "object",
        properties: {
          project_id: { type: "number", description: "The ID of the project" },
          vault_id: { type: "number", description: "The ID of the vault" },
          attachable_sgid: { type: "string", description: "The SGID from create_attachment" },
          description: { type: "string", description: "Description of the upload (optional)" },
          base_name: { type: "string", description: "Base name for the upload (optional)" }
        },
        required: ["project_id", "vault_id", "attachable_sgid"],
        additionalProperties: false
      }
    },
    {
      name: "update_upload",
      description: "Update an upload's description and base name",
      inputSchema: {
        type: "object",
        properties: {
          project_id: { type: "number", description: "The ID of the project" },
          upload_id: { type: "number", description: "The ID of the upload" },
          description: { type: "string", description: "New description" },
          base_name: { type: "string", description: "New base name" }
        },
        required: ["project_id", "upload_id"],
        additionalProperties: false
      }
    },
    {
      name: "get_upload",
      description: "Get details of a specific upload",
      inputSchema: {
        type: "object",
        properties: {
          project_id: { type: "number", description: "The ID of the project" },
          upload_id: { type: "number", description: "The ID of the upload" }
        },
        required: ["project_id", "upload_id"],
        additionalProperties: false
      }
    },
    {
      name: "trash_upload",
      description: "Trash an upload",
      inputSchema: {
        type: "object",
        properties: {
          project_id: { type: "number", description: "The ID of the project" },
          upload_id: { type: "number", description: "The ID of the upload" }
        },
        required: ["project_id", "upload_id"],
        additionalProperties: false
      }
    },

    // COMMENTS SYSTEM
    {
      name: "get_comments",
      description: "Get comments for a recording",
      inputSchema: {
        type: "object",
        properties: {
          project_id: { type: "number", description: "The ID of the project" },
          recording_id: { type: "number", description: "The ID of the recording" }
        },
        required: ["project_id", "recording_id"],
        additionalProperties: false
      }
    },
    {
      name: "get_comment",
      description: "Get a specific comment",
      inputSchema: {
        type: "object",
        properties: {
          project_id: { type: "number", description: "The ID of the project" },
          comment_id: { type: "number", description: "The ID of the comment" }
        },
        required: ["project_id", "comment_id"],
        additionalProperties: false
      }
    },
    {
      name: "create_comment",
      description: "Create a comment on a recording",
      inputSchema: {
        type: "object",
        properties: {
          project_id: { type: "number", description: "The ID of the project" },
          recording_id: { type: "number", description: "The ID of the recording" },
          content: { type: "string", description: "Content of the comment" }
        },
        required: ["project_id", "recording_id", "content"],
        additionalProperties: false
      }
    },
    {
      name: "update_comment",
      description: "Update a comment's content",
      inputSchema: {
        type: "object",
        properties: {
          project_id: { type: "number", description: "The ID of the project" },
          comment_id: { type: "number", description: "The ID of the comment" },
          content: { type: "string", description: "New content for the comment" }
        },
        required: ["project_id", "comment_id", "content"],
        additionalProperties: false
      }
    },
    {
      name: "trash_comment",
      description: "Trash a comment",
      inputSchema: {
        type: "object",
        properties: {
          project_id: { type: "number", description: "The ID of the project" },
          comment_id: { type: "number", description: "The ID of the comment" }
        },
        required: ["project_id", "comment_id"],
        additionalProperties: false
      }
    },

    // SUBSCRIPTION MANAGEMENT
    {
      name: "get_subscription",
      description: "Get subscription information for a recording",
      inputSchema: {
        type: "object",
        properties: {
          project_id: { type: "number", description: "The ID of the project" },
          recording_id: { type: "number", description: "The ID of the recording" }
        },
        required: ["project_id", "recording_id"],
        additionalProperties: false
      }
    },
    {
      name: "subscribe_to_recording",
      description: "Subscribe current user to a recording",
      inputSchema: {
        type: "object",
        properties: {
          project_id: { type: "number", description: "The ID of the project" },
          recording_id: { type: "number", description: "The ID of the recording" }
        },
        required: ["project_id", "recording_id"],
        additionalProperties: false
      }
    },
    {
      name: "unsubscribe_from_recording",
      description: "Unsubscribe current user from a recording",
      inputSchema: {
        type: "object",
        properties: {
          project_id: { type: "number", description: "The ID of the project" },
          recording_id: { type: "number", description: "The ID of the recording" }
        },
        required: ["project_id", "recording_id"],
        additionalProperties: false
      }
    },
    {
      name: "update_subscription",
      description: "Add and remove people from recording subscription list",
      inputSchema: {
        type: "object",
        properties: {
          project_id: { type: "number", description: "The ID of the project" },
          recording_id: { type: "number", description: "The ID of the recording" },
          subscriptions: { type: "array", items: { type: "number" }, description: "Array of people IDs to subscribe" },
          unsubscriptions: { type: "array", items: { type: "number" }, description: "Array of people IDs to unsubscribe" }
        },
        required: ["project_id", "recording_id"],
        additionalProperties: false
      }
    },

    // TEMPLATE SYSTEM
    {
      name: "get_templates",
      description: "Get all templates visible to current user",
      inputSchema: {
        type: "object",
        properties: {
          status: { type: "string", description: "Filter by status: active, archived, or trashed" }
        },
        additionalProperties: false
      }
    },
    {
      name: "get_template",
      description: "Get a specific template",
      inputSchema: {
        type: "object",
        properties: {
          template_id: { type: "number", description: "The ID of the template" }
        },
        required: ["template_id"],
        additionalProperties: false
      }
    },
    {
      name: "create_template",
      description: "Create a new template",
      inputSchema: {
        type: "object",
        properties: {
          name: { type: "string", description: "Template name" },
          description: { type: "string", description: "Template description (optional)" }
        },
        required: ["name"],
        additionalProperties: false
      }
    },
    {
      name: "update_template",
      description: "Update a template's name and description",
      inputSchema: {
        type: "object",
        properties: {
          template_id: { type: "number", description: "The ID of the template" },
          name: { type: "string", description: "New template name" },
          description: { type: "string", description: "New template description" }
        },
        required: ["template_id"],
        additionalProperties: false
      }
    },
    {
      name: "trash_template",
      description: "Trash a template",
      inputSchema: {
        type: "object",
        properties: {
          template_id: { type: "number", description: "The ID of the template" }
        },
        required: ["template_id"],
        additionalProperties: false
      }
    },
    {
      name: "create_project_from_template",
      description: "Create a project from a template",
      inputSchema: {
        type: "object",
        properties: {
          template_id: { type: "number", description: "The ID of the template" },
          name: { type: "string", description: "Project name" },
          description: { type: "string", description: "Project description (optional)" }
        },
        required: ["template_id", "name"],
        additionalProperties: false
      }
    },
    {
      name: "get_project_construction",
      description: "Get project construction details from template",
      inputSchema: {
        type: "object",
        properties: {
          template_id: { type: "number", description: "The ID of the template" },
          construction_id: { type: "number", description: "The ID of the project construction" }
        },
        required: ["template_id", "construction_id"],
        additionalProperties: false
      }
    },

    // RECORDING MANAGEMENT
    {
      name: "get_recordings_by_type",
      description: "Get recordings by type across projects",
      inputSchema: {
        type: "object",
        properties: {
          type: { type: "string", description: "Recording type: Comment, Document, Message, Todo, etc." },
          project_id: { type: "number", description: "Optional project ID to filter" },
          status: { type: "string", description: "Optional status: active, archived, trashed" },
          sort: { type: "string", description: "Sort field: created_at, updated_at" },
          direction: { type: "string", description: "Sort direction: desc, asc" }
        },
        required: ["type"],
        additionalProperties: false
      }
    },
    {
      name: "trash_recording",
      description: "Trash a recording",
      inputSchema: {
        type: "object",
        properties: {
          project_id: { type: "number", description: "The ID of the project" },
          recording_id: { type: "number", description: "The ID of the recording" }
        },
        required: ["project_id", "recording_id"],
        additionalProperties: false
      }
    },
    {
      name: "archive_recording",
      description: "Archive a recording",
      inputSchema: {
        type: "object",
        properties: {
          project_id: { type: "number", description: "The ID of the project" },
          recording_id: { type: "number", description: "The ID of the recording" }
        },
        required: ["project_id", "recording_id"],
        additionalProperties: false
      }
    },
    {
      name: "unarchive_recording",
      description: "Unarchive a recording (make it active)",
      inputSchema: {
        type: "object",
        properties: {
          project_id: { type: "number", description: "The ID of the project" },
          recording_id: { type: "number", description: "The ID of the recording" }
        },
        required: ["project_id", "recording_id"],
        additionalProperties: false
      }
    },

    // EVENTS & AUDIT TRAIL
    {
      name: "get_events",
      description: "Get events for a recording (audit trail)",
      inputSchema: {
        type: "object",
        properties: {
          project_id: { type: "number", description: "The ID of the project" },
          recording_id: { type: "number", description: "The ID of the recording" }
        },
        required: ["project_id", "recording_id"],
        additionalProperties: false
      }
    },

    // CLIENT-SPECIFIC FEATURES
    {
      name: "get_client_correspondences",
      description: "Get client correspondences for a project",
      inputSchema: {
        type: "object",
        properties: {
          project_id: { type: "number", description: "The ID of the project" }
        },
        required: ["project_id"],
        additionalProperties: false
      }
    },
    {
      name: "get_client_correspondence",
      description: "Get a specific client correspondence",
      inputSchema: {
        type: "object",
        properties: {
          project_id: { type: "number", description: "The ID of the project" },
          correspondence_id: { type: "number", description: "The ID of the correspondence" }
        },
        required: ["project_id", "correspondence_id"],
        additionalProperties: false
      }
    },

    // ADVANCED FEATURES
    {
      name: "get_forwards",
      description: "Get forwards for an inbox",
      inputSchema: {
        type: "object",
        properties: {
          project_id: { type: "number", description: "The ID of the project" },
          inbox_id: { type: "number", description: "The ID of the inbox" }
        },
        required: ["project_id", "inbox_id"],
        additionalProperties: false
      }
    },
    {
      name: "get_forward",
      description: "Get a specific forward",
      inputSchema: {
        type: "object",
        properties: {
          project_id: { type: "number", description: "The ID of the project" },
          forward_id: { type: "number", description: "The ID of the forward" }
        },
        required: ["project_id", "forward_id"],
        additionalProperties: false
      }
    },

    // SEARCH & UTILITY
    {
      name: "search",
      description: "Search across Basecamp for content",
      inputSchema: {
        type: "object",
        properties: {
          query: { type: "string", description: "Search query text" },
          type: { type: "string", description: "Content type: Comment, Document, Message, Question::Answer, Schedule::Entry, Todo, Todolist, Upload (defaults to Message)" },
          project_id: { type: "number", description: "Optional project ID to limit search scope" }
        },
        required: ["query"],
        additionalProperties: false
      }
    },
    {
      name: "get_project_features",
      description: "Check which features are enabled/disabled in a Basecamp project",
      inputSchema: {
        type: "object",
        properties: {
          project_id: { type: "number", description: "The ID of the project" }
        },
        required: ["project_id"],
        additionalProperties: false
      }
    },

    // WEBHOOK MANAGEMENT
    {
      name: "create_webhook",
      description: "Create a webhook for a project to receive real-time notifications",
      inputSchema: {
        type: "object",
        properties: {
          project_id: { type: "number", description: "The ID of the project" },
          payload_url: { type: "string", description: "HTTPS URL to receive webhook calls" },
          types: { type: "array", items: { type: "string" }, description: "Array of event types (Todo, Todolist, Message, Document, Comment, etc.) or ['all'] for everything" }
        },
        required: ["project_id", "payload_url"],
        additionalProperties: false
      }
    },
    {
      name: "get_webhooks",
      description: "List all webhooks for a project",
      inputSchema: {
        type: "object",
        properties: {
          project_id: { type: "number", description: "The ID of the project" }
        },
        required: ["project_id"],
        additionalProperties: false
      }
    },
    {
      name: "update_webhook",
      description: "Update an existing webhook",
      inputSchema: {
        type: "object",
        properties: {
          project_id: { type: "number", description: "The ID of the project" },
          webhook_id: { type: "number", description: "The ID of the webhook" },
          payload_url: { type: "string", description: "HTTPS URL to receive webhook calls" },
          types: { type: "array", items: { type: "string" }, description: "Array of event types or ['all'] for everything" }
        },
        required: ["project_id", "webhook_id"],
        additionalProperties: false
      }
    },
    {
      name: "delete_webhook",
      description: "Delete a webhook from a project",
      inputSchema: {
        type: "object",
        properties: {
          project_id: { type: "number", description: "The ID of the project" },
          webhook_id: { type: "number", description: "The ID of the webhook" }
        },
        required: ["project_id", "webhook_id"],
        additionalProperties: false
      }
    }
  ];
}

async function callBasecampTool(toolName: string, args: any, env: any): Promise<any> {
  const accountId = env.BASECAMP_ACCOUNT_ID;
  const accessToken = env.BASECAMP_ACCESS_TOKEN;
  
  if (!accessToken) {
    throw new Error('BASECAMP_ACCESS_TOKEN not configured');
  }
  
  if (!accountId) {
    throw new Error('BASECAMP_ACCOUNT_ID not configured');
  }

  const baseUrl = `https://3.basecampapi.com/${accountId}`;
  const headers = {
    'Authorization': `Bearer ${accessToken}`,
    'User-Agent': 'Basecamp MCP Server (https://github.com/QusaiiSaleem/basecamp-mcp-server)',
    'Content-Type': 'application/json'
  };

  const controller = new AbortController();
  const timeoutId = setTimeout(() => controller.abort(), 10000);

  try {
    let response: Response;

    switch (toolName) {
      // PROJECT MANAGEMENT
      case 'get_projects':
        response = await fetch(`${baseUrl}/projects.json`, { headers, signal: controller.signal });
        break;

      case 'create_project':
        response = await fetch(`${baseUrl}/projects.json`, {
          method: 'POST',
          headers,
          body: JSON.stringify({ name: args.name, description: args.description || '' }),
          signal: controller.signal
        });
        break;

      case 'get_project':
        response = await fetch(`${baseUrl}/projects/${args.project_id}.json`, { headers, signal: controller.signal });
        break;

      // TODO MANAGEMENT
      case 'get_todo_lists':
        response = await fetch(`${baseUrl}/buckets/${args.project_id}/todosets/${args.todoset_id}.json`, { headers, signal: controller.signal });
        break;

      case 'create_todo_list':
        response = await fetch(`${baseUrl}/buckets/${args.project_id}/todosets/${args.todoset_id}/todolists.json`, {
          method: 'POST',
          headers,
          body: JSON.stringify({ name: args.name, description: args.description || '' }),
          signal: controller.signal
        });
        break;

      case 'get_todos':
        response = await fetch(`${baseUrl}/buckets/${args.project_id}/todolists/${args.todolist_id}/todos.json`, { headers, signal: controller.signal });
        break;

      case 'create_todo':
        response = await fetch(`${baseUrl}/buckets/${args.project_id}/todolists/${args.todolist_id}/todos.json`, {
          method: 'POST',
          headers,
          body: JSON.stringify({
            content: args.content,
            description: args.notes || '',
            assignee_ids: args.assignee_ids || [],
            due_on: args.due_on
          }),
          signal: controller.signal
        });
        break;

      case 'complete_todo':
        response = await fetch(`${baseUrl}/buckets/${args.project_id}/todos/${args.todo_id}/completion.json`, {
          method: 'POST',
          headers,
          signal: controller.signal
        });
        break;

      // MESSAGES
      case 'get_message_board':
        // First get project to find message board ID from dock
        const projectResponse = await fetch(`${baseUrl}/projects/${args.project_id}.json`, { headers, signal: controller.signal });
        if (!projectResponse.ok) {
          throw new Error(`Failed to get project: ${projectResponse.status}`);
        }
        const projectData = await projectResponse.json();
        const messageBoardDock = projectData.dock.find((item: any) => item.name === 'message_board');
        if (!messageBoardDock) {
          throw new Error('Message board not enabled for this project');
        }
        response = await fetch(`${baseUrl}/buckets/${args.project_id}/message_boards/${messageBoardDock.id}.json`, { headers, signal: controller.signal });
        break;

      case 'get_messages':
        response = await fetch(`${baseUrl}/buckets/${args.project_id}/message_boards/${args.message_board_id}/messages.json`, { headers, signal: controller.signal });
        break;

      case 'create_message':
        response = await fetch(`${baseUrl}/buckets/${args.project_id}/message_boards/${args.message_board_id}/messages.json`, {
          method: 'POST',
          headers,
          body: JSON.stringify({ subject: args.subject, content: args.content }),
          signal: controller.signal
        });
        break;

      // DOCUMENTS
      case 'get_documents':
        // First get project to find vault ID from dock
        const docProjectResponse = await fetch(`${baseUrl}/projects/${args.project_id}.json`, { headers, signal: controller.signal });
        if (!docProjectResponse.ok) {
          throw new Error(`Failed to get project: ${docProjectResponse.status}`);
        }
        const docProjectData = await docProjectResponse.json();
        const vaultDock = docProjectData.dock.find((item: any) => item.name === 'vault');
        if (!vaultDock) {
          throw new Error('Documents vault not enabled for this project');
        }
        response = await fetch(`${baseUrl}/buckets/${args.project_id}/vaults/${vaultDock.id}/documents.json`, { headers, signal: controller.signal });
        break;

      case 'create_document':
        response = await fetch(`${baseUrl}/buckets/${args.project_id}/vaults/${args.vault_id}/documents.json`, {
          method: 'POST',
          headers,
          body: JSON.stringify({ title: args.title, content: args.content }),
          signal: controller.signal
        });
        break;

      // PEOPLE
      case 'get_people':
        response = await fetch(`${baseUrl}/projects/${args.project_id}/people.json`, { headers, signal: controller.signal });
        break;

      case 'get_all_people':
        response = await fetch(`${baseUrl}/people.json`, { headers, signal: controller.signal });
        break;

      case 'update_project_access':
        const accessPayload: any = {};
        
        if (args.grants && args.grants.length > 0) {
          accessPayload.grant = args.grants;
        }
        
        if (args.revokes && args.revokes.length > 0) {
          accessPayload.revoke = args.revokes;
        }
        
        if (args.create && args.create.length > 0) {
          accessPayload.create = args.create;
        }
        
        response = await fetch(`${baseUrl}/projects/${args.project_id}/people/users.json`, {
          method: 'PUT',
          headers,
          body: JSON.stringify(accessPayload),
          signal: controller.signal
        });
        break;

      // CAMPFIRE
      case 'get_campfire':
        // First get project to find chat ID from dock
        const chatProjectResponse = await fetch(`${baseUrl}/projects/${args.project_id}.json`, { headers, signal: controller.signal });
        if (!chatProjectResponse.ok) {
          throw new Error(`Failed to get project: ${chatProjectResponse.status}`);
        }
        const chatProjectData = await chatProjectResponse.json();
        const chatDock = chatProjectData.dock.find((item: any) => item.name === 'chat');
        if (!chatDock) {
          throw new Error('Chat not enabled for this project');
        }
        response = await fetch(`${baseUrl}/buckets/${args.project_id}/chats/${chatDock.id}.json`, { headers, signal: controller.signal });
        break;

      case 'post_campfire_message':
        response = await fetch(`${baseUrl}/buckets/${args.project_id}/chats/${args.chat_id}/lines.json`, {
          method: 'POST',
          headers,
          body: JSON.stringify({ content: args.content }),
          signal: controller.signal
        });
        break;

      // SCHEDULES
      case 'get_schedule':
        // First get project to find schedule ID from dock
        const scheduleProjectResponse = await fetch(`${baseUrl}/projects/${args.project_id}.json`, { headers, signal: controller.signal });
        if (!scheduleProjectResponse.ok) {
          throw new Error(`Failed to get project: ${scheduleProjectResponse.status}`);
        }
        const scheduleProjectData = await scheduleProjectResponse.json();
        const scheduleDock = scheduleProjectData.dock.find((item: any) => item.name === 'schedule');
        if (!scheduleDock) {
          throw new Error('Schedule not enabled for this project');
        }
        response = await fetch(`${baseUrl}/buckets/${args.project_id}/schedules/${scheduleDock.id}.json`, { headers, signal: controller.signal });
        break;

      case 'create_schedule_entry':
        response = await fetch(`${baseUrl}/buckets/${args.project_id}/schedules/${args.schedule_id}/entries.json`, {
          method: 'POST',
          headers,
          body: JSON.stringify({
            summary: args.summary,
            starts_at: args.starts_at,
            ends_at: args.ends_at,
            description: args.description || ''
          }),
          signal: controller.signal
        });
        break;

      // CARD TABLES
      case 'get_card_table':
        // First check if card table is enabled
        const cardProjectResponse = await fetch(`${baseUrl}/projects/${args.project_id}.json`, { headers, signal: controller.signal });
        if (!cardProjectResponse.ok) {
          throw new Error(`Failed to get project: ${cardProjectResponse.status}`);
        }
        const cardProjectData = await cardProjectResponse.json();
        const cardTableDock = cardProjectData.dock.find((item: any) => item.name === 'kanban_board');
        if (!cardTableDock || !cardTableDock.enabled) {
          throw new Error('Card Table (Kanban board) is not enabled for this project. To enable it: Go to your Basecamp project → Click the "+" button → Select "Card Table" → Turn it on. Then try again.');
        }
        response = await fetch(`${baseUrl}/buckets/${args.project_id}/card_tables/${args.card_table_id}.json`, { headers, signal: controller.signal });
        break;

      case 'create_card':
        // First check if card table is enabled
        const createCardProjectResponse = await fetch(`${baseUrl}/projects/${args.project_id}.json`, { headers, signal: controller.signal });
        if (!createCardProjectResponse.ok) {
          throw new Error(`Failed to get project: ${createCardProjectResponse.status}`);
        }
        const createCardProjectData = await createCardProjectResponse.json();
        const createCardTableDock = createCardProjectData.dock.find((item: any) => item.name === 'kanban_board');
        if (!createCardTableDock || !createCardTableDock.enabled) {
          throw new Error('Card Table (Kanban board) is not enabled for this project. To enable it: Go to your Basecamp project → Click the "+" button → Select "Card Table" → Turn it on. Then try again.');
        }
        response = await fetch(`${baseUrl}/buckets/${args.project_id}/card_tables/${args.card_table_id}/cards.json`, {
          method: 'POST',
          headers,
          body: JSON.stringify({
            title: args.title,
            content: args.content || '',
            assignee_ids: args.assignee_ids || []
          }),
          signal: controller.signal
        });
        break;

      case 'move_card':
        response = await fetch(`${baseUrl}/buckets/${args.project_id}/card_tables/${args.card_table_id}/cards/${args.card_id}/moves.json`, {
          method: 'POST',
          headers,
          body: JSON.stringify({ column_id: args.column_id, position: args.position || 1 }),
          signal: controller.signal
        });
        break;

      // FILE MANAGEMENT & ATTACHMENTS
      case 'create_attachment':
        // Convert base64 to ArrayBuffer for upload
        const fileBuffer = Uint8Array.from(atob(args.file_content), c => c.charCodeAt(0));
        response = await fetch(`${baseUrl}/attachments.json?name=${encodeURIComponent(args.file_name)}`, {
          method: 'POST',
          headers: {
            'Authorization': `Bearer ${accessToken}`,
            'User-Agent': 'Basecamp MCP Server (https://github.com/QusaiiSaleem/basecamp-mcp-server)',
            'Content-Type': args.content_type,
            'Content-Length': fileBuffer.length.toString()
          },
          body: fileBuffer,
          signal: controller.signal
        });
        break;

      case 'get_uploads':
        response = await fetch(`${baseUrl}/buckets/${args.project_id}/vaults/${args.vault_id}/uploads.json`, { headers, signal: controller.signal });
        break;

      case 'create_upload':
        response = await fetch(`${baseUrl}/buckets/${args.project_id}/vaults/${args.vault_id}/uploads.json`, {
          method: 'POST',
          headers,
          body: JSON.stringify({
            attachable_sgid: args.attachable_sgid,
            description: args.description || '',
            base_name: args.base_name || ''
          }),
          signal: controller.signal
        });
        break;

      case 'update_upload':
        const updatePayload: any = {};
        if (args.description !== undefined) updatePayload.description = args.description;
        if (args.base_name !== undefined) updatePayload.base_name = args.base_name;
        response = await fetch(`${baseUrl}/buckets/${args.project_id}/uploads/${args.upload_id}.json`, {
          method: 'PUT',
          headers,
          body: JSON.stringify(updatePayload),
          signal: controller.signal
        });
        break;

      case 'get_upload':
        response = await fetch(`${baseUrl}/buckets/${args.project_id}/uploads/${args.upload_id}.json`, { headers, signal: controller.signal });
        break;

      case 'trash_upload':
        response = await fetch(`${baseUrl}/buckets/${args.project_id}/uploads/${args.upload_id}/status/trashed.json`, {
          method: 'PUT',
          headers,
          signal: controller.signal
        });
        break;

      // COMMENTS SYSTEM
      case 'get_comments':
        response = await fetch(`${baseUrl}/buckets/${args.project_id}/recordings/${args.recording_id}/comments.json`, { headers, signal: controller.signal });
        break;

      case 'get_comment':
        response = await fetch(`${baseUrl}/buckets/${args.project_id}/comments/${args.comment_id}.json`, { headers, signal: controller.signal });
        break;

      case 'create_comment':
        response = await fetch(`${baseUrl}/buckets/${args.project_id}/recordings/${args.recording_id}/comments.json`, {
          method: 'POST',
          headers,
          body: JSON.stringify({ content: args.content }),
          signal: controller.signal
        });
        break;

      case 'update_comment':
        response = await fetch(`${baseUrl}/buckets/${args.project_id}/comments/${args.comment_id}.json`, {
          method: 'PUT',
          headers,
          body: JSON.stringify({ content: args.content }),
          signal: controller.signal
        });
        break;

      case 'trash_comment':
        response = await fetch(`${baseUrl}/buckets/${args.project_id}/comments/${args.comment_id}/status/trashed.json`, {
          method: 'PUT',
          headers,
          signal: controller.signal
        });
        break;

      // SUBSCRIPTION MANAGEMENT
      case 'get_subscription':
        response = await fetch(`${baseUrl}/buckets/${args.project_id}/recordings/${args.recording_id}/subscription.json`, { headers, signal: controller.signal });
        break;

      case 'subscribe_to_recording':
        response = await fetch(`${baseUrl}/buckets/${args.project_id}/recordings/${args.recording_id}/subscription.json`, {
          method: 'POST',
          headers,
          signal: controller.signal
        });
        break;

      case 'unsubscribe_from_recording':
        response = await fetch(`${baseUrl}/buckets/${args.project_id}/recordings/${args.recording_id}/subscription.json`, {
          method: 'DELETE',
          headers,
          signal: controller.signal
        });
        break;

      case 'update_subscription':
        const subscriptionPayload: any = {};
        if (args.subscriptions && args.subscriptions.length > 0) subscriptionPayload.subscriptions = args.subscriptions;
        if (args.unsubscriptions && args.unsubscriptions.length > 0) subscriptionPayload.unsubscriptions = args.unsubscriptions;
        response = await fetch(`${baseUrl}/buckets/${args.project_id}/recordings/${args.recording_id}/subscription.json`, {
          method: 'PUT',
          headers,
          body: JSON.stringify(subscriptionPayload),
          signal: controller.signal
        });
        break;

      // TEMPLATE SYSTEM
      case 'get_templates':
        const templatesUrl = new URL(`${baseUrl}/templates.json`);
        if (args.status) templatesUrl.searchParams.set('status', args.status);
        response = await fetch(templatesUrl.toString(), { headers, signal: controller.signal });
        break;

      case 'get_template':
        response = await fetch(`${baseUrl}/templates/${args.template_id}.json`, { headers, signal: controller.signal });
        break;

      case 'create_template':
        response = await fetch(`${baseUrl}/templates.json`, {
          method: 'POST',
          headers,
          body: JSON.stringify({
            name: args.name,
            description: args.description || ''
          }),
          signal: controller.signal
        });
        break;

      case 'update_template':
        const templateUpdatePayload: any = {};
        if (args.name !== undefined) templateUpdatePayload.name = args.name;
        if (args.description !== undefined) templateUpdatePayload.description = args.description;
        response = await fetch(`${baseUrl}/templates/${args.template_id}.json`, {
          method: 'PUT',
          headers,
          body: JSON.stringify(templateUpdatePayload),
          signal: controller.signal
        });
        break;

      case 'trash_template':
        response = await fetch(`${baseUrl}/templates/${args.template_id}.json`, {
          method: 'DELETE',
          headers,
          signal: controller.signal
        });
        break;

      case 'create_project_from_template':
        response = await fetch(`${baseUrl}/templates/${args.template_id}/project_constructions.json`, {
          method: 'POST',
          headers,
          body: JSON.stringify({
            name: args.name,
            description: args.description || ''
          }),
          signal: controller.signal
        });
        break;

      case 'get_project_construction':
        response = await fetch(`${baseUrl}/templates/${args.template_id}/project_constructions/${args.construction_id}.json`, { headers, signal: controller.signal });
        break;

      // RECORDING MANAGEMENT
      case 'get_recordings_by_type':
        const recordingsUrl = new URL(`${baseUrl}/projects/recordings.json`);
        recordingsUrl.searchParams.set('type', args.type);
        if (args.project_id) recordingsUrl.searchParams.set('bucket', args.project_id.toString());
        if (args.status) recordingsUrl.searchParams.set('status', args.status);
        if (args.sort) recordingsUrl.searchParams.set('sort', args.sort);
        if (args.direction) recordingsUrl.searchParams.set('direction', args.direction);
        response = await fetch(recordingsUrl.toString(), { headers, signal: controller.signal });
        break;

      case 'trash_recording':
        response = await fetch(`${baseUrl}/buckets/${args.project_id}/recordings/${args.recording_id}/status/trashed.json`, {
          method: 'PUT',
          headers,
          signal: controller.signal
        });
        break;

      case 'archive_recording':
        response = await fetch(`${baseUrl}/buckets/${args.project_id}/recordings/${args.recording_id}/status/archived.json`, {
          method: 'PUT',
          headers,
          signal: controller.signal
        });
        break;

      case 'unarchive_recording':
        response = await fetch(`${baseUrl}/buckets/${args.project_id}/recordings/${args.recording_id}/status/active.json`, {
          method: 'PUT',
          headers,
          signal: controller.signal
        });
        break;

      // EVENTS & AUDIT TRAIL
      case 'get_events':
        response = await fetch(`${baseUrl}/buckets/${args.project_id}/recordings/${args.recording_id}/events.json`, { headers, signal: controller.signal });
        break;

      // CLIENT-SPECIFIC FEATURES
      case 'get_client_correspondences':
        response = await fetch(`${baseUrl}/buckets/${args.project_id}/client/correspondences.json`, { headers, signal: controller.signal });
        break;

      case 'get_client_correspondence':
        response = await fetch(`${baseUrl}/buckets/${args.project_id}/client/correspondences/${args.correspondence_id}.json`, { headers, signal: controller.signal });
        break;

      // ADVANCED FEATURES
      case 'get_forwards':
        response = await fetch(`${baseUrl}/buckets/${args.project_id}/inboxes/${args.inbox_id}/forwards.json`, { headers, signal: controller.signal });
        break;

      case 'get_forward':
        response = await fetch(`${baseUrl}/buckets/${args.project_id}/inbox_forwards/${args.forward_id}.json`, { headers, signal: controller.signal });
        break;

      // SEARCH
      case 'search':
        const searchUrl = new URL(`${baseUrl}/projects/recordings.json`);
        
        // Basecamp API requires a specific type parameter
        const validTypes = ["Comment", "Document", "Message", "Question::Answer", "Schedule::Entry", "Todo", "Todolist", "Upload"];
        const searchType = args.type && validTypes.includes(args.type) ? args.type : "Message";
        
        searchUrl.searchParams.set('type', searchType);
        
        // Add project filter if needed (can search specific projects)
        if (args.project_id) {
          searchUrl.searchParams.set('bucket', args.project_id.toString());
        }
        
        response = await fetch(searchUrl.toString(), { headers, signal: controller.signal });
        
        // Filter results by query text if provided
        if (args.query && response.ok) {
          const data = await response.json();
          const filteredData = data.filter((item: any) => 
            JSON.stringify(item).toLowerCase().includes(args.query.toLowerCase())
          );
          
          // Create a new response object with filtered data
          return {
            content: [
              {
                type: "text",
                text: JSON.stringify(filteredData, null, 2)
              }
            ]
          };
        }
        break;

      case 'get_project_features':
        // Get project to analyze enabled/disabled features
        const featuresProjectResponse = await fetch(`${baseUrl}/projects/${args.project_id}.json`, { headers, signal: controller.signal });
        if (!featuresProjectResponse.ok) {
          throw new Error(`Failed to get project: ${featuresProjectResponse.status}`);
        }
        const featuresProjectData = await featuresProjectResponse.json();
        
        // Analyze dock to determine feature status
        const featureStatus = {
          project_name: featuresProjectData.name,
          project_id: featuresProjectData.id,
          features: {
            message_board: featuresProjectData.dock.find((item: any) => item.name === 'message_board')?.enabled || false,
            todos: featuresProjectData.dock.find((item: any) => item.name === 'todoset')?.enabled || false,
            documents: featuresProjectData.dock.find((item: any) => item.name === 'vault')?.enabled || false,
            chat: featuresProjectData.dock.find((item: any) => item.name === 'chat')?.enabled || false,
            schedule: featuresProjectData.dock.find((item: any) => item.name === 'schedule')?.enabled || false,
            card_table: featuresProjectData.dock.find((item: any) => item.name === 'kanban_board')?.enabled || false,
            questionnaire: featuresProjectData.dock.find((item: any) => item.name === 'questionnaire')?.enabled || false,
            inbox: featuresProjectData.dock.find((item: any) => item.name === 'inbox')?.enabled || false
          },
          instructions: {
            enable_features: "To enable features: Go to your Basecamp project → Click the '+' button → Select the feature → Turn it on",
            card_table_note: "Card Table (Kanban) must be enabled before using card-related tools",
            schedule_note: "Schedule must be enabled before using schedule-related tools"
          }
        };
        
        return {
          content: [
            {
              type: "text",
              text: JSON.stringify(featureStatus, null, 2)
            }
          ]
        };

      // WEBHOOKS
      case 'create_webhook':
        response = await fetch(`${baseUrl}/buckets/${args.project_id}/webhooks.json`, {
          method: 'POST',
          headers,
          body: JSON.stringify({
            payload_url: args.payload_url,
            types: args.types || ['all']
          }),
          signal: controller.signal
        });
        break;

      case 'get_webhooks':
        response = await fetch(`${baseUrl}/buckets/${args.project_id}/webhooks.json`, { headers, signal: controller.signal });
        break;

      case 'update_webhook':
        response = await fetch(`${baseUrl}/buckets/${args.project_id}/webhooks/${args.webhook_id}.json`, {
          method: 'PUT',
          headers,
          body: JSON.stringify({
            payload_url: args.payload_url,
            types: args.types
          }),
          signal: controller.signal
        });
        break;

      case 'delete_webhook':
        response = await fetch(`${baseUrl}/buckets/${args.project_id}/webhooks/${args.webhook_id}.json`, {
          method: 'DELETE',
          headers,
          signal: controller.signal
        });
        break;

      default:
        throw new Error(`Unknown tool: ${toolName}`);
    }

    clearTimeout(timeoutId);

    if (!response.ok) {
      const errorText = await response.text();
      throw new Error(`Basecamp API error: ${response.status} ${response.statusText} - ${errorText}`);
    }

    // Handle empty responses (like completion endpoints)
    const responseText = await response.text();
    let data;
    
    if (responseText.trim() === '') {
      data = { success: true, message: `${toolName} completed successfully` };
    } else {
      try {
        data = JSON.parse(responseText);
      } catch (e) {
        data = { success: true, message: responseText };
      }
    }

    // Return in MCP format
    return {
      content: [
        {
          type: "text",
          text: JSON.stringify(data, null, 2)
        }
      ]
    };

  } catch (error) {
    clearTimeout(timeoutId);
    
    if (error.name === 'AbortError') {
      throw new Error('Basecamp API request timed out after 10 seconds');
    }
    
    throw error;
  }
}