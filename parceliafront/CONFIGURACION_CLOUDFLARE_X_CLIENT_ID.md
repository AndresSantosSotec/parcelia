# ⚙️ CONFIGURACIÓN CLOUDFLARE - HEADER PERSONALIZADO X-CLIENT-ID

## 🎯 Problema

Cloudflare bloquea las peticiones del frontend Avanza causando errores CORS o bloqueos 403.

## ⚠️ IMPORTANTE: User-Agent NO SE PUEDE MODIFICAR

**Los navegadores NO permiten modificar el header User-Agent desde JavaScript por seguridad.**

Por eso usamos un **header personalizado**: `X-Client-ID`

## ✅ Solución

El frontend ahora envía todas las peticiones con el header personalizado `X-Client-ID`:
```
X-Client-ID: AvanzaDigiPrenda-SecureClient/2.1.0-Enterprise (WebApp; Build:APX-8472-DSG-2026; Platform:WebSecure; Hash:9E7F2BC4A1D6)
```

🔒 **Este identificador es único, largo y difícil de adivinar para mayor seguridad.**

---

## 🔧 CONFIGURACIÓN EN CLOUDFLARE

### Opción 1: Permitir Header X-Client-ID (Recomendado)

1. **Accede a tu panel de Cloudflare**
   - Ve a: https://dash.cloudflare.com
   - Selecciona tu dominio: `stockgenius-sotecpro.com`

2. **Ir a Reglas WAF (Web Application Firewall)**
   - En el menú lateral: **Security** → **WAF**
   - O: **Seguridad** → **WAF (Firewall de Aplicaciones Web)**

3. **Crear Regla de Firewall Personalizada**
   - Click en **"Create rule"** o **"Crear regla"**
   - Nombre de la regla: `Permitir X-Client-ID Avanza`

4. **Configurar la regla:**

   **Opción A: Usar Expression Builder (Visual)**
   - Campo: `HTTP Header`
   - Nombre del Header: `X-Client-ID`
   - Operador: `equals`
   - Valor: `AvanzaDigiPrenda-SecureClient/2.1.0-Enterprise (WebApp; Build:APX-8472-DSG-2026; Platform:WebSecure; Hash:9E7F2BC4A1D6)`
   - Acción: `Allow`

   **Opción B: Usar Expression Editor (Código)**
   ```
   (http.request.headers["x-client-id"][0] eq "AvanzaDigiPrenda-SecureClient/2.1.0-Enterprise (WebApp; Build:APX-8472-DSG-2026; Platform:WebSecure; Hash:9E7F2BC4A1D6)")
   ```

5. **Orden de la regla:**
   - Asegúrate de que esta regla esté **ANTES** de cualquier regla de bloqueo
   - Orden sugerido: **1** (primera)

6. **Guardar cambios**
   - Click en **"Deploy"** o **"Implementar"**

---

### Opción 2: Permitir por Referer (Alternativa Simple)

Si la opción 1 no funciona, permite las peticiones por el dominio de origen:

1. **Crear Regla:**
   - Nombre: `Permitir Frontend Avanza`

2. **Expresión:**
   ```
   (http.referer contains "avanzadigiprenda.stockgenius-sotecpro.com")
   ```

3. **Acción:** `Allow`

---

### Opción 3: Desactivar Bot Fight Mode (Más Permisivo)

⚠️ **Solo si las opciones anteriores no funcionan:**

1. **Accede a Cloudflare Dashboard**
2. Ve a: **Security** → **Bots**
3. **Bot Fight Mode:**
   - Cambia de `On` a `Off`
4. Guarda los cambios

---

## 🧪 PROBAR LA CONFIGURACIÓN

### 1. Desde Navegador (Console F12)

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
2. Abre la **Consola del Navegador** (F12 → Console)
3. Deberías ver: `🔐 X-Client-ID enviado: AvanzaDigiPrenda-SecureClient...`
4. Intenta hacer login
5. Ve a pestaña **Network** y verifica:
   - **Status:** 200 OK (no 403 Forbidden)
   - **Request Headers → X-Client-ID:** `AvanzaDigiPrenda-SecureClient/2.1.0-Enterprise...`

