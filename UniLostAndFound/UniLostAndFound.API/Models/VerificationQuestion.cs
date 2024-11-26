using System;
using System.Collections.Generic;
using System.ComponentModel.DataAnnotations;
using System.ComponentModel.DataAnnotations.Schema;
using System.Linq;
using System.Threading.Tasks;

namespace UniLostAndFound.API.Models
{
    public class VerificationQuestion : BaseEntity
    {
        [Required]
        public string ProcessId { get; set; } = string.Empty;

        [Required]
        public string Question { get; set; } = string.Empty;

        public string? Answer { get; set; }

        // Navigation property
        public virtual PendingProcess? Process { get; set; }
    }
} 