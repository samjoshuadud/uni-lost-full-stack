using System;
using System.Collections.Generic;
using System.Text.Json;
using System.Threading.Tasks;
using Google.Cloud.Firestore;
using Microsoft.Extensions.Logging;
using UniLostAndFound.API.Models;

namespace UniLostAndFound.API.Services
{
    public class FirestoreService
    {
        private readonly FirestoreDb _db;
        private readonly ILogger<FirestoreService> _logger;

        public FirestoreService(FirestoreDb db, ILogger<FirestoreService> logger)
        {
            _db = db;
            _logger = logger;
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
                        _logger.LogInformation($"Processing document data: {JsonSerializer.Serialize(data)}");

                        var process = new PendingProcess
                        {
                            Id = doc.Id,
                            ItemId = data.GetValueOrDefault("itemId", "").ToString(),
                            UserId = data.GetValueOrDefault("userId", "").ToString(),
                            Status = data.GetValueOrDefault("status", "").ToString(),
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
                                _logger.LogInformation($"Found item: {JsonSerializer.Serialize(process.Item)}");
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
    }
} 