---

## 📊 VERIFICAR LOGS DE CLOUDFLARE

Para ver si Cloudflare está bloqueando las peticiones:

1. Ve a: **Analytics** → **Security**
2. O: **Security** → **Events**
3. Filtra por:
   - **Action:** `Block` o `Challenge`
   - **Service:** `WAF`
4. Busca eventos recientes
5. Si encuentras bloqueos, crea la regla de Allow

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
2. Create rule → "Permitir X-Client-ID Avanza"
3. Campo: HTTP Header "X-Client-ID" = AvanzaDigiPrenda-SecureClient/2.1.0-Enterprise (WebApp; Build:APX-8472-DSG-2026; Platform:WebSecure; Hash:9E7F2BC4A1D6)
4. Acción: Allow
5. Deploy
6. Probar login en: https://avanzadigiprenda.stockgenius-sotecpro.com
7. Verificar en Console (F12) que aparezca: 🔐 X-Client-ID enviado: ...
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

### No aparece el header X-Client-ID en Network

**Causa:** Necesitas recompilar el frontend.

**Solución:**
```bash
cd d:\Dev_empenios\sistema-de-gestin-de
git pull origin main
npm run build
# Subir carpeta dist/ al servidor
```

---

## 📝 VERIFICACIÓN TÉCNICA

### Backend (.htaccess)

Verifica que el archivo `public/.htaccess` incluya:

```apache
# CORS Headers
Header always set Access-Control-Allow-Headers "Origin, X-Requested-With, Content-Type, Accept, Authorization, X-XSRF-TOKEN, X-Client-ID"

# Handle X-Client-ID Header
RewriteCond %{HTTP:X-Client-ID} .
RewriteRule .* - [E=HTTP_X_CLIENT_ID:%{HTTP:X-Client-ID}]
```

✅ **Ya está configurado en el backend actual**

### Frontend (api.ts y auditoria-api.ts)

Verifica que ambos archivos incluyan:

```typescript
const clientId = 'AvanzaDigiPrenda-SecureClient/2.1.0-Enterprise (WebApp; Build:APX-8472-DSG-2026; Platform:WebSecure; Hash:9E7F2BC4A1D6)'

const headers = {
  'X-Client-ID': clientId,
  // ... otros headers
}

console.log('🔐 X-Client-ID enviado:', clientId)
```

✅ **Ya está configurado en el frontend actual**

---

## 🎯 ¿Por qué X-Client-ID en lugar de User-Agent?

**Razones:**

1. ✅ **User-Agent NO se puede modificar** desde JavaScript en navegadores (política de seguridad)
2. ✅ **X-Client-ID es personalizable** y podemos controlarlo completamente
3. ✅ **Más seguro** porque es un identificador único que generamos
4. ✅ **Cloudflare lo acepta** en reglas WAF sin problemas
5. ✅ **CORS compatible** si lo incluimos en Access-Control-Allow-Headers

---

## 📞 SOPORTE

Si después de configurar sigues teniendo problemas:

1. Captura pantalla del error (con Ray ID si aparece)
2. Captura pantalla de la pestaña Network (F12)
3. Captura pantalla de la consola (F12) mostrando el log `🔐 X-Client-ID enviado:`
4. Contacta a Cloudflare Support con esa información

**Template para soporte:**

```
Asunto: Bloqueo WAF a peticiones con X-Client-ID personalizado

Descripción:
Estoy usando un header personalizado X-Client-ID para identificar mi aplicación frontend.
He configurado una regla WAF para permitir este header, pero sigue bloqueándose.

Header usado:
X-Client-ID: AvanzaDigiPrenda-SecureClient/2.1.0-Enterprise (WebApp; Build:APX-8472-DSG-2026; Platform:WebSecure; Hash:9E7F2BC4A1D6)

Ray ID del error: [COPIAR RAY ID]
Dominio: backendigiprenda.stockgenius-sotecpro.com

Por favor, ayúdenme a permitir este header o desactivar el bloqueo para mi dominio frontend.
```

---

¡Listo! Ahora Cloudflare debería aceptar las peticiones con el header X-Client-ID personalizado. 🎉
