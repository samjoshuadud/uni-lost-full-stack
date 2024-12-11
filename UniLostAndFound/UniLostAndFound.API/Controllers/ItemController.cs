using Microsoft.AspNetCore.Mvc;
using UniLostAndFound.API.Models;
using UniLostAndFound.API.DTOs;
using UniLostAndFound.API.Services;
using System.Text.Json;
using UniLostAndFound.API.Constants;
using System.Security.Claims;
using MailKit.Security;
using MailKit.Net.Smtp;
using MimeKit;
using QRCoder;
using System.Drawing;
using System.Drawing.Imaging;

namespace UniLostAndFound.API.Controllers;

[ApiController]
[Route("api/[controller]")]
public class ItemController : ControllerBase
{
    private readonly ItemService _itemService;
    private readonly PendingProcessService _processService;
    private readonly ILogger<ItemController> _logger;
    private readonly VerificationQuestionService _verificationQuestionService;
    private readonly AdminService _adminService;
    private readonly UserService _userService;
    private readonly IEmailService _emailService;

    public ItemController(
        ItemService itemService,
        PendingProcessService processService,
        ILogger<ItemController> logger,
        VerificationQuestionService verificationQuestionService,
        AdminService adminService,
        UserService userService,
        IEmailService emailService)
    {
        _itemService = itemService;
        _processService = processService;
        _logger = logger;
        _verificationQuestionService = verificationQuestionService;
        _adminService = adminService;
        _userService = userService;
        _emailService = emailService;
    }

    [HttpPost]
    [Consumes("multipart/form-data")]
    public async Task<ActionResult> CreateItem([FromForm] CreateItemDto createDto)
    {
        try
        {
            _logger.LogInformation($"Creating item with name: {createDto.Name}");
            _logger.LogInformation($"Process Status from DTO: {createDto.ProcessStatus}");
            _logger.LogInformation($"Message from DTO: {createDto.Message}");
            
            string imageUrl = string.Empty;
            
            if (createDto.Image != null)
            {
                var fileName = $"{Guid.NewGuid()}{Path.GetExtension(createDto.Image.FileName)}";
                var uploadsPath = Path.GetFullPath(Path.Combine(
                    Directory.GetCurrentDirectory(),
                    "..",
                    "..",
                    "frontend",
                    "public",
                    "uploads"
                ));

                Directory.CreateDirectory(uploadsPath);
                var filePath = Path.Combine(uploadsPath, fileName);
                
                using (var stream = new FileStream(filePath, FileMode.Create))
                {
                    await createDto.Image.CopyToAsync(stream);
                }
                
                imageUrl = $"/uploads/{fileName}";
            }

            var itemId = await _itemService.CreateItemAsync(createDto, imageUrl);
            _logger.LogInformation($"Created item with ID: {itemId}");

            // Get the created process ID from the service
            var process = await _processService.GetProcessByItemIdAsync(itemId);
            var processId = process?.Id;

            // Get the user to send email
            var user = await _userService.GetUserByIdAsync(createDto.ReporterId);
            if (user != null)
            {
                _logger.LogInformation($"Attempting to send email. User: {user.Email}, Item: {createDto.Name}, Process: {process.Id}");
                try
                {
                    if (createDto.Status == ItemStatus.FOUND)
                    {
                        await _emailService.SendFoundItemReportedEmailAsync(
                            user.Email,
                            createDto.Name,
                            process.Id,
                            ""  // Empty string since we're not using QR code anymore
                        );
                    }
                    else
                    {
                        // Send regular lost item email
                        await _emailService.SendItemReportedEmailAsync(
                            user.Email,
                            createDto.Name,
                            process.Id
                        );
                    }
                }
                catch (Exception emailEx)
                {
                    _logger.LogError($"Email send failed: {emailEx.Message}");
                    // Continue with item creation even if email fails
                }
            }
            else
            {
                _logger.LogWarning($"No user found for ReporterId: {createDto.ReporterId}");
            }

            return Ok(new { itemId, processId });
        }
        catch (Exception ex)
        {
            _logger.LogError($"Error creating item: {ex.Message}");
            _logger.LogError($"Stack trace: {ex.StackTrace}");
            return BadRequest(new { error = ex.Message });
        }
    }

    [HttpGet("{id}")]
    public async Task<ActionResult<Item>> GetItem(string id)
    {
        var item = await _itemService.GetItemAsync(id);
        if (item == null) return NotFound();
        return Ok(item);
    }

    [HttpPut("{id}")]
    public async Task<ActionResult> UpdateItem(string id, [FromBody] UpdateItemDto updateDto)
    {
        try
        {
            await _itemService.UpdateApprovalStatusAsync(id, updateDto.Approved ?? false);
            return NoContent();
        }
        catch (Exception ex)
        {
            return StatusCode(500, new { error = ex.Message });
        }
    }

    [HttpDelete("{id}")]
    public async Task<ActionResult> DeleteItem(string id)
    {
        try
        {
            await _itemService.DeleteItemAsync(id);
            return NoContent();
        }
        catch (Exception ex)
        {
            return StatusCode(500, new { error = ex.Message });
        }
    }

