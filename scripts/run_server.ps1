$ErrorActionPreference = 'SilentlyContinue'

# Project root (one level up from this script's directory)
$scriptDir = Split-Path -Parent $MyInvocation.MyCommand.Path
$projectRoot = Split-Path -Parent $scriptDir
Set-Location $projectRoot

# Helper: list api_server.py processes
function Get-ApiServerProcesses {
    try {
        return Get-CimInstance Win32_Process |
            Where-Object { $_.Name -like 'python*.exe' -and $_.CommandLine -match 'api_server.py' }
    } catch {
        return @()
    }
}

# Log files
$stdoutLog = Join-Path $projectRoot 'server.out.log'
$stderrLog = Join-Path $projectRoot 'server.err.log'

Write-Output "[Supervisor] Starting api_server.py supervisor in $projectRoot"

while ($true) {
    # If already running, just monitor and wait
    $existing = Get-ApiServerProcesses
    if ($existing -and $existing.Count -gt 0) {
        Start-Sleep -Seconds 5
        continue
    }

    try {
        $psi = New-Object System.Diagnostics.ProcessStartInfo
        $psi.FileName = 'python'
        $psi.Arguments = '-u api_server.py'
        $psi.WorkingDirectory = $projectRoot
        $psi.WindowStyle = 'Hidden'
        $psi.UseShellExecute = $false
        $psi.RedirectStandardOutput = $true
        $psi.RedirectStandardError = $true

        $proc = New-Object System.Diagnostics.Process
        $proc.StartInfo = $psi

        # Start process and asynchronously redirect to files
        $outStream = [System.IO.StreamWriter]::new($stdoutLog, $true)
        $errStream = [System.IO.StreamWriter]::new($stderrLog, $true)

        $proc.add_OutputDataReceived({ param($s, $e) if ($e.Data) { $outStream.WriteLine($e.Data) } })
        $proc.add_ErrorDataReceived({ param($s, $e) if ($e.Data) { $errStream.WriteLine($e.Data) } })

        [void]$proc.Start()
        $proc.BeginOutputReadLine()
        $proc.BeginErrorReadLine()

        Write-Output "[Supervisor] Started api_server.py (PID=$($proc.Id))"
        # Wait until it exits
        $proc.WaitForExit()
        Write-Output "[Supervisor] Process exited with code $($proc.ExitCode). Restarting in 3s..."
    } catch {
        Write-Output "[Supervisor] Error starting api_server.py: $($_.Exception.Message)"
    } finally {
        try { $outStream.Flush(); $outStream.Dispose() } catch {}
        try { $errStream.Flush(); $errStream.Dispose() } catch {}
    }
    Start-Sleep -Seconds 3
}


