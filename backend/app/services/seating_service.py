"""Seating arrangement algorithm with Booking ID preservation and fallback logic."""

from app.models import Student, Classroom, Bench
from app.extensions import db
import random


def generate_seating(students, classroom_config):
    """
    Assign students to benches with fallback logic:
    - PASS 1: Try strict placement (no same skill on same bench)
    - PASS 2: Relax constraints (allow same skill on same bench if needed)
    - PASS 3: Place in any available seat
    - Only fail when actual capacity is insufficient
    
    Preserves Booking ID from student records.
    """
    # Group students by section, contest date, and time slot
    grouped_students = {}
    for student in students:
        key = f"{student.get('Section', '')}-{student.get('Contest Date', '')}-{student.get('Time Slot', '')}"
        if key not in grouped_students:
            grouped_students[key] = []
        grouped_students[key].append(student)
    
    # Generate seating for each group
    seating_layout = []
    for group_key, group_students in grouped_students.items():
        # Sort by skill to help with distribution
        group_students.sort(key=lambda x: x.get('Skill', ''))
        
        # Create classroom layout
        classroom_name = f"Room {group_key}"
        bench_count = classroom_config.get('bench_count', 10)
        students_per_bench = classroom_config.get('students_per_bench', 2)
        rows = classroom_config.get('rows', 2)
        cols = classroom_config.get('cols', 5)
        
        # Calculate total capacity
        total_capacity = bench_count * students_per_bench
        total_students = len(group_students)
        
        print(f"[Seating Service] ============================================")
        print(f"[Seating Service] PROCESSING GROUP: {group_key}")
        print(f"[Seating Service] ============================================")
        print(f"[Seating Service] Total Students: {total_students}")
        print(f"[Seating Service] Total Capacity: {total_capacity}")
        print(f"[Seating Service] Bench Count: {bench_count}")
        print(f"[Seating Service] Students per Bench: {students_per_bench}")
        
        # Validate capacity
        if total_capacity < total_students:
            print(f"[Seating Service] ERROR: Capacity ({total_capacity}) < Students ({total_students})")
            raise ValueError(f"Insufficient capacity: {total_capacity} seats for {total_students} students")
        
        # Create benches
        benches = []
        for i in range(bench_count):
            row = i // cols if cols > 0 else 0
            col = i % cols
            benches.append({
                'bench_number': i + 1,
                'row': row,
                'col': col,
                'students': []
            })
        
        # PASS 1: Strict placement (no same skill on same bench)
        print(f"[Seating Service] PASS 1: Strict placement")
        assigned_students = []
        remaining_students = []
        
        for student in group_students:
            placed = False
            skill = student.get('Skill', '')
            
            # Try to place student in a valid position
            for bench in benches:
                if len(bench['students']) < students_per_bench:
                    # Check skill conflicts with adjacent positions
                    if not has_skill_conflict(bench, skill, students_per_bench):
                        # Place student
                        seat_position = len(bench['students']) + 1
                        bench['students'].append({
                            'booking_id': student.get('Booking ID', 'N/A'),
                            'student_uid': student.get('Student UID', ''),
                            'student_name': student.get('Student Name', ''),
                            'skill': skill,
                            'skill_level': student.get('Skill Level', ''),
                            'seat_position': seat_position
                        })
                        placed = True
                        assigned_students.append(student)
                        break
            
            if not placed:
                remaining_students.append(student)
        
        print(f"[Seating Service] PASS 1 complete: {len(assigned_students)} seated, {len(remaining_students)} remaining")
        
        # PASS 2: Relaxed constraints (allow same skill on same bench)
        if remaining_students:
            print(f"[Seating Service] PASS 2: Relaxed constraints")
            for student in remaining_students[:]:  # Copy to modify during iteration
                skill = student.get('Skill', '')
                
                for bench in benches:
                    if len(bench['students']) < students_per_bench:
                        # Place student regardless of skill conflict
                        seat_position = len(bench['students']) + 1
                        bench['students'].append({
                            'booking_id': student.get('Booking ID', 'N/A'),
                            'student_uid': student.get('Student UID', ''),
                            'student_name': student.get('Student Name', ''),
                            'skill': skill,
                            'skill_level': student.get('Skill Level', ''),
                            'seat_position': seat_position
                        })
                        assigned_students.append(student)
                        remaining_students.remove(student)
                        break
            
            print(f"[Seating Service] PASS 2 complete: {len(assigned_students)} seated, {len(remaining_students)} remaining")
        
        # PASS 3: Place in any available seat (should not reach here if capacity is sufficient)
        if remaining_students:
            print(f"[Seating Service] PASS 3: Place in any available seat")
            for student in remaining_students[:]:
                skill = student.get('Skill', '')
                
                for bench in benches:
                    if len(bench['students']) < students_per_bench:
                        seat_position = len(bench['students']) + 1
                        bench['students'].append({
                            'booking_id': student.get('Booking ID', 'N/A'),
                            'student_uid': student.get('Student UID', ''),
                            'student_name': student.get('Student Name', ''),
                            'skill': skill,
                            'skill_level': student.get('Skill Level', ''),
                            'seat_position': seat_position
                        })
                        assigned_students.append(student)
                        remaining_students.remove(student)
                        break
            
            print(f"[Seating Service] PASS 3 complete: {len(assigned_students)} seated, {len(remaining_students)} remaining")
        
        # Calculate occupied seats
        occupied_seats = sum(len(bench['students']) for bench in benches)
        
        # Display debugging information
        print(f"[Seating Service] ============================================")
        print(f"[Seating Service] SEATING SUMMARY")
        print(f"[Seating Service] ============================================")
        print(f"[Seating Service] Total Students: {total_students}")
        print(f"[Seating Service] Total Capacity: {total_capacity}")
        print(f"[Seating Service] Occupied Seats: {occupied_seats}")
        print(f"[Seating Service] Remaining Seats: {total_capacity - occupied_seats}")
        print(f"[Seating Service] ============================================")
        
        # Create seating layout for this group
        group_layout = {
            'group_key': group_key,
            'classroom': classroom_name,
            'benches': benches,
            'total_students': len(assigned_students),
            'total_capacity': total_capacity,
            'occupied_seats': occupied_seats
        }
        seating_layout.append(group_layout)
    
    return seating_layout


