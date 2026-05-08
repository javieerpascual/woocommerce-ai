process.env.NODE_TLS_REJECT_UNAUTHORIZED = "0";
require("dotenv").config();
const express = require("express");
const axios = require("axios");

const app = express();
app.use(express.json());

// =======================
// 🌐 Config
// =======================
const WP_URL = (process.env.WP_URL || "http://findbuy.local").replace(/\/$/, "");
const WP_USER = process.env.WP_USER || "admin";
const WP_APP_PASSWORD = process.env.WP_APP_PASSWORD || "";
const WC_KEY = process.env.WC_KEY || "";
const WC_SECRET = process.env.WC_SECRET || "";
const OLLAMA_URL = process.env.OLLAMA_URL || "http://localhost:11434";
const OLLAMA_MODEL = process.env.OLLAMA_MODEL || "llama3";
const PORT = process.env.PORT || 3000;

const wpAuth = Buffer.from(`${WP_USER}:${WP_APP_PASSWORD.trim()}`).toString("base64");
const wcAuth = Buffer.from(`${WC_KEY}:${WC_SECRET}`).toString("base64");

// Helpers
const wpHeaders = { Authorization: `Basic ${wpAuth}` };
const wcHeaders = { Authorization: `Basic ${wcAuth}` };

async function wpGet(path, params = {}) {
  const r = await axios.get(`${WP_URL}${path}`, { headers: wpHeaders, params });
  return r.data;
}
async function wpPost(path, body) {
  const r = await axios.post(`${WP_URL}${path}`, body, { headers: wpHeaders });
  return r.data;
}
async function wpPut(path, body) {
  const r = await axios.put(`${WP_URL}${path}`, body, { headers: wpHeaders });
  return r.data;
}
async function wpDelete(path, params = {}) {
  const r = await axios.delete(`${WP_URL}${path}`, { headers: wpHeaders, params });
  return r.data;
}

// WooCommerce usa Basic Auth con consumer key/secret
async function wcGet(path, params = {}) {
  const r = await axios.get(`${WP_URL}/wp-json/wc/v3${path}`, { headers: wpHeaders, params });
  return r.data;
}
async function wcPost(path, body) {
  const r = await axios.post(`${WP_URL}/wp-json/wc/v3${path}`, body, { headers: wpHeaders });
  return r.data;
}
async function wcPut(path, body) {
  const r = await axios.put(`${WP_URL}/wp-json/wc/v3${path}`, body, { headers: wpHeaders });
  return r.data;
}
async function wcDelete(path, params = {}) {
  const r = await axios.delete(`${WP_URL}/wp-json/wc/v3${path}`, { headers: wpHeaders, params });
  return r.data;
}

function handleError(res, error, msg = "Error") {
  console.error(msg, error.response?.data || error.message);
  return res.status(error.response?.status || 500).json({
    error: msg,
    detail: error.response?.data || error.message
  });
}

// =======================
// 🔹 WordPress – Usuarios
// =======================
app.get("/me", async (req, res) => {
  try { res.json(await wpGet("/wp-json/wp/v2/users/me")); }
  catch (e) { handleError(res, e, "Error /me"); }
});

// =======================
// 🔹 WordPress – Posts
// =======================
app.get("/posts", async (req, res) => {
  try { res.json(await wpGet("/wp-json/wp/v2/posts", { per_page: 20, order: "desc", orderby: "date", status: "publish", ...req.query })); }
  catch (e) { handleError(res, e, "Error listando posts"); }
});

app.get("/posts/:id", async (req, res) => {
  try { res.json(await wpGet(`/wp-json/wp/v2/posts/${req.params.id}`)); }
  catch (e) { handleError(res, e, "Error obteniendo post"); }
});

app.post("/posts", async (req, res) => {
  try {
    const { title, content, status = "publish", ...rest } = req.body;
    res.json(await wpPost("/wp-json/wp/v2/posts", { title, content, status, ...rest }));
  } catch (e) { handleError(res, e, "Error creando post"); }
});

app.put("/posts/:id", async (req, res) => {
  try { res.json(await wpPut(`/wp-json/wp/v2/posts/${req.params.id}`, req.body)); }
  catch (e) { handleError(res, e, "Error actualizando post"); }
});

app.delete("/posts/:id", async (req, res) => {
  try { res.json(await wpDelete(`/wp-json/wp/v2/posts/${req.params.id}`, { force: true })); }
  catch (e) { handleError(res, e, "Error eliminando post"); }
});

// Alias legacy
app.post("/crear-post", async (req, res) => {
  try {
    const { title, content } = req.body;
    res.json(await wpPost("/wp-json/wp/v2/posts", { title, content, status: "publish" }));
  } catch (e) { handleError(res, e, "Error creando post"); }
});
app.delete("/eliminar-post/:id", async (req, res) => {
  try { res.json({ mensaje: "Post eliminado ✅", data: await wpDelete(`/wp-json/wp/v2/posts/${req.params.id}`, { force: true }) }); }
  catch (e) { handleError(res, e, "Error eliminando post"); }
});

// =======================
// 🔹 WooCommerce – Productos
// =======================
app.get("/productos", async (req, res) => {
  try { res.json(await wcGet("/products", { per_page: 100, ...req.query })); }
  catch (e) { handleError(res, e, "Error listando productos"); }
});

app.get("/productos/categoria/:id", async (req, res) => {
  try {
    const r = await wcGet("/products", { category: req.params.id, per_page: 100, ...req.query });
    res.json(r);
  } catch (e) { handleError(res, e, "Error al listar productos por categoría"); }
});