    [HttpGet("pending/user/{userId}")]
    public async Task<ActionResult<List<PendingProcess>>> GetPendingProcessesByUser(string userId)
    {
        try
        {
            _logger.LogInformation($"Fetching pending processes for user: {userId}");
            
            var pendingProcesses = await _processService.GetByUserIdAsync(userId);
            
            return Ok(pendingProcesses);
        }
        catch (Exception ex)
        {
            _logger.LogError($"Error in GetPendingProcessesByUser: {ex.Message}");
            return StatusCode(500, new { error = "Internal server error", details = ex.Message });
        }
    }

    [HttpGet("pending/all")]
    public async Task<ActionResult<List<PendingProcess>>> GetAllPendingProcesses()
    {
        try
        {
            var pendingProcesses = await _processService.GetAllWithItemsAsync();
            return Ok(pendingProcesses);
        }
        catch (Exception ex)
        {
            _logger.LogError($"Error fetching all pending processes: {ex.Message}");
            return BadRequest(new { error = ex.Message });
        }
    }

    [HttpDelete("pending/{processId}")]
    public async Task<ActionResult> DeletePendingProcess(string processId)
    {
        try
        {
            await _processService.DeleteProcessAndItemAsync(processId);
            return NoContent();
        }
        catch (Exception ex)
        {
            _logger.LogError($"Error deleting pending process: {ex.Message}");
            return StatusCode(500, new { error = "Failed to delete pending process", details = ex.Message });
        }
    }

    [HttpPut("{id}/approve")]
    public async Task<IActionResult> ApproveItem(string id, [FromBody] ApproveItemDto dto)
    {
        try
        {
            await _itemService.UpdateApprovalStatusAsync(id, dto.Approved);

            if (dto.Approved)
            {
                // Get the item and process details
                var item = await _itemService.GetItemAsync(id);
                var process = await _processService.GetProcessByItemIdAsync(id);
                
                if (item != null && process != null)
                {
                    // Get the reporter's details
                    var reporter = await _userService.GetUserByIdAsync(item.ReporterId);
                    if (reporter != null)
                    {
                        try
                        {
                            // Send different emails based on item type
                            if (item.Status == ItemStatus.FOUND)
                            {
                                await _emailService.SendFoundItemApprovedEmailAsync(
                                    reporter.Email,
                                    item.Name,
                                    item.Id,
                                    process.Id
                                );
                            }
                            else
                            {
                                await _emailService.SendItemApprovedEmailAsync(
                                    reporter.Email,
                                    item.Name,
                                    item.Id,
                                    process.Id
                                );
                            }
                        }
                        catch (Exception emailEx)
                        {
                            _logger.LogError($"Failed to send approval email: {emailEx.Message}");
                            // Continue even if email fails
                        }
                    }
                }
            }

            return Ok(new { message = "Item approved successfully" });
        }
        catch (Exception ex)
        {
            return StatusCode(500, new { error = ex.Message });
        }
    }

    [HttpPut("process/{itemId}/status")]
    public async Task<IActionResult> UpdateProcessStatus(string itemId, [FromBody] UpdateProcessStatusDto dto)
    {
        try
        {
            var process = await _processService.GetProcessByIdAsync(itemId);
            if (process == null)
                return NotFound("Process not found");

            process.status = dto.Status;
            
            if (!string.IsNullOrEmpty(dto.UserId))
            {
                process.UserId = dto.UserId;
            }
            // If status is changing to in_verification
            if (dto.Status == "in_verification")
            {
                // Store the questions in VerificationQuestions table
                var questions = JsonSerializer.Deserialize<List<string>>(dto.Message);
                await _verificationQuestionService.CreateQuestionsAsync(process.Id, questions);
                
                // Set the standard message from constants
                process.Message = "Item is being verified";

                // Get the item and user details for email
                var item = await _itemService.GetItemAsync(process.ItemId);
                var user = await _userService.GetUserByIdAsync(process.UserId);

                if (item != null && user != null)
                {
                    try
                    {
                        await _emailService.SendVerificationStartedEmailAsync(
                            user.Email,
                            item.Name
                        );
                    }
                    catch (Exception emailEx)
                    {
                        _logger.LogError($"Failed to send verification email: {emailEx.Message}");
                        // Continue even if email fails
                    }
                }
            }
            else 
            {
                process.Message = dto.Message;
            }

            await _processService.UpdateProcessAsync(process);
            return Ok(new { message = "Process status updated successfully" });
        }
        catch (Exception ex)
        {
            _logger.LogError($"Error updating process status: {ex.Message}");
            return StatusCode(500, new { message = "Error updating process status", error = ex.Message });
        }
    }

