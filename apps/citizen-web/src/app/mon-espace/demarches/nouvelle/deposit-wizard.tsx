"use client"

import Link from "next/link"
import {
  useCallback,
  useEffect,
  useMemo,
  useRef,
  useState,
  useTransition,
} from "react"
import {
  Alert,
  Badge,
  Button,
  Card,
  Checkbox,
  Field,
  Icon,
  Progress,
  Radio,
  SectionHeading,
  Stepper,
  TextInput,
} from "@workspace/ui"
import {
  attachPieceAction,
  getUploadUrlAction,
  removePieceAction,
  saveDraftAction,
  submitDepositAction,
} from "./actions"

/* ============================================================
   Types
   ============================================================ */

interface ServiceProp {
  id: string
  slug: string
  title: string
  category: string
  organism: string
  delayHours: number
  fee: string
  feeFcfa: number
  deliveryMode: string
  whoCanApply: string
  legalReferences: string[]
}

interface VariantProp {
  id: string
  key: string
  label: string
  description: string
  whoCanApply: string
  isDefault: boolean
  feeOverride: string | null
  feeFcfaOverride: number | null
  delayHoursOverride: number | null
}

interface RequirementProp {
  id: string
  label: string
  description: string
  required: boolean
  acceptedDocTypes: string[]
  autofillSource: string
  variantOverrides: Array<{
    variantId: string
    required: boolean
    acceptedDocTypes?: string[]
  }>
}

type AutofillValues = Record<string, string>

interface InitialDraft {
  currentStep: number
  serviceVariantId: string | null
  payload: Record<string, unknown> | null
  updatedAt: number
}

interface DepositWizardProps {
  service: ServiceProp
  variants: VariantProp[]
  requirements: RequirementProp[]
  autofillValues: AutofillValues
  initialDraft: InitialDraft | null
}

/** État interne d'une pièce dans le wizard (avant ou après upload). */
interface PieceState {
  requirementId: string
  label: string
  required: boolean
  acceptedDocTypes: string[]
  /** Si uploaded : id Convex de la pièce orpheline. */
  pieceId?: string
  /** Local file metadata (pour affichage avant ack serveur). */
  filename?: string
  sizeBytes?: number
  status: "idle" | "uploading" | "uploaded" | "error"
  error?: string
  /** Progress 0-100 pendant l'upload. */
  progress?: number
}

/* ============================================================
   Composant principal
   ============================================================ */

const AUTOSAVE_DEBOUNCE_MS = 2000

