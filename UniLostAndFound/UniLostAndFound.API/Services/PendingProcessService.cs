using UniLostAndFound.API.Repositories;
using UniLostAndFound.API.Models;
using Microsoft.Extensions.Logging;
using UniLostAndFound.API.Constants;
using Microsoft.EntityFrameworkCore;
using UniLostAndFound.API.Data;

namespace UniLostAndFound.API.Services;

public class PendingProcessService
{
    private readonly IPendingProcessRepository _processRepository;
    private readonly IItemRepository _itemRepository;
    private readonly ILogger<PendingProcessService> _logger;
    private readonly AppDbContext _context;

    public PendingProcessService(
        IPendingProcessRepository processRepository,
        IItemRepository itemRepository,
        ILogger<PendingProcessService> logger,
        AppDbContext context)
    {
        _processRepository = processRepository;
        _itemRepository = itemRepository;
        _logger = logger;
        _context = context;
    }

    public async Task<List<PendingProcess>> GetByUserIdAsync(string userId)
    {
        return await _context.PendingProcesses
            .Include(p => p.Item)
            .Where(p => p.UserId == userId || 
                       (p.Item != null && p.Item.ReporterId == userId) ||
                       p.OriginalReporterUserId == userId)
            .ToListAsync();
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

            var manilaTimeZone = TimeZoneInfo.FindSystemTimeZoneById("Asia/Manila");
            var currentDateTime = TimeZoneInfo.ConvertTimeFromUtc(DateTime.UtcNow, manilaTimeZone);

            process.status = status;
            process.Message = message;
            process.UpdatedAt = currentDateTime;

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
            
            var manilaTimeZone = TimeZoneInfo.FindSystemTimeZoneById("Asia/Manila");
            var currentDateTime = TimeZoneInfo.ConvertTimeFromUtc(DateTime.UtcNow, manilaTimeZone);
            
            process.CreatedAt = currentDateTime;
            process.UpdatedAt = currentDateTime;

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

    public async Task<PendingProcess> GetProcessByIdAsync(string processId)
    {
        return await _context.PendingProcesses
            .Include(p => p.Item)
            .FirstOrDefaultAsync(p => p.Id == processId);
    }

    public async Task<PendingProcess> UpdateProcessAsync(PendingProcess process)
    {
        _context.PendingProcesses.Update(process);
        await _context.SaveChangesAsync();
        return process;
    }

    public async Task<PendingProcess> GetProcessByItemIdAsync(string itemId)
    {
        try
        {
            var process = await _context.PendingProcesses
                .Include(p => p.Item)
                .FirstOrDefaultAsync(p => p.ItemId == itemId);

            return process;
        }
        catch (Exception ex)
        {
            _logger.LogError($"Error getting process by item ID: {ex.Message}");
            throw;
        }
    }

    public async Task<IEnumerable<PendingProcess>> GetUserInvolvedProcessesAsync(string userId)
    {
        return await _context.PendingProcesses
            .Include(p => p.Item)
            .Where(p => p.UserId == userId || p.OriginalReporterUserId == userId)
            .Where(p => p.status == ProcessMessages.Status.PENDING_RETRIEVAL 
                    || p.status == ProcessMessages.Status.HANDED_OVER 
                    || p.status == ProcessMessages.Status.NO_SHOW)
            .ToListAsync();
    }
} 