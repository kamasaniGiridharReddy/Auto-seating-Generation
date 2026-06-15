/**
 * Performance Measurement Utilities
 * Measures execution time, memory usage, and other performance metrics
 */

/**
 * Measure execution time of a function
 */
export function measureExecutionTime(fn, label = 'Execution') {
  const startTime = performance.now()
  const startMemory = getMemoryUsage()
  
  const result = fn()
  
  const endTime = performance.now()
  const endMemory = getMemoryUsage()
  
  return {
    label,
    duration: endTime - startTime,
    durationFormatted: formatDuration(endTime - startTime),
    memoryBefore: startMemory,
    memoryAfter: endMemory,
    memoryDelta: endMemory - startMemory,
    memoryDeltaFormatted: formatMemory(endMemory - startMemory),
    result,
  }
}

/**
 * Measure execution time of an async function
 */
export async function measureExecutionTimeAsync(fn, label = 'Execution') {
  const startTime = performance.now()
  const startMemory = getMemoryUsage()
  
  const result = await fn()
  
  const endTime = performance.now()
  const endMemory = getMemoryUsage()
  
  return {
    label,
    duration: endTime - startTime,
    durationFormatted: formatDuration(endTime - startTime),
    memoryBefore: startMemory,
    memoryAfter: endMemory,
    memoryDelta: endMemory - startMemory,
    memoryDeltaFormatted: formatMemory(endMemory - startMemory),
    result,
  }
}

/**
 * Get current memory usage (if available)
 */
function getMemoryUsage() {
  if (performance.memory) {
    return performance.memory.usedJSHeapSize
  }
  return 0
}

/**
 * Format duration in human-readable format
 */
function formatDuration(ms) {
  if (ms < 1000) {
    return `${ms.toFixed(2)}ms`
  } else if (ms < 60000) {
    return `${(ms / 1000).toFixed(2)}s`
  } else {
    const minutes = Math.floor(ms / 60000)
    const seconds = ((ms % 60000) / 1000).toFixed(2)
    return `${minutes}m ${seconds}s`
  }
}

/**
 * Format memory in human-readable format
 */
function formatMemory(bytes) {
  if (bytes === 0) return 'N/A'
  
  const abs = Math.abs(bytes)
  if (abs < 1024) {
    return `${bytes.toFixed(2)}B`
  } else if (abs < 1024 * 1024) {
    return `${(bytes / 1024).toFixed(2)}KB`
  } else if (abs < 1024 * 1024 * 1024) {
    return `${(bytes / (1024 * 1024)).toFixed(2)}MB`
  } else {
    return `${(bytes / (1024 * 1024 * 1024)).toFixed(2)}GB`
  }
}

/**
 * Measure multiple metrics and return summary
 */
export function measureMetrics(metrics) {
  const results = {}
  
  for (const metric of metrics) {
    results[metric.name] = measureExecutionTime(metric.fn, metric.name)
  }
  
  return results
}

/**
 * Create a performance profiler
 */
export class PerformanceProfiler {
  constructor() {
    this.measurements = []
  }
  
  /**
   * Start a measurement
   */
  start(label) {
    this.currentLabel = label
    this.startTime = performance.now()
    this.startMemory = getMemoryUsage()
  }
  
  /**
   * End the current measurement
   */
  end() {
    if (!this.currentLabel) {
      throw new Error('No measurement started')
    }
    
    const endTime = performance.now()
    const endMemory = getMemoryUsage()
    
    const measurement = {
      label: this.currentLabel,
      duration: endTime - this.startTime,
      durationFormatted: formatDuration(endTime - this.startTime),
      memoryBefore: this.startMemory,
      memoryAfter: endMemory,
      memoryDelta: endMemory - this.startMemory,
      memoryDeltaFormatted: formatMemory(endMemory - this.startMemory),
    }
    
    this.measurements.push(measurement)
    this.currentLabel = null
    
    return measurement
  }
  
  /**
   * Get all measurements
   */
  getMeasurements() {
    return this.measurements
  }
  
  /**
   * Get summary of all measurements
   */
  getSummary() {
    const totalDuration = this.measurements.reduce((sum, m) => sum + m.duration, 0)
    const totalMemoryDelta = this.measurements.reduce((sum, m) => sum + m.memoryDelta, 0)
    
    return {
      totalDuration,
      totalDurationFormatted: formatDuration(totalDuration),
      totalMemoryDelta,
      totalMemoryDeltaFormatted: formatMemory(totalMemoryDelta),
      measurementCount: this.measurements.length,
      averageDuration: totalDuration / this.measurements.length,
      averageDurationFormatted: formatDuration(totalDuration / this.measurements.length),
    }
  }
  
  /**
   * Reset all measurements
   */
  reset() {
    this.measurements = []
    this.currentLabel = null
  }
}

/**
 * Estimate 2D render time (based on seat count)
 * This is a heuristic since we can't actually render in a test environment
 */
export function estimate2DRenderTime(seatCount) {
  // Base time: 10ms for initialization
  // Per seat: 0.5ms for rendering
  return 10 + (seatCount * 0.5)
}

/**
 * Estimate 3D render time (based on seat count)
 * This is a heuristic since we can't actually render in a test environment
 */
export function estimate3DRenderTime(seatCount, performanceMode = false) {
  if (performanceMode) {
    // Performance mode: much faster due to no text rendering
    // Base time: 50ms for initialization
    // Per seat: 0.1ms for mesh rendering
    return 50 + (seatCount * 0.1)
  } else {
    // Normal mode: slower due to text rendering
    // Base time: 100ms for initialization
    // Per seat: 10ms for mesh + text rendering
    return 100 + (seatCount * 10)
  }
}

/**
 * Estimate export time (based on seat count)
 */
export function estimateExportTime(seatCount) {
  // Base time: 5ms for initialization
  // Per seat: 0.01ms for data processing
  return 5 + (seatCount * 0.01)
}
