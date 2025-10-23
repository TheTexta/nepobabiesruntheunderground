@echo off
setlocal EnableExtensions EnableDelayedExpansion

:: Usage: add_numbered_images.bat "C:\path\to\UNNUMBERED" "C:\path\to\NUMBERED"
if "%~2"=="" (
  echo Usage: %~nx0 "SourceFolderWithUnnumberedImages" "DestFolderWithNumberedImages"
  exit /b 1
)

set "SRC=%~1"
set "DST=%~2"

if not exist "%SRC%" (echo [ERROR] Source folder not found: "%SRC%" & exit /b 1)
if not exist "%DST%" (echo [ERROR] Dest folder not found: "%DST%" & exit /b 1)

:: ---- 1) Find the current greatest numeric filename in DEST (basename-only numeric) ----
set "max=0"
for %%E in (jpg jpeg png gif webp bmp tif tiff) do (
  for %%F in ("%DST%\*.%%E") do (
    set "name=%%~nF"
    :: If name contains only digits, consider it:
    for /f "delims=0123456789" %%A in ("!name!") do set "NON=%%A"
    if "!NON!"=="" (
      set /a N=!name!
      if !N! gtr !max! set "max=!N!"
    )
  )
)

:: ---- 2) Move and rename from SRC -> DST, numbering as (max + 1, max + 2, ...) ----
set "moved_any=0"
for %%E in (jpg jpeg png gif webp bmp tif tiff JPG JPEG PNG GIF WEBP BMP TIF TIFF) do (
  for %%F in ("%SRC%\*.%%E") do (
    set /a max+=1
    set "ext=%%~xF"
    call :findNextFree
    echo Moving "%%~nxF"  ^>  "!max!!ext!"
    move /y "%%~fF" "!NEWPATH!" >nul
    set "moved_any=1"
  )
)

if "!moved_any!"=="0" (
  echo [INFO] No matching image files found in "%SRC%".
)

echo Done.
exit /b 0


:: ---- Subroutine: bump 'max' until "<DST>\max<ext>" is unused; sets NEWPATH ----
:findNextFree
set "NEWPATH=%DST%\!max!!ext!"
if exist "!NEWPATH!" (
  set /a max+=1
  goto :findNextFree
)
exit /b
