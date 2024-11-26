using UniLostAndFound.API.Repositories;
using UniLostAndFound.API.DTOs;
using UniLostAndFound.API.Models;
using UniLostAndFound.API.Constants;

namespace UniLostAndFound.API.Services;

public class AdminService
{
    private readonly IUserAccessRepository _userAccessRepository;
    private readonly ILogger<AdminService> _logger;
    private readonly PendingProcessService _processService;
    private readonly ItemService _itemService;

    public AdminService(
        IUserAccessRepository userAccessRepository,
        ILogger<AdminService> logger,
        PendingProcessService processService,
        ItemService itemService)
    {
        _userAccessRepository = userAccessRepository;
        _logger = logger;
        _processService = processService;
        _itemService = itemService;
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

    public async Task<bool> UnassignAdminAsync(string email)
    {
        try
        {
            _logger.LogInformation($"Attempting to remove admin role from: {email}");

            var isAdmin = await _userAccessRepository.IsAdminEmailAsync(email);
            if (!isAdmin)
            {
                _logger.LogInformation($"Email {email} is not an admin");
                return true;
            }

            var success = await _userAccessRepository.RemoveAdminEmailAsync(email);
            if (success)
            {
                _logger.LogInformation($"Successfully removed admin role from {email}");
                return true;
            }

            _logger.LogError($"Failed to remove admin role from {email}");
            return false;
        }
        catch (Exception ex)
        {
            _logger.LogError($"Error removing admin role: {ex.Message}");
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

    public async Task<IEnumerable<PendingProcess>> GetFailedVerificationsAsync()
    {
        try
        {
            return await _processService.GetFailedVerifications();
        }
        catch (Exception ex)
        {
            _logger.LogError($"Error getting failed verifications: {ex.Message}");
            throw;
        }
    }

    public async Task HandleFailedVerificationAsync(string processId, bool deleteItem)
    {
        try
        {
            var process = await _processService.GetProcessByIdAsync(processId);
            if (process == null)
            {
                throw new KeyNotFoundException("Process not found");
            }

            if (deleteItem)
            {
                // Delete both process and item
                await _processService.DeleteProcessAndItemAsync(processId);
            }
            else
            {
                // Just update the process status to indicate manual verification is needed
                process.status = ProcessMessages.Status.VERIFICATION_FAILED;
                process.Message = ProcessMessages.Messages.ADMIN_VERIFICATION_FAILED;
                await _processService.UpdateProcessAsync(process);
            }
        }
        catch (Exception ex)
        {
            _logger.LogError($"Error handling failed verification: {ex.Message}");
            throw;
        }
    }
} 