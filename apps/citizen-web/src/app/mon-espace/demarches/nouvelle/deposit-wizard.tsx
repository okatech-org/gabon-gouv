"use client"

import { useState } from "react"
import {
  Alert,
  AppHeader,
  Badge,
  Button,
  Card,
  Checkbox,
  Field,
  Frame,
  Icon,
  Progress,
  Radio,
  SectionHeading,
  Stepper,
  TextInput,
} from "@workspace/ui"
import type { CitizenProfile } from "@workspace/mocks/types"

interface DepositWizardProps {
  initialStep?: number
  citizen: CitizenProfile
}

export function DepositWizard({ initialStep = 0, citizen }: DepositWizardProps) {
  const [step, setStep] = useState(initialStep)
  const steps = ["Service", "Informations", "Pièces justificatives", "Vérification"]

  return (
    <Frame width={1440} height={900}>
      <AppHeader user={citizen.name} role="Citoyenne" />
      <div
        style={{
          padding: "20px 32px",
          background: "var(--ink-50)",
          borderBottom: "1px solid var(--ink-200)",
        }}
      >
        <nav
          style={{
            display: "flex",
            alignItems: "center",
            gap: 6,
            fontSize: 13,
            color: "var(--ink-600)",
            marginBottom: 8,
          }}
        >
          <a href="#">Mes démarches</a>
          <Icon name="chevronRight" size={12} />
          <a href="#">Nouveau dépôt</a>
          <Icon name="chevronRight" size={12} />
          <span style={{ color: "var(--ink-900)", fontWeight: 600 }}>
            Acte de naissance
          </span>
        </nav>
        <div
          style={{
            display: "flex",
            alignItems: "center",
            justifyContent: "space-between",
          }}
        >
          <h1 style={{ fontSize: 22 }}>
            Demande d&apos;acte de naissance · copie intégrale
          </h1>
          <Badge tone="primary" size="sm">
            Brouillon · sauvegardé automatiquement
          </Badge>
        </div>
      </div>

      <div
        style={{
          padding: "20px 32px 12px",
          background: "white",
          borderBottom: "1px solid var(--ink-200)",
        }}
      >
        <Stepper steps={steps} current={step} />
      </div>

      <main
        style={{
          padding: "28px 32px",
          background: "var(--ink-100)",
          minHeight: 540,
        }}
      >
        <div style={{ maxWidth: 920, margin: "0 auto" }}>
          {step === 0 && <DepositStep1 />}
          {step === 1 && <DepositStep2 citizen={citizen} />}
          {step === 2 && <DepositStep3 />}
          {step === 3 && <DepositStep4 citizen={citizen} />}
        </div>
      </main>

      <footer
        style={{
          borderTop: "1px solid var(--ink-200)",
          padding: "16px 32px",
          background: "white",
          display: "flex",
          alignItems: "center",
          justifyContent: "space-between",
        }}
      >
        <Button
          variant="ghost"
          icon="arrowLeft"
          onClick={() => setStep(Math.max(0, step - 1))}
          disabled={step === 0}
        >
          Précédent
        </Button>
        <span style={{ fontSize: 12, color: "var(--ink-500)" }}>Étape {step + 1}/4</span>
        {step < 3 ? (
          <Button
            iconRight="arrowRight"
            onClick={() => setStep(Math.min(3, step + 1))}
          >
            Suivant
          </Button>
        ) : (
          <Button icon="shieldCheck" variant="success">
            Déposer ma demande
          </Button>
        )}
      </footer>
    </Frame>
  )
}

function DepositStep1() {
  return (
    <Card>
      <SectionHeading
        title="1. Quel type d'acte ?"
        subtitle="Sélectionnez la variante adaptée à votre besoin."
        level={3}
      />
      <div style={{ display: "flex", flexDirection: "column", gap: 10 }}>
        <Radio
          checked
          label="Copie intégrale"
          hint="Reproduit l'intégralité de l'acte avec toutes les mentions marginales. Recommandée pour les démarches officielles."
          name="type"
          id="t1"
        />
        <Radio
          checked={false}
          label="Extrait avec filiation"
          hint="Mentionne les noms des parents. Suffisant pour la plupart des démarches (mariage, nationalité…)."
          name="type"
          id="t2"
        />
        <Radio
          checked={false}
          label="Extrait sans filiation"
          hint="Sans mention des parents. Demande possible par toute personne."
          name="type"
          id="t3"
        />
      </div>
      <div style={{ marginTop: 24 }}>
        <SectionHeading
          title="Nombre de copies"
          subtitle="Pour quel usage ?"
          level={3}
        />
        <div style={{ display: "flex", alignItems: "center", gap: 16 }}>
          <div
            style={{
              display: "flex",
              alignItems: "center",
              border: "1px solid var(--ink-300)",
              borderRadius: 6,
              overflow: "hidden",
            }}
          >
            <button
              style={{
                width: 36,
                height: 38,
                border: "none",
                background: "white",
                cursor: "pointer",
              }}
            >
              −
            </button>
            <span style={{ padding: "0 16px", fontWeight: 700, fontSize: 16 }}>2</span>
            <button
              style={{
                width: 36,
                height: 38,
                border: "none",
                background: "white",
                cursor: "pointer",
                borderLeft: "1px solid var(--ink-200)",
              }}
            >
              +
            </button>
          </div>
          <span style={{ fontSize: 13, color: "var(--ink-600)" }}>
            Max. 5 copies par demande · gratuit pour le citoyen
          </span>
        </div>
      </div>
    </Card>
  )
}

