import { GraphQLSchema } from 'graphql';
import { mockAnnotationFactory } from './mock';

export type DirectiveArgument = {
    name: string,
    value: any
};

export type DirectiveInfo = {
    tag: string,
    arguments: Array<DirectiveArgument>
}

export type Annotation = {
    apply(schema: GraphQLSchema, mocks: Object): void
}

export type AnnotationFactory = {
    TAG: string
    (directiveInfo: DirectiveInfo, typeName: string, fieldName?: string): Annotation
}

export { AnnotationExtractor } from './annotation-extractor';

export { mockAnnotationFactory } from './mock';

export const standardAnnotationFactories = [
    mockAnnotationFactory
];
