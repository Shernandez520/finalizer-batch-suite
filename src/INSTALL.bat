@echo off
setlocal EnableExtensions
rem =========================================================================
rem  INSTALL.bat - adds FINALIZER to your right-click "Send to" menu.
rem  No admin rights needed: it only creates a shortcut in your own
rem  Send to folder. Keep FINALIZER.bat and FINALIZER.jsx together in the
rem  folder you install from - the shortcut points there.
rem =========================================================================
set "FZ_TARGET=%~dp0FINALIZER.bat"
if not exist "%FZ_TARGET%" (
    echo FINALIZER.bat must be in the same folder as INSTALL.bat.
    pause
    exit /b 1
)
if not exist "%~dp0FINALIZER.jsx" (
    echo FINALIZER.jsx must be in the same folder as INSTALL.bat.
    pause
    exit /b 1
)

powershell -NoLogo -NoProfile -Command "$t=$env:FZ_TARGET; $s=Join-Path ([Environment]::GetFolderPath('SendTo')) 'FINALIZER.lnk'; $w=New-Object -ComObject WScript.Shell; $l=$w.CreateShortcut($s); $l.TargetPath=$t; $l.WorkingDirectory=Split-Path $t; $l.IconLocation='shell32.dll,13'; $l.Save(); Write-Host ('Shortcut created: ' + $s)"
if errorlevel 1 (
    echo The shortcut couldn't be created.
    pause
    exit /b 1
)
echo.
echo Done. Right-click a GR#####_LR##### project folder and choose Send to, then FINALIZER.
echo To uninstall, delete FINALIZER from your Send to folder: press Win+R and type shell:sendto
echo.
pause
