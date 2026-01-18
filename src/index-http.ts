import { Server } from '@modelcontextprotocol/sdk/server/index.js';
import { StdioServerTransport } from '@modelcontextprotocol/sdk/server/stdio.js';
import {
  CallToolRequestSchema,
  ListToolsRequestSchema,
  Tool,
} from '@modelcontextprotocol/sdk/types.js';
import express from 'express';
import cors from 'cors';
import dotenv from 'dotenv';

dotenv.config();

const API_BASE_URL = process.env.API_BASE_URL || 'https://admin.la-palma24.net';
const API_KEY = process.env.API_KEY || 'demo_key_12345';
const PORT = process.env.PORT || 3000;

// Cliente HTTP simple
async function apiCall(endpoint: string, params: Record<string, any> = {}, method: 'GET' | 'POST' = 'GET') {
  const url = new URL(`${API_BASE_URL}${endpoint}`);
  
  const headers: Record<string, string> = {
    'X-API-Key': API_KEY,
    'Content-Type': 'application/json',
  };

  let requestInit: RequestInit = {
    method,
    headers,
  };

  if (method === 'GET' && Object.keys(params).length > 0) {
    Object.keys(params).forEach(key => {
      if (params[key] !== undefined && params[key] !== null) {
        url.searchParams.append(key, String(params[key]));
      }
    });
  } else if (method === 'POST') {
    requestInit.body = JSON.stringify(params);
  }

  const response = await fetch(url.toString(), requestInit);
  
  if (!response.ok) {
    throw new Error(`API Error: ${response.status} ${response.statusText}`);
  }
  
  return await response.json();
}

// Definición de herramientas MCP
const tools: Tool[] = [
  {
    name: 'buscar_disponibilidad',
    description: 'Busca propiedades vacacionales disponibles en La Palma para unas fechas específicas. Permite filtrar por municipio, barrio y número de personas.',
    inputSchema: {
      type: 'object',
      properties: {
        fecha_llegada: {
          type: 'string',
          description: 'Fecha de llegada en formato YYYY-MM-DD (ej: 2024-06-15)',
          pattern: '^\\d{4}-\\d{2}-\\d{2}$'
        },
        fecha_salida: {
          type: 'string',
          description: 'Fecha de salida en formato YYYY-MM-DD (ej: 2024-06-22)',
          pattern: '^\\d{4}-\\d{2}-\\d{2}$'
        },
        num_personas: {
          type: 'number',
          description: 'Número de huéspedes (default: 2)',
          minimum: 1
        },
        municipio: {
          type: 'string',
          description: 'Filtrar por municipio (ej: Santa Cruz de La Palma, Los Llanos de Aridane)'
        },
        barrio: {
          type: 'string',
          description: 'Filtrar por barrio/zona (ej: Centro, San Telmo, El Charco)'
        }
      },
      required: ['fecha_llegada', 'fecha_salida']
    }
  },
  {
    name: 'obtener_detalles_propiedad',
    description: 'Obtiene información completa de una propiedad específica: características, amenidades, ubicación, precios, fotos, descripciones en el idioma solicitado.',
    inputSchema: {
      type: 'object',
      properties: {
        id_casa: {
          type: 'string',
          description: 'ID de la propiedad a consultar'
        },
        idioma: {
          type: 'string',
          description: 'Idioma para descripciones: es (español), en (inglés), de (alemán)',
          enum: ['es', 'en', 'de'],
          default: 'es'
        }
      },
      required: ['id_casa']
    }
  },
  {
    name: 'calcular_precio_estancia',
    description: 'Calcula el precio total de una estancia incluyendo tarifas por temporada, descuentos aplicables, número de noches y personas.',
    inputSchema: {
      type: 'object',
      properties: {
        id_casa: {
          type: 'string',
          description: 'ID de la propiedad'
        },
        fecha_llegada: {
          type: 'string',
          description: 'Fecha de llegada en formato YYYY-MM-DD',
          pattern: '^\\d{4}-\\d{2}-\\d{2}$'
        },
        fecha_salida: {
          type: 'string',
          description: 'Fecha de salida en formato YYYY-MM-DD',
          pattern: '^\\d{4}-\\d{2}-\\d{2}$'
        },
        num_personas: {
          type: 'number',
          description: 'Número de huéspedes (default: 2)',
          minimum: 1
        }
      },
      required: ['id_casa', 'fecha_llegada', 'fecha_salida']
    }
  },
  {
    name: 'listar_propiedades',
    description: 'Lista todas las propiedades vacacionales disponibles con filtros opcionales por ubicación, capacidad y características. Incluye paginación.',
    inputSchema: {
      type: 'object',
      properties: {
        municipio: {
          type: 'string',
          description: 'Filtrar por municipio'
        },
        barrio: {
          type: 'string',
          description: 'Filtrar por barrio/zona'
        },
        dormitorios: {
          type: 'number',
          description: 'Número de dormitorios',
          minimum: 1
        },
        personas_max: {
          type: 'number',
          description: 'Capacidad mínima de personas',
          minimum: 1
        },
        limit: {
          type: 'number',
          description: 'Número máximo de resultados (default: 50)',
          minimum: 1,
          maximum: 100,
          default: 50
        },
        offset: {
          type: 'number',
          description: 'Offset para paginación (default: 0)',
          minimum: 0,
          default: 0
        }
      }
    }
  },
  {
    name: 'listar_municipios',
    description: 'Obtiene la lista completa de municipios disponibles en La Palma donde hay propiedades. Útil para saber qué ubicaciones se pueden filtrar.',
    inputSchema: {
      type: 'object',
      properties: {}
    }
  },
  {
    name: 'listar_barrios',
    description: 'Obtiene la lista de barrios/zonas disponibles, opcionalmente filtrados por municipio. Útil para búsquedas más específicas de ubicación.',
    inputSchema: {
      type: 'object',
      properties: {
        municipio: {
          type: 'string',
          description: 'Filtrar barrios por municipio (ej: Santa Cruz de La Palma)'
        }
      }
    }
  }
];

