using UniLostAndFound.API.Repositories;
using UniLostAndFound.API.Models;
using UniLostAndFound.API.DTOs;
using UniLostAndFound.API.Data;
using UniLostAndFound.API.Constants;
using System.Text.Json;
using System.IO;

namespace UniLostAndFound.API.Services;

public class ItemService
{
    private readonly IItemRepository _itemRepository;
    private readonly IPendingProcessRepository _processRepository;
    private readonly PendingProcessService _processService;
    private readonly ILogger<ItemService> _logger;
    private readonly AppDbContext _context;

    public ItemService(
        IItemRepository itemRepository,
        IPendingProcessRepository processRepository,
        PendingProcessService processService,
        ILogger<ItemService> logger,
        AppDbContext context)
    {
        _itemRepository = itemRepository;
        _processRepository = processRepository;
        _processService = processService;
        _logger = logger;
        _context = context;
    }

    public async Task<string> CreateItemAsync(CreateItemDto createDto, string imageUrl)
    {
        var strategy = _context.Database.CreateExecutionStrategy();

        return await strategy.ExecuteAsync<object, string>(
            state: null,
            operation: async (context, state, ct) =>
            {
                using var transaction = await _context.Database.BeginTransactionAsync(ct);
                try
                {
                    var manilaTimeZone = TimeZoneInfo.FindSystemTimeZoneById("Asia/Manila");
                    var currentDateTime = TimeZoneInfo.ConvertTimeFromUtc(DateTime.UtcNow, manilaTimeZone);

                    var item = new Item
                    {
                        Name = createDto.Name,
                        Description = createDto.Description,
                        Category = createDto.Category,
                        Status = createDto.Status,
                        Location = createDto.Location,
                        DateReported = currentDateTime,
                        ReporterId = createDto.ReporterId,
                        StudentId = createDto.StudentId,
                        Approved = false,
                        ImageUrl = imageUrl,
                        AdditionalDescriptions = new List<AdditionalDescription>()
                    };

                    // First save the item
                    var createdItem = await _itemRepository.CreateAsync(item);
                    await _context.SaveChangesAsync(ct);

                    // Handle additional descriptions
                    if (!string.IsNullOrEmpty(createDto.AdditionalDescriptions))
                    {
                        try
                        {
                            _logger.LogInformation($"Raw additional descriptions: {createDto.AdditionalDescriptions}");
                            var descriptionDtos = JsonSerializer.Deserialize<List<AdditionalDescriptionDto>>(
                                createDto.AdditionalDescriptions,
                                new JsonSerializerOptions { PropertyNameCaseInsensitive = true }
                            );

                            if (descriptionDtos != null && descriptionDtos.Any())
                            {
                                foreach (var dto in descriptionDtos)
                                {
                                    var description = new AdditionalDescription
                                    {
                                        ItemId = createdItem.Id,
                                        Title = dto.Title ?? string.Empty,
                                        Description = dto.Description ?? string.Empty,
                                        CreatedAt = currentDateTime,
                                        UpdatedAt = currentDateTime
                                    };
                                    _context.AdditionalDescriptions.Add(description);
                                }
                                await _context.SaveChangesAsync(ct);
                                _logger.LogInformation($"Added {descriptionDtos.Count} additional descriptions");
                            }
                        }
                        catch (Exception ex)
                        {
                            _logger.LogError($"Error processing additional descriptions: {ex.Message}");
                            _logger.LogError($"Stack trace: {ex.StackTrace}");
                            throw;
                        }
                    }

                    // Create pending process with the correct status and message
                    var process = new PendingProcess
                    {
                        Id = Guid.NewGuid().ToString(),
                        ItemId = createdItem.Id,
                        UserId = createDto.ReporterId,
                        status = createDto.ProcessStatus ?? ProcessMessages.Status.PENDING_APPROVAL,
                        Message = createDto.Message ?? ProcessMessages.Messages.WAITING_APPROVAL,
                        CreatedAt = currentDateTime,
                        UpdatedAt = currentDateTime
                    };

                    _logger.LogInformation($"Creating process with status: {process.status} and message: {process.Message}");
                    await _processRepository.CreateAsync(process);
                    await _context.SaveChangesAsync(ct);
                    
                    await transaction.CommitAsync(ct);
                    return createdItem.Id;
                }
                catch (Exception ex)
                {
                    await transaction.RollbackAsync(ct);
                    _logger.LogError($"Error creating item: {ex.Message}");
                    _logger.LogError($"Stack trace: {ex.StackTrace}");
                    throw;
                }
            },
            verifySucceeded: null,
            cancellationToken: CancellationToken.None
        );
    }

