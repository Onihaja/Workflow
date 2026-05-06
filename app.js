const SUPABASE_URL = window.SUPABASE_CONFIG?.url || 'https://VOTRE_URL.supabase.co'
const SUPABASE_KEY = window.SUPABASE_CONFIG?.anonKey || 'VOTRE_ANON_KEY'

const { createClient } = supabase
const db = createClient(SUPABASE_URL, SUPABASE_KEY)

const TAILLES = ['T32','T34','T36','T38','T40','T42','T44','T46','T48','T50']
const CHAINES = ['CH1','CH2','CH3','CH4','CH5','CH6','CH7','CH8','CH9','CH10','CH11','CH12','CH14','CH15','CH16']

// ── INIT ──
window.addEventListener('DOMContentLoaded', () => {
  document.getElementById('btn-generer-qr')
    ?.addEventListener('click', (e) => { e.preventDefault(); creerPieces() })
})

// ── RÉCUPÉRER TAILLES/QUANTITÉS ──
function recupererTaillesQuantites() {
  return TAILLES
    .map(t => ({ taille: t, quantite: parseInt(document.getElementById(`qte-${t}`)?.value || 0) }))
    .filter(item => item.quantite > 0)
}

function escapeHtml(value) {
  return String(value ?? '')
    .replaceAll('&', '&amp;')
    .replaceAll('<', '&lt;')
    .replaceAll('>', '&gt;')
    .replaceAll('\"', '&quot;')
    .replaceAll("'", '&#39;')
}

// ── CRÉATION — UN PRODUIT PAR PIÈCE INDIVIDUELLE ──
async function creerPieces() {
  const client      = document.getElementById('client').value.trim()
  const reference   = document.getElementById('reference').value.trim()
  const designation = document.getElementById('designation').value.trim()
  const couleur     = document.getElementById('couleur').value.trim()
  const chaine      = document.getElementById('chaine').value
  const taillesQty  = recupererTaillesQuantites()

  // Validations
  if (!client || !reference || !designation || !chaine) {
    afficherMsg('error', 'Client, référence, désignation et chaîne sont obligatoires.')
    return
  }
  if (!taillesQty.length) {
    afficherMsg('error', 'Ajoutez au moins une taille avec une quantité > 0.')
    return
  }

  const totalPieces = taillesQty.reduce((sum, item) => sum + item.quantite, 0)
  const btn = document.getElementById('btn-generer-qr')
  btn.disabled = true
  btn.textContent = `Création de ${totalPieces} pièce(s)...`
  afficherMsg('', '')

  const produitsPayload = []
  for (const { taille, quantite } of taillesQty) {
    for (let i = 0; i < quantite; i++) {
      produitsPayload.push({
        client,
        reference,
        designation,
        couleur:           couleur || null,
        taille,
        chaine_production: chaine,
        etat_actuel:       'creation'
      })
    }
  }

  try {
    const { data: piecesCreees, error: errorProduits } = await db
      .from('produits')
      .insert(produitsPayload)
      .select()

    if (errorProduits) throw new Error(errorProduits.message)

    const mouvementsPayload = piecesCreees.map((piece) => ({
      produit_id:     piece.id,
      departement_id: 1,
      action:         'creation',
      operateur:      'Coupe'
    }))

    const { error: errorMouvements } = await db.from('mouvements').insert(mouvementsPayload)
    if (errorMouvements) throw new Error(errorMouvements.message)

    afficherMsg('success', `✓ ${piecesCreees.length} pièce(s) créée(s).`)
    afficherQRCodes(piecesCreees, { client, reference, designation, couleur, chaine })

  } catch (e) {
    afficherMsg('error', 'Erreur : ' + e.message)
  } finally {
    btn.disabled = false
    btn.textContent = 'Générer les QR codes'
  }
}

// ── AFFICHER LES QR CODES ──
function afficherQRCodes(pieces, meta) {
  const qrCard = document.getElementById('qr-card')
  const qrBox  = document.getElementById('qr-box')
  const qrInfo = document.getElementById('qr-info')

  qrBox.innerHTML = ''

  const taillesResume = [...new Set(pieces.map(p => p.taille))]
    .map(t => `${t}×${pieces.filter(p => p.taille === t).length}`)
    .join(', ')

  qrInfo.innerHTML = `
    <div><strong>Client</strong> &nbsp; ${escapeHtml(meta.client)}</div>
    <div><strong>Réf</strong> &nbsp; ${escapeHtml(meta.reference)}</div>
    <div><strong>Désignation</strong> &nbsp; ${escapeHtml(meta.designation)}</div>
    ${meta.couleur ? `<div><strong>Couleur</strong> &nbsp; ${escapeHtml(meta.couleur)}</div>` : ''}
    <div><strong>Chaîne</strong> &nbsp; ${escapeHtml(meta.chaine)}</div>
    <div><strong>Tailles</strong> &nbsp; ${escapeHtml(taillesResume)}</div>
    <div class="qr-id">Total : ${pieces.length} QR codes</div>
  `

  const grid = document.createElement('div')
  grid.className = 'qr-print-grid'

  pieces.forEach((piece, idx) => {
    const cell = document.createElement('div')
    cell.className = 'qr-cell'
    cell.innerHTML = `
      <div class="qr-canvas" id="qr-canvas-${piece.id}"></div>
      <div class="qr-cell-ref">${escapeHtml(piece.reference)}</div>
      <div class="qr-cell-detail">${escapeHtml(piece.taille)} · ${escapeHtml(meta.chaine)}</div>
      ${meta.couleur ? `<div class="qr-cell-detail">${escapeHtml(meta.couleur)}</div>` : ''}
      <div class="qr-cell-client">${escapeHtml(piece.client)}</div>
      <div class="qr-cell-id">#${piece.id}</div>
    `
    grid.appendChild(cell)

    setTimeout(() => {
      new QRCode(document.getElementById(`qr-canvas-${piece.id}`), {
        text:       String(piece.id),
        width:      120,
        height:     120,
        colorDark:  '#1a1a1a',
        colorLight: '#ffffff'
      })
    }, idx * 20)
  })

  qrBox.appendChild(grid)
  qrCard.style.display = 'block'
  qrCard.scrollIntoView({ behavior: 'smooth' })
}

function afficherMsg(type, texte) {
  const msg = document.getElementById('msg')
  msg.className = type ? `msg ${type}` : 'msg'
  msg.textContent = texte
}
