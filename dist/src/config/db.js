import mongoose from "mongoose";
const db_connect = async () => {
    try {
        if (process.env.mode === "production") {
            const conn = await mongoose.connect(process.env.MONGODB_URI_PROD);
            console.log(`Database connected ${conn.connection.host}`);
        }
        else {
            console.log("ok");
            // await mongoose.connect(process.env.db_local_url)
            const conn = await mongoose.connect(process.env.MONGODB_URI_PROD);
            console.log(`Database connected ${conn.connection.host}`);
        }
    }
    catch (error) {
        console.log(error);
    }
};
export default db_connect;
//# sourceMappingURL=db.js.map