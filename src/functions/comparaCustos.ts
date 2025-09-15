/* import { ProdutoApi } from "@/api/types/api-types";

export type ComparacaoResultado = {
  alterados: any[];
  iguais: any[];
  naoEncontrados: any[];
  todos: any[]; // produtosTiny sem correspondência na planilha
};

export function compararCustos(
  produtosTiny: ProdutoApi[],
  planilha: any[]
): ComparacaoResultado {
  const alterados: any[] = [];
  const iguais: any[] = [];
  const naoEncontrados: any[] = [];
  const todos: any[] = [];

  // Função para limpar e converter valores no formato brasileiro para número
  function limparValor(valor: any): number {
    if (typeof valor !== "string") valor = String(valor);
    return parseFloat(
      valor
        .replace(/[^\d,.-]/g, "") // remove tudo que não for número, vírgula, ponto ou sinal
        .replace(",", ".")
        .trim()
    );
  }

  // Cria um mapa de código -> linha da planilha para acesso rápido
  const mapaPlanilha = new Map<string, any>();

  for (let i = 1; i < planilha.length; i++) {
    const linha = planilha[i];
    const codigo = linha[0]?.toString().trim();
    if (codigo) {
      mapaPlanilha.set(codigo, linha);
    }
  }

  // Faz a comparação entre os produtos do Tiny e os valores da planilha
  for (const item of produtosTiny) {
    const codigoTiny = item.produto.codigo;
    const descricaoTiny = item.produto.nome;
    const idTiny = item.produto.id;
    const precoTiny = item.produto.preco;

    const linhaPlanilha = mapaPlanilha.get(codigoTiny);

    if (!linhaPlanilha) {
      naoEncontrados.push({
        codigo: codigoTiny,
        motivo: "Código não encontrado na planilha",
      });
      continue;
    }

    const custoTinyNum = limparValor(item.produto.preco_custo);
    const custoPlanilhaNum = limparValor(linhaPlanilha[2]);

    if (isNaN(custoTinyNum) || isNaN(custoPlanilhaNum)) {
      naoEncontrados.push({
        codigo: codigoTiny,
        motivo: "Custo inválido na planilha ou no Tiny",
      });
      continue;
    }

    const custoTiny = parseFloat(custoTinyNum.toFixed(2));
    const custoPlanilha = parseFloat(custoPlanilhaNum.toFixed(2));

    if (custoPlanilha !== custoTiny) {
      alterados.push({
        id: idTiny,
        preco: precoTiny,
        codigo: codigoTiny,
        custoTiny: custoTiny.toFixed(2),
        custoPlanilha: custoPlanilha.toFixed(2),
        descricao: descricaoTiny,
      });
    } else {
      iguais.push({
        id: idTiny,
        preco: precoTiny,
        codigo: codigoTiny,
        custoTiny: custoTiny.toFixed(2),
        custoPlanilha: custoPlanilha.toFixed(2),
        descricao: descricaoTiny,
      });
    }

    todos.push({
      codigo: codigoTiny,
      custoTiny: custoTiny.toFixed(2),
      custoPlanilha: custoPlanilha.toFixed(2),
      descricao: descricaoTiny,
    });
  }

  return { alterados, iguais, naoEncontrados, todos };
}
 */