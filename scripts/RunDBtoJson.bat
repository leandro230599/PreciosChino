@echo off
chcp 65001 >nul
cd /d "%~dp0"
python RunDBtoJson.py %*
echo.
pause
