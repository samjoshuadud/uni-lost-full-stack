namespace UniLostAndFound.API.Repositories;

public interface IBaseRepository<T> where T : class
{
    Task<T?> GetByIdAsync(string id);
    Task<IEnumerable<T>> GetAllAsync();
    Task UpdateAsync(T entity);
    Task DeleteAsync(string id);
    Task<T> CreateAsync(T entity);
} 