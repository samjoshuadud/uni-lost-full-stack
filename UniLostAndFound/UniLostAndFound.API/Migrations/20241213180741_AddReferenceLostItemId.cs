using Microsoft.EntityFrameworkCore.Migrations;

#nullable disable

namespace UniLostAndFound.API.Migrations
{
    /// <inheritdoc />
    public partial class AddReferenceLostItemId : Migration
    {
        /// <inheritdoc />
        protected override void Up(MigrationBuilder migrationBuilder)
        {
            migrationBuilder.AddColumn<string>(
                name: "ReferenceLostItemId",
                table: "PendingProcesses",
                type: "longtext",
                nullable: true)
                .Annotation("MySql:CharSet", "utf8mb4");
        }

        /// <inheritdoc />
        protected override void Down(MigrationBuilder migrationBuilder)
        {
            migrationBuilder.DropColumn(
                name: "ReferenceLostItemId",
                table: "PendingProcesses");
        }
    }
}
