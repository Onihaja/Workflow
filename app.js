// ⚠️ REMPLACEZ PAR VOS VALEURS SUPABASE
const SUPABASE_URL = 'https://VOTRE_URL.supabase.co'
const SUPABASE_KEY = 'VOTRE_ANON_KEY'

const { createClient } = supabase
const db = createClient(SUPABASE_URL, SUPABASE_KEY)

async function creerPiece() {
  const client      = document.getElementById('client').value.trim()
  const reference   = document.getElementById('reference').value.trim()
  const designation = document.getElementById('designation').value.trim()
  const couleur     = document.getElementById('couleur').value.trim()
  const taille      = document.getElementById('taille').value.trim()
  const msg         = document.getElementById('msg')

  // Validation
  if (!client || !reference || !designation) {
    msg.className = 'msg error'
    msg.textContent = 'Client, référence et désignation sont obligatoires.'
    return
  }

  // Enregistrement dans Supabase
  const { data, error } = await db.from('produits').insert([{
    client,
    reference,
    designation,
    couleur:     couleur || null,
    taille:      taille  || null,
    etat_actuel: 'créé'
  }]).select().single()

  if (error) {
    msg.className = 'msg error'
    msg.textContent = error.code === '23505'
      ? 'Cette référence existe déjà.'
      : 'Erreur : ' + error.message
    return
  }

  // Enregistrer le mouvement initial
  await db.from('mouvements').insert([{
    produit_id:     data.id,
    departement_id: 1,
    action:         'creation'
  }])

  msg.className = 'msg success'
  msg.textContent = 'Pièce créée avec succès.'

  genererQR(data)
}

function genererQR(piece) {
  const contenu = JSON.stringify({
    id:          piece.id,
    client:      piece.client,
    reference:   piece.reference,
    designation: piece.designation,
    couleur:     piece.couleur || '-',
    taille:      piece.taille  || '-'
  })

  const qrBox  = document.getElementById('qr-box')
  const qrInfo = document.getElementById('qr-info')
  const qrCard = document.getElementById('qr-card')

  qrBox.innerHTML = ''
  new QRCode(qrBox, {
    text: contenu,
    width: 220,
    height: 220,
    colorDark: '#1a1a1a',
    colorLight: '#ffffff',
  })

  qrInfo.innerHTML = `
    <div><strong>Client</strong> &nbsp; ${piece.client}</div>
    <div><strong>Réf</strong> &nbsp; ${piece.reference}</div>
    <div><strong>Désignation</strong> &nbsp; ${piece.designation}</div>
    <div><strong>Couleur</strong> &nbsp; ${piece.couleur || '—'}</div>
    <div><strong>Taille</strong> &nbsp; ${piece.taille || '—'}</div>
    <div class="qr-id">ID : ${piece.id}</div>
  `

  qrCard.style.display = 'block'
  qrCard.scrollIntoView({ behavior: 'smooth' })
}
