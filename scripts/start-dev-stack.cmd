@echo off
setlocal

powershell.exe -ExecutionPolicy Bypass -File "%~dp0start-dev-stack.ps1" %*

endlocal