app.get("/productos/buscar", async (req, res) => {
  try {
    const { q } = req.query;
    if (!q) return res.status(400).json({ error: "Parámetro q requerido" });
    const r = await wcGet("/products", { search: q, per_page: 100 });
    res.json(r);
  } catch (e) { handleError(res, e, "Error al buscar productos"); }
});

app.get("/productos/oferta", async (req, res) => {
  try {
    const r = await wcGet("/products", { on_sale: true, per_page: 100 });
    res.json(r);
  } catch (e) { handleError(res, e, "Error al obtener productos en oferta"); }
});

app.get("/productos/:id", async (req, res) => {
  try { res.json(await wcGet(`/products/${req.params.id}`)); }
  catch (e) { handleError(res, e, "Error obteniendo producto"); }
});

app.post("/productos", async (req, res) => {
  try {
    const { name, regular_price, description, type = "simple", status = "publish", ...rest } = req.body;
    res.json(await wcPost("/products", { name, regular_price, description, type, status, ...rest }));
  } catch (e) { handleError(res, e, "Error creando producto"); }
});

app.put("/productos/:id", async (req, res) => {
  try { res.json(await wcPut(`/products/${req.params.id}`, req.body)); }
  catch (e) { handleError(res, e, "Error actualizando producto"); }
});

app.delete("/productos/:id", async (req, res) => {
  try { res.json(await wcDelete(`/products/${req.params.id}`, { force: true })); }
  catch (e) { handleError(res, e, "Error eliminando producto"); }
});

// Alias legacy
app.post("/crear-producto", async (req, res) => {
  try {
    const { name, regular_price, description } = req.body;
    res.json(await wcPost("/products", { name, regular_price, description, type: "simple", status: "publish" }));
  } catch (e) { handleError(res, e, "Error creando producto"); }
});
app.delete("/eliminar-producto/:id", async (req, res) => {
  try { res.json({ mensaje: "Producto eliminado", data: await wcDelete(`/products/${req.params.id}`, { force: true }) }); }
  catch (e) { handleError(res, e, "Error eliminando producto"); }
});

// =======================
// 🔹 WooCommerce – Variaciones
// =======================
app.get("/productos/:id/variaciones", async (req, res) => {
  try { res.json(await wcGet(`/products/${req.params.id}/variations`, req.query)); }
  catch (e) { handleError(res, e, "Error listando variaciones"); }
});

app.get("/productos/:id/variaciones/:vid", async (req, res) => {
  try { res.json(await wcGet(`/products/${req.params.id}/variations/${req.params.vid}`)); }
  catch (e) { handleError(res, e, "Error obteniendo variación"); }
});

app.post("/productos/:id/variaciones", async (req, res) => {
  try { res.json(await wcPost(`/products/${req.params.id}/variations`, req.body)); }
  catch (e) { handleError(res, e, "Error creando variación"); }
});

app.put("/productos/:id/variaciones/:vid", async (req, res) => {
  try { res.json(await wcPut(`/products/${req.params.id}/variations/${req.params.vid}`, req.body)); }
  catch (e) { handleError(res, e, "Error actualizando variación"); }
});

app.delete("/productos/:id/variaciones/:vid", async (req, res) => {
  try { res.json(await wcDelete(`/products/${req.params.id}/variations/${req.params.vid}`, { force: true })); }
  catch (e) { handleError(res, e, "Error eliminando variación"); }
});

// =======================
// 🔹 WooCommerce – Atributos
// =======================
app.get("/atributos", async (req, res) => {
  try { res.json(await wcGet("/products/attributes")); }
  catch (e) { handleError(res, e, "Error listando atributos"); }
});

app.get("/atributos/:id", async (req, res) => {
  try { res.json(await wcGet(`/products/attributes/${req.params.id}`)); }
  catch (e) { handleError(res, e, "Error obteniendo atributo"); }
});

app.post("/atributos", async (req, res) => {
  try { res.json(await wcPost("/products/attributes", req.body)); }
  catch (e) { handleError(res, e, "Error creando atributo"); }
});

app.put("/atributos/:id", async (req, res) => {
  try { res.json(await wcPut(`/products/attributes/${req.params.id}`, req.body)); }
  catch (e) { handleError(res, e, "Error actualizando atributo"); }
});

app.delete("/atributos/:id", async (req, res) => {
  try { res.json(await wcDelete(`/products/attributes/${req.params.id}`, { force: true })); }
  catch (e) { handleError(res, e, "Error eliminando atributo"); }
});

// Términos de atributo
app.get("/atributos/:id/terminos", async (req, res) => {
  try { res.json(await wcGet(`/products/attributes/${req.params.id}/terms`, req.query)); }
  catch (e) { handleError(res, e, "Error listando términos"); }
});

app.post("/atributos/:id/terminos", async (req, res) => {
  try { res.json(await wcPost(`/products/attributes/${req.params.id}/terms`, req.body)); }
  catch (e) { handleError(res, e, "Error creando término"); }
});

app.put("/atributos/:id/terminos/:tid", async (req, res) => {
  try { res.json(await wcPut(`/products/attributes/${req.params.id}/terms/${req.params.tid}`, req.body)); }
  catch (e) { handleError(res, e, "Error actualizando término"); }
});

app.delete("/atributos/:id/terminos/:tid", async (req, res) => {
  try { res.json(await wcDelete(`/products/attributes/${req.params.id}/terms/${req.params.tid}`, { force: true })); }
  catch (e) { handleError(res, e, "Error eliminando término"); }
});

// =======================
// 🔹 WooCommerce – Categorías
// =======================
app.get("/categorias", async (req, res) => {
  try { res.json(await wcGet("/products/categories", { per_page: 100, ...req.query })); }
  catch (e) { handleError(res, e, "Error listando categorías"); }
});

