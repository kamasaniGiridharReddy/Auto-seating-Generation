/**
 * Shared row/column classroom grid helpers.
 * Bench numbering: row-major (horizontal) or column-major (vertical)
 */

export function benchNumberFromRowCol(row, col, columns, rows, orientation = 'horizontal') {
  if (orientation === 'vertical') {
    // Vertical: column-major
    return col * rows + row + 1
  }
  // Horizontal: row-major
  return row * columns + col + 1
}

export function rowColFromBenchNumber(benchNumber, columns, rows, orientation = 'horizontal') {
  const idx = benchNumber - 1
  
  if (orientation === 'vertical') {
    // Vertical: column-major
    return {
      row: idx % rows,
      col: Math.floor(idx / rows),
    }
  }
  
  // Horizontal: row-major
  return {
    row: Math.floor(idx / columns),
    col: idx % columns,
  }
}

/** Build bench grid layout metadata for a room. */
export function getClassroomGrid(room) {
  const rows = Number(room.rows)
  const columns = Number(room.columns)
  const studentsPerBench = Number(room.studentsPerBench)
  const totalBenches = rows * columns
  const orientation = room.orientation || 'horizontal'
  return { rows, columns, studentsPerBench, totalBenches, orientation }
}
