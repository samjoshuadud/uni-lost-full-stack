using Microsoft.Extensions.DependencyInjection;
using Microsoft.Extensions.Hosting;
using Microsoft.Extensions.Logging;
using UniLostAndFound.API.Constants;

namespace UniLostAndFound.API.Services.BackgroundServices;

public class ItemCleanupService : BackgroundService
{
    private readonly ILogger<ItemCleanupService> _logger;
    private readonly IServiceProvider _serviceProvider;
    private readonly TimeSpan _checkInterval = TimeSpan.FromHours(1); // Changed back to 1 hour

    public ItemCleanupService(
        ILogger<ItemCleanupService> logger,
        IServiceProvider serviceProvider)
    {
        _logger = logger;
        _serviceProvider = serviceProvider;
    }

    protected override async Task ExecuteAsync(CancellationToken stoppingToken)
    {
        while (!stoppingToken.IsCancellationRequested)
        {
            try
            {
                await DeleteExpiredItems();
                await Task.Delay(_checkInterval, stoppingToken);
            }
            catch (Exception ex)
            {
                _logger.LogError($"Error in ItemCleanupService: {ex.Message}");
                await Task.Delay(TimeSpan.FromMinutes(5), stoppingToken); // Wait 5 minutes before retrying
            }
        }
    }

    private async Task DeleteExpiredItems()
    {
        using var scope = _serviceProvider.CreateScope();
        var processService = scope.ServiceProvider.GetRequiredService<PendingProcessService>();
        var itemService = scope.ServiceProvider.GetRequiredService<ItemService>();
        var logger = scope.ServiceProvider.GetRequiredService<ILogger<ItemCleanupService>>();

        try
        {
            var processes = await processService.GetAllWithItemsAsync();
            var expiredItems = processes.Where(p => 
                p.status == ProcessMessages.Status.AWAITING_SURRENDER && 
                (DateTime.UtcNow - p.CreatedAt).TotalDays > 3  // Changed back to 3 days
            );

            foreach (var process in expiredItems)
            {
                logger.LogInformation($"Deleting expired item {process.ItemId} (Created: {process.CreatedAt})");
                await processService.DeleteProcessAndItemAsync(process.Id);
            }
        }
        catch (Exception ex)
        {
            logger.LogError($"Error deleting expired items: {ex.Message}");
            throw;
        }
    }
} 