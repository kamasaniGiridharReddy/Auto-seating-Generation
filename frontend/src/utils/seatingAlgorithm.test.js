/**
 * Test Cases for Seating Generation Algorithm
 * Tests fallback logic, capacity handling, and data preservation
 */

import { allocateSeating } from './seatingAlgorithmStrictNew'

// Test Data Generators
function createStudent(id, name, skill, bookingId) {
  return {
    'Student Name': name,
    'NIAT ID': id,
    'Skill': skill,
    'Skill Name': skill,
    'Booking ID': bookingId,
  }
}

function createClassroom(name, rows, cols, studentsPerBench, orientation = 'horizontal') {
  return {
    roomName: name,
    rows,
    columns: cols,
    studentsPerBench,
    orientation,
  }
}

// Test Cases
describe('Seating Generation Algorithm', () => {
  
  test('Test 1: Exact capacity match (students = capacity)', () => {
    const students = [
      createStudent('N001', 'Student 1', 'Python', 'B001'),
      createStudent('N002', 'Student 2', 'Java', 'B002'),
      createStudent('N003', 'Student 3', 'Python', 'B003'),
      createStudent('N004', 'Student 4', 'C++', 'B004'),
    ]
    
    const classrooms = [
      createClassroom('Room 1', 2, 2, 1), // 4 seats
    ]
    
    const result = allocateSeating(students, classrooms)
    
    expect(result.success).toBe(true)
    expect(result.finalSeating.filter(s => s.status === 'Occupied').length).toBe(4)
    expect(result.finalSeating.filter(s => s.status === 'Empty').length).toBe(0)
    
    // Verify Booking ID preservation
    const occupiedSeats = result.finalSeating.filter(s => s.status === 'Occupied')
    occupiedSeats.forEach(seat => {
      expect(seat.bookingId).toBeTruthy()
    })
  })
  
  test('Test 2: Capacity surplus (students < capacity)', () => {
    const students = [
      createStudent('N001', 'Student 1', 'Python', 'B001'),
      createStudent('N002', 'Student 2', 'Java', 'B002'),
    ]
    
    const classrooms = [
      createClassroom('Room 1', 2, 2, 1), // 4 seats
    ]
    
    const result = allocateSeating(students, classrooms)
    
    expect(result.success).toBe(true)
    expect(result.finalSeating.filter(s => s.status === 'Occupied').length).toBe(2)
    expect(result.finalSeating.filter(s => s.status === 'Empty').length).toBe(2)
  })
  
  test('Test 3: Same skill constraint relaxation', () => {
    const students = [
      createStudent('N001', 'Student 1', 'Python', 'B001'),
      createStudent('N002', 'Student 2', 'Python', 'B002'),
      createStudent('N003', 'Student 3', 'Python', 'B003'),
      createStudent('N004', 'Student 4', 'Python', 'B004'),
    ]
    
    const classrooms = [
      createClassroom('Room 1', 2, 2, 1), // 4 seats, all same skill
    ]
    
    const result = allocateSeating(students, classrooms)
    
    // Should succeed with relaxed constraints (PASS 4 or PASS 5)
    expect(result.success).toBe(true)
    expect(result.finalSeating.filter(s => s.status === 'Occupied').length).toBe(4)
  })
  
  test('Test 4: Multi-room distribution', () => {
    const students = []
    for (let i = 1; i <= 10; i++) {
      students.push(createStudent(`N${i.toString().padStart(3, '0')}`, `Student ${i}`, i % 2 === 0 ? 'Python' : 'Java', `B${i.toString().padStart(3, '0')}`))
    }
    
    const classrooms = [
      createClassroom('Room 1', 2, 2, 2), // 8 seats
      createClassroom('Room 2', 1, 2, 2), // 4 seats
    ]
    
    const result = allocateSeating(students, classrooms)
    
    expect(result.success).toBe(true)
    expect(result.finalSeating.filter(s => s.status === 'Occupied').length).toBe(10)
    
    // Verify students distributed across rooms
    const room1Seats = result.finalSeating.filter(s => s.room === 'Room 1' && s.status === 'Occupied')
    const room2Seats = result.finalSeating.filter(s => s.room === 'Room 2' && s.status === 'Occupied')
    expect(room1Seats.length + room2Seats.length).toBe(10)
  })
  
  test('Test 5: 3 students per bench', () => {
    const students = []
    for (let i = 1; i <= 9; i++) {
      students.push(createStudent(`N${i.toString().padStart(3, '0')}`, `Student ${i}`, i % 3 === 0 ? 'Python' : i % 3 === 1 ? 'Java' : 'C++', `B${i.toString().padStart(3, '0')}`))
    }
    
    const classrooms = [
      createClassroom('Room 1', 3, 1, 3), // 3 benches, 3 students per bench = 9 seats
    ]
    
    const result = allocateSeating(students, classrooms)
    
    expect(result.success).toBe(true)
    expect(result.finalSeating.filter(s => s.status === 'Occupied').length).toBe(9)
  })
  
  test('Test 6: Vertical orientation', () => {
    const students = [
      createStudent('N001', 'Student 1', 'Python', 'B001'),
      createStudent('N002', 'Student 2', 'Java', 'B002'),
      createStudent('N003', 'Student 3', 'C++', 'B003'),
      createStudent('N004', 'Student 4', 'Python', 'B004'),
    ]
    
    const classrooms = [
      createClassroom('Room 1', 2, 2, 1, 'vertical'), // 4 seats, vertical orientation
    ]
    
    const result = allocateSeating(students, classrooms)
    
    expect(result.success).toBe(true)
    expect(result.finalSeating.filter(s => s.status === 'Occupied').length).toBe(4)
  })
  
  test('Test 7: Capacity exceeded (should fail)', () => {
    const students = []
    for (let i = 1; i <= 10; i++) {
      students.push(createStudent(`N${i.toString().padStart(3, '0')}`, `Student ${i}`, 'Python', `B${i.toString().padStart(3, '0')}`))
    }
    
    const classrooms = [
      createClassroom('Room 1', 2, 2, 1), // 4 seats only
    ]
    
    expect(() => {
      allocateSeating(students, classrooms)
    }).toThrow()
  })
  
  test('Test 8: Booking ID preservation', () => {
    const students = [
      createStudent('N001', 'Student 1', 'Python', 'BOOKING-001'),
      createStudent('N002', 'Student 2', 'Java', 'BOOKING-002'),
    ]
    
    const classrooms = [
      createClassroom('Room 1', 2, 1, 1), // 2 seats
    ]
    
    const result = allocateSeating(students, classrooms)
    
    const occupiedSeats = result.finalSeating.filter(s => s.status === 'Occupied')
    expect(occupiedSeats.length).toBe(2)
    
    // Verify Booking IDs are preserved
    const bookingIds = occupiedSeats.map(s => s.bookingId).sort()
    expect(bookingIds).toEqual(['BOOKING-001', 'BOOKING-002'])
  })
  
  test('Test 9: Large dataset performance', () => {
    const students = []
    for (let i = 1; i <= 100; i++) {
      const skills = ['Python', 'Java', 'C++', 'JavaScript', 'Go']
      students.push(createStudent(`N${i.toString().padStart(3, '0')}`, `Student ${i}`, skills[i % 5], `B${i.toString().padStart(3, '0')}`))
    }
    
    const classrooms = [
      createClassroom('Room 1', 10, 10, 1), // 100 seats
    ]
    
    const startTime = Date.now()
    const result = allocateSeating(students, classrooms)
    const endTime = Date.now()
    
    expect(result.success).toBe(true)
    expect(result.finalSeating.filter(s => s.status === 'Occupied').length).toBe(100)
    
    console.log(`Performance: 100 students seated in ${endTime - startTime}ms`)
  })
  
  test('Test 10: Empty classroom configuration', () => {
    const students = [
      createStudent('N001', 'Student 1', 'Python', 'B001'),
    ]
    
    const classrooms = []
    
    expect(() => {
      allocateSeating(students, classrooms)
    }).toThrow()
  })
})

// Manual test runner (for Node.js without Jest)
if (typeof module !== 'undefined' && module.exports) {
  console.log('Running manual tests...')
  console.log('Note: These tests require Jest or a similar test runner to execute properly.')
  console.log('To run: npm test seatingAlgorithm.test.js')
}
