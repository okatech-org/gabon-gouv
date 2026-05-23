/* ============================================================
   Gabon Connect — App Plateforme
   Super-admin Digitalium · vue cross-organismes
   P1 Supervision · P2 Annuaire orgs · P3 Onboarding · P4 Stats
   ============================================================ */

const PLAT_USER = 'Hervé MOUSSAVOU';
const PLAT_ROLE = 'Admin plateforme';

const platNav = [
  { id: 'home', label: 'Supervision', icon: 'activity' },
  { id: 'orgs', label: 'Organisations', icon: 'building', count: 47 },
  { id: 'svc', label: 'Catalogue services', icon: 'layers', count: 128 },
  { id: 'cit', label: 'Citoyens', icon: 'users' },
  { id: 'stats', label: 'Statistiques', icon: 'barChart' },
  { section: 'Plateforme' },
  { id: 'infra', label: 'Infrastructure', icon: 'server' },
  { id: 'sec', label: 'Sécurité & audit', icon: 'shield' },
  { id: 'onboard', label: 'Onboarding', icon: 'userCheck' },
  { id: 'params', label: 'Paramètres', icon: 'settings' },
];

/* ============================================================
   P1 · Supervision multi-organismes
   ============================================================ */
const PlatformSupervision = () => (
  <Frame width={1440} height={1300}>
    <AppHeader org="Gabon Connect · Console plateforme" user={PLAT_USER} role={PLAT_ROLE}/>
    <div style={{ display: 'flex' }}>
      <Sidebar items={platNav} current="home"/>
      <main style={{ flex: 1, overflow: 'hidden' }}>
        <PageHeader
          breadcrumbs={['Supervision']}
          title="Vue plateforme · temps réel"
          subtitle="47 organismes connectés · 128 services publiés · 312 480 demandes traitées en 2025"
          meta={<>
            <Badge tone="archived" dot icon="checkCircle">Plateforme opérationnelle</Badge>
            <span style={{ fontSize: 12, color: 'var(--ink-600)' }}>Dernière sync · <b>il y a 4 sec</b></span>
          </>}
          actions={<><Select defaultValue="7"><option value="7">7 derniers jours</option><option>30 derniers jours</option><option>2026 (année)</option></Select><Button variant="outline" icon="download">Rapport</Button></>}
        />
        <div style={{ padding: '20px 32px', display: 'flex', flexDirection: 'column', gap: 16 }}>

          {/* KPI principaux */}
          <div style={{ display: 'grid', gridTemplateColumns: 'repeat(6, 1fr)', gap: 10 }}>
            <StatCard label="Organismes actifs" value="47" icon="building" hint="+ 3 ce mois" accent/>
            <StatCard label="Services publiés" value="128" icon="layers" delta="+11" deltaTone="success"/>
            <StatCard label="Demandes 7 j" value="14 218" icon="inbox" delta="+8 %" deltaTone="success"/>
            <StatCard label="Citoyens actifs" value="318 042" icon="users" delta="+12 %" deltaTone="success"/>
            <StatCard label="Documents émis" value="9 184" icon="fileText" hint="depuis lundi"/>
            <StatCard label="Délai moyen" value="2 j 14 h" icon="clock" delta="−9 %" deltaTone="success"/>
          </div>

          {/* Volume + santé */}
          <div style={{ display: 'grid', gridTemplateColumns: '1.5fr 1fr', gap: 16 }}>
            <Card>
              <SectionHeading title="Volume de demandes · plateforme entière" level={3}
                action={<Tabs tabs={[{id: 'v', label: 'Volume'}, {id: 'd', label: 'Délais'}, {id: 's', label: 'Satisfaction'}]} current="v" variant="pill"/>}/>
              <Sparkline values={[1142, 1284, 1208, 1342, 1196, 1418, 1387, 1502, 1378, 1486, 1572, 1448, 1614, 1538, 1496, 1742, 1684, 1612, 1842, 1768, 1714, 1928, 1874, 1782, 2046, 2014, 1862, 2184, 2128, 2218]} width={760} height={180}/>
              <div style={{ display: 'flex', justifyContent: 'space-between', fontSize: 11, color: 'var(--ink-500)', marginTop: 4, fontVariantNumeric: 'tabular-nums' }}>
                <span>21 avr.</span><span>1 mai</span><span>10 mai</span><span>20 mai</span>
              </div>
            </Card>
            <Card>
              <SectionHeading title="Santé des composants" level={3} action={<Badge tone="archived" dot>Tous OK</Badge>}/>
              {[
                { t: 'API publique', d: '/v1 · 99,998 % · 47 ms', st: 'ok' },
                { t: 'Identité numérique', d: 'RGPP · 99,87 %', st: 'ok' },
                { t: 'SAE Archives', d: 'NF Z42-013 · 100 %', st: 'ok' },
                { t: 'Messagerie inter-admin', d: 'S/MIME · 99,99 %', st: 'ok' },
                { t: 'Génération PDF', d: '4 nœuds · 124 req/s', st: 'ok' },
                { t: 'CDN Gabon', d: 'Owendo + Mvengue', st: 'warning' },
              ].map(c => (
                <div key={c.t} style={{ display: 'flex', alignItems: 'center', gap: 10, padding: '8px 0', borderBottom: '1px solid var(--ink-150)' }}>
                  <span style={{ width: 8, height: 8, borderRadius: '50%', background: c.st === 'ok' ? 'var(--success-500)' : 'var(--warning-500)' }}/>
                  <div style={{ flex: 1 }}>
                    <div style={{ fontSize: 13.5, fontWeight: 600 }}>{c.t}</div>
                    <div style={{ fontSize: 12, color: 'var(--ink-600)' }}>{c.d}</div>
                  </div>
                  <Badge tone={c.st === 'ok' ? 'archived' : 'warning'} size="sm">{c.st === 'ok' ? 'OK' : 'Dégradé'}</Badge>
                </div>
              ))}
            </Card>
          </div>

          {/* Top organismes */}
          <Card>
            <SectionHeading title="Activité par organisme" subtitle="Top 8 organismes par volume de demandes traitées sur 7 jours." level={3}
              action={<Button variant="ghost" iconRight="arrowRight" size="sm">Voir les 47 →</Button>}/>
            <Table>
              <thead>
                <tr>
                  <Th>Organisme</Th>
                  <Th sortable>Demandes 7 j</Th>
                  <Th>Services actifs</Th>
                  <Th>Délai moy.</Th>
                  <Th>Satisfaction</Th>
                  <Th>Capacité</Th>
                  <Th>Statut</Th>
                </tr>
              </thead>
              <tbody>
                {[
                  { n: 'DG État Civil', v: 3142, s: 14, d: '1 j 18 h', sat: '4,7', cap: 72, st: 'OK', tone: 'archived' },
                  { n: 'DG Documentation', v: 2418, s: 8, d: '5 j 14 h', sat: '4,3', cap: 88, st: 'OK', tone: 'archived' },
                  { n: 'DGI', v: 1842, s: 9, d: '3 j 8 h', sat: '4,1', cap: 64, st: 'OK', tone: 'archived' },
                  { n: 'Min. Justice', v: 1612, s: 6, d: '2 j 4 h', sat: '4,5', cap: 56, st: 'OK', tone: 'archived' },
                  { n: 'ANPI-Gabon', v: 1284, s: 11, d: '2 j 12 h', sat: '4,6', cap: 48, st: 'OK', tone: 'archived' },
                  { n: 'CNAMGS', v: 1042, s: 7, d: '4 j', sat: '4,2', cap: 91, st: 'Charge', tone: 'warning' },
                  { n: 'Mairie de Libreville', v: 924, s: 12, d: '2 j 18 h', sat: '4,4', cap: 68, st: 'OK', tone: 'archived' },
                  { n: 'CNSS', v: 868, s: 8, d: '4 j 14 h', sat: '4,0', cap: 74, st: 'OK', tone: 'archived' },
                ].map(r => (
                  <Tr key={r.n} onClick={() => {}}>
                    <Td><div style={{ display: 'flex', alignItems: 'center', gap: 10 }}><Icon name="building" size={16} style={{ color: 'var(--primary-500)' }}/><span style={{ fontWeight: 600 }}>{r.n}</span></div></Td>
                    <Td style={{ fontVariantNumeric: 'tabular-nums', fontWeight: 600 }}>{r.v.toLocaleString('fr-FR')}</Td>
                    <Td>{r.s}</Td>
                    <Td>{r.d}</Td>
                    <Td><span><Icon name="star" size={12} style={{ color: 'var(--warning-500)', verticalAlign: 'middle', marginRight: 4 }}/>{r.sat}/5</span></Td>
                    <Td style={{ minWidth: 160 }}><Progress value={r.cap} label={r.cap + ' %'} tone={r.cap > 85 ? 'warning' : 'primary'}/></Td>
                    <Td><Badge tone={r.tone} dot>{r.st}</Badge></Td>
                  </Tr>
                ))}
              </tbody>
            </Table>
          </Card>

          {/* Alertes + activité */}
          <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 16 }}>
            <Card>
              <SectionHeading title="Alertes en cours" level={3}/>
              <Alert tone="warning" title="CNAMGS · délai de traitement en hausse">
                Le délai moyen est passé à 4 j (+38 % vs 7 j précédents). Cause probable : pic d'affiliations.
                <div style={{ marginTop: 6, display: 'flex', gap: 10 }}><a href="#" style={{ fontWeight: 600 }}>Examiner →</a><a href="#" style={{ fontWeight: 600 }}>Notifier le DG →</a></div>
              </Alert>
              <div style={{ height: 8 }}/>
              <Alert tone="info" title="3 nouvelles administrations en cours d'onboarding">
                ARSEE (Énergie), Conseil constitutionnel, DG Tourisme. Étape : signature de la convention.
              </Alert>
              <div style={{ height: 8 }}/>
              <Alert tone="warning" title="CDN Mvengue · latence p95 élevée">
                Bascule automatique sur le nœud d'Owendo activée. Aucun impact citoyen détecté.
              </Alert>
            </Card>
            <Card>
              <SectionHeading title="Activité plateforme" level={3}/>
              {[
                { who: 'DG État Civil', act: 'a publié', what: 'Légalisation de signature', when: 'il y a 18 min', i: 'layers' },
                { who: 'ANPI-Gabon', act: 'a modifié', what: 'Workflow RCCM v3.1', when: 'il y a 1 h', i: 'edit' },
                { who: 'Y. MAGANGA (admin)', act: 'a accordé l\'accès à', what: 'DG Tourisme', when: 'il y a 3 h', i: 'userCheck' },
                { who: 'Système', act: 'a scellé', what: '14 218 demandes', when: 'il y a 4 h', i: 'shieldCheck' },
                { who: 'DG Impôts', act: 'a connecté', what: 'API e-Bilan', when: 'hier', i: 'externalLink' },
                { who: 'Min. Justice', act: 'a archivé', what: '412 dossiers (B3)', when: 'hier', i: 'archive' },
              ].map((a, i) => (
                <div key={i} style={{ display: 'flex', alignItems: 'center', gap: 10, padding: '8px 0', borderBottom: i === 5 ? 'none' : '1px solid var(--ink-150)' }}>
                  <span style={{ width: 28, height: 28, borderRadius: 6, background: 'var(--ink-100)', color: 'var(--ink-600)', display: 'inline-flex', alignItems: 'center', justifyContent: 'center', flexShrink: 0 }}>
                    <Icon name={a.i} size={14}/>
                  </span>
                  <div style={{ flex: 1 }}>
                    <div style={{ fontSize: 13 }}><b>{a.who}</b> {a.act} <a href="#" style={{ fontWeight: 600 }}>{a.what}</a></div>
                  </div>
                  <span style={{ fontSize: 11.5, color: 'var(--ink-500)' }}>{a.when}</span>
                </div>
              ))}
            </Card>
          </div>

        </div>
      </main>
    </div>
  </Frame>
);

