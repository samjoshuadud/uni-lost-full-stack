namespace UniLostAndFound.API.Models;

public class Item : BaseEntity
{
    public string Name { get; set; } = string.Empty;
    public string Description { get; set; } = string.Empty;
    public string Location { get; set; } = string.Empty;
    public string Category { get; set; } = string.Empty;
    public string Status { get; set; } = string.Empty;  // lost/found/handed_over
    public string ReportedBy { get; set; } = string.Empty;  // User ID
    public bool Approved { get; set; }
    public List<string> VerificationQuestions { get; set; } = new();
} 