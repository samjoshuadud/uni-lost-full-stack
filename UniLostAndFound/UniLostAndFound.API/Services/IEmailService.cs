using UniLostAndFound.API.DTOs;

public interface IEmailService
{
    Task SendItemReportedEmailAsync(string userEmail, string itemName, string processId);
    Task SendItemApprovedEmailAsync(string userEmail, string itemName, string itemId, string processId);
    Task SendVerificationStartedEmailAsync(string userEmail, string itemName);
    Task SendVerificationSuccessEmailAsync(string userEmail, string itemName);
    Task SendVerificationFailedEmailAsync(string userEmail, string itemName, int attemptsRemaining);
    Task SendClaimApprovedEmailAsync(string userEmail, string itemName, List<ClaimQuestionAnswerDto> questionsAndAnswers);
    Task SendClaimRejectedEmailAsync(string userEmail, string itemName, List<ClaimQuestionAnswerDto> questionsAndAnswers);
    Task SendReadyForPickupEmailAsync(string userEmail, string itemName);
    Task SendAnswersSubmittedEmailAsync(string userEmail, string itemName);
    Task SendVerificationMaxAttemptsEmailAsync(string userEmail, string itemName);
    Task SendItemHandedOverEmailAsync(string userEmail, string itemName);
    Task SendNoShowEmailAsync(string userEmail, string itemName);
    Task SendFoundItemReportedEmailAsync(string userEmail, string itemName, string processId, string qrCodeBase64);
    Task SendFoundItemApprovedEmailAsync(string userEmail, string itemName, string itemId, string processId);
    Task SendClaimSubmittedEmailAsync(string userEmail, string itemName, List<ClaimQuestionAnswerDto> questionsAndAnswers);
} 