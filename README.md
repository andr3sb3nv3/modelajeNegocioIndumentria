# Modelaje de negocio · Indumentaria

Aplicación pública para mostrar dashboards de una marca ficticia. Reproduce el diseño y las herramientas de consulta de la aplicación de referencia, con identidad y datos propios. No utiliza datos, cuentas, credenciales ni integraciones de BENVEAPP.

## Publicar en Vercel

1. Importar **andr3sb3nv3/modelajeNegocioIndumentria**, rama **main**.
2. Seleccionar el framework **Next.js**; el build es `npm run build`.
3. Publicar. `vercel.json` fija el framework y la salida `.next`, también si el proyecto conservaba ajustes de una demo anterior.

No requiere variables de entorno, login, cuenta de servicio de Google ni acceso a otro repositorio. El despliegue se realiza desde Vercel cuando el propietario lo decida.

## Qué permite la demo

Inicio por día, semana o mes; ventas y canales; stock e historial; costos y punto de equilibrio; informes de resultados, producción, proveedores, clientas y canjes; planificación de lanzamientos, temporadas y objetivos; y calculadoras de precios y canal mayorista. Conserva el menú adaptable y los modos día/noche.

La aplicación es **de consulta**. No registra, simula, importa ni elimina ventas o movimientos, ni modifica planillas. Las rutas antiguas de escritura rechazan las solicitudes. Las calculadoras cambian sus resultados en pantalla sin guardar operaciones.

Las ventas ficticias fueron cargadas por pedido del propietario hasta el **20 de octubre de 2026**, con un histórico desde el 11 de agosto de 2024 para explorar las comparaciones por mes, temporada y últimos 12 meses contra sus períodos anteriores. No se agregan ventas al abrir el sitio ni al pasar los días. El inventario muestra un conteo ficticio al corte de la demo. El stock, los gastos, los productos, los costos y los planes son ejemplos ficticios creados para esta demo. No hay clientes, proveedores, importes o datos operativos tomados de otra aplicación.

## Drive independiente

Carpeta: [modelaje de negocio de indumentaria](https://drive.google.com/drive/folders/1Hp3J2NY-koKbr2rHlDC_eDREJdlTwOj2).

Contiene la estructura nueva de carpetas y **17 libros nativos de Google Sheets**, con 41 pestañas. La lectura pública del enlace se limita a esta biblioteca ficticia. No debe colocarse información real en esta carpeta pública.

`config/demo-drive.json` enumera los únicos libros y pestañas que puede consultar el servidor. La aplicación no descubre archivos de otras carpetas ni acepta IDs de planillas enviados por visitantes. Los enlaces de fuente llevan a estos mismos libros.

La fuente principal son las planillas nativas, consultadas de forma anónima y con una caché de lectura de hasta 60 segundos. Si Google no responde, se usa el snapshot JSON ficticio de la misma carpeta y, como respaldo, los fixtures ficticios del repositorio. `GET /api/demo/state` indica el modo de consulta y las fuentes utilizadas por esa instancia del servidor.

## Actualizar datos cuando se solicite

Los datos iniciales tienen fecha de corte **20 de octubre de 2026**. No se generan ventas automáticamente al pasar los días ni al abrir el sitio.

Cuando el propietario pida poblar ventas ficticias a una fecha nueva:

1. Trabajar únicamente en los libros de este manifiesto y mantener las posiciones de las columnas que usan los lectores.
2. Conciliar ventas, canales, stock y movimientos, sin duplicar operaciones entre las hojas de origen y sus copias.
3. Actualizar la fecha de corte de `config/demo-drive.json`, el snapshot ficticio y los fixtures de respaldo.
4. Verificar los tableros y las pruebas antes de publicar el cambio del repositorio.

`npm run demo:export` genera el snapshot a partir de los fixtures; **no escribe en Drive ni inventa ventas nuevas**. El snapshot se reemplaza en su mismo archivo de Drive, conservando el ID. Las hojas se editan por separado cuando el propietario lo pida.

## Desarrollo

Requiere Node.js 22.12 o posterior.

```sh
npm ci
npm run dev -- --port 5173
npm test
npm run build
```

Los importes se muestran en ARS. Las descargas de los modelos mayoristas contienen únicamente supuestos ficticios y fórmulas propias de la demo.
