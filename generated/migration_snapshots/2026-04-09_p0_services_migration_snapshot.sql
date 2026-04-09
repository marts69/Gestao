-- CreateSchema
CREATE SCHEMA IF NOT EXISTS "public";

-- CreateTable
CREATE TABLE "public"."Agendamento" (
    "id" TEXT NOT NULL,
    "data" TIMESTAMP(3) NOT NULL,
    "colaboradorId" TEXT NOT NULL,
    "clienteId" TEXT NOT NULL,
    "status" TEXT DEFAULT 'scheduled',

    CONSTRAINT "Agendamento_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "public"."Cliente" (
    "id" TEXT NOT NULL,
    "nome" TEXT NOT NULL,
    "telefone" TEXT,
    "cpf" TEXT,

    CONSTRAINT "Cliente_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "public"."Colaborador" (
    "id" TEXT NOT NULL,
    "nome" TEXT NOT NULL,
    "especialidade" TEXT NOT NULL,
    "ativo" BOOLEAN NOT NULL DEFAULT true,
    "email" TEXT,
    "papel" TEXT NOT NULL DEFAULT 'collaborator',
    "senha" TEXT,
    "cargo" TEXT,
    "tipoEscala" TEXT DEFAULT '6x1',
    "folgasDomingoNoMes" INTEGER DEFAULT 2,
    "cargaHorariaSemanal" INTEGER DEFAULT 40,
    "habilidades" TEXT[] DEFAULT ARRAY[]::TEXT[],

    CONSTRAINT "Colaborador_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "public"."EscalaOverride" (
    "key" TEXT NOT NULL,
    "colaboradorId" TEXT NOT NULL,
    "data" TEXT NOT NULL,
    "tipo" TEXT,
    "turno" TEXT,
    "descricao" TEXT,
    "atualizadoEm" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "EscalaOverride_pkey" PRIMARY KEY ("key")
);

-- CreateTable
CREATE TABLE "public"."Servico" (
    "id" TEXT NOT NULL,
    "nome" TEXT NOT NULL,
    "preco" DOUBLE PRECISION NOT NULL,
    "duracao" INTEGER DEFAULT 60,
    "icone" TEXT DEFAULT 'spa',
    "modoElegibilidade" TEXT NOT NULL DEFAULT 'livre',
    "cargosPermitidos" TEXT[] DEFAULT ARRAY[]::TEXT[],
    "habilidadesPermitidas" TEXT[] DEFAULT ARRAY[]::TEXT[],
    "descricao" TEXT DEFAULT '',
    "categoria" TEXT DEFAULT '',
    "tempoHigienizacaoMin" INTEGER DEFAULT 0,
    "comissaoPercentual" DOUBLE PRECISION,

    CONSTRAINT "Servico_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "public"."SolicitacaoTroca" (
    "id" TEXT NOT NULL,
    "colaboradorId" TEXT NOT NULL,
    "dataOriginal" TEXT NOT NULL,
    "dataSolicitada" TEXT NOT NULL,
    "motivo" TEXT NOT NULL,
    "status" TEXT NOT NULL DEFAULT 'pendente',
    "respostaObservacao" TEXT,
    "respondidoPorId" TEXT,
    "criadoEm" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "atualizadoEm" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "SolicitacaoTroca_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "public"."_AgendamentoToServico" (
    "A" TEXT NOT NULL,
    "B" TEXT NOT NULL,

    CONSTRAINT "_AgendamentoToServico_AB_pkey" PRIMARY KEY ("A","B")
);

-- CreateIndex
CREATE UNIQUE INDEX "Colaborador_email_key" ON "public"."Colaborador"("email" ASC);

-- CreateIndex
CREATE INDEX "EscalaOverride_colaboradorId_idx" ON "public"."EscalaOverride"("colaboradorId" ASC);

-- CreateIndex
CREATE INDEX "EscalaOverride_data_idx" ON "public"."EscalaOverride"("data" ASC);

-- CreateIndex
CREATE UNIQUE INDEX "Servico_nome_key" ON "public"."Servico"("nome" ASC);

-- CreateIndex
CREATE INDEX "SolicitacaoTroca_colaboradorId_idx" ON "public"."SolicitacaoTroca"("colaboradorId" ASC);

-- CreateIndex
CREATE INDEX "SolicitacaoTroca_status_idx" ON "public"."SolicitacaoTroca"("status" ASC);

-- CreateIndex
CREATE INDEX "_AgendamentoToServico_B_index" ON "public"."_AgendamentoToServico"("B" ASC);

-- AddForeignKey
ALTER TABLE "public"."Agendamento" ADD CONSTRAINT "Agendamento_clienteId_fkey" FOREIGN KEY ("clienteId") REFERENCES "public"."Cliente"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "public"."Agendamento" ADD CONSTRAINT "Agendamento_colaboradorId_fkey" FOREIGN KEY ("colaboradorId") REFERENCES "public"."Colaborador"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "public"."EscalaOverride" ADD CONSTRAINT "EscalaOverride_colaboradorId_fkey" FOREIGN KEY ("colaboradorId") REFERENCES "public"."Colaborador"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "public"."SolicitacaoTroca" ADD CONSTRAINT "SolicitacaoTroca_colaboradorId_fkey" FOREIGN KEY ("colaboradorId") REFERENCES "public"."Colaborador"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "public"."_AgendamentoToServico" ADD CONSTRAINT "_AgendamentoToServico_A_fkey" FOREIGN KEY ("A") REFERENCES "public"."Agendamento"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "public"."_AgendamentoToServico" ADD CONSTRAINT "_AgendamentoToServico_B_fkey" FOREIGN KEY ("B") REFERENCES "public"."Servico"("id") ON DELETE CASCADE ON UPDATE CASCADE;

