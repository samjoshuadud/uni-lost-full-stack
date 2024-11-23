namespace UniLostAndFound.API.Repositories;

using UniLostAndFound.API.Models;

public interface IPendingProcessRepository : IBaseRepository<PendingProcess>
{
    Task<List<PendingProcess>> GetByUserIdAsync(string userId);
    Task<List<PendingProcess>> GetAllWithItemsAsync();
    Task<PendingProcess> GetProcessByIdAsync(string id);
    Task<PendingProcess> GetProcessByItemIdAsync(string itemId);
    Task UpdateStatusAsync(string id, string status, string message);
} 