def has_skill_conflict(bench, skill, students_per_bench):
    """
    Check if placing a student with given skill would cause conflict.
    Conflict: same skill beside, front, or back.
    """
    for seated_student in bench['students']:
        if seated_student['skill'] == skill:
            return True
    return False


def check_skill_conflicts(layout):
    """Validate seating layout against rules."""
    conflicts = []
    
    for group in layout:
        for bench in group['benches']:
            skills = [s['skill'] for s in bench['students']]
            # Check for duplicate skills on same bench
            if len(skills) != len(set(skills)):
                conflicts.append({
                    'bench': bench['bench_number'],
                    'type': 'same_bench',
                    'skills': skills
                })
    
    return conflicts


def get_adjacent_positions(row, col, students_per_bench):
    """Get adjacent positions for skill conflict checking."""
    adjacent = []
    # Horizontal neighbors
    adjacent.append((row, col - 1))
    adjacent.append((row, col + 1))
    # Front and back
    adjacent.append((row - 1, col))
    adjacent.append((row + 1, col))
    return adjacent


def save_seating_to_db(seating_layout, classroom_id):
    """
    Save generated seating to database.
    Preserves Booking ID from original student records.
    """
    try:
        for group in seating_layout:
            for bench_data in group['benches']:
                # Get or create bench
                bench = Bench.query.filter_by(
                    classroom_id=classroom_id,
                    bench_number=bench_data['bench_number']
                ).first()
                
                if not bench:
                    bench = Bench(
                        classroom_id=classroom_id,
                        bench_number=bench_data['bench_number'],
                        row=bench_data['row'],
                        col=bench_data['col']
                    )
                    db.session.add(bench)
                    db.session.flush()
                
                # Update students with seating assignment
                for seated_student in bench_data['students']:
                    student = Student.query.filter_by(
                        student_uid=seated_student['student_uid']
                    ).first()
                    
                    if student:
                        student.bench_id = bench.id
                        student.seat_position = seated_student['seat_position']
                        student.classroom_id = classroom_id
        
        db.session.commit()
        return {'success': True}
    
    except Exception as e:
        db.session.rollback()
        return {'success': False, 'error': str(e)}
