"""CSV parsing and validation with Booking ID support."""

import pandas as pd
from io import StringIO


REQUIRED_COLUMNS = [
    "Student UID",
    "Student Name",
    "Skill",
]

OPTIONAL_COLUMNS = [
    "Booking ID",
    "NIAT ID",
    "Campus",
    "Slot Centre",
    "Batch",
    "Section",
    "Contest Date",
    "Time Slot",
    "Skill Level",
]


def validate_columns(headers):
    """Validate that CSV contains required columns."""
    headers_lower = [h.lower().strip() for h in headers]
    missing = []
    for required in REQUIRED_COLUMNS:
        if required.lower() not in headers_lower:
            missing.append(required)
    return missing


def parse_csv(file_stream):
    """
    Parse uploaded CSV and return validated student records.
    Preserves Booking ID from CSV if present.
    """
    try:
        # Read CSV file
        df = pd.read_csv(file_stream)

        # Validate columns
        missing_columns = validate_columns(df.columns.tolist())
        if missing_columns:
            return {
                "success": False,
                "error": f"Missing required columns: {', '.join(missing_columns)}",
                "data": None
            }

        # Normalize column names (case-insensitive matching)
        column_map = {}
        for col in df.columns:
            col_lower = col.lower().strip()
            for standard_col in REQUIRED_COLUMNS + OPTIONAL_COLUMNS:
                if standard_col.lower() == col_lower:
                    column_map[col] = standard_col
                    break
            else:
                # Keep original column name if not in standard list
                column_map[col] = col

        df = df.rename(columns=column_map)

        # Convert to list of dictionaries
        records = []
        for idx, row in df.iterrows():
            record = {
                "_rowIndex": idx,
                "Booking ID": row.get("Booking ID", None),  # Will be None if column doesn't exist
                "Student UID": row.get("Student UID", ""),
                "Student Name": row.get("Student Name", ""),
                "NIAT ID": row.get("NIAT ID", ""),
                "Campus": row.get("Campus", ""),
                "Slot Centre": row.get("Slot Centre", ""),
                "Batch": row.get("Batch", ""),
                "Section": row.get("Section", ""),
                "Contest Date": row.get("Contest Date", ""),
                "Time Slot": row.get("Time Slot", ""),
                "Skill": row.get("Skill", ""),
                "Skill Level": row.get("Skill Level", ""),
            }
            records.append(record)

        return {
            "success": True,
            "data": records,
            "total": len(records)
        }

    except Exception as e:
        return {
            "success": False,
            "error": f"Error parsing CSV: {str(e)}",
            "data": None
        }


def validate_empty_values(records):
    """
    Check for empty values in required fields.
    Returns list of rows with empty values.
    """
    empty_value_rows = []
    for record in records:
        empty_fields = []
        if not record.get("Student UID", "").strip():
            empty_fields.append("Student UID")
        if not record.get("Student Name", "").strip():
            empty_fields.append("Student Name")
        if not record.get("Skill", "").strip():
            empty_fields.append("Skill")

        if empty_fields:
            empty_value_rows.append({
                "rowIndex": record["_rowIndex"],
                "fields": empty_fields
            })

    return empty_value_rows


def check_duplicate_uids(records):
    """
    Check for duplicate Student UIDs.
    Returns list of duplicate UIDs.
    """
    uid_map = {}
    duplicates = []
    for record in records:
        uid = record.get("Student UID", "").strip()
        if uid:
            if uid in uid_map:
                if uid not in duplicates:
                    duplicates.append(uid)
            else:
                uid_map[uid] = True
    return duplicates
