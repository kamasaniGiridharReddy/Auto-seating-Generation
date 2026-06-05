import { getSkillShortCode } from '../../utils/skillLabels'
import { skillToColor } from '../../utils/skillColors'

export default function SkillLegend({ skills }) {
  if (!skills?.length) return null

  return (
    <div className="flex flex-wrap gap-2">
      {skills.map((skill) => {
        const code = getSkillShortCode(skill)
        return (
          <span
            key={skill}
            className="inline-flex items-center gap-2 rounded-full border border-[var(--grit-brown-600)] px-3 py-1.5 text-xs text-[var(--grit-cream)]"
          >
            <span
              className="h-3 w-3 rounded-full"
              style={{ backgroundColor: skillToColor(skill) }}
            />
            <span className="font-medium text-[var(--grit-gold)]">{code}</span>
            <span className="text-[var(--grit-cream)]/45">·</span>
            <span className="max-w-[140px] truncate text-[var(--grit-cream)]/60">{skill}</span>
          </span>
        )
      })}
    </div>
  )
}
