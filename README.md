# 🤖 WooCommerce AI Server

**Servidor Node.js con IA local** para gestionar tu tienda WooCommerce mediante lenguaje natural. Integra WordPress, WooCommerce REST API y Ollama (llama3) en un único backend potente y privado.

> 💡 Toda la IA se ejecuta localmente con Ollama — sin enviar datos a terceros.

---

## ✨ Características

### 🛒 Gestión completa de WooCommerce
- **Productos** — CRUD completo, búsqueda, filtrado por categoría, ofertas
- **Variaciones** — Gestión de variaciones de productos
- **Pedidos** — CRUD, notas de pedido, reembolsos, envío de emails
- **Clientes** — CRUD completo
- **Cupones** — Creación y gestión
- **Categorías, Tags, Atributos** — Taxonomías completas
- **Clases de envío** — Configuración de shipping
- **Reseñas** — Gestión de reviews de productos

### 📊 Reportes y Analíticas
- Resumen general de la tienda (`/resumen`)
- Estadísticas completas con análisis de precios (`/estadisticas`)
- Catálogo completo organizado por categorías (`/catalogo-completo`)
- Reportes de ventas, top vendidos, totales por entidad

### 🧠 Inteligencia Artificial
- **`POST /ia`** — Interpreta lenguaje natural y ejecuta acciones automáticamente (crear, eliminar, buscar productos, etc.)
- **`POST /chat`** — Chat libre con Ollama sin acciones WooCommerce
- **`POST /v1/chat/completions`** — Compatible con OpenWebUI para usar como interfaz visual

### 📝 WordPress
- Gestión de posts (CRUD completo)
- Información de usuario

---

## 📋 Requisitos

| Requisito | Versión mínima |
|-----------|---------------|
| **Node.js** | >= 18 |
| **WordPress** | Con WooCommerce activo |
| **WooCommerce REST API** | Habilitada con claves generadas |
| **Ollama** | Corriendo en `localhost:11434` |
| **OpenWebUI** | Opcional, para interfaz visual |

---

## 🚀 Instalación

### 1. Clona el repositorio

```bash
git clone https://github.com/javieerpascual/woocommerce-ai.git
cd woocommerce-ai
```

### 2. Instala dependencias

```bash
npm install
```

### 3. Configura las variables de entorno

Copia el archivo de ejemplo y rellena tus credenciales:

```bash
cp .env.example .env
```

Edita `.env` con tus datos:

```env
WP_URL=http://tu-sitio.local
WP_USER=tu_usuario
WP_APP_PASSWORD=tu_app_password

WC_KEY=ck_tu_consumer_key
WC_SECRET=cs_tu_consumer_secret

OLLAMA_URL=http://localhost:11434
OLLAMA_MODEL=llama3
PORT=3001
```

> ⚠️ **Nunca subas el archivo `.env` a Git.** Ya está incluido en `.gitignore`.

### 4. Ejecuta el servidor

```bash
npm start
# o directamente:
node server.js
```

Verás en consola:

```
╔══════════════════════════════════════════════════════╗
║   🚀 WooCommerce AI Server v2.0  –  Puerto 3001     ║
║   📦 WooCommerce: http://tu-sitio.local              ║
║   🤖 Ollama: http://localhost:11434 / llama3          ║
╚══════════════════════════════════════════════════════╝
```

---

## 📡 API Endpoints

### 🔧 Tests de conexión

| Método | Ruta | Descripción |
|--------|------|-------------|
| `GET` | `/test` | Estado del servidor |
| `GET` | `/test-woocommerce` | Test conexión WooCommerce |
| `GET` | `/test-ollama` | Test Ollama IA |
| `GET` | `/test-wordpress` | Test conexión WordPress |

### 📝 WordPress — Posts

| Método | Ruta | Descripción |
|--------|------|-------------|
| `GET` | `/posts` | Listar posts publicados |
| `GET` | `/posts/:id` | Obtener post por ID |
| `POST` | `/posts` | Crear un post |
| `PUT` | `/posts/:id` | Actualizar un post |
| `DELETE` | `/posts/:id` | Eliminar un post |

### 🛒 WooCommerce — Productos

| Método | Ruta | Descripción |
|--------|------|-------------|
| `GET` | `/productos` | Listar todos los productos |
| `GET` | `/productos/:id` | Obtener producto por ID |
| `GET` | `/productos/buscar?q=texto` | Buscar productos por nombre |
| `GET` | `/productos/categoria/:id` | Productos de una categoría |
| `GET` | `/productos/oferta` | Productos en oferta |
| `POST` | `/productos` | Crear un producto |
| `PUT` | `/productos/:id` | Actualizar un producto |
| `DELETE` | `/productos/:id` | Eliminar un producto |

### 📦 Variaciones, Atributos y Categorías

| Método | Ruta | Descripción |
|--------|------|-------------|
| `GET/POST` | `/productos/:id/variaciones` | Listar/Crear variaciones |
| `PUT/DELETE` | `/productos/:id/variaciones/:vid` | Actualizar/Eliminar variación |
| `GET/POST` | `/atributos` | Listar/Crear atributos |
| `GET/POST` | `/atributos/:id/terminos` | Términos de atributo |
| `GET/POST` | `/categorias` | Listar/Crear categorías |
| `GET/POST` | `/tags` | Listar/Crear tags |

