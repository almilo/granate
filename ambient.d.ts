declare module 'graphql' {
    export function buildSchema(schema: string | Source): GraphQLSchema;

    export function buildASTSchema(schema: Document): GraphQLSchema;
}

declare module 'casual' {
    const casual: any;

    export = casual;
}
