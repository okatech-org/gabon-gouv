/* ============================================================
   Gabon Connect — App Citoyen
   Vitrine publique + dashboard personnel
   C1 Home · C2 Service · C3 Dashboard · C4 Dépôt (wizard)
   C5 Suivi · C6 Documents · C7 Annuaire administrations
   ============================================================ */

const CITIZEN = {
  name: 'Marie OBAME',
  email: 'marie.obame@id.gouv.ga',
  nip: '1 84 12 76 005 042',
};

/* ---------- Catalogue de services ---------- */
const SERVICE_CATEGORIES = [
  { id: 'etat-civil', label: 'État civil', icon: 'user', count: 14, color: '#1a4480' },
  { id: 'identite',   label: 'Identité & voyage', icon: 'fingerprint', count: 8, color: '#2378c3' },
  { id: 'justice',    label: 'Justice', icon: 'shield', count: 6, color: '#4a5876' },
  { id: 'entreprise', label: 'Entreprise', icon: 'building', count: 11, color: '#0a6e54' },
  { id: 'fiscalite',  label: 'Fiscalité', icon: 'dollarSign', count: 9, color: '#b88600' },
  { id: 'logement',   label: 'Logement & foncier', icon: 'home', count: 7, color: '#6b7a96' },
  { id: 'mobilite',   label: 'Mobilité', icon: 'mapPin', count: 5, color: '#73b3e7' },
  { id: 'social',     label: 'Famille & social', icon: 'users', count: 12, color: '#a3315a' },
];

const TOP_SERVICES = [
  { id: 'acte-naissance', cat: 'État civil', label: 'Demander un acte de naissance', org: 'Direction Gén. de l\'État Civil', delay: '48 h', online: true, fee: 'Gratuit' },
  { id: 'cni',            cat: 'Identité',   label: 'Demander une CNI ou son renouvellement', org: 'Direction Gén. de la Documentation', delay: '7 j', online: true, fee: '5 000 FCFA' },
  { id: 'passeport',      cat: 'Identité',   label: 'Demander un passeport biométrique', org: 'Direction Gén. de la Documentation', delay: '10 j', online: true, fee: '75 000 FCFA' },
  { id: 'casier',         cat: 'Justice',    label: 'Obtenir un extrait de casier judiciaire (B3)', org: 'Ministère de la Justice', delay: '72 h', online: true, fee: '1 500 FCFA' },
  { id: 'nationalite',    cat: 'État civil', label: 'Certificat de nationalité gabonaise', org: 'Ministère de la Justice', delay: '15 j', online: true, fee: '3 000 FCFA' },
  { id: 'rccm',           cat: 'Entreprise', label: 'Immatriculer une entreprise (RCCM)', org: 'CDE / ANPI-Gabon', delay: '72 h', online: true, fee: '15 000 FCFA' },
];

/* ============================================================
   C1 · Accueil public — Vitrine + catalogue
   ============================================================ */
