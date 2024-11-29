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
            var user = await _userRepository.GetByIdAsync(uid);
            if (user == null)
            {
                // Extract student ID from UMAK email
                string studentId = "";
                if (email.ToLower().EndsWith("@umak.edu.ph"))
                {
                    var parts = email.Split('@')[0].Split('.');
                    if (parts.Length > 1)
                    {
                        // Get the part after the dot and convert to uppercase
                        studentId = parts[1].ToUpper();
                    }
                }

                user = new User
                {
                    Id = uid,
                    Email = email,
                    DisplayName = displayName,
                    StudentId = studentId, // Save the extracted student ID
                    CreatedAt = DateTime.UtcNow,
                    UpdatedAt = DateTime.UtcNow
                };
                
                _logger.LogInformation($"Creating new user with email: {email}, studentId: {studentId}");
                return await _userRepository.CreateAsync(user);
            }

            // Update existing user if needed
            if (string.IsNullOrEmpty(user.StudentId) && email.ToLower().EndsWith("@umak.edu.ph"))
            {
                var parts = email.Split('@')[0].Split('.');
                if (parts.Length > 1)
                {
                    user.StudentId = parts[1].ToUpper();
                    user.UpdatedAt = DateTime.UtcNow;
                    await _context.SaveChangesAsync();
                    _logger.LogInformation($"Updated existing user with studentId: {user.StudentId}");
                }
            }

            return user;
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

    public async Task<User?> GetUserByEmailAsync(string email)
    {
        try
        {
            return await _context.Users
                .FirstOrDefaultAsync(u => u.Email.ToLower() == email.ToLower());
        }
        catch (Exception ex)
        {
            _logger.LogError($"Error getting user by email: {ex.Message}");
            throw;
        }
    }

    public async Task<bool> DeleteUserAsync(string email)
    {
        try
        {
            var user = await GetUserByEmailAsync(email);
            if (user == null) return false;

            // Start a transaction
            using var transaction = await _context.Database.BeginTransactionAsync();
            try
            {
                // Delete related records first
                var userItems = await _context.Items
                    .Where(i => i.ReporterId == user.Id)
                    .ToListAsync();

                var userProcesses = await _context.PendingProcesses
                    .Where(p => p.UserId == user.Id)
                    .ToListAsync();

                // Remove all related records
                _context.PendingProcesses.RemoveRange(userProcesses);
                _context.Items.RemoveRange(userItems);
                _context.Users.Remove(user);

                // Save changes
                await _context.SaveChangesAsync();

                // Commit transaction
                await transaction.CommitAsync();
                return true;
            }
            catch (Exception)
            {
                // Rollback transaction on error
                await transaction.RollbackAsync();
                throw;
            }
        }
        catch (Exception ex)
        {
            _logger.LogError($"Error deleting user: {ex.Message}");
            return false;
        }
    }
} 