DO $$
BEGIN
  IF to_regclass('public.produits') IS NULL THEN
    RAISE EXCEPTION 'Table public.produits introuvable. Créez la table avant cette migration.';
  END IF;
END
$$;

ALTER TABLE public.produits
  ADD COLUMN IF NOT EXISTS chaine_production text,
  ADD COLUMN IF NOT EXISTS tailles_quantites jsonb;

UPDATE public.produits
SET tailles_quantites = '[]'::jsonb
WHERE tailles_quantites IS NULL;

ALTER TABLE public.produits
  ALTER COLUMN tailles_quantites SET DEFAULT '[]'::jsonb;

DO $$
BEGIN
  IF EXISTS (
    SELECT 1 FROM information_schema.columns
    WHERE table_schema = 'public' AND table_name = 'produits' AND column_name = 'chaine_production'
  ) AND NOT EXISTS (
    SELECT 1 FROM pg_constraint WHERE conname = 'produits_chaine_chk'
  ) THEN
    ALTER TABLE public.produits
      ADD CONSTRAINT produits_chaine_chk
      CHECK (
        chaine_production IS NULL OR chaine_production IN (
          'CH1','CH2','CH3','CH4','CH5','CH6','CH7','CH8','CH9','CH10','CH11','CH12','CH14','CH15','CH16','CH17','BRODERIE_MACHINE',
  'HVA',
  'BRODERIE_MAIN'
        )
      );
  END IF;
END
$$;

DO $$
BEGIN
  IF EXISTS (
    SELECT 1 FROM information_schema.columns
    WHERE table_schema = 'public' AND table_name = 'produits' AND column_name = 'tailles_quantites'
  ) AND NOT EXISTS (
    SELECT 1 FROM pg_constraint WHERE conname = 'produits_tailles_quantites_is_array_chk'
  ) THEN
    ALTER TABLE public.produits
      ADD CONSTRAINT produits_tailles_quantites_is_array_chk
      CHECK (jsonb_typeof(tailles_quantites) = 'array');
  END IF;
END
$$;

UPDATE public.produits
SET tailles_quantites = jsonb_build_array(
  jsonb_build_object('taille', taille, 'quantite', 1)
)
WHERE (tailles_quantites IS NULL OR tailles_quantites = '[]'::jsonb)
  AND taille IS NOT NULL
  AND btrim(taille) <> '';

CREATE INDEX IF NOT EXISTS idx_produits_chaine_production
  ON public.produits(chaine_production);

CREATE INDEX IF NOT EXISTS idx_mouvements_produit_created_at
  ON public.mouvements(produit_id, created_at DESC);
