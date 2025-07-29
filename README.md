# csv-txt-uploader

Simple demo web application that compares CSV/TXT files against predefined
templates, reports formatting issues and uploads the data into a database. It
consists of a Node.js/Express backend and a minimal React UI.

All Node dependencies are defined in `server/package.json`. The repository root
no longer contains its own `package.json` so install packages from within the
`server` directory.

## Authentication

Each time the app is loaded it shows a simple login screen styled the same as
the main uploader. Any username and password combination is accepted and the
provided credentials are appended to `server/logins.log` along with the login
time. No login information is persisted between visits.

Templates are discovered directly from the PostgreSQL database. Every table in
the `public` schema is treated as a possible upload target and its column
definitions form the template. The API exposes these columns using the same data
types reported by PostgreSQL, while also mapping them internally to simple
categories (`number`, `string`, `boolean`) for validation. When a user uploads a
file they select which table to insert into and the server validates that the
uploaded data matches the table's columns and types.

The backend loads all available table definitions on startup. It exposes two
endpoints:

* `GET /templates` — return the list of template names
* `GET /templates/<name>` — return the schema for a single template

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

Create whatever tables you want to upload into and ensure they exist in the
database. The application will read their column definitions and treat each
table as a template option on the upload screen.

Then install dependencies and start the server:

```bash
cd server
npm install
node index.js
```
