/**
 * utils/cltValidator.ts
 * Validações de conformidade com a CLT
 */

import { Appointment, Bloqueio } from '../types';
import { ehFeriado, feriadosEntre } from './feriadosBR';

export interface AnaliseConformidadeCLT {
  interjornada: {
    conforme: boolean;
    menorInterjornada: number; // em horas
    alertas: string[];
  };
  cargaSemanal: {
    conforme: boolean;
    cargaTotal: number; // em horas
    semanaAnalisada: string; // "2026-W14"
    alertas: string[];
  };
  descansoRemunerado: {
    conforme: boolean;
    ultimaFolga: string;
    diasSemFolga: number;
    alertas: string[];
  };
  statusGeral: boolean;
  resumo: string[];
}

const INTERJORNADA_MINIMA = 11; // horas
const CARGA_SEMANAL_MAXIMA = 44; // horas (CLT)
const ALERTA_CARGA = 40; // alertar quando atingir 40h
const DESCANSO_MAXIMO_SEM_FOLGA = 7; // dias

/**
 * Valida interjornada mínima entre dois turnos
 */
export function validarInterjornada(
  horaFimTurno1: string,
  horaInicioTurno2: string
): { conforme: boolean; horasDescanso: number } {
  const [h1, m1] = horaFimTurno1.split(':').map(Number);
  const [h2, m2] = horaInicioTurno2.split(':').map(Number);
  
  let minutosFim = h1 * 60 + m1;
  let minutosInicio = h2 * 60 + m2;
  
  // Se inicia próximo dia (ex: 23:00 para 06:00 do dia seguinte)
  if (minutosInicio < minutosFim) {
    minutosInicio += 24 * 60;
  }
  
  const horasDescanso = (minutosInicio - minutosFim) / 60;
  
  return {
    conforme: horasDescanso >= INTERJORNADA_MINIMA,
    horasDescanso: Math.round(horasDescanso * 10) / 10,
  };
}

/**
 * Calcula carga horária semanal
 */
export function calcularCargaSemanal(
  appointments: Appointment[],
  bloqueios: Bloqueio[],
  dataReferencia: string
): { cargaTotal: number; semana: string } {
  const date = new Date(dataReferencia);
  
  // Achar início da semana (segunda-feira)
  const dia = date.getDay();
  const diasParaSegunda = dia === 0 ? 6 : dia - 1;
  const inicioSemana = new Date(date);
  inicioSemana.setDate(date.getDate() - diasParaSegunda);
  
  // Fim de semana (domingo)
  const fimSemana = new Date(inicioSemana);
  fimSemana.setDate(inicioSemana.getDate() + 6);
  
  const inicioStr = inicioSemana.toISOString().split('T')[0];
  const fimStr = fimSemana.toISOString().split('T')[0];
  
  // Somar horas dos agendamentos
  let totalHoras = 0;
  appointments
    .filter(a => a.date >= inicioStr && a.date <= fimStr)
    .forEach(a => {
      const [h1, m1] = a.time.split(':').map(Number);
      // Assuming average 60 minutes per service for now
      totalHoras += a.services.length * 1; // 1 hora por serviço
    });
  
  // Descontar feriados
  feriadosEntre(inicioStr, fimStr).forEach(() => {
    totalHoras -= 8; // dia normal tem 8h
  });
  
  // Obter número da semana ISO
  const semana = `${inicioSemana.getFullYear()}-W${String(Math.ceil((inicioSemana.getDate() + inicioSemana.getDay()) / 7)).padStart(2, '0')}`;
  
  return {
    cargaTotal: Math.max(0, Math.round(totalHoras * 10) / 10),
    semana,
  };
}

/**
 * Valida carga semanal
 */
export function validarCargaSemanal(cargaTotal: number): {
  conforme: boolean;
  percentualUtilizacao: number;
  alertas: string[];
} {
  const alertas: string[] = [];
  
  if (cargaTotal < CARGA_SEMANAL_MAXIMA) {
    if (cargaTotal >= ALERTA_CARGA) {
      alertas.push(`⚠️ Carga alta: ${cargaTotal}h/semana (máximo recomendado: ${ALERTA_CARGA}h)`);
    }
  } else {
    alertas.push(`❌ Carga máxima excedida: ${cargaTotal}h > ${CARGA_SEMANAL_MAXIMA}h`);
  }
  
  return {
    conforme: cargaTotal <= CARGA_SEMANAL_MAXIMA,
    percentualUtilizacao: Math.round((cargaTotal / CARGA_SEMANAL_MAXIMA) * 100),
    alertas,
  };
}

