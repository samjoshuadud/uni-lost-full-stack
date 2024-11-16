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

            var createdItem = await _itemRepository.CreateAsync(item);

            // Handle additional descriptions
            if (!string.IsNullOrEmpty(createDto.AdditionalDescriptions))
            {
                try
                {
                    _logger.LogInformation($"Processing additional descriptions: {createDto.AdditionalDescriptions}");
                    var descriptionDtos = JsonSerializer.Deserialize<List<AdditionalDescriptionDto>>(createDto.AdditionalDescriptions);
                    
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
                                UpdatedAt = DateTime.UtcNow,
                                Item = createdItem
                            };
                            createdItem.AdditionalDescriptions.Add(description);
                            _context.AdditionalDescriptions.Add(description);
                        }
                        await _context.SaveChangesAsync();
                        _logger.LogInformation($"Added {descriptionDtos.Count} additional descriptions");
                    }
                }
                catch (Exception ex)
                {
                    _logger.LogError($"Error processing additional descriptions: {ex.Message}");
                    _logger.LogError($"Stack trace: {ex.StackTrace}");
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

            return createdItem.Id;
        }
        catch (Exception ex)
        {
            _logger.LogError($"Error creating item: {ex.Message}");
            _logger.LogError($"Stack trace: {ex.StackTrace}");
            throw;
        }
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