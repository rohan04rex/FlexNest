@echo off
echo =========================================
echo   Starting Flexnest Development Servers
echo =========================================

echo.
echo [1] Starting Node.js Backend Server...
start "Flexnest Backend" cmd /k "cd backend && npm start"

echo [2] Starting React Admin Panel...
start "Flexnest Admin Panel" cmd /k "cd admin-panel && npm run dev"

echo.
echo Both servers have been launched in new terminal windows!
echo You can now close this console window.
exit
