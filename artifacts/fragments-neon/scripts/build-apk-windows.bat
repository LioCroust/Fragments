@echo off
setlocal

set "APP_DIR=%~dp0.."
for %%I in ("%APP_DIR%\..\..") do set "REPO_DIR=%%~fI"

echo.
echo [1/3] Installation des dependances du monorepo...
pushd "%REPO_DIR%"
call pnpm install --frozen-lockfile
if errorlevel 1 (
  echo.
  echo Echec de pnpm install.
  popd
  exit /b 1
)

echo.
echo [2/3] Compilation de l'APK release...
pushd "%APP_DIR%\android"
call gradlew.bat assembleRelease
if errorlevel 1 (
  echo.
  echo Echec de la compilation Gradle.
  popd
  popd
  exit /b 1
)
popd

echo.
echo [3/3] Copie de l'APK...
copy /Y "%APP_DIR%\android\app\build\outputs\apk\release\app-release.apk" "%APP_DIR%\Fragments-Neon-release.apk" >nul
if errorlevel 1 (
  echo Impossible de copier l'APK final.
  popd
  exit /b 1
)
popd

echo.
echo APK cree :
echo %APP_DIR%\Fragments-Neon-release.apk
echo.
pause