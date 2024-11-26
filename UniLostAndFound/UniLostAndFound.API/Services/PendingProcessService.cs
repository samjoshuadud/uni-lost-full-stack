using UniLostAndFound.API.Repositories;
using UniLostAndFound.API.Models;
using Microsoft.Extensions.Logging;
using UniLostAndFound.API.Constants;
using Microsoft.EntityFrameworkCore;
using UniLostAndFound.API.Data;

namespace UniLostAndFound.API.Services;

public class PendingProcessService
{
    private readonly IPendingProcessRepository _processRepository;
    private readonly IItemRepository _itemRepository;
    private readonly ILogger<PendingProcessService> _logger;
    private readonly AppDbContext _context;
    private readonly IVerificationQuestionService _verificationQuestionService;

    public PendingProcessService(
        IPendingProcessRepository processRepository,
        IItemRepository itemRepository,
        ILogger<PendingProcessService> logger,
        AppDbContext context,
        IVerificationQuestionService verificationQuestionService)
    {
        _processRepository = processRepository;
        _itemRepository = itemRepository;
        _logger = logger;
        _context = context;
        _verificationQuestionService = verificationQuestionService;
    }

    public async Task<IEnumerable<PendingProcess>> GetByUserIdAsync(string userId)
    {
        try
        {
            return await _processRepository.GetByUserIdAsync(userId);
        }
        catch (Exception ex)
        {
            _logger.LogError($"Error getting pending processes for user {userId}: {ex.Message}");
            throw;
        }
    }

    public async Task<IEnumerable<PendingProcess>> GetAllWithItemsAsync()
    {
        try
        {
            return await _processRepository.GetAllWithItemsAsync();
        }
        catch (Exception ex)
        {
            _logger.LogError($"Error getting all pending processes: {ex.Message}");
            throw;
        }
    }

    public async Task UpdateStatusAsync(string id, string status, string message)
    {
        try
        {
            var process = await _processRepository.GetByIdAsync(id);
            if (process == null)
            {
                throw new KeyNotFoundException($"Process with ID {id} not found");
            }

            // Validate status transition
            if (!IsValidStatusTransition(process.status, status))
            {
                throw new InvalidOperationException("Invalid status transition");
            }

            process.status = status;
            process.Message = message;
            process.UpdatedAt = DateTime.UtcNow;

            // If status is approved, update the item's approval status
            if (status == ProcessMessages.Status.APPROVED)
            {
                await _itemRepository.UpdateApprovalStatusAsync(process.ItemId, true);
            }

            await _processRepository.UpdateAsync(process);
            
            _logger.LogInformation($"Successfully updated process {id} status to {status}");
        }
        catch (Exception ex)
        {
            _logger.LogError($"Error updating process status: {ex.Message}");
            throw;
        }
    }

    private bool IsValidStatusTransition(string currentStatus, string newStatus)
    {
        // Add validation logic for status transitions
        // For now, allow all transitions
        return true;
    }

    public async Task DeleteProcessAndItemAsync(string processId)
    {
        try
        {
            var process = await _processRepository.GetByIdAsync(processId);
            if (process == null)
            {
                throw new KeyNotFoundException($"Process with ID {processId} not found");
            }

            // Delete the item first (if it exists)
            if (!string.IsNullOrEmpty(process.ItemId))
            {
                await _itemRepository.DeleteAsync(process.ItemId);
            }

            // Then delete the process
            await _processRepository.DeleteAsync(processId);
        }
        catch (Exception ex)
        {
            _logger.LogError($"Error deleting process and item: {ex.Message}");
            throw;
        }
    }

    public async Task<string> CreateProcessAsync(PendingProcess process)
    {
        try
        {
            _logger.LogInformation($"Creating pending process for item: {process.ItemId}");
            
            // Set default values if not provided
            process.Id = process.Id ?? Guid.NewGuid().ToString();
            process.CreatedAt = DateTime.UtcNow;
            process.UpdatedAt = DateTime.UtcNow;

            // Create the process and get the created entity back
            var createdProcess = await _processRepository.CreateAsync(process);
            
            _logger.LogInformation($"Successfully created pending process with ID: {createdProcess.Id}");
            
            return createdProcess.Id;
        }
        catch (Exception ex)
        {
            _logger.LogError($"Error creating pending process: {ex.Message}");
            throw;
        }
    }

