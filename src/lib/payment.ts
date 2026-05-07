import type { PayerRole } from '@/types'

// €50 per ogni livello di differenza
const AMOUNT_PER_LEVEL = 5000 // centesimi

export interface PaymentCalculation {
  payerRole: PayerRole
  amount: number      // centesimi
  amountEur: number   // euro
  levelDiff: number
}

export function calculatePayment(
  photographerLevel: number,
  modelLevel: number
): PaymentCalculation {
  const diff = Math.abs(photographerLevel - modelLevel)
  const amount = diff * AMOUNT_PER_LEVEL

  if (photographerLevel > modelLevel) {
    // Il fotografo è più esperto → la modella paga
    return { payerRole: 'model', amount, amountEur: amount / 100, levelDiff: diff }
  } else if (modelLevel > photographerLevel) {
    // La modella è più esperta → il fotografo paga
    return { payerRole: 'photographer', amount, amountEur: amount / 100, levelDiff: diff }
  } else {
    return { payerRole: 'tfp', amount: 0, amountEur: 0, levelDiff: 0 }
  }
}
