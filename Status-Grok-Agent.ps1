#Requires -Version 5.1
$ErrorActionPreference = 'Continue'
$AgentRoot = Split-Path -Parent $MyInvocation.MyCommand.Path
$Port = if ($env:GROK_AGENT_PORT) { $env:GROK_AGENT_PORT } else { 3847 }
$Url = "http://127.0.0.1:$Port"
$Health = "$Url/api/health"

Write-Host ""
Write-Host "  Grok Agent Status" -ForegroundColor Cyan
Write-Host "  =================" -ForegroundColor Cyan
Write-Host "  Folder : $AgentRoot"
Write-Host "  URL    : $Url"
Write-Host ""

$up = $false
try {
  $r = Invoke-WebRequest -Uri $Health -UseBasicParsing -TimeoutSec 3
  if ($r.StatusCode -eq 200) {
    $up = $true
    $j = $r.Content | ConvertFrom-Json -ErrorAction SilentlyContinue
    Write-Host "  Server : ONLINE" -ForegroundColor Green
    if ($j) {
      Write-Host "  Health : ok=$($j.ok)  agent=$($j.agent)"
    }
  }
} catch {
  Write-Host "  Server : OFFLINE" -ForegroundColor Yellow
  Write-Host "  Tip    : Double-click 'Grok Agent' on the desktop, or 'Start Grok Agent'."
}

$node = Get-Command node -ErrorAction SilentlyContinue
Write-Host "  Node   : $(if ($node) { node -v } else { 'NOT FOUND - install from https://nodejs.org' })"
$express = Test-Path (Join-Path $AgentRoot 'node_modules\express')
Write-Host "  Deps   : $(if ($express) { 'OK (express installed)' } else { 'MISSING - run Install-Grok-Agent.ps1' })"
Write-Host "  Data   : $(Join-Path $AgentRoot 'data')"
Write-Host "  Tutor  : $(Join-Path $AgentRoot 'data\tutor')"
Write-Host ""

if ($up) {
  $open = Read-Host "  Open Grok in browser? (Y/n)"
  if ($open -notmatch '^[nN]') {
    Start-Process $Url
  }
} else {
  $start = Read-Host "  Start Grok Agent now? (Y/n)"
  if ($start -notmatch '^[nN]') {
    $vbs = Join-Path $AgentRoot 'Start-Grok-Silent.vbs'
    if (Test-Path $vbs) {
      Start-Process wscript.exe -ArgumentList "`"$vbs`""
    } else {
      Start-Process (Join-Path $AgentRoot 'Start-Grok.bat')
    }
    Write-Host "  Starting..." -ForegroundColor Green
    Start-Sleep -Seconds 2
  }
}

Write-Host ""
Write-Host "  Press any key to close..."
$null = $Host.UI.RawUI.ReadKey('NoEcho,IncludeKeyDown')