export function DepositWizard({
  service,
  variants,
  requirements,
  autofillValues,
  initialDraft,
}: DepositWizardProps) {
  const stepsLabels = useMemo(
    () => ["Variante", "Informations", "Pièces justificatives", "Vérification"],
    [],
  )

  // Source de vérité : payload structuré (sauvegardé en brouillon)
  const defaultPayload = useMemo(
    () => buildDefaultPayload(autofillValues, variants),
    [autofillValues, variants],
  )

  const initialMerged: WizardPayload = useMemo(() => {
    if (initialDraft?.payload) {
      return { ...defaultPayload, ...(initialDraft.payload as WizardPayload) }
    }
    return defaultPayload
  }, [defaultPayload, initialDraft])

  const [step, setStep] = useState(initialDraft?.currentStep ?? 0)
  const [payload, setPayload] = useState<WizardPayload>(initialMerged)
  const [variantKey, setVariantKey] = useState<string | undefined>(() => {
    if (initialDraft?.serviceVariantId) {
      return variants.find((v) => v.id === initialDraft.serviceVariantId)?.key
    }
    return variants.find((v) => v.isDefault)?.key ?? variants[0]?.key
  })
  const [pieces, setPieces] = useState<PieceState[]>(() =>
    initialPiecesFromRequirements(requirements, variants, variantKey),
  )
  const [honor, setHonor] = useState(false)
  const [rgpd, setRgpd] = useState(false)

  const [submitting, startSubmit] = useTransition()
  const [submitError, setSubmitError] = useState<string | null>(null)
  const [autosaveStatus, setAutosaveStatus] = useState<
    "idle" | "saving" | "saved"
  >(initialDraft ? "saved" : "idle")

  // ============= Autosave debounced =============
  const autosaveTimer = useRef<ReturnType<typeof setTimeout> | null>(null)
  const triggerAutosave = useCallback(() => {
    if (autosaveTimer.current) clearTimeout(autosaveTimer.current)
    setAutosaveStatus("saving")
    autosaveTimer.current = setTimeout(async () => {
      const variant = variants.find((v) => v.key === variantKey)
      const res = await saveDraftAction({
        serviceId: service.id,
        serviceVariantId: variant?.id,
        currentStep: step,
        payload: payload as Record<string, unknown>,
      })
      setAutosaveStatus(res.ok ? "saved" : "idle")
    }, AUTOSAVE_DEBOUNCE_MS)
  }, [service.id, variants, variantKey, step, payload])

  useEffect(() => {
    triggerAutosave()
    return () => {
      if (autosaveTimer.current) clearTimeout(autosaveTimer.current)
    }
  }, [triggerAutosave])

  // ============= Mise à jour pièces si la variante change =============
  useEffect(() => {
    setPieces((current) => {
      const next = initialPiecesFromRequirements(
        requirements,
        variants,
        variantKey,
      )
      // Conserve les pieces déjà uploadées (dérive `required`/`acceptedDocTypes`
      // depuis la nouvelle résolution, mais garde l'état d'upload).
      return next.map((nextPiece) => {
        const existing = current.find(
          (p) => p.requirementId === nextPiece.requirementId,
        )
        if (existing?.pieceId) {
          return {
            ...existing,
            required: nextPiece.required,
            acceptedDocTypes: nextPiece.acceptedDocTypes,
          }
        }
        return nextPiece
      })
    })
  }, [requirements, variants, variantKey])

  // ============= Helpers UI =============

  const updatePayload = useCallback((patch: Partial<WizardPayload>) => {
    setPayload((p) => ({ ...p, ...patch }))
  }, [])

  const selectedVariant = variants.find((v) => v.key === variantKey)

  // ============= Upload pièce =============

  const handleUpload = async (requirementId: string, file: File) => {
    setPieces((prev) =>
      prev.map((p) =>
        p.requirementId === requirementId
          ? {
              ...p,
              status: "uploading",
              filename: file.name,
              sizeBytes: file.size,
              progress: 0,
              error: undefined,
            }
          : p,
      ),
    )

    const urlRes = await getUploadUrlAction()
    if (!urlRes.ok || !urlRes.url) {
      markPieceError(requirementId, urlRes.message ?? "URL d'upload indisponible.")
      return
    }

    try {
      // POST vers Convex storage avec progress (via XHR pour avoir le progress)
      const storageId = await uploadWithProgress(urlRes.url, file, (pct) => {
        setPieces((prev) =>
          prev.map((p) =>
            p.requirementId === requirementId ? { ...p, progress: pct } : p,
          ),
        )
      })

      const requirement = requirements.find((r) => r.id === requirementId)
      const attachRes = await attachPieceAction({
        storageId,
        label: requirement?.label ?? "Pièce",
        filename: file.name,
        mimeType: file.type,
        sizeBytes: file.size,
        required: requirement?.required ?? false,
        requirementId,
      })

      if (!attachRes.ok || !attachRes.pieceId) {
        markPieceError(requirementId, attachRes.message ?? "Échec du rattachement.")
        return
      }

      setPieces((prev) =>
        prev.map((p) =>
          p.requirementId === requirementId
            ? {
                ...p,
                status: "uploaded",
                pieceId: attachRes.pieceId,
                progress: 100,
              }
            : p,
        ),
      )
    } catch (e) {
      const msg = e instanceof Error ? e.message : "Erreur d'upload."
      markPieceError(requirementId, msg)
    }
  }

  const markPieceError = (requirementId: string, message: string) => {
    setPieces((prev) =>
      prev.map((p) =>
        p.requirementId === requirementId
          ? { ...p, status: "error", error: message }
          : p,
      ),
    )
  }

  const handleRemove = async (requirementId: string) => {
    const piece = pieces.find((p) => p.requirementId === requirementId)
    if (!piece?.pieceId) {
      setPieces((prev) =>
        prev.map((p) =>
          p.requirementId === requirementId
            ? {
                requirementId,
                label: p.label,
                required: p.required,
                acceptedDocTypes: p.acceptedDocTypes,
                status: "idle",
              }
            : p,
        ),
      )
      return
    }
    const res = await removePieceAction(piece.pieceId)
    if (!res.ok) {
      markPieceError(requirementId, res.message ?? "Échec de la suppression.")
      return
    }
    setPieces((prev) =>
      prev.map((p) =>
        p.requirementId === requirementId
          ? {
              requirementId,
              label: p.label,
              required: p.required,
              acceptedDocTypes: p.acceptedDocTypes,
              status: "idle",
            }
          : p,
      ),
    )
  }

  // ============= Submit final =============

  const canSubmit = useMemo(() => {
    if (!honor || !rgpd) return false
    const missingRequired = pieces.some(
      (p) => p.required && p.status !== "uploaded",
    )
    if (missingRequired) return false
    if (!payload.recipientEmail) return false
    return true
  }, [honor, rgpd, pieces, payload.recipientEmail])

  const handleSubmit = () => {
    setSubmitError(null)
    startSubmit(async () => {
      const variant = variants.find((v) => v.key === variantKey)
      const attached = pieces
        .filter((p) => p.pieceId)
        .map((p) => p.pieceId!) as string[]

      const result = await submitDepositAction({
        serviceSlug: service.slug,
        variantKey: variant?.key,
        numberOfCopies: payload.numberOfCopies,
        recipientEmail: payload.recipientEmail,
        beneficiaryKind: payload.beneficiary,
        urgent: payload.urgent,
        urgentReason: payload.urgentReason,
        payload: {
          ...payload,
        },
        attachedPieceIds: attached,
        honor,
        rgpd,
      })
      if (!result.ok) {
        setSubmitError(result.message ?? "Impossible de déposer la demande.")
      }
      // Sinon la server action redirige
    })
  }

  const selectedVariantTitle = selectedVariant?.label ?? service.title

  return (
    <div
      style={{ display: "flex", flexDirection: "column", flex: 1, minHeight: 0 }}
    >
      {/* En-tête */}
      <div
        style={{
          padding: "20px 32px",
          background: "var(--ink-50)",
          borderBottom: "1px solid var(--ink-200)",
        }}
      >
        <nav
          aria-label="Fil d'Ariane"
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
          <Icon name="chevronRight" size={12} aria-hidden="true" />
          <span>Nouveau dépôt</span>
          <Icon name="chevronRight" size={12} aria-hidden="true" />
          <span style={{ color: "var(--ink-900)", fontWeight: 600 }}>
            {service.title}
          </span>
        </nav>
        <div
          style={{
            display: "flex",
            alignItems: "center",
            justifyContent: "space-between",
            gap: 16,
          }}
        >
          <h1 style={{ fontSize: 22, margin: 0 }}>
            {service.title}
            {selectedVariant ? ` · ${selectedVariantTitle.toLowerCase()}` : ""}
          </h1>
          <AutosaveBadge status={autosaveStatus} />
        </div>
      </div>

      <div
        style={{
          padding: "20px 32px 12px",
          background: "white",
          borderBottom: "1px solid var(--ink-200)",
        }}
      >
        <Stepper steps={stepsLabels} current={step} />
      </div>

      <main
        style={{
          flex: 1,
          padding: "28px 32px",
          background: "var(--ink-100)",
          overflowY: "auto",
        }}
      >
        <div style={{ maxWidth: 920, margin: "0 auto" }}>
          {step === 0 && (
            <Step1Variant
              variants={variants}
              variantKey={variantKey}
              setVariantKey={setVariantKey}
              numberOfCopies={payload.numberOfCopies ?? 1}
              setNumberOfCopies={(n) =>
                updatePayload({ numberOfCopies: n })
              }
            />
          )}
          {step === 1 && (
            <Step2Info
              autofillValues={autofillValues}
              payload={payload}
              updatePayload={updatePayload}
            />
          )}
          {step === 2 && (
            <Step3Pieces
              pieces={pieces}
              onUpload={handleUpload}
              onRemove={handleRemove}
            />
          )}
          {step === 3 && (
            <Step4Review
              service={service}
              selectedVariant={selectedVariant}
              payload={payload}
              pieces={pieces}
              autofillValues={autofillValues}
              honor={honor}
              setHonor={setHonor}
              rgpd={rgpd}
              setRgpd={setRgpd}
              error={submitError}
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
          disabled={step === 0 || submitting}
        >
          Précédent
        </Button>
        <span style={{ fontSize: 12, color: "var(--ink-500)" }}>
          Étape {step + 1}/{stepsLabels.length}
        </span>
        {step < stepsLabels.length - 1 ? (
          <Button
            iconRight="arrowRight"
            onClick={() => setStep(Math.min(stepsLabels.length - 1, step + 1))}
          >
            Suivant
          </Button>
        ) : (
          <Button
            icon="shieldCheck"
            variant="success"
            onClick={handleSubmit}
            disabled={submitting || !canSubmit}
          >
            {submitting ? "Dépôt en cours…" : "Déposer ma demande"}
          </Button>
        )}
      </footer>
    </div>
  )
}

/* ============================================================
   Helpers d'init
   ============================================================ */

interface WizardPayload {
  numberOfCopies?: number
  recipientEmail?: string
  beneficiary?: "self" | "third_party"
  urgent?: boolean
  urgentReason?: string
  additionalNotes?: string
}

function buildDefaultPayload(
  autofill: AutofillValues,
  _variants: VariantProp[],
): WizardPayload {
  return {
    numberOfCopies: 1,
    recipientEmail: autofill.email || undefined,
    beneficiary: "self",
    urgent: false,
  }
}

function initialPiecesFromRequirements(
  requirements: RequirementProp[],
  variants: VariantProp[],
  variantKey: string | undefined,
): PieceState[] {
  // Map key → id pour résoudre les overrides (qui sont keyés par variantId)
  const selectedVariantId = variants.find((v) => v.key === variantKey)?.id
  return requirements.map((r) => {
    // Si on a une variante sélectionnée, on cherche un override qui la cible.
    // Quand il existe, il remplace `required` et (optionnellement)
    // `acceptedDocTypes` pour cette pièce dans le contexte de cette variante.
    const override = selectedVariantId
      ? r.variantOverrides.find((o) => o.variantId === selectedVariantId)
      : undefined
    return {
      requirementId: r.id,
      label: r.label,
      required: override?.required ?? r.required,
      acceptedDocTypes: override?.acceptedDocTypes ?? r.acceptedDocTypes,
      status: "idle",
    }
  })
}

/* ============================================================
   Upload XHR avec progress
   ============================================================ */

function uploadWithProgress(
  url: string,
  file: File,
  onProgress: (pct: number) => void,
): Promise<string> {
  return new Promise((resolve, reject) => {
    const xhr = new XMLHttpRequest()
    xhr.open("POST", url)
    xhr.setRequestHeader("Content-Type", file.type)
    xhr.upload.addEventListener("progress", (event) => {
      if (event.lengthComputable) {
        onProgress(Math.round((event.loaded / event.total) * 100))
      }
    })
    xhr.onload = () => {
      if (xhr.status >= 200 && xhr.status < 300) {
        try {
          const body = JSON.parse(xhr.responseText) as { storageId: string }
          resolve(body.storageId)
        } catch {
          reject(new Error("Réponse storage invalide."))
        }
      } else {
        reject(new Error(`Upload échoué (${xhr.status}).`))
      }
    }
    xhr.onerror = () => reject(new Error("Erreur réseau pendant l'upload."))
    xhr.send(file)
  })
}

/* ============================================================
   AutosaveBadge
   ============================================================ */

function AutosaveBadge({ status }: { status: "idle" | "saving" | "saved" }) {
  if (status === "saving") {
    return (
      <Badge tone="primary" size="sm">
        Sauvegarde…
      </Badge>
    )
  }
  if (status === "saved") {
    return (
      <Badge tone="success" size="sm" dot>
        Brouillon enregistré
      </Badge>
    )
  }
  return (
    <Badge tone="neutral" size="sm">
      Brouillon
    </Badge>
  )
}

/* ============================================================
   Étapes
   ============================================================ */

function Step1Variant({
  variants,
  variantKey,
  setVariantKey,
  numberOfCopies,
  setNumberOfCopies,
}: {
  variants: VariantProp[]
  variantKey: string | undefined
  setVariantKey: (k: string) => void
  numberOfCopies: number
  setNumberOfCopies: (n: number) => void
}) {
  return (
    <Card>
      <SectionHeading
        title="1. Quelle variante ?"
        subtitle={
          variants.length > 1
            ? "Sélectionnez l'option adaptée à votre besoin."
            : "Une seule variante disponible pour cette démarche."
        }
        level={3}
      />
      {variants.length === 1 ? (
        <p style={{ fontSize: 13, color: "var(--ink-600)" }}>
          {variants[0].label}
          {variants[0].description && ` — ${variants[0].description}`}
        </p>
      ) : (
        <div
          style={{ display: "flex", flexDirection: "column", gap: 10 }}
          role="radiogroup"
          aria-label="Variante de la démarche"
        >
          {variants.map((v) => (
            <Radio
              key={v.key}
              id={`variant-${v.key}`}
              name="variant"
              checked={variantKey === v.key}
              onChange={() => setVariantKey(v.key)}
              label={
                <span
                  style={{
                    display: "inline-flex",
                    alignItems: "center",
                    gap: 8,
                  }}
                >
                  {v.label}
                  {v.isDefault && (
                    <Badge tone="primary" size="sm">
                      Recommandé
                    </Badge>
                  )}
                  {v.feeOverride && (
                    <Badge tone="warning" size="sm">
                      {v.feeOverride}
                    </Badge>
                  )}
                </span>
              }
              hint={
                <span>
                  {v.description}
                  {v.whoCanApply && (
                    <span
                      style={{
                        display: "block",
                        marginTop: 4,
                        fontStyle: "italic",
                      }}
                    >
                      Qui peut le demander : {v.whoCanApply}
                    </span>
                  )}
                </span>
              }
            />
          ))}
        </div>
      )}

      <div style={{ marginTop: 24 }}>
        <SectionHeading
          title="Nombre de copies"
          subtitle="Maximum 5 copies par dépôt."
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
              type="button"
              aria-label="Diminuer le nombre de copies"
              onClick={() => setNumberOfCopies(Math.max(1, numberOfCopies - 1))}
              style={stepperBtnStyle}
            >
              −
            </button>
            <span
              aria-live="polite"
              style={{ padding: "0 16px", fontWeight: 700, fontSize: 16 }}
            >
              {numberOfCopies}
            </span>
            <button
              type="button"
              aria-label="Augmenter le nombre de copies"
              onClick={() => setNumberOfCopies(Math.min(5, numberOfCopies + 1))}
              style={{ ...stepperBtnStyle, borderLeft: "1px solid var(--ink-200)" }}
            >
              +
            </button>
          </div>
          <span style={{ fontSize: 13, color: "var(--ink-600)" }}>
            Gratuit pour le citoyen (sous réserve des frais du service).
          </span>
        </div>
      </div>
    </Card>
  )
}

const stepperBtnStyle = {
  width: 36,
  height: 38,
  border: "none",
  background: "white",
  cursor: "pointer",
  fontSize: 16,
} as const

function Step2Info({
  autofillValues,
  payload,
  updatePayload,
}: {
  autofillValues: AutofillValues
  payload: WizardPayload
  updatePayload: (p: Partial<WizardPayload>) => void
}) {
  return (
    <Card>
      <SectionHeading
        title="2. Vos informations"
        subtitle="Les champs grisés sont remplis depuis votre identité numérique."
        level={3}
      />
      <Alert tone="info" style={{ marginBottom: 20 }}>
        <b>Pré-remplissage actif.</b> Les informations vérifiées par votre NIP
        sont automatiquement renseignées et ne peuvent pas être modifiées ici.
      </Alert>
      <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: 16 }}>
        <Field label="Nom de famille" required>
          <TextInput
            defaultValue={autofillValues.nom || "—"}
            readOnly
            style={readonlyStyle}
          />
        </Field>
        <Field label="Prénoms" required>
          <TextInput
            defaultValue={autofillValues.prenoms || "—"}
            readOnly
            style={readonlyStyle}
          />
        </Field>
        <Field label="Date de naissance">
          <TextInput
            defaultValue={autofillValues.date_naissance || "—"}
            readOnly
            style={readonlyStyle}
          />
        </Field>
        <Field label="Lieu de naissance">
          <TextInput
            defaultValue={autofillValues.lieu_naissance || "—"}
            readOnly
            style={readonlyStyle}
          />
        </Field>
        <Field label="NIP" required>
          <TextInput
            defaultValue={autofillValues.nip || "—"}
            icon="fingerprint"
            readOnly
            style={readonlyStyle}
          />
        </Field>
        <Field
          label="Adresse e-mail de notification"
          required
          hint="Vous y recevrez le récépissé et l'acte signé."
        >
          <TextInput
            type="email"
            value={payload.recipientEmail ?? ""}
            onChange={(e) => updatePayload({ recipientEmail: e.target.value })}
            placeholder="vous@exemple.com"
          />
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
        <Checkbox
          id="beneficiary-self"
          checked={payload.beneficiary === "self"}
          onChange={() => updatePayload({ beneficiary: "self" })}
          label="Je demande l'acte pour moi-même."
        />
        <div style={{ height: 8 }} />
        <Checkbox
          id="beneficiary-third"
          checked={payload.beneficiary === "third_party"}
          onChange={() => updatePayload({ beneficiary: "third_party" })}
          label="Je demande l'acte pour un tiers (mandat requis en pièce justificative)."
        />
      </div>

      <div style={{ marginTop: 16 }}>
        <Checkbox
          id="urgent"
          checked={payload.urgent ?? false}
          onChange={() => updatePayload({ urgent: !payload.urgent })}
          label={
            <span>
              Marquer la demande comme <b>urgente</b> (motif obligatoire).
            </span>
          }
        />
        {payload.urgent && (
          <div style={{ marginTop: 8 }}>
            <Field
              label="Motif de l'urgence"
              required
              hint="Justifiez brièvement pourquoi votre demande doit être traitée en priorité."
            >
              <TextInput
                value={payload.urgentReason ?? ""}
                onChange={(e) =>
                  updatePayload({ urgentReason: e.target.value })
                }
              />
            </Field>
          </div>
        )}
      </div>
    </Card>
  )
}

