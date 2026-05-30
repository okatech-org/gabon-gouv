"use node"

/**
 * Composant React-PDF générique « acte officiel » + helper de rendu.
 *
 * v1 — un seul layout pour tous les services. Le `payload` est libre.
 * On ajoutera des layouts par service.slug au fil de l'eau.
 *
 * **`"use node"` requis** : `@react-pdf/renderer` charge transitivement
 * `yoga-layout` qui utilise `import.meta` (non supporté en runtime V8
 * Convex). Sans cette directive, le push backend échoue avec
 * "Uncaught TypeError: import.meta unsupported".
 */

import {
  Document,
  type DocumentProps,
  Font,
  Image,
  Page,
  StyleSheet,
  Text,
  View,
  renderToBuffer,
} from "@react-pdf/renderer"
import React from "react"
import QRCode from "qrcode"

/* ============================================================
   Données d'entrée
   ============================================================ */

export interface ActePdfInput {
  /** Numéro d'acte officiel — apparait en tête + en bas du document. */
  actNumber: string
  /** Titre du document (ex. « Acte de naissance · Copie intégrale »). */
  title: string
  /** Nom complet de l'organisme producteur. */
  organismName: string
  /** Catégorie pour affichage en bandeau (ex. « État civil »). */
  category: string
  /** Date d'émission (timestamp ms). */
  issuedAt: number
  /** Code court de vérification (apparaît avec le QR). */
  verificationCode: string
  /** Empreinte SHA-256 du document — apparait en pied de page (court). */
  sha256Short: string
  /** Référence légale (ex. « Décret n° XXX du JJ/MM/AAAA »). */
  legalReference?: string
  /**
   * Données métier de l'acte. Pour v1 on accepte un Record arbitraire
   * et on rend en grille clé/valeur. Les services qui ont besoin d'un
   * layout dédié auront leur propre composant.
   */
  payload: Record<string, unknown>
  /** Nom de l'agent signataire (pour l'apposition en pied de page). */
  signatoryName: string
}

/** Variante interne enrichie du QR pré-rendu (passée par renderActePdfBytes). */
interface ActePdfInputWithQR extends ActePdfInput {
  qrDataUrl?: string
  verifyUrl?: string
}

/* ============================================================
   Styles
   ============================================================ */

const COLORS = {
  primary: "#1a4480", // bleu institutionnel USWDS-like (CLAUDE.md)
  ink900: "#1a1a1a",
  ink700: "#404040",
  ink500: "#737373",
  ink300: "#cccccc",
  green: "#009e60", // tricolore Gabon
  yellow: "#fcd116",
  blue: "#3a75c4",
}

