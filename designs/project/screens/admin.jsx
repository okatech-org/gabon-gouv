/* ============================================================
   Gabon Connect — App Administration
   Back-office d'un organisme : la DG État Civil dans cet exemple
   A1 Dashboard · A2 File demandes · A3 Instruction · A4 Dossier 360°
   A5 Génération doc · A6 Correspondance inter-admin · A7 Archives SAE
   A8 Catalogue services · A9 Annuaire admins
   ============================================================ */

const ADMIN_ORG = 'Direction Gén. de l\'État Civil';
const ADMIN_USER = 'Yolande NGUEMA';
const ADMIN_ROLE = 'Agent instructeur';

const adminNav = [
  { id: 'home', label: 'Tableau de bord', icon: 'home' },
  { id: 'queue', label: 'File de demandes', icon: 'inbox', count: 47 },
  { id: 'dossiers', label: 'Dossiers citoyens', icon: 'folder' },
  { id: 'documents', label: 'Génération', icon: 'fileText' },
  { id: 'archives', label: 'Archives (SAE)', icon: 'archive' },
  { id: 'correspondance', label: 'Correspondance', icon: 'mail', count: 3 },
  { section: 'Organisme' },
  { id: 'services', label: 'Mes services', icon: 'layers' },
  { id: 'annuaire', label: 'Annuaire', icon: 'building' },
  { id: 'equipe', label: 'Équipe', icon: 'users' },
  { id: 'parametres', label: 'Paramètres', icon: 'settings' },
];

/* ============================================================
   A1 · Dashboard organisme
   ============================================================ */
const AdminDashboard = () => (
  <Frame width={1440} height={1100}>
    <AppHeader org={ADMIN_ORG} user={ADMIN_USER} role={ADMIN_ROLE}/>
    <div style={{ display: 'flex', minHeight: 'calc(1100px - 63px)' }}>
      <Sidebar items={adminNav} current="home"/>
      <main style={{ flex: 1, overflow: 'hidden' }}>
        <PageHeader
          breadcrumbs={['DG État Civil', 'Tableau de bord']}
          title="Bonjour Yolande 👋"
          subtitle="47 demandes en file d'attente · 12 vous sont assignées · 3 en retard."
          actions={<><Button variant="secondary" icon="download">Exporter</Button><Button icon="plus">Nouvelle action</Button></>}
        />
        <div style={{ padding: '24px 32px', display: 'flex', flexDirection: 'column', gap: 24 }}>

          {/* KPI top */}
          <div style={{ display: 'grid', gridTemplateColumns: 'repeat(5, 1fr)', gap: 12 }}>
            <StatCard label="En file d'attente" value="47" icon="inbox" delta="+8 aujourd'hui" deltaTone="warning"/>
            <StatCard label="En cours" value="124" icon="refresh"/>
            <StatCard label="Traitées 7 j" value="318" icon="checkCircle" delta="+12 %" deltaTone="success"/>
            <StatCard label="Délai moyen" value="1 j 18 h" icon="clock" delta="−14 %" deltaTone="success"/>
            <StatCard label="Satisfaction" value="4,6/5" icon="star" hint="184 avis"/>
          </div>

          {/* Volume + breakdown */}
          <div style={{ display: 'grid', gridTemplateColumns: '1.6fr 1fr', gap: 16 }}>
            <Card>
              <SectionHeading title="Volume traité · 30 derniers jours" level={3}
                action={<Tabs tabs={[{id: 'd', label: 'Demandes'}, {id: 'd2', label: 'Délais'}]} current="d" variant="pill"/>}/>
              <Sparkline values={[42, 58, 51, 73, 64, 88, 79, 92, 71, 84, 96, 81, 103, 94, 88, 112, 106, 98, 124, 117, 109, 134, 128, 119, 142, 138, 126, 151, 146, 148]} width={760} height={160}/>
              <div style={{ display: 'flex', justifyContent: 'space-between', fontSize: 11, color: 'var(--ink-500)', marginTop: 4, fontVariantNumeric: 'tabular-nums' }}>
                <span>21 avr.</span><span>1 mai</span><span>10 mai</span><span>20 mai</span>
              </div>
            </Card>
            <Card>
              <SectionHeading title="Répartition par type" level={3}/>
              {[
                { t: 'Acte de naissance', n: 142, pct: 48, c: 'var(--primary-500)' },
                { t: 'Acte de mariage', n: 68, pct: 23, c: 'var(--success-500)' },
                { t: 'Certificat de nationalité', n: 52, pct: 17, c: 'var(--warning-500)' },
                { t: 'Acte de décès', n: 26, pct: 9, c: 'var(--ink-500)' },
                { t: 'Autres', n: 10, pct: 3, c: 'var(--ink-300)' },
              ].map(r => (
                <div key={r.t} style={{ marginTop: 8 }}>
                  <div style={{ display: 'flex', justifyContent: 'space-between', fontSize: 12.5, marginBottom: 4 }}>
                    <span style={{ display: 'inline-flex', alignItems: 'center', gap: 6 }}>
                      <span style={{ width: 8, height: 8, borderRadius: 2, background: r.c }}/>{r.t}
                    </span>
                    <span style={{ fontWeight: 600 }}>{r.n} · {r.pct} %</span>
                  </div>
                  <div style={{ height: 5, background: 'var(--ink-150)', borderRadius: 999 }}>
                    <div style={{ width: `${r.pct}%`, height: '100%', background: r.c, borderRadius: 999 }}/>
                  </div>
                </div>
              ))}
            </Card>
          </div>

          {/* Mes demandes assignées */}
          <Card>
            <SectionHeading title="Mes demandes assignées" level={3}
              action={<div style={{ display: 'flex', gap: 8 }}>
                <Tabs tabs={[{id: 'a', label: 'À traiter (12)'}, {id: 'b', label: 'En attente citoyen (4)'}, {id: 'c', label: 'Terminées'}]} current="a" variant="pill"/>
              </div>}/>
            <Table>
              <thead>
                <tr>
                  <Th><Checkbox checked={false} id="all"/></Th>
                  <Th sortable>Référence</Th>
                  <Th>Démarche</Th>
                  <Th>Citoyen</Th>
                  <Th sortable>Déposée</Th>
                  <Th>Échéance</Th>
                  <Th>Statut</Th>
                  <Th>{' '}</Th>
                </tr>
              </thead>
              <tbody>
                {[
                  { ref: 'GC-2026-EC-002841', t: 'Acte de naissance · copie intégrale', c: 'Marie OBAME', dep: 'il y a 14 h', ech: 'dans 1 j', st: 'En instruction', tone: 'active', urgent: false },
                  { ref: 'GC-2026-EC-002836', t: 'Acte de mariage', c: 'Jean-Pierre MOUNGUENGUI', dep: 'il y a 1 j', ech: 'dans 6 h', st: 'En attente registre', tone: 'warning', urgent: true },
                  { ref: 'GC-2026-EC-002829', t: 'Certificat de nationalité', c: 'Aïcha BONGO', dep: 'il y a 2 j', ech: 'demain', st: 'En instruction', tone: 'active', urgent: false },
                  { ref: 'GC-2026-EC-002814', t: 'Acte de naissance · extrait', c: 'Paul ONDO', dep: 'il y a 3 j', ech: 'aujourd\'hui', st: 'À signer', tone: 'destruct', urgent: true },
                  { ref: 'GC-2026-EC-002802', t: 'Acte de décès', c: 'Famille NZOGHE', dep: 'il y a 4 j', ech: 'dans 2 j', st: 'Pièces demandées', tone: 'warning', urgent: false },
                ].map(r => (
                  <Tr key={r.ref} onClick={() => {}}>
                    <Td><Checkbox checked={false} id={r.ref}/></Td>
                    <Td style={{ fontFamily: 'var(--font-mono)', fontSize: 12 }}>{r.ref}</Td>
                    <Td style={{ fontWeight: 600 }}>{r.t}</Td>
                    <Td><div style={{ display: 'flex', alignItems: 'center', gap: 8 }}><Avatar name={r.c} tone="green" size={24}/><span>{r.c}</span></div></Td>
                    <Td style={{ color: 'var(--ink-600)' }}>{r.dep}</Td>
                    <Td>{r.urgent ? <Badge tone="danger" size="sm" dot>{r.ech}</Badge> : <span style={{ color: 'var(--ink-700)' }}>{r.ech}</span>}</Td>
                    <Td><Badge tone={r.tone} dot>{r.st}</Badge></Td>
                    <Td><Icon name="chevronRight" size={16} style={{ color: 'var(--ink-400)' }}/></Td>
                  </Tr>
                ))}
              </tbody>
            </Table>
          </Card>

          {/* Alerts row */}
          <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 16 }}>
            <Card>
              <SectionHeading title="Activité de l'équipe" level={3}/>
              {[
                { who: 'P. MOUSSAVOU', act: 'a signé', what: 'Acte EC-LBV-2026-04812', when: 'il y a 12 min' },
                { who: 'C. NDONG', act: 'a versé', what: '32 actes au SAE', when: 'il y a 1 h' },
                { who: 'L. EYEGHE', act: 'a transféré', what: 'Dossier #4812 à DGI', when: 'il y a 3 h' },
                { who: 'Système', act: 'a généré', what: '14 certificats automatiques', when: 'il y a 5 h' },
              ].map((a, i) => (
                <div key={i} style={{ display: 'flex', alignItems: 'center', gap: 10, padding: '10px 0', borderBottom: i === 3 ? 'none' : '1px solid var(--ink-150)' }}>
                  <Avatar name={a.who} tone={a.who === 'Système' ? 'amber' : 'primary'} size={28}/>
                  <div style={{ flex: 1 }}>
                    <div style={{ fontSize: 13 }}><b>{a.who}</b> {a.act} <a href="#" style={{ fontWeight: 600 }}>{a.what}</a></div>
                  </div>
                  <span style={{ fontSize: 12, color: 'var(--ink-500)' }}>{a.when}</span>
                </div>
              ))}
            </Card>
            <Card>
              <SectionHeading title="À votre attention" level={3}/>
              <Alert tone="danger" title="2 dossiers en retard">
                Échéance dépassée pour les références GC-2026-EC-002814 et GC-2026-EC-002791.
                <div style={{ marginTop: 6 }}><a href="#" style={{ fontWeight: 600 }}>Voir les dossiers →</a></div>
              </Alert>
              <div style={{ height: 8 }}/>
              <Alert tone="warning" title="Maintenance SAE planifiée">
                Indisponibilité prévue le 28 mai entre 2h et 4h du matin.
              </Alert>
              <div style={{ height: 8 }}/>
              <Alert tone="info" title="Nouveau service publié">
                « Légalisation de signature » est désormais ouvert au catalogue citoyen.
              </Alert>
            </Card>
          </div>

        </div>
      </main>
    </div>
  </Frame>
);

