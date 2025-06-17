import mongoose from "mongoose";
import { config } from "process";

config();

const dbConnection = async () => {
   await mongoose.connect(process.env.MONGODB_URI, {
    }).then(() => {
        console.log("Connected to DB!");
    }).catch((error) => {
        console.log("Error", error.message);
    });
}

export default dbConnection;