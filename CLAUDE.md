# RutinaApp

App web de una sola página, offline-first, para entrenar en casa siguiendo una rotación
A-B-C. Es una herramienta de sesión (se usa con el celular en la mano durante el
entreno), no un documento estático.

**Fuente de verdad del producto:** `docs/HANDOFF.md`. Contiene el contexto completo del
usuario, todas las reglas de negocio, los datos del programa y los criterios de
aceptación. Leelo antes de tocar cualquier lógica de negocio — este CLAUDE.md resume
las decisiones técnicas y el estado del proyecto, no reemplaza al handoff.

## Estado actual

Scaffold inicial. Existen el toolchain, los tipos, los datos del programa y un store de
ajustes. **Todavía no están construidas las pantallas ni la lógica de negocio** (rotación,
calculadora de discos, doble progresión, temporizador, historial). Ver "Próximos pasos".

## Stack

- **React 19 + Vite + TypeScript**, plantilla `react-ts`.
- **Tailwind CSS v4** vía `@tailwindcss/vite` (sin `tailwind.config.js`; todo el theming
  va en `src/index.css` con `@import "tailwindcss"` y, si hace falta extender el theme,
  bloques `@theme`).
- **Zustand** para estado global, con el middleware `persist` para guardar en
  `localStorage`. Cada store persistido usa su propio `name` con prefijo `rutina:`
  (ej. `rutina:ajustes`) para poder inspeccionar/exportar por separado si hace falta.
- **vite-plugin-pwa** (`registerType: 'autoUpdate'`) para que la app sea instalable y
  funcione 100% offline salvo los links a YouTube, que abren fuera de la app.
- **Sin backend, sin cuentas, sin red** — toda la persistencia es local al dispositivo.
  Export/import a JSON es el único mecanismo para mover datos entre dispositivos y es
  imprescindible en v1, no una mejora futura.

## Comandos

```bash
npm run dev       # servidor local con HMR
npm run build     # tsc -b && vite build → dist/
npm run preview   # sirve dist/ localmente para probar el build de producción
npm run lint       # oxlint
```

## Estructura

```
src/
  types/programa.ts   # tipos del programa de entrenamiento (Ejercicio, DiaRutina, Equipo…)
  data/programa.ts     # datos reales del programa (equipo, calentamiento, días A/B/C).
                        # NO improvisar estos números — ver sección 9 del HANDOFF.
  store/                # stores de Zustand, uno por dominio (ajustes, rotación, historial…)
  App.tsx               # shell de la app (placeholder por ahora)
docs/HANDOFF.md         # spec funcional completa
.github/workflows/deploy.yml  # build + deploy a GitHub Pages en push a main
```

A medida que se construyan features, cada pantalla principal (Inicio, Sesión, Historial,
Ajustes) va en `src/screens/`, y lógica pura sin JSX (calculadora de discos, rotación,
doble progresión) va en `src/lib/` para poder testearla sin renderizar componentes.

## Despliegue

GitHub Pages, servido en `/RutinaApp/` (`base` en `vite.config.ts` debe coincidir con el
nombre del repo). El workflow `.github/workflows/deploy.yml` builda y publica en cada
push a `main`. La primera vez hay que habilitar Pages en el repo con **Source: GitHub
Actions** (Settings → Pages).

Importante: si el repo cambia de nombre, actualizar `base` en `vite.config.ts` y
`start_url`/`scope` en el manifest PWA dentro de `vite.config.ts` — si no coinciden, la
app instalada rompe.

## Reglas de negocio clave (resumen — el detalle completo vive en el HANDOFF)

- **Rotación A→B→C→A…** no atada a fechas. Si el usuario falta un día, al volver le toca
  lo mismo que le tocaba, sin "recuperar" ni marcar racha rota. Domingo sugiere descanso
  pero no bloquea entrenar.
- **Doble progresión**: subir 1 rep por serie por semana; al llegar al límite alto de reps
  en todas las series, sugerir +2.5 kg (con botón Aceptar/Todavía no), nunca aplicarlo solo.
- **Calculadora de discos**: dado un peso objetivo dice qué discos poner; dado el
  inventario, qué pesos son armables. Nunca sugerir una carga no armable con
  4×1.25 + 6×2.5 + 4×5 kg, ni cargas asimétricas entre lados/extremos. El inventario de
  discos es compartido entre las 3 barras dentro de una misma sesión — hay que detectar
  conflictos y ordenar ejercicios para minimizar cambios de discos.
- **Sesión mínima (20 min)**: primeros 3 ejercicios, 2 series c/u, cuenta como sesión
  completa. Es el mecanismo antideserción principal — tiene que ser fácil de encontrar.
- **Deload** cada 6-8 semanas: 60% de la carga habitual (redondeado a lo armable) por 6
  sesiones.
- **Tono de la UI**: nunca culpar al usuario por faltar. Nada de rachas rotas en rojo. A
  lo sumo un empujón neutro tipo "Llevas 3 días sin entrenar. La sesión mínima son 20 min."
- **Fuera de alcance v1**: cuentas, sync, backend, conteo de calorías, peso corporal,
  medidas o fotos de progreso.

## Decisiones ya tomadas (no re-preguntar)

- Stack: React + Vite + Zustand + Tailwind (elegido por el usuario).
- PWA instalable: sí.
- Hosting: GitHub Pages.
- Persistencia: `localStorage` vía Zustand `persist` (alcanza para el volumen de datos de
  esta app; si algún store crece mucho, evaluar IndexedDB solo para ese store).

## Qué se puede decidir sin preguntar vs. qué sí requiere confirmar

Ver sección 9 del HANDOFF. Resumen: estructura de archivos, diseño visual, nombres
internos y forma de las gráficas son libres. **Cualquier cambio al programa en sí**
(ejercicios, series, reps, cargas iniciales, la rotación) se confirma con el usuario
antes de tocarlo — esos números están calculados para el inventario real.

## Próximos pasos (build de v1)

En orden sugerido, porque cada uno depende del anterior:

1. `src/lib/discos.ts` — calculadora de discos pura (sin UI), con tests. Es el feature
   más riesgoso de la app; conviene tenerlo sólido antes de construir pantallas encima.
2. `src/store/useHistorialStore.ts` + `useRotacionStore.ts` — persistencia de sesiones
   registradas y puntero de rotación A/B/C.
3. `src/lib/progresion.ts` — doble progresión, comparando contra la última sesión.
4. Pantallas: Inicio → Calentamiento → Modo sesión (un ejercicio a la vez) → Estiramiento
   → Resumen. Modo sesión es la pantalla central: un toque para confirmar serie con la
   sugerencia precargada.
5. Temporizador de descanso (sonido/vibración, saltable).
6. Historial con gráfica simple por ejercicio.
7. Ajustes: pesos de barras, inventario de discos, sonido, resetear rotación.
8. Exportar/importar JSON del estado completo.
9. Techo de carga (sección 7 del HANDOFF): variantes de progresión cuando un ejercicio
   lleva 3 semanas en el peso máximo armable.

Antes de dar por terminada una feature, repasar los criterios de aceptación (sección 8
del HANDOFF) — son la definición de "hecho" de este proyecto.
