# granate

[![npm version](https://badge.fury.io/js/granate.svg)](https://badge.fury.io/js/granate)
[![Build Status](https://travis-ci.org/almilo/granate.svg?branch=master)](https://travis-ci.org/almilo/granate)
[![Coverage Status](https://coveralls.io/repos/github/almilo/granate/badge.svg)](https://coveralls.io/github/almilo/granate)

Build better APIs with *annotated GraphQL*

## Introduction
[GraphQL](http://graphql.org/) is an amazing technology that allows to build application APIs in a much better way than
by implementing REST services. A GraphQL schema can be defined using a textual representation (schema language) which,
when extended by mean of *annotations* (decorators with GraphQL directive syntax), leverages a lot of really useful
possibilities. **Granate** helps you to build executable schemas with no code and evolve them rapidly.

## Usage from the CLI
In order to use **granate** from the CLI, install [granate-cli](https://github.com/almilo/granate-cli) with the
following command:
 
```
> npm i -g granate-cli
```

```
# file: todos.graphqls

type Todo {
    id: ID
    title: String
    completed: Boolean
}

type Query {
    todos: [Todo]
}
```

```
> granate serve todos.graphqls -a

Annotations: 'mock,rest' enabled.
Granate server listening on: 'http://localhost:4000/graphql'.
```

## Usage from the CLI with auto-reload (watch mode)
To get **granate** restarted on every schema change install [nodemon](https://github.com/remy/nodemon) and use it as
follows: 
 
```
> npm i -g nodemon
```

```
> nodemon --exec granate serve todos.graphqls -a -- -e js,json,graphqls

[nodemon] 1.10.2
[nodemon] to restart at any time, enter `rs`
[nodemon] watching: *.*
[nodemon] starting `granate serve todos.graphqls -a -e js,json,graphqls`
Annotations: 'mock,rest' enabled.
Granate server listening on: 'http://localhost:4000/graphql'.
```

## Usage as API
If you prefer to use **granate** as an API, install **granate** and **graphql** (peer dependency of **granate**) in your
application with the following command and have a look at the [tests](src/index.spec.js) to learn the API. 
                                 
```
> npm i granate graphql --save
```

## More examples
* [Mock annotation](src/annotations/mock)
* [Rest annotation](src/annotations/rest)
