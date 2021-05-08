const express = require('express');
const cors = require('cors');

const { v4: uuidv4, validate } = require('uuid');

const app = express();
app.use(express.json());
app.use(cors());

const users = [];

//checando a existencia de uma conta de usuário
function checksExistsUserAccount(request, response, next) {
  
  //pegandos os parametros do headers
   const {username} = request.headers;

   //verificando se existe usuario com o mesmo username
   const user = users.find(user => user.username===username);

   if(!user){
     return response.status(404).json({error : "User not found!"});
   }

  //passando respostas para o requetst
  request.user=user;

   return next();
}
//verificando se a conta é pro ou nao
//se não for pro o usuario tem no maximo 10 lista de fazeres para gravar
//caso seja usuario pró ele é capaz de fazer listas de todos infinitas
function checksCreateTodosUserAvailability(request, response, next) {
  // Complete aqui
  const { user } = request;

  const lengthTodos = user.todos.length;

  if((user.pro=== false) &&  (lengthTodos< 10)){
    //verificando se ele esta no plano free e tem menos que 10 todos
    return next();
  }

  if(lengthTodos>=10 && user.pro=== false){
    return response.status(403).json({error : "The user has exceeded the limi of 10 todo for fre plan!"})
  }

  if(user.pro=== true){
    // se o usuario tem plano Pro , nao tem limitaçoes de todos
    return next();
  }

}

// essa middleware verifica se o usuário possui uma lista de todos e verificando se o id passado é valido
function checksTodoExists(request, response, next) {
  
 const {username} = request.headers;

 const {id} = request.params;

 if(validate(id)===false){
  return response.status(400).json({error : "ID not valid!"})
 }

 const user = users.find(user => user.username===username);

 if(!user){
  return response.status(404).json({error : "User not found!"});
}

 const idTodo = user.todos.find(user => user.id===id);

 if(!idTodo){
   return response.status(404).json({error : "Todo does not exists!"})
 }

 request.todo =idTodo;
 request.user=user;

 next();
}

//encontrando usuário pelo ID
function findUserById(request, response, next) {
 
  const {id} = request.params;

 const user = users.find(user => user.id===id)

 if(!user){
   return response.status(404).json({error : "User not found!"})
 }
 
 request.user=user;

 return next();

}

//essa rota Crita um novo usuario e grava num vetor
app.post('/users', (request, response) => {
  const { name, username } = request.body;

  const usernameAlreadyExists = users.some((user) => user.username === username);

  if (usernameAlreadyExists) {
    return response.status(400).json({ error: 'Username already exists' });
  }

  const user = {
    id: uuidv4(),
    name,
    username,
    pro: false,
    todos: []
  };

  users.push(user);

  return response.status(201).json(user);
});

//essa rota procura o usuaruio pelo ID
app.get('/users/:id', findUserById, (request, response) => {
  const { user } = request;

  return response.json(user);
});

//Essa Rota atualiza o usuário para um usuário Pro
app.patch('/users/:id/pro', findUserById, (request, response) => {
  const { user } = request;

  if (user.pro) {
    return response.status(400).json({ error: 'Pro plan is already activated.' });
  }

  user.pro = true;

  return response.json(user);
});

//essa rota usa a middleware para verificar se a conta de usuário exite
app.get('/todos', checksExistsUserAccount, (request, response) => {
  const { user } = request;

  return response.json(user.todos);

  //return response.json(user);
});

app.post('/todos', checksExistsUserAccount, checksCreateTodosUserAvailability, (request, response) => {
  const { title, deadline } = request.body;
  const { user } = request;

  const newTodo = {
    id: uuidv4(),
    title,
    deadline: new Date(deadline),
    done: false,
    created_at: new Date()
  };

  user.todos.push(newTodo);

  return response.status(201).json(newTodo);

});

//essta rota verifica se o usuario possui uma lista de Todos e atualiza o titulo e o deadline da lista
app.put('/todos/:id', checksTodoExists, (request, response) => {
  const { title, deadline } = request.body;
  const { todo } = request;

  todo.title = title;
  todo.deadline = new Date(deadline);

  return response.json(todo);
});

//essa rota verifica se o usuário já possui uma lista de Todos e caso tenho ele atualiza para usuário Pró
app.patch('/todos/:id/done', checksTodoExists, (request, response) => {
  const { todo } = request;

  todo.done = true;

  return response.json(todo);
});

// essta rota dele o usuario pelo ID
app.delete('/todos/:id', checksExistsUserAccount, checksTodoExists, (request, response) => {
  const { user, todo } = request;

  const todoIndex = user.todos.indexOf(todo);

  if (todoIndex === -1) {
    return response.status(404).json({ error: 'Todo not found' });
  }

  user.todos.splice(todoIndex, 1);

  return response.status(204).send();
});

module.exports = {
  app,
  users,
  checksExistsUserAccount,
  checksCreateTodosUserAvailability,
  checksTodoExists,
  findUserById
};


