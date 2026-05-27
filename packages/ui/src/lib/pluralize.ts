/**
 * Helpers de formatage texte FR — pluriels et labels d'enum métier.
 *
 * Pluralisation française simple : ajoute "s" si count > 1, sinon
 * pas de "s". Pour les irrégularités (cheval→chevaux), fournir
 * explicitement le pluriel.
 *
 * Pour "0", on peut afficher "Aucun X" plutôt que "0 X" via
 * `pluralizeZero`.
 */

export function pluralize(
  count: number,
  singular: string,
  plural?: string,
): string {
  if (count <= 1) return `${count} ${singular}`
  return `${count} ${plural ?? singular + "s"}`
}

/** Comme pluralize mais "Aucun(e) X" si count=0. */
export function pluralizeZero(
  count: number,
  singular: string,
  plural?: string,
  zero?: string,
): string {
  if (count === 0) return zero ?? `Aucun ${singular}`
  return pluralize(count, singular, plural)
}

/**
 * Labels humains des catégories d'organismes (FR).
 * Synchronisé avec ORGANISM_CATEGORIES de packages/backend/convex/lib/enums.ts.
 */
export function organismCategoryLabel(category: string): string {
  switch (category) {
    case "ministere":
      return "Ministère"
    case "direction_generale":
      return "Direction générale"
    case "etablissement_public":
      return "Établissement public"
    case "collectivite":
      return "Collectivité territoriale"
    case "autorite":
      return "Autorité administrative indépendante"
    case "institution":
      return "Institution"
    // Legacy / autres
    case "mairie":
      return "Mairie"
    case "agence":
      return "Agence"
    default:
      return category
  }
}
