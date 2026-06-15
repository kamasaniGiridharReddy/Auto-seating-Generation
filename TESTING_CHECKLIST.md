# Testing Checklist

## Pre-Deployment Testing

### 1. Booking ID Preservation Testing

#### Test 1.1: CSV Upload with Booking ID
- [ ] Upload CSV with Booking ID column
- [ ] Verify Booking ID is parsed correctly
- [ ] Verify Booking ID stored in localStorage
- [ ] **Expected**: Booking ID preserved in student data

#### Test 1.2: Seating Generation
- [ ] Generate seating with Booking IDs
- [ ] Check assignment objects contain bookingId field
- [ ] Verify bookingId matches original CSV value
- [ ] **Expected**: All assignments have bookingId

#### Test 1.3: Empty Seats
- [ ] Generate seating with empty seats
- [ ] Verify empty seat assignments have bookingId: ''
- [ ] **Expected**: Empty seats have empty string for bookingId

#### Test 1.4: Excel Export
- [ ] Generate seating with Booking IDs
- [ ] Download Excel file
- [ ] Open Excel file
- [ ] Verify Booking ID column exists
- [ ] Verify Booking ID values are correct
- [ ] **Expected**: Booking ID column present with correct values

#### Test 1.5: Seat Swap
- [ ] Load seating with Booking IDs
- [ ] Drag student A to seat B
- [ ] Verify Booking IDs swap correctly
- [ ] Save arrangement
- [ ] Reload and verify Booking IDs preserved
- [ ] **Expected**: Booking IDs swap with students

### 2. Error Message Testing

#### Test 2.1: Capacity Exceeded Error
- [ ] Create classroom with 100 seats
- [ ] Upload CSV with 101 students
- [ ] Attempt to generate seating
- [ ] Verify error message: "Actual capacity (100) is insufficient"
- [ ] **Expected**: Accurate capacity error message

#### Test 2.2: Grid Corruption Error
- [ ] This should not occur in normal operation
- [ ] If it occurs, verify message: "Grid state corruption detected"
- [ ] **Expected**: Grid corruption error if detected

#### Test 2.3: Successful Generation
- [ ] Create classroom with 100 seats
- [ ] Upload CSV with 50 students
- [ ] Generate seating
- [ ] Verify no error thrown
- [ ] **Expected**: Successful generation without errors

### 3. Defensive Index Checks Testing

#### Test 3.1: Normal Operation
- [ ] Generate seating normally
- [ ] Verify no defensive check errors in console
- [ ] **Expected**: No defensive check errors

#### Test 3.2: Edge Case (if possible)
- [ ] Try to trigger edge case with duplicate students
- [ ] Verify defensive check handles gracefully
- [ ] **Expected**: Graceful handling with console error

### 4. 2D Editor Performance Testing

#### Test 4.1: 100 Students
- [ ] Load 100 students in 2D Editor
- [ ] Measure initial render time
- [ ] Drag and drop a student
- [ ] Measure drag operation time
- [ ] **Expected**: < 100ms render, < 50ms drag

#### Test 4.2: 1,000 Students
- [ ] Load 1,000 students in 2D Editor
- [ ] Measure initial render time
- [ ] Drag and drop a student
- [ ] Measure drag operation time
- [ ] **Expected**: < 500ms render, < 100ms drag

#### Test 4.3: Console Logging
- [ ] Open browser console
- [ ] Load 2D Editor
- [ ] Verify no console.log from SortableSeat
- [ ] Verify no excessive page-level logging
- [ ] **Expected**: Minimal console output

