using FirebaseAdmin.Auth;
using UniLostAndFound.API.Models;
using UniLostAndFound.API.Repositories;
using Microsoft.EntityFrameworkCore;
using UniLostAndFound.API.Data;

namespace UniLostAndFound.API.Services;

public class UserService
{
    private readonly IBaseRepository<User> _userRepository;
    private readonly UserAccessService _userAccessService;
    private readonly ILogger<UserService> _logger;
    private readonly AppDbContext _context;

    public UserService(
        IBaseRepository<User> userRepository,
        UserAccessService userAccessService,
        AppDbContext context,
        ILogger<UserService> logger)
    {
        _userRepository = userRepository;
        _userAccessService = userAccessService;
        _context = context;
        _logger = logger;
    }

    public async Task<IEnumerable<User>> GetAllUsersAsync()
    {
        try
        {
            return await _context.Users
                .OrderByDescending(u => u.CreatedAt)
                .ToListAsync();
        }
        catch (Exception ex)
        {
            _logger.LogError($"Error getting all users: {ex.Message}");
            throw;
        }
    }

    public async Task<IEnumerable<User>> GetUsersByEmailsAsync(IEnumerable<string> emails)
    {
        try
        {
            return await _context.Users
                .Where(u => emails.Contains(u.Email))
                .OrderByDescending(u => u.CreatedAt)
                .ToListAsync();
        }
        catch (Exception ex)
        {
            _logger.LogError($"Error getting users by emails: {ex.Message}");
            throw;
        }
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