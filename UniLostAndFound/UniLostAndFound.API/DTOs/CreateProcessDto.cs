namespace UniLostAndFound.API.DTOs;

public class CreateProcessDto
{
    public string ItemId { get; set; } = string.Empty;
    public string UserId { get; set; } = string.Empty;
    public string ProcessStatus { get; set; } = string.Empty;
    public string Message { get; set; } = string.Empty;
} 