/* ============================================================
   P2 · Annuaire organisations (back-office plateforme)
   ============================================================ */
const PlatformOrgs = () => (
  <Frame width={1440} height={1000}>
    <AppHeader org="Gabon Connect · Console plateforme" user={PLAT_USER} role={PLAT_ROLE}/>
    <div style={{ display: 'flex' }}>
      <Sidebar items={platNav} current="orgs"/>
      <main style={{ flex: 1, overflow: 'hidden' }}>
        <PageHeader
          breadcrumbs={['Organisations']}
          title="Organisations enregistrées"
          subtitle="47 administrations actives · 3 en onboarding · 1 suspendue"
          actions={<><Button variant="outline" icon="download">Export</Button><Button icon="plus">Enregistrer une administration</Button></>}
        />
        <div style={{ padding: '20px 32px', display: 'flex', flexDirection: 'column', gap: 16 }}>

          <div style={{ display: 'grid', gridTemplateColumns: 'repeat(5, 1fr)', gap: 10 }}>
            <StatCard label="Total" value="51" icon="building"/>
            <StatCard label="Actives" value="47" icon="checkCircle" hint="92 %"/>
            <StatCard label="En onboarding" value="3" icon="userCheck"/>
            <StatCard label="Suspendues" value="1" icon="alertTriangle"/>
            <StatCard label="Provinces couvertes" value="9 / 9" icon="mapPin"/>
          </div>

          <Card>
            <div style={{ display: 'flex', alignItems: 'center', gap: 12, marginBottom: 12 }}>
              <Tabs tabs={[{id: 'all', label: 'Toutes (51)'}, {id: 'act', label: 'Actives (47)'}, {id: 'on', label: 'Onboarding (3)'}, {id: 'sus', label: 'Suspendues (1)'}]} current="all" variant="pill"/>
              <div style={{ flex: 1 }}/>
              <TextInput placeholder="Rechercher…" icon="search" style={{ width: 240 }}/>
              <Select defaultValue="all" style={{ width: 180 }}><option value="all">Toutes catégories</option></Select>
            </div>
            <Table>
              <thead>
                <tr>
                  <Th>Organisation</Th>
                  <Th>Catégorie</Th>
                  <Th>Province</Th>
                  <Th>Statut</Th>
                  <Th>Connexion</Th>
                  <Th sortable>Services</Th>
                  <Th sortable>Volume 30 j</Th>
                  <Th>Conv. signée</Th>
                  <Th>{' '}</Th>
                </tr>
              </thead>
              <tbody>
                {[
                  { n: 'Direction Gén. de l\'État Civil', cat: 'Direction générale', p: 'Estuaire', st: 'Active', tone: 'archived', c: 'API + SSO', s: 14, v: '12 184', d: '03/2024' },
                  { n: 'Direction Gén. de la Documentation', cat: 'Direction générale', p: 'Estuaire', st: 'Active', tone: 'archived', c: 'API + SSO', s: 8, v: '9 842', d: '03/2024' },
                  { n: 'Ministère de la Justice', cat: 'Ministère', p: 'Estuaire', st: 'Active', tone: 'archived', c: 'API + SSO', s: 6, v: '6 218', d: '04/2024' },
                  { n: 'ANPI-Gabon', cat: 'Établissement public', p: 'Estuaire', st: 'Active', tone: 'archived', c: 'API + SSO', s: 11, v: '5 144', d: '05/2024' },
                  { n: 'Direction Gén. des Impôts', cat: 'Direction générale', p: 'Estuaire', st: 'Active', tone: 'archived', c: 'API + SSO', s: 9, v: '7 412', d: '04/2024' },
                  { n: 'CNAMGS', cat: 'Établissement public', p: 'Estuaire', st: 'Active', tone: 'archived', c: 'API + SSO', s: 7, v: '4 218', d: '06/2024' },
                  { n: 'Mairie de Libreville', cat: 'Collectivité', p: 'Estuaire', st: 'Active', tone: 'archived', c: 'Portail', s: 12, v: '3 712', d: '01/2025' },
                  { n: 'ARSEE · Régulation Énergie', cat: 'Autorité', p: 'Estuaire', st: 'Onboarding', tone: 'warning', c: '—', s: 0, v: '—', d: 'En cours' },
                  { n: 'Conseil constitutionnel', cat: 'Institution', p: 'Estuaire', st: 'Onboarding', tone: 'warning', c: '—', s: 0, v: '—', d: 'En cours' },
                  { n: 'DG Tourisme', cat: 'Direction générale', p: 'Estuaire', st: 'Onboarding', tone: 'warning', c: '—', s: 0, v: '—', d: 'En cours' },
                  { n: 'Mairie de Tchibanga', cat: 'Collectivité', p: 'Nyanga', st: 'Suspendue', tone: 'danger', c: 'Portail', s: 8, v: '—', d: '02/2025' },
                ].map(o => (
                  <Tr key={o.n} onClick={() => {}}>
                    <Td><div style={{ display: 'flex', alignItems: 'center', gap: 10 }}><Icon name="building" size={16} style={{ color: 'var(--primary-500)' }}/><span style={{ fontWeight: 600 }}>{o.n}</span></div></Td>
                    <Td>{o.cat}</Td>
                    <Td>{o.p}</Td>
                    <Td><Badge tone={o.tone} dot>{o.st}</Badge></Td>
                    <Td>{o.c !== '—' ? <Badge tone={o.c === 'API + SSO' ? 'archived' : 'neutral'} size="sm">{o.c}</Badge> : <span style={{ color: 'var(--ink-400)' }}>—</span>}</Td>
                    <Td style={{ fontVariantNumeric: 'tabular-nums', fontWeight: 600 }}>{o.s}</Td>
                    <Td style={{ fontVariantNumeric: 'tabular-nums', fontWeight: 600 }}>{o.v}</Td>
                    <Td>{o.d}</Td>
                    <Td><Icon name="moreH" size={16} style={{ color: 'var(--ink-400)' }}/></Td>
                  </Tr>
                ))}
              </tbody>
            </Table>
          </Card>
        </div>
      </main>
    </div>
  </Frame>
);