const CitizenHome = () => (
  <Frame width={1440} height={1500} style={{ background: 'white', overflow: 'hidden' }}>
    <RepublicBar/>
    <header style={{
      borderBottom: '1px solid var(--ink-200)', padding: '14px 64px',
      display: 'flex', alignItems: 'center', gap: 24, background: 'white',
    }}>
      <Logo subtitle="Guichet unique"/>
      <nav style={{ display: 'flex', gap: 24, marginLeft: 32 }}>
        {['Démarches', 'Administrations', 'Mon espace', 'Aide'].map((l, i) => (
          <a key={l} href="#" style={{ fontSize: 14, fontWeight: i === 0 ? 700 : 500, color: i === 0 ? 'var(--primary-600)' : 'var(--ink-700)' }}>{l}</a>
        ))}
      </nav>
      <div style={{ flex: 1 }}/>
      <span style={{ fontSize: 12, color: 'var(--ink-600)' }}>🇬🇦 République Gabonaise</span>
      <Button variant="secondary" icon="user">Se connecter</Button>
    </header>

    {/* Hero */}
    <section style={{ background: 'linear-gradient(180deg, var(--primary-50) 0%, white 100%)', padding: '56px 64px 40px' }}>
      <div style={{ maxWidth: 1280, margin: '0 auto' }}>
        <div style={{ display: 'grid', gridTemplateColumns: '1.2fr 0.8fr', gap: 48, alignItems: 'center' }}>
          <div>
            <Badge tone="primary" dot>Plateforme officielle · 47 administrations connectées</Badge>
            <h1 style={{ fontSize: 52, lineHeight: 1.05, letterSpacing: '-0.02em', marginTop: 16 }}>
              Toutes vos démarches<br/>administratives, <span style={{ color: 'var(--primary-500)' }}>en un seul endroit.</span>
            </h1>
            <p style={{ fontSize: 18, color: 'var(--ink-600)', maxWidth: 540, lineHeight: 1.55, marginTop: 16 }}>
              Acte de naissance, passeport, casier judiciaire, immatriculation d'entreprise — déposez et suivez vos demandes en ligne, à toute heure.
            </p>

            {/* Recherche */}
            <div style={{
              marginTop: 28, background: 'white', border: '1px solid var(--ink-200)', borderRadius: 10,
              padding: 6, display: 'flex', alignItems: 'center', gap: 8, maxWidth: 560,
              boxShadow: '0 4px 12px rgba(14,26,43,.06)',
            }}>
              <Icon name="search" size={18} style={{ color: 'var(--ink-500)', marginLeft: 10 }}/>
              <input
                placeholder="Rechercher une démarche, un service, une administration…"
                style={{ flex: 1, border: 'none', outline: 'none', fontSize: 15, padding: '10px 4px', fontFamily: 'inherit', background: 'transparent' }}
                defaultValue=""
              />
              <Button>Rechercher</Button>
            </div>
            <div style={{ display: 'flex', gap: 8, marginTop: 12, fontSize: 12, color: 'var(--ink-600)', flexWrap: 'wrap' }}>
              <span>Suggestions :</span>
              {['acte de naissance', 'passeport', 'RCCM', 'casier judiciaire'].map(s => (
                <a key={s} href="#" style={{ background: 'var(--ink-100)', padding: '2px 10px', borderRadius: 999, color: 'var(--ink-700)' }}>{s}</a>
              ))}
            </div>
          </div>

          {/* Stat card */}
          <div style={{
            background: 'var(--primary-600)', color: 'white', padding: 32, borderRadius: 12, position: 'relative', overflow: 'hidden',
          }}>
            <div aria-hidden="true" style={{ position: 'absolute', top: -60, right: -60, width: 260, height: 260, borderRadius: '50%', background: 'rgba(255,255,255,.05)' }}/>
            <span style={{ fontSize: 11, fontWeight: 700, textTransform: 'uppercase', letterSpacing: '0.08em', color: 'rgba(255,255,255,.7)' }}>Gabon Connect en chiffres</span>
            <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 24, marginTop: 20, position: 'relative' }}>
              {[
                { v: '128', l: 'Services disponibles' },
                { v: '47', l: 'Administrations' },
                { v: '312 480', l: 'Demandes traitées en 2025' },
                { v: '2 j 14 h', l: 'Délai moyen de traitement' },
              ].map(s => (
                <div key={s.l}>
                  <div style={{ fontSize: 28, fontWeight: 700, letterSpacing: '-0.02em' }}>{s.v}</div>
                  <div style={{ fontSize: 12.5, color: 'rgba(255,255,255,.78)' }}>{s.l}</div>
                </div>
              ))}
            </div>
            <div style={{ height: 1, background: 'rgba(255,255,255,.18)', margin: '20px 0' }}/>
            <div style={{ display: 'flex', gap: 16, fontSize: 11.5, fontWeight: 600 }}>
              <span style={{ display: 'inline-flex', alignItems: 'center', gap: 5 }}><Icon name="shieldCheck" size={13}/>RGPD-conforme</span>
              <span style={{ display: 'inline-flex', alignItems: 'center', gap: 5 }}><Icon name="fingerprint" size={13}/>Identité numérique</span>
              <span style={{ display: 'inline-flex', alignItems: 'center', gap: 5 }}><Icon name="database" size={13}/>Hébergé au Gabon</span>
            </div>
          </div>
        </div>
      </div>
    </section>

    {/* Catégories */}
    <section style={{ padding: '40px 64px 24px' }}>
      <div style={{ maxWidth: 1280, margin: '0 auto' }}>
        <SectionHeading title="Démarches par thème" subtitle="Parcourez les 128 services proposés par les administrations gabonaises." action={<a href="#" style={{ fontSize: 14, fontWeight: 600 }}>Voir tout l'annuaire →</a>}/>
        <div style={{ display: 'grid', gridTemplateColumns: 'repeat(4, 1fr)', gap: 12 }}>
          {SERVICE_CATEGORIES.map(c => (
            <a key={c.id} href="#" style={{
              border: '1px solid var(--ink-200)', borderRadius: 10, padding: 18, background: 'white',
              display: 'flex', alignItems: 'center', gap: 14, textDecoration: 'none', color: 'inherit',
              transition: 'border-color .12s, transform .12s',
            }}>
              <span style={{
                width: 44, height: 44, borderRadius: 8,
                background: c.color + '14', color: c.color,
                display: 'inline-flex', alignItems: 'center', justifyContent: 'center', flexShrink: 0,
              }}>
                <Icon name={c.icon} size={20}/>
              </span>
              <div style={{ flex: 1 }}>
                <div style={{ fontSize: 14, fontWeight: 700, color: 'var(--ink-900)' }}>{c.label}</div>
                <div style={{ fontSize: 12, color: 'var(--ink-500)' }}>{c.count} démarches</div>
              </div>
              <Icon name="chevronRight" size={16} style={{ color: 'var(--ink-400)' }}/>
            </a>
          ))}
        </div>
      </div>
    </section>

    {/* Top services */}
    <section style={{ padding: '24px 64px 56px' }}>
      <div style={{ maxWidth: 1280, margin: '0 auto' }}>
        <SectionHeading title="Démarches les plus demandées" subtitle="Les 6 services les plus utilisés cette semaine."/>
        <div style={{ display: 'grid', gridTemplateColumns: 'repeat(3, 1fr)', gap: 12 }}>
          {TOP_SERVICES.map(s => (
            <a key={s.id} href="#" style={{
              border: '1px solid var(--ink-200)', borderRadius: 10, padding: 20, background: 'white',
              textDecoration: 'none', color: 'inherit', display: 'flex', flexDirection: 'column', gap: 8,
            }}>
              <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
                <Badge tone="primary" size="sm">{s.cat}</Badge>
                {s.online && <Badge tone="archived" size="sm" dot>100% en ligne</Badge>}
              </div>
              <h3 style={{ fontSize: 16.5, lineHeight: 1.3, marginTop: 4 }}>{s.label}</h3>
              <div style={{ fontSize: 12.5, color: 'var(--ink-600)', display: 'flex', alignItems: 'center', gap: 6 }}>
                <Icon name="building" size={13}/>{s.org}
              </div>
              <div style={{ height: 1, background: 'var(--ink-150)', margin: '6px 0' }}/>
              <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', fontSize: 12.5, color: 'var(--ink-700)' }}>
                <span><Icon name="clock" size={12} style={{ verticalAlign: 'middle', marginRight: 4 }}/>Délai · <b>{s.delay}</b></span>
                <span><Icon name="dollarSign" size={12} style={{ verticalAlign: 'middle', marginRight: 4 }}/>{s.fee}</span>
              </div>
            </a>
          ))}
        </div>
      </div>
    </section>

    {/* Comment ça marche */}
    <section style={{ background: 'var(--ink-50)', padding: '48px 64px', borderTop: '1px solid var(--ink-200)' }}>
      <div style={{ maxWidth: 1280, margin: '0 auto' }}>
        <SectionHeading title="Comment ça marche ?" subtitle="Trois étapes pour effectuer une démarche administrative en ligne."/>
        <div style={{ display: 'grid', gridTemplateColumns: 'repeat(3, 1fr)', gap: 16 }}>
          {[
            { i: 'fingerprint', n: '01', t: 'Je m\'identifie', d: "Connexion sécurisée par votre identité numérique gabonaise (NIP). Aucun mot de passe à retenir." },
            { i: 'fileText',    n: '02', t: 'Je dépose ma demande', d: "Je remplis le formulaire et je joins mes pièces justificatives. Les informations connues sont pré-remplies." },
            { i: 'download',    n: '03', t: 'Je reçois mon document', d: "L'administration traite, signe et m'envoie mon document numérique scellé, opposable aux tiers." },
          ].map(c => (
            <div key={c.n} style={{ background: 'white', border: '1px solid var(--ink-200)', borderRadius: 10, padding: 24, position: 'relative' }}>
              <span style={{ fontFamily: 'var(--font-mono)', fontSize: 11, color: 'var(--primary-500)', fontWeight: 700, letterSpacing: '0.06em' }}>{c.n}</span>
              <span style={{
                width: 44, height: 44, borderRadius: 8,
                background: 'var(--primary-50)', color: 'var(--primary-500)',
                display: 'inline-flex', alignItems: 'center', justifyContent: 'center', marginTop: 8, marginBottom: 12,
              }}><Icon name={c.i} size={20}/></span>
              <h3 style={{ fontSize: 17 }}>{c.t}</h3>
              <p style={{ fontSize: 14, color: 'var(--ink-600)', marginTop: 6, lineHeight: 1.55 }}>{c.d}</p>
            </div>
          ))}
        </div>
      </div>
    </section>

    {/* Footer */}
    <footer style={{ padding: '24px 64px', borderTop: '1px solid var(--ink-200)', background: 'white' }}>
      <div style={{ maxWidth: 1280, margin: '0 auto', display: 'flex', justifyContent: 'space-between', alignItems: 'center', fontSize: 13, color: 'var(--ink-600)' }}>
        <div style={{ display: 'flex', gap: 24 }}>
          <a href="#legal">Mentions légales</a>
          <a href="#a11y">Accessibilité</a>
          <a href="#contact">Contact</a>
          <a href="#status">État du service</a>
          <a href="#cgu">CGU</a>
        </div>
        <div>© 2026 République Gabonaise · Gabon Connect</div>
      </div>
    </footer>
  </Frame>
);

/* ============================================================
   C2 · Page service — Acte de naissance
   ============================================================ */
