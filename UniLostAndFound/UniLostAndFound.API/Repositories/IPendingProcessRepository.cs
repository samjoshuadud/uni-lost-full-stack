namespace UniLostAndFound.API.Repositories;

using UniLostAndFound.API.Models;

public interface IPendingProcessRepository : IBaseRepository<PendingProcess>
{
    Task<IEnumerable<PendingProcess>> GetByUserIdAsync(string userId);
    Task<IEnumerable<PendingProcess>> GetByItemIdAsync(string itemId);
    Task UpdateStatusAsync(string id, string status, string message);
    Task<IEnumerable<PendingProcess>> GetAllWithItemsAsync();
} 