# ⚙️ CONFIGURACIÓN CLOUDFLARE - HEADER PERSONALIZADO AVANZA

## 🎯 Problema

Cloudflare bloquea las peticiones del frontend Avanza. 

⚠️ **IMPORTANTE:** Los navegadores NO permiten modificar el header `User-Agent` desde JavaScript por seguridad.

## ✅ Solución

El frontend ahora envía un **header personalizado** `X-Client-ID` con cada petición:
```
X-Client-ID: AvanzaDigiPrenda-SecureClient/2.1.0-Enterprise (WebApp; Build:APX-8472-DSG-2026; Platform:WebSecure; Hash:9E7F2BC4A1D6)
```

🔒 **Este identificador es único, largo y difícil de adivinar para mayor seguridad.**

---

## 🔧 CONFIGURACIÓN EN CLOUDFLARE

### Opción 1: Permitir Header X-Client-ID (RECOMENDADO)

1. **Accede a tu panel de Cloudflare**
   - Ve a: https://dash.cloudflare.com
   - Selecciona tu dominio: `stockgenius-sotecpro.com`

2. **Ir a Reglas WAF (Web Application Firewall)**
   - En el menú lateral: **Security** → **WAF**
   - O: **Seguridad** → **WAF (Firewall de Aplicaciones Web)**

3. **Crear Regla de Firewall Personalizada**
   - Click en **"Create rule"** o **"Crear regla"**
   - Nombre de la regla: `Permitir Avanza Client-ID`

4. **Configurar la regla:**

   **Campo 1:**
   ```
   HTTP Header
   ```
   
   **Header name:**
   ```
   X-Client-ID
   ```
   
   **Operador:**
   ```
   equals (es igual a)
   ```
   
   **Valor:**
   ```
   AvanzaDigiPrenda-SecureClient/2.1.0-Enterprise (WebApp; Build:APX-8472-DSG-2026; Platform:WebSecure; Hash:9E7F2BC4A1D6)
   ```
   
   **Acción:**
   ```
   Allow (Permitir)
   ```

5. **Orden de la regla:**
   - Asegúrate de que esta regla esté **ANTES** de cualquier regla de bloqueo
   - Orden sugerido: **1** (primera)

6. **Guardar cambios**
   - Click en **"Deploy"** o **"Implementar"**

---

### Opción 2: Desactivar Bot Fight Mode (Más Permisivo)

Si la opción 1 no funciona, desactiva temporalmente Bot Fight Mode:

1. **Accede a Cloudflare Dashboard**
2. Ve a: **Security** → **Bots**
3. **Bot Fight Mode:**
   - Cambia de `On` a `Off`
4. Guarda los cambios

⚠️ **Nota:** Esto hace tu sitio más vulnerable a bots maliciosos.

---

### Opción 3: Agregar a Allowlist de IP (Adicional)

Si conoces la IP del servidor backend:

1. Ve a: **Security** → **WAF** → **Tools**
2. Sección: **IP Access Rules**
3. Click en **"Add rule"**
4. **IP Address:** `TU_IP_SERVIDOR_BACKEND`
5. **Action:** `Allow`
6. **Zone:** `This website`
7. Guarda

---

## 🧪 PROBAR LA CONFIGURACIÓN

### 1. Desde Navegador

Abre la consola del navegador (F12) y ejecuta:

```javascript
fetch('https://backendigiprenda.stockgenius-sotecpro.com/api/v1/auth/login', {
  method: 'OPTIONS',
  headers: {
    'X-Client-ID': 'AvanzaDigiPrenda-SecureClient/2.1.0-Enterprise (WebApp; Build:APX-8472-DSG-2026; Platform:WebSecure; Hash:9E7F2BC4A1D6)',
    'Origin': 'https://avanzadigiprenda.stockgenius-sotecpro.com'
  }
})
.then(r => console.log('✅ Respuesta OK:', r.status))
.catch(e => console.error('❌ Error:', e))
```

### 2. Desde Terminal (curl)

```bash
curl -v -X OPTIONS \
  -H "X-Client-ID: AvanzaDigiPrenda-SecureClient/2.1.0-Enterprise (WebApp; Build:APX-8472-DSG-2026; Platform:WebSecure; Hash:9E7F2BC4A1D6)" \
  -H "Origin: https://avanzadigiprenda.stockgenius-sotecpro.com" \
  https://backendigiprenda.stockgenius-sotecpro.com/api/v1/auth/login
```

**Respuesta esperada:**
```
< HTTP/1.1 204 No Content
< Access-Control-Allow-Origin: *
< Access-Control-Allow-Methods: GET, POST, PUT, DELETE, OPTIONS, PATCH
< Access-Control-Allow-Headers: ... X-Client-ID ...
< cf-ray: XXXXXXX-XXX
```

### 3. Probar Login Real

