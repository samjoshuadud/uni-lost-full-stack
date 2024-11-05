using Google.Cloud.Firestore;
using UniLostAndFound.API.Models;
using Microsoft.Extensions.Logging;

namespace UniLostAndFound.API.Services;

public class FirestoreService
{
    private readonly FirestoreDb _db;
    private readonly ILogger<FirestoreService> _logger;
    private const string UsersCollection = "users";
    private const string UserAccessCollection = "userAccess";

    public FirestoreService(string projectId, ILogger<FirestoreService> logger)
    {
        _db = FirestoreDb.Create(projectId);
        _logger = logger;
    }

    public async Task<bool> IsAdminEmail(string email)
    {
        try
        {
            var settingsDoc = await _db.Collection(UserAccessCollection).Document("settings").GetSnapshotAsync();
            if (!settingsDoc.Exists) return false;

            var adminEmails = settingsDoc.GetValue<List<string>>("adminEmails");
            return adminEmails?.Contains(email) ?? false;
        }
        catch (Exception)
        {
            return false;
        }
    }

    public async Task<User> GetOrCreateUser(string uid, string email, string displayName, string defaultRole = "select")
    {
        var userRef = _db.Collection(UsersCollection).Document(uid);
        var userDoc = await userRef.GetSnapshotAsync();

        if (userDoc.Exists)
        {
            var user = userDoc.ConvertTo<User>();
            return user;
        }

        var newUser = new User
        {
            Id = uid,
            Email = email,
            DisplayName = displayName,
            Role = defaultRole,
            CreatedAt = DateTime.UtcNow,
            UpdatedAt = DateTime.UtcNow
        };

        await userRef.SetAsync(newUser);
        return newUser;
    }

    public async Task UpdateUserRole(string userId, string role)
    {
        var userRef = _db.Collection(UsersCollection).Document(userId);
        await userRef.UpdateAsync(new Dictionary<string, object>
        {
            { "role", role },
            { "updatedAt", DateTime.UtcNow }
        });
    }

    public async Task<User?> GetUser(string uid)
    {
        var userDoc = await _db.Collection(UsersCollection).Document(uid).GetSnapshotAsync();
        return userDoc.Exists ? userDoc.ConvertTo<User>() : null;
    }

    public async Task<UserAccess?> GetUserAccessSettings()
    {
        try
        {
            var settingsDoc = await _db.Collection(UserAccessCollection).Document("settings").GetSnapshotAsync();
            _logger.LogInformation($"[Debug] Settings document exists: {settingsDoc.Exists}");

            if (!settingsDoc.Exists) return null;

            var settings = new UserAccess
            {
                AdminEmails = settingsDoc.GetValue<List<string>>("adminEmails") ?? new(),
                DevelopmentEmails = settingsDoc.GetValue<List<string>>("developmentEmails") ?? new(),
                AllowedDomains = settingsDoc.GetValue<List<string>>("allowedDomains") ?? new()
            };

            // Debug log the settings
            _logger.LogInformation("[Debug] Settings retrieved:");
            _logger.LogInformation($"[Debug] Admin Emails: {string.Join(", ", settings.AdminEmails)}");
            _logger.LogInformation($"[Debug] Development Emails: {string.Join(", ", settings.DevelopmentEmails)}");
            _logger.LogInformation($"[Debug] Allowed Domains: {string.Join(", ", settings.AllowedDomains)}");

            return settings;
        }
        catch (Exception ex)
        {
            _logger.LogError($"[Debug] Error getting settings: {ex.Message}");
            return null;
        }
    }

    public async Task<bool> UpdateAdminEmails(List<string> adminEmails)
    {
        try
        {
            var settingsRef = _db.Collection(UserAccessCollection).Document("settings");
            
            await settingsRef.UpdateAsync(new Dictionary<string, object>
            {
                { "adminEmails", adminEmails }
            });

            _logger.LogInformation($"[Debug] Updated admin emails: {string.Join(", ", adminEmails)}");
            return true;
        }
        catch (Exception ex)
        {
            _logger.LogError($"[Debug] Error updating admin emails: {ex.Message}");
            return false;
        }
    }
} 