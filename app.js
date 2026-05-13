const SUPABASE_URL = window.SUPABASE_CONFIG?.url || 'https://VOTRE_URL.supabase.co'
const SUPABASE_KEY = window.SUPABASE_CONFIG?.anonKey || 'VOTRE_ANON_KEY'

const { createClient } = supabase
const db = createClient(SUPABASE_URL, SUPABASE_KEY)

const TAILLES = ['T32','T34','T36','T38','T40','T42','T44','T46','T48','T50']

// Pièces de la dernière commande (pour impression)
let dernierePieces = []
let dernieresMeta  = {}

// ── RÉCUPÉRER TAILLES/QUANTITÉS ──
function recupererTaillesQuantites() {
  return TAILLES
    .map(t => ({ taille: t, quantite: parseInt(document.getElementById(`qte-${t}`)?.value || 0) }))
    .filter(item => item.quantite > 0)
}

// ── CRÉATION PIÈCES ──
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

  const piecesCreees = []

  try {
    // Une entrée par pièce individuelle
    for (const { taille, quantite } of taillesQty) {
      for (let i = 0; i < quantite; i++) {
        const { data, error } = await db.from('produits').insert([{
          client,
          reference,
          designation,
          couleur:           couleur || null,
          taille,
          chaine_production: chaine,
          etat_actuel:       'creation'
        }]).select().single()

        if (error) throw new Error(error.message)

        await db.from('mouvements').insert([{
          produit_id:     data.id,
          departement_id: 1,
          action:         'creation',
          operateur:      'Coupe'
        }])

        piecesCreees.push(data)
      }
    }

    // Sauvegarder pour impression
    dernierePieces = piecesCreees
    dernieresMeta  = { client, reference, designation, couleur, chaine, taillesQty, totalPieces }

    // Afficher confirmation (sans QR)
    afficherConfirmation(piecesCreees, dernieresMeta)

  } catch (e) {
    afficherMsg('error', 'Erreur : ' + e.message)
    btn.disabled = false
    btn.textContent = 'Générer les QR codes'
  }
}

// ── AFFICHER CONFIRMATION ──
function afficherConfirmation(pieces, meta) {
  const grid = document.getElementById('resume-grid')

  // Résumé tailles
  const taillesTexte = meta.taillesQty
    .map(t => `${t.taille} × ${t.quantite}`)
    .join('  |  ')

  // IDs générés
  const idsTexte = pieces.map(p => `#${p.id}`).join('  ')

  grid.innerHTML = `
    <div class="resume-row">
      <span class="resume-key">Client</span>
      <span class="resume-val">${meta.client}</span>
    </div>
    <div class="resume-row">
      <span class="resume-key">Référence</span>
      <span class="resume-val">${meta.reference}</span>
    </div>
    <div class="resume-row">
      <span class="resume-key">Désignation</span>
      <span class="resume-val">${meta.designation}</span>
    </div>
    <div class="resume-row">
      <span class="resume-key">Couleur</span>
      <span class="resume-val">${meta.couleur || '—'}</span>
    </div>
    <div class="resume-row" style="grid-column:1/-1">
      <span class="resume-key">Chaîne</span>
      <span class="resume-val">${labelChaine(meta.chaine)}</span>
    </div>
    <div class="tailles-resume">
      <strong style="font-size:10px;letter-spacing:2px;text-transform:uppercase;color:#aaa">Tailles</strong><br>
      ${taillesTexte}
    </div>
    <div class="resume-total">
      <span class="resume-total-label">Total QR codes créés</span>
      <span class="resume-total-val">${meta.totalPieces}</span>
    </div>
    <div class="ids-liste">
      <strong style="font-size:10px;letter-spacing:1px;color:#aaa;display:block;margin-bottom:4px">IDs générés</strong>
      ${idsTexte}
    </div>
  `

  document.getElementById('card-form').style.display = 'none'
  document.getElementById('card-confirm').style.display = 'block'
  document.getElementById('card-confirm').scrollIntoView({ behavior: 'smooth' })
}

