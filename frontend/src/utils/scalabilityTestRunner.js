/**
 * Scalability Test Runner
 * Runs automated scalability and correctness tests
 */

import { allocateSeating } from './seatingAlgorithmStrictNew.js'
import { generateTestDatasets } from './scalabilityTestUtils.js'
import { measureExecutionTime, estimate2DRenderTime, estimate3DRenderTime, estimateExportTime, PerformanceProfiler } from './performanceMeasurement.js'
import { runAllValidations, generateValidationReport } from './validationFunctions.js'

/**
 * Run scalability test for a single dataset
 */
export async function runScalabilityTest(studentCount, students, config) {
  const profiler = new PerformanceProfiler()
  const results = {
    studentCount,
    timestamp: new Date().toISOString(),
    performance: {},
    validation: {},
    estimates: {},
  }
  
  try {
    // Measure seating generation time
    profiler.start('Seating Generation')
    const seatingResult = allocateSeating(students, config.classrooms)
    profiler.end()
    
    results.performance.seatingGeneration = profiler.getMeasurements()[0]
    results.assignments = seatingResult.finalSeating
    
    // Measure export time (simulated)
    profiler.start('Export')
    const exportTime = estimateExportTime(students.length)
    profiler.end()
    results.performance.export = profiler.getMeasurements()[1]
    
    // Estimate 2D render time
    profiler.start('2D Render (Estimated)')
    const render2DTime = estimate2DRenderTime(students.length)
    profiler.end()
    results.performance.render2D = profiler.getMeasurements()[2]
    
    // Estimate 3D render time (normal mode)
    profiler.start('3D Render Normal (Estimated)')
    const render3DTimeNormal = estimate3DRenderTime(students.length, false)
    profiler.end()
    results.performance.render3DNormal = profiler.getMeasurements()[3]
    
    // Estimate 3D render time (performance mode)
    profiler.start('3D Render Performance (Estimated)')
    const render3DTimePerformance = estimate3DRenderTime(students.length, true)
    profiler.end()
    results.performance.render3DPerformance = profiler.getMeasurements()[4]
    
    // Run validations
    const roomConfig = config.classrooms[0]
    results.validation = runAllValidations(students, seatingResult.finalSeating, roomConfig)
    
    // Calculate estimates
    results.estimates = {
      totalSeats: seatingResult.finalSeating.length,
      occupiedSeats: seatingResult.finalSeating.filter(a => a.status === 'Occupied').length,
      emptySeats: seatingResult.finalSeating.filter(a => a.status === 'Empty').length,
      roomCapacity: roomConfig.rows * roomConfig.columns * roomConfig.studentsPerBench,
    }
    
    results.success = true
    results.error = null
    
  } catch (error) {
    results.success = false
    results.error = error.message
    results.stack = error.stack
  }
  
  results.performanceSummary = profiler.getSummary()
  
  return results
}

/**
 * Run all scalability tests
 */
export async function runAllScalabilityTests() {
  const datasets = generateTestDatasets()
  const allResults = {}
  
  for (const [size, data] of Object.entries(datasets)) {
    console.log(`Running scalability test for ${size} students...`)
    
    const result = await runScalabilityTest(
      parseInt(size),
      data.students,
      data.config
    )
    
    allResults[size] = result
    
    console.log(`Test for ${size} students completed: ${result.success ? 'SUCCESS' : 'FAILED'}`)
  }
  
  return allResults
}

/**
 * Generate scalability test report
 */
