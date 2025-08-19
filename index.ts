/**
 * Enhanced Basecamp MCP Server - 36 Tools with Advanced Assignment Management
 * Complete Basecamp project management automation with intelligent assignment tracking
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
        name: 'basecamp-mcp-server-enhanced',
        version: '5.0.0',
        protocol: 'MCP 2025-03-26',
        tools: 36,
        categories: ['Projects', 'Todos', 'Messages', 'Documents', 'Schedules', 'People', 'Campfire', 'Cards', 'Webhooks', 'Assignments', 'Analytics'],
        new_features: ['Assignment Management', 'Workload Analytics', 'Smart User Matching', 'Comprehensive Error Handling'],
        compatibility: ['n8n', 'Make.com', 'Claude Desktop'],
        endpoints: {
          sse: '/mcp/sse',
          http: '/'
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
                name: "basecamp-mcp-server-enhanced",
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
      description: "Get all todo lists from a project",
      inputSchema: {
        type: "object",
        properties: {
          project_id: { type: "number", description: "The ID of the project" },
          todoset_id: { type: "number", description: "The ID of the todoset" }
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
          todoset_id: { type: "number", description: "The ID of the todoset" },
          name: { type: "string", description: "Name of the todo list" },
          description: { type: "string", description: "Description of the todo list (optional)" }
        },
        required: ["project_id", "todoset_id", "name"],
        additionalProperties: false
      }
    },
    {
      name: "get_todos",
      description: "Get todos from a todo list",
      inputSchema: {
        type: "object",
        properties: {
          project_id: { type: "number", description: "The ID of the project" },
          todolist_id: { type: "number", description: "The ID of the todolist" }
        },
        required: ["project_id", "todolist_id"],
        additionalProperties: false
      }
    },
    {
      name: "create_todo",
      description: "Create a new todo item",
      inputSchema: {
        type: "object",
        properties: {
          project_id: { type: "number", description: "The ID of the project" },
          todolist_id: { type: "number", description: "The ID of the todolist" },
          content: { type: "string", description: "Todo content" },
          notes: { type: "string", description: "Additional notes (optional)" },
          assignee_ids: { type: "array", items: { type: "number" }, description: "Array of user IDs to assign this todo to" },
          completion_subscriber_ids: { type: "array", items: { type: "number" }, description: "Array of user IDs to notify on completion" },
          notify: { type: "boolean", description: "Whether to send notifications (defaults to true)" },
          due_on: { type: "string", description: "Due date in YYYY-MM-DD format" },
          starts_on: { type: "string", description: "Start date in YYYY-MM-DD format" }
        },
        required: ["project_id", "todolist_id", "content"],
        additionalProperties: false
      }
    },
    {
      name: "complete_todo",
      description: "Mark a todo as completed",
      inputSchema: {
        type: "object",
        properties: {
          project_id: { type: "number", description: "The ID of the project" },
          todo_id: { type: "number", description: "The ID of the todo" }
        },
        required: ["project_id", "todo_id"],
        additionalProperties: false
      }
    },

    // MESSAGES
    {
      name: "get_message_board",
      description: "Get message board details for a project",
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
      description: "Get messages from a message board",
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
      description: "Create a new message in a message board",
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
      description: "Get documents from a project",
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
          vault_id: { type: "number", description: "The ID of the vault" },
          title: { type: "string", description: "Document title" },
          content: { type: "string", description: "Document content" }
        },
        required: ["project_id", "vault_id", "title", "content"],
        additionalProperties: false
      }
    },

    // PEOPLE
    {
      name: "get_people",
      description: "Get people from a project",
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

    // CAMPFIRE
    {
      name: "get_campfire",
      description: "Get campfire chat details for a project",
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
      description: "Post a message to campfire chat",
      inputSchema: {
        type: "object",
        properties: {
          project_id: { type: "number", description: "The ID of the project" },
          chat_id: { type: "number", description: "The ID of the chat" },
          content: { type: "string", description: "Message content" }
        },
        required: ["project_id", "chat_id", "content"],
        additionalProperties: false
      }
    },

    // SCHEDULES
    {
      name: "get_schedule",
      description: "Get schedule details for a project",
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

    // WEBHOOKS
    {
      name: "create_webhook",
      description: "Create a new webhook for project events",
      inputSchema: {
        type: "object",
        properties: {
          project_id: { type: "number", description: "The ID of the project" },
          payload_url: { type: "string", description: "URL to send webhook payloads" },
          types: { type: "array", items: { type: "string" }, description: "Array of event types to subscribe to" }
        },
        required: ["project_id", "payload_url", "types"],
        additionalProperties: false
      }
    },
    {
      name: "get_webhooks",
      description: "Get all webhooks for a project",
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
          payload_url: { type: "string", description: "URL to send webhook payloads" },
          types: { type: "array", items: { type: "string" }, description: "Array of event types to subscribe to" }
        },
        required: ["project_id", "webhook_id", "payload_url", "types"],
        additionalProperties: false
      }
    },
    {
      name: "delete_webhook",
      description: "Delete a webhook",
      inputSchema: {
        type: "object",
        properties: {
          project_id: { type: "number", description: "The ID of the project" },
          webhook_id: { type: "number", description: "The ID of the webhook" }
        },
        required: ["project_id", "webhook_id"],
        additionalProperties: false
      }
    },

    // =====================================
    // 🎯 NEW ASSIGNMENT MANAGEMENT TOOLS
    // =====================================
    
    {
      name: "get_my_assignments",
      description: "Get all todos, cards, and schedule entries assigned to the current user (YOUR ASSIGNMENTS view)",
      inputSchema: {
        type: "object",
        properties: {
          include_completed: { type: "boolean", description: "Include completed assignments (default: false)" },
          project_filter: { type: "array", items: { type: "number" }, description: "Filter by specific project IDs" },
          due_date_filter: { type: "string", description: "Filter by due date: 'overdue', 'today', 'this_week', 'next_week'" }
        },
        additionalProperties: false
      }
    },

    {
      name: "get_user_assignments",
      description: "Get all assignments for a specific user with intelligent user matching",
      inputSchema: {
        type: "object",
        properties: {
          user_identifier: { type: "string", description: "User ID, email, name, or partial name to search for" },
          include_completed: { type: "boolean", description: "Include completed assignments (default: false)" },
          project_ids: { type: "array", items: { type: "number" }, description: "Filter by specific project IDs" }
        },
        required: ["user_identifier"],
        additionalProperties: false
      }
    },

    {
      name: "get_assignment_workload",
      description: "Analyze team workload distribution across all projects with detailed metrics",
      inputSchema: {
        type: "object",
        properties: {
          project_ids: { type: "array", items: { type: "number" }, description: "Filter by specific project IDs" },
          include_overdue_analysis: { type: "boolean", description: "Include overdue assignment analysis (default: true)" },
          sort_by: { type: "string", description: "Sort results by: 'workload', 'overdue_count', 'name' (default: 'workload')" }
        },
        additionalProperties: false
      }
    },

    {
      name: "get_assignment_timeline",
      description: "Get chronological timeline of assignments with due dates and deadlines",
      inputSchema: {
        type: "object",
        properties: {
          days_ahead: { type: "number", description: "Number of days to look ahead (default: 30)" },
          user_id: { type: "number", description: "Filter by specific user ID (optional)" },
          project_ids: { type: "array", items: { type: "number" }, description: "Filter by specific project IDs" },
          include_schedule_entries: { type: "boolean", description: "Include schedule entries (default: true)" }
        },
        additionalProperties: false
      }
    },

    {
      name: "find_assignments_by_keyword",
      description: "Search assignments using keywords with smart filtering and user context",
      inputSchema: {
        type: "object",
        properties: {
          query: { type: "string", description: "Search keywords to find in assignment content" },
          assignee: { type: "string", description: "Filter by assignee name/email (optional)" },
          status: { type: "string", description: "Filter by status: 'completed', 'pending', 'overdue' (optional)" },
          project_ids: { type: "array", items: { type: "number" }, description: "Filter by specific project IDs" }
        },
        required: ["query"],
        additionalProperties: false
      }
    },

    {
      name: "get_stale_assignments",
      description: "Find abandoned, overdue, or long-inactive assignments that need attention",
      inputSchema: {
        type: "object",
        properties: {
          days_stale: { type: "number", description: "Consider assignments stale after X days of inactivity (default: 7)" },
          include_unassigned: { type: "boolean", description: "Include unassigned todos and cards (default: true)" },
          project_ids: { type: "array", items: { type: "number" }, description: "Filter by specific project IDs" },
          severity_filter: { type: "string", description: "Filter by severity: 'critical', 'high', 'medium', 'low'" }
        },
        additionalProperties: false
      }
    },

    {
      name: "bulk_assign_todos",
      description: "Perform batch assignment operations on multiple todos with error handling",
      inputSchema: {
        type: "object",
        properties: {
          todo_ids: { type: "array", items: { type: "number" }, description: "Array of todo IDs to modify" },
          assignee_ids: { type: "array", items: { type: "number" }, description: "Array of user IDs to assign" },
          action: { type: "string", description: "Action to perform: 'assign', 'reassign', 'unassign'" },
          notify: { type: "boolean", description: "Send notifications to assignees (default: true)" }
        },
        required: ["todo_ids", "action"],
        additionalProperties: false
      }
    },

    {
      name: "create_assignment_report",
      description: "Generate comprehensive assignment reports with multiple formats and insights",
      inputSchema: {
        type: "object",
        properties: {
          report_type: { type: "string", description: "Report type: 'personal', 'team', 'project', 'workload_analysis'" },
          target_id: { type: "number", description: "User ID for personal reports or project ID for project reports" },
          format: { type: "string", description: "Output format: 'json', 'markdown', 'summary' (default: 'json')" },
          include_metrics: { type: "boolean", description: "Include performance metrics and analytics (default: true)" },
          date_range: { type: "string", description: "Date range: 'week', 'month', 'quarter' (default: 'month')" }
        },
        required: ["report_type"],
        additionalProperties: false
      }
    }
  ];
}

// Helper function for fuzzy user matching
function findBestUserMatch(identifier: string, users: any[]): { user: any | null, suggestions: any[] } {
  if (!identifier || !users.length) {
    return { user: null, suggestions: [] };
  }

  const normalizedIdentifier = identifier.toLowerCase().trim();
  
  // Exact ID match
  if (/^\d+$/.test(identifier)) {
    const user = users.find(u => u.id === parseInt(identifier));
    if (user) return { user, suggestions: [] };
  }

  // Exact email match
  const emailMatch = users.find(u => u.email_address?.toLowerCase() === normalizedIdentifier);
  if (emailMatch) return { user: emailMatch, suggestions: [] };

  // Exact name match
  const exactNameMatch = users.find(u => u.name?.toLowerCase() === normalizedIdentifier);
  if (exactNameMatch) return { user: exactNameMatch, suggestions: [] };

  // Partial matches for suggestions
  const suggestions = users.filter(u => {
    const name = u.name?.toLowerCase() || '';
    const email = u.email_address?.toLowerCase() || '';
    return name.includes(normalizedIdentifier) || email.includes(normalizedIdentifier);
  }).slice(0, 5); // Limit to 5 suggestions

  return { user: null, suggestions };
}

// Helper function to calculate assignment priority/severity
function calculateAssignmentSeverity(assignment: any): 'critical' | 'high' | 'medium' | 'low' {
  const now = new Date();
  const dueDate = assignment.due_on ? new Date(assignment.due_on) : null;
  const createdDate = new Date(assignment.created_at);
  
  // Days since creation
  const daysSinceCreated = Math.floor((now.getTime() - createdDate.getTime()) / (1000 * 60 * 60 * 24));
  
  // Is overdue?
  const isOverdue = dueDate && dueDate < now;
  
  // Days until due (negative if overdue)
  const daysUntilDue = dueDate ? Math.floor((dueDate.getTime() - now.getTime()) / (1000 * 60 * 60 * 24)) : null;

  if (isOverdue && daysUntilDue && Math.abs(daysUntilDue) > 7) {
    return 'critical';
  }
  
  if (isOverdue || (daysUntilDue !== null && daysUntilDue <= 1)) {
    return 'high';
  }
  
  if (daysSinceCreated > 14 && !assignment.completed) {
    return 'high';
  }
  
  if (daysUntilDue !== null && daysUntilDue <= 7) {
    return 'medium';
  }
  
  return 'low';
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
    'User-Agent': 'Fouq Agency Enhanced MCP Server (contact@fouq.agency)',
    'Content-Type': 'application/json'
  };

  const controller = new AbortController();
  const timeoutId = setTimeout(() => controller.abort(), 15000); // Increased timeout for assignment operations

  try {
    let response: Response;
    
    switch (toolName) {
      // =====================================
      // 🎯 ASSIGNMENT MANAGEMENT TOOLS
      // =====================================
      
      case 'get_my_assignments':
        return await getMyAssignments(args, baseUrl, headers, controller);
      
      case 'get_user_assignments':
        return await getUserAssignments(args, baseUrl, headers, controller);
      
      case 'get_assignment_workload':
        return await getAssignmentWorkload(args, baseUrl, headers, controller);
      
      case 'get_assignment_timeline':
        return await getAssignmentTimeline(args, baseUrl, headers, controller);
      
      case 'find_assignments_by_keyword':
        return await findAssignmentsByKeyword(args, baseUrl, headers, controller);
      
      case 'get_stale_assignments':
        return await getStaleAssignments(args, baseUrl, headers, controller);
      
      case 'bulk_assign_todos':
        return await bulkAssignTodos(args, baseUrl, headers, controller);
      
      case 'create_assignment_report':
        return await createAssignmentReport(args, baseUrl, headers, controller);

      // =====================================
      // 📋 EXISTING TOOLS (UNCHANGED)
      // =====================================
      
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
            notes: args.notes || '',
            assignee_ids: args.assignee_ids || [],
            completion_subscriber_ids: args.completion_subscriber_ids || [],
            notify: args.notify !== false,
            due_on: args.due_on || null,
            starts_on: args.starts_on || null
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
        const project = await projectResponse.json();
        const messageBoardDock = project.dock.find((item: any) => item.name === 'message_board');
        if (!messageBoardDock) {
          throw new Error('Message board not found or disabled in this project');
        }
        response = await fetch(messageBoardDock.url, { headers, signal: controller.signal });
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
        const docProject = await docProjectResponse.json();
        const vaultDock = docProject.dock.find((item: any) => item.name === 'vault');
        if (!vaultDock) {
          throw new Error('Documents not found or disabled in this project');
        }
        response = await fetch(vaultDock.url, { headers, signal: controller.signal });
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
        const chatProject = await chatProjectResponse.json();
        const chatDock = chatProject.dock.find((item: any) => item.name === 'chat');
        if (!chatDock) {
          throw new Error('Campfire not found or disabled in this project');
        }
        response = await fetch(chatDock.url, { headers, signal: controller.signal });
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
        const scheduleProject = await scheduleProjectResponse.json();
        const scheduleDock = scheduleProject.dock.find((item: any) => item.name === 'schedule');
        if (!scheduleDock) {
          throw new Error('Schedule not found or disabled in this project');
        }
        response = await fetch(scheduleDock.url, { headers, signal: controller.signal });
        break;

      case 'create_schedule_entry':
        response = await fetch(`${baseUrl}/buckets/${args.project_id}/schedules/${args.schedule_id}/entries.json`, {
          method: 'POST',
          headers,
          body: JSON.stringify({
            summary: args.summary,
            starts_at: args.starts_at,
            ends_at: args.ends_at || null,
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
        const cardProject = await cardProjectResponse.json();
        const cardTableDock = cardProject.dock.find((item: any) => item.name === 'kanban_board');
        if (!cardTableDock) {
          throw new Error('Card Table (Kanban) not found or disabled in this project. Enable it in project settings.');
        }
        response = await fetch(`${baseUrl}/buckets/${args.project_id}/card_tables/${args.card_table_id}.json`, { headers, signal: controller.signal });
        break;

      case 'create_card':
        // First check if card table is enabled
        const createCardProjectResponse = await fetch(`${baseUrl}/projects/${args.project_id}.json`, { headers, signal: controller.signal });
        if (!createCardProjectResponse.ok) {
          throw new Error(`Failed to get project: ${createCardProjectResponse.status}`);
        }
        const createCardProject = await createCardProjectResponse.json();
        const createCardTableDock = createCardProject.dock.find((item: any) => item.name === 'kanban_board');
        if (!createCardTableDock) {
          throw new Error('Card Table (Kanban) not found or disabled in this project. Enable it in project settings.');
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
        searchUrl.searchParams.set('q', args.query);
        
        if (args.project_id) {
          searchUrl.searchParams.set('bucket', args.project_id.toString());
        }
        
        response = await fetch(searchUrl.toString(), { headers, signal: controller.signal });
        
        if (response.ok) {
          const data = await response.json();
          return {
            content: [{
              type: "text",
              text: JSON.stringify({
                query: args.query,
                type: searchType,
                project_scope: args.project_id || "all_projects",
                results_count: data.length || 0,
                results: data
              }, null, 2)
            }]
          };
        }
        break;

      case 'get_project_features':
        // Get project to analyze enabled/disabled features
        const featuresProjectResponse = await fetch(`${baseUrl}/projects/${args.project_id}.json`, { headers, signal: controller.signal });
        if (!featuresProjectResponse.ok) {
          throw new Error(`Failed to get project: ${featuresProjectResponse.status}`);
        }
        const featuresProject = await featuresProjectResponse.json();
        
        // Analyze dock to determine enabled features
        const enabledFeatures = featuresProject.dock.map((item: any) => item.name);
        const allFeatures = ['todoset', 'message_board', 'schedule', 'vault', 'chat', 'kanban_board', 'questionnaire'];
        const disabledFeatures = allFeatures.filter(feature => !enabledFeatures.includes(feature));
        
        return {
          content: [{
            type: "text",
            text: JSON.stringify({
              project_id: args.project_id,
              project_name: featuresProject.name,
              enabled_features: enabledFeatures,
              disabled_features: disabledFeatures,
              dock_configuration: featuresProject.dock
            }, null, 2)
          }]
        };

      // WEBHOOKS
      case 'create_webhook':
        response = await fetch(`${baseUrl}/buckets/${args.project_id}/webhooks.json`, {
          method: 'POST',
          headers,
          body: JSON.stringify({
            payload_url: args.payload_url,
            types: args.types || ['Todo', 'Message', 'Comment']
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
            types: args.types || ['Todo', 'Message', 'Comment']
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
      throw new Error(`Basecamp API error (${response.status}): ${errorText}`);
    }

    const data = await response.json();
    return {
      content: [{
        type: "text",
        text: JSON.stringify(data, null, 2)
      }]
    };

  } catch (error) {
    clearTimeout(timeoutId);
    if (error.name === 'AbortError') {
      throw new Error('Request timeout - Basecamp API call took too long');
    }
    throw error;
  }
}

// =====================================
// 🎯 ASSIGNMENT TOOL IMPLEMENTATIONS
// =====================================

async function getMyAssignments(args: any, baseUrl: string, headers: any, controller: AbortController) {
  try {
    // Get current user profile
    const profileResponse = await fetch(`${baseUrl}/my/profile.json`, { headers, signal: controller.signal });
    if (!profileResponse.ok) {
      throw new Error(`Failed to get user profile: ${profileResponse.status}`);
    }
    const currentUser = await profileResponse.json();
    
    // Get all projects
    const projectsResponse = await fetch(`${baseUrl}/projects.json`, { headers, signal: controller.signal });
    if (!projectsResponse.ok) {
      throw new Error(`Failed to get projects: ${projectsResponse.status}`);
    }
    const projects = await projectsResponse.json();
    
    const filteredProjects = args.project_filter ? 
      projects.filter((p: any) => args.project_filter.includes(p.id)) : projects;

    if (filteredProjects.length === 0) {
      return {
        content: [{
          type: "text",
          text: JSON.stringify({
            message: "No assignments found. You don't have any todos or cards assigned to you right now. To-dos and cards assigned to you will show up here.",
            user: {
              id: currentUser.id,
              name: currentUser.name,
              email: currentUser.email_address
            },
            assignments: {
              todos: [],
              cards: [],
              schedule_entries: [],
              total_count: 0
            },
            filters_applied: {
              include_completed: args.include_completed || false,
              project_filter: args.project_filter || "all_projects",
              due_date_filter: args.due_date_filter || "none"
            }
          }, null, 2)
        }]
      };
    }

    let allTodos: any[] = [];
    let allCards: any[] = [];
    let allScheduleEntries: any[] = [];

    // Process each project
    for (const project of filteredProjects) {
      try {
        // Get project details to access dock
        const projectDetailResponse = await fetch(`${baseUrl}/projects/${project.id}.json`, { 
          headers, signal: controller.signal 
        });
        if (!projectDetailResponse.ok) continue;
        
        const projectDetail = await projectDetailResponse.json();
        
        // Get todos assigned to current user
        const todosetDock = projectDetail.dock.find((item: any) => item.name === 'todoset');
        if (todosetDock) {
          try {
            const todosetResponse = await fetch(todosetDock.url, { headers, signal: controller.signal });
            if (todosetResponse.ok) {
              const todoset = await todosetResponse.json();
              
              for (const todolist of todoset.todolists || []) {
                const todosResponse = await fetch(todolist.todos_url, { headers, signal: controller.signal });
                if (todosResponse.ok) {
                  const todos = await todosResponse.json();
                  const userTodos = todos.filter((todo: any) => 
                    todo.assignees && todo.assignees.some((assignee: any) => assignee.id === currentUser.id) &&
                    (args.include_completed || !todo.completed)
                  );
                  
                  userTodos.forEach((todo: any) => {
                    todo.project_name = project.name;
                    todo.project_id = project.id;
                    todo.todolist_name = todolist.title;
                  });
                  
                  allTodos.push(...userTodos);
                }
              }
            }
          } catch (e) {
            console.log(`Failed to get todos for project ${project.id}: ${e}`);
          }
        }

        // Get cards assigned to current user
        const cardTableDock = projectDetail.dock.find((item: any) => item.name === 'kanban_board');
        if (cardTableDock) {
          try {
            const cardTableId = cardTableDock.url.split('/').pop()?.replace('.json', '');
            const cardsResponse = await fetch(`${baseUrl}/buckets/${project.id}/card_tables/${cardTableId}.json`, { 
              headers, signal: controller.signal 
            });
            if (cardsResponse.ok) {
              const cardTable = await cardsResponse.json();
              
              for (const column of cardTable.columns || []) {
                const userCards = (column.cards || []).filter((card: any) =>
                  card.assignees && card.assignees.some((assignee: any) => assignee.id === currentUser.id)
                );
                
                userCards.forEach((card: any) => {
                  card.project_name = project.name;
                  card.project_id = project.id;
                  card.column_name = column.title;
                });
                
                allCards.push(...userCards);
              }
            }
          } catch (e) {
            console.log(`Failed to get cards for project ${project.id}: ${e}`);
          }
        }

        // Get schedule entries
        const scheduleDock = projectDetail.dock.find((item: any) => item.name === 'schedule');
        if (scheduleDock && args.due_date_filter !== 'none') {
          try {
            const scheduleResponse = await fetch(scheduleDock.url, { headers, signal: controller.signal });
            if (scheduleResponse.ok) {
              const schedule = await scheduleResponse.json();
              const entries = (schedule.entries || []).filter((entry: any) => {
                // Filter by date range if specified
                if (args.due_date_filter) {
                  const entryDate = new Date(entry.starts_at);
                  const now = new Date();
                  
                  switch (args.due_date_filter) {
                    case 'today':
                      return entryDate.toDateString() === now.toDateString();
                    case 'this_week':
                      const weekStart = new Date(now.getFullYear(), now.getMonth(), now.getDate() - now.getDay());
                      const weekEnd = new Date(weekStart.getTime() + 7 * 24 * 60 * 60 * 1000);
                      return entryDate >= weekStart && entryDate < weekEnd;
                    case 'next_week':
                      const nextWeekStart = new Date(now.getFullYear(), now.getMonth(), now.getDate() - now.getDay() + 7);
                      const nextWeekEnd = new Date(nextWeekStart.getTime() + 7 * 24 * 60 * 60 * 1000);
                      return entryDate >= nextWeekStart && entryDate < nextWeekEnd;
                  }
                }
                return true;
              });
              
              entries.forEach((entry: any) => {
                entry.project_name = project.name;
                entry.project_id = project.id;
              });
              
              allScheduleEntries.push(...entries);
            }
          } catch (e) {
            console.log(`Failed to get schedule for project ${project.id}: ${e}`);
          }
        }
        
      } catch (e) {
        console.log(`Failed to process project ${project.id}: ${e}`);
        continue;
      }
    }

    // Apply due date filtering to todos
    if (args.due_date_filter && args.due_date_filter !== 'none') {
      allTodos = allTodos.filter(todo => {
        if (!todo.due_on) return false;
        
        const dueDate = new Date(todo.due_on);
        const now = new Date();
        
        switch (args.due_date_filter) {
          case 'overdue':
            return dueDate < now;
          case 'today':
            return dueDate.toDateString() === now.toDateString();
          case 'this_week':
            const weekStart = new Date(now.getFullYear(), now.getMonth(), now.getDate() - now.getDay());
            const weekEnd = new Date(weekStart.getTime() + 7 * 24 * 60 * 60 * 1000);
            return dueDate >= weekStart && dueDate < weekEnd;
          case 'next_week':
            const nextWeekStart = new Date(now.getFullYear(), now.getMonth(), now.getDate() - now.getDay() + 7);
            const nextWeekEnd = new Date(nextWeekStart.getTime() + 7 * 24 * 60 * 60 * 1000);
            return dueDate >= nextWeekStart && dueDate < nextWeekEnd;
          default:
            return true;
        }
      });
    }

    const totalCount = allTodos.length + allCards.length + allScheduleEntries.length;
    
    return {
      content: [{
        type: "text",
        text: JSON.stringify({
          message: totalCount > 0 ? `Found ${totalCount} assignments for ${currentUser.name}` : 
            "No assignments found. You don't have any todos or cards assigned to you right now. To-dos and cards assigned to you will show up here.",
          user: {
            id: currentUser.id,
            name: currentUser.name,
            email: currentUser.email_address
          },
          assignments: {
            todos: allTodos.sort((a: any, b: any) => (a.due_on ? new Date(a.due_on).getTime() : Infinity) - (b.due_on ? new Date(b.due_on).getTime() : Infinity)),
            cards: allCards,
            schedule_entries: allScheduleEntries.sort((a: any, b: any) => new Date(a.starts_at).getTime() - new Date(b.starts_at).getTime()),
            total_count: totalCount
          },
          filters_applied: {
            include_completed: args.include_completed || false,
            project_filter: args.project_filter || "all_projects",
            due_date_filter: args.due_date_filter || "none"
          }
        }, null, 2)
      }]
    };

  } catch (error) {
    return {
      content: [{
        type: "text",
        text: JSON.stringify({
          error: "Failed to fetch assignments",
          details: error.message,
          message: "Unable to retrieve your assignments. This might be due to network issues or insufficient permissions."
        }, null, 2)
      }]
    };
  }
}

async function getUserAssignments(args: any, baseUrl: string, headers: any, controller: AbortController) {
  try {
    // Get all people to find the target user
    const peopleResponse = await fetch(`${baseUrl}/people.json`, { headers, signal: controller.signal });
    if (!peopleResponse.ok) {
      throw new Error(`Failed to get people: ${peopleResponse.status}`);
    }
    const allPeople = await peopleResponse.json();
    
    // Find matching user with intelligent matching
    const { user: targetUser, suggestions } = findBestUserMatch(args.user_identifier, allPeople);
    
    if (!targetUser) {
      return {
        content: [{
          type: "text",
          text: JSON.stringify({
            error: "User not found",
            searched_for: args.user_identifier,
            message: suggestions.length > 0 ? 
              "No exact match found. Did you mean one of these users?" : 
              "No users found matching your criteria. Please check the user identifier and try again.",
            suggestions: suggestions.map((u: any) => ({
              id: u.id,
              name: u.name,
              email: u.email_address,
              title: u.title || 'No title'
            })),
            available_users: allPeople.slice(0, 10).map((u: any) => ({
              id: u.id,
              name: u.name,
              email: u.email_address
            }))
          }, null, 2)
        }]
      };
    }

    // Get projects (filtered if specified)
    const projectsResponse = await fetch(`${baseUrl}/projects.json`, { headers, signal: controller.signal });
    if (!projectsResponse.ok) {
      throw new Error(`Failed to get projects: ${projectsResponse.status}`);
    }
    const projects = await projectsResponse.json();
    
    const filteredProjects = args.project_ids ? 
      projects.filter((p: any) => args.project_ids.includes(p.id)) : projects;

    // Now use the same assignment gathering logic as getMyAssignments but for targetUser
    let allTodos: any[] = [];
    let allCards: any[] = [];

    for (const project of filteredProjects) {
      try {
        const projectDetailResponse = await fetch(`${baseUrl}/projects/${project.id}.json`, { 
          headers, signal: controller.signal 
        });
        if (!projectDetailResponse.ok) continue;
        
        const projectDetail = await projectDetailResponse.json();
        
        // Get todos assigned to target user
        const todosetDock = projectDetail.dock.find((item: any) => item.name === 'todoset');
        if (todosetDock) {
          try {
            const todosetResponse = await fetch(todosetDock.url, { headers, signal: controller.signal });
            if (todosetResponse.ok) {
              const todoset = await todosetResponse.json();
              
              for (const todolist of todoset.todolists || []) {
                const todosResponse = await fetch(todolist.todos_url, { headers, signal: controller.signal });
                if (todosResponse.ok) {
                  const todos = await todosResponse.json();
                  const userTodos = todos.filter((todo: any) => 
                    todo.assignees && todo.assignees.some((assignee: any) => assignee.id === targetUser.id) &&
                    (args.include_completed || !todo.completed)
                  );
                  
                  userTodos.forEach((todo: any) => {
                    todo.project_name = project.name;
                    todo.project_id = project.id;
                    todo.todolist_name = todolist.title;
                  });
                  
                  allTodos.push(...userTodos);
                }
              }
            }
          } catch (e) {
            console.log(`Failed to get todos for project ${project.id}: ${e}`);
          }
        }

        // Get cards assigned to target user
        const cardTableDock = projectDetail.dock.find((item: any) => item.name === 'kanban_board');
        if (cardTableDock) {
          try {
            const cardTableId = cardTableDock.url.split('/').pop()?.replace('.json', '');
            const cardsResponse = await fetch(`${baseUrl}/buckets/${project.id}/card_tables/${cardTableId}.json`, { 
              headers, signal: controller.signal 
            });
            if (cardsResponse.ok) {
              const cardTable = await cardsResponse.json();
              
              for (const column of cardTable.columns || []) {
                const userCards = (column.cards || []).filter((card: any) =>
                  card.assignees && card.assignees.some((assignee: any) => assignee.id === targetUser.id)
                );
                
                userCards.forEach((card: any) => {
                  card.project_name = project.name;
                  card.project_id = project.id;
                  card.column_name = column.title;
                });
                
                allCards.push(...userCards);
              }
            }
          } catch (e) {
            console.log(`Failed to get cards for project ${project.id}: ${e}`);
          }
        }
        
      } catch (e) {
        console.log(`Failed to process project ${project.id}: ${e}`);
        continue;
      }
    }

    const totalCount = allTodos.length + allCards.length;
    
    return {
      content: [{
        type: "text",
        text: JSON.stringify({
          message: totalCount > 0 ? `Found ${totalCount} assignments for ${targetUser.name}` : 
            `No assignments found for ${targetUser.name}. They don't have any todos or cards assigned to them right now.`,
          target_user: {
            id: targetUser.id,
            name: targetUser.name,
            email: targetUser.email_address,
            title: targetUser.title || 'No title'
          },
          assignments: {
            todos: allTodos.sort((a: any, b: any) => (a.due_on ? new Date(a.due_on).getTime() : Infinity) - (b.due_on ? new Date(b.due_on).getTime() : Infinity)),
            cards: allCards,
            total_count: totalCount
          },
          search_criteria: {
            user_identifier: args.user_identifier,
            include_completed: args.include_completed || false,
            project_filter: args.project_ids || "all_projects"
          }
        }, null, 2)
      }]
    };

  } catch (error) {
    return {
      content: [{
        type: "text",
        text: JSON.stringify({
          error: "Failed to fetch user assignments",
          details: error.message,
          user_identifier: args.user_identifier
        }, null, 2)
      }]
    };
  }
}

async function getAssignmentWorkload(args: any, baseUrl: string, headers: any, controller: AbortController) {
  try {
    // Get all people
    const peopleResponse = await fetch(`${baseUrl}/people.json`, { headers, signal: controller.signal });
    if (!peopleResponse.ok) {
      throw new Error(`Failed to get people: ${peopleResponse.status}`);
    }
    const allPeople = await peopleResponse.json();
    
    // Get projects
    const projectsResponse = await fetch(`${baseUrl}/projects.json`, { headers, signal: controller.signal });
    if (!projectsResponse.ok) {
      throw new Error(`Failed to get projects: ${projectsResponse.status}`);
    }
    const projects = await projectsResponse.json();
    
    const filteredProjects = args.project_ids ? 
      projects.filter((p: any) => args.project_ids.includes(p.id)) : projects;

    // Initialize workload tracking
    const workloadMap = new Map();
    allPeople.forEach((person: any) => {
      workloadMap.set(person.id, {
        person: {
          id: person.id,
          name: person.name,
          email: person.email_address,
          title: person.title || 'No title'
        },
        active_todos: 0,
        completed_todos: 0,
        overdue_todos: 0,
        cards: 0,
        projects: new Set(),
        overdue_details: []
      });
    });

    const now = new Date();

    // Analyze each project
    for (const project of filteredProjects) {
      try {
        const projectDetailResponse = await fetch(`${baseUrl}/projects/${project.id}.json`, { 
          headers, signal: controller.signal 
        });
        if (!projectDetailResponse.ok) continue;
        
        const projectDetail = await projectDetailResponse.json();
        
        // Analyze todos
        const todosetDock = projectDetail.dock.find((item: any) => item.name === 'todoset');
        if (todosetDock) {
          try {
            const todosetResponse = await fetch(todosetDock.url, { headers, signal: controller.signal });
            if (todosetResponse.ok) {
              const todoset = await todosetResponse.json();
              
              for (const todolist of todoset.todolists || []) {
                const todosResponse = await fetch(todolist.todos_url, { headers, signal: controller.signal });
                if (todosResponse.ok) {
                  const todos = await todosResponse.json();
                  
                  todos.forEach((todo: any) => {
                    if (todo.assignees && todo.assignees.length > 0) {
                      todo.assignees.forEach((assignee: any) => {
                        if (workloadMap.has(assignee.id)) {
                          const workload = workloadMap.get(assignee.id);
                          workload.projects.add(project.name);
                          
                          if (todo.completed) {
                            workload.completed_todos++;
                          } else {
                            workload.active_todos++;
                            
                            // Check if overdue
                            if (todo.due_on && new Date(todo.due_on) < now) {
                              workload.overdue_todos++;
                              workload.overdue_details.push({
                                title: todo.content,
                                due_on: todo.due_on,
                                project: project.name,
                                todolist: todolist.title,
                                days_overdue: Math.floor((now.getTime() - new Date(todo.due_on).getTime()) / (1000 * 60 * 60 * 24))
                              });
                            }
                          }
                        }
                      });
                    }
                  });
                }
              }
            }
          } catch (e) {
            console.log(`Failed to analyze todos for project ${project.id}: ${e}`);
          }
        }

        // Analyze cards
        const cardTableDock = projectDetail.dock.find((item: any) => item.name === 'kanban_board');
        if (cardTableDock) {
          try {
            const cardTableId = cardTableDock.url.split('/').pop()?.replace('.json', '');
            const cardsResponse = await fetch(`${baseUrl}/buckets/${project.id}/card_tables/${cardTableId}.json`, { 
              headers, signal: controller.signal 
            });
            if (cardsResponse.ok) {
              const cardTable = await cardsResponse.json();
              
              for (const column of cardTable.columns || []) {
                (column.cards || []).forEach((card: any) => {
                  if (card.assignees && card.assignees.length > 0) {
                    card.assignees.forEach((assignee: any) => {
                      if (workloadMap.has(assignee.id)) {
                        const workload = workloadMap.get(assignee.id);
                        workload.cards++;
                        workload.projects.add(project.name);
                      }
                    });
                  }
                });
              }
            }
          } catch (e) {
            console.log(`Failed to analyze cards for project ${project.id}: ${e}`);
          }
        }
        
      } catch (e) {
        console.log(`Failed to analyze project ${project.id}: ${e}`);
        continue;
      }
    }

    // Convert to array and add calculated metrics
    const workloadAnalysis = Array.from(workloadMap.values()).map((workload: any) => {
      const totalWorkload = workload.active_todos + workload.cards;
      const completionRate = workload.completed_todos > 0 ? 
        (workload.completed_todos / (workload.completed_todos + workload.active_todos)) * 100 : 0;
      
      return {
        ...workload,
        projects: Array.from(workload.projects),
        total_workload: totalWorkload,
        completion_rate: Math.round(completionRate * 100) / 100,
        workload_status: totalWorkload === 0 ? 'no_assignments' : 
                        totalWorkload <= 3 ? 'light' :
                        totalWorkload <= 8 ? 'moderate' :
                        totalWorkload <= 15 ? 'heavy' : 'overloaded',
        risk_level: workload.overdue_todos > 5 ? 'high' :
                   workload.overdue_todos > 2 ? 'medium' :
                   workload.overdue_todos > 0 ? 'low' : 'none'
      };
    });

    // Sort based on user preference
    workloadAnalysis.sort((a, b) => {
      switch (args.sort_by) {
        case 'overdue_count':
          return b.overdue_todos - a.overdue_todos;
        case 'name':
          return a.person.name.localeCompare(b.person.name);
        case 'workload':
        default:
          return b.total_workload - a.total_workload;
      }
    });

    // Calculate team metrics
    const teamMetrics = {
      total_people: workloadAnalysis.length,
      people_with_assignments: workloadAnalysis.filter(w => w.total_workload > 0).length,
      total_active_todos: workloadAnalysis.reduce((sum, w) => sum + w.active_todos, 0),
      total_overdue_todos: workloadAnalysis.reduce((sum, w) => sum + w.overdue_todos, 0),
      total_cards: workloadAnalysis.reduce((sum, w) => sum + w.cards, 0),
      average_workload: Math.round((workloadAnalysis.reduce((sum, w) => sum + w.total_workload, 0) / workloadAnalysis.length) * 100) / 100,
      workload_distribution: {
        no_assignments: workloadAnalysis.filter(w => w.workload_status === 'no_assignments').length,
        light: workloadAnalysis.filter(w => w.workload_status === 'light').length,
        moderate: workloadAnalysis.filter(w => w.workload_status === 'moderate').length,
        heavy: workloadAnalysis.filter(w => w.workload_status === 'heavy').length,
        overloaded: workloadAnalysis.filter(w => w.workload_status === 'overloaded').length
      }
    };

    return {
      content: [{
        type: "text",
        text: JSON.stringify({
          message: `Workload analysis complete for ${workloadAnalysis.length} team members across ${filteredProjects.length} projects`,
          team_metrics: teamMetrics,
          individual_workloads: workloadAnalysis,
          analysis_settings: {
            include_overdue_analysis: args.include_overdue_analysis !== false,
            sort_by: args.sort_by || 'workload',
            project_filter: args.project_ids || 'all_projects'
          }
        }, null, 2)
      }]
    };

  } catch (error) {
    return {
      content: [{
        type: "text",
        text: JSON.stringify({
          error: "Failed to analyze workload",
          details: error.message
        }, null, 2)
      }]
    };
  }
}

async function getAssignmentTimeline(args: any, baseUrl: string, headers: any, controller: AbortController) {
  try {
    const daysAhead = args.days_ahead || 30;
    const now = new Date();
    const endDate = new Date(now.getTime() + (daysAhead * 24 * 60 * 60 * 1000));

    // Get projects
    const projectsResponse = await fetch(`${baseUrl}/projects.json`, { headers, signal: controller.signal });
    if (!projectsResponse.ok) {
      throw new Error(`Failed to get projects: ${projectsResponse.status}`);
    }
    const projects = await projectsResponse.json();
    
    const filteredProjects = args.project_ids ? 
      projects.filter((p: any) => args.project_ids.includes(p.id)) : projects;

    let timelineItems: any[] = [];

    // Optional user filtering
    let targetUser = null;
    if (args.user_id) {
      const peopleResponse = await fetch(`${baseUrl}/people.json`, { headers, signal: controller.signal });
      if (peopleResponse.ok) {
        const allPeople = await peopleResponse.json();
        targetUser = allPeople.find((p: any) => p.id === args.user_id);
      }
    }

    // Collect todos with due dates
    for (const project of filteredProjects) {
      try {
        const projectDetailResponse = await fetch(`${baseUrl}/projects/${project.id}.json`, { 
          headers, signal: controller.signal 
        });
        if (!projectDetailResponse.ok) continue;
        
        const projectDetail = await projectDetailResponse.json();
        
        // Get todos with due dates
        const todosetDock = projectDetail.dock.find((item: any) => item.name === 'todoset');
        if (todosetDock) {
          try {
            const todosetResponse = await fetch(todosetDock.url, { headers, signal: controller.signal });
            if (todosetResponse.ok) {
              const todoset = await todosetResponse.json();
              
              for (const todolist of todoset.todolists || []) {
                const todosResponse = await fetch(todolist.todos_url, { headers, signal: controller.signal });
                if (todosResponse.ok) {
                  const todos = await todosResponse.json();
                  
                  todos.forEach((todo: any) => {
                    if (todo.due_on && !todo.completed) {
                      const dueDate = new Date(todo.due_on);
                      
                      // Filter by date range
                      if (dueDate <= endDate) {
                        // Filter by user if specified
                        if (!targetUser || (todo.assignees && todo.assignees.some((a: any) => a.id === targetUser.id))) {
                          const isOverdue = dueDate < now;
                          const daysUntilDue = Math.floor((dueDate.getTime() - now.getTime()) / (1000 * 60 * 60 * 24));
                          
                          timelineItems.push({
                            type: 'todo',
                            id: todo.id,
                            title: todo.content,
                            due_date: todo.due_on,
                            date_object: dueDate,
                            project_name: project.name,
                            project_id: project.id,
                            todolist_name: todolist.title,
                            assignees: todo.assignees || [],
                            is_overdue: isOverdue,
                            days_until_due: daysUntilDue,
                            priority: isOverdue ? 'critical' : 
                                     daysUntilDue <= 1 ? 'high' :
                                     daysUntilDue <= 7 ? 'medium' : 'low'
                          });
                        }
                      }
                    }
                  });
                }
              }
            }
          } catch (e) {
            console.log(`Failed to get todos for project ${project.id}: ${e}`);
          }
        }

        // Get schedule entries if requested
        if (args.include_schedule_entries !== false) {
          const scheduleDock = projectDetail.dock.find((item: any) => item.name === 'schedule');
          if (scheduleDock) {
            try {
              const scheduleResponse = await fetch(scheduleDock.url, { headers, signal: controller.signal });
              if (scheduleResponse.ok) {
                const schedule = await scheduleResponse.json();
                
                (schedule.entries || []).forEach((entry: any) => {
                  const entryDate = new Date(entry.starts_at);
                  
                  if (entryDate >= now && entryDate <= endDate) {
                    const daysUntilEntry = Math.floor((entryDate.getTime() - now.getTime()) / (1000 * 60 * 60 * 24));
                    
                    timelineItems.push({
                      type: 'schedule_entry',
                      id: entry.id,
                      title: entry.summary,
                      due_date: entry.starts_at.split('T')[0], // Extract date part
                      date_object: entryDate,
                      project_name: project.name,
                      project_id: project.id,
                      description: entry.description || '',
                      is_overdue: false,
                      days_until_due: daysUntilEntry,
                      priority: daysUntilEntry <= 1 ? 'high' :
                               daysUntilEntry <= 7 ? 'medium' : 'low',
                      starts_at: entry.starts_at,
                      ends_at: entry.ends_at
                    });
                  }
                });
              }
            } catch (e) {
              console.log(`Failed to get schedule for project ${project.id}: ${e}`);
            }
          }
        }
        
      } catch (e) {
        console.log(`Failed to process project ${project.id}: ${e}`);
        continue;
      }
    }

    // Sort by date
    timelineItems.sort((a, b) => a.date_object.getTime() - b.date_object.getTime());

    // Group by date for better visualization
    const timelineByDate = timelineItems.reduce((acc: any, item: any) => {
      const dateKey = item.due_date;
      if (!acc[dateKey]) {
        acc[dateKey] = {
          date: dateKey,
          items: [],
          total_items: 0,
          overdue_items: 0,
          priority_breakdown: { critical: 0, high: 0, medium: 0, low: 0 }
        };
      }
      
      acc[dateKey].items.push(item);
      acc[dateKey].total_items++;
      if (item.is_overdue) acc[dateKey].overdue_items++;
      acc[dateKey].priority_breakdown[item.priority]++;
      
      return acc;
    }, {});

    const summary = {
      total_items: timelineItems.length,
      overdue_items: timelineItems.filter(item => item.is_overdue).length,
      upcoming_items: timelineItems.filter(item => !item.is_overdue).length,
      todos: timelineItems.filter(item => item.type === 'todo').length,
      schedule_entries: timelineItems.filter(item => item.type === 'schedule_entry').length,
      priority_breakdown: {
        critical: timelineItems.filter(item => item.priority === 'critical').length,
        high: timelineItems.filter(item => item.priority === 'high').length,
        medium: timelineItems.filter(item => item.priority === 'medium').length,
        low: timelineItems.filter(item => item.priority === 'low').length
      }
    };

    return {
      content: [{
        type: "text",
        text: JSON.stringify({
          message: `Assignment timeline for next ${daysAhead} days${targetUser ? ` for ${targetUser.name}` : ' (all users)'}`,
          summary,
          timeline_by_date: Object.values(timelineByDate),
          all_items: timelineItems,
          settings: {
            days_ahead: daysAhead,
            user_filter: targetUser ? { id: targetUser.id, name: targetUser.name } : 'all_users',
            project_filter: args.project_ids || 'all_projects',
            include_schedule_entries: args.include_schedule_entries !== false
          }
        }, null, 2)
      }]
    };

  } catch (error) {
    return {
      content: [{
        type: "text",
        text: JSON.stringify({
          error: "Failed to generate assignment timeline",
          details: error.message
        }, null, 2)
      }]
    };
  }
}

async function findAssignmentsByKeyword(args: any, baseUrl: string, headers: any, controller: AbortController) {
  try {
    // Get projects
    const projectsResponse = await fetch(`${baseUrl}/projects.json`, { headers, signal: controller.signal });
    if (!projectsResponse.ok) {
      throw new Error(`Failed to get projects: ${projectsResponse.status}`);
    }
    const projects = await projectsResponse.json();
    
    const filteredProjects = args.project_ids ? 
      projects.filter((p: any) => args.project_ids.includes(p.id)) : projects;

    let matchingAssignments: any[] = [];
    const searchQuery = args.query.toLowerCase();

    // Optional assignee filtering
    let targetAssignee = null;
    if (args.assignee) {
      const peopleResponse = await fetch(`${baseUrl}/people.json`, { headers, signal: controller.signal });
      if (peopleResponse.ok) {
        const allPeople = await peopleResponse.json();
        const { user } = findBestUserMatch(args.assignee, allPeople);
        targetAssignee = user;
      }
    }

    // Search through todos and cards
    for (const project of filteredProjects) {
      try {
        const projectDetailResponse = await fetch(`${baseUrl}/projects/${project.id}.json`, { 
          headers, signal: controller.signal 
        });
        if (!projectDetailResponse.ok) continue;
        
        const projectDetail = await projectDetailResponse.json();
        
        // Search todos
        const todosetDock = projectDetail.dock.find((item: any) => item.name === 'todoset');
        if (todosetDock) {
          try {
            const todosetResponse = await fetch(todosetDock.url, { headers, signal: controller.signal });
            if (todosetResponse.ok) {
              const todoset = await todosetResponse.json();
              
              for (const todolist of todoset.todolists || []) {
                const todosResponse = await fetch(todolist.todos_url, { headers, signal: controller.signal });
                if (todosResponse.ok) {
                  const todos = await todosResponse.json();
                  
                  todos.forEach((todo: any) => {
                    // Check if content matches search query
                    const contentMatch = todo.content.toLowerCase().includes(searchQuery) ||
                                       (todo.notes && todo.notes.toLowerCase().includes(searchQuery));
                    
                    if (contentMatch && todo.assignees && todo.assignees.length > 0) {
                      // Filter by assignee if specified
                      const assigneeMatch = !targetAssignee || 
                        todo.assignees.some((a: any) => a.id === targetAssignee.id);
                      
                      if (assigneeMatch) {
                        // Filter by status if specified
                        const statusMatch = !args.status ||
                          (args.status === 'completed' && todo.completed) ||
                          (args.status === 'pending' && !todo.completed) ||
                          (args.status === 'overdue' && todo.due_on && new Date(todo.due_on) < new Date() && !todo.completed);
                        
                        if (statusMatch) {
                          matchingAssignments.push({
                            type: 'todo',
                            id: todo.id,
                            title: todo.content,
                            notes: todo.notes || '',
                            project_name: project.name,
                            project_id: project.id,
                            todolist_name: todolist.title,
                            assignees: todo.assignees,
                            completed: todo.completed,
                            due_on: todo.due_on,
                            created_at: todo.created_at,
                            updated_at: todo.updated_at,
                            match_type: 'content',
                            relevance_score: calculateRelevanceScore(todo.content + ' ' + (todo.notes || ''), searchQuery)
                          });
                        }
                      }
                    }
                  });
                }
              }
            }
          } catch (e) {
            console.log(`Failed to search todos in project ${project.id}: ${e}`);
          }
        }

        // Search cards
        const cardTableDock = projectDetail.dock.find((item: any) => item.name === 'kanban_board');
        if (cardTableDock) {
          try {
            const cardTableId = cardTableDock.url.split('/').pop()?.replace('.json', '');
            const cardsResponse = await fetch(`${baseUrl}/buckets/${project.id}/card_tables/${cardTableId}.json`, { 
              headers, signal: controller.signal 
            });
            if (cardsResponse.ok) {
              const cardTable = await cardsResponse.json();
              
              for (const column of cardTable.columns || []) {
                (column.cards || []).forEach((card: any) => {
                  const contentMatch = card.title.toLowerCase().includes(searchQuery) ||
                                     (card.content && card.content.toLowerCase().includes(searchQuery));
                  
                  if (contentMatch && card.assignees && card.assignees.length > 0) {
                    const assigneeMatch = !targetAssignee || 
                      card.assignees.some((a: any) => a.id === targetAssignee.id);
                    
                    if (assigneeMatch) {
                      matchingAssignments.push({
                        type: 'card',
                        id: card.id,
                        title: card.title,
                        content: card.content || '',
                        project_name: project.name,
                        project_id: project.id,
                        column_name: column.title,
                        assignees: card.assignees,
                        created_at: card.created_at,
                        updated_at: card.updated_at,
                        match_type: 'content',
                        relevance_score: calculateRelevanceScore(card.title + ' ' + (card.content || ''), searchQuery)
                      });
                    }
                  }
                });
              }
            }
          } catch (e) {
            console.log(`Failed to search cards in project ${project.id}: ${e}`);
          }
        }
        
      } catch (e) {
        console.log(`Failed to search in project ${project.id}: ${e}`);
        continue;
      }
    }

    // Sort by relevance score
    matchingAssignments.sort((a, b) => b.relevance_score - a.relevance_score);

    return {
      content: [{
        type: "text",
        text: JSON.stringify({
          message: `Found ${matchingAssignments.length} assignments matching "${args.query}"`,
          search_criteria: {
            query: args.query,
            assignee_filter: targetAssignee ? { id: targetAssignee.id, name: targetAssignee.name } : 'all_assignees',
            status_filter: args.status || 'all_statuses',
            project_filter: args.project_ids || 'all_projects'
          },
          results: matchingAssignments,
          summary: {
            total_matches: matchingAssignments.length,
            todos: matchingAssignments.filter(a => a.type === 'todo').length,
            cards: matchingAssignments.filter(a => a.type === 'card').length,
            completed: matchingAssignments.filter(a => a.completed).length,
            pending: matchingAssignments.filter(a => a.type === 'todo' && !a.completed).length
          }
        }, null, 2)
      }]
    };

  } catch (error) {
    return {
      content: [{
        type: "text",
        text: JSON.stringify({
          error: "Failed to search assignments",
          details: error.message,
          query: args.query
        }, null, 2)
      }]
    };
  }
}

function calculateRelevanceScore(content: string, query: string): number {
  const contentLower = content.toLowerCase();
  const queryLower = query.toLowerCase();
  const queryWords = queryLower.split(/\s+/);
  
  let score = 0;
  
  // Exact phrase match gets highest score
  if (contentLower.includes(queryLower)) {
    score += 100;
  }
  
  // Individual word matches
  queryWords.forEach(word => {
    if (contentLower.includes(word)) {
      score += 10;
    }
  });
  
  // Title/beginning matches get bonus
  if (contentLower.startsWith(queryLower)) {
    score += 50;
  }
  
  return score;
}

async function getStaleAssignments(args: any, baseUrl: string, headers: any, controller: AbortController) {
  try {
    const daysStale = args.days_stale || 7;
    const now = new Date();
    const staleThreshold = new Date(now.getTime() - (daysStale * 24 * 60 * 60 * 1000));

    // Get projects
    const projectsResponse = await fetch(`${baseUrl}/projects.json`, { headers, signal: controller.signal });
    if (!projectsResponse.ok) {
      throw new Error(`Failed to get projects: ${projectsResponse.status}`);
    }
    const projects = await projectsResponse.json();
    
    const filteredProjects = args.project_ids ? 
      projects.filter((p: any) => args.project_ids.includes(p.id)) : projects;

    let staleAssignments: any[] = [];

    // Analyze each project
    for (const project of filteredProjects) {
      try {
        const projectDetailResponse = await fetch(`${baseUrl}/projects/${project.id}.json`, { 
          headers, signal: controller.signal 
        });
        if (!projectDetailResponse.ok) continue;
        
        const projectDetail = await projectDetailResponse.json();
        
        // Analyze todos
        const todosetDock = projectDetail.dock.find((item: any) => item.name === 'todoset');
        if (todosetDock) {
          try {
            const todosetResponse = await fetch(todosetDock.url, { headers, signal: controller.signal });
            if (todosetResponse.ok) {
              const todoset = await todosetResponse.json();
              
              for (const todolist of todoset.todolists || []) {
                const todosResponse = await fetch(todolist.todos_url, { headers, signal: controller.signal });
                if (todosResponse.ok) {
                  const todos = await todosResponse.json();
                  
                  todos.forEach((todo: any) => {
                    if (!todo.completed) {
                      const createdDate = new Date(todo.created_at);
                      const updatedDate = new Date(todo.updated_at);
                      const lastActivityDate = updatedDate > createdDate ? updatedDate : createdDate;
                      
                      // Check if stale (no activity for specified days)
                      const isStale = lastActivityDate < staleThreshold;
                      
                      // Check if unassigned (if include_unassigned is true)
                      const isUnassigned = !todo.assignees || todo.assignees.length === 0;
                      
                      // Check if overdue
                      const isOverdue = todo.due_on && new Date(todo.due_on) < now;
                      
                      if (isStale || (args.include_unassigned && isUnassigned) || isOverdue) {
                        const daysSinceActivity = Math.floor((now.getTime() - lastActivityDate.getTime()) / (1000 * 60 * 60 * 24));
                        const severity = calculateAssignmentSeverity(todo);
                        
                        // Filter by severity if specified
                        if (!args.severity_filter || severity === args.severity_filter) {
                          staleAssignments.push({
                            type: 'todo',
                            id: todo.id,
                            title: todo.content,
                            project_name: project.name,
                            project_id: project.id,
                            todolist_name: todolist.title,
                            assignees: todo.assignees || [],
                            created_at: todo.created_at,
                            updated_at: todo.updated_at,
                            due_on: todo.due_on,
                            days_since_activity: daysSinceActivity,
                            is_stale: isStale,
                            is_unassigned: isUnassigned,
                            is_overdue: isOverdue,
                            severity: severity,
                            reasons: [
                              isStale && `No activity for ${daysSinceActivity} days`,
                              isUnassigned && 'Unassigned',
                              isOverdue && 'Overdue'
                            ].filter(Boolean)
                          });
                        }
                      }
                    }
                  });
                }
              }
            }
          } catch (e) {
            console.log(`Failed to analyze todos for project ${project.id}: ${e}`);
          }
        }

        // Analyze cards
        const cardTableDock = projectDetail.dock.find((item: any) => item.name === 'kanban_board');
        if (cardTableDock) {
          try {
            const cardTableId = cardTableDock.url.split('/').pop()?.replace('.json', '');
            const cardsResponse = await fetch(`${baseUrl}/buckets/${project.id}/card_tables/${cardTableId}.json`, { 
              headers, signal: controller.signal 
            });
            if (cardsResponse.ok) {
              const cardTable = await cardsResponse.json();
              
              for (const column of cardTable.columns || []) {
                (column.cards || []).forEach((card: any) => {
                  const createdDate = new Date(card.created_at);
                  const updatedDate = new Date(card.updated_at);
                  const lastActivityDate = updatedDate > createdDate ? updatedDate : createdDate;
                  
                  const isStale = lastActivityDate < staleThreshold;
                  const isUnassigned = !card.assignees || card.assignees.length === 0;
                  
                  if (isStale || (args.include_unassigned && isUnassigned)) {
                    const daysSinceActivity = Math.floor((now.getTime() - lastActivityDate.getTime()) / (1000 * 60 * 60 * 1000));
                    const severity = calculateAssignmentSeverity(card);
                    
                    if (!args.severity_filter || severity === args.severity_filter) {
                      staleAssignments.push({
                        type: 'card',
                        id: card.id,
                        title: card.title,
                        content: card.content || '',
                        project_name: project.name,
                        project_id: project.id,
                        column_name: column.title,
                        assignees: card.assignees || [],
                        created_at: card.created_at,
                        updated_at: card.updated_at,
                        days_since_activity: daysSinceActivity,
                        is_stale: isStale,
                        is_unassigned: isUnassigned,
                        is_overdue: false,
                        severity: severity,
                        reasons: [
                          isStale && `No activity for ${daysSinceActivity} days`,
                          isUnassigned && 'Unassigned'
                        ].filter(Boolean)
                      });
                    }
                  }
                });
              }
            }
          } catch (e) {
            console.log(`Failed to analyze cards for project ${project.id}: ${e}`);
          }
        }
        
      } catch (e) {
        console.log(`Failed to analyze project ${project.id}: ${e}`);
        continue;
      }
    }

    // Sort by severity and days since activity
    staleAssignments.sort((a, b) => {
      const severityOrder = { critical: 4, high: 3, medium: 2, low: 1 };
      const aSeverity = severityOrder[a.severity as keyof typeof severityOrder] || 0;
      const bSeverity = severityOrder[b.severity as keyof typeof severityOrder] || 0;
      
      if (aSeverity !== bSeverity) {
        return bSeverity - aSeverity;
      }
      
      return b.days_since_activity - a.days_since_activity;
    });

    const summary = {
      total_stale: staleAssignments.length,
      by_severity: {
        critical: staleAssignments.filter(a => a.severity === 'critical').length,
        high: staleAssignments.filter(a => a.severity === 'high').length,
        medium: staleAssignments.filter(a => a.severity === 'medium').length,
        low: staleAssignments.filter(a => a.severity === 'low').length
      },
      by_reason: {
        stale: staleAssignments.filter(a => a.is_stale).length,
        unassigned: staleAssignments.filter(a => a.is_unassigned).length,
        overdue: staleAssignments.filter(a => a.is_overdue).length
      },
      by_type: {
        todos: staleAssignments.filter(a => a.type === 'todo').length,
        cards: staleAssignments.filter(a => a.type === 'card').length
      }
    };

    return {
      content: [{
        type: "text",
        text: JSON.stringify({
          message: `Found ${staleAssignments.length} stale assignments that need attention`,
          summary,
          stale_assignments: staleAssignments,
          analysis_criteria: {
            days_stale_threshold: daysStale,
            include_unassigned: args.include_unassigned !== false,
            severity_filter: args.severity_filter || 'all_severities',
            project_filter: args.project_ids || 'all_projects'
          }
        }, null, 2)
      }]
    };

  } catch (error) {
    return {
      content: [{
        type: "text",
        text: JSON.stringify({
          error: "Failed to analyze stale assignments",
          details: error.message
        }, null, 2)
      }]
    };
  }
}

async function bulkAssignTodos(args: any, baseUrl: string, headers: any, controller: AbortController) {
  try {
    if (!args.todo_ids || args.todo_ids.length === 0) {
      throw new Error('No todo IDs provided');
    }

    if (!['assign', 'reassign', 'unassign'].includes(args.action)) {
      throw new Error('Invalid action. Must be: assign, reassign, or unassign');
    }

    if ((args.action === 'assign' || args.action === 'reassign') && (!args.assignee_ids || args.assignee_ids.length === 0)) {
      throw new Error('Assignee IDs required for assign/reassign actions');
    }

    const results: any[] = [];
    const errors: any[] = [];

    // Process each todo
    for (const todoId of args.todo_ids) {
      try {
        // First, get the todo to find its project and todolist
        const todoResponse = await fetch(`${baseUrl}/buckets/*/todos/${todoId}.json`, { 
          headers, signal: controller.signal 
        });
        
        if (!todoResponse.ok) {
          errors.push({
            todo_id: todoId,
            error: `Todo not found or inaccessible (${todoResponse.status})`,
            action: args.action
          });
          continue;
        }

        const todo = await todoResponse.json();
        const bucketId = todo.bucket?.id || todo.parent?.bucket?.id;
        
        if (!bucketId) {
          errors.push({
            todo_id: todoId,
            error: 'Could not determine project ID for todo',
            action: args.action
          });
          continue;
        }

        // Prepare update payload based on action
        let updatePayload: any = {};
        
        switch (args.action) {
          case 'assign':
            // Add new assignees to existing ones (if any)
            const existingAssigneeIds = (todo.assignees || []).map((a: any) => a.id);
            const newAssigneeIds = [...new Set([...existingAssigneeIds, ...args.assignee_ids])];
            updatePayload.assignee_ids = newAssigneeIds;
            break;
            
          case 'reassign':
            // Replace all assignees with new ones
            updatePayload.assignee_ids = args.assignee_ids;
            break;
            
          case 'unassign':
            // Remove all assignees
            updatePayload.assignee_ids = [];
            break;
        }

        // Add notification setting
        if (args.notify !== undefined) {
          updatePayload.notify = args.notify;
        }

        // Update the todo
        const updateResponse = await fetch(`${baseUrl}/buckets/${bucketId}/todos/${todoId}.json`, {
          method: 'PUT',
          headers,
          body: JSON.stringify(updatePayload),
          signal: controller.signal
        });

        if (updateResponse.ok) {
          const updatedTodo = await updateResponse.json();
          results.push({
            todo_id: todoId,
            action: args.action,
            success: true,
            previous_assignees: todo.assignees || [],
            new_assignees: updatedTodo.assignees || [],
            title: todo.content
          });
        } else {
          const errorText = await updateResponse.text();
          errors.push({
            todo_id: todoId,
            error: `Failed to update todo (${updateResponse.status}): ${errorText}`,
            action: args.action,
            title: todo.content
          });
        }

      } catch (error) {
        errors.push({
          todo_id: todoId,
          error: error.message,
          action: args.action
        });
      }
    }

    return {
      content: [{
        type: "text",
        text: JSON.stringify({
          message: `Bulk ${args.action} operation completed`,
          summary: {
            total_requested: args.todo_ids.length,
            successful: results.length,
            failed: errors.length,
            success_rate: Math.round((results.length / args.todo_ids.length) * 100)
          },
          successful_operations: results,
          failed_operations: errors,
          operation_details: {
            action: args.action,
            assignee_ids: args.assignee_ids || [],
            notify: args.notify !== false
          }
        }, null, 2)
      }]
    };

  } catch (error) {
    return {
      content: [{
        type: "text",
        text: JSON.stringify({
          error: "Failed to perform bulk assignment operation",
          details: error.message,
          requested_action: args.action
        }, null, 2)
      }]
    };
  }
}

async function createAssignmentReport(args: any, baseUrl: string, headers: any, controller: AbortController) {
  try {
    if (!['personal', 'team', 'project', 'workload_analysis'].includes(args.report_type)) {
      throw new Error('Invalid report type. Must be: personal, team, project, or workload_analysis');
    }

    const format = args.format || 'json';
    const includeMetrics = args.include_metrics !== false;
    const dateRange = args.date_range || 'month';

    let reportData: any = {};
    
    switch (args.report_type) {
      case 'personal':
        if (!args.target_id) {
          throw new Error('target_id required for personal reports');
        }
        reportData = await generatePersonalReport(args.target_id, dateRange, baseUrl, headers, controller);
        break;
        
      case 'team':
        reportData = await generateTeamReport(dateRange, baseUrl, headers, controller);
        break;
        
      case 'project':
        if (!args.target_id) {
          throw new Error('target_id required for project reports');
        }
        reportData = await generateProjectReport(args.target_id, dateRange, baseUrl, headers, controller);
        break;
        
      case 'workload_analysis':
        reportData = await generateWorkloadAnalysisReport(dateRange, baseUrl, headers, controller);
        break;
    }

    // Add metadata
    const report = {
      report_metadata: {
        type: args.report_type,
        generated_at: new Date().toISOString(),
        date_range: dateRange,
        format: format,
        include_metrics: includeMetrics,
        target_id: args.target_id || null
      },
      ...reportData
    };

    // Format output based on requested format
    let output = '';
    switch (format) {
      case 'markdown':
        output = formatReportAsMarkdown(report);
        break;
      case 'summary':
        output = formatReportAsSummary(report);
        break;
      case 'json':
      default:
        output = JSON.stringify(report, null, 2);
        break;
    }

    return {
      content: [{
        type: "text",
        text: output
      }]
    };

  } catch (error) {
    return {
      content: [{
        type: "text",
        text: JSON.stringify({
          error: "Failed to generate assignment report",
          details: error.message,
          report_type: args.report_type
        }, null, 2)
      }]
    };
  }
}

async function generatePersonalReport(userId: number, dateRange: string, baseUrl: string, headers: any, controller: AbortController) {
  // Get user info
  const userResponse = await fetch(`${baseUrl}/people/${userId}.json`, { headers, signal: controller.signal });
  if (!userResponse.ok) {
    throw new Error(`User not found: ${userId}`);
  }
  const user = await userResponse.json();

  // Use existing getUserAssignments logic
  const assignments = await getUserAssignments(
    { user_identifier: userId.toString(), include_completed: true }, 
    baseUrl, headers, controller
  );

  const assignmentsData = JSON.parse(assignments.content[0].text);

  return {
    user: assignmentsData.target_user,
    assignments: assignmentsData.assignments,
    performance_metrics: {
      completion_rate: calculateCompletionRate(assignmentsData.assignments.todos),
      average_completion_time: calculateAverageCompletionTime(assignmentsData.assignments.todos),
      overdue_percentage: calculateOverduePercentage(assignmentsData.assignments.todos)
    }
  };
}

async function generateTeamReport(dateRange: string, baseUrl: string, headers: any, controller: AbortController) {
  // Use existing getAssignmentWorkload logic
  const workload = await getAssignmentWorkload({}, baseUrl, headers, controller);
  const workloadData = JSON.parse(workload.content[0].text);

  return {
    team_overview: workloadData.team_metrics,
    individual_performance: workloadData.individual_workloads,
    recommendations: generateTeamRecommendations(workloadData.individual_workloads)
  };
}

async function generateProjectReport(projectId: number, dateRange: string, baseUrl: string, headers: any, controller: AbortController) {
  // Get project info
  const projectResponse = await fetch(`${baseUrl}/projects/${projectId}.json`, { headers, signal: controller.signal });
  if (!projectResponse.ok) {
    throw new Error(`Project not found: ${projectId}`);
  }
  const project = await projectResponse.json();

  // Use workload analysis for this specific project
  const workload = await getAssignmentWorkload({ project_ids: [projectId] }, baseUrl, headers, controller);
  const workloadData = JSON.parse(workload.content[0].text);

  return {
    project: {
      id: project.id,
      name: project.name,
      description: project.description
    },
    project_assignments: workloadData.individual_workloads,
    project_health: {
      total_assignments: workloadData.team_metrics.total_active_todos + workloadData.team_metrics.total_cards,
      overdue_assignments: workloadData.team_metrics.total_overdue_todos,
      team_utilization: workloadData.team_metrics.people_with_assignments / workloadData.team_metrics.total_people
    }
  };
}

async function generateWorkloadAnalysisReport(dateRange: string, baseUrl: string, headers: any, controller: AbortController) {
  // Get comprehensive workload data
  const workload = await getAssignmentWorkload({ include_overdue_analysis: true }, baseUrl, headers, controller);
  const stale = await getStaleAssignments({ days_stale: 7, include_unassigned: true }, baseUrl, headers, controller);
  
  const workloadData = JSON.parse(workload.content[0].text);
  const staleData = JSON.parse(stale.content[0].text);

  return {
    workload_distribution: workloadData.team_metrics.workload_distribution,
    risk_analysis: {
      overloaded_people: workloadData.individual_workloads.filter((w: any) => w.workload_status === 'overloaded'),
      high_risk_assignments: staleData.stale_assignments.filter((s: any) => s.severity === 'critical'),
      unassigned_work: staleData.stale_assignments.filter((s: any) => s.is_unassigned)
    },
    recommendations: generateWorkloadRecommendations(workloadData, staleData)
  };
}

// Helper functions for report formatting and calculations

function calculateCompletionRate(todos: any[]): number {
  if (todos.length === 0) return 0;
  const completed = todos.filter(t => t.completed).length;
  return Math.round((completed / todos.length) * 100);
}

function calculateAverageCompletionTime(todos: any[]): number | null {
  const completed = todos.filter(t => t.completed && t.completed_at && t.created_at);
  if (completed.length === 0) return null;
  
  const totalDays = completed.reduce((sum, todo) => {
    const created = new Date(todo.created_at);
    const completedAt = new Date(todo.completed_at);
    const days = Math.floor((completedAt.getTime() - created.getTime()) / (1000 * 60 * 60 * 24));
    return sum + days;
  }, 0);
  
  return Math.round(totalDays / completed.length);
}

function calculateOverduePercentage(todos: any[]): number {
  const activeTodos = todos.filter(t => !t.completed);
  if (activeTodos.length === 0) return 0;
  
  const now = new Date();
  const overdue = activeTodos.filter(t => t.due_on && new Date(t.due_on) < now);
  return Math.round((overdue.length / activeTodos.length) * 100);
}

function generateTeamRecommendations(workloads: any[]): string[] {
  const recommendations: string[] = [];
  
  const overloaded = workloads.filter(w => w.workload_status === 'overloaded');
  const underutilized = workloads.filter(w => w.workload_status === 'no_assignments' || w.workload_status === 'light');
  
  if (overloaded.length > 0) {
    recommendations.push(`Consider redistributing work from ${overloaded.length} overloaded team members`);
  }
  
  if (underutilized.length > 0) {
    recommendations.push(`${underutilized.length} team members could take on additional assignments`);
  }
  
  const highRisk = workloads.filter(w => w.risk_level === 'high');
  if (highRisk.length > 0) {
    recommendations.push(`${highRisk.length} team members have high-risk overdue assignments that need immediate attention`);
  }
  
  return recommendations;
}

function generateWorkloadRecommendations(workloadData: any, staleData: any): string[] {
  const recommendations: string[] = [];
  
  if (staleData.summary.total_stale > 0) {
    recommendations.push(`Review ${staleData.summary.total_stale} stale assignments for potential cleanup or reassignment`);
  }
  
  if (staleData.summary.by_reason.unassigned > 0) {
    recommendations.push(`Assign owners to ${staleData.summary.by_reason.unassigned} unassigned tasks`);
  }
  
  const criticalItems = staleData.summary.by_severity.critical;
  if (criticalItems > 0) {
    recommendations.push(`Immediately address ${criticalItems} critical assignments`);
  }
  
  return recommendations;
}

function formatReportAsMarkdown(report: any): string {
  let md = `# ${report.report_metadata.type.charAt(0).toUpperCase() + report.report_metadata.type.slice(1)} Assignment Report\n\n`;
  md += `**Generated:** ${new Date(report.report_metadata.generated_at).toLocaleDateString()}\n`;
  md += `**Date Range:** ${report.report_metadata.date_range}\n\n`;
  
  // Add type-specific content
  if (report.user) {
    md += `## User: ${report.user.name}\n\n`;
    md += `- **Total Assignments:** ${report.assignments.total_count}\n`;
    md += `- **Todos:** ${report.assignments.todos.length}\n`;
    md += `- **Cards:** ${report.assignments.cards.length}\n\n`;
  }
  
  if (report.team_overview) {
    md += `## Team Overview\n\n`;
    md += `- **Total People:** ${report.team_overview.total_people}\n`;
    md += `- **People with Assignments:** ${report.team_overview.people_with_assignments}\n`;
    md += `- **Average Workload:** ${report.team_overview.average_workload}\n\n`;
  }
  
  return md;
}

function formatReportAsSummary(report: any): string {
  const summary = [`${report.report_metadata.type.toUpperCase()} REPORT SUMMARY`];
  summary.push(`Generated: ${new Date(report.report_metadata.generated_at).toLocaleString()}`);
  summary.push('');
  
  if (report.assignments) {
    summary.push(`Total Assignments: ${report.assignments.total_count}`);
  }
  
  if (report.team_overview) {
    summary.push(`Team Size: ${report.team_overview.total_people}`);
    summary.push(`Active Members: ${report.team_overview.people_with_assignments}`);
  }
  
  if (report.recommendations && report.recommendations.length > 0) {
    summary.push('');
    summary.push('KEY RECOMMENDATIONS:');
    report.recommendations.forEach((rec: string, i: number) => {
      summary.push(`${i + 1}. ${rec}`);
    });
  }
  
  return summary.join('\n');
}