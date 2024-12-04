using Microsoft.Extensions.Logging;
using Microsoft.Extensions.Options;
using MimeKit;
using MailKit.Net.Smtp;
using MailKit.Security;
using System;
using System.Threading.Tasks;
using UniLostAndFound.API.Models;

namespace UniLostAndFound.API.Services
{
    public class EmailService : IEmailService
    {
        private readonly ILogger<EmailService> _logger;
        private readonly EmailSettings _emailSettings;

        public EmailService(
            ILogger<EmailService> logger,
            IOptions<EmailSettings> emailSettings)
        {
            _logger = logger;
            _emailSettings = emailSettings.Value;
        }

        public async Task SendItemReportedEmailAsync(string userEmail, string itemName, string processId)
        {
            try
            {
                _logger.LogInformation($"Starting email send process...");
                _logger.LogInformation($"Settings: Host={_emailSettings.Host}, Port={_emailSettings.Port}, FromEmail={_emailSettings.FromEmail}");

                var email = new MimeMessage();
                email.From.Add(new MailboxAddress(_emailSettings.FromName, _emailSettings.FromEmail));
                email.To.Add(MailboxAddress.Parse(userEmail));
                email.Subject = "Lost Item Report Submitted";

                var builder = new BodyBuilder
                {
                    HtmlBody = $@"
                        <h2>Lost Item Report Submitted</h2>
                        <p>Dear Student,</p>
                        <p>Your report for item ""{itemName}"" has been submitted successfully.</p>
                        <p>Process ID: {processId}</p>
                        <p>Current Status: Pending Approval</p>
                        <p>What's Next?</p>
                        <ul>
                            <li>Our admin team will review your report</li>
                            <li>You will receive another email when your report is approved</li>
                            <li>You can track your report status in the dashboard</li>
                        </ul>
                        <p>Thank you for using UNI Lost and Found System.</p>
                    "
                };
                email.Body = builder.ToMessageBody();

                using var smtp = new SmtpClient();
                smtp.ServerCertificateValidationCallback = (s, c, h, e) => true; // For debugging only

                _logger.LogInformation("Attempting to connect to SMTP server...");
                await smtp.ConnectAsync(_emailSettings.Host, _emailSettings.Port, SecureSocketOptions.StartTls);

                _logger.LogInformation("Attempting to authenticate...");
                await smtp.AuthenticateAsync(_emailSettings.FromEmail, _emailSettings.Password);

                _logger.LogInformation("Attempting to send email...");
                await smtp.SendAsync(email);

                await smtp.DisconnectAsync(true);
                _logger.LogInformation("Email sent successfully!");
            }
            catch (MailKit.Security.AuthenticationException authEx)
            {
                _logger.LogError($"Authentication failed: {authEx.Message}");
                throw;
            }
            catch (SmtpCommandException smtpEx)
            {
                _logger.LogError($"SMTP error: {smtpEx.Message}, StatusCode: {smtpEx.StatusCode}");
                throw;
            }
            catch (Exception ex)
            {
                _logger.LogError($"General error: {ex.Message}");
                _logger.LogError($"Stack trace: {ex.StackTrace}");
                throw;
            }
        }

        public async Task SendItemApprovedEmailAsync(string userEmail, string itemName, string itemId, string processId)
        {
            try
            {
                _logger.LogInformation($"Sending approval notification to {userEmail} for item {itemName}");

                var email = new MimeMessage();
                email.From.Add(new MailboxAddress(_emailSettings.FromName, _emailSettings.FromEmail));
                email.To.Add(MailboxAddress.Parse(userEmail));
                email.Subject = "Lost Item Report Approved";

                var viewItemUrl = $"http://localhost:3000?highlight=item-{itemId}&delay=true";

                var builder = new BodyBuilder
                {
                    HtmlBody = $@"
                        <h2>Lost Item Report Approved</h2>
                        <p>Dear Student,</p>
                        <p>Your report for item ""{itemName}"" has been approved by our admin team.</p>
                        <p>Process ID: {processId}</p>
                        <p>Current Status: Approved</p>
                        <div style='margin: 20px 0;'>
                            <a href='{viewItemUrl}' 
                               style='background-color: #0066cc; 
                                      color: white; 
                                      padding: 10px 20px; 
                                      text-decoration: none; 
                                      border-radius: 5px;
                                      display: inline-block;'>
                                View Your Item
                            </a>
                        </div>
                        <p>What's Next?</p>
                        <ul>
                            <li>Your item is now visible to other students</li>
                            <li>You will be notified if someone claims to be the owner</li>
                            <li>You can track the status of your item in the dashboard</li>
                        </ul>
                        <p>Thank you for using UNI Lost and Found System.</p>
                    "
                };

                email.Body = builder.ToMessageBody();

                using var smtp = new SmtpClient();
                smtp.ServerCertificateValidationCallback = (s, c, h, e) => true;

                await smtp.ConnectAsync(_emailSettings.Host, _emailSettings.Port, SecureSocketOptions.StartTls);
                await smtp.AuthenticateAsync(_emailSettings.FromEmail, _emailSettings.Password);
                await smtp.SendAsync(email);
                await smtp.DisconnectAsync(true);

                _logger.LogInformation($"Approval notification sent to {userEmail}");
            }
            catch (Exception ex)
            {
                _logger.LogError($"Failed to send approval notification: {ex.Message}");
                throw;
            }
        }

