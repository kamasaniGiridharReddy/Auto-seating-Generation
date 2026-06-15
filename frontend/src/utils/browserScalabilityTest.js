/**
 * Browser-Based Scalability Test
 * Run this in the browser console after loading the application
 * Copy and paste this entire script into the DevTools console
 */

// Synthetic data generation
function generateStudent(index) {
  const firstNames = ['John', 'Jane', 'Mike', 'Sarah', 'David', 'Emily', 'Chris', 'Anna', 'Tom', 'Lisa'];
  const lastNames = ['Smith', 'Johnson', 'Williams', 'Brown', 'Jones', 'Garcia', 'Miller', 'Davis'];
  const skills = ['Python', 'Java', 'JavaScript', 'C++', 'C#', 'Go', 'Rust', 'TypeScript'];
  
  const firstName = firstNames[Math.floor(Math.random() * firstNames.length)];
  const lastName = lastNames[Math.floor(Math.random() * lastNames.length)];
  const skill = skills[Math.floor(Math.random() * skills.length)];
  
  return {
    'Student Name': `${firstName} ${lastName}`,
    'NIAT ID': `NIAT${String(index).padStart(6, '0')}`,
    'Booking ID': `BK${String(index).padStart(8, '0')}`,
    'Skill': skill,
    'Skill Name': skill + ' Developer',
  };
}

function generateDataset(count) {
  const students = [];
  for (let i = 0; i < count; i++) {
    students.push(generateStudent(i));
  }
  return students;
}

function generateClassroomConfig(studentCount) {
  const requiredBenches = Math.ceil(studentCount / 2);
  const gridSide = Math.ceil(Math.sqrt(requiredBenches));
  
  return {
    classrooms: [{
      id: 'room-1',
      roomName: 'Main Hall',
      roomNumber: '1',
      rows: gridSide,
      columns: gridSide,
      studentsPerBench: 2,
      orientation: 'horizontal',
    }]
  };
}

// Performance measurement
function measureExecution(fn) {
  const start = performance.now();
  const startMem = performance.memory ? performance.memory.usedJSHeapSize : 0;
  
  const result = fn();
  
  const end = performance.now();
  const endMem = performance.memory ? performance.memory.usedJSHeapSize : 0;
  
  return {
    duration: end - start,
    memoryDelta: endMem - startMem,
    result,
  };
}

// Validation functions
function validateNoStudentMissing(students, assignments) {
  const studentNiatIds = new Set(students.map(s => s['NIAT ID']));
  const seatedNiatIds = new Set(assignments.filter(a => a.status === 'Occupied').map(a => a.niatId));
  const missing = students.filter(s => !seatedNiatIds.has(s['NIAT ID']));
  
  return {
    passed: missing.length === 0,
    missingCount: missing.length,
  };
}

function validateNoDuplicates(assignments) {
  const seatKeys = new Set();
  let duplicates = 0;
  
  for (const a of assignments) {
    if (a.status === 'Empty') continue;
    const key = `${a.room}-${a.benchNo}-${a.seatIndex}`;
    if (seatKeys.has(key)) duplicates++;
    seatKeys.add(key);
  }
  
  return { passed: duplicates === 0, duplicateCount: duplicates };
}

function validateBookingId(students, assignments) {
  const studentBookingIds = new Map();
  students.forEach(s => studentBookingIds.set(s['NIAT ID'], s['Booking ID'] || ''));
  
  let missing = 0;
  let incorrect = 0;
  
  for (const a of assignments) {
    if (a.status === 'Empty') continue;
    const expected = studentBookingIds.get(a.niatId);
    const actual = a.bookingId || '';
    
    if (!actual && expected) missing++;
    else if (actual !== expected) incorrect++;
  }
  
  return { passed: missing === 0 && incorrect === 0, missing, incorrect };
}

// Main test function
async function runScalabilityTest(count) {
  console.log(`\n=== Testing ${count} students ===`);
  
  const students = generateDataset(count);
  const config = generateClassroomConfig(count);
  
  // Import the seating algorithm (if available in window)
  let allocateSeating;
  if (window.allocateSeating) {
    allocateSeating = window.allocateSeating;
  } else {
    console.error('Seating algorithm not available. Please load the application first.');
    return null;
  }
  
  // Measure seating generation
  const measurement = measureExecution(() => {
    return allocateSeating(students, config.classrooms);
  });
  
  const assignments = measurement.result.finalSeating;
  
  // Run validations
  const noMissing = validateNoStudentMissing(students, assignments);
  const noDuplicates = validateNoDuplicates(assignments);
  const bookingId = validateBookingId(students, assignments);
  
  const result = {
    studentCount: count,
    seatingTime: measurement.duration,
    memoryDelta: measurement.memoryDelta,
    totalSeats: assignments.length,
    occupiedSeats: assignments.filter(a => a.status === 'Occupied').length,
    emptySeats: assignments.filter(a => a.status === 'Empty').length,
    validation: {
      noStudentMissing: noMissing,
      noDuplicates: noDuplicates,
      bookingId: bookingId,
      allPassed: noMissing.passed && noDuplicates.passed && bookingId.passed,
    },
  };
  
  console.log(`Seating Time: ${measurement.duration.toFixed(2)}ms`);
  console.log(`Memory Delta: ${(measurement.memoryDelta / 1024 / 1024).toFixed(2)}MB`);
  console.log(`Total Seats: ${result.totalSeats}`);
  console.log(`Occupied: ${result.occupiedSeats}`);
  console.log(`Empty: ${result.emptySeats}`);
  console.log(`Validation: ${result.validation.allPassed ? 'PASS' : 'FAIL'}`);
  console.log(`  - No Missing: ${noMissing.passed ? 'PASS' : 'FAIL'} (${noMissing.missingCount})`);
  console.log(`  - No Duplicates: ${noDuplicates.passed ? 'PASS' : 'FAIL'} (${noDuplicates.duplicateCount})`);
  console.log(`  - Booking ID: ${bookingId.passed ? 'PASS' : 'FAIL'} (missing: ${bookingId.missing}, incorrect: ${bookingId.incorrect})`);
  
  return result;
}

// Run all tests
async function runAllTests() {
  console.log('='.repeat(60));
  console.log('SCALABILITY TEST SUITE');
  console.log('='.repeat(60));
  
  const sizes = [100, 500, 1000, 5000, 10000];
  const results = {};
  
  for (const size of sizes) {
    try {
      const result = await runScalabilityTest(size);
      results[size] = result;
    } catch (error) {
      console.error(`Test failed for ${size} students:`, error);
      results[size] = { error: error.message };
    }
  }
  
  console.log('\n' + '='.repeat(60));
  console.log('SUMMARY');
  console.log('='.repeat(60));
  
  for (const [size, result] of Object.entries(results)) {
    if (result.error) {
      console.log(`${size}: ERROR - ${result.error}`);
    } else {
      console.log(`${size}: ${result.validation.allPassed ? 'PASS' : 'FAIL'} - ${result.seatingTime.toFixed(2)}ms`);
    }
  }
  
  return results;
}

// Export to window for easy access
window.runScalabilityTest = runScalabilityTest;
window.runAllTests = runAllTests;

console.log('Scalability test loaded. Run runAllTests() to execute all tests.');