/* ============================================================
   P3 · Onboarding d'une nouvelle administration
   ============================================================ */
const PlatformOnboarding = () => (
  <Frame width={1440} height={1050}>
    <AppHeader org="Gabon Connect · Console plateforme" user={PLAT_USER} role={PLAT_ROLE}/>
    <div style={{ display: 'flex' }}>
      <Sidebar items={platNav} current="onboard"/>
      <main style={{ flex: 1, overflow: 'hidden' }}>
        <PageHeader
          breadcrumbs={['Onboarding', 'ARSEE — Régulation Énergie']}
          title="Onboarding · ARSEE"
          subtitle="Autorité de Régulation du Secteur de l'Eau potable et de l'Énergie électrique"
          meta={<>
            <Badge tone="warning" dot>Étape 4 / 7 · Convention</Badge>
            <span style={{ fontSize: 12, color: 'var(--ink-600)' }}>Initié le 02 mai 2026 par <b>Y. MAGANGA</b></span>
          </>}
          actions={<><Button variant="ghost" icon="messageSquare">Contacter</Button><Button variant="secondary" icon="save">Sauvegarder</Button><Button icon="check">Valider l'étape</Button></>}
        />

        <div style={{ padding: '20px 32px', display: 'grid', gridTemplateColumns: '280px 1fr', gap: 24 }}>
          {/* Stepper vertical */}
          <Card padded={false}>
            <div style={{ padding: '14px 16px', borderBottom: '1px solid var(--ink-150)' }}>
              <div style={{ fontSize: 11, fontWeight: 700, color: 'var(--ink-500)', textTransform: 'uppercase', letterSpacing: '0.06em' }}>Étapes d'onboarding</div>
            </div>
            <div style={{ padding: 14 }}>
              {[
                { t: 'Identification de l\'organisme', s: 'done' },
                { t: 'Désignation des référents', s: 'done' },
                { t: 'Habilitations & rôles', s: 'done' },
                { t: 'Signature de la convention', s: 'active' },
                { t: 'Catalogue des services', s: 'pending' },
                { t: 'Tests d\'intégration API', s: 'pending' },
                { t: 'Mise en production', s: 'pending' },
              ].map((s, i, arr) => (
                <div key={i} style={{ display: 'flex', gap: 10, alignItems: 'flex-start' }}>
                  <div style={{ display: 'flex', flexDirection: 'column', alignItems: 'center' }}>
                    <span style={{ width: 24, height: 24, borderRadius: '50%', background: s.s === 'done' ? 'var(--success-500)' : s.s === 'active' ? 'var(--primary-500)' : 'white', border: `1.5px solid ${s.s === 'done' ? 'var(--success-500)' : s.s === 'active' ? 'var(--primary-500)' : 'var(--ink-300)'}`, color: s.s === 'pending' ? 'var(--ink-500)' : 'white', display: 'inline-flex', alignItems: 'center', justifyContent: 'center', fontSize: 11, fontWeight: 700 }}>
                      {s.s === 'done' ? <Icon name="check" size={11} stroke={3}/> : i + 1}
                    </span>
                    {i < arr.length - 1 && <span style={{ width: 1.5, flex: 1, minHeight: 26, background: s.s === 'pending' ? 'var(--ink-200)' : 'var(--ink-300)' }}/>}
                  </div>
                  <div style={{ flex: 1, paddingBottom: 12 }}>
                    <div style={{ fontSize: 13, fontWeight: s.s === 'active' ? 700 : 500, color: s.s === 'active' ? 'var(--primary-700)' : 'var(--ink-800)' }}>{s.t}</div>
                  </div>
                </div>
              ))}
            </div>
          </Card>

          <div style={{ display: 'flex', flexDirection: 'column', gap: 16 }}>
            {/* Fiche organisme */}
            <Card>
              <SectionHeading title="Fiche organisme" subtitle="Récapitulatif des informations collectées aux étapes 1 à 3." level={3}/>
              <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '14px 32px', fontSize: 13.5 }}>
                {[
                  ['Dénomination', 'Autorité de Régulation du Secteur de l\'Eau potable et de l\'Énergie électrique'],
                  ['Forme juridique', 'Autorité administrative indépendante'],
                  ['Sigle', 'ARSEE'],
                  ['Tutelle', 'Présidence de la République'],
                  ['Décret de création', 'n° 2009-1245 du 15 décembre 2009'],
                  ['Siège', 'Immeuble Pétro Gabon · Libreville · Estuaire'],
                  ['NIF', '739-A-7818-44'],
                  ['Téléphone officiel', '+241 01 73 27 90'],
                ].map(([k, v]) => (
                  <div key={k} style={{ display: 'grid', gridTemplateColumns: '180px 1fr' }}>
                    <span style={{ color: 'var(--ink-500)' }}>{k}</span>
                    <span style={{ fontWeight: 600 }}>{v}</span>
                  </div>
                ))}
              </div>
            </Card>

            {/* Référents */}
            <Card>
              <SectionHeading title="Référents désignés" subtitle="3 référents avec habilitations." level={3} action={<Button variant="ghost" icon="plus" size="sm">Ajouter</Button>}/>
              <Table>
                <thead><tr><Th>Nom</Th><Th>Fonction</Th><Th>E-mail</Th><Th>Rôle Gabon Connect</Th><Th>Authentification</Th><Th>{' '}</Th></tr></thead>
                <tbody>
                  {[
                    { n: 'M. Théophile NTOUTOUME', f: 'Directeur général', e: 't.ntoutoume@arsee.ga', r: 'Admin organisme', auth: 'NIP + carte agent' },
                    { n: 'Mme Léa MENGUE', f: 'Chef du service juridique', e: 'l.mengue@arsee.ga', r: 'Agent superviseur', auth: 'NIP + carte agent' },
                    { n: 'M. Eric ASSEKO', f: 'DSI', e: 'e.asseko@arsee.ga', r: 'Admin technique (API)', auth: 'NIP + clé API' },
                  ].map(p => (
                    <Tr key={p.e}>
                      <Td><div style={{ display: 'flex', alignItems: 'center', gap: 8 }}><Avatar name={p.n} tone="primary" size={24}/><span style={{ fontWeight: 600 }}>{p.n}</span></div></Td>
                      <Td>{p.f}</Td>
                      <Td style={{ color: 'var(--ink-600)' }}>{p.e}</Td>
                      <Td><Badge tone="primary" size="sm">{p.r}</Badge></Td>
                      <Td>{p.auth}</Td>
                      <Td><Icon name="moreH" size={16} style={{ color: 'var(--ink-400)' }}/></Td>
                    </Tr>
                  ))}
                </tbody>
              </Table>
            </Card>

            {/* Convention */}
            <Card>
              <SectionHeading title="Signature de la convention" subtitle="Étape en cours — convention type pour les autorités administratives indépendantes." level={3}/>
              <div style={{ display: 'grid', gridTemplateColumns: '1fr 320px', gap: 20 }}>
                <div>
                  <div style={{ border: '1px solid var(--ink-200)', borderRadius: 8, padding: 20, background: 'var(--ink-50)' }}>
                    <div style={{ display: 'flex', alignItems: 'center', gap: 12 }}>
                      <span style={{ width: 44, height: 44, borderRadius: 6, background: 'var(--primary-500)', color: 'white', display: 'inline-flex', alignItems: 'center', justifyContent: 'center' }}>
                        <Icon name="fileText" size={20}/>
                      </span>
                      <div style={{ flex: 1 }}>
                        <div style={{ fontSize: 14.5, fontWeight: 700 }}>Convention d'adhésion Gabon Connect · ARSEE</div>
                        <div style={{ fontSize: 12.5, color: 'var(--ink-600)' }}>v 2.4 · 14 articles · 18 pages · générée le 18/05/2026</div>
                      </div>
                      <Button variant="secondary" size="sm" icon="eye">Lire</Button>
                    </div>
                  </div>
                  <div style={{ marginTop: 12 }}>
                    <Checkbox checked={true} label="Article 1 — Objet et périmètre validés" id="a1"/>
                    <div style={{ height: 6 }}/>
                    <Checkbox checked={true} label="Article 4 — Engagements de service (SLA, support, sécurité)" id="a4"/>
                    <div style={{ height: 6 }}/>
                    <Checkbox checked={true} label="Article 7 — Protection des données personnelles (loi 001/2011)" id="a7"/>
                    <div style={{ height: 6 }}/>
                    <Checkbox checked={false} label="Article 11 — Tarification & facturation (en attente de validation DGB)" id="a11"/>
                  </div>
                </div>
                <div style={{ display: 'flex', flexDirection: 'column', gap: 12 }}>
                  <div style={{ fontSize: 11, fontWeight: 700, color: 'var(--ink-500)', textTransform: 'uppercase', letterSpacing: '0.06em' }}>Signataires</div>
                  {[
                    { who: 'Y. MAGANGA · Gabon Connect', st: 'Signé · 18/05/2026', tone: 'archived' },
                    { who: 'T. NTOUTOUME · DG ARSEE', st: 'En attente de signature', tone: 'warning' },
                  ].map(s => (
                    <div key={s.who} style={{ display: 'flex', alignItems: 'center', gap: 10, padding: 10, background: 'var(--ink-50)', borderRadius: 6 }}>
                      <Icon name="fingerprint" size={16} style={{ color: 'var(--ink-500)' }}/>
                      <div style={{ flex: 1 }}>
                        <div style={{ fontSize: 13, fontWeight: 600 }}>{s.who}</div>
                        <Badge tone={s.tone} size="sm" dot>{s.st}</Badge>
                      </div>
                    </div>
                  ))}
                  <Button variant="success" icon="shieldCheck" style={{ marginTop: 8 }}>Lancer la signature</Button>
                </div>
              </div>
            </Card>
          </div>
        </div>
      </main>
    </div>
  </Frame>
);

