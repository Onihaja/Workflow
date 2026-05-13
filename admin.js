// ════════════════════════════════════════
// ADMIN.JS — Logique page Administration
// ════════════════════════════════════════

const SUPABASE_URL = window.SUPABASE_CONFIG?.url
const SUPABASE_KEY = window.SUPABASE_CONFIG?.anonKey
const { createClient } = supabase
const db = createClient(SUPABASE_URL, SUPABASE_KEY)

// ── CHARGER LES UTILISATEURS ──
async function chargerUtilisateurs() {
  const { data: profiles, error } = await db
    .from('profiles')
    .select('*')
    .order('created_at', { ascending: false })

  const container = document.getElementById('users-container')

  if (error || !profiles?.length) {
    container.innerHTML = '<div class="empty-state">Aucun utilisateur trouvé.</div>'
    return
  }

  const table = document.createElement('table')
  table.className = 'users-table'
  table.innerHTML = `
    <thead>
      <tr>
        <th>Nom</th>
        <th>Rôle</th>
        <th>Créé le</th>
        <th></th>
      </tr>
    </thead>
    <tbody></tbody>
  `

  const tbody = table.querySelector('tbody')

  profiles.forEach(p => {
    const tr = document.createElement('tr')
    tr.innerHTML = `
      <td><strong>${p.nom}</strong></td>
      <td><span class="role-badge role-${p.role}">${labelRole(p.role)}</span></td>
      <td style="color:#aaa;font-size:12px">${new Date(p.created_at).toLocaleDateString('fr-FR')}</td>
      <td>
        ${p.role !== 'admin'
          ? `<button class="btn-danger" onclick="supprimerCompte('${p.id}', '${p.nom}')">Supprimer</button>`
          : '<span style="font-size:11px;color:#ccc">—</span>'
        }
      </td>
    `
    tbody.appendChild(tr)
  })

  container.innerHTML = ''
  container.appendChild(table)
}

// ── CRÉER UN COMPTE ──
async function creerCompte() {
  const nom      = document.getElementById('new-nom').value.trim()
  const email    = document.getElementById('new-email').value.trim()
  const password = document.getElementById('new-password').value
  const role     = document.getElementById('new-role').value

  if (!nom || !email || !password || !role) {
    afficherMsg('msg-create', 'error', 'Tous les champs sont obligatoires.')
    return
  }

  if (password.length < 8) {
    afficherMsg('msg-create', 'error', 'Le mot de passe doit contenir au moins 8 caractères.')
    return
  }

  const btn = document.getElementById('btn-creer-compte')
  btn.disabled = true
  btn.textContent = 'Création...'

  // signUp fonctionne avec la clé anon (pas besoin de service_role)
  const { data, error } = await db.auth.signUp({ email, password })

  if (error) {
    btn.disabled = false
    btn.textContent = 'Créer le compte'
    afficherMsg('msg-create', 'error', 'Erreur : ' + error.message)
    return
  }

  if (!data.user) {
    btn.disabled = false
    btn.textContent = 'Créer le compte'
    afficherMsg('msg-create', 'error', 'Compte déjà existant ou email invalide.')
    return
  }

  // Insérer le profil
  const { error: profileError } = await db.from('profiles').insert([{
    id:   data.user.id,
    nom,
    role
  }])

  btn.disabled = false
  btn.textContent = 'Créer le compte'

  if (profileError) {
    afficherMsg('msg-create', 'error', 'Compte créé mais erreur profil : ' + profileError.message)
    return
  }

  afficherMsg('msg-create', 'success', `✓ Compte de ${nom} créé avec succès.`)

  // Reset formulaire
  document.getElementById('new-nom').value      = ''
  document.getElementById('new-email').value    = ''
  document.getElementById('new-password').value = ''
  document.getElementById('new-role').value     = ''

  chargerUtilisateurs()
}

// ── SUPPRIMER UN COMPTE ──
async function supprimerCompte(id, nom) {
  if (!confirm(`Supprimer le compte de ${nom} ?`)) return

  const { error } = await db.from('profiles').delete().eq('id', id)

  if (error) {
    alert('Erreur lors de la suppression : ' + error.message)
    return
  }

  chargerUtilisateurs()
}

// ── HELPERS ──
function labelRole(role) {
  const map = {
    admin:       'Admin',
    it:          'Dept. IT',
    superviseur: 'Superviseur'
  }
  return map[role] || role
}

function afficherMsg(id, type, texte) {
  const el = document.getElementById(id)
  el.className = `msg ${type}`
  el.textContent = texte
}

// ── INIT ──
chargerUtilisateurs()
