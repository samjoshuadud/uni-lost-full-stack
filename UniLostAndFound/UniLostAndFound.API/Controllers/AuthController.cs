// AuthController.cs
using Microsoft.AspNetCore.Authorization;
using Microsoft.AspNetCore.Mvc;
using FirebaseAdmin.Auth;
using UniLostAndFound.API.Services;
using UniLostAndFound.API.Models;

namespace UniLostAndFound.API.Controllers;

[ApiController]
[Route("api/[controller]")]
public class AuthController : ControllerBase
{
    private readonly ILogger<AuthController> _logger;
    private readonly FirestoreService _firestoreService;

    public AuthController(ILogger<AuthController> logger, FirestoreService firestoreService)
    {
        _logger = logger;
        _firestoreService = firestoreService;
    }

    [HttpGet("protected")]
    public async Task<ActionResult> TestProtected()
    {
        try
        {
            if (!Request.Headers.TryGetValue("Authorization", out var authHeader))
            {
                _logger.LogWarning("No Authorization header found");
                return Unauthorized(new { message = "No Authorization header found" });
            }

            string authHeaderStr = authHeader.ToString();
            if (string.IsNullOrEmpty(authHeaderStr) || !authHeaderStr.StartsWith("Bearer "))
            {
                _logger.LogWarning("Invalid Authorization header format");
                return Unauthorized(new { message = "Invalid Authorization header format" });
            }

            string idToken = authHeaderStr.Substring("Bearer ".Length);
            _logger.LogInformation($"Processing token for authentication");

            try
            {
                var firebaseToken = await FirebaseAuth.DefaultInstance.VerifyIdTokenAsync(idToken);
                string email = firebaseToken.Claims.GetValueOrDefault("email", "").ToString();
                _logger.LogInformation($"Authenticating user with email: {email}");

                var settings = await _firestoreService.GetUserAccessSettings();
                if (settings == null)
                {
                    _logger.LogError("Failed to retrieve user access settings");
                    return StatusCode(500, new { message = "Failed to retrieve settings" });
                }

                // Check if email is in development emails or matches allowed domains
                bool isDevelopmentEmail = settings.DevelopmentEmails.Contains(email);
                bool isAllowedDomain = settings.AllowedDomains.Any(domain => email.EndsWith($"@{domain}"));
                bool isAdmin = settings.AdminEmails.Contains(email);

                _logger.LogInformation($"Access check - isDev: {isDevelopmentEmail}, isAllowedDomain: {isAllowedDomain}, isAdmin: {isAdmin}");

                // Allow access if it's a development email OR has an allowed domain
                if (!isDevelopmentEmail && !isAllowedDomain)
                {
                    _logger.LogWarning($"Access denied for email: {email}");
                    return Unauthorized(new { message = "Please use your UMAK email" });
                }

                var user = await _firestoreService.GetOrCreateUser(
                    firebaseToken.Uid,
                    email,
                    firebaseToken.Claims.GetValueOrDefault("name", "").ToString()
                );

                _logger.LogInformation($"Authentication successful for user: {user.Id}");

                return Ok(new 
                { 
                    message = "Authentication successful",
                    user = new
                    {
                        uid = user.Id,
                        email = user.Email,
                        name = user.DisplayName,
                        isAdmin = isAdmin,
                        displayName = user.DisplayName
                    }
                });
            }
            catch (FirebaseAuthException ex)
            {
                _logger.LogError($"Firebase auth error: {ex.Message}");
                return Unauthorized(new { message = ex.Message });
            }
        }
        catch (Exception ex)
        {
            _logger.LogError($"Unexpected error: {ex.Message}");
            _logger.LogError($"Stack trace: {ex.StackTrace}");
            return StatusCode(500, new { message = "Internal server error" });
        }
    }

    [HttpPost("assign-admin")]
    public async Task<ActionResult> AssignAdmin([FromBody] AssignAdminRequest request)
    {
        try
        {
            _logger.LogInformation($"[Debug] Attempting to assign admin: {request.Email}");

            var settings = await _firestoreService.GetUserAccessSettings();
            if (settings == null)
            {
                _logger.LogError("[Debug] Failed to retrieve user access settings");
                return StatusCode(500, new { message = "Failed to retrieve settings" });
            }

            // Update admin emails list
            var adminEmails = settings.AdminEmails.ToList();
            if (!adminEmails.Contains(request.Email))
            {
                adminEmails.Add(request.Email);
                var success = await _firestoreService.UpdateAdminEmails(adminEmails);

                if (!success)
                {
                    _logger.LogError("[Debug] Failed to update admin emails");
                    return StatusCode(500, new { message = "Failed to update admin list" });
                }

                _logger.LogInformation($"[Debug] Successfully added {request.Email} as admin");
            }
            else
            {
                _logger.LogInformation($"[Debug] {request.Email} is already an admin");
            }

            return Ok(new { 
                message = "Admin assigned successfully",
                email = request.Email
            });
        }
        catch (Exception ex)
        {
            _logger.LogError($"[Debug] Error assigning admin: {ex.Message}");
            return StatusCode(500, new { message = "Failed to assign admin" });
        }
    }
}

public class AssignAdminRequest
{
    public string Email { get; set; } = string.Empty;
} 