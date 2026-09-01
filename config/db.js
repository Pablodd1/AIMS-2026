const mongoose = require("mongoose");

const connectDB = async () => {
  try {
    const local = "mongodb+srv://123:123@e-store.uf5qztz.mongodb.net/AIMS";
    await mongoose.connect(local);
    console.log("MongoDB Connected");
  } catch (error) {
    console.error("Error: " + error.message);
    process.exit(1);
  }
};

module.exports = connectDB;
