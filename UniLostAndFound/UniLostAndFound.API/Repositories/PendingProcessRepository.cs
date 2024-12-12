namespace UniLostAndFound.API.Repositories;

using Microsoft.EntityFrameworkCore;
using UniLostAndFound.API.Data;
using UniLostAndFound.API.Models;
using Microsoft.Extensions.Logging;
using System.Text.Json;
using System.Text.Json.Serialization;

public class PendingProcessRepository : BaseRepository<PendingProcess>, IPendingProcessRepository
{
    private readonly ILogger<PendingProcessRepository> _logger;

    public PendingProcessRepository(AppDbContext context, ILogger<PendingProcessRepository> logger) : base(context)
    {
        _logger = logger;
    }

    public async Task<List<PendingProcess>> GetByUserIdAsync(string userId)
    {
        try
        {
            var processes = await _dbSet
                .Include(p => p.Item)
                    .ThenInclude(i => i.AdditionalDescriptions)
                .Include(p => p.User)
                .Where(p => p.UserId == userId)
                .OrderByDescending(p => p.CreatedAt)
                .ToListAsync();

            _logger.LogInformation($"Found {processes.Count} pending processes for user {userId}");
            return processes;
        }
        catch (Exception ex)
        {
            _logger.LogError($"Error getting pending processes: {ex.Message}");
            return new List<PendingProcess>();
        }
    }

    public async Task<List<PendingProcess>> GetAllWithItemsAsync()
    {
        try
        {
            var processes = await _dbSet
                .Include(p => p.Item)
                    .ThenInclude(i => i.AdditionalDescriptions)
                .OrderByDescending(p => p.CreatedAt)
                .ToListAsync();

            _logger.LogInformation($"Retrieved {processes.Count} total pending processes");
            return processes;
        }
        catch (Exception ex)
        {
            _logger.LogError($"Error getting all processes: {ex.Message}");
            return new List<PendingProcess>();
        }
    }

    public async Task<PendingProcess> GetProcessByIdAsync(string id)
    {
        try
        {
            return await _dbSet
                .Include(p => p.Item)
                    .ThenInclude(i => i.AdditionalDescriptions)
                .FirstOrDefaultAsync(p => p.Id == id);
        }
        catch (Exception ex)
        {
            _logger.LogError($"Error getting process by ID: {ex.Message}");
            return null;
        }
    }

    public async Task<PendingProcess> GetProcessByItemIdAsync(string itemId)
    {
        return await _context.PendingProcesses
            .Include(p => p.Item)
            .FirstOrDefaultAsync(p => p.ItemId == itemId);
    }

    public async Task UpdateStatusAsync(string id, string status, string message)
    {
        try
        {
            var process = await GetByIdAsync(id);
            if (process != null)
            {
                var manilaTimeZone = TimeZoneInfo.FindSystemTimeZoneById("Asia/Manila");
                var currentDateTime = TimeZoneInfo.ConvertTimeFromUtc(DateTime.UtcNow, manilaTimeZone);
                
                process.status = status;
                process.Message = message;
                process.UpdatedAt = currentDateTime;
                await UpdateAsync(process);
                _logger.LogInformation($"Updated process {id} status to {status}");
            }
            else
            {
                _logger.LogWarning($"Process {id} not found for status update");
            }
        }
        catch (Exception ex)
        {
            _logger.LogError($"Error updating process status: {ex.Message}");
            throw;
        }
    }

    public override async Task<PendingProcess?> GetByIdAsync(string id)
    {
        try
        {
            return await _dbSet
                .Include(p => p.Item)
                    .ThenInclude(i => i.AdditionalDescriptions)
                .FirstOrDefaultAsync(p => p.Id == id);
        }
        catch (Exception ex)
        {
            _logger.LogError($"Error getting process by ID: {ex.Message}");
            return null;
        }
    }

    public override async Task<PendingProcess> CreateAsync(PendingProcess process)
    {
        try
        {
            _logger.LogInformation($"Adding new pending process for item {process.ItemId}");
            await _dbSet.AddAsync(process);
            await _context.SaveChangesAsync();
            _logger.LogInformation($"Successfully added pending process with ID: {process.Id}");
            return process;
        }
        catch (Exception ex)
        {
            _logger.LogError($"Error adding pending process: {ex.Message}");
            throw;
        }
    }

    public async Task<PendingProcess> CreateWithTransactionAsync(PendingProcess process)
    {
        using var transaction = await _context.Database.BeginTransactionAsync();
        try
        {
            var result = await CreateAsync(process);
            await transaction.CommitAsync();
            return result;
        }
        catch
        {
            await transaction.RollbackAsync();
            throw;
        }
    }
} 