function imprimerQR() {
  const printZone = document.getElementById('print-zone')
  printZone.innerHTML = ''
  const NB_PAR_PAGE = 9
  const NB_LIGNES = 10

  // Création des pages
  for (let i = 0; i < dernierePieces.length; i += NB_PAR_PAGE) {
    const page = document.createElement('div')
    page.className = 'print-page'
    const grid = document.createElement('div')
    grid.className = 'print-grid'
    const morceaux = dernierePieces.slice(i, i + NB_PAR_PAGE)
    morceaux.forEach((piece) => {
      const lignes = Array(NB_LIGNES)
        .fill('<div class="print-dot-line"></div>')
        .join('')

      const cell = document.createElement('div')
      cell.className = 'print-cell'
      cell.innerHTML = `
        <div class="print-cell-top">
          <div class="print-cell-infos">
            <p><span class="lbl">Client: </span>${piece.client}</p>
            <p><span class="lbl">Réf: </span>${piece.reference}</p>
            <p><span class="lbl">Couleur: </span>${piece.couleur || '—'}</p>
            <p><span class="lbl">Taille: </span>${piece.taille}</p>
            <div class="print-cell-code">ID: ${piece.id.slice(0, 8)}</div>
          </div>

          <div class="print-cell-qr" id="print-qr-${piece.id}"></div>
        </div>

        <div class="print-cell-lines">
          ${lignes}
        </div>
      `
      grid.appendChild(cell)
    })
    page.appendChild(grid)
    printZone.appendChild(page)
  }

  // Générer QR
  dernierePieces.forEach((piece, idx) => {

    setTimeout(() => {

      const el = document.getElementById(`print-qr-${piece.id}`)

      if (el) {

        new QRCode(el, {
          text: String(piece.id),
          width: 84,
          height: 84,
          colorDark: '#000000',
          colorLight: '#ffffff'
        })

      }

    }, idx * 20)

  })

  printZone.style.display = 'block'

  setTimeout(() => {

    window.print()

    setTimeout(() => {
      printZone.style.display = 'none'
    }, 1000)

  }, 2000)
}

// ── NOUVELLE COMMANDE ──
function nouvelleCommande() {
  dernierePieces = []
  dernieresMeta  = {}

  document.getElementById('client').value      = ''
  document.getElementById('reference').value   = ''
  document.getElementById('designation').value = ''
  document.getElementById('couleur').value     = ''
  document.getElementById('chaine').value      = ''

  TAILLES.forEach(t => {
    const el = document.getElementById(`qte-${t}`)
    if (el) el.value = 0
  })

  const btn = document.getElementById('btn-generer-qr')
  btn.disabled = false
  btn.textContent = 'Générer les QR codes'

  document.getElementById('card-confirm').style.display = 'none'
  document.getElementById('card-form').style.display = 'block'
  document.getElementById('msg').className = 'msg'
  document.getElementById('print-zone').innerHTML = ''

  window.scrollTo({ top: 0, behavior: 'smooth' })
}

// ── HELPERS ──
function afficherMsg(type, texte) {
  const msg = document.getElementById('msg')
  msg.className = type ? `msg ${type}` : 'msg'
  msg.textContent = texte
}

function labelChaine(chaine) {
  const map = {
    'BRODERIE_MACHINE': 'Broderie Machine',
    'HVA':              'Haute Valeur Ajoutée',
    'BRODERIE_MAIN':    'Broderie Main'
  }
  return map[chaine] || chaine
}

window.creerPieces    = creerPieces
window.imprimerQR     = imprimerQR
window.nouvelleCommande = nouvelleCommande

async function chargerSuggestions(){

  const refList = document.getElementById('references-list')
  const clientList = document.getElementById('clients-list')

  if(!refList || !clientList) return

  // références récentes
  const { data: refs } = await db
    .from('produits')
    .select('reference, created_at')
    .not('reference', 'is', null)
    .order('created_at', { ascending:false })
    .limit(200)

  // clients récents
  const { data: clients } = await db
    .from('produits')
    .select('client, created_at')
    .not('client', 'is', null)
    .order('created_at', { ascending:false })
    .limit(500)

  // références uniques
  const refsUniques = [
    ...new Set(
      (refs || [])
        .map(r => r.reference)
        .filter(Boolean)
    )
  ]

  // clients uniques
  const clientsUniques = [
    ...new Set(
      (clients || [])
        .map(c => c.client)
        .filter(Boolean)
    )
  ]

  // injecter références
  refList.innerHTML = refsUniques
    .map(ref => `<option value="${ref}">`)
    .join('')

  // injecter clients
  clientList.innerHTML = clientsUniques
    .map(c => `<option value="${c}">`)
    .join('')
}

window.addEventListener('DOMContentLoaded', () => {

  if(document.getElementById('references-list')){
    chargerSuggestions()
  }

})

