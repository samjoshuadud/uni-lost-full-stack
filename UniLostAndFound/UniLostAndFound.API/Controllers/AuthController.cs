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
                _logger.LogWarning("[Debug] No Authorization header found");
                return Unauthorized(new { message = "No Authorization header found" });
            }

            string authHeaderStr = authHeader.ToString();
            _logger.LogInformation($"[Debug] Received auth header: {authHeaderStr}");

            if (string.IsNullOrEmpty(authHeaderStr) || !authHeaderStr.StartsWith("Bearer "))
            {
                _logger.LogWarning("[Debug] Invalid Authorization header format");
                return Unauthorized(new { message = "Invalid Authorization header format" });
            }

            string idToken = authHeaderStr.Substring("Bearer ".Length);
            _logger.LogInformation($"[Debug] Token length: {idToken.Length}");

            try
            {
                var firebaseToken = await FirebaseAuth.DefaultInstance.VerifyIdTokenAsync(idToken);
                string email = firebaseToken.Claims.GetValueOrDefault("email", "").ToString();

                var settings = await _firestoreService.GetUserAccessSettings();
                if (settings == null)
                {
                    _logger.LogError("[Debug] Failed to retrieve user access settings");
                    return StatusCode(500, new { message = "Failed to retrieve settings" });
                }

                // Check if email is allowed
                bool isAllowed = settings.AllowedDomains.Any(domain => email.EndsWith($"@{domain}")) 
                             || settings.DevelopmentEmails.Contains(email);

                _logger.LogInformation($"[Debug] Email check - Email: {email}, IsAllowed: {isAllowed}");

                if (!isAllowed)
                {
                    return Unauthorized(new { message = "Please use your UMAK email" });
                }

                // Get admin status from Firestore
                bool isAdmin = settings.AdminEmails.Contains(email);

                // Get or create user in Firestore
                var user = await _firestoreService.GetOrCreateUser(
                    firebaseToken.Uid,
                    email,
                    firebaseToken.Claims.GetValueOrDefault("name", "").ToString(),
                    isAdmin ? "admin" : "select"
                );

                return Ok(new 
                { 
                    message = "Authentication successful",
                    user = new
                    {
                        uid = user.Id,
                        email = user.Email,
                        name = user.DisplayName,
                        role = user.Role,
                        isAdmin = isAdmin,
                        needsRoleSelection = !isAdmin && user.Role == "select"
                    }
                });
            }
            catch (FirebaseAuthException ex)
            {
                _logger.LogWarning($"[Debug] Firebase auth error: {ex.Message}");
                return Unauthorized(new { message = ex.Message });
            }
        }
        catch (Exception ex)
        {
            _logger.LogError($"[Debug] Unexpected error: {ex.Message}");
            _logger.LogError($"[Debug] Stack trace: {ex.StackTrace}");
            return StatusCode(500, new { message = "Internal server error" });
        }
    }

    [HttpPost("role")]
    public async Task<ActionResult> UpdateRole([FromBody] UpdateRoleRequest request)
    {
        try
        {
            if (string.IsNullOrEmpty(request.Role) || 
                (request.Role != "student" && request.Role != "teacher"))
            {
                return BadRequest(new { message = "Invalid role selected" });
            }

            await _firestoreService.UpdateUserRole(request.UserId, request.Role);

            return Ok(new { 
                message = "Role updated successfully",
                role = request.Role
            });
        }
        catch (Exception ex)
        {
            _logger.LogError($"[Debug] Error updating role: {ex}");
            return StatusCode(500, new { message = "Failed to update role" });
        }
    }

    [HttpGet("test-connection")]
    public async Task<ActionResult> TestFirestoreConnection()
    {
        try
        {
            _logger.LogInformation("[Debug] Starting Firestore connection test");

            // Test userAccess collection
            var settingsDoc = await _firestoreService.GetUserAccessSettings();
            
            if (settingsDoc == null)
            {
                _logger.LogError("[Debug] Failed to retrieve settings document");
                return BadRequest(new { 
                    message = "Failed to retrieve settings",
                    connected = false 
                });
            }

            // Log all retrieved data
            return Ok(new
            {
                message = "Firestore connection successful",
                connected = true,
                settings = new
                {
                    adminEmails = settingsDoc.AdminEmails,
                    developmentEmails = settingsDoc.DevelopmentEmails,
                    allowedDomains = settingsDoc.AllowedDomains
                }
            });
        }
        catch (Exception ex)
        {
            _logger.LogError($"[Debug] Firestore connection error: {ex.Message}");
            _logger.LogError($"[Debug] Stack trace: {ex.StackTrace}");
            return StatusCode(500, new
            {
                message = "Firestore connection failed",
                error = ex.Message,
                connected = false
            });
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

public class UpdateRoleRequest
{
    public string UserId { get; set; } = string.Empty;
    public string Role { get; set; } = string.Empty;
}

public class AssignAdminRequest
{
    public string Email { get; set; } = string.Empty;
} 