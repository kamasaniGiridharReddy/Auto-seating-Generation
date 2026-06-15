/**
 * VALIDATION SUITE RUNNER
 * Executes the validation suite and reports results
 */

import { runQuickValidation } from './seatingValidationSuite.js'

// Run quick validation
console.log('Starting validation suite execution...')
const results = await runQuickValidation()

// Output summary
console.log('\n=== VALIDATION RESULTS SUMMARY ===')
console.log(`Total Tests Executed: ${results.totalTests}`)
console.log(`Total Passed: ${results.passed}`)
console.log(`Total Failed: ${results.failed}`)
console.log(`Pass Rate: ${((results.passed / results.totalTests) * 100).toFixed(2)}%`)

// Output failed tests
if (results.failures.length > 0) {
  console.log('\n=== FAILED TESTS ===')
  results.failures.forEach((failure, idx) => {
    console.log(`\nFailure ${idx + 1}:`)
    console.log(`  Layout: ${failure.label}`)
    console.log(`  Failure Reason: ${failure.errors.join(', ')}`)
    console.log(`  Stats:`, failure.stats)
  })
}

// Exit with appropriate code
process.exit(results.unexpectedFailures > 0 ? 1 : 0)
