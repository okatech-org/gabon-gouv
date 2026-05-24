"use client"

import Link from "next/link"
import { useState, useTransition } from "react"
import {
  Alert,
  Badge,
  Button,
  Card,
  Checkbox,
  Field,
  Icon,
  Radio,
  SectionHeading,
  Stepper,
  TextInput,
} from "@workspace/ui"
import { submitDepositAction } from "./actions"

interface ServiceProp {
  slug: string
  title: string
  category: string
  org: string
  variants: Array<{
    key: string
    title: string
    description: string
    who: string
    isDefault: boolean
  }>
  pieces: Array<{
    title: string
    description: string
    required: boolean
    auto: boolean
  }>
}

interface CitizenProp {
  name: string
  email: string
  nip: string
  phone: string
  address: string
  birthDate: string
}

interface DepositWizardProps {
  service: ServiceProp
  citizen: CitizenProp
}

export function DepositWizard({ service, citizen }: DepositWizardProps) {
  const [step, setStep] = useState(0)
  const steps = ["Service", "Informations", "Pièces justificatives", "Vérification"]

  // État du formulaire — minimal pour la 1ère itération (les uploads de
  // pièces sont cosmétiques tant que le storage n'est pas branché).
  const defaultVariant =
    service.variants.find((v) => v.isDefault)?.key ?? service.variants[0]?.key
  const [variantKey, setVariantKey] = useState<string | undefined>(defaultVariant)
  const [copies, setCopies] = useState(1)
  const [email, setEmail] = useState(citizen.email)
  const [beneficiary, setBeneficiary] = useState<"self" | "third_party">("self")
  const [honor, setHonor] = useState(false)
  const [rgpd, setRgpd] = useState(false)

  const [pending, startTransition] = useTransition()
  const [error, setError] = useState<string | null>(null)

  const handleSubmit = () => {
    setError(null)
    startTransition(async () => {
      const result = await submitDepositAction({
        serviceSlug: service.slug,
        variantKey,
        numberOfCopies: copies,
        recipientEmail: email,
        beneficiaryKind: beneficiary,
        honor,
        rgpd,
      })
      if (!result.ok) {
        setError(result.message ?? "Impossible de déposer la demande.")
      }
      // En cas de succès, le server action redirige — pas besoin de gérer ici.
    })
  }

  const selectedVariantTitle =
    service.variants.find((v) => v.key === variantKey)?.title ?? "—"

  return (
    <div style={{ display: "flex", flexDirection: "column", flex: 1, minHeight: 0 }}>
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
          <Link href="/mon-espace">Mes démarches</Link>
          <Icon name="chevronRight" size={12} />
          <span>Nouveau dépôt</span>
          <Icon name="chevronRight" size={12} />
          <span style={{ color: "var(--ink-900)", fontWeight: 600 }}>{service.title}</span>
        </nav>
        <div
          style={{
            display: "flex",
            alignItems: "center",
            justifyContent: "space-between",
          }}
        >
          <h1 style={{ fontSize: 22 }}>
            {service.title}
            {variantKey ? ` · ${selectedVariantTitle.toLowerCase()}` : ""}
          </h1>
          <Badge tone="primary" size="sm">
            Brouillon
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
          flex: 1,
          padding: "28px 32px",
          background: "var(--ink-100)",
        }}
      >
        <div style={{ maxWidth: 920, margin: "0 auto" }}>
          {step === 0 && (
            <Step1
              variants={service.variants}
              variantKey={variantKey}
              setVariantKey={setVariantKey}
              copies={copies}
              setCopies={setCopies}
            />
          )}
          {step === 1 && (
            <Step2
              citizen={citizen}
              email={email}
              setEmail={setEmail}
              beneficiary={beneficiary}
              setBeneficiary={setBeneficiary}
            />
          )}
          {step === 2 && <Step3 pieces={service.pieces} />}
          {step === 3 && (
            <Step4
              service={service}
              citizen={citizen}
              variantTitle={selectedVariantTitle}
              copies={copies}
              email={email}
              beneficiary={beneficiary}
              honor={honor}
              setHonor={setHonor}
              rgpd={rgpd}
              setRgpd={setRgpd}
              error={error}
            />
          )}
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
          disabled={step === 0 || pending}
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
          <Button
            icon="shieldCheck"
            variant="success"
            onClick={handleSubmit}
            disabled={pending || !honor || !rgpd}
          >
            {pending ? "Dépôt en cours…" : "Déposer ma demande"}
          </Button>
        )}
      </footer>
    </div>
  )
}

function Step1({
  variants,
  variantKey,
  setVariantKey,
  copies,
  setCopies,
}: {
  variants: ServiceProp["variants"]
  variantKey: string | undefined
  setVariantKey: (k: string) => void
  copies: number
  setCopies: (n: number) => void
}) {
  return (
    <Card>
      <SectionHeading
        title="1. Quel type d'acte ?"
        subtitle="Sélectionnez la variante adaptée à votre besoin."
        level={3}
      />
      <div style={{ display: "flex", flexDirection: "column", gap: 10 }}>
        {variants.length === 0 && (
          <Alert tone="info">Aucune variante définie pour ce service.</Alert>
        )}
        {variants.map((v) => (
          <Radio
            key={v.key}
            checked={variantKey === v.key}
            label={v.title}
            hint={v.description}
            name="variant"
            id={`v-${v.key}`}
            onChange={() => setVariantKey(v.key)}
          />
        ))}
      </div>
      <div style={{ marginTop: 24 }}>
        <SectionHeading title="Nombre de copies" subtitle="Pour quel usage ?" level={3} />
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
              type="button"
              onClick={() => setCopies(Math.max(1, copies - 1))}
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
            <span style={{ padding: "0 16px", fontWeight: 700, fontSize: 16 }}>
              {copies}
            </span>
            <button
              type="button"
              onClick={() => setCopies(Math.min(5, copies + 1))}
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
            Max. 5 copies par demande
          </span>
        </div>
      </div>
    </Card>
  )
}

