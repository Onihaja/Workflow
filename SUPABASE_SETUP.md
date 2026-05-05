# Setup Supabase — AKANJO Workflow

Ce guide couvre **ce que vous devez faire côté Supabase** pour aligner le backend avec l'app actuelle.

## 1) Exécuter la migration SQL
1. Ouvrir **Supabase Dashboard → SQL Editor**.
2. Coller le contenu de `supabase/migration_produits.sql`.
3. Cliquer **Run**.

Ce script ajoute:
- `produits.chaine_production` (`text`)
- `produits.tailles_quantites` (`jsonb`)
- contraintes + index + backfill historique.

## 2) Vérifier la structure des tables
Vous devez avoir au minimum:
- `produits(id, client, reference, designation, couleur, taille, chaine_production, tailles_quantites, etat_actuel, created_at)`
- `mouvements(id, produit_id, departement_id, action, operateur, created_at)`

## 3) Configurer les clés dans le front
### Ce que je **ne peux pas faire à votre place**
- Remplir vos vraies clés Supabase dans `scan.js` en production.
- Sécuriser la clé/service role (ne jamais exposer service role dans le front).

### Ce que vous devez faire
- Dans `scan.js`, remplacer:
  - `SUPABASE_URL = 'https://VOTRE_URL.supabase.co'`
  - `SUPABASE_KEY = 'VOTRE_ANON_KEY'`
- Vérifier que `app.js` et `scan.js` pointent vers le **même projet Supabase**.

## 4) Politiques RLS (développement puis prod)
En dev, RLS peut rester désactivé.
En prod:
1. Activer RLS sur `produits` et `mouvements`.
2. Créer des policies par rôle/département.
3. Passer par Supabase Auth + table `profiles`.

## 5) Vérification rapide (tests manuels)
1. Créer une pièce depuis `index.html` avec:
   - chaîne CHx
   - au moins une taille avec quantité > 0
2. Vérifier dans `produits`:
   - `chaine_production` rempli
   - `tailles_quantites` JSON rempli
   - `taille` texte de compatibilité rempli
3. Scanner dans `atelier.html`/`qualite.html`/`finition.html` et vérifier l'affichage chaîne + tailles.

## 6) Ce que je peux faire ensuite
- Ajouter un script SQL complet pour Auth (`profiles`, rôles, policies RLS).
- Ajouter page dashboard temps réel (Supabase Realtime + Chart.js).
- Préparer impression A4 9 QR par feuille.
