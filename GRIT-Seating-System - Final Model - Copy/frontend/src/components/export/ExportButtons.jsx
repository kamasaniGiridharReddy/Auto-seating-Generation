import Button from '../ui/Button'
import Card from '../ui/Card'

/** Export seating as CSV or Excel. TODO: wire to export API. */
export default function ExportButtons() {
  return (
    <Card title="Export seating">
      <div className="flex flex-wrap gap-3">
        <Button type="button">Export CSV</Button>
        <Button type="button" className="bg-[var(--grit-brown-700)] hover:bg-[var(--grit-brown-600)]">
          Export Excel
        </Button>
      </div>
    </Card>
  )
}
