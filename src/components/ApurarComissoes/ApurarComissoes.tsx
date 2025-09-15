'use client'
import { useState, useMemo } from 'react';
import { ChevronDown, ChevronRight, Filter, Calendar, DollarSign, Package, TrendingUp, Users } from 'lucide-react';

export default function ApurarComissao() {
  // Estados para filtros
  const [filtros, setFiltros] = useState({
    dataInicio: '2024-01-01',
    dataFim: '2024-12-31',
    status: 'todos',
    vendedor: 'todos'
  });

  const [visualizacao, setVisualizacao] = useState('itens'); // 'itens' ou 'pedidos'
  const [pedidosExpandidos, setPedidosExpandidos] = useState(new Set());

  // Mock de dados - substituir pela API real
  const dadosMock = [
    {
      pedidoId: 'PED-001',
      cliente: 'João Silva Ltda',
      vendedor: 'Maria Santos',
      dataPedido: '2024-09-10',
      status: 'faturado',
      itens: [
        {
          id: 1,
          produto: 'Produto A',
          quantidade: 10,
          precoUnitario: 150.00,
          precoTotal: 1500.00,
          percentualComissao: 5,
          comissao: 75.00
        },
        {
          id: 2,
          produto: 'Produto B',
          quantidade: 5,
          precoUnitario: 200.00,
          precoTotal: 1000.00,
          percentualComissao: 3,
          comissao: 30.00
        }
      ]
    },
    {
      pedidoId: 'PED-002',
      cliente: 'Tech Solutions Corp',
      vendedor: 'Carlos Lima',
      dataPedido: '2024-09-12',
      status: 'pendente',
      itens: [
        {
          id: 3,
          produto: 'Produto C',
          quantidade: 8,
          precoUnitario: 300.00,
          precoTotal: 2400.00,
          percentualComissao: 4,
          comissao: 96.00
        },
        {
          id: 4,
          produto: 'Produto D',
          quantidade: 3,
          precoUnitario: 500.00,
          precoTotal: 1500.00,
          percentualComissao: 6,
          comissao: 90.00
        }
      ]
    },
    {
      pedidoId: 'PED-003',
      cliente: 'Inovação Brasil SA',
      vendedor: 'Maria Santos',
      dataPedido: '2024-09-14',
      status: 'faturado',
      itens: [
        {
          id: 5,
          produto: 'Produto E',
          quantidade: 15,
          precoUnitario: 120.00,
          precoTotal: 1800.00,
          percentualComissao: 3.5,
          comissao: 63.00
        }
      ]
    }
  ];

  // Cálculos das métricas
  const metricas = useMemo(() => {
    const todosPedidos = dadosMock.filter(pedido => {
      const dataPedido = new Date(pedido.dataPedido);
      const dataIni = new Date(filtros.dataInicio);
      const dataFim = new Date(filtros.dataFim);
      
      const dentroPeríodo = dataPedido >= dataIni && dataPedido <= dataFim;
      const statusMatch = filtros.status === 'todos' || pedido.status === filtros.status;
      const vendedorMatch = filtros.vendedor === 'todos' || pedido.vendedor === filtros.vendedor;
      
      return dentroPeríodo && statusMatch && vendedorMatch;
    });

    const totalComissoes = todosPedidos.reduce((total, pedido) => {
      return total + pedido.itens.reduce((subtotal, item) => subtotal + item.comissao, 0);
    }, 0);

    const totalVendas = todosPedidos.reduce((total, pedido) => {
      return total + pedido.itens.reduce((subtotal, item) => subtotal + item.precoTotal, 0);
    }, 0);

    const totalItens = todosPedidos.reduce((total, pedido) => {
      return total + pedido.itens.reduce((subtotal, item) => subtotal + item.quantidade, 0);
    }, 0);

    const vendedoresUnicos = new Set(todosPedidos.map(p => p.vendedor)).size;

    return {
      totalComissoes,
      totalVendas,
      totalPedidos: todosPedidos.length,
      totalItens,
      vendedoresAtivos: vendedoresUnicos,
      percentualMedioComissao: totalVendas > 0 ? (totalComissoes / totalVendas * 100) : 0
    };
  }, [dadosMock, filtros]);

  // Lista de todos os itens (para visualização por itens)
  const todosItens = useMemo(() => {
    return dadosMock.flatMap(pedido => 
      pedido.itens.map(item => ({
        ...item,
        pedidoId: pedido.pedidoId,
        cliente: pedido.cliente,
        vendedor: pedido.vendedor,
        dataPedido: pedido.dataPedido,
        status: pedido.status
      }))
    ).filter(item => {
      const dataPedido = new Date(item.dataPedido);
      const dataIni = new Date(filtros.dataInicio);
      const dataFim = new Date(filtros.dataFim);
      
      const dentroPeríodo = dataPedido >= dataIni && dataPedido <= dataFim;
      const statusMatch = filtros.status === 'todos' || item.status === filtros.status;
      const vendedorMatch = filtros.vendedor === 'todos' || item.vendedor === filtros.vendedor;
      
      return dentroPeríodo && statusMatch && vendedorMatch;
    });
  }, [dadosMock, filtros]);

  const togglePedidoExpandido = (pedidoId: string) => {
    const novosExpandidos = new Set(pedidosExpandidos);
    if (novosExpandidos.has(pedidoId)) {
      novosExpandidos.delete(pedidoId);
    } else {
      novosExpandidos.add(pedidoId);
    }
    setPedidosExpandidos(novosExpandidos);
  };

  const formatarMoeda = (valor: number) => {
    return new Intl.NumberFormat('pt-BR', {
      style: 'currency',
      currency: 'BRL'
    }).format(valor);
  };

  const formatarData = (data: string) => {
    return new Date(data).toLocaleDateString('pt-BR');
  };

  return (
    <div className="min-h-screen bg-gray-50 p-6">
      <div className="max-w-7xl mx-auto space-y-6">
        {/* Header */}
        <div className="bg-white rounded-lg shadow-sm p-6 border-l-4 border-blue-500">
          <h1 className="text-3xl font-bold text-gray-900 mb-2">Apuração de Comissões</h1>
          <p className="text-gray-600">Relatório detalhado de comissões por item e pedido</p>
        </div>

        {/* Filtros */}
        <div className="bg-white rounded-lg shadow-sm p-6">
          <div className="flex items-center gap-2 mb-4">
            <Filter className="h-5 w-5 text-blue-500" />
            <h2 className="text-lg font-semibold text-gray-900">Filtros</h2>
          </div>
          
          <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">Data Início</label>
              <input
                type="date"
                value={filtros.dataInicio}
                onChange={(e) => setFiltros({...filtros, dataInicio: e.target.value})}
                className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500"
              />
            </div>
            
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">Data Fim</label>
              <input
                type="date"
                value={filtros.dataFim}
                onChange={(e) => setFiltros({...filtros, dataFim: e.target.value})}
                className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500"
              />
            </div>
            
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">Status</label>
              <select
                value={filtros.status}
                onChange={(e) => setFiltros({...filtros, status: e.target.value})}
                className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500"
              >
                <option value="todos">Todos</option>
                <option value="faturado">Faturado</option>
                <option value="pendente">Pendente</option>
                <option value="cancelado">Cancelado</option>
              </select>
            </div>
            
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">Vendedor</label>
              <select
                value={filtros.vendedor}
                onChange={(e) => setFiltros({...filtros, vendedor: e.target.value})}
                className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500"
              >
                <option value="todos">Todos</option>
                <option value="Maria Santos">Maria Santos</option>
                <option value="Carlos Lima">Carlos Lima</option>
              </select>
            </div>
          </div>
        </div>

        {/* Dashboard de Métricas */}
        <div className="grid grid-cols-1 md:grid-cols-3 lg:grid-cols-6 gap-4">
          <div className="bg-white rounded-lg shadow-sm p-6 border-l-4 border-green-500">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm font-medium text-gray-600">Total Comissões</p>
                <p className="text-2xl font-bold text-green-600">{formatarMoeda(metricas.totalComissoes)}</p>
              </div>
              <DollarSign className="h-8 w-8 text-green-500" />
            </div>
          </div>
          
          <div className="bg-white rounded-lg shadow-sm p-6 border-l-4 border-blue-500">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm font-medium text-gray-600">Total Vendas</p>
                <p className="text-2xl font-bold text-blue-600">{formatarMoeda(metricas.totalVendas)}</p>
              </div>
              <TrendingUp className="h-8 w-8 text-blue-500" />
            </div>
          </div>
          
          <div className="bg-white rounded-lg shadow-sm p-6 border-l-4 border-purple-500">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm font-medium text-gray-600">Total Pedidos</p>
                <p className="text-2xl font-bold text-purple-600">{metricas.totalPedidos}</p>
              </div>
              <Package className="h-8 w-8 text-purple-500" />
            </div>
          </div>
          
          <div className="bg-white rounded-lg shadow-sm p-6 border-l-4 border-orange-500">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm font-medium text-gray-600">Total Itens</p>
                <p className="text-2xl font-bold text-orange-600">{metricas.totalItens}</p>
              </div>
              <Package className="h-8 w-8 text-orange-500" />
            </div>
          </div>
          
          <div className="bg-white rounded-lg shadow-sm p-6 border-l-4 border-indigo-500">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm font-medium text-gray-600">Vendedores Ativos</p>
                <p className="text-2xl font-bold text-indigo-600">{metricas.vendedoresAtivos}</p>
              </div>
              <Users className="h-8 w-8 text-indigo-500" />
            </div>
          </div>
          
          <div className="bg-white rounded-lg shadow-sm p-6 border-l-4 border-yellow-500">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm font-medium text-gray-600">% Médio Comissão</p>
                <p className="text-2xl font-bold text-yellow-600">{metricas.percentualMedioComissao.toFixed(2)}%</p>
              </div>
              <TrendingUp className="h-8 w-8 text-yellow-500" />
            </div>
          </div>
        </div>

        {/* Controles de Visualização */}
        <div className="bg-white rounded-lg shadow-sm p-4">
          <div className="flex items-center gap-4">
            <span className="text-sm font-medium text-gray-700">Visualização:</span>
            <div className="flex bg-gray-100 rounded-lg p-1">
              <button
                onClick={() => setVisualizacao('itens')}
                className={`px-4 py-2 text-sm font-medium rounded-md transition-colors ${
                  visualizacao === 'itens' 
                    ? 'bg-white text-blue-600 shadow-sm' 
                    : 'text-gray-600 hover:text-gray-900'
                }`}
              >
                Por Itens
              </button>
              <button
                onClick={() => setVisualizacao('pedidos')}
                className={`px-4 py-2 text-sm font-medium rounded-md transition-colors ${
                  visualizacao === 'pedidos' 
                    ? 'bg-white text-blue-600 shadow-sm' 
                    : 'text-gray-600 hover:text-gray-900'
                }`}
              >
                Por Pedidos
              </button>
            </div>
          </div>
        </div>

        {/* Tabela de Resultados */}
        <div className="bg-white rounded-lg shadow-sm overflow-hidden">
          {visualizacao === 'itens' ? (
            // Visualização por Itens
            <div className="overflow-x-auto">
              <table className="w-full">
                <thead className="bg-gray-50">
                  <tr>
                    <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                      Pedido
                    </th>
                    <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                      Produto
                    </th>
                    <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                      Cliente
                    </th>
                    <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                      Vendedor
                    </th>
                    <th className="px-6 py-3 text-right text-xs font-medium text-gray-500 uppercase tracking-wider">
                      Qtd
                    </th>
                    <th className="px-6 py-3 text-right text-xs font-medium text-gray-500 uppercase tracking-wider">
                      Preço Unit.
                    </th>
                    <th className="px-6 py-3 text-right text-xs font-medium text-gray-500 uppercase tracking-wider">
                      Total Item
                    </th>
                    <th className="px-6 py-3 text-right text-xs font-medium text-gray-500 uppercase tracking-wider">
                      % Comissão
                    </th>
                    <th className="px-6 py-3 text-right text-xs font-medium text-gray-500 uppercase tracking-wider">
                      Comissão
                    </th>
                    <th className="px-6 py-3 text-center text-xs font-medium text-gray-500 uppercase tracking-wider">
                      Status
                    </th>
                  </tr>
                </thead>
                <tbody className="bg-white divide-y divide-gray-200">
                  {todosItens.map((item, index) => (
                    <tr key={item.id} className={index % 2 === 0 ? 'bg-white' : 'bg-gray-50'}>
                      <td className="px-6 py-4 whitespace-nowrap text-sm font-medium text-blue-600">
                        {item.pedidoId}
                      </td>
                      <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-900">
                        {item.produto}
                      </td>
                      <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-500">
                        {item.cliente}
                      </td>
                      <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-500">
                        {item.vendedor}
                      </td>
                      <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-900 text-right">
                        {item.quantidade}
                      </td>
                      <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-900 text-right">
                        {formatarMoeda(item.precoUnitario)}
                      </td>
                      <td className="px-6 py-4 whitespace-nowrap text-sm font-medium text-gray-900 text-right">
                        {formatarMoeda(item.precoTotal)}
                      </td>
                      <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-900 text-right">
                        {item.percentualComissao}%
                      </td>
                      <td className="px-6 py-4 whitespace-nowrap text-sm font-bold text-green-600 text-right">
                        {formatarMoeda(item.comissao)}
                      </td>
                      <td className="px-6 py-4 whitespace-nowrap text-center">
                        <span className={`inline-flex px-2 py-1 text-xs font-semibold rounded-full ${
                          item.status === 'faturado' 
                            ? 'bg-green-100 text-green-800'
                            : item.status === 'pendente'
                            ? 'bg-yellow-100 text-yellow-800'
                            : 'bg-red-100 text-red-800'
                        }`}>
                          {item.status}
                        </span>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          ) : (
            // Visualização por Pedidos (Agrupado)
            <div className="divide-y divide-gray-200">
              {dadosMock.map(pedido => {
                const totalPedido = pedido.itens.reduce((total, item) => total + item.precoTotal, 0);
                const totalComissaoPedido = pedido.itens.reduce((total, item) => total + item.comissao, 0);
                const isExpandido = pedidosExpandidos.has(pedido.pedidoId);
                
                return (
                  <div key={pedido.pedidoId} className="bg-white">
                    {/* Linha do Pedido */}
                    <div 
                      className="px-6 py-4 hover:bg-gray-50 cursor-pointer"
                      onClick={() => togglePedidoExpandido(pedido.pedidoId)}
                    >
                      <div className="flex items-center justify-between">
                        <div className="flex items-center space-x-4">
                          {isExpandido ? (
                            <ChevronDown className="h-5 w-5 text-gray-400" />
                          ) : (
                            <ChevronRight className="h-5 w-5 text-gray-400" />
                          )}
                          <div>
                            <div className="text-sm font-medium text-blue-600">{pedido.pedidoId}</div>
                            <div className="text-sm text-gray-500">{pedido.cliente} • {pedido.vendedor}</div>
                          </div>
                        </div>
                        <div className="flex items-center space-x-8 text-sm">
                          <div className="text-right">
                            <div className="font-medium text-gray-900">{formatarMoeda(totalPedido)}</div>
                            <div className="text-gray-500">{pedido.itens.length} itens</div>
                          </div>
                          <div className="text-right">
                            <div className="font-bold text-green-600">{formatarMoeda(totalComissaoPedido)}</div>
                            <div className="text-gray-500">comissão</div>
                          </div>
                          <div>
                            <span className={`inline-flex px-2 py-1 text-xs font-semibold rounded-full ${
                              pedido.status === 'faturado' 
                                ? 'bg-green-100 text-green-800'
                                : pedido.status === 'pendente'
                                ? 'bg-yellow-100 text-yellow-800'
                                : 'bg-red-100 text-red-800'
                            }`}>
                              {pedido.status}
                            </span>
                          </div>
                          <div className="text-gray-500">
                            {formatarData(pedido.dataPedido)}
                          </div>
                        </div>
                      </div>
                    </div>
                    
                    {/* Itens do Pedido (Expandido) */}
                    {isExpandido && (
                      <div className="px-6 pb-4 bg-gray-50">
                        <div className="overflow-x-auto">
                          <table className="w-full">
                            <thead>
                              <tr className="border-b border-gray-200">
                                <th className="text-left py-2 text-xs font-medium text-gray-500 uppercase">Produto</th>
                                <th className="text-right py-2 text-xs font-medium text-gray-500 uppercase">Qtd</th>
                                <th className="text-right py-2 text-xs font-medium text-gray-500 uppercase">Preço Unit.</th>
                                <th className="text-right py-2 text-xs font-medium text-gray-500 uppercase">Total</th>
                                <th className="text-right py-2 text-xs font-medium text-gray-500 uppercase">% Com.</th>
                                <th className="text-right py-2 text-xs font-medium text-gray-500 uppercase">Comissão</th>
                              </tr>
                            </thead>
                            <tbody>
                              {pedido.itens.map(item => (
                                <tr key={item.id} className="border-b border-gray-100">
                                  <td className="py-2 text-sm text-gray-900">{item.produto}</td>
                                  <td className="py-2 text-sm text-gray-900 text-right">{item.quantidade}</td>
                                  <td className="py-2 text-sm text-gray-900 text-right">{formatarMoeda(item.precoUnitario)}</td>
                                  <td className="py-2 text-sm font-medium text-gray-900 text-right">{formatarMoeda(item.precoTotal)}</td>
                                  <td className="py-2 text-sm text-gray-900 text-right">{item.percentualComissao}%</td>
                                  <td className="py-2 text-sm font-bold text-green-600 text-right">{formatarMoeda(item.comissao)}</td>
                                </tr>
                              ))}
                            </tbody>
                          </table>
                        </div>
                      </div>
                    )}
                  </div>
                );
              })}
            </div>
          )}
        </div>

        {/* Resumo Final */}
        <div className="bg-gradient-to-r from-blue-500 to-purple-600 rounded-lg shadow-lg p-6 text-white">
          <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
            <div className="text-center">
              <p className="text-blue-100 text-sm">Total de Comissões</p>
              <p className="text-2xl font-bold">{formatarMoeda(metricas.totalComissoes)}</p>
            </div>
            <div className="text-center">
              <p className="text-blue-100 text-sm">Total de Vendas</p>
              <p className="text-2xl font-bold">{formatarMoeda(metricas.totalVendas)}</p>
            </div>
            <div className="text-center">
              <p className="text-blue-100 text-sm">Pedidos Analisados</p>
              <p className="text-2xl font-bold">{metricas.totalPedidos}</p>
            </div>
            <div className="text-center">
              <p className="text-blue-100 text-sm">% Médio de Comissão</p>
              <p className="text-2xl font-bold">{metricas.percentualMedioComissao.toFixed(2)}%</p>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}