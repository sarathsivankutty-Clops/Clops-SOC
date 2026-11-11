param(
    [string]$Model = "gemini-flash-latest"
)

$ErrorActionPreference = "Stop"
$secureKey = Read-Host "Enter Gemini API key (input is hidden)" -AsSecureString
if ($secureKey.Length -eq 0) {
    throw "API key cannot be empty."
}

$keyPointer = [IntPtr]::Zero
$key = $null
$response = $null

try {
    $keyPointer = [Runtime.InteropServices.Marshal]::SecureStringToBSTR($secureKey)
    $key = [Runtime.InteropServices.Marshal]::PtrToStringBSTR($keyPointer)
    $key = [regex]::Replace($key, '[\s\x00-\x1F\x7F]', '')
    if (-not $key) {
        throw "API key cannot be empty."
    }
    $body = @{
        contents = @(
            @{
                parts = @(
                    @{ text = "Reply only: Gemini API is working." }
                )
            }
        )
    } | ConvertTo-Json -Depth 6

    $uri = "https://generativelanguage.googleapis.com/v1beta/models/$Model`:generateContent"
    $response = Invoke-RestMethod `
        -Uri $uri `
        -Method Post `
        -Headers @{ "x-goog-api-key" = $key } `
        -ContentType "application/json" `
        -Body $body `
        -TimeoutSec 30

    $text = $response.candidates[0].content.parts[0].text
    if ($text) {
        Write-Output "Gemini API request succeeded."
        Write-Output "Model: $Model"
        Write-Output "Response: $text"
    } else {
        $reason = $response.candidates[0].finishReason
        Write-Error "Gemini responded without text. Finish reason: $reason"
    }
}
catch {
    $statusCode = $null
    $errorResponse = $_.Exception.Response
    $errorBody = $null

    if ($errorResponse) {
        if ($errorResponse.StatusCode) {
            $statusCode = [int]$errorResponse.StatusCode
        } elseif ($errorResponse -is [System.Net.HttpWebResponse]) {
            $statusCode = [int]$errorResponse.StatusCode
        }

        try {
            if ($errorResponse.Content) {
                $errorBody = $errorResponse.Content.ReadAsStringAsync().GetAwaiter().GetResult()
            } elseif ($errorResponse.GetResponseStream()) {
                $reader = [System.IO.StreamReader]::new($errorResponse.GetResponseStream())
                try {
                    $errorBody = $reader.ReadToEnd()
                } finally {
                    $reader.Dispose()
                }
            }
        } catch {
            $errorBody = $null
        }
    }

    if ($statusCode) {
        $detail = "Gemini API request failed (HTTP $statusCode)."
        if ($errorBody) {
            try {
                $googleError = $errorBody | ConvertFrom-Json
                if ($googleError.error.message) {
                    $safeMessage = ([string]$googleError.error.message).Replace($key, "[redacted]")
                    $detail += " $safeMessage"
                } elseif ($googleError.error.status) {
                    $detail += " Google status: $($googleError.error.status)."
                }
            } catch {
                $detail += " Google returned an error response; its body could not be parsed."
            }
        }
        Write-Error $detail
    } elseif ($_.Exception -is [System.TimeoutException] -or $_.Exception.Message -match "timed out|timeout") {
        Write-Error "Gemini API request timed out after 30 seconds. Check network connectivity and try again."
    } else {
        $safeException = ([string]$_.Exception.Message).Replace($key, "[redacted]")
        Write-Error "Gemini API request failed before an HTTP response: $safeException"
    }
    exit 1
}
finally {
    if ($keyPointer -ne [IntPtr]::Zero) {
        [Runtime.InteropServices.Marshal]::ZeroFreeBSTR($keyPointer)
    }
    if ($secureKey) {
        $secureKey.Dispose()
    }
    Remove-Variable key, body, text, response -ErrorAction SilentlyContinue
}
