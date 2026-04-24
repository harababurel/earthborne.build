const SQLiteDatabase = require("better-sqlite3");
const db = new SQLiteDatabase("./backend/earthborne.db");
const sets = db.prepare("SELECT * FROM card_set").all();
console.log(JSON.stringify(sets, null, 2));
db.close();
