const SUPABASE_URL = window.SUPABASE_CONFIG?.url || 'https://VOTRE_URL.supabase.co'
const SUPABASE_KEY = window.SUPABASE_CONFIG?.anonKey || 'VOTRE_ANON_KEY'

const { createClient } = supabase
const db = createClient(SUPABASE_URL, SUPABASE_KEY)

let operateurNom = ''
let pieceEnCours = null
let scannerActif = null

// ── ÉTAPE 1 — Opérateur ──
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

// ── ÉTAPE 2 — Scan caméra ──
function demarrerScan() {
  const reader  = document.getElementById('reader')
  const btnScan = document.getElementById('btn-scan')
  reader.style.display = 'block'
  btnScan.style.display = 'none'

  scannerActif = new Html5Qrcode('reader')
  scannerActif.start(
    { facingMode: 'environment' },
    { fps: 10, qrbox: { width: 250, height: 250 } },
    (texte) => {
      scannerActif.stop()
      reader.style.display = 'none'
      traiterQR(texte)
    },
    () => {}
  ).catch(() => {
    const msg = document.getElementById('msg-scan')
    msg.className = 'msg error'
    msg.textContent = 'Impossible d\'accéder à la caméra. Vérifiez les permissions.'
    reader.style.display = 'none'
    btnScan.style.display = 'block'
  })
}

// ── TRAITER QR ──
function traiterQR(texte) {
  try {
    const data = JSON.parse(texte)
    document.getElementById('input-id').value = data.id || texte.trim()
  } catch {
    document.getElementById('input-id').value = texte.trim()
  }
  rechercherPiece()
}

// ── RECHERCHE PIÈCE ──
async function rechercherPiece() {
  const id  = document.getElementById('input-id').value.trim()
  const msg = document.getElementById('msg-scan')

  if (!id) {
    msg.className = 'msg error'
    msg.textContent = 'Veuillez saisir ou scanner un ID.'
    return
  }

  msg.className = 'msg'
  msg.style.display = 'block'
  msg.textContent = 'Recherche en cours...'

  const { data: piece, error } = await db
    .from('produits')
    .select('*')
    .eq('id', id)
    .single()

  if (error || !piece) {
    msg.className = 'msg error'
    msg.textContent = '❌ Produit introuvable.'
    return
  }

  const { data: mouvements } = await db
    .from('mouvements')
    .select('*')
    .eq('produit_id', id)
    .order('created_at', { ascending: false })
    .limit(1)

  piece.dernierMouvement = mouvements?.[0] || null
  pieceEnCours = piece

  msg.className = 'msg'
  msg.style.display = 'none'
  afficherPiece(piece)
}

function escapeHtml(value) {
  return String(value ?? '')
    .replaceAll('&', '&amp;')
    .replaceAll('<', '&lt;')
    .replaceAll('>', '&gt;')
    .replaceAll('\"', '&quot;')
    .replaceAll("'", '&#39;')
}

