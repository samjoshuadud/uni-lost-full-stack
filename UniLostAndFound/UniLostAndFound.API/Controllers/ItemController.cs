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
                    await _emailService.SendItemReportedEmailAsync(
                        user.Email,
                        createDto.Name,
                        process.Id
                    );
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
                            await _emailService.SendItemApprovedEmailAsync(
                                reporter.Email,
                                item.Name,
                                item.Id,
                                process.Id
                            );
                        }
                        catch (Exception emailEx)
                        {
                            _logger.LogError($"Failed to send approval email: {emailEx.Message}");
                            // Continue even if email fails
                        }
                    }
                }
            }

            return Ok(new ApiResponse<bool>
            {
                Success = true,
                Message = dto.Approved ? "Item approved successfully" : "Item approval removed",
                Data = true
            });
        }
        catch (Exception ex)
        {
            return StatusCode(500, ex.Message);
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
            
            // If status is changing to in_verification
            if (dto.Status == "in_verification")
            {
                // Store the questions in VerificationQuestions table
                var questions = JsonSerializer.Deserialize<List<string>>(dto.Message);
                await _verificationQuestionService.CreateQuestionsAsync(process.Id, questions);
                
                // Set the standard message from constants
                process.Message = "Item is being verified";
            }
            else 
            {
                // For other statuses, use the provided message
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
            // Get the process and its questions
            var process = await _processService.GetProcessByIdAsync(processId);
            if (process == null)
                return NotFound("Process not found");

            var questions = await _verificationQuestionService.GetQuestionsByProcessIdAsync(processId);
            if (!questions.Any())
                return BadRequest("No verification questions found for this process");

            // For now, we'll just update the status to verified
            // In a real application, you would compare the answers with stored correct answers
            process.status = "verified";
            process.Message = "Verification completed successfully";
            
            await _processService.UpdateProcessAsync(process);

            return Ok(new { message = "Verification completed successfully" });
        }
        catch (Exception ex)
        {
            _logger.LogError($"Error verifying answers: {ex.Message}");
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

            // Increment verification attempts
            process.VerificationAttempts += 1;

            // Check if max attempts reached
            if (process.VerificationAttempts >= 3)
            {
                process.status = ProcessMessages.Status.VERIFICATION_FAILED;
                process.Message = ProcessMessages.Messages.VERIFICATION_FAILED;
            }
            else
            {
                process.status = ProcessMessages.Status.IN_VERIFICATION;
                process.Message = $"Incorrect answers. {3 - process.VerificationAttempts} attempt(s) remaining.";
            }

            await _processService.UpdateProcessAsync(process);

            return Ok(new ApiResponse<object>
            {
                Success = true,
                Message = process.Message,
                Data = new { 
                    attemptsRemaining = 3 - process.VerificationAttempts,
                    status = process.status
                }
            });
        }
        catch (Exception ex)
        {
            _logger.LogError($"Error handling wrong answer: {ex.Message}");
            return StatusCode(500, new ApiResponse<bool>
            {
                Success = false,
                Message = "Error handling verification answer"
            });
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

            // Update process status and message
            process.status = Constants.ProcessMessages.Status.PENDING_RETRIEVAL;
            process.Message = Constants.ProcessMessages.Messages.VERIFICATION_SUCCESSFUL;

            // Clear verification questions since they're no longer needed
            await _verificationQuestionService.DeleteQuestionsByProcessIdAsync(processId);

            await _processService.UpdateProcessAsync(process);

            return Ok(new ApiResponse<object>
            {
                Success = true,
                Message = Constants.ProcessMessages.Messages.VERIFICATION_SUCCESSFUL,
                Data = new { 
                    status = process.status,
                    message = process.Message
                }
            });
        }
        catch (Exception ex)
        {
            _logger.LogError($"Error handling correct answer: {ex.Message}");
            return StatusCode(500, new ApiResponse<bool>
            {
                Success = false,
                Message = "Error handling verification answer"
            });
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

            // Update process status
            process.status = ProcessMessages.Status.HANDED_OVER;
            process.Message = ProcessMessages.Messages.HANDED_OVER;

            await _processService.UpdateProcessAsync(process);

            return Ok(new ApiResponse<object>
            {
                Success = true,
                Message = ProcessMessages.Messages.HANDED_OVER,
                Data = new { 
                    status = process.status,
                    message = process.Message
                }
            });
        }
        catch (Exception ex)
        {
            _logger.LogError($"Error handling hand over: {ex.Message}");
            return StatusCode(500, new ApiResponse<bool>
            {
                Success = false,
                Message = "Error handling hand over"
            });
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

            // Update process status
            process.status = ProcessMessages.Status.NO_SHOW;
            process.Message = ProcessMessages.Messages.NO_SHOW;

            // Update item status back to pending approval
            if (process.Item != null)
            {
                // Keep the original status (lost/found) but mark as not approved
                process.Item.Status = process.Item.Status; // Keeps original lost/found status
                process.Item.Approved = false;
                await _itemService.UpdateItemAsync(process.Item);
            }

            await _processService.UpdateProcessAsync(process);

            return Ok(new ApiResponse<object>
            {
                Success = true,
                Message = ProcessMessages.Messages.NO_SHOW,
                Data = new { 
                    status = process.status,
                    message = process.Message
                }
            });
        }
        catch (Exception ex)
        {
            _logger.LogError($"Error handling no-show: {ex.Message}");
            return StatusCode(500, new ApiResponse<bool>
            {
                Success = false,
                Message = "Error handling no-show"
            });
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

            // Get the process
            var process = await _processService.GetProcessByIdAsync(dto.ProcessId);
            if (process == null)
            {
                return NotFound(new ApiResponse<object>
                {
                    Success = false,
                    Message = "Process not found"
                });
            }

            // Validate process status
            if (process.status != ProcessMessages.Status.AWAITING_SURRENDER && 
                process.status != "approved")
            {
                return BadRequest(new ApiResponse<object>
                {
                    Success = false,
                    Message = $"Invalid process status. Expected {ProcessMessages.Status.AWAITING_SURRENDER} or approved, got {process.status}"
                });
            }

            // Update process status
            process.status = ProcessMessages.Status.PENDING_RETRIEVAL;
            process.Message = ProcessMessages.Messages.PENDING_RETRIEVAL;
            process.UpdatedAt = DateTime.UtcNow;

            // Update item approval status directly
            await _itemService.UpdateApprovalStatusAsync(process.ItemId, false);

            await _processService.UpdateProcessAsync(process);

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
    public async Task<ActionResult<ApiResponse<string>>> ClaimItem([FromBody] ClaimItemDto dto)
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

            return Ok(new ApiResponse<string>
            {
                Success = true,
                Message = "Claim submitted successfully",
                Data = process.Id
            });
        }
        catch (Exception ex)
        {
            _logger.LogError($"Error submitting claim: {ex.Message}");
            return StatusCode(500, new ApiResponse<string>
            {
                Success = false,
                Message = "Failed to submit claim"
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
            // Get the process
            var process = await _processService.GetProcessByIdAsync(processId);
            if (process == null)
            {
                return NotFound(new ApiResponse<bool>
                {
                    Success = false,
                    Message = "Process not found"
                });
            }

            // Get the item
            var item = await _itemService.GetItemAsync(process.ItemId);
            if (item == null)
            {
                return NotFound(new ApiResponse<bool>
                {
                    Success = false,
                    Message = "Item not found"
                });
            }

            // Get the requestor's user details to get their student ID
            var requestor = await _userService.GetUserByIdAsync(process.RequestorUserId);
            if (requestor == null)
            {
                return NotFound(new ApiResponse<bool>
                {
                    Success = false,
                    Message = "Requestor user not found"
                });
            }

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

            // Delete verification questions
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
            // Get the process
            var process = await _processService.GetProcessByIdAsync(processId);
            if (process == null)
            {
                return NotFound(new ApiResponse<bool>
                {
                    Success = false,
                    Message = "Process not found"
                });
            }

            // Store requestor info for future email notification
            string requestorUserId = process.RequestorUserId;
            
            // Update process status
            process.status = ProcessMessages.Status.APPROVED;  // Reset to original approved state
            process.Message = ProcessMessages.Messages.CLAIM_REJECTED;
            process.RequestorUserId = null;  // Clear claim request
            await _processService.UpdateProcessAsync(process);

            // Delete verification questions
            await _verificationQuestionService.DeleteQuestionsByProcessIdAsync(processId);

            // TODO: Email Integration
            // Send email notification to requestor about rejected claim
            // - Get user email from requestorUserId
            // - Use email service to send rejection notification
            // - Include item details and contact information for admin
            // Example:
            // await _emailService.SendClaimRejectionEmail(
            //     requestorUserId,
            //     process.ItemId,
            //     "Your claim request has been rejected. Please contact admin for more information."
            // );

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
} 