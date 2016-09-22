# REST annotation

This annotation provides GraphQL integration with existing REST backends through [granate](https://github.com/almilo/granate).

## Examples

Given a GraphQL schema like:

```
# file: todos.graphqls

type Todo {
    id: ID
    title: String
    completed: Boolean
}

type Query {
    todos: [Todos]
}
```

when annotated as described in the examples below, it can be made executable like so:

```
> granate serve todos.graphqls -a

Annotations: 'mock,rest' enabled.
Granate server listening on: 'http://localhost:4000/graphql'.
```

### Basic usage

```
type Query {
    todos: [Todos] @rest(url: "https://todos.com/todos")
}
```

```
"query { todos {id title} }" translates into: "GET https://todos.com/todos"
```

### Automatic query parameter to request parameter mapping

```
type Query {
    todos(completed: Boolean, max: Int): [Todos] @rest(url: "https://todos.com/todos")
}
```

```
"query { todos(q: true, max: 10) {id title} }" translates into: "GET https://todos.com/todos?q=true&max=10"
```

### POST support with automatic query parameter to request parameter mapping

```
type Query {
    todos(completed: Boolean, max: Int): [Todos] @rest(url: "https://todos.com/todos", method: "post")
}
```

```
"query { todos(q: true, max: 10) {id title} }" translates into: "POST https://todos.com/todos / body: {q: true, max: 10}"
```

### Result field selection (select one field of the REST response instead of the root)

```
type Query {
    todos: [Todos] @rest(url: "https://todos.com/todos", resultField: "items")
}
```

```
"query { todos {id title} }" translates into: "GET https://todos.com/todos" and selects the "items" field from the JSON response
```

### Base URL as default value (type or field level)
When used at the type level, all the fields of the type inherit this argument

```
type Query @rest(baseUrl: "https://todos.com") {
    todos: [Todos] @rest(url: "todos")
}
```

```
"query { todos {id title} }" translates into: "GET https://todos.com/todos"
```

### Basic authorization support as default value (type or field level)
When used at the type level, all the fields of the type inherit this argument

```
type Query @rest(basicAuthorization: "123abc456def") {
    todos: [Todos] @rest(url: "https://todos.com/todos")
}
```

```
"query { todos {id title} }" translates into: "GET https://todos.com/todos / headers: { Authentication: "Basic 123abc456def" }"
```

### Basic authorization support with environment variable resolution (type or field level)
In order to avoid authentication information in the code, it is recommended to use environment variable resolution instead

```
type Query @rest(basicAuthorization: "{{BASIC_AUTH}}") {
    todos: [Todos] @rest(url: "https://todos.com/todos")
}
```

```
> BASIC_AUTH=123abc456def granate serve todos.graphqls -a

Annotations: 'mock,rest' enabled.
Granate server listening on: 'http://localhost:4000/graphql'.
```

```
"query { todos {id title} }" translates into: "GET https://todos.com/todos / headers: { Authentication: "Basic 123abc456def" }"
```

### Token authorization support (similar to basic authorization)

```
type Query @rest(tokenAuthorization: "{{TOKEN_AUTH}}") {
    todos: [Todos] @rest(url: "https://todos.com/todos")
}
```

```
> TOKEN_AUTH=1234567890 granate serve todos.graphqls -a

Annotations: 'mock,rest' enabled.
Granate server listening on: 'http://localhost:4000/graphql'.
```

```
"query { todos {id title} }" translates into: "GET https://todos.com/todos / headers: { Authentication: "Token 1234567890" }"
```

### Query parameter to URL parameter mapping

```
type Query {
    todos(param1: String, param2: String): [Todos] @rest(url: "https://todos.com/{{param1}}/todos/{{param2}}")
}
```

```
"query { todos(param1: 'value1', param2: 'value2') {id title} }" translates into: "GET https://todos.com/value1/todos/value2"
```

### Query parameter to URL parameter mapping with automatic mapping of remaining parameters as request parameters

```
type Query {
    todos(param1: String, param2: String): [Todos] @rest(url: "https://todos.com/todos/{{param1}}")
}
```

```
"query { todos(param1: 'value1', param2: 'value2') {id title} }" translates into: "GET https://todos.com/todos/value1?param2=value2"
```

### Query parameter selection (select which parameters should be used as request parameters)

```
type Query {
    todos(param1: String, param2: String): [Todos] @rest(url: "https://todos.com/todos", params: ["param2"])
}
```

```
"query { todos(param1: 'value1', param2: 'value2') {id title} }" translates into: "GET https://todos.com/todos/value1?param2=value2"
```

### Custom headers support 

```
type Query {
    todos: [Todos] @rest(url: "https://todos.com/todos", customHeaders: ["Foo: Bar", "Baz: {{BAZ}}"])
}
```

```
> BAZ=Biz granate serve todos.graphqls -a

Annotations: 'mock,rest' enabled.
Granate server listening on: 'http://localhost:4000/graphql'.
```

```
"query { todos {id title} }" translates into: "GET https://todos.com/todos / headers: { Foo: "Bar", Baz: "Biz" }"
```
