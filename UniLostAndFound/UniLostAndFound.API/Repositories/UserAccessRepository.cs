namespace UniLostAndFound.API.Repositories;

using Microsoft.EntityFrameworkCore;
using UniLostAndFound.API.Data;
using UniLostAndFound.API.Models;
using Microsoft.Extensions.Logging;

public class UserAccessRepository : IUserAccessRepository
{
    private readonly AppDbContext _context;
    private readonly ILogger<UserAccessRepository> _logger;

    public UserAccessRepository(AppDbContext context, ILogger<UserAccessRepository> logger)
    {
        _context = context;
        _logger = logger;
    }

    public async Task<IEnumerable<string>> GetAdminEmailsAsync()
    {
        return await _context.UserAccess
            .Where(ua => ua.Type == "admin")
            .Select(ua => ua.Value)
            .ToListAsync();
    }

    public async Task<IEnumerable<string>> GetDevelopmentEmailsAsync()
    {
        return await _context.UserAccess
            .Where(ua => ua.Type == "development")
            .Select(ua => ua.Value)
            .ToListAsync();
    }

    public async Task<IEnumerable<string>> GetAllowedDomainsAsync()
    {
        return await _context.UserAccess
            .Where(ua => ua.Type == "domain")
            .Select(ua => ua.Value)
            .ToListAsync();
    }

    public async Task<bool> AddAdminEmailAsync(string email)
    {
        try
        {
            await _context.UserAccess.AddAsync(new UserAccess
            {
                Type = "admin",
                Value = email
            });
            await _context.SaveChangesAsync();
            return true;
        }
        catch (Exception ex)
        {
            _logger.LogError($"Error adding admin email: {ex.Message}");
            return false;
        }
    }

    public async Task<bool> IsAdminEmailAsync(string email)
    {
        return await _context.UserAccess
            .AnyAsync(ua => ua.Type == "admin" && 
                           ua.Value.ToLower() == email.ToLower());
    }

    public async Task<bool> IsAllowedEmailAsync(string email)
    {
        _logger.LogInformation($"Checking if email is allowed: {email}");

        // First check if it's a UMAK email (case insensitive)
        if (email.ToLower().EndsWith("@umak.edu.ph"))
        {
            _logger.LogInformation($"Email {email} is a UMAK email");
            return true;
        }

        // Then check if it's a development email (case insensitive)
        var devEmails = await _context.UserAccess
            .Where(ua => ua.Type == "development")
            .Select(ua => ua.Value.ToLower())
            .ToListAsync();

        _logger.LogInformation($"Development emails in database: {string.Join(", ", devEmails)}");
        
        var isDevEmail = devEmails.Contains(email.ToLower());
        _logger.LogInformation($"Is development email check result: {isDevEmail}");

        return isDevEmail;
    }
} 