function Step2({
  citizen,
  email,
  setEmail,
  beneficiary,
  setBeneficiary,
}: {
  citizen: CitizenProp
  email: string
  setEmail: (s: string) => void
  beneficiary: "self" | "third_party"
  setBeneficiary: (b: "self" | "third_party") => void
}) {
  const readOnlyStyle = { background: "var(--ink-50)", color: "var(--ink-600)" } as const
  const [lastName, ...rest] = citizen.name.split(" ")
  const firstNames = rest.join(" ") || ""
  return (
    <Card>
      <SectionHeading
        title="2. Vos informations"
        subtitle="Les champs grisés sont remplis depuis votre identité numérique."
        level={3}
      />
      <Alert tone="info" style={{ marginBottom: 20 }}>
        <b>Pré-remplissage actif.</b> Les informations vérifiées par votre identité numérique
        sont automatiquement renseignées.
      </Alert>
      <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: 16 }}>
        <Field label="Nom de famille" required>
          <TextInput defaultValue={lastName} style={readOnlyStyle} readOnly />
        </Field>
        <Field label="Prénoms" required>
          <TextInput defaultValue={firstNames} style={readOnlyStyle} readOnly />
        </Field>
        <Field label="Date de naissance">
          <TextInput defaultValue={citizen.birthDate} style={readOnlyStyle} readOnly />
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
          <TextInput value={email} onChange={(e) => setEmail(e.target.value)} />
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
        <Radio
          checked={beneficiary === "self"}
          label="Je demande l'acte pour moi-même."
          name="beneficiary"
          id="b-self"
          onChange={() => setBeneficiary("self")}
        />
        <div style={{ height: 8 }} />
        <Radio
          checked={beneficiary === "third_party"}
          label="Je demande l'acte pour un tiers (joindre mandat à l'étape suivante)."
          name="beneficiary"
          id="b-third"
          onChange={() => setBeneficiary("third_party")}
        />
      </div>
    </Card>
  )
}

function Step3({ pieces }: { pieces: ServiceProp["pieces"] }) {
  return (
    <Card>
      <SectionHeading
        title="3. Pièces justificatives"
        subtitle={`${pieces.filter((p) => p.required).length} requise${pieces.filter((p) => p.required).length > 1 ? "s" : ""}, ${pieces.filter((p) => !p.required).length} facultative${pieces.filter((p) => !p.required).length > 1 ? "s" : ""}. Téléversement à venir.`}
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
            background: p.auto ? "var(--success-50)" : "white",
            borderColor: p.auto ? "#9bcfa6" : "var(--ink-200)",
          }}
        >
          <div style={{ display: "flex", alignItems: "center", gap: 12 }}>
            <span
              style={{
                width: 36,
                height: 36,
                borderRadius: 6,
                flexShrink: 0,
                background: p.auto ? "var(--success-500)" : "var(--ink-100)",
                color: p.auto ? "white" : "var(--ink-500)",
                display: "inline-flex",
                alignItems: "center",
                justifyContent: "center",
              }}
            >
              <Icon
                name={p.auto ? "check" : "paperclip"}
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
              <div style={{ fontSize: 13, color: "var(--ink-600)" }}>{p.description}</div>
            </div>
            {p.auto ? (
              <Badge tone="archived" size="sm" dot>
                Pré-rempli
              </Badge>
            ) : (
              <Button variant="secondary" icon="upload" size="sm" disabled>
                Téléverser
              </Button>
            )}
          </div>
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
          style={{ verticalAlign: "middle", marginRight: 6, color: "var(--primary-500)" }}
        />
        <b>Téléversement à venir.</b> Le stockage Convex sera branché dans la prochaine
        itération. Vous pouvez déposer sans pièces pour tester le flow.
      </div>
    </Card>
  )
}

function Step4({
  service,
  citizen,
  variantTitle,
  copies,
  email,
  beneficiary,
  honor,
  setHonor,
  rgpd,
  setRgpd,
  error,
}: {
  service: ServiceProp
  citizen: CitizenProp
  variantTitle: string
  copies: number
  email: string
  beneficiary: "self" | "third_party"
  honor: boolean
  setHonor: (b: boolean) => void
  rgpd: boolean
  setRgpd: (b: boolean) => void
  error: string | null
}) {
  const summary: [string, string][] = [
    ["Service", service.title],
    ["Variante", variantTitle],
    ["Nombre de copies", String(copies)],
    ["Demandeur", citizen.name],
    ["NIP", citizen.nip],
    ["Date de naissance", citizen.birthDate || "—"],
    ["Pour", beneficiary === "self" ? "Moi-même" : "Un tiers"],
    ["E-mail de notification", email],
    ["Administration", service.org],
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
          checked={honor}
          onChange={setHonor}
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
          checked={rgpd}
          onChange={setRgpd}
          label={
            <>
              J&apos;accepte le <a href="#">traitement de mes données</a> conformément à la
              loi 001/2011 sur la protection des données personnelles.
            </>
          }
          id="rgpd"
        />
      </div>
      {error && (
        <div style={{ marginTop: 14 }}>
          <Alert tone="danger" title="Dépôt impossible">
            {error}
          </Alert>
        </div>
      )}
    </>
  )
}