### 📋 Pedidos

| Método | Ruta | Descripción |
|--------|------|-------------|
| `GET` | `/pedidos` | Listar pedidos recientes |
| `GET` | `/pedidos/:id` | Detalle de un pedido |
| `POST` | `/pedidos` | Crear pedido |
| `PUT` | `/pedidos/:id` | Actualizar pedido |
| `DELETE` | `/pedidos/:id` | Eliminar pedido |
| `POST` | `/pedidos/:id/enviar-email` | Enviar email al cliente |
| `GET/POST` | `/pedidos/:id/notas` | Notas de pedido |
| `GET/POST` | `/pedidos/:id/reembolsos` | Reembolsos |

### 👥 Clientes, Cupones, Envío y Reseñas

| Método | Ruta | Descripción |
|--------|------|-------------|
| `GET/POST` | `/clientes` | Listar/Crear clientes |
| `GET/POST` | `/cupones` | Listar/Crear cupones |
| `GET/POST` | `/clases-envio` | Clases de envío |
| `GET/POST` | `/resenas` | Reseñas de productos |

### 📊 Reportes y Analíticas

| Método | Ruta | Descripción |
|--------|------|-------------|
| `GET` | `/resumen` | Dashboard con totales |
| `GET` | `/estadisticas` | Análisis completo (precios, ofertas, top productos) |
| `GET` | `/catalogo-completo` | Categorías con sus productos |
| `GET` | `/reportes/ventas` | Reporte de ventas |
| `GET` | `/reportes/top-vendidos` | Productos más vendidos |
| `GET` | `/reportes/totales/:entidad` | Totales por: cupones, clientes, pedidos, productos, resenas, categorias, tags, atributos |

### 🤖 Inteligencia Artificial

| Método | Ruta | Descripción |
|--------|------|-------------|
| `POST` | `/ia` | Lenguaje natural → Acción WooCommerce automática |
| `POST` | `/chat` | Chat libre con Ollama (sin acciones WC) |
| `POST` | `/v1/chat/completions` | Compatible con OpenWebUI |
| `GET` | `/tools` | Lista de herramientas disponibles |

---

## 💬 Ejemplos de uso

### Crear un producto vía IA

```bash
# PowerShell
Invoke-RestMethod -Uri "http://localhost:3001/ia" `
  -Method POST `
  -ContentType "application/json" `
  -Body '{"mensaje":"Crear un producto llamado Pan Integral, precio 2.5, descripción Pan saludable"}'

# cURL
curl -X POST http://localhost:3001/ia \
  -H "Content-Type: application/json" \
  -d '{"mensaje":"Crear un producto llamado Pan Integral, precio 2.5, descripción Pan saludable"}'
```

### Eliminar un producto por nombre

```bash
curl -X POST http://localhost:3001/ia \
  -H "Content-Type: application/json" \
  -d '{"mensaje":"Eliminar producto llamado Pan Integral"}'
```

### Listar productos

```bash
curl http://localhost:3001/productos
```

### Obtener estadísticas de la tienda

```bash
curl http://localhost:3001/estadisticas
```

### Chat libre con IA

```bash
curl -X POST http://localhost:3001/chat \
  -H "Content-Type: application/json" \
  -d '{"mensaje":"¿Qué estrategias de pricing recomiendas para una tienda online?"}'
```

---

## 🔗 Integración con OpenWebUI

1. Configura la URL del endpoint en OpenWebUI:
   ```
   http://host.docker.internal:3001/v1/chat/completions
   ```
2. Autenticación: Ninguna requerida
3. Envía mensajes naturales como:
   - *"Listar productos"*
   - *"Dame un resumen de la tienda"*
   - *"Crear un producto llamado Camiseta, precio 15.99"*

---

## 🔐 Seguridad

- **Nunca subas `.env`** al repositorio — contiene credenciales sensibles
- Las API keys de WooCommerce se generan desde: `WooCommerce > Ajustes > Avanzado > REST API`
- La Application Password de WordPress se genera desde: `Usuarios > Tu Perfil > Contraseñas de aplicación`
- Toda la IA se procesa localmente con Ollama — **sin envío de datos a la nube**

---

## 🗂 Estructura del proyecto

```
woocommerce-ai/
├── server.js          # Servidor principal con todos los endpoints
├── package.json       # Dependencias y scripts
├── .env               # Variables de entorno (NO subir a Git)
├── .env.example       # Plantilla de variables de entorno
├── .gitignore         # Archivos excluidos de Git
└── README.md          # Esta documentación
```

---

## 🛠 Tecnologías

- **[Node.js](https://nodejs.org/)** + **[Express](https://expressjs.com/)** — Backend HTTP
- **[Axios](https://axios-http.com/)** — Cliente HTTP para WordPress/WooCommerce API
- **[dotenv](https://github.com/motdotla/dotenv)** — Gestión de variables de entorno
- **[Ollama](https://ollama.ai/)** — IA local con LLMs (llama3)
- **[WooCommerce REST API v3](https://woocommerce.github.io/woocommerce-rest-api-docs/)** — API de la tienda

---

## 📄 Licencia

MIT © [javieerpascual](https://github.com/javieerpascual)