// Ejecutar herramienta
async function executeTool(name: string, args: any) {
  try {
    let result;

    switch (name) {
      case 'buscar_disponibilidad':
        result = await apiCall('/api/disponibilidad', args, 'POST');
        break;

      case 'obtener_detalles_propiedad':
        const { id_casa, idioma = 'es' } = args;
        result = await apiCall(`/api/propiedad/${id_casa}`, { idioma }, 'GET');
        break;

      case 'calcular_precio_estancia':
        result = await apiCall('/api/calcular-precio', args, 'POST');
        break;

      case 'listar_propiedades':
        result = await apiCall('/api/propiedades', args, 'GET');
        break;

      case 'listar_municipios':
        result = await apiCall('/api/municipios', {}, 'GET');
        break;

      case 'listar_barrios':
        result = await apiCall('/api/barrios', args, 'GET');
        break;

      default:
        throw new Error(`Herramienta desconocida: ${name}`);
    }

    return {
      content: [
        {
          type: 'text',
          text: JSON.stringify(result, null, 2),
        },
      ],
    };
  } catch (error: any) {
    return {
      content: [
        {
          type: 'text',
          text: JSON.stringify({
            success: false,
            error: error.message,
            details: error.toString()
          }, null, 2),
        },
      ],
      isError: true,
    };
  }
}

// Modo HTTP directo - Claude conecta así
const app = express();

app.use(cors({
  origin: '*',
  methods: ['GET', 'POST', 'OPTIONS'],
  allowedHeaders: ['Content-Type', 'Authorization'],
  credentials: false,
}));
app.use(express.json());

