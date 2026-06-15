@echo off
REM Build automation script for Render deployment (Windows)
REM This script builds the frontend and copies it to the backend static folder

echo ==========================================
echo Building frontend production bundle...
echo ==========================================

cd frontend
call npm run build

if errorlevel 1 (
    echo Frontend build failed!
    exit /b 1
)

echo Frontend build completed successfully!
echo ==========================================
echo Copying frontend\dist to backend\app\static...
echo ==========================================

REM Remove existing static folder contents
rd /s /q ..\backend\app\static 2>nul
mkdir ..\backend\app\static

REM Copy new build
xcopy dist ..\backend\app\static /E /I /Y

if errorlevel 1 (
    echo Failed to copy frontend build to backend!
    exit /b 1
)

echo Build and copy completed successfully!
echo ==========================================