const CitizenServiceDetail = () => (
  <Frame width={1440} height={1100} style={{ background: 'white', overflow: 'hidden' }}>
    <RepublicBar/>
    <header style={{ borderBottom: '1px solid var(--ink-200)', padding: '14px 64px', display: 'flex', alignItems: 'center', gap: 24, background: 'white' }}>
      <Logo/>
      <nav style={{ display: 'flex', gap: 24, marginLeft: 32 }}>
        {['Démarches', 'Administrations', 'Mon espace', 'Aide'].map((l, i) => (
          <a key={l} href="#" style={{ fontSize: 14, fontWeight: i === 0 ? 700 : 500, color: i === 0 ? 'var(--primary-600)' : 'var(--ink-700)' }}>{l}</a>
        ))}
      </nav>
      <div style={{ flex: 1 }}/>
      <Button variant="secondary" icon="user">Marie OBAME</Button>
    </header>

    <div style={{ padding: '20px 64px 12px', borderBottom: '1px solid var(--ink-150)', background: 'var(--ink-50)' }}>
      <div style={{ maxWidth: 1280, margin: '0 auto', display: 'flex', alignItems: 'center', gap: 6, fontSize: 13, color: 'var(--ink-600)' }}>
        <a href="#" style={{ color: 'var(--ink-600)' }}>Accueil</a>
        <Icon name="chevronRight" size={12}/>
        <a href="#" style={{ color: 'var(--ink-600)' }}>Démarches</a>
        <Icon name="chevronRight" size={12}/>
        <a href="#" style={{ color: 'var(--ink-600)' }}>État civil</a>
        <Icon name="chevronRight" size={12}/>
        <span style={{ color: 'var(--ink-900)', fontWeight: 600 }}>Acte de naissance</span>
      </div>
    </div>

    <section style={{ padding: '32px 64px 48px' }}>
      <div style={{ maxWidth: 1280, margin: '0 auto', display: 'grid', gridTemplateColumns: '1fr 360px', gap: 48 }}>
        <div>
          <Badge tone="primary" size="sm">État civil</Badge>
          <h1 style={{ fontSize: 36, marginTop: 12, letterSpacing: '-0.02em' }}>Demander un acte de naissance</h1>
          <p style={{ fontSize: 16, color: 'var(--ink-600)', marginTop: 8, lineHeight: 1.55, maxWidth: 720 }}>
            L'acte de naissance est un document d'état civil délivré par votre commune de naissance. Vous pouvez en demander une copie intégrale, un extrait avec filiation ou un extrait sans filiation.
          </p>

          {/* Méta */}
          <div style={{ display: 'flex', gap: 32, marginTop: 24, paddingTop: 20, borderTop: '1px solid var(--ink-200)' }}>
            <div>
              <div style={{ fontSize: 11, fontWeight: 700, color: 'var(--ink-500)', textTransform: 'uppercase', letterSpacing: '0.06em' }}>Délivré par</div>
              <div style={{ fontSize: 14, fontWeight: 600, marginTop: 4 }}>Direction Gén. de l'État Civil</div>
            </div>
            <div>
              <div style={{ fontSize: 11, fontWeight: 700, color: 'var(--ink-500)', textTransform: 'uppercase', letterSpacing: '0.06em' }}>Délai moyen</div>
              <div style={{ fontSize: 14, fontWeight: 600, marginTop: 4 }}>48 heures</div>
            </div>
            <div>
              <div style={{ fontSize: 11, fontWeight: 700, color: 'var(--ink-500)', textTransform: 'uppercase', letterSpacing: '0.06em' }}>Coût</div>
              <div style={{ fontSize: 14, fontWeight: 600, marginTop: 4 }}>Gratuit</div>
            </div>
            <div>
              <div style={{ fontSize: 11, fontWeight: 700, color: 'var(--ink-500)', textTransform: 'uppercase', letterSpacing: '0.06em' }}>Mode</div>
              <div style={{ fontSize: 14, fontWeight: 600, marginTop: 4, color: 'var(--success-600)' }}>100% en ligne</div>
            </div>
          </div>

          {/* Variantes */}
          <SectionHeading title="Quel acte choisir ?" subtitle="Trois variantes possibles selon votre besoin." style={{ marginTop: 36 }}/>
          <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr 1fr', gap: 12 }}>
            {[
              { t: 'Copie intégrale', d: 'Reproduit l\'intégralité de l\'acte avec toutes les mentions marginales.', who: 'L\'intéressé majeur, ses ascendants/descendants.' },
              { t: 'Extrait avec filiation', d: 'Mentionne les noms des parents.', who: 'Démarches mariage, succession, nationalité.' },
              { t: 'Extrait sans filiation', d: 'Sans mention des parents.', who: 'Toute personne (à partir de l\'acte original).' },
            ].map((v, i) => (
              <div key={v.t} style={{
                border: `1px solid ${i === 0 ? 'var(--primary-500)' : 'var(--ink-200)'}`,
                background: i === 0 ? 'var(--primary-50)' : 'white',
                borderRadius: 8, padding: 16,
              }}>
                <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between' }}>
                  <h4 style={{ fontSize: 14, fontWeight: 700 }}>{v.t}</h4>
                  {i === 0 && <Badge tone="primary" size="sm">Le plus demandé</Badge>}
                </div>
                <p style={{ fontSize: 13, color: 'var(--ink-700)', marginTop: 6, lineHeight: 1.5 }}>{v.d}</p>
                <p style={{ fontSize: 12, color: 'var(--ink-500)', marginTop: 8 }}><b>Qui peut le demander ?</b> {v.who}</p>
              </div>
            ))}
          </div>

          {/* Pièces */}
          <SectionHeading title="Pièces à fournir" subtitle="Préparez ces documents avant de commencer." style={{ marginTop: 36 }}/>
          <div style={{ border: '1px solid var(--ink-200)', borderRadius: 8, background: 'white' }}>
            {[
              { t: 'Pièce d\'identité du demandeur', d: 'CNI, passeport ou permis de conduire en cours de validité.', req: true, auto: true },
              { t: 'Justificatif du lien de filiation', d: 'Livret de famille ou acte de naissance des parents.', req: false, auto: false },
              { t: 'Mandat signé', d: 'Si vous effectuez la demande pour un tiers.', req: false, auto: false },
            ].map((p, i) => (
              <div key={p.t} style={{
                padding: 16, display: 'flex', alignItems: 'center', gap: 16,
                borderTop: i === 0 ? 'none' : '1px solid var(--ink-150)',
              }}>
                <span style={{
                  width: 36, height: 36, borderRadius: 6, flexShrink: 0,
                  background: p.auto ? 'var(--success-50)' : 'var(--ink-100)',
                  color: p.auto ? 'var(--success-600)' : 'var(--ink-500)',
                  display: 'inline-flex', alignItems: 'center', justifyContent: 'center',
                }}><Icon name={p.auto ? 'check' : 'paperclip'} size={16} stroke={2.25}/></span>
                <div style={{ flex: 1 }}>
                  <div style={{ fontSize: 14, fontWeight: 600 }}>{p.t}{p.req && <span style={{ color: 'var(--danger-500)', marginLeft: 4 }}>*</span>}</div>
                  <div style={{ fontSize: 13, color: 'var(--ink-600)', marginTop: 2 }}>{p.d}</div>
                </div>
                {p.auto && <Badge tone="archived" size="sm" dot>Pré-rempli depuis votre identité</Badge>}
              </div>
            ))}
          </div>

          <SectionHeading title="Foire aux questions" style={{ marginTop: 36 }}/>
          <div style={{ display: 'flex', flexDirection: 'column' }}>
            {[
              'Mon acte n\'est pas trouvé, que faire ?',
              'Combien de copies puis-je commander ?',
              'L\'acte numérique a-t-il la même valeur que le papier ?',
              'Comment vérifier l\'authenticité d\'un acte ?',
            ].map((q, i) => (
              <div key={q} style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', padding: '14px 0', borderBottom: '1px solid var(--ink-150)' }}>
                <span style={{ fontSize: 14, fontWeight: 500, color: 'var(--ink-800)' }}>{q}</span>
                <Icon name={i === 0 ? 'chevronUp' : 'chevronDown'} size={16} style={{ color: 'var(--ink-500)' }}/>
              </div>
            ))}
          </div>
        </div>

        {/* Sticky CTA */}
        <aside>
          <div style={{ position: 'sticky', top: 24, display: 'flex', flexDirection: 'column', gap: 16 }}>
            <div style={{ border: '1px solid var(--ink-200)', borderRadius: 10, padding: 20, background: 'white' }}>
              <div style={{ fontSize: 12, fontWeight: 700, color: 'var(--ink-500)', textTransform: 'uppercase', letterSpacing: '0.06em' }}>Démarrer la demande</div>
              <h3 style={{ fontSize: 18, marginTop: 8 }}>Vous êtes prêt(e) ?</h3>
              <p style={{ fontSize: 13, color: 'var(--ink-600)', marginTop: 6, lineHeight: 1.5 }}>
                4 étapes · environ 5 minutes. Vous pourrez sauvegarder à tout moment.
              </p>
              <Button size="lg" iconRight="arrowRight" style={{ width: '100%', marginTop: 16 }}>Commencer</Button>
              <Button variant="ghost" icon="bookmark" style={{ width: '100%', marginTop: 8 }}>Sauvegarder pour plus tard</Button>
              <div style={{ height: 1, background: 'var(--ink-150)', margin: '16px 0' }}/>
              <div style={{ fontSize: 12, color: 'var(--ink-600)', lineHeight: 1.6 }}>
                <Icon name="lock" size={12} style={{ verticalAlign: 'middle', marginRight: 4 }}/>
                Vos données sont chiffrées de bout en bout et conservées au Gabon.
              </div>
            </div>

            <div style={{ border: '1px solid var(--ink-200)', borderRadius: 10, padding: 20, background: 'var(--ink-50)' }}>
              <div style={{ fontSize: 12, fontWeight: 700, color: 'var(--ink-500)', textTransform: 'uppercase', letterSpacing: '0.06em' }}>Démarches connexes</div>
              <div style={{ display: 'flex', flexDirection: 'column', gap: 8, marginTop: 12 }}>
                {['Livret de famille', 'Certificat de nationalité', 'Acte de mariage', 'Acte de décès'].map(d => (
                  <a key={d} href="#" style={{ fontSize: 14, color: 'var(--ink-800)', display: 'flex', alignItems: 'center', gap: 6 }}>
                    <Icon name="arrowRight" size={12}/>{d}
                  </a>
                ))}
              </div>
            </div>
          </div>
        </aside>
      </div>
    </section>
  </Frame>
);

/* ============================================================
   C3 · Dashboard citoyen
   ============================================================ */
