declare module 'graphql' {
    export function buildSchema(schema: any): any;
}

declare module 'graphql-tools' {
    export function addMockFunctionsToSchema(options: {schema: any}): void;
}
