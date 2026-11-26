@echo off
chcp 65001 >nul
cd /d "%~dp0"
python RunDBtoJson.py %*
echo.
cd C:\Users\Administrator\Desktop\Precios\PreciosChino
git add .
git commit -m "Actualizacion automatica"
git push
