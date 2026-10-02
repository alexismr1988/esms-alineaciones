# Liga SLI · web ESMS

Web estática para gestionar la liga virtual SLI a partir de los archivos de texto que genera ESMS.

## Flujo de trabajo habitual

No hace falta convertir los archivos a mano:

1. Sustituye o añade las plantillas en `rosters/`.
2. Sube los informes de partido a su jornada o ronda dentro de `partidos/`.
3. Si cambia, actualiza `clasificacion/table.txt`.
4. Haz el commit y el push como hasta ahora.

El hook local de Git valida los TXT, ejecuta las pruebas y regenera la carpeta `data/` justo antes de cada commit. La acción de GitHub repite la comprobación como red de seguridad. La web lee esos JSON normalizados, por lo que admite los TXT de ESMS en Windows-1252 y evita problemas de tildes, columnas y formatos de marcador.

El hook se activa una sola vez por clon con:

```bash
git config core.hooksPath .githooks
```

En la copia habitual de este proyecto ya queda configurado.

## Comprobación local

Requiere Node.js 22 o posterior.

```bash
npm test
npm run build
npm run check
npm run serve
```

Abre `http://127.0.0.1:4173/main.html` después de iniciar el servidor.

- `npm test`: prueba plantillas, clasificación, 0-0, penaltis y formatos antiguos.
- `npm run build`: vuelve a generar los datos que consume la web.
- `npm run check`: confirma que `data/` coincide con los TXT actuales.
- `npm run serve`: levanta un servidor local sin dependencias externas.

## Estructura

- `rosters/`: plantillas TXT originales de ESMS.
- `partidos/`: informes TXT originales, ordenados por competición y jornada.
- `clasificacion/`: tabla TXT original.
- `lib/` y `scripts/`: lector y generador de datos.
- `data/`: JSON generado; no se edita manualmente.
- `assets/`: comportamiento y estilos compartidos de la web.
- `tests/`: casos automáticos que protegen los formatos del simulador.

## Escudos

Los escudos incluidos en `assets/crests/` proceden del proyecto
[`JoseArroyave/football-logos`](https://github.com/JoseArroyave/football-logos) y se distribuyen bajo licencia MIT.
La copia de la licencia está en `assets/crests/LICENSE.txt`.

## Recuperación

El cambio se preparó en la rama `codex/pipeline-esms`. La etiqueta local `backup/pre-pipeline-2026-10-02` apunta al estado anterior, de modo que siempre se puede comparar o restaurar la versión previa.

Hay un aviso de datos conocido: la jornada 19 contiene seis informes en lugar de siete. El cruce Barcelona-Borussia no está en el repositorio, así que la web no inventa el informe que falta.
