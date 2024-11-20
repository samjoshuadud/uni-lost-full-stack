public class VerifyAnswersDto
{
    public List<VerificationAnswer> Answers { get; set; }
}

public class VerificationAnswer
{
    public string QuestionId { get; set; }
    public string Answer { get; set; }
} 