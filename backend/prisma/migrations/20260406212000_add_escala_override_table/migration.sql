-- Create table for planning overrides persisted in PostgreSQL
CREATE TABLE IF NOT EXISTS "EscalaOverride" (
  "key" TEXT NOT NULL,
  "colaboradorId" TEXT NOT NULL,
  "data" TEXT NOT NULL,
  "tipo" TEXT,
  "turno" TEXT,
  "descricao" TEXT,
  "atualizadoEm" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
  CONSTRAINT "EscalaOverride_pkey" PRIMARY KEY ("key")
);

CREATE INDEX IF NOT EXISTS "EscalaOverride_colaboradorId_idx" ON "EscalaOverride"("colaboradorId");
CREATE INDEX IF NOT EXISTS "EscalaOverride_data_idx" ON "EscalaOverride"("data");

DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1
    FROM pg_constraint
    WHERE conname = 'EscalaOverride_colaboradorId_fkey'
  ) THEN
    ALTER TABLE "EscalaOverride"
      ADD CONSTRAINT "EscalaOverride_colaboradorId_fkey"
      FOREIGN KEY ("colaboradorId") REFERENCES "Colaborador"("id")
      ON DELETE RESTRICT ON UPDATE CASCADE;
  END IF;
END $$;