const CitizenDashboard = () => {
  const navItems = [
    { id: 'home', label: 'Accueil', icon: 'home' },
    { id: 'demarches', label: 'Mes demandes', icon: 'inbox', count: 3 },
    { id: 'documents', label: 'Mes documents', icon: 'fileText', count: 12 },
    { id: 'dossier', label: 'Mon dossier', icon: 'folder' },
    { id: 'messages', label: 'Messages', icon: 'mail', count: 1 },
    { section: 'Compte' },
    { id: 'profil', label: 'Mes informations', icon: 'user' },
    { id: 'identite', label: 'Identité numérique', icon: 'fingerprint' },
    { id: 'parametres', label: 'Paramètres', icon: 'settings' },
  ];
  return (
    <Frame width={1440} height={900}>
      <AppHeader user="Marie OBAME" role="Citoyenne" />
      <div style={{ display: 'flex', minHeight: 'calc(900px - 63px)' }}>
        <Sidebar items={navItems} current="home"/>
        <main style={{ flex: 1, overflow: 'auto' }}>
          <PageHeader
            breadcrumbs={['Mon espace']}
            title="Bonjour Marie 👋"
            subtitle="3 demandes en cours, 1 document à télécharger."
            actions={<><Button variant="secondary" icon="folderOpen">Mes documents</Button><Button icon="plus">Nouvelle démarche</Button></>}
          />
          <div style={{ padding: '24px 32px', display: 'flex', flexDirection: 'column', gap: 24 }}>

            {/* Stats */}
            <div style={{ display: 'grid', gridTemplateColumns: 'repeat(4, 1fr)', gap: 12 }}>
              <StatCard label="Demandes en cours" value="3" icon="inbox" hint="dont 1 en attente"/>
              <StatCard label="Documents reçus" value="12" icon="fileText" hint="cette année"/>
              <StatCard label="Délai moyen" value="2 j" icon="clock" delta="−14 %" deltaTone="success" hint="vs 2024"/>
              <StatCard label="Notifications" value="4" icon="bell" hint="3 non lues"/>
            </div>

            {/* Demandes en cours */}
            <div>
              <SectionHeading title="Demandes en cours" action={<a href="#" style={{ fontSize: 13, fontWeight: 600 }}>Tout voir →</a>}/>
              <Table>
                <thead>
                  <tr>
                    <Th>Démarche</Th>
                    <Th>Administration</Th>
                    <Th>Référence</Th>
                    <Th>Déposée le</Th>
                    <Th>Statut</Th>
                    <Th>Avancement</Th>
                    <Th>{' '}</Th>
                  </tr>
                </thead>
                <tbody>
                  {[
                    { t: 'Acte de naissance · copie intégrale', org: 'DG État Civil', ref: 'GC-2026-EC-002841', date: '20 mai 2026', st: 'En instruction', tone: 'active', pct: 60 },
                    { t: 'Passeport biométrique · renouvellement', org: 'DG Documentation', ref: 'GC-2026-DI-019733', date: '14 mai 2026', st: 'Pièces demandées', tone: 'warning', pct: 35 },
                    { t: 'Casier judiciaire · extrait B3', org: 'Min. Justice', ref: 'GC-2026-JU-007612', date: '8 mai 2026', st: 'Prêt à télécharger', tone: 'archived', pct: 100 },
                  ].map(r => (
                    <Tr key={r.ref} onClick={() => {}}>
                      <Td><div style={{ display: 'flex', alignItems: 'center', gap: 10 }}><Icon name="fileText" size={16} style={{ color: 'var(--ink-500)' }}/><span style={{ fontWeight: 600 }}>{r.t}</span></div></Td>
                      <Td style={{ color: 'var(--ink-600)' }}>{r.org}</Td>
                      <Td style={{ fontFamily: 'var(--font-mono)', fontSize: 12 }}>{r.ref}</Td>
                      <Td>{r.date}</Td>
                      <Td><Badge tone={r.tone} dot>{r.st}</Badge></Td>
                      <Td style={{ minWidth: 160 }}><Progress value={r.pct} label={r.pct + ' %'} tone={r.pct === 100 ? 'success' : 'primary'}/></Td>
                      <Td><Icon name="chevronRight" size={16} style={{ color: 'var(--ink-400)' }}/></Td>
                    </Tr>
                  ))}
                </tbody>
              </Table>
            </div>

            {/* Recommandations + Messages */}
            <div style={{ display: 'grid', gridTemplateColumns: '1.4fr 1fr', gap: 16 }}>
              <Card>
                <SectionHeading title="Démarches recommandées" subtitle="Selon votre profil et vos précédentes démarches." level={3}/>
                <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 10 }}>
                  {[
                    { t: 'Renouveler votre CNI', d: 'Expire dans 8 mois.', i: 'fingerprint', urgent: true },
                    { t: 'Déclarer un déménagement', d: 'Mise à jour de votre adresse.', i: 'mapPin' },
                    { t: 'Inscrire un enfant à l\'état civil', d: 'Naissance déclarée le 12/04/26.', i: 'users' },
                    { t: 'Demander un certificat de résidence', d: 'Souvent demandé.', i: 'home' },
                  ].map(r => (
                    <a key={r.t} href="#" style={{ border: '1px solid var(--ink-200)', borderRadius: 8, padding: 14, display: 'flex', gap: 12, textDecoration: 'none', color: 'inherit' }}>
                      <span style={{ width: 36, height: 36, borderRadius: 6, background: r.urgent ? 'var(--warning-100)' : 'var(--primary-50)', color: r.urgent ? 'var(--warning-600)' : 'var(--primary-500)', display: 'inline-flex', alignItems: 'center', justifyContent: 'center', flexShrink: 0 }}>
                        <Icon name={r.i} size={16}/>
                      </span>
                      <div>
                        <div style={{ fontSize: 13.5, fontWeight: 700 }}>{r.t}</div>
                        <div style={{ fontSize: 12, color: 'var(--ink-600)', marginTop: 2 }}>{r.d}</div>
                      </div>
                    </a>
                  ))}
                </div>
              </Card>
              <Card>
                <SectionHeading title="Derniers messages" level={3} action={<Badge tone="danger" size="sm">1 nouveau</Badge>}/>
                {[
                  { who: 'DG Documentation', when: 'il y a 2 h', t: 'Pièce manquante — passeport', d: 'Merci de joindre le justificatif de domicile actualisé.', unread: true },
                  { who: 'Min. Justice', when: 'hier', t: 'Votre extrait B3 est prêt', d: 'Téléchargez-le depuis votre espace.', unread: false },
                  { who: 'Gabon Connect', when: 'il y a 3 j', t: 'Maintenance planifiée', d: 'Le 28 mai entre 2h et 4h du matin.', unread: false },
                ].map((m, i) => (
                  <div key={i} style={{ display: 'flex', gap: 12, paddingTop: i === 0 ? 0 : 14, paddingBottom: 14, borderBottom: i === 2 ? 'none' : '1px solid var(--ink-150)' }}>
                    <span style={{ width: 6, height: 6, borderRadius: '50%', background: m.unread ? 'var(--primary-500)' : 'transparent', marginTop: 8, flexShrink: 0 }}/>
                    <div style={{ flex: 1 }}>
                      <div style={{ display: 'flex', justifyContent: 'space-between' }}>
                        <span style={{ fontSize: 12, fontWeight: 600, color: 'var(--ink-600)' }}>{m.who}</span>
                        <span style={{ fontSize: 11, color: 'var(--ink-500)' }}>{m.when}</span>
                      </div>
                      <div style={{ fontSize: 13.5, fontWeight: m.unread ? 700 : 600, marginTop: 2 }}>{m.t}</div>
                      <div style={{ fontSize: 13, color: 'var(--ink-600)', marginTop: 2 }}>{m.d}</div>
                    </div>
                  </div>
                ))}
              </Card>
            </div>

          </div>
        </main>
      </div>
    </Frame>
  );
};

/* ============================================================
   C4 · Dépôt d'une demande — Wizard 4 étapes
   ============================================================ */
