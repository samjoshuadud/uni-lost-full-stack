using UniLostAndFound.API.DTOs;

public interface IEmailService
{
    Task SendItemReportedEmailAsync(string userEmail, string itemName, string processId);
    Task SendItemApprovedEmailAsync(string userEmail, string itemName, string itemId, string processId);
    Task SendReadyForPickupEmailAsync(string userEmail, string itemName);
    Task SendItemHandedOverEmailAsync(string userEmail, string itemName);
    Task SendNoShowEmailAsync(string userEmail, string itemName);
    Task SendFoundItemReportedEmailAsync(string userEmail, string itemName, string processId, string qrCodeBase64);
    Task SendItemMatchedEmailAsync(string userEmail, string foundItemName, string lostItemName);
    Task SendVerificationFailedEmailAsync(string email, string itemName);
} 