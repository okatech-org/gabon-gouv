"use server"

import { revalidatePath } from "next/cache"
import { api } from "@workspace/backend/generated"
import { convex } from "@/lib/convex"
import { requireSessionToken } from "@/lib/session"

export async function markAllReadAction() {
  const token = await requireSessionToken()
  await convex.mutation(api.admin.notifications.markAllRead, { token })
  revalidatePath("/notifications")
  revalidatePath("/")
}
