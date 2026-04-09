-- Add operational fields for premium service management
ALTER TABLE "Servico"
  ADD COLUMN IF NOT EXISTS "descricao" TEXT DEFAULT '',
  ADD COLUMN IF NOT EXISTS "categoria" TEXT DEFAULT '',
  ADD COLUMN IF NOT EXISTS "tempoHigienizacaoMin" INTEGER DEFAULT 0,
  ADD COLUMN IF NOT EXISTS "comissaoPercentual" DOUBLE PRECISION;
