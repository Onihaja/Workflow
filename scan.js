// ──────────────────────────────────────────
// db — lu au moment de l'utilisation
// ──────────────────────────────────────────
function getDb() { return window.db }

// ──────────────────────────────────────────
// Variables globales
// ──────────────────────────────────────────
let operateurNom  = ''
let pieceEnCours  = null
let scannerActif  = null
let actionEnCours = false

let DEPT_ID  = null
let DEPT_NOM = ''
let ACTIONS  = []

// ──────────────────────────────────────────
// ÉTAPE 1 — Valider opérateur
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
// ÉTAPE 2 — Scan caméra
// ──────────────────────────────────────────
function demarrerScan() {
  const reader  = document.getElementById('reader')
  const btnScan = document.getElementById('btn-scan')

  reader.style.display  = 'block'
  btnScan.style.display = 'none'

  scannerActif = new Html5Qrcode('reader')

  scannerActif.start(
    { facingMode: 'environment' },
    { fps: 10, qrbox: { width: 250, height: 250 } },
    (texte) => {
      scannerActif.stop()
        .then(()  => { reader.style.display = 'none'; traiterQR(texte) })
        .catch(() => { reader.style.display = 'none'; traiterQR(texte) })
    },
    () => {}
  ).catch(() => {
    afficherMsgScan('error', 'Impossible d\'accéder à la caméra.')
    reader.style.display  = 'none'
    btnScan.style.display = 'block'
  })
}

// ──────────────────────────────────────────
// Traitement résultat QR
// ──────────────────────────────────────────
function traiterQR(texte) {
  try {
    const data = JSON.parse(texte)
    if (data.id) {
      document.getElementById('input-id').value = data.id
      rechercherPiece()
      return
    }
  } catch {}

  document.getElementById('input-id').value = texte.trim()
  rechercherPiece()
}

// ──────────────────────────────────────────
// Recherche produit
// ──────────────────────────────────────────
async function rechercherPiece() {
  const id  = document.getElementById('input-id').value.trim()
  const msg = document.getElementById('msg-scan')

  if (!id) {
    afficherMsgScan('error', 'Veuillez saisir un ID.')
    return
  }

  msg.className    = 'msg'
  msg.style.display = 'block'
  msg.textContent  = 'Recherche en cours...'

  const { data: piece, error } = await getDb()
    .from('produits')
    .select('*')
    .eq('id', id)
    .single()

  if (error || !piece) {
    afficherMsgScan('error', '❌ Produit introuvable.')
    return
  }

  const { data: mouvements } = await getDb()
    .from('mouvements')
    .select('*')
    .eq('produit_id', id)
    .order('created_at', { ascending: false })
    .limit(1)

  piece.dernierMouvement = mouvements?.[0] || null
  pieceEnCours = piece

  msg.style.display = 'none'
  afficherPiece(piece)
}

// ──────────────────────────────────────────
// Affichage pièce + actions disponibles
// ──────────────────────────────────────────
function afficherPiece(piece) {
  const dernierAction = piece.dernierMouvement?.action || 'creation'

  document.getElementById('piece-info').innerHTML = `
    <div class="piece-info-row">
      <span class="piece-info-key">Client</span>
      <span class="piece-info-val">${piece.client || '—'}</span>
    </div>
    <div class="piece-info-row">
      <span class="piece-info-key">Référence</span>
      <span class="piece-info-val">${piece.reference || '—'}</span>
    </div>
    <div class="piece-info-row">
      <span class="piece-info-key">Désignation</span>
      <span class="piece-info-val">${piece.designation || '—'}</span>
    </div>
    <div class="piece-info-row">
      <span class="piece-info-key">Couleur</span>
      <span class="piece-info-val">${piece.couleur || '—'}</span>
    </div>
    <div class="piece-info-row">
      <span class="piece-info-key">Taille</span>
      <span class="piece-info-val">${piece.taille || '—'}</span>
    </div>
    <div class="piece-info-row">
      <span class="piece-info-key">Statut actuel</span>
      <span class="piece-info-val">
        <span class="piece-statut ${classeStatut(dernierAction)}">
          ${labelStatut(dernierAction)}
        </span>
      </span>
    </div>
  `

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
    if (disponible) btn.onclick = () => effectuerAction(action)
    grid.appendChild(btn)
  })

  afficher('card-scan', false)
  afficher('card-piece', true)
}

