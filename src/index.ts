import { buildASTSchema, parse, GraphQLSchema, graphql } from 'graphql';
import { addMockFunctionsToSchema } from 'graphql-tools';
import { invariant } from './lib';
import { AnnotationFactory, Annotation, AnnotationExtractor } from './annotations';

export { AnnotationFactory, Annotation, AnnotationExtractor, mockAnnotationFactory } from './annotations';

export type IMocks = { [key: string]: () => any };

export function granate(schema: string | GraphQLSchema,
                        requestString: string,
                        rootValue?: Object,
                        contextValue?: Object,
                        variableValues?: {},
                        mocks?: IMocks): Promise<any> {

    invariant(
        typeof requestString === 'string' && requestString.length > 0,
        'Query must be a non empty string.'
    );
    invariant(
        schema && (!(schema instanceof GraphQLSchema) || !(typeof schema === 'string')),
        'Schema must be either a GraphQL schema instance or a string in schema language.'
    );

    if (schema instanceof GraphQLSchema && mocks) {
        console.warn(
            [
                'Mocks passed along with schema instance. Mocks will be ignored.',
                'In order to use custom mocks, either pass schema as text and use the mocks parameter',
                'or use buildSchema(schemaText, mocks) and pass only the resulting schema instance as schema.'
            ].join(' ')
        );
    }

    const schemaInstance = typeof schema === 'string' ? buildSchema(schema, mocks) : schema;

    return graphql(
        schemaInstance,
        requestString,
        rootValue,
        contextValue,
        variableValues
    );
}

export function buildSchema(schemaText: string,
                            mocks: IMocks = {},
                            annotationFactories: Array<AnnotationFactory> = []): GraphQLSchema {

    const schemaAst = parse(schemaText);
    const schema = buildASTSchema(schemaAst);
    const annotationExtractor: AnnotationExtractor = new AnnotationExtractor(annotationFactories);
    const annotations = annotationExtractor.parse(schemaAst);

    applyAnnotations(annotations, schema, mocks);
    addMockFunctionsToSchema({schema, mocks});

    return schema;
}

function applyAnnotations(annotations: Array<Annotation>, schema: GraphQLSchema, mocks: Object) {
    annotations.forEach(annotation => annotation.apply(schema, mocks));
}
