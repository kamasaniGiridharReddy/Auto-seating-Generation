# Scalability and Correctness Test Suite

## Overview

This test suite provides automated scalability and correctness testing for the GRIT Seating System. It generates synthetic datasets, measures performance metrics, validates correctness, and generates comprehensive reports.

## Test Files

### 1. `scalabilityTestUtils.js`
**Purpose**: Generate synthetic student datasets

**Functions**:
- `generateSyntheticDataset(studentCount)` - Generate random student data
- `generateClassroomConfig(studentCount)` - Generate classroom configuration
- `generateTestDatasets()` - Generate all test datasets (100, 500, 1000, 5000, 10000)
- `generateDatasetWithSkillDistribution(studentCount, skillDistribution)` - Generate dataset with specific skill distribution
- `generateExtremeDataset(studentCount, skill)` - Generate dataset with all same skill

**Features**:
- Realistic student names and skills
- Automatic Booking ID generation
- Configurable skill distributions
- Sufficient classroom capacity calculation

### 2. `performanceMeasurement.js`
**Purpose**: Measure execution time and memory usage

**Functions**:
- `measureExecutionTime(fn, label)` - Measure synchronous function execution
- `measureExecutionTimeAsync(fn, label)` - Measure async function execution
- `PerformanceProfiler` - Class for profiling multiple operations
- `estimate2DRenderTime(seatCount)` - Estimate 2D render time
- `estimate3DRenderTime(seatCount, performanceMode)` - Estimate 3D render time
- `estimateExportTime(seatCount)` - Estimate export time

**Features**:
- High-precision timing
- Memory usage tracking
- Human-readable formatting
- Heuristic estimates for rendering

### 3. `validationFunctions.js`
**Purpose**: Validate seating generation correctness

**Functions**:
- `validateNoStudentMissing(students, assignments)` - Ensure all students are seated
- `validateNoDuplicateAssignments(assignments)` - Ensure no duplicate seat assignments
- `validateBookingIdPreserved(students, assignments)` - Ensure Booking IDs are preserved
- `validateRoomCapacity(assignments, roomConfig)` - Ensure room capacity not exceeded
- `validateBenchCapacity(assignments, roomConfig)` - Ensure bench capacity not exceeded
- `validateSeatAssignments(assignments, roomConfig)` - Ensure all assignments are valid
- `validateConflictDetection(assignments)` - Check conflict detection
- `runAllValidations(students, assignments, roomConfig)` - Run all validations
- `generateValidationReport(validationResults)` - Generate validation report

**Features**:
- Comprehensive correctness checks
- Detailed error reporting
- Booking ID preservation verification
- Capacity validation

### 4. `scalabilityTestRunner.js`
**Purpose**: Run scalability tests and generate reports

**Functions**:
- `runScalabilityTest(studentCount, students, config)` - Run test for single dataset
- `runAllScalabilityTests()` - Run all scalability tests
- `generateScalabilityReport(allResults)` - Generate comprehensive report
- `runTestsAndGenerateReport()` - Run tests and generate report

**Features**:
- Automated test execution
- Performance measurement
- Validation execution
- Report generation
- Bottleneck analysis

### 5. `runScalabilityTests.js`
**Purpose**: Standalone test script

**Usage**: Execute directly to run all tests

**Features**:
- Command-line execution
- Report file generation
- Exit code based on test results

## How to Run Tests

### Method 1: Using Node.js

```bash
cd frontend/src/utils
node runScalabilityTests.js
```

### Method 2: Using ES Modules

```bash
cd frontend/src/utils
node --experimental-modules runScalabilityTests.js
```

### Method 3: Programmatic Usage

```javascript
import { runTestsAndGenerateReport } from './utils/scalabilityTestRunner.js'

const { results, report } = await runTestsAndGenerateReport()
console.log(report)
```

## Test Datasets

The test suite generates synthetic datasets for the following student counts:

1. **100 students** - Small dataset
2. **500 students** - Medium dataset
3. **1000 students** - Large dataset
4. **5000 students** - Very large dataset
5. **10000 students** - Extreme dataset

Each dataset includes:
- Random student names
- Unique NIAT IDs
- Booking IDs
- Skill assignments
- Sufficient classroom capacity

## Metrics Measured

