using UniLostAndFound.API.DTOs;
using UniLostAndFound.API.Repositories;

namespace UniLostAndFound.API.Services;

public class UserAccessService
{
    private readonly IUserAccessRepository _userAccessRepository;
    private readonly ILogger<UserAccessService> _logger;

    public UserAccessService(IUserAccessRepository userAccessRepository, ILogger<UserAccessService> logger)
    {
        _userAccessRepository = userAccessRepository;
        _logger = logger;
    }

    public async Task<UserAccessSettingsDto> GetSettingsAsync()
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

    public async Task<bool> IsAdminEmailAsync(string email)
    {
        return await _userAccessRepository.IsAdminEmailAsync(email);
    }

    public async Task<bool> IsAllowedEmailAsync(string email)
    {
        return await _userAccessRepository.IsAllowedEmailAsync(email);
    }

    public async Task<List<string>> GetDevelopmentEmailsAsync()
    {
        var developmentEmails = await _userAccessRepository.GetDevelopmentEmailsAsync();
        return developmentEmails.ToList();
    }
} 