    [HttpPost("process/{processId}/verify")]
    public async Task<IActionResult> VerifyAnswers(string processId, [FromBody] VerifyAnswersDto dto)
    {
        try
        {
            _logger.LogInformation($"Starting verification for process: {processId}");
            
            var process = await _processService.GetProcessByIdAsync(processId);
            if (process == null)
            {
                _logger.LogWarning($"Process not found: {processId}");
                return NotFound("Process not found");
            }

            // Save the answers first
            await _verificationQuestionService.SaveAnswersAsync(
                processId,
                dto.Answers
            );

            // Get the item and user for email
            var item = await _itemService.GetItemAsync(process.ItemId);
            var user = await _userService.GetUserByIdAsync(process.UserId);

            _logger.LogInformation($"Item found: {item != null}, User found: {user != null}");

            // Send email to notify user their answers are being reviewed
            if (user != null && item != null)
            {
                try
                {
                    _logger.LogInformation($"Attempting to send email to {user.Email}");
                    await _emailService.SendAnswersSubmittedEmailAsync(
                        user.Email,
                        item.Name,
                        dto.Answers
                    );
                    _logger.LogInformation("Email sent successfully");
                }
                catch (Exception emailEx)
                {
                    _logger.LogError($"Failed to send answers submitted email: {emailEx.Message}");
                    _logger.LogError($"Stack trace: {emailEx.StackTrace}");
                }
            }

            // Update process status to awaiting_review
            process.status = ProcessMessages.Status.AWAITING_REVIEW;
            process.Message = ProcessMessages.Messages.AWAITING_ANSWER_REVIEW;
            
            await _processService.UpdateProcessAsync(process);

            return Ok(new { success = true, message = ProcessMessages.Messages.AWAITING_ANSWER_REVIEW });
        }
        catch (Exception ex)
        {
            _logger.LogError($"Error verifying answers: {ex.Message}");
            _logger.LogError($"Stack trace: {ex.StackTrace}");
            return StatusCode(500, new { message = "Error verifying answers", error = ex.Message });
        }
    }

    [HttpGet("process/{processId}/questions")]
    public async Task<ActionResult<ApiResponse<List<VerificationQuestion>>>> GetVerificationQuestions(string processId)
    {
        try
        {
            var questions = await _verificationQuestionService.GetQuestionsByProcessIdAsync(processId);
            if (questions == null || !questions.Any())
            {
                return NotFound(new ApiResponse<List<VerificationQuestion>>
                {
                    Success = false,
                    Message = "No questions found for this process"
                });
            }

            // Return both questions and answers
            return Ok(new ApiResponse<List<VerificationQuestion>>
            {
                Success = true,
                Data = questions
            });
        }
        catch (Exception ex)
        {
            _logger.LogError($"Error getting verification questions: {ex.Message}");
            return StatusCode(500, new ApiResponse<List<VerificationQuestion>>
            {
                Success = false,
                Message = "Error retrieving verification questions"
            });
        }
    }

    [HttpPost("process/{processId}/questions")] // Get Answers Here As well for this endpoint
    public async Task<IActionResult> AddVerificationQuestions(string processId, [FromBody] List<string> questions)
    {
        try
        {
            var verificationQuestions = await _verificationQuestionService.CreateQuestionsAsync(processId, questions);
            
            return Ok(new { 
                processId = processId,
                questions = verificationQuestions.Select(q => q.Question).ToList()
            });
        }
        catch (Exception ex)
        {
            _logger.LogError($"Error adding verification questions: {ex.Message}");
            return StatusCode(500, new { message = "Error adding verification questions", error = ex.Message });
        }
    }

    [HttpPut("process/{processId}/cancel")]
    public async Task<IActionResult> CancelVerification(string processId)
    {
        try
        {
            var process = await _processService.GetProcessByIdAsync(processId);
            if (process == null)
                return NotFound("Process not found");

            // Delete verification questions first
            await _verificationQuestionService.DeleteQuestionsByProcessIdAsync(processId);

            // Update process status and message
            process.status = ProcessMessages.Status.PENDING_APPROVAL;
            process.Message = ProcessMessages.Messages.WAITING_APPROVAL;
            process.VerificationAttempts = 0; // Reset verification attempts
            await _processService.UpdateProcessAsync(process);

            return Ok(new ApiResponse<bool>
            { 
                Success = true,
                Message = "Verification canceled successfully",
                Data = true
            });
        }
        catch (Exception ex)
        {
            _logger.LogError($"Error canceling verification: {ex.Message}");
            return StatusCode(500, new ApiResponse<bool>
            {
                Success = false,
                Message = "Error canceling verification",
                Data = false
            });
        }
    }

    [HttpPut("update/{id}")]
    public async Task<ActionResult> UpdateItemDetails(string id, [FromForm] UpdateItemDetailsDto updateDto)
    {
        try
        {
            string? imageUrl = null;
            if (updateDto.Image != null)
            {
                // Handle new image upload
                var fileName = $"{Guid.NewGuid()}{Path.GetExtension(updateDto.Image.FileName)}";
                var uploadsPath = Path.GetFullPath(Path.Combine(
                    Directory.GetCurrentDirectory(),
                    "..",
                    "..",
                    "frontend",
                    "public",
                    "uploads"
                ));
                
                Directory.CreateDirectory(uploadsPath);
                var filePath = Path.Combine(uploadsPath, fileName);
                
                using (var stream = new FileStream(filePath, FileMode.Create))
                {
                    await updateDto.Image.CopyToAsync(stream);
                }
                
                // Store the relative path that will be used by the frontend
                imageUrl = $"/uploads/{fileName}";
            }

            await _itemService.UpdateItemDetailsAsync(id, updateDto, imageUrl);
            return Ok(new { message = "Item updated successfully" });
        }
        catch (Exception ex)
        {
            _logger.LogError($"Error updating item details: {ex.Message}");
            return StatusCode(500, new { error = ex.Message });
        }
    }

