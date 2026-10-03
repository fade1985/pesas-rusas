# Simple & Sinister Tracker

Aplicación web para registrar tus entrenamientos del programa **Simple & Sinister** de Pavel Tsatsouline (pesas rusas / kettlebells).

## Qué hace

- **Entrenar**: sesión guiada con calentamiento (prying goblet squat, halo, hip bridge), 10×10 swings a una mano y 10 Turkish get-ups alternando lados.
  - Toca cada serie/rep al terminarla.
  - Temporizadores con objetivo (5:00 swings, 10:00 get-ups) y pitido por intervalo (cada 30 s / 60 s).
  - El temporizador se detiene solo al completar la última serie y guarda el tiempo.
  - Puedes mezclar pesas por serie (p. ej. 8×24 kg + 2×28 kg).
  - La sesión en curso sobrevive a recargas de la página y mantiene la pantalla encendida mientras corre el temporizador.
- **Sugerencia de carga**: tras dos sesiones completas con RPE ≤ 6, sugiere subir una serie de swings y un par de get-ups a la siguiente pesa; si la sesión fue muy dura (RPE ≥ 9) o quedó incompleta, sugiere repetir.
- **Historial**: edita o elimina sesiones y registra sesiones pasadas.
- **Progreso**: estadísticas, avance hacia los estándares Simple y Sinister, gráfica de peso medio y calendario de constancia.
- **Ajustes**: estándares hombre/mujer, tus pesas disponibles, exportar/importar JSON.

| Estándar | Swings (H / M) | Get-ups (H / M) |
| -------- | -------------- | --------------- |
| Simple   | 32 / 24 kg     | 32 / 16 kg      |
| Sinister | 48 / 32 kg     | 48 / 24 kg      |

Los datos se guardan en `localStorage` del navegador; no hay backend.

## Desarrollo

```bash
npm install
npm run dev     # servidor de desarrollo
npm test        # tests (vitest)
npm run lint    # oxlint
npm run build   # build de producción en dist/
```
