@echo off
setlocal EnableExtensions EnableDelayedExpansion
chcp 65001 >nul
title FINALIZER

rem =========================================================================
rem  FINALIZER.bat                                                     v2.0
rem  Right-click a GR#####_LR##### project folder > Send to > FINALIZER
rem
rem   1. finds the highest PROOF# folder and copies it to FINAL
rem   2. deletes the .zip that came along from the proof
rem   3. has Illustrator (FINALIZER.jsx) export PNGs, hide BACKGROUND layers,
rem      save and close - one PDF at a time
rem   4. zips the PDFs as <project>_FINAL.zip and checks the zip
rem
rem  Nothing else is written to FINAL. The log goes to
rem  %LOCALAPPDATA%\FINALIZER\logs and the hand-off files to %TEMP%\FINALIZER,
rem  both outside Dropbox. No admin rights needed.
rem =========================================================================

rem ----- Settings ----------------------------------------------------------
rem Leave blank to use the newest installed Illustrator automatically.
set "ILLUSTRATOR_EXE="
rem Minutes to wait for Illustrator to finish all files.
set "TIMEOUT_MIN=20"
rem Seconds to wait for Illustrator to start the script (cold starts are slow).
set "START_WAIT_SEC=180"
rem -------------------------------------------------------------------------

set "HERE=%~dp0"
set "JSX=%HERE%FINALIZER.jsx"
rem Illustrator finds the temp folder the same way: TMP first, then TEMP.
set "WORK=%TEMP%\FINALIZER"
if defined TMP set "WORK=%TMP%\FINALIZER"
set "LOGDIR=%LOCALAPPDATA%\FINALIZER\logs"
set "LOCKED=0"
set "JOBWRITTEN=0"
set "LOG="

if not exist "%WORK%\" mkdir "%WORK%" >nul 2>&1
if not exist "%LOGDIR%\" mkdir "%LOGDIR%" >nul 2>&1

rem ----- 1. Check what we were given --------------------------------------
if "%~1"=="" (
    set "ERR=No folder was passed in. Right-click a GR#####_LR##### project folder and choose Send to > FINALIZER."
    goto :fatal
)
set "JOBFOLDER=%~f1"
if "!JOBFOLDER:~-1!"=="\" set "JOBFOLDER=!JOBFOLDER:~0,-1!"
if not exist "!JOBFOLDER!\" (
    set "ERR=This isn't a folder: !JOBFOLDER!"
    goto :fatal
)
for %%J in ("!JOBFOLDER!") do set "JOBNAME=%%~nxJ"

for /f %%T in ('powershell -NoLogo -NoProfile -Command "Get-Date -Format yyyyMMdd-HHmmss"') do set "STAMP=%%T"
if not defined STAMP set "STAMP=%RANDOM%"
set "LOG=%LOGDIR%\!JOBNAME!_!STAMP!.log"

set "M=FINALIZER v2.0" & call :say
if not "%~2"=="" (
    echo NOTE: Several folders were sent. FINALIZER handles one project at a time - only the first one is processed.
)
set "M=Project: !JOBNAME!" & call :say
set "M=Folder:  !JOBFOLDER!" & call :say
echo.

if not exist "!JSX!" (
    set "ERR=FINALIZER.jsx is missing. It must be in the same folder as FINALIZER.bat: !HERE!"
    goto :fatal
)

rem Sending the wrong folder (FINAL, a PROOF folder...) is the easiest mistake.
set "NAMEOK=0"
if /i "!JOBNAME:~0,2!"=="GR" if not "!JOBNAME:_LR=!"=="!JOBNAME!" set "NAMEOK=1"
if "!NAMEOK!"=="0" (
    echo "!JOBNAME!" doesn't look like a GR#####_LR##### project folder.
    choice /c YN /n /m "Run FINALIZER on it anyway? [Y/N] "
    if errorlevel 2 goto :cancelled
    set "M=Name check overridden by user." & call :say
)

rem ----- 2. Find the highest PROOF# folder ---------------------------------
set "HIGHESTPROOF="
set "HIGHESTNAME="
set "HIGHESTNUM=-1"
for /d %%P in ("!JOBFOLDER!\PROOF*") do (
    set "PNAME=%%~nxP"
    set "PNUM=!PNAME:~5!"
    if defined PNUM set "PNUM=!PNUM: =!"
    set "NONDIGIT="
    if defined PNUM for /f "delims=0123456789" %%X in ("!PNUM!") do set "NONDIGIT=1"
    if defined PNUM if not defined NONDIGIT (
        rem Drop leading zeros so PROOF08 isn't read as an octal number.
        for /f "tokens=* delims=0" %%Z in ("!PNUM!") do set "PNUM=%%Z"
        if "!PNUM:0=!"=="" set "PNUM=0"
        if !PNUM! GTR !HIGHESTNUM! (
            set "HIGHESTNUM=!PNUM!"
            set "HIGHESTPROOF=%%~fP"
            set "HIGHESTNAME=%%~nxP"
        )
    )
)
if not defined HIGHESTPROOF (
    set "ERR=No PROOF# folders were found in !JOBNAME!."
    goto :fatal
)
set "M=Highest proof: !HIGHESTNAME!" & call :say

