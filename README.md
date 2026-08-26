# Rutina

App web offline-first para entrenar en casa siguiendo una rotación A-B-C, con
calculadora de discos, doble progresión automática e historial. Pensada para
usarse con el celular durante la sesión.

Detalle funcional completo: [`docs/HANDOFF.md`](docs/HANDOFF.md).
Contexto técnico y estado del proyecto: [`CLAUDE.md`](CLAUDE.md).

## Desarrollo

```bash
npm install
npm run dev
```

## Build

```bash
npm run build     # genera dist/
npm run preview   # sirve dist/ localmente
```

Se despliega automáticamente a GitHub Pages en cada push a `main`
(`.github/workflows/deploy.yml`).
