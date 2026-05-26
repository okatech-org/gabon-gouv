/**
 * Tests des helpers de cycle de vie (Bloc 5).
 *
 * Cible les fonctions pures du module qui n'ont pas besoin d'un convexTest
 * complet (duaCodeToMs, computeAck/Reply/Dua, newThreadId, getDefaultKindRules).
 */
import { describe, expect, test } from "vitest"
import {
  computeAckDeadline,
  computeDuaExpiresAt,
  computeReplyDeadline,
  duaCodeToMs,
  getDefaultKindRules,
  newThreadId,
} from "./correspondenceLifecycle"

const DAY = 24 * 60 * 60 * 1000
const YEAR = 365 * DAY

describe("duaCodeToMs", () => {
  test("convertit Ny en ms", () => {
    expect(duaCodeToMs("5y")).toBe(5 * YEAR)
    expect(duaCodeToMs("30y")).toBe(30 * YEAR)
    expect(duaCodeToMs("1y")).toBe(YEAR)
  })
  test("convertit Nd en ms", () => {
    expect(duaCodeToMs("90d")).toBe(90 * DAY)
  })
  test("renvoie null pour indef", () => {
    expect(duaCodeToMs("indef")).toBeNull()
    expect(duaCodeToMs("indéf")).toBeNull()
    expect(duaCodeToMs("Indéf.")).toBeNull()
  })
  test("renvoie null pour format inconnu", () => {
    expect(duaCodeToMs("garbage")).toBeNull()
  })
})

describe("computeAckDeadline / computeReplyDeadline", () => {
  const baseRule = {
    kind: "instruction_request" as const,
    requiresCircuit: false,
    requiresAttachment: false,
    duaCode: "5y",
    defaultConfidentiality: "restricted" as const,
  }
  test("ackDeadline = sentAt + N*day", () => {
    const sentAt = 1_700_000_000_000
    expect(computeAckDeadline({ ...baseRule, ackDeadlineDays: 7 }, sentAt)).toBe(
      sentAt + 7 * DAY,
    )
  })
  test("ackDeadline undefined si ackDeadlineDays undefined", () => {
    expect(computeAckDeadline(baseRule, 1)).toBeUndefined()
  })
  test("replyDeadline = sentAt + N*day", () => {
    const sentAt = 100
    expect(
      computeReplyDeadline({ ...baseRule, replyDeadlineDays: 30 }, sentAt),
    ).toBe(sentAt + 30 * DAY)
  })
})

describe("computeDuaExpiresAt", () => {
  const baseRule = {
    kind: "instruction_request" as const,
    requiresCircuit: false,
    requiresAttachment: false,
    defaultConfidentiality: "restricted" as const,
  }
  test("computeDuaExpiresAt = sentAt + duaCode", () => {
    const sentAt = 1_700_000_000_000
    expect(
      computeDuaExpiresAt({ ...baseRule, duaCode: "5y" }, sentAt),
    ).toBe(sentAt + 5 * YEAR)
  })
  test("undefined si duaCode=indef", () => {
    expect(
      computeDuaExpiresAt({ ...baseRule, duaCode: "indef" }, 1),
    ).toBeUndefined()
  })
})

describe("newThreadId", () => {
  test("génère un UUID format 8-4-4-4-12", () => {
    const id = newThreadId()
    expect(id).toMatch(/^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/)
  })
  test("collisions improbables", () => {
    const ids = new Set<string>()
    for (let i = 0; i < 1000; i++) ids.add(newThreadId())
    expect(ids.size).toBe(1000)
  })
})

describe("getDefaultKindRules", () => {
  test("17 kinds couverts (16 + other)", () => {
    const rules = getDefaultKindRules()
    expect(Object.keys(rules)).toHaveLength(17)
  })
  test("decision_reject exige circuit + PJ", () => {
    const rules = getDefaultKindRules()
    expect(rules.decision_reject.requiresCircuit).toBe(true)
    expect(rules.decision_reject.requiresAttachment).toBe(true)
    expect(rules.decision_reject.duaCode).toBe("30y")
  })
  test("escalation_* a délai AR court (3j) + DUA 50y + confidential", () => {
    const rules = getDefaultKindRules()
    expect(rules.escalation_tutelle.ackDeadlineDays).toBe(3)
    expect(rules.escalation_tutelle.duaCode).toBe("50y")
    expect(rules.escalation_tutelle.defaultConfidentiality).toBe("confidential")
  })
  test("internal_circular n'a pas d'autoClose ni d'échéance AR", () => {
    const rules = getDefaultKindRules()
    expect(rules.internal_circular.autoCloseAfterDays).toBeUndefined()
    expect(rules.internal_circular.ackDeadlineDays).toBeUndefined()
    expect(rules.internal_circular.duaCode).toBe("indef")
  })
})
