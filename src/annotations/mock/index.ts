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
    constructor(private value: string, private typeName: string, private fieldName?: string, private args?: Array<any>) {
    }

    apply(schema: GraphQLSchema, mocks: Object): void {
        const boundValueFactory = valueFactory.bind(this);

        mocks[this.typeName] = this.fieldName ?
            createFieldMock(this.typeName, mocks[this.typeName], this.fieldName, boundValueFactory) :
            boundValueFactory;

        function valueFactory() {
            const casualValue = casual[this.value];

            if (casualValue) {
                return typeof casualValue === 'function' ? casualValue.apply(casual, this.args) : casualValue;
            } else {
                return this.value === 'one_of' ? oneOf(this.args) : this.value;
            }

            function oneOf(args: Array<any> = []): any {
                return args[Math.floor(Math.random() * args.length)];
            }
        }
    }
}

const ANNOTATION_TAG = 'mock';

const anyMockAnnotationFactory: any = function (directiveInfo: DirectiveInfo, typeName: string, fieldName?: string): Annotation {
    invariant(typeName && typeName !== '', `Type name is required in '${ANNOTATION_TAG}' annotation.`);

    const argumentDescriptors: ArgumentDescriptors = {
        value: {type: 'any', required: true},
        args: {type: 'object'}
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
