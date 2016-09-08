import { GraphQLSchema } from 'graphql';
import * as casual from 'casual';
import { invariant } from '../../lib';
import { findArgument, createMock, createFieldMock } from '../lib';
import { AnnotationFactory, Annotation, DirectiveInfo } from '../index';

/**
 * Given a value through the 'value' attribute, adds a mock function to the 'mocks' which returns the corresponding
 * 'casual' value (see https://githum.com/boo1ean/casual) value.
 * Mocks can be added to types or fields.
 *
 * Examples:
 *
 * type FooCard @mock(value: 'card_data') {
 *     type: String
 *     number: String
 * }
 *
 * type Foo {
 *     text: String @mock(value: 'statement')
 * }
 */
class MockAnnotation {
    constructor(private value: string, private typeName: string, private fieldName?: string) {
    }

    apply(schema: GraphQLSchema, mocks: Object): void {
        invariant(!mocks[this.typeName], `Mock for type: '${this.typeName}' already exists.`);

        const casualValue = casual[this.value];

        mocks[this.typeName] = this.fieldName ? createFieldMock(this.fieldName, casualValue) : createMock(casualValue);
    }
}

const ANNOTATION_TAG = 'mock';

export function mockAnnotationFactory(directiveInfo: DirectiveInfo, typeName: string, fieldName?: string): Annotation {
    const valueArgument = findArgument(ANNOTATION_TAG, 'value', directiveInfo.arguments, true);

    invariant(typeName && typeName !== '', `Type name is required in '${ANNOTATION_TAG}' annotation.`);

    return new MockAnnotation(valueArgument.value, typeName, fieldName);
}

(<AnnotationFactory>mockAnnotationFactory).TAG = ANNOTATION_TAG;
