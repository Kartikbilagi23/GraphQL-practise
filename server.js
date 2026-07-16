import { ApolloServer } from "@apollo/server";
import { startStandaloneServer } from "@apollo/server/standalone";

const typeDefs = `#graphql
type Book{
    id:ID!
    title:String!
    author:Author!
}

type Student{
id:ID!
name:String!
branch:String!
}
type Author{
  id:ID!
  name:String!

}
type Query{
    books:[Book]
    book(id:ID!):Book
    students:[Student]
    student(id:ID!):Student
}
input BookInput{
  title:String!
  author:String!
  }
input StudentInput{
  name:String!
  branch:String!
}
type Mutation{
    addBook(book:BookInput!):Book
    addStudent(student:StudentInput!):Student
}
`;
const books=[]
const students=[]
const resolvers = {
  Query: {
    books: () =>books,
    students:()=>students,
    book:(_,args)=>{
      return books.find(book=>book.id===args.id);
    },
    student:(_,args)=>{
      return students.find(student=>student.id==args.id);
    }
  },
  Book:{
    author:(parent)=>{
      return author.find(author=>author.id===parent.authorId)
    }
  },
  Mutation:{
    addBook(_,args){
      const book={
        id:String(books.length+1),
        title:args.book.title,
        author:args.book.author
      }
      books.push(book);
      return book;
    },
    addStudent(_,args){
      const student={
        id:String(students.length+1),
        name:args.student.name,
        branch:args.student.branch
      }
      students.push(student);
      return student;
    }
  }
}
const server = new ApolloServer({
  typeDefs, resolvers
})

const { url } = await startStandaloneServer(server, {
  listen: { port: 4000 },
});

console.log(`Server ready at ${url}`);



