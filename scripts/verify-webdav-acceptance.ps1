param([switch]$AllowOverwrite)

function Restore-EnvValue([string]$Name, [AllowNull()][object]$Value) {
  if ($null -eq $Value) {
    Remove-Item "Env:$Name" -ErrorAction SilentlyContinue
    return
  }

  Set-Item "Env:$Name" $Value
}

$username = Read-Host "123pan WebDAV username"
$secureSecret = Read-Host "123pan WebDAV app password" -AsSecureString
$bstr = [Runtime.InteropServices.Marshal]::SecureStringToBSTR($secureSecret)
$plainSecret = [Runtime.InteropServices.Marshal]::PtrToStringBSTR($bstr)
$previousUsername = $env:DADKIT_WEBDAV_USERNAME
$previousSecret = $env:DADKIT_WEBDAV_SECRET
$previousAllowOverwrite = $env:DADKIT_WEBDAV_ALLOW_OVERWRITE

try {
  $env:DADKIT_WEBDAV_USERNAME = $username
  $env:DADKIT_WEBDAV_SECRET = $plainSecret

  if ($AllowOverwrite) {
    $env:DADKIT_WEBDAV_ALLOW_OVERWRITE = "1"
  }

  node scripts/verify-webdav-acceptance.mjs
  exit $LASTEXITCODE
} finally {
  Restore-EnvValue "DADKIT_WEBDAV_USERNAME" $previousUsername
  Restore-EnvValue "DADKIT_WEBDAV_SECRET" $previousSecret
  Restore-EnvValue "DADKIT_WEBDAV_ALLOW_OVERWRITE" $previousAllowOverwrite

  if ($bstr -ne [IntPtr]::Zero) {
    [Runtime.InteropServices.Marshal]::ZeroFreeBSTR($bstr)
  }
}