        public async Task SendVerificationStartedEmailAsync(string userEmail, string itemName)
        {
            try
            {
                var email = new MimeMessage();
                email.From.Add(new MailboxAddress(_emailSettings.FromName, _emailSettings.FromEmail));
                email.To.Add(MailboxAddress.Parse(userEmail));
                email.Subject = "Verification Questions Ready - Action Required";

                var builder = new BodyBuilder
                {
                    HtmlBody = $@"
                        <h2>Verification Questions Ready</h2>
                        <p>Dear Student,</p>
                        <p>Good news! Your item ""{itemName}"" has been matched with a found item.</p>
                        <p>To verify your ownership:</p>
                        <ul>
                            <li>Go to your Pending Processes in the dashboard</li>
                            <li>Find this item and click 'Answer Questions'</li>
                            <li>Answer the verification questions carefully</li>
                            <li>You will have 3 attempts to answer correctly</li>
                        </ul>
                        <div style='margin: 20px 0;'>
                            <a href='http://localhost:3000' 
                               style='background-color: #0066cc; 
                                      color: white; 
                                      padding: 10px 20px; 
                                      text-decoration: none; 
                                      border-radius: 5px;
                                      display: inline-block;'>
                                Go to Dashboard
                            </a>
                        </div>
                        <p>Please respond promptly to complete the verification process.</p>
                        <p>Thank you for using UNI Lost and Found System.</p>
                    "
                };

                email.Body = builder.ToMessageBody();

                using var smtp = new SmtpClient();
                smtp.ServerCertificateValidationCallback = (s, c, h, e) => true;

                await smtp.ConnectAsync(_emailSettings.Host, _emailSettings.Port, SecureSocketOptions.StartTls);
                await smtp.AuthenticateAsync(_emailSettings.FromEmail, _emailSettings.Password);
                await smtp.SendAsync(email);
                await smtp.DisconnectAsync(true);

                _logger.LogInformation($"Verification started notification sent to {userEmail}");
            }
            catch (Exception ex)
            {
                _logger.LogError($"Failed to send verification notification: {ex.Message}");
                throw;
            }
        }

        public async Task SendVerificationSuccessEmailAsync(string userEmail, string itemName)
        {
            try
            {
                var email = new MimeMessage();
                email.From.Add(new MailboxAddress(_emailSettings.FromName, _emailSettings.FromEmail));
                email.To.Add(MailboxAddress.Parse(userEmail));
                email.Subject = "Verification Successful - Item Ready for Pickup";

                var builder = new BodyBuilder
                {
                    HtmlBody = $@"
                        <h2>Verification Successful!</h2>
                        <p>Dear Student,</p>
                        <p>Great news! Your ownership of the item ""{itemName}"" has been verified successfully.</p>
                        <p>Next Steps:</p>
                        <ul>
                            <li>Visit the Lost & Found office during business hours</li>
                            <li>Bring your student ID</li>
                            <li>The item will be handed over after identity verification</li>
                        </ul>
                        <div style='margin: 20px 0;'>
                            <a href='http://localhost:3000' 
                               style='background-color: #0066cc; 
                                      color: white; 
                                      padding: 10px 20px; 
                                      text-decoration: none; 
                                      border-radius: 5px;
                                      display: inline-block;'>
                                View Status
                            </a>
                        </div>
                        <p>Please collect your item within 7 days.</p>
                        <p>Thank you for using UNI Lost and Found System.</p>
                    "
                };

                email.Body = builder.ToMessageBody();

                using var smtp = new SmtpClient();
                smtp.ServerCertificateValidationCallback = (s, c, h, e) => true;

                await smtp.ConnectAsync(_emailSettings.Host, _emailSettings.Port, SecureSocketOptions.StartTls);
                await smtp.AuthenticateAsync(_emailSettings.FromEmail, _emailSettings.Password);
                await smtp.SendAsync(email);
                await smtp.DisconnectAsync(true);

                _logger.LogInformation($"Verification success email sent to {userEmail}");
            }
            catch (Exception ex)
            {
                _logger.LogError($"Failed to send verification success email: {ex.Message}");
                throw;
            }
        }