const styles = StyleSheet.create({
  page: {
    paddingTop: 36,
    paddingBottom: 64,
    paddingHorizontal: 48,
    fontSize: 10,
    color: COLORS.ink900,
    fontFamily: "Helvetica",
  },
  // Bande tricolore Gabon
  republicBar: {
    flexDirection: "row",
    height: 4,
    marginBottom: 16,
  },
  republicBarGreen: { flex: 1, backgroundColor: COLORS.green },
  republicBarYellow: { flex: 1, backgroundColor: COLORS.yellow },
  republicBarBlue: { flex: 1, backgroundColor: COLORS.blue },
  // En-tête
  header: {
    flexDirection: "row",
    justifyContent: "space-between",
    alignItems: "flex-start",
    marginBottom: 24,
  },
  headerLeft: { flex: 1 },
  republicLine: {
    fontSize: 9,
    color: COLORS.ink700,
    marginBottom: 4,
    fontWeight: "bold",
  },
  motto: {
    fontSize: 8,
    color: COLORS.ink500,
    fontStyle: "italic",
    marginBottom: 8,
  },
  organism: { fontSize: 10, fontWeight: "bold", color: COLORS.primary },
  category: { fontSize: 8, color: COLORS.ink500, textTransform: "uppercase" },
  headerRight: {
    alignItems: "flex-end",
  },
  actNumber: {
    fontSize: 9,
    color: COLORS.primary,
    fontWeight: "bold",
    marginBottom: 2,
  },
  date: { fontSize: 8, color: COLORS.ink500 },
  // Titre principal
  title: {
    fontSize: 18,
    fontWeight: "bold",
    color: COLORS.primary,
    textAlign: "center",
    marginTop: 8,
    marginBottom: 6,
  },
  titleUnderline: {
    height: 1,
    width: 120,
    backgroundColor: COLORS.primary,
    alignSelf: "center",
    marginBottom: 24,
  },
  // Corps
  payloadGrid: {
    marginBottom: 24,
  },
  payloadRow: {
    flexDirection: "row",
    borderBottomWidth: 0.5,
    borderBottomColor: COLORS.ink300,
    paddingVertical: 6,
  },
  payloadKey: {
    width: 160,
    fontWeight: "bold",
    color: COLORS.ink700,
  },
  payloadValue: {
    flex: 1,
    color: COLORS.ink900,
  },
  // Référence légale
  legal: {
    fontSize: 8,
    color: COLORS.ink500,
    fontStyle: "italic",
    marginTop: 8,
    marginBottom: 16,
  },
  // Signature + QR
  signatureRow: {
    marginTop: 32,
    flexDirection: "row",
    justifyContent: "space-between",
    alignItems: "flex-start",
  },
  qrBlock: {
    width: 100,
    alignItems: "center",
  },
  qrImage: {
    width: 80,
    height: 80,
  },
  qrLabel: {
    fontSize: 7,
    color: COLORS.ink500,
    textAlign: "center",
    marginTop: 4,
    lineHeight: 1.3,
  },
  signatureBlock: {
    alignItems: "flex-end",
  },
  signatureLabel: { fontSize: 9, color: COLORS.ink700, marginBottom: 4 },
  signatureName: { fontSize: 11, fontWeight: "bold", color: COLORS.ink900 },
  // Pied de page (fixe)
  footer: {
    position: "absolute",
    bottom: 24,
    left: 48,
    right: 48,
    paddingTop: 8,
    borderTopWidth: 0.5,
    borderTopColor: COLORS.ink300,
    flexDirection: "row",
    justifyContent: "space-between",
    fontSize: 7,
    color: COLORS.ink500,
  },
})

/* ============================================================
   Composant — Acte officiel générique
   ============================================================ */

export function ActeOfficial(input: ActePdfInputWithQR): React.ReactElement {
  const issuedDate = new Date(input.issuedAt).toLocaleDateString("fr-FR", {
    day: "numeric",
    month: "long",
    year: "numeric",
  })

  // Conversion du payload en lignes clé/valeur lisibles
  const rows = payloadToRows(input.payload)

  return (
    <Document
      title={input.title}
      subject={input.actNumber}
      author={input.organismName}
      producer="Gabon Connect"
    >
      <Page size="A4" style={styles.page}>
        {/* Bande tricolore en tête */}
        <View style={styles.republicBar}>
          <View style={styles.republicBarGreen} />
          <View style={styles.republicBarYellow} />
          <View style={styles.republicBarBlue} />
        </View>

        {/* En-tête */}
        <View style={styles.header}>
          <View style={styles.headerLeft}>
            <Text style={styles.republicLine}>RÉPUBLIQUE GABONAISE</Text>
            <Text style={styles.motto}>Union · Travail · Justice</Text>
            <Text style={styles.organism}>{input.organismName}</Text>
            <Text style={styles.category}>{input.category}</Text>
          </View>
          <View style={styles.headerRight}>
            <Text style={styles.actNumber}>N° {input.actNumber}</Text>
            <Text style={styles.date}>Émis le {issuedDate}</Text>
          </View>
        </View>

        {/* Titre */}
        <Text style={styles.title}>{input.title}</Text>
        <View style={styles.titleUnderline} />

        {/* Corps : payload structuré */}
        {rows.length > 0 ? (
          <View style={styles.payloadGrid}>
            {rows.map((row, idx) => {
              // React-PDF View types ne supportent pas `key` directement —
              // on l'ajoute via React.createElement pour garder le typing propre.
              const isLast = idx === rows.length - 1
              return React.createElement(
                View,
                {
                  key: `${row.key}-${idx}`,
                  style: isLast
                    ? [styles.payloadRow, { borderBottomWidth: 0 }]
                    : styles.payloadRow,
                },
                React.createElement(
                  Text,
                  { style: styles.payloadKey },
                  row.label,
                ),
                React.createElement(
                  Text,
                  { style: styles.payloadValue },
                  row.value,
                ),
              )
            })}
          </View>
        ) : (
          <View style={styles.payloadGrid}>
            <Text style={styles.payloadValue}>
              Cet acte est délivré sans information complémentaire.
            </Text>
          </View>
        )}

        {/* Référence légale */}
        {input.legalReference && (
          <Text style={styles.legal}>
            Référence légale : {input.legalReference}
          </Text>
        )}

        {/* QR vérification + Signature */}
        <View style={styles.signatureRow}>
          {input.qrDataUrl ? (
            <View style={styles.qrBlock}>
              <Image src={input.qrDataUrl} style={styles.qrImage} />
              <Text style={styles.qrLabel}>
                Scannez pour vérifier{"\n"}cet acte en ligne
              </Text>
            </View>
          ) : (
            <View style={styles.qrBlock} />
          )}
          <View style={styles.signatureBlock}>
            <Text style={styles.signatureLabel}>
              Signé électroniquement par
            </Text>
            <Text style={styles.signatureName}>{input.signatoryName}</Text>
          </View>
        </View>

        {/* Pied de page fixe */}
        <View style={styles.footer} fixed>
          <Text>
            Vérifier l'authenticité : gabon.connect/verifier/
            {input.verificationCode}
          </Text>
          <Text>Empreinte SHA-256 : {input.sha256Short}…</Text>
        </View>
      </Page>
    </Document>
  )
}

