import { GraphQLSchema } from 'graphql';
import * as casual from 'casual';
import { invariant } from '../../lib';
import { extractArguments, ArgumentDescriptors } from '../lib';
import { AnnotationFactory, Annotation, DirectiveInfo } from '../index';

/**
 *
 * Adds a resolver function to a field which produces mock data
 *
 * For usage examples see the README.md file
 *
 */
class MockAnnotation {
    args: Array<any> = [];

    constructor(private value: string, private typeName: string, private fieldName?: string, argsString: string = '') {
        argsString = argsString.trim();
        if (argsString.length > 0) {
            this.args = JSON.parse(argsString);
            invariant(Array.isArray(this.args), `Arguments must be a JSON array but is of type: '${typeof this.args}'.`);
        }
    }

    apply(schema: GraphQLSchema, mocks: Object): void {
        mocks[this.typeName] = this.fieldName ?
            createFieldMock(this.typeName, mocks[this.typeName], this.fieldName, casualValueFactory.bind(this)) :
            casualValueFactory.bind(this);

        function casualValueFactory() {
            const casualValue = casual[this.value];

            return typeof casualValue === 'function' ? casualValue.apply(casual, this.args) : casualValue;
        }
    }
}

const ANNOTATION_TAG = 'mock';

const anyMockAnnotationFactory: any = function (directiveInfo: DirectiveInfo, typeName: string, fieldName?: string): Annotation {
    invariant(typeName && typeName !== '', `Type name is required in '${ANNOTATION_TAG}' annotation.`);

    const argumentDescriptors: ArgumentDescriptors = {
        value: {type: 'string', required: true},
        args: {type: 'string'}
    };
    const {value, args} = extractArguments(ANNOTATION_TAG, directiveInfo.arguments, argumentDescriptors);

    return new MockAnnotation(value, typeName, fieldName, args);
};

anyMockAnnotationFactory.TAG = ANNOTATION_TAG;

export const mockAnnotationFactory: AnnotationFactory = anyMockAnnotationFactory;


function createFieldMock(typeName: string, typeMock: Function, fieldName: string, valueFactory: Function): Function {
    if (typeMock && typeMock()[fieldName]) {
        throw new Error(`Mock for field: '${fieldName}' of type: ${typeName} already exists.`);
    }

    return () => Object.assign((typeMock && typeMock() || {}), {[fieldName]: valueFactory()});
}
