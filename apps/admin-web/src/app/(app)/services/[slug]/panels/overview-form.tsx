"use client"

import { useState, useTransition } from "react"
import { useRouter } from "next/navigation"
import { Button, Icon, StatCard } from "@workspace/ui"
import { updateServiceAction } from "../../actions"

const CATEGORIES = [
  { slug: "etat-civil", label: "État civil" },
  { slug: "documentation", label: "Documentation et identité" },
  { slug: "fiscalite", label: "Fiscalité" },
  { slug: "justice", label: "Justice" },
  { slug: "social", label: "Social et famille" },
  { slug: "education", label: "Éducation" },
  { slug: "sante", label: "Santé" },
  { slug: "urbanisme", label: "Urbanisme et habitat" },
] as const

const DELIVERY_MODES = [
  { value: "online", label: "100% en ligne" },
  { value: "hybrid", label: "Hybride" },
  { value: "in_person", label: "Sur place" },
] as const

interface Props {
  slug: string
  initial: {
    title: string
    categorySlug: string
    description: string
    longDescription: string
    whoCanApply: string
    deliveryMode: string
    fee: string
    feeFcfa: number
    delayHours: number
    legalReferences: string[]
  }
  stats: {
    requests30d: number
    satisfaction: number | null
  }
  readOnly?: boolean
}

