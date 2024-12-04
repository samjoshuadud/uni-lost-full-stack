using Microsoft.EntityFrameworkCore.Migrations;

#nullable disable

namespace UniLostAndFound.API.Migrations
{
    /// <inheritdoc />
    public partial class AddAnswerToVerificationQuestions : Migration
    {
        /// <inheritdoc />
        protected override void Up(MigrationBuilder migrationBuilder)
        {
            migrationBuilder.AddColumn<string>(
                name: "AdditionalInfo",
                table: "VerificationQuestions",
                type: "longtext",
                nullable: true)
                .Annotation("MySql:CharSet", "utf8mb4");
        }

        /// <inheritdoc />
        protected override void Down(MigrationBuilder migrationBuilder)
        {
            migrationBuilder.DropColumn(
                name: "AdditionalInfo",
                table: "VerificationQuestions");
        }
    }
}
