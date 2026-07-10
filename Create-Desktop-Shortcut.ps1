#Requires -Version 5.1
<#
.SYNOPSIS
  Desktop + Startup shortcuts for Grok Agent (same style as Gaming Agent).
#>
$ErrorActionPreference = 'Continue'

$AgentRoot = Split-Path -Parent $MyInvocation.MyCommand.Path
$Desktop = [Environment]::GetFolderPath('Desktop')
if (-not (Test-Path $Desktop)) {
  $Desktop = Join-Path $env:USERPROFILE 'OneDrive\Desktop'
}
if (-not (Test-Path $Desktop)) {
  $Desktop = Join-Path $env:USERPROFILE 'Desktop'
}

$WshShell = New-Object -ComObject WScript.Shell
$created = @()

function New-AgentShortcut {
  param(
    [string]$Name,
    [string]$TargetPath,
    [string]$Arguments = '',
    [string]$WorkingDirectory = $AgentRoot,
    [string]$Icon = 'shell32.dll,13',
    [string]$Description = '',
    [int]$WindowStyle = 1
  )
  $path = Join-Path $Desktop $Name
  $sc = $WshShell.CreateShortcut($path)
  $sc.TargetPath = $TargetPath
  $sc.Arguments = $Arguments
  $sc.WorkingDirectory = $WorkingDirectory
  $sc.IconLocation = $Icon
  $sc.Description = $Description
  $sc.WindowStyle = $WindowStyle
  $sc.Save()
  $script:created += $path
}

$oldNames = @(
  'Grok Studio.lnk',
  'Grok StructAI.lnk',
  'Grok Struct AI.lnk',
  'StructAI.lnk',
  'Grok Build Lab.lnk'
)
foreach ($name in $oldNames) {
  $p = Join-Path $Desktop $name
  if (Test-Path $p) {
    try { Remove-Item -LiteralPath $p -Force; Write-Host "Removed: $name" } catch {}
  }
}

$silentUi = Join-Path $AgentRoot 'Start-Grok-Silent.vbs'
$bgOnly = Join-Path $AgentRoot 'Start-Grok-Background.vbs'
$bat = Join-Path $AgentRoot 'Start-Grok.bat'
$statusPs1 = Join-Path $AgentRoot 'Status-Grok-Agent.ps1'

if (Test-Path $silentUi) {
  New-AgentShortcut -Name 'Grok Agent.lnk' `
    -TargetPath 'wscript.exe' `
    -Arguments "`"$silentUi`"" `
    -Icon 'shell32.dll,13' `
    -Description 'Start Grok Agent and open the app (Super Tutor, 3D, Code Lab)' `
    -WindowStyle 7
} else {
  New-AgentShortcut -Name 'Grok Agent.lnk' `
    -TargetPath $bat `
    -Icon 'shell32.dll,13' `
    -Description 'Start Grok Agent and open the app'
}

if (Test-Path $bgOnly) {
  New-AgentShortcut -Name 'Start Grok Agent.lnk' `
    -TargetPath 'wscript.exe' `
    -Arguments "`"$bgOnly`"" `
    -Icon 'shell32.dll,137' `
    -Description 'Start Grok Agent server in the background (no browser)' `
    -WindowStyle 7
}

if (Test-Path $statusPs1) {
  New-AgentShortcut -Name 'Grok Agent Status.lnk' `
    -TargetPath 'powershell.exe' `
    -Arguments "-NoProfile -ExecutionPolicy Bypass -File `"$statusPs1`"" `
    -Icon 'shell32.dll,238' `
    -Description 'Show Grok Agent health, port, and learner data path'
}

$startup = [Environment]::GetFolderPath('Startup')
if ((Test-Path $startup) -and (Test-Path $bgOnly)) {
  $startupLnk = Join-Path $startup 'Grok Agent.lnk'
  $ss = $WshShell.CreateShortcut($startupLnk)
  $ss.TargetPath = 'wscript.exe'
  $ss.Arguments = "`"$bgOnly`""
  $ss.WorkingDirectory = $AgentRoot
  $ss.WindowStyle = 7
  $ss.Description = 'Start Grok Agent at login (server only, hidden)'
  $ss.IconLocation = 'shell32.dll,137'
  $ss.Save()
  $created += $startupLnk
}

Write-Host "Shortcuts ready:" -ForegroundColor Green
foreach ($c in $created) { Write-Host "  $c" }