    [HttpPost("verify")]
    public async Task<ActionResult<ApiResponse<bool>>> VerifyItem([FromBody] VerifyAnswersDto dto)
    {
        try
        {
            var process = await _processService.GetProcessByIdAsync(dto.ProcessId);
            if (process == null)
            {
                return NotFound(new ApiResponse<bool> 
                { 
                    Success = false, 
                    Message = "Process not found" 
                });
            }

            // Save answers and update status
            var result = await _processService.VerifyAnswers(
                dto.ProcessId, 
                dto.Answers.Select(a => a.Answer).ToList()
            );

            return Ok(result);
        }
        catch (Exception ex)
        {
            _logger.LogError($"Error verifying item: {ex.Message}");
            return StatusCode(500, new ApiResponse<bool> 
            { 
                Success = false, 
                Message = "An error occurred while verifying the item" 
            });
        }
    }

    [HttpGet("verifications/failed")]
    public async Task<ActionResult<IEnumerable<PendingProcess>>> GetFailedVerifications()
    {
        try
        {
            var failedVerifications = await _adminService.GetFailedVerificationsAsync();
            return Ok(failedVerifications);
        }
        catch (Exception ex)
        {
            _logger.LogError($"Error getting failed verifications: {ex.Message}");
            return StatusCode(500, new { error = "Error retrieving failed verifications" });
        }
    }

    [HttpPost("verifications/{processId}/handle-failed")]
    public async Task<IActionResult> HandleFailedVerification(string processId, [FromBody] bool deleteItem)
    {
        try
        {
            await _adminService.HandleFailedVerificationAsync(processId, deleteItem);
            return Ok(new { message = deleteItem ? "Item deleted successfully" : "Process updated successfully" });
        }
        catch (Exception ex)
        {
            _logger.LogError($"Error handling failed verification: {ex.Message}");
            return StatusCode(500, new { error = "Error handling failed verification" });
        }
    }

    [HttpPost("process/{processId}/wrong-answer")]
    public async Task<IActionResult> HandleWrongAnswer(string processId)
    {
        try
        {
            var process = await _processService.GetProcessByIdAsync(processId);
            if (process == null)
                return NotFound("Process not found");

            // Get the item and user for email
            var item = await _itemService.GetItemAsync(process.ItemId);
            var user = await _userService.GetUserByIdAsync(process.UserId);

            // Increment verification attempts
            process.VerificationAttempts += 1;

            // Check if max attempts reached
            if (process.VerificationAttempts >= 3)
            {
                process.status = ProcessMessages.Status.VERIFICATION_FAILED;
                process.Message = ProcessMessages.Messages.VERIFICATION_FAILED;
                
                // Send max attempts reached email
                if (user != null && item != null)
                {
                    try
                    {
                        await _emailService.SendVerificationMaxAttemptsEmailAsync(
                            user.Email,
                            item.Name
                        );
                    }
                    catch (Exception emailEx)
                    {
                        _logger.LogError($"Failed to send max attempts email: {emailEx.Message}");
                    }
                }
            }
            else
            {
                process.status = ProcessMessages.Status.IN_VERIFICATION;
                process.Message = $"Incorrect answers. {3 - process.VerificationAttempts} attempt(s) remaining.";
                
                // Send regular verification failed email
                if (user != null && item != null)
                {
                    try
                    {
                        await _emailService.SendVerificationFailedEmailAsync(
                            user.Email,
                            item.Name,
                            3 - process.VerificationAttempts
                        );
                    }
                    catch (Exception emailEx)
                    {
                        _logger.LogError($"Failed to send verification failed email: {emailEx.Message}");
                    }
                }
            }

            await _processService.UpdateProcessAsync(process);
            return Ok(new { message = "Process updated successfully" });
        }
        catch (Exception ex)
        {
            _logger.LogError($"Error handling wrong answer: {ex.Message}");
            return StatusCode(500, new { message = "Error updating process", error = ex.Message });
        }
    }

    [HttpPost("process/{processId}/correct-answer")]
    public async Task<IActionResult> HandleCorrectAnswer(string processId)
    {
        try
        {
            var process = await _processService.GetProcessByIdAsync(processId);
            if (process == null)
                return NotFound("Process not found");

            // Get the item and user for email
            var item = await _itemService.GetItemAsync(process.ItemId);
            var user = await _userService.GetUserByIdAsync(process.UserId);

            // Update process status and message
            process.status = ProcessMessages.Status.PENDING_RETRIEVAL;
            process.Message = ProcessMessages.Messages.VERIFICATION_SUCCESSFUL;

            // Clear verification questions since they're no longer needed
            await _verificationQuestionService.DeleteQuestionsByProcessIdAsync(processId);

            // Send email notification
            if (user != null && item != null)
            {
                try
                {
                    await _emailService.SendReadyForPickupEmailAsync(
                        user.Email,
                        item.Name
                    );
                }
                catch (Exception emailEx)
                {
                    _logger.LogError($"Failed to send pickup notification email: {emailEx.Message}");
                    // Continue even if email fails
                }
            }

            await _processService.UpdateProcessAsync(process);
            return Ok(new { message = "Process updated successfully" });
        }
        catch (Exception ex)
        {
            _logger.LogError($"Error handling correct answer: {ex.Message}");
            return StatusCode(500, new { message = "Error updating process", error = ex.Message });
        }
    }

