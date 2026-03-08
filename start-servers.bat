@echo off
echo Starting Backend and Frontend...
start "Backend" cmd /k "cd /d %~dp0backend && npm run dev"
timeout /t 3 /nobreak > nul
start "Frontend" cmd /k "cd /d %~dp0frontend && npm run dev"
echo.
echo Both servers are starting in new windows.
echo Backend:  http://localhost:5000
echo Frontend: http://localhost:5173
echo.
echo Open http://localhost:5173 in your browser.
pause
