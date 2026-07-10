#Requires -Version 5.1
<#
  Double-click desktop: "Publish Super Tutor to GitHub"
  Public GitHub repos are FREE.
  Opens browser for ONE login if needed, then creates public repo and pushes.
#>
$ErrorActionPreference = 'Continue'
$Root = Split-Path -Parent $MyInvocation.MyCommand.Path
Set-Location $Root

function Find-Exe($name, $candidates) {
  $cmd = Get-Command $name -ErrorAction SilentlyContinue
  if ($cmd) { return $cmd.Source }
  foreach ($c in $candidates) { if (Test-Path $c) { return $c } }
  return $null
}

$git = Find-Exe 'git' @('C:\Program Files\Git\cmd\git.exe', 'C:\Program Files\Git\bin\git.exe')
$gh = Find-Exe 'gh' @(
  'C:\Users\Mitch\AppData\Local\Programs\gh\bin\gh.exe',
  'C:\Program Files\GitHub CLI\gh.exe',
  "$env:LOCALAPPDATA\Programs\gh\bin\gh.exe"
)

Write-Host ""
Write-Host "  Grok Super Tutor -> Public GitHub (FREE)" -ForegroundColor Cyan
Write-Host "  =========================================" -ForegroundColor Cyan
Write-Host ""

if (-not $git) {
  Write-Host "Git missing. Installing..." -ForegroundColor Yellow
  winget install --id Git.Git -e --accept-source-agreements --accept-package-agreements
  $git = 'C:\Program Files\Git\cmd\git.exe'
}
if (-not $gh) {
  Write-Host "GitHub CLI missing. Use portable path or install: winget install GitHub.cli" -ForegroundColor Red
  Write-Host "Press any key..."; $null = $Host.UI.RawUI.ReadKey('NoEcho,IncludeKeyDown')
  exit 1
}

Write-Host "git: $git"
Write-Host "gh:  $gh"
Write-Host ""

& $gh auth status 2>$null
if ($LASTEXITCODE -ne 0) {
  Write-Host "You need a FREE GitHub account login (one time)." -ForegroundColor Yellow
  Write-Host "A browser window will open. Sign in / approve Super Tutor." -ForegroundColor Yellow
  Write-Host ""
  Write-Host "If you see a CODE, enter it at: https://github.com/login/device" -ForegroundColor Green
  Write-Host ""
  Start-Process "https://github.com/login/device"
  Start-Process "https://github.com/signup"
  # Interactive web login - user completes in browser
  & $gh auth login --hostname github.com --git-protocol https --web --skip-ssh-key
  if ($LASTEXITCODE -ne 0) {
    Write-Host "Login failed or cancelled." -ForegroundColor Red
    Write-Host "Press any key..."; $null = $Host.UI.RawUI.ReadKey('NoEcho,IncludeKeyDown')
    exit 1
  }
}

$user = & $gh api user --jq .login
if (-not $user) {
  Write-Host "Could not read GitHub username." -ForegroundColor Red
  Write-Host "Press any key..."; $null = $Host.UI.RawUI.ReadKey('NoEcho,IncludeKeyDown')
  exit 1
}

Write-Host "Logged in as: $user" -ForegroundColor Green
$name = 'grok-super-tutor'
Write-Host "Creating PUBLIC free repo: $user/$name ..."

if (-not (Test-Path (Join-Path $Root '.git'))) {
  & $git init -b main
  & $git add -A
  & $git -c user.email="super-tutor@users.noreply.github.com" -c user.name="Super Tutor" commit -m "Initial public release: Grok Super Tutor"
}

# Remove origin if broken
$existing = & $gh repo view "$user/$name" --json name 2>$null
if ($LASTEXITCODE -eq 0) {
  Write-Host "Repo already exists - pushing updates..."
  & $git remote remove origin 2>$null
  & $git remote add origin "https://github.com/$user/$name.git"
  & $git push -u origin main
} else {
  & $gh repo create $name --public --source=. --remote=origin --push --description "Free Super Tutor for anyone with a Grok subscription. Truth-seeking locked. Grok only. Endless classes."
}

$url = "https://github.com/$user/$name"
Write-Host ""
Write-Host "  SUCCESS - Public free repo:" -ForegroundColor Green
Write-Host "  $url" -ForegroundColor Green
Write-Host ""
Write-Host "  Clone for others:"
Write-Host "  git clone $url.git"
Write-Host ""

# Patch README / SHARE with real URL
foreach ($f in @('README.md', 'SHARE.md')) {
  $p = Join-Path $Root $f
  if (Test-Path $p) {
    $t = Get-Content $p -Raw
    $t = $t -replace 'https://github.com/YOUR_GITHUB_USERNAME/grok-super-tutor', $url
    $t = $t -replace 'YOUR_GITHUB_USERNAME/grok-super-tutor', "$user/$name"
    Set-Content -Path $p -Value $t -Encoding UTF8 -NoNewline
  }
}
& $git add README.md SHARE.md 2>$null
& $git -c user.email="super-tutor@users.noreply.github.com" -c user.name="Super Tutor" commit -m "Set public clone URL to $user/$name" 2>$null
& $git push 2>$null

# Desktop link to repo
$desktop = [Environment]::GetFolderPath('Desktop')
$wsh = New-Object -ComObject WScript.Shell
$sc = $wsh.CreateShortcut((Join-Path $desktop 'Super Tutor on GitHub.lnk'))
$sc.TargetPath = $url
$sc.Description = 'Public free Super Tutor repository'
$sc.Save()

# Save URL for X post
@"
PUBLIC FREE REPO (share this):
$url

Clone:
git clone $url.git
cd grok-super-tutor
npm install
npm run install-pc
grok login

Free agent + Grok subscription. Independent project - not affiliated with Elon/xAI/Grok.
"@ | Set-Content (Join-Path $desktop 'SUPER-TUTOR-GITHUB-LINK.txt') -Encoding UTF8

Write-Host "Desktop: Super Tutor on GitHub.lnk + SUPER-TUTOR-GITHUB-LINK.txt"
Write-Host "Opening repo in browser..."
Start-Process $url
Write-Host ""
Write-Host "Press any key to close..."
$null = $Host.UI.RawUI.ReadKey('NoEcho,IncludeKeyDown')
