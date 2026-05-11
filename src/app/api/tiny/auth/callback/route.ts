import { trocarCodePorTokens } from "@/lib/tiny/oauth";
import { getTokenStore } from "@/lib/tiny/token-store";
import { NextRequest, NextResponse } from "next/server";

function origemDeRedirect(req: NextRequest): string {
  return new URL(req.url).origin;
}

export async function GET(req: NextRequest) {
  const url = new URL(req.url);
  const code = url.searchParams.get("code");
  const state = url.searchParams.get("state");
  const erro = url.searchParams.get("error");
  const origem = origemDeRedirect(req);

  const destino = new URL("/produtos/relatorios/custos", origem);

  if (erro) {
    destino.searchParams.set("erro", erro);
    return NextResponse.redirect(destino);
  }
  if (!code || !state) {
    destino.searchParams.set("erro", "callback_invalido");
    return NextResponse.redirect(destino);
  }

  const cookieState = req.cookies.get("tiny_oauth_state")?.value;
  if (!cookieState || cookieState !== state) {
    destino.searchParams.set("erro", "state");
    return NextResponse.redirect(destino);
  }

  try {
    const tokens = await trocarCodePorTokens(code);
    await getTokenStore().salvar(tokens);
    destino.searchParams.set("conectado", "1");
    const res = NextResponse.redirect(destino);
    res.cookies.delete("tiny_oauth_state");
    return res;
  } catch (err) {
    const msg = err instanceof Error ? err.message : "Erro";
    destino.searchParams.set("erro", encodeURIComponent(msg));
    return NextResponse.redirect(destino);
  }
}
