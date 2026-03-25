import { PrismaClient } from '@prisma/client';

const prisma = new PrismaClient();

async function main() {
  console.log('🧹 Limpando dados antigos do banco...');
  // Deletar na ordem inversa das dependências para evitar erros de chave estrangeira
  await prisma.agendamento.deleteMany();
  await prisma.cliente.deleteMany();
  await prisma.servico.deleteMany();
  await prisma.colaborador.deleteMany();

  console.log('🌱 Semeando o banco de dados...');

  const helena = await prisma.colaborador.create({
    data: {
      nome: 'Helena Silva',
      email: 'helena@serenidade.com',
      especialidade: 'Massoterapia',
      ativo: true,
      papel: 'collaborator'
    },
  });

  const marcos = await prisma.colaborador.create({
    data: {
      nome: 'Marcos Oliveira',
      email: 'marcos@serenidade.com',
      especialidade: 'Estética',
      ativo: true,
      papel: 'collaborator'
    },
  });

  const ana = await prisma.colaborador.create({
    data: {
      nome: 'Ana Luiza',
      email: 'ana@serenidade.com',
      especialidade: 'Yoga & Meditação',
      ativo: true,
      papel: 'collaborator'
    },
  });

  const roberto = await prisma.colaborador.create({
    data: {
      nome: 'Roberto Santos',
      email: 'roberto@serenidade.com',
      especialidade: 'Recepção',
      ativo: true,
      papel: 'receptionist'
    },
  });

  console.log('💆 Semeando serviços...');
  const servicos = [
    { nome: 'Massagem Relaxante', preco: 150.0 },
    { nome: 'Massagem Terapêutica', preco: 180.0 },
    { nome: 'Limpeza de Pele', preco: 120.0 },
    { nome: 'Drenagem Linfática', preco: 140.0 },
    { nome: 'Sessão de Yoga', preco: 80.0 },
    { nome: 'Aromaterapia', preco: 90.0 }
  ];

  for (const servico of servicos) {
    await prisma.servico.create({ data: servico });
  }
  
  console.log('👥 Semeando clientes...');
  const clientes = [
    { nome: 'Juliana Costa', telefone: '11999998888' },
    { nome: 'Carlos Mendes', telefone: '11988887777' },
    { nome: 'Fernanda Lima', telefone: '11977776666' }
  ];

  const clientesCriados = [];
  for (const cliente of clientes) {
    const c = await prisma.cliente.create({ data: cliente });
    clientesCriados.push(c);
  }

  console.log('📅 Semeando agendamentos para hoje...');
  const hoje = new Date();
  hoje.setHours(0, 0, 0, 0);
  
  // Função para criar datas facilmente no dia de hoje
  const criarData = (horas: number, minutos: number) => {
    const data = new Date(hoje);
    data.setHours(horas, minutos, 0, 0);
    return data;
  };

  const todosServicos = await prisma.servico.findMany();

  // Agendamento 1
  await prisma.agendamento.create({
    data: {
      data: criarData(10, 0),
      status: 'scheduled',
      colaboradorId: helena.id,
      clienteId: clientesCriados[0].id,
      servicos: { connect: [{ id: todosServicos[0].id }] }
    }
  });

  // Agendamento 2
  await prisma.agendamento.create({
    data: {
      data: criarData(14, 30),
      status: 'scheduled',
      colaboradorId: marcos.id,
      clienteId: clientesCriados[1].id,
      servicos: { connect: [{ id: todosServicos[2].id }, { id: todosServicos[3].id }] }
    }
  });

  console.log('✅ Banco populado com sucesso!');
  console.log('Profissionais criados:', { helena: helena.nome, marcos: marcos.nome, ana: ana.nome, roberto: roberto.nome });
}

main()
  .catch((e) => {
    console.error(e);
    process.exit(1);
  })
  .finally(async () => {
    await prisma.$disconnect();
  });