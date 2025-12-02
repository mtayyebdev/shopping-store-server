import mongoose from "mongoose";

const ConnectDB = async () => {
  try {
    const url = process.env.DB_URL;
    const connection = await mongoose.connect(url);
    if (connection) {
      console.log("DB Connected.");
    } else {
      console.log("DB Not Connecting.");
    }
  } catch (error) {
    console.log("DB Connection Error: ", error);
  }
};

export default ConnectDB;
