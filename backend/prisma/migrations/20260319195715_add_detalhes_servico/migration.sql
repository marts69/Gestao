/*
  Warnings:

  - A unique constraint covering the columns `[nome]` on the table `Servico` will be added. If there are existing duplicate values, this will fail.

*/
-- AlterTable
ALTER TABLE "Servico" ADD COLUMN     "icone" TEXT DEFAULT 'spa',
ALTER COLUMN "duracao" DROP NOT NULL;

-- CreateIndex
CREATE UNIQUE INDEX "Servico_nome_key" ON "Servico"("nome");
