using Microsoft.EntityFrameworkCore;
using UniLostAndFound.API.Data;
using UniLostAndFound.API.Models;
using UniLostAndFound.API.DTOs;

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

    public async Task CreateQuestionsWithAnswersAsync(string processId, List<ClaimQuestionAnswerDto> questionsAndAnswers, string? additionalInfo = null)
    {
        try
        {
            var verificationQuestions = questionsAndAnswers.Select(qa => new VerificationQuestion
            {
                Id = Guid.NewGuid().ToString(),
                ProcessId = processId,
                Question = qa.Question,
                Answer = qa.Answer,
                CreatedAt = DateTime.UtcNow,
                UpdatedAt = DateTime.UtcNow
            }).ToList();

            // Add additional info as a separate question if provided
            if (!string.IsNullOrEmpty(additionalInfo))
            {
                verificationQuestions.Add(new VerificationQuestion
                {
                    Id = Guid.NewGuid().ToString(),
                    ProcessId = processId,
                    Question = "Additional Information",
                    Answer = additionalInfo,
                    CreatedAt = DateTime.UtcNow,
                    UpdatedAt = DateTime.UtcNow
                });
            }

            await _context.VerificationQuestions.AddRangeAsync(verificationQuestions);
            await _context.SaveChangesAsync();
        }
        catch (Exception ex)
        {
            _logger.LogError($"Error creating verification questions and answers: {ex.Message}");
            throw;
        }
    }

    public async Task SaveAnswersAsync(string processId, List<VerificationAnswerDto> answers)
    {
        try
        {
            var questions = await _context.VerificationQuestions
                .Where(q => q.ProcessId == processId)
                .ToListAsync();

            foreach (var question in questions)
            {
                var answer = answers.FirstOrDefault(a => a.Question == question.Question);
                if (answer != null)
                {
                    question.Answer = answer.Answer;
                    question.UpdatedAt = DateTime.UtcNow;
                }
            }

            await _context.SaveChangesAsync();
        }
        catch (Exception ex)
        {
            _logger.LogError($"Error saving verification answers: {ex.Message}");
            throw;
        }
    }
} 