const CitizenDeposit = ({ initialStep = 0 }) => {
  const [step, setStep] = useState(initialStep);
  const steps = ['Service', 'Informations', 'Pièces justificatives', 'Vérification'];

  return (
    <Frame width={1440} height={900}>
      <AppHeader user="Marie OBAME" role="Citoyenne"/>
      <div style={{ padding: '20px 32px', background: 'var(--ink-50)', borderBottom: '1px solid var(--ink-200)' }}>
        <nav style={{ display: 'flex', alignItems: 'center', gap: 6, fontSize: 13, color: 'var(--ink-600)', marginBottom: 8 }}>
          <a href="#">Mes démarches</a><Icon name="chevronRight" size={12}/>
          <a href="#">Nouveau dépôt</a><Icon name="chevronRight" size={12}/>
          <span style={{ color: 'var(--ink-900)', fontWeight: 600 }}>Acte de naissance</span>
        </nav>
        <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between' }}>
          <h1 style={{ fontSize: 22 }}>Demande d'acte de naissance · copie intégrale</h1>
          <Badge tone="primary" size="sm">Brouillon · sauvegardé automatiquement</Badge>
        </div>
      </div>

      <div style={{ padding: '20px 32px 12px', background: 'white', borderBottom: '1px solid var(--ink-200)' }}>
        <Stepper steps={steps} current={step}/>
      </div>

      <main style={{ padding: '28px 32px', background: 'var(--ink-100)', minHeight: 540 }}>
        <div style={{ maxWidth: 920, margin: '0 auto' }}>
          {step === 0 && <DepositStep1/>}
          {step === 1 && <DepositStep2/>}
          {step === 2 && <DepositStep3/>}
          {step === 3 && <DepositStep4/>}
        </div>
      </main>

      <footer style={{ borderTop: '1px solid var(--ink-200)', padding: '16px 32px', background: 'white', display: 'flex', alignItems: 'center', justifyContent: 'space-between' }}>
        <Button variant="ghost" icon="arrowLeft" onClick={() => setStep(Math.max(0, step - 1))} disabled={step === 0}>Précédent</Button>
        <span style={{ fontSize: 12, color: 'var(--ink-500)' }}>Étape {step + 1}/4</span>
        {step < 3 ? (
          <Button iconRight="arrowRight" onClick={() => setStep(Math.min(3, step + 1))}>Suivant</Button>
        ) : (
          <Button icon="shieldCheck" variant="success">Déposer ma demande</Button>
        )}
      </footer>
    </Frame>
  );
};

const DepositStep1 = () => (
  <Card>
    <SectionHeading title="1. Quel type d'acte ?" subtitle="Sélectionnez la variante adaptée à votre besoin." level={3}/>
    <div style={{ display: 'flex', flexDirection: 'column', gap: 10 }}>
      <Radio checked={true} label="Copie intégrale" hint="Reproduit l'intégralité de l'acte avec toutes les mentions marginales. Recommandée pour les démarches officielles." name="type" id="t1"/>
      <Radio checked={false} label="Extrait avec filiation" hint="Mentionne les noms des parents. Suffisant pour la plupart des démarches (mariage, nationalité…)." name="type" id="t2"/>
      <Radio checked={false} label="Extrait sans filiation" hint="Sans mention des parents. Demande possible par toute personne." name="type" id="t3"/>
    </div>
    <div style={{ marginTop: 24 }}>
      <SectionHeading title="Nombre de copies" subtitle="Pour quel usage ?" level={3}/>
      <div style={{ display: 'flex', alignItems: 'center', gap: 16 }}>
        <div style={{ display: 'flex', alignItems: 'center', border: '1px solid var(--ink-300)', borderRadius: 6, overflow: 'hidden' }}>
          <button style={{ width: 36, height: 38, border: 'none', background: 'white', cursor: 'pointer' }}>−</button>
          <span style={{ padding: '0 16px', fontWeight: 700, fontSize: 16 }}>2</span>
          <button style={{ width: 36, height: 38, border: 'none', background: 'white', cursor: 'pointer', borderLeft: '1px solid var(--ink-200)' }}>+</button>
        </div>
        <span style={{ fontSize: 13, color: 'var(--ink-600)' }}>Max. 5 copies par demande · gratuit pour le citoyen</span>
      </div>
    </div>
  </Card>
);

const DepositStep2 = () => (
  <Card>
    <SectionHeading title="2. Vos informations" subtitle="Les champs grisés sont remplis depuis votre identité numérique." level={3}/>
    <Alert tone="info" style={{ marginBottom: 20 }}>
      <b>Pré-remplissage actif.</b> Les informations vérifiées par votre NIP sont automatiquement renseignées et ne peuvent pas être modifiées ici.
    </Alert>
    <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 16 }}>
      <Field label="Nom de famille" required><TextInput defaultValue="OBAME" style={{ background: 'var(--ink-50)', color: 'var(--ink-600)' }} readOnly/></Field>
      <Field label="Prénoms" required><TextInput defaultValue="Marie Estelle" style={{ background: 'var(--ink-50)', color: 'var(--ink-600)' }} readOnly/></Field>
      <Field label="Date de naissance" required><TextInput defaultValue="14 mars 1992" style={{ background: 'var(--ink-50)', color: 'var(--ink-600)' }} readOnly/></Field>
      <Field label="Lieu de naissance" required><TextInput defaultValue="Libreville, Estuaire" style={{ background: 'var(--ink-50)', color: 'var(--ink-600)' }} readOnly/></Field>
      <Field label="NIP" required><TextInput defaultValue="1 84 12 76 005 042" icon="fingerprint" style={{ background: 'var(--ink-50)', color: 'var(--ink-600)' }} readOnly/></Field>
      <Field label="Adresse e-mail de notification" required hint="Vous y recevrez le récépissé et l'acte signé."><TextInput defaultValue="marie.obame@id.gouv.ga"/></Field>
    </div>
    <div style={{ marginTop: 20, padding: 16, background: 'var(--ink-50)', borderRadius: 8 }}>
      <Checkbox checked={true} label="Je demande l'acte pour moi-même." id="self"/>
      <div style={{ height: 8 }}/>
      <Checkbox checked={false} label="Je demande l'acte pour un tiers (joindre mandat à l'étape suivante)." id="proxy"/>
    </div>
  </Card>
);

const DepositStep3 = () => (
  <Card>
    <SectionHeading title="3. Pièces justificatives" subtitle="2 pièces requises, 1 facultative. Glissez-déposez vos fichiers." level={3}/>
    {[
      { t: 'Pièce d\'identité du demandeur', d: 'CNI ou passeport en cours de validité.', req: true, status: 'uploaded', file: 'CNI_obame.pdf', size: '1,2 Mo' },
      { t: 'Justificatif de filiation', d: 'Livret de famille ou acte des parents.', req: true, status: 'uploading' },
      { t: 'Mandat signé (si demande pour un tiers)', d: 'Modèle disponible en téléchargement.', req: false, status: 'idle' },
    ].map((p, i) => (
      <div key={p.t} style={{
        marginTop: i === 0 ? 16 : 12, border: '1px solid var(--ink-200)', borderRadius: 8, padding: 16,
        background: p.status === 'uploaded' ? 'var(--success-50)' : 'white',
        borderColor: p.status === 'uploaded' ? '#9bcfa6' : 'var(--ink-200)',
      }}>
        <div style={{ display: 'flex', alignItems: 'center', gap: 12 }}>
          <span style={{
            width: 36, height: 36, borderRadius: 6, flexShrink: 0,
            background: p.status === 'uploaded' ? 'var(--success-500)' : p.status === 'uploading' ? 'var(--primary-50)' : 'var(--ink-100)',
            color: p.status === 'uploaded' ? 'white' : p.status === 'uploading' ? 'var(--primary-500)' : 'var(--ink-500)',
            display: 'inline-flex', alignItems: 'center', justifyContent: 'center',
          }}>
            <Icon name={p.status === 'uploaded' ? 'check' : 'paperclip'} size={16} stroke={2.25}/>
          </span>
          <div style={{ flex: 1 }}>
            <div style={{ fontSize: 14, fontWeight: 600 }}>{p.t}{p.req && <span style={{ color: 'var(--danger-500)', marginLeft: 4 }}>*</span>}</div>
            <div style={{ fontSize: 13, color: 'var(--ink-600)' }}>{p.d}</div>
          </div>
          {p.status === 'uploaded' && (
            <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
              <span style={{ fontSize: 12, color: 'var(--ink-700)' }}>{p.file}</span>
              <span style={{ fontSize: 11, color: 'var(--ink-500)' }}>{p.size}</span>
              <Button variant="ghost" size="sm" icon="trash" style={{ color: 'var(--danger-500)' }}>{''}</Button>
            </div>
          )}
          {p.status === 'idle' && <Button variant="secondary" icon="upload" size="sm">Téléverser</Button>}
          {p.status === 'uploading' && <span style={{ fontSize: 12, color: 'var(--primary-600)', fontWeight: 600 }}>Analyse en cours…</span>}
        </div>
        {p.status === 'uploading' && <div style={{ marginTop: 10 }}><Progress value={62} label="62 %"/></div>}
      </div>
    ))}
    <div style={{ marginTop: 18, padding: 14, background: 'var(--info-50)', border: '1px solid var(--primary-200)', borderRadius: 8, fontSize: 13, color: 'var(--ink-700)' }}>
      <Icon name="cpu" size={14} style={{ verticalAlign: 'middle', marginRight: 6, color: 'var(--primary-500)' }}/>
      <b>Détection automatique.</b> L'IA vérifie la lisibilité et le type de chaque document. Aucune pièce n'est transmise à un tiers.
    </div>
  </Card>
);

