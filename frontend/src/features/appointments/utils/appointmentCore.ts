import { Appointment, Service } from '../../../types';
import { formatPhone } from '../../../utils/formatters';

type ServiceLike = Pick<Service, 'nome'> & Partial<Pick<Service, 'id' | 'duracao' | 'preco' | 'tempoHigienizacaoMin'>>;

const BRAZIL_TIMEZONE = 'America/Sao_Paulo';

const getBrazilDateTimeParts = () => {
  const parts = new Intl.DateTimeFormat('en-CA', {
    timeZone: BRAZIL_TIMEZONE,
    year: 'numeric',
    month: '2-digit',
    day: '2-digit',
    hour: '2-digit',
    minute: '2-digit',
    hour12: false,
  }).formatToParts(new Date());

  const map = Object.fromEntries(parts.map(p => [p.type, p.value]));
  const date = `${map.year}-${map.month}-${map.day}`;
  const time = `${map.hour}:${map.minute}`;
  const hours = Number(map.hour || '0');
  const minutes = Number(map.minute || '0');

  return { date, time, hours, minutes };
};

export const getLocalTodayString = () => {
  return getBrazilDateTimeParts().date;
};

export const getBrazilCurrentTimeString = () => getBrazilDateTimeParts().time;

export const getBrazilCurrentMinuteOfDay = () => {
  const { hours, minutes } = getBrazilDateTimeParts();
  return hours * 60 + minutes;
};

const normalizeKey = (value: string) => value
  .normalize('NFD')
  .replace(/[\u0300-\u036f]/g, '')
  .toLowerCase()
  .trim();

export const getDuration = (serviceNames: string[] = [], services: ServiceLike[] = []) => serviceNames.reduce((sum, rawName) => {
  const key = normalizeKey(String(rawName || ''));
  const srv = services.find((s) => {
    const sameId = typeof s.id === 'string' && s.id === rawName;
    const sameName = normalizeKey(s.nome) === key;
    return sameId || sameName;
  });
  return sum + (Number(srv?.duracao) || 60) + (Number(srv?.tempoHigienizacaoMin) || 0);
}, 0);

const normalizeSearch = (value: string) => value
  .normalize('NFD')
  .replace(/[\u0300-\u036f]/g, '')
  .toLowerCase()
  .trim();

export const matchesAppointmentSearch = (appointment: Appointment, searchTerm: string): boolean => {
  const query = normalizeSearch(searchTerm);
  if (!query) return true;

  return [
    appointment.clientName,
    appointment.contact,
    appointment.observation || '',
    ...appointment.services,
  ].some(value => normalizeSearch(value).includes(query));
};

export const hasOverlap = (targetDate: string, targetTime: string, empId: string, serviceNames: string[] = [], appointments: Appointment[], services: ServiceLike[] = [], ignoreAppId: string | null = null) => {
  const newStart = parseInt(targetTime.split(':')[0]) * 60 + parseInt(targetTime.split(':')[1]);
  const newEnd = newStart + getDuration(serviceNames, services);

  return appointments.some(a => {
    if (a.id === ignoreAppId || a.date !== targetDate || a.assignedEmployeeId !== empId || a.status !== 'scheduled' || !a.time) return false;
    const existStart = parseInt(a.time.split(':')[0]) * 60 + parseInt(a.time.split(':')[1]);
    const existEnd = existStart + getDuration(a.services, services);
    return newStart < existEnd && newEnd > existStart;
  });
};

