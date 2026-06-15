/**
 * Synthetic Dataset Generator for Scalability Testing
 * Generates realistic student data with various skill distributions
 */

const SKILLS = ['Python', 'Java', 'JavaScript', 'C++', 'C#', 'Go', 'Rust', 'TypeScript', 'Swift', 'Kotlin']
const FIRST_NAMES = ['John', 'Jane', 'Mike', 'Sarah', 'David', 'Emily', 'Chris', 'Anna', 'Tom', 'Lisa', 'Alex', 'Maria', 'James', 'Sophie', 'Ryan', 'Olivia', 'Kevin', 'Emma', 'Brian', 'Chloe']
const LAST_NAMES = ['Smith', 'Johnson', 'Williams', 'Brown', 'Jones', 'Garcia', 'Miller', 'Davis', 'Rodriguez', 'Martinez', 'Hernandez', 'Lopez', 'Gonzalez', 'Wilson', 'Anderson', 'Thomas', 'Taylor', 'Moore', 'Jackson', 'Martin']

/**
 * Generate a random student
 */
function generateStudent(index) {
  const firstName = FIRST_NAMES[Math.floor(Math.random() * FIRST_NAMES.length)]
  const lastName = LAST_NAMES[Math.floor(Math.random() * LAST_NAMES.length)]
  const skill = SKILLS[Math.floor(Math.random() * SKILLS.length)]
  const skillName = skill + ' Developer'
  
  return {
    'Student Name': `${firstName} ${lastName}`,
    'NIAT ID': `NIAT${String(index).padStart(6, '0')}`,
    'Booking ID': `BK${String(index).padStart(8, '0')}`,
    'Skill': skill,
    'Skill Name': skillName,
  }
}

/**
 * Generate synthetic dataset with specified student count
 */
export function generateSyntheticDataset(studentCount) {
  const students = []
  
  for (let i = 0; i < studentCount; i++) {
    students.push(generateStudent(i))
  }
  
  return students
}

/**
 * Generate classroom configuration for specified student count
 * Ensures sufficient capacity
 */
export function generateClassroomConfig(studentCount) {
  // Calculate required benches (assuming 2 students per bench)
  const requiredBenches = Math.ceil(studentCount / 2)
  
  // Create a balanced grid (rows × columns)
  const gridSide = Math.ceil(Math.sqrt(requiredBenches))
  const rows = gridSide
  const columns = gridSide
  const studentsPerBench = 2
  
  return {
    classrooms: [
      {
        id: 'room-1',
        roomName: 'Main Hall',
        roomNumber: '1',
        rows: rows,
        columns: columns,
        studentsPerBench: studentsPerBench,
        orientation: 'horizontal',
      }
    ]
  }
}

/**
 * Generate multiple test datasets
 */
export function generateTestDatasets() {
  const sizes = [100, 500, 1000, 5000, 10000]
  const datasets = {}
  
  for (const size of sizes) {
    datasets[size] = {
      students: generateSyntheticDataset(size),
      config: generateClassroomConfig(size),
    }
  }
  
  return datasets
}

/**
 * Generate dataset with specific skill distribution
 */
export function generateDatasetWithSkillDistribution(studentCount, skillDistribution) {
  const students = []
  let studentIndex = 0
  
  for (const [skill, percentage] of Object.entries(skillDistribution)) {
    const count = Math.floor(studentCount * percentage)
    for (let i = 0; i < count; i++) {
      const firstName = FIRST_NAMES[Math.floor(Math.random() * FIRST_NAMES.length)]
      const lastName = LAST_NAMES[Math.floor(Math.random() * LAST_NAMES.length)]
      const skillName = skill + ' Developer'
      
      students.push({
        'Student Name': `${firstName} ${lastName}`,
        'NIAT ID': `NIAT${String(studentIndex).padStart(6, '0')}`,
        'Booking ID': `BK${String(studentIndex).padStart(8, '0')}`,
        'Skill': skill,
        'Skill Name': skillName,
      })
      studentIndex++
    }
  }
  
  // Fill remaining with random skills
  while (students.length < studentCount) {
    students.push(generateStudent(studentIndex))
    studentIndex++
  }
  
  return students
}

/**
 * Generate dataset with extreme skill distribution (all same skill)
 */
export function generateExtremeDataset(studentCount, skill = 'Python') {
  const students = []
  
  for (let i = 0; i < studentCount; i++) {
    const firstName = FIRST_NAMES[Math.floor(Math.random() * FIRST_NAMES.length)]
    const lastName = LAST_NAMES[Math.floor(Math.random() * LAST_NAMES.length)]
    const skillName = skill + ' Developer'
    
    students.push({
      'Student Name': `${firstName} ${lastName}`,
      'NIAT ID': `NIAT${String(i).padStart(6, '0')}`,
      'Booking ID': `BK${String(i).padStart(8, '0')}`,
      'Skill': skill,
      'Skill Name': skillName,
    })
  }
  
  return students
}
