import Card from '../ui/Card'
import Button from '../ui/Button'

export default function SkillSourcePanel({
  skillText,
  onSkillTextChange,
  onExtractFromCsv,
  onApplyManualSkills,
  csvAvailable,
  skillCount,
}) {
  return (
    <Card title="Skill source" className="space-y-4">
      <p className="text-xs text-[var(--grit-cream)]/50">
        Skills are dynamic — no hardcoded exam names. Load from CSV or type manually.
      </p>

      <div className="flex flex-wrap gap-2">
        <Button
          type="button"
          onClick={onExtractFromCsv}
          disabled={!csvAvailable}
          title={csvAvailable ? 'Extract unique skills from uploaded CSV' : 'Upload CSV first'}
        >
          Extract from CSV
        </Button>
        <Button type="button" variant="secondary" onClick={onApplyManualSkills}>
          Apply manual list
        </Button>
      </div>

      <div>
        <label className="mb-1.5 block text-xs font-medium text-[var(--grit-cream)]/60">
          Manual skills (one per line)
        </label>
        <textarea
          value={skillText}
          onChange={(e) => onSkillTextChange(e.target.value)}
          rows={6}
          placeholder={'Applied Gen AI Development\nCritical Thinking & Communication\nSQL\nCyber Security'}
          className="w-full rounded-xl border border-[var(--grit-brown-600)] bg-[var(--grit-brown-900)]/60 px-3 py-2.5 text-sm text-[var(--grit-cream)] placeholder:text-[var(--grit-cream)]/25 focus:border-[var(--grit-gold)]/50 focus:outline-none focus:ring-1 focus:ring-[var(--grit-gold)]/30"
        />
      </div>

      {skillCount > 0 && (
        <p className="text-xs text-[var(--grit-gold)]">{skillCount} skill(s) configured</p>
      )}
    </Card>
  )
}
