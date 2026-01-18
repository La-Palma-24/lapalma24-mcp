# MCP Server for Vacation Rentals

**Official Model Context Protocol (MCP) server for La Palma 24** - Search and discover vacation rental properties across La Palma, Canary Islands.

[![MCP Registry](https://img.shields.io/badge/MCP-Registry-blue)](https://registry.modelcontextprotocol.io)
[![License: MIT](https://img.shields.io/badge/License-MIT-yellow.svg)](https://opensource.org/licenses/MIT)

## About

La Palma 24 has been connecting travelers with unique vacation rentals in La Palma, Canary Islands since 2002. This MCP server enables AI assistants like Claude, ChatGPT, and others to help users discover and book the perfect accommodation through natural conversation.

**Live Server:** `https://mcp.la-palma24.net`

##  Features

-  **Real-time availability** search across 70,000+ monthly listings
-  **Dynamic pricing** with seasonal rates and discounts
-  **Location-based filtering** by municipality and neighborhood
-  **Multilingual support** (Spanish, English, German)
-  **Detailed property information** with photos and amenities
-  **Fast responses** with optimized queries

##  Available Tools

### `buscar_disponibilidad`
Search for available properties for specific dates.

```json
{
  "fecha_llegada": "2024-06-15",
  "fecha_salida": "2024-06-22",
  "num_personas": 4,
  "municipio": "Santa Cruz de La Palma"
}
```

### `calcular_precio_estancia`
Calculate total stay price including all fees and discounts.

```json
{
  "id_casa": "property-123",
  "fecha_llegada": "2024-06-15",
  "fecha_salida": "2024-06-22",
  "num_personas": 4
}
```

### `obtener_detalles_propiedad`
Get complete property details in your preferred language.

```json
{
  "id_casa": "property-123",
  "idioma": "en"
}
```

### `listar_propiedades`
Browse all properties with flexible filtering.

```json
{
  "municipio": "Los Llanos de Aridane",
  "dormitorios": 2,
  "personas_max": 4,
  "limit": 10
}
```

### `listar_municipios`
Get list of all municipalities with available properties.

### `listar_barrios`
Get list of neighborhoods, optionally filtered by municipality.

```json
{
  "municipio": "Santa Cruz de La Palma"
}
```

##  Quick Start

### Using with Claude Desktop

Add to your `claude_desktop_config.json`:

```json
{
  "mcpServers": {
    "lapalma24": {
      "url": "https://mcp.la-palma24.net"
    }
  }
}
```

### Using with VS Code (GitHub Copilot)

Add to `.vscode/mcp.json`:

```json
{
  "servers": {
    "lapalma24": {
      "url": "https://mcp.la-palma24.net"
    }
  }
}
```

### Using with ChatGPT

1. Go to Settings → Apps
2. Click "Create custom app"
3. Enter MCP server URL: `https://mcp.la-palma24.net`
4. Save and enable

##  Example Queries

Once connected, you can ask your AI assistant:

- *"Find me a 2-bedroom apartment in Santa Cruz de La Palma for next week"*
- *"What's available in Los Llanos de Aridane for a family of 4 in July?"*
- *"Show me properties near the beach with ocean views"*
- *"Calculate the price for property X from June 15 to June 22"*
- *"What are the best areas to stay in La Palma for stargazing?"*

##  Locations Covered

La Palma 24 covers all 14 municipalities of La Palma:

- Santa Cruz de La Palma (Capital)
- Los Llanos de Aridane
- Breña Alta
- Breña Baja
- El Paso
- Tazacorte
- Tijarafe
- Puntagorda
- Garafía
- Barlovento
- San Andrés y Sauces
- Puntallana
- Villa de Mazo
- Fuencaliente de La Palma

##  Rate Limits & Security

- **Free tier:** 100 requests per hour per IP
- **Authentication:** None required (public read-only access)
- **HTTPS only:** TLS 1.3 enforced
- **No personal data:** Server does not store user queries

For higher limits or commercial integrations, contact: info@la-palma24.net

##  Technical Details

- **Protocol:** MCP (Model Context Protocol)
- **Transport:** HTTP/HTTPS
- **Format:** JSON-RPC 2.0
- **Hosted:** Canary Islands, Spain
- **Uptime:** 99.9% SLA

##  License

MIT License - see [LICENSE](LICENSE) file for details.

##  Support

- **Website:** https://www.la-palma24.net
- **Email:** info@la-palma24.net
- **Issues:** https://github.com/La-Palma-24/lapalma24-mcp/issues

##  About La Palma

La Palma, the "Isla Bonita" (Beautiful Island), is one of the Canary Islands' best-kept secrets. Known for its:

-  **World-class stargazing** (UNESCO Starlight Reserve)
-  **Volcanic landscapes** and dramatic coastlines
-  **Laurel forests** (UNESCO World Heritage Site)
-  **Black sand beaches** and natural pools
-  **Hiking trails** through diverse microclimates

---

**Made with ❤️ in La Palma, Canary Islands**

*Connecting travelers with authentic island experiences since 2002*
