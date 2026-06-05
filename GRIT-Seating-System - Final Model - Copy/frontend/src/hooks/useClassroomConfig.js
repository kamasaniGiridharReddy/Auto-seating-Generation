import { useCallback, useMemo, useState } from 'react'
import {
  createClassroom,
  loadClassroomConfig,
  saveClassroomConfig,
  getTotalCapacity,
  getTotalBenches,
  getRoomCapacity,
} from '../utils/classroomStorage'

export function useClassroomConfig() {
  const initial = loadClassroomConfig()
  const [classrooms, setClassrooms] = useState(initial.classrooms ?? [])
  const [errors, setErrors] = useState({})
  const [savedSnapshot, setSavedSnapshot] = useState(
    initial.savedAt ? { classrooms: initial.classrooms, savedAt: initial.savedAt } : null,
  )
  const [saveMessage, setSaveMessage] = useState(null)

  const stats = useMemo(
    () => ({
      classrooms: classrooms.length || '—',
      benches: getTotalBenches(classrooms) || '—',
      capacity: getTotalCapacity(classrooms) || '—',
      studentsPerBench: classrooms.length
        ? [...new Set(classrooms.map((r) => r.studentsPerBench))].join(' / ')
        : '—',
    }),
    [classrooms],
  )

  const addClassroom = useCallback(() => {
    setClassrooms((prev) => [
      ...prev,
      createClassroom({
        roomNumber: `S${String(prev.length + 1).padStart(2, '0')} - ${507 + prev.length}`,
      }),
    ])
    setSaveMessage(null)
  }, [])

  const removeClassroom = useCallback((id) => {
    setClassrooms((prev) => (prev.length <= 1 ? prev : prev.filter((r) => r.id !== id)))
    setErrors((prev) => {
      const next = { ...prev }
      Object.keys(next).forEach((k) => {
        if (k.startsWith(`${id}-`)) delete next[k]
      })
      return next
    })
    setSaveMessage(null)
  }, [])

  const updateClassroom = useCallback((id, field, value) => {
    setClassrooms((prev) =>
      prev.map((r) => (r.id === id ? { ...r, [field]: value } : r)),
    )
    setErrors((prev) => {
      if (!prev[`${id}-${field}`]) return prev
      const next = { ...prev }
      delete next[`${id}-${field}`]
      return next
    })
    setSaveMessage(null)
  }, [])

  const validate = useCallback(() => {
    const next = {}
    if (classrooms.length === 0) {
      next.global = 'Add at least one classroom.'
    }
    classrooms.forEach((room) => {
      if (!String(room.roomNumber).trim()) {
        next[`${room.id}-roomNumber`] = 'Room number is required'
      }
      const rows = Number(room.rows)
      if (!room.rows || Number.isNaN(rows) || rows < 1) {
        next[`${room.id}-rows`] = 'At least 1 row'
      } else if (rows > 30) {
        next[`${room.id}-rows`] = 'Max 30 rows'
      }
      const cols = Number(room.columns)
      if (!room.columns || Number.isNaN(cols) || cols < 1) {
        next[`${room.id}-columns`] = 'At least 1 column'
      } else if (cols > 30) {
        next[`${room.id}-columns`] = 'Max 30 columns'
      }
      if (![1, 2, 3].includes(Number(room.studentsPerBench))) {
        next[`${room.id}-studentsPerBench`] = 'Select 1, 2, or 3'
      }
    })
    setErrors(next)
    return Object.keys(next).length === 0
  }, [classrooms])

  const saveConfiguration = useCallback(() => {
    setSaveMessage(null)
    if (!validate()) return false
    const payload = saveClassroomConfig(classrooms)
    setSavedSnapshot(payload)
    setSaveMessage('Configuration saved successfully.')
    return true
  }, [classrooms, validate])

  return {
    classrooms,
    errors,
    stats,
    savedSnapshot,
    saveMessage,
    setSaveMessage,
    addClassroom,
    removeClassroom,
    updateClassroom,
    saveConfiguration,
    getRoomCapacity,
  }
}
