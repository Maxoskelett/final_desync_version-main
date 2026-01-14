param(
    [int]$Port = 8080,
    [string]$Root = "$PSScriptRoot"
)

$listener = New-Object System.Net.HttpListener
$prefix = "http://localhost:$Port/"
$listener.Prefixes.Add($prefix)
$listener.Start()
Write-Host "Serving $Root on $prefix"

$mime = @{
  '.html' = 'text/html'
  '.htm'  = 'text/html'
  '.css'  = 'text/css'
  '.js'   = 'application/javascript'
  '.json' = 'application/json'
  '.svg'  = 'image/svg+xml'
  '.png'  = 'image/png'
  '.jpg'  = 'image/jpeg'
  '.jpeg' = 'image/jpeg'
  '.gif'  = 'image/gif'
  '.mp3'  = 'audio/mpeg'
  '.wav'  = 'audio/wav'
  '.ico'  = 'image/x-icon'
}

while ($listener.IsListening) {
  $context = $listener.GetContext()
  try {
    $request = $context.Request
    $rel = $request.Url.AbsolutePath.TrimStart('/')
    if ([string]::IsNullOrWhiteSpace($rel)) { $rel = 'landingpage.html' }
    $full = Join-Path $Root $rel
    if (Test-Path $full -PathType Container) {
      $full = Join-Path $full 'index.html'
    }
    if (!(Test-Path $full -PathType Leaf)) {
      $context.Response.StatusCode = 404
      $bytes = [System.Text.Encoding]::UTF8.GetBytes('Not Found')
      $context.Response.OutputStream.Write($bytes,0,$bytes.Length)
      $context.Response.Close()
      continue
    }
    $ext = [System.IO.Path]::GetExtension($full).ToLower()
    $ctype = $mime[$ext]
    if (-not $ctype) { $ctype = 'application/octet-stream' }
    $context.Response.ContentType = $ctype
    $bytes = [System.IO.File]::ReadAllBytes($full)
    $context.Response.ContentLength64 = $bytes.Length
    $context.Response.AddHeader('Access-Control-Allow-Origin','*')
    $context.Response.OutputStream.Write($bytes,0,$bytes.Length)
    $context.Response.Close()
  } catch {
    try { $context.Response.StatusCode = 500; $context.Response.Close() } catch {}
  }
}