        public async Task SendVerificationFailedEmailAsync(string userEmail, string itemName)
        {
            try
            {
                var email = new MimeMessage();
                email.From.Add(new MailboxAddress(_emailSettings.FromName, _emailSettings.FromEmail));
                email.To.Add(MailboxAddress.Parse(userEmail));
                email.Subject = "Verification Failed - Action Required";

                var builder = new BodyBuilder
                {
                    HtmlBody = $@"
                        <h2>Verification Attempt Failed</h2>
                        <p>Dear Student,</p>
                        <p>Your verification attempt for item ""{itemName}"" was unsuccessful.</p>
                        <p>What This Means:</p>
                        <ul>
                            <li>Your answers did not match the item details</li>
                            <li>You can try again if you have remaining attempts</li>
                            <li>Please provide more accurate information about the item</li>
                        </ul>
                        <div style='margin: 20px 0;'>
                            <a href='http://localhost:3000' 
                               style='background-color: #0066cc; 
                                      color: white; 
                                      padding: 10px 20px; 
                                      text-decoration: none; 
                                      border-radius: 5px;
                                      display: inline-block;'>
                                Try Again
                            </a>
                        </div>
                        <p>If you believe this is an error, please contact the Lost & Found office.</p>
                        <p>Thank you for your understanding.</p>
                    "
                };

                email.Body = builder.ToMessageBody();

                using var smtp = new SmtpClient();
                smtp.ServerCertificateValidationCallback = (s, c, h, e) => true;

                await smtp.ConnectAsync(_emailSettings.Host, _emailSettings.Port, SecureSocketOptions.StartTls);
                await smtp.AuthenticateAsync(_emailSettings.FromEmail, _emailSettings.Password);
                await smtp.SendAsync(email);
                await smtp.DisconnectAsync(true);

                _logger.LogInformation($"Verification failed email sent to {userEmail}");
            }
            catch (Exception ex)
            {
                _logger.LogError($"Failed to send verification failed email: {ex.Message}");
                throw;
            }
        }

        public async Task SendClaimApprovedEmailAsync(string userEmail, string itemName)
        {
            throw new NotImplementedException("This email notification will be implemented later");
        }

        public async Task SendClaimRejectedEmailAsync(string userEmail, string itemName)
        {
            throw new NotImplementedException("This email notification will be implemented later");
        }

        public async Task SendReadyForPickupEmailAsync(string userEmail, string itemName)
        {
            throw new NotImplementedException("This email notification will be implemented later");
        }

        public async Task SendAnswersSubmittedEmailAsync(string userEmail, string itemName)
        {
            try
            {
                var email = new MimeMessage();
                email.From.Add(new MailboxAddress(_emailSettings.FromName, _emailSettings.FromEmail));
                email.To.Add(MailboxAddress.Parse(userEmail));
                email.Subject = "Verification Answers Submitted - Under Review";

                var builder = new BodyBuilder
                {
                    HtmlBody = $@"
                        <h2>Answers Submitted Successfully</h2>
                        <p>Dear Student,</p>
                        <p>Your verification answers for item ""{itemName}"" have been submitted successfully.</p>
                        <p>What's Next?</p>
                        <ul>
                            <li>Our admin team will review your answers</li>
                            <li>You will receive another email with the verification result</li>
                            <li>If your answers are correct, you'll be able to collect your item</li>
                            <li>If incorrect, you may have additional attempts to verify ownership</li>
                        </ul>
                        <div style='margin: 20px 0;'>
                            <a href='http://localhost:3000' 
                               style='background-color: #0066cc; 
                                      color: white; 
                                      padding: 10px 20px; 
                                      text-decoration: none; 
                                      border-radius: 5px;
                                      display: inline-block;'>
                                View Status
                            </a>
                        </div>
                        <p>Please wait for the verification result. This usually takes 1-2 business days.</p>
                        <p>Thank you for your patience.</p>
                    "
                };

                email.Body = builder.ToMessageBody();

                using var smtp = new SmtpClient();
                smtp.ServerCertificateValidationCallback = (s, c, h, e) => true;

                await smtp.ConnectAsync(_emailSettings.Host, _emailSettings.Port, SecureSocketOptions.StartTls);
                await smtp.AuthenticateAsync(_emailSettings.FromEmail, _emailSettings.Password);
                await smtp.SendAsync(email);
                await smtp.DisconnectAsync(true);

                _logger.LogInformation($"Answers submitted notification sent to {userEmail}");
            }
            catch (Exception ex)
            {
                _logger.LogError($"Failed to send answers submitted notification: {ex.Message}");
                throw;
            }
        }
    }
} 