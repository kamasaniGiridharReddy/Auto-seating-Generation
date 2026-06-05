/**
 * Seating number helpers.
 *
 * Preview: physical slot labels 1…N across rooms (every bench seat).
 * Assignment: continuous 1…N only for successfully seated students (no gaps).
 */

import { getRoomBenchCount, getRoomCapacity } from './classroomStorage'
import { buildBenchOrder } from './seatingAlgorithmStrict'

/** Physical slot number for a bench position (preview / layout only). */
export function physicalSlotNumber(benchNumber, seatIndex, studentsPerBench, slotOffset = 0) {
  return slotOffset + (benchNumber - 1) * studentsPerBench + seatIndex + 1
}

export function getSlotOffsetForRoom(classrooms, roomIndex) {
  let offset = 0
  for (let i = 0; i < roomIndex; i++) {
    offset += getRoomCapacity(classrooms[i])
  }
  return offset
}

/** One bench with sequential seat slot numbers for dashboard preview. */
export function buildBenchSeatGroups(room, slotOffset = 0) {
  const spb = Number(room.studentsPerBench) || 1
  const columns = Number(room.columns) || 1
  const rows = Number(room.rows) || 1
  const orientation = room.orientation || 'horizontal'
  
  const benchOrder = buildBenchOrder(rows, columns, orientation)
  const benches = []
  let seatNumber = slotOffset + 1

  for (const bench of benchOrder) {
    const seatNumbers = []
    for (let s = 0; s < spb; s++) {
      seatNumbers.push(seatNumber++)
    }
    benches.push({ benchNumber: bench.benchNumber, seatNumbers })
  }

  return {
    benches,
    slotEnd: seatNumber - 1,
    rows,
    columns,
  }
}

/** All rooms — slot numbers continue across classrooms. */
export function generateAllRoomsBenchPreview(classrooms) {
  const rooms = []
  let slotOffset = 0

  classrooms.forEach((room) => {
    const { benches, slotEnd, rows, columns } = buildBenchSeatGroups(room, slotOffset)
    rooms.push({
      roomId: room.id,
      roomNumber: room.roomNumber,
      roomName: room.roomName,
      rows,
      columns,
      studentsPerBench: Number(room.studentsPerBench),
      benches,
      slotStart: slotOffset + 1,
      slotEnd,
    })
    slotOffset = slotEnd
  })

  return rooms
}

/** @deprecated Use physicalSlotNumber */
export function computeSeatingNumber(benchNumber, seatIndex, studentsPerBench, seatOffset = 0) {
  return physicalSlotNumber(benchNumber, seatIndex, studentsPerBench, seatOffset)
}