export const handlePrintAppointment = (app: Appointment, empName: string, services: ServiceLike[], printType: 'a4' | 'thermal' = 'a4') => {
  const servicesWithPrices = app.services.map(sName => {
    const srv = services.find((s) => s.nome === sName);
    return { name: sName, price: Number(srv?.preco) || 0 };
  });
  const totalPrice = servicesWithPrices.reduce((sum, s) => sum + s.price, 0);
  const contactDisplay = app.contact && /\d/.test(app.contact) ? formatPhone(app.contact) : app.contact;

  const printWindow = window.open('', '_blank');
  if (!printWindow) return;

  const a4Styles = `
    @import url('https://fonts.googleapis.com/css2?family=Inter:wght@400;600;700&display=swap');
    body { font-family: 'Inter', sans-serif; padding: 40px; color: #1f2937; max-width: 400px; margin: 0 auto; background: #f9fafb; }
    .receipt-container { background: #fff; border: 1px solid #e5e7eb; border-radius: 16px; padding: 30px; box-shadow: 0 4px 6px rgba(0,0,0,0.02); }
    .header { text-align: center; margin-bottom: 25px; }
    .header img { max-height: 70px; margin-bottom: 12px; border-radius: 8px; }
    .header h1 { margin: 0; color: #111827; font-size: 20px; font-weight: 700; letter-spacing: -0.5px; }
    .header p { margin: 4px 0 0 0; color: #6b7280; font-size: 11px; text-transform: uppercase; letter-spacing: 1.5px; }
    .divider { border-bottom: 1px dashed #d1d5db; margin: 20px 0; }
    .info-row { display: flex; justify-content: space-between; margin-bottom: 12px; font-size: 13px; }
    .info-row span.label { color: #6b7280; }
    .info-row span.value { font-weight: 600; text-align: right; color: #1f2937; }
    .services-list { margin-top: 15px; }
    .service-item { display: flex; justify-content: space-between; margin-bottom: 8px; font-size: 13px; }
    .service-item .s-name { color: #374151; }
    .service-item .s-price { font-weight: 600; }
    .total-row { display: flex; justify-content: space-between; margin-top: 15px; padding-top: 15px; border-top: 2px solid #e5e7eb; font-size: 18px; font-weight: 700; color: #111827; }
    .alert-box { margin-top: 25px; background: #fef2f2; border: 1px solid #fecaca; padding: 12px; border-radius: 8px; }
    .alert-box strong { color: #dc2626; font-size: 11px; text-transform: uppercase; display: block; margin-bottom: 4px; letter-spacing: 0.5px; }
    .alert-box p { margin: 0; font-size: 12px; color: #991b1b; }
    .footer { margin-top: 30px; font-size: 11px; text-align: center; color: #9ca3af; }
  `;

  const thermalStyles = `
    @import url('https://fonts.googleapis.com/css2?family=Courier+Prime:wght@400;700&display=swap');
    body { font-family: 'Courier Prime', monospace; padding: 0; margin: 0; color: #000; width: 80mm; background: #fff; }
    .receipt-container { padding: 10px; width: calc(100% - 20px); }
    .header { text-align: center; margin-bottom: 15px; }
    .header img { max-height: 50px; margin-bottom: 5px; filter: grayscale(100%); }
    .header h1 { margin: 0; color: #000; font-size: 16px; font-weight: 700; }
    .header p { margin: 2px 0 0 0; color: #000; font-size: 10px; text-transform: uppercase; }
    .divider { border-bottom: 1px dashed #000; margin: 10px 0; }
    .info-row { display: flex; justify-content: space-between; margin-bottom: 6px; font-size: 12px; }
    .info-row span.label { color: #000; }
    .info-row span.value { font-weight: 700; text-align: right; color: #000; }
    .services-list { margin-top: 10px; }
    .service-item { display: flex; justify-content: space-between; margin-bottom: 6px; font-size: 12px; }
    .service-item .s-name { color: #000; }
    .service-item .s-price { font-weight: 700; }
    .total-row { display: flex; justify-content: space-between; margin-top: 10px; padding-top: 10px; border-top: 2px dashed #000; font-size: 14px; font-weight: 700; color: #000; }
    .alert-box { margin-top: 15px; border: 1px dashed #000; padding: 8px; }
    .alert-box strong { color: #000; font-size: 11px; text-transform: uppercase; display: block; margin-bottom: 4px; }
    .alert-box p { margin: 0; font-size: 11px; color: #000; font-style: italic; }
    .footer { margin-top: 20px; font-size: 10px; text-align: center; color: #000; }
  `;

  const logoSrc = printType === 'thermal'
    ? 'https://ui-avatars.com/api/?name=Serenidade+Spa&background=000&color=fff&rounded=true&size=150'
    : 'https://ui-avatars.com/api/?name=Serenidade+Spa&background=0D9488&color=fff&rounded=true&size=150';

  printWindow.document.write(`<html><head><title>Comprovante - ${app.clientName}</title><style>${printType === 'a4' ? a4Styles : thermalStyles}</style></head><body><div class="receipt-container"><div class="header"><img src="${logoSrc}" alt="Logo" /><h1>Serenidade Spa</h1><p>Comprovante de Agendamento</p></div><div class="info-row"><span class="label">Cliente:</span> <span class="value">${app.clientName}</span></div><div class="info-row"><span class="label">Contato:</span> <span class="value">${contactDisplay}</span></div><div class="info-row"><span class="label">Data:</span> <span class="value">${app.date.split('-').reverse().join('/')}</span></div><div class="info-row"><span class="label">Horário:</span> <span class="value">${app.time}</span></div><div class="info-row"><span class="label">Profissional:</span> <span class="value">${empName}</span></div><div class="divider"></div><div class="services-list"><div style="font-size: 10px; color: #9ca3af; text-transform: uppercase; letter-spacing: 1px; margin-bottom: 12px; font-weight: bold;">Serviços Solicitados</div>${servicesWithPrices.map(s => `<div class="service-item"><span class="s-name">${s.name}</span><span class="s-price">R$ ${s.price.toFixed(2)}</span></div>`).join('')}</div><div class="total-row"><span>Total Estimado</span><span>R$ ${totalPrice.toFixed(2)}</span></div>${(app.specialNeeds && app.specialNeeds.length > 0) || app.observation ? `<div class="alert-box">${app.specialNeeds && app.specialNeeds.length > 0 ? `<strong>⚠️ Atenção: ${app.specialNeeds.join(', ')}</strong>` : ''}${app.observation ? `<p><i>"${app.observation}"</i></p>` : ''}</div>` : ''}<div class="footer">Gerado em ${new Date().toLocaleString('pt-BR')}</div></div><script>window.onload = function() { window.print(); window.close(); }</script></body></html>`);
  printWindow.document.close();
};

