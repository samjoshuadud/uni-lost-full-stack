namespace UniLostAndFound.API.DTOs;

public class VerificationAnswerDto
{
    public string Question { get; set; }
    public string Answer { get; set; }
}

public class VerifyAnswersDto
{
    public string ProcessId { get; set; }
    public List<VerificationAnswerDto> Answers { get; set; }
} 