1. Abre: https://avanzadigiprenda.stockgenius-sotecpro.com
2. Intenta hacer login
3. Abre la consola (F12) → pestaña **Console**
4. Deberías ver el log: `🔐 X-Client-ID enviado: AvanzaDigiPrenda-SecureClient...`
5. Ve a la pestaña **Network**
6. Click en cualquier petición a la API
7. Ve a **Headers → Request Headers**
8. Verifica que aparezca:
   - **X-Client-ID:** `AvanzaDigiPrenda-SecureClient/2.1.0-Enterprise...`
   - **Status:** 200 OK (no 403 Forbidden)

---

## 📊 VERIFICAR LOGS DE CLOUDFLARE

Para ver si Cloudflare está bloqueando las peticiones:

1. Ve a: **Analytics** → **Security**
2. O: **Security** → **Events**
3. Filtra por:
   - **Action:** `Block` o `Challenge`
   - **Service:** `WAF`
4. Busca eventos recientes que bloqueen peticiones desde tu dominio
5. Revisa si el header `X-Client-ID` está presente
6. Si encuentras bloqueos, crea la regla de Allow

---

## 🔒 CONFIGURACIÓN SSL/TLS (Importante)

Para evitar problemas adicionales:

1. Ve a: **SSL/TLS** → **Overview**
2. **Encryption mode:** Debe estar en:
   - ✅ `Full` (si tienes certificado SSL en el servidor)
   - ✅ `Full (strict)` (recomendado si el certificado es válido)
   - ❌ NO usar `Flexible` (causa problemas de redirect)

---

## 🚀 PASOS RÁPIDOS (Resumen)

```
1. Cloudflare Dashboard → Security → WAF
2. Create rule → "Permitir Avanza Client-ID"
3. Campo: HTTP Header → X-Client-ID
4. Operador: equals
5. Valor: AvanzaDigiPrenda-SecureClient/2.1.0-Enterprise (WebApp; Build:APX-8472-DSG-2026; Platform:WebSecure; Hash:9E7F2BC4A1D6)
6. Acción: Allow
7. Deploy
8. Probar login en: https://avanzadigiprenda.stockgenius-sotecpro.com
```

---

## ⚠️ TROUBLESHOOTING

### Error: "Ray ID" en respuesta 403

**Causa:** Cloudflare está bloqueando la petición.

**Solución:**
1. Copia el Ray ID del error
2. Ve a Cloudflare → Security → Events
3. Busca ese Ray ID
4. Revisa qué regla bloqueó la petición
5. Crea una excepción para esa regla

### Error: CORS persiste después de configurar

**Causa:** Cache de Cloudflare o navegador.

**Solución:**
1. **Limpiar cache de Cloudflare:**
   - Cloudflare → Caching → Configuration
   - Click en "Purge Everything"
2. **Limpiar cache del navegador:**
   - `Ctrl + Shift + Del` → Eliminar todo
   - O probar en ventana incógnita

### Error: X-Client-ID no llega al servidor

**Causa:** Cloudflare está bloqueando o modificando los headers personalizados.

**Solución:**
1. Ve a: **Rules** → **Transform Rules**
2. Verifica que no haya reglas que modifiquen o eliminen headers personalizados
3. Asegúrate que X-Client-ID esté en la lista de headers CORS permitidos
4. Revisa que el backend (.htaccess) incluya X-Client-ID en Access-Control-Allow-Headers

---

## 📝 REGLA CLOUDFLARE (Código JSON)

Si tienes acceso a API de Cloudflare, puedes crear la regla con:

```json
{
  "description": "Permitir User-Agent DIGIPRENDAAVANZA",
  "expression": "(http.user_agent eq \"DIGIPRENDAAVANZA\")",
  "action": "allow",
  "enabled": true
}
```

---

## 📧 CONTACTO CON SOPORTE CLOUDFLARE

Si nada funciona, contacta al soporte con esta información:

```
Asunto: Solicitud para permitir User-Agent personalizado

Hola,

Necesito permitir peticiones con el User-Agent "DIGIPRENDAAVANZA" 
desde mi dominio avanzadigiprenda.stockgenius-sotecpro.com 
hacia backendigiprenda.stockgenius-sotecpro.com.

Actualmente las peticiones están siendo bloqueadas por WAF.

Información del sitio:
- Frontend: https://avanzadigiprenda.stockgenius-sotecpro.com
- Backend: https://backendigiprenda.stockgenius-sotecpro.com
- User-Agent: DIGIPRENDAAVANZA

¿Pueden ayudarme a crear una regla para permitir este User-Agent?

Gracias.
```

---

**Última actualización:** Junio 2026
**User-Agent configurado:** `DIGIPRENDAAVANZA`
**Archivos modificados:** `src/lib/api.ts`, `src/lib/auditoria-api.ts`
