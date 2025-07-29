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

Templates are stored in a PostgreSQL table (default `templates`) with two
columns: `name` (the template name) and `content` which contains the CSV
definition. The first row of each CSV defines the expected headers. When a user
uploads a file, they choose one of these templates and the server validates that
the uploaded data matches the column structure and inferred data types. Set the
`TEMPLATES_TABLE` environment variable if your templates live in a differently
named table.

The backend loads all templates from the database when it starts. It exposes two
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
export TEMPLATES_TABLE=templates   # optional
```

If the table does not exist the server will create it automatically on start.
The default structure is:

```sql
CREATE TABLE templates (
  name TEXT PRIMARY KEY,
  content TEXT NOT NULL
);
```

You can load the sample templates found in `server/templates/` with `psql` or
any other tool.

Then install dependencies and start the server:

```bash
cd server
npm install
node index.js
```
