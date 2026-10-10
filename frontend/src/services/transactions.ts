const API_BASE_URL = import.meta.env.VITE_API_BASE_URL

export type ApiTransaction = {
  id: number
  type: 'Sale' | 'Expense'
  description: string
  category: string
  amount: number
  transactionDate: string
  createdAt: string
}

export type CreateTransactionRequest = {
  type: 'Sale' | 'Expense'
  description: string
  category: string
  amount: number
  transactionDate: string
}

async function readError(response: Response): Promise<string> {
  try {
    const body = await response.json()
    return body.message ?? body.title ?? `Request failed (${response.status})`
  } catch {
    return `Request failed (${response.status})`
  }
}

export async function getTransactions(): Promise<ApiTransaction[]> {
  const response = await fetch(`${API_BASE_URL}/api/Transactions`)

  if (!response.ok) {
    throw new Error(await readError(response))
  }

  return response.json() as Promise<ApiTransaction[]>
}

export async function createTransaction(
  transaction: CreateTransactionRequest,
): Promise<ApiTransaction> {
  const response = await fetch(`${API_BASE_URL}/api/Transactions`, {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
    },
    body: JSON.stringify(transaction),
  })

  if (!response.ok) {
    throw new Error(await readError(response))
  }

  return response.json() as Promise<ApiTransaction>
}
