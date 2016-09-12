import { buildASTSchema, parse, GraphQLSchema, graphql } from 'graphql';
import { addMockFunctionsToSchema } from 'graphql-tools';
import { invariant } from './lib';
import { AnnotationFactory, Annotation, AnnotationExtractor } from './annotations';

export {
    AnnotationFactory,
    Annotation,
    AnnotationExtractor,
    mockAnnotationFactory,
    standardAnnotationFactories
} from './annotations';

export type Mocks = { [key: string]: () => any };

export type GranateContext = {
    rootValue?: Object,
    contextValue?: Object,
    mocks?: Mocks,
    annotationFactories?: Array<AnnotationFactory>
}

export function granate(schemaText: string,
                        requestString: string,
                        variableValues?: {},
                        granateContext: GranateContext = {}): Promise<any> {
    const {schema, rootValue, contextValue} = buildSchemaAndContext(schemaText, granateContext);

    return graphql(schema, requestString, rootValue, contextValue, variableValues);
}

export function buildSchemaAndContext(schemaText: string, granateContext: GranateContext): {
    schema: GraphQLSchema,
    rootValue: Object,
    contextValue: Object
} {
    invariant(
        typeof schemaText === 'string' && schemaText.length > 0,
        'Schema must be a non-empty string.'
    );

    const schemaAst = parse(schemaText);
    const schema = buildASTSchema(schemaAst);
    const annotationExtractor: AnnotationExtractor = new AnnotationExtractor(granateContext.annotationFactories || []);
    const annotations = annotationExtractor.parse(schemaAst);
    const rootValue = Object.assign({}, granateContext.rootValue);
    const contextValue = Object.assign({}, granateContext.contextValue);
    const mocks = Object.assign({}, granateContext.mocks);

    applyAnnotations(annotations, schema, mocks, rootValue, contextValue);
    addMockFunctionsToSchema({schema, mocks});

    return {
        schema,
        rootValue,
        contextValue
    };
}

function applyAnnotations(annotations: Array<Annotation>,
                          schema: GraphQLSchema,
                          mocks: Mocks,
                          rootValue: Object,
                          contextValue: Object) {
    annotations.forEach(annotation => annotation.apply(schema, mocks));
}
