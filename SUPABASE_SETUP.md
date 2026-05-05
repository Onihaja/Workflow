# Setup Supabase — AKANJO Workflow

Ce guide couvre **ce que vous devez faire côté Supabase** pour aligner le backend avec l'app actuelle.

## 1) Exécuter la migration SQL
1. Ouvrir **Supabase Dashboard → SQL Editor**.
2. Ouvrir le fichier `supabase/migration_produits.sql`.
3. Copier **tout le SQL** (pas le chemin du fichier).
4. Coller dans SQL Editor puis cliquer **Run**.

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
- Remplir vos vraies clés Supabase en production.
- Sécuriser la clé/service role (ne jamais exposer service role dans le front).

### Ce que vous devez faire
- Ouvrir `supabase-config.js` puis vérifier/renseigner:
  - `url: 'https://<votre-projet>.supabase.co'`
  - `anonKey: '<votre-anon-key>'`
- Utiliser la clé **anon** (jamais service_role côté frontend).
- Vérifier que toutes les pages chargent `supabase-config.js` et pointent vers le **même projet Supabase**.
- Si vous changez de projet Supabase, mettez à jour ces 2 valeurs en priorité.

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

## Dépannage rapide
- Erreur `42601 ... supabase/migration_produits.sql` : vous avez collé le **nom du fichier** au lieu du SQL.
- Erreur `42703 column chaine_production does not exist` : utilisez la version actuelle de `supabase/migration_produits.sql` (elle vérifie la table et ajoute les colonnes avant contraintes).
- Erreur `Invalid API key` : la clé `SUPABASE_KEY` est invalide/expirée ou n'appartient pas au projet ciblé.
