/**
 * Expanded Basecamp MCP Server - 20+ Tools
 * Complete Basecamp project management automation
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
      return Response.json({
        status: 'ok',
        name: 'basecamp-mcp-server-expanded',
        version: '4.1.0',
        protocol: 'MCP 2025-03-26',
        tools: 27,
        categories: ['Projects', 'Todos', 'Messages', 'Documents', 'Schedules', 'People', 'Campfire', 'Cards', 'Webhooks'],
        compatibility: ['n8n', 'Make.com', 'Claude Desktop']
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
                name: "basecamp-mcp-server-expanded",
                version: "4.0.0"
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
    'User-Agent': 'Fouq Agency MCP Server (contact@fouq.agency)',
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
          throw new Error('Card Table (Kanban board) is not enabled for this project. Enable it in Basecamp settings first.');
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
          throw new Error('Card Table (Kanban board) is not enabled for this project. Enable it in Basecamp settings first.');
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