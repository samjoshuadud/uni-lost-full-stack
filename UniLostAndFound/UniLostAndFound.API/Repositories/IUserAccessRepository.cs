namespace UniLostAndFound.API.Repositories;

using UniLostAndFound.API.Models;

public interface IUserAccessRepository
{
    Task<IEnumerable<string>> GetAdminEmailsAsync();
    Task<IEnumerable<string>> GetDevelopmentEmailsAsync();
    Task<IEnumerable<string>> GetAllowedDomainsAsync();
    Task<bool> AddAdminEmailAsync(string email);
    Task<bool> IsAdminEmailAsync(string email);
    Task<bool> IsAllowedEmailAsync(string email);
} 