export function ServiceOverviewForm({
  slug,
  initial,
  stats,
  readOnly,
}: Props) {
  const router = useRouter()
  const [pending, startTransition] = useTransition()
  const [feedback, setFeedback] = useState<
    { kind: "ok" | "err"; message: string } | null
  >(null)

  const onSubmit = (formData: FormData) => {
    setFeedback(null)
    startTransition(async () => {
      const result = await updateServiceAction(slug, formData)
      if (!result.ok) {
        setFeedback({
          kind: "err",
          message: result.message ?? "Échec de la mise à jour.",
        })
      } else {
        setFeedback({
          kind: "ok",
          message: result.message ?? "Modifications enregistrées.",
        })
        router.refresh()
      }
    })
  }

  return (
    <div style={{ display: "flex", flexDirection: "column", gap: 24 }}>
      {/* KPI rapides */}
      <div
        style={{
          display: "grid",
          gridTemplateColumns: "repeat(3, 1fr)",
          gap: 12,
        }}
        role="group"
        aria-label="Statistiques rapides"
      >
        <StatCard
          label="Demandes 30 jours"
          value={String(stats.requests30d)}
          icon="inbox"
        />
        <StatCard
          label="Satisfaction"
          value={
            typeof stats.satisfaction === "number"
              ? `${stats.satisfaction.toFixed(1).replace(".", ",")}/5`
              : "—"
          }
          icon="star"
        />
        <StatCard
          label="Délai annoncé"
          value={formatDelay(initial.delayHours)}
          icon="clock"
        />
      </div>

      <form
        action={onSubmit}
        style={{
          background: "white",
          border: "1px solid var(--ink-200)",
          borderRadius: 12,
          padding: 24,
          display: "flex",
          flexDirection: "column",
          gap: 20,
        }}
        aria-describedby={feedback ? "form-feedback" : undefined}
      >
        <fieldset
          disabled={readOnly}
          style={{
            border: "none",
            padding: 0,
            margin: 0,
            display: "flex",
            flexDirection: "column",
            gap: 20,
          }}
        >
          <legend className="sr-only">
            Configuration métier du service {initial.title}
          </legend>

          {/* Titre + catégorie */}
          <div
            style={{
              display: "grid",
              gridTemplateColumns: "2fr 1fr",
              gap: 16,
            }}
          >
            <FormField label="Titre du service" id="title" required>
              <input
                id="title"
                name="title"
                type="text"
                defaultValue={initial.title}
                required
                minLength={3}
                maxLength={120}
                style={inputStyle}
              />
            </FormField>
            <FormField label="Catégorie" id="categorySlug" required>
              <select
                id="categorySlug"
                name="categorySlug"
                defaultValue={initial.categorySlug}
                required
                style={inputStyle}
              >
                {CATEGORIES.map((c) => (
                  <option key={c.slug} value={c.slug}>
                    {c.label}
                  </option>
                ))}
              </select>
            </FormField>
          </div>

          {/* Description courte */}
          <FormField
            label="Description courte"
            id="description"
            hint="Affichée en sous-titre de la fiche citoyen."
          >
            <textarea
              id="description"
              name="description"
              defaultValue={initial.description}
              rows={3}
              maxLength={500}
              style={{ ...inputStyle, fontFamily: "inherit", resize: "vertical" }}
            />
          </FormField>

          {/* Description longue */}
          <FormField
            label="Description longue"
            id="longDescription"
            hint="Texte enrichi (markdown) pour la fiche détaillée. Facultatif."
          >
            <textarea
              id="longDescription"
              name="longDescription"
              defaultValue={initial.longDescription}
              rows={6}
              maxLength={5000}
              style={{ ...inputStyle, fontFamily: "inherit", resize: "vertical" }}
            />
          </FormField>

          {/* Public éligible */}
          <FormField
            label="Qui peut le demander ?"
            id="whoCanApply"
            hint="Conditions d'éligibilité affichées au citoyen."
          >
            <textarea
              id="whoCanApply"
              name="whoCanApply"
              defaultValue={initial.whoCanApply}
              rows={2}
              maxLength={500}
              style={{ ...inputStyle, fontFamily: "inherit", resize: "vertical" }}
            />
          </FormField>

          {/* Mode + frais + délai */}
          <div
            style={{
              display: "grid",
              gridTemplateColumns: "1fr 1fr 1fr 1fr",
              gap: 12,
            }}
          >
            <FormField label="Mode de délivrance" id="deliveryMode">
              <select
                id="deliveryMode"
                name="deliveryMode"
                defaultValue={initial.deliveryMode}
                style={inputStyle}
              >
                {DELIVERY_MODES.map((m) => (
                  <option key={m.value} value={m.value}>
                    {m.label}
                  </option>
                ))}
              </select>
            </FormField>
            <FormField label="Coût affiché" id="fee">
              <input
                id="fee"
                name="fee"
                type="text"
                defaultValue={initial.fee}
                style={inputStyle}
              />
            </FormField>
            <FormField label="Coût (FCFA)" id="feeFcfa">
              <input
                id="feeFcfa"
                name="feeFcfa"
                type="number"
                min={0}
                step={100}
                defaultValue={initial.feeFcfa}
                style={inputStyle}
              />
            </FormField>
            <FormField label="Délai (heures)" id="delayHours">
              <input
                id="delayHours"
                name="delayHours"
                type="number"
                min={1}
                step={1}
                defaultValue={initial.delayHours}
                style={inputStyle}
              />
            </FormField>
          </div>

          {/* Références légales */}
          <FormField
            label="Références légales"
            id="legalReferences"
            hint="Une référence par ligne. Ex. « Art. 71 du Code civil »."
          >
            <textarea
              id="legalReferences"
              name="legalReferences"
              defaultValue={initial.legalReferences.join("\n")}
              rows={3}
              style={{
                ...inputStyle,
                fontFamily: "var(--font-mono)",
                fontSize: 12,
                resize: "vertical",
              }}
            />
          </FormField>
        </fieldset>

        {feedback && (
          <div
            id="form-feedback"
            role={feedback.kind === "err" ? "alert" : "status"}
            style={{
              padding: 12,
              background:
                feedback.kind === "err"
                  ? "var(--danger-50)"
                  : "var(--success-50)",
              border: `1px solid ${
                feedback.kind === "err"
                  ? "var(--danger-500)"
                  : "var(--success-500)"
              }`,
              color:
                feedback.kind === "err"
                  ? "var(--danger-700)"
                  : "var(--success-700)",
              borderRadius: 6,
              fontSize: 13,
              display: "flex",
              alignItems: "center",
              gap: 8,
            }}
          >
            <Icon
              name={feedback.kind === "err" ? "alertTriangle" : "checkCircle"}
              size={14}
              aria-hidden="true"
            />
            {feedback.message}
          </div>
        )}

        {!readOnly && (
          <div style={{ display: "flex", justifyContent: "flex-end" }}>
            <Button type="submit" icon="save" disabled={pending}>
              {pending ? "Enregistrement…" : "Enregistrer les modifications"}
            </Button>
          </div>
        )}

        {readOnly && (
          <p
            style={{
              fontSize: 13,
              color: "var(--ink-600)",
              padding: 12,
              background: "var(--ink-50)",
              borderRadius: 6,
            }}
          >
            <Icon
              name="lock"
              size={14}
              style={{ verticalAlign: "middle", marginRight: 6 }}
              aria-hidden="true"
            />
            Le service est archivé. Pour le modifier, republiez-le d'abord.
          </p>
        )}
      </form>
    </div>
  )
}

function FormField({
  label,
  id,
  required,
  hint,
  children,
}: {
  label: string
  id: string
  required?: boolean
  hint?: string
  children: React.ReactNode
}) {
  return (
    <div>
      <label
        htmlFor={id}
        style={{
          display: "block",
          fontSize: 13,
          fontWeight: 600,
          marginBottom: 6,
        }}
      >
        {label}
        {required && (
          <span style={{ color: "var(--danger-500)" }} aria-hidden="true">
            {" "}
            *
          </span>
        )}
      </label>
      {children}
      {hint && (
        <p
          style={{
            fontSize: 12,
            color: "var(--ink-500)",
            marginTop: 4,
          }}
        >
          {hint}
        </p>
      )}
    </div>
  )
}

const inputStyle = {
  width: "100%",
  padding: "10px 12px",
  fontSize: 14,
  border: "1px solid var(--ink-300)",
  borderRadius: 6,
  background: "white",
} as const

function formatDelay(hours: number): string {
  if (hours >= 48) {
    const d = Math.floor(hours / 24)
    const h = hours % 24
    return h > 0 ? `${d} j ${h} h` : `${d} j`
  }
  return `${hours} h`
}
