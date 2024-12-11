using Microsoft.AspNetCore.Http;

public class UpdateItemDetailsDto
{
    public string Name { get; set; }
    public string Description { get; set; }
    public string Location { get; set; }
    public string Category { get; set; }
    public string StudentId { get; set; }
    public IFormFile? Image { get; set; }
    public string? AdditionalDescriptions { get; set; }
    public string? ReporterId { get; set; }
} 