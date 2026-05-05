const SUPABASE_URL = window.SUPABASE_CONFIG?.url || window.SUPABASE_URL || 'https://VOTRE_URL.supabase.co'
const SUPABASE_KEY = window.SUPABASE_CONFIG?.anonKey || window.SUPABASE_KEY || 'VOTRE_ANON_KEY'

const { createClient } = supabase
const db = createClient(SUPABASE_URL, SUPABASE_KEY)

const TAILLES = ['T32','T34','T36','T38','T40','T42','T44','T46','T48','T50']
const CHAINES = ['CH1','CH2','CH3','CH4','CH5','CH6','CH7','CH8','CH9','CH10','CH11','CH12','CH14','CH15','CH16']

initialiserFormulaire()
verifierConfigSupabase()


function verifierConfigSupabase() {
  const msg = document.getElementById('msg')
  const configInvalide = SUPABASE_URL.includes('VOTRE_URL') || SUPABASE_KEY.includes('VOTRE_ANON_KEY')

  if (configInvalide) {
    msg.className = 'msg error'
    msg.textContent = 'Configuration Supabase manquante. Renseignez supabase-config.js (url + anonKey).'
  }
}

function initialiserFormulaire() {
  const select = document.getElementById('chaine')
  if (!select.options.length) {
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
  }

  const tailleGrid = document.getElementById('taille-grid')
  if (!tailleGrid.children.length) {
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

  const payloadComplet = {
    client,
    reference,
    designation,
    couleur: couleur || null,
    chaine_production: chaine,
    tailles_quantites: taillesQuantites,
    taille: tailleTexte,
    etat_actuel: 'créé'
  }

  let { data, error } = await db.from('produits').insert([payloadComplet]).select().single()

  if (error && String(error.message || '').includes("Could not find the 'chaine_production' column")) {
    const payloadLegacy = {
      client,
      reference,
      designation,
      couleur: couleur || null,
      taille: tailleTexte,
      etat_actuel: 'créé'
    }

    const retry = await db.from('produits').insert([payloadLegacy]).select().single()
    data = retry.data
    error = retry.error

    if (!error) {
      msg.className = 'msg error'
      msg.textContent = "Base non migrée: la pièce est créée sans chaîne/tailles structurées. Exécutez supabase/migration_produits.sql."
    }
  }

  if (error) {
    msg.className = 'msg error'
    if (String(error.message || '').toLowerCase().includes('invalid api key')) {
      msg.textContent = "Erreur Supabase: API key invalide. Vérifiez la clé anon dans app.js / SUPABASE_SETUP.md."
    } else {
      msg.textContent = 'Erreur : ' + error.message
    }
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
