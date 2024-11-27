using Microsoft.EntityFrameworkCore;
using UniLostAndFound.API.Data;
using UniLostAndFound.API.Models;

namespace UniLostAndFound.API.Services;

public class VerificationQuestionService : IVerificationQuestionService
{
    private readonly AppDbContext _context;
    private readonly ILogger<VerificationQuestionService> _logger;

    public VerificationQuestionService(
        AppDbContext context,
        ILogger<VerificationQuestionService> logger)
    {
        _context = context;
        _logger = logger;
    }

    public async Task<List<VerificationQuestion>> GetQuestionsByProcessIdAsync(string processId)
    {
        try
        {
            return await _context.VerificationQuestions
                .Where(q => q.ProcessId == processId)
                .ToListAsync();
        }
        catch (Exception ex)
        {
            _logger.LogError($"Error getting verification questions: {ex.Message}");
            throw;
        }
    }

    public async Task<List<VerificationQuestion>> CreateQuestionsAsync(string processId, List<string> questions)
    {
        try
        {
            var verificationQuestions = questions.Select(q => new VerificationQuestion
            {
                Id = Guid.NewGuid().ToString(),
                ProcessId = processId,
                Question = q,
                CreatedAt = DateTime.UtcNow,
                UpdatedAt = DateTime.UtcNow
            }).ToList();

            await _context.VerificationQuestions.AddRangeAsync(verificationQuestions);
            await _context.SaveChangesAsync();

            return verificationQuestions;
        }
        catch (Exception ex)
        {
            _logger.LogError($"Error creating verification questions: {ex.Message}");
            throw;
        }
    }

    public async Task DeleteQuestionsByProcessIdAsync(string processId)
    {
        try
        {
            var questions = await _context.VerificationQuestions
                .Where(q => q.ProcessId == processId)
                .ToListAsync();

            if (questions.Any())
            {
                _context.VerificationQuestions.RemoveRange(questions);
                await _context.SaveChangesAsync();
            }
        }
        catch (Exception ex)
        {
            _logger.LogError($"Error deleting verification questions: {ex.Message}");
            throw;
        }
    }
} 