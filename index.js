import express from "express";
import bodyParser from "body-parser";
import pg from "pg";
import axios from "axios";
import env from "dotenv";

env.config({ quiet: true });

const app = express();
const port = process.env.PORT || 3000;
const url = "https://www.googleapis.com/books/v1/volumes";

const db = new pg.Client({
  user: process.env.USER_DB,
  host: process.env.HOST_DB,
  database: process.env.DATABASE_DB,
  password: process.env.PASSWORD_DB,
  port: process.env.PORT_DB,
});

db.connect();

app.set("view engine", "ejs");
app.use(bodyParser.urlencoded({ extended: true }));
app.use(express.static("public"));

const fallbackRecommendations = [
  {
    title: "Dom Casmurro",
    authors: "Machado de Assis",
    description: "Um clássico da literatura brasileira, cheio de memória, ciúme e dúvidas.",
    category: "Clássico brasileiro",
    cover: "",
    link: "https://books.google.com/books?q=Dom+Casmurro",
  },
  {
    title: "O Cortiço",
    authors: "Aluísio Azevedo",
    description: "Uma obra marcante do naturalismo brasileiro e da vida urbana no século XIX.",
    category: "Literatura brasileira",
    cover: "",
    link: "https://books.google.com/books?q=O+Cortiço",
  },
  {
    title: "A Hora da Estrela",
    authors: "Clarice Lispector",
    description: "Uma leitura curta e profunda sobre identidade, solidão e existência.",
    category: "Literatura brasileira",
    cover: "",
    link: "https://books.google.com/books?q=A+Hora+da+Estrela",
  },
  {
    title: "O Hobbit",
    authors: "J. R. R. Tolkien",
    description: "Uma aventura fantástica para quem gosta de jornadas, descobertas e mundos imaginários.",
    category: "Fantasia e aventura",
    cover: "",
    link: "https://books.google.com/books?q=O+Hobbit",
  },
  {
    title: "Capitães da Areia",
    authors: "Jorge Amado",
    description: "Uma história brasileira sobre amizade, desigualdade e amadurecimento.",
    category: "Romance brasileiro",
    cover: "",
    link: "https://books.google.com/books?q=Capitães+da+Areia",
  },
  {
    title: "Extraordinário",
    authors: "R. J. Palacio",
    description: "Uma narrativa acessível sobre convivência, amizade e empatia.",
    category: "Juventude",
    cover: "",
    link: "https://books.google.com/books?q=Extraordinário+R.J.+Palacio",
  },
];

// Estes dados ficam isolados para serem substituídos pela consulta ao banco
// quando a tabela de histórico de leituras estiver pronta.
const fallbackMostRead = [
  {
    title: "Dom Casmurro",
    authors: "Machado de Assis",
    reads: 42,
    category: "Clássico brasileiro",
  },
  {
    title: "O Pequeno Príncipe",
    authors: "Antoine de Saint-Exupéry",
    reads: 37,
    category: "Infantojuvenil",
  },
  {
    title: "Extraordinário",
    authors: "R. J. Palacio",
    reads: 31,
    category: "Juventude",
  },
  {
    title: "O Hobbit",
    authors: "J. R. R. Tolkien",
    reads: 28,
    category: "Fantasia",
  },
  {
    title: "Capitães da Areia",
    authors: "Jorge Amado",
    reads: 24,
    category: "Literatura brasileira",
  },
  {
    title: "A Hora da Estrela",
    authors: "Clarice Lispector",
    reads: 21,
    category: "Literatura brasileira",
  },
];

function normalizeGoogleBook(book) {
  const info = book.volumeInfo || {};

  return {
    title: info.title || "Sem título",
    authors: (info.authors || ["Autor desconhecido"]).join(", "),
    description: info.description || "Uma sugestão encontrada no catálogo do Google Books.",
    category: info.categories?.[0] || "Livro recomendado",
    cover: info.imageLinks?.thumbnail || info.imageLinks?.smallThumbnail || "",
    link: info.infoLink || "https://books.google.com/",
  };
}

app.get("/", (req, res) => {
  res.render("index.ejs");
});

app.get("/leiturometro", async (req, res) => {
  try {
    const result = await db.query("SELECT * FROM turmas");
    res.render("leiturometro.ejs", { data: result.rows });
  } catch (error) {
    console.log(error);
    res.render("leiturometro.ejs", { data: [] });
  }
});

app.get("/recomendacoes", async (req, res) => {
  const search = String(req.query.q || "").trim();
  let books = fallbackRecommendations;
  let usingApi = false;

  if (process.env.GOOGLE_BOOKS_API_KEY) {
    try {
      const result = await axios.get(url, {
        params: {
          q: search || "literatura brasileira juvenil",
          key: process.env.GOOGLE_BOOKS_API_KEY,
          maxResults: 8,
          langRestrict: "pt",
          printType: "books",
        },
      });

      const apiBooks = (result.data.items || []).map(normalizeGoogleBook);

      if (apiBooks.length > 0) {
        books = apiBooks;
        usingApi = true;
      }
    } catch (error) {
      console.log("Google Books indisponível em /recomendacoes:", error.message);
    }
  }

  res.render("recomendacoes.ejs", {
    books,
    search,
    usingApi,
  });
});

app.get("/maislidos", (req, res) => {
  res.render("maislidos.ejs", {
    books: fallbackMostRead,
  });
});

app.listen(port, () => {
  console.log(`Listening on port ${port}`);
});