    [HttpPut("process/{processId}/hand-over")]
    public async Task<IActionResult> HandleHandOver(string processId)
    {
        try
        {
            var process = await _processService.GetProcessByIdAsync(processId);
            if (process == null)
                return NotFound("Process not found");

            // Get the item and user for email
            var item = await _itemService.GetItemAsync(process.ItemId);
            var user = await _userService.GetUserByIdAsync(process.UserId);

            // Update process status
            process.status = ProcessMessages.Status.HANDED_OVER;
            process.Message = ProcessMessages.Messages.HANDED_OVER;

            // Update item's approved status to false
            if (item != null)
            {
                item.Approved = false;
                await _itemService.UpdateItemAsync(item);
            }

            // Send email notification
            if (user != null && item != null)
            {
                try
                {
                    await _emailService.SendItemHandedOverEmailAsync(
                        user.Email,
                        item.Name
                    );
                }
                catch (Exception emailEx)
                {
                    _logger.LogError($"Failed to send hand over email: {emailEx.Message}");
                    // Continue even if email fails
                }
            }

            await _processService.UpdateProcessAsync(process);

            return Ok(new { message = "Process updated successfully" });
        }
        catch (Exception ex)
        {
            _logger.LogError($"Error handling hand over: {ex.Message}");
            return StatusCode(500, new { message = "Error updating process", error = ex.Message });
        }
    }

    [HttpPut("process/{processId}/no-show")]
    public async Task<IActionResult> HandleNoShow(string processId)
    {
        try
        {
            var process = await _processService.GetProcessByIdAsync(processId);
            if (process == null)
                return NotFound("Process not found");

            // Get the item and user for email
            var item = await _itemService.GetItemAsync(process.ItemId);
            var user = await _userService.GetUserByIdAsync(process.UserId);

            // Update process status
            process.status = ProcessMessages.Status.NO_SHOW;
            process.Message = ProcessMessages.Messages.NO_SHOW;

            // Update item status back to pending approval
            if (process.Item != null)
            {
                process.Item.Status = process.Item.Status; // Keeps original lost/found status
                process.Item.Approved = false;
                await _itemService.UpdateItemAsync(process.Item);
            }

            // Send email notification
            if (user != null && item != null)
            {
                try
                {
                    await _emailService.SendNoShowEmailAsync(
                        user.Email,
                        item.Name
                    );
                }
                catch (Exception emailEx)
                {
                    _logger.LogError($"Failed to send no-show email: {emailEx.Message}");
                    // Continue even if email fails
                }
            }

            await _processService.UpdateProcessAsync(process);

            return Ok(new { message = "Process updated successfully" });
        }
        catch (Exception ex)
        {
            _logger.LogError($"Error handling no-show: {ex.Message}");
            return StatusCode(500, new { message = "Error updating process", error = ex.Message });
        }
    }

    [HttpPost("process/found")]
    public async Task<ActionResult<ApiResponse<string>>> CreateFoundItemProcess([FromBody] QRCodeProcessDto dto)
    {
        try
        {
            var process = new PendingProcess
            {
                Id = Guid.NewGuid().ToString(),
                ItemId = dto.ItemId,
                UserId = dto.UserId,
                status = ProcessMessages.Status.AWAITING_SURRENDER,
                Message = ProcessMessages.Messages.SURRENDER_REQUIRED,
                CreatedAt = DateTime.UtcNow,
                UpdatedAt = DateTime.UtcNow
            };

            var processId = await _processService.CreateProcessAsync(process);

            return Ok(new ApiResponse<string>
            {
                Success = true,
                Message = "Found item process created successfully",
                Data = processId
            });
        }
        catch (Exception ex)
        {
            _logger.LogError($"Error creating found item process: {ex.Message}");
            return StatusCode(500, new ApiResponse<string>
            {
                Success = false,
                Message = "Failed to create found item process"
            });
        }
    }

