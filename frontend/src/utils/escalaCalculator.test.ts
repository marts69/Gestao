import { describe, expect, it } from 'vitest';
import {
  aplicarFolgasDomingoNoMes,
  calcularHorasEscala,
  gerarEscala12x36,
  gerarEscala5x2,
  gerarEscala6x1,
  proximaFolga,
} from './escalaCalculator';

const BR_NOON = (d: string) => `${d}T12:00:00-03:00`;

describe('gerarEscala5x2', () => {
  it('mantem ciclo de 7 dias com 5 trabalho e 2 folgas', () => {
    const dias = gerarEscala5x2(BR_NOON('2026-06-01'), 14);
    expect(dias).toHaveLength(14);
    const tipos = dias.map((d) => d.tipo);
    expect(tipos.slice(0, 7)).toEqual([
      'trabalho',
      'trabalho',
      'trabalho',
      'trabalho',
      'trabalho',
      'folga',
      'folga',
    ]);
  });
});

describe('gerarEscala6x1', () => {
  it('marca domingo como fds quando cai no calendario', () => {
    const dias = gerarEscala6x1(BR_NOON('2026-06-07'), 3);
    const domingo = dias.find((d) => d.data === '2026-06-07');
    expect(domingo?.tipo).toBe('fds');
  });
});

describe('gerarEscala12x36', () => {
  it('alterna 1 dia trabalho e 3 folgas no ciclo de 4', () => {
    const dias = gerarEscala12x36(BR_NOON('2026-06-01'), 8, {
      diurno: { inicio: '07:00', fim: '19:00' },
      noturno: { inicio: '19:00', fim: '07:00' },
    });
    const tipos = dias.map((d) => d.tipo);
    expect(tipos[0]).toBe('trabalho');
    expect(tipos[1]).toBe('folga');
    expect(tipos[2]).toBe('folga');
    expect(tipos[3]).toBe('folga');
    expect(tipos[4]).toBe('trabalho');
  });
});

describe('aplicarFolgasDomingoNoMes (CLT / folga dominical)', () => {
  it('nao altera lista quando meta <= 0', () => {
    const dias = gerarEscala5x2(BR_NOON('2026-06-01'), 7);
    const out = aplicarFolgasDomingoNoMes(dias, 0);
    expect(out).toBe(dias);
  });

  it('marca primeiros N domingos como folga dominical configurada', () => {
    const dias = gerarEscala5x2(BR_NOON('2026-06-01'), 21);
    const out = aplicarFolgasDomingoNoMes(dias, 2);
    const domingos = out.filter((d) => new Date(`${d.data}T12:00:00`).getDay() === 0);
    const configurados = domingos.filter((d) => d.folgaDominicalConfigurada);
    expect(configurados.length).toBeGreaterThanOrEqual(1);
    expect(configurados.every((d) => d.tipo === 'folga' || d.tipo === 'fds')).toBe(true);
  });
});

describe('calcularHorasEscala', () => {
  it('soma horas de turno com inicio e fim', () => {
    const res = calcularHorasEscala([
      { data: '2026-06-02', tipo: 'trabalho', horaInicio: '09:00', horaFim: '18:00' },
      { data: '2026-06-03', tipo: 'folga' },
    ]);
    expect(res.diasTrabalho).toBe(1);
    expect(res.horasTrabalhadas).toBe(9);
  });
});

describe('proximaFolga', () => {
  it('retorna primeira folga a partir da referencia', () => {
    const dias = gerarEscala5x2(BR_NOON('2026-06-01'), 14);
    const folga = proximaFolga(dias, '2026-06-01');
    expect(folga).toBeTruthy();
    const dia = dias.find((d) => d.data === folga);
    expect(dia?.tipo).toBe('folga');
  });
});