### Performance Metrics
- **Seating Generation Time** - Time to generate seating arrangement
- **Memory Usage** - Memory delta during seating generation
- **2D Render Time (Estimated)** - Estimated time to render in 2D editor
- **3D Render Time Normal (Estimated)** - Estimated time to render in 3D view (normal mode)
- **3D Render Time Performance (Estimated)** - Estimated time to render in 3D view (performance mode)
- **Export Time (Estimated)** - Estimated time to export to Excel

### Validation Metrics
- **No Student Missing** - All students are seated
- **No Duplicate Assignments** - No duplicate seat assignments
- **Booking ID Preserved** - Booking IDs are preserved throughout
- **Room Capacity** - Room capacity not exceeded
- **Bench Capacity** - Bench capacity not exceeded
- **Seat Assignments** - All seat assignments are valid
- **Conflict Detection** - Conflict detection working

## Report Format

The generated report includes:

1. **Summary Table** - Quick overview of all test results
2. **Detailed Results** - Per-dataset performance and validation details
3. **Bottleneck Analysis** - Growth rate analysis and complexity estimation
4. **Maximum Supported Student Count** - Recommended maximum based on performance criteria

## Acceptance Criteria

### Performance Criteria
- Seating generation < 5 seconds
- 2D render < 2 seconds
- 3D render normal < 15 seconds
- 3D render performance < 5 seconds
- Export < 1 second

### Correctness Criteria
- All students seated
- No duplicate assignments
- Booking IDs preserved
- Room capacity not exceeded
- Bench capacity not exceeded
- All assignments valid

## Expected Results

Based on current implementation:

| Student Count | Seating Time | 2D Render | 3D Normal | 3D Perf Mode | Status |
|---------------|--------------|-----------|-----------|--------------|--------|
| 100 | 20-30ms | 60ms | 1.1s | 60ms | ✅ PASS |
| 500 | 150-200ms | 260ms | 5.1s | 100ms | ✅ PASS |
| 1000 | 300-500ms | 510ms | 10.1s | 150ms | ✅ PASS |
| 5000 | 5-10s | 2.51s | 51s | 550ms | ⚠️ BORDERLINE |
| 10000 | 30-60s | 5.01s | 101s | 1.05s | ❌ FAIL |

## Bottleneck Analysis

The test suite automatically analyzes:
- Growth rate between dataset sizes
- Algorithm complexity estimation
- Performance bottlenecks identification
- Maximum supported student count

## Output Files

### SCALABILITY_TEST_REPORT.md
Generated after each test run, contains:
- Summary table
- Detailed performance metrics
- Validation results
- Bottleneck analysis
- Recommendations

## Customization

### Adding New Test Sizes

Edit `scalabilityTestUtils.js`:

```javascript
export function generateTestDatasets() {
  const sizes = [100, 500, 1000, 5000, 10000, 20000] // Add 20000
  // ...
}
```

### Adding New Validation Checks

Edit `validationFunctions.js`:

```javascript
export function validateNewCheck(assignments, roomConfig) {
  // Implementation
  return {
    passed: true,
    message: 'Check passed',
  }
}
```

Add to `runAllValidations`:

```javascript
export function runAllValidations(students, assignments, roomConfig) {
  const results = {
    // ... existing checks
    newCheck: validateNewCheck(assignments, roomConfig),
  }
  // ...
}
```

### Adding New Performance Metrics

Edit `scalabilityTestRunner.js`:

```javascript
profiler.start('New Metric')
const result = measureNewMetric()
profiler.end()
```

## Troubleshooting

### Issue: Module not found
**Solution**: Ensure you're running from the correct directory and using ES modules.

### Issue: Memory limit exceeded
**Solution**: Reduce test dataset sizes or increase Node.js memory limit:
```bash
node --max-old-space-size=4096 runScalabilityTests.js
```

### Issue: Tests fail unexpectedly
**Solution**: Check the console output for error messages and validation details in the report.

## Integration with CI/CD

Add to CI pipeline:

```yaml
- name: Run Scalability Tests
  run: |
    cd frontend/src/utils
    node runScalabilityTests.js
  continue-on-error: true
```

## Future Enhancements

- [ ] Actual 2D/3D rendering measurement (headless browser)
- [ ] Real export time measurement
- [ ] Multi-room testing
- [ ] Skill distribution impact analysis
- [ ] Historical performance tracking
- [ ] Performance regression detection
