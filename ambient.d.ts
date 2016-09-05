declare module 'graphql' {
    export function buildSchema(schema: string | Source): GraphQLSchema;
    export function buildASTSchema(schema: Document): GraphQLSchema;
}

declare module 'graphql-tools' {
    export function addMockFunctionsToSchema(options: {schema: any, mocks?: Object}): void;
}