app.get("/categorias/:id", async (req, res) => {
  try { res.json(await wcGet(`/products/categories/${req.params.id}`)); }
  catch (e) { handleError(res, e, "Error obteniendo categoría"); }
});

app.post("/categorias", async (req, res) => {
  try { res.json(await wcPost("/products/categories", req.body)); }
  catch (e) { handleError(res, e, "Error creando categoría"); }
});

app.put("/categorias/:id", async (req, res) => {
  try { res.json(await wcPut(`/products/categories/${req.params.id}`, req.body)); }
  catch (e) { handleError(res, e, "Error actualizando categoría"); }
});

app.delete("/categorias/:id", async (req, res) => {
  try { res.json(await wcDelete(`/products/categories/${req.params.id}`, { force: true })); }
  catch (e) { handleError(res, e, "Error eliminando categoría"); }
});

// =======================
// 🔹 WooCommerce – Tags
// =======================
app.get("/tags", async (req, res) => {
  try { res.json(await wcGet("/products/tags", req.query)); }
  catch (e) { handleError(res, e, "Error listando tags"); }
});

app.post("/tags", async (req, res) => {
  try { res.json(await wcPost("/products/tags", req.body)); }
  catch (e) { handleError(res, e, "Error creando tag"); }
});

app.put("/tags/:id", async (req, res) => {
  try { res.json(await wcPut(`/products/tags/${req.params.id}`, req.body)); }
  catch (e) { handleError(res, e, "Error actualizando tag"); }
});

app.delete("/tags/:id", async (req, res) => {
  try { res.json(await wcDelete(`/products/tags/${req.params.id}`, { force: true })); }
  catch (e) { handleError(res, e, "Error eliminando tag"); }
});

// =======================
// 🔹 WooCommerce – Reseñas de producto
// =======================
app.get("/resenas", async (req, res) => {
  try { res.json(await wcGet("/products/reviews", req.query)); }
  catch (e) { handleError(res, e, "Error listando reseñas"); }
});

app.get("/resenas/:id", async (req, res) => {
  try { res.json(await wcGet(`/products/reviews/${req.params.id}`)); }
  catch (e) { handleError(res, e, "Error obteniendo reseña"); }
});

app.post("/resenas", async (req, res) => {
  try { res.json(await wcPost("/products/reviews", req.body)); }
  catch (e) { handleError(res, e, "Error creando reseña"); }
});

app.put("/resenas/:id", async (req, res) => {
  try { res.json(await wcPut(`/products/reviews/${req.params.id}`, req.body)); }
  catch (e) { handleError(res, e, "Error actualizando reseña"); }
});

app.delete("/resenas/:id", async (req, res) => {
  try { res.json(await wcDelete(`/products/reviews/${req.params.id}`, { force: true })); }
  catch (e) { handleError(res, e, "Error eliminando reseña"); }
});

// =======================
// 🔹 WooCommerce – Clases de envío
// =======================
app.get("/clases-envio", async (req, res) => {
  try { res.json(await wcGet("/products/shipping_classes", req.query)); }
  catch (e) { handleError(res, e, "Error listando clases de envío"); }
});

app.post("/clases-envio", async (req, res) => {
  try { res.json(await wcPost("/products/shipping_classes", req.body)); }
  catch (e) { handleError(res, e, "Error creando clase de envío"); }
});

app.put("/clases-envio/:id", async (req, res) => {
  try { res.json(await wcPut(`/products/shipping_classes/${req.params.id}`, req.body)); }
  catch (e) { handleError(res, e, "Error actualizando clase de envío"); }
});

app.delete("/clases-envio/:id", async (req, res) => {
  try { res.json(await wcDelete(`/products/shipping_classes/${req.params.id}`, { force: true })); }
  catch (e) { handleError(res, e, "Error eliminando clase de envío"); }
});

// =======================
// 🔹 WooCommerce – Pedidos
// =======================
app.get("/pedidos", async (req, res) => {
  try { res.json(await wcGet("/orders", { per_page: 50, ...req.query })); }
  catch (e) { handleError(res, e, "Error listando pedidos"); }
});

app.get("/pedidos/:id", async (req, res) => {
  try { res.json(await wcGet(`/orders/${req.params.id}`)); }
  catch (e) { handleError(res, e, "Error obteniendo pedido"); }
});

app.post("/pedidos", async (req, res) => {
  try { res.json(await wcPost("/orders", req.body)); }
  catch (e) { handleError(res, e, "Error creando pedido"); }
});

app.put("/pedidos/:id", async (req, res) => {
  try { res.json(await wcPut(`/orders/${req.params.id}`, req.body)); }
  catch (e) { handleError(res, e, "Error actualizando pedido"); }
});

app.delete("/pedidos/:id", async (req, res) => {
  try { res.json(await wcDelete(`/orders/${req.params.id}`, { force: req.query.force === "true" })); }
  catch (e) { handleError(res, e, "Error eliminando pedido"); }
});

// Enviar email de pedido al cliente
app.post("/pedidos/:id/enviar-email", async (req, res) => {
  try {
    const r = await axios.post(
      `${WP_URL}/wp-json/wc/v3/orders/${req.params.id}/actions`,
      { action: "send_order_details" },
      { headers: wcHeaders }
    );
    res.json({ mensaje: "Email enviado ✅", data: r.data });
  } catch (e) { handleError(res, e, "Error enviando email de pedido"); }
});

// =======================
// 🔹 WooCommerce – Notas de pedido
// =======================
app.get("/pedidos/:id/notas", async (req, res) => {
  try { res.json(await wcGet(`/orders/${req.params.id}/notes`, req.query)); }
  catch (e) { handleError(res, e, "Error listando notas"); }
});

