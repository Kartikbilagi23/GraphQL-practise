import { ApolloServer } from "@apollo/server";
import { startStandaloneServer } from "@apollo/server/standalone";
import connectDB from "./db.js"
import Author from "./models/Author.js";
import Book from "./models/Book.js";
import User from "./models/User.js";
import dotenv from "dotenv"
import jwt from "jsonwebtoken";
import bcrypt from "bcrypt";
import { EmailAddressResolver } from "graphql-scalars";
import authorLoader from "./loaders/authorLoader.js";
const env=dotenv;
env.config();

await connectDB();



const typeDefs = `#graphql

    scalar Email
    type Author{
    id:String,
    name:String
    }
    input AuthorInput{
    name:String
    }
    type Book{
    id:String,
    title:String,
    authorId:String,
    author:Author
    }
    type User{
    id:ID!
    name:String,
    email:Email!
    }
    input BookInput{
    title:String
    authorId:String
    }
    input RegisterInput{
    name:String,
    email:Email!,
    password:String
    }
    type login{
    token:String
    }
    input LoginInput{
    email:Email!
    password:String!
    }
    type Query{
    authors:[Author]
    books:[Book]
    book(id:ID!):Book
    favouriteBooks(id:ID!):Book,
    me:User
    }
    type Mutation{
    addauthor(author:AuthorInput!):Author
    addbook(book:BookInput!):Book
    register(user:RegisterInput!):User
    login(user:LoginInput!):login
    deletebook(id:ID!):String
    }
`;

const resolvers = {
    Email:EmailAddressResolver,
    Query: {
        authors: async () => {
            return await Author.find();
        },
        books: async () => {
            return await Book.find();
        },
        book: async (_, args) => {
            return await Book.findById(args.id);
        },
        favouriteBooks: async (_, args) => {
            return await Book.find({ authorId: args.id });  // agar iska matlab "is author ki books" hai
        },
        me: async (_, __, context) => {
            if(!context.user) {
                throw new Error("Not authorized");
            }
            return await User.findById(context.user.id);
        }
    },
    Book: {
        author(parent, args, context) {
            console.log("Resolver:", parent.title);
            return context.authorLoader.load(parent.authorId);
        }
    },
    Mutation: {
        addbook: async (_, args) => {
            return await Book.create({
                title: args.book.title,
                authorId: args.book.authorId
            })
        },
        addauthor: async (_, args) => {
            return await Author.create({
                name: args.author.name
            })
        },
        register: async (_, args) => {
            if(!args.user.email){
                throw new Error("Email is required")
            }
            if(args.user.password.length<6){
                throw new Error("Password must be at least 6 characters");
            }
            const user = await User.findOne({ email: args.user.email });
            if (user) {
                throw new Error("User already exists");
            }
            const hashpass=await bcrypt.hash(args.user.password,10);
            const newuser = await User.create({
                name: args.user.name,
                email: args.user.email,
                password: hashpass
            })
            return newuser;
        },
        login: async (_, args) => {
            const user = await User.findOne({ email: args.user.email });
            if (!user) {
                throw new Error("Invalid credentials");
            }
            const ismatch = await bcrypt.compare(args.user.password, user.password);
            if (!ismatch) {
                throw new Error("Enter valid credentials");
            }
            const token = jwt.sign({ id: user._id,role:user.role },process.env.JWT_SECRET, { expiresIn: "1d" });
            
            return { token };
        },
        deletebook:async (_,args,context) => {
            if(!context.user){
            throw new Error("Unauthorised");//if req user did not context
            }
            if(context.user.role!=="ADMIN"){
                throw new Error("Forbidden");
            }
            const book=await Book.findByIdAndDelete(args.id);
            if(!book){
                throw new Error("Book not found");
            }
            return "Book deleted successfully";
        }      
    }
}
const server = new ApolloServer({
    typeDefs, resolvers
})

const { url } = await startStandaloneServer(server, {
    listen: { port: 4000 },

context: async ({ req }) => {

    const authHeader = req.headers.authorization;
    if(!authHeader){
        return {};
    }
    try {
    const token=authHeader.replace("Bearer ","");
    const decoded=jwt.verify(token,process.env.JWT_SECRET)
    return {
        user:decoded,
        authorLoader:authorLoader()
    };
    } catch {
        return {};
    }
}
});

console.log(`Server ready at ${url}`);


// Book.author() resolver calls → 9 (ek har book ke liye)
// Lekin DataLoader ke andar jo Author.find({_id: {$in: ids}}) MongoDB query hai → sirf 1 baar chalegi, kyunki DataLoader saare 9 .load(authorId) calls ko ek hi event loop tick mein batch karke ek single query mein convert kar deta hai (4 unique author IDs ke saath $in).

// Yeh hi dataloader ka core fayda hai: resolver function calls kam nahi hote, but underlying DB queries N se 1 ho jaate hain.



// "If the resolver runs 9 times, the database must be queried 9 times."


// Resolver executions ≠ Database queries.


//without dataloader

// Book.find() = return all books=1 query
// Author.findById() = Now each book asks for its author.(1 book 1 author ke
// ke liye N book search)
// Total Queries = N+1


//with dataloader
// Book.find() = all  books
// Author.find({_id: {$in: ...}}) = 1 query total,regardless of authors
//because dataloader had coupled them like [A,B,C]
// Total Queries = 2











