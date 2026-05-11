const throttleMs = Number(process.env.TINY_V3_THROTTLE_MS ?? 1100);

let ultimaChamada = 0;
let fila: Promise<void> = Promise.resolve();

export function throttleTinyV3(): Promise<void> {
  fila = fila.then(async () => {
    const agora = Date.now();
    const espera = ultimaChamada + throttleMs - agora;
    if (espera > 0) await new Promise((r) => setTimeout(r, espera));
    ultimaChamada = Date.now();
  });
  return fila;
}

export function delay(ms: number) {
  return new Promise((r) => setTimeout(r, ms));
}
