using UniLostAndFound.API.Repositories;
using UniLostAndFound.API.Models;
using UniLostAndFound.API.DTOs;
using UniLostAndFound.API.Data;
using System.Text.Json;

namespace UniLostAndFound.API.Services;

public class ItemService
{
    private readonly IItemRepository _itemRepository;
    private readonly IPendingProcessRepository _processRepository;
    private readonly ILogger<ItemService> _logger;
    private readonly AppDbContext _context;

    public ItemService(
        IItemRepository itemRepository,
        IPendingProcessRepository processRepository,
        ILogger<ItemService> logger,
        AppDbContext context)
    {
        _itemRepository = itemRepository;
        _processRepository = processRepository;
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
                    var item = new Item
                    {
                        Name = createDto.Name,
                        Description = createDto.Description,
                        Category = createDto.Category,
                        Status = createDto.Status,
                        Location = createDto.Location,
                        DateReported = DateTime.UtcNow,
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
                                        CreatedAt = DateTime.UtcNow,
                                        UpdatedAt = DateTime.UtcNow
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

                    // Create pending process
                    var process = new PendingProcess
                    {
                        ItemId = createdItem.Id,
                        UserId = createDto.ReporterId,
                        status = "pending_approval",
                        Message = "Waiting for admin approval"
                    };

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
} 