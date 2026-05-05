-- Migration: produits multi-tailles + chaîne de production
-- IMPORTANT: collez LE CONTENU de ce fichier dans Supabase SQL Editor (pas le nom du fichier)

DO $$
BEGIN
  IF to_regclass('public.produits') IS NULL THEN
    RAISE EXCEPTION 'Table public.produits introuvable. Créez la table avant cette migration.';
  END IF;
END
$$;

alter table public.produits
  add column if not exists chaine_production text,
  add column if not exists tailles_quantites jsonb;

update public.produits
set tailles_quantites = '[]'::jsonb
where tailles_quantites is null;

alter table public.produits
  alter column tailles_quantites set default '[]'::jsonb;

-- Contraintes ajoutées seulement si absentes ET si colonnes présentes
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
          'CH1','CH2','CH3','CH4','CH5','CH6','CH7','CH8','CH9','CH10','CH11','CH12','CH14','CH15','CH16'
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

-- Backfill historique depuis l'ancien champ taille
update public.produits
set tailles_quantites = jsonb_build_array(
  jsonb_build_object('taille', taille, 'quantite', 1)
)
where (tailles_quantites is null or tailles_quantites = '[]'::jsonb)
  and taille is not null
  and btrim(taille) <> '';

create index if not exists idx_produits_chaine_production
  on public.produits(chaine_production);

create index if not exists idx_mouvements_produit_created_at
  on public.mouvements(produit_id, created_at desc);
