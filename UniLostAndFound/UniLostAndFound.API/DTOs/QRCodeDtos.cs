namespace UniLostAndFound.API.DTOs;

public class QRCodeScanDto
{
    public string ItemId { get; set; } = string.Empty;
    public string AdminId { get; set; } = string.Empty;
}

public class QRCodeGenerateDto
{
    public string ItemId { get; set; }
    public string ItemName { get; set; }
    public string Description { get; set; }
    public string Category { get; set; }
    public string Location { get; set; }
    public DateTime DateReported { get; set; }
} 