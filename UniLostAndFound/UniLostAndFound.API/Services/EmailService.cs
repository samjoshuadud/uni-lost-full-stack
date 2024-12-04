using Microsoft.Extensions.Logging;
using Microsoft.Extensions.Options;
using MimeKit;
using MailKit.Net.Smtp;
using MailKit.Security;
using System;
using System.Threading.Tasks;
using UniLostAndFound.API.Models;
using System.Drawing;
using System.IO;

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

        public async Task SendVerificationFailedEmailAsync(string userEmail, string itemName, int attemptsRemaining)
        {
            try
            {
                var email = new MimeMessage();
                email.From.Add(new MailboxAddress(_emailSettings.FromName, _emailSettings.FromEmail));
                email.To.Add(MailboxAddress.Parse(userEmail));
                email.Subject = "Verification Failed - Item Not Verified";

                var builder = new BodyBuilder
                {
                    HtmlBody = $@"
                        <h2>Verification Result: Not Verified</h2>
                        <p>Dear Student,</p>
                        <p>We regret to inform you that your verification answers for item ""{itemName}"" were incorrect.</p>
                        <p>What This Means:</p>
                        <ul>
                            <li>Your answers did not match the item details</li>
                            <li>You have {attemptsRemaining} attempt(s) remaining</li>
                            <li>Please review your answers carefully before trying again</li>
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
                        <p>If you need assistance, please contact the Lost & Found office.</p>
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

        public async Task SendVerificationMaxAttemptsEmailAsync(string userEmail, string itemName)
        {
            try
            {
                var email = new MimeMessage();
                email.From.Add(new MailboxAddress(_emailSettings.FromName, _emailSettings.FromEmail));
                email.To.Add(MailboxAddress.Parse(userEmail));
                email.Subject = "Verification Failed - Maximum Attempts Reached";

                var builder = new BodyBuilder
                {
                    HtmlBody = $@"
                        <h2>Maximum Verification Attempts Reached</h2>
                        <p>Dear Student,</p>
                        <p>We regret to inform you that you have reached the maximum number of verification attempts for item ""{itemName}"".</p>
                        <p>What This Means:</p>
                        <ul>
                            <li>You have used all 3 verification attempts</li>
                            <li>The verification process has been locked</li>
                            <li>The item cannot be released at this time</li>
                        </ul>
                        <p>Next Steps:</p>
                        <ul>
                            <li>Please visit the Lost & Found office in person</li>
                            <li>Bring your student ID and any proof of ownership</li>
                            <li>Our staff will assist you with manual verification</li>
                        </ul>
                        <div style='margin: 20px 0;'>
                            <p style='color: #666; font-size: 14px;'>
                                Office Hours: Monday-Friday, 9:00 AM - 5:00 PM<br>
                                Location: Student Services Building, Room 101
                            </p>
                        </div>
                        <p>We apologize for any inconvenience. Our staff will be happy to assist you in person.</p>
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

                _logger.LogInformation($"Max attempts reached email sent to {userEmail}");
            }
            catch (Exception ex)
            {
                _logger.LogError($"Failed to send max attempts email: {ex.Message}");
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
            try
            {
                var email = new MimeMessage();
                email.From.Add(new MailboxAddress(_emailSettings.FromName, _emailSettings.FromEmail));
                email.To.Add(MailboxAddress.Parse(userEmail));
                email.Subject = "Item Ready for Pickup - Verification Successful";

                var builder = new BodyBuilder
                {
                    HtmlBody = $@"
                        <h2>Verification Successful - Item Ready for Pickup</h2>
                        <p>Dear Student,</p>
                        <p>Great news! Your ownership of item ""{itemName}"" has been verified successfully.</p>
                        <p>Next Steps:</p>
                        <ul>
                            <li>Visit the Lost & Found office during business hours</li>
                            <li>Bring your student ID for verification</li>
                            <li>The item will be handed over to you after identity verification</li>
                        </ul>
                        <div style='margin: 20px 0;'>
                            <div style='background-color: #f8f9fa; border: 1px solid #e9ecef; padding: 15px; border-radius: 5px;'>
                                <p style='margin: 0; color: #495057;'>
                                    <strong>Office Hours:</strong> Monday-Friday, 9:00 AM - 5:00 PM<br>
                                    <strong>Location:</strong> Student Services Building, Room 101<br>
                                    <strong>Important:</strong> Please collect your item within 7 days
                                </p>
                            </div>
                        </div>
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
                        <p>If you have any questions, please contact the Lost & Found office.</p>
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

                _logger.LogInformation($"Ready for pickup email sent to {userEmail}");
            }
            catch (Exception ex)
            {
                _logger.LogError($"Failed to send ready for pickup email: {ex.Message}");
                throw;
            }
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

        public async Task SendItemHandedOverEmailAsync(string userEmail, string itemName)
        {
            try
            {
                var email = new MimeMessage();
                email.From.Add(new MailboxAddress(_emailSettings.FromName, _emailSettings.FromEmail));
                email.To.Add(MailboxAddress.Parse(userEmail));
                email.Subject = "Item Successfully Handed Over";

                var builder = new BodyBuilder
                {
                    HtmlBody = $@"
                        <h2>Item Successfully Handed Over</h2>
                        <p>Dear Student,</p>
                        <p>This email confirms that your item ""{itemName}"" has been successfully handed over to you.</p>
                        <p>Details:</p>
                        <ul>
                            <li>Item: {itemName}</li>
                            <li>Status: Handed Over</li>
                            <li>Date: {DateTime.Now.ToString("MMMM dd, yyyy HH:mm")}</li>
                        </ul>
                        <div style='margin: 20px 0;'>
                            <div style='background-color: #f8f9fa; border: 1px solid #e9ecef; padding: 15px; border-radius: 5px;'>
                                <p style='margin: 0; color: #495057;'>
                                    <strong>Note:</strong> Please keep this email as your receipt of collection.
                                </p>
                            </div>
                        </div>
                        <p>If you have any questions or concerns, please contact the Lost & Found office.</p>
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

                _logger.LogInformation($"Hand over confirmation email sent to {userEmail}");
            }
            catch (Exception ex)
            {
                _logger.LogError($"Failed to send hand over confirmation email: {ex.Message}");
                throw;
            }
        }

        public async Task SendNoShowEmailAsync(string userEmail, string itemName)
        {
            try
            {
                var email = new MimeMessage();
                email.From.Add(new MailboxAddress(_emailSettings.FromName, _emailSettings.FromEmail));
                email.To.Add(MailboxAddress.Parse(userEmail));
                email.Subject = "Item Collection Missed - Action Required";

                var builder = new BodyBuilder
                {
                    HtmlBody = $@"
                        <h2>Item Collection Missed</h2>
                        <p>Dear Student,</p>
                        <p>We noticed that you haven't collected your item ""{itemName}"" within the specified timeframe.</p>
                        <p>What This Means:</p>
                        <ul>
                            <li>Your item has been marked as 'No Show'</li>
                            <li>The item will need to be re-verified</li>
                            <li>You'll need to contact the Lost & Found office</li>
                        </ul>
                        <p>Next Steps:</p>
                        <ul>
                            <li>Visit the Lost & Found office during business hours</li>
                            <li>Bring your student ID and proof of ownership</li>
                            <li>Our staff will help you reclaim your item</li>
                        </ul>
                        <div style='margin: 20px 0;'>
                            <div style='background-color: #f8f9fa; border: 1px solid #e9ecef; padding: 15px; border-radius: 5px;'>
                                <p style='margin: 0; color: #495057;'>
                                    <strong>Office Hours:</strong> Monday-Friday, 9:00 AM - 5:00 PM<br>
                                    <strong>Location:</strong> Student Services Building, Room 101<br>
                                    <strong>Important:</strong> Please respond within 7 days to avoid item disposal
                                </p>
                            </div>
                        </div>
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
                        <p>If you have any questions or need assistance, please contact the Lost & Found office.</p>
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

                _logger.LogInformation($"No-show notification sent to {userEmail}");
            }
            catch (Exception ex)
            {
                _logger.LogError($"Failed to send no-show notification: {ex.Message}");
                throw;
            }
        }

        public async Task SendFoundItemReportedEmailAsync(string userEmail, string itemName, string processId, string qrCodeBase64)
        {
            try
            {
                var email = new MimeMessage();
                email.From.Add(new MailboxAddress(_emailSettings.FromName, _emailSettings.FromEmail));
                email.To.Add(MailboxAddress.Parse(userEmail));
                email.Subject = "Found Item Report - Action Required";

                var builder = new BodyBuilder
                {
                    HtmlBody = $@"
                        <h2>Found Item Report Submitted</h2>
                        <p>Dear Student,</p>
                        <p>Thank you for reporting a found item ""{itemName}"".</p>
                        <p>Process ID: {processId}</p>
                        <p>Current Status: Awaiting Item Surrender</p>
                        
                        <h3>Important Next Steps:</h3>
                        <ol>
                            <li>Visit the Lost & Found office during business hours</li>
                            <li>Show this Process ID to the admin: <strong>{processId}</strong></li>
                            <li>Surrender the found item to the admin</li>
                            <li>Note: If the item is not surrendered within three days, the report will be disregarded</li>
                        </ol>

                        <div style='margin: 20px 0;'>
                            <div style='background-color: #f8f9fa; border: 1px solid #e9ecef; padding: 15px; border-radius: 5px;'>
                                <p style='margin: 0; color: #495057;'>
                                    <strong>Office Hours:</strong> Monday-Friday, 9:00 AM - 5:00 PM<br>
                                    <strong>Location:</strong> Student Services Building, Room 101<br>
                                    <strong>Important:</strong> Please surrender the item within 2 business days
                                </p>
                            </div>
                        </div>

                        <p>What Happens Next?</p>
                        <ul>
                            <li>After surrendering the item, our admin team will review and approve your report</li>
                            <li>Once approved, the item will be listed in our system</li>
                            <li>The original owner can then search for and claim their item</li>
                            <li>If no one claims the item within 90 days, you may have the option to claim it</li>
                        </ul>

                        <div style='margin: 20px 0;'>
                            <a href='http://localhost:3000' 
                               style='background-color: #0066cc; 
                                      color: white; 
                                      padding: 10px 20px; 
                                      text-decoration: none; 
                                      border-radius: 5px;
                                      display: inline-block;'>
                                Track Status
                            </a>
                        </div>

                        <p>Thank you for your honesty and helping maintain our Lost & Found system.</p>
                    "
                };

                email.Body = builder.ToMessageBody();

                using var smtp = new SmtpClient();
                smtp.ServerCertificateValidationCallback = (s, c, h, e) => true;

                await smtp.ConnectAsync(_emailSettings.Host, _emailSettings.Port, SecureSocketOptions.StartTls);
                await smtp.AuthenticateAsync(_emailSettings.FromEmail, _emailSettings.Password);
                await smtp.SendAsync(email);
                await smtp.DisconnectAsync(true);

                _logger.LogInformation($"Found item report email sent to {userEmail}");
            }
            catch (Exception ex)
            {
                _logger.LogError($"Failed to send found item report email: {ex.Message}");
                throw;
            }
        }

        public async Task SendFoundItemApprovedEmailAsync(string userEmail, string itemName, string itemId, string processId)
        {
            try
            {
                var email = new MimeMessage();
                email.From.Add(new MailboxAddress(_emailSettings.FromName, _emailSettings.FromEmail));
                email.To.Add(MailboxAddress.Parse(userEmail));
                email.Subject = "Found Item Report Approved";

                var viewItemUrl = $"http://localhost:3000?highlight=item-{itemId}&delay=true";

                var builder = new BodyBuilder
                {
                    HtmlBody = $@"
                        <h2>Found Item Report Approved</h2>
                        <p>Dear Student,</p>
                        <p>Your found item report for ""{itemName}"" has been approved by our admin team.</p>
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
                                View Item Details
                            </a>
                        </div>

                        <p>What's Next?</p>
                        <ul>
                            <li>The item is now visible to potential owners</li>
                            <li>You will be notified if someone claims ownership</li>
                            <li>The claimant will need to verify ownership through our verification process</li>
                            <li>You can track the status of this item in your dashboard</li>
                        </ul>

                        <div style='margin: 20px 0;'>
                            <div style='background-color: #f8f9fa; border: 1px solid #e9ecef; padding: 15px; border-radius: 5px;'>
                                <p style='margin: 0; color: #495057;'>
                                    <strong>Note:</strong> The item will be held for 90 days. If no one claims it within this period, 
                                    you may have the option to claim it yourself.
                                </p>
                            </div>
                        </div>

                        <p>Thank you for helping maintain our Lost & Found system.</p>
                    "
                };

                email.Body = builder.ToMessageBody();

                using var smtp = new SmtpClient();
                smtp.ServerCertificateValidationCallback = (s, c, h, e) => true;

                await smtp.ConnectAsync(_emailSettings.Host, _emailSettings.Port, SecureSocketOptions.StartTls);
                await smtp.AuthenticateAsync(_emailSettings.FromEmail, _emailSettings.Password);
                await smtp.SendAsync(email);
                await smtp.DisconnectAsync(true);

                _logger.LogInformation($"Found item approval notification sent to {userEmail}");
            }
            catch (Exception ex)
            {
                _logger.LogError($"Failed to send found item approval notification: {ex.Message}");
                throw;
            }
        }
    }
} 