
import { useEffect, useMemo, useState } from 'react'
import {
  ArrowDownLeft,
  ArrowDownRight,
  ArrowLeftRight,
  ArrowUpRight,
  Bell,
  BriefcaseBusiness,
  CalendarDays,
  Check,
  ChevronDown,
  CircleHelp,
  Download,
  FileText,
  Home,
  LoaderCircle,
  LogOut,
  Menu,
  Plus,
  Search,
  Settings,
  ShoppingBag,
  Sparkles,
  TrendingUp,
  Wallet,
  X,
} from 'lucide-react'
import {
  createTransaction,
  getTransactions,
  type ApiTransaction,
} from './services/transactions'

type Transaction = {
  id: number
  name: string
  category: string
  date: string
  amount: number
  type: 'income' | 'expense'
}

type ModalType = 'sale' | 'expense' | null

type FormState = {
  description: string
  category: string
  amount: string
  transactionDate: string
}

const today = () => {
  const date = new Date()
  const year = date.getFullYear()
  const month = String(date.getMonth() + 1).padStart(2, '0')
  const day = String(date.getDate()).padStart(2, '0')
  return `${year}-${month}-${day}`
}

const emptyForm = (): FormState => ({
  description: '',
  category: 'Services',
  amount: '',
  transactionDate: today(),
})

const incomeCategories = [
  'Sales',
  'Services',
  'Products',
  'Consulting',
  'Other income',
]

const expenseCategories = [
  'Stock',
  'Transport',
  'Utilities',
  'Rent',
  'Marketing',
  'Equipment',
  'Other expense',
]

const currency = (amount: number) =>
  new Intl.NumberFormat('en-ZA', {
    style: 'currency',
    currency: 'ZAR',
    maximumFractionDigits: 2,
  }).format(amount)

const formatDate = (value: string) => {
  const date = new Date(value)

  if (Number.isNaN(date.getTime())) return value

  return new Intl.DateTimeFormat('en-ZA', {
    day: '2-digit',
    month: 'short',
    year: 'numeric',
  }).format(date)
}

const mapApiTransaction = (record: ApiTransaction): Transaction => ({
  id: record.id,
  name: record.description,
  category: record.category,
  date: record.transactionDate,
  amount: Number(record.amount),
  type: record.type === 'Sale' ? 'income' : 'expense',
})