    public async Task<Item?> GetItemAsync(string id)
    {
        return await _itemRepository.GetByIdAsync(id);
    }

    public async Task<IEnumerable<Item>> GetApprovedItemsAsync()
    {
        return await _itemRepository.GetApprovedItemsAsync();
    }

    public async Task UpdateApprovalStatusAsync(string id, bool approved)
    {
        await _itemRepository.UpdateApprovalStatusAsync(id, approved);
    }

    public async Task DeleteItemAsync(string id)
    {
        await _itemRepository.DeleteAsync(id);
    }

    public async Task ScheduleItemDeletion(string itemId, TimeSpan delay)
    {
        // Create a background task to delete the item after delay
        _ = Task.Run(async () =>
        {
            await Task.Delay(delay);
            
            // Check if item still exists and is in awaiting_surrender status
            var process = await _processService.GetProcessByItemIdAsync(itemId);
            if (process != null && process.status == "awaiting_surrender")
            {
                await DeleteItemAsync(itemId);
            }
        });
    }

    public async Task UpdateItemDetailsAsync(string id, UpdateItemDetailsDto dto, string? imageUrl)
    {
        var item = await _context.Items.FindAsync(id);
        if (item == null)
            throw new Exception("Item not found");

        // Update basic details
        item.Name = dto.Name;
        item.Description = dto.Description;
        item.Location = dto.Location;
        item.Category = dto.Category;
        item.StudentId = dto.StudentId;

        if (!string.IsNullOrEmpty(dto.ReporterId))
        {
            item.ReporterId = dto.ReporterId;
        }
        
        // Only update ImageUrl if a new image was uploaded
        if (!string.IsNullOrEmpty(imageUrl))
        {
            // Delete old image file if it exists
            if (!string.IsNullOrEmpty(item.ImageUrl))
            {
                var oldImagePath = Path.Combine(
                    Directory.GetCurrentDirectory(),
                    "..",
                    "..",
                    "frontend",
                    "public",
                    item.ImageUrl.TrimStart('/')
                );
                
                if (File.Exists(oldImagePath))
                {
                    try
                    {
                        File.Delete(oldImagePath);
                    }
                    catch (Exception ex)
                    {
                        _logger.LogError($"Error deleting old image: {ex.Message}");
                        // Continue with update even if old image deletion fails
                    }
                }
            }
            
            // Update with new image path
            item.ImageUrl = imageUrl;
        }

        // Handle additional descriptions
        if (!string.IsNullOrEmpty(dto.AdditionalDescriptions))
        {
            try
            {
                // Remove existing descriptions
                var existingDescriptions = _context.AdditionalDescriptions
                    .Where(d => d.ItemId == id);
                _context.AdditionalDescriptions.RemoveRange(existingDescriptions);

                // Add new descriptions
                var descriptions = JsonSerializer.Deserialize<List<AdditionalDescriptionDto>>(
                    dto.AdditionalDescriptions,
                    new JsonSerializerOptions { PropertyNameCaseInsensitive = true }
                );

                if (descriptions != null)
                {
                    var manilaTimeZone = TimeZoneInfo.FindSystemTimeZoneById("Asia/Manila");
                    var currentDateTime = TimeZoneInfo.ConvertTimeFromUtc(DateTime.UtcNow, manilaTimeZone);

                    foreach (var desc in descriptions)
                    {
                        var newDesc = new AdditionalDescription
                        {
                            ItemId = id,
                            Title = desc.Title,
                            Description = desc.Description,
                            CreatedAt = currentDateTime,
                            UpdatedAt = currentDateTime
                        };
                        _context.AdditionalDescriptions.Add(newDesc);
                    }
                }
            }
            catch (Exception ex)
            {
                _logger.LogError($"Error updating additional descriptions: {ex.Message}");
                throw;
            }
        }

        await _context.SaveChangesAsync();
    }

    public async Task<Item> UpdateItemAsync(Item item)
    {
        try
        {
            var manilaTimeZone = TimeZoneInfo.FindSystemTimeZoneById("Asia/Manila");
            var currentDateTime = TimeZoneInfo.ConvertTimeFromUtc(DateTime.UtcNow, manilaTimeZone);

            item.UpdatedAt = currentDateTime;
            _context.Items.Update(item);
            await _context.SaveChangesAsync();
            return item;
        }
        catch (Exception ex)
        {
            _logger.LogError($"Error updating item: {ex.Message}");
            throw;
        }
    }
} 