rem ----- 3. Make sure only one FINALIZER runs at a time --------------------
mkdir "%WORK%\running.lock" >nul 2>&1
if errorlevel 1 (
    echo.
    echo Another FINALIZER run seems to be in progress, or an earlier run was closed early.
    choice /c YN /n /m "Continue anyway? [Y/N] "
    if errorlevel 2 goto :cancelled
)
set "LOCKED=1"

rem ----- 4. Create FINAL from the highest proof ----------------------------
set "FINALFOLDER=!JOBFOLDER!\FINAL"
if exist "!FINALFOLDER!\" (
    echo.
    echo This project already has a FINAL folder.
    echo   [R] Rebuild it from !HIGHESTNAME!. The current FINAL is deleted - you can restore it from Dropbox's deleted files if needed.
    echo   [C] Cancel and leave everything as it is.
    choice /c RC /n /m "Choose R or C: "
    if errorlevel 2 goto :cancelled
    rd /s /q "!FINALFOLDER!" >nul 2>&1
    if exist "!FINALFOLDER!\" (
        set "ERR=The old FINAL folder couldn't be removed. Close any files open from it and try again."
        goto :fatal
    )
    set "M=Old FINAL removed - rebuilding." & call :say
)

set "M=Copying !HIGHESTNAME! to FINAL..." & call :say
robocopy "!HIGHESTPROOF!" "!FINALFOLDER!" /E /R:3 /W:2 /NFL /NDL /NJH /NJS /NC /NS /NP >nul
if errorlevel 8 (
    set "ERR=Copying !HIGHESTNAME! to FINAL failed. Robocopy error code: !errorlevel!"
    goto :fatal
)

rem The proof's zip must not travel into FINAL.
del /q "!FINALFOLDER!\*.zip" >nul 2>&1

set "PDFCOUNT=0"
for %%F in ("!FINALFOLDER!\*.pdf") do set /a PDFCOUNT+=1
if "!PDFCOUNT!"=="0" (
    set "ERR=There are no PDFs in FINAL. Check !HIGHESTNAME!."
    goto :fatal
)
set "M=PDFs to process: !PDFCOUNT!" & call :say

rem ----- 5. Hand the job to Illustrator ------------------------------------
if not defined ILLUSTRATOR_EXE call :findIllustrator
if not defined ILLUSTRATOR_EXE (
    set "ERR=Adobe Illustrator wasn't found. Set ILLUSTRATOR_EXE at the top of FINALIZER.bat."
    goto :fatal
)
if not exist "!ILLUSTRATOR_EXE!" (
    set "ERR=Illustrator isn't at: !ILLUSTRATOR_EXE!"
    goto :fatal
)

