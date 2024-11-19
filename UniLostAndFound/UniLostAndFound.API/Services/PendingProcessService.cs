using UniLostAndFound.API.Repositories;
using UniLostAndFound.API.Models;
using Microsoft.Extensions.Logging;
using UniLostAndFound.API.Constants;

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
            var process = await _processRepository.GetByIdAsync(id);
            if (process == null)
            {
                throw new KeyNotFoundException($"Process with ID {id} not found");
            }

            // Validate status transition
            if (!IsValidStatusTransition(process.status, status))
            {
                throw new InvalidOperationException("Invalid status transition");
            }

            process.status = status;
            process.Message = message;
            process.UpdatedAt = DateTime.UtcNow;

            // If status is approved, update the item's approval status
            if (status == ProcessMessages.Status.APPROVED)
            {
                await _itemRepository.UpdateApprovalStatusAsync(process.ItemId, true);
            }

            await _processRepository.UpdateAsync(process);
            
            _logger.LogInformation($"Successfully updated process {id} status to {status}");
        }
        catch (Exception ex)
        {
            _logger.LogError($"Error updating process status: {ex.Message}");
            throw;
        }
    }

    private bool IsValidStatusTransition(string currentStatus, string newStatus)
    {
        // Add validation logic for status transitions
        // For now, allow all transitions
        return true;
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

    public async Task<string> CreateProcessAsync(PendingProcess process)
    {
        try
        {
            _logger.LogInformation($"Creating pending process for item: {process.ItemId}");
            
            // Set default values if not provided
            process.Id = process.Id ?? Guid.NewGuid().ToString();
            process.CreatedAt = DateTime.UtcNow;
            process.UpdatedAt = DateTime.UtcNow;

            // Create the process and get the created entity back
            var createdProcess = await _processRepository.CreateAsync(process);
            
            _logger.LogInformation($"Successfully created pending process with ID: {createdProcess.Id}");
            
            return createdProcess.Id;
        }
        catch (Exception ex)
        {
            _logger.LogError($"Error creating pending process: {ex.Message}");
            throw;
        }
    }
} 