    [HttpPost("process/scan")]
    public async Task<ActionResult<ApiResponse<object>>> HandleQRCodeScan([FromBody] QRCodeScanDto dto)
    {
        try
        {
            // Validate QR code type
            if (dto.Type != "found_item_surrender")
            {
                return BadRequest(new ApiResponse<object>
                {
                    Success = false,
                    Message = "Invalid QR code type"
                });
            }

            var process = await _processService.GetProcessByIdAsync(dto.ProcessId);
            if (process == null)
            {
                return NotFound(new ApiResponse<object>
                {
                    Success = false,
                    Message = "Process not found"
                });
            }

            // Check if already in pending_retrieval
            if (process.status.ToLower() != ProcessMessages.Status.PENDING_RETRIEVAL.ToLower())
            {
                return Ok(new ApiResponse<object>
                {
                    Success = false,
                    Message = "Item is already in pending_retrieval status",
                    Data = new
                    {
                        processId = process.Id,
                        status = process.status,
                        message = process.Message
                    }
                });
            }

            // Get the item and reporter details for email
            var item = await _itemService.GetItemAsync(process.ItemId);
            var reporter = await _userService.GetUserByIdAsync(item?.ReporterId);

            // Update process status
            process.status = ProcessMessages.Status.PENDING_RETRIEVAL;
            process.Message = ProcessMessages.Messages.PENDING_RETRIEVAL;
            process.UpdatedAt = DateTime.UtcNow;

            await _processService.UpdateProcessAsync(process);

            // Send email to the reporter if we have their details
            if (reporter != null && item != null)
            {
                try
                {
                    await _emailService.SendReadyForPickupEmailAsync(
                        reporter.Email,
                        item.Name
                    );
                }
                catch (Exception emailEx)
                {
                    _logger.LogError($"Failed to send item ready for pickup email: {emailEx.Message}");
                    // Continue even if email fails
                }
            }

            return Ok(new ApiResponse<object>
            {
                Success = true,
                Message = ProcessMessages.Messages.PENDING_RETRIEVAL,
                Data = new
                {
                    processId = process.Id,
                    status = process.status,
                    message = process.Message
                }
            });
        }
        catch (Exception ex)
        {
            _logger.LogError($"Error processing QR code: {ex.Message}");
            return StatusCode(500, new ApiResponse<object>
            {
                Success = false,
                Message = "Failed to process QR code"
            });
        }
    }

    [HttpPost("process/claim")]
    public async Task<ActionResult<ApiResponse<string>>> CreateClaimProcess([FromBody] ClaimItemDto dto)
    {
        try
        {
            // Get existing process for this item
            var process = await _processService.GetProcessByItemIdAsync(dto.ItemId);
            if (process == null)
            {
                return NotFound(new ApiResponse<string>
                {
                    Success = false,
                    Message = "Process not found for this item"
                });
            }

            // Update the process status
            process.status = ProcessMessages.Status.CLAIM_REQUEST;
            process.Message = ProcessMessages.Messages.CLAIM_REQUEST;
            process.UpdatedAt = DateTime.UtcNow;
            process.RequestorUserId = dto.RequestorUserId;  // Set the requestor's ID

            await _processService.UpdateProcessAsync(process);

            // Store the verification questions and answers
            await _verificationQuestionService.CreateQuestionsWithAnswersAsync(
                process.Id,
                dto.Questions,
                dto.AdditionalInfo
            );

            // Get the item and user for email
            var item = await _itemService.GetItemAsync(dto.ItemId);
            var user = await _userService.GetUserByIdAsync(dto.RequestorUserId);

            if (user != null && item != null)
            {
                try
                {
                    await _emailService.SendClaimSubmittedEmailAsync(
                        user.Email,
                        item.Name,
                        dto.Questions
                    );
                }
                catch (Exception emailEx)
                {
                    _logger.LogError($"Failed to send claim submitted email: {emailEx.Message}");
                    // Continue even if email fails
                }
            }

            return Ok(new ApiResponse<string>
            {
                Success = true,
                Message = "Claim request submitted successfully",
                Data = process.Id
            });
        }
        catch (Exception ex)
        {
            _logger.LogError($"Error creating claim request: {ex.Message}");
            return StatusCode(500, new ApiResponse<string>
            {
                Success = false,
                Message = "Failed to submit claim request"
            });
        }
    }

    [HttpPost("process/{processId}/cancel-claim")]
    public async Task<ActionResult<ApiResponse<string>>> CancelClaimRequest(string processId)
    {
        try
        {
            // Get the process
            var process = await _processService.GetProcessByIdAsync(processId);
            if (process == null)
            {
                return NotFound(new ApiResponse<string>
                {
                    Success = false,
                    Message = "Process not found"
                });
            }

            // Delete verification questions
            await _verificationQuestionService.DeleteQuestionsByProcessIdAsync(processId);

            // Update process status
            process.status = ProcessMessages.Status.APPROVED;
            process.Message = ProcessMessages.Messages.ITEM_APPROVED;
            process.RequestorUserId = null;  // Clear requestor ID
            process.UpdatedAt = DateTime.UtcNow;

            await _processService.UpdateProcessAsync(process);

            return Ok(new ApiResponse<string>
            {
                Success = true,
                Message = "Claim request cancelled successfully",
                Data = processId
            });
        }
        catch (Exception ex)
        {
            _logger.LogError($"Error canceling claim request: {ex.Message}");
            return StatusCode(500, new ApiResponse<string>
            {
                Success = false,
                Message = "Failed to cancel claim request"
            });
        }
    }

