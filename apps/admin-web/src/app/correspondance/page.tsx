import {
  AppHeader,
  Avatar,
  Badge,
  Button,
  Frame,
  Icon,
  PageHeader,
  Sidebar,
  TextArea,
  TextInput,
} from "@workspace/ui"
import { getCorrespondences, getCurrentAdmin } from "@workspace/mocks/admin"
import { ADMIN_NAV } from "@/lib/admin-nav"

export default async function AdminCorrespondencePage() {
  const [admin, correspondences] = await Promise.all([
    getCurrentAdmin(),
    getCorrespondences(),
  ])

  return (
    <Frame width={1440} height={900}>
      <AppHeader org={admin.org} user={admin.name} role={admin.role} />
      <div style={{ display: "flex" }}>
        <Sidebar items={ADMIN_NAV} current="correspondance" />
        <main
          style={{
            flex: 1,
            overflow: "hidden",
            display: "flex",
            flexDirection: "column",
          }}
        >
          <PageHeader
            breadcrumbs={["Correspondance inter-administrations"]}
            title="Messagerie sécurisée inter-admin"
            subtitle="Échanges officiels entre la DG État Civil et les autres administrations gabonaises."
            actions={
              <>
                <Button variant="outline" icon="filter">
                  Filtres
                </Button>
                <Button icon="plus">Nouveau courrier</Button>
              </>
            }
          />
          <div
            style={{
              display: "grid",
              gridTemplateColumns: "300px 1fr 360px",
              flex: 1,
              overflow: "hidden",
            }}
          >
            {/* List */}
            <div style={{ borderRight: "1px solid var(--ink-200)", overflow: "auto" }}>
              <div style={{ padding: 14, borderBottom: "1px solid var(--ink-150)" }}>
                <TextInput placeholder="Rechercher…" icon="search" />
              </div>
              <div
                style={{
                  display: "flex",
                  gap: 4,
                  padding: "10px 14px",
                  borderBottom: "1px solid var(--ink-150)",
                }}
              >
                {["Reçus (12)", "Envoyés", "Brouillons"].map((t, i) => (
                  <button
                    key={t}
                    style={{
                      padding: "4px 10px",
                      fontSize: 12,
                      fontWeight: 600,
                      background: i === 0 ? "var(--primary-50)" : "transparent",
                      color: i === 0 ? "var(--primary-700)" : "var(--ink-600)",
                      border: "none",
                      borderRadius: 4,
                      cursor: "pointer",
                    }}
                  >
                    {t}
                  </button>
                ))}
              </div>
              {correspondences.map((m, i) => (
                <div
                  key={m.ref}
                  style={{
                    padding: "12px 14px",
                    borderBottom: "1px solid var(--ink-150)",
                    background:
                      i === 0
                        ? "var(--primary-50)"
                        : m.unread
                          ? "white"
                          : "var(--ink-50)",
                    cursor: "pointer",
                    display: "flex",
                    gap: 10,
                  }}
                >
                  <span
                    style={{
                      width: 6,
                      height: 6,
                      borderRadius: "50%",
                      background: m.unread ? "var(--primary-500)" : "transparent",
                      marginTop: 8,
                      flexShrink: 0,
                    }}
                  />
                  <div style={{ flex: 1, minWidth: 0 }}>
                    <div
                      style={{
                        display: "flex",
                        justifyContent: "space-between",
                        alignItems: "center",
                      }}
                    >
                      <span
                        style={{
                          fontSize: 13,
                          fontWeight: m.unread ? 700 : 600,
                          color: "var(--ink-900)",
                        }}
                      >
                        {m.from}
                      </span>
                      <span style={{ fontSize: 11, color: "var(--ink-500)" }}>{m.when}</span>
                    </div>
                    <div
                      style={{
                        fontSize: 13,
                        color: "var(--ink-800)",
                        marginTop: 2,
                        whiteSpace: "nowrap",
                        textOverflow: "ellipsis",
                        overflow: "hidden",
                      }}
                    >
                      {m.subject}
                    </div>
                    <div
                      style={{
                        display: "flex",
                        alignItems: "center",
                        gap: 6,
                        marginTop: 4,
                      }}
                    >
                      <span
                        style={{
                          fontFamily: "var(--font-mono)",
                          fontSize: 10.5,
                          color: "var(--ink-500)",
                        }}
                      >
                        {m.ref}
                      </span>
                      {m.urgent && (
                        <Badge tone="danger" size="sm">
                          Urgent
                        </Badge>
                      )}
                      {m.attachments > 0 && (
                        <span style={{ fontSize: 11, color: "var(--ink-600)" }}>
                          <Icon
                            name="paperclip"
                            size={11}
                            style={{ verticalAlign: "middle" }}
                          />{" "}
                          {m.attachments}
                        </span>
                      )}
                    </div>
                  </div>
                </div>
              ))}
            </div>

            {/* Conversation */}
            <div
              style={{
                display: "flex",
                flexDirection: "column",
                overflow: "hidden",
              }}
            >
              <div
                style={{
                  padding: "14px 24px",
                  borderBottom: "1px solid var(--ink-200)",
                  background: "white",
                }}
              >
                <div
                  style={{
                    display: "flex",
                    alignItems: "center",
                    justifyContent: "space-between",
                  }}
                >
                  <div>
                    <h2 style={{ fontSize: 17 }}>
                      Demande d&apos;authentification d&apos;acte de naissance · OBAME Marie
                    </h2>
                    <div
                      style={{
                        display: "flex",
                        alignItems: "center",
                        gap: 10,
                        marginTop: 4,
                        fontSize: 12.5,
                        color: "var(--ink-600)",
                      }}
                    >
                      <span style={{ fontFamily: "var(--font-mono)" }}>CR-2026-1842</span>
                      <Badge tone="danger" size="sm">
                        Urgent · délai 24 h
                      </Badge>
                      <span>3 participants</span>
                    </div>
                  </div>
                  <div style={{ display: "flex", gap: 6 }}>
                    <Button variant="ghost" size="sm" icon="archive">
                      {""}
                    </Button>
                    <Button variant="ghost" size="sm" icon="share">
                      {""}
                    </Button>
                    <Button variant="ghost" size="sm" icon="moreH">
                      {""}
                    </Button>
                  </div>
                </div>
              </div>

              <div
                style={{
                  flex: 1,
                  overflow: "auto",
                  padding: "20px 24px",
                  background: "var(--ink-50)",
                }}
              >
                {/* Message 1 */}
                <div
                  style={{
                    background: "white",
                    border: "1px solid var(--ink-200)",
                    borderRadius: 8,
                    padding: 18,
                    marginBottom: 14,
                  }}
                >
                  <div
                    style={{
                      display: "flex",
                      alignItems: "center",
                      gap: 10,
                      marginBottom: 10,
                    }}
                  >
                    <Avatar name="DG Documentation" tone="primary" size={32} />
                    <div style={{ flex: 1 }}>
                      <div style={{ fontSize: 13, fontWeight: 700 }}>
                        DG Documentation · Capt. Faustin MBOUMBA
                      </div>
                      <div style={{ fontSize: 11.5, color: "var(--ink-600)" }}>
                        Pour : DG État Civil · 20 mai 2026 · 11:42
                      </div>
                    </div>
                    <Badge tone="archived" size="sm" icon="shieldCheck">
                      Signé S/MIME
                    </Badge>
                  </div>
                  <div
                    style={{
                      fontSize: 14,
                      color: "var(--ink-800)",
                      lineHeight: 1.65,
                    }}
                  >
                    <p>Madame, Monsieur,</p>
                    <p style={{ marginTop: 8 }}>
                      Dans le cadre de l&apos;instruction d&apos;une demande de
                      renouvellement de passeport biométrique (réf.{" "}
                      <b>GC-2026-DI-019733</b>) déposée par <b>Mme Marie Estelle OBAME</b>,
                      NIP <b>184 12 76 005 042</b>, nous vous prions de bien vouloir
                      authentifier l&apos;acte de naissance présenté.
                    </p>
                    <p style={{ marginTop: 8 }}>
                      Acte présenté : <b>EC-LBV-1992-04812</b>, registre de Libreville,
                      année 1992.
                    </p>
                    <p style={{ marginTop: 8 }}>
                      Compte tenu du délai de traitement de la demande citoyenne, nous vous
                      saurions gré d&apos;une réponse sous 24 heures.
                    </p>
                    <p style={{ marginTop: 8 }}>Cordialement,</p>
                  </div>
                  <div
                    style={{
                      marginTop: 12,
                      paddingTop: 12,
                      borderTop: "1px solid var(--ink-150)",
                      display: "flex",
                      gap: 8,
                    }}
                  >
                    <Badge tone="neutral" size="sm" icon="paperclip">
                      demande-passeport-019733.pdf · 340 Ko
                    </Badge>
                  </div>
                </div>

                {/* Quick reply suggestion */}
                <div
                  style={{
                    background: "var(--info-50)",
                    border: "1px dashed var(--primary-300)",
                    borderRadius: 8,
                    padding: 14,
                    marginBottom: 14,
                  }}
                >
                  <div style={{ display: "flex", alignItems: "center", gap: 8 }}>
                    <Icon name="cpu" size={14} style={{ color: "var(--primary-500)" }} />
                    <span
                      style={{
                        fontSize: 12,
                        fontWeight: 700,
                        color: "var(--primary-700)",
                      }}
                    >
                      Réponse suggérée par Gabon Connect
                    </span>
                  </div>
                  <p
                    style={{
                      fontSize: 13,
                      color: "var(--ink-700)",
                      marginTop: 8,
                      lineHeight: 1.55,
                    }}
                  >
                    L&apos;acte <b>EC-LBV-1992-04812</b> est conforme au registre. Nous
                    confirmons l&apos;authenticité du document. Aucune mention marginale
                    n&apos;a été constatée à ce jour.
                  </p>
                  <div style={{ display: "flex", gap: 8, marginTop: 10 }}>
                    <Button size="sm" icon="check">
                      Utiliser cette réponse
                    </Button>
                    <Button variant="ghost" size="sm">
                      Éditer
                    </Button>
                  </div>
                </div>
              </div>

              {/* Composer */}
              <div
                style={{
                  padding: 16,
                  borderTop: "1px solid var(--ink-200)",
                  background: "white",
                }}
              >
                <TextArea
                  placeholder="Rédiger une réponse…"
                  defaultValue=""
                  style={{ minHeight: 76, fontSize: 13.5 }}
                />
                <div
                  style={{
                    display: "flex",
                    alignItems: "center",
                    gap: 8,
                    marginTop: 10,
                  }}
                >
                  <Button variant="ghost" size="sm" icon="paperclip">
                    Joindre
                  </Button>
                  <Button variant="ghost" size="sm" icon="shieldCheck">
                    Signer S/MIME
                  </Button>
                  <div style={{ flex: 1 }} />
                  <Button variant="secondary" size="sm" icon="save">
                    Brouillon
                  </Button>
                  <Button size="sm" iconRight="arrowRight">
                    Envoyer
                  </Button>
                </div>
              </div>
            </div>

            {/* Right pane */}
            <aside
              style={{
                borderLeft: "1px solid var(--ink-200)",
                overflow: "auto",
                padding: 20,
              }}
            >
              <div
                style={{
                  fontSize: 11,
                  fontWeight: 700,
                  color: "var(--ink-500)",
                  textTransform: "uppercase",
                  letterSpacing: "0.06em",
                  marginBottom: 10,
                }}
              >
                Circuit de validation
              </div>
              {[
                { who: "Y. NGUEMA", role: "Agent instructeur", st: "done" as const },
                { who: "C. NDONG", role: "Chef de service", st: "active" as const },
                {
                  who: "P. MOUSSAVOU",
                  role: "Officier signataire",
                  st: "pending" as const,
                },
              ].map((s, i, arr) => (
                <div key={s.who} style={{ display: "flex", gap: 10, alignItems: "flex-start" }}>
                  <div
                    style={{
                      display: "flex",
                      flexDirection: "column",
                      alignItems: "center",
                    }}
                  >
                    <span
                      style={{
                        width: 24,
                        height: 24,
                        borderRadius: "50%",
                        background:
                          s.st === "done"
                            ? "var(--success-500)"
                            : s.st === "active"
                              ? "var(--primary-500)"
                              : "white",
                        border: `1.5px solid ${
                          s.st === "done"
                            ? "var(--success-500)"
                            : s.st === "active"
                              ? "var(--primary-500)"
                              : "var(--ink-300)"
                        }`,
                        color: s.st === "pending" ? "var(--ink-500)" : "white",
                        display: "inline-flex",
                        alignItems: "center",
                        justifyContent: "center",
                        fontSize: 11,
                        fontWeight: 700,
                      }}
                    >
                      {s.st === "done" ? <Icon name="check" size={11} stroke={3} /> : i + 1}
                    </span>
                    {i < arr.length - 1 && (
                      <span
                        style={{
                          width: 1.5,
                          flex: 1,
                          minHeight: 24,
                          background:
                            s.st === "pending" ? "var(--ink-200)" : "var(--ink-300)",
                        }}
                      />
                    )}
                  </div>
                  <div style={{ flex: 1, paddingBottom: 12 }}>
                    <div style={{ fontSize: 13, fontWeight: 600 }}>{s.who}</div>
                    <div style={{ fontSize: 12, color: "var(--ink-600)" }}>{s.role}</div>
                  </div>
                </div>
              ))}
              <div
                style={{
                  height: 1,
                  background: "var(--ink-150)",
                  margin: "6px 0 14px",
                }}
              />
              <div
                style={{
                  fontSize: 11,
                  fontWeight: 700,
                  color: "var(--ink-500)",
                  textTransform: "uppercase",
                  letterSpacing: "0.06em",
                  marginBottom: 10,
                }}
              >
                Dossier rattaché
              </div>
              <a
                href="/dossiers/184127600504"
                style={{
                  display: "flex",
                  alignItems: "center",
                  gap: 10,
                  padding: 10,
                  background: "var(--ink-50)",
                  borderRadius: 6,
                  textDecoration: "none",
                  color: "inherit",
                }}
              >
                <Icon name="folder" size={16} style={{ color: "var(--ink-500)" }} />
                <div>
                  <div style={{ fontSize: 13, fontWeight: 600 }}>Marie Estelle OBAME</div>
                  <div style={{ fontSize: 11, color: "var(--ink-600)" }}>
                    3 demandes · 14 documents
                  </div>
                </div>
              </a>
              <div style={{ height: 14 }} />
              <div
                style={{
                  fontSize: 11,
                  fontWeight: 700,
                  color: "var(--ink-500)",
                  textTransform: "uppercase",
                  letterSpacing: "0.06em",
                  marginBottom: 10,
                }}
              >
                Métadonnées
              </div>
              <div
                style={{
                  display: "grid",
                  gridTemplateColumns: "1fr 1fr",
                  gap: "8px 12px",
                  fontSize: 12,
                }}
              >
                <span style={{ color: "var(--ink-500)" }}>Référence</span>
                <span
                  style={{
                    fontFamily: "var(--font-mono)",
                    fontWeight: 600,
                  }}
                >
                  CR-2026-1842
                </span>
                <span style={{ color: "var(--ink-500)" }}>Confidentialité</span>
                <Badge tone="warning" size="sm">
                  Restreint
                </Badge>
                <span style={{ color: "var(--ink-500)" }}>Échéance</span>
                <span style={{ fontWeight: 600 }}>21/05 11:42</span>
                <span style={{ color: "var(--ink-500)" }}>Archivage</span>
                <Badge tone="active" size="sm" dot>
                  2 ans
                </Badge>
              </div>
            </aside>
          </div>
        </main>
      </div>
    </Frame>
  )
}