function DepositStep2({ citizen }: { citizen: CitizenProfile }) {
  const readOnlyStyle = { background: "var(--ink-50)", color: "var(--ink-600)" } as const
  const [lastName, ...rest] = citizen.name.split(" ")
  const firstNames = rest.join(" ") || "Marie Estelle"
  return (
    <Card>
      <SectionHeading
        title="2. Vos informations"
        subtitle="Les champs grisés sont remplis depuis votre identité numérique."
        level={3}
      />
      <Alert tone="info" style={{ marginBottom: 20 }}>
        <b>Pré-remplissage actif.</b> Les informations vérifiées par votre NIP sont
        automatiquement renseignées et ne peuvent pas être modifiées ici.
      </Alert>
      <div
        style={{
          display: "grid",
          gridTemplateColumns: "1fr 1fr",
          gap: 16,
        }}
      >
        <Field label="Nom de famille" required>
          <TextInput defaultValue={lastName} style={readOnlyStyle} readOnly />
        </Field>
        <Field label="Prénoms" required>
          <TextInput defaultValue={firstNames} style={readOnlyStyle} readOnly />
        </Field>
        <Field label="Date de naissance" required>
          <TextInput
            defaultValue={citizen.birthDate ?? ""}
            style={readOnlyStyle}
            readOnly
          />
        </Field>
        <Field label="Lieu de naissance" required>
          <TextInput
            defaultValue="Libreville, Estuaire"
            style={readOnlyStyle}
            readOnly
          />
        </Field>
        <Field label="NIP" required>
          <TextInput
            defaultValue={citizen.nip}
            icon="fingerprint"
            style={readOnlyStyle}
            readOnly
          />
        </Field>
        <Field
          label="Adresse e-mail de notification"
          required
          hint="Vous y recevrez le récépissé et l'acte signé."
        >
          <TextInput defaultValue={citizen.email} />
        </Field>
      </div>
      <div
        style={{
          marginTop: 20,
          padding: 16,
          background: "var(--ink-50)",
          borderRadius: 8,
        }}
      >
        <Checkbox checked label="Je demande l'acte pour moi-même." id="self" />
        <div style={{ height: 8 }} />
        <Checkbox
          checked={false}
          label="Je demande l'acte pour un tiers (joindre mandat à l'étape suivante)."
          id="proxy"
        />
      </div>
    </Card>
  )
}

interface PieceMock {
  title: string
  description: string
  required: boolean
  status: "uploaded" | "uploading" | "idle"
  file?: string
  size?: string
}

