/**
 * Standalone Scalability Test Script
 * Run this script to execute all scalability and correctness tests
 */

import { runTestsAndGenerateReport } from './scalabilityTestRunner.js'

/**
 * Main entry point
 */
async function main() {
  console.log('='.repeat(80))
  console.log('GRIT Seating System - Scalability and Correctness Test Suite')
  console.log('='.repeat(80))
  console.log('')
  
  try {
    const { results, report } = await runTestsAndGenerateReport()
    
    // Save report to file
    const fs = await import('fs')
    const path = await import('path')
    
    const reportPath = path.join(process.cwd(), 'SCALABILITY_TEST_REPORT.md')
    fs.writeFileSync(reportPath, report)
    
    console.log('')
    console.log('='.repeat(80))
    console.log(`Report saved to: ${reportPath}`)
    console.log('='.repeat(80))
    
    // Exit with appropriate code
    const allPassed = Object.values(results).every(r => r.success && r.validation?.allPassed)
    process.exit(allPassed ? 0 : 1)
    
  } catch (error) {
    console.error('Error running tests:', error)
    process.exit(1)
  }
}

// Run if executed directly
if (import.meta.url === `file://${process.argv[1]}`) {
  main()
}

export { main }
