-- AlterTable
ALTER TABLE "Servico"
ADD COLUMN "modoElegibilidade" TEXT NOT NULL DEFAULT 'livre',
ADD COLUMN "cargosPermitidos" TEXT[] DEFAULT ARRAY[]::TEXT[],
ADD COLUMN "habilidadesPermitidas" TEXT[] DEFAULT ARRAY[]::TEXT[];