    [HttpPost("process/{processId}/approve-claim")]
    public async Task<ActionResult<ApiResponse<bool>>> ApproveClaimRequest(string processId)
    {
        try
        {
            var process = await _processService.GetProcessByIdAsync(processId);
            if (process == null)
            {
                return NotFound(new ApiResponse<bool> 
                { 
                    Success = false, 
                    Message = "Process not found" 
                });
            }

            // Get the item and requestor details
            var item = await _itemService.GetItemAsync(process.ItemId);
            var requestor = await _userService.GetUserByIdAsync(process.RequestorUserId);
            
            if (item == null || requestor == null)
            {
                return NotFound(new ApiResponse<bool>
                {
                    Success = false,
                    Message = "Item or requestor not found"
                });
            }

            // Get the verification questions and answers for email
            var questionsAndAnswers = await _verificationQuestionService.GetQuestionsByProcessIdAsync(processId);

            _logger.LogInformation($"Updating item ownership. Old ReporterId: {item.ReporterId}, New ReporterId: {process.RequestorUserId}");
            _logger.LogInformation($"Updating student ID. Old StudentId: {item.StudentId}, New StudentId: {requestor.StudentId}");

            // Update item with both ReporterId and StudentId
            item.ReporterId = process.RequestorUserId; // Change owner to claimant
            item.StudentId = requestor.StudentId;      // Update student ID to claimant's
            item.Approved = false;                     // Set to false for pending retrieval
            
            await _itemService.UpdateItemAsync(item);

            // Double-check the update
            var updatedItem = await _itemService.GetItemAsync(process.ItemId);
            _logger.LogInformation($"Item after update - ReporterId: {updatedItem.ReporterId}, StudentId: {updatedItem.StudentId}");

            // Update process
            process.status = ProcessMessages.Status.PENDING_RETRIEVAL;
            process.Message = ProcessMessages.Messages.PENDING_RETRIEVAL;
            process.UserId = process.RequestorUserId;  // Set UserId to the requestor's ID
            process.RequestorUserId = null;            // Clear requestor
            await _processService.UpdateProcessAsync(process);

            // Send email notification with verification details
            try
            {
                await _emailService.SendClaimApprovedEmailAsync(
                    requestor.Email,
                    item.Name,
                    questionsAndAnswers.Select(q => new ClaimQuestionAnswerDto 
                    { 
                        Question = q.Question,
                        Answer = q.Answer 
                    }).ToList()
                );
            }
            catch (Exception emailEx)
            {
                _logger.LogError($"Failed to send claim approval email: {emailEx.Message}");
                // Continue even if email fails
            }

            // Delete verification questions after successful email
            await _verificationQuestionService.DeleteQuestionsByProcessIdAsync(processId);

            return Ok(new ApiResponse<bool>
            {
                Success = true,
                Message = $"Claim approved successfully. Item ownership transferred to {process.RequestorUserId}",
                Data = true
            });
        }
        catch (Exception ex)
        {
            _logger.LogError($"Error approving claim: {ex.Message}");
            _logger.LogError($"Stack trace: {ex.StackTrace}");
            return StatusCode(500, new ApiResponse<bool>
            {
                Success = false,
                Message = "Failed to approve claim"
            });
        }
    }

    [HttpPost("process/{processId}/reject-claim")]
    public async Task<ActionResult<ApiResponse<bool>>> RejectClaimRequest(string processId)
    {
        try
        {
            var process = await _processService.GetProcessByIdAsync(processId);
            if (process == null)
            {
                return NotFound(new ApiResponse<bool> 
                { 
                    Success = false, 
                    Message = "Process not found" 
                });
            }

            // Get the item and requestor details
            var item = await _itemService.GetItemAsync(process.ItemId);
            var requestor = await _userService.GetUserByIdAsync(process.RequestorUserId);
            
            if (item == null || requestor == null)
            {
                return NotFound(new ApiResponse<bool>
                {
                    Success = false,
                    Message = "Item or requestor not found"
                });
            }

            // Get the verification questions and answers for email
            var questionsAndAnswers = await _verificationQuestionService.GetQuestionsByProcessIdAsync(processId);

            // Store requestor info for future email notification
            string requestorUserId = process.RequestorUserId;
            
            // Update process status
            process.status = ProcessMessages.Status.APPROVED;  // Reset to original approved state
            process.Message = ProcessMessages.Messages.CLAIM_REJECTED;
            process.RequestorUserId = null;  // Clear claim request
            await _processService.UpdateProcessAsync(process);

            // Send email notification with verification details
            try
            {
                await _emailService.SendClaimRejectedEmailAsync(
                    requestor.Email,
                    item.Name,
                    questionsAndAnswers.Select(q => new ClaimQuestionAnswerDto 
                    { 
                        Question = q.Question,
                        Answer = q.Answer 
                    }).ToList()
                );
            }
            catch (Exception emailEx)
            {
                _logger.LogError($"Failed to send claim rejection email: {emailEx.Message}");
                // Continue even if email fails
            }

            // Delete verification questions after sending email
            await _verificationQuestionService.DeleteQuestionsByProcessIdAsync(processId);

            return Ok(new ApiResponse<bool>
            {
                Success = true,
                Message = "Claim request rejected successfully",
                Data = true
            });
        }
        catch (Exception ex)
        {
            _logger.LogError($"Error rejecting claim: {ex.Message}");
            _logger.LogError($"Stack trace: {ex.StackTrace}");
            return StatusCode(500, new ApiResponse<bool>
            {
                Success = false,
                Message = "Failed to reject claim"
            });
        }
    }