app.get("/pedidos/:id/notas/:nid", async (req, res) => {
  try { res.json(await wcGet(`/orders/${req.params.id}/notes/${req.params.nid}`)); }
  catch (e) { handleError(res, e, "Error obteniendo nota"); }
});

app.post("/pedidos/:id/notas", async (req, res) => {
  try { res.json(await wcPost(`/orders/${req.params.id}/notes`, req.body)); }
  catch (e) { handleError(res, e, "Error creando nota"); }
});

app.delete("/pedidos/:id/notas/:nid", async (req, res) => {
  try { res.json(await wcDelete(`/orders/${req.params.id}/notes/${req.params.nid}`, { force: true })); }
  catch (e) { handleError(res, e, "Error eliminando nota"); }
});

// =======================
// 🔹 WooCommerce – Reembolsos de pedido
// =======================
app.get("/pedidos/:id/reembolsos", async (req, res) => {
  try { res.json(await wcGet(`/orders/${req.params.id}/refunds`, req.query)); }
  catch (e) { handleError(res, e, "Error listando reembolsos"); }
});

app.get("/pedidos/:id/reembolsos/:rid", async (req, res) => {
  try { res.json(await wcGet(`/orders/${req.params.id}/refunds/${req.params.rid}`)); }
  catch (e) { handleError(res, e, "Error obteniendo reembolso"); }
});

app.post("/pedidos/:id/reembolsos", async (req, res) => {
  try { res.json(await wcPost(`/orders/${req.params.id}/refunds`, req.body)); }
  catch (e) { handleError(res, e, "Error creando reembolso"); }
});

app.delete("/pedidos/:id/reembolsos/:rid", async (req, res) => {
  try { res.json(await wcDelete(`/orders/${req.params.id}/refunds/${req.params.rid}`, { force: true })); }
  catch (e) { handleError(res, e, "Error eliminando reembolso"); }
});

// =======================
// 🔹 WooCommerce – Clientes
// =======================
app.get("/clientes", async (req, res) => {
  try { res.json(await wcGet("/customers", { per_page: 100, ...req.query })); }
  catch (e) { handleError(res, e, "Error listando clientes"); }
});

app.get("/clientes/:id", async (req, res) => {
  try { res.json(await wcGet(`/customers/${req.params.id}`)); }
  catch (e) { handleError(res, e, "Error obteniendo cliente"); }
});

app.post("/clientes", async (req, res) => {
  try { res.json(await wcPost("/customers", req.body)); }
  catch (e) { handleError(res, e, "Error creando cliente"); }
});

app.put("/clientes/:id", async (req, res) => {
  try { res.json(await wcPut(`/customers/${req.params.id}`, req.body)); }
  catch (e) { handleError(res, e, "Error actualizando cliente"); }
});

app.delete("/clientes/:id", async (req, res) => {
  try { res.json(await wcDelete(`/customers/${req.params.id}`, { force: true, reassign: req.query.reassign })); }
  catch (e) { handleError(res, e, "Error eliminando cliente"); }
});

// =======================
// 🔹 WooCommerce – Cupones
// =======================
app.get("/cupones", async (req, res) => {
  try { res.json(await wcGet("/coupons", { per_page: 100, ...req.query })); }
  catch (e) { handleError(res, e, "Error listando cupones"); }
});

app.get("/cupones/:id", async (req, res) => {
  try { res.json(await wcGet(`/coupons/${req.params.id}`)); }
  catch (e) { handleError(res, e, "Error obteniendo cupón"); }
});

app.post("/cupones", async (req, res) => {
  try { res.json(await wcPost("/coupons", req.body)); }
  catch (e) { handleError(res, e, "Error creando cupón"); }
});

app.put("/cupones/:id", async (req, res) => {
  try { res.json(await wcPut(`/coupons/${req.params.id}`, req.body)); }
  catch (e) { handleError(res, e, "Error actualizando cupón"); }
});

app.delete("/cupones/:id", async (req, res) => {
  try { res.json(await wcDelete(`/coupons/${req.params.id}`, { force: true })); }
  catch (e) { handleError(res, e, "Error eliminando cupón"); }
});

// =======================
// 🔹 WooCommerce – Reportes
// =======================
app.get("/reportes", async (req, res) => {
  try { res.json(await wcGet("/reports")); }
  catch (e) { handleError(res, e, "Error listando reportes"); }
});

app.get("/reportes/ventas", async (req, res) => {
  try { res.json(await wcGet("/reports/sales", req.query)); }
  catch (e) { handleError(res, e, "Error obteniendo reporte de ventas"); }
});

app.get("/reportes/top-vendidos", async (req, res) => {
  try { res.json(await wcGet("/reports/top_sellers", req.query)); }
  catch (e) { handleError(res, e, "Error obteniendo top vendidos"); }
});

app.get("/reportes/totales/cupones", async (req, res) => {
  try { res.json(await wcGet("/reports/coupons/totals")); }
  catch (e) { handleError(res, e, "Error obteniendo totales cupones"); }
});

app.get("/reportes/totales/clientes", async (req, res) => {
  try { res.json(await wcGet("/reports/customers/totals")); }
  catch (e) { handleError(res, e, "Error obteniendo totales clientes"); }
});

app.get("/reportes/totales/pedidos", async (req, res) => {
  try { res.json(await wcGet("/reports/orders/totals")); }
  catch (e) { handleError(res, e, "Error obteniendo totales pedidos"); }
});

app.get("/reportes/totales/productos", async (req, res) => {
  try { res.json(await wcGet("/reports/products/totals")); }
  catch (e) { handleError(res, e, "Error obteniendo totales productos"); }
});

