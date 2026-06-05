import pymysql

try:
    conn = pymysql.connect(
        host="localhost",
        user="root",
        password="NewPassword123",
        database="grit_seating_dev",
        port=3306
    )

    print("SUCCESS: Connected to MySQL")
    conn.close()

except Exception as e:
    print("ERROR:", e)