// AuthController.cs
using Microsoft.AspNetCore.Authorization;
using Microsoft.AspNetCore.Mvc;
using UniLostAndFound.API.Services;
using UniLostAndFound.API.Models;
using System.Text.Json;

namespace UniLostAndFound.API.Controllers;

[ApiController]
[Route("api/[controller]")]
public class AuthController : ControllerBase
{
    private readonly ILogger<AuthController> _logger;
    private readonly UserService _userService;
    private readonly UserAccessService _userAccessService;
    private readonly AdminService _adminService;

    public AuthController(
        ILogger<AuthController> logger,
        UserService userService,
        UserAccessService userAccessService,
        AdminService adminService)
    {
        _logger = logger;
        _userService = userService;
        _userAccessService = userAccessService;
        _adminService = adminService;
    }

    [HttpGet("protected")]
    public async Task<ActionResult> TestProtected()
    {
        try
        {
            // Log all headers
            _logger.LogInformation("Request Headers:");
            foreach (var header in Request.Headers)
            {
                _logger.LogInformation($"{header.Key}: {header.Value}");
            }

            if (!Request.Headers.TryGetValue("Authorization", out var authHeader))
            {
                _logger.LogWarning("No Authorization header found");
                return Unauthorized(new { message = "No Authorization header found" });
            }

            string token = authHeader.ToString().Substring("Bearer ".Length);
            string email = token;
            
            string displayName = Request.Headers.TryGetValue("DisplayName", out var displayNameHeader) 
                ? displayNameHeader.ToString()
                : email;
            
            string uid = Request.Headers.TryGetValue("FirebaseUID", out var uidHeader)
                ? uidHeader.ToString()
                : email;
            
            _logger.LogInformation($"Processing request for: Email={email}, DisplayName={displayName}, UID={uid}");

            // Get all necessary data first
            var developmentEmails = await _userAccessService.GetDevelopmentEmailsAsync();
            _logger.LogInformation($"Development emails from database: {string.Join(", ", developmentEmails)}");

            bool isAdmin = await _userAccessService.IsAdminEmailAsync(email);
            _logger.LogInformation($"Is admin check: {isAdmin}");

            // Check if email is UMAK or development
            bool isUmakEmail = email.ToLower().EndsWith("@umak.edu.ph");
            _logger.LogInformation($"Is UMAK email check: {isUmakEmail}");

            bool isDevelopmentEmail = developmentEmails
                .Select(e => e.ToLower())
                .Contains(email.ToLower());
            _logger.LogInformation($"Is development email check: {isDevelopmentEmail}");

            _logger.LogInformation($"Email validation final result: IsUMAK={isUmakEmail}, IsDevelopment={isDevelopmentEmail}");

            if (!isUmakEmail && !isDevelopmentEmail)
            {
                _logger.LogWarning($"Email not allowed: {email}");
                return Unauthorized(new { 
                    message = "Please use your UMAK email or an approved development email",
                    settings = new { developmentEmails = developmentEmails.ToList().Select(e => e).ToArray() }
                });
            }

            _logger.LogInformation("Creating/retrieving user...");
            var user = await _userService.GetOrCreateUser(
                uid,
                email,
                displayName
            );
            _logger.LogInformation($"User processed: ID={user.Id}, Email={user.Email}");

            var response = new 
            { 
                message = "Authentication successful",
                user = new
                {
                    uid = user.Id,
                    email = user.Email,
                    name = user.DisplayName,
                    isAdmin = isAdmin,
                    displayName = user.DisplayName
                },
                settings = new
                {
                    developmentEmails = developmentEmails.ToList().Select(e => e).ToArray()
                }
            };

            _logger.LogInformation($"Sending response: {JsonSerializer.Serialize(response)}");
            return Ok(response);
        }
        catch (Exception ex)
        {
            _logger.LogError($"Error in TestProtected: {ex.Message}");
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

            var success = await _adminService.AssignAdminAsync(request.Email);
            if (!success)
            {
                return StatusCode(500, new { message = "Failed to assign admin" });
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