app.get("/reportes/totales/resenas", async (req, res) => {
  try { res.json(await wcGet("/reports/reviews/totals")); }
  catch (e) { handleError(res, e, "Error obteniendo totales reseñas"); }
});

app.get("/reportes/totales/categorias", async (req, res) => {
  try { res.json(await wcGet("/reports/categories/totals")); }
  catch (e) { handleError(res, e, "Error obteniendo totales categorías"); }
});

app.get("/reportes/totales/tags", async (req, res) => {
  try { res.json(await wcGet("/reports/tags/totals")); }
  catch (e) { handleError(res, e, "Error obteniendo totales tags"); }
});

app.get("/reportes/totales/atributos", async (req, res) => {
  try { res.json(await wcGet("/reports/attributes/totals")); }
  catch (e) { handleError(res, e, "Error obteniendo totales atributos"); }
});

// =======================
// 🔹 Resumen completo de la tienda
// =======================
app.get("/resumen", async (req, res) => {
  try {
    const [ventas, totProds, totPedidos, totClientes] = await Promise.all([
      wcGet("/reports/sales"),
      wcGet("/reports/products/totals"),
      wcGet("/reports/orders/totals"),
      wcGet("/reports/customers/totals")
    ]);
    const ventasData = Array.isArray(ventas) ? ventas[0] : ventas;
    const totalProds = totProds.reduce((s, p) => s + parseInt(p.total || 0), 0);
    const totalPedidos = totPedidos.reduce((s, p) => s + parseInt(p.total || 0), 0);
    const totalClientes = totClientes.reduce((s, p) => s + parseInt(p.total || 0), 0);
    res.json({
      productos: totalProds,
      pedidos: totalPedidos,
      clientes: totalClientes,
      ventas_totales: ventasData?.total_sales || "0",
      pedidos_detalle: totPedidos.filter(p => parseInt(p.total) > 0).map(p => `${p.name}: ${p.total}`).join(", ")
    });
  } catch (e) { handleError(res, e, "Error al obtener resumen"); }
});

// =======================
// 🔹 Catálogo completo (categorías + productos)
// =======================
app.get("/catalogo-completo", async (req, res) => {
  try {
    const [categorias, productos] = await Promise.all([
      wcGet("/products/categories", { per_page: 100 }),
      wcGet("/products", { per_page: 100 })
    ]);
    const catalogo = categorias
      .filter(c => c.count > 0)
      .map(c => ({
        id: c.id,
        nombre: c.name,
        total: c.count,
        productos: productos
          .filter(p => p.categories && p.categories.some(pc => pc.id === c.id))
          .map(p => ({
            id: p.id,
            nombre: p.name,
            precio: p.regular_price,
            precio_oferta: p.sale_price || null,
            en_oferta: p.on_sale,
            stock: p.stock_quantity
          }))
      }));
    res.json({
      total_productos: productos.length,
      total_categorias: catalogo.length,
      categorias: catalogo
    });
  } catch (e) { handleError(res, e, "Error al obtener catálogo completo"); }
});

// =======================
// 🔹 Estadísticas completas
// =======================
app.get("/estadisticas", async (req, res) => {
  try {
    const [productos, pedidos, cupones, categorias, ventas, totPedidos] = await Promise.all([
      wcGet("/products", { per_page: 100 }),
      wcGet("/orders", { per_page: 50 }),
      wcGet("/coupons", { per_page: 100 }),
      wcGet("/products/categories", { per_page: 100 }),
      wcGet("/reports/sales"),
      wcGet("/reports/orders/totals")
    ]);
    const ventasData = Array.isArray(ventas) ? ventas[0] : ventas;
    const precios = productos.map(p => parseFloat(p.regular_price) || 0).filter(p => p > 0);
    const masCaros = [...productos].sort((a, b) => parseFloat(b.regular_price) - parseFloat(a.regular_price)).slice(0, 3);
    const masBaratos = [...productos].sort((a, b) => parseFloat(a.regular_price) - parseFloat(b.regular_price)).slice(0, 3);
    const enOferta = productos.filter(p => p.on_sale);
    res.json({
      productos: {
        total: productos.length,
        en_oferta: enOferta.length,
        precio_medio: precios.length ? (precios.reduce((a, b) => a + b, 0) / precios.length).toFixed(2) : "0",
        mas_caro: masCaros[0] ? { nombre: masCaros[0].name, precio: masCaros[0].regular_price } : null,
        mas_barato: masBaratos[0] ? { nombre: masBaratos[0].name, precio: masBaratos[0].regular_price } : null,
        top3_caros: masCaros.map(p => ({ nombre: p.name, precio: p.regular_price })),
        top3_baratos: masBaratos.map(p => ({ nombre: p.name, precio: p.regular_price })),
        en_oferta_lista: enOferta.map(p => ({ nombre: p.name, precio_normal: p.regular_price, precio_oferta: p.sale_price }))
      },
      pedidos: {
        total: pedidos.length,
        por_estado: totPedidos.reduce((acc, p) => { acc[p.slug] = parseInt(p.total); return acc; }, {}),
        ventas_totales: ventasData?.total_sales || "0",
        ticket_medio: ventasData?.average_sales || "0"
      },
      categorias: categorias.filter(c => c.count > 0).map(c => ({ nombre: c.name, productos: c.count })),
      cupones: {
        total: cupones.length,
        lista: cupones.map(c => ({ codigo: c.code, tipo: c.discount_type, cantidad: c.amount }))
      }
    });
  } catch (e) { handleError(res, e, "Error al obtener estadísticas"); }
});

// =======================
// 🤖 IA – Chat con Ollama
// =======================

