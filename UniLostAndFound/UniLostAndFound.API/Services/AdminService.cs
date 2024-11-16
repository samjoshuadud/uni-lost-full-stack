using UniLostAndFound.API.Repositories;
using UniLostAndFound.API.DTOs;

namespace UniLostAndFound.API.Services;

public class AdminService
{
    private readonly IUserAccessRepository _userAccessRepository;
    private readonly ILogger<AdminService> _logger;

    public AdminService(IUserAccessRepository userAccessRepository, ILogger<AdminService> logger)
    {
        _userAccessRepository = userAccessRepository;
        _logger = logger;
    }

    public async Task<bool> AssignAdminAsync(string email)
    {
        try
        {
            _logger.LogInformation($"Attempting to assign admin role to: {email}");

            var isAlreadyAdmin = await _userAccessRepository.IsAdminEmailAsync(email);
            if (isAlreadyAdmin)
            {
                _logger.LogInformation($"Email {email} is already an admin");
                return true;
            }

            var success = await _userAccessRepository.AddAdminEmailAsync(email);
            if (success)
            {
                _logger.LogInformation($"Successfully assigned admin role to {email}");
                return true;
            }

            _logger.LogError($"Failed to assign admin role to {email}");
            return false;
        }
        catch (Exception ex)
        {
            _logger.LogError($"Error assigning admin role: {ex.Message}");
            throw;
        }
    }

    public async Task<UserAccessSettingsDto> GetUserAccessSettingsAsync()
    {
        try
        {
            var adminEmails = await _userAccessRepository.GetAdminEmailsAsync();
            var developmentEmails = await _userAccessRepository.GetDevelopmentEmailsAsync();
            var allowedDomains = await _userAccessRepository.GetAllowedDomainsAsync();

            return new UserAccessSettingsDto
            {
                AdminEmails = adminEmails.ToList(),
                DevelopmentEmails = developmentEmails.ToList(),
                AllowedDomains = allowedDomains.ToList()
            };
        }
        catch (Exception ex)
        {
            _logger.LogError($"Error getting user access settings: {ex.Message}");
            throw;
        }
    }

    public async Task<bool> IsAllowedEmailAsync(string email)
    {
        try
        {
            return await _userAccessRepository.IsAllowedEmailAsync(email);
        }
        catch (Exception ex)
        {
            _logger.LogError($"Error checking if email is allowed: {ex.Message}");
            throw;
        }
    }
} 