$ErrorActionPreference = "Stop"
Push-Location $PSScriptRoot
try {
  if (-not (Get-Command node -ErrorAction SilentlyContinue)) { throw "Please install Node.js 24 first." }
  $env:USPEAK_ADMIN_TOKEN = & node -e "process.stdout.write(require('node:crypto').randomBytes(32).toString('hex'))"
  if ($LASTEXITCODE -ne 0) { throw "Could not create local login token." }
  Set-Clipboard -Value $env:USPEAK_ADMIN_TOKEN
  Write-Host "USPEAK LOCAL MOCK: open http://127.0.0.1:4317 and paste the login token from clipboard."
  Write-Host "No social posts will be published. Press Ctrl+C to stop."
  & node server.mjs
} finally {
  Remove-Item Env:USPEAK_ADMIN_TOKEN -ErrorAction SilentlyContinue
  Pop-Location
}
