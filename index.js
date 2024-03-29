import express from "express";
import axios from "axios";
import bodyParser from "body-parser";
import pg from "pg";


let db = new pg.Client({
user: "postgres",
  host: "localhost",
  database: "books",
  password: "123456",
  port: 5432,
});

db.connect();

const app = express();
const port = 3005;

app.use(express.static("public"));

app.use(bodyParser.urlencoded({ extended: true }));

app.get("/", async (req, res) => {
    const isbns = [];
    try{
        const response = await db.query("SELECT book_isbn FROM books ORDER BY id DESC");
        const booksISBNList = response.rows;
        for(let isbn of booksISBNList) {
            isbns.push(isbn.book_isbn);
        }
        //console.log(isbns)  

        let booksList = []

        for (let isbn of isbns) {
            try {
                const response = await axios.get(`https://covers.openlibrary.org/b/isbn/${isbn}.json`);
                const coverUrl = response.data.source_url; 
                if (coverUrl) {        
                    const books = await db.query("UPDATE books SET book_cover_url = $1 WHERE book_isbn = $2 RETURNING *",[coverUrl,isbn])
                    //console.log(books.rows[0])
                    booksList.push(books.rows[0])   
                }else {
                    const defaultCoverUrl = "/images/cover_not_available.jpg"; 
                    const books = await db.query("UPDATE books SET book_cover_url = $1 WHERE book_isbn = $2 RETURNING *",[defaultCoverUrl,isbn]);
                    //console.log(books.rows[0]);
                    booksList.push(books.rows[0]);
                }

            } catch(error) {
                console.error("Error fetching cover URL for ISBN:", isbn, error);
                const defaultCoverUrl = "/images/cover_not_available.jpg"; 
                const books = await db.query("UPDATE books SET book_cover_url = $1 WHERE book_isbn = $2 RETURNING *",[defaultCoverUrl,isbn]);
                //console.log(books.rows[0]);
                booksList.push(books.rows[0]);

            }
        }
        //console.log(booksList)
        res.render("home.ejs",{booksList:booksList})

    }catch(error){
        console.error("Error fetching database: ", error)
        res.status(500).send("Error fetching database")
    }

});


app.get("/addBook", (req, res) => {
    const action="/submit";
    const buttonText = "Submit"
    res.render("addOrEditBook.ejs", {action:action, buttonText:buttonText});
});

app.post("/submit", async (req,res)=> {
    const {title, author,isbn, summary} = req.body;

    //console.log(title, author, summary);
    try{
        await db.query("INSERT INTO books (book_title, book_author, book_isbn, book_summary) VALUES($1,$2,$3,$4)", [title, author,isbn, summary]);
        res.redirect("/");
    }catch(error){
        console.error("Error inserting book into database: ", error);
        res.status(500).send("Error inserting book into database")
    }  
    
});

app.post("/editBook", async (req,res) => {
    const editId = req.body.editId;
    console.log(editId)
    const action="update";
    const buttonText = "Update"

    const result = await db.query("SELECT * FROM books WHERE id = $1",[editId]); 
    const editBookData = result.rows[0];
    const {id,book_title,book_author,book_isbn, book_summary} = editBookData;
    console.log(editBookData);

    const object = {
        action: action,
        buttonText: buttonText,
        bookId: id,
        bookTitle : book_title,
        bookAuthor : book_author,
        bookIsbn : book_isbn,
        bookSummary : book_summary
    }

    
    res.render("addOrEditBook.ejs", object);
});

app.post("/update", async(req,res) => {
    const {title, author,isbn, summary,id} = req.body;

    try{
        await db.query("UPDATE books SET book_title = $1, book_author = $2, book_isbn = $3, book_summary = $4 WHERE id = $5", [title, author,isbn,summary,id]);
        res.redirect("/");
    }catch(error) {
        console.error("Error updating book into database: ", error);
        res.status(500).send("Error updating book into database")
    }

});

app.post("/delete", async (req, res) => {
    const deleteId = req.body.deleteId;
    console.log(deleteId);

    try{
        await db.query("DELETE FROM books WHERE id = $1", [deleteId]);
        res.redirect("/");
    }catch(error){
        console.error("Error deleting book:", error)
        res.status(500).send("Error deleting book. Please try again later.")
    }

});

app.listen(port, () => {
    console.log(`Listening on port ${port}`);
});