function App() {
  const [transactions, setTransactions] = useState<Transaction[]>([])
  const [isLoadingTransactions, setIsLoadingTransactions] = useState(true)
  const [isSavingTransaction, setIsSavingTransaction] = useState(false)
  const [modal, setModal] = useState<ModalType>(null)
  const [form, setForm] = useState<FormState>(emptyForm)
  const [notice, setNotice] = useState('')
  const [error, setError] = useState('')
  const [searchTerm, setSearchTerm] = useState('')
  const [selectedPeriod, setSelectedPeriod] = useState('7 days')
  const [sidebarOpen, setSidebarOpen] = useState(false)

  useEffect(() => {
    let isMounted = true

    const loadTransactions = async () => {
      setIsLoadingTransactions(true)
      setError('')

      try {
        const records = await getTransactions()

        if (isMounted) {
          setTransactions(records.map(mapApiTransaction))
        }
      } catch (err) {
        if (isMounted) {
          setError(
            err instanceof Error
              ? `Could not load transactions: ${err.message}`
              : 'Could not load transactions. Check that the Lifted API is running.',
          )
        }
      } finally {
        if (isMounted) setIsLoadingTransactions(false)
      }
    }

    void loadTransactions()

    return () => {
      isMounted = false
    }
  }, [])

  const totalIncome = useMemo(
    () =>
      transactions
        .filter((transaction) => transaction.type === 'income')
        .reduce((total, transaction) => total + transaction.amount, 0),
    [transactions],
  )

  const totalExpenses = useMemo(
    () =>
      transactions
        .filter((transaction) => transaction.type === 'expense')
        .reduce((total, transaction) => total + transaction.amount, 0),
    [transactions],
  )

  const netProfit = totalIncome - totalExpenses

  const filteredTransactions = useMemo(() => {
    const query = searchTerm.trim().toLowerCase()

    return [...transactions]
      .filter((transaction) => {
        if (!query) return true

        return (
          transaction.name.toLowerCase().includes(query) ||
          transaction.category.toLowerCase().includes(query) ||
          transaction.type.toLowerCase().includes(query)
        )
      })
      .sort(
        (a, b) =>
          new Date(b.date).getTime() - new Date(a.date).getTime(),
      )
  }, [transactions, searchTerm])

  const chartData = useMemo(() => {
    const days = selectedPeriod === '30 days' ? 30 : 7
    const result: { label: string; income: number; expenses: number }[] = []
    const now = new Date()

    for (let offset = days - 1; offset >= 0; offset -= 1) {
      const date = new Date(now)
      date.setDate(now.getDate() - offset)

      const key = `${date.getFullYear()}-${String(
        date.getMonth() + 1,
      ).padStart(2, '0')}-${String(date.getDate()).padStart(2, '0')}`

      const dayTransactions = transactions.filter((transaction) => {
        const transactionDate = new Date(transaction.date)

        if (Number.isNaN(transactionDate.getTime())) return false

        const transactionKey = `${transactionDate.getFullYear()}-${String(
          transactionDate.getMonth() + 1,
        ).padStart(2, '0')}-${String(
          transactionDate.getDate(),
        ).padStart(2, '0')}`

        return transactionKey === key
      })

      result.push({
        label:
          days === 7
            ? new Intl.DateTimeFormat('en-ZA', {
                weekday: 'short',
              }).format(date)
            : String(date.getDate()),
        income: dayTransactions
          .filter((transaction) => transaction.type === 'income')
          .reduce((sum, transaction) => sum + transaction.amount, 0),
        expenses: dayTransactions
          .filter((transaction) => transaction.type === 'expense')
          .reduce((sum, transaction) => sum + transaction.amount, 0),
      })
    }

    return result
  }, [transactions, selectedPeriod])

  const chartMaximum = Math.max(
    1,
    ...chartData.flatMap((day) => [day.income, day.expenses]),
  )

  const openModal = (type: Exclude<ModalType, null>) => {
    setForm(emptyForm())
    setError('')
    setNotice('')
    setModal(type)
  }

  const closeModal = () => {
    if (isSavingTransaction) return

    setModal(null)
    setForm(emptyForm())
    setError('')
  }

  const saveTransaction = async (
    event: React.FormEvent<HTMLFormElement>,
  ) => {
    event.preventDefault()
    setError('')
    setNotice('')

    const amount = Number(form.amount)

    if (!form.description.trim()) {
      setError('Enter a description for this transaction.')
      return
    }

    if (!form.category) {
      setError('Select a transaction category.')
      return
    }

    if (!Number.isFinite(amount) || amount <= 0) {
      setError('Enter an amount greater than R0.00.')
      return
    }

    if (!form.transactionDate) {
      setError('Select the transaction date.')
      return
    }

    setIsSavingTransaction(true)

    try {
      const saved = await createTransaction({
        type: modal === 'sale' ? 'Sale' : 'Expense',
        description: form.description.trim(),
        category: form.category,
        amount,
        transactionDate: new Date(
          `${form.transactionDate}T12:00:00`,
        ).toISOString(),
      })

      setTransactions((current) => [
        mapApiTransaction(saved),
        ...current,
      ])

      setNotice(
        modal === 'sale'
          ? 'Sale saved to your database successfully.'
          : 'Expense saved to your database successfully.',
      )

      setModal(null)
      setForm(emptyForm())
    } catch (err) {
      setError(
        err instanceof Error
          ? `Could not save transaction: ${err.message}`
          : 'Could not save transaction. Please try again.',
      )
    } finally {
      setIsSavingTransaction(false)
    }
  }

  const exportTransactions = () => {
    if (transactions.length === 0) {
      setNotice('There are no transactions to export yet.')
      return
    }

    const rows = [
      ['Description', 'Category', 'Type', 'Date', 'Amount'],
      ...filteredTransactions.map((transaction) => [
        transaction.name,
        transaction.category,
        transaction.type === 'income' ? 'Sale' : 'Expense',
        formatDate(transaction.date),
        transaction.amount.toFixed(2),
      ]),
    ]

    const csv = rows
      .map((row) =>
        row
          .map((value) => `"${String(value).replace(/"/g, '""')}"`)
          .join(','),
      )
      .join('\n')

    const blob = new Blob([csv], {
      type: 'text/csv;charset=utf-8;',
    })
    const url = URL.createObjectURL(blob)
    const link = document.createElement('a')

    link.href = url
    link.download = 'lifted-transactions.csv'
    link.click()

    URL.revokeObjectURL(url)
    setNotice('Your transaction report has been exported.')
  }

  return (
    <div className="min-h-screen bg-[#f7f8fa] text-slate-900">
      {sidebarOpen && (
        <button
          type="button"
          aria-label="Close navigation"
          className="fixed inset-0 z-30 bg-slate-950/40 lg:hidden"
          onClick={() => setSidebarOpen(false)}
        />
      )}

      <aside
        className={`fixed inset-y-0 left-0 z-40 flex w-[250px] flex-col border-r border-slate-200 bg-white transition-transform duration-200 lg:translate-x-0 ${
          sidebarOpen ? 'translate-x-0' : '-translate-x-full'
        }`}
      >
        <div className="flex h-[82px] items-center gap-3 border-b border-slate-100 px-6">
          <div className="flex h-10 w-10 items-center justify-center rounded-xl bg-[#123c32] text-white">
            <TrendingUp size={22} strokeWidth={2.5} />
          </div>
          <div>
            <p className="text-xl font-extrabold tracking-tight text-[#123c32]">
              lifted<span className="text-emerald-500">.</span>
            </p>
            <p className="text-[10px] font-semibold uppercase tracking-[0.18em] text-slate-400">
              Business companion
            </p>
          </div>
          <button
            type="button"
            aria-label="Close navigation"
            className="ml-auto rounded-lg p-2 text-slate-400 hover:bg-slate-100 lg:hidden"
            onClick={() => setSidebarOpen(false)}
          >
            <X size={18} />
          </button>
        </div>

        <div className="px-4 pt-7">
          <p className="mb-3 px-3 text-[10px] font-bold uppercase tracking-[0.16em] text-slate-400">
            Workspace
          </p>

          <nav className="space-y-1">
            <button
              type="button"
              className="flex w-full items-center gap-3 rounded-xl bg-[#eaf3ef] px-3 py-3 text-left text-sm font-semibold text-[#123c32]"
            >
              <Home size={18} />
              Overview
              <span className="ml-auto h-1.5 w-1.5 rounded-full bg-emerald-600" />
            </button>

            <button
              type="button"
              onClick={() => {
                document
                  .getElementById('transactions')
                  ?.scrollIntoView({ behavior: 'smooth' })
                setSidebarOpen(false)
              }}
              className="flex w-full items-center gap-3 rounded-xl px-3 py-3 text-left text-sm font-medium text-slate-500 transition hover:bg-slate-50 hover:text-slate-900"
            >
              <ArrowLeftRight size={18} />
              Transactions
            </button>

            <button
              type="button"
              onClick={() => openModal('sale')}
              className="flex w-full items-center gap-3 rounded-xl px-3 py-3 text-left text-sm font-medium text-slate-500 transition hover:bg-slate-50 hover:text-slate-900"
            >
              <Wallet size={18} />
              Record a sale
            </button>

            <button
              type="button"
              onClick={() => openModal('expense')}
              className="flex w-full items-center gap-3 rounded-xl px-3 py-3 text-left text-sm font-medium text-slate-500 transition hover:bg-slate-50 hover:text-slate-900"
            >
              <ShoppingBag size={18} />
              Record an expense
            </button>
          </nav>
        </div>

        <div className="px-4 pt-8">
          <p className="mb-3 px-3 text-[10px] font-bold uppercase tracking-[0.16em] text-slate-400">
            Tools
          </p>

          <nav className="space-y-1">
            <button
              type="button"
              onClick={exportTransactions}
              className="flex w-full items-center gap-3 rounded-xl px-3 py-3 text-left text-sm font-medium text-slate-500 transition hover:bg-slate-50 hover:text-slate-900"
            >
              <FileText size={18} />
              Reports
            </button>
            <button
              type="button"
              onClick={() =>
                setNotice(
                  'Lifted insights will help you understand your business performance as your transaction history grows.',
                )
              }
              className="flex w-full items-center gap-3 rounded-xl px-3 py-3 text-left text-sm font-medium text-slate-500 transition hover:bg-slate-50 hover:text-slate-900"
            >
              <Sparkles size={18} />
              Business insights
            </button>
          </nav>
        </div>

        <div className="mt-auto p-4">
          <div className="rounded-2xl bg-[#123c32] p-4 text-white">
            <div className="mb-3 flex h-9 w-9 items-center justify-center rounded-xl bg-white/10">
              <Sparkles size={18} />
            </div>
            <p className="text-sm font-semibold">Grow with confidence</p>
            <p className="mt-1 text-xs leading-5 text-white/65">
              Keep your records organised and understand where your money goes.
            </p>
            <div className="mt-4 flex items-center gap-2 text-xs font-semibold text-emerald-200">
              Your business, moving forward
              <ArrowUpRight size={14} />
            </div>
          </div>

          <button
            type="button"
            onClick={() =>
              setNotice('Settings will be available in a future Lifted update.')
            }
            className="mt-4 flex w-full items-center gap-3 rounded-xl px-3 py-3 text-sm font-medium text-slate-500 hover:bg-slate-50"
          >
            <Settings size={18} />
            Settings
          </button>
          <button
            type="button"
            onClick={() =>
              setNotice(
                'Account sign-out will be available when authentication is connected.',
              )
            }
            className="flex w-full items-center gap-3 rounded-xl px-3 py-3 text-sm font-medium text-slate-500 hover:bg-slate-50"
          >
            <LogOut size={18} />
            Sign out
          </button>
        </div>
      </aside>

      <main className="min-h-screen lg:pl-[250px]">
        <header className="sticky top-0 z-20 flex h-[82px] items-center justify-between border-b border-slate-200 bg-white/95 px-5 backdrop-blur sm:px-8 lg:px-10">
          <div className="flex items-center gap-3">
            <button
              type="button"
              aria-label="Open navigation"
              onClick={() => setSidebarOpen(true)}
              className="rounded-lg p-2 text-slate-600 hover:bg-slate-100 lg:hidden"
            >
              <Menu size={21} />
            </button>
            <div>
              <p className="text-xs font-medium text-slate-400">
                Workspace / Overview
              </p>
              <h1 className="mt-1 text-lg font-bold tracking-tight text-slate-900">
                Business overview
              </h1>
            </div>
          </div>

          <div className="flex items-center gap-3 sm:gap-5">
            <button
              type="button"
              aria-label="Notifications"
              onClick={() =>
                setNotice('You are all caught up with your Lifted dashboard.')
              }
              className="relative rounded-xl border border-slate-200 p-2.5 text-slate-500 transition hover:bg-slate-50"
            >
              <Bell size={18} />
              <span className="absolute right-2 top-2 h-1.5 w-1.5 rounded-full bg-emerald-500" />
            </button>

            <div className="hidden h-9 w-px bg-slate-200 sm:block" />

            <div className="flex items-center gap-3">
              <div className="flex h-10 w-10 items-center justify-center rounded-full bg-[#dcebe4] text-sm font-bold text-[#123c32]">
                SS
              </div>
              <div className="hidden sm:block">
                <p className="text-sm font-semibold text-slate-800">Sharon</p>
                <p className="text-xs text-slate-400">Business owner</p>
              </div>
              <ChevronDown size={15} className="hidden text-slate-400 sm:block" />
            </div>
          </div>
        </header>

        <div className="mx-auto max-w-[1500px] space-y-7 px-5 py-8 sm:px-8 lg:px-10 lg:py-10">
          {notice && (
            <div
              role="status"
              className="flex items-start gap-3 rounded-xl border border-emerald-200 bg-emerald-50 px-4 py-3 text-sm text-emerald-800"
            >
              <Check size={18} className="mt-0.5 shrink-0" />
              <p className="flex-1">{notice}</p>
              <button
                type="button"
                aria-label="Dismiss message"
                onClick={() => setNotice('')}
                className="rounded-md p-1 hover:bg-emerald-100"
              >
                <X size={16} />
              </button>
            </div>
          )}

          {error && !modal && (
            <div
              role="alert"
              className="flex items-start gap-3 rounded-xl border border-red-200 bg-red-50 px-4 py-3 text-sm text-red-700"
            >
              <CircleHelp size={18} className="mt-0.5 shrink-0" />
              <p className="flex-1">{error}</p>
              <button
                type="button"
                onClick={() => setError('')}
                aria-label="Dismiss error"
                className="rounded-md p-1 hover:bg-red-100"
              >
                <X size={16} />
              </button>
            </div>
          )}

          <section className="flex flex-col justify-between gap-5 sm:flex-row sm:items-end">
            <div>
              <div className="mb-2 inline-flex items-center gap-2 rounded-full border border-emerald-100 bg-emerald-50 px-3 py-1 text-xs font-semibold text-[#23634c]">
                <span className="h-1.5 w-1.5 rounded-full bg-emerald-500" />
                Your business at a glance
              </div>
              <h2 className="text-2xl font-bold tracking-tight text-slate-950 sm:text-3xl">
                Welcome back, Sharon
              </h2>
              <p className="mt-2 max-w-xl text-sm leading-6 text-slate-500">
                Keep track of your money, understand your performance, and take
                your next step with confidence.
              </p>
            </div>

            <div className="flex flex-wrap gap-3">
              <button
                type="button"
                onClick={() => openModal('expense')}
                className="inline-flex items-center justify-center gap-2 rounded-xl border border-slate-200 bg-white px-4 py-3 text-sm font-semibold text-slate-700 shadow-sm transition hover:bg-slate-50"
              >
                <ArrowDownRight size={17} />
                Add expense
              </button>
              <button
                type="button"
                onClick={() => openModal('sale')}
                className="inline-flex items-center justify-center gap-2 rounded-xl bg-[#123c32] px-4 py-3 text-sm font-semibold text-white shadow-sm transition hover:bg-[#1a5142]"
              >
                <Plus size={17} />
                Record a sale
              </button>
            </div>
          </section>

          <section className="grid grid-cols-1 gap-4 sm:grid-cols-2 xl:grid-cols-4">
            <div className="rounded-2xl border border-slate-200 bg-white p-5 shadow-sm">
              <div className="flex items-start justify-between">
                <div className="flex h-10 w-10 items-center justify-center rounded-xl bg-emerald-50 text-emerald-700">
                  <Wallet size={20} />
                </div>
                <span className="rounded-full bg-slate-100 px-2.5 py-1 text-[11px] font-semibold text-slate-500">
                  All records
                </span>
              </div>
              <p className="mt-5 text-sm font-medium text-slate-500">
                Total income
              </p>
              <p className="mt-2 text-2xl font-bold tracking-tight text-slate-900">
                {isLoadingTransactions ? '—' : currency(totalIncome)}
              </p>
              <p className="mt-2 text-xs text-slate-400">
                Income from recorded sales
              </p>
            </div>

            <div className="rounded-2xl border border-slate-200 bg-white p-5 shadow-sm">
              <div className="flex items-start justify-between">
                <div className="flex h-10 w-10 items-center justify-center rounded-xl bg-orange-50 text-orange-600">
                  <ShoppingBag size={20} />
                </div>
                <span className="rounded-full bg-slate-100 px-2.5 py-1 text-[11px] font-semibold text-slate-500">
                  All records
                </span>
              </div>
              <p className="mt-5 text-sm font-medium text-slate-500">
                Total expenses
              </p>
              <p className="mt-2 text-2xl font-bold tracking-tight text-slate-900">
                {isLoadingTransactions ? '—' : currency(totalExpenses)}
              </p>
              <p className="mt-2 text-xs text-slate-400">
                Costs recorded for your business
              </p>
            </div>

            <div className="rounded-2xl border border-slate-200 bg-white p-5 shadow-sm">
              <div className="flex items-start justify-between">
                <div className="flex h-10 w-10 items-center justify-center rounded-xl bg-blue-50 text-blue-700">
                  <TrendingUp size={20} />
                </div>
                <span
                  className={`rounded-full px-2.5 py-1 text-[11px] font-semibold ${
                    netProfit >= 0
                      ? 'bg-emerald-50 text-emerald-700'
                      : 'bg-red-50 text-red-700'
                  }`}
                >
                  {netProfit >= 0 ? 'Positive balance' : 'Negative balance'}
                </span>
              </div>
              <p className="mt-5 text-sm font-medium text-slate-500">
                Net balance
              </p>
              <p
                className={`mt-2 text-2xl font-bold tracking-tight ${
                  netProfit >= 0 ? 'text-slate-900' : 'text-red-600'
                }`}
              >
                {isLoadingTransactions ? '—' : currency(netProfit)}
              </p>
              <p className="mt-2 text-xs text-slate-400">
                Income minus recorded expenses
              </p>
            </div>

            <div className="rounded-2xl border border-slate-200 bg-white p-5 shadow-sm">
              <div className="flex items-start justify-between">
                <div className="flex h-10 w-10 items-center justify-center rounded-xl bg-violet-50 text-violet-700">
                  <ArrowLeftRight size={20} />
                </div>
                <span className="rounded-full bg-slate-100 px-2.5 py-1 text-[11px] font-semibold text-slate-500">
                  Database
                </span>
              </div>
              <p className="mt-5 text-sm font-medium text-slate-500">
                Transactions
              </p>
              <p className="mt-2 text-2xl font-bold tracking-tight text-slate-900">
                {isLoadingTransactions ? '—' : transactions.length}
              </p>
              <p className="mt-2 text-xs text-slate-400">
                Total saved transaction records
              </p>
            </div>
          </section>

          <section className="grid grid-cols-1 gap-6 xl:grid-cols-[minmax(0,1.65fr)_minmax(300px,0.85fr)]">
            <div className="rounded-2xl border border-slate-200 bg-white p-5 shadow-sm sm:p-6">
              <div className="flex flex-wrap items-start justify-between gap-4">
                <div>
                  <h3 className="text-base font-bold text-slate-900">
                    Income and expenses
                  </h3>
                  <p className="mt-1 text-sm text-slate-500">
                    A daily view of your recorded transactions
                  </p>
                </div>
                <select
                  aria-label="Chart period"
                  value={selectedPeriod}
                  onChange={(event) => setSelectedPeriod(event.target.value)}
                  className="rounded-lg border border-slate-200 bg-white px-3 py-2 text-sm font-medium text-slate-700 outline-none focus:border-emerald-600"
                >
                  <option>7 days</option>
                  <option>30 days</option>
                </select>
              </div>

              <div className="mt-7 flex items-center gap-5">
                <div className="flex items-center gap-2 text-xs text-slate-500">
                  <span className="h-2.5 w-2.5 rounded-full bg-[#236b52]" />
                  Income
                </div>
                <div className="flex items-center gap-2 text-xs text-slate-500">
                  <span className="h-2.5 w-2.5 rounded-full bg-[#f0b36c]" />
                  Expenses
                </div>
              </div>

              <div className="mt-5 flex h-[220px] gap-2 sm:gap-4">
                <div className="flex flex-col justify-between pb-6 text-right text-[10px] text-slate-400">
                  <span>{currency(chartMaximum)}</span>
                  <span>{currency(chartMaximum * 0.75)}</span>
                  <span>{currency(chartMaximum * 0.5)}</span>
                  <span>{currency(chartMaximum * 0.25)}</span>
                  <span>R0</span>
                </div>

                <div className="relative flex min-w-0 flex-1 flex-col">
                  <div className="pointer-events-none absolute inset-0 bottom-6 flex flex-col justify-between">
                    {Array.from({ length: 5 }).map((_, index) => (
                      <div
                        key={index}
                        className="border-t border-dashed border-slate-100"
                      />
                    ))}
                  </div>

                  <div
                    className={`relative z-10 grid min-h-0 flex-1 items-end gap-1 sm:gap-2 ${
                      selectedPeriod === '30 days'
                        ? 'grid-cols-[repeat(30,minmax(0,1fr))]'
                        : 'grid-cols-7'
                    }`}
                  >
                    {chartData.map((day, index) => (
                      <div
                        key={`${day.label}-${index}`}
                        className="flex h-full min-w-0 items-end justify-center gap-[2px] sm:gap-1"
                        title={`${day.label}: income ${currency(day.income)}, expenses ${currency(day.expenses)}`}
                      >
                        <div
                          className="w-1/2 max-w-5 rounded-t-sm bg-[#236b52] transition-all"
                          style={{
                            height: `${Math.max(
                              day.income > 0 ? 3 : 0,
                              (day.income / chartMaximum) * 100,
                            )}%`,
                          }}
                        />
                        <div
                          className="w-1/2 max-w-5 rounded-t-sm bg-[#f0b36c] transition-all"
                          style={{
                            height: `${Math.max(
                              day.expenses > 0 ? 3 : 0,
                              (day.expenses / chartMaximum) * 100,
                            )}%`,
                          }}
                        />
                      </div>
                    ))}
                  </div>

                  <div
                    className={`mt-3 grid h-3 gap-1 text-center text-[9px] text-slate-400 sm:text-[10px] ${
                      selectedPeriod === '30 days'
                        ? 'grid-cols-[repeat(30,minmax(0,1fr))]'
                        : 'grid-cols-7'
                    }`}
                  >
                    {chartData.map((day, index) => (
                      <span key={`${day.label}-label-${index}`}>
                        {selectedPeriod === '7 days' ||
                        index % 5 === 0 ||
                        index === chartData.length - 1
                          ? day.label
                          : ''}
                      </span>
                    ))}
                  </div>
                </div>
              </div>

              {!isLoadingTransactions && transactions.length === 0 && (
                <p className="mt-4 rounded-xl bg-slate-50 px-4 py-3 text-xs leading-5 text-slate-500">
                  Your chart will reflect actual sales and expenses as you
                  record them. No sample figures are included.
                </p>
              )}
            </div>

            <div className="relative overflow-hidden rounded-2xl bg-[#123c32] p-6 text-white shadow-sm">
              <div className="absolute -right-10 -top-10 h-40 w-40 rounded-full border border-white/10" />
              <div className="absolute -right-3 -top-3 h-24 w-24 rounded-full border border-white/10" />

              <div className="relative">
                <div className="flex h-11 w-11 items-center justify-center rounded-xl bg-white/10">
                  <Sparkles size={21} />
                </div>

                <p className="mt-6 text-xs font-semibold uppercase tracking-[0.16em] text-emerald-200">
                  Your Lifted snapshot
                </p>
                <h3 className="mt-2 text-xl font-bold leading-7">
                  Every record helps you make a better business decision.
                </h3>
                <p className="mt-3 text-sm leading-6 text-white/65">
                  Build a clearer picture of your business by recording each
                  sale and expense.
                </p>

                <div className="mt-7 space-y-3 rounded-xl border border-white/10 bg-white/[0.06] p-4">
                  <div className="flex items-center justify-between gap-3">
                    <span className="text-sm text-white/70">
                      Recorded sales
                    </span>
                    <span className="text-sm font-semibold">
                      {
                        transactions.filter(
                          (transaction) => transaction.type === 'income',
                        ).length
                      }
                    </span>
                  </div>
                  <div className="h-px bg-white/10" />
                  <div className="flex items-center justify-between gap-3">
                    <span className="text-sm text-white/70">
                      Recorded expenses
                    </span>
                    <span className="text-sm font-semibold">
                      {
                        transactions.filter(
                          (transaction) => transaction.type === 'expense',
                        ).length
                      }
                    </span>
                  </div>
                </div>

                <button
                  type="button"
                  onClick={() => openModal('sale')}
                  className="mt-6 inline-flex w-full items-center justify-center gap-2 rounded-xl bg-white px-4 py-3 text-sm font-bold text-[#123c32] transition hover:bg-emerald-50"
                >
                  Record your next sale
                  <ArrowUpRight size={17} />
                </button>
              </div>
            </div>
          </section>

          <section
            id="transactions"
            className="scroll-mt-24 rounded-2xl border border-slate-200 bg-white shadow-sm"
          >
            <div className="flex flex-col justify-between gap-4 border-b border-slate-100 p-5 sm:flex-row sm:items-center sm:px-6">
              <div>
                <h3 className="text-base font-bold text-slate-900">
                  Recent transactions
                </h3>
                <p className="mt-1 text-sm text-slate-500">
                  Your saved business income and expenses
                </p>
              </div>

              <div className="flex flex-wrap gap-2">
                <div className="relative min-w-0 flex-1 sm:w-56 sm:flex-none">
                  <Search
                    size={16}
                    className="absolute left-3 top-1/2 -translate-y-1/2 text-slate-400"
                  />
                  <input
                    type="search"
                    value={searchTerm}
                    onChange={(event) => setSearchTerm(event.target.value)}
                    placeholder="Search transactions"
                    className="w-full rounded-xl border border-slate-200 py-2.5 pl-9 pr-3 text-sm outline-none transition placeholder:text-slate-400 focus:border-emerald-600"
                  />
                </div>

                <button
                  type="button"
                  onClick={exportTransactions}
                  className="inline-flex items-center justify-center gap-2 rounded-xl border border-slate-200 px-3 py-2.5 text-sm font-semibold text-slate-600 transition hover:bg-slate-50"
                >
                  <Download size={16} />
                  <span className="hidden sm:inline">Export</span>
                </button>
              </div>
            </div>

            <div className="overflow-x-auto">
              <table className="w-full min-w-[650px] border-collapse text-left">
                <thead>
                  <tr className="bg-slate-50/80">
                    <th className="px-6 py-3.5 text-[10px] font-bold uppercase tracking-[0.12em] text-slate-400">
                      Transaction
                    </th>
                    <th className="px-4 py-3.5 text-[10px] font-bold uppercase tracking-[0.12em] text-slate-400">
                      Category
                    </th>
                    <th className="px-4 py-3.5 text-[10px] font-bold uppercase tracking-[0.12em] text-slate-400">
                      Date
                    </th>
                    <th className="px-4 py-3.5 text-right text-[10px] font-bold uppercase tracking-[0.12em] text-slate-400">
                      Amount
                    </th>
                    <th className="px-6 py-3.5 text-right text-[10px] font-bold uppercase tracking-[0.12em] text-slate-400">
                      Status
                    </th>
                  </tr>
                </thead>

                <tbody className="divide-y divide-slate-100">
                  {isLoadingTransactions ? (
                    <tr>
                      <td colSpan={5} className="px-6 py-14 text-center">
                        <div className="flex items-center justify-center gap-2 text-sm text-slate-500">
                          <LoaderCircle
                            size={18}
                            className="animate-spin"
                          />
                          Loading your transactions...
                        </div>
                      </td>
                    </tr>
                  ) : filteredTransactions.length === 0 ? (
                    <tr>
                      <td colSpan={5} className="px-6 py-14 text-center">
                        <div className="mx-auto flex h-12 w-12 items-center justify-center rounded-2xl bg-slate-100 text-slate-500">
                          <CalendarDays size={22} />
                        </div>
                        <p className="mt-4 text-sm font-semibold text-slate-800">
                          {searchTerm
                            ? 'No matching transactions'
                            : 'Your transaction list is empty'}
                        </p>
                        <p className="mx-auto mt-1 max-w-sm text-xs leading-5 text-slate-500">
                          {searchTerm
                            ? 'Try a different search term.'
                            : 'Record your first sale or expense. Saved transactions will appear here.'}
                        </p>
                        {!searchTerm && (
                          <div className="mt-4 flex justify-center gap-2">
                            <button
                              type="button"
                              onClick={() => openModal('sale')}
                              className="rounded-lg bg-[#123c32] px-3 py-2 text-xs font-semibold text-white hover:bg-[#1a5142]"
                            >
                              Record a sale
                            </button>
                            <button
                              type="button"
                              onClick={() => openModal('expense')}
                              className="rounded-lg border border-slate-200 px-3 py-2 text-xs font-semibold text-slate-600 hover:bg-slate-50"
                            >
                              Add expense
                            </button>
                          </div>
                        )}
                      </td>
                    </tr>
                  ) : (
                    filteredTransactions.map((transaction) => (
                      <tr
                        key={transaction.id}
                        className="transition hover:bg-slate-50/70"
                      >
                        <td className="px-6 py-4">
                          <div className="flex items-center gap-3">
                            <div
                              className={`flex h-10 w-10 shrink-0 items-center justify-center rounded-xl ${
                                transaction.type === 'income'
                                  ? 'bg-emerald-50 text-emerald-700'
                                  : 'bg-orange-50 text-orange-600'
                              }`}
                            >
                              {transaction.type === 'income' ? (
                                <ArrowDownLeft size={18} />
                              ) : (
                                <ArrowUpRight size={18} />
                              )}
                            </div>
                            <div>
                              <p className="text-sm font-semibold text-slate-800">
                                {transaction.name}
                              </p>
                              <p className="mt-0.5 text-xs text-slate-400">
                                {transaction.type === 'income'
                                  ? 'Money received'
                                  : 'Money spent'}
                              </p>
                            </div>
                          </div>
                        </td>
                        <td className="px-4 py-4">
                          <span className="rounded-lg bg-slate-100 px-2.5 py-1.5 text-xs font-medium text-slate-600">
                            {transaction.category}
                          </span>
                        </td>
                        <td className="px-4 py-4 text-sm text-slate-500">
                          {formatDate(transaction.date)}
                        </td>
                        <td
                          className={`px-4 py-4 text-right text-sm font-bold ${
                            transaction.type === 'income'
                              ? 'text-emerald-700'
                              : 'text-slate-800'
                          }`}
                        >
                          {transaction.type === 'income' ? '+' : '−'}
                          {currency(transaction.amount)}
                        </td>
                        <td className="px-6 py-4 text-right">
                          <span
                            className={`inline-flex items-center gap-1.5 rounded-full px-2.5 py-1 text-[11px] font-semibold ${
                              transaction.type === 'income'
                                ? 'bg-emerald-50 text-emerald-700'
                                : 'bg-orange-50 text-orange-700'
                            }`}
                          >
                            <span
                              className={`h-1.5 w-1.5 rounded-full ${
                                transaction.type === 'income'
                                  ? 'bg-emerald-500'
                                  : 'bg-orange-500'
                              }`}
                            />
                            {transaction.type === 'income'
                              ? 'Sale'
                              : 'Expense'}
                          </span>
                        </td>
                      </tr>
                    ))
                  )}
                </tbody>
              </table>
            </div>

            <div className="flex flex-col gap-2 border-t border-slate-100 px-6 py-4 text-xs text-slate-400 sm:flex-row sm:items-center sm:justify-between">
              <span>
                Showing {filteredTransactions.length} of {transactions.length}{' '}
                transactions
              </span>
              <span className="inline-flex items-center gap-1.5">
                <span className="h-1.5 w-1.5 rounded-full bg-emerald-500" />
                Synced with your Lifted database
              </span>
            </div>
          </section>

          <footer className="flex flex-col gap-2 pb-3 text-xs text-slate-400 sm:flex-row sm:items-center sm:justify-between">
            <p>© 2026 Lifted. Built to help your business move forward.</p>
            <p className="flex items-center gap-2">
              <BriefcaseBusiness size={13} />
              Your business journey, one step at a time.
            </p>
          </footer>
        </div>
      </main>

      {modal && (
        <div
          className="fixed inset-0 z-50 flex items-center justify-center overflow-y-auto bg-slate-950/50 p-4 backdrop-blur-[2px]"
          onMouseDown={(event) => {
            if (event.target === event.currentTarget) closeModal()
          }}
        >
          <div
            role="dialog"
            aria-modal="true"
            aria-labelledby="transaction-modal-title"
            className="my-auto w-full max-w-lg overflow-hidden rounded-2xl bg-white shadow-2xl"
          >
            <div className="flex items-start justify-between border-b border-slate-100 px-6 py-5">
              <div className="flex items-start gap-3">
                <div
                  className={`flex h-11 w-11 items-center justify-center rounded-xl ${
                    modal === 'sale'
                      ? 'bg-emerald-50 text-emerald-700'
                      : 'bg-orange-50 text-orange-600'
                  }`}
                >
                  {modal === 'sale' ? (
                    <ArrowDownLeft size={21} />
                  ) : (
                    <ArrowUpRight size={21} />
                  )}
                </div>
                <div>
                  <h2
                    id="transaction-modal-title"
                    className="text-lg font-bold text-slate-900"
                  >
                    {modal === 'sale' ? 'Record a sale' : 'Add an expense'}
                  </h2>
                  <p className="mt-1 text-sm text-slate-500">
                    {modal === 'sale'
                      ? 'Record money received by your business.'
                      : 'Record money spent by your business.'}
                  </p>
                </div>
              </div>
              <button
                type="button"
                aria-label="Close modal"
                onClick={closeModal}
                disabled={isSavingTransaction}
                className="rounded-lg p-2 text-slate-400 transition hover:bg-slate-100 hover:text-slate-700 disabled:opacity-50"
              >
                <X size={19} />
              </button>
            </div>

            <form onSubmit={saveTransaction} className="space-y-5 p-6">
              {error && (
                <div
                  role="alert"
                  className="rounded-xl border border-red-200 bg-red-50 px-4 py-3 text-sm leading-5 text-red-700"
                >
                  {error}
                </div>
              )}

              <div>
                <label
                  htmlFor="transaction-description"
                  className="mb-2 block text-sm font-semibold text-slate-700"
                >
                  Description
                </label>
                <input
                  id="transaction-description"
                  type="text"
                  maxLength={150}
                  required
                  autoFocus
                  value={form.description}
                  onChange={(event) =>
                    setForm((current) => ({
                      ...current,
                      description: event.target.value,
                    }))
                  }
                  placeholder={
                    modal === 'sale'
                      ? 'e.g. Website development'
                      : 'e.g. Purchased business stock'
                  }
                  className="w-full rounded-xl border border-slate-200 px-4 py-3 text-sm outline-none transition placeholder:text-slate-400 focus:border-emerald-600 focus:ring-2 focus:ring-emerald-600/10"
                />
              </div>

              <div>
                <label
                  htmlFor="transaction-category"
                  className="mb-2 block text-sm font-semibold text-slate-700"
                >
                  Category
                </label>
                <select
                  id="transaction-category"
                  required
                  value={form.category}
                  onChange={(event) =>
                    setForm((current) => ({
                      ...current,
                      category: event.target.value,
                    }))
                  }
                  className="w-full rounded-xl border border-slate-200 bg-white px-4 py-3 text-sm outline-none transition focus:border-emerald-600 focus:ring-2 focus:ring-emerald-600/10"
                >
                  {(modal === 'sale'
                    ? incomeCategories
                    : expenseCategories
                  ).map((category) => (
                    <option key={category} value={category}>
                      {category}
                    </option>
                  ))}
                </select>
              </div>

              <div>
                <label
                  htmlFor="transaction-amount"
                  className="mb-2 block text-sm font-semibold text-slate-700"
                >
                  Amount (ZAR)
                </label>
                <div className="relative">
                  <span className="absolute left-4 top-1/2 -translate-y-1/2 text-sm font-semibold text-slate-400">
                    R
                  </span>
                  <input
                    id="transaction-amount"
                    type="number"
                    min="0.01"
                    max="999999999999"
                    step="0.01"
                    required
                    value={form.amount}
                    onChange={(event) =>
                      setForm((current) => ({
                        ...current,
                        amount: event.target.value,
                      }))
                    }
                    placeholder="0.00"
                    className="w-full rounded-xl border border-slate-200 py-3 pl-9 pr-4 text-sm outline-none transition placeholder:text-slate-400 focus:border-emerald-600 focus:ring-2 focus:ring-emerald-600/10"
                  />
                </div>
              </div>

              <div>
                <label
                  htmlFor="transaction-date"
                  className="mb-2 block text-sm font-semibold text-slate-700"
                >
                  Transaction date
                </label>
                <input
                  id="transaction-date"
                  type="date"
                  required
                  max={today()}
                  value={form.transactionDate}
                  onChange={(event) =>
                    setForm((current) => ({
                      ...current,
                      transactionDate: event.target.value,
                    }))
                  }
                  className="w-full rounded-xl border border-slate-200 px-4 py-3 text-sm outline-none transition focus:border-emerald-600 focus:ring-2 focus:ring-emerald-600/10"
                />
              </div>

              <div className="rounded-xl bg-slate-50 px-4 py-3">
                <p className="text-xs leading-5 text-slate-500">
                  This transaction will be saved to your Lifted database. Your
                  dashboard totals will update after the API confirms the save.
                </p>
              </div>

              <div className="flex gap-3 pt-1">
                <button
                  type="button"
                  onClick={closeModal}
                  disabled={isSavingTransaction}
                  className="flex-1 rounded-xl border border-slate-200 px-4 py-3 text-sm font-semibold text-slate-600 transition hover:bg-slate-50 disabled:opacity-50"
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  disabled={isSavingTransaction}
                  className="flex flex-1 items-center justify-center gap-2 rounded-xl bg-[#123c32] px-4 py-3 text-sm font-semibold text-white transition hover:bg-[#1a5142] disabled:cursor-not-allowed disabled:opacity-60"
                >
                  {isSavingTransaction ? (
                    <>
                      <LoaderCircle size={17} className="animate-spin" />
                      Saving...
                    </>
                  ) : (
                    <>
                      <Check size={17} />
                      Save transaction
                    </>
                  )}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  )
}

export default App
