public interface IEmailService
{
    Task SendItemReportedEmailAsync(string userEmail, string itemName, string processId);
    Task SendItemApprovedEmailAsync(string userEmail, string itemName, string itemId, string processId);
    Task SendVerificationStartedEmailAsync(string userEmail, string itemName);
    Task SendVerificationSuccessEmailAsync(string userEmail, string itemName);
    Task SendVerificationFailedEmailAsync(string userEmail, string itemName);
    Task SendClaimApprovedEmailAsync(string userEmail, string itemName);
    Task SendClaimRejectedEmailAsync(string userEmail, string itemName);
    Task SendReadyForPickupEmailAsync(string userEmail, string itemName);
    Task SendAnswersSubmittedEmailAsync(string userEmail, string itemName);
} 