/**
 * Calcula DSR (Descanso Semanal Remunerado)
 */
export function calcularDSR(
  bloqueios: Bloqueio[],
  dataReferencia: string
): {
  temDSR: boolean;
  ultimaFolga: string | null;
  diasSemFolga: number;
  alertas: string[];
} {
  const dataRef = new Date(dataReferencia);
  const alertas: string[] = [];
  
  // Procurar última folga (bloqueio com "Folga" ou "Férias")
  const folgas = bloqueios
    .filter(b => b.motivo.includes('Folga') || b.motivo.includes('Férias'))
    .sort((a, b) => b.data.localeCompare(a.data));
  
  const ultimaFolga = folgas[0]?.data || null;
  
  let diasSemFolga = 0;
  if (ultimaFolga) {
    const dataFolga = new Date(ultimaFolga);
    diasSemFolga = Math.floor((dataRef.getTime() - dataFolga.getTime()) / (1000 * 60 * 60 * 24));
  } else {
    // Se não tem folga registrada, assumir que passou muito tempo
    diasSemFolga = 999;
  }
  
  const temDSR = diasSemFolga <= DESCANSO_MAXIMO_SEM_FOLGA;
  
  if (!temDSR) {
    alertas.push(`❌ DSR vencido: ${diasSemFolga} dias sem folga (máximo ${DESCANSO_MAXIMO_SEM_FOLGA})`);
  } else if (diasSemFolga >= DESCANSO_MAXIMO_SEM_FOLGA - 1) {
    alertas.push(`⚠️ DSR próximo do vencimento: ${diasSemFolga} dias sem folga`);
  }
  
  return {
    temDSR,
    ultimaFolga,
    diasSemFolga,
    alertas,
  };
}

/**
 * Análise completa de conformidade CLT
 */
export function analisarConformidadeCLT(
  appointments: Appointment[],
  bloqueios: Bloqueio[],
  dataReferencia: string
): AnaliseConformidadeCLT {
  // Interjornada
  const interjornadas = appointments
    .filter(a => a.date === dataReferencia)
    .sort((a, b) => a.time.localeCompare(b.time))
    .slice(0, -1)
    .map((a, i, arr) => {
      const proximoAgendamento = arr[i + 1];
      if (!proximoAgendamento) return null;
      return validarInterjornada(a.time, proximoAgendamento.time);
    })
    .filter(Boolean) as Array<{ conforme: boolean; horasDescanso: number }>;
  
  const menorInterjornada = interjornadas.length > 0
    ? Math.min(...interjornadas.map(i => i.horasDescanso))
    : 0;
  
  const interjordadaConforme = interjornadas.every(i => i.conforme);
  
  // Carga Semanal
  const { cargaTotal, semana } = calcularCargaSemanal(appointments, bloqueios, dataReferencia);
  const cargaValidacao = validarCargaSemanal(cargaTotal);
  
  // DSR
  const dsr = calcularDSR(bloqueios, dataReferencia);
  
  // Status Geral
  const statusGeral = interjordadaConforme && cargaValidacao.conforme && dsr.temDSR;
  
  return {
    interjornada: {
      conforme: interjordadaConforme,
      menorInterjornada: menorInterjornada,
      alertas: interjornadas.some(i => !i.conforme)
        ? [`❌ Interjornada mínima violada: ${menorInterjornada}h < ${INTERJORNADA_MINIMA}h`]
        : [],
    },
    cargaSemanal: {
      conforme: cargaValidacao.conforme,
      cargaTotal: cargaTotal,
      semanaAnalisada: semana,
      alertas: cargaValidacao.alertas,
    },
    descansoRemunerado: {
      conforme: dsr.temDSR,
      ultimaFolga: dsr.ultimaFolga || 'Não registrada',
      diasSemFolga: dsr.diasSemFolga,
      alertas: dsr.alertas,
    },
    statusGeral,
    resumo: [
      interjordadaConforme ? '✅ Interjornada conforme' : '❌ Interjornada não conforme',
      cargaValidacao.conforme ? `✅ Carga semanal: ${cargaTotal}h (${cargaValidacao.percentualUtilizacao}%)` : `❌ Carga excedida: ${cargaTotal}h`,
      dsr.temDSR ? '✅ DSR conforme' : `❌ DSR vencido (${dsr.diasSemFolga}d sem folga)`,
    ],
  };
}
