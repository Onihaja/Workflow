// ══════════════════════════════════════════
// auth.js — Authentification AKANJO
// À inclure sur toutes les pages protégées
// ══════════════════════════════════════════

;(async function () {
  const SUPABASE_URL = window.SUPABASE_CONFIG?.url
  const SUPABASE_KEY = window.SUPABASE_CONFIG?.anonKey
  const { createClient } = supabase
  const db = createClient(SUPABASE_URL, SUPABASE_KEY)

  // Pages libres (pas de vérification auth)
  const PAGES_LIBRES = ['dashboard.html', 'index.html']

  // Rôles autorisés par page
  const ACCES = {
    'coupe.html':     ['it', 'admin'],
    'atelier.html':   ['it', 'admin'],
    'qualite.html':   ['it', 'admin'],
    'finition.html':  ['it', 'admin'],
    'objectifs.html': ['superviseur', 'admin'],
    'admin.html':     ['admin'],
  }

  // Nom de la page courante
  const pageCourante = window.location.pathname.split('/').pop() || 'index.html'

  // Page libre → on ne fait rien
  if (PAGES_LIBRES.includes(pageCourante)) return

  // Récupérer la session
  const { data: { session } } = await db.auth.getSession()

  if (!session) {
    // Non connecté → redirect login
    window.location.href = 'index.html'
    return
  }

  // Récupérer le profil
  const { data: profile } = await db
    .from('profiles')
    .select('*')
    .eq('id', session.user.id)
    .single()

  if (!profile) {
    await db.auth.signOut()
    window.location.href = 'index.html'
    return
  }

  // Vérifier le rôle
  const rolesAutorises = ACCES[pageCourante]
  if (rolesAutorises && !rolesAutorises.includes(profile.role)) {
    window.location.href = 'index.html'
    return
  }

  // Exposer le profil globalement
  window.AKANJO_USER = profile

  // Injecter le bandeau utilisateur dans le header
  document.addEventListener('DOMContentLoaded', () => {
    const header = document.querySelector('header')
    if (!header) return

    const bandeau = document.createElement('div')
    bandeau.className = 'user-bandeau'
    bandeau.innerHTML = `
      <span class="user-bandeau-nom">${profile.nom}</span>
      <span class="user-bandeau-role">${labelRole(profile.role)}</span>
      <button class="user-bandeau-logout" onclick="window.AKANJO_LOGOUT()">Déconnexion</button>
    `
    header.appendChild(bandeau)
  })

  // Fonction logout globale
  window.AKANJO_LOGOUT = async () => {
    await db.auth.signOut()
    window.location.href = 'index.html'
  }

  function labelRole(role) {
    const map = { admin: 'Administrateur', it: 'Département IT', superviseur: 'Superviseur' }
    return map[role] || role
  }

})()