set "RUNID=%RANDOM%%RANDOM%%RANDOM%"
set "RESULT=%WORK%\result_!RUNID!.txt"
set "STARTED=%WORK%\started_!RUNID!.txt"
set "PROGRESS=%WORK%\progress_!RUNID!.txt"
> "%WORK%\job.txt" echo(RUNID=!RUNID!
>> "%WORK%\job.txt" echo(FINAL=!FINALFOLDER!
set "JOBWRITTEN=1"

set "M=Starting Illustrator..." & call :say
start "" "!ILLUSTRATOR_EXE!" -run "!JSX!"

set /a "MAXTICKS=TIMEOUT_MIN*60/2"
set /a "STARTTICKS=START_WAIT_SEC/2"
set "TICKS=0"
:wait
if exist "!RESULT!" goto :gotResult
set /a TICKS+=1
if not exist "!STARTED!" if !TICKS! GEQ !STARTTICKS! (
    set "ERR=Illustrator didn't start the FINALIZER script within !START_WAIT_SEC! seconds. If a dialog is open in Illustrator, close it and run FINALIZER again."
    goto :fatal
)
if !TICKS! GEQ !MAXTICKS! (
    set "ERR=Illustrator didn't finish within !TIMEOUT_MIN! minutes. Nothing was zipped."
    goto :fatal
)
if exist "!PROGRESS!" (
    set "PROG="
    set /p PROG=<"!PROGRESS!" 2>nul
    if defined PROG title FINALIZER - !PROG!
)
ping -n 3 127.0.0.1 >nul
goto :wait

:gotResult
title FINALIZER
echo.
set "OKCOUNT=0"
set "FAILCOUNT=0"
set "ENDSEEN=0"
for /f "usebackq tokens=1,2,* delims=|" %%A in ("!RESULT!") do (
    if "%%A"=="OK" (
        set /a OKCOUNT+=1
        set "M=  OK      %%B  -  %%C" & call :say
    )
    if "%%A"=="FAIL" (
        set /a FAILCOUNT+=1
        set "M=  FAILED  %%B  -  %%C" & call :say
    )
    if "%%A"=="END" if "%%B"=="!RUNID!" set "ENDSEEN=1"
)
echo.
if "!ENDSEEN!"=="0" (
    set "ERR=Illustrator's result file was incomplete. Nothing was zipped."
    goto :fatal
)
if not "!FAILCOUNT!"=="0" (
    set "ERR=!FAILCOUNT! file(s) failed in Illustrator, so nothing was zipped. Fix them and run FINALIZER again - choose R to rebuild."
    goto :fatal
)
if not "!OKCOUNT!"=="!PDFCOUNT!" (
    set "ERR=Illustrator finished !OKCOUNT! of !PDFCOUNT! PDFs. Nothing was zipped."
    goto :fatal
)

rem ----- 6. Zip the PDFs ---------------------------------------------------
set "ZIPPATH=!FINALFOLDER!\!JOBNAME!_FINAL.zip"
set "FZ_FINAL=!FINALFOLDER!"
set "FZ_ZIP=!ZIPPATH!"
set "M=Creating !JOBNAME!_FINAL.zip..." & call :say
rem Zips the PDFs only, retries while Dropbox has files locked, and checks
rem that the zip holds exactly one entry per PDF.
powershell -NoLogo -NoProfile -Command "$f=$env:FZ_FINAL; $z=$env:FZ_ZIP; $p=@(Get-ChildItem -LiteralPath $f -Filter *.pdf -File); if ($p.Count -eq 0) { exit 3 }; Add-Type -AssemblyName System.IO.Compression.FileSystem; for ($i=1; $i -le 5; $i++) { try { if (Test-Path -LiteralPath $z) { Remove-Item -LiteralPath $z -Force }; Compress-Archive -LiteralPath $p.FullName -DestinationPath $z -ErrorAction Stop; $a=[IO.Compression.ZipFile]::OpenRead($z); $n=$a.Entries.Count; $a.Dispose(); if ($n -eq $p.Count) { exit 0 } } catch { }; Start-Sleep -Seconds 2 }; exit 1"
if errorlevel 1 (
    set "ERR=The zip couldn't be created or didn't contain every PDF. The processed PDFs and PNGs are in FINAL - zip them by hand or run again."
    goto :fatal
)

set "M=Zip OK: !ZIPPATH!" & call :say
echo.
set "M=FINALIZER complete: !OKCOUNT! PDF(s), !OKCOUNT! PNG(s), 1 zip." & call :say
call :cleanup
echo.
echo Log: !LOG!
echo This window closes in 20 seconds. Press any key to close it now.
timeout /t 20 >nul 2>&1
endlocal
exit /b 0

rem =========================================================================
rem  Helpers
rem =========================================================================

:say
rem Prints the message in M and adds it to the log. Using a variable (not a
rem call argument) keeps &, %, ^ and ! in file names from being mangled.
echo(!M!
if defined LOG >> "!LOG!" echo(!M!
exit /b 0

:findIllustrator
rem Picks the installed Illustrator with the highest year in its folder name.
set "BESTYEAR=0"
set "FALLBACK="
for /d %%D in ("%ProgramFiles%\Adobe\Adobe Illustrator*") do (
    if exist "%%~fD\Support Files\Contents\Windows\Illustrator.exe" (
        set "DN=%%~nxD"
        set "YR=!DN:~-4!"
        set "NOND="
        for /f "delims=0123456789" %%X in ("!YR!") do set "NOND=1"
        if not defined FALLBACK set "FALLBACK=%%~fD\Support Files\Contents\Windows\Illustrator.exe"
        if not defined NOND if !YR! GTR !BESTYEAR! (
            set "BESTYEAR=!YR!"
            set "ILLUSTRATOR_EXE=%%~fD\Support Files\Contents\Windows\Illustrator.exe"
        )
    )
)
if not defined ILLUSTRATOR_EXE if defined FALLBACK set "ILLUSTRATOR_EXE=!FALLBACK!"
exit /b 0

:cleanup
if "!JOBWRITTEN!"=="1" del /q "%WORK%\job.txt" >nul 2>&1
if defined RUNID (
    del /q "%WORK%\result_!RUNID!.txt" >nul 2>&1
    del /q "%WORK%\started_!RUNID!.txt" >nul 2>&1
    del /q "%WORK%\progress_!RUNID!.txt" >nul 2>&1
)
if "!LOCKED!"=="1" rd "%WORK%\running.lock" >nul 2>&1
exit /b 0

:cancelled
set "M=Cancelled." & call :say
call :cleanup
timeout /t 5 >nul 2>&1
endlocal
exit /b 2

:fatal
title FINALIZER - STOPPED
echo.
set "M=STOPPED: !ERR!" & call :say
call :cleanup
if defined LOG echo Log: !LOG!
echo.
pause
endlocal
exit /b 1
