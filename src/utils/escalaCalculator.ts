/**
 * utils/escalaCalculator.ts
 * Lógica de cálculo de escalas (6x1, 5x2, 12x36, rotativo)
 */

export type TipoEscala = '6x1' | '5x2' | '12x36' | 'rotativo' | 'personalizado';

export interface DiaEscala {
  data: string; // YYYY-MM-DD
  tipo: 'trabalho' | 'folga' | 'fds'; // fds = final de semana
  turno?: string;
  horaInicio?: string;
  horaFim?: string;
  descricao?: string;
}

export interface ConfiguracaoEscala {
  tipo: TipoEscala;
  dataInicio: string;
  cicloEmDias?: number; // para rotativo e personalizado
  turnosDisponiveis?: Array<{ nome: string; inicio: string; fim: string }>;
}

/**
 * Gera escala 6x1 (6 dias trabalha, 1 folga)
 * Seg Ter Qua Qui Sex Sáb | Dom(folga)
 */
export function gerarEscala6x1(dataInicio: string, numeroDias: number): DiaEscala[] {
  const resultado: DiaEscala[] = [];
  let data = new Date(dataInicio);
  const padrao = ['trabalho', 'trabalho', 'trabalho', 'trabalho', 'trabalho', 'trabalho', 'folga'];
  
  for (let i = 0; i < numeroDias; i++) {
    const diaSemana = data.getDay();
    const tipo = diaSemana === 0 ? 'fds' : padrao[i % 7];
    
    resultado.push({
      data: data.toISOString().split('T')[0],
      tipo: tipo as 'trabalho' | 'folga' | 'fds',
      descricao: tipo === 'folga' ? 'Folga' : tipo === 'fds' ? 'Fim de Semana' : 'Trabalho',
    });
    
    data.setDate(data.getDate() + 1);
  }
  
  return resultado;
}

/**
 * Gera escala 5x2 (5 dias trabalha, 2 folgas consecutivas)
 * Seg Ter Qua Qui Sex | Sáb Dom(folgas)
 */
export function gerarEscala5x2(dataInicio: string, numeroDias: number): DiaEscala[] {
  const resultado: DiaEscala[] = [];
  let data = new Date(dataInicio);
  const padrao = ['trabalho', 'trabalho', 'trabalho', 'trabalho', 'trabalho', 'folga', 'folga'];
  
  for (let i = 0; i < numeroDias; i++) {
    const diaSemana = data.getDay();
    const tipo = padrao[i % 7];
    
    resultado.push({
      data: data.toISOString().split('T')[0],
      tipo: tipo as 'trabalho' | 'folga' | 'fds',
      descricao: tipo === 'folga' ? 'Folga' : 'Trabalho',
    });
    
    data.setDate(data.getDate() + 1);
  }
  
  return resultado;
}

/**
 * Gera escala 12x36 (12 horas trabalha, 36h folga)
 * 1 dia trabalha (12h) + 3 dias folga
 */
export function gerarEscala12x36(
  dataInicio: string,
  numeroDias: number,
  turnos: { diurno: { inicio: string; fim: string }; noturno: { inicio: string; fim: string } }
): DiaEscala[] {
  const resultado: DiaEscala[] = [];
  let data = new Date(dataInicio);
  let contadorCiclo = 0;
  
  for (let i = 0; i < numeroDias; i++) {
    const posicaoCiclo = contadorCiclo % 4; // 4 dias = 1 dia trabalho + 3 folga
    
    if (posicaoCiclo === 0) {
      // Dia de trabalho: alterna entre turno diurno e noturno
      const turnoAtual = i % 2 === 0 ? turnos.diurno : turnos.noturno;
      resultado.push({
        data: data.toISOString().split('T')[0],
        tipo: 'trabalho',
        turno: i % 2 === 0 ? 'Diurno' : 'Noturno',
        horaInicio: turnoAtual.inicio,
        horaFim: turnoAtual.fim,
        descricao: '12h de trabalho',
      });
    } else {
      // 3 dias de folga
      resultado.push({
        data: data.toISOString().split('T')[0],
        tipo: 'folga',
        descricao: 'Folga (36h)',
      });
    }
    
    data.setDate(data.getDate() + 1);
    contadorCiclo++;
  }
  
  return resultado;
}

/**
 * Gera escala rotativa (3 ou 4 turnos rodando)
 * Semana 1: Turno 1 (07:00-15:00)
 * Semana 2: Turno 2 (15:00-23:00)
 * Semana 3: Turno 3 (23:00-07:00)
 * Semana 4: Folga
 */
