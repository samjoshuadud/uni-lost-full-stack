using UniLostAndFound.API.Repositories;
using UniLostAndFound.API.Models;

namespace UniLostAndFound.API.Services;

public class PendingProcessService
{
    private readonly IPendingProcessRepository _processRepository;
    private readonly IItemRepository _itemRepository;
    private readonly ILogger<PendingProcessService> _logger;

    public PendingProcessService(
        IPendingProcessRepository processRepository,
        IItemRepository itemRepository,
        ILogger<PendingProcessService> logger)
    {
        _processRepository = processRepository;
        _itemRepository = itemRepository;
        _logger = logger;
    }

    public async Task<IEnumerable<PendingProcess>> GetByUserIdAsync(string userId)
    {
        try
        {
            return await _processRepository.GetByUserIdAsync(userId);
        }
        catch (Exception ex)
        {
            _logger.LogError($"Error getting pending processes for user {userId}: {ex.Message}");
            throw;
        }
    }

    public async Task<IEnumerable<PendingProcess>> GetAllWithItemsAsync()
    {
        try
        {
            return await _processRepository.GetAllWithItemsAsync();
        }
        catch (Exception ex)
        {
            _logger.LogError($"Error getting all pending processes: {ex.Message}");
            throw;
        }
    }

    public async Task UpdateStatusAsync(string id, string status, string message)
    {
        try
        {
            await _processRepository.UpdateStatusAsync(id, status, message);

            // If status is approved, update the item as well
            if (status == "approved")
            {
                var process = await _processRepository.GetByIdAsync(id);
                if (process?.ItemId != null)
                {
                    await _itemRepository.UpdateApprovalStatusAsync(process.ItemId, true);
                }
            }
        }
        catch (Exception ex)
        {
            _logger.LogError($"Error updating process status: {ex.Message}");
            throw;
        }
    }

    public async Task DeleteProcessAndItemAsync(string processId)
    {
        try
        {
            var process = await _processRepository.GetByIdAsync(processId);
            if (process == null)
            {
                throw new KeyNotFoundException($"Process with ID {processId} not found");
            }

            // Delete the item first (if it exists)
            if (!string.IsNullOrEmpty(process.ItemId))
            {
                await _itemRepository.DeleteAsync(process.ItemId);
            }

            // Then delete the process
            await _processRepository.DeleteAsync(processId);
        }
        catch (Exception ex)
        {
            _logger.LogError($"Error deleting process and item: {ex.Message}");
            throw;
        }
    }
} 