using UniLostAndFound.API.Data;
using UniLostAndFound.API.Models;
using Microsoft.EntityFrameworkCore;

namespace UniLostAndFound.API.Services;

public class VerificationQuestionService
{
    private readonly AppDbContext _context;

    public VerificationQuestionService(AppDbContext context)
    {
        _context = context;
    }

    public async Task<List<VerificationQuestion>> CreateQuestionsAsync(string processId, List<string> questions)
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

    public async Task<List<VerificationQuestion>> GetQuestionsByProcessIdAsync(string processId)
    {
        return await _context.VerificationQuestions
            .Where(q => q.ProcessId == processId)
            .ToListAsync();
    }

    public async Task DeleteQuestionsByProcessIdAsync(string processId)
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
} 