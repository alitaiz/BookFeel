
# Bookfeel

Bookfeel is a serene, minimalist sanctuary to record and cherish your personal reflections on the books you've read. This application provides an elegant and easy-to-use interface to build a lasting collection of your literary journeys without needing an account. It is built as a single-page application using React, with data persisted locally in the browser's localStorage and securely backed up to the cloud.

## Features

- **No Account Needed:** Start writing your reflections instantly without registration.
- **Elegant & Calm UI:** A soothing design with a literary-inspired color palette and clean typography.
- **Create & Customize:** Add a book's title, cover image, a one-line summary, and a long-form reflection.
- **AI-Powered Assistant:** Refine your thoughts and articulate your feelings more evocatively with an integrated AI helper.
- **Cloud-Synced:** Your entries are saved to the cloud, accessible via a unique, private code.
- **Local Persistence:** Entries are also saved directly in your browser for fast, offline access.
- **Easy Recovery:** Access any entry directly using its unique code.
- **Fully Responsive:** Works beautifully on desktops, tablets, and mobile devices.

## Tech Stack

- **Frontend:** React, React Router
- **Styling:** Tailwind CSS
- **AI Integration:** OpenAI API via a secure proxy
- **Cloud Storage:** Cloudflare Workers, KV (for data), and R2 (for images)
- **Build Tool:** Vite
- **Deployment:** Node.js, PM2, Serve

---

## Getting Started (Local Development)

To run this project on your local machine, follow these steps.

### Prerequisites

- [Node.js](https://nodejs.org/) (LTS version recommended)
- [npm](https://www.npmjs.com/) (comes with Node.js)

### Installation & Setup

1.  **Clone the repository:**
    ```bash
    git clone <your-repository-url>
    cd bookfeel
    ```

2.  **Install dependencies:**
    ```bash
    npm install
    ```

3.  **Run the development server:**
    ```bash
    npm run dev
    ```
    This will start the Vite development server, typically at `http://localhost:5173`. The application will automatically reload when you make changes to the source files.

## Available Scripts

In the project directory, you can run:

-   `npm run dev`: Runs the app in development mode.
-   `npm run build`: Builds the app for production to the `dist` folder.
-   `npm run preview`: Serves the production build locally to preview it before deployment.

---

For deployment instructions, please see the `DEPLOYMENT.md` file.