// Endpoint raíz - MCP sobre HTTP
app.post('/', async (req, res) => {
  const message = req.body;

  console.log(`[HTTP-MCP] Recibido: ${message.method || 'sin método'}`);

  // Validar JSON-RPC 2.0
  if (!message.jsonrpc || message.jsonrpc !== '2.0') {
    return res.status(400).json({
      jsonrpc: '2.0',
      id: message.id,
      error: {
        code: -32600,
        message: 'Invalid Request: jsonrpc must be "2.0"'
      }
    });
  }

  try {
    // Initialize
    if (message.method === 'initialize') {
      const response = {
        jsonrpc: '2.0',
        id: message.id,
        result: {
          protocolVersion: '2024-11-05',
          capabilities: {
            tools: {},
          },
          serverInfo: {
            name: process.env.MCP_SERVER_NAME || 'lapalma24-propiedades',
            version: process.env.MCP_SERVER_VERSION || '1.0.0',
          },
        }
      };

      console.log(`[HTTP-MCP] Initialize OK`);
      return res.json(response);
    }

    // Notifications (no requieren respuesta)
    if (message.method && message.method.startsWith('notifications/')) {
      console.log(`[HTTP-MCP] Notificación: ${message.method}`);
      // IMPORTANTE: Notificaciones deben devolver 202 Accepted
      return res.status(202).end();
    }

    // Tools list
    if (message.method === 'tools/list') {
      const response = {
        jsonrpc: '2.0',
        id: message.id,
        result: { tools }
      };

      console.log(`[HTTP-MCP] Tools list: ${tools.length} herramientas`);
      return res.json(response);
    }

    // Tools call
    if (message.method === 'tools/call') {
      const { name, arguments: args } = message.params;

      console.log(`[HTTP-MCP] Ejecutando: ${name}`);

      const result = await executeTool(name, args);

      const response = {
        jsonrpc: '2.0',
        id: message.id,
        result
      };

      return res.json(response);
    }

    // Prompts list (vacío)
    if (message.method === 'prompts/list') {
      const response = {
        jsonrpc: '2.0',
        id: message.id,
        result: { prompts: [] }
      };

      return res.json(response);
    }

    // Resources list (vacío)
    if (message.method === 'resources/list') {
      const response = {
        jsonrpc: '2.0',
        id: message.id,
        result: { resources: [] }
      };

      return res.json(response);
    }

    // Método no encontrado
    console.error(`[HTTP-MCP] Método desconocido: ${message.method}`);

    return res.json({
      jsonrpc: '2.0',
      id: message.id,
      error: {
        code: -32601,
        message: `Method not found: ${message.method}`,
      }
    });

  } catch (error: any) {
    console.error(`[HTTP-MCP] Error:`, error);

    return res.status(500).json({
      jsonrpc: '2.0',
      id: message.id,
      error: {
        code: -32603,
        message: 'Internal error',
        data: error.message
      }
    });
  }
});

// Endpoint GET raíz - información
app.get('/', (req, res) => {
  res.json({
    name: 'MCP Server - La Palma 24 Propiedades Vacacionales',
    version: '1.0.0',
    protocol: 'mcp',
    transport: 'http',
    protocolVersion: '2024-11-05',
    endpoints: {
      mcp: '/',
      health: '/health'
    },
    tools: tools.map(t => ({
      name: t.name,
      description: t.description
    }))
  });
});

// Health check
app.get('/health', (req, res) => {
  res.json({ status: 'ok', timestamp: new Date().toISOString() });
});

// Endpoint POST para ejecutar herramientas vía HTTP directo (sin MCP)
app.post('/tools/:toolName', async (req, res) => {
  const { toolName } = req.params;
  const args = req.body;

  try {
    const tool = tools.find(t => t.name === toolName);
    if (!tool) {
      return res.status(404).json({
        success: false,
        error: `Herramienta no encontrada: ${toolName}`,
        available: tools.map(t => t.name)
      });
    }

    const result = await executeTool(toolName, args);

    // Si es error, devolver el contenido del error
    if (result.isError) {
      return res.status(500).json(JSON.parse(result.content[0].text));
    }

    // Devolver el resultado parseado
    res.json(JSON.parse(result.content[0].text));

  } catch (error: any) {
    res.status(500).json({
      success: false,
      error: error.message,
      details: error.toString()
    });
  }
});

app.listen(PORT, () => {
  console.log(`✅ Servidor MCP HTTP ejecutándose en puerto ${PORT}`);
  console.log(`🌐 URL: http://localhost:${PORT}`);
  console.log(`📡 MCP endpoint: http://localhost:${PORT}/`);
  console.log(`🔧 Health check: http://localhost:${PORT}/health`);
  console.log(`\n🛠️  Herramientas disponibles:`);
  tools.forEach(tool => {
    console.log(`   - ${tool.name}: ${tool.description}`);
  });
  console.log(`\nℹ️  Protocolo: MCP sobre HTTP (NO SSE)`);
  console.log(`ℹ️  Para Claude: usa https://mcp.la-palma24.net/`);
});