const readonlyStyle = {
  background: "var(--ink-50)",
  color: "var(--ink-600)",
}

function Step3Pieces({
  pieces,
  onUpload,
  onRemove,
}: {
  pieces: PieceState[]
  onUpload: (requirementId: string, file: File) => void | Promise<void>
  onRemove: (requirementId: string) => void | Promise<void>
}) {
  if (pieces.length === 0) {
    return (
      <Card>
        <p style={{ fontSize: 14, color: "var(--ink-600)" }}>
          Aucune pièce justificative n'est requise pour cette démarche.
        </p>
      </Card>
    )
  }

  const requiredCount = pieces.filter((p) => p.required).length
  const optionalCount = pieces.length - requiredCount

  return (
    <Card>
      <SectionHeading
        title="3. Pièces justificatives"
        subtitle={`${requiredCount} pièce${requiredCount > 1 ? "s" : ""} requise${requiredCount > 1 ? "s" : ""}, ${optionalCount} facultative${optionalCount > 1 ? "s" : ""}. Glissez-déposez vos fichiers (PDF, JPEG, PNG, max 10 Mo).`}
        level={3}
      />
      <div style={{ display: "flex", flexDirection: "column", gap: 12 }}>
        {pieces.map((piece) => (
          <PieceRow
            key={piece.requirementId}
            piece={piece}
            onUpload={onUpload}
            onRemove={onRemove}
          />
        ))}
      </div>
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
          aria-hidden="true"
        />
        <b>Vos fichiers sont chiffrés.</b> Ils sont stockés au Gabon et seuls
        l'administration concernée et vous-même y avez accès.
      </div>
    </Card>
  )
}

