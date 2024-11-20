using System;
using System.Collections.Generic;
using System.ComponentModel.DataAnnotations;
using System.ComponentModel.DataAnnotations.Schema;
using System.Linq;
using System.Threading.Tasks;

namespace UniLostAndFound.API.Models
{
    public class VerificationQuestion
    {
        [Key]
        public string Id { get; set; }

        [Required]
        public string ProcessId { get; set; }

        [Required]
        public string Question { get; set; }

        [Required]
        public DateTime CreatedAt { get; set; }

        [Required]
        public DateTime UpdatedAt { get; set; }

        [ForeignKey("ProcessId")]
        public virtual PendingProcess Process { get; set; }
    }
} 