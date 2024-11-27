using UniLostAndFound.API.Models;

namespace UniLostAndFound.API.Services;

public interface IVerificationQuestionService
{
    Task<List<VerificationQuestion>> GetQuestionsByProcessIdAsync(string processId);
    Task<List<VerificationQuestion>> CreateQuestionsAsync(string processId, List<string> questions);
    Task DeleteQuestionsByProcessIdAsync(string processId);
} 