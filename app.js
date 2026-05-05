const SUPABASE_URL = 'https://rvjjdehrbbxlndaydscb.supabase.co'
const SUPABASE_KEY = 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6InJ2ampkZWhyYmJ4bG5kYXlkc2NiIiwicm9sZSI6ImFub24iLCJpYXQiOjE3Nzc4NzI5NDMsImV4cCI6MjA5MzQ0ODk0M30.47jN0OxtNqMdQBxei8yajtDrd_KrBfwaf2SNaFMJFX8'

const { createClient } = supabase
const db = createClient(SUPABASE_URL, SUPABASE_KEY)

const TAILLES = ['T32','T34','T36','T38','T40','T42','T44','T46','T48','T50']
const CHAINES = ['CH1','CH2','CH3','CH4','CH5','CH6','CH7','CH8','CH9','CH10','CH11','CH12','CH14','CH15','CH16']

initialiserFormulaire()

function initialiserFormulaire() {
  const select = document.getElementById('chaine')
  const placeholder = document.createElement('option')
  placeholder.value = ''
  placeholder.textContent = 'Sélectionner une chaîne'
  placeholder.disabled = true
  placeholder.selected = true
  select.appendChild(placeholder)

  CHAINES.forEach((chaine) => {
    const option = document.createElement('option')
    option.value = chaine
    option.textContent = chaine
    select.appendChild(option)
  })

  const tailleGrid = document.getElementById('taille-grid')
  TAILLES.forEach((taille) => {
    const row = document.createElement('div')
    row.className = 'taille-row'
    row.innerHTML = `
      <label class="taille-label" for="qte-${taille}">${taille}</label>
      <input id="qte-${taille}" type="number" min="0" value="0" class="taille-input">
    `
    tailleGrid.appendChild(row)
  })
}

function recupererTaillesQuantites() {
  return TAILLES.map((taille) => ({
    taille,
    quantite: Number(document.getElementById(`qte-${taille}`).value || 0)
  })).filter((item) => Number.isInteger(item.quantite) && item.quantite > 0)
}

async function creerPiece() {
  const client      = document.getElementById('client').value.trim()
  const reference   = document.getElementById('reference').value.trim()
  const designation = document.getElementById('designation').value.trim()
  const couleur     = document.getElementById('couleur').value.trim()
  const chaine      = document.getElementById('chaine').value
  const taillesQuantites = recupererTaillesQuantites()
  const msg = document.getElementById('msg')

  if (!client || !reference || !designation || !chaine) {
    msg.className = 'msg error'
    msg.textContent = 'Client, référence, désignation et chaîne sont obligatoires.'
    return
  }

  if (!taillesQuantites.length) {
    msg.className = 'msg error'
    msg.textContent = 'Ajoutez au moins une taille avec une quantité entière > 0.'
    return
  }

  const tailleTexte = taillesQuantites.map((item) => `${item.taille}×${item.quantite}`).join(', ')

  const { data, error } = await db.from('produits').insert([{
    client,
    reference,
    designation,
    couleur: couleur || null,
    chaine_production: chaine,
    tailles_quantites: taillesQuantites,
    taille: tailleTexte,
    etat_actuel: 'créé'
  }]).select().single()

  if (error) {
    msg.className = 'msg error'
    msg.textContent = 'Erreur : ' + error.message
    return
  }

  await db.from('mouvements').insert([{ produit_id: data.id, departement_id: 1, action: 'creation' }])

  msg.className = 'msg success'
  msg.textContent = 'Pièce créée avec succès.'
  genererQR(data)
}

function genererQR(piece) {
  const contenu = JSON.stringify({
    id: piece.id,
    reference: piece.reference,
    chaine_production: piece.chaine_production,
    tailles_quantites: piece.tailles_quantites
  })

  const qrBox = document.getElementById('qr-box')
  const qrInfo = document.getElementById('qr-info')
  const qrCard = document.getElementById('qr-card')

  qrBox.innerHTML = ''
  new QRCode(qrBox, { text: contenu, width: 220, height: 220, colorDark: '#1a1a1a', colorLight: '#ffffff' })

  const taillesText = (piece.tailles_quantites || [])
    .map((item) => `${item.taille}×${item.quantite}`)
    .join(', ')

  qrInfo.innerHTML = `
    <div><strong>Client</strong> &nbsp; ${piece.client}</div>
    <div><strong>Réf</strong> &nbsp; ${piece.reference}</div>
    <div><strong>Chaîne</strong> &nbsp; ${piece.chaine_production || '—'}</div>
    <div><strong>Tailles</strong> &nbsp; ${taillesText || '—'}</div>
    <div class="qr-id">ID : ${piece.id}</div>
  `

  qrCard.style.display = 'block'
}
