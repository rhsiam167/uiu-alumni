@echo off
echo Starting UIU Alumni Portal...
cd /d "%~dp0backend"
start "" cmd /c "timeout /t 4 >nul & start http://localhost:5000"
npm run dev