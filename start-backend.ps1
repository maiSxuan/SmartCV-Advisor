$projectRoot = Split-Path -Parent $MyInvocation.MyCommand.Path
$backendDir = Join-Path $projectRoot "backend"
$pythonPath = Join-Path $backendDir ".venv\Scripts\python.exe"

if (-not (Test-Path -LiteralPath $pythonPath)) {
    throw "Không tìm thấy Python virtual environment tại $pythonPath"
}

& $pythonPath -m uvicorn app.main:app `
    --app-dir $backendDir `
    --reload `
    --host 127.0.0.1 `
    --port 8000
