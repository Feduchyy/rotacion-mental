@echo off
rem Abre el panel de resultados con los datos del proyecto (muestras/ y resultados de la IA).
rem Deja esta ventana abierta mientras uses el panel; para terminar, ciérrala.
cd /d "%~dp0"
python servir.py --panel
if errorlevel 1 pause
