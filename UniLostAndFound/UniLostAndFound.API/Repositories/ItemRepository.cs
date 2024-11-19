namespace UniLostAndFound.API.Repositories;

using Microsoft.EntityFrameworkCore;
using UniLostAndFound.API.Data;
using UniLostAndFound.API.Models;

public class ItemRepository : BaseRepository<Item>, IItemRepository
{
    public ItemRepository(AppDbContext context) : base(context) { }

    public async Task<IEnumerable<Item>> GetByStudentIdAsync(string studentId)
    {
        return await _dbSet
            .Include(i => i.AdditionalDescriptions)
            .Where(i => i.StudentId == studentId)
            .ToListAsync();
    }

    public async Task<IEnumerable<Item>> GetPendingApprovalAsync()
    {
        return await _dbSet
            .Include(i => i.AdditionalDescriptions)
            .Where(i => !i.Approved)
            .ToListAsync();
    }

    public async Task UpdateApprovalStatusAsync(string id, bool approved)
    {
        var item = await GetByIdAsync(id);
        if (item != null)
        {
            item.Approved = approved;
            item.UpdatedAt = DateTime.UtcNow;
            await UpdateAsync(item);
        }
    }

    public async Task<IEnumerable<Item>> GetApprovedItemsAsync()
    {
        return await _dbSet
            .Include(i => i.AdditionalDescriptions)
            .Where(i => i.Approved)
            .OrderByDescending(i => i.CreatedAt)
            .ToListAsync();
    }

    public override async Task<Item?> GetByIdAsync(string id)
    {
        return await _dbSet
            .Include(i => i.AdditionalDescriptions)
            .FirstOrDefaultAsync(i => i.Id == id);
    }
} 