#### Test 4.4: Component Memoization
- [ ] Load 2D Editor
- [ ] Trigger a re-render (e.g., room switch)
- [ **Expected**: SortableSeat components not re-rendering unnecessarily

### 5. CSV Import Testing

#### Test 5.1: Valid CSV
- [ ] Upload valid CSV with all required columns
- [ ] Verify parsing succeeds
- [ ] Verify student data correct
- [ ] **Expected**: Successful import

#### Test 5.2: Invalid CSV
- [ ] Upload CSV with missing columns
- [ ] Verify validation error
- [ ] **Expected**: Validation error displayed

#### Test 5.3: Empty CSV
- [ ] Upload empty CSV
- [ ] Verify error message
- [ ] **Expected**: Error message displayed

#### Test 5.4: Large CSV
- [ ] Upload CSV with 1,000 students
- [ ] Verify parsing succeeds
- [ ] Verify performance acceptable
- [ ] **Expected**: Successful import within 5 seconds

### 6. Excel Export Testing

#### Test 6.1: Basic Export
- [ ] Generate seating
- [ ] Click download Excel
- [ ] Verify file downloads
- [ ] Open file and verify data
- [ ] **Expected**: Excel file with correct data

#### Test 6.2: Export with Booking ID
- [ ] Generate seating with Booking IDs
- [ ] Download Excel
- [ ] Verify Booking ID column present
- [ ] Verify Booking ID values correct
- [ ] **Expected**: Booking ID column with correct values

#### Test 6.3: Export with Empty Seats
- [ ] Generate seating with empty seats
- [ ] Download Excel
- [ ] Verify empty seats marked correctly
- [ ] **Expected**: Empty seats have status "Empty"

#### Test 6.4: Large Export
- [ ] Generate seating with 1,000 students
- [ ] Download Excel
- [ ] Verify file size reasonable
- [ ] Open file and verify data
- [ ] **Expected**: Successful export within 2 seconds

### 7. 2D Editor Functionality Testing

#### Test 7.1: Seat Rendering
- [ ] Load seating in 2D Editor
- [ ] Verify all seats rendered
- [ ] Verify correct colors by skill
- [ ] Verify student names displayed
- [ ] **Expected**: All seats rendered correctly

#### Test 7.2: Drag and Drop
- [ ] Drag student A to seat B
- [ ] Verify students swap
- [ ] Verify colors update
- [ ] Verify conflict detection updates
- [ ] **Expected**: Successful swap with updates

#### Test 7.3: Conflict Detection
- [ ] Create seating with same-skill adjacent students
- [ ] Load in 2D Editor
- [ ] Verify conflicts highlighted in red
- [ ] Verify conflict count displayed
- [ ] **Expected**: Conflicts detected and highlighted

#### Test 7.4: Room Switching
- [ ] Load multi-room seating
- [ ] Switch between rooms
- [ ] Verify correct room displayed
- [ ] Verify correct students shown
- [ ] **Expected**: Correct room displayed

#### Test 7.5: Save Arrangement
- [ ] Make changes in 2D Editor
- [ ] Click Save Arrangement
- [ ] Verify success message
- [ ] Reload page
- [ ] Verify changes persisted
- [ ] **Expected**: Changes saved and persisted

#### Test 7.6: Reset Auto Seating
- [ ] Make changes in 2D Editor
- [ ] Click Reset Auto Seating
- [ ] Verify reset to original
- [ ] **Expected**: Reset to original arrangement

### 8. 3D Visualization Testing

#### Test 8.1: 3D Rendering
- [ ] Load seating in 3D view
- [ ] Verify 3D scene renders
- [ ] Verify benches displayed
- [ ] Verify seats displayed
- [ ] **Expected**: 3D scene renders correctly

#### Test 8.2: Camera Controls
- [ ] Test rotate (drag)
- [ ] Test zoom (scroll)
- [ ] Test pan (right-drag)
- [ ] Test camera presets
- [ ] **Expected**: All camera controls work

#### Test 8.3: Skill Colors
- [ ] Load seating with multiple skills
- [ ] Verify correct colors displayed
- [ ] **Expected**: Correct skill colors

#### Test 8.4: Text Labels
- [ ] Zoom in to seats
- [ ] Verify student names displayed
- [ ] Verify skill codes displayed
- [ ] Verify seat numbers displayed
- [ ] **Expected**: Text labels displayed correctly

#### Test 8.5: Zoom-Based Visibility
- [ ] Zoom out from seats
- [ ] Verify labels hide at distance
- [ ] Zoom in
- [ ] Verify labels show at close range
- [ ] **Expected**: Labels show/hide based on zoom

#### Test 8.6: Room Switching
- [ ] Load multi-room seating
- [ ] Switch between rooms
- [ ] Verify correct room displayed
- [ ] **Expected**: Correct room displayed

### 9. Performance Testing

#### Test 9.1: 100 Students
- [ ] Seating generation: < 50ms
- [ ] 2D Editor render: < 100ms
- [ ] 3D Visualization render: < 2s
- [ ] Excel export: < 50ms
- [ ] **Expected**: All operations fast

#### Test 9.2: 1,000 Students
- [ ] Seating generation: < 500ms
- [ ] 2D Editor render: < 500ms
- [ ] 3D Visualization render: < 15s
- [ ] Excel export: < 100ms
- [ ] **Expected**: All operations acceptable

#### Test 9.3: 5,000 Students (if possible)
- [ ] Seating generation: < 10s
- [ ] 2D Editor render: < 3s
- [ ] 3D Visualization render: < 75s
- [ ] Excel export: < 500ms
- [ ] **Expected**: Most operations acceptable

### 10. Cross-Browser Testing

#### Test 10.1: Chrome
- [ ] Test all functionality in Chrome
- [ ] **Expected**: All features work

#### Test 10.2: Firefox
- [ ] Test all functionality in Firefox
- [ ] **Expected**: All features work

#### Test 10.3: Safari
- [ ] Test all functionality in Safari
- [ ] **Expected**: All features work

#### Test 10.4: Edge
- [ ] Test all functionality in Edge
- [ ] **Expected**: All features work

### 11. Regression Testing

#### Test 11.1: Previous Functionality
- [ ] Verify all previously working features still work
- [ ] Verify no breaking changes introduced
- [ ] **Expected**: No regressions

#### Test 11.2: Data Migration
- [ ] Load old seating data (without Booking ID)
- [ ] Verify system handles gracefully
- [ ] **Expected**: Graceful handling with empty Booking IDs

### 12. Automated Testing

#### Test 12.1: Run Test Suite
- [ ] Run seatingAlgorithm.test.js
- [ ] Verify all 10 tests pass
- [ ] **Expected**: All tests pass

#### Test 12.2: Test Coverage
- [ ] Check test coverage report
- [ ] Verify critical paths covered
- [ ] **Expected**: Adequate coverage

## Test Results Summary

| Test Category | Tests | Passed | Failed | Status |
|---------------|-------|--------|--------|--------|
| Booking ID Preservation | 5 | _ | _ | _ |
| Error Messages | 3 | _ | _ | _ |
| Defensive Checks | 2 | _ | _ | _ |
| 2D Editor Performance | 4 | _ | _ | _ |
| CSV Import | 4 | _ | _ | _ |
| Excel Export | 4 | _ | _ | _ |
| 2D Editor Functionality | 6 | _ | _ | _ |
| 3D Visualization | 6 | _ | _ | _ |
| Performance | 3 | _ | _ | _ |
| Cross-Browser | 4 | _ | _ | _ |
| Regression | 2 | _ | _ | _ |
| Automated | 2 | _ | _ | _ |
| **Total** | **45** | _ | _ | _ |

## Sign-Off

**Tester**: _______________
**Date**: _______________
**Build Version**: _______________
**Test Environment**: _______________
**Overall Status**: _______________
**Notes**: _______________
