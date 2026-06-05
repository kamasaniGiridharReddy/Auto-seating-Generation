import Button from '../ui/Button'

const VIEWS = [
  { id: 'top', label: 'Top View' },
  { id: 'front', label: 'Front View' },
  { id: 'side', label: 'Side View' },
  { id: 'iso', label: 'Isometric' },
  { id: 'reset', label: 'Reset Camera' },
]

export default function CameraViewButtons({ activeView, onSelect }) {
  return (
    <div className="flex flex-wrap gap-2">
      {VIEWS.map((v) => (
        <Button
          key={v.id}
          type="button"
          variant={activeView === v.id ? 'primary' : 'secondary'}
          onClick={() => onSelect(v.id)}
          className="!px-3 !py-2 text-xs"
        >
          {v.label}
        </Button>
      ))}
    </div>
  )
}
