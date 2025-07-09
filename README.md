# csv-txt-uploader

This is a small demo that checks simple formatting issues in CSV/TXT files using predefined CSV templates. It exposes an Express server and serves a minimal React UI for uploading files.

## Getting started

1. Install Node.js (version 18 or later).
2. Install backend dependencies:
   ```bash
   cd server
   npm install
   ```
3. Start the server from the project root (or run `node index.js` from the
   `server` directory):
   ```bash
   node server/index.js
   ```
   The server will run on `http://localhost:3000` and also serve the React UI.
4. In your browser open `http://localhost:3000` to use the demo UI. Choose one of the CSV templates (found in `server/templates`), upload a CSV/TXT file and click **Check File** or **Upload to DB**.

Oracle database upload is only a stub in this demo and does not actually write data.

Example templates included:

- `template1.csv` – columns `id`, `name`, `age`
- `template2.csv` – columns `product`, `price`, `available`
