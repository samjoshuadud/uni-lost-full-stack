using Microsoft.EntityFrameworkCore.Migrations;

#nullable disable

namespace UniLostAndFound.API.Migrations
{
    /// <inheritdoc />
    public partial class RemoveRequestorUser : Migration
    {
        /// <inheritdoc />
        protected override void Up(MigrationBuilder migrationBuilder)
        {
            migrationBuilder.DropForeignKey(
                name: "FK_PendingProcesses_Users_RequestorUserId",
                table: "PendingProcesses");

            migrationBuilder.DropIndex(
                name: "IX_PendingProcesses_RequestorUserId",
                table: "PendingProcesses");

            migrationBuilder.DropColumn(
                name: "RequestorUserId",
                table: "PendingProcesses");
        }

        /// <inheritdoc />
        protected override void Down(MigrationBuilder migrationBuilder)
        {
            migrationBuilder.AddColumn<string>(
                name: "RequestorUserId",
                table: "PendingProcesses",
                type: "varchar(255)",
                nullable: true)
                .Annotation("MySql:CharSet", "utf8mb4");

            migrationBuilder.CreateIndex(
                name: "IX_PendingProcesses_RequestorUserId",
                table: "PendingProcesses",
                column: "RequestorUserId");

            migrationBuilder.AddForeignKey(
                name: "FK_PendingProcesses_Users_RequestorUserId",
                table: "PendingProcesses",
                column: "RequestorUserId",
                principalTable: "Users",
                principalColumn: "Id",
                onDelete: ReferentialAction.SetNull);
        }
    }
}
