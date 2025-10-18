import dotenv from "dotenv";
dotenv.config();
import express from "express";
import multer from "multer";
import fs from "fs";
import path from "path";
import archiver from "archiver";
import { fileURLToPath } from "url";

const app = express();
const PORT = process.env.PORT || 3000;
const ADMIN_KEY = process.env.ADMIN_KEY || "devkey123";
const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

app.use(express.urlencoded({ extended: true }));
app.use(express.json());
app.use(express.static(path.join(__dirname, "public")));

app.set("view engine", "ejs");
app.set("views", path.join(__dirname, "views"));

function checkDevKey(key) {
  return key === ADMIN_KEY;
}

// Multer storage
const storage = multer.diskStorage({
  destination(req, file, cb) {
    let dest = "public/uploads";
    if (file.mimetype.includes("stl")) dest += "/stl";
    else dest += "/photos";
    fs.mkdirSync(dest, { recursive: true });
    cb(null, dest);
  },
  filename(req, file, cb) {
    cb(null, `${Date.now()}_${file.originalname}`);
  },
});
const upload = multer({ storage });

// --- Routes ---
app.get("/", (req, res) => res.render("index"));

app.get("/pc-build", (req, res) => res.render("pc-build"));
app.post("/pc-build", upload.none(), (req, res) => {
  saveSubmission("pc-build", req.body);
  res.render("success", { message: "" });
});

app.get("/console-fix", (req, res) => res.render("console-fix"));
app.post("/console-fix", upload.none(), (req, res) => {
  saveSubmission("console-fix", req.body);
  res.render("success", { message: "" });
});

app.get("/3d-print", (req, res) => res.render("print"));
app.post("/3d-print", upload.fields([{ name: "photos" }, { name: "stl" }]), (req, res) => {
  const data = {
    ...req.body,
    photos: req.files.photos ? req.files.photos.map(f => `/uploads/photos/${f.filename}`) : [],
    stl: req.files.stl && req.files.stl[0] ? `/uploads/stl/${req.files.stl[0].filename}` : null,
  };
  saveSubmission("3d-print", data);
  res.render("success", { message: "" });
});

function saveSubmission(type, data) {
  const filePath = path.join(__dirname, "submissions.json");
  let all = [];
  if (fs.existsSync(filePath)) {
    try { all = JSON.parse(fs.readFileSync(filePath)); } catch {}
  }
  all.push({ type, data, date: new Date().toISOString() });
  fs.writeFileSync(filePath, JSON.stringify(all, null, 2));
}

// Dev dashboard
app.get("/dev", (req, res) => {
  if (!checkDevKey(req.query.key)) return res.status(403).send("Forbidden");
  const submissions = fs.existsSync("submissions.json")
    ? JSON.parse(fs.readFileSync("submissions.json"))
    : [];
  res.render("dev", { submissions, key: req.query.key, supabaseConfigured: false });
});

// Uploads view
app.get("/dev/uploads", (req, res) => {
  const key = req.query.key;
  if (key !== ADMIN_KEY) return res.status(403).send("Forbidden");

  const uploadsDir = path.join(__dirname, "public/uploads");
  const uploads = fs.existsSync(uploadsDir)
    ? fs.readdirSync(uploadsDir, { withFileTypes: true }).map(f => f.name)
    : [];

  res.render("dev-uploads", { key, uploads });
});

// Update/Delete routes
app.post("/dev/delete", (req, res) => {
  const { id, key } = req.body;
  if (!checkDevKey(key)) return res.status(403).send("Forbidden");
  const filePath = path.join(__dirname, "submissions.json");
  if (!fs.existsSync(filePath)) return res.status(404).send("No submissions found");
  try {
    const all = JSON.parse(fs.readFileSync(filePath));
    const index = Number(id);
    if (!isNaN(index) && index >= 0 && index < all.length) {
      all.splice(index, 1);
      fs.writeFileSync(filePath, JSON.stringify(all, null, 2));
    }
  } catch (err) {
    console.error("Delete error:", err);
  }
  res.redirect(`/dev?key=${key}`);
});

app.post("/dev/update", (req, res) => {
  const { id, key, status } = req.body;
  if (!checkDevKey(key)) return res.status(403).send("Forbidden");
  const filePath = path.join(__dirname, "submissions.json");
  if (!fs.existsSync(filePath)) return res.status(404).send("No submissions found");
  try {
    const all = JSON.parse(fs.readFileSync(filePath));
    const index = Number(id);
    if (!isNaN(index) && index >= 0 && index < all.length) {
      all[index].status = status;
      all[index].updated = new Date().toISOString();
      fs.writeFileSync(filePath, JSON.stringify(all, null, 2));
    }
  } catch (err) {
    console.error("Update error:", err);
  }
  res.redirect(`/dev?key=${key}`);
});

// --- 404 fallback ---
app.use((req, res) => res.status(404).send("Page not found"));

// --- Start ---
app.listen(PORT, () => console.log(`✅ Server running on http://localhost:${PORT}`));
