import Button from '../ui/Button'
import Card from '../ui/Card'

export default function ValidationWarnings({ warnings, dismissed, onDismiss, onProceed }) {
  if (!warnings?.length) return null

  return (
    <Card className="border-[var(--grit-gold)]/30 bg-[var(--grit-gold)]/5 !p-4">
      <div className="flex flex-wrap items-start justify-between gap-3">
        <div>
          <h3 className="text-sm font-semibold text-[var(--grit-gold)]">
            Layout warnings ({warnings.length})
          </h3>
          <p className="mt-1 text-xs text-[var(--grit-cream)]/50">
            Manual mode — warnings only, never blocked. Admin may override intentionally.
          </p>
        </div>
        <div className="flex gap-2">
          {!dismissed && (
            <Button type="button" variant="secondary" onClick={onProceed}>
              Proceed anyway
            </Button>
          )}
          <Button type="button" variant="secondary" onClick={onDismiss}>
            {dismissed ? 'Show warnings' : 'Hide'}
          </Button>
        </div>
      </div>
      {!dismissed && (
        <ul className="mt-3 max-h-36 space-y-1 overflow-y-auto text-xs text-[var(--grit-cream)]/65">
          {warnings.slice(0, 20).map((w, i) => (
            <li key={`${w.seatId}-${w.type}-${i}`}>• {w.message}</li>
          ))}
          {warnings.length > 20 && (
            <li className="text-[var(--grit-cream)]/40">…and {warnings.length - 20} more</li>
          )}
        </ul>
      )}
    </Card>
  )
}