export function gerarEscalaRotativa(
  dataInicio: string,
  numeroDias: number,
  turnos: Array<{ nome: string; inicio: string; fim: string }>
): DiaEscala[] {
  const resultado: DiaEscala[] = [];
  let data = new Date(dataInicio);
  let semanaAtual = 1;
  let turnoAtual = 0;
  let diasSemana = 0;
  
  for (let i = 0; i < numeroDias; i++) {
    const diaSemana = data.getDay();
    
    // Muda de turno a cada 7 dias (segunda-feira)
    if (diaSemana === 1 && diasSemana > 0) {
      turnoAtual++;
      diasSemana = 0;
    }
    
    const turnoIndex = (turnoAtual) % turnos.length;
    const turnoConfig = turnos[turnoIndex];
    
    let tipo: 'trabalho' | 'folga' | 'fds' = 'trabalho';
    let dia: DiaEscala;
    
    if (turnoIndex === turnos.length - 1) {
      // Última semana = folga
      tipo = 'folga';
      dia = {
        data: data.toISOString().split('T')[0],
        tipo,
        descricao: 'Folga/Descanso',
      };
    } else {
      dia = {
        data: data.toISOString().split('T')[0],
        tipo,
        turno: turnoConfig.nome,
        horaInicio: turnoConfig.inicio,
        horaFim: turnoConfig.fim,
        descricao: turnoConfig.nome,
      };
    }
    
    resultado.push(dia);
    
    data.setDate(data.getDate() + 1);
    diasSemana++;
  }
  
  return resultado;
}

/**
 * Função genérica para gerar escala
 */
export function gerarEscala(
  config: ConfiguracaoEscala,
  numeroDias: number
): DiaEscala[] {
  const { tipo, dataInicio } = config;
  
  switch (tipo) {
    case '6x1':
      return gerarEscala6x1(dataInicio, numeroDias);
    
    case '5x2':
      return gerarEscala5x2(dataInicio, numeroDias);
    
    case '12x36':
      return gerarEscala12x36(dataInicio, numeroDias, {
        diurno: { inicio: '07:00', fim: '19:00' },
        noturno: { inicio: '19:00', fim: '07:00' },
      });
    
    case 'rotativo':
      return gerarEscalaRotativa(dataInicio, numeroDias, [
        { nome: 'Manhã', inicio: '07:00', fim: '15:00' },
        { nome: 'Tarde', inicio: '15:00', fim: '23:00' },
        { nome: 'Noite', inicio: '23:00', fim: '07:00' },
        { nome: 'Folga', inicio: '', fim: '' },
      ]);
    
    case 'personalizado':
    default:
      return [];
  }
}

/**
 * Calcula total de horas em uma escala
 */
export function calcularHorasEscala(dias: DiaEscala[]): {
  horasTrabalhadas: number;
  diasFolga: number;
  diasTrabalho: number;
  percentualUtilizacao: number;
} {
  let horasTrabalhadas = 0;
  let diasFolga = 0;
  let diasTrabalho = 0;
  
  dias.forEach(dia => {
    if (dia.tipo === 'trabalho') {
      diasTrabalho++;
      if (dia.horaInicio && dia.horaFim) {
        const [h1, m1] = dia.horaInicio.split(':').map(Number);
        const [h2, m2] = dia.horaFim.split(':').map(Number);
        let horas = (h2 + m2 / 60) - (h1 + m1 / 60);
        
        // Considerar turno que passa da meia-noite
        if (horas < 0) horas += 24;
        
        horasTrabalhadas += horas;
      }
    } else if (dia.tipo === 'folga') {
      diasFolga++;
    }
  });
  
  const totalDias = dias.length;
  const percentualUtilizacao = totalDias > 0 ? (diasTrabalho / totalDias) * 100 : 0;
  
  return {
    horasTrabalhadas: Math.round(horasTrabalhadas * 10) / 10,
    diasFolga,
    diasTrabalho,
    percentualUtilizacao: Math.round(percentualUtilizacao),
  };
}

/**
 * Retorna próximo dia de folga
 */
export function proximaFolga(dias: DiaEscala[], dataReferencia: string): string | null {
  return dias.find(d => d.data >= dataReferencia && d.tipo === 'folga')?.data || null;
}

/**
 * Retorna próximo turno
 */
export function proximoTurno(dias: DiaEscala[], dataReferencia: string): DiaEscala | null {
  return dias.find(d => d.data >= dataReferencia && d.tipo === 'trabalho') || null;
}
