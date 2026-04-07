const API = process.env.API_URL || 'http://localhost:3333/api';

const parseResponse = async (res) => {
  const text = await res.text();
  let body;
  try {
    body = text ? JSON.parse(text) : null;
  } catch {
    body = text;
  }
  return { status: res.status, ok: res.ok, body };
};

const request = async (path, options = {}, token) => {
  const res = await fetch(`${API}${path}`, {
    ...options,
    headers: {
      'Content-Type': 'application/json',
      ...(token ? { Authorization: `Bearer ${token}` } : {}),
      ...(options.headers || {}),
    },
  });
  return parseResponse(res);
};

const fmtDate = (d) => `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}-${String(d.getDate()).padStart(2, '0')}`;

const maskedPhonePattern = /^\(\d{2}\)\s\*{5}-\*{2}\d{2}$/;
const maskedCpfPattern = /^\*{3}\.\d{3}\.\*{3}-\d{2}$/;

const run = async () => {
  const created = { appointmentId: null };

  const supervisorLogin = await request('/login', {
    method: 'POST',
    body: JSON.stringify({ email: 'admin@serenidade.com', senha: '123456' }),
  });
  const supervisorToken = supervisorLogin.body?.token;

  const collaboratorLogin = await request('/login', {
    method: 'POST',
    body: JSON.stringify({ email: 'ana@serenidade.com', senha: '123456' }),
  });
  if (!collaboratorLogin.ok || !collaboratorLogin.body?.token) {
    throw new Error('COLLABORATOR_LOGIN_FAILED');
  }
  const collaboratorToken = collaboratorLogin.body.token;

  const colabs = await request('/colaboradores', { method: 'GET' }, collaboratorToken);
  const collaborator = Array.isArray(colabs.body)
    ? (colabs.body.find((c) => c.id !== 'admin') || colabs.body[0])
    : null;
  if (!collaborator?.id) {
    throw new Error('COLLABORATOR_NOT_FOUND');
  }

  const services = await request('/servicos', { method: 'GET' }, collaboratorToken);
  const serviceName = Array.isArray(services.body) && services.body[0]?.nome
    ? services.body[0].nome
    : null;
  if (!serviceName) {
    throw new Error('SERVICE_NOT_FOUND');
  }

  let createAsCollaborator = { status: -1, body: null };
  let selectedDate = null;
  let selectedTime = null;

  for (let dayOffset = 2; dayOffset <= 20 && createAsCollaborator.status !== 201; dayOffset += 1) {
    for (let hour = 8; hour <= 19 && createAsCollaborator.status !== 201; hour += 1) {
      for (const minute of [0, 15, 30, 45]) {
        const day = new Date();
        day.setDate(day.getDate() + dayOffset);
        const date = fmtDate(day);
        const hh = String(hour).padStart(2, '0');
        const mm = String(minute).padStart(2, '0');

        const attempt = await request('/agendamentos', {
          method: 'POST',
          body: JSON.stringify({
            clientName: `QA LGPD ${Date.now()}`,
            collaboratorId: collaborator.id,
            date: `${date}T${hh}:${mm}:00.000-03:00`,
            serviceNames: [serviceName],
            contact: '(11) 99888-7766',
            cpf: '123.456.789-10',
          }),
        }, collaboratorToken);

        if (attempt.status === 201) {
          createAsCollaborator = attempt;
          selectedDate = date;
          selectedTime = `${hh}:${mm}`;
          if (attempt.body?.id) created.appointmentId = attempt.body.id;
          break;
        }

        if (attempt.status !== 409 && attempt.status !== 400) {
          createAsCollaborator = attempt;
          break;
        }
      }
    }
  }

  const appointmentsAsCollaborator = await request('/agendamentos', { method: 'GET' }, collaboratorToken);
  const reportAsCollaborator = await request('/agendamentos/relatorio/concluidos', { method: 'GET' }, collaboratorToken);

  const createdInList = Array.isArray(appointmentsAsCollaborator.body)
    ? appointmentsAsCollaborator.body.find((item) => item?.id === created.appointmentId)
    : null;

  const createdClient = createAsCollaborator.body?.cliente || null;
  const listedClient = createdInList?.cliente || null;

  const checks = {
    createStatus: createAsCollaborator.status,
    listStatus: appointmentsAsCollaborator.status,
    reportStatus: reportAsCollaborator.status,
    createPhoneMasked: typeof createdClient?.telefone === 'string' ? maskedPhonePattern.test(createdClient.telefone) : false,
    createCpfMasked: typeof createdClient?.cpf === 'string' ? maskedCpfPattern.test(createdClient.cpf) : false,
    listPhoneMasked: typeof listedClient?.telefone === 'string' ? maskedPhonePattern.test(listedClient.telefone) : false,
    listCpfMasked: typeof listedClient?.cpf === 'string' ? maskedCpfPattern.test(listedClient.cpf) : false,
  };

  const pass = (
    checks.createStatus === 201 &&
    checks.listStatus === 200 &&
    checks.reportStatus === 200 &&
    checks.createPhoneMasked &&
    checks.createCpfMasked &&
    checks.listPhoneMasked &&
    checks.listCpfMasked
  );

  console.log('LGPD_REDACTION_SMOKE', JSON.stringify({
    checks,
    selectedDate,
    selectedTime,
    sample: { createdClient, listedClient },
    pass,
  }, null, 2));

  if (created.appointmentId && supervisorToken) {
    await request(`/agendamentos/${created.appointmentId}`, { method: 'DELETE' }, supervisorToken);
  }

  if (!pass) {
    process.exitCode = 2;
  }
};

run().catch((error) => {
  console.error('LGPD_REDACTION_SMOKE_ERROR', error?.message || error);
  process.exitCode = 1;
});