/* ============================================================
   Helpers
   ============================================================ */

/**
 * Rend le composant ActeOfficial en bytes PDF (Uint8Array).
 * Utilisé par l'action Node qui appelle ensuite ctx.storage.store + sha256.
 *
 * Génère le QR code en data URL (PNG inline) en amont du rendu : `<Image>`
 * de react-pdf accepte une data URL. La cible du QR est l'URL publique de
 * vérification (gabon.connect/verifier/[code]).
 */
export async function renderActePdfBytes(
  input: ActePdfInput,
): Promise<Uint8Array> {
  const verifyUrl = `${VERIFY_BASE_URL}/verifier/${input.verificationCode}`
  const qrDataUrl = await QRCode.toDataURL(verifyUrl, {
    errorCorrectionLevel: "M",
    margin: 1,
    width: 256,
    color: { dark: "#1a4480", light: "#ffffff" }, // bleu institutionnel
  })

  const buffer = await renderToBuffer(
    ActeOfficial({ ...input, qrDataUrl, verifyUrl }) as React.ReactElement<
      DocumentProps
    >,
  )
  return new Uint8Array(buffer)
}

/**
 * URL de base pour la vérification publique (peut être surchargée via
 * variable d'environnement Convex `PUBLIC_BASE_URL`). Par défaut, le domaine
 * citoyen prod.
 */
const VERIFY_BASE_URL =
  (typeof process !== "undefined" && process.env?.PUBLIC_BASE_URL) ||
  "https://gabon.connect"

interface PayloadRow {
  key: string
  label: string
  value: string
}

/**
 * Aplatit un payload arbitraire en lignes affichables. Pour les valeurs
 * non-string, on les sérialise simplement. Les clés sont humanisées
 * (snake_case → mots).
 */
function payloadToRows(payload: Record<string, unknown>): PayloadRow[] {
  const rows: PayloadRow[] = []
  for (const [key, raw] of Object.entries(payload)) {
    if (raw === null || raw === undefined || raw === "") continue
    if (key.startsWith("_")) continue // champs internes (ex. _consentSnapshot)
    const value =
      typeof raw === "string"
        ? raw
        : typeof raw === "number" || typeof raw === "boolean"
          ? String(raw)
          : JSON.stringify(raw)
    rows.push({ key, label: humanizeKey(key), value })
  }
  return rows
}

function humanizeKey(key: string): string {
  // snake_case → "Snake case", camelCase → "Camel case"
  const spaced = key
    .replace(/([A-Z])/g, " $1")
    .replace(/_/g, " ")
    .trim()
  return spaced.charAt(0).toUpperCase() + spaced.slice(1).toLowerCase()
}

// Désactive l'enregistrement de polices custom pour v1 — on utilise les
// fonts par défaut de react-pdf (Helvetica). Quand on voudra Marianne
// (DSFR), on appellera Font.register ici. (`void Font` pour éviter
// l'avertissement d'import inutilisé.)
void Font
