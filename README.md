# DataLens Dashboard

DataLens Dashboard is an intelligent, web-based tool designed to transform raw data from Excel and CSV files into beautiful, interactive dashboards. Leveraging the power of AI for smart configuration, it provides a seamless experience from data upload to visualization.

![DataLens Dashboard Screenshot](https://placehold.co/800x450.png)
*A preview of a dashboard created with DataLens.*

## Key Features

*   **Effortless Data Upload**: Drag-and-drop support for Excel (`.xlsx`, `.xls`) and `.csv` files, with options for multi-sheet combination and header row selection.
*   **AI-Powered Setup**: Select a template, and our Genkit-powered AI will analyze your column headers and automatically suggest chart configurations to get you started instantly.
*   **Rich Visualization Library**: Create a variety of charts and dashboard items:
    *   Bar, Line, Area, Pie/Donut, Scatter, Radar, Funnel, Treemap, Heatmap, and Gantt charts.
    *   Customizable KPI Cards to track key metrics with aggregation and targets.
    *   Value Summary tables to count unique values in any column.
*   **Interactive Data Exploration**:
    *   A robust, non-blocking search engine to explore your entire dataset.
    *   Column completeness and statistics tools to quickly assess data quality.
*   **Save & Share**:
    *   Save dashboard layouts to reuse with new datasets.
    *   Save full data snapshots to the server, preserving your exact dashboard state for later viewing.
*   **Secure Editing**: Password-protect saved snapshots to prevent unauthorized changes.
*   **Performance Optimized**: Intelligently handles large datasets by offering a quick preview mode and processing intensive calculations in asynchronous chunks to keep the UI responsive.

## Tech Stack

This application is built with a modern, robust, and AI-integrated tech stack:

*   **Framework**: [Next.js](https://nextjs.org/) (App Router)
*   **Language**: [TypeScript](https://www.typescriptlang.org/)
*   **UI Components**: [ShadCN UI](https://ui.shadcn.com/)
*   **Styling**: [Tailwind CSS](https://tailwindcss.com/)
*   **Generative AI**: [Firebase Genkit](https://firebase.google.com/docs/genkit) (with Google's Gemini models)
*   **Charts**: [Recharts](https://recharts.org/)
*   **File Parsing**: [SheetJS (xlsx)](https://sheetjs.com/)

## Getting Started

Follow these instructions to get a local copy up and running for development and testing purposes.

### Prerequisites

*   [Node.js](httpss://nodejs.org/) (v18 or newer recommended)
*   `npm` or `yarn`

### Installation & Setup

1.  **Clone the repository:**
    ```bash
    git clone https://github.com/your-username/datalens-dashboard.git
    cd datalens-dashboard
    ```

2.  **Install dependencies:**
    ```bash
    npm install
    ```

3.  **Set up environment variables:**
    Create a `.env` file in the root of your project by copying the `.env.example` (if one exists) or creating a new file. Add the following variables:

    ```env
    # Required for the AI-powered features. Get a key from Google AI Studio.
    GOOGLE_API_KEY="YOUR_GOOGLE_API_KEY"

    # The password required to unlock editing on saved dashboard snapshots.
    DASHBOARD_EDIT_PASSWORD="unlock"
    ```

4.  **Run the development server:**
    ```bash
    npm run dev
    ```
    The application should now be running at [http://localhost:9002](http://localhost:9002).

## How to Use the Application

### Step 1: Upload Your Data

*   Drag and drop your Excel or CSV file into the upload area, or click to browse.
*   Alternatively, click **Load Sample Data** to explore the app's features.
*   If using an Excel file with multiple sheets, you can select which sheets to combine.
*   Specify the row number that contains your column headers.

### Step 2: Configure Your Dashboard

You have two main paths:

1.  **Use a Template (Recommended)**:
    *   Select one of the predefined templates (e.g., Sales Analytics).
    *   An AI Request Preview will appear. You can refine the column names here to improve the AI's matching accuracy.
    *   Click "Get AI Suggestions", and the AI will pre-configure your dashboard items.

2.  **Build a Custom Dashboard**:
    *   Select the "Custom Dashboard" option.
    *   Click **"Add Another Item"** to start building.
    *   For each item, give it a title and choose an item type (Chart, KPI, etc.).
    *   Map the dimensions (categorical data, like 'Region') and measures (numerical data, like 'Sales') from your file's columns.
    *   Adjust options like stacking bars or displaying a pie chart as a donut.

### Step 3: View, Interact, and Save

*   Your interactive dashboard is now ready.
*   Hover over charts to see detailed tooltips.
*   Use the **Column Completeness** tool to check data quality.
*   Use the **Explore Your Data** table to search and view raw data.
*   Click **Save Dashboard** to save a complete snapshot (including data) to the server for later access.
*   Saved dashboards will appear in the "My Dashboards" section in the sidebar.

## Contributing

Contributions are what make the open-source community such an amazing place to learn, inspire, and create. Any contributions you make are **greatly appreciated**.

1.  Fork the Project
2.  Create your Feature Branch (`git checkout -b feature/AmazingFeature`)
3.  Commit your Changes (`git commit -m 'Add some AmazingFeature'`)
4.  Push to the Branch (`git push origin feature/AmazingFeature`)
5.  Open a Pull Request

## License

Distributed under the GNU General Public License v3.0. See `LICENSE.txt` for more information.

## Frequently Asked Questions (FAQ)

**Q: What file formats are supported?**
> A: The application supports Microsoft Excel files (`.xlsx`, `.xls`) and Comma-Separated Values files (`.csv`).

**Q: Is there a file size limit?**
> A: The front-end is configured to handle files up to 50MB. For larger datasets, the app uses a "quick preview" mode (sampling the first 10,000 rows) to maintain performance, with an option to calculate on the full dataset.

**Q: How does the AI mapping work?**
> A: When you use a template, the application sends your file's column headers and the template's required fields (e.g., 'Sales Revenue', 'Order Date') to a Google Gemini AI model via Firebase Genkit. The AI analyzes the semantic meaning of the names and returns a suggested mapping, which the app uses to pre-configure your charts.

**Q: Where are my dashboards saved?**
> A: Dashboards are saved as snapshots on the server in a `dashboards.json` file. This allows you to access them later without re-uploading the data. Note that in some hosting environments, this file may be ephemeral.

**Q: How do I change the password for editing snapshots?**
> A: You can change the password by modifying the `DASHBOARD_EDIT_PASSWORD` variable in your `.env` file and restarting the server.
