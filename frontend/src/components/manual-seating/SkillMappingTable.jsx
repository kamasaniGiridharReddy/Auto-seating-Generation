import Card from '../ui/Card'

export default function SkillMappingTable({ mapping, onChange }) {
  if (!mapping?.length) {
    return (
      <Card title="Skill mapping">
        <p className="text-xs text-[var(--grit-cream)]/45">
          Add skills above to generate short codes. Edit codes before designing seats.
        </p>
      </Card>
    )
  }

  return (
    <Card title="Skill mapping" className="overflow-hidden !p-0">
      <p className="border-b border-[var(--grit-brown-600)]/40 px-5 py-3 text-xs text-[var(--grit-cream)]/45">
        Full skill name → short code. Edits are saved automatically.
      </p>
      <div className="overflow-x-auto">
        <table className="w-full min-w-[420px] text-left text-sm">
          <thead>
            <tr className="border-b border-[var(--grit-brown-600)]/50 bg-[var(--grit-brown-900)]/40">
              <th className="px-5 py-3 text-xs font-semibold uppercase tracking-wide text-[var(--grit-cream)]/50">
                Full skill name
              </th>
              <th className="px-5 py-3 text-xs font-semibold uppercase tracking-wide text-[var(--grit-cream)]/50">
                Short code
              </th>
            </tr>
          </thead>
          <tbody>
            {mapping.map((entry, idx) => (
              <tr
                key={entry.fullName}
                className="border-b border-[var(--grit-brown-600)]/25 last:border-0"
              >
                <td className="px-5 py-2.5 text-[var(--grit-cream)]/85">{entry.fullName}</td>
                <td className="px-5 py-2">
                  <input
                    type="text"
                    value={entry.shortCode}
                    onChange={(e) => onChange(idx, e.target.value.toUpperCase())}
                    className="w-full max-w-[8rem] rounded-lg border border-[var(--grit-brown-600)] bg-[var(--grit-brown-900)] px-2.5 py-1.5 text-sm font-semibold tracking-wide text-[var(--grit-gold)] focus:border-[var(--grit-gold)]/50 focus:outline-none"
                  />
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
    </Card>
  )
}