/* ============================================================
   P4 · Statistiques plateforme
   ============================================================ */
const PlatformStats = () => (
  <Frame width={1440} height={1200}>
    <AppHeader org="Gabon Connect · Console plateforme" user={PLAT_USER} role={PLAT_ROLE}/>
    <div style={{ display: 'flex' }}>
      <Sidebar items={platNav} current="stats"/>
      <main style={{ flex: 1, overflow: 'hidden' }}>
        <PageHeader
          breadcrumbs={['Statistiques']}
          title="Statistiques d'usage"
          subtitle="Rapport public · indicateurs d'impact de la transformation numérique"
          actions={<><Select defaultValue="2026"><option value="2026">Année 2026</option><option>2025</option></Select><Button variant="outline" icon="printer">Rapport PDF</Button><Button variant="outline" icon="share">Partager</Button></>}
        />
        <div style={{ padding: '20px 32px', display: 'flex', flexDirection: 'column', gap: 16 }}>

          {/* Key impact */}
          <div style={{ display: 'grid', gridTemplateColumns: 'repeat(4, 1fr)', gap: 12 }}>
            <StatCard label="Citoyens inscrits" value="318 042" icon="users" delta="+47 %" deltaTone="success" hint="vs 2025" accent/>
            <StatCard label="Démarches dématérialisées" value="72 %" icon="trendingUp" delta="+18 pts" deltaTone="success" hint="objectif PND : 80 %"/>
            <StatCard label="Économies d'usagers" value="184 M FCFA" icon="dollarSign" hint="transport + temps"/>
            <StatCard label="CO₂ évité" value="412 t" icon="zap" hint="déplacements évités"/>
          </div>

          {/* Évolution annuelle */}
          <Card>
            <SectionHeading title="Demandes traitées · 12 derniers mois" level={3}
              action={<Tabs tabs={[{id: 'v', label: 'Volume'}, {id: 'd', label: 'Délais'}, {id: 'c', label: 'Catégories'}]} current="v" variant="pill"/>}/>
            <Sparkline values={[8420, 9180, 10240, 11820, 12640, 13180, 14420, 15640, 16240, 17820, 19180, 21420]} width={1200} height={200}/>
            <div style={{ display: 'flex', justifyContent: 'space-between', fontSize: 12, color: 'var(--ink-500)', marginTop: 4, fontVariantNumeric: 'tabular-nums' }}>
              {['Juin', 'Juil.', 'Août', 'Sept.', 'Oct.', 'Nov.', 'Déc.', 'Janv.', 'Févr.', 'Mars', 'Avril', 'Mai'].map(m => <span key={m}>{m}</span>)}
            </div>
          </Card>

          {/* Decomposition + provinces */}
          <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 16 }}>
            <Card>
              <SectionHeading title="Top 8 démarches" level={3}/>
              {[
                { t: 'Acte de naissance', v: 48214, pct: 100 },
                { t: 'CNI / renouvellement', v: 38122, pct: 79 },
                { t: 'Passeport biométrique', v: 32184, pct: 67 },
                { t: 'Casier judiciaire B3', v: 28412, pct: 59 },
                { t: 'Déclaration fiscale IRPP', v: 22184, pct: 46 },
                { t: 'Certificat de nationalité', v: 18420, pct: 38 },
                { t: 'Affiliation CNAMGS', v: 14218, pct: 30 },
                { t: 'Immatriculation RCCM', v: 9142, pct: 19 },
              ].map(r => (
                <div key={r.t} style={{ display: 'grid', gridTemplateColumns: '1fr 80px', alignItems: 'center', gap: 12, padding: '8px 0' }}>
                  <div>
                    <div style={{ display: 'flex', justifyContent: 'space-between', fontSize: 13, marginBottom: 4 }}>
                      <span style={{ fontWeight: 500 }}>{r.t}</span>
                      <span style={{ fontVariantNumeric: 'tabular-nums', color: 'var(--ink-600)', fontSize: 12 }}>{r.v.toLocaleString('fr-FR')}</span>
                    </div>
                    <div style={{ height: 6, background: 'var(--ink-150)', borderRadius: 999 }}>
                      <div style={{ width: `${r.pct}%`, height: '100%', background: 'var(--primary-500)', borderRadius: 999 }}/>
                    </div>
                  </div>
                  <span style={{ fontSize: 12, color: 'var(--ink-700)', textAlign: 'right' }}>{r.pct} %</span>
                </div>
              ))}
            </Card>
            <Card>
              <SectionHeading title="Répartition par province" subtitle="Demandes émises en 2026, en milliers." level={3}/>
              <div style={{ display: 'flex', alignItems: 'flex-end', gap: 6, height: 220, paddingTop: 12 }}>
                {[
                  { p: 'Estuaire', v: 142, pct: 100, c: 'var(--primary-500)' },
                  { p: 'Haut-Ogooué', v: 38, pct: 27, c: 'var(--primary-400)' },
                  { p: 'Moyen-Ogooué', v: 22, pct: 15, c: 'var(--primary-400)' },
                  { p: 'Ngounié', v: 26, pct: 18, c: 'var(--primary-400)' },
                  { p: 'Nyanga', v: 14, pct: 10, c: 'var(--primary-400)' },
                  { p: 'Ogooué-Ivindo', v: 12, pct: 8, c: 'var(--primary-400)' },
                  { p: 'Ogooué-Lolo', v: 14, pct: 10, c: 'var(--primary-400)' },
                  { p: 'Ogooué-Maritime', v: 42, pct: 30, c: 'var(--primary-400)' },
                  { p: 'Woleu-Ntem', v: 28, pct: 20, c: 'var(--primary-400)' },
                ].map(b => (
                  <div key={b.p} style={{ flex: 1, display: 'flex', flexDirection: 'column', alignItems: 'center', gap: 6, height: '100%' }}>
                    <div style={{ flex: 1, width: '100%', display: 'flex', alignItems: 'flex-end' }}>
                      <div style={{ width: '100%', height: `${b.pct}%`, background: b.c, borderRadius: '4px 4px 0 0', position: 'relative' }}>
                        <span style={{ position: 'absolute', top: -18, left: '50%', transform: 'translateX(-50%)', fontSize: 11, fontWeight: 700, color: 'var(--ink-700)' }}>{b.v} k</span>
                      </div>
                    </div>
                    <span style={{ fontSize: 10, color: 'var(--ink-600)', textAlign: 'center', whiteSpace: 'nowrap', transform: 'rotate(-30deg)', transformOrigin: 'top right' }}>{b.p}</span>
                  </div>
                ))}
              </div>
            </Card>
          </div>

          {/* SLA + Satisfaction */}
          <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr 1fr', gap: 16 }}>
            <Card>
              <SectionHeading title="Respect des SLA" level={3}/>
              <div style={{ display: 'flex', justifyContent: 'center', padding: '14px 0' }}>
                <Donut value={87} label="87 %" color="var(--success-500)"/>
              </div>
              <div style={{ fontSize: 13, color: 'var(--ink-600)', textAlign: 'center' }}>
                <b style={{ color: 'var(--ink-900)' }}>271 678 / 312 480</b> demandes respectent leur délai contractuel.
              </div>
            </Card>
            <Card>
              <SectionHeading title="Satisfaction citoyenne" level={3}/>
              <div style={{ display: 'flex', alignItems: 'center', gap: 14, padding: '14px 0' }}>
                <div style={{ fontSize: 48, fontWeight: 800, letterSpacing: '-0.02em', color: 'var(--primary-500)' }}>4,5<span style={{ fontSize: 22, color: 'var(--ink-500)' }}>/5</span></div>
                <div style={{ flex: 1 }}>
                  {[5, 4, 3, 2, 1].map(s => (
                    <div key={s} style={{ display: 'flex', alignItems: 'center', gap: 8, marginBottom: 4 }}>
                      <span style={{ fontSize: 11, color: 'var(--ink-600)', width: 12 }}>{s}</span>
                      <div style={{ flex: 1, height: 5, background: 'var(--ink-150)', borderRadius: 999 }}>
                        <div style={{ width: [62, 24, 8, 4, 2][5 - s] + '%', height: '100%', background: 'var(--warning-500)', borderRadius: 999 }}/>
                      </div>
                      <span style={{ fontSize: 11, color: 'var(--ink-500)', width: 32, textAlign: 'right' }}>{[62, 24, 8, 4, 2][5 - s]} %</span>
                    </div>
                  ))}
                </div>
              </div>
              <div style={{ fontSize: 12, color: 'var(--ink-500)', textAlign: 'center' }}>Sur 18 412 avis vérifiés</div>
            </Card>
            <Card>
              <SectionHeading title="Adoption mobile" level={3}/>
              <div style={{ display: 'flex', justifyContent: 'center', padding: '14px 0' }}>
                <Donut value={68} label="68 %" color="var(--primary-500)"/>
              </div>
              <div style={{ fontSize: 13, color: 'var(--ink-600)', textAlign: 'center' }}>
                des démarches effectuées <b style={{ color: 'var(--ink-900)' }}>depuis un smartphone</b>.
              </div>
            </Card>
          </div>

        </div>
      </main>
    </div>
  </Frame>
);

const Donut = ({ value, label, color = 'var(--primary-500)' }) => {
  const r = 56, c = 2 * Math.PI * r;
  const off = c - (value / 100) * c;
  return (
    <svg width="140" height="140" viewBox="0 0 140 140">
      <circle cx="70" cy="70" r={r} fill="none" stroke="var(--ink-150)" strokeWidth="14"/>
      <circle cx="70" cy="70" r={r} fill="none" stroke={color} strokeWidth="14"
        strokeDasharray={c} strokeDashoffset={off} strokeLinecap="round"
        transform="rotate(-90 70 70)"/>
      <text x="70" y="74" textAnchor="middle" fontSize="22" fontWeight="700" fill="var(--ink-900)">{label}</text>
    </svg>
  );
};

/* ---------- Exports ---------- */
Object.assign(window, {
  PlatformSupervision, PlatformOrgs, PlatformOnboarding, PlatformStats,
});
