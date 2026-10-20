# TRAMA · Modelaje de negocio de indumentaria

Demo pública de dashboards para mostrar cómo puede trabajar una marca de indumentaria con sus ventas, rentabilidad, productos y producción. Los datos de **Lino Studio** son ficticios y están identificados como demostración en la interfaz. No hay login.

## Publicar en Vercel

1. Importar `andr3sb3nv3/modelajeNegocioIndumentria` y seleccionar la rama `main`.
2. Usar el preset **Vite**, comando `npm run build` y carpeta de salida `dist` (ya declarados en `vercel.json`).
3. Publicar. No hacen falta variables de entorno ni credenciales de Google para la demo.

Vercel sirve la aplicación y la función `/api/dashboard` desde el mismo proyecto.

## Fuente de Google Drive

La conexión está limitada a `dashboard-demo.json`, dentro de la carpeta **modelaje de negocio de indumentaria**. Sus IDs están en `config/drive-source.json`. Únicamente ese archivo de datos ficticios debe permitir lectura con el enlace; la carpeta y los documentos originales pueden permanecer privados.

La aplicación **no lee el resto de los 84 archivos copiados ni sus datos reales**. La API descarga el JSON de demo, valida su estructura y exige `demo: true`. Si Drive no responde, el dashboard sigue funcionando con la copia ficticia incluida en `src/data/demo.json`; nunca reemplaza la demo por los documentos del negocio.

Para actualizar la muestra, reemplazar el contenido del mismo archivo JSON en Drive, conservando su ID y el esquema. La API vuelve a consultarlo y Vercel puede conservar la respuesta cinco minutos, y hasta diez minutos adicionales mientras se revalida. El botón de actualizar vuelve a pedir los datos disponibles. El archivo `src/lib/schema.ts` define y valida el formato, incluyendo referencias a productos.

Opcionalmente, `DEMO_DRIVE_FILE_ID` permite seleccionar otro JSON público de demostración. Se configura solo en el servidor, nunca en una variable con prefijo `VITE_`.

## Desarrollo y verificación

Requiere Node.js 22.12 o superior.

```sh
npm ci
npm run dev
npm test
npm run build
```

`npm run dev` y `npm run preview` incluyen la misma API que se usa en Vercel. Los filtros y las descargas CSV se calculan con los datos visibles. Los importes están en ARS y los períodos se basan en la fecha del conjunto de demostración, para que la muestra siga siendo consistente con el paso del tiempo.

Para actualizar también la copia incluida antes de un commit:

```sh
npm run sync:drive
npm test
npm run build
```

La sincronización solo escribe la copia local después de validar el archivo completo. Los gastos de un canal se asignan según su participación en ventas; no representan una atribución contable real.