const DepositStep4 = () => (
  <>
    <Card>
      <SectionHeading title="4. Vérification" subtitle="Relisez avant de transmettre. Une fois déposée, votre demande sera scellée et horodatée." level={3}/>
      <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 16, fontSize: 13.5 }}>
        {[
          ['Type d\'acte', 'Copie intégrale'],
          ['Nombre de copies', '2'],
          ['Demandeur', 'Marie Estelle OBAME'],
          ['NIP', '1 84 12 76 005 042'],
          ['Date de naissance', '14 mars 1992 · Libreville'],
          ['Adresse de notification', 'marie.obame@id.gouv.ga'],
        ].map(([k, v]) => (
          <div key={k} style={{ display: 'grid', gridTemplateColumns: '170px 1fr', alignItems: 'baseline', padding: '8px 0', borderBottom: '1px solid var(--ink-150)' }}>
            <span style={{ color: 'var(--ink-600)' }}>{k}</span>
            <span style={{ fontWeight: 600 }}>{v}</span>
          </div>
        ))}
      </div>
      <div style={{ marginTop: 18 }}>
        <div style={{ fontSize: 12, fontWeight: 700, color: 'var(--ink-500)', textTransform: 'uppercase', letterSpacing: '0.06em', marginBottom: 8 }}>Pièces jointes (2)</div>
        <div style={{ display: 'flex', gap: 8 }}>
          {['CNI_obame.pdf · 1,2 Mo', 'livret_famille.pdf · 2,8 Mo'].map(f => (
            <Badge key={f} tone="archived" dot icon="paperclip">{f}</Badge>
          ))}
        </div>
      </div>
    </Card>
    <div style={{ marginTop: 14, padding: 18, background: 'white', border: '1px solid var(--ink-200)', borderRadius: 8 }}>
      <Checkbox checked={true} label={<><b>Je certifie sur l'honneur</b> l'exactitude des informations fournies. Toute fausse déclaration expose à des sanctions (art. 412 du code pénal).</>} id="honor"/>
      <div style={{ height: 10 }}/>
      <Checkbox checked={true} label={<>J'accepte le <a href="#">traitement de mes données</a> conformément à la loi 001/2011 sur la protection des données personnelles.</>} id="rgpd"/>
    </div>
  </>
);

/* ============================================================
   C5 · Suivi d'une demande
   ============================================================ */
const CitizenTracking = () => {
  const navItems = [
    { id: 'home', label: 'Accueil', icon: 'home' },
    { id: 'demarches', label: 'Mes demandes', icon: 'inbox', count: 3 },
    { id: 'documents', label: 'Mes documents', icon: 'fileText', count: 12 },
    { id: 'dossier', label: 'Mon dossier', icon: 'folder' },
    { id: 'messages', label: 'Messages', icon: 'mail', count: 1 },
  ];
  return (
    <Frame width={1440} height={1000}>
      <AppHeader user="Marie OBAME" role="Citoyenne"/>
      <div style={{ display: 'flex' }}>
        <Sidebar items={navItems} current="demarches"/>
        <main style={{ flex: 1, overflow: 'auto' }}>
          <PageHeader
            breadcrumbs={['Mes demandes', 'GC-2026-EC-002841']}
            title="Acte de naissance · copie intégrale"
            subtitle="Demande déposée le 20 mai 2026 · DG État Civil"
            actions={<><Button variant="secondary" icon="messageSquare">Écrire à l'agent</Button><Button variant="outline" icon="download">Récépissé</Button></>}
          />
          <div style={{ padding: '24px 32px', display: 'grid', gridTemplateColumns: '1fr 320px', gap: 20 }}>
            <div style={{ display: 'flex', flexDirection: 'column', gap: 20 }}>
              {/* Timeline */}
              <Card>
                <SectionHeading title="Suivi du traitement" level={3} action={<Badge tone="active" dot>En instruction</Badge>}/>
                {[
                  { t: 'Demande déposée', d: '20 mai 2026 · 14:32', s: 'done', log: 'Vos pièces ont été validées automatiquement.', who: 'Vous' },
                  { t: 'Récépissé scellé émis', d: '20 mai 2026 · 14:32', s: 'done', log: 'Empreinte SHA-256 · 8a3c…d09f', who: 'Système' },
                  { t: 'Pré-instruction agent', d: '21 mai 2026 · 09:15', s: 'done', log: 'Dossier transmis à l\'agent Mme NGUEMA.', who: 'DG État Civil' },
                  { t: 'Vérification au registre', d: 'En cours · ~24 h restantes', s: 'active', log: 'Recherche de l\'acte source dans le registre de Libreville.', who: 'Agent en charge' },
                  { t: 'Signature de l\'acte', d: 'À venir', s: 'pending', log: 'Par l\'officier d\'état civil.' },
                  { t: 'Notification + téléchargement', d: 'À venir', s: 'pending', log: 'Vous serez notifié par e-mail.' },
                ].map((e, i, arr) => (
                  <div key={i} style={{ display: 'flex', gap: 12, alignItems: 'flex-start' }}>
                    <div style={{ display: 'flex', flexDirection: 'column', alignItems: 'center', flexShrink: 0 }}>
                      <span style={{
                        width: 28, height: 28, borderRadius: '50%',
                        background: e.s === 'done' ? 'var(--success-500)' : e.s === 'active' ? 'var(--primary-500)' : 'white',
                        border: `1.5px solid ${e.s === 'done' ? 'var(--success-500)' : e.s === 'active' ? 'var(--primary-500)' : 'var(--ink-300)'}`,
                        color: e.s === 'pending' ? 'var(--ink-500)' : 'white',
                        display: 'inline-flex', alignItems: 'center', justifyContent: 'center',
                        fontSize: 12, fontWeight: 700,
                      }}>{e.s === 'done' ? <Icon name="check" size={13} stroke={3}/> : i + 1}</span>
                      {i < arr.length - 1 && <span style={{ width: 1.5, flex: 1, minHeight: 38, background: e.s === 'pending' ? 'var(--ink-200)' : 'var(--ink-300)' }}/>}
                    </div>
                    <div style={{ flex: 1, paddingBottom: 18 }}>
                      <div style={{ display: 'flex', alignItems: 'center', gap: 10, flexWrap: 'wrap' }}>
                        <span style={{ fontWeight: 700, fontSize: 14 }}>{e.t}</span>
                        <span style={{ fontSize: 12, color: 'var(--ink-500)' }}>{e.d}</span>
                        {e.who && <Badge tone="neutral" size="sm">{e.who}</Badge>}
                      </div>
                      <div style={{ fontSize: 13, color: 'var(--ink-600)', marginTop: 4 }}>{e.log}</div>
                    </div>
                  </div>
                ))}
              </Card>

              {/* Échanges */}
              <Card>
                <SectionHeading title="Échanges avec l'administration" level={3} action={<Button variant="secondary" icon="messageSquare" size="sm">Nouveau message</Button>}/>
                {[
                  { from: 'DG État Civil · Mme Yolande NGUEMA', when: '21 mai · 14:08', d: 'Bonjour Marie, je prends en charge votre dossier. La vérification du registre prendra environ 24h, je reviens vers vous dès demain.', me: false },
                  { from: 'Vous', when: '20 mai · 14:35', d: 'Bonjour, merci beaucoup. Aurai-je besoin de me déplacer en mairie ?', me: true },
                ].map((m, i) => (
                  <div key={i} style={{ display: 'flex', flexDirection: m.me ? 'row-reverse' : 'row', gap: 12, marginTop: i === 0 ? 0 : 12 }}>
                    <Avatar name={m.from} tone={m.me ? 'primary' : 'green'} size={32}/>
                    <div style={{ maxWidth: 480, background: m.me ? 'var(--primary-50)' : 'var(--ink-100)', padding: '10px 14px', borderRadius: 10 }}>
                      <div style={{ fontSize: 11, fontWeight: 700, color: 'var(--ink-600)', marginBottom: 4 }}>{m.from} · <span style={{ fontWeight: 400 }}>{m.when}</span></div>
                      <div style={{ fontSize: 13.5, color: 'var(--ink-900)', lineHeight: 1.5 }}>{m.d}</div>
                    </div>
                  </div>
                ))}
              </Card>
            </div>

            {/* Sidebar */}
            <div style={{ display: 'flex', flexDirection: 'column', gap: 16 }}>
              <Card>
                <div style={{ fontSize: 11, fontWeight: 700, color: 'var(--ink-500)', textTransform: 'uppercase', letterSpacing: '0.06em' }}>Référence</div>
                <div style={{ fontFamily: 'var(--font-mono)', fontSize: 14, fontWeight: 700, marginTop: 4 }}>GC-2026-EC-002841</div>
                <div style={{ height: 1, background: 'var(--ink-150)', margin: '14px 0' }}/>
                <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '12px 8px', fontSize: 13 }}>
                  <div style={{ color: 'var(--ink-500)' }}>Statut</div><div><Badge tone="active" dot>En instruction</Badge></div>
                  <div style={{ color: 'var(--ink-500)' }}>Avancement</div><div style={{ fontWeight: 600 }}>60 %</div>
                  <div style={{ color: 'var(--ink-500)' }}>Délai estimé</div><div style={{ fontWeight: 600 }}>~ 1 j</div>
                  <div style={{ color: 'var(--ink-500)' }}>Agent</div><div style={{ fontWeight: 600 }}>Y. NGUEMA</div>
                </div>
              </Card>
              <Card>
                <div style={{ fontSize: 11, fontWeight: 700, color: 'var(--ink-500)', textTransform: 'uppercase', letterSpacing: '0.06em', marginBottom: 8 }}>Pièces du dossier</div>
                {['Récépissé scellé.pdf', 'CNI_obame.pdf', 'livret_famille.pdf'].map(f => (
                  <div key={f} style={{ display: 'flex', alignItems: 'center', gap: 8, padding: '8px 0', borderBottom: '1px solid var(--ink-150)' }}>
                    <Icon name="fileText" size={14} style={{ color: 'var(--ink-500)' }}/>
                    <span style={{ fontSize: 13, flex: 1 }}>{f}</span>
                    <Icon name="download" size={14} style={{ color: 'var(--ink-500)' }}/>
                  </div>
                ))}
              </Card>
              <Card>
                <div style={{ fontSize: 11, fontWeight: 700, color: 'var(--ink-500)', textTransform: 'uppercase', letterSpacing: '0.06em', marginBottom: 8 }}>Actions</div>
                <Button variant="outline" icon="download" style={{ width: '100%', justifyContent: 'flex-start' }}>Télécharger le récépissé</Button>
                <div style={{ height: 6 }}/>
                <Button variant="ghost" icon="xCircle" style={{ width: '100%', justifyContent: 'flex-start', color: 'var(--danger-500)' }}>Annuler la demande</Button>
              </Card>
            </div>
          </div>
        </main>
      </div>
    </Frame>
  );
};

