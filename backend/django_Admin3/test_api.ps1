# First, let's login to get the token
try {
    $loginBody = @{
        "email" = "actedadmin@bpp.com"
        "password" = "act3dDj@ng0@dm1n??"
    } | ConvertTo-Json

    Write-Host "Attempting to login..."
    $loginResponse = Invoke-WebRequest -Uri "http://localhost:8888/api/auth/login/" `
        -Method Post `
        -ContentType "application/json" `
        -Body $loginBody

    # Parse the response to get the token
    $tokenData = $loginResponse.Content | ConvertFrom-Json
    
    if ($null -eq $tokenData.token) {
        throw "No token received in response"
    }
    
    Write-Host "Successfully logged in and received token"

    # Now make the request to insert subjects with the token
    $requestBody = @{
        "session_code" = "25S"        
    } | ConvertTo-Json

    $headers = @{
        "Authorization" = "Bearer $($tokenData.token)"
        "Content-Type" = "application/json"
    }

    Write-Host "Making request to insert subjects..."
    $response = Invoke-WebRequest -Uri "http://localhost:8888/api/exam-sessions-subjects/insert-subjects/" `
        -Method Post `
        -Headers $headers `
        -Body $requestBody

    # Display the response
    Write-Host "`nResponse Status Code:" $response.StatusCode
    Write-Host "Response Body:" $response.Content
}
catch {
    Write-Host "`nError occurred:"
    Write-Host "Status Code:" $_.Exception.Response.StatusCode.value__
    
    # Try to get response content for more details
    $errorDetails = $_.ErrorDetails
    if ($null -eq $errorDetails) {
        $rawResponse = $_.Exception.Response.GetResponseStream()
        $reader = New-Object System.IO.StreamReader($rawResponse)
        $errorDetails = $reader.ReadToEnd()
    }
    Write-Host "Error Details:" $errorDetails
}