/** Application constants. */

export const API_BASE_URL = import.meta.env.VITE_API_URL || '/api'

export const CSV_COLUMNS = [
  'Booking ID',
  'Student UID',
  'Student Name',
  'NIAT ID',
  'Campus',
  'Slot Centre',
  'Batch',
  'Section',
  'Contest Date',
  'Time Slot',
  'Skill',
  'Skill Level',
]

/** Columns used to group seating arrangements. */
export const SEATING_GROUP_FIELDS = ['Contest Date', 'Time Slot', 'Section']

/** Unique student identifier column. */
export const STUDENT_UID_COLUMN = 'Student UID'

/** Preview table shows key columns; full data kept in row objects. */
export const CSV_PREVIEW_COLUMNS = [
  'Student UID',
  'Student Name',
  'Section',
  'Contest Date',
  'Time Slot',
  'Skill',
  'Skill Level',
]

export const STUDENTS_PER_BENCH_OPTIONS = [1, 2, 3]

export const BRAND = {
  name: 'GRIT Seating Arrangement System',
  gritLogo: '/logos/grit-logo.webp',
  niatLogo: '/logos/niat-logo.png',
}