function DepositStep3() {
  const pieces: PieceMock[] = [
    {
      title: "Pièce d'identité du demandeur",
      description: "CNI ou passeport en cours de validité.",
      required: true,
      status: "uploaded",
      file: "CNI_obame.pdf",
      size: "1,2 Mo",
    },
    {
      title: "Justificatif de filiation",
      description: "Livret de famille ou acte des parents.",
      required: true,
      status: "uploading",
    },
    {
      title: "Mandat signé (si demande pour un tiers)",
      description: "Modèle disponible en téléchargement.",
      required: false,
      status: "idle",
    },
  ]
  return (
    <Card>
      <SectionHeading
        title="3. Pièces justificatives"
        subtitle="2 pièces requises, 1 facultative. Glissez-déposez vos fichiers."
        level={3}
      />
      {pieces.map((p, i) => (
        <div
          key={p.title}
          style={{
            marginTop: i === 0 ? 16 : 12,
            border: "1px solid var(--ink-200)",
            borderRadius: 8,
            padding: 16,
            background:
              p.status === "uploaded" ? "var(--success-50)" : "white",
            borderColor:
              p.status === "uploaded" ? "#9bcfa6" : "var(--ink-200)",
          }}
        >
          <div style={{ display: "flex", alignItems: "center", gap: 12 }}>
            <span
              style={{
                width: 36,
                height: 36,
                borderRadius: 6,
                flexShrink: 0,
                background:
                  p.status === "uploaded"
                    ? "var(--success-500)"
                    : p.status === "uploading"
                      ? "var(--primary-50)"
                      : "var(--ink-100)",
                color:
                  p.status === "uploaded"
                    ? "white"
                    : p.status === "uploading"
                      ? "var(--primary-500)"
                      : "var(--ink-500)",
                display: "inline-flex",
                alignItems: "center",
                justifyContent: "center",
              }}
            >
              <Icon
                name={p.status === "uploaded" ? "check" : "paperclip"}
                size={16}
                stroke={2.25}
              />
            </span>
            <div style={{ flex: 1 }}>
              <div style={{ fontSize: 14, fontWeight: 600 }}>
                {p.title}
                {p.required && (
                  <span style={{ color: "var(--danger-500)", marginLeft: 4 }}>*</span>
                )}
              </div>
              <div style={{ fontSize: 13, color: "var(--ink-600)" }}>
                {p.description}
              </div>
            </div>
            {p.status === "uploaded" && (
              <div style={{ display: "flex", alignItems: "center", gap: 8 }}>
                <span style={{ fontSize: 12, color: "var(--ink-700)" }}>{p.file}</span>
                <span style={{ fontSize: 11, color: "var(--ink-500)" }}>{p.size}</span>
                <Button
                  variant="ghost"
                  size="sm"
                  icon="trash"
                  style={{ color: "var(--danger-500)" }}
                >
                  {""}
                </Button>
              </div>
            )}
            {p.status === "idle" && (
              <Button variant="secondary" icon="upload" size="sm">
                Téléverser
              </Button>
            )}
            {p.status === "uploading" && (
              <span
                style={{
                  fontSize: 12,
                  color: "var(--primary-600)",
                  fontWeight: 600,
                }}
              >
                Analyse en cours…
              </span>
            )}
          </div>
          {p.status === "uploading" && (
            <div style={{ marginTop: 10 }}>
              <Progress value={62} label="62 %" />
            </div>
          )}
        </div>
      ))}
      <div
        style={{
          marginTop: 18,
          padding: 14,
          background: "var(--info-50)",
          border: "1px solid var(--primary-200)",
          borderRadius: 8,
          fontSize: 13,
          color: "var(--ink-700)",
        }}
      >
        <Icon
          name="cpu"
          size={14}
          style={{
            verticalAlign: "middle",
            marginRight: 6,
            color: "var(--primary-500)",
          }}
        />
        <b>Détection automatique.</b> L&apos;IA vérifie la lisibilité et le type de chaque
        document. Aucune pièce n&apos;est transmise à un tiers.
      </div>
    </Card>
  )
}

function DepositStep4({ citizen }: { citizen: CitizenProfile }) {
  const [lastName, ...rest] = citizen.name.split(" ")
  const firstNames = rest.join(" ") || "Marie Estelle"
  const summary: [string, string][] = [
    ["Type d'acte", "Copie intégrale"],
    ["Nombre de copies", "2"],
    ["Demandeur", `${firstNames} ${lastName}`],
    ["NIP", citizen.nip],
    ["Date de naissance", `${citizen.birthDate ?? ""} · Libreville`],
    ["Adresse de notification", citizen.email],
  ]
  return (
    <>
      <Card>
        <SectionHeading
          title="4. Vérification"
          subtitle="Relisez avant de transmettre. Une fois déposée, votre demande sera scellée et horodatée."
          level={3}
        />
        <div
          style={{
            display: "grid",
            gridTemplateColumns: "1fr 1fr",
            gap: 16,
            fontSize: 13.5,
          }}
        >
          {summary.map(([k, v]) => (
            <div
              key={k}
              style={{
                display: "grid",
                gridTemplateColumns: "170px 1fr",
                alignItems: "baseline",
                padding: "8px 0",
                borderBottom: "1px solid var(--ink-150)",
              }}
            >
              <span style={{ color: "var(--ink-600)" }}>{k}</span>
              <span style={{ fontWeight: 600 }}>{v}</span>
            </div>
          ))}
        </div>
        <div style={{ marginTop: 18 }}>
          <div
            style={{
              fontSize: 12,
              fontWeight: 700,
              color: "var(--ink-500)",
              textTransform: "uppercase",
              letterSpacing: "0.06em",
              marginBottom: 8,
            }}
          >
            Pièces jointes (2)
          </div>
          <div style={{ display: "flex", gap: 8 }}>
            {["CNI_obame.pdf · 1,2 Mo", "livret_famille.pdf · 2,8 Mo"].map((f) => (
              <Badge key={f} tone="archived" dot icon="paperclip">
                {f}
              </Badge>
            ))}
          </div>
        </div>
      </Card>
      <div
        style={{
          marginTop: 14,
          padding: 18,
          background: "white",
          border: "1px solid var(--ink-200)",
          borderRadius: 8,
        }}
      >
        <Checkbox
          checked
          label={
            <>
              <b>Je certifie sur l&apos;honneur</b> l&apos;exactitude des informations
              fournies. Toute fausse déclaration expose à des sanctions (art. 412 du code
              pénal).
            </>
          }
          id="honor"
        />
        <div style={{ height: 10 }} />
        <Checkbox
          checked
          label={
            <>
              J&apos;accepte le <a href="#">traitement de mes données</a> conformément à la
              loi 001/2011 sur la protection des données personnelles.
            </>
          }
          id="rgpd"
        />
      </div>
    </>
  )
}
