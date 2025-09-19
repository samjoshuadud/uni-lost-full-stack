# UniLostAndFound

This is a [Next.js](https://nextjs.org) project that functions as a Lost and Found system for a university. The system is designed to allow students and staff to report lost or found items, and for administrators to manage these reports and the retrieval process.

## Key Features

### User Features
* **Report Items**: Users can report lost or found items by providing details like the item's name, location, category, and a description.
* **View Items**: Users can browse a dashboard of all lost and found items, with options to filter and search for specific items.
* **Claim Verification**: To claim a found item, a user must answer verification questions set by an admin.
* **Pending Processes**: A dedicated section allows users to track the status of their reported items or claims.
* **Authentication**: The system requires users to sign in with their university email address (`@umak.edu.ph`) using Google Authentication.

### Admin Features
* **Admin Dashboard**: Administrators have a separate dashboard to manage all lost and found activities.
* **Report Management**: Admins can approve new item reports, post items for verification, and handle the final hand-over process.
* **User Management**: Admins can assign other users as administrators.

## Technologies Used

The project is a full-stack application. The frontend is built with Next.js and a C# backend, and uses the following technologies:

### Frontend
* **Next.js**: The React framework for building the application.
* **React**: The core JavaScript library for the user interface.
* **Tailwind CSS**: A utility-first CSS framework for styling.
* **Shadcn UI**: A collection of pre-built components for the UI.
* **Firebase**: Used for user authentication.
* **Lucide React**: An icon library for the user interface.

### Backend
* **ASP.NET Core**: The framework used to build the backend API.
* **Entity Framework Core**: An ORM used to interact with the database.
* **SQL Server**: The database used for storing application data.
* **Firestore**: A NoSQL cloud database for storing some application data.

## Getting Started

### Running the Frontend

1.  Navigate to the `frontend` directory in your terminal.
2.  Install the dependencies:
    ```bash
    npm install
    # or
    yarn install
    # or
    pnpm install
    # or
    bun install
    ```
3.  Start the development server:
    ```bash
    npm run dev
    # or
    yarn dev
    # or
    pnpm dev
    # or
    bun dev
    ```
4.  Open [http://localhost:3000](http://localhost:3000) in your browser.

### Running the Backend

1.  Open the `UniLostAndFound.sln` solution file in an IDE such as Visual Studio.
2.  Update the database connection strings and other configurations in `appsettings.json` and `appsettings.Development.json` to match your environment.
3.  Run database migrations to set up the database schema.
4.  Start the backend API from your IDE or by using the following .NET CLI command in the `UniLostAndFound.API` directory:
    ```bash
    dotnet run
    ```
