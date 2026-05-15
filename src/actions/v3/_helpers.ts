import { fetchTinyV3 } from "@/lib/tiny/client";
import { ENDPOINTS } from "@/lib/tiny/endpoints";
import { V3ProdutosListResponse } from "@/lib/tiny/types";

export function normalizaSku(s: string | undefined | null): string {
  return (s || "").trim().toLowerCase();
}

export async function resolverIdProdutoPorSku(
  sku: string
): Promise<string | null> {
  try {
    const resp = await fetchTinyV3<V3ProdutosListResponse>(ENDPOINTS.PRODUTOS, {
      query: { codigo: sku, limit: 1, offset: 0 },
    });
    const item = resp.itens?.[0];
    if (item?.id != null) return String(item.id);
    return null;
  } catch {
    return null;
  }
}

export async function processaLote<T>(
  itens: T[],
  pool: number,
  fn: (item: T, indice: number) => Promise<void>
) {
  let cursor = 0;
  const workers = Array.from({ length: pool }).map(async () => {
    while (true) {
      const i = cursor++;
      if (i >= itens.length) return;
      await fn(itens[i], i);
    }
  });
  await Promise.all(workers);
}

export function isoParaBR(iso: string): string {
  if (!iso) return "";
  const [y, m, d] = iso.slice(0, 10).split("-");
  if (!y || !m || !d) return iso;
  return `${d}/${m}/${y}`;
}
