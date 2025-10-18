import dotenv from "dotenv";
dotenv.config();
import express from "express";
import multer from "multer";
import fs from "fs";
import path from "path";
import archiver from "archiver";
import { fileURLToPath } from "url";
import { createClient } from "@supabase/supabase-js";

// --- Supabase Setup ---
const supabaseUrl = process.env.SUPABASE_URL;
const supabaseKey = process.env.SUPABASE_KEY; // use one key only (anon or service_role)
if (!supabaseUrl || !supabaseKey) {
  console.error("❌ Missing Supabase credentials. Check .env for SUPABASE_URL and SUPABASE_KEY.");
}
const supabase = createClient(supabaseUrl, supabaseKey);
const ADMIN_KEY = process.env.ADMIN_KEY || "devkey123";

const app = express();
const PORT = process.env.PORT || 3000;
const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

// --- Middleware ---
app.use(express.urlencoded({ extended: true }));
app.use(express.json());
app.use(express.static(path.join(__dirname, "public")));

app.set("view engine", "ejs");
app.set("views", path.join(__dirname, "views"));

// --- Simple dev key check ---
function checkDevKey(key) {
  return key === ADMIN_KEY;
}

// --- Multer storage ---
const storage = multer.diskStorage({
  destination: function (req, file, cb) {
    let dest = "public/uploads";
    if (file.mimetype.includes("stl")) dest += "/stl";
    else dest += "/photos";
    fs.mkdirSync(dest, { recursive: true });
    cb(null, dest);
  },
  filename: function (req, file, cb) {
    cb(null, `${Date.now()}_${file.originalname}`);
  },
});
const upload = multer({ storage });

// --- Helper to save submission to Supabase ---
async function saveSubmission(type, data) {
  try {
    const { error } = await supabase.from("submissions").insert([
      { type, data, status: "open" } // removed date
    ]);
    if (error) console.error("Supabase insert error:", error);
  } catch (err) {
    console.error("Save submission error:", err);
  }
}

// --- Routes ---

// Home
app.get("/", (req, res) => res.render("index"));

// PC Build
app.get("/pc-build", (req, res) => res.render("pc-build"));
app.post("/pc-build", upload.none(), async (req, res) => {
  await saveSubmission("pc-build", req.body);
  res.render("success", { message: "" });
});

// Console Fix
app.get("/console-fix", (req, res) => res.render("console-fix"));
app.post("/console-fix", upload.none(), async (req, res) => {
  await saveSubmission("console-fix", req.body);
  res.render("success", { message: "" });
});

// 3D Print
app.get("/3d-print", (req, res) => res.render("print"));
app.post("/3d-print", upload.fields([{ name: "photos" }, { name: "stl" }]), async (req, res) => {
  const data = {
    ...req.body,
    photos: req.files.photos ? req.files.photos.map(f => `/uploads/photos/${f.filename}`) : [],
    stl: req.files.stl && req.files.stl[0] ? `/uploads/stl/${req.files.stl[0].filename}` : null,
  };
  await saveSubmission("3d-print", data);
  res.render("success", { message: "" });
});

// --- Developer Dashboard ---
app.get("/dev", async (req, res) => {
  if (!checkDevKey(req.query.key)) return res.status(403).send("Forbidden");
  let submissions = [];
  try {
    const { data, error } = await supabase
      .from("submissions")
      .select("*")
      .order("id", { ascending: false });
    if (error) console.error(error);
    submissions = data || [];
  } catch (err) {
    console.error("Supabase fetch error:", err);
  }
  res.render("dev", { submissions, key: req.query.key, supabaseConfigured: true });
});

// --- Developer Uploads Page ---
app.get("/dev-uploads", async (req, res) => {
  if (!checkDevKey(req.query.key)) return res.status(403).send("Forbidden");

  let uploads = [];
  try {
    // Fetch uploads from Supabase if you later add a dedicated uploads table.
    // For now, we can just show files from your /public/uploads folder.
    const uploadsDir = path.join(__dirname, "public/uploads");
    const photoDir = path.join(uploadsDir, "photos");
    const stlDir = path.join(uploadsDir, "stl");

    const photos = fs.existsSync(photoDir) ? fs.readdirSync(photoDir) : [];
    const stls = fs.existsSync(stlDir) ? fs.readdirSync(stlDir) : [];

    uploads = [
      ...photos.map(name => ({ type: "photo", name })),
      ...stls.map(name => ({ type: "stl", name })),
    ];
  } catch (err) {
    console.error("Uploads route error:", err);
  }

  res.render("dev-uploads", { key: req.query.key, uploads });
});

// --- 404 fallback ---
app.use((req, res) => res.status(404).send("Page not found"));

// --- Start Server ---
app.listen(PORT, () => console.log(`✅ Server running on http://localhost:${PORT}`));
