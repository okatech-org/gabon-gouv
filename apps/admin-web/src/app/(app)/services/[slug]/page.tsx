import { redirect } from "next/navigation"

interface Props {
  params: Promise<{ slug: string }>
}

/** Redirige /services/[slug] vers l'onglet par défaut. */
export default async function ServiceDetailIndex({ params }: Props) {
  const { slug } = await params
  redirect(`/services/${slug}/vue-d-ensemble`)
}
