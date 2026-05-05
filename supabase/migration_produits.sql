-- Migration: produits multi-tailles + chaîne de production
-- Exécuter dans Supabase SQL Editor

alter table public.produits
  add column if not exists chaine_production text,
  add column if not exists tailles_quantites jsonb default '[]'::jsonb;

-- Contraintes de base
alter table public.produits
  add constraint produits_chaine_chk
  check (chaine_production is null or chaine_production in (
    'CH1','CH2','CH3','CH4','CH5','CH6','CH7','CH8','CH9','CH10','CH11','CH12','CH14','CH15','CH16'
  ));

alter table public.produits
  add constraint produits_tailles_quantites_is_array_chk
  check (jsonb_typeof(tailles_quantites) = 'array');

-- Backfill depuis l'ancien champ taille (si données historiques)
update public.produits
set tailles_quantites = jsonb_build_array(
  jsonb_build_object('taille', taille, 'quantite', 1)
)
where (tailles_quantites is null or tailles_quantites = '[]'::jsonb)
  and taille is not null
  and btrim(taille) <> '';

-- Optionnel: rendre obligatoire une fois front validé
-- alter table public.produits alter column chaine_production set not null;
-- alter table public.produits alter column tailles_quantites set not null;

-- Index utiles dashboard/filtrage
create index if not exists idx_produits_chaine_production on public.produits(chaine_production);
create index if not exists idx_mouvements_produit_created_at on public.mouvements(produit_id, created_at desc);
