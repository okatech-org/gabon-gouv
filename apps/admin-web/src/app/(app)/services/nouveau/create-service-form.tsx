"use client"

import { useState, useTransition } from "react"
import Link from "next/link"
import { Button } from "@workspace/ui"
import { createServiceAction } from "../actions"

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
  {
    value: "online",
    label: "100% en ligne",
    hint: "Le citoyen reçoit le document numériquement signé.",
  },
  {
    value: "hybrid",
    label: "Hybride",
    hint: "Démarche en ligne avec retrait ou venue physique.",
  },
  {
    value: "in_person",
    label: "Sur place",
    hint: "Démarche entièrement physique au guichet.",
  },
] as const

export function CreateServiceForm() {
  const [pending, startTransition] = useTransition()
  const [error, setError] = useState<string | null>(null)

  const onSubmit = (formData: FormData) => {
    setError(null)
    startTransition(async () => {
      const result = await createServiceAction(formData)
      // Si tout passe, redirect() se déclenche dans l'action — on n'arrive
      // ici qu'en cas d'erreur.
      if (!result.ok) {
        setError(result.message ?? "Erreur lors de la création.")
      }
    })
  }

  return (
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
    >
      {/* Titre */}
      <div>
        <label
          htmlFor="title"
          style={{
            display: "block",
            fontSize: 13,
            fontWeight: 600,
            marginBottom: 6,
          }}
        >
          Titre du service{" "}
          <span style={{ color: "var(--danger-500)" }}>*</span>
        </label>
        <input
          id="title"
          name="title"
          type="text"
          required
          minLength={3}
          maxLength={120}
          autoFocus
          placeholder="Ex. Acte de naissance"
          style={{
            width: "100%",
            padding: "10px 12px",
            fontSize: 14,
            border: "1px solid var(--ink-300)",
            borderRadius: 6,
          }}
          aria-describedby="title-hint"
        />
        <p
          id="title-hint"
          style={{
            fontSize: 12,
            color: "var(--ink-500)",
            marginTop: 4,
          }}
        >
          Apparaîtra tel quel dans le catalogue citoyen.
        </p>
      </div>

      {/* Catégorie */}
      <div>
        <label
          htmlFor="categorySlug"
          style={{
            display: "block",
            fontSize: 13,
            fontWeight: 600,
            marginBottom: 6,
          }}
        >
          Catégorie <span style={{ color: "var(--danger-500)" }}>*</span>
        </label>
        <select
          id="categorySlug"
          name="categorySlug"
          required
          defaultValue=""
          style={{
            width: "100%",
            padding: "10px 12px",
            fontSize: 14,
            border: "1px solid var(--ink-300)",
            borderRadius: 6,
            background: "white",
          }}
        >
          <option value="" disabled>
            — Choisir une catégorie —
          </option>
          {CATEGORIES.map((c) => (
            <option key={c.slug} value={c.slug}>
              {c.label}
            </option>
          ))}
        </select>
      </div>

      {/* Description courte */}
      <div>
        <label
          htmlFor="description"
          style={{
            display: "block",
            fontSize: 13,
            fontWeight: 600,
            marginBottom: 6,
          }}
        >
          Description courte
        </label>
        <textarea
          id="description"
          name="description"
          rows={3}
          maxLength={500}
          placeholder="Ex. L'acte de naissance est délivré par votre commune…"
          style={{
            width: "100%",
            padding: "10px 12px",
            fontSize: 14,
            border: "1px solid var(--ink-300)",
            borderRadius: 6,
            fontFamily: "inherit",
            resize: "vertical",
          }}
          aria-describedby="description-hint"
        />
        <p
          id="description-hint"
          style={{
            fontSize: 12,
            color: "var(--ink-500)",
            marginTop: 4,
          }}
        >
          1 à 3 phrases pour décrire le service au citoyen. Modifiable ensuite.
        </p>
      </div>

      {/* Mode de délivrance */}
      <fieldset style={{ border: "none", padding: 0, margin: 0 }}>
        <legend
          style={{ fontSize: 13, fontWeight: 600, marginBottom: 8 }}
        >
          Mode de délivrance
        </legend>
        <div style={{ display: "flex", flexDirection: "column", gap: 8 }}>
          {DELIVERY_MODES.map((m, i) => (
            <label
              key={m.value}
              style={{
                display: "flex",
                gap: 10,
                padding: 12,
                border: "1px solid var(--ink-200)",
                borderRadius: 6,
                cursor: "pointer",
              }}
            >
              <input
                type="radio"
                name="deliveryMode"
                value={m.value}
                defaultChecked={i === 0}
                style={{ marginTop: 2 }}
              />
              <div>
                <div style={{ fontSize: 13.5, fontWeight: 600 }}>{m.label}</div>
                <div style={{ fontSize: 12, color: "var(--ink-600)" }}>
                  {m.hint}
                </div>
              </div>
            </label>
          ))}
        </div>
      </fieldset>

      {/* Frais + délai */}
      <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr 1fr", gap: 12 }}>
        <div>
          <label
            htmlFor="fee"
            style={{
              display: "block",
              fontSize: 13,
              fontWeight: 600,
              marginBottom: 6,
            }}
          >
            Coût affiché
          </label>
          <input
            id="fee"
            name="fee"
            type="text"
            defaultValue="Gratuit"
            maxLength={40}
            style={{
              width: "100%",
              padding: "10px 12px",
              fontSize: 14,
              border: "1px solid var(--ink-300)",
              borderRadius: 6,
            }}
          />
        </div>
        <div>
          <label
            htmlFor="feeFcfa"
            style={{
              display: "block",
              fontSize: 13,
              fontWeight: 600,
              marginBottom: 6,
            }}
          >
            Coût numérique (FCFA)
          </label>
          <input
            id="feeFcfa"
            name="feeFcfa"
            type="number"
            min={0}
            step={100}
            defaultValue={0}
            style={{
              width: "100%",
              padding: "10px 12px",
              fontSize: 14,
              border: "1px solid var(--ink-300)",
              borderRadius: 6,
            }}
          />
        </div>
        <div>
          <label
            htmlFor="delayHours"
            style={{
              display: "block",
              fontSize: 13,
              fontWeight: 600,
              marginBottom: 6,
            }}
          >
            Délai indicatif (heures)
          </label>
          <input
            id="delayHours"
            name="delayHours"
            type="number"
            min={1}
            step={1}
            defaultValue={48}
            style={{
              width: "100%",
              padding: "10px 12px",
              fontSize: 14,
              border: "1px solid var(--ink-300)",
              borderRadius: 6,
            }}
          />
        </div>
      </div>

      {error && (
        <div
          role="alert"
          style={{
            padding: 12,
            background: "var(--danger-50)",
            border: "1px solid var(--danger-500)",
            color: "var(--danger-700)",
            borderRadius: 6,
            fontSize: 13,
          }}
        >
          {error}
        </div>
      )}

      <div
        style={{
          display: "flex",
          gap: 12,
          justifyContent: "flex-end",
          marginTop: 8,
        }}
      >
        <Link href="/services" style={{ textDecoration: "none" }}>
          <Button variant="ghost" type="button">
            Annuler
          </Button>
        </Link>
        <Button type="submit" icon="plus" disabled={pending}>
          {pending ? "Création…" : "Créer le service"}
        </Button>
      </div>
    </form>
  )
}
