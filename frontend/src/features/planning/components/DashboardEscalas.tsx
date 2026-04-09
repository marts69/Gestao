import React, { useMemo } from 'react';
import { Appointment, Employee } from '../../../types';
import { getLocalTodayString } from '../../appointments/utils/appointmentCore';
import { analisarConformidadeCLT } from '../../../utils/cltValidator';
import { aplicarFolgasDomingoNoMes, calcularHorasEscala, gerarEscala } from '../../../utils/escalaCalculator';

interface DashboardEscalasProps {
  employees: Employee[];
  appointments: Appointment[];
}

export function DashboardEscalas({ employees, appointments }: DashboardEscalasProps) {
  const metrics = useMemo(() => {
    const activeEmployees = employees.filter((emp) => emp.id !== 'admin');
    const referenceDate = getLocalTodayString();

    const rows = activeEmployees.map((emp) => {
      const escalaBase = gerarEscala(
        {
          tipo: emp.tipoEscala || '6x1',
          dataInicio: referenceDate,
        },
        28,
      );

      const escala = aplicarFolgasDomingoNoMes(
        escalaBase,
        emp.folgasDomingoNoMes ?? 2,
      );

      const horas = calcularHorasEscala(escala).horasTrabalhadas;
      const analise = analisarConformidadeCLT(escala);

      return {
        id: emp.id,
        nome: emp.name,
        horas,
        conforme: analise.statusGeral,
      };
    });

    const mediaHoras = rows.length > 0
      ? rows.reduce((sum, row) => sum + row.horas, 0) / rows.length
      : 0;

    const alertas = rows.filter((row) => !row.conforme).length;

    return {
      rows,
      mediaHoras,
      alertas,
      totalColaboradores: rows.length,
    };
  }, [appointments, employees]);

  const healthScore = useMemo(() => {
    return Math.max(0, 100 - (metrics.alertas * 15)); // Penalidade de 15 pontos por infração
  }, [metrics.alertas]);

  const getScoreColor = (score: number) => {
    if (score >= 90) return { bg: 'bg-emerald-500/10', border: 'border-emerald-500/20', text: 'text-emerald-600', label: 'text-emerald-700' };
    if (score >= 70) return { bg: 'bg-amber-500/10', border: 'border-amber-500/30', text: 'text-amber-600', label: 'text-amber-700' };
    return { bg: 'bg-error/10', border: 'border-error/30', text: 'text-error', label: 'text-error' };
  };

  const scoreStyles = getScoreColor(healthScore);

  return (
    <div className="bg-surface-container-lowest p-6 rounded-3xl border border-outline-variant/10 shadow-sm">
      <h3 className="text-lg font-headline text-primary mb-4">Dashboard de Escalas</h3>

      <div className="grid grid-cols-2 sm:grid-cols-4 gap-4 mb-5">
        <div className={`rounded-2xl border flex flex-col items-center justify-center p-4 transition-colors ${scoreStyles.bg} ${scoreStyles.border}`}>
          <p className={`text-[10px] font-bold uppercase tracking-widest ${scoreStyles.label}`}>Health Score</p>
          <div className="flex items-baseline gap-0.5 mt-1">
            <span className={`text-3xl font-headline font-black ${scoreStyles.text}`}>{healthScore}</span>
            <span className={`text-[10px] font-bold ${scoreStyles.label} opacity-70`}>/100</span>
          </div>
        </div>

        <div className="rounded-2xl border border-outline-variant/20 bg-surface-container-low p-4">
          <p className="text-[10px] font-bold uppercase tracking-widest text-outline">Horas Medias (28d)</p>
          <p className="text-2xl font-headline text-primary mt-1">{metrics.mediaHoras.toFixed(1)}h</p>
        </div>

        <div className="rounded-2xl border border-outline-variant/20 bg-surface-container-low p-4">
          <p className="text-[10px] font-bold uppercase tracking-widest text-outline">Colaboradores</p>
          <p className="text-2xl font-headline text-primary mt-1">{metrics.totalColaboradores}</p>
        </div>

        <div className={`rounded-2xl border p-4 transition-colors ${metrics.alertas > 0 ? 'bg-amber-500/10 border-amber-500/30' : 'bg-surface-container-low border-outline-variant/20'}`}>
          <p className={`text-[10px] font-bold uppercase tracking-widest ${metrics.alertas > 0 ? 'text-amber-700' : 'text-outline'}`}>Alertas CLT</p>
          <p className={`text-2xl font-headline mt-1 ${metrics.alertas > 0 ? 'text-amber-600' : 'text-primary'}`}>{metrics.alertas}</p>
        </div>
      </div>

      <div className="space-y-2 max-h-56 overflow-y-auto custom-scrollbar pr-1">
        {metrics.rows.map((row) => (
          <div key={row.id} className="rounded-xl border border-outline-variant/20 bg-surface-container-low px-3 py-2 flex items-center justify-between gap-3">
            <div className="min-w-0">
              <p className="text-sm font-bold text-on-surface truncate">{row.nome}</p>
              <p className="text-[10px] uppercase tracking-widest text-on-surface-variant">{row.horas.toFixed(1)}h no ciclo</p>
            </div>
            <span className={`text-[10px] font-bold uppercase tracking-widest px-2.5 py-1 rounded-full border ${row.conforme ? 'bg-emerald-500/10 text-emerald-700 border-emerald-500/20' : 'bg-amber-500/10 text-amber-700 border-amber-500/30'}`}>
              {row.conforme ? 'Conforme' : 'Aviso CLT'}
            </span>
          </div>
        ))}
      </div>
    </div>
  );
}
