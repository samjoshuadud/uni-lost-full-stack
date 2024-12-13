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
using System.Collections.Generic;
using System.Linq;
using UniLostAndFound.API.DTOs;
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

        private async Task SendEmailAsync(string toEmail, string subject, string htmlBody)
        {
            try
            {
                var email = new MimeMessage();
                email.From.Add(new MailboxAddress(_emailSettings.FromName, _emailSettings.FromEmail));
                email.To.Add(MailboxAddress.Parse(toEmail));
                email.Subject = subject;

                var builder = new BodyBuilder
                {
                    HtmlBody = htmlBody
                };

                email.Body = builder.ToMessageBody();

                using var smtp = new SmtpClient();
                smtp.ServerCertificateValidationCallback = (s, c, h, e) => true;

                await smtp.ConnectAsync(_emailSettings.Host, _emailSettings.Port, SecureSocketOptions.StartTls);
                await smtp.AuthenticateAsync(_emailSettings.FromEmail, _emailSettings.Password);
                await smtp.SendAsync(email);
                await smtp.DisconnectAsync(true);

                _logger.LogInformation($"Email sent successfully to {toEmail}");
            }
            catch (Exception ex)
            {
                _logger.LogError($"Failed to send email: {ex.Message}");
                throw;
            }
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

        public async Task SendReadyForPickupEmailAsync(string email, string itemName)
        {
            var subject = "Your Lost Item Has Been Found!";
            
            var manilaTimeZone = TimeZoneInfo.FindSystemTimeZoneById("Asia/Manila");
            var currentDateTime = TimeZoneInfo.ConvertTimeFromUtc(DateTime.UtcNow, manilaTimeZone);
            
            var body = $@"
                <div style='font-family: Arial, sans-serif; max-width: 600px; margin: 0 auto;'>
                    <h2 style='color: #1e293b;'>Good news!</h2>

                    <p>We are pleased to inform you that your lost item (<strong>{itemName}</strong>) has been found and is now ready for pickup!</p>

                    <div style='background-color: #f0f4f8; padding: 20px; border-radius: 8px; margin: 20px 0;'>
                        <h3 style='color: #1e293b; margin-top: 0;'>Next Steps:</h3>
                        <ol style='color: #334155;'>
                            <li>Visit the OHSO (Occupational Health Services Office) in the basement of the Admin Building</li>
                            <li>Bring your valid school ID for verification</li>
                            <li>Claim your item during office hours</li>
                        </ol>
                    </div>

                    <div style='background-color: #fff8f0; padding: 20px; border-radius: 8px; margin: 20px 0;'>
                        <h3 style='color: #9a3412; margin-top: 0;'>Important Notes:</h3>
                        <ul style='color: #9a3412;'>
                            <li>Please claim your item within 3 working days</li>
                            <li>OHSO office hours: Monday to Friday, 8:00 AM to 5:00 PM</li>
                            <li>Date Notified: {currentDateTime:MMMM dd, yyyy HH:mm}</li>
                        </ul>
                    </div>

                    <p style='color: #475569;'>If you have any questions, please don't hesitate to contact us.</p>
                    <p style='color: #475569;'>Best regards,<br>UNI Lost and Found Team</p>
                </div>
            ";

            await SendEmailAsync(email, subject, body);
        }

        public async Task SendItemHandedOverEmailAsync(string email, string itemName)
        {
            var subject = "Item Successfully Handed Over";
            var body = $@"
                <h2>Item Handed Over Successfully</h2>
                <p>Hello,</p>
                <p>Your item ""{itemName}"" has been successfully handed over to its owner.</p>
                <p>Thank you for using our Lost and Found system.</p>
                <br>
                <p>Best regards,</p>
                <p>UNI Lost and Found Team</p>";

            await SendEmailAsync(email, subject, body);
        }

        public async Task SendNoShowEmailAsync(string email, string itemName)
        {
            var subject = "No Show for Item Retrieval";
            var body = $@"
                <h2>Item Retrieval No Show</h2>
                <p>Hello,</p>
                <p>This is to inform you that the item ""{itemName}"" was marked as 'no show' during the retrieval process.</p>
                <p>Please contact the admin office to reschedule the item pickup.</p>
                <br>
                <p>Best regards,</p>
                <p>UNI Lost and Found Team</p>";

            await SendEmailAsync(email, subject, body);
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

        public async Task SendItemMatchedEmailAsync(string userEmail, string foundItemName, string lostItemName)
        {
            try
            {
                var email = new MimeMessage();
                email.From.Add(new MailboxAddress(_emailSettings.FromName, _emailSettings.FromEmail));
                email.To.Add(MailboxAddress.Parse(userEmail));
                email.Subject = "Item Match Found - Action Required";

                var builder = new BodyBuilder
                {
                    HtmlBody = $@"
                        <h2>Match Found for Your Reported Item</h2>
                        <p>Dear Student,</p>
                        <p>Great news! The item you reported (""{foundItemName}"") has been matched with a lost item report (""{lostItemName}"").</p>
                        
                        <div style='margin: 20px 0;'>
                            <div style='background-color: #f8f9fa; border: 1px solid #e9ecef; padding: 15px; border-radius: 5px;'>
                                <p style='margin: 0; color: #495057;'>
                                    <strong>Next Steps:</strong>
                                    <ul>
                                        <li>The item's owner has been notified</li>
                                        <li>They will visit the OHSO to claim their item</li>
                                        <li>Thank you for helping return this item to its owner!</li>
                                    </ul>
                                </p>
                            </div>
                        </div>

                        <p>Thank you for using the UNI Lost and Found System and helping return lost items to their owners.</p>
                    "
                };

                email.Body = builder.ToMessageBody();

                using var smtp = new SmtpClient();
                smtp.ServerCertificateValidationCallback = (s, c, h, e) => true;

                await smtp.ConnectAsync(_emailSettings.Host, _emailSettings.Port, SecureSocketOptions.StartTls);
                await smtp.AuthenticateAsync(_emailSettings.FromEmail, _emailSettings.Password);
                await smtp.SendAsync(email);
                await smtp.DisconnectAsync(true);

                _logger.LogInformation($"Match notification sent to found item reporter: {userEmail}");
            }
            catch (Exception ex)
            {
                _logger.LogError($"Failed to send match notification: {ex.Message}");
                throw;
            }
        }

        public async Task SendVerificationFailedEmailAsync(string email, string itemName)
        {
            var subject = "Important: Item Match Verification Failed";
            var body = $@"
                <div style='font-family: Arial, sans-serif; max-width: 600px; margin: 0 auto;'>
                    <h2 style='color: #1e293b;'>Item Match Verification Failed</h2>
                    
                    <p>Hello,</p>
                    
                    <p>During the physical verification at our office for your item ""{itemName}"", 
                       we determined that there was a mismatch with the found item.</p>

                    <div style='background-color: #fff8f0; padding: 20px; border-radius: 8px; margin: 20px 0;'>
                        <h3 style='color: #9a3412; margin-top: 0;'>What This Means:</h3>
                        <ul style='color: #9a3412;'>
                            <li>The previously matched item was not your lost item</li>
                            <li>The match has been cancelled</li>
                            <li>Your original lost item report is no longer active</li>
                        </ul>
                    </div>

                    <div style='background-color: #f0f4f8; padding: 20px; border-radius: 8px; margin: 20px 0;'>
                        <h3 style='color: #1e293b; margin-top: 0;'>Next Steps:</h3>
                        <ol style='color: #334155;'>
                            <li>Please submit a new lost item report through our system</li>
                            <li>Include as many details as possible in your new report</li>
                            <li>We will continue monitoring for your lost item</li>
                        </ol>
                    </div>

                    <p>We apologize for any inconvenience this may have caused.</p>
                    <p>If you need assistance, please don't hesitate to contact our office.</p>
                    
                    <p>Best regards,<br>UNI Lost and Found Team</p>
                </div>";

            await SendEmailAsync(email, subject, body);
        }
    }
} 