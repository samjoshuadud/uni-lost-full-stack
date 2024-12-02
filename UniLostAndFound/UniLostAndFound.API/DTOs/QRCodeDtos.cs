namespace UniLostAndFound.API.DTOs;

public class QRCodeScanDto
{
    public string ProcessId { get; set; } = string.Empty;
    public string ItemId { get; set; } = string.Empty;
    public string Type { get; set; } = string.Empty;
    public string Timestamp { get; set; } = string.Empty;
}

public class QRCodeProcessDto
{
    public string ItemId { get; set; } = string.Empty;
    public string UserId { get; set; } = string.Empty;
} 