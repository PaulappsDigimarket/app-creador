# Memoria de proyecto – Digi Market RD (estructura y archivos clave)

Este archivo documenta la estructura y archivos importantes que se usan como contexto en Claude Code para Digi Market RD. Su función es servir de mapa para Claude y para el usuario.

## Carpetas principales

- Carpeta raíz de la agencia en este proyecto:
  - `F:\digimarket rd\proyectos\`

- Carpeta de configuración de Claude Code para este proyecto:
  - `F:\digimarket rd\proyectos\.claude\`

- Carpeta de agentes personalizados:
  - `F:\digimarket rd\proyectos\.claude\agents\`

## Archivos de contexto principales

1. `CLAUDE.md`
   - Ubicación: `F:\digimarket rd\proyectos\CLAUDE.md`
   - Rol:
     - Define el contexto de la agencia Digi Market RD.
     - Describe quién es Paul, qué es Digi Market RD, qué servicios ofrece y cómo quiere trabajar.
     - Explica la relación entre este archivo, el global de usuario y los CLAUDE.md de subproyectos.
     - Indica que los paquetes oficiales están en `paquetes-digimarketrd.md`.
     - Indica que las reglas de precios están en `reglas-precios-digimarketrd.md`.

2. `paquetes-digimarketrd.md`
   - Ubicación: `F:\digimarket rd\proyectos\paquetes-digimarketrd.md`
   - Rol:
     - Contiene el catálogo oficial de 17 paquetes de Digi Market RD.
     - Organizado por categorías:
       - Desarrollo Web.
       - Aplicaciones Web.
       - Social Media.
       - Branding.
     - Cada paquete incluye:
       - Nombre.
       - Categoría.
       - Precio en RD$.
       - Lista de entregables.
       - Tiempo de entrega.
       - Número de rondas de revisión.
       - Condiciones de pago.

3. `reglas-precios-digimarketrd.md`
   - Ubicación: `F:\digimarket rd\proyectos\reglas-precios-digimarketrd.md`
   - Rol:
     - Define reglas generales de:
       - Moneda (RD$).
       - Cobros y adelantos.
       - Descuentos máximos sugeridos.
       - Combos de paquetes.
       - Extras y personalizaciones fuera de paquete.
       - Uso correcto de tiempos de entrega y rondas de revisión.
       - Cómo reflejar paquetes en propuestas y contratos.
       - Cómo sugerir cambios de precios sin alterar el catálogo oficial.

## Jerarquía de memoria de Claude

- Global de usuario:
  - `C:\Users\Pauly2025\.claude\CLAUDE.md`
  - Contiene reglas generales de Paul (estilo de respuesta, idioma, forma de trabajo).

- Nivel agencia:
  - `F:\digimarket rd\proyectos\CLAUDE.md`
  - Define el contexto de Digi Market RD y enlaza con el catálogo de paquetes y las reglas de precios.

- Nivel documentación de negocio:
  - `F:\digimarket rd\proyectos\paquetes-digimarketrd.md`
  - `F:\digimarket rd\proyectos\reglas-precios-digimarketrd.md`

- Nivel agentes personalizados:
  - `F:\digimarket rd\proyectos\.claude\agents\`
  - Aquí se guardarán los agentes como:
    - `director-marketing.md`
    - Otros subagentes (por ejemplo: research, contenido, copy).

## Uso esperado por Claude Code

- Cuando se trabaje en este proyecto, Claude debe:
  - Leer `CLAUDE.md` para entender el contexto de la agencia.
  - Leer `paquetes-digimarketrd.md` para usar los paquetes oficiales.
  - Leer `reglas-precios-digimarketrd.md` para respetar reglas comerciales.
  - Usar los agentes de `.claude\agents\` cuando se le pida actuar como director de marketing o subagente.

- No debe:
  - Inventar rutas nuevas si no están documentadas aquí.
  - Inventar precios o paquetes fuera de los definidos.
  - Cambiar la estructura de carpetas sin indicación explícita.

## Nota

Este archivo no define comportamiento ni estilo de escritura. Solo describe:
- Qué carpetas existen.
- Qué archivos son importantes.
- Qué guarda cada archivo.
- Cómo se relacionan entre sí dentro del proyecto Digi Market RD.