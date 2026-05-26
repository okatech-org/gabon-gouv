import Link from "next/link"
import { notFound, redirect } from "next/navigation"
import { Button, PageHeader } from "@workspace/ui"
import { api } from "@workspace/backend/generated"
import { convex } from "@/lib/convex"
import { getCurrentAgent } from "@/lib/current-agent"
import { ThreadView, type ThreadData } from "../thread-view"

/**
 * Page deep-link d'une correspondance (Bloc 5).
 *
 * Permet de partager l'URL d'un courrier entre agents (lien email,
 * Slack, etc.). Plein écran, sans liste latérale.
 */
export default async function CorrespondanceRefPage({
  params,
}: {
  params: Promise<{ ref: string }>
}) {
  const session = await getCurrentAgent()
  if (!session) redirect("/login")
  const { ref } = await params

  const thread = (await convex.query(
    api.admin.correspondenceQueries.getThreadV2,
    { token: session.token, ref },
  )) as ThreadData | null

  if (!thread) notFound()

  return (
    <>
      <PageHeader
        breadcrumbs={[
          <Link key="c" href="/correspondance" style={{ color: "inherit" }}>
            Correspondance
          </Link>,
          thread.ref,
        ]}
        title={thread.subject}
        subtitle={`Conversation avec ${thread.from}`}
        actions={
          <Link
            href={`/correspondance?tab=${thread.isSender ? "outbox" : "inbox"}&ref=${thread.ref}`}
            style={{ textDecoration: "none" }}
          >
            <Button variant="ghost" iconRight="externalLink">
              Voir dans la boîte
            </Button>
          </Link>
        }
      />
      <div style={{ flex: 1, minHeight: 0, display: "flex" }}>
        <ThreadView thread={thread} correspondenceId="" />
      </div>
    </>
  )
}