function PieceRow({
  piece,
  onUpload,
  onRemove,
}: {
  piece: PieceState
  onUpload: (requirementId: string, file: File) => void | Promise<void>
  onRemove: (requirementId: string) => void | Promise<void>
}) {
  const inputId = `piece-${piece.requirementId}`
  const acceptStr = piece.acceptedDocTypes
    .map(() => ".pdf,.jpg,.jpeg,.png")
    .filter((v, i, a) => a.indexOf(v) === i)
    .join(",")

  const isUploaded = piece.status === "uploaded"
  const isUploading = piece.status === "uploading"
  const isError = piece.status === "error"

  return (
    <div
      style={{
        border: "1px solid",
        borderColor: isUploaded
          ? "#9bcfa6"
          : isError
            ? "var(--danger-500)"
            : "var(--ink-200)",
        borderRadius: 8,
        padding: 16,
        background: isUploaded
          ? "var(--success-50)"
          : isError
            ? "var(--danger-50)"
            : "white",
      }}
    >
      <div style={{ display: "flex", alignItems: "center", gap: 12 }}>
        <span
          style={{
            width: 36,
            height: 36,
            borderRadius: 6,
            flexShrink: 0,
            background: isUploaded
              ? "var(--success-500)"
              : isUploading
                ? "var(--primary-50)"
                : "var(--ink-100)",
            color: isUploaded
              ? "white"
              : isUploading
                ? "var(--primary-500)"
                : "var(--ink-500)",
            display: "inline-flex",
            alignItems: "center",
            justifyContent: "center",
          }}
          aria-hidden="true"
        >
          <Icon
            name={isUploaded ? "check" : "paperclip"}
            size={16}
            stroke={2.25}
          />
        </span>
        <div style={{ flex: 1 }}>
          <label
            htmlFor={inputId}
            style={{ fontSize: 14, fontWeight: 600, cursor: "pointer" }}
          >
            {piece.label}
            {piece.required && (
              <span
                style={{ color: "var(--danger-500)", marginLeft: 4 }}
                aria-label="obligatoire"
              >
                *
              </span>
            )}
          </label>
          <div style={{ fontSize: 12, color: "var(--ink-600)", marginTop: 2 }}>
            Types acceptés :{" "}
            {piece.acceptedDocTypes
              .map((d) => DOC_TYPE_LABELS[d] ?? d)
              .join(", ")}
          </div>
        </div>
        {isUploaded && (
          <div style={{ display: "flex", alignItems: "center", gap: 8 }}>
            <span style={{ fontSize: 12, color: "var(--ink-700)" }}>
              {piece.filename}
            </span>
            <span style={{ fontSize: 11, color: "var(--ink-500)" }}>
              {formatSize(piece.sizeBytes ?? 0)}
            </span>
            <Button
              variant="ghost"
              size="sm"
              icon="trash"
              onClick={() => onRemove(piece.requirementId)}
              aria-label={`Supprimer ${piece.label}`}
              style={{ color: "var(--danger-500)" }}
            >
              {""}
            </Button>
          </div>
        )}
        {(piece.status === "idle" || isError) && (
          <>
            <input
              id={inputId}
              type="file"
              accept={acceptStr}
              hidden
              onChange={(e) => {
                const f = e.target.files?.[0]
                if (f) onUpload(piece.requirementId, f)
                // Reset pour permettre re-upload du même fichier
                e.target.value = ""
              }}
            />
            <Button
              variant="secondary"
              icon="upload"
              size="sm"
              onClick={() => document.getElementById(inputId)?.click()}
            >
              {isError ? "Réessayer" : "Téléverser"}
            </Button>
          </>
        )}
        {isUploading && (
          <span
            style={{
              fontSize: 12,
              color: "var(--primary-600)",
              fontWeight: 600,
            }}
          >
            Envoi en cours…
          </span>
        )}
      </div>
      {isUploading && piece.progress !== undefined && (
        <div style={{ marginTop: 10 }}>
          <Progress value={piece.progress} label={`${piece.progress} %`} />
        </div>
      )}
      {isError && piece.error && (
        <div
          role="alert"
          style={{
            marginTop: 10,
            fontSize: 12,
            color: "var(--danger-700)",
          }}
        >
          {piece.error}
        </div>
      )}
    </div>
  )
}