// Función para llamar a Ollama
async function llamarOllama(prompt, systemPrompt = "") {
  const messages = [];
  if (systemPrompt) messages.push({ role: "system", content: systemPrompt });
  messages.push({ role: "user", content: prompt });

  const r = await axios.post(`${OLLAMA_URL}/api/chat`, {
    model: OLLAMA_MODEL,
    messages,
    stream: false
  });
  return r.data.message?.content || r.data.response || "";
}

// Endpoint principal de IA – interpreta lenguaje natural y ejecuta acciones
app.post("/ia", async (req, res) => {
  try {
    const { mensaje } = req.body;
    if (!mensaje) return res.status(400).json({ error: "Falta el campo 'mensaje'" });

    const msgLower = mensaje.toLowerCase();

    // ── Listar productos ──
    if (msgLower.includes("listar producto") || msgLower.includes("ver producto") || msgLower.includes("productos actuales") || msgLower.includes("qué productos")) {
      const productos = await wcGet("/products", { per_page: 100 });
      return res.json({ accion: "listar_productos", total: productos.length, productos });
    }

    // ── Listar pedidos ──
    if (msgLower.includes("listar pedido") || msgLower.includes("ver pedido") || msgLower.includes("pedidos recientes")) {
      const pedidos = await wcGet("/orders", { per_page: 50 });
      return res.json({ accion: "listar_pedidos", total: pedidos.length, pedidos });
    }

    // ── Listar clientes ──
    if (msgLower.includes("listar cliente") || msgLower.includes("ver cliente")) {
      const clientes = await wcGet("/customers", { per_page: 100 });
      return res.json({ accion: "listar_clientes", total: clientes.length, clientes });
    }

    // ── Listar cupones ──
    if (msgLower.includes("listar cupon") || msgLower.includes("ver cupon")) {
      const cupones = await wcGet("/coupons", { per_page: 100 });
      return res.json({ accion: "listar_cupones", total: cupones.length, cupones });
    }

    // ── Catálogo completo ──
    if (/cat[aá]logo/i.test(msgLower) || msgLower.includes("todas las categor") || msgLower.includes("categorias con productos") || msgLower.includes("categorías con productos")) {
      const [categorias, productos] = await Promise.all([
        wcGet("/products/categories", { per_page: 100 }),
        wcGet("/products", { per_page: 100 })
      ]);
      const catalogo = categorias
        .filter(c => c.count > 0)
        .map(c => ({
          id: c.id,
          nombre: c.name,
          total: c.count,
          productos: productos
            .filter(p => p.categories && p.categories.some(pc => pc.id === c.id))
            .map(p => ({ id: p.id, nombre: p.name, precio: p.regular_price, en_oferta: p.on_sale }))
        }));
      return res.json({ accion: "catalogo_completo", total_productos: productos.length, total_categorias: catalogo.length, categorias: catalogo });
    }

    // ── Productos en oferta / descuento ──
    if (msgLower.includes("oferta") || msgLower.includes("descuento")) {
      const productos = await wcGet("/products", { on_sale: true, per_page: 100 });
      return res.json({ accion: "productos_oferta", total: productos.length, productos });
    }

    // ── Estadísticas completas / análisis ──
    if (/estad[ií]stica/i.test(msgLower) || /an[aá]lisis/i.test(msgLower)) {
      const [productos, pedidos, cupones, categorias, ventas, totPedidos] = await Promise.all([
        wcGet("/products", { per_page: 100 }),
        wcGet("/orders", { per_page: 50 }),
        wcGet("/coupons", { per_page: 100 }),
        wcGet("/products/categories", { per_page: 100 }),
        wcGet("/reports/sales"),
        wcGet("/reports/orders/totals")
      ]);
      const ventasData = Array.isArray(ventas) ? ventas[0] : ventas;
      const precios = productos.map(p => parseFloat(p.regular_price) || 0).filter(p => p > 0);
      const masCaros = [...productos].sort((a, b) => parseFloat(b.regular_price) - parseFloat(a.regular_price)).slice(0, 3);
      const masBaratos = [...productos].sort((a, b) => parseFloat(a.regular_price) - parseFloat(b.regular_price)).slice(0, 3);
      const enOferta = productos.filter(p => p.on_sale);
      return res.json({
        accion: "estadisticas",
        data: {
          productos: {
            total: productos.length,
            en_oferta: enOferta.length,
            precio_medio: precios.length ? (precios.reduce((a, b) => a + b, 0) / precios.length).toFixed(2) : "0",
            mas_caro: masCaros[0] ? { nombre: masCaros[0].name, precio: masCaros[0].regular_price } : null,
            mas_barato: masBaratos[0] ? { nombre: masBaratos[0].name, precio: masBaratos[0].regular_price } : null,
            top3_caros: masCaros.map(p => ({ nombre: p.name, precio: p.regular_price })),
            top3_baratos: masBaratos.map(p => ({ nombre: p.name, precio: p.regular_price })),
            en_oferta_lista: enOferta.map(p => ({ nombre: p.name, precio_normal: p.regular_price, precio_oferta: p.sale_price }))
          },
          pedidos: {
            total: pedidos.length,
            por_estado: totPedidos.reduce((acc, p) => { acc[p.slug] = parseInt(p.total); return acc; }, {}),
            ventas_totales: ventasData?.total_sales || "0",
            ticket_medio: ventasData?.average_sales || "0"
          },
          categorias: categorias.filter(c => c.count > 0).map(c => ({ nombre: c.name, productos: c.count })),
          cupones: { total: cupones.length, lista: cupones.map(c => ({ codigo: c.code, tipo: c.discount_type, cantidad: c.amount })) }
        }
      });
    }

    // ── Resumen / Dashboard ──
    if (msgLower.includes("resumen") || msgLower.includes("dashboard") || msgLower.includes("estadísticas") || msgLower.includes("estadisticas")) {
      const [productos, pedidos, clientes, ventas] = await Promise.all([
        wcGet("/reports/products/totals"),
        wcGet("/reports/orders/totals"),
        wcGet("/reports/customers/totals"),
        wcGet("/reports/sales", { period: "month" })
      ]);
      return res.json({ accion: "resumen", productos, pedidos, clientes, ventas });
    }

    // ── Cuántos productos hay ──
    if (/cu[aá]ntos productos/i.test(msgLower)) {
      const productos = await wcGet("/products", { per_page: 100 });
      return res.json({ accion: "contar_productos", total: productos.length, mensaje: `Hay ${productos.length} productos en la tienda.` });
    }

    // ── Buscar producto por nombre ──
    const buscarMatch = mensaje.match(/buscar producto[:\s]+(.+)/i);
    if (buscarMatch) {
      const q = buscarMatch[1].trim();
      const productos = await wcGet("/products", { search: q, per_page: 100 });
      return res.json({ accion: "buscar_productos", query: q, total: productos.length, productos });
    }

    // ── Productos de una categoría ──
    const catMatch = mensaje.match(/productos (?:de|en) (?:la )?categor[ií]a[:\s]+(.+)/i);
    if (catMatch) {
      const nombreCat = catMatch[1].trim();
      const cats = await wcGet("/products/categories", { search: nombreCat, per_page: 100 });
      if (!cats.length) return res.json({ accion: "productos_categoria", mensaje: `No se encontró la categoría "${nombreCat}"` });
      const cat = cats[0];
      const productos = await wcGet("/products", { category: cat.id, per_page: 100 });
      return res.json({ accion: "productos_categoria", categoria: cat.name, total: productos.length, productos });
    }

    // ── Producto más caro / más barato ──
    if (/m[aá]s caro/i.test(msgLower) || /m[aá]s barato/i.test(msgLower)) {
      const productos = await wcGet("/products", { per_page: 100 });
      const conPrecio = productos.filter(p => parseFloat(p.regular_price) > 0);
      conPrecio.sort((a, b) => parseFloat(a.regular_price) - parseFloat(b.regular_price));
      const esCaro = msgLower.includes("caro");
      const producto = esCaro ? conPrecio[conPrecio.length - 1] : conPrecio[0];
      return res.json({ accion: esCaro ? "producto_mas_caro" : "producto_mas_barato", producto });
    }

    // ── Eliminar producto por nombre ──
    const elimMatch = mensaje.match(/eliminar producto[:\s]+(.+)/i);
    if (elimMatch) {
      const nombre = elimMatch[1].trim();
      const lista = await wcGet("/products", { search: nombre });
      if (!lista.length) return res.json({ accion: "eliminar_producto", mensaje: `No se encontró ningún producto con el nombre "${nombre}"` });
      const id = lista[0].id;
      const eliminado = await wcDelete(`/products/${id}`, { force: true });
      return res.json({ accion: "eliminar_producto", mensaje: `Producto "${nombre}" (ID: ${id}) eliminado ✅`, data: eliminado });
    }

    // ── Crear producto por IA ──
    const systemPrompt = `Eres un asistente de WooCommerce. Cuando el usuario quiera crear un producto, responde ÚNICAMENTE con un JSON válido con este formato exacto (sin markdown, sin explicación):
{"accion":"crear_producto","name":"NOMBRE","regular_price":"PRECIO","description":"DESCRIPCION"}

Si el usuario quiere otra cosa, responde con:
{"accion":"respuesta","mensaje":"TU RESPUESTA AQUÍ"}`;

    const textoIA = await llamarOllama(mensaje, systemPrompt);

    let parsed;
    try {
      const clean = textoIA.replace(/```json|```/g, "").trim();
      const jsonMatch = clean.match(/\{[\s\S]*\}/);
      parsed = JSON.parse(jsonMatch ? jsonMatch[0] : clean);
    } catch {
      return res.json({ accion: "respuesta", mensaje: textoIA });
    }

    if (parsed.accion === "crear_producto" && parsed.name) {
      const producto = await wcPost("/products", {
        name: parsed.name,
        regular_price: String(parsed.regular_price || "0"),
        description: parsed.description || "",
        type: "simple",
        status: "publish"
      });
      return res.json({ accion: "crear_producto", mensaje: `Producto "${parsed.name}" creado ✅`, producto });
    }

    return res.json({ accion: parsed.accion || "respuesta", mensaje: parsed.mensaje || textoIA });

  } catch (error) {
    console.error("Error en /ia:", error.message);
    return res.status(500).json({ error: "Error procesando mensaje IA", detail: error.message });
  }
});

