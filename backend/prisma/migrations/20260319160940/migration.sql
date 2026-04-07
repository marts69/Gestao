/*
  Warnings:

  - You are about to drop the column `servicoId` on the `Agendamento` table. All the data in the column will be lost.
  - A unique constraint covering the columns `[email]` on the table `Colaborador` will be added. If there are existing duplicate values, this will fail.

*/
-- DropForeignKey
ALTER TABLE "Agendamento" DROP CONSTRAINT "Agendamento_servicoId_fkey";

-- AlterTable
ALTER TABLE "Agendamento" DROP COLUMN "servicoId",
ADD COLUMN     "status" TEXT DEFAULT 'scheduled';

-- AlterTable
ALTER TABLE "Colaborador" ADD COLUMN     "email" TEXT,
ADD COLUMN     "papel" TEXT NOT NULL DEFAULT 'collaborator',
ADD COLUMN     "senha" TEXT;

-- AlterTable
ALTER TABLE "Servico" ADD COLUMN     "duracao" INTEGER NOT NULL DEFAULT 60;

-- CreateTable
CREATE TABLE "_AgendamentoToServico" (
    "A" TEXT NOT NULL,
    "B" TEXT NOT NULL,

    CONSTRAINT "_AgendamentoToServico_AB_pkey" PRIMARY KEY ("A","B")
);

-- CreateIndex
CREATE INDEX "_AgendamentoToServico_B_index" ON "_AgendamentoToServico"("B");

-- CreateIndex
CREATE UNIQUE INDEX "Colaborador_email_key" ON "Colaborador"("email");

-- AddForeignKey
ALTER TABLE "_AgendamentoToServico" ADD CONSTRAINT "_AgendamentoToServico_A_fkey" FOREIGN KEY ("A") REFERENCES "Agendamento"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "_AgendamentoToServico" ADD CONSTRAINT "_AgendamentoToServico_B_fkey" FOREIGN KEY ("B") REFERENCES "Servico"("id") ON DELETE CASCADE ON UPDATE CASCADE;
