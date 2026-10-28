# PACIENCIA · El arte de aprender a tardar

**PWA completa, estática e instalable**, con 12 capítulos, 84 lecciones, 12 lecturas, cinco herramientas, proyectos largos, cuaderno y reflexión sobre el progreso. En español. No necesitas Codex ni instalar dependencias.

## Publicar en GitHub Pages (sin compilar)

1. Crea un repositorio en GitHub llamado, por ejemplo, `paciencia`.
2. **Descomprime el ZIP** y sube a la raíz del repositorio `index.html`, `app/`, `contenido/`, `icons/`, `styles.css`, `manifest.webmanifest`, `sw.js`, `.github/` y demás archivos. No subas el ZIP sin descomprimir. Si usas el navegador para subir archivos, verifica que el directorio oculto **`.github/workflows/deploy.yml`** se ha incluido.
3. En **Settings → Pages → Build and deployment → Source**, selecciona **GitHub Actions**.
4. Comprueba **Actions**. Tras el despliegue, visita `https://TU_USUARIO.github.io/paciencia/` (cambiando el usuario y el repositorio por los tuyos).
5. Para iPhone: abre en **Safari**, botón compartir → **Añadir a pantalla de inicio**. En Windows: menú de Chrome/Edge → Instalar aplicación, si está disponible.

**Funciona con cualquier nombre de repositorio y en subrutas**: los recursos y la PWA utilizan rutas relativas; la navegación utiliza `#` para evitar errores 404 de GitHub Pages. Si prefieres un dominio propio, también funciona desde `/`.

## Probar en local

Abre una terminal dentro de la carpeta:

```bash
python -m http.server 8080
```

Ve a `http://localhost:8080/`. La PWA **no se ejecuta correctamente abriendo `index.html` con doble clic** (`file://`) por restricciones del navegador. No necesita Node, npm ni servidor backend. Si tienes Node instalado, puedes usar `npm test` para verificar el contenido y las copias de seguridad.

## Funciones

- Inicio, mapa de 12 semanas, lecturas semanales y 84 prácticas originales.
- Lecciones con explicación, práctica, alternativa mínima, cuaderno, autoobservación opcional y **repetición con historial de intentos**.
- Cinco herramientas con formularios y registros; espera opcional de 60 segundos.
- Taller de proyectos: crear, editar, archivar, restaurar, registrar sesiones y guardar puentes para retomar.
- Cuaderno con autoguardado, búsqueda, edición, eliminación y asociación opcional con proyectos.
- Autoobservación inicial y de seguimiento, comparación por pregunta, indicadores no clínicos.
- Biblioteca, modo oscuro/claro/sistema, tamaños de letra, ocultar estimaciones y reducción de movimiento.
- **IndexedDB** para almacenar datos personales en el navegador. Exportación JSON, importación con validación y confirmación y borrado completo con confirmación.
- Modo sin conexión mediante service worker que guarda las pantallas, el contenido y los iconos tras la primera carga satisfactoria.

## Datos y privacidad

Esta es una **aplicación sin backend**. Los textos escritos se guardan solo en este navegador. No hay cuentas ni sincronización; para cambiar de dispositivo utiliza **Ajustes → Exportar mis datos** y luego importa el JSON en el otro dispositivo. No añadas copias de seguridad personales al repositorio GitHub, porque las páginas son públicas. Limpiar los datos del navegador puede eliminar el progreso.

El curso es material de autoaprendizaje, no una terapia ni un instrumento de diagnóstico. No obliga a esperar en situaciones urgentes. La autoobservación no se convierte en puntuación clínica.

## Estructura

- `index.html`, `styles.css`: interfaz.
- `app/main.js`: navegación, pantallas e interacciones.
- `app/store.js`: almacenamiento, exportación, validación y migración de datos.
- `app/icons.js`, `icons/`: iconografía local.
- `contenido/curso.json`: contenido real del curso (84 lecciones).
- `sw.js`, `manifest.webmanifest`: PWA instalable y offline.
- `.github/workflows/deploy.yml`: publicación automática en GitHub Pages.
- `tests/`: pruebas automáticas sin paquetes externos.

**Requiere un navegador moderno con IndexedDB, Service Workers y módulos JavaScript.** La instalación en dispositivos reales y los permisos de almacenamiento pueden variar según el navegador.