    [HttpPost("process/match")]
    public async Task<ActionResult<ApiResponse<bool>>> MatchItems([FromBody] MatchItemsDto dto)
    {
        try
        {
            _logger.LogInformation($"Starting item match process. Lost Process ID: {dto.LostProcessId}, Found Process ID: {dto.FoundProcessId}");
            
            var lostProcess = await _processService.GetProcessByIdAsync(dto.LostProcessId);
            _logger.LogInformation($"Lost process found: {lostProcess != null}, UserId: {lostProcess?.UserId}, ItemId: {lostProcess?.ItemId}");
            
            if (lostProcess == null)
                return NotFound(new ApiResponse<bool> 
                { 
                    Success = false, 
                    Message = "Lost item process not found" 
                });

            var foundProcess = await _processService.GetProcessByIdAsync(dto.FoundProcessId);
            _logger.LogInformation($"Found process found: {foundProcess != null}");
            
            if (foundProcess == null)
                return NotFound(new ApiResponse<bool> 
                { 
                    Success = false, 
                    Message = "Found item process not found" 
                });

            foundProcess.status = ProcessMessages.Status.PENDING_RETRIEVAL;
            foundProcess.Message = ProcessMessages.Messages.PENDING_RETRIEVAL;
            await _processService.UpdateProcessAsync(foundProcess);
            _logger.LogInformation("Found process updated successfully");

            // Get reporter info BEFORE deleting the lost item
            var lostItem = await _itemService.GetItemAsync(lostProcess.ItemId);
            var reporter = await _userService.GetUserByIdAsync(lostProcess.UserId);

            _logger.LogInformation($"Lost item found: {lostItem != null}, Reporter found: {reporter != null}");
            _logger.LogInformation($"Reporter email: {reporter?.Email}, Item name: {lostItem?.Name}");

            if (reporter != null && lostItem != null)
            {
                try
                {
                    _logger.LogInformation($"Attempting to send email to {reporter.Email}");
                    await _emailService.SendReadyForPickupEmailAsync(
                        reporter.Email,
                        lostItem.Name
                    );
                    _logger.LogInformation("Email sent successfully");
                }
                catch (Exception emailEx)
                {
                    _logger.LogError($"Failed to send pickup notification email: {emailEx.Message}");
                    _logger.LogError($"Stack trace: {emailEx.StackTrace}");
                    // Consider adding email error details to the response
                }
            }
            else
            {
                _logger.LogWarning($"Cannot send email - Reporter or item missing. Reporter: {reporter != null}, Item: {lostItem != null}");
            }

            // Delete the lost item and its process AFTER sending email
            await _processService.DeleteProcessAndItemAsync(dto.LostProcessId);
            _logger.LogInformation("Lost process and item deleted successfully");

            return Ok(new ApiResponse<bool>
            {
                Success = true,
                Message = "Items matched successfully",
                Data = true
            });
        }
        catch (Exception ex)
        {
            _logger.LogError($"Error matching items: {ex.Message}");
            _logger.LogError($"Stack trace: {ex.StackTrace}");
            return StatusCode(500, new ApiResponse<bool>
            {
                Success = false,
                Message = "Failed to match items"
            });
        }
    }

    [HttpPut("process/{id}/undo-retrieval")]
    public async Task<ActionResult> UndoRetrieval(string id)
    {
        try
        {
            var process = await _processService.GetProcessByIdAsync(id);
            if (process == null)
                return NotFound(new { error = "Process not found" });

            if (process.status.ToLower() != ProcessMessages.Status.PENDING_RETRIEVAL.ToLower())
                return BadRequest(new { error = "Process is not in pending retrieval status" });

            await _processService.UpdateStatusAsync(
                id,
                ProcessMessages.Status.APPROVED,
                ProcessMessages.Messages.ITEM_APPROVED
            );

            return NoContent();
        }
        catch (Exception ex)
        {
            _logger.LogError($"Error undoing retrieval status: {ex.Message}");
            return StatusCode(500, new { error = ex.Message });
        }
    }

    [HttpPut("process/{id}/mark-handed-over")]
    public async Task<ActionResult> MarkAsHandedOver(string id)
    {
        try
        {
            var process = await _processService.GetProcessByIdAsync(id);
            if (process == null)
                return NotFound(new { error = "Process not found" });

            if (process.status.ToLower() != ProcessMessages.Status.NO_SHOW.ToLower())
                return BadRequest(new { error = "Process is not in no-show status" });

            await _processService.UpdateStatusAsync(
                id,
                ProcessMessages.Status.HANDED_OVER,
                ProcessMessages.Messages.HANDED_OVER
            );

            return NoContent();
        }
        catch (Exception ex)
        {
            _logger.LogError($"Error marking as handed over: {ex.Message}");
            return StatusCode(500, new { error = ex.Message });
        }
    }
} 