    public async Task<PendingProcess> GetProcessByIdAsync(string processId)
    {
        return await _context.PendingProcesses
            .Include(p => p.Item)
            .FirstOrDefaultAsync(p => p.Id == processId);
    }

    public async Task<PendingProcess> UpdateProcessAsync(PendingProcess process)
    {
        _context.PendingProcesses.Update(process);
        await _context.SaveChangesAsync();
        return process;
    }

    public async Task<PendingProcess> GetProcessByItemIdAsync(string itemId)
    {
        try
        {
            var process = await _context.PendingProcesses
                .Include(p => p.Item)
                .FirstOrDefaultAsync(p => p.ItemId == itemId);

            return process;
        }
        catch (Exception ex)
        {
            _logger.LogError($"Error getting process by item ID: {ex.Message}");
            throw;
        }
    }

    public async Task<ApiResponse<bool>> VerifyAnswers(string processId, List<string> answers)
    {
        try
        {
            var process = await GetProcessByIdAsync(processId);
            if (process == null)
            {
                return new ApiResponse<bool> { Success = false, Message = "Process not found" };
            }

            // Increment verification attempts
            process.VerificationAttempts++;

            // Validate answers (implement your validation logic here)
            bool areAnswersCorrect = await ValidateAnswers(process.ItemId, answers);

            if (areAnswersCorrect)
            {
                process.status = ProcessMessages.Status.VERIFIED;
                process.Message = ProcessMessages.Messages.VERIFICATION_SUCCESSFUL;
                await UpdateProcessAsync(process);
                return new ApiResponse<bool> { Success = true, Message = ProcessMessages.Messages.VERIFICATION_SUCCESSFUL };
            }

            // Handle failed attempt
            if (process.HasExceededVerificationAttempts)
            {
                process.status = ProcessMessages.Status.VERIFICATION_FAILED;
                process.Message = ProcessMessages.Messages.VERIFICATION_FAILED;
                await UpdateProcessAsync(process);
                return new ApiResponse<bool> 
                { 
                    Success = false, 
                    Message = ProcessMessages.Messages.VERIFICATION_FAILED 
                };
            }

            // Still has attempts remaining
            process.Message = ProcessMessages.Messages.VERIFICATION_ATTEMPT_REMAINING;
            await UpdateProcessAsync(process);
            return new ApiResponse<bool> 
            { 
                Success = false, 
                Message = ProcessMessages.Messages.VERIFICATION_ATTEMPT_REMAINING 
            };
        }
        catch (Exception ex)
        {
            _logger.LogError($"Error during verification process: {ex.Message}");
            throw;
        }
    }

    private async Task<bool> ValidateAnswers(string itemId, List<string> submittedAnswers)
    {
        try
        {
            // Get the process with its verification questions
            var process = await _context.PendingProcesses
                .Include(p => p.Item)
                .FirstOrDefaultAsync(p => p.ItemId == itemId);

            if (process == null) return false;

            // Get verification questions for this process
            var questions = await _verificationQuestionService.GetQuestionsByProcessIdAsync(process.Id);
            if (!questions.Any() || questions.Count != submittedAnswers.Count) return false;

            // Compare each answer with its corresponding stored answer
            for (int i = 0; i < questions.Count; i++)
            {
                var storedAnswer = questions[i].Answer?.Trim().ToLower();
                var submittedAnswer = submittedAnswers[i]?.Trim().ToLower();

                if (string.IsNullOrEmpty(storedAnswer) || 
                    string.IsNullOrEmpty(submittedAnswer) || 
                    storedAnswer != submittedAnswer)
                {
                    return false;
                }
            }

            return true;
        }
        catch (Exception ex)
        {
            _logger.LogError($"Error validating answers: {ex.Message}");
            throw;
        }
    }

    public async Task<IEnumerable<PendingProcess>> GetFailedVerifications()
    {
        try
        {
            return await _context.PendingProcesses
                .Include(p => p.Item)
                .Include(p => p.User)
                .Where(p => p.status == ProcessMessages.Status.VERIFICATION_FAILED)
                .ToListAsync();
        }
        catch (Exception ex)
        {
            _logger.LogError($"Error getting failed verifications: {ex.Message}");
            throw;
        }
    }
} 