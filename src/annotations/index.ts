import { GraphQLSchema } from 'graphql';

export type AnnotationArgument = {
    name: string,
    value: any
};

export type DirectiveInfo = {
    tag: string,
    arguments: Array<AnnotationArgument>
}

export type Annotation = {
    apply(schema: GraphQLSchema, mocks: Object): void
}

export type AnnotationFactory = {
    TAG: string
    (directiveInfo: DirectiveInfo, typeName: string, fieldName: string): Annotation
}

export { AnnotationExtractor } from './annotation-extractor';