export function generateScalabilityReport(allResults) {
  const lines = []
  
  lines.push('# Scalability Test Report')
  lines.push('')
  lines.push(`Generated: ${new Date().toISOString()}`)
  lines.push('')
  
  // Summary table
  lines.push('## Summary')
  lines.push('')
  lines.push('| Student Count | Seating Time | 2D Render | 3D Normal | 3D Perf Mode | Export Time | Validation | Memory Delta |')
  lines.push('|---------------|--------------|-----------|-----------|--------------|-------------|------------|--------------|')
  
  for (const [size, result] of Object.entries(allResults)) {
    const seatingTime = result.performance.seatingGeneration?.durationFormatted || 'N/A'
    const render2DTime = result.performance.render2D?.durationFormatted || 'N/A'
    const render3DNormal = result.performance.render3DNormal?.durationFormatted || 'N/A'
    const render3DPerf = result.performance.render3DPerformance?.durationFormatted || 'N/A'
    const exportTime = result.performance.export?.durationFormatted || 'N/A'
    const validation = result.validation?.allPassed ? '✅ PASS' : '❌ FAIL'
    const memoryDelta = result.performanceSummary?.memoryDeltaFormatted || 'N/A'
    
    lines.push(`| ${size} | ${seatingTime} | ${render2DTime} | ${render3DNormal} | ${render3DPerf} | ${exportTime} | ${validation} | ${memoryDelta} |`)
  }
  
  lines.push('')
  
  // Detailed results for each test
  for (const [size, result] of Object.entries(allResults)) {
    lines.push(`## ${size} Students`)
    lines.push('')
    
    if (!result.success) {
      lines.push(`❌ FAILED: ${result.error}`)
      lines.push('')
      continue
    }
    
    lines.push('### Performance Metrics')
    lines.push('')
    lines.push(`- Seating Generation: ${result.performance.seatingGeneration?.durationFormatted}`)
    lines.push(`- Memory Delta: ${result.performance.seatingGeneration?.memoryDeltaFormatted}`)
    lines.push(`- 2D Render (Estimated): ${result.performance.render2D?.durationFormatted}`)
    lines.push(`- 3D Render Normal (Estimated): ${result.performance.render3DNormal?.durationFormatted}`)
    lines.push(`- 3D Render Performance (Estimated): ${result.performance.render3DPerformance?.durationFormatted}`)
    lines.push(`- Export Time (Estimated): ${result.performance.export?.durationFormatted}`)
    lines.push('')
    
    lines.push('### Estimates')
    lines.push('')
    lines.push(`- Total Seats: ${result.estimates.totalSeats}`)
    lines.push(`- Occupied Seats: ${result.estimates.occupiedSeats}`)
    lines.push(`- Empty Seats: ${result.estimates.emptySeats}`)
    lines.push(`- Room Capacity: ${result.estimates.roomCapacity}`)
    lines.push('')
    
    lines.push('### Validation Results')
    lines.push('')
    lines.push(`- Overall: ${result.validation.allPassed ? '✅ PASS' : '❌ FAIL'}`)
    lines.push(`- Total Checks: ${result.validation.summary.totalChecks}`)
    lines.push(`- Passed: ${result.validation.summary.passedChecks}`)
    lines.push(`- Failed: ${result.validation.summary.failedChecks}`)
    lines.push('')
    
    for (const [checkName, checkResult] of Object.entries(result.validation.results)) {
      lines.push(`  - ${checkName}: ${checkResult.passed ? '✅' : '❌'} ${checkResult.message}`)
    }
    
    lines.push('')
  }
  
  // Bottleneck analysis
  lines.push('## Bottleneck Analysis')
  lines.push('')
  
  const seatingTimes = Object.entries(allResults)
    .filter(([_, r]) => r.success)
    .map(([size, r]) => ({ size: parseInt(size), time: r.performance.seatingGeneration?.duration || 0 }))
  
  if (seatingTimes.length > 0) {
    const slowest = seatingTimes.reduce((max, curr) => curr.time > max.time ? curr : max)
    const fastest = seatingTimes.reduce((min, curr) => curr.time < min.time ? curr : min)
    
    lines.push(`- Slowest Seating Generation: ${slowest.size} students (${slowest.time.toFixed(2)}ms)`)
    lines.push(`- Fastest Seating Generation: ${fastest.size} students (${fastest.time.toFixed(2)}ms)`)
    lines.push('')
    
    // Calculate growth rate
    if (seatingTimes.length >= 2) {
      const sorted = seatingTimes.sort((a, b) => a.size - b.size)
      const growthRates = []
      
      for (let i = 1; i < sorted.length; i++) {
        const sizeRatio = sorted[i].size / sorted[i-1].size
        const timeRatio = sorted[i].time / sorted[i-1].time
        const complexity = timeRatio / sizeRatio
        growthRates.push({
          from: sorted[i-1].size,
          to: sorted[i].size,
          sizeRatio,
          timeRatio,
          complexity,
        })
      }
      
      lines.push('### Growth Rate Analysis')
      lines.push('')
      lines.push('| From | To | Size Ratio | Time Ratio | Complexity |')
      lines.push('|------|-----|------------|------------|------------|')
      
      for (const rate of growthRates) {
        lines.push(`| ${rate.from} | ${rate.to} | ${rate.sizeRatio.toFixed(2)}x | ${rate.timeRatio.toFixed(2)}x | ${rate.complexity.toFixed(2)}x |`)
      }
      
      lines.push('')
      
      const avgComplexity = growthRates.reduce((sum, r) => sum + r.complexity, 0) / growthRates.length
      lines.push(`Average Complexity: ${avgComplexity.toFixed(2)}x`)
      lines.push('')
      
      if (avgComplexity > 1.5) {
        lines.push('⚠️ **WARNING**: Algorithm complexity is super-linear (O(n^1.5) or worse)')
      } else if (avgComplexity > 1.1) {
        lines.push('⚠️ **WARNING**: Algorithm complexity is slightly super-linear')
      } else {
        lines.push('✅ Algorithm complexity is linear or near-linear')
      }
      
      lines.push('')
    }
  }
  
  // Maximum supported student count
  lines.push('## Maximum Supported Student Count')
  lines.push('')
  
  const acceptableResults = Object.entries(allResults)
    .filter(([_, r]) => r.success && r.validation.allPassed)
    .filter(([_, r]) => r.performance.seatingGeneration?.duration < 5000) // < 5 seconds
  
  if (acceptableResults.length > 0) {
    const maxSupported = Math.max(...acceptableResults.map(([size, _]) => parseInt(size)))
    lines.push(`✅ Maximum supported student count: ${maxSupported}`)
    lines.push('')
    lines.push('Based on criteria:')
    lines.push('- Seating generation < 5 seconds')
    lines.push('- All validation checks pass')
  } else {
    lines.push('❌ No acceptable results found')
  }
  
  lines.push('')
  
  return lines.join('\n')
}

/**
 * Run tests and generate report
 */
export async function runTestsAndGenerateReport() {
  console.log('Starting scalability tests...')
  
  const allResults = await runAllScalabilityTests()
  const report = generateScalabilityReport(allResults)
  
  console.log('Tests completed.')
  console.log('\n' + report)
  
  return {
    results: allResults,
    report,
  }
}
