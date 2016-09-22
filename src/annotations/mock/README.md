# Mock annotation

Given a value through the 'value' annotation argument, creates a resolver function which returns mock data generated with
[casual](https://github.com/boo1ean/casual). If the casual property is a function, it will be invoked with the arguments
provided in the 'args' annotation argument.

## Examples

Given a GraphQL schema like:

```
# file: mocks.graphqls

type CreditCard @mock(value: "card_data") {
    type: String
    number: String
}

type Foo {
    text: String @mock(value: "sentence")
}

type Bar {
    date: String @mock(value: "date", args: "[\"DD.MM.YY\"]")
}
```

it can be made executable like so:

```
> granate serve mocks.graphqls -a

Annotations: 'mock,rest' enabled.
Granate server listening on: 'http://localhost:4000/graphql'.
```
