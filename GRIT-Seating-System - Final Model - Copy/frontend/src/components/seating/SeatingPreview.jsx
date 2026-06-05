import Card from '../ui/Card'

/**
 * 2D seating grid preview.
 * TODO: render layout; enforce no same-skill beside/front/back.
 */
export default function SeatingPreview() {
  return (
    <Card title="Seating preview">
      <p className="text-sm text-[var(--grit-cream)]/60">
        Students with the same skill cannot sit beside, in front, or behind each other.
      </p>
      {/* TODO: grid of benches and assigned students */}
    </Card>
  )
}
