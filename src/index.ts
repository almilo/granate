import { buildSchema, GraphQLSchema, graphql } from 'graphql';
import { addMockFunctionsToSchema } from 'graphql-tools';
import { invariant } from './lib';

export default function (schemaText: string, query: string): Promise<any> {
    invariant(typeof query === 'string' && query.length > 0, 'Query must be a non empty string.');

    return graphql(createSchema(schemaText), query);
}

function createSchema(schemaText: string): GraphQLSchema {
    const schema = buildSchema(schemaText);

    addMockFunctionsToSchema({schema});

    return schema;
}
