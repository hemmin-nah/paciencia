# PACIENCIA — versión 1.0.1 corregida

## Solución para «Preparando tu cuaderno…»

Esta versión integra **todas las 84 lecciones, la apariencia y el motor de la aplicación en `index.html`**. Ya no depende de las carpetas `app/` y `contenido/` para arrancar.

### Reparación rápida (si ya publicaste la versión anterior)
1. En tu repositorio de GitHub, abre el archivo `index.html` y pulsa el icono del lápiz (**Edit this file**).
2. Sustituye su contenido íntegro por el contenido del `index.html` nuevo. Como es largo, es más fácil **Add file → Upload files** y subir el archivo nuevo, confirmando la sustitución si GitHub lo permite.
3. Sustituye también `sw.js` por el nuevo incluido en este paquete. Esto evita que GitHub Pages siga usando una versión vieja de la página por la caché.
4. En `Settings → Pages` usa **Deploy from a branch → main → /(root)** si no tienes la carpeta `.github`.
5. Abre la web y pulsa `Ctrl + F5` o prueba una ventana privada. GitHub Pages puede necesitar unos minutos para reflejar la publicación.

### Publicación desde cero
Sube el contenido descomprimido del ZIP a la raíz de tu repositorio. La app arranca incluso si solo has subido `index.html`. Para iconos y modo sin conexión, sube también `manifest.webmanifest`, `sw.js`, `favicon.svg`, `apple-touch-icon.png` e `icons/`.

`app/`, `contenido/` y `tests/` son fuentes y pruebas de mantenimiento; se incluyen en el ZIP, pero no son necesarias para que la interfaz arranque.

No hace falta `npm install`, compilación ni la carpeta `.github`. El progreso se conserva en el mismo navegador porque no se ha cambiado el nombre ni la estructura de la base de datos (IndexedDB).

Para probar localmente, es preferible un servidor HTTP; no abras el HTML con doble clic si necesitas comprobar instalación PWA u offline.

### Si todavía falla
Abre la URL pública y confirma que se ve la nueva pantalla de inicio. Si no aparece, comprueba `index.html` en la raíz y que `Settings → Pages` está publicando `main / (root)`. Compárteme la URL pública para revisar las rutas exactas.
