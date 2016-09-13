import { GraphQLSchema } from 'graphql';
import * as casual from 'casual';
import { invariant } from '../../lib';
import { extractArguments, ArgumentDescriptors } from '../lib';
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
        const casualValueFactory = () => casual[this.value];

        mocks[this.typeName] = this.fieldName ?
            createFieldMock(this.typeName, mocks[this.typeName], this.fieldName, casualValueFactory) :
            casualValueFactory;
    }
}

const ANNOTATION_TAG = 'mock';

const anyMockAnnotationFactory: any = function (directiveInfo: DirectiveInfo, typeName: string, fieldName?: string): Annotation {
    invariant(typeName && typeName !== '', `Type name is required in '${ANNOTATION_TAG}' annotation.`);

    const argumentDescriptors: ArgumentDescriptors = {
        value: {required: true, type: 'string'}
    };
    const {value} = extractArguments(ANNOTATION_TAG, directiveInfo.arguments, argumentDescriptors);

    return new MockAnnotation(value, typeName, fieldName);
};

anyMockAnnotationFactory.TAG = ANNOTATION_TAG;

export const mockAnnotationFactory: AnnotationFactory = anyMockAnnotationFactory;


function createFieldMock(typeName: string, typeMock: Function, fieldName: string, valueFactory: Function): Function {
    if (typeMock && typeMock()[fieldName]) {
        throw new Error(`Mock for field: '${fieldName}' of type: ${typeName} already exists.`);
    }

    return () => Object.assign((typeMock && typeMock() || {}), {[fieldName]: valueFactory()});
}
