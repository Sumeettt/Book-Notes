CREATE TABLE books (
    id SERIAL PRIMARY KEY,
    book_title VARCHAR(250),
    book_author VARCHAR(250), 
    book_isbn VARCHAR(250),
    book_cover_url VARCHAR(250),
    book_summary VARCHAR(1000)
);
