import type { ReactNode } from "react"
import {
  Alert,
  Avatar,
  Badge,
  Button,
  Card,
  Checkbox,
  Field,
  PipelineStep,
  ProbatoryBanner,
  Progress,
  Radio,
  SectionHeading,
  Select,
  StatCard,
  Stepper,
  Table,
  Tabs,
  Td,
  TextInput,
  Th,
  Toggle,
  Tr,
} from "@workspace/ui"

interface Swatch {
  name: string
  value: string
}

function DSPalette({ title, swatches }: { title: string; swatches: Swatch[] }) {
  return (
    <Card>
      <SectionHeading title={title} level={3} />
      <div
        style={{
          display: "grid",
          gridTemplateColumns: "repeat(auto-fill, minmax(120px, 1fr))",
          gap: 12,
        }}
      >
        {swatches.map((s) => (
          <div key={s.name} style={{ display: "flex", flexDirection: "column", gap: 4 }}>
            <div
              style={{
                height: 56,
                background: s.value,
                borderRadius: 6,
                border: "1px solid rgba(0,0,0,.08)",
              }}
            />
            <div
              style={{
                display: "flex",
                flexDirection: "column",
                fontSize: 11,
                color: "var(--ink-700)",
              }}
            >
              <span style={{ fontWeight: 600 }}>{s.name}</span>
              <span
                style={{
                  fontFamily: "var(--font-mono)",
                  color: "var(--ink-500)",
                }}
              >
                {s.value}
              </span>
            </div>
          </div>
        ))}
      </div>
    </Card>
  )
}

function DSType() {
  const rows = [
    { l: "Display", s: "40 / 48 / 700", fz: 40, fw: 700, t: "Archives Nationales" },
    { l: "H1", s: "26 / 32 / 700", fz: 26, fw: 700, t: "Tableau de bord" },
    { l: "H2", s: "20 / 28 / 700", fz: 20, fw: 700, t: "Section principale" },
    { l: "H3", s: "16 / 22 / 700", fz: 16, fw: 700, t: "Sous-titre de section" },
    {
      l: "Body",
      s: "15 / 22 / 400",
      fz: 15,
      fw: 400,
      t: "Texte courant institutionnel, lisible et confortable.",
    },
    {
      l: "Small",
      s: "13 / 18 / 500",
      fz: 13,
      fw: 500,
      t: "Métadonnées, captions, labels secondaires.",
    },
    { l: "Mono", s: "12 / 18 / mono", fz: 12, fw: 500, t: "8a3c…d09f", mono: true },
  ]
  return (
    <Card>
      <SectionHeading
        title="Typographie — Marianne"
        subtitle="Sans-serif institutionnelle, lisible en bas-débit, contrastée en bold."
        level={3}
      />
      <div
        style={{
          display: "flex",
          flexDirection: "column",
          gap: 18,
          paddingTop: 8,
        }}
      >
        {rows.map((r) => (
          <div
            key={r.l}
            style={{
              display: "grid",
              gridTemplateColumns: "120px 140px 1fr",
              alignItems: "baseline",
              gap: 16,
            }}
          >
            <span
              style={{
                fontSize: 12,
                fontWeight: 700,
                color: "var(--ink-600)",
                textTransform: "uppercase",
                letterSpacing: ".06em",
              }}
            >
              {r.l}
            </span>
            <span
              style={{
                fontSize: 12,
                color: "var(--ink-500)",
                fontFamily: "var(--font-mono)",
              }}
            >
              {r.s}
            </span>
            <span
              style={{
                fontSize: r.fz,
                fontWeight: r.fw,
                fontFamily: r.mono ? "var(--font-mono)" : "var(--font-sans)",
                color: "var(--ink-900)",
              }}
            >
              {r.t}
            </span>
          </div>
        ))}
      </div>
    </Card>
  )
}

