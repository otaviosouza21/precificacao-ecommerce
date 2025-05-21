export async function atualizarCustoTiny({
  id,
  codigo,
  nome,
  preco,
  custo,
}: {
  id: number;
  codigo: string;
  nome: string;
  preco: number;
  custo: number;
}) {
  try {
    const token =
      "6180cc9acd3554872cff455cec6797b680fe84770db17832c491a6fd16709333";

    // XML completo conforme exigido pelo Tiny
    const xml = `
      <produto>
        <id>${id}</id>
        <codigo>${codigo}</codigo>
        <nome>${nome}</nome>
        <preco>${preco.toFixed(2)}</preco>
        <preco_custo>${custo.toFixed(2)}</preco_custo>
        <unidade>UN</unidade>
        <origem>0</origem>
        <situacao>A</situacao>
        <tipo>P</tipo>
      </produto>
    `.trim();

    const body = new URLSearchParams();
    body.append("token", token);
    body.append("formato", "xml");
    body.append("produto", xml);

    const response = await fetch(
      "https://api.tiny.com.br/api2/produto.alterar.php",
      {
        method: "POST",
        headers: {
          "Content-Type": "application/x-www-form-urlencoded",
        },
        body: body.toString(),
      }
    );

    const data = await response.json();

    if (response.ok && data.retorno.status === "OK") {
      return { success: true, message: "Custo atualizado com sucesso" };
    } else {
      const erros =
        data.retorno?.registros?.[0]?.registro?.erros?.map((e: any) => e.erro) ||
        [data.retorno?.erro] ||
        ["Erro na atualização"];
      return {
        success: false,
        message: erros.join("; "),
      };
    }
  } catch (error: any) {
    return { success: false, message: "Erro na requisição" };
  }
}
