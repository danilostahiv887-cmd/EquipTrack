@echo off
setlocal EnableExtensions
chcp 65001 >nul

set "ROOT_DIR=%~dp0"
set "ENV_FILE=.env.local"

echo.
echo ============================================================
echo  EquipTrack - install and start
echo ============================================================
echo.

if not exist "%ROOT_DIR%package.json" (
  echo [ERROR] Cannot find package.json next to this launcher.
  echo Put run-equiptrack.bat in the EquipTrack project root.
  pause
  exit /b 1
)

cd /d "%ROOT_DIR%" || (
  echo [ERROR] Cannot enter application folder.
  pause
  exit /b 1
)

where node >nul 2>nul
if errorlevel 1 (
  echo [ERROR] Node.js is not installed or is not available in PATH.
  echo Install Node.js LTS, then run this file again:
  echo https://nodejs.org/
  pause
  exit /b 1
)

where npm >nul 2>nul
if errorlevel 1 (
  echo [ERROR] npm is not available in PATH.
  pause
  exit /b 1
)

if /I "%~1"=="--check-only" (
  echo [OK] Launcher paths and Node/npm availability are valid.
  echo App folder: %CD%
  exit /b 0
)

if not exist "%ENV_FILE%" (
  echo [INFO] Creating %ENV_FILE% from .env.example...
  copy ".env.example" "%ENV_FILE%" >nul
)

call :EnsureAuthSecret
if errorlevel 1 (
  echo [ERROR] Failed to prepare AUTH_SECRET in %ENV_FILE%.
  pause
  exit /b 1
)

echo.
echo [1/4] Installing dependencies...
call npm install
if errorlevel 1 (
  echo.
  echo [ERROR] Dependency installation failed.
  pause
  exit /b 1
)

call :HasSurrealConfig
if "%HAS_SURREAL_CONFIG%"=="1" (
  echo.
  echo [2/4] Preparing SurrealDB schema and seed data...
  call npm run setup
  if errorlevel 1 (
    echo.
    echo [ERROR] Database setup failed. Check SurrealDB values in:
    echo %CD%\%ENV_FILE%
    pause
    exit /b 1
  )
) else (
  echo.
  echo [2/4] SurrealDB credentials are not filled in %ENV_FILE%.
  echo The app will still start and show the setup screen.
  echo Fill SURREAL_URL, SURREAL_USERNAME and SURREAL_PASSWORD later, then run this file again.
)

echo.
echo [3/4] Building EquipTrack for production...
call npm run build
if errorlevel 1 (
  echo.
  echo [ERROR] Production build failed. The server was not started.
  pause
  exit /b 1
)

echo.
echo [4/4] Starting EquipTrack production server...
echo Local address: http://localhost:3000
echo Press Ctrl+C in this window to stop the server.
echo.

call npm run start
set "EXIT_CODE=%ERRORLEVEL%"

echo.
echo Server stopped with code %EXIT_CODE%.
pause
exit /b %EXIT_CODE%

:EnsureAuthSecret
node -e "const fs=require('fs'),crypto=require('crypto');const p='.env.local';let s=fs.readFileSync(p,'utf8');let lines=s.split(/\r?\n/);const has=lines.some(l=>l.startsWith('AUTH_SECRET=')&&l.slice('AUTH_SECRET='.length).trim());if(!has){let done=false;for(let i=0;i<lines.length;i++){if(lines[i].startsWith('AUTH_SECRET=')){lines[i]='AUTH_SECRET='+crypto.randomBytes(32).toString('hex');done=true;break;}}if(!done)lines.push('AUTH_SECRET='+crypto.randomBytes(32).toString('hex'));fs.writeFileSync(p,lines.join('\r\n'));console.log('[INFO] AUTH_SECRET generated in .env.local');}"
exit /b %ERRORLEVEL%

:HasSurrealConfig
set "HAS_SURREAL_CONFIG=0"
node -e "const fs=require('fs');const lines=fs.readFileSync('.env.local','utf8').split(/\r?\n/);const env={};for(const line of lines){const i=line.indexOf('=');if(i>0)env[line.slice(0,i).trim()]=line.slice(i+1).trim();}const ok=['SURREAL_URL','SURREAL_USERNAME','SURREAL_PASSWORD'].every(k=>env[k]);process.exit(ok?0:2);"
if not errorlevel 1 set "HAS_SURREAL_CONFIG=1"
exit /b 0