// =======================
// 🔹 Chat libre con Ollama (sin acción WooCommerce)
// =======================
app.post("/chat", async (req, res) => {
  try {
    const { mensaje, system } = req.body;
    if (!mensaje) return res.status(400).json({ error: "Falta el campo 'mensaje'" });
    const respuesta = await llamarOllama(mensaje, system || "");
    return res.json({ respuesta });
  } catch (e) {
    handleError(res, e, "Error en /chat");
  }
});

// =======================
// 🔹 OpenWebUI compatible (/v1/chat/completions)
// =======================
app.post("/v1/chat/completions", async (req, res) => {
  try {
    const messages = req.body.messages || [];
    const lastUser = [...messages].reverse().find(m => m.role === "user");
    const userMessage = lastUser?.content || "";

    const msgLower = userMessage.toLowerCase();

    // Listar productos
    if (msgLower.includes("listar producto") || msgLower.includes("productos actuales")) {
      const productos = await wcGet("/products", { per_page: 100 });
      return res.json({
        id: "local-1", object: "chat.completion",
        choices: [{ message: { role: "assistant", content: `Tienes ${productos.length} productos:\n\n` + productos.map(p => `• **${p.name}** (ID: ${p.id}) – ${p.regular_price}€`).join("\n") } }]
      });
    }

    // Resumen
    if (msgLower.includes("resumen") || msgLower.includes("dashboard")) {
      const [prods, orders] = await Promise.all([
        wcGet("/reports/products/totals"),
        wcGet("/reports/orders/totals")
      ]);
      const content = `📊 **Resumen de la tienda:**\n\nProductos: ${JSON.stringify(prods)}\nPedidos: ${JSON.stringify(orders)}`;
      return res.json({ id: "local-2", object: "chat.completion", choices: [{ message: { role: "assistant", content } }] });
    }

    // Llamada a Ollama con contexto WooCommerce
    const systemPrompt = `Eres un asistente experto en WooCommerce y e-commerce. Ayudas a gestionar la tienda online. Responde siempre en el mismo idioma que el usuario. Si el usuario quiere realizar una acción concreta (crear producto, ver pedidos, etc.), sugiere que use el endpoint /ia con su petición.`;

    const respuesta = await llamarOllama(userMessage, systemPrompt);

    return res.json({
      id: "local-3", object: "chat.completion",
      choices: [{ message: { role: "assistant", content: respuesta } }]
    });

  } catch (error) {
    console.error("Error en /v1/chat/completions:", error.message);
    return res.json({
      id: "local-err", object: "chat.completion",
      choices: [{ message: { role: "assistant", content: `Error: ${error.message}` } }]
    });
  }
});

