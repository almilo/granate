import { buildSchema as buildGraphqlSchema, GraphQLSchema, graphql } from 'graphql';
import { addMockFunctionsToSchema } from 'graphql-tools';
import { invariant } from './lib';

export function granate(schemaText: string,
                        requestString: string,
                        rootValue?: Object,
                        contextValue?: Object,
                        variableValues?: {[key: string]: any}): Promise<any> {

    invariant(typeof requestString === 'string' && requestString.length > 0, 'Query must be a non empty string.');
    const schema = buildSchema(schemaText);

    return graphql(
        schema,
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
