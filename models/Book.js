import mongoose from "mongoose";

const bookSchema=new mongoose.Schema({
    title: {
        type: String,
        required: true
    },
    authorId: {
        type: mongoose.Schema.Types.ObjectId,
        ref: "Author",
        required: true
    }
});

export default mongoose.model("Book",bookSchema)