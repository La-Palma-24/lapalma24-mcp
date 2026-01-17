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

const API_BASE_URL = process.env.API_BASE_URL || 'https://www.la-palma24.net';
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

// Crear servidor MCP
const server = new Server(
  {
    name: process.env.MCP_SERVER_NAME || 'lapalma24-propiedades',
    version: process.env.MCP_SERVER_VERSION || '1.0.0',
  },
  {
    capabilities: {
      tools: {},
    },
  }
);

// Handler para listar herramientas
server.setRequestHandler(ListToolsRequestSchema, async () => {
  return { tools };
});

// Handler para ejecutar herramientas
server.setRequestHandler(CallToolRequestSchema, async (request) => {
  const { name, arguments: args } = request.params;

  try {
    let result;

    switch (name) {
      case 'buscar_disponibilidad':
        result = await apiCall('/api/disponibilidad', args as any, 'POST');
        break;

      case 'obtener_detalles_propiedad':
        const { id_casa, idioma = 'es' } = args as any;
        result = await apiCall(`/api/propiedad/${id_casa}`, { idioma }, 'GET');
        break;

      case 'calcular_precio_estancia':
        result = await apiCall('/api/calcular-precio', args as any, 'POST');
        break;

      case 'listar_propiedades':
        result = await apiCall('/api/propiedades', args as any, 'GET');
        break;

      case 'listar_municipios':
        result = await apiCall('/api/municipios', {}, 'GET');
        break;

      case 'listar_barrios':
        result = await apiCall('/api/barrios', args as any, 'GET');
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
});

// Modo de ejecución
const mode = process.argv[2];

if (mode === 'sse') {
  // Servidor SSE con Express
  const app = express();
  
  app.use(cors({
    origin: '*',
    methods: ['GET', 'POST', 'OPTIONS'],
    allowedHeaders: ['Content-Type', 'X-Session-Id'],
    exposedHeaders: ['X-Session-Id'],
  }));
  app.use(express.json());

  // Endpoint de información
  app.get('/', (req, res) => {
    res.json({
      name: 'MCP Server - La Palma 24 Propiedades Vacacionales',
      version: '1.0.0',
      protocol: 'mcp',
      transport: 'sse',
      endpoints: {
        sse: '/sse',
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

  // OPTIONS para CORS preflight en /message
  app.options('/message', (req, res) => {
    res.status(204).end();
  });

  // Almacén de sesiones SSE
  const sessions = new Map<string, any>();

  // Endpoint SSE para recibir mensajes del servidor MCP
  app.get('/sse', (req, res) => {
    const sessionId = req.query.sessionId as string || Math.random().toString(36).substring(7);
    
    res.writeHead(200, {
      'Content-Type': 'text/event-stream',
      'Cache-Control': 'no-cache',
      'Connection': 'keep-alive',
      'Access-Control-Allow-Origin': '*',
      'X-Session-Id': sessionId,
      'X-Accel-Buffering': 'no',
    });

    // Guardar la respuesta para esta sesión
    sessions.set(sessionId, { res, connected: Date.now() });

    // Evento endpoint - indica al cliente dónde enviar mensajes
    res.write(`event: endpoint\n`);
    res.write(`data: /message?sessionId=${sessionId}\n\n`);

    // Evento connected - confirmación de conexión
    res.write(`event: connected\n`);
    res.write(`data: ${JSON.stringify({ 
      status: 'connected', 
      server: process.env.MCP_SERVER_NAME || 'lapalma24-mcp',
      sessionId: sessionId,
      timestamp: new Date().toISOString()
    })}\n\n`);

    // Heartbeat cada 30 segundos con eventos ping
    const heartbeat = setInterval(() => {
      try {
        res.write(`event: ping\n`);
        res.write(`data: ${JSON.stringify({ timestamp: new Date().toISOString() })}\n\n`);
      } catch (error) {
        clearInterval(heartbeat);
      }
    }, 30000);

    req.on('close', () => {
      clearInterval(heartbeat);
      sessions.delete(sessionId);
      res.end();
    });
  });

  // Endpoint para recibir mensajes JSON-RPC del cliente
  app.post('/message', async (req, res) => {
    const sessionId = req.query.sessionId as string || req.headers['x-session-id'] as string;
    
    if (!sessionId) {
      return res.status(400).json({ error: 'Missing sessionId' });
    }

    const session = sessions.get(sessionId);
    if (!session) {
      return res.status(404).json({ error: 'Session not found' });
    }

    const sseResponse = session.res;

    try {
      const message = req.body;
      
      // Validar formato JSON-RPC
      if (!message.jsonrpc || message.jsonrpc !== '2.0') {
        return res.status(400).json({ error: 'Invalid JSON-RPC version' });
      }

      console.log(`[${sessionId}] Recibido: ${message.method}`);
      
      // Procesar mensaje según el método
      if (message.method === 'tools/list') {
        const response = {
          jsonrpc: '2.0',
          id: message.id,
          result: { tools }
        };
        
        sseResponse.write(`event: message\n`);
        sseResponse.write(`data: ${JSON.stringify(response)}\n\n`);
        
      } else if (message.method === 'tools/call') {
        const { name, arguments: args } = message.params;
        
        let result;
        try {
          switch (name) {
            case 'buscar_disponibilidad':
              result = await apiCall('/api/disponibilidad', args as any, 'POST');
              break;
            case 'obtener_detalles_propiedad':
              const { id_casa, idioma = 'es' } = args as any;
              result = await apiCall(`/api/propiedad/${id_casa}`, { idioma }, 'GET');
              break;
            case 'calcular_precio_estancia':
              result = await apiCall('/api/calcular-precio', args as any, 'POST');
              break;
            case 'listar_propiedades':
              result = await apiCall('/api/propiedades', args as any, 'GET');
              break;
            case 'listar_municipios':
              result = await apiCall('/api/municipios', {}, 'GET');
              break;
            case 'listar_barrios':
              result = await apiCall('/api/barrios', args as any, 'GET');
              break;
            default:
              throw new Error(`Herramienta desconocida: ${name}`);
          }

          const response = {
            jsonrpc: '2.0',
            id: message.id,
            result: {
              content: [
                {
                  type: 'text',
                  text: JSON.stringify(result, null, 2),
                },
              ],
            }
          };

          sseResponse.write(`event: message\n`);
          sseResponse.write(`data: ${JSON.stringify(response)}\n\n`);

        } catch (error: any) {
          const errorResponse = {
            jsonrpc: '2.0',
            id: message.id,
            error: {
              code: -32603,
              message: error.message,
            }
          };

          sseResponse.write(`event: message\n`);
          sseResponse.write(`data: ${JSON.stringify(errorResponse)}\n\n`);
        }
      } else if (message.method === 'initialize') {
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

        sseResponse.write(`event: message\n`);
        sseResponse.write(`data: ${JSON.stringify(response)}\n\n`);
        
        console.log(`[${sessionId}] Inicializado correctamente`);
        
      } else if (message.method === 'notifications/initialized') {
        // Notificación de que el cliente ha completado la inicialización
        // No requiere respuesta, pero podemos loguearlo
        console.log(`[${sessionId}] Cliente notificó inicialización completa`);
        
      } else if (message.method && message.method.startsWith('notifications/')) {
        // Otras notificaciones - no requieren respuesta
        console.log(`[${sessionId}] Notificación recibida: ${message.method}`);
        
      } else if (message.method) {
        // Método desconocido - solo responder si tiene ID
        if (message.id !== undefined) {
          const errorResponse = {
            jsonrpc: '2.0',
            id: message.id,
            error: {
              code: -32601,
              message: `Method not found: ${message.method}`,
            }
          };

          sseResponse.write(`event: message\n`);
          sseResponse.write(`data: ${JSON.stringify(errorResponse)}\n\n`);
        }
        
        console.error(`[${sessionId}] Método desconocido: ${message.method}`);
      }

      // Responder OK al cliente HTTP (202 = Accepted para procesamiento asíncrono)
      res.status(202).json({ status: 'accepted' });

    } catch (error: any) {
      res.status(500).json({ error: error.message });
    }
  });

  // Endpoint POST para ejecutar herramientas vía HTTP
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

      // Simular la llamada del handler
      const request = {
        params: {
          name: toolName,
          arguments: args
        }
      };

      let result;
      switch (toolName) {
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
          throw new Error(`Herramienta desconocida: ${toolName}`);
      }

      res.json(result);
    } catch (error: any) {
      res.status(500).json({
        success: false,
        error: error.message,
        details: error.toString()
      });
    }
  });

  app.listen(PORT, () => {
    console.log(`✅ Servidor MCP con SSE ejecutándose en puerto ${PORT}`);
    console.log(`🌐 URL: http://localhost:${PORT}`);
    console.log(`📡 SSE endpoint: http://localhost:${PORT}/sse`);
    console.log(`🔧 Health check: http://localhost:${PORT}/health`);
    console.log(`\n🛠️  Herramientas disponibles:`);
    tools.forEach(tool => {
      console.log(`   - ${tool.name}: ${tool.description}`);
    });
  });

} else {
  // Modo stdio (para uso local con MCP inspector)
  async function main() {
    const transport = new StdioServerTransport();
    await server.connect(transport);
    console.error('Servidor MCP iniciado en modo stdio');
  }

  main().catch((error) => {
    console.error('Error fatal:', error);
    process.exit(1);
  });
}