export const handleSendReceiptWhatsApp = (app: Appointment, empName: string, services: ServiceLike[], setErrorMessage?: (msg: string) => void) => {
  if (!app.contact || app.contact === 'Não informado') {
    if (setErrorMessage) setErrorMessage('Cliente não possui telefone cadastrado para envio.');
    return;
  }

  const servicesWithPrices = app.services.map(sName => {
    const srv = services.find((s) => s.nome === sName);
    return { name: sName, price: Number(srv?.preco) || 0 };
  });
  const totalPrice = servicesWithPrices.reduce((sum, s) => sum + s.price, 0);

  const text = encodeURIComponent(`*Serenidade Spa - Comprovante de Agendamento*\n\nOlá, *${app.clientName}*! Seu agendamento está confirmado.\n\n📅 *Data:* ${app.date.split('-').reverse().join('/')}\n⏰ *Horário:* ${app.time}\n👤 *Profissional:* ${empName}\n\n*Serviços solicitados:*\n${servicesWithPrices.map(s => `• ${s.name} (R$ ${s.price.toFixed(2)})`).join('\n')}\n\n*Total Estimado:* R$ ${totalPrice.toFixed(2)}\n\nAguardamos você!`);

  window.open(`https://wa.me/${app.contact.replace(/\D/g, '')}?text=${text}`, '_blank');
};
