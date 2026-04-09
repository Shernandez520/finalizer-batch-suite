@echo off
setlocal ENABLEDELAYEDEXPANSION

REM =====================================================
REM FINALIZER.bat (Option A - Final Version)
REM Illustrator is explicitly told to run the launcher script.
REM =====================================================

REM Illustrator path
set "ILLUSTRATOR_EXE=C:\Program Files\Adobe\Adobe Illustrator 2026\Support Files\Contents\Windows\Illustrator.exe"

REM Launcher script path
set "LAUNCHER=C:\Scripts\FINALIZER_Launcher.jsx"

REM 1) Get job folder from Send-To
if "%~1"=="" (
    echo No folder passed. Use "Send to -> FINALIZER" on a job folder.
    pause
    exit /b 1
)

set "JOBFOLDER=%~1"

REM 2) Validate folder exists
if not exist "%JOBFOLDER%" (
    echo "%JOBFOLDER%" is not a valid folder.
    pause
    exit /b 1
)

REM 3) Extract job name
for %%J in ("%JOBFOLDER%") do set "JOBNAME=%%~nJ"

echo Job folder: "%JOBFOLDER%"
echo Job name: "%JOBNAME%"
echo.

REM 4) Find highest PROOF# folder
set "HIGHESTPROOF="
set "HIGHESTNUM=0"

for /d %%P in ("%JOBFOLDER%\PROOF*") do (
    set "PNAME=%%~nP"
    set "PNUM=!PNAME:PROOF=!"
    for /f "delims=0123456789" %%X in ("!PNUM!") do set "PNUM="
    if not "!PNUM!"=="" (
        if !PNUM! GTR !HIGHESTNUM! (
            set "HIGHESTNUM=!PNUM!"
            set "HIGHESTPROOF=%%P"
        )
    )
)

if "%HIGHESTPROOF%"=="" (
    echo No PROOF# folders found.
    pause
    exit /b 1
)

echo Highest PROOF folder: "%HIGHESTPROOF%"
echo.

REM 5) Create FINAL folder
set "FINALFOLDER=%JOBFOLDER%\FINAL"

if exist "%FINALFOLDER%" (
    echo FINAL folder already exists.
) else (
    echo Creating FINAL folder...
    robocopy "%HIGHESTPROOF%" "%FINALFOLDER%" /E /NFL /NDL /NJH /NJS /NC /NS >nul

    if not exist "%FINALFOLDER%" (
        echo Failed to create FINAL folder.
        pause
        exit /b 1
    )
)

echo FINAL folder ready: "%FINALFOLDER%"
echo.

REM 6) Cleanup old ZIP + log (NOT the flag)
del /Q "%FINALFOLDER%\*.zip" >nul 2>&1
del /Q "%FINALFOLDER%\FINALIZER_LOG.txt" >nul 2>&1

REM 7) Open PDFs in Illustrator
echo Opening PDFs in Illustrator...
set "PDFCOUNT=0"
for %%F in ("%FINALFOLDER%\*.pdf") do (
    set /a PDFCOUNT+=1
    start "" "%ILLUSTRATOR_EXE%" "%%F"
)

if %PDFCOUNT%==0 (
    echo No PDFs found in FINAL.
    pause
    exit /b 1
)

echo %PDFCOUNT% PDF(s) opened.
echo.

REM 8) Tell Illustrator to run the launcher script
echo Running launcher script in Illustrator...
start "" "%ILLUSTRATOR_EXE%" -run "%LAUNCHER%"
echo.

REM 9) Wait for DONE flag
echo Waiting for Illustrator to finish...
:WAIT_DONE
if exist "%FINALFOLDER%\FINALIZER_DONE.flag" goto DONE
ping 127.0.0.1 -n 2 >nul
goto WAIT_DONE

:DONE
echo Illustrator processing complete.
echo.

REM 10) Final cleanup: remove AI files from FINAL
del /Q "%FINALFOLDER%\*.ai" >nul 2>&1

REM 11) Create FINAL ZIP (PDFs only, with retry logic)
set "ZIPPATH=%FINALFOLDER%\%JOBNAME%_FINAL.zip"

echo Creating ZIP...

set "RETRYCOUNT=0"
:ZIP_RETRY
powershell -NoLogo -NoProfile -Command ^
 "try { Compress-Archive -Path '%FINALFOLDER%\*.pdf' -DestinationPath '%ZIPPATH%' -Force -ErrorAction Stop } catch { exit 1 }"

if exist "%ZIPPATH%" (
    echo ZIP created: "%ZIPPATH%"
) else (
    set /a RETRYCOUNT+=1
    if %RETRYCOUNT% LEQ 5 (
        echo ZIP failed, retrying in 2 seconds...
        ping 127.0.0.1 -n 3 >nul
        goto ZIP_RETRY
    ) else (
        echo ZIP creation failed after 5 attempts.
    )
)
echo.

REM 12) Write log
set "LOGFILE=%FINALFOLDER%\FINALIZER_LOG.txt"
echo FINALIZER LOG > "%LOGFILE%"
echo Job: %JOBNAME% >> "%LOGFILE%"
echo Source PROOF: %HIGHESTPROOF% >> "%LOGFILE%"
echo FINAL folder: %FINALFOLDER% >> "%LOGFILE%"
if exist "%ZIPPATH%" (
    echo ZIP: %ZIPPATH% >> "%LOGFILE%"
) else (
    echo ZIP: FAILED TO CREATE >> "%LOGFILE%"
)
echo PDFs processed: %PDFCOUNT% >> "%LOGFILE%"
echo Completed: %DATE% %TIME% >> "%LOGFILE%"

echo FINALIZER complete.
echo Log written to: "%LOGFILE%"
echo.

REM 13) Delete the flag file created by Illustrator
del /Q "%FINALFOLDER%\FINALIZER_DONE.flag" >nul 2>&1

endlocal
exit /b 0