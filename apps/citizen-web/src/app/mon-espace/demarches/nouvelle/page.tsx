import { getCurrentCitizen } from "@workspace/mocks/citizen"
import { DepositWizard } from "./deposit-wizard"

export default async function CitizenDepositPage() {
  const citizen = await getCurrentCitizen()
  return <DepositWizard initialStep={0} citizen={citizen} />
}
