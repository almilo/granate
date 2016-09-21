import { GraphQLSchema } from 'graphql';
import { mockAnnotationFactory } from './mock';
import { restAnnotationFactory } from './rest';

export type DirectiveArgument = {
    name: string,
    value: any
};

export type DirectiveInfo = {
    tag: string,
    arguments: Array<DirectiveArgument>
}

export type Annotation = {
    apply(schema: GraphQLSchema, mocks: Object, rootValue: Object, contextValue: Object): void
}

export type AnnotationFactory = {
    TAG: string
    (directiveInfo: DirectiveInfo, typeName: string, fieldName?: string): Annotation
}

export { AnnotationExtractor } from './annotation-extractor';

export { mockAnnotationFactory } from './mock';
export { restAnnotationFactory } from './rest';

export const standardAnnotationFactories = [
    mockAnnotationFactory,
    restAnnotationFactory
];
