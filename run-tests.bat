@echo off
REM Script para executar testes do MusicCollab no Windows
REM Uso: run-tests.bat [backend|frontend|all|coverage]

setlocal enabledelayedexpansion

set ARG=%1
if "%ARG%"=="" set ARG=all

echo.
echo ========================================
echo MusicCollab - Executando Testes
echo ========================================
echo.

if "%ARG%"=="backend" goto backend
if "%ARG%"=="frontend" goto frontend
if "%ARG%"=="coverage" goto coverage
if "%ARG%"=="all" goto all

echo Uso: %0 [backend^|frontend^|all^|coverage]
echo.
echo Opcoes:
echo   backend   - Executa apenas testes do backend
echo   frontend  - Executa apenas testes do frontend
echo   all       - Executa todos os testes (padrao)
echo   coverage  - Executa testes com relatorio de cobertura
goto end

:backend
echo [BACKEND] Executando testes...
cd server
call npm test
cd ..
echo.
echo [OK] Testes do backend concluidos!
goto end

:frontend
echo [FRONTEND] Executando testes...
cd client
set CI=true
call npm test -- --watchAll=false
cd ..
echo.
echo [OK] Testes do frontend concluidos!
goto end

:coverage
echo [COVERAGE] Executando testes com cobertura...
echo.
echo [1/2] Backend...
cd server
call npm run test:coverage
cd ..
echo.
echo [2/2] Frontend...
cd client
set CI=true
call npm test -- --coverage --watchAll=false
cd ..
echo.
echo [OK] Relatorios de cobertura gerados!
echo Backend: server\coverage\index.html
echo Frontend: client\coverage\lcov-report\index.html
goto end

:all
echo [ALL] Executando todos os testes...
echo.
call :backend
echo.
call :frontend
echo.
echo [OK] Todos os testes concluidos!
goto end

:end
endlocal