/* ============================================================
   A2 · File des demandes citoyennes
   ============================================================ */
const AdminQueue = () => (
  <Frame width={1440} height={900}>
    <AppHeader org={ADMIN_ORG} user={ADMIN_USER} role={ADMIN_ROLE}/>
    <div style={{ display: 'flex' }}>
      <Sidebar items={adminNav} current="queue"/>
      <main style={{ flex: 1, overflow: 'hidden' }}>
        <PageHeader
          breadcrumbs={['Demandes citoyennes']}
          title="File de demandes"
          subtitle="847 demandes — 47 à traiter, 124 en cours, 676 traitées."
          actions={<><Button variant="outline" icon="download">Export CSV</Button><Button icon="plus">Nouvelle demande agent</Button></>}
        />
        {/* Filtres */}
        <div style={{ padding: '12px 32px', borderBottom: '1px solid var(--ink-150)', background: 'white', display: 'flex', gap: 8, alignItems: 'center' }}>
          <TextInput placeholder="Rechercher : référence, citoyen, NIP…" icon="search" style={{ width: 320 }}/>
          <Select defaultValue="all"><option value="all">Tous les types</option><option>Acte de naissance</option><option>Acte de mariage</option></Select>
          <Select defaultValue="all"><option value="all">Tous les statuts</option><option>À traiter</option><option>En cours</option><option>Traitée</option></Select>
          <Select defaultValue="all"><option value="all">Tous les agents</option><option>Mes demandes</option><option>Y. NGUEMA</option></Select>
          <Button variant="ghost" icon="filter">Plus de filtres</Button>
          <div style={{ flex: 1 }}/>
          <Tabs tabs={[{id: 'list', label: 'Liste'}, {id: 'board', label: 'Tableau'}]} current="list" variant="pill"/>
        </div>

        <div style={{ padding: '20px 32px' }}>
          {/* Bulk bar */}
          <div style={{ background: 'var(--primary-50)', border: '1px solid var(--primary-200)', borderRadius: 8, padding: '10px 16px', display: 'flex', alignItems: 'center', gap: 14, marginBottom: 12 }}>
            <Icon name="checkCircle" size={16} style={{ color: 'var(--primary-500)' }}/>
            <span style={{ fontSize: 13, fontWeight: 600, color: 'var(--primary-700)' }}>3 demandes sélectionnées</span>
            <Button variant="secondary" size="sm" icon="userCheck">M'assigner</Button>
            <Button variant="secondary" size="sm" icon="share">Transférer</Button>
            <Button variant="ghost" size="sm" icon="xCircle" style={{ color: 'var(--danger-500)' }}>Désélectionner</Button>
          </div>

          <Table>
            <thead>
              <tr>
                <Th style={{ width: 32 }}><Checkbox checked={false} id="all2"/></Th>
                <Th sortable>Référence</Th>
                <Th>Démarche</Th>
                <Th>Citoyen · NIP</Th>
                <Th sortable>Déposée</Th>
                <Th>Échéance</Th>
                <Th>Agent</Th>
                <Th>Statut</Th>
                <Th>Pièces</Th>
                <Th>{' '}</Th>
              </tr>
            </thead>
            <tbody>
              {[
                { ref: 'GC-2026-EC-002841', t: 'Acte de naissance · copie intégrale', c: 'Marie OBAME', nip: '184127600504', dep: '20/05 14:32', ech: 'dans 1 j', ag: 'Y. NGUEMA', st: 'En instruction', tone: 'active', p: '2/2', sel: true },
                { ref: 'GC-2026-EC-002836', t: 'Acte de mariage', c: 'JP. MOUNGUENGUI', nip: '178050099218', dep: '19/05 11:08', ech: 'dans 6 h', ag: 'Y. NGUEMA', st: 'Attente registre', tone: 'warning', p: '3/3', sel: true },
                { ref: 'GC-2026-EC-002829', t: 'Certificat de nationalité', c: 'Aïcha BONGO', nip: '191041100712', dep: '18/05 16:54', ech: 'demain', ag: 'L. EYEGHE', st: 'En instruction', tone: 'active', p: '2/3' },
                { ref: 'GC-2026-EC-002814', t: 'Acte de naissance · extrait', c: 'Paul ONDO', nip: '188090677341', dep: '17/05 09:11', ech: 'aujourd\'hui', ag: 'Y. NGUEMA', st: 'À signer', tone: 'destruct', p: '2/2', sel: true },
                { ref: 'GC-2026-EC-002802', t: 'Acte de décès', c: 'F. NZOGHE', nip: '174030042519', dep: '16/05 14:47', ech: 'dans 2 j', ag: 'Non assigné', st: 'Pièces demandées', tone: 'warning', p: '1/3' },
                { ref: 'GC-2026-EC-002787', t: 'Acte de naissance · copie intégrale', c: 'Sandra MILLE', nip: '199121200834', dep: '15/05 10:22', ech: 'dans 3 j', ag: 'C. NDONG', st: 'En instruction', tone: 'active', p: '2/2' },
                { ref: 'GC-2026-EC-002774', t: 'Certificat de nationalité', c: 'Olivier ESSONO', nip: '186020100456', dep: '14/05 16:33', ech: 'dans 4 j', ag: 'Y. NGUEMA', st: 'En instruction', tone: 'active', p: '3/3' },
                { ref: 'GC-2026-EC-002768', t: 'Acte de naissance · extrait', c: 'Patrice MBA', nip: '182071100129', dep: '14/05 09:05', ech: 'traité', ag: 'P. MOUSSAVOU', st: 'Signé', tone: 'archived', p: '2/2' },
              ].map(r => (
                <Tr key={r.ref} onClick={() => {}} selected={r.sel}>
                  <Td><Checkbox checked={!!r.sel} id={r.ref + '-s'}/></Td>
                  <Td style={{ fontFamily: 'var(--font-mono)', fontSize: 12, fontWeight: 600 }}>{r.ref}</Td>
                  <Td><div style={{ fontWeight: 600 }}>{r.t}</div></Td>
                  <Td>
                    <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
                      <Avatar name={r.c} tone="green" size={22}/>
                      <div>
                        <div style={{ fontSize: 13, fontWeight: 500 }}>{r.c}</div>
                        <div style={{ fontFamily: 'var(--font-mono)', fontSize: 11, color: 'var(--ink-500)' }}>{r.nip}</div>
                      </div>
                    </div>
                  </Td>
                  <Td style={{ color: 'var(--ink-600)', fontSize: 12 }}>{r.dep}</Td>
                  <Td>{r.ech === 'aujourd\'hui' || r.ech === 'dans 6 h' ? <Badge tone="danger" size="sm" dot>{r.ech}</Badge> : r.ech === 'traité' ? <Badge tone="archived" size="sm">{r.ech}</Badge> : <span>{r.ech}</span>}</Td>
                  <Td>{r.ag === 'Non assigné' ? <span style={{ color: 'var(--ink-500)', fontStyle: 'italic' }}>{r.ag}</span> : r.ag}</Td>
                  <Td><Badge tone={r.tone} dot>{r.st}</Badge></Td>
                  <Td><span style={{ fontFamily: 'var(--font-mono)', fontSize: 12 }}>{r.p}</span></Td>
                  <Td><Icon name="moreH" size={16} style={{ color: 'var(--ink-400)' }}/></Td>
                </Tr>
              ))}
            </tbody>
          </Table>

          <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginTop: 16, fontSize: 13, color: 'var(--ink-600)' }}>
            <span>Affichage 1–8 sur 847</span>
            <div style={{ display: 'flex', gap: 6 }}>
              <Button variant="ghost" icon="chevronLeft" size="sm">{''}</Button>
              {['1', '2', '3', '...', '106'].map((p, i) => (
                <button key={i} style={{
                  width: 32, height: 32, borderRadius: 6, border: '1px solid var(--ink-200)',
                  background: p === '1' ? 'var(--primary-500)' : 'white', color: p === '1' ? 'white' : 'var(--ink-800)',
                  fontSize: 13, fontWeight: 600, cursor: 'pointer',
                }}>{p}</button>
              ))}
              <Button variant="ghost" iconRight="chevronRight" size="sm">{''}</Button>
            </div>
          </div>
        </div>
      </main>
    </div>
  </Frame>
);

/* ============================================================
   A3 · Instruction d'une demande
   ============================================================ */
