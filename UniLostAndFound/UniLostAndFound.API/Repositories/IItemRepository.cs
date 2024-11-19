namespace UniLostAndFound.API.Repositories;

using UniLostAndFound.API.Models;

public interface IItemRepository : IBaseRepository<Item>
{
    Task<IEnumerable<Item>> GetByStudentIdAsync(string studentId);
    Task<IEnumerable<Item>> GetPendingApprovalAsync();
    Task UpdateApprovalStatusAsync(string id, bool approved);
    Task<IEnumerable<Item>> GetApprovedItemsAsync();
} 