function DSGrid({
  title,
  children,
  cols = "repeat(auto-fill, minmax(200px, 1fr))",
}: {
  title: string
  children: ReactNode
  cols?: string
}) {
  return (
    <Card>
      <SectionHeading title={title} level={3} />
      <div
        style={{
          display: "grid",
          gridTemplateColumns: cols,
          gap: 16,
          alignItems: "start",
        }}
      >
        {children}
      </div>
    </Card>
  )
}

function DSItem({ name, children }: { name: string; children: ReactNode }) {
  return (
    <div style={{ display: "flex", flexDirection: "column", gap: 8 }}>
      <span
        style={{
          fontSize: 11,
          fontWeight: 700,
          color: "var(--ink-500)",
          textTransform: "uppercase",
          letterSpacing: "0.05em",
        }}
      >
        {name}
      </span>
      <div
        style={{
          padding: 16,
          background: "var(--ink-50)",
          borderRadius: 6,
          display: "flex",
          alignItems: "center",
          justifyContent: "center",
          minHeight: 64,
        }}
      >
        {children}
      </div>
    </div>
  )
}

export default function DesignSystemPage() {
  return (
    <div
      style={{
        padding: 32,
        display: "flex",
        flexDirection: "column",
        gap: 24,
        maxWidth: 1320,
        margin: "0 auto",
      }}
    >
      <header style={{ display: "flex", flexDirection: "column", gap: 8 }}>
        <Badge tone="primary" dot>
          Système de design
        </Badge>
        <h1 style={{ fontSize: 36, letterSpacing: "-0.02em" }}>
          Gabon Connect — Référentiel commun
        </h1>
        <p
          style={{
            fontSize: 16,
            color: "var(--ink-600)",
            maxWidth: 720,
          }}
        >
          Tokens, composants et patterns partagés entre les trois applications de la
          plateforme (Citoyen, Administration, Plateforme). Inspirations : USWDS pour la
          robustesse institutionnelle, DSFR pour la sobriété européenne.
        </p>
      </header>

      {/* Couleurs */}
      <div
        style={{
          display: "grid",
          gridTemplateColumns: "1fr 1fr",
          gap: 16,
        }}
      >
        <DSPalette
          title="Bleu institutionnel"
          swatches={[
            { name: "primary-50", value: "#eff6fb" },
            { name: "primary-100", value: "#d9e8f6" },
            { name: "primary-300", value: "#73b3e7" },
            { name: "primary-400", value: "#2378c3" },
            { name: "primary-500", value: "#1a4480" },
            { name: "primary-600", value: "#162e51" },
          ]}
        />
        <DSPalette
          title="Sémantique"
          swatches={[
            { name: "success", value: "#2e8540" },
            { name: "warning", value: "#b88600" },
            { name: "danger", value: "#b50909" },
            { name: "info", value: "#1a4480" },
            { name: "ink-900", value: "#0e1a2b" },
            { name: "ink-100", value: "#f3f5f9" },
          ]}
        />
      </div>

      <DSPalette
        title="Statuts archivistiques"
        swatches={[
          { name: "Actif", value: "#1a4480" },
          { name: "Semi-actif", value: "#4a5876" },
          { name: "Inactif", value: "#6b7a96" },
          { name: "Archivé déf.", value: "#2e8540" },
          { name: "Destruction prévue", value: "#b88600" },
          { name: "Erreur intégrité", value: "#b50909" },
        ]}
      />

      <DSType />

      <DSGrid title="Boutons" cols="repeat(auto-fill, minmax(220px, 1fr))">
        <DSItem name="Primary">
          <Button>Soumettre</Button>
        </DSItem>
        <DSItem name="Secondary">
          <Button variant="secondary">Annuler</Button>
        </DSItem>
        <DSItem name="Outline">
          <Button variant="outline" icon="filter">
            Filtrer
          </Button>
        </DSItem>
        <DSItem name="Ghost">
          <Button variant="ghost" icon="moreH">
            Plus
          </Button>
        </DSItem>
        <DSItem name="Danger">
          <Button variant="danger" icon="trash">
            Supprimer
          </Button>
        </DSItem>
        <DSItem name="Success">
          <Button variant="success" icon="check">
            Valider
          </Button>
        </DSItem>
        <DSItem name="Sizes">
          <div style={{ display: "flex", gap: 8, alignItems: "center" }}>
            <Button size="sm">SM</Button>
            <Button>MD</Button>
            <Button size="lg">LG</Button>
          </div>
        </DSItem>
        <DSItem name="With icon">
          <Button icon="upload" iconRight="arrowRight">
            Déposer
          </Button>
        </DSItem>
      </DSGrid>

      <DSGrid title="Badges & statuts" cols="repeat(auto-fill, minmax(180px, 1fr))">
        <DSItem name="Active">
          <Badge tone="active" dot>
            Actif
          </Badge>
        </DSItem>
        <DSItem name="Semi-active">
          <Badge tone="semi" dot>
            Semi-actif
          </Badge>
        </DSItem>
        <DSItem name="Inactive">
          <Badge tone="inactive" dot>
            Inactif
          </Badge>
        </DSItem>
        <DSItem name="Archivé">
          <Badge tone="archived" dot>
            Archivé déf.
          </Badge>
        </DSItem>
        <DSItem name="Destruction">
          <Badge tone="destruct" dot>
            DUA expirée
          </Badge>
        </DSItem>
        <DSItem name="Erreur">
          <Badge tone="danger" dot>
            Intégrité KO
          </Badge>
        </DSItem>
        <DSItem name="Success icon">
          <Badge tone="success" icon="check">
            Validé
          </Badge>
        </DSItem>
        <DSItem name="Warning">
          <Badge tone="warning" icon="alertTriangle">
            À vérifier
          </Badge>
        </DSItem>
      </DSGrid>

      <DSGrid title="Champs de formulaire" cols="repeat(auto-fill, minmax(280px, 1fr))">
        <Field
          label="Nom du document"
          required
          hint="Tel qu'il apparaîtra dans le récépissé."
        >
          <TextInput placeholder="Acte de naissance" />
        </Field>
        <Field label="Recherche">
          <TextInput icon="search" placeholder="Rechercher dans le fonds…" />
        </Field>
        <Field label="Type de document" required>
          <Select defaultValue="">
            <option value="" disabled>
              Sélectionner…
            </option>
            <option>Acte d&apos;état civil</option>
            <option>Document d&apos;identité</option>
          </Select>
        </Field>
        <Field label="Mot de passe" error="Au moins 12 caractères.">
          <TextInput type="password" defaultValue="abc" />
        </Field>
      </DSGrid>

      <DSGrid title="Choix" cols="1fr 1fr">
        <DSItem name="Radio">
          <div
            style={{
              display: "flex",
              flexDirection: "column",
              gap: 8,
              width: "100%",
            }}
          >
            <Radio
              id="r1"
              name="r"
              checked
              label="Stockage mutualisé Digitalium"
              hint="Recommandé · prêt à l'emploi"
            />
            <Radio
              id="r2"
              name="r"
              label="Stockage propre à l'organisme"
              hint="MinIO, S3, R2, GCS, Azure"
            />
          </div>
        </DSItem>
        <DSItem name="Checkbox + toggle">
          <div style={{ display: "flex", flexDirection: "column", gap: 12 }}>
            <Checkbox checked label="Je certifie l'authenticité du document" />
            <Checkbox label="Recevoir une copie par e-mail" />
            <Toggle checked label="Mode contraste élevé" />
          </div>
        </DSItem>
      </DSGrid>

      <DSGrid title="Alertes" cols="1fr 1fr">
        <Alert tone="info" title="Délai de communicabilité">
          Ce document est soumis à un délai de 50 ans. Vous pouvez demander une
          dérogation.
        </Alert>
        <Alert tone="success" title="Versement validé">
          L&apos;archiviste a validé votre versement le 14 mars 2026.
        </Alert>
        <Alert tone="warning" title="DUA expirée">
          5 pièces sont éligibles à élimination.
        </Alert>
        <Alert tone="danger" title="Fichier refusé">
          Le scan antivirus a détecté une menace dans le fichier{" "}
          <strong>contrat.pdf</strong>.
        </Alert>
      </DSGrid>

      <Card>
        <SectionHeading title="Stepper de versement" level={3} />
        <Stepper
          steps={["Type", "Téléversement", "Métadonnées", "Confirmation"]}
          current={2}
        />
      </Card>

      <Card>
        <SectionHeading
          title="Pipeline d'ingestion (7 étapes)"
          subtitle="Étapes verticales avec icône, statut, durée et log lisible."
          level={3}
        />
        <div style={{ paddingTop: 4 }}>
          <PipelineStep
            name="Soumis"
            status="done"
            duration="14:02:11"
            log="Bordereau VRS-2026-0142 reçu, 4 pièces (2,3 Mo)."
          />
          <PipelineStep
            name="Antivirus (ClamAV)"
            status="done"
            duration="3 s"
            log="Aucune menace détectée."
          />
          <PipelineStep
            name="Empreinte SHA-256"
            status="done"
            duration="1 s"
            log="Hashes calculés et chaînés."
          />
          <PipelineStep
            name="Conversion PDF/A-3"
            status="active"
            duration="en cours…"
            log="Pièce 3/4 — naissance-marie.pdf"
          />
          <PipelineStep name="Indexation full-text" status="pending" />
          <PipelineStep name="Horodatage qualifié" status="pending" />
          <PipelineStep name="Scellement & rangement" status="pending" />
        </div>
      </Card>

      <Card padded={false}>
        <div style={{ padding: 24, paddingBottom: 0 }}>
          <SectionHeading title="Bandeau de valeur probante" level={3} />
        </div>
        <div style={{ padding: 24, paddingTop: 8 }}>
          <ProbatoryBanner
            hash="8a3c2e91b7d4f206c5a8e02f84d09fa7c1e7ac63bb5092311d4e6f48a72b8e5d"
            timestamp="14 mars 2026 · 14h02 · TSA Gabon"
            signature="Archives Nationales du Gabon (qualifié eIDAS)"
          />
        </div>
      </Card>

      <DSGrid title="Statistiques" cols="repeat(auto-fill, minmax(220px, 1fr))">
        <StatCard
          label="Documents archivés"
          value="2 184 312"
          delta="+1.4 %"
          deltaTone="success"
          hint="vs mois dernier"
        />
        <StatCard
          label="Versements en attente"
          value="142"
          delta="+12"
          deltaTone="warning"
          hint="à traiter"
        />
        <StatCard label="Volume archivé" value="48,2 To" hint="profil mutualisé" />
        <StatCard
          accent
          label="Validation à faire"
          value="23"
          hint="archiviste · cette semaine"
          icon="inbox"
        />
      </DSGrid>

      <Card>
        <SectionHeading title="Tableau dense" level={3} />
        <Table>
          <thead>
            <tr>
              <Th sortable>Référence</Th>
              <Th sortable>Producteur</Th>
              <Th>Pièces</Th>
              <Th>Statut</Th>
              <Th>Soumis</Th>
              <Th align="right">Actions</Th>
            </tr>
          </thead>
          <tbody>
            <Tr>
              <Td>
                <span
                  style={{
                    fontFamily: "var(--font-mono)",
                    fontSize: 12,
                  }}
                >
                  VRS-2026-0142
                </span>
              </Td>
              <Td>Mairie de Libreville · État civil</Td>
              <Td>4</Td>
              <Td>
                <Badge tone="warning" dot>
                  En validation
                </Badge>
              </Td>
              <Td>14 mars 2026</Td>
              <Td align="right">
                <Button size="sm" variant="ghost" icon="eye">
                  Examiner
                </Button>
              </Td>
            </Tr>
            <Tr>
              <Td>
                <span
                  style={{
                    fontFamily: "var(--font-mono)",
                    fontSize: 12,
                  }}
                >
                  VRS-2026-0141
                </span>
              </Td>
              <Td>Min. de l&apos;Intérieur · DGAJ</Td>
              <Td>12</Td>
              <Td>
                <Badge tone="success" dot>
                  Validé
                </Badge>
              </Td>
              <Td>13 mars 2026</Td>
              <Td align="right">
                <Button size="sm" variant="ghost" icon="eye">
                  Voir
                </Button>
              </Td>
            </Tr>
            <Tr>
              <Td>
                <span
                  style={{
                    fontFamily: "var(--font-mono)",
                    fontSize: 12,
                  }}
                >
                  VRS-2026-0140
                </span>
              </Td>
              <Td>Mairie de Port-Gentil</Td>
              <Td>2</Td>
              <Td>
                <Badge tone="danger" dot>
                  Rejeté
                </Badge>
              </Td>
              <Td>12 mars 2026</Td>
              <Td align="right">
                <Button size="sm" variant="ghost" icon="refresh">
                  Corriger
                </Button>
              </Td>
            </Tr>
          </tbody>
        </Table>
      </Card>

      <DSGrid title="Tabs & Progression" cols="1fr 1fr">
        <DSItem name="Tabs (segmented)">
          <Tabs
            tabs={[
              { id: "a", label: "Rapport" },
              { id: "b", label: "Réponses" },
              { id: "c", label: "Audit" },
            ]}
            current="a"
          />
        </DSItem>
        <DSItem name="Tabs (underline)">
          <Tabs
            variant="line"
            tabs={[
              { id: "a", label: "Rapport" },
              { id: "b", label: "Réponses" },
            ]}
            current="a"
          />
        </DSItem>
        <DSItem name="Progress primary">
          <div style={{ width: "100%" }}>
            <Progress value={73} label="73 %" />
          </div>
        </DSItem>
        <DSItem name="Progress success">
          <div style={{ width: "100%" }}>
            <Progress value={100} tone="success" label="Terminé" />
          </div>
        </DSItem>
      </DSGrid>

      <Card>
        <SectionHeading title="Avatars & utilisateurs" level={3} />
        <div
          style={{
            display: "flex",
            gap: 12,
            alignItems: "center",
            flexWrap: "wrap",
          }}
        >
          <Avatar name="Marie Obame" tone="primary" size={36} />
          <Avatar name="Jean Mbadinga" tone="green" size={36} />
          <Avatar name="Sandrine Koumba" tone="purple" size={36} />
          <Avatar name="Patrice Aubame" tone="amber" size={36} />
          <Avatar name="Estelle N." tone="cyan" size={36} />
          <span style={{ fontSize: 13, color: "var(--ink-600)" }}>Stack ↓</span>
          <div style={{ display: "flex" }}>
            {(
              [
                ["MO", "primary"],
                ["JM", "green"],
                ["SK", "purple"],
                ["PA", "amber"],
              ] as const
            ).map(([n, tone], i) => (
              <span
                key={n}
                style={{
                  marginLeft: i ? -8 : 0,
                  border: "2px solid white",
                  borderRadius: "50%",
                  display: "inline-flex",
                }}
              >
                <Avatar name={n} tone={tone} size={28} />
              </span>
            ))}
            <span
              style={{
                marginLeft: -8,
                border: "2px solid white",
                background: "var(--ink-100)",
                color: "var(--ink-700)",
                width: 28,
                height: 28,
                borderRadius: "50%",
                display: "inline-flex",
                alignItems: "center",
                justifyContent: "center",
                fontSize: 11,
                fontWeight: 700,
              }}
            >
              +12
            </span>
          </div>
        </div>
      </Card>
    </div>
  )
}