/* ============================================================
   C6 · Document reçu / récépissé scellé
   ============================================================ */
const CitizenDocument = () => (
  <Frame width={1440} height={950} style={{ background: 'var(--ink-100)' }}>
    <AppHeader user="Marie OBAME" role="Citoyenne"/>
    <main style={{ padding: '32px 64px' }}>
      <div style={{ maxWidth: 1100, margin: '0 auto' }}>
        <nav style={{ display: 'flex', alignItems: 'center', gap: 6, fontSize: 13, color: 'var(--ink-600)', marginBottom: 12 }}>
          <a href="#">Mes documents</a><Icon name="chevronRight" size={12}/>
          <span style={{ color: 'var(--ink-900)', fontWeight: 600 }}>Acte de naissance · 28 mai 2026</span>
        </nav>
        <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: 20 }}>
          <div>
            <Badge tone="archived" dot icon="shieldCheck">Document signé électroniquement · valeur probante</Badge>
            <h1 style={{ fontSize: 30, marginTop: 12, letterSpacing: '-0.02em' }}>Acte de naissance · Marie Estelle OBAME</h1>
            <p style={{ fontSize: 14, color: 'var(--ink-600)', marginTop: 4 }}>Délivré le 28 mai 2026 par la DG État Civil · valable indéfiniment.</p>
          </div>
          <div style={{ display: 'flex', gap: 8 }}>
            <Button variant="secondary" icon="share">Partager</Button>
            <Button icon="download">Télécharger PDF</Button>
          </div>
        </div>

        <div style={{ display: 'grid', gridTemplateColumns: '1fr 360px', gap: 20 }}>
          {/* Document preview */}
          <div style={{
            background: 'white', border: '1px solid var(--ink-200)', borderRadius: 8,
            padding: '48px 56px', minHeight: 520, position: 'relative', boxShadow: 'var(--shadow-md)',
          }}>
            {/* Watermark */}
            <div aria-hidden="true" style={{
              position: 'absolute', top: '50%', left: '50%', transform: 'translate(-50%, -50%) rotate(-22deg)',
              fontSize: 72, fontWeight: 900, color: 'rgba(26, 68, 128, 0.06)', letterSpacing: '0.1em', userSelect: 'none', pointerEvents: 'none',
            }}>GABON CONNECT</div>

            <div style={{ display: 'flex', justifyContent: 'space-between', borderBottom: '2px solid var(--ink-900)', paddingBottom: 14, marginBottom: 28 }}>
              <div>
                <div style={{ fontSize: 11, fontWeight: 700, letterSpacing: '0.1em' }}>RÉPUBLIQUE GABONAISE</div>
                <div style={{ fontSize: 10, color: 'var(--ink-700)', marginTop: 2 }}>Union · Travail · Justice</div>
                <div style={{ fontSize: 11, fontWeight: 600, marginTop: 8 }}>Ministère de l'Intérieur</div>
                <div style={{ fontSize: 11, color: 'var(--ink-700)' }}>Direction Générale de l'État Civil</div>
              </div>
              <div style={{ textAlign: 'right' }}>
                <div style={{ fontSize: 11, color: 'var(--ink-600)' }}>Acte n° <b style={{ color: 'var(--ink-900)' }}>EC-LBV-2026-04812</b></div>
                <div style={{ fontSize: 11, color: 'var(--ink-600)' }}>Commune de <b style={{ color: 'var(--ink-900)' }}>Libreville</b></div>
                <div style={{ fontSize: 11, color: 'var(--ink-600)' }}>Année <b style={{ color: 'var(--ink-900)' }}>1992</b></div>
              </div>
            </div>

            <h2 style={{ fontSize: 22, textAlign: 'center', letterSpacing: '0.04em' }}>EXTRAIT D'ACTE DE NAISSANCE</h2>
            <p style={{ fontSize: 12, color: 'var(--ink-600)', textAlign: 'center', marginTop: 4 }}>(Copie intégrale)</p>

            <div style={{ marginTop: 32, display: 'grid', gridTemplateColumns: '180px 1fr', gap: '10px 16px', fontSize: 13.5 }}>
              {[
                ['Nom', 'OBAME'],
                ['Prénoms', 'Marie Estelle'],
                ['Sexe', 'Féminin'],
                ['Né(e) le', '14 mars 1992 à 03 h 22'],
                ['À', 'Libreville, province de l\'Estuaire'],
                ['Fils/Fille de', 'OBAME Jean-Pierre, instituteur'],
                ['Et de', 'MBOUMBA Antoinette, sage-femme'],
                ['Mentions marginales', '— Néant —'],
              ].map(([k, v]) => (
                <React.Fragment key={k}>
                  <div style={{ color: 'var(--ink-600)' }}>{k}</div>
                  <div style={{ fontWeight: 600 }}>{v}</div>
                </React.Fragment>
              ))}
            </div>

            <div style={{ marginTop: 36, paddingTop: 20, borderTop: '1px dashed var(--ink-300)', display: 'flex', justifyContent: 'space-between', alignItems: 'flex-end' }}>
              <div style={{ fontSize: 12, color: 'var(--ink-600)', maxWidth: 360 }}>
                Délivré conformément aux articles 71 et suivants du Code civil gabonais. Pour copie certifiée conforme à l'original.
              </div>
              <div style={{ textAlign: 'center' }}>
                <div style={{ fontSize: 10, color: 'var(--ink-600)' }}>L'officier d'état civil</div>
                <div style={{ fontFamily: 'cursive', fontSize: 22, color: 'var(--primary-700)', marginTop: 8, fontStyle: 'italic' }}>P. MOUSSAVOU</div>
                <div style={{ fontSize: 10, color: 'var(--ink-700)', marginTop: 4 }}>Libreville, le 28 mai 2026</div>
              </div>
            </div>
          </div>

          {/* Métadonnées probantes */}
          <div style={{ display: 'flex', flexDirection: 'column', gap: 14 }}>
            <ProbatoryBanner
              hash="8a3c5e7b9f1d4c2a6e8b3d7f5a9c1e2d4b6f8a0c5e7d9b3f1a4c6e8d2b5f9a7c"
              timestamp="28 mai 2026 · 16:47:22 UTC+1"
              signature="P. MOUSSAVOU · Officier d'état civil · DG État Civil"
            />
            <Card>
              <div style={{ fontSize: 11, fontWeight: 700, color: 'var(--ink-500)', textTransform: 'uppercase', letterSpacing: '0.06em', marginBottom: 8 }}>Vérification publique</div>
              <p style={{ fontSize: 13, color: 'var(--ink-700)', marginBottom: 14 }}>
                Tout tiers peut vérifier l'authenticité de ce document en scannant le QR code ci-dessous ou via gabon.connect/v.
              </p>
              <div style={{ display: 'flex', gap: 14, alignItems: 'center' }}>
                <div style={{ width: 100, height: 100, background: 'var(--ink-900)', borderRadius: 4, position: 'relative', flexShrink: 0 }}>
                  {/* QR pattern dummy */}
                  <svg width="100" height="100" viewBox="0 0 100 100">
                    {Array.from({ length: 196 }).map((_, i) => {
                      const r = Math.floor(i / 14), c = i % 14;
                      const on = (r * 31 + c * 17) % 7 < 3 || (r < 3 && c < 3) || (r > 10 && c < 3) || (r < 3 && c > 10);
                      return <rect key={i} x={c * 7 + 1} y={r * 7 + 1} width="6" height="6" fill={on ? 'white' : 'transparent'}/>;
                    })}
                  </svg>
                </div>
                <div style={{ fontSize: 12 }}>
                  <div style={{ color: 'var(--ink-500)' }}>Code</div>
                  <div style={{ fontFamily: 'var(--font-mono)', fontWeight: 700, fontSize: 15, marginTop: 2 }}>GC-EC-4812</div>
                  <a href="#" style={{ fontSize: 12, marginTop: 8, display: 'inline-block' }}>Vérifier en ligne →</a>
                </div>
              </div>
            </Card>
            <Card>
              <div style={{ fontSize: 11, fontWeight: 700, color: 'var(--ink-500)', textTransform: 'uppercase', letterSpacing: '0.06em', marginBottom: 8 }}>Lié à</div>
              {[
                { i: 'inbox', t: 'Demande GC-2026-EC-002841', d: 'Déposée le 20 mai · délai 8 j' },
                { i: 'folder', t: 'Mon dossier · État civil', d: '6 documents' },
              ].map(l => (
                <a key={l.t} href="#" style={{ display: 'flex', gap: 10, padding: '8px 0', borderBottom: '1px solid var(--ink-150)', textDecoration: 'none', color: 'inherit' }}>
                  <Icon name={l.i} size={16} style={{ color: 'var(--ink-500)', marginTop: 2 }}/>
                  <div>
                    <div style={{ fontSize: 13, fontWeight: 600 }}>{l.t}</div>
                    <div style={{ fontSize: 12, color: 'var(--ink-600)' }}>{l.d}</div>
                  </div>
                </a>
              ))}
            </Card>
          </div>
        </div>
      </div>
    </main>
  </Frame>
);

