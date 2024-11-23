public class CreateItemDto
{
    public string Name { get; set; }
    public string Description { get; set; }
    public string Category { get; set; }
    public string Status { get; set; }  // "lost" or "found"
    public string Location { get; set; }
    public IFormFile? Image { get; set; }
    public string ReporterId { get; set; }
    public string StudentId { get; set; }
    public string? ProcessStatus { get; set; }
    public string? Message { get; set; }
    public string? AdditionalDescriptions { get; set; }
} 