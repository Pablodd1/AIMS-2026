const mongoose = require("mongoose");

const connectDB = async () => {
  try {
    const azure ="mongodb://dbaims:JW71jlK79I2XuhSAN91eUfMqLj28MeKHrWtZ8LOs8noHDtViK8gJ7TGht6Ypyj9U2cn5bRsiNdMVACDbKhMulg==@dbaims.mongo.cosmos.azure.com:10255/?ssl=true&replicaSet=globaldb&retrywrites=false&maxIdleTimeMS=120000&appName=@dbaims@";
    const local ="mongodb+srv://123:123@e-store.uf5qztz.mongodb.net/AIMS";
    await mongoose.connect(local, {
      useNewUrlParser: true,
      useUnifiedTopology: true,
    });
    console.log(`MongoDB Connected`);
  } catch (error) {
    console.error(`Error: ${error.message}`);
    process.exit(1); // Exit with a non-zero status code to indicate an error
  }
};

module.exports = connectDB;

