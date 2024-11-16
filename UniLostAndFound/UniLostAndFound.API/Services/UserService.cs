using FirebaseAdmin.Auth;
using UniLostAndFound.API.Models;
using UniLostAndFound.API.Repositories;

namespace UniLostAndFound.API.Services;

public class UserService
{
    private readonly IBaseRepository<User> _userRepository;
    private readonly UserAccessService _userAccessService;
    private readonly ILogger<UserService> _logger;

    public UserService(
        IBaseRepository<User> userRepository,
        UserAccessService userAccessService,
        ILogger<UserService> logger)
    {
        _userRepository = userRepository;
        _userAccessService = userAccessService;
        _logger = logger;
    }

    public async Task<User> GetOrCreateUser(string uid, string email, string displayName)
    {
        try
        {
            var existingUser = await _userRepository.GetByIdAsync(uid);
            if (existingUser != null)
            {
                return existingUser;
            }

            var newUser = new User
            {
                Id = uid,
                Email = email,
                DisplayName = displayName,
                CreatedAt = DateTime.UtcNow,
                UpdatedAt = DateTime.UtcNow
            };

            return await _userRepository.CreateAsync(newUser);
        }
        catch (Exception ex)
        {
            _logger.LogError($"Error in GetOrCreateUser: {ex.Message}");
            throw;
        }
    }

    public async Task<User?> GetUser(string uid)
    {
        return await _userRepository.GetByIdAsync(uid);
    }

    public async Task<bool> IsAdminEmail(string email)
    {
        return await _userAccessService.IsAdminEmailAsync(email);
    }

    public async Task<bool> VerifyFirebaseToken(string idToken)
    {
        try
        {
            var decodedToken = await FirebaseAuth.DefaultInstance.VerifyIdTokenAsync(idToken);
            return decodedToken != null;
        }
        catch
        {
            return false;
        }
    }
} 