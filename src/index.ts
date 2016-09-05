import { buildSchema as buildGraphqlSchema, GraphQLSchema, graphql } from 'graphql';
import { addMockFunctionsToSchema } from 'graphql-tools';
import { invariant } from './lib';

export function granate(schema: string | GraphQLSchema,
                        requestString: string,
                        rootValue?: Object,
                        contextValue?: Object,
                        variableValues?: {[key: string]: any}): Promise<any> {

    invariant(typeof requestString === 'string' && requestString.length > 0, 'Query must be a non empty string.');
    invariant(schema && (!(schema instanceof GraphQLSchema) || !(typeof schema === 'string')), 'Schema must be either a GraphQL schema instance or a string in schema language.');

    const schemaInstance = typeof schema === 'string' ? buildSchema(schema) : schema;

    return graphql(
        schemaInstance,
        requestString,
        rootValue,
        contextValue,
        variableValues
    );
}

export function buildSchema(schemaText: string, mocks?: Object): GraphQLSchema {
    const schema = buildGraphqlSchema(schemaText);

    addMockFunctionsToSchema({schema, mocks});

    return schema;
}
