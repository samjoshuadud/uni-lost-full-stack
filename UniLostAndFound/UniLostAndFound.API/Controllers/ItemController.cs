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
    private readonly AdminService _adminService;
    private readonly UserService _userService;
    private readonly IEmailService _emailService;

    public ItemController(
        ItemService itemService,
        PendingProcessService processService,
        ILogger<ItemController> logger,
        AdminService adminService,
        UserService userService,
        IEmailService emailService)
    {
        _itemService = itemService;
        _processService = processService;
        _logger = logger;
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
                    if (createDto.Status != ItemStatus.FOUND)
                    {
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
                            // Only send approval email for lost items
                            if (item.Status != ItemStatus.FOUND)
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
            process.Message = dto.Message;

            await _processService.UpdateProcessAsync(process);
            return Ok(new { message = "Process status updated successfully" });
        }
        catch (Exception ex)
        {
            _logger.LogError($"Error updating process status: {ex.Message}");
            return StatusCode(500, new { message = "Error updating process status", error = ex.Message });
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

    [HttpPost("process/match")]
    public async Task<ActionResult<ApiResponse<bool>>> MatchItems([FromBody] MatchItemsDto dto)
    {
        try
        {
            _logger.LogInformation($"Starting item match process. Lost Process ID: {dto.LostProcessId}, Found Process ID: {dto.FoundProcessId}");
            
            var lostProcess = await _processService.GetProcessByIdAsync(dto.LostProcessId);
            var foundProcess = await _processService.GetProcessByIdAsync(dto.FoundProcessId);
            
            if (lostProcess == null || foundProcess == null)
                return NotFound(new ApiResponse<bool> { 
                    Success = false, 
                    Message = "Process not found" 
                });

            // Get reporter info BEFORE deleting the lost item
            var lostItem = await _itemService.GetItemAsync(lostProcess.ItemId);
            var reporter = await _userService.GetUserByIdAsync(lostProcess.UserId);

            // Store original reporter's user ID in found process
            foundProcess.OriginalReporterUserId = lostProcess.UserId;
            foundProcess.status = ProcessMessages.Status.PENDING_RETRIEVAL;
            foundProcess.Message = ProcessMessages.Messages.PENDING_RETRIEVAL;
            await _processService.UpdateProcessAsync(foundProcess);

            // Send email notification
            if (reporter != null && lostItem != null)
            {
                try
                {
                    await _emailService.SendReadyForPickupEmailAsync(
                        reporter.Email,
                        lostItem.Name
                    );
                }
                catch (Exception emailEx)
                {
                    _logger.LogError($"Failed to send email: {emailEx.Message}");
                    // Continue even if email fails
                }
            }

            // Delete the lost item and its process
            await _processService.DeleteProcessAndItemAsync(dto.LostProcessId);

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

            // Get the original reporter for email notification
            var originalReporter = await _userService.GetUserByIdAsync(process.OriginalReporterUserId);
            
            // Update process status
            process.status = ProcessMessages.Status.APPROVED;
            process.Message = ProcessMessages.Messages.ITEM_APPROVED;
            await _processService.UpdateProcessAsync(process);

            // Send email to original reporter about verification failure
            if (originalReporter != null && process.Item != null)
            {
                try 
                {
                    await _emailService.SendVerificationFailedEmailAsync(
                        originalReporter.Email,
                        process.Item.Name
                    );
                }
                catch (Exception emailEx)
                {
                    _logger.LogError($"Failed to send verification failed email: {emailEx.Message}");
                    // Continue even if email fails
                }
            }

            return Ok(new { message = "Process updated successfully" });
        }
        catch (Exception ex)
        {
            _logger.LogError($"Error undoing retrieval: {ex.Message}");
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

    [HttpPost("process/match-found")]
    public async Task<ActionResult<ApiResponse<bool>>> MatchFoundItem([FromBody] MatchItemsDto dto)
    {
        try
        {
            _logger.LogInformation($"Starting found item match process. Found Process ID: {dto.FoundProcessId}, Lost Process ID: {dto.LostProcessId}");
            
            // Get both processes first
            var foundProcess = await _processService.GetProcessByIdAsync(dto.FoundProcessId);
            var lostProcess = await _processService.GetProcessByIdAsync(dto.LostProcessId);
            
            if (foundProcess == null || lostProcess == null)
                return NotFound(new ApiResponse<bool> { 
                    Success = false, 
                    Message = "Process not found" 
                });

            // Get necessary data
            var lostItem = await _itemService.GetItemAsync(lostProcess.ItemId);
            var lostItemReporter = await _userService.GetUserByIdAsync(lostProcess.UserId);

            // Send notification only to lost item reporter
            if (lostItemReporter != null && lostItem != null)
            {
                try
                {
                    await _emailService.SendReadyForPickupEmailAsync(
                        lostItemReporter.Email,
                        lostItem.Name
                    );
                }
                catch (Exception emailEx)
                {
                    _logger.LogError($"Failed to send notification email: {emailEx.Message}");
                    // Continue even if email fails
                }
            }

            // Update found process status
            foundProcess.OriginalReporterUserId = lostProcess.UserId;
            foundProcess.status = ProcessMessages.Status.PENDING_RETRIEVAL;
            foundProcess.Message = ProcessMessages.Messages.PENDING_RETRIEVAL;
            await _processService.UpdateProcessAsync(foundProcess);

            // Delete the lost item and its process
            await _processService.DeleteProcessAndItemAsync(dto.LostProcessId);

            return Ok(new ApiResponse<bool> {
                Success = true,
                Message = "Items matched successfully",
                Data = true
            });
        }
        catch (Exception ex)
        {
            _logger.LogError($"Error matching found item: {ex.Message}");
            return StatusCode(500, new ApiResponse<bool> {
                Success = false,
                Message = "Failed to match items"
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

            // Get the item and original reporter for email
            var item = await _itemService.GetItemAsync(process.ItemId);
            var originalReporter = await _userService.GetUserByIdAsync(process.OriginalReporterUserId);

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
            if (originalReporter != null && item != null)
            {
                try
                {
                    await _emailService.SendItemHandedOverEmailAsync(
                        originalReporter.Email,
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

            // Get the item and original reporter for email
            var item = await _itemService.GetItemAsync(process.ItemId);
            var originalReporter = await _userService.GetUserByIdAsync(process.OriginalReporterUserId);

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
            if (originalReporter != null && item != null)
            {
                try
                {
                    await _emailService.SendNoShowEmailAsync(
                        originalReporter.Email,
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

    [HttpPost("scan")]
    public async Task<ActionResult<ApiResponse<object>>> HandleQRCodeScan([FromBody] QRCodeScanDto dto)
    {
        try
        {
            if (string.IsNullOrEmpty(dto.ItemId) || string.IsNullOrEmpty(dto.AdminId))
            {
                _logger.LogWarning($"Invalid request data. ItemId: {dto.ItemId}, AdminId: {dto.AdminId}");
                return BadRequest(new ApiResponse<object>
                {
                    Success = false,
                    Message = "ItemId and AdminId are required"
                });
            }

            _logger.LogInformation($"Received scan request. ItemId: {dto.ItemId}, AdminId: {dto.AdminId}");

            // Get the original lost item to copy its details
            var originalItem = await _itemService.GetItemAsync(dto.ItemId);
            if (originalItem == null)
            {
                _logger.LogWarning($"Original item not found. ItemId: {dto.ItemId}");
                return NotFound(new ApiResponse<object>
                {
                    Success = false,
                    Message = "Original item not found"
                });
            }

            // Get admin user details
            var adminUser = await _userService.GetUserByIdAsync(dto.AdminId);
            if (adminUser == null)
            {
                _logger.LogWarning($"Admin user not found. AdminId: {dto.AdminId}");
                return BadRequest(new ApiResponse<object>
                {
                    Success = false,
                    Message = "Admin user not found"
                });
            }

            _logger.LogInformation($"Creating new found item. Original item name: {originalItem.Name}, Admin: {adminUser.Email}");

            // Create new found item
            var createItemDto = new CreateItemDto
            {
                Name = originalItem.Name,
                Description = originalItem.Description,
                Category = originalItem.Category,
                Location = originalItem.Location,
                Status = ItemStatus.FOUND,
                ReporterId = dto.AdminId,  // Use admin's ID
                StudentId = adminUser.StudentId,  // Use admin's student ID
                ProcessStatus = ProcessMessages.Status.PENDING_APPROVAL,
                Message = ProcessMessages.Messages.WAITING_APPROVAL
            };

            // Create the found item and its process
            var itemId = await _itemService.CreateItemAsync(createItemDto, originalItem.ImageUrl);

            _logger.LogInformation($"Successfully created found item with ID: {itemId}");

            return Ok(new ApiResponse<object>
            {
                Success = true,
                Message = "Found item report created successfully",
                Data = new
                {
                    itemId
                }
            });
        }
        catch (Exception ex)
        {
            _logger.LogError($"Error processing QR code: {ex.Message}");
            _logger.LogError($"Stack trace: {ex.StackTrace}");
            return StatusCode(500, new ApiResponse<object>
            {
                Success = false,
                Message = "Failed to process QR code"
            });
        }
    }

    [HttpGet("pending/{processId}")]
    public async Task<ActionResult<PendingProcess>> GetProcessById(string processId)
    {
        try
        {
            var process = await _processService.GetProcessByIdAsync(processId);
            if (process == null)
                return NotFound("Process not found");

            return Ok(process);
        }
        catch (Exception ex)
        {
            _logger.LogError($"Error getting process: {ex.Message}");
            return StatusCode(500, new { message = "Error getting process", error = ex.Message });
        }
    }

    [HttpGet("process/user/{userId}/involved")]
    public async Task<ActionResult<ApiResponse<IEnumerable<PendingProcess>>>> GetUserInvolvedProcesses(string userId)
    {
        try
        {
            var processes = await _processService.GetUserInvolvedProcessesAsync(userId);
            return Ok(new ApiResponse<IEnumerable<PendingProcess>>
            {
                Success = true,
                Data = processes
            });
        }
        catch (Exception ex)
        {
            _logger.LogError($"Error getting user involved processes: {ex.Message}");
            return StatusCode(500, new ApiResponse<IEnumerable<PendingProcess>>
            {
                Success = false,
                Message = "Failed to get user involved processes"
            });
        }
    }
} 