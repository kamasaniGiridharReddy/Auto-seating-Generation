/**
 * Test Optimized Algorithm
 * Run this in browser console to test the optimized seating algorithm
 */

// Import the optimized algorithm (if available in window)
if (!window.allocateSeating) {
  console.error('Seating algorithm not available. Please load the application first.');
} else {
  console.log('Testing optimized seating algorithm...');
  
  // Test with different dataset sizes
  const testSizes = [100, 500, 1000, 5000, 10000];
  const results = {};
  
  for (const size of testSizes) {
    console.log(`\n=== Testing ${size} students ===`);
    
    // Generate synthetic data
    const students = [];
    for (let i = 0; i < size; i++) {
      students.push({
        'Student Name': `Student ${i}`,
        'NIAT ID': `NIAT${String(i).padStart(6, '0')}`,
        'Booking ID': `BK${String(i).padStart(8, '0')}`,
        'Skill': ['Python', 'Java', 'JavaScript', 'C++'][Math.floor(Math.random() * 4)],
        'Skill Name': 'Developer',
      });
    }
    
    // Calculate classroom config
    const requiredBenches = Math.ceil(size / 2);
    const gridSide = Math.ceil(Math.sqrt(requiredBenches));
    const config = {
      classrooms: [{
        id: 'room-1',
        roomName: 'Main Hall',
        rows: gridSide,
        columns: gridSide,
        studentsPerBench: 2,
        orientation: 'horizontal',
      }]
    };
    
    // Measure execution time
    const start = performance.now();
    const startMem = performance.memory ? performance.memory.usedJSHeapSize : 0;
    
    try {
      const result = window.allocateSeating(students, config.classrooms);
      
      const end = performance.now();
      const endMem = performance.memory ? performance.memory.usedJSHeapSize : 0;
      
      results[size] = {
        duration: end - start,
        memoryDelta: endMem - startMem,
        success: true,
        occupiedSeats: result.finalSeating.filter(a => a.status === 'Occupied').length,
      };
      
      console.log(`Duration: ${(end - start).toFixed(2)}ms`);
      console.log(`Memory Delta: ${((endMem - startMem) / 1024 / 1024).toFixed(2)}MB`);
      console.log(`Occupied Seats: ${results[size].occupiedSeats}`);
      
    } catch (error) {
      results[size] = {
        success: false,
        error: error.message,
      };
      console.error(`Failed: ${error.message}`);
    }
  }
  
  console.log('\n=== OPTIMIZED ALGORITHM RESULTS ===');
  console.log('| Size | Duration | Memory | Status |');
  console.log('|------|----------|--------|--------|');
  
  for (const [size, result] of Object.entries(results)) {
    if (result.success) {
      console.log(`| ${size} | ${result.duration.toFixed(2)}ms | ${(result.memoryDelta / 1024 / 1024).toFixed(2)}MB | ✅ |`);
    } else {
      console.log(`| ${size} | ERROR | ERROR | ❌ |`);
    }
  }
  
  window.optimizedTestResults = results;
  console.log('\nResults stored in window.optimizedTestResults');
}
