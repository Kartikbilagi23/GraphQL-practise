import DataLoader from "dataloader";
import Author from "../models/Author.js";

export default function(){
    return new DataLoader(async (authorIds) => {
        const authors = await Author.find({ _id: { $in: authorIds } });
        const authorMap = {};
        authors.forEach(author => {
            authorMap[author._id] = author;
        });
        return authorIds.map(id => authorMap[id]);
    });
}