"""Export seating data to CSV and Excel with Booking ID support."""

import pandas as pd
from io import StringIO
from app.models import Student, Classroom, Bench
from app.extensions import db


def export_to_csv(classroom_id):
    """
    Export seating data to CSV with Booking ID.
    Column order: Seat No | Bench No | Room | Booking ID | Student | Skill
    """
    try:
        # Get classroom
        classroom = Classroom.query.get(classroom_id)
        if not classroom:
            return {'success': False, 'error': 'Classroom not found'}
        
        # Get all students in this classroom with their bench assignments
        students = Student.query.filter_by(classroom_id=classroom_id).all()
        
        # Build export data
        export_data = []
        for student in students:
            bench = Bench.query.get(student.bench_id) if student.bench_id else None
            
            # Calculate seat number
            seat_no = f"{bench.bench_number}-{student.seat_position}" if bench else "Unassigned"
            
            export_data.append({
                'Seat No': seat_no,
                'Bench No': bench.bench_number if bench else 'N/A',
                'Room': classroom.name,
                'Booking ID': student.booking_id or 'N/A',
                'Student': student.student_name,
                'Skill': student.skill or 'N/A'
            })
        
        # Sort by bench number and seat position
        export_data.sort(key=lambda x: (
            int(x['Bench No']) if x['Bench No'].isdigit() else 0,
            int(x['Seat No'].split('-')[1]) if '-' in x['Seat No'] else 0
        ))
        
        # Create DataFrame
        df = pd.DataFrame(export_data)
        
        # Convert to CSV
        csv_buffer = StringIO()
        df.to_csv(csv_buffer, index=False)
        csv_data = csv_buffer.getvalue()
        
        return {
            'success': True,
            'data': csv_data,
            'filename': f'seating_{classroom.name.replace(" ", "_")}.csv'
        }
    
    except Exception as e:
        return {'success': False, 'error': str(e)}


def export_to_excel(classroom_id):
    """
    Export seating data to Excel with Booking ID.
    Column order: Seat No | Bench No | Room | Booking ID | Student | Skill
    """
    try:
        # Get classroom
        classroom = Classroom.query.get(classroom_id)
        if not classroom:
            return {'success': False, 'error': 'Classroom not found'}
        
        # Get all students in this classroom with their bench assignments
        students = Student.query.filter_by(classroom_id=classroom_id).all()
        
        # Build export data
        export_data = []
        for student in students:
            bench = Bench.query.get(student.bench_id) if student.bench_id else None
            
            # Calculate seat number
            seat_no = f"{bench.bench_number}-{student.seat_position}" if bench else "Unassigned"
            
            export_data.append({
                'Seat No': seat_no,
                'Bench No': bench.bench_number if bench else 'N/A',
                'Room': classroom.name,
                'Booking ID': student.booking_id or 'N/A',
                'Student': student.student_name,
                'Skill': student.skill or 'N/A'
            })
        
        # Sort by bench number and seat position
        export_data.sort(key=lambda x: (
            int(x['Bench No']) if x['Bench No'].isdigit() else 0,
            int(x['Seat No'].split('-')[1]) if '-' in x['Seat No'] else 0
        ))
        
        # Create DataFrame
        df = pd.DataFrame(export_data)
        
        # Convert to Excel
        excel_buffer = StringIO()
        df.to_excel(excel_buffer, index=False, engine='openpyxl')
        excel_data = excel_buffer.getvalue()
        
        return {
            'success': True,
            'data': excel_data,
            'filename': f'seating_{classroom.name.replace(" ", "_")}.xlsx'
        }
    
    except Exception as e:
        return {'success': False, 'error': str(e)}


def export_all_classrooms():
    """
    Export seating data for all classrooms with Booking ID.
    Column order: Seat No | Bench No | Room | Booking ID | Student | Skill
    """
    try:
        # Get all classrooms
        classrooms = Classroom.query.all()
        
        # Build export data for all classrooms
        export_data = []
        for classroom in classrooms:
            students = Student.query.filter_by(classroom_id=classroom.id).all()
            
            for student in students:
                bench = Bench.query.get(student.bench_id) if student.bench_id else None
                
                # Calculate seat number
                seat_no = f"{bench.bench_number}-{student.seat_position}" if bench else "Unassigned"
                
                export_data.append({
                    'Seat No': seat_no,
                    'Bench No': bench.bench_number if bench else 'N/A',
                    'Room': classroom.name,
                    'Booking ID': student.booking_id or 'N/A',
                    'Student': student.student_name,
                    'Skill': student.skill or 'N/A'
                })
        
        # Sort by room, bench number, and seat position
        export_data.sort(key=lambda x: (
            x['Room'],
            int(x['Bench No']) if x['Bench No'].isdigit() else 0,
            int(x['Seat No'].split('-')[1]) if '-' in x['Seat No'] else 0
        ))
        
        # Create DataFrame
        df = pd.DataFrame(export_data)
        
        # Convert to CSV
        csv_buffer = StringIO()
        df.to_csv(csv_buffer, index=False)
        csv_data = csv_buffer.getvalue()
        
        return {
            'success': True,
            'data': csv_data,
            'filename': 'seating_all_classrooms.csv'
        }
    
    except Exception as e:
        return {'success': False, 'error': str(e)}
