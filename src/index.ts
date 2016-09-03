import { buildSchema as buildGraphqlSchema, GraphQLSchema, graphql } from 'graphql';
import { addMockFunctionsToSchema } from 'graphql-tools';
import { invariant } from './lib';

export function granate(schemaText: string, query: string): Promise<any> {
    invariant(typeof query === 'string' && query.length > 0, 'Query must be a non empty string.');

    return graphql(buildSchema(schemaText), query);
}

export function buildSchema(schemaText: string): GraphQLSchema {
    const schema = buildGraphqlSchema(schemaText);

    addMockFunctionsToSchema({schema});

    return schema;
}
