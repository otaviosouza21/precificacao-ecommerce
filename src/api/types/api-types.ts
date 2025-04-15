
export type ProdutoApi ={
    produto:{
    id: string,
    nome: string,
    data_criacao: string,
    codigo: string,
    preco: number,
    preco_promocional: number,
    unidade: string,
    gtin: string,
    tipoVariacao: string,
    localizacao: string,
    preco_custo: number,
    preco_custo_medio: number,
    situacao: string
    }
}

export type ProdutosListApi = {
    retorno: {
        status: string,
        pagina: number,
        numero_paginas: number,
        produtos: ProdutoApi[]
    }
}