namespace UniLostAndFound.API.DTOs;
using Microsoft.AspNetCore.Http;
using Microsoft.AspNetCore.Mvc;

public class ItemDto
{
    public string Id { get; set; } = string.Empty;
    public string Name { get; set; } = string.Empty;
    public string Description { get; set; } = string.Empty;
    public string Category { get; set; } = string.Empty;
    public string Status { get; set; } = string.Empty; // Lost/Found
    public string Location { get; set; } = string.Empty;
    public DateTime DateReported { get; set; }
    public string ImageUrl { get; set; } = string.Empty;
    public string ReporterId { get; set; } = string.Empty;
    public bool Approved { get; set; }
    public List<string> VerificationQuestions { get; set; } = new();
}

public class AdditionalDescriptionDto
{
    public string Title { get; set; } = string.Empty;
    public string Description { get; set; } = string.Empty;
}

public class CreateItemDto
{
    [FromForm(Name = "name")]
    public string Name { get; set; } = string.Empty;

    [FromForm(Name = "description")]
    public string Description { get; set; } = string.Empty;

    [FromForm(Name = "location")]
    public string Location { get; set; } = string.Empty;

    [FromForm(Name = "category")]
    public string Category { get; set; } = string.Empty;

    [FromForm(Name = "status")]
    public string Status { get; set; } = string.Empty;

    [FromForm(Name = "reporterId")]
    public string ReporterId { get; set; } = string.Empty;

    [FromForm(Name = "studentId")]
    public string StudentId { get; set; } = string.Empty;

    [FromForm(Name = "additionalDescriptions")]
    public string? AdditionalDescriptions { get; set; }

    [FromForm(Name = "image")]
    public IFormFile? Image { get; set; }
}

public class UpdateItemDto
{
    public string? Name { get; set; }
    public string? Description { get; set; }
    public string? Location { get; set; }
    public string? Category { get; set; }
    public string? Status { get; set; }
    public bool? Approved { get; set; }
} 