const DOC_TYPE_LABELS: Record<string, string> = {
  cni: "CNI",
  passeport: "Passeport",
  permis_conduire: "Permis",
  livret_famille: "Livret de famille",
  acte_naissance: "Acte de naissance",
  acte_mariage: "Acte de mariage",
  acte_deces: "Acte de décès",
  certificat_residence: "Certificat de résidence",
  justif_domicile: "Justificatif de domicile",
  mandat: "Mandat",
  attestation: "Attestation",
  photo_identite: "Photo d'identité",
  autre: "Autre",
}

function formatSize(bytes: number): string {
  if (bytes < 1024) return `${bytes} o`
  if (bytes < 1024 * 1024) return `${(bytes / 1024).toFixed(0)} Ko`
  return `${(bytes / (1024 * 1024)).toFixed(1)} Mo`
}

function Step4Review({
  service,
  selectedVariant,
  payload,
  pieces,
  autofillValues,
  honor,
  setHonor,
  rgpd,
  setRgpd,
  error,
}: {
  service: ServiceProp
  selectedVariant: VariantProp | undefined
  payload: WizardPayload
  pieces: PieceState[]
  autofillValues: AutofillValues
  honor: boolean
  setHonor: (b: boolean) => void
  rgpd: boolean
  setRgpd: (b: boolean) => void
  error: string | null
}) {
  const uploadedPieces = pieces.filter((p) => p.status === "uploaded")
  const missingRequired = pieces.filter(
    (p) => p.required && p.status !== "uploaded",
  )

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
          {[
            ["Service", service.title],
            ["Organisme", service.organism],
            ["Variante", selectedVariant?.label ?? "—"],
            ["Nombre de copies", String(payload.numberOfCopies ?? 1)],
            ["Demandeur", `${autofillValues.prenoms} ${autofillValues.nom}`],
            ["NIP", autofillValues.nip],
            [
              "Bénéficiaire",
              payload.beneficiary === "third_party" ? "Tiers (mandat)" : "Moi-même",
            ],
            ["Adresse de notification", payload.recipientEmail ?? "—"],
            ["Urgence", payload.urgent ? "Oui" : "Non"],
            ...(payload.urgent && payload.urgentReason
              ? ([["Motif urgence", payload.urgentReason]] as [
                  string,
                  string,
                ][])
              : ([] as [string, string][])),
          ].map(([k, v]) => (
            <div
              key={k}
              style={{
                display: "grid",
                gridTemplateColumns: "180px 1fr",
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
            Pièces jointes ({uploadedPieces.length})
          </div>
          {uploadedPieces.length === 0 ? (
            <p style={{ fontSize: 13, color: "var(--ink-600)" }}>
              Aucune pièce n'a été téléversée.
            </p>
          ) : (
            <div style={{ display: "flex", gap: 8, flexWrap: "wrap" }}>
              {uploadedPieces.map((p) => (
                <Badge
                  key={p.requirementId}
                  tone="archived"
                  dot
                  icon="paperclip"
                >
                  {p.filename} · {formatSize(p.sizeBytes ?? 0)}
                </Badge>
              ))}
            </div>
          )}

          {missingRequired.length > 0 && (
            <Alert tone="warning" style={{ marginTop: 12 }}>
              <b>{missingRequired.length} pièce(s) requise(s) manquante(s) :</b>{" "}
              {missingRequired.map((p) => p.label).join(", ")}
            </Alert>
          )}
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
          id="honor"
          checked={honor}
          onChange={() => setHonor(!honor)}
          label={
            <>
              <b>Je certifie sur l'honneur</b> l'exactitude des informations
              fournies. Toute fausse déclaration expose à des sanctions (art. 412
              du Code pénal gabonais).
            </>
          }
        />
        <div style={{ height: 10 }} />
        <Checkbox
          id="rgpd"
          checked={rgpd}
          onChange={() => setRgpd(!rgpd)}
          label={
            <>
              J'accepte le{" "}
              <Link href="/cgu" target="_blank">
                traitement de mes données
              </Link>{" "}
              conformément à la loi 001/2011 sur la protection des données
              personnelles.
            </>
          }
        />
      </div>

      {error && (
        <Alert tone="danger" style={{ marginTop: 14 }}>
          {error}
        </Alert>
      )}
    </>
  )
}
