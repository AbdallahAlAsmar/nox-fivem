@echo off
rem Linker wrapper for MSVC link.exe to filter duplicate .rcgu.o arguments
rem This works around Rust 1.79+ codegen bug where build scripts pass duplicate object files
rem See: https://github.com/rust-lang/rust/issues/128000

setlocal enabledelayedexpansion

set "FILTERED_ARGS="
set "SEEN_RCGU="

:parse_loop
if "%~1"=="" goto :run_link
set "ARG=%~1"

rem Check if this is a .rcgu.o file from a build script
echo !ARG! | findstr /R /C:"\.rcgu\.o$" >nul
if !ERRORLEVEL! EQU 0 (
    rem This is a .rcgu.o file - check if it's from a build script
    echo !ARG! | findstr /R /C:"build_script_build" >nul
    if !ERRORLEVEL! EQU 0 (
        rem This is a build script .rcgu.o file - check for duplicates
        echo !SEEN_RCGU! | findstr /C:"!ARG!" >nul
        if !ERRORLEVEL! EQU 0 (
            rem Already seen - skip this duplicate
            echo [link-wrapper] Skipping duplicate: !ARG!
            shift
            goto :parse_loop
        )
        rem First time seeing this file - keep it
        set "SEEN_RCGU=!SEEN_RCGU! !ARG!"
    )
)

set "FILTERED_ARGS=!FILTERED_ARGS! %~1"
shift
goto :parse_loop

:run_link
rem Call the real link.exe with filtered arguments
link.exe %FILTERED_ARGS%
exit /b %ERRORLEVEL%
