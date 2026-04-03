/**
 * utils/feriadosBR.ts
 * Gestão de feriados nacionais e estaduais brasileiros
 */

export interface Feriado {
  data: string; // YYYY-MM-DD
  nome: string;
  tipo: 'nacional' | 'estadual' | 'municipal';
  uf?: string;
}

// Feriados Nacionais Fixos 2026
const FERIADOS_NACIONAIS_2026: Feriado[] = [
  { data: '2026-01-01', nome: 'Ano Novo', tipo: 'nacional' },
  { data: '2026-04-03', nome: 'Sexta-feira Santa', tipo: 'nacional' },
  { data: '2026-04-21', nome: 'Tiradentes', tipo: 'nacional' },
  { data: '2026-05-01', nome: 'Dia do Trabalho', tipo: 'nacional' },
  { data: '2026-09-07', nome: 'Independência do Brasil', tipo: 'nacional' },
  { data: '2026-10-12', nome: 'Nossa Senhora Aparecida', tipo: 'nacional' },
  { data: '2026-11-02', nome: 'Finados', tipo: 'nacional' },
  { data: '2026-11-15', nome: 'Proclamação da República', tipo: 'nacional' },
  { data: '2026-11-20', nome: 'Consciência Negra', tipo: 'nacional' },
  { data: '2026-12-25', nome: 'Natal', tipo: 'nacional' },
];

// Feriados com Datas Móveis em 2026
const FERIADOS_MOVEIS_2026: Feriado[] = [
  { data: '2026-02-23', nome: 'Carnaval', tipo: 'nacional' },
  { data: '2026-05-30', nome: 'Corpus Christi', tipo: 'nacional' },
  { data: '2026-10-29', nome: 'Dia do Servidor Público', tipo: 'nacional' },
];

/**
 * Retorna lista de feriados nacionais para um ano específico
 */
export function obterFeriadosNacionais(ano: number): Feriado[] {
  if (ano === 2026) {
    return [...FERIADOS_NACIONAIS_2026, ...FERIADOS_MOVEIS_2026];
  }
  // Para outros anos, retornar apenas os fixos (implementar lógica de datas móveis se necessário)
  return FERIADOS_NACIONAIS_2026.filter(f => f.data.startsWith(String(ano)));
}

/**
 * Verifica se uma data é feriado nacional
 */
export function ehFeriado(data: string): boolean {
  const feriados = obterFeriadosNacionais(new Date(data).getFullYear());
  return feriados.some(f => f.data === data);
}

/**
 * Obtém o nome do feriado se a data for feriado
 */
export function obterNomeFeriado(data: string): string | null {
  const feriados = obterFeriadosNacionais(new Date(data).getFullYear());
  const feriado = feriados.find(f => f.data === data);
  return feriado ? feriado.nome : null;
}

/**
 * Calcula próximo feriado a partir de uma data
 */
export function proximoFeriado(dataInicio: string): Feriado | null {
  const feriados = obterFeriadosNacionais(new Date(dataInicio).getFullYear());
  const feriadoProximo = feriados
    .filter(f => f.data >= dataInicio)
    .sort((a, b) => a.data.localeCompare(b.data))[0];
  
  return feriadoProximo || null;
}

/**
 * Retorna feriados entre duas datas
 */
export function feriadosEntre(dataInicio: string, dataFim: string): Feriado[] {
  const ano = new Date(dataInicio).getFullYear();
  const feriados = obterFeriadosNacionais(ano);
  
  return feriados.filter(f => f.data >= dataInicio && f.data <= dataFim);
}

/**
 * Mapeia feriados para um calendário mensal
 */
export function obterFeriadosMes(ano: number, mes: number): { [dia: number]: string } {
  const feriados = obterFeriadosNacionais(ano);
  const resultado: { [dia: number]: string } = {};
  
  const mesStr = String(mes).padStart(2, '0');
  feriados.forEach(f => {
    if (f.data.startsWith(`${ano}-${mesStr}`)) {
      const dia = parseInt(f.data.split('-')[2]);
      resultado[dia] = f.nome;
    }
  });
  
  return resultado;
}
