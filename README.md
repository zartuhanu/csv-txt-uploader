# csv-txt-uploader

Simple demo web application that compares CSV/TXT files against predefined
templates, reports formatting issues and uploads the data into a database. It
consists of a Node.js/Express backend and a minimal React UI.

## Authentication

Each time the app is loaded it shows a simple login screen styled the same as
the main uploader. Any username and password combination is accepted and the
provided credentials are appended to `server/logins.log` along with the login
time. No login information is persisted between visits.

Templates live in `server/templates` as CSV files. The first row defines the
expected headers. When a user uploads a file, they can choose one of these CSV
files as the template and the server will validate that the uploaded data
matches the column structure and inferred data types from the template.

## PostgreSQL setup

The upload button inserts all rows into a PostgreSQL database. A convenient way
to run PostgreSQL locally is via Docker:

```bash
docker run --name csv-uploader-postgres -e POSTGRES_PASSWORD=postgres \
  -e POSTGRES_DB=csvuploader -p 5432:5432 -d postgres
```

The server uses the standard PostgreSQL environment variables. Before starting
the backend set:

```bash
export PGHOST=localhost
export PGPORT=5432
export PGUSER=postgres
export PGPASSWORD=postgres
export PGDATABASE=csvuploader
```

Then install dependencies and start the server:

```bash
cd server
npm install
node index.js
```
