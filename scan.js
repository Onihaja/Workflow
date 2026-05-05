
const SUPABASE_URL = window.SUPABASE_CONFIG?.url || 'https://VOTRE_URL.supabase.co'
const SUPABASE_KEY = window.SUPABASE_CONFIG?.anonKey || 'VOTRE_ANON_KEY'

const { createClient } = supabase
const db = createClient(SUPABASE_URL, SUPABASE_KEY)

// ── Variables globales ──
let operateurNom  = ''
let pieceEnCours  = null
let scannerActif  = null


if (SUPABASE_URL.includes('VOTRE_URL') || SUPABASE_KEY.includes('VOTRE_ANON_KEY')) {
  window.addEventListener('DOMContentLoaded', () => {
    const msg = document.getElementById('msg-operateur')
    if (msg) {
      msg.className = 'msg error'
      msg.textContent = 'Configuration Supabase manquante dans supabase-config.js.'
    }
  })
}


// ──────────────────────────────────────────
// ÉTAPE 1 — Valider l'opérateur
// ──────────────────────────────────────────
function validerOperateur() {
  const val = document.getElementById('operateur').value.trim()
  const msg = document.getElementById('msg-operateur')

  if (!val) {
    msg.className = 'msg error'
    msg.textContent = 'Veuillez saisir votre nom.'
    return
  }

  operateurNom = val
  afficher('card-operateur', false)
  afficher('card-scan', true)
}

// ──────────────────────────────────────────
// ÉTAPE 2 — Démarrer le scan caméra
// ──────────────────────────────────────────
function demarrerScan() {
  const reader  = document.getElementById('reader')
  const btnScan = document.getElementById('btn-scan')

@@ -126,52 +138,56 @@ async function rechercherPiece() {
// ──────────────────────────────────────────
// Afficher les infos de la pièce + actions
// ──────────────────────────────────────────
function afficherPiece(piece) {
  const dernierAction = piece.dernierMouvement?.action || 'creation'

  // Infos pièce
  document.getElementById('piece-info').innerHTML = `
    <div class="piece-info-row">
      <span class="piece-info-key">Client</span>
      <span class="piece-info-val">${piece.client}</span>
    </div>
    <div class="piece-info-row">
      <span class="piece-info-key">Référence</span>
      <span class="piece-info-val">${piece.reference}</span>
    </div>
    <div class="piece-info-row">
      <span class="piece-info-key">Désignation</span>
      <span class="piece-info-val">${piece.designation}</span>
    </div>
    <div class="piece-info-row">
      <span class="piece-info-key">Couleur</span>
      <span class="piece-info-val">${piece.couleur || '—'}</span>
    </div>
    <div class="piece-info-row">
      <span class="piece-info-key">Chaîne</span>
      <span class="piece-info-val">${piece.chaine_production || '—'}</span>
    </div>
    <div class="piece-info-row">
      <span class="piece-info-key">Tailles</span>
      <span class="piece-info-val">${formatTailles(piece)}</span>
    </div>
    <div class="piece-info-row">
      <span class="piece-info-key">Statut actuel</span>
      <span class="piece-info-val">
        <span class="piece-statut ${classeStatut(dernierAction)}">${labelStatut(dernierAction)}</span>
      </span>
    </div>
  `

  // Boutons d'actions disponibles
  const grid = document.getElementById('actions-grid')
  grid.innerHTML = ''

  ACTIONS.forEach(action => {
    const disponible = action.requis.includes(dernierAction)
    const btn = document.createElement('button')
    btn.className = `action-btn action-${action.style}`
    btn.disabled  = !disponible
    btn.innerHTML = `
      <div>
        <div class="action-btn-label">${action.label}</div>
        <div class="action-btn-desc">${action.desc}</div>
      </div>
      <span class="action-btn-arrow">→</span>
    `
@@ -204,51 +220,51 @@ async function effectuerAction(action) {

  // Enregistrer le mouvement
  const { error } = await db.from('mouvements').insert([{
    produit_id:     pieceEnCours.id,
    departement_id: DEPT_ID,
    action:         action.id,
    operateur:      operateurNom
  }])

  if (error) {
    msg.className = 'msg error'
    msg.textContent = 'Erreur lors de l\'enregistrement : ' + error.message
    return
  }

  // Mettre à jour l'état du produit
  await db.from('produits')
    .update({ etat_actuel: action.id })
    .eq('id', pieceEnCours.id)

  // Afficher confirmation
  afficher('card-piece', false)
  document.getElementById('confirm-title').textContent = action.label + ' enregistré'
  document.getElementById('confirm-sub').innerHTML = `
    <strong>${pieceEnCours.reference}</strong><br>
    ${pieceEnCours.designation} — ${pieceEnCours.couleur || ''} ${formatTailles(pieceEnCours)}<br><br>
    Par ${operateurNom} · ${DEPT_NOM}
  `
  afficher('card-confirm', true)
}

// ──────────────────────────────────────────
// Nouveau scan
// ──────────────────────────────────────────
function nouveauScan() {
  pieceEnCours = null
  document.getElementById('input-id').value = ''
  document.getElementById('msg-scan').className = 'msg'
  document.getElementById('msg-scan').style.display = 'none'
  document.getElementById('btn-scan').style.display = 'block'
  document.getElementById('reader').style.display = 'none'
  afficher('card-confirm', false)
  afficher('card-piece',   false)
  afficher('card-scan',    true)
}

// ──────────────────────────────────────────
// Helpers
// ──────────────────────────────────────────
function afficher(id, visible) {
  document.getElementById(id).style.display = visible ? 'block' : 'none'
@@ -273,25 +289,33 @@ function classeStatut(action) {
  }
  return map[action] || 'statut-cree'
}

function labelStatut(action) {
  const map = {
    creation:        'Créé',
    sortie_chaine:   'Sorti chaîne',
    fin_retouche:    'Retouche terminée',
    entree_qualite:  'En contrôle qualité',
    a_retoucher:     'À retoucher',
    retour_retouche: 'Retour retouche',
    entree_finition: 'En finition',
    sortie_finition: 'Envoyé au Packing',
  }
  return map[action] || action
}

// ──────────────────────────────────────────
// Initialisation
// ──────────────────────────────────────────
function initScan(deptId, deptNom, actions) {
  // Ces variables sont utilisées dans les fonctions ci-dessus
  // Elles sont définies dans chaque page HTML
}


function formatTailles(piece) {
  if (Array.isArray(piece.tailles_quantites) && piece.tailles_quantites.length) {
    return piece.tailles_quantites.map((item) => `${item.taille}×${item.quantite}`).join(', ')
  }
  return piece.taille || '—'
}