/* ============================================================
   C7 · Annuaire des administrations (vue publique)
   ============================================================ */
const CitizenDirectory = () => (
  <Frame width={1440} height={1000} style={{ background: 'white', overflow: 'hidden' }}>
    <RepublicBar/>
    <header style={{ borderBottom: '1px solid var(--ink-200)', padding: '14px 64px', display: 'flex', alignItems: 'center', gap: 24, background: 'white' }}>
      <Logo/>
      <nav style={{ display: 'flex', gap: 24, marginLeft: 32 }}>
        {['Démarches', 'Administrations', 'Mon espace', 'Aide'].map((l, i) => (
          <a key={l} href="#" style={{ fontSize: 14, fontWeight: i === 1 ? 700 : 500, color: i === 1 ? 'var(--primary-600)' : 'var(--ink-700)' }}>{l}</a>
        ))}
      </nav>
      <div style={{ flex: 1 }}/>
      <Button variant="secondary" icon="user">Marie OBAME</Button>
    </header>

    <PageHeader
      title="Annuaire des administrations"
      subtitle="47 organismes publics enregistrés sur Gabon Connect."
      actions={<div style={{ display: 'flex', gap: 8 }}>
        <TextInput placeholder="Rechercher une administration…" icon="search" style={{ width: 280 }}/>
        <Button variant="outline" icon="filter">Filtrer</Button>
      </div>}
    />

    <section style={{ padding: '24px 32px', background: 'var(--ink-50)' }}>
      <div style={{ display: 'flex', gap: 8, marginBottom: 18 }}>
        {['Tous (47)', 'Ministères (18)', 'Directions générales (14)', 'Établissements publics (9)', 'Collectivités (6)'].map((t, i) => (
          <button key={t} style={{
            padding: '6px 14px', borderRadius: 999, border: '1px solid var(--ink-200)',
            background: i === 0 ? 'var(--primary-500)' : 'white', color: i === 0 ? 'white' : 'var(--ink-800)',
            fontSize: 13, fontWeight: 600, cursor: 'pointer',
          }}>{t}</button>
        ))}
      </div>
      <div style={{ display: 'grid', gridTemplateColumns: 'repeat(3, 1fr)', gap: 12 }}>
        {[
          { n: 'Direction Générale de l\'État Civil', cat: 'Direction générale', svc: 14, t: 'État civil', i: 'user', delay: '48 h', tone: '#1a4480' },
          { n: 'Direction Gén. de la Documentation', cat: 'Direction générale', svc: 8, t: 'Identité & voyage', i: 'fingerprint', delay: '7 j', tone: '#2378c3' },
          { n: 'Ministère de la Justice', cat: 'Ministère', svc: 6, t: 'Justice', i: 'shield', delay: '72 h', tone: '#4a5876' },
          { n: 'ANPI-Gabon · Centre des entreprises', cat: 'Établissement public', svc: 11, t: 'Entreprise', i: 'building', delay: '72 h', tone: '#0a6e54' },
          { n: 'Direction Générale des Impôts', cat: 'Direction générale', svc: 9, t: 'Fiscalité', i: 'dollarSign', delay: '5 j', tone: '#b88600' },
          { n: 'CNAMGS', cat: 'Établissement public', svc: 7, t: 'Santé & social', i: 'shieldCheck', delay: '4 j', tone: '#a3315a' },
          { n: 'Mairie de Libreville', cat: 'Collectivité', svc: 12, t: 'Vie locale', i: 'home', delay: '3 j', tone: '#6b7a96' },
          { n: 'CNSS', cat: 'Établissement public', svc: 8, t: 'Travail & retraite', i: 'users', delay: '5 j', tone: '#1f6e75' },
          { n: 'DG Archives Nationales', cat: 'Direction générale', svc: 4, t: 'Patrimoine', i: 'archive', delay: '7 j', tone: '#5b3aa3' },
        ].map(o => (
          <div key={o.n} style={{ background: 'white', border: '1px solid var(--ink-200)', borderRadius: 10, padding: 18, display: 'flex', flexDirection: 'column', gap: 8 }}>
            <div style={{ display: 'flex', alignItems: 'flex-start', gap: 12 }}>
              <span style={{ width: 40, height: 40, borderRadius: 8, background: o.tone + '14', color: o.tone, display: 'inline-flex', alignItems: 'center', justifyContent: 'center', flexShrink: 0 }}>
                <Icon name={o.i} size={20}/>
              </span>
              <div style={{ flex: 1 }}>
                <div style={{ fontSize: 14.5, fontWeight: 700, color: 'var(--ink-900)', lineHeight: 1.3 }}>{o.n}</div>
                <div style={{ fontSize: 12, color: 'var(--ink-600)', marginTop: 2 }}>{o.cat} · {o.t}</div>
              </div>
            </div>
            <div style={{ height: 1, background: 'var(--ink-150)', margin: '4px 0' }}/>
            <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', fontSize: 12.5 }}>
              <span style={{ color: 'var(--ink-700)' }}><b>{o.svc}</b> services en ligne</span>
              <span style={{ color: 'var(--ink-700)' }}>Délai moy. <b>{o.delay}</b></span>
            </div>
            <a href="#" style={{ fontSize: 13, fontWeight: 600, marginTop: 2 }}>Voir les démarches →</a>
          </div>
        ))}
      </div>
    </section>
  </Frame>
);

/* ---------- Exports ---------- */
Object.assign(window, {
  CitizenHome, CitizenServiceDetail, CitizenDashboard,
  CitizenDeposit, CitizenTracking, CitizenDocument, CitizenDirectory,
});
