#Requires -Version 5.1
<#
.SYNOPSIS
  Install Grok Agent on this PC like Gaming Agent:
  - npm deps if needed
  - Desktop shortcuts
  - Auto-start server at Windows login (Startup folder)
  - Start now

.EXAMPLE
  powershell -ExecutionPolicy Bypass -File .\Install-Grok-Agent.ps1

.EXAMPLE
  powershell -ExecutionPolicy Bypass -File .\Install-Grok-Agent.ps1 -Uninstall
#>
param(
  [switch]$Uninstall,
  [switch]$NoStart
)

$ErrorActionPreference = 'Continue'
$AgentRoot = Split-Path -Parent $MyInvocation.MyCommand.Path
$StartupDir = [Environment]::GetFolderPath('Startup')
$StartupLnk = Join-Path $StartupDir 'Grok Agent.lnk'
$Desktop = [Environment]::GetFolderPath('Desktop')
if (-not (Test-Path $Desktop)) {
  $Desktop = Join-Path $env:USERPROFILE 'OneDrive\Desktop'
}

function Write-Step($msg) { Write-Host "  $msg" -ForegroundColor Cyan }
function Write-Ok($msg) { Write-Host "  $msg" -ForegroundColor Green }
function Write-Warn($msg) { Write-Host "  $msg" -ForegroundColor Yellow }

if ($Uninstall) {
  Write-Host ""
  Write-Host "Uninstalling Grok Agent shortcuts / startup..." -ForegroundColor Yellow
  if (Test-Path $StartupLnk) {
    Remove-Item $StartupLnk -Force -ErrorAction SilentlyContinue
    Write-Ok "Removed Startup: $StartupLnk"
  }
  foreach ($name in @('Grok Agent.lnk', 'Start Grok Agent.lnk', 'Grok Agent Status.lnk')) {
    $p = Join-Path $Desktop $name
    if (Test-Path $p) {
      Remove-Item $p -Force -ErrorAction SilentlyContinue
      Write-Ok "Removed Desktop: $name"
    }
  }
  try {
    $conns = Get-NetTCPConnection -LocalPort 3847 -State Listen -ErrorAction SilentlyContinue
    foreach ($c in $conns) {
      if ($c.OwningProcess) {
        Stop-Process -Id $c.OwningProcess -Force -ErrorAction SilentlyContinue
        Write-Ok "Stopped process on port 3847 (PID $($c.OwningProcess))"
      }
    }
  } catch { }
  Write-Host ""
  Write-Ok "Grok Agent uninstalled (app files kept at $AgentRoot)."
  Write-Host "  Delete the folder yourself if you want a full wipe."
  exit 0
}

Write-Host ""
Write-Host "  Installing Grok Agent on this PC" -ForegroundColor Cyan
Write-Host "  ================================" -ForegroundColor Cyan
Write-Host "  Root: $AgentRoot"
Write-Host ""

# 1) Node.js
Write-Step "Checking Node.js..."
$node = Get-Command node -ErrorAction SilentlyContinue
if (-not $node) {
  $candidates = @(
    "$env:ProgramFiles\nodejs\node.exe",
    "${env:ProgramFiles(x86)}\nodejs\node.exe"
  )
  foreach ($c in $candidates) {
    if (Test-Path $c) {
      $env:Path = "$(Split-Path $c -Parent);$env:Path"
      $node = Get-Command node -ErrorAction SilentlyContinue
      break
    }
  }
}
if (-not $node) {
  Write-Warn "Node.js not found. Opening https://nodejs.org - install LTS, then re-run this script."
  Start-Process "https://nodejs.org"
  exit 1
}
Write-Ok "Node $(node -v)"

# 2) npm install if needed
Write-Step "Checking dependencies..."
$express = Join-Path $AgentRoot 'node_modules\express'
if (-not (Test-Path $express)) {
  Write-Step "Running npm install (first time)..."
  Push-Location $AgentRoot
  try {
    & npm.cmd install --silent 2>$null
    if (-not (Test-Path $express)) { & npm install }
  } finally {
    Pop-Location
  }
}
if (Test-Path $express) {
  Write-Ok "Dependencies OK"
} else {
  Write-Warn "npm install may have failed - try: cd `"$AgentRoot`"; npm install"
}

# 3) Self-check (non-fatal)
$check = Join-Path $AgentRoot 'scripts\self-check.mjs'
if (Test-Path $check) {
  Write-Step "Running self-check..."
  Push-Location $AgentRoot
  try {
    & node $check
    if ($LASTEXITCODE -eq 0) { Write-Ok "Self-check passed" }
    else { Write-Warn "Self-check reported issues (install continues)" }
  } catch {
    Write-Warn "Self-check skipped: $_"
  } finally {
    Pop-Location
  }
}

# 4) Lock truth core files (read-only) — users learn with Grok; they don't edit truth
Write-Step "Locking truth-seeking core files (read-only)..."
$coreDir = Join-Path $AgentRoot 'core'
if (Test-Path $coreDir) {
  Get-ChildItem $coreDir -File | ForEach-Object {
    try {
      $_.IsReadOnly = $true
      Write-Ok "Locked $($_.Name)"
    } catch {
      Write-Warn "Could not lock $($_.Name)"
    }
  }
}

# 5) Desktop + Startup shortcuts
Write-Step "Creating desktop + Startup shortcuts..."
& (Join-Path $AgentRoot 'Create-Desktop-Shortcut.ps1')

# 6) Start now
if (-not $NoStart) {
  Write-Step "Starting Grok Agent..."
  $vbs = Join-Path $AgentRoot 'Start-Grok-Silent.vbs'
  if (Test-Path $vbs) {
    Start-Process wscript.exe -ArgumentList "`"$vbs`"" -WorkingDirectory $AgentRoot
  } else {
    Start-Process (Join-Path $AgentRoot 'Start-Grok.bat') -WorkingDirectory $AgentRoot
  }
  $ready = $false
  for ($i = 0; $i -lt 40; $i++) {
    try {
      $r = Invoke-WebRequest -Uri 'http://127.0.0.1:3847/api/health' -UseBasicParsing -TimeoutSec 2
      if ($r.StatusCode -eq 200) { $ready = $true; break }
    } catch { }
    Start-Sleep -Milliseconds 500
  }
  if ($ready) {
    Write-Ok "Server online at http://127.0.0.1:3847"
  } else {
    Write-Warn "Server not responding yet - open Grok Agent from the desktop in a few seconds."
  }
}

Write-Host ""
Write-Host "  Grok Agent installed!" -ForegroundColor Green
Write-Host "  ---------------------" -ForegroundColor Green
Write-Host "  Desktop:"
Write-Host "    - Grok Agent         = start + open app"
Write-Host "    - Start Grok Agent   = background server only"
Write-Host "    - Grok Agent Status  = health check"
Write-Host "  Login:"
Write-Host "    - Auto-starts server (Startup folder, no browser)"
Write-Host "  Public free agent:"
Write-Host "    - Needs Grok (grok login or xAI key) — see SHARE.md"
Write-Host "    - Truth-seeking LOCKED · Grok only · endless classes"
Write-Host "  Uninstall:"
Write-Host "    powershell -ExecutionPolicy Bypass -File `"$AgentRoot\Install-Grok-Agent.ps1`" -Uninstall"
Write-Host ""
