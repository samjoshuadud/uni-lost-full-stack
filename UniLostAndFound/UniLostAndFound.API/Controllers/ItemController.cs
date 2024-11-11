using Microsoft.AspNetCore.Mvc;
using UniLostAndFound.API.Models;
using UniLostAndFound.API.DTOs;
using UniLostAndFound.API.Services;
using System.Text.Json;
using Microsoft.AspNetCore.Http;

namespace UniLostAndFound.API.Controllers;

[ApiController]
[Route("api/[controller]")]
public class ItemController : ControllerBase
{
    private readonly FirestoreService _firestoreService;
    private readonly ILogger<ItemController> _logger;

    public ItemController(FirestoreService firestoreService, ILogger<ItemController> logger)
    {
        _firestoreService = firestoreService;
        _logger = logger;
    }

    [HttpPost]
    [Consumes("multipart/form-data")]
    public async Task<ActionResult> CreateItem([FromForm] CreateItemDto createDto)
    {
        try
        {
            _logger.LogInformation($"Creating item with name: {createDto.Name}");
            
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

            List<Models.AdditionalDescription> additionalDescriptions;
            if (!string.IsNullOrEmpty(createDto.AdditionalDescriptions))
            {
                _logger.LogInformation($"Received additional descriptions: {createDto.AdditionalDescriptions}");
                var dtoDescriptions = JsonSerializer.Deserialize<List<DTOs.AdditionalDescription>>(
                    createDto.AdditionalDescriptions,
                    new JsonSerializerOptions 
                    { 
                        PropertyNameCaseInsensitive = true 
                    }
                ) ?? new List<DTOs.AdditionalDescription>();

                additionalDescriptions = dtoDescriptions.Select(dto => new Models.AdditionalDescription
                {
                    Title = dto.Title,
                    Description = dto.Description
                }).ToList();
            }
            else
            {
                additionalDescriptions = new List<Models.AdditionalDescription>();
            }

            var now = DateTime.UtcNow;

            var item = new Item
            {
                Name = createDto.Name,
                Description = createDto.Description,
                Category = createDto.Category,
                Status = createDto.Status,
                Location = createDto.Location,
                DateReported = now,
                ReporterId = createDto.ReporterId,
                StudentId = createDto.StudentId,
                UniversityId = createDto.UniversityId,
                Approved = false,
                ImageUrl = imageUrl,
                AdditionalDescriptions = additionalDescriptions,
                CreatedAt = now,
                UpdatedAt = now
            };

            _logger.LogInformation($"Creating item: {JsonSerializer.Serialize(item)}");

            var id = await _firestoreService.CreateItemAsync(item);

            // Create a pending process
            var pendingProcess = new PendingProcess
            {
                ItemId = id,
                UserId = createDto.ReporterId,
                status = "pending_approval",
                Message = "Waiting for the admin to approve the post, also checking if we have the item in possession.",
                CreatedAt = now,
                UpdatedAt = now
            };

            var processId = await _firestoreService.CreatePendingProcessAsync(pendingProcess);

            return Ok(new { itemId = id, processId });
        }
        catch (Exception ex)
        {
            _logger.LogError($"Error creating item: {ex.Message}");
            if (ex is JsonException)
            {
                _logger.LogError("JSON deserialization error details: " + ex.ToString());
            }
            return BadRequest(new { error = ex.Message });
        }
    }

    [HttpGet("{id}")]
    public async Task<ActionResult<Item>> GetItem(string id)
    {
        var item = await _firestoreService.GetItemAsync(id);
        if (item == null) return NotFound();
        return Ok(item);
    }

    [HttpGet("university/{universityId}")]
    public async Task<ActionResult<List<Item>>> GetUniversityItems(string universityId)
    {
        var items = await _firestoreService.GetItemsByUniversityAsync(universityId);
        return Ok(items);
    }

    [HttpPut("{id}")]
    public async Task<ActionResult> UpdateItem(string id, [FromBody] UpdateItemDto updateDto)
    {
        var existingItem = await _firestoreService.GetItemAsync(id);
        if (existingItem == null) return NotFound();

        if (updateDto.Status != null && !IsValidStatus(updateDto.Status))
        {
            return BadRequest("Invalid status value");
        }

        if (updateDto.Name != null) existingItem.Name = updateDto.Name;
        if (updateDto.Description != null) existingItem.Description = updateDto.Description;
        if (updateDto.Category != null) existingItem.Category = updateDto.Category;
        if (updateDto.Status != null) existingItem.Status = updateDto.Status;
        if (updateDto.Location != null) existingItem.Location = updateDto.Location;
        if (updateDto.Approved.HasValue) existingItem.Approved = updateDto.Approved.Value;

        await _firestoreService.UpdateItemAsync(id, existingItem);
        return NoContent();
    }

    private bool IsValidStatus(string status)
    {
        return status == ItemStatus.Lost ||
               status == ItemStatus.Found ||
               status == ItemStatus.InVerification ||
               status == ItemStatus.PendingRetrieval ||
               status == ItemStatus.HandedOver;
    }

    [HttpDelete("{id}")]
    public async Task<ActionResult> DeleteItem(string id)
    {
        await _firestoreService.DeleteItemAsync(id);
        return NoContent();
    }

    [HttpGet("pending/user/{userId}")]
    public async Task<ActionResult<List<PendingProcess>>> GetPendingProcessesByUser(string userId)
    {
        try
        {
            _logger.LogInformation($"Fetching pending processes for user: {userId}");
            
            var pendingProcesses = await _firestoreService.GetPendingProcessesByUserIdAsync(userId);
            
            _logger.LogInformation($"Found {pendingProcesses.Count} pending processes");
            
            if (pendingProcesses.Count == 0)
            {
                _logger.LogInformation("No pending processes found");
                return Ok(new List<PendingProcess>()); // Return empty list instead of null
            }

            return Ok(pendingProcesses);
        }
        catch (Exception ex)
        {
            _logger.LogError($"Error in GetPendingProcessesByUser: {ex.Message}");
            _logger.LogError(ex.StackTrace);
            return StatusCode(500, new { error = "Internal server error", details = ex.Message });
        }
    }

    [HttpGet("pending/all")]
    public async Task<ActionResult<List<PendingProcess>>> GetAllPendingProcesses()
    {
        try
        {
            var pendingProcesses = await _firestoreService.GetAllPendingProcessesAsync();
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
            // Get the pending process first to get the itemId
            var pendingProcesses = await _firestoreService.GetPendingProcessesByIdAsync(processId);
            var process = pendingProcesses.FirstOrDefault();
            
            if (process == null)
            {
                return NotFound("Pending process not found");
            }

            if (string.IsNullOrEmpty(process.ItemId))
            {
                return BadRequest("Invalid item ID in pending process");
            }

            await _firestoreService.DeletePendingProcessAndItemAsync(processId, process.ItemId);
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
            await _firestoreService.UpdateItemApprovalStatus(id, dto.Approved);
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
            await _firestoreService.UpdatePendingProcessStatus(itemId, dto.Status);
            return Ok();
        }
        catch (Exception ex)
        {
            return StatusCode(500, ex.Message);
        }
    }
} 