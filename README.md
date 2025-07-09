# csv-txt-uploader

Simple demo web application that compares CSV/TXT files against predefined
templates, reports formatting issues and (optionally) uploads the data into an
Oracle Database. It consists of a Node.js/Express backend and a minimal React
UI.

Templates live in `server/templates` as CSV files. The first row defines the
expected headers. When a user uploads a file, they can choose one of these CSV
files as the template and the server will validate that the uploaded data
matches the column structure and inferred data types from the template.