// =======================
// 🔹 Endpoint de herramientas para OpenWebUI (Tools)
// =======================
app.get("/tools", (req, res) => {
  res.json({
    tools: [
      { name: "listar_productos", description: "Lista todos los productos de WooCommerce", endpoint: "GET /productos" },
      { name: "crear_producto", description: "Crea un nuevo producto", endpoint: "POST /productos", body: { name: "string", regular_price: "string", description: "string" } },
      { name: "eliminar_producto", description: "Elimina un producto por ID", endpoint: "DELETE /productos/:id" },
      { name: "listar_pedidos", description: "Lista los pedidos recientes", endpoint: "GET /pedidos" },
      { name: "listar_clientes", description: "Lista los clientes", endpoint: "GET /clientes" },
      { name: "listar_cupones", description: "Lista los cupones", endpoint: "GET /cupones" },
      { name: "resumen_tienda", description: "Obtiene resumen estadístico de la tienda", endpoint: "GET /reportes/ventas" },
      { name: "ia", description: "Interpreta lenguaje natural y ejecuta acciones WooCommerce", endpoint: "POST /ia", body: { mensaje: "string" } },
      { name: "chat", description: "Chat libre con IA local (Ollama)", endpoint: "POST /chat", body: { mensaje: "string" } }
    ]
  });
});

// =======================
// 🧪 Tests de conexión
// =======================
app.get("/test", (req, res) => {
  res.json({ status: "✅ Servidor funcionando", version: "2.0.0", url: WP_URL, ollama: OLLAMA_URL });
});

app.get("/test-woocommerce", async (req, res) => {
  try {
    const productos = await wcGet("/products", { per_page: 100 });
    res.json({ status: "✅ WooCommerce OK", productos: productos.length });
  } catch (e) {
    res.status(500).json({ status: "❌ Error WooCommerce", error: e.message });
  }
});

app.get("/test-ollama", async (req, res) => {
  try {
    const respuesta = await llamarOllama("Di 'hola' en una sola frase corta.");
    res.json({ status: "✅ Ollama OK", modelo: OLLAMA_MODEL, respuesta });
  } catch (e) {
    res.status(500).json({ status: "❌ Error Ollama", error: e.message });
  }
});

app.get("/test-wordpress", async (req, res) => {
  try {
    const user = await wpGet("/wp-json/wp/v2/users/me");
    res.json({ status: "✅ WordPress OK", usuario: user.name });
  } catch (e) {
    res.status(500).json({ status: "❌ Error WordPress", error: e.message });
  }
});

// =======================
// 🔹 Inicio
// =======================
app.listen(PORT, () => {
  console.log(`
╔══════════════════════════════════════════════════════╗
║   🚀 WooCommerce AI Server v2.0  –  Puerto ${PORT}      ║
║   📦 WooCommerce: ${WP_URL.padEnd(33)}║
║   🤖 Ollama: ${(OLLAMA_URL + " / " + OLLAMA_MODEL).padEnd(37)}║
╚══════════════════════════════════════════════════════╝

  Endpoints disponibles:
  GET  /test                  → Estado del servidor
  GET  /test-woocommerce      → Test conexión WC
  GET  /test-ollama           → Test Ollama IA
  GET  /tools                 → Lista de herramientas

  Productos:    GET/POST /productos  |  GET/PUT/DELETE /productos/:id
  Pedidos:      GET/POST /pedidos    |  GET/PUT/DELETE /pedidos/:id
  Clientes:     GET/POST /clientes   |  GET/PUT/DELETE /clientes/:id
  Cupones:      GET/POST /cupones    |  GET/PUT/DELETE /cupones/:id
  Categorías:   GET/POST /categorias |  GET/PUT/DELETE /categorias/:id
  Reportes:     GET /reportes/ventas | /reportes/top-vendidos | etc.

  IA:           POST /ia    → Lenguaje natural → acción WooCommerce
                POST /chat  → Chat libre con Ollama
                POST /v1/chat/completions → Compatible OpenWebUI
`);
});
