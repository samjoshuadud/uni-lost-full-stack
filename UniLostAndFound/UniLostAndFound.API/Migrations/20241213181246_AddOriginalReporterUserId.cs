using Microsoft.EntityFrameworkCore.Migrations;

#nullable disable

namespace UniLostAndFound.API.Migrations
{
    /// <inheritdoc />
    public partial class AddOriginalReporterUserId : Migration
    {
        /// <inheritdoc />
        protected override void Up(MigrationBuilder migrationBuilder)
        {
            migrationBuilder.RenameColumn(
                name: "ReferenceLostItemId",
                table: "PendingProcesses",
                newName: "OriginalReporterUserId");
        }

        /// <inheritdoc />
        protected override void Down(MigrationBuilder migrationBuilder)
        {
            migrationBuilder.RenameColumn(
                name: "OriginalReporterUserId",
                table: "PendingProcesses",
                newName: "ReferenceLostItemId");
        }
    }
}