// ──────────────────────────────────────────
// Enregistrer action
// ──────────────────────────────────────────
async function effectuerAction(action) {
  if (actionEnCours) return
  actionEnCours = true

  const msg = document.getElementById('msg-action')
  msg.className    = 'msg'
  msg.style.display = 'block'
  msg.textContent  = 'Enregistrement...'

  try {
    const dernierAction = pieceEnCours.dernierMouvement?.action || 'creation'

    if (dernierAction === action.id) {
      msg.className   = 'msg error'
      msg.textContent = '⚠️ Double scan détecté.'
      return
    }

    const { error } = await getDb()
      .from('mouvements')
      .insert([{
        produit_id:     pieceEnCours.id,
        departement_id: DEPT_ID,
        action:         action.id,
        operateur:      operateurNom,
        jour:           new Date().toISOString().slice(0, 10)
      }])

    if (error) {
      msg.className   = 'msg error'
      msg.textContent = error.code === '23505'
        ? '⚠️ Ce scan vient d\'être enregistré par un autre opérateur.'
        : 'Erreur : ' + error.message
      return
    }

    await getDb()
      .from('produits')
      .update({ etat_actuel: action.id })
      .eq('id', pieceEnCours.id)

    afficher('card-piece', false)

    document.getElementById('confirm-title').textContent =
      action.label + ' enregistré'

    document.getElementById('confirm-sub').innerHTML = `
      <strong>${pieceEnCours.reference}</strong><br>
      ${pieceEnCours.designation || ''}<br><br>
      ${operateurNom} · ${DEPT_NOM}
    `

    afficher('card-confirm', true)

  } finally {
    actionEnCours = false
  }
}

// ──────────────────────────────────────────
// Nouveau scan
// ──────────────────────────────────────────
function nouveauScan() {
  pieceEnCours = null
  document.getElementById('input-id').value     = ''
  document.getElementById('msg-scan').style.display = 'none'
  document.getElementById('btn-scan').style.display = 'block'
  document.getElementById('reader').style.display   = 'none'
  afficher('card-confirm', false)
  afficher('card-piece',   false)
  afficher('card-scan',    true)
}

// ──────────────────────────────────────────
// Helpers
// ──────────────────────────────────────────
function afficher(id, visible) {
  document.getElementById(id).style.display = visible ? 'block' : 'none'
}

function afficherMsgScan(type, texte) {
  const msg = document.getElementById('msg-scan')
  msg.className    = 'msg ' + type
  msg.style.display = 'block'
  msg.textContent  = texte
}

function classeStatut(action) {
  const map = {
    creation:        'statut-cree',
    sortie_chaine:   'statut-en-cours',
    fin_retouche:    'statut-retouche',
    entree_qualite:  'statut-en-cours',
    sortie_qualite:  'statut-conforme',
    entree_finition: 'statut-en-cours',
    sortie_finition: 'statut-packing',
    a_retoucher:     'statut-retouche'
  }
  return map[action] || 'statut-cree'
}

function labelStatut(action) {
  const map = {
    creation:        'Créé',
    sortie_chaine:   'Sortie chaîne',
    fin_retouche:    'Fin retouche',
    entree_qualite:  'Entrée qualité',
    sortie_qualite:  'Sortie qualité',
    entree_finition: 'Entrée finition',
    sortie_finition: 'Packing',
    a_retoucher:     'À retoucher'
  }
  return map[action] || action
}

// ──────────────────────────────────────────
// Initialisation
// ──────────────────────────────────────────
function initScan(deptId, deptNom, actions) {
  DEPT_ID  = deptId
  DEPT_NOM = deptNom
  ACTIONS  = actions
}