// ── AFFICHER PIÈCE + ACTIONS ──
function afficherPiece(piece) {
  const dernierAction = piece.dernierMouvement?.action || 'creation'

  document.getElementById('piece-info').innerHTML = `
    <div class="piece-info-row">
      <span class="piece-info-key">Client</span>
      <span class="piece-info-val">${escapeHtml(piece.client)}</span>
    </div>
    <div class="piece-info-row">
      <span class="piece-info-key">Référence</span>
      <span class="piece-info-val">${escapeHtml(piece.reference)}</span>
    </div>
    <div class="piece-info-row">
      <span class="piece-info-key">Désignation</span>
      <span class="piece-info-val">${escapeHtml(piece.designation)}</span>
    </div>
    <div class="piece-info-row">
      <span class="piece-info-key">Couleur</span>
      <span class="piece-info-val">${escapeHtml(piece.couleur || '—')}</span>
    </div>
    <div class="piece-info-row">
      <span class="piece-info-key">Taille</span>
      <span class="piece-info-val">${escapeHtml(piece.taille || '—')}</span>
    </div>
    <div class="piece-info-row">
      <span class="piece-info-key">Chaîne</span>
      <span class="piece-info-val">${escapeHtml(piece.chaine_production || '—')}</span>
    </div>
    <div class="piece-info-row">
      <span class="piece-info-key">Statut</span>
      <span class="piece-info-val">
        <span class="piece-statut ${classeStatut(dernierAction)}">${escapeHtml(labelStatut(dernierAction))}</span>
      </span>
    </div>
  `

  const grid = document.getElementById('actions-grid')
  grid.innerHTML = ''

  ACTIONS.forEach(action => {
    const disponible = action.requis.includes(dernierAction)
    const btn = document.createElement('button')
    btn.className = `action-btn action-${action.style}`
    btn.disabled = !disponible
    btn.innerHTML = `
      <div class="action-btn-left">
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
@@ -173,54 +182,54 @@ async function effectuerAction(action) {
    msg.className = 'msg error'
    msg.textContent = '⚠️ Double scan détecté — action déjà enregistrée.'
    return
  }

  const { error } = await db.from('mouvements').insert([{
    produit_id:     pieceEnCours.id,
    departement_id: DEPT_ID,
    action:         action.id,
    operateur:      operateurNom
  }])

  if (error) {
    msg.className = 'msg error'
    msg.textContent = 'Erreur : ' + error.message
    return
  }

  await db.from('produits')
    .update({ etat_actuel: action.id })
    .eq('id', pieceEnCours.id)

  afficher('card-piece', false)
  document.getElementById('confirm-title').textContent = action.label + ' enregistré'
  document.getElementById('confirm-sub').innerHTML = `
    <strong>${escapeHtml(pieceEnCours.reference)}</strong><br>
    ${escapeHtml(pieceEnCours.designation)} · ${escapeHtml(pieceEnCours.taille || '')} · ${escapeHtml(pieceEnCours.couleur || '')}<br>
    ${pieceEnCours.chaine_production ? `Chaîne ${escapeHtml(pieceEnCours.chaine_production)}<br>` : ''}
    <br>Par ${escapeHtml(operateurNom)} · ${escapeHtml(DEPT_NOM)}
  `
  afficher('card-confirm', true)
}

// ── NOUVEAU SCAN ──
function nouveauScan() {
  pieceEnCours = null
  document.getElementById('input-id').value = ''
  const msgScan = document.getElementById('msg-scan')
  msgScan.className = 'msg'
  msgScan.style.display = 'none'
  document.getElementById('btn-scan').style.display = 'block'
  document.getElementById('reader').style.display = 'none'
  afficher('card-confirm', false)
  afficher('card-piece',   false)
  afficher('card-scan',    true)
}

// ── HELPERS ──
function afficher(id, visible) {
  document.getElementById(id).style.display = visible ? 'block' : 'none'
}

// ── STATUTS ──
function classeStatut(action) {
  const map = {
    creation:        'statut-cree',
    sortie_chaine:   'statut-en-cours',
    fin_retouche:    'statut-en-cours',
    entree_qualite:  'statut-en-cours',
    sortie_qualite:  'statut-conforme',
    a_retoucher:     'statut-retouche',
    retour_retouche: 'statut-retouche',
    entree_finition: 'statut-en-cours',
    sortie_packing:  'statut-packing',
  }
  return map[action] || 'statut-cree'
}

function labelStatut(action) {
  const map = {
    creation:        'Créé — En attente atelier',
    sortie_chaine:   'S1 — Sorti chaîne',
    fin_retouche:    'S1b — Retouche terminée',
    entree_qualite:  'S2 — Entré en qualité',
    sortie_qualite:  'S3 — Conforme — Qualité OK',
    a_retoucher:     'S3b — À retoucher',
    retour_retouche: 'Retour retouche',
    entree_finition: 'S4 — Entré en finition',
    sortie_packing:  'S5 — Envoyé au Packing ✓',
  }
  return map[action] || action
}
