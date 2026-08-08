import { Link } from 'react-router-dom'
import type { SetupStatus } from '../../lib/setup'

interface Props {
  status: SetupStatus
}

function CheckIcon({ done }: { done: boolean }) {
  return done ? (
    <span
      className="flex size-5 shrink-0 items-center justify-center rounded-full bg-accent"
      aria-hidden
    >
      <svg width="10" height="8" viewBox="0 0 10 8" fill="none">
        <path d="M1 4l3 3 5-6" stroke="white" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round" />
      </svg>
    </span>
  ) : (
    <span
      className="flex size-5 shrink-0 items-center justify-center rounded-full border-2 border-line"
      aria-hidden
    />
  )
}

const STEPS = [
  {
    id: 'income' as const,
    label: 'Add income',
    detail: 'Your paychecks and any recurring earnings',
  },
  {
    id: 'fixed' as const,
    label: 'Add fixed costs',
    detail: 'Rent, subscriptions, investments — set it once',
  },
]

export function SetupChecklist({ status }: Props) {
  const firstIncomplete = STEPS.find((s) => status.incompleteRequiredSteps.includes(s.id))

  return (
    <div className="rise rounded-card bg-card px-6 py-10 shadow-card">
      <div className="mx-auto flex size-12 items-center justify-center rounded-full bg-accent-soft">
        <span className="size-3.5 rounded-full bg-accent" aria-hidden />
      </div>
      <h2 className="mt-5 text-center text-lg font-bold tracking-tight">Set up your household</h2>
      <p className="mx-auto mt-2 max-w-xs text-center text-sm text-ink-soft">
        Add your income and fixed costs once — the dashboard fills itself in. After that,
        it's just a card balance once a month.
      </p>

      <ul className="mt-6 space-y-3" aria-label="Setup steps">
        {STEPS.map((step) => {
          const done = !status.incompleteRequiredSteps.includes(step.id)
          return (
            <li
              key={step.id}
              className={`flex items-center gap-3 rounded-xl px-4 py-3 ${
                done ? 'bg-accent-soft/60' : 'border border-line bg-paper'
              }`}
            >
              <CheckIcon done={done} />
              <div>
                <p className={`text-sm font-semibold ${done ? 'text-accent' : 'text-ink'}`}>
                  {step.label}
                </p>
                <p className="text-xs text-ink-soft">{step.detail}</p>
              </div>
            </li>
          )
        })}

        {status.hasActiveCards && (
          <li
            className={`flex items-center gap-3 rounded-xl px-4 py-3 ${
              status.hasCurrentMonthStatements ? 'bg-accent-soft/60' : 'border border-line bg-paper'
            }`}
          >
            <CheckIcon done={status.hasCurrentMonthStatements} />
            <div>
              <p className={`text-sm font-semibold ${status.hasCurrentMonthStatements ? 'text-accent' : 'text-ink'}`}>
                Log this month's card balances
              </p>
              <p className="text-xs text-ink-soft">Once per billing cycle — takes 30 seconds</p>
            </div>
          </li>
        )}
      </ul>

      <div className="mt-6 flex flex-col items-center gap-3 sm:flex-row sm:justify-center">
        <Link
          to={`/manage`}
          className="inline-block rounded-xl bg-accent px-6 py-3 text-sm font-semibold text-solid transition-colors hover:bg-accent-deep"
        >
          {firstIncomplete ? `Add ${firstIncomplete.label.toLowerCase()}` : 'Manage data'}
        </Link>
        <Link
          to="/flow"
          className="inline-block text-sm font-medium text-accent hover:text-accent-deep"
        >
          See how money flows
        </Link>
      </div>
    </div>
  )
}
