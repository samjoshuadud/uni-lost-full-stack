namespace UniLostAndFound.API.Models;

public class Notification : BaseEntity
{
    public string Type { get; set; } = string.Empty; // verification, claim, found
    public string ItemId { get; set; } = string.Empty;
    public string UserId { get; set; } = string.Empty;
    public string Status { get; set; } = string.Empty;
    public List<string> VerificationQuestions { get; set; } = new();
    public List<string> VerificationAnswers { get; set; } = new();
    public Item? Item { get; set; } // Navigation property
    public User? User { get; set; } // Navigation property
} 