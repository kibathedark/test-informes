# Genset · Demostración para capacitación (1.7.2)

Demo independiente de la app real. Usa el formulario de la actualización 1.7.2 y datos ficticios. No tiene conexión a Workers, D1, Microsoft ni OneDrive. No copiar estos archivos sobre el repositorio de producción.

## Publicar en GitHub Pages
1. Crear un repositorio NUEVO, por ejemplo `genset-capacitacion`.
2. Subir todos los archivos de esta carpeta a la raíz, manteniendo las rutas. Subir el contenido, no el ZIP como archivo único.
3. Settings → Pages → Deploy from a branch → main → /(root) → Save.
4. Esperar la publicación y abrir la URL que GitHub indique. Las rutas relativas admiten que la página esté bajo `/genset-capacitacion/`.
5. No configurar secretos, D1, Access, OneDrive ni el Workflow Android. No es una APK.

Para probar localmente: dentro de esta carpeta ejecutar `python -m http.server 8080` y abrir `http://localhost:8080`. No abrir index.html mediante doble clic/file://: algunos recursos y funciones necesitan origen web.

## Acceso simulado
Escribir un correo de ejemplo, pulsar Solicitar código, y escribir manualmente `6x`. No llega ningún correo. La sesión de demostración se conserva en esa pestaña; Reiniciar demo vuelve al acceso inicial.

Este código es público y visible en el código fuente: NO es autenticación ni protección para datos sensibles. Nunca colocar datos reales, firmas personales, contratos ni credenciales. Todos los visitantes pueden ver los datos ficticios incluidos. Los datos introducidos se quedan en el navegador de quien practica.

## Recorrido para grabar (6–8 minutos)
1. Mostrar que es demostración e introducir correo/código.
2. Sincronizar datos (simulado). Buscar “Centro” y elegir CENTRO DE SALUD DEMOSTRACIÓN.
3. Seleccionar Av. Ejemplo 100, Valdivia, y GENERADOR DEMO 100. Abrir ficha técnica.
4. Seleccionar mantención inspectiva e iniciar. Explicar ✓, X y N/A y los estados iniciales.
5. Completar campos manualmente o usar Completar ejemplo de servicio para preparar la toma. Explicar mediciones y observaciones.
6. Dibujar y aceptar firmas DE PRÁCTICA del técnico y cliente. No usar firmas personales en el video público.
7. Agregar foto de ejemplo o practicar con galería/cámara. La cámara depende de permisos del navegador y HTTPS.
8. Guardar pendiente y continuar con otro cliente; abrir Informes guardados para retomar o eliminar una prueba.
9. Simular fallo en próximo envío: enviar, observar pantalla de carga y mensaje de conservación. Reintentar el mismo informe.
10. Esperar la confirmación simulada, compartir/descargar el PDF de cliente con el botón y continuar. Cancelar compartir no reenvía nada.
11. Abrir Informes guardados → Copias del cliente para recuperar el PDF confirmado.
12. Consultar últimos envíos. Todos son locales y simulados. El panel de supervisor, Máster, asignaciones e IA quedan fuera de esta capacitación técnica.

La toolbar amarilla contiene ayudas de grabación, no funciones de producción. La imagen de ejemplo es una ilustración marcada como práctica. El envío usa retardos deliberados para poder narrar las etapas; sus tiempos no representan el servidor real.

## Qué se practica realmente y qué se simula
Reales en el navegador: formulario, checklist, captura/dibujo de firmas, selección de fotos, persistencia de borradores, generación PDF/Word según acciones visibles y pantalla de progreso.
Simulados: ingreso y código, catálogo, altas, sincronización, red, recepción y estado de supervisión. No se envía email, WhatsApp ni informe a ningún servidor. En PC Compartir copia descarga un PDF; el usuario lo adjunta manualmente si quiere practicar en WhatsApp. No simula recepción real de un supervisor.

Los almacenes tienen prefijos exclusivos de capacitación. Para un aislamiento adicional, usar el repositorio/URL independiente y un perfil de navegador para grabar. No se registra Service Worker; la opción sin conexión es una simulación lógica de fallo, no una promesa de arranque offline de GitHub Pages.

## Reinicio
Reiniciar demo borra únicamente los almacenes con prefijo de la demo y sus datos ficticios; recargar permite repetir el video. No afecta a la app real. Si hay otra pestaña de la misma demo abierta, cerrarla para liberar el almacenamiento.
