const SUPABASE_URL = 'https://rvjjdehrbbxlndaydscb.supabase.co'
const SUPABASE_KEY = '...'

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