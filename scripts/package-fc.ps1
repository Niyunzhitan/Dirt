$ErrorActionPreference = "Stop"

# Derive every path from this script so the command works from any directory.
$projectRoot = [IO.Path]::GetFullPath((Join-Path $PSScriptRoot ".."))
$buildRoot = [IO.Path]::GetFullPath((Join-Path $projectRoot "dist"))
$packageRoot = [IO.Path]::GetFullPath((Join-Path $projectRoot "deploy/fc"))
$packageBuildRoot = [IO.Path]::GetFullPath((Join-Path $packageRoot "dist"))
$releaseRoot = [IO.Path]::GetFullPath((Join-Path $projectRoot "releases"))
$archivePath = [IO.Path]::GetFullPath((Join-Path $releaseRoot "niyun-zhitan-fc.zip"))

function Assert-ChildPath([string]$Path, [string]$Parent, [string]$Label) {
  $prefix = $Parent.TrimEnd([IO.Path]::DirectorySeparatorChar) + [IO.Path]::DirectorySeparatorChar
  if (!$Path.StartsWith($prefix, [StringComparison]::OrdinalIgnoreCase)) {
    throw "$Label escaped its expected parent directory: $Path"
  }
}

Assert-ChildPath $packageRoot $projectRoot "FC package directory"
Assert-ChildPath $packageBuildRoot $packageRoot "FC build directory"
Assert-ChildPath $releaseRoot $projectRoot "Release directory"
Assert-ChildPath $archivePath $releaseRoot "FC archive"

Push-Location $projectRoot
try {
  # Validate source before replacing the last usable deployment package.
  npm run check
  if ($LASTEXITCODE -ne 0) { throw "npm run check failed." }
  npm run build
  if ($LASTEXITCODE -ne 0) { throw "npm run build failed." }

  # Start from an empty dist so deleted assets cannot linger in the FC package.
  if (Test-Path -LiteralPath $packageBuildRoot) {
    Remove-Item -LiteralPath $packageBuildRoot -Recurse -Force
  }
  New-Item -ItemType Directory -Path $packageBuildRoot -Force | Out-Null
  Copy-Item -Path (Join-Path $buildRoot "*") -Destination $packageBuildRoot -Recurse -Force
  Copy-Item -LiteralPath (Join-Path $projectRoot "server.js") -Destination (Join-Path $packageRoot "server.js") -Force

  $packageServerRoot = Join-Path $packageRoot "server"
  if (Test-Path -LiteralPath $packageServerRoot) {
    Remove-Item -LiteralPath $packageServerRoot -Recurse -Force
  }
  Copy-Item -LiteralPath (Join-Path $projectRoot "server") -Destination $packageServerRoot -Recurse -Force

  New-Item -ItemType Directory -Path $releaseRoot -Force | Out-Null
  # Package only runtime entries. Local installs or notes under deploy/fc must never leak into a release.
  $runtimeEntries = @(
    (Join-Path $packageRoot "server.js"),
    (Join-Path $packageRoot "server"),
    (Join-Path $packageRoot "package.json"),
    (Join-Path $packageRoot "package-lock.json"),
    $packageBuildRoot
  )
  Compress-Archive -Path $runtimeEntries -DestinationPath $archivePath -CompressionLevel Optimal -Force

  # Inspect the archive itself for required entries and accidental private or development files.
  $archive = [IO.Compression.ZipFile]::OpenRead($archivePath)
  try {
    $names = $archive.Entries.FullName
    $required = @("server.js", "server/db.js", "package.json", "package-lock.json", "dist/index.html")
    $missing = $required | Where-Object { $names -notcontains $_ }
    $unexpected = $names | Where-Object { $_ -match '(^|/)(\.env($|\.)|\.git/|docs/|node_modules/)' }
    if ($missing.Count) { throw "FC archive is missing: $($missing -join ', ')" }
    if ($unexpected.Count) { throw "FC archive contains unexpected files: $($unexpected -join ', ')" }
  } finally {
    $archive.Dispose()
  }

  Write-Host "FC deployment archive created: $archivePath"
} finally {
  Pop-Location
}
