namespace UniLostAndFound.API.DTOs;

public class VerifyAnswersDto
{
    public string ProcessId { get; set; } = string.Empty;
    public List<VerificationAnswerDto> Answers { get; set; } = new List<VerificationAnswerDto>();
}

public class VerificationAnswerDto
{
    public string QuestionId { get; set; } = string.Empty;
    public string Answer { get; set; } = string.Empty;
} 