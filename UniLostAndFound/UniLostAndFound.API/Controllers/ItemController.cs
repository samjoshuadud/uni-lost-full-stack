using Microsoft.AspNetCore.Mvc;
using UniLostAndFound.API.Models;
using UniLostAndFound.API.DTOs;
using UniLostAndFound.API.Services;
using System.Text.Json;
using UniLostAndFound.API.Constants;
using System.Security.Claims;

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

    public ItemController(
        ItemService itemService,
        PendingProcessService processService,
        ILogger<ItemController> logger,
        VerificationQuestionService verificationQuestionService,
        AdminService adminService)
    {
        _itemService = itemService;
        _processService = processService;
        _logger = logger;
        _verificationQuestionService = verificationQuestionService;
        _adminService = adminService;
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
            return Ok();
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
} 