const AdminInstruction = () => (
  <Frame width={1440} height={1100}>
    <AppHeader org={ADMIN_ORG} user={ADMIN_USER} role={ADMIN_ROLE}/>
    <div style={{ display: 'flex' }}>
      <Sidebar items={adminNav} current="queue"/>
      <main style={{ flex: 1, overflow: 'hidden' }}>
        <PageHeader
          breadcrumbs={['File de demandes', 'GC-2026-EC-002841']}
          title="Acte de naissance · Marie Estelle OBAME"
          subtitle="Déposée il y a 14h · échéance dans 1 jour · copie intégrale"
          meta={<>
            <span style={{ fontSize: 13, color: 'var(--ink-600)' }}><Icon name="hash" size={12} style={{ verticalAlign: 'middle', marginRight: 4 }}/>GC-2026-EC-002841</span>
            <Badge tone="active" dot>En instruction</Badge>
            <Badge tone="neutral" icon="user">Assignée à vous</Badge>
          </>}
          actions={<><Button variant="ghost" icon="messageSquare">Écrire au citoyen</Button><Button variant="secondary" icon="share">Transférer</Button><Button variant="success" icon="check">Valider & signer</Button></>}
        />
        <div style={{ display: 'grid', gridTemplateColumns: '1fr 360px', gap: 0, minHeight: 880 }}>
          {/* Main */}
          <div style={{ padding: '20px 32px', display: 'flex', flexDirection: 'column', gap: 16, borderRight: '1px solid var(--ink-200)' }}>
            <Tabs tabs={[
              {id: 'instr', label: 'Instruction'},
              {id: 'pieces', label: 'Pièces (2)'},
              {id: 'hist', label: 'Historique'},
              {id: 'messages', label: 'Messages (2)'},
            ]} current="instr" variant="line"/>

            {/* Source citoyen */}
            <Card padded={false}>
              <div style={{ padding: 18, borderBottom: '1px solid var(--ink-150)', display: 'flex', alignItems: 'center', justifyContent: 'space-between' }}>
                <div style={{ display: 'flex', gap: 12, alignItems: 'center' }}>
                  <Avatar name="Marie OBAME" tone="green" size={40}/>
                  <div>
                    <div style={{ fontSize: 15, fontWeight: 700 }}>Marie Estelle OBAME</div>
                    <div style={{ fontSize: 12, color: 'var(--ink-600)' }}>NIP <span style={{ fontFamily: 'var(--font-mono)' }}>184 12 76 005 042</span> · marie.obame@id.gouv.ga</div>
                  </div>
                </div>
                <Button variant="ghost" iconRight="externalLink" size="sm">Voir son dossier 360°</Button>
              </div>
              <div style={{ padding: 18, display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '14px 28px', fontSize: 13.5 }}>
                {[
                  ['Type d\'acte', 'Copie intégrale'],
                  ['Nombre de copies', '2'],
                  ['Date de naissance', '14 mars 1992'],
                  ['Lieu de naissance', 'Libreville, Estuaire'],
                  ['Filiation déclarée', 'OBAME Jean-Pierre / MBOUMBA Antoinette'],
                  ['Adresse e-mail', 'marie.obame@id.gouv.ga'],
                ].map(([k, v]) => (
                  <div key={k} style={{ display: 'grid', gridTemplateColumns: '160px 1fr' }}>
                    <span style={{ color: 'var(--ink-500)' }}>{k}</span>
                    <span style={{ fontWeight: 600 }}>{v}</span>
                  </div>
                ))}
              </div>
            </Card>

            {/* Vérifications automatiques */}
            <Card>
              <SectionHeading title="Vérifications automatiques" level={3} action={<Badge tone="archived" dot icon="check">5/6 OK</Badge>}/>
              {[
                { t: 'Identité numérique du citoyen', st: 'ok', d: 'NIP validé par le RGPP · 14 mars 1992 confirmé.' },
                { t: 'Cohérence des informations', st: 'ok', d: 'Pas d\'incohérence détectée entre la déclaration et les pièces.' },
                { t: 'Détection de doublon', st: 'ok', d: 'Aucune demande similaire dans les 30 derniers jours.' },
                { t: 'Lecture OCR des pièces', st: 'ok', d: 'CNI lue avec 99,4 % de confiance.' },
                { t: 'Conformité antifraude', st: 'ok', d: 'Aucun indicateur de risque déclenché.' },
                { t: 'Recherche au registre de Libreville', st: 'pending', d: 'En cours · acte 04812 à confirmer manuellement.' },
              ].map(v => (
                <div key={v.t} style={{ display: 'flex', alignItems: 'flex-start', gap: 12, padding: '10px 0', borderBottom: '1px solid var(--ink-150)' }}>
                  <span style={{
                    width: 22, height: 22, borderRadius: '50%', flexShrink: 0,
                    background: v.st === 'ok' ? 'var(--success-500)' : 'var(--ink-300)',
                    color: 'white', display: 'inline-flex', alignItems: 'center', justifyContent: 'center', marginTop: 2,
                  }}><Icon name={v.st === 'ok' ? 'check' : 'clock'} size={12} stroke={3}/></span>
                  <div style={{ flex: 1 }}>
                    <div style={{ fontSize: 13.5, fontWeight: 600 }}>{v.t}</div>
                    <div style={{ fontSize: 12.5, color: 'var(--ink-600)' }}>{v.d}</div>
                  </div>
                </div>
              ))}
            </Card>

            {/* Acte source */}
            <Card>
              <SectionHeading title="Acte source au registre" subtitle="Acte n° 04812 — registre de naissances de Libreville, année 1992" level={3}
                action={<Button variant="secondary" size="sm" icon="check">Confirmer correspondance</Button>}/>
              <div style={{ background: 'var(--ink-50)', border: '1px dashed var(--ink-300)', borderRadius: 8, padding: 20, fontSize: 13, color: 'var(--ink-700)', lineHeight: 1.7 }}>
                « L'an mil neuf cent quatre-vingt douze, le quatorze mars à trois heures vingt-deux minutes, est née à Libreville (province de l'Estuaire), <b>OBAME Marie Estelle</b>, de sexe féminin, fille de <b>OBAME Jean-Pierre</b>, instituteur, et de <b>MBOUMBA Antoinette</b>, sage-femme, son épouse, demeurant ensemble à Libreville… »
              </div>
              <div style={{ display: 'flex', gap: 16, marginTop: 12, fontSize: 12, color: 'var(--ink-600)' }}>
                <span><b>Registre :</b> EC-LBV-1992-N</span>
                <span><b>Page :</b> 218</span>
                <span><b>Numéro d'ordre :</b> 04812</span>
                <span><b>Mentions :</b> Néant</span>
              </div>
            </Card>
          </div>

          {/* Right drawer */}
          <aside style={{ padding: 20, background: 'var(--ink-50)', display: 'flex', flexDirection: 'column', gap: 14 }}>
            <Card padded={false}>
              <div style={{ padding: 14 }}>
                <div style={{ fontSize: 11, fontWeight: 700, color: 'var(--ink-500)', textTransform: 'uppercase', letterSpacing: '0.06em' }}>Échéance</div>
                <div style={{ fontSize: 22, fontWeight: 700, marginTop: 4 }}>Dans 1 jour</div>
                <div style={{ fontSize: 12, color: 'var(--ink-600)', marginTop: 2 }}>21 mai 14:32 → 23 mai 14:32</div>
                <Progress value={48} label="48 %" tone="primary"/>
              </div>
            </Card>

            <Card padded={false}>
              <div style={{ padding: '14px 16px', borderBottom: '1px solid var(--ink-150)' }}>
                <div style={{ fontSize: 11, fontWeight: 700, color: 'var(--ink-500)', textTransform: 'uppercase', letterSpacing: '0.06em' }}>Étapes de traitement</div>
              </div>
              <div style={{ padding: 14 }}>
                {[
                  { name: 'Réception & contrôle', status: 'done', duration: '12 s' },
                  { name: 'Pré-instruction agent', status: 'done', duration: '4 h' },
                  { name: 'Recherche registre', status: 'active' },
                  { name: 'Visa officier', status: 'pending' },
                  { name: 'Signature & émission', status: 'pending' },
                  { name: 'Archivage probant', status: 'pending' },
                ].map(s => <PipelineStep key={s.name} {...s}/>)}
              </div>
            </Card>

            <Card padded={false}>
              <div style={{ padding: '14px 16px', borderBottom: '1px solid var(--ink-150)', display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                <div style={{ fontSize: 11, fontWeight: 700, color: 'var(--ink-500)', textTransform: 'uppercase', letterSpacing: '0.06em' }}>Pièces justificatives</div>
                <Badge tone="archived" size="sm">2/2</Badge>
              </div>
              {[
                { f: 'CNI_obame.pdf', s: '1,2 Mo', ok: true },
                { f: 'livret_famille.pdf', s: '2,8 Mo', ok: true },
              ].map(p => (
                <div key={p.f} style={{ padding: '12px 16px', display: 'flex', alignItems: 'center', gap: 10, borderBottom: '1px solid var(--ink-150)' }}>
                  <Icon name="fileText" size={16} style={{ color: 'var(--primary-500)' }}/>
                  <div style={{ flex: 1, minWidth: 0 }}>
                    <div style={{ fontSize: 13, fontWeight: 600 }}>{p.f}</div>
                    <div style={{ fontSize: 11.5, color: 'var(--ink-500)' }}>{p.s} · OCR 99,4 %</div>
                  </div>
                  <Icon name="eye" size={15} style={{ color: 'var(--ink-500)' }}/>
                  <Icon name="download" size={15} style={{ color: 'var(--ink-500)' }}/>
                </div>
              ))}
              <div style={{ padding: 14 }}>
                <Button variant="ghost" icon="paperclip" size="sm">Demander une pièce</Button>
              </div>
            </Card>

            <Card padded={false}>
              <div style={{ padding: '14px 16px', borderBottom: '1px solid var(--ink-150)' }}>
                <div style={{ fontSize: 11, fontWeight: 700, color: 'var(--ink-500)', textTransform: 'uppercase', letterSpacing: '0.06em' }}>Note d'instruction</div>
              </div>
              <div style={{ padding: 14 }}>
                <TextArea placeholder="Notes internes (non visibles par le citoyen)…" defaultValue="Registre LBV confirmé visuellement le 21/05. Pas de mentions marginales. Demande standard, traitement nominal." style={{ fontSize: 13 }}/>
              </div>
            </Card>
          </aside>
        </div>
      </main>
    </div>
  </Frame>
);

/* ============================================================
   A4 · Dossier citoyen 360°
   ============================================================ */
const AdminCitizenFolder = () => (
  <Frame width={1440} height={1100}>
    <AppHeader org={ADMIN_ORG} user={ADMIN_USER} role={ADMIN_ROLE}/>
    <div style={{ display: 'flex' }}>
      <Sidebar items={adminNav} current="dossiers"/>
      <main style={{ flex: 1, overflow: 'hidden' }}>
        <PageHeader
          breadcrumbs={['Dossiers citoyens', 'Marie Estelle OBAME']}
          title="Dossier citoyen · Marie Estelle OBAME"
          subtitle="NIP 184 12 76 005 042 · vue inter-administrations consolidée"
          actions={<><Button variant="ghost" icon="share">Partager</Button><Button variant="secondary" icon="lock">Habilitations</Button><Button icon="download">Export PDF</Button></>}
        />
        <div style={{ padding: '24px 32px', display: 'grid', gridTemplateColumns: '320px 1fr', gap: 20 }}>
          {/* Profile card */}
          <div style={{ display: 'flex', flexDirection: 'column', gap: 14 }}>
            <Card>
              <div style={{ display: 'flex', flexDirection: 'column', alignItems: 'center', gap: 10, paddingBottom: 14, borderBottom: '1px solid var(--ink-150)' }}>
                <Avatar name="Marie OBAME" tone="green" size={72}/>
                <div style={{ textAlign: 'center' }}>
                  <div style={{ fontSize: 17, fontWeight: 700 }}>Marie Estelle OBAME</div>
                  <div style={{ fontSize: 12, color: 'var(--ink-600)' }}>Née le 14 mars 1992 · 34 ans</div>
                </div>
                <Badge tone="archived" dot icon="fingerprint">Identité vérifiée</Badge>
              </div>
              <div style={{ display: 'grid', gridTemplateColumns: '110px 1fr', gap: '10px 14px', fontSize: 12.5, marginTop: 14 }}>
                <span style={{ color: 'var(--ink-500)' }}>NIP</span><span style={{ fontFamily: 'var(--font-mono)', fontWeight: 600 }}>184 12 76 005 042</span>
                <span style={{ color: 'var(--ink-500)' }}>E-mail</span><span style={{ fontWeight: 500 }}>marie.obame@id.gouv.ga</span>
                <span style={{ color: 'var(--ink-500)' }}>Téléphone</span><span style={{ fontWeight: 500 }}>+241 06 24 18 33</span>
                <span style={{ color: 'var(--ink-500)' }}>Domicile</span><span style={{ fontWeight: 500 }}>BP 8112, Akanda</span>
                <span style={{ color: 'var(--ink-500)' }}>Compte créé</span><span style={{ fontWeight: 500 }}>12 octobre 2023</span>
              </div>
            </Card>
            <Card>
              <div style={{ fontSize: 11, fontWeight: 700, color: 'var(--ink-500)', textTransform: 'uppercase', letterSpacing: '0.06em', marginBottom: 8 }}>Habilitations sur ce dossier</div>
              {[
                { o: 'DG État Civil', s: 'Lecture/Écriture', tone: 'primary' },
                { o: 'DG Documentation', s: 'Lecture', tone: 'neutral' },
                { o: 'Min. Justice', s: 'Lecture (B3)', tone: 'neutral' },
                { o: 'CNAMGS', s: 'Lecture (rev.)', tone: 'neutral' },
              ].map(h => (
                <div key={h.o} style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', padding: '8px 0', borderBottom: '1px solid var(--ink-150)', fontSize: 13 }}>
                  <span style={{ fontWeight: 500 }}>{h.o}</span>
                  <Badge tone={h.tone} size="sm">{h.s}</Badge>
                </div>
              ))}
              <Button variant="ghost" icon="plus" size="sm" style={{ marginTop: 6 }}>Demander un accès</Button>
            </Card>
          </div>

          {/* Right pane */}
          <div style={{ display: 'flex', flexDirection: 'column', gap: 16 }}>
            <div style={{ display: 'grid', gridTemplateColumns: 'repeat(4, 1fr)', gap: 10 }}>
              <StatCard label="Demandes" value="14" icon="inbox" hint="depuis 2023"/>
              <StatCard label="Documents reçus" value="32" icon="fileText" hint="dont 14 scellés"/>
              <StatCard label="Dossiers ouverts" value="3" icon="folder"/>
              <StatCard label="Ancienneté" value="2 ans 7 m" icon="clock"/>
            </div>

            <Card>
              <SectionHeading title="Timeline inter-administrations" subtitle="Toutes les interactions de la citoyenne avec les administrations gabonaises." level={3}
                action={<Select defaultValue="all" style={{ width: 200 }}><option>Toutes administrations</option><option>DG État Civil</option></Select>}/>
              {[
                { d: '20 mai 2026', o: 'DG État Civil', t: 'Demande acte de naissance · GC-EC-002841', s: 'En cours', tone: 'active', i: 'fileText' },
                { d: '14 mai 2026', o: 'DG Documentation', t: 'Demande renouvellement passeport · GC-DI-019733', s: 'Pièces demandées', tone: 'warning', i: 'fingerprint' },
                { d: '8 mai 2026', o: 'Min. Justice', t: 'Extrait casier B3 · GC-JU-007612', s: 'Délivré', tone: 'archived', i: 'shield' },
                { d: '12 mars 2026', o: 'CNAMGS', t: 'Affiliation salariée actualisée', s: 'Validée', tone: 'archived', i: 'shieldCheck' },
                { d: '02 février 2026', o: 'DGI', t: 'Déclaration IRPP 2025', s: 'Acceptée', tone: 'archived', i: 'dollarSign' },
                { d: '14 octobre 2025', o: 'Mairie de Libreville', t: 'Certificat de résidence', s: 'Délivré', tone: 'archived', i: 'home' },
              ].map((e, i, arr) => (
                <div key={i} style={{ display: 'flex', gap: 14, paddingTop: i === 0 ? 4 : 0 }}>
                  <div style={{ display: 'flex', flexDirection: 'column', alignItems: 'center', flexShrink: 0 }}>
                    <span style={{ width: 32, height: 32, borderRadius: '50%', background: 'var(--primary-50)', color: 'var(--primary-500)', display: 'inline-flex', alignItems: 'center', justifyContent: 'center' }}>
                      <Icon name={e.i} size={15}/>
                    </span>
                    {i < arr.length - 1 && <span style={{ width: 1.5, flex: 1, minHeight: 28, background: 'var(--ink-200)' }}/>}
                  </div>
                  <div style={{ flex: 1, paddingBottom: i === arr.length - 1 ? 0 : 16 }}>
                    <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
                      <span style={{ fontSize: 11, fontWeight: 700, color: 'var(--ink-600)', textTransform: 'uppercase', letterSpacing: '0.04em' }}>{e.d}</span>
                      <Badge tone="neutral" size="sm">{e.o}</Badge>
                      <Badge tone={e.tone} size="sm" dot>{e.s}</Badge>
                    </div>
                    <div style={{ fontSize: 14, fontWeight: 600, marginTop: 2 }}>{e.t}</div>
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

/* ============================================================
   A5 · Génération automatique de document
   ============================================================ */
const AdminGeneration = () => (
  <Frame width={1440} height={1100}>
    <AppHeader org={ADMIN_ORG} user={ADMIN_USER} role={ADMIN_ROLE}/>
    <div style={{ display: 'flex' }}>
      <Sidebar items={adminNav} current="documents"/>
      <main style={{ flex: 1, overflow: 'hidden' }}>
        <PageHeader
          breadcrumbs={['Génération', 'Acte de naissance']}
          title="Générer un acte de naissance"
          subtitle="Template officiel · pré-rempli depuis la demande GC-2026-EC-002841"
          actions={<><Button variant="ghost" icon="save">Sauvegarder brouillon</Button><Button variant="secondary" icon="eye">Prévisualiser PDF</Button><Button variant="success" icon="shieldCheck">Signer & émettre</Button></>}
        />
        <div style={{ display: 'grid', gridTemplateColumns: '380px 1fr', gap: 0, minHeight: 920 }}>
          {/* Inspector */}
          <aside style={{ borderRight: '1px solid var(--ink-200)', padding: 20, display: 'flex', flexDirection: 'column', gap: 16, background: 'white' }}>
            <Tabs tabs={[{id: 't', label: 'Variables'}, {id: 's', label: 'Signature'}, {id: 'd', label: 'Diffusion'}]} current="t" variant="line"/>
            <div>
              <SectionHeading title="Template" level={3}/>
              <Select defaultValue="copie">
                <option value="copie">Copie intégrale · v3.2 · officielle</option>
                <option>Extrait avec filiation · v3.2</option>
                <option>Extrait sans filiation · v3.2</option>
              </Select>
              <p style={{ fontSize: 12, color: 'var(--ink-600)', marginTop: 8, lineHeight: 1.5 }}>
                <Icon name="info" size={12} style={{ verticalAlign: 'middle', marginRight: 4 }}/>
                Modèle validé par le Comité d'État Civil le 14/02/2025. Toute modification doit être validée par votre Direction.
              </p>
            </div>
            <div style={{ height: 1, background: 'var(--ink-150)' }}/>
            <div>
              <div style={{ fontSize: 11, fontWeight: 700, color: 'var(--ink-500)', textTransform: 'uppercase', letterSpacing: '0.06em', marginBottom: 10 }}>Variables (auto-renseignées)</div>
              <div style={{ display: 'flex', flexDirection: 'column', gap: 10 }}>
                {[
                  { k: 'nom', v: 'OBAME', src: 'Demande' },
                  { k: 'prenoms', v: 'Marie Estelle', src: 'Demande' },
                  { k: 'date_naissance', v: '14 mars 1992', src: 'Registre' },
                  { k: 'heure_naissance', v: '03 h 22', src: 'Registre' },
                  { k: 'lieu_naissance', v: 'Libreville, Estuaire', src: 'Registre' },
                  { k: 'pere', v: 'OBAME Jean-Pierre, instituteur', src: 'Registre' },
                  { k: 'mere', v: 'MBOUMBA Antoinette, sage-femme', src: 'Registre' },
                  { k: 'mentions', v: 'Néant', src: 'Registre' },
                  { k: 'numero_acte', v: 'EC-LBV-1992-04812', src: 'Registre' },
                ].map(v => (
                  <div key={v.k} style={{ border: '1px solid var(--ink-200)', borderRadius: 6, padding: 10 }}>
                    <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                      <span style={{ fontFamily: 'var(--font-mono)', fontSize: 11, color: 'var(--primary-600)', fontWeight: 700 }}>{'{{ ' + v.k + ' }}'}</span>
                      <Badge tone="primary" size="sm">{v.src}</Badge>
                    </div>
                    <div style={{ fontSize: 13, fontWeight: 600, marginTop: 4 }}>{v.v}</div>
                  </div>
                ))}
              </div>
            </div>
          </aside>

          {/* Document preview */}
          <div style={{ padding: '24px 40px', background: 'var(--ink-100)', overflow: 'auto' }}>
            <div style={{ maxWidth: 720, margin: '0 auto', background: 'white', boxShadow: 'var(--shadow-md)', borderRadius: 4, padding: '56px 64px', minHeight: 880, position: 'relative' }}>
              <div aria-hidden="true" style={{
                position: 'absolute', top: '50%', left: '50%', transform: 'translate(-50%, -50%) rotate(-22deg)',
                fontSize: 60, fontWeight: 900, color: 'rgba(26, 68, 128, 0.06)', letterSpacing: '0.1em', userSelect: 'none', pointerEvents: 'none',
              }}>BROUILLON</div>

              <div style={{ display: 'flex', justifyContent: 'space-between', borderBottom: '2px solid var(--ink-900)', paddingBottom: 14, marginBottom: 24 }}>
                <div>
                  <div style={{ fontSize: 11, fontWeight: 700, letterSpacing: '0.1em' }}>RÉPUBLIQUE GABONAISE</div>
                  <div style={{ fontSize: 10, color: 'var(--ink-700)', marginTop: 2 }}>Union · Travail · Justice</div>
                  <div style={{ fontSize: 11, fontWeight: 600, marginTop: 8 }}>Ministère de l'Intérieur</div>
                  <div style={{ fontSize: 11, color: 'var(--ink-700)' }}>Direction Générale de l'État Civil</div>
                </div>
                <div style={{ textAlign: 'right' }}>
                  <div style={{ fontSize: 11, color: 'var(--ink-600)' }}>Acte n° <b>EC-LBV-2026-04812</b></div>
                  <div style={{ fontSize: 11, color: 'var(--ink-600)' }}>Commune de <b>Libreville</b></div>
                </div>
              </div>

              <h2 style={{ fontSize: 22, textAlign: 'center', letterSpacing: '0.04em' }}>EXTRAIT D'ACTE DE NAISSANCE</h2>
              <p style={{ fontSize: 12, color: 'var(--ink-600)', textAlign: 'center', marginTop: 4 }}>(Copie intégrale)</p>

              <div style={{ marginTop: 28, fontSize: 13.5, lineHeight: 1.8 }}>
                <p>L'an <Var>deux mille vingt-six</Var>, le <Var>vingt-huit mai</Var>, à dix heures et quarante-sept minutes,</p>
                <p>est délivré par nos soins, officier d'état civil de la commune de <Var>Libreville</Var>, le présent extrait conforme à l'acte n° <Var>04812</Var> du registre des naissances de l'année <Var>1992</Var>, rédigé comme suit :</p>
                <div style={{ background: 'var(--ink-50)', padding: '12px 16px', borderRadius: 4, marginTop: 10, border: '1px dashed var(--ink-300)' }}>
                  « Le <Var>quatorze mars mil neuf cent quatre-vingt-douze</Var>, à <Var>trois heures vingt-deux</Var>, est née à Libreville (Estuaire), <Var>OBAME Marie Estelle</Var>, de sexe <Var>féminin</Var>, fille de <Var>OBAME Jean-Pierre</Var>, instituteur, et de <Var>MBOUMBA Antoinette</Var>, sage-femme, son épouse… »
                </div>
                <p style={{ marginTop: 16 }}>Mentions marginales : <Var>Néant</Var>.</p>
                <p>Pour copie certifiée conforme à l'original.</p>
              </div>

              <div style={{ marginTop: 32, paddingTop: 16, borderTop: '1px dashed var(--ink-300)', display: 'flex', justifyContent: 'space-between', alignItems: 'flex-end' }}>
                <div style={{ fontSize: 11, color: 'var(--ink-500)' }}>Document généré par Gabon Connect</div>
                <div style={{ textAlign: 'center' }}>
                  <div style={{ fontSize: 10, color: 'var(--ink-600)' }}>L'officier d'état civil</div>
                  <div style={{ marginTop: 8, padding: '8px 16px', border: '2px dashed var(--ink-300)', borderRadius: 6, color: 'var(--ink-500)', fontSize: 12, fontStyle: 'italic' }}>signature en attente</div>
                </div>
              </div>
            </div>
          </div>
        </div>
      </main>
    </div>
  </Frame>
);

const Var = ({ children }) => (
  <span style={{ background: 'rgba(35, 120, 195, 0.12)', color: 'var(--primary-700)', padding: '0 4px', borderRadius: 3, fontWeight: 600 }}>{children}</span>
);

/* ============================================================
   A6 · Correspondance inter-administrations
   ============================================================ */
const AdminCorrespondence = () => (
  <Frame width={1440} height={900}>
    <AppHeader org={ADMIN_ORG} user={ADMIN_USER} role={ADMIN_ROLE}/>
    <div style={{ display: 'flex' }}>
      <Sidebar items={adminNav} current="correspondance"/>
      <main style={{ flex: 1, overflow: 'hidden', display: 'flex', flexDirection: 'column' }}>
        <PageHeader
          breadcrumbs={['Correspondance inter-administrations']}
          title="Messagerie sécurisée inter-admin"
          subtitle="Échanges officiels entre la DG État Civil et les autres administrations gabonaises."
          actions={<><Button variant="outline" icon="filter">Filtres</Button><Button icon="plus">Nouveau courrier</Button></>}
        />
        <div style={{ display: 'grid', gridTemplateColumns: '300px 1fr 360px', flex: 1, overflow: 'hidden' }}>
          {/* List */}
          <div style={{ borderRight: '1px solid var(--ink-200)', overflow: 'auto' }}>
            <div style={{ padding: 14, borderBottom: '1px solid var(--ink-150)' }}>
              <TextInput placeholder="Rechercher…" icon="search"/>
            </div>
            <div style={{ display: 'flex', gap: 4, padding: '10px 14px', borderBottom: '1px solid var(--ink-150)' }}>
              {['Reçus (12)', 'Envoyés', 'Brouillons'].map((t, i) => (
                <button key={t} style={{
                  padding: '4px 10px', fontSize: 12, fontWeight: 600,
                  background: i === 0 ? 'var(--primary-50)' : 'transparent',
                  color: i === 0 ? 'var(--primary-700)' : 'var(--ink-600)',
                  border: 'none', borderRadius: 4, cursor: 'pointer',
                }}>{t}</button>
              ))}
            </div>
            {[
              { from: 'DG Documentation', subj: 'Demande d\'authentification d\'acte', ref: 'CR-2026-1842', d: 'il y a 12 min', unread: true, p: 1, urgent: true },
              { from: 'Min. Justice', subj: 'Vérification de filiation — extrait', ref: 'CR-2026-1839', d: 'il y a 2 h', unread: true, p: 2 },
              { from: 'CNAMGS', subj: 'Mise à jour identité bénéficiaire', ref: 'CR-2026-1834', d: 'il y a 4 h', unread: true, p: 0 },
              { from: 'Mairie de Libreville', subj: 'Transfert dossier transcription', ref: 'CR-2026-1828', d: 'hier', unread: false, p: 3 },
              { from: 'DGI', subj: 'Confirmation d\'identité fiscale', ref: 'CR-2026-1819', d: 'hier', unread: false, p: 0 },
              { from: 'ANPI-Gabon', subj: 'Vérification mandataire RCCM', ref: 'CR-2026-1814', d: 'il y a 2 j', unread: false, p: 1 },
              { from: 'DG Documentation', subj: 'Réponse · acte EC-LBV-2025-12044', ref: 'CR-2026-1801', d: 'il y a 3 j', unread: false, p: 0 },
            ].map((m, i) => (
              <div key={m.ref} style={{
                padding: '12px 14px', borderBottom: '1px solid var(--ink-150)',
                background: i === 0 ? 'var(--primary-50)' : m.unread ? 'white' : 'var(--ink-50)',
                cursor: 'pointer', display: 'flex', gap: 10,
              }}>
                <span style={{ width: 6, height: 6, borderRadius: '50%', background: m.unread ? 'var(--primary-500)' : 'transparent', marginTop: 8, flexShrink: 0 }}/>
                <div style={{ flex: 1, minWidth: 0 }}>
                  <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                    <span style={{ fontSize: 13, fontWeight: m.unread ? 700 : 600, color: 'var(--ink-900)' }}>{m.from}</span>
                    <span style={{ fontSize: 11, color: 'var(--ink-500)' }}>{m.d}</span>
                  </div>
                  <div style={{ fontSize: 13, color: 'var(--ink-800)', marginTop: 2, whiteSpace: 'nowrap', textOverflow: 'ellipsis', overflow: 'hidden' }}>{m.subj}</div>
                  <div style={{ display: 'flex', alignItems: 'center', gap: 6, marginTop: 4 }}>
                    <span style={{ fontFamily: 'var(--font-mono)', fontSize: 10.5, color: 'var(--ink-500)' }}>{m.ref}</span>
                    {m.urgent && <Badge tone="danger" size="sm">Urgent</Badge>}
                    {m.p > 0 && <span style={{ fontSize: 11, color: 'var(--ink-600)' }}><Icon name="paperclip" size={11} style={{ verticalAlign: 'middle' }}/> {m.p}</span>}
                  </div>
                </div>
              </div>
            ))}
          </div>

          {/* Conversation */}
          <div style={{ display: 'flex', flexDirection: 'column', overflow: 'hidden' }}>
            <div style={{ padding: '14px 24px', borderBottom: '1px solid var(--ink-200)', background: 'white' }}>
              <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between' }}>
                <div>
                  <h2 style={{ fontSize: 17 }}>Demande d'authentification d'acte de naissance · OBAME Marie</h2>
                  <div style={{ display: 'flex', alignItems: 'center', gap: 10, marginTop: 4, fontSize: 12.5, color: 'var(--ink-600)' }}>
                    <span style={{ fontFamily: 'var(--font-mono)' }}>CR-2026-1842</span>
                    <Badge tone="danger" size="sm">Urgent · délai 24 h</Badge>
                    <span>3 participants</span>
                  </div>
                </div>
                <div style={{ display: 'flex', gap: 6 }}>
                  <Button variant="ghost" size="sm" icon="archive">{''}</Button>
                  <Button variant="ghost" size="sm" icon="share">{''}</Button>
                  <Button variant="ghost" size="sm" icon="moreH">{''}</Button>
                </div>
              </div>
            </div>

            <div style={{ flex: 1, overflow: 'auto', padding: '20px 24px', background: 'var(--ink-50)' }}>
              {/* Message 1 */}
              <div style={{ background: 'white', border: '1px solid var(--ink-200)', borderRadius: 8, padding: 18, marginBottom: 14 }}>
                <div style={{ display: 'flex', alignItems: 'center', gap: 10, marginBottom: 10 }}>
                  <Avatar name="DG Documentation" tone="primary" size={32}/>
                  <div style={{ flex: 1 }}>
                    <div style={{ fontSize: 13, fontWeight: 700 }}>DG Documentation · Capt. Faustin MBOUMBA</div>
                    <div style={{ fontSize: 11.5, color: 'var(--ink-600)' }}>Pour : DG État Civil · 20 mai 2026 · 11:42</div>
                  </div>
                  <Badge tone="archived" size="sm" icon="shieldCheck">Signé S/MIME</Badge>
                </div>
                <div style={{ fontSize: 14, color: 'var(--ink-800)', lineHeight: 1.65 }}>
                  <p>Madame, Monsieur,</p>
                  <p style={{ marginTop: 8 }}>Dans le cadre de l'instruction d'une demande de renouvellement de passeport biométrique (réf. <b>GC-2026-DI-019733</b>) déposée par <b>Mme Marie Estelle OBAME</b>, NIP <b>184 12 76 005 042</b>, nous vous prions de bien vouloir authentifier l'acte de naissance présenté.</p>
                  <p style={{ marginTop: 8 }}>Acte présenté : <b>EC-LBV-1992-04812</b>, registre de Libreville, année 1992.</p>
                  <p style={{ marginTop: 8 }}>Compte tenu du délai de traitement de la demande citoyenne, nous vous saurions gré d'une réponse sous 24 heures.</p>
                  <p style={{ marginTop: 8 }}>Cordialement,</p>
                </div>
                <div style={{ marginTop: 12, paddingTop: 12, borderTop: '1px solid var(--ink-150)', display: 'flex', gap: 8 }}>
                  <Badge tone="neutral" size="sm" icon="paperclip">demande-passeport-019733.pdf · 340 Ko</Badge>
                </div>
              </div>

              {/* Quick reply suggestion */}
              <div style={{ background: 'var(--info-50)', border: '1px dashed var(--primary-300)', borderRadius: 8, padding: 14, marginBottom: 14 }}>
                <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
                  <Icon name="cpu" size={14} style={{ color: 'var(--primary-500)' }}/>
                  <span style={{ fontSize: 12, fontWeight: 700, color: 'var(--primary-700)' }}>Réponse suggérée par Gabon Connect</span>
                </div>
                <p style={{ fontSize: 13, color: 'var(--ink-700)', marginTop: 8, lineHeight: 1.55 }}>
                  L'acte <b>EC-LBV-1992-04812</b> est conforme au registre. Nous confirmons l'authenticité du document. Aucune mention marginale n'a été constatée à ce jour.
                </p>
                <div style={{ display: 'flex', gap: 8, marginTop: 10 }}>
                  <Button size="sm" icon="check">Utiliser cette réponse</Button>
                  <Button variant="ghost" size="sm">Éditer</Button>
                </div>
              </div>
            </div>

            {/* Composer */}
            <div style={{ padding: 16, borderTop: '1px solid var(--ink-200)', background: 'white' }}>
              <TextArea placeholder="Rédiger une réponse…" defaultValue="" style={{ minHeight: 76, fontSize: 13.5 }}/>
              <div style={{ display: 'flex', alignItems: 'center', gap: 8, marginTop: 10 }}>
                <Button variant="ghost" size="sm" icon="paperclip">Joindre</Button>
                <Button variant="ghost" size="sm" icon="shieldCheck">Signer S/MIME</Button>
                <div style={{ flex: 1 }}/>
                <Button variant="secondary" size="sm" icon="save">Brouillon</Button>
                <Button size="sm" iconRight="arrowRight">Envoyer</Button>
              </div>
            </div>
          </div>

          {/* Right pane */}
          <aside style={{ borderLeft: '1px solid var(--ink-200)', overflow: 'auto', padding: 20 }}>
            <div style={{ fontSize: 11, fontWeight: 700, color: 'var(--ink-500)', textTransform: 'uppercase', letterSpacing: '0.06em', marginBottom: 10 }}>Circuit de validation</div>
            {[
              { who: 'Y. NGUEMA', role: 'Agent instructeur', st: 'done' },
              { who: 'C. NDONG', role: 'Chef de service', st: 'active' },
              { who: 'P. MOUSSAVOU', role: 'Officier signataire', st: 'pending' },
            ].map((s, i, arr) => (
              <div key={i} style={{ display: 'flex', gap: 10, alignItems: 'flex-start' }}>
                <div style={{ display: 'flex', flexDirection: 'column', alignItems: 'center' }}>
                  <span style={{ width: 24, height: 24, borderRadius: '50%', background: s.st === 'done' ? 'var(--success-500)' : s.st === 'active' ? 'var(--primary-500)' : 'white', border: `1.5px solid ${s.st === 'done' ? 'var(--success-500)' : s.st === 'active' ? 'var(--primary-500)' : 'var(--ink-300)'}`, color: s.st === 'pending' ? 'var(--ink-500)' : 'white', display: 'inline-flex', alignItems: 'center', justifyContent: 'center', fontSize: 11, fontWeight: 700 }}>
                    {s.st === 'done' ? <Icon name="check" size={11} stroke={3}/> : i + 1}
                  </span>
                  {i < arr.length - 1 && <span style={{ width: 1.5, flex: 1, minHeight: 24, background: s.st === 'pending' ? 'var(--ink-200)' : 'var(--ink-300)' }}/>}
                </div>
                <div style={{ flex: 1, paddingBottom: 12 }}>
                  <div style={{ fontSize: 13, fontWeight: 600 }}>{s.who}</div>
                  <div style={{ fontSize: 12, color: 'var(--ink-600)' }}>{s.role}</div>
                </div>
              </div>
            ))}
            <div style={{ height: 1, background: 'var(--ink-150)', margin: '6px 0 14px' }}/>
            <div style={{ fontSize: 11, fontWeight: 700, color: 'var(--ink-500)', textTransform: 'uppercase', letterSpacing: '0.06em', marginBottom: 10 }}>Dossier rattaché</div>
            <a href="#" style={{ display: 'flex', alignItems: 'center', gap: 10, padding: 10, background: 'var(--ink-50)', borderRadius: 6, textDecoration: 'none', color: 'inherit' }}>
              <Icon name="folder" size={16} style={{ color: 'var(--ink-500)' }}/>
              <div>
                <div style={{ fontSize: 13, fontWeight: 600 }}>Marie Estelle OBAME</div>
                <div style={{ fontSize: 11, color: 'var(--ink-600)' }}>3 demandes · 14 documents</div>
              </div>
            </a>
            <div style={{ height: 14 }}/>
            <div style={{ fontSize: 11, fontWeight: 700, color: 'var(--ink-500)', textTransform: 'uppercase', letterSpacing: '0.06em', marginBottom: 10 }}>Métadonnées</div>
            <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '8px 12px', fontSize: 12 }}>
              <span style={{ color: 'var(--ink-500)' }}>Référence</span><span style={{ fontFamily: 'var(--font-mono)', fontWeight: 600 }}>CR-2026-1842</span>
              <span style={{ color: 'var(--ink-500)' }}>Confidentialité</span><Badge tone="warning" size="sm">Restreint</Badge>
              <span style={{ color: 'var(--ink-500)' }}>Échéance</span><span style={{ fontWeight: 600 }}>21/05 11:42</span>
              <span style={{ color: 'var(--ink-500)' }}>Archivage</span><Badge tone="active" size="sm" dot>2 ans</Badge>
            </div>
          </aside>
        </div>
      </main>
    </div>
  </Frame>
);

/* ============================================================
   A7 · Archives SAE (brique conservée)
   ============================================================ */
const AdminArchives = () => (
  <Frame width={1440} height={950}>
    <AppHeader org={ADMIN_ORG} user={ADMIN_USER} role={ADMIN_ROLE}/>
    <div style={{ display: 'flex' }}>
      <Sidebar items={adminNav} current="archives"/>
      <main style={{ flex: 1, overflow: 'hidden' }}>
        <PageHeader
          breadcrumbs={['Archives (SAE)']}
          title="Archives à valeur probante"
          subtitle="Système d'Archivage Électronique conforme NF Z42-013 · 142 318 unités d'archives"
          meta={<>
            <Badge tone="archived" dot icon="shieldCheck">NF Z42-013</Badge>
            <Badge tone="active" icon="database">Hébergé au Gabon</Badge>
            <span style={{ fontSize: 12, color: 'var(--ink-600)' }}>Stockage utilisé · <b>2,4 To / 5 To</b></span>
          </>}
          actions={<><Button variant="outline" icon="upload">Verser au SAE</Button><Button variant="outline" icon="search">Recherche avancée</Button></>}
        />
        <div style={{ padding: '20px 32px', display: 'flex', flexDirection: 'column', gap: 16 }}>

          <div style={{ display: 'grid', gridTemplateColumns: 'repeat(4, 1fr)', gap: 12 }}>
            <StatCard label="Versés ce mois" value="3 184" icon="upload" delta="+18 %" deltaTone="success"/>
            <StatCard label="Empreintes scellées" value="142 318" icon="shieldCheck"/>
            <StatCard label="En attente d'élim." value="412" icon="trash" hint="DUA dépassée"/>
            <StatCard label="Intégrité" value="100 %" icon="checkCircle" hint="dernier contrôle 19/05"/>
          </div>

          <Card>
            <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: 14 }}>
              <Tabs tabs={[{id: 'recent', label: 'Versements récents'}, {id: 'fonds', label: 'Fonds (ISAD-G)'}, {id: 'elim', label: 'Plan d\'élimination'}, {id: 'comm', label: 'Communications'}]} current="recent" variant="line"/>
              <div style={{ display: 'flex', gap: 8 }}>
                <TextInput placeholder="Cote, mots-clés…" icon="search" style={{ width: 220 }}/>
                <Button variant="ghost" icon="filter">Filtrer</Button>
              </div>
            </div>
            <Table>
              <thead>
                <tr>
                  <Th>Cote</Th>
                  <Th>Description</Th>
                  <Th>Producteur</Th>
                  <Th>Versement</Th>
                  <Th>DUA</Th>
                  <Th>Statut</Th>
                  <Th>Sort final</Th>
                  <Th>Empreinte</Th>
                </tr>
              </thead>
              <tbody>
                {[
                  { c: 'GA/EC/2026/04812', d: 'Acte de naissance · OBAME Marie Estelle', p: 'DG État Civil', v: '28/05/2026', dua: 'Indéf.', st: 'Actif', tone: 'active', sf: 'Conservation définitive', e: '8a3c5e…d09f' },
                  { c: 'GA/EC/2026/04783', d: 'Acte de mariage · MOUNGUENGUI / OYANE', p: 'DG État Civil', v: '24/05/2026', dua: 'Indéf.', st: 'Actif', tone: 'active', sf: 'Conservation définitive', e: 'b2f1c7…91d8' },
                  { c: 'GA/EC/2026/04772', d: 'Acte de décès · NZOGHE Paul', p: 'DG État Civil', v: '22/05/2026', dua: '75 ans', st: 'Semi-actif', tone: 'semi', sf: 'Conservation définitive', e: '4d8e2b…7f3c' },
                  { c: 'GA/JU/2026/01184', d: 'Casier judiciaire · OBAME Marie · B3', p: 'Min. Justice', v: '21/05/2026', dua: '3 mois', st: 'Actif', tone: 'active', sf: 'Élimination 21/08/26', e: 'c5b9a1…6e2f' },
                  { c: 'GA/DI/2026/19733', d: 'Dossier passeport · OBAME Marie · 1ère demande', p: 'DG Documentation', v: '20/05/2026', dua: '10 ans', st: 'Actif', tone: 'active', sf: 'Élimination 2036', e: 'e7d4f3…b1a8' },
                  { c: 'GA/EC/2022/14829', d: 'Registre N de Libreville · trimestre 2022', p: 'Mairie Libreville', v: '14/02/2023', dua: 'Indéf.', st: 'Archivé', tone: 'archived', sf: 'Conservation définitive', e: '1a9b6c…d4e2' },
                  { c: 'GA/EC/2019/02145', d: 'Dossier d\'adoption · KOMBILA J.', p: 'DG État Civil', v: '08/11/2019', dua: '120 ans', st: 'Semi-actif', tone: 'semi', sf: 'Conservation définitive', e: 'f6e1d2…8b3a' },
                ].map(r => (
                  <Tr key={r.c} onClick={() => {}}>
                    <Td style={{ fontFamily: 'var(--font-mono)', fontSize: 12, fontWeight: 600 }}>{r.c}</Td>
                    <Td><div style={{ display: 'flex', alignItems: 'center', gap: 8 }}><Icon name="fileText" size={14} style={{ color: 'var(--ink-500)' }}/><span style={{ fontWeight: 500 }}>{r.d}</span></div></Td>
                    <Td>{r.p}</Td>
                    <Td style={{ color: 'var(--ink-600)' }}>{r.v}</Td>
                    <Td style={{ fontWeight: 600 }}>{r.dua}</Td>
                    <Td><Badge tone={r.tone} dot>{r.st}</Badge></Td>
                    <Td style={{ fontSize: 12, color: 'var(--ink-700)' }}>{r.sf}</Td>
                    <Td style={{ fontFamily: 'var(--font-mono)', fontSize: 11, color: 'var(--ink-600)' }}>{r.e}</Td>
                  </Tr>
                ))}
              </tbody>
            </Table>
          </Card>

          <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 16 }}>
            <Card>
              <SectionHeading title="Conformité NF Z42-013" level={3}/>
              {[
                { t: 'Horodatage qualifié (RFC 3161)', d: 'Tous les versements horodatés.', ok: true },
                { t: 'Empreintes SHA-256', d: 'Recalculées toutes les 24h.', ok: true },
                { t: 'Journal d\'événements scellé', d: '186 472 lignes · scellement quotidien.', ok: true },
                { t: 'Réplication géographique', d: 'Owendo (primaire) + Mvengue (secours).', ok: true },
                { t: 'Audit annuel BSI', d: 'Prochaine échéance : nov. 2026.', ok: true },
              ].map(c => (
                <div key={c.t} style={{ display: 'flex', alignItems: 'flex-start', gap: 10, padding: '8px 0', borderBottom: '1px solid var(--ink-150)' }}>
                  <span style={{ width: 20, height: 20, borderRadius: '50%', background: 'var(--success-500)', color: 'white', display: 'inline-flex', alignItems: 'center', justifyContent: 'center', flexShrink: 0, marginTop: 2 }}><Icon name="check" size={11} stroke={3}/></span>
                  <div>
                    <div style={{ fontSize: 13.5, fontWeight: 600 }}>{c.t}</div>
                    <div style={{ fontSize: 12.5, color: 'var(--ink-600)' }}>{c.d}</div>
                  </div>
                </div>
              ))}
            </Card>
            <Card>
              <SectionHeading title="Élimination réglementaire" subtitle="412 unités d'archives à éliminer après visa du Directeur des Archives Nationales." level={3} action={<Button variant="secondary" icon="trash" size="sm">Préparer bordereau</Button>}/>
              <div style={{ background: 'var(--warning-50)', border: '1px solid #f0c269', borderRadius: 6, padding: 12, fontSize: 13, color: 'var(--ink-700)' }}>
                <Icon name="alertTriangle" size={13} style={{ verticalAlign: 'middle', marginRight: 6, color: 'var(--warning-600)' }}/>
                <b>4 lots à valider.</b> Bordereau d'élimination généré le 18/05, en attente du visa de la DGAN.
              </div>
              {[
                { l: 'Casiers judiciaires expirés (T1 2026)', n: 142, sort: 'Destruction physique' },
                { l: 'Demandes passeport non abouties', n: 84, sort: 'Destruction logique' },
                { l: 'Brouillons d\'actes annulés', n: 124, sort: 'Destruction logique' },
                { l: 'Notifications expirées > 90 j', n: 62, sort: 'Destruction logique' },
              ].map(l => (
                <div key={l.l} style={{ display: 'flex', alignItems: 'center', gap: 10, padding: '10px 0', borderBottom: '1px solid var(--ink-150)' }}>
                  <Checkbox checked={true} id={l.l}/>
                  <div style={{ flex: 1 }}>
                    <div style={{ fontSize: 13.5, fontWeight: 600 }}>{l.l}</div>
                    <div style={{ fontSize: 12, color: 'var(--ink-600)' }}>{l.n} unités · {l.sort}</div>
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

/* ============================================================
   A8 · Gestion des services proposés
   ============================================================ */
const AdminServices = () => (
  <Frame width={1440} height={900}>
    <AppHeader org={ADMIN_ORG} user={ADMIN_USER} role={ADMIN_ROLE}/>
    <div style={{ display: 'flex' }}>
      <Sidebar items={adminNav} current="services"/>
      <main style={{ flex: 1, overflow: 'hidden' }}>
        <PageHeader
          breadcrumbs={['Mes services']}
          title="Services proposés au public"
          subtitle="14 services publiés au catalogue Gabon Connect · 2 en projet"
          actions={<><Button variant="outline" icon="copy">Dupliquer</Button><Button icon="plus">Créer un service</Button></>}
        />
        <div style={{ padding: '20px 32px', display: 'flex', flexDirection: 'column', gap: 16 }}>

          <div style={{ display: 'flex', alignItems: 'center', gap: 12 }}>
            <Tabs tabs={[{id: 'all', label: 'Tous (16)'}, {id: 'pub', label: 'Publiés (14)'}, {id: 'draft', label: 'Brouillons (2)'}, {id: 'arch', label: 'Archivés'}]} current="all" variant="pill"/>
            <div style={{ flex: 1 }}/>
            <TextInput placeholder="Rechercher un service…" icon="search" style={{ width: 280 }}/>
          </div>

          <Table>
            <thead>
              <tr>
                <Th>Service</Th>
                <Th>Catégorie</Th>
                <Th>Statut</Th>
                <Th sortable>Demandes 30 j</Th>
                <Th>Délai moyen</Th>
                <Th>Satisfaction</Th>
                <Th>Coût</Th>
                <Th>Mise à jour</Th>
                <Th>{' '}</Th>
              </tr>
            </thead>
            <tbody>
              {[
                { t: 'Acte de naissance · copie intégrale', cat: 'État civil', st: 'Publié', tone: 'archived', n: 184, d: '1 j 14 h', s: '4,7', f: 'Gratuit', u: 'il y a 12 j' },
                { t: 'Acte de naissance · extrait', cat: 'État civil', st: 'Publié', tone: 'archived', n: 142, d: '1 j 12 h', s: '4,7', f: 'Gratuit', u: 'il y a 12 j' },
                { t: 'Acte de mariage', cat: 'État civil', st: 'Publié', tone: 'archived', n: 68, d: '2 j', s: '4,6', f: 'Gratuit', u: 'il y a 28 j' },
                { t: 'Certificat de nationalité', cat: 'État civil', st: 'Publié', tone: 'archived', n: 52, d: '6 j', s: '4,2', f: '3 000 FCFA', u: 'il y a 2 mois' },
                { t: 'Acte de décès', cat: 'État civil', st: 'Publié', tone: 'archived', n: 26, d: '1 j 8 h', s: '4,5', f: 'Gratuit', u: 'il y a 18 j' },
                { t: 'Légalisation de signature', cat: 'État civil', st: 'Publié', tone: 'archived', n: 14, d: '6 h', s: '4,8', f: '500 FCFA', u: 'il y a 3 j' },
                { t: 'Transcription d\'acte étranger', cat: 'État civil', st: 'Brouillon', tone: 'neutral', n: 0, d: '—', s: '—', f: '5 000 FCFA', u: 'il y a 6 j' },
                { t: 'Rectification d\'acte', cat: 'État civil', st: 'Brouillon', tone: 'neutral', n: 0, d: '—', s: '—', f: '2 500 FCFA', u: 'il y a 14 j' },
              ].map(s => (
                <Tr key={s.t} onClick={() => {}}>
                  <Td><div style={{ display: 'flex', alignItems: 'center', gap: 10 }}><Icon name="layers" size={16} style={{ color: 'var(--primary-500)' }}/><span style={{ fontWeight: 600 }}>{s.t}</span></div></Td>
                  <Td>{s.cat}</Td>
                  <Td><Badge tone={s.tone} dot>{s.st}</Badge></Td>
                  <Td style={{ fontWeight: 600, fontVariantNumeric: 'tabular-nums' }}>{s.n}</Td>
                  <Td>{s.d}</Td>
                  <Td>{s.s !== '—' ? <span><Icon name="star" size={12} style={{ color: 'var(--warning-500)', verticalAlign: 'middle', marginRight: 4 }}/>{s.s}/5</span> : '—'}</Td>
                  <Td>{s.f}</Td>
                  <Td style={{ color: 'var(--ink-600)' }}>{s.u}</Td>
                  <Td><Icon name="moreH" size={16} style={{ color: 'var(--ink-400)' }}/></Td>
                </Tr>
              ))}
            </tbody>
          </Table>
        </div>
      </main>
    </div>
  </Frame>
);

/* ============================================================
   A9 · Annuaire (autres administrations)
   ============================================================ */
const AdminDirectory = () => (
  <Frame width={1440} height={950}>
    <AppHeader org={ADMIN_ORG} user={ADMIN_USER} role={ADMIN_ROLE}/>
    <div style={{ display: 'flex' }}>
      <Sidebar items={adminNav} current="annuaire"/>
      <main style={{ flex: 1, overflow: 'hidden' }}>
        <PageHeader
          breadcrumbs={['Annuaire des administrations']}
          title="Annuaire inter-administrations"
          subtitle="47 administrations connectées · contacts officiels & circuits validés"
          actions={<><Button variant="outline" icon="download">Export</Button><Button variant="outline" icon="filter">Filtres</Button></>}
        />
        <div style={{ padding: '20px 32px' }}>
          <div style={{ display: 'flex', gap: 12, marginBottom: 18 }}>
            <TextInput placeholder="Rechercher une administration, un service, un contact…" icon="search" style={{ width: 420 }}/>
            <Select defaultValue="all" style={{ width: 200 }}><option value="all">Toutes les catégories</option></Select>
            <Select defaultValue="all" style={{ width: 200 }}><option value="all">Toutes provinces</option></Select>
          </div>

          <Table>
            <thead>
              <tr>
                <Th>Administration</Th>
                <Th>Catégorie</Th>
                <Th>Tutelle</Th>
                <Th>Services</Th>
                <Th>Référent</Th>
                <Th>Connexion</Th>
                <Th>{' '}</Th>
              </tr>
            </thead>
            <tbody>
              {[
                { n: 'Direction Gén. de la Documentation', cat: 'Direction générale', tut: 'Min. Intérieur', svc: 8, r: 'Capt. F. MBOUMBA', co: 'API + SSO' },
                { n: 'Ministère de la Justice', cat: 'Ministère', tut: 'Présidence', svc: 6, r: 'M. R. NDOMBET', co: 'API + SSO' },
                { n: 'ANPI-Gabon', cat: 'Établissement public', tut: 'Min. Économie', svc: 11, r: 'Mme L. EYANG', co: 'API + SSO' },
                { n: 'Direction Gén. des Impôts', cat: 'Direction générale', tut: 'Min. Économie', svc: 9, r: 'M. P. NGUEMA', co: 'API + SSO' },
                { n: 'CNAMGS', cat: 'Établissement public', tut: 'Min. Santé', svc: 7, r: 'Dr A. BIYOGHE', co: 'API + SSO' },
                { n: 'Mairie de Libreville', cat: 'Collectivité', tut: 'Autonome', svc: 12, r: 'Mme C. MABIKA', co: 'Portail' },
                { n: 'CNSS', cat: 'Établissement public', tut: 'Min. Travail', svc: 8, r: 'M. T. ELLA', co: 'API + SSO' },
                { n: 'DG Archives Nationales', cat: 'Direction générale', tut: 'Min. Culture', svc: 4, r: 'Mme A. OKEMBA', co: 'API + SSO' },
                { n: 'Police Nationale', cat: 'Direction générale', tut: 'Min. Intérieur', svc: 3, r: 'Col. M. BEKALE', co: 'API + SSO' },
              ].map(o => (
                <Tr key={o.n} onClick={() => {}}>
                  <Td><div style={{ display: 'flex', alignItems: 'center', gap: 10 }}><Icon name="building" size={16} style={{ color: 'var(--primary-500)' }}/><span style={{ fontWeight: 600 }}>{o.n}</span></div></Td>
                  <Td>{o.cat}</Td>
                  <Td style={{ color: 'var(--ink-600)' }}>{o.tut}</Td>
                  <Td><Badge tone="primary" size="sm">{o.svc} services</Badge></Td>
                  <Td><div style={{ display: 'flex', alignItems: 'center', gap: 8 }}><Avatar name={o.r} tone="primary" size={22}/><span>{o.r}</span></div></Td>
                  <Td>{o.co === 'API + SSO' ? <Badge tone="archived" size="sm" dot>{o.co}</Badge> : <Badge tone="neutral" size="sm" dot>{o.co}</Badge>}</Td>
                  <Td><Button variant="ghost" size="sm" iconRight="arrowRight">Contacter</Button></Td>
                </Tr>
              ))}
            </tbody>
          </Table>
        </div>
      </main>
    </div>
  </Frame>
);

/* ---------- Exports ---------- */
Object.assign(window, {
  AdminDashboard, AdminQueue, AdminInstruction, AdminCitizenFolder,
  AdminGeneration, AdminCorrespondence, AdminArchives, AdminServices, AdminDirectory,
});
