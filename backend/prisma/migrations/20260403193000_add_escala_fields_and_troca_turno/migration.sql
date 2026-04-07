-- Add escala fields to Colaborador
ALTER TABLE "Colaborador"
  ADD COLUMN IF NOT EXISTS "cargo" TEXT,
  ADD COLUMN IF NOT EXISTS "tipoEscala" TEXT DEFAULT '6x1',
  ADD COLUMN IF NOT EXISTS "folgasDomingoNoMes" INTEGER DEFAULT 2,
  ADD COLUMN IF NOT EXISTS "cargaHorariaSemanal" INTEGER DEFAULT 40,
  ADD COLUMN IF NOT EXISTS "habilidades" TEXT[] DEFAULT ARRAY[]::TEXT[];

-- Create shift swap request table
CREATE TABLE IF NOT EXISTS "SolicitacaoTroca" (
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

CREATE INDEX IF NOT EXISTS "SolicitacaoTroca_colaboradorId_idx" ON "SolicitacaoTroca"("colaboradorId");
CREATE INDEX IF NOT EXISTS "SolicitacaoTroca_status_idx" ON "SolicitacaoTroca"("status");

DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1
    FROM pg_constraint
    WHERE conname = 'SolicitacaoTroca_colaboradorId_fkey'
  ) THEN
    ALTER TABLE "SolicitacaoTroca"
      ADD CONSTRAINT "SolicitacaoTroca_colaboradorId_fkey"
      FOREIGN KEY ("colaboradorId") REFERENCES "Colaborador"("id")
      ON DELETE RESTRICT ON UPDATE CASCADE;
  END IF;
END $$;
