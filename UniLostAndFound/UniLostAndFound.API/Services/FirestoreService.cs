using Google.Cloud.Firestore;
using UniLostAndFound.API.Models;
using Microsoft.Extensions.Logging;
using System.Text.Json;

namespace UniLostAndFound.API.Services;

public class FirestoreService
{
    private readonly FirestoreDb _db;
    private readonly ILogger<FirestoreService> _logger;
    private const string UsersCollection = "users";
    private const string UserAccessCollection = "userAccess";
    private const string ITEMS_COLLECTION = "items";
    private const string PENDING_PROCESSES_COLLECTION = "pendingProcesses";

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

    public async Task<User> GetOrCreateUser(string uid, string email, string displayName)
    {
        try
        {
            var userRef = _db.Collection(UsersCollection).Document(uid);
            var userDoc = await userRef.GetSnapshotAsync();

            if (userDoc.Exists)
            {
                return userDoc.ConvertTo<User>();
            }

            var newUser = new User
            {
                Id = uid,
                Email = email,
                DisplayName = displayName,
                CreatedAt = DateTime.UtcNow,
                UpdatedAt = DateTime.UtcNow
            };

            await userRef.SetAsync(newUser);
            return newUser;
        }
        catch (Exception ex)
        {
            _logger.LogError($"Error in GetOrCreateUser: {ex.Message}");
            throw;
        }
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

            if (!settingsDoc.Exists) return null;

            var settings = new UserAccess
            {
                AdminEmails = settingsDoc.GetValue<List<string>>("adminEmails") ?? new(),
                DevelopmentEmails = settingsDoc.GetValue<List<string>>("developmentEmails") ?? new(),
                AllowedDomains = settingsDoc.GetValue<List<string>>("allowedDomains") ?? new()
            };

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

    public async Task<string> CreateItemAsync(Item item)
    {
        try
        {
            if (string.IsNullOrEmpty(item.Status))
            {
                item.Status = ItemStatus.Lost;
            }

            var collection = _db.Collection(ITEMS_COLLECTION);
            var docRef = await collection.AddAsync(item);
            _logger.LogInformation($"Created item with ID: {docRef.Id} and status: {item.Status}");
            return docRef.Id;
        }
        catch (Exception ex)
        {
            _logger.LogError($"Error creating item: {ex.Message}");
            throw;
        }
    }

    public async Task<Item> GetItemAsync(string id)
    {
        var docRef = _db.Collection(ITEMS_COLLECTION).Document(id);
        var snapshot = await docRef.GetSnapshotAsync();
        return snapshot.ConvertTo<Item>();
    }

    public async Task<List<Item>> GetItemsByUniversityAsync(string universityId)
    {
        var query = _db.Collection(ITEMS_COLLECTION)
            .WhereEqualTo("UniversityId", universityId);
        var snapshot = await query.GetSnapshotAsync();
        
        return snapshot.Documents
            .Select(d => d.ConvertTo<Item>())
            .ToList();
    }

    public async Task UpdateItemAsync(string id, Item item)
    {
        var docRef = _db.Collection(ITEMS_COLLECTION).Document(id);
        await docRef.SetAsync(item);
    }

    public async Task DeleteItemAsync(string id)
    {
        var docRef = _db.Collection(ITEMS_COLLECTION).Document(id);
        await docRef.DeleteAsync();
    }

    public async Task<string> CreatePendingProcessAsync(PendingProcess process)
    {
        try
        {
            _logger.LogInformation($"Creating pending process for item: {process.ItemId}");
            
            var collection = _db.Collection(PENDING_PROCESSES_COLLECTION);
            
            var data = new Dictionary<string, object>
            {
                { "itemId", process.ItemId },
                { "userId", process.UserId },
                { "status", process.status },
                { "message", process.Message },
                { "createdAt", FieldValue.ServerTimestamp },
                { "updatedAt", FieldValue.ServerTimestamp }
            };

            var docRef = await collection.AddAsync(data);
            
            return docRef.Id;
        }
        catch (Exception ex)
        {
            _logger.LogError($"Error creating pending process: {ex.Message}");
            _logger.LogError(ex.StackTrace);
            throw;
        }
    }

    public async Task<List<PendingProcess>> GetPendingProcessesByUserIdAsync(string userId)
    {
        try
        {
            _logger.LogInformation($"Fetching pending processes for user: {userId}");
            
            var query = _db.Collection(PENDING_PROCESSES_COLLECTION)
                .WhereEqualTo("userId", userId);
            
            var snapshot = await query.GetSnapshotAsync();
            var processes = new List<PendingProcess>();
            
            foreach (var doc in snapshot.Documents)
            {
                try
                {
                    var data = doc.ToDictionary();

                    var process = new PendingProcess
                    {
                        Id = doc.Id,
                        ItemId = data.GetValueOrDefault("itemId", "").ToString(),
                        UserId = data.GetValueOrDefault("userId", "").ToString(),
                        status = data.GetValueOrDefault("status", "").ToString(),
                        Message = data.GetValueOrDefault("message", "").ToString(),
                    };

                    // Fetch the referenced item
                    if (!string.IsNullOrEmpty(process.ItemId))
                    {
                        var itemDoc = await _db.Collection(ITEMS_COLLECTION).Document(process.ItemId).GetSnapshotAsync();
                        if (itemDoc.Exists)
                        {
                            process.Item = itemDoc.ConvertTo<Item>();
                            process.Item.Id = itemDoc.Id; // Make sure to set the ID
                        }
                        else
                        {
                            _logger.LogWarning($"Item {process.ItemId} not found");
                        }
                    }
                    else
                    {
                        _logger.LogWarning($"No ItemId found for process {doc.Id}");
                    }

                    processes.Add(process);
                    _logger.LogInformation($"Successfully added process {doc.Id} with item data");
                }
                catch (Exception ex)
                {
                    _logger.LogError($"Error processing document {doc.Id}: {ex.Message}");
                    _logger.LogError(ex.StackTrace);
                }
            }

            _logger.LogInformation($"Returning {processes.Count} processes");
            return processes;
        }
        catch (Exception ex)
        {
            _logger.LogError($"Error fetching pending processes: {ex.Message}");
            _logger.LogError(ex.StackTrace);
            throw;
        }
    }

    public async Task<List<PendingProcess>> GetAllPendingProcessesAsync()
    {
        try
        {
            _logger.LogInformation("Fetching all pending processes");
            
            var query = _db.Collection(PENDING_PROCESSES_COLLECTION);
            var snapshot = await query.GetSnapshotAsync();
            var processes = new List<PendingProcess>();
            
            foreach (var doc in snapshot.Documents)
            {
                try
                {
                    var data = doc.ToDictionary();

                    var process = new PendingProcess
                    {
                        Id = doc.Id,
                        ItemId = data["itemId"]?.ToString() ?? "",
                        UserId = data["userId"]?.ToString() ?? "",
                        status = data["status"]?.ToString() ?? "",
                        Message = data["message"]?.ToString() ?? "",
                        CreatedAt = (data["createdAt"] as Timestamp?)?.ToDateTime() ?? DateTime.UtcNow,
                        UpdatedAt = (data["updatedAt"] as Timestamp?)?.ToDateTime() ?? DateTime.UtcNow
                    };

                    // Fetch the referenced item
                    if (!string.IsNullOrEmpty(process.ItemId))
                    {
                        var itemDoc = await _db.Collection(ITEMS_COLLECTION).Document(process.ItemId).GetSnapshotAsync();
                        if (itemDoc.Exists)
                        {
                            var item = new Item
                            {
                                Id = itemDoc.Id,
                                Name = itemDoc.GetValue<string>("Name"),
                                Description = itemDoc.GetValue<string>("Description"),
                                Category = itemDoc.GetValue<string>("Category"),
                                Status = itemDoc.GetValue<string>("Status"),
                                Location = itemDoc.GetValue<string>("Location"),
                                ImageUrl = itemDoc.GetValue<string>("ImageUrl"),
                                ReporterId = itemDoc.GetValue<string>("ReporterId"),
                                DateReported = (itemDoc.GetValue<Timestamp>("DateReported")).ToDateTime(),
                                Approved = itemDoc.GetValue<bool>("Approved"),
                                CreatedAt = (itemDoc.GetValue<Timestamp>("CreatedAt")).ToDateTime(),
                                UpdatedAt = (itemDoc.GetValue<Timestamp>("UpdatedAt")).ToDateTime()
                            };

                            // Handle AdditionalDescriptions if they exist
                            if (itemDoc.ContainsField("AdditionalDescriptions"))
                            {
                                var additionalDescs = itemDoc.GetValue<List<Dictionary<string, object>>>("AdditionalDescriptions");
                                item.AdditionalDescriptions = additionalDescs.Select(desc => new AdditionalDescription
                                {
                                    Title = desc["Title"]?.ToString() ?? "",
                                    Description = desc["Description"]?.ToString() ?? ""
                                }).ToList();
                            }

                            process.Item = item;
                            _logger.LogInformation($"Found item: {JsonSerializer.Serialize(item)}");
                        }
                        else
                        {
                            _logger.LogWarning($"Item {process.ItemId} not found");
                        }
                    }

                    processes.Add(process);
                    _logger.LogInformation($"Successfully added process {doc.Id} with item data");
                }
                catch (Exception ex)
                {
                    _logger.LogError($"Error processing document {doc.Id}: {ex.Message}");
                    _logger.LogError(ex.StackTrace);
                }
            }

            _logger.LogInformation($"Returning {processes.Count} processes");
            return processes;
        }
        catch (Exception ex)
        {
            _logger.LogError($"Error fetching all pending processes: {ex.Message}");
            _logger.LogError(ex.StackTrace);
            throw;
        }
    }

    public async Task DeletePendingProcessAndItemAsync(string processId, string itemId)
    {
        try
        {
            _logger.LogInformation($"Deleting pending process {processId} and item {itemId}");
            
            // Delete the pending process
            var processRef = _db.Collection(PENDING_PROCESSES_COLLECTION).Document(processId);
            await processRef.DeleteAsync();
            
            // Delete the associated item
            var itemRef = _db.Collection(ITEMS_COLLECTION).Document(itemId);
            await itemRef.DeleteAsync();
            
            _logger.LogInformation("Successfully deleted pending process and item");
        }
        catch (Exception ex)
        {
            _logger.LogError($"Error deleting pending process and item: {ex.Message}");
            throw;
        }
    }

    public async Task<List<PendingProcess>> GetPendingProcessesByIdAsync(string processId)
    {
        try
        {
            _logger.LogInformation($"Fetching pending process: {processId}");
            
            var docRef = _db.Collection(PENDING_PROCESSES_COLLECTION).Document(processId);
            var snapshot = await docRef.GetSnapshotAsync();
            var processes = new List<PendingProcess>();
            
            if (snapshot.Exists)
            {
                var data = snapshot.ToDictionary();
                var process = new PendingProcess
                {
                    Id = snapshot.Id,
                    ItemId = data.GetValueOrDefault("itemId", "").ToString(),
                    UserId = data.GetValueOrDefault("userId", "").ToString(),
                    status = data.GetValueOrDefault("status", "").ToString(),
                    Message = data.GetValueOrDefault("message", "").ToString(),
                };

                // Fetch the referenced item
                if (!string.IsNullOrEmpty(process.ItemId))
                {
                    var itemDoc = await _db.Collection(ITEMS_COLLECTION).Document(process.ItemId).GetSnapshotAsync();
                    if (itemDoc.Exists)
                    {
                        process.Item = itemDoc.ConvertTo<Item>();
                        process.Item.Id = itemDoc.Id;
                    }
                }

                processes.Add(process);
            }

            return processes;
        }
        catch (Exception ex)
        {
            _logger.LogError($"Error fetching pending process: {ex.Message}");
            throw;
        }
    }

    public async Task UpdateItemApprovalStatus(string itemId, bool approved)
    {
        var itemRef = _db.Collection("items").Document(itemId);
        await itemRef.UpdateAsync(new Dictionary<string, object>
        {
            { "Approved", approved }
        });
    }

    public async Task UpdatePendingProcessStatus(string itemId, string status)
    {
        try
        {
            _logger.LogInformation($"Updating process status for itemId {itemId} to {status}");
            
            // Get all pending processes for this item
            var processQuery = _db.Collection(PENDING_PROCESSES_COLLECTION)
                .WhereEqualTo("itemId", itemId);
            
            var snapshot = await processQuery.GetSnapshotAsync();
            
            if (!snapshot.Any())
            {
                _logger.LogWarning($"No pending process found for itemId {itemId}");
                return;
            }

            foreach (var processDoc in snapshot.Documents)
            {
                await processDoc.Reference.UpdateAsync(new Dictionary<string, object>
                {
                    { "status", status }, // Use lowercase to match the model
                    { "message", status == "pending_approval" ? 
                        "Waiting for the admin to approve the post, also checking if we have the item in possession." : 
                        "Item has been approved by admin" },
                    { "updatedAt", FieldValue.ServerTimestamp }
                });
                
                _logger.LogInformation($"Successfully updated process {processDoc.Id} status to {status}");
            }
        }
        catch (Exception ex)
        {
            _logger.LogError($"Error updating process status: {ex.